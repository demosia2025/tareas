import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { sendTaskNotification } from "@/lib/email";
import prisma from "@/lib/prisma";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    const userRole = user?.role;

    const { searchParams } = new URL(request.url);
    const listId = searchParams.get("listId");
    const workspaceId = searchParams.get("workspaceId");
    const assigneeId = searchParams.get("assigneeId");
    const parentId = searchParams.get("parentId") || searchParams.get("parentTaskId");

    const baseFilters: any = {};

    if (listId && listId !== "placeholder") {
      baseFilters.listId = listId;
    }
    if (assigneeId) {
      baseFilters.assigneeId = assigneeId;
    }
    if (parentId) {
      baseFilters.parentId = parentId;
    }

    let whereClause: any = { ...baseFilters };

    // 👑 LÓGICA SUPERADMIN: Acceso total
    if (userRole === "superadmin") {
      if (workspaceId) {
        whereClause.OR = [
          { workspaceId: workspaceId },
          { list: { space: { workspaceId: workspaceId } } },
          { list: { workspaceId: workspaceId } }
        ];
      }
    } 
    // ️ LÓGICA ADMIN: Aislamiento estricto por propiedad
    else if (userRole === "admin") {
      const adminWorkspaces = await prisma.workspaceMember.findMany({
        where: {
          userId: session.user.id,
          role: "owner" // 🔑 FILTRO ESTRICTO DE PROPIEDAD
        },
        select: { workspaceId: true }
      });

      const ownedWorkspaceIds = adminWorkspaces.map((m) => m.workspaceId);

      if (ownedWorkspaceIds.length === 0) {
        return NextResponse.json([]);
      }

      const targetWorkspaceIds = workspaceId
        ? ownedWorkspaceIds.filter((id) => id === workspaceId)
        : ownedWorkspaceIds;

      if (targetWorkspaceIds.length === 0) {
        return NextResponse.json([]);
      }

      whereClause.OR = [
        { workspaceId: { in: targetWorkspaceIds } },
        { list: { space: { workspaceId: { in: targetWorkspaceIds } } } },
        { list: { workspaceId: { in: targetWorkspaceIds } } }
      ];
    } 
    // 👤 LÓGICA USUARIO NORMAL: Solo ve sus propias tareas
    else {
      // Filtrar solo tareas asignadas al usuario o creadas por él
      if (workspaceId) {
        whereClause.OR = [
          { 
            AND: [
              { assigneeId: session.user.id },
              { workspaceId: workspaceId }
            ]
          },
          { 
            AND: [
              { creatorId: session.user.id },
              { workspaceId: workspaceId }
            ]
          },
          { 
            AND: [
              { assigneeId: session.user.id },
              { list: { space: { workspaceId: workspaceId } } }
            ]
          },
          { 
            AND: [
              { creatorId: session.user.id },
              { list: { space: { workspaceId: workspaceId } } }
            ]
          }
        ];
      } else {
        whereClause.OR = [
          { assigneeId: session.user.id },
          { creatorId: session.user.id }
        ];
      }
    }

    const allTasks = await prisma.task.findMany({
      where: whereClause,
      include: {
        assignee: {
          select: { id: true, name: true, email: true, image: true }
        },
        creator: {
          select: { id: true, name: true, email: true, image: true }
        },
        parent: {
          select: {
            id: true,
            title: true,
          },
        } as any,
        list: {
          select: {
            id: true,
            name: true,
            space: {
              select: {
                id: true,
                name: true,
                workspace: {
                  select: { id: true, name: true }
                }
              }
            }
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(allTasks);
  } catch (error: any) {
    console.error("❌ Error detallado en GET /api/tasks:", error);
    return NextResponse.json({ 
      error: error.message || "Error interno del servidor",
      details: error.meta || error.code 
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    const userRole = user?.role;

    if (userRole !== "superadmin" && userRole !== "admin") {
      return NextResponse.json({ error: "No tienes permisos" }, { status: 403 });
    }

    const body = await request.json();
    let { title, listId, workspaceId, status, priority, dueDate, description, parentId, parentTaskId, assigneeId } = body;
    
    const resolvedParentId = parentId || parentTaskId || null;

    if (!title) return NextResponse.json({ error: "Falta el campo obligatorio: title" }, { status: 400 });
    if (!listId) return NextResponse.json({ error: "Falta el campo obligatorio: listId" }, { status: 400 });

    if (!workspaceId) {
      const list = await prisma.list.findUnique({
        where: { id: listId },
        select: { workspaceId: true },
      });
      if (!list || !list.workspaceId) {
        return NextResponse.json({ error: "No se encontró el workspace asociado a esta lista" }, { status: 400 });
      }
      workspaceId = list.workspaceId;
    }

    if (userRole === "admin") {
      const isOwner = await prisma.workspaceMember.findFirst({
        where: {
          workspaceId,
          userId: session.user.id,
          role: "owner"
        }
      });

      if (!isOwner) {
        return NextResponse.json({ error: "No tienes permisos para crear tareas en este workspace" }, { status: 403 });
      }
    }

    const uniqueSuffix = randomUUID().split('-')[0].toUpperCase();
    const identifier = `TASK-${uniqueSuffix}`;

    const task = await prisma.task.create({
      data: {
        title,
        listId,
        workspaceId,
        status: status || "todo",
        priority: priority !== undefined && priority !== null ? String(priority) : "2",
        dueDate: dueDate ? new Date(dueDate) : null,
        description: description || null,
        parentId: resolvedParentId,
        creatorId: session.user.id,
        assigneeId: assigneeId || null,
        identifier,
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error: any) {
    console.error("❌ Error detallado creando tarea:", error);
    return NextResponse.json({ error: error.message, details: error.meta }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    const userRole = user?.role;

    if (userRole !== "superadmin" && userRole !== "admin") {
      return NextResponse.json({ error: "No tienes permisos" }, { status: 403 });
    }

    const body = await request.json();
    const { id, title, status, priority, dueDate, description, parentId, parentTaskId, assigneeId } = body;
    const resolvedParentId = parentId || parentTaskId;

    if (!id) {
      return NextResponse.json({ error: "ID de tarea requerido" }, { status: 400 });
    }

    const previousTask = await prisma.task.findUnique({ 
      where: { id },
      include: { assignee: true }
    });

    if (!previousTask) {
      return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 });
    }

    if (userRole === "admin") {
      const isOwner = await prisma.workspaceMember.findFirst({
        where: {
          workspaceId: previousTask.workspaceId,
          userId: session.user.id,
          role: "owner"
        }
      });

      if (!isOwner) {
        return NextResponse.json({ error: "No tienes permisos para editar esta tarea" }, { status: 403 });
      }
    }

    const task = await prisma.task.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(status && { status }),
        ...(priority !== undefined && { priority: priority !== null ? String(priority) : "2" }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(description !== undefined && { description }),
        ...(resolvedParentId !== undefined && { parentId: resolvedParentId }),
        ...(assigneeId !== undefined && { assigneeId }),
      },
      include: {
        assignee: { select: { id: true, name: true, email: true } },
        creator: { select: { id: true, name: true, email: true } },
      },
    });

    const oldId = previousTask?.assigneeId ? String(previousTask.assigneeId) : null;
    const newId = task.assigneeId ? String(task.assigneeId) : null;

    if (newId && newId !== oldId) {
      if (task.assignee?.email) {
        try {
          // ✅ CORRECCIÓN: Usar sintaxis de objeto para SendGrid
          await sendTaskNotification({
            to: task.assignee.email,
            taskTitle: task.title,
            taskDescription: task.description || "",
            assignedBy: task.creator?.name || "Un miembro del equipo",
            taskId: task.id,
          });
        } catch (emailError) {
          console.error("Error al enviar correo de notificación:", emailError);
        }
      }
    }

    return NextResponse.json(task);
  } catch (error: any) {
    console.error("❌ Error detallado actualizando tarea:", error);
    return NextResponse.json({ error: error.message, details: error.meta }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    const userRole = user?.role;

    if (userRole !== "superadmin" && userRole !== "admin") {
      return NextResponse.json({ error: "No tienes permisos" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    if (userRole === "admin") {
      const targetTask = await prisma.task.findUnique({
        where: { id },
        select: { workspaceId: true }
      });

      if (!targetTask) {
        return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 });
      }

      const isOwner = await prisma.workspaceMember.findFirst({
        where: {
          workspaceId: targetTask.workspaceId,
          userId: session.user.id,
          role: "owner"
        }
      });

      if (!isOwner) {
        return NextResponse.json({ error: "No tienes permisos para eliminar esta tarea" }, { status: 403 });
      }
    }

    await prisma.task.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("❌ Error detallado eliminando tarea:", error);
    return NextResponse.json({ error: error.message, details: error.meta }, { status: 500 });
  }
}