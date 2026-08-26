import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// ✅ MANUAL COMPLETO DEL SISTEMA - La IA conoce TODO el sistema
const SYSTEM_PROMPT = `Eres el asistente experto de "Gestión de Tareas". Eres un aliado proactivo que conoce el sistema al 100%.

REGLAS ABSOLUTAS:
1. NUNCA digas "Sin datos" o "No tengo acceso". Siempre das respuestas útiles basadas en el manual.
2. SIEMPRE que pregunten por tareas/usuarios, USA las herramientas get_user_tasks o get_user_workspaces ANTES de responder.
3. Si el usuario pregunta CÓMO hacer algo, usa el MANUAL para dar instrucciones paso a paso.
4. Responde en español, sé breve y amigable. Usa viñetas (•) para pasos.

MANUAL COMPLETO DEL SISTEMA:

📋 CREAR TAREA:
• Haz clic en "Nueva Tarea" (botón azul con ✓) en la parte superior derecha.
• Completa: Título (obligatorio), Descripción, Estado, Prioridad, Vencimiento.
• Asigna un Responsable Principal desde el desplegable.
• Invita Colaboradores adicionales si es necesario.
• Click en "Crear tarea".

✏️ MODIFICAR TAREA:
• Haz clic sobre cualquier tarea en la vista de Lista, Tablero o Calendario.
• Se abre el modal con dos pestañas:
  - "Detalles": Edita título, descripción, estado, prioridad, fecha, responsable.
  - "Actividad": Ve el chat, archivos adjuntos y miembros de la tarea.
• Click en "Guardar cambios".

💬 CHATEAR EN UNA TAREA:
• Abre la tarea y ve a la pestaña "Actividad".
• Sub-pestaña "Chat y Archivos":
  - Escribe comentarios en el campo de texto.
  - Adjunta archivos con el icono del clip (📎).
• Sub-pestaña "Miembros de la Tarea":
  - "Asignar Responsable": Busca y asigna el responsable principal.
  - "Invitar Colaboradores": Agrega miembros extra al equipo.

👥 VER USUARIOS Y ASIGNACIONES:
• Header superior: Click en "Usuarios" o "Asignaciones".
• En "Asignaciones" ves todos los usuarios y sus tareas con tiempo transcurrido.
• En "Usuarios" buscas un usuario y haces clic en el icono ✓ para ver sus tareas.

️ ORGANIZACIÓN:
• Workspace → Espacio (Space) → Carpeta (Folder) → Lista (List) → Tareas.
• Sidebar izquierdo: Selecciona una lista para ver sus tareas.`;

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const userId = session.user.id;
    const { messages } = await req.json();
    const apiKey = (process.env.MISTRAL_API_KEY || "").trim();

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Falta MISTRAL_API_KEY" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    const formattedMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages.map((m: any) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: String(m.content || ""),
      })),
    ];

    // ✅ HERRAMIENTAS MEJORADAS
    const tools = [
      {
        type: "function",
        function: {
          name: "get_user_tasks",
          description: "OBLIGATORIO: Úsala SIEMPRE que pregunten por tareas. Devuelve TODAS las tareas del usuario (asignadas y no asignadas).",
          parameters: {
            type: "object",
            properties: {
              status: {
                type: "string",
                enum: ["todo", "in_progress", "done", "all"],
                description: "Filtra por estado. Usa 'all' para ver todas."
              },
              includeUnassigned: {
                type: "boolean",
                description: "true para incluir tareas sin asignar (sin assigneeId)"
              }
            },
            required: ["status"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_workspace_members",
          description: "OBLIGATORIO: Úsala SIEMPRE que pregunten por usuarios, miembros o equipo. Devuelve todos los miembros del workspace.",
          parameters: {
            type: "object",
            properties: {},
            required: []
          }
        }
      }
    ];

    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "mistral-small-latest",
        messages: formattedMessages,
        tools: tools,
        tool_choice: "auto",
        temperature: 0.1,
        max_tokens: 800,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ [AI] Error de Mistral:", data);
      return new Response(
        JSON.stringify({ error: data?.error?.message || "Error devuelto por Mistral" }),
        { status: response.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const message = data.choices[0].message;

    // ✅ EJECUTAR HERRAMIENTAS
    if (message.tool_calls && message.tool_calls.length > 0) {
      const toolCall = message.tool_calls[0];
      
      // 📋 HERRAMIENTA: get_user_tasks (MEJORADA)
      if (toolCall.function.name === "get_user_tasks") {
        const args = JSON.parse(toolCall.function.arguments);
        const status = args.status || "all";
        const includeUnassigned = args.includeUnassigned || true;

        // Obtener workspaces del usuario
        const memberships = await prisma.workspaceMember.findMany({
          where: { userId },
          select: { workspaceId: true },
        });
        const workspaceIds = memberships.map(m => m.workspaceId);

        if (workspaceIds.length === 0) {
          return new Response(JSON.stringify({ 
            role: "assistant", 
            content: "No tienes workspaces asignados aún. ¿Te gustaría crear uno?" 
          }), { status: 200 });
        }

        // Construir where clause
        const whereClause: any = {
          workspaceId: { in: workspaceIds }
        };

        if (status !== "all") {
          whereClause.status = status;
        }

        // Si includeUnassigned es true, no filtramos por assigneeId
        // Si es false, solo mostramos las asignadas al usuario
        if (!includeUnassigned) {
          whereClause.assigneeId = userId;
        }

        const tasks = await prisma.task.findMany({
          where: whereClause,
          include: {
            assignee: { select: { id: true, name: true, email: true } },
            list: { 
              select: { 
                id: true, 
                name: true,
                space: { 
                  select: { 
                    id: true, 
                    name: true,
                    workspace: { select: { name: true } }
                  } 
                } 
              } 
            },
          },
          orderBy: { createdAt: "desc" },
          take: 50,
        });

        const formattedTasks = tasks.map(t => ({
          titulo: t.title,
          estado: t.status === "todo" ? "Por Hacer" : t.status === "in_progress" ? "En Progreso" : "Completada",
          prioridad: t.priority,
          asignado_a: t.assignee?.name || "Sin asignar",
          lista: t.list?.name || "Desconocida",
          espacio: t.list?.space?.name || "Desconocido",
          workspace: t.list?.space?.workspace?.name || "Desconocido",
        }));

        const followUpMessages = [
          ...formattedMessages,
          message,
          {
            role: "tool",
            name: "get_user_tasks",
            content: JSON.stringify({
              total: formattedTasks.length,
              tareas: formattedTasks,
              mensaje: formattedTasks.length > 0 
                ? `Encontré ${formattedTasks.length} tarea(s).` 
                : "No hay tareas en este workspace."
            }),
            tool_call_id: toolCall.id,
          }
        ];

        const followUpResponse = await fetch("https://api.mistral.ai/v1/chat/completions", {
          method: "POST",
          headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: "mistral-small-latest", messages: followUpMessages, temperature: 0.1, max_tokens: 800 }),
        });

        const followUpData = await followUpResponse.json();
        return new Response(JSON.stringify({ role: "assistant", content: followUpData.choices?.[0]?.message?.content || "Sin datos." }), { status: 200 });
      
      // 👥 HERRAMIENTA: get_workspace_members
      } else if (toolCall.function.name === "get_workspace_members") {
        const memberships = await prisma.workspaceMember.findMany({
          where: { userId },
          include: { 
            workspace: { 
              include: { 
                organization: true,
                members: {
                  include: {
                    user: { select: { id: true, name: true, email: true, image: true } }
                  }
                }
              } 
            } 
          },
        });

        const allMembers: any[] = [];
        memberships.forEach(m => {
          if (m.workspace.members) {
            m.workspace.members.forEach(wm => {
              allMembers.push({
                nombre: wm.user?.name || "Sin nombre",
                email: wm.user?.email || "",
                rol: wm.role,
                workspace: m.workspace.name,
                organizacion: m.workspace.organization?.name || "Sin organización"
              });
            });
          }
        });

        const followUpMessages = [
          ...formattedMessages,
          message,
          {
            role: "tool",
            name: "get_workspace_members",
            content: JSON.stringify({
              total: allMembers.length,
              miembros: allMembers
            }),
            tool_call_id: toolCall.id,
          }
        ];

        const followUpResponse = await fetch("https://api.mistral.ai/v1/chat/completions", {
          method: "POST",
          headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: "mistral-small-latest", messages: followUpMessages, temperature: 0.1, max_tokens: 800 }),
        });

        const followUpData = await followUpResponse.json();
        return new Response(JSON.stringify({ role: "assistant", content: followUpData.choices?.[0]?.message?.content || "Sin datos." }), { status: 200 });
      }
    }

    // Respuesta sin herramientas
    const responseContent = message?.content || "Sin respuesta.";
    return new Response(JSON.stringify({ role: "assistant", content: responseContent }), { status: 200 });

  } catch (error: any) {
    console.error("💥 ERROR CRÍTICO en AI Assistant:", error?.message);
    return new Response(JSON.stringify({ error: "Error interno", details: error?.message }), { status: 500 });
  }
}