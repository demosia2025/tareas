import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> } // ✅ CAMBIO 1: Agregar Promise
) {
  try {
    const { id } = await params; // ✅ CAMBIO 2: Hacer await de params
    
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const taskId = id; // ✅ CAMBIO 3: Usar 'id' directamente en lugar de 'params.id'
    const body = await req.json();
    const { folderId, listId, spaceId } = body;

    // Actualizamos los campos que correspondan en Prisma
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        ...(folderId !== undefined ? { folderId } : {}),
        ...(listId !== undefined ? { listId } : {}),
        ...(spaceId !== undefined ? { spaceId } : {}),
      },
    });

    return NextResponse.json(updatedTask);
  } catch (error: any) {
    console.error("Error al mover la tarea:", error);
    return NextResponse.json(
      { error: "Error interno al mover la tarea", details: error?.message },
      { status: 500 }
    );
  }
}