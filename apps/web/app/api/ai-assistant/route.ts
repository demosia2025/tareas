import { openai } from "@ai-sdk/openai";
import { streamText, tool } from "ai";
import { auth } from "@/auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `Eres el asistente oficial de "Gestión de Tareas". Responde SIEMPRE en español. Sé conciso y útil.`;

export async function POST(req: Request) {
  try {
    console.log("🔍 [AI API] Iniciando petición...");
    
    // 1. Verificar autenticación
    const session = await auth();
    
    if (!session?.user?.id) {
      console.warn("⚠️ [AI API] Usuario no autenticado o sin ID. Session:", session);
      return new Response(JSON.stringify({ error: "No autorizado" }), { 
        status: 401,
        headers: { "Content-Type": "application/json" }
      });
    }

    const userId = session.user.id;
    const { messages } = await req.json();

    console.log("✅ [AI API] Usuario autenticado. Iniciando stream para usuario:", userId);

    // 2. ✅ CORRECCIÓN: Usamos 'await' porque tu entorno de TypeScript está infiriendo 
    // que streamText devuelve una Promise. Esto satisface al compilador y funciona en runtime.
    const result = await streamText({
      model: openai("gpt-4o-mini"),
      system: SYSTEM_PROMPT,
      messages,
      maxTokens: 800,
      temperature: 0.7,
      tools: {
        getUserWorkspaces: tool({
          description: "Obtiene los workspaces del usuario",
          parameters: z.object({}),
          execute: async () => {
            console.log("🔧 Ejecutando herramienta: getUserWorkspaces");
            const memberships = await prisma.workspaceMember.findMany({
              where: { userId },
              include: {
                workspace: {
                  include: {
                    organization: true,
                    _count: { select: { spaces: true, members: true } },
                  },
                },
              },
            });
            return memberships.map((m) => ({
              workspaceId: m.workspace.id,
              workspaceName: m.workspace.name,
              organizationName: m.workspace.organization?.name || "Sin organización",
              role: m.role,
            }));
          },
        }),
        getUserTasks: tool({
          description: "Obtiene las tareas del usuario",
          parameters: z.object({
            status: z.enum(["todo", "in_progress", "done", "all"]).optional().default("all"),
          }),
          execute: async ({ status }) => {
            console.log("🔧 Ejecutando herramienta: getUserTasks con status:", status);
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
              take: 10,
            });
            return taskMembers.map((tm) => ({
              id: tm.task.id,
              title: tm.task.title,
              status: tm.task.status,
              workspaceName: tm.task.list?.space?.workspace?.name || "Desconocido",
              assignees: tm.task.assignee ? [{
                userName: tm.task.assignee.name,
                userEmail: tm.task.assignee.email,
              }] : [],
            }));
          },
        }),
      },
    });

    console.log("🚀 [AI API] Devolviendo stream a respuesta");
    return result.toDataStreamResponse();
    
  } catch (error) {
    console.error("💥 ERROR CRÍTICO en AI Assistant:", error);
    return new Response(
      JSON.stringify({ error: "Error interno del servidor", details: String(error) }), 
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}