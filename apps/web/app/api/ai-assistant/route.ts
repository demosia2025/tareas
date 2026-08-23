import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `Eres el asistente oficial de "Gestión de Tareas".
REGLA ABSOLUTA: Cuando el usuario pregunte por SUS tareas, tareas pendientes, o estado de sus proyectos, DEBES usar OBLIGATORIAMENTE la herramienta "get_user_tasks" antes de responder.
NUNCA des instrucciones genéricas como "ve al panel". Tu trabajo es consultar la base de datos y dar los datos REALES.
Responde siempre en español, de forma breve y directa (máximo 3-4 oraciones).`;

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

    // ✅ Definimos la herramienta en formato nativo de Mistral/OpenAI
    const tools = [
      {
        type: "function",
        function: {
          name: "get_user_tasks",
          description: "OBLIGATORIO: Usa esta herramienta cuando el usuario pregunte por sus tareas, tareas pendientes o conteo de tareas. Devuelve datos reales de la base de datos.",
          parameters: {
            type: "object",
            properties: {
              status: {
                type: "string",
                enum: ["todo", "in_progress", "done", "all"],
                description: "Usa 'todo' para tareas pendientes. Usa 'all' si no especifica."
              }
            },
            required: ["status"]
          }
        }
      }
    ];

    // 1️⃣ Primera llamada a Mistral
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
        tool_choice: "auto", // Permite al modelo decidir si usa la herramienta
        temperature: 0.1,
        max_tokens: 800,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: data?.error?.message || "Error devuelto por Mistral" }),
        { status: response.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const message = data.choices[0].message;

    // 2️⃣ Si el modelo decide usar la herramienta (¡Aquí está la magia!)
    if (message.tool_calls && message.tool_calls.length > 0) {
      const toolCall = message.tool_calls[0];
      
      if (toolCall.function.name === "get_user_tasks") {
        console.log("🛠️ [HERRAMIENTA EJECUTADA] get_user_tasks para userId:", userId);
        
        const args = JSON.parse(toolCall.function.arguments);
        const status = args.status || "todo";

        // Consulta REAL a tu base de datos con Prisma
        const taskMembers = await prisma.taskMember.findMany({
          where: { 
            userId, 
            task: { status: status === "all" ? undefined : status } 
          },
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

        console.log("✅ [HERRAMIENTA] Tareas encontradas:", formattedTasks.length);

        // 3️⃣ Segunda llamada a Mistral, enviándole los datos reales que encontró
        const followUpMessages = [
          ...formattedMessages,
          message, // El mensaje del asistente pidiendo la herramienta
          {
            role: "tool",
            name: "get_user_tasks",
            content: JSON.stringify(formattedTasks),
            tool_call_id: toolCall.id,
          }
        ];

        const followUpResponse = await fetch("https://api.mistral.ai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "mistral-small-latest",
            messages: followUpMessages,
            temperature: 0.1,
            max_tokens: 800,
          }),
        });

        const followUpData = await followUpResponse.json();
        const finalContent = followUpData.choices?.[0]?.message?.content || "No pude procesar la información.";

        return new Response(
          JSON.stringify({ role: "assistant", content: finalContent }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // 4️⃣ Si el modelo respondió directamente sin necesitar herramientas
    const responseContent = message?.content || "Sin respuesta.";
    return new Response(
      JSON.stringify({ role: "assistant", content: responseContent }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("💥 ERROR CRÍTICO en AI Assistant:", error?.message);
    return new Response(
      JSON.stringify({ error: "Error interno", details: error?.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}