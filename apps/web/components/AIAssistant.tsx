import { openai } from "@ai-sdk/openai";
import { streamText, tool } from "ai";
import { auth } from "@/auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const SYSTEM_PROMPT = `Eres el asistente oficial de "Gestión de Tareas", una aplicación SaaS para gestión de proyectos.

## TUS CONOCIMIENTOS:
- **Organización**: Entidad principal. Contiene workspaces.
- **Workspace**: Espacio de trabajo. Tiene miembros con roles (owner, admin, member).
- **Space (Espacio)**: Contenedor dentro del workspace.
- **Folder (Carpeta)**: Sub-organización dentro de un espacio.
- **List (Lista)**: Contiene las tareas.
- **Task (Tarea)**: Unidad de trabajo con estado (todo, in_progress, done), prioridad y asignados.

## Instrucciones:
- Responde SIEMPRE en español.
- Sé conciso y claro (máximo 3-4 oraciones por respuesta).
- Usa las herramientas disponibles para consultar datos REALES del usuario.
- NUNCA inventes datos sobre tareas o usuarios específicos.
`;

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new Response("No autorizado", { status: 401 });
    }

    const userId = session.user.id;
    const { messages } = await req.json();

    const result = streamText({
      model: openai("gpt-4o-mini"),
      system: SYSTEM_PROMPT,
      messages,
      maxTokens: 800,
      temperature: 0.7,
      tools: {
        getUserWorkspaces: tool({
          description: "Obtiene todos los workspaces a los que pertenece el usuario actual",
          parameters: z.object({}),
          execute: async () => {
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
              spacesCount: m.workspace._count.spaces,
              membersCount: m.workspace._count.members,
            }));
          },
        }),

        getUserTasks: tool({
          description: "Obtiene las tareas del usuario. Puede filtrar por estado (todo, in_progress, done) o workspace",
          parameters: z.object({
            status: z.enum(["todo", "in_progress", "done", "all"]).optional().default("all"),
            workspaceId: z.string().optional(),
            limit: z.number().optional().default(10),
          }),
          execute: async ({ status, workspaceId, limit }) => {
            const taskMembers = await prisma.taskMember.findMany({
              where: {
                userId,
                task: workspaceId ? { list: { space: { workspaceId } } } : {},
              },
              include: {
                task: {
                  include: {
                    list: {
                      include: {
                        space: { include: { workspace: true } },
                      },
                    },
                    // ✅ CORREGIDO: assignee apunta directamente al User, usamos select
                    assignee: {
                      select: {
                        id: true,
                        name: true,
                        email: true,
                      },
                    },
                  },
                },
              },
              take: limit,
            });

            let filteredTasks = taskMembers.map((tm) => tm.task);

            if (status !== "all") {
              filteredTasks = filteredTasks.filter((t) => t.status === status);
            }

            return filteredTasks.map((task) => ({
              id: task.id,
              title: task.title,
              description: task.description,
              status: task.status,
              priority: task.priority,
              dueDate: task.dueDate,
              workspaceName: task.list?.space?.workspace?.name || "Desconocido",
              spaceName: task.list?.space?.name || "Desconocido",
              listName: task.list?.name || "Desconocida",
              assignees: task.assignee ? [{
                userId: task.assignee.id,
                userName: task.assignee.name,
                userEmail: task.assignee.email,
              }] : [],
            }));
          },
        }),

        getWorkspaceMembers: tool({
          description: "Obtiene todos los miembros de un workspace específico",
          parameters: z.object({ workspaceId: z.string() }),
          execute: async ({ workspaceId }) => {
            const members = await prisma.workspaceMember.findMany({
              where: { workspaceId },
              include: {
                user: { select: { id: true, name: true, email: true } },
              },
            });

            return members.map((m) => ({
              userId: m.user.id,
              userName: m.user.name,
              userEmail: m.user.email,
              role: m.role,
            }));
          },
        }),

        getWorkspaceStats: tool({
          description: "Obtiene estadísticas de un workspace: total de tareas, tareas por estado, miembros, etc.",
          parameters: z.object({ workspaceId: z.string() }),
          execute: async ({ workspaceId }) => {
            const spaces = await prisma.space.findMany({
              where: { workspaceId },
              include: {
                lists: {
                  include: {
                    tasks: {
                      include: {
                        // ✅ CORREGIDO: assignee apunta directamente al User
                        assignee: { select: { id: true } },
                      },
                    },
                  },
                },
              },
            });

            let totalTasks = 0;
            let todoCount = 0;
            let inProgressCount = 0;
            let doneCount = 0;

            spaces.forEach((space) => {
              space.lists.forEach((list) => {
                list.tasks.forEach(() => {
                  totalTasks++;
                  // Nota: Ajusta esto si tu campo de estado tiene otro nombre
                });
              });
            });

            // Conteo simplificado para evitar errores de tipado si el estado varía
            const tasks = await prisma.task.findMany({
              where: { list: { space: { workspaceId } } },
              select: { status: true },
            });
            
            tasks.forEach(t => {
              if (t.status === "todo") todoCount++;
              else if (t.status === "in_progress") inProgressCount++;
              else if (t.status === "done") doneCount++;
            });

            const membersCount = await prisma.workspaceMember.count({ where: { workspaceId } });

            return {
              totalTasks,
              todoCount,
              inProgressCount,
              doneCount,
              membersCount,
              spacesCount: spaces.length,
              completionRate: totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0,
            };
          },
        }),

        searchTask: tool({
          description: "Busca una tarea específica por su ID o por su título",
          parameters: z.object({
            taskId: z.string().optional(),
            title: z.string().optional(),
          }),
          execute: async ({ taskId, title }) => {
            if (!taskId && !title) return [];

            const tasks = await prisma.task.findMany({
              where: {
                AND: [
                  taskId ? { id: taskId } : {},
                  title ? { title: { contains: title, mode: "insensitive" } } : {},
                  {
                    list: {
                      space: {
                        workspace: {
                          members: { some: { userId } },
                        },
                      },
                    },
                  },
                ],
              },
              include: {
                list: { include: { space: { include: { workspace: true } } } },
                // ✅ CORREGIDO: assignee apunta directamente al User
                assignee: {
                  select: { id: true, name: true, email: true },
                },
              },
              take: 5,
            });

            return tasks.map((task) => ({
              id: task.id,
              title: task.title,
              description: task.description,
              status: task.status,
              priority: task.priority,
              dueDate: task.dueDate,
              workspaceName: task.list?.space?.workspace?.name || "Desconocido",
              spaceName: task.list?.space?.name || "Desconocido",
              listName: task.list?.name || "Desconocida",
              assignees: task.assignee ? [{
                userId: task.assignee.id,
                userName: task.assignee.name,
                userEmail: task.assignee.email,
              }] : [],
            }));
          },
        }),
      },
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("Error en AI Assistant:", error);
    return new Response("Error del servidor", { status: 500 });
  }
}