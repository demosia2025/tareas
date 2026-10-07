import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    if (userRole !== "superadmin") {
      return NextResponse.json({ error: "Solo el superadmin puede importar datos" }, { status: 403 });
    }

    const body = await request.json();
    const { data, mode } = body; // mode: "merge" | "replace"

    if (!data || !data.organizations) {
      return NextResponse.json({ error: "Datos de respaldo inválidos" }, { status: 400 });
    }

    const results = {
      organizations: 0,
      workspaces: 0,
      spaces: 0,
      lists: 0,
      tasks: 0,
      users: 0,
      errors: [] as string[]
    };

    // Si es modo replace, limpiar datos existentes (con cuidado)
    if (mode === "replace") {
      await prisma.task.deleteMany({});
      await prisma.list.deleteMany({});
      await prisma.folder.deleteMany({});
      await prisma.space.deleteMany({});
      await prisma.workspaceMember.deleteMany({});
      await prisma.workspace.deleteMany({});
      await prisma.organization.deleteMany({});
    }

    // Importar organizaciones
    for (const org of data.organizations) {
      try {
        const createdOrg = await prisma.organization.upsert({
          where: { id: org.id },
          update: {
            name: org.name,
            slug: org.slug,
            plan: org.plan,
            description: org.description,
            logo: org.logo
          },
          create: {
            id: org.id,
            name: org.name,
            slug: org.slug,
            plan: org.plan || "free",
            description: org.description,
            logo: org.logo
          }
        });
        results.organizations++;

        // Importar workspaces
        if (org.workspaces) {
          for (const ws of org.workspaces) {
            try {
              const createdWs = await prisma.workspace.upsert({
                where: { id: ws.id },
                update: {
                  name: ws.name,
                  slug: ws.slug,
                  plan: ws.plan,
                  color: ws.color,
                  organizationId: createdOrg.id
                },
                create: {
                  id: ws.id,
                  name: ws.name,
                  slug: ws.slug,
                  plan: ws.plan || "free",
                  color: ws.color || "#06b6d4",
                  organizationId: createdOrg.id
                }
              });
              results.workspaces++;

              // Importar spaces
              if (ws.spaces) {
                for (const space of ws.spaces) {
                  await prisma.space.upsert({
                    where: { id: space.id },
                    update: {
                      name: space.name,
                      slug: space.slug,
                      description: space.description,
                      color: space.color,
                      workspaceId: createdWs.id
                    },
                    create: {
                      id: space.id,
                      name: space.name,
                      slug: space.slug,
                      description: space.description,
                      color: space.color || "#8b5cf6",
                      workspaceId: createdWs.id
                    }
                  });
                  results.spaces++;

                  // Importar folders
                  if (space.folders) {
                    for (const folder of space.folders) {
                      const createdFolder = await prisma.folder.upsert({
                        where: { id: folder.id },
                        update: {
                          name: folder.name,
                          workspaceId: createdWs.id,
                          spaceId: space.id
                        },
                        create: {
                          id: folder.id,
                          name: folder.name,
                          workspaceId: createdWs.id,
                          spaceId: space.id
                        }
                      });

                      // Importar lists dentro de folders
                      if (folder.lists) {
                        for (const list of folder.lists) {
                          const createdList = await prisma.list.upsert({
                            where: { id: list.id },
                            update: {
                              name: list.name,
                              workspaceId: createdWs.id,
                              spaceId: space.id,
                              folderId: createdFolder.id
                            },
                            create: {
                              id: list.id,
                              name: list.name,
                              workspaceId: createdWs.id,
                              spaceId: space.id,
                              folderId: createdFolder.id
                            }
                          });
                          results.lists++;

                          // Importar tareas
                          if (list.tasks) {
                            for (const task of list.tasks) {
                              try {
                                await prisma.task.upsert({
                                  where: { id: task.id },
                                  update: {
                                    title: task.title,
                                    status: task.status || "todo",
                                    priority: task.priority || "medium",
                                    description: task.description,
                                    dueDate: task.dueDate ? new Date(task.dueDate) : null,
                                    workspaceId: createdWs.id,
                                    spaceId: space.id,
                                    listId: createdList.id,
                                    creatorId: task.creator?.id || session.user.id,
                                    assigneeId: task.assignee?.id || null,
                                    renewalCount: task.renewalCount || 0,
                                    lastRenewedAt: task.lastRenewedAt ? new Date(task.lastRenewedAt) : null,
                                    completedAt: task.completedAt ? new Date(task.completedAt) : null
                                  },
                                  create: {
                                    id: task.id,
                                    // ✅ CAMPO REQUERIDO AGREGADO: identifier
                                    identifier: task.identifier || `IMPORTED-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                                    title: task.title,
                                    status: task.status || "todo",
                                    priority: task.priority || "medium",
                                    description: task.description,
                                    dueDate: task.dueDate ? new Date(task.dueDate) : null,
                                    startDate: task.startDate ? new Date(task.startDate) : null,
                                    workspaceId: createdWs.id,
                                    spaceId: space.id,
                                    listId: createdList.id,
                                    creatorId: task.creator?.id || session.user.id,
                                    assigneeId: task.assignee?.id || null,
                                    renewalCount: task.renewalCount || 0,
                                    lastRenewedAt: task.lastRenewedAt ? new Date(task.lastRenewedAt) : null,
                                    completedAt: task.completedAt ? new Date(task.completedAt) : null
                                  }
                                });
                                results.tasks++;
                              } catch (taskError: any) {
                                results.errors.push(`Tarea ${task.title}: ${taskError.message}`);
                              }
                            }
                          }
                        }
                      }
                    }
                  }

                  // Importar lists directamente en space (sin folder)
                  if (space.lists) {
                    for (const list of space.lists) {
                      const createdList = await prisma.list.upsert({
                        where: { id: list.id },
                        update: {
                          name: list.name,
                          workspaceId: createdWs.id,
                          spaceId: space.id
                        },
                        create: {
                          id: list.id,
                          name: list.name,
                          workspaceId: createdWs.id,
                          spaceId: space.id
                        }
                      });
                      results.lists++;

                      if (list.tasks) {
                        for (const task of list.tasks) {
                          try {
                            await prisma.task.upsert({
                              where: { id: task.id },
                              update: {
                                title: task.title,
                                status: task.status || "todo",
                                priority: task.priority || "medium",
                                description: task.description,
                                dueDate: task.dueDate ? new Date(task.dueDate) : null,
                                workspaceId: createdWs.id,
                                spaceId: space.id,
                                listId: createdList.id,
                                creatorId: task.creator?.id || session.user.id,
                                assigneeId: task.assignee?.id || null,
                                renewalCount: task.renewalCount || 0,
                                lastRenewedAt: task.lastRenewedAt ? new Date(task.lastRenewedAt) : null,
                                completedAt: task.completedAt ? new Date(task.completedAt) : null
                              },
                              create: {
                                id: task.id,
                                // ✅ CAMPO REQUERIDO AGREGADO: identifier
                                identifier: task.identifier || `IMPORTED-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                                title: task.title,
                                status: task.status || "todo",
                                priority: task.priority || "medium",
                                description: task.description,
                                dueDate: task.dueDate ? new Date(task.dueDate) : null,
                                startDate: task.startDate ? new Date(task.startDate) : null,
                                workspaceId: createdWs.id,
                                spaceId: space.id,
                                listId: createdList.id,
                                creatorId: task.creator?.id || session.user.id,
                                assigneeId: task.assignee?.id || null,
                                renewalCount: task.renewalCount || 0,
                                lastRenewedAt: task.lastRenewedAt ? new Date(task.lastRenewedAt) : null,
                                completedAt: task.completedAt ? new Date(task.completedAt) : null
                              }
                            });
                            results.tasks++;
                          } catch (taskError: any) {
                            results.errors.push(`Tarea ${task.title}: ${taskError.message}`);
                          }
                        }
                      }
                    }
                  }
                }
              }
            } catch (wsError: any) {
              results.errors.push(`Workspace ${ws.name}: ${wsError.message}`);
            }
          }
        }
      } catch (orgError: any) {
        results.errors.push(`Organización ${org.name}: ${orgError.message}`);
      }
    }

    // Importar usuarios (si existen en el respaldo)
    if (data.users) {
      for (const user of data.users) {
        try {
          await prisma.user.upsert({
            where: { email: user.email },
            update: {
              name: user.name,
              role: user.role || "user"
            },
            create: {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role || "user"
            }
          });
          results.users++;
        } catch (userError: any) {
          results.errors.push(`Usuario ${user.email}: ${userError.message}`);
        }
      }
    }

    // ✅ CORRECCIÓN: Uso del operador ternario (? :) en lugar de if/else inline
    return NextResponse.json({
      success: true,
      message: results.errors.length > 0 
        ? "Importación completada con algunos errores" 
        : "Importación completada exitosamente",
      results
    });
  } catch (error: any) {
    console.error("Error importing data:", error);
    return NextResponse.json({ error: error.message || "Error interno al importar" }, { status: 500 });
  }
}