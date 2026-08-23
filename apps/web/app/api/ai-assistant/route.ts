import { mistral } from "@ai-sdk/mistral";
import { streamText, tool } from "ai";
import { auth } from "@/auth";
import { z } from "zod";
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
    const apiKey = process.env.MISTRAL_API_KEY;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "Falta MISTRAL_API_KEY" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ✅ Aquí es donde la magia ocurre: definimos las herramientas que el modelo PUEDE usar
    const result = streamText({
      model: mistral("mistral-small-latest"),
      system: SYSTEM_PROMPT,
      messages,
      maxTokens: 800,
      temperature: 0.1, // Temperatura baja para evitar alucinaciones
      tools: {
        get_user_tasks: tool({
          description: "OBLIGATORIO: Usa esta herramienta cuando el usuario pregunte por sus tareas, tareas pendientes o conteo de tareas. Devuelve datos reales de la base de datos.",
          parameters: z.object({
            status: z.enum(["todo", "in_progress", "done", "all"]).describe("Usa 'todo' para tareas pendientes. Usa 'all' si no especifica.").optional().default("todo"),
          }),
          execute: async ({ status }) => {
            console.log("🛠️ [HERRAMIENTA EJECUTADA] get_user_tasks con status:", status, "para userId:", userId);
            
            const taskMembers = await prisma.taskMember.findMany({
              where: { 
                userId, 
                task: { status: status === "all" ? undefined : status } 
              },
              include: {
                task: {
                  include: {
                    list: {
                      include: {
                        space: { include: { workspace: true } },
                      },
                    },
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
            return formattedTasks;
          },
        }),
      },
    });

    // ✅ Devuelve la respuesta en formato stream compatible con el frontend
    return result.toDataStreamResponse();
  } catch (error: any) {
    console.error("💥 ERROR CRÍTICO en AI Assistant:", error?.message);
    return new Response(
      JSON.stringify({ error: "Error interno", details: error?.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}