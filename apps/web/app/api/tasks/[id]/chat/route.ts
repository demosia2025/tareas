import { NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"

// GET: Obtener comentarios de la tarea
export async function GET(
  request: Request,
  { params }: { params: Promise<{ taskid: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { taskid } = await params

    const comments = await prisma.taskComment.findMany({
      where: { taskId: taskid },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true }
        }
      },
      orderBy: { createdAt: "asc" }
    })

    return NextResponse.json(comments)
  } catch (error: any) {
    console.error("Error obteniendo comentarios:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST: Crear un comentario o adjuntar archivo
export async function POST(
  request: Request,
  { params }: { params: Promise<{ taskid: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { taskid } = await params
    const body = await request.json()
    const { content, fileUrl, fileName } = body

    if (!content && !fileUrl) {
      return NextResponse.json({ error: "El mensaje o archivo es requerido" }, { status: 400 })
    }

    const comment = await prisma.taskComment.create({
      data: {
        taskId: taskid,
        userId: session.user.id,
        content: content || "",
        fileUrl: fileUrl || null,
        fileName: fileName || null,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true }
        }
      }
    })

    return NextResponse.json(comment, { status: 201 })
  } catch (error: any) {
    console.error("Error creando comentario:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}