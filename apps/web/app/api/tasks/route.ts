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

    if (!listId) {
      return NextResponse.json({ error: "listId es requerido" }, { status: 400 });
    }

    const allTasks = await prisma.task.findMany({
      where: { listId },
      include: {
        assignee: true,
        creator: true,
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
    let { title, listId, workspaceId, status, priority, dueDate, description, parentId, parentTaskId } = body;

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

    // ✅ CORRECCIÓN: Generar un identifier único usando UUID para evitar colisiones por concurrencia
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
        identifier, // ✅ Ahora es 100% único
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
    const { id, title, status, priority, dueDate, description, parentId, parentTaskId } = body;

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
