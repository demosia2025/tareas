// apps/web/app/api/tasks/route.ts
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { randomUUID } from "crypto";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const listId = searchParams.get("listId");
    const workspaceId = searchParams.get("workspaceId");
    const assigneeId = searchParams.get("assigneeId");
    const parentId = searchParams.get("parentId");

    // Construir el where clause dinámicamente
    const whereClause: any = {};

    if (listId && listId !== "placeholder") {
      whereClause.listId = listId;
    }

    if (workspaceId) {
      whereClause.workspaceId = workspaceId;
    }

    if (assigneeId) {
      whereClause.assigneeId = assigneeId;
    }

    if (parentId) {
      whereClause.parentId = parentId;
    }

    // Si no hay ningún filtro, retornar vacío o tareas del workspace del usuario
    if (Object.keys(whereClause).length === 0) {
      // Obtener workspaces del usuario
      const memberships = await prisma.workspaceMember.findMany({
        where: { userId: session.user.id },
        select: { workspaceId: true },
      });

      const workspaceIds = memberships.map((m) => m.workspaceId);
      
      if (workspaceIds.length === 0) {
        return NextResponse.json([]);
      }

      whereClause.workspaceId = { in: workspaceIds };
    }

    const allTasks = await prisma.task.findMany({
      where: whereClause,
      include: {
        assignee: true,
        creator: true,
        list: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(allTasks);
  } catch (error: any) {
    console.error("Error obteniendo tareas:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
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
        customAttributes: {}
      },
      include: {
        assignee: true,
        creator: true,
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error: any) {
    console.error("Error detallado creando tarea:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { id, title, status, priority, dueDate, description, parentId, parentTaskId, assigneeId } = body;

    const resolvedParentId = parentId || parentTaskId;

    if (!id) {
      return NextResponse.json({ error: "ID de tarea requerido" }, { status: 400 });
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
        assignee: true,
        creator: true,
      },
    });

    return NextResponse.json(task);
  } catch (error: any) {
    console.error("Error actualizando tarea:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    await prisma.task.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error eliminando tarea:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}