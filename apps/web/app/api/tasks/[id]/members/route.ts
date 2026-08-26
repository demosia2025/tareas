// apps/web/app/api/tasks/[id]/members/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// GET: Obtener miembros y assignee de una tarea
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const taskId = id;

    // Obtener la tarea con assignee
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        workspace: true,
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 });
    }

    // Verificar permisos
    const member = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: task.workspaceId,
        userId: session.user.id,
      },
    });

    if (!member) {
      return NextResponse.json({ error: "No tienes acceso" }, { status: 403 });
    }

    // Obtener miembros invitados (TaskMember)
    const taskMembers = await prisma.taskMember.findMany({
      where: { taskId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    // Calcular tiempo transcurrido
    const now = new Date();
    const calculateTimeAgo = (date: Date) => {
      const diffMs = now.getTime() - new Date(date).getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMinutes < 60) return `Hace ${diffMinutes} min`;
      if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? "s" : ""}`;
      if (diffDays < 7) return `Hace ${diffDays} día${diffDays > 1 ? "s" : ""}`;
      return new Date(date).toLocaleDateString("es-ES");
    };

    // Assignee con tiempo
    let assigneeInfo = null;
    if (task.assignee) {
      assigneeInfo = {
        id: task.assignee.id,
        name: task.assignee.name,
        email: task.assignee.email,
        image: task.assignee.image,
        assignedAt: task.updatedAt,
        timeAgo: calculateTimeAgo(task.updatedAt),
      };
    }

    // Miembros invitados con tiempo
    const membersWithTime = taskMembers.map((tm) => ({
      id: tm.id,
      userId: tm.userId,
      user: tm.user,
      invitedAt: tm.createdAt,
      timeAgo: calculateTimeAgo(tm.createdAt),
    }));

    return NextResponse.json({
      assignee: assigneeInfo,
      members: membersWithTime,
    });
  } catch (error: any) {
    console.error("Error fetching task members:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Agregar miembro a una tarea (invitar)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const taskId = id;
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "userId es requerido" }, { status: 400 });
    }

    // Verificar que la tarea exista
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { workspace: true },
    });

    if (!task) {
      return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 });
    }

    // Verificar permisos
    const member = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: task.workspaceId,
        userId: session.user.id,
      },
    });

    if (!member) {
      return NextResponse.json({ error: "No tienes acceso" }, { status: 403 });
    }

    // Verificar que el usuario a invitar sea miembro del workspace
    const targetMember = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: task.workspaceId,
        userId: userId,
      },
    });

    if (!targetMember) {
      return NextResponse.json({ error: "El usuario no es miembro del workspace" }, { status: 400 });
    }

    // Verificar que no esté ya invitado
    const existingMember = await prisma.taskMember.findUnique({
      where: {
        taskId_userId: {
          taskId,
          userId,
        },
      },
    });

    if (existingMember) {
      return NextResponse.json({ error: "El usuario ya está invitado a esta tarea" }, { status: 400 });
    }

    // Crear la invitación
    const taskMember = await prisma.taskMember.create({
      data: {
        taskId,
        userId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        },
      },
    });

    return NextResponse.json({ taskMember });
  } catch (error: any) {
    console.error("Error adding task member:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Eliminar miembro de una tarea
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const taskId = id;
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId es requerido" }, { status: 400 });
    }

    await prisma.taskMember.deleteMany({
      where: {
        taskId,
        userId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error removing task member:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}