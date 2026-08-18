import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { assigneeId } = await req.json();

    const updatedTask = await db.task.update({
      where: { id: params.id },
      data: { assigneeId: assigneeId || null },
      include: {
        assignee: {
          select: { id: true, name: true, email: true, image: true }
        }
      }
    });

    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error("Error asignando tarea:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}