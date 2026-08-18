import { NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const resolvedParams = await params;
    const parentId = resolvedParams.id; // ✅ CORREGIDO: la carpeta es [id]

    const subtasks = await prisma.task.findMany({
      where: { parentId },
      orderBy: { position: "asc" }
    })

    return NextResponse.json(subtasks)
  } catch (error: any) {
    console.error("Error obteniendo subtareas:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const resolvedParams = await params;
    const parentId = resolvedParams.id; // ✅ CORREGIDO

    const body = await request.json()
    const { title, description } = body

    // Obtener la tarea padre para copiar su workspace/list
    const parentTask = await prisma.task.findUnique({
      where: { id: parentId },
      select: { workspaceId: true, listId: true }
    })

    if (!parentTask) {
      return NextResponse.json({ error: "Tarea padre no encontrada" }, { status: 404 })
    }

    // Generar identifier único para subtask
    const count = await prisma.task.count({
      where: { parentId }
    })

    const subtask = await prisma.task.create({
      data: {
        workspaceId: parentTask.workspaceId,
        listId: parentTask.listId,
        parentId: parentId,
        identifier: `SUB-${Date.now()}`, // Identificador único y limpio
        title,
        description: description || null,
        status: "todo",
        priority: 0,
        creatorId: session.user.id
      }
    })

    return NextResponse.json(subtask, { status: 201 })
  } catch (error: any) {
    console.error("Error creando subtask:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}