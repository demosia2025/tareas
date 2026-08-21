import { openai } from "@ai-sdk/openai";
import { streamText, tool } from "ai";
import { auth } from "@/auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

// System prompt mejorado
const SYSTEM_PROMPT = `Eres el asistente oficial de "Gestión de Tareas", una aplicación SaaS para gestión de proyectos.

## TUS CONOCIMIENTOS:

### Estructura del sistema:
- **Organización**: Es la entidad principal. Contiene workspaces.
- **Workspace**: Espacio de trabajo dentro de una organización. Tiene miembros con roles (owner, admin, member).
- **Space (Espacio)**: Contenedor dentro del workspace para organizar proyectos.
- **Folder (Carpeta)**: Sub-organización dentro de un espacio.
- **List (Lista)**: Contiene las tareas.
- **Task (Tarea)**: Unidad de trabajo con estado (todo, in_progress, done), prioridad (low, medium, high, urgent), subtareas y miembros asignados.

### Funcionalidades principales:
- Crear/editar/eliminar workspaces, espacios, carpetas, listas y tareas
- Vista de lista, tablero Kanban y calendario
- Filtros por estado y prioridad
- Búsqueda con K
- Invitar usuarios con códigos de invitación
- Planes con límites (Free, Pro, Enterprise)

### Instrucciones:
- Responde SIEMPRE en español
- Sé conciso y claro (máximo 3-4 oraciones por respuesta)
- Si no sabes algo, di "No tengo información sobre eso, pero puedes consultar la documentación o contactar al administrador"
- Usa formato markdown cuando sea útil (listas, negritas)
- **IMPORTANTE**: Usa las herramientas disponibles para consultar datos REALES del usuario (sus tareas, workspaces, miembros, etc.)
- NUNCA inventes datos sobre tareas o usuarios específicos
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
        // 🔍 HERRAMIENTA 1: Obtener workspaces del usuario
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
                    _count: {
                      select: {
                        spaces: true,
                        members: true,
                      },
                    },
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

        // 📋 HERRAMIENTA 2: Obtener tareas del usuario
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
                task: workspaceId ? {
                  list: {
                    space: {
                      workspaceId,
                    },
                  },
                } : {},
              },
              include: {
                task: {
                  include: {
                    list: {
                      include: {
                        space: {
                          include: {
                            workspace: true,
                          },
                        },
                      },
                    },
                    assignees: {
                      include: {
                        user: {
                          select: {
                            id: true,
                            name: true,
                            email: true,
                          },
                        },
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
              assignees: task.assignees?.map((a) => ({
                userId: a.user.id,
                userName: a.user.name,
                userEmail: a.user.email,
              })) || [],
            }));
          },
        }),

        // 👥 HERRAMIENTA 3: Obtener miembros de un workspace
        getWorkspaceMembers: tool({
          description: "Obtiene todos los miembros de un workspace específico",
          parameters: z.object({
            workspaceId: z.string(),
          }),
          execute: async ({ workspaceId }) => {
            const members = await prisma.workspaceMember.findMany({
              where: { workspaceId },
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                  },
                },
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

        // 📊 HERRAMIENTA 4: Obtener estadísticas del workspace
        getWorkspaceStats: tool({
          description: "Obtiene estadísticas de un workspace: total de tareas, tareas por estado, miembros, etc.",
          parameters: z.object({
            workspaceId: z.string(),
          }),
          execute: async ({ workspaceId }) => {
            // Obtener todas las listas del workspace
            const spaces = await prisma.space.findMany({
              where: { workspaceId },
              include: {
                lists: {
                  include: {
                    tasks: {
                      include: {
                        assignees: true,
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
                list.tasks.forEach((task) => {
                  totalTasks++;
                  if (task.status === "todo") todoCount++;
                  else if (task.status === "in_progress") inProgressCount++;
                  else if (task.status === "done") doneCount++;
                });
              });
            });

            const members = await prisma.workspaceMember.count({
              where: { workspaceId },
            });

            return {
              totalTasks,
              todoCount,
              inProgressCount,
              doneCount,
              membersCount: members,
              spacesCount: spaces.length,
              completionRate: totalTasks > 0 ? Math.round((doneCount / totalTasks) * 100) : 0,
            };
          },
        }),

        // 🔍 HERRAMIENTA 5: Buscar tarea por ID o título
        searchTask: tool({
          description: "Busca una tarea específica por su ID o por su título",
          parameters: z.object({
            taskId: z.string().optional(),
            title: z.string().optional(),
          }),
          execute: async ({ taskId, title }) => {
            if (!taskId && !title) {
              return [];
            }

            const tasks = await prisma.task.findMany({
              where: {
                AND: [
                  taskId ? { id: taskId } : {},
                  title ? { 
                    title: {
                      contains: title,
                      mode: "insensitive",
                    },
                  } : {},
                  {
                    list: {
                      space: {
                        workspace: {
                          members: {
                            some: {
                              userId,
                            },
                          },
                        },
                      },
                    },
                  },
                ],
              },
              include: {
                list: {
                  include: {
                    space: {
                      include: {
                        workspace: true,
                      },
                    },
                  },
                },
                assignees: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        name: true,
                        email: true,
                      },
                    },
                  },
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
              assignees: task.assignees?.map((a) => ({
                userId: a.user.id,
                userName: a.user.name,
                userEmail: a.user.email,
              })) || [],
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