import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET - Listar miembros de la tarea
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id: taskId } = await params;

    const taskMembers = await prisma.taskMember.findMany({
      where: { taskId: taskId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        }
      }
    });

    return NextResponse.json(taskMembers);
  } catch (error: any) {
    console.error("Error obteniendo miembros de tarea:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST - Agregar miembro a la tarea
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id: taskId } = await params;
    const body = await req.json();
    const { userId, email } = body;

    let targetUserId = userId;

    if (email && !userId) {
      const userByEmail = await prisma.user.findUnique({
        where: { email },
        select: { id: true }
      });

      if (!userByEmail) {
        return NextResponse.json({ 
          error: "Usuario no encontrado con ese email" 
        }, { status: 404 });
      }

      targetUserId = userByEmail.id;
    }

    if (!targetUserId) {
      return NextResponse.json({ 
        error: "userId o email es requerido" 
      }, { status: 400 });
    }

    // 1. Obtener la tarea para saber a qué workspace pertenece
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { 
        workspaceId: true,
        spaceId: true,
        title: true
      }
    });

    if (!task) {
      return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 });
    }

    // 2. ✅ CORREGIDO: Usar findFirst en lugar de clave compuesta
    const existingMembership = await prisma.workspaceMember.findFirst({
      where: {
        userId: targetUserId,
        workspaceId: task.workspaceId
      }
    });

    // 3. Si no tiene membresía, crearla automáticamente
    if (!existingMembership) {
      await prisma.workspaceMember.create({
        data: {
          userId: targetUserId,
          workspaceId: task.workspaceId,
          role: "member"
        }
      });
      console.log(`✅ Membresía creada automáticamente para usuario ${targetUserId} en workspace ${task.workspaceId}`);
    }

    // 4. ✅ CORREGIDO: Usar findFirst en lugar de clave compuesta
    const existingTaskMember = await prisma.taskMember.findFirst({
      where: {
        userId: targetUserId,
        taskId: taskId
      }
    });

    if (existingTaskMember) {
      return NextResponse.json({ 
        message: "El usuario ya es miembro de esta tarea",
        membership: existingTaskMember
      });
    }

    // 5. Agregar el usuario como miembro de la tarea
    const taskMember = await prisma.taskMember.create({
      data: {
        userId: targetUserId,
        taskId: taskId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json({ 
      message: "Usuario asignado a la tarea y workspace",
      membership: taskMember
    }, { status: 201 });

  } catch (error: any) {
    console.error("Error asignando miembro a tarea:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE - Remover miembro de la tarea
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id: taskId } = await params;
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId es requerido" }, { status: 400 });
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { workspaceId: true }
    });

    if (!task) {
      return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 });
    }

    // ✅ CORREGIDO: Usar findFirst en lugar de clave compuesta
    const requesterMembership = await prisma.workspaceMember.findFirst({
      where: {
        userId: session.user.id,
        workspaceId: task.workspaceId
      }
    });

    if (!requesterMembership || requesterMembership.role === "member") {
      return NextResponse.json({ 
        error: "No tienes permisos para remover miembros" 
      }, { status: 403 });
    }

    // ✅ CORREGIDO: Usar deleteMany con where simple en lugar de clave compuesta
    await prisma.taskMember.deleteMany({
      where: {
        userId: userId,
        taskId: taskId
      }
    });

    return NextResponse.json({ 
      message: "Miembro removido de la tarea" 
    });

  } catch (error: any) {
    console.error("Error removiendo miembro de tarea:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}