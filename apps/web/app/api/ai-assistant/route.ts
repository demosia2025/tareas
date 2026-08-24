import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `Eres el asistente oficial de "Gestión de Tareas".
REGLA DE ORO: TIENES ACCESO A HERRAMIENTAS PARA CONSULTAR LA BASE DE DATOS REAL. 
NUNCA inventes respuestas ni des instrucciones genéricas como "ve al panel" o "revisa la sección". 
SIEMPRE que el usuario pregunte por SUS tareas, tareas pendientes, o SUS espacios/workspaces, DEBES llamar a la herramienta correspondiente ("get_user_tasks" o "get_user_workspaces") ANTES de responder.
Responde siempre en español, de forma breve y directa (máximo 3-4 oraciones) basándote ÚNICAMENTE en los datos que te devuelva la herramienta.`;

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

    // ✅ AHORA TENEMOS DOS HERRAMIENTAS: Una para tareas y otra para espacios
    const tools = [
      {
        type: "function",
        function: {
          name: "get_user_tasks",
          description: "OBLIGATORIO: Úsala SIEMPRE que el usuario pregunte por sus tareas, tareas pendientes, o conteo de tareas. Devuelve datos reales de la base de datos.",
          parameters: {
            type: "object",
            properties: {
              status: {
                type: "string",
                enum: ["todo", "in_progress", "done", "all"],
                description: "Usa 'todo' para tareas pendientes."
              }
            },
            required: ["status"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_user_workspaces",
          description: "OBLIGATORIO: Úsala SIEMPRE que el usuario pregunte por sus espacios, workspaces, o lugares de trabajo. Devuelve datos reales de la base de datos.",
          parameters: {
            type: "object",
            properties: {},
            required: []
          }
        }
      }
    ];

    console.log("🤖 [AI] Enviando petición a Mistral con herramientas...");

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
    console.log("🧠 [AI] ¿Mistral solicitó usar una herramienta?:", !!message.tool_calls);

    // ✅ Si el modelo decide usar una herramienta, la ejecutamos
    if (message.tool_calls && message.tool_calls.length > 0) {
      const toolCall = message.tool_calls[0];
      console.log("🛠️ [AI] Herramienta solicitada por el modelo:", toolCall.function.name);
      
      if (toolCall.function.name === "get_user_tasks") {
        const args = JSON.parse(toolCall.function.arguments);
        const status = args.status || "todo";
        console.log("🛠️ [HERRAMIENTA] Ejecutando get_user_tasks con status:", status);
        
        const taskMembers = await prisma.taskMember.findMany({
          where: { userId, task: { status: status === "all" ? undefined : status } },
          include: {
            task: {
              include: {
                list: { include: { space: { include: { workspace: true } } } },
                assignee: { select: { id: true, name: true, email: true } },
              },
            },
          },
          take: 20,
        });

        const formattedTasks = taskMembers.map((tm) => ({
          titulo: tm.task.title,
          estado: tm.task.status,
          prioridad: tm.task.priority,
          espacio: tm.task.list?.space?.workspace?.name || "Desconocido",
          asignado_a: tm.task.assignee?.name || "Sin asignar",
        }));

        console.log("✅ [HERRAMIENTA] Tareas reales encontradas:", formattedTasks.length);

        const followUpMessages = [
          ...formattedMessages,
          message,
          {
            role: "tool",
            name: "get_user_tasks",
            content: JSON.stringify(formattedTasks),
            tool_call_id: toolCall.id,
          }
        ];

        const followUpResponse = await fetch("https://api.mistral.ai/v1/chat/completions", {
          method: "POST",
          headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: "mistral-small-latest", messages: followUpMessages, temperature: 0.1, max_tokens: 800 }),
        });

        const followUpData = await followUpResponse.json();
        return new Response(JSON.stringify({ role: "assistant", content: followUpData.choices?.[0]?.message?.content || "Sin datos." }), { status: 200, headers: { "Content-Type": "application/json" } });
      
      } else if (toolCall.function.name === "get_user_workspaces") {
        console.log("🛠️ [HERRAMIENTA] Ejecutando get_user_workspaces");
        
        const memberships = await prisma.workspaceMember.findMany({
          where: { userId },
          include: { workspace: { include: { organization: true } } },
        });

        const formattedWorkspaces = memberships.map((m) => ({
          nombre: m.workspace.name,
          organizacion: m.workspace.organization?.name || "Sin organización",
          rol: m.role,
        }));

        console.log("✅ [HERRAMIENTA] Workspaces reales encontrados:", formattedWorkspaces.length);

        const followUpMessages = [
          ...formattedMessages,
          message,
          {
            role: "tool",
            name: "get_user_workspaces",
            content: JSON.stringify(formattedWorkspaces),
            tool_call_id: toolCall.id,
          }
        ];

        const followUpResponse = await fetch("https://api.mistral.ai/v1/chat/completions", {
          method: "POST",
          headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ model: "mistral-small-latest", messages: followUpMessages, temperature: 0.1, max_tokens: 800 }),
        });

        const followUpData = await followUpResponse.json();
        return new Response(JSON.stringify({ role: "assistant", content: followUpData.choices?.[0]?.message?.content || "Sin datos." }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
    }

    // Si el modelo respondió sin usar herramientas (no debería pasar con este prompt)
    const responseContent = message?.content || "Sin respuesta.";
    console.log("⚠️ [AI] El modelo respondió SIN usar herramientas. Respuesta:", responseContent);
    
    return new Response(JSON.stringify({ role: "assistant", content: responseContent }), { status: 200, headers: { "Content-Type": "application/json" } });

  } catch (error: any) {
    console.error("💥 ERROR CRÍTICO en AI Assistant:", error?.message);
    return new Response(JSON.stringify({ error: "Error interno", details: error?.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}