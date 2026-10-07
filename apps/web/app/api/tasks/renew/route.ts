import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { taskId } = body;

    if (!taskId) {
      return NextResponse.json({ error: "ID de tarea requerido" }, { status: 400 });
    }

    // Verificar que la tarea existe y el usuario tiene permisos
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        workspace: {
          include: {
            members: {
              where: { userId: session.user.id }
            }
          }
        }
      }
    });

    if (!task) {
      return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 });
    }

    const userRole = (session.user as any)?.role;
    const isMember = task.workspace.members.length > 0;
    const isAdminOrSuper = userRole === "admin" || userRole === "superadmin";
    const isCreator = task.creatorId === session.user.id;
    const isAssignee = task.assigneeId === session.user.id;

    if (!isMember && !isAdminOrSuper && !isCreator && !isAssignee) {
      return NextResponse.json({ error: "No tienes permisos para renovar esta tarea" }, { status: 403 });
    }

    // ✅ CAMBIADO: Calcular nueva fecha de vencimiento (sumar 48 horas / 2 días según estándar SLA)
    const currentDueDate = task.dueDate ? new Date(task.dueDate) : new Date();
    const newDueDate = new Date(currentDueDate.getTime() + 48 * 60 * 60 * 1000); // 48 horas en milisegundos

    // Actualizar la tarea
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        renewalCount: { increment: 1 },
        lastRenewedAt: new Date(),
        dueDate: newDueDate
      }
    });

    return NextResponse.json(updatedTask);
  } catch (error: any) {
    console.error("❌ Error al renovar tarea:", error);
    return NextResponse.json({ error: error.message || "Error interno" }, { status: 500 });
  }
}