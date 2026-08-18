import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const taskId = params.id;
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