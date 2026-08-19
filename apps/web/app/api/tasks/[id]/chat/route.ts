import { NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"

// GET: Obtener comentarios de la tarea
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> } // ✅ Cambiado de 'taskid' a 'id' para coincidir con la carpeta [id]
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await params // ✅ Desestructuramos 'id'

    const comments = await prisma.taskComment.findMany({
      where: { taskId: id }, // ✅ Usamos 'id' aquí
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
  { params }: { params: Promise<{ id: string }> } // ✅ Cambiado de 'taskid' a 'id'
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { id } = await params // ✅ Desestructuramos 'id'
    const body = await request.json()
    const { content, fileUrl, fileName } = body

    if (!content && !fileUrl) {
      return NextResponse.json({ error: "El mensaje o archivo es requerido" }, { status: 400 })
    }

    const comment = await prisma.taskComment.create({
      data: {
        taskId: id, // ✅ Usamos 'id' aquí
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