import { NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"

// GET - Obtener datos del perfil del usuario actual
export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        createdAt: true,
        updatedAt: true,
      }
    })

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 })
    }

    // Convertimos las fechas a strings ISO para evitar desfases al serializar en JSON
    return NextResponse.json({
      ...user,
      createdAt: user.createdAt ? user.createdAt.toISOString() : null,
      updatedAt: user.updatedAt ? user.updatedAt.toISOString() : null,
    })
  } catch (error) {
    console.error("Error obteniendo perfil:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}

// PATCH - Actualizar datos del perfil
export async function PATCH(request: Request) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { name, image } = body

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(name && { name }),
        ...(image !== undefined && { image }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        updatedAt: true,
      }
    })

    return NextResponse.json({
      ...updatedUser,
      updatedAt: updatedUser.updatedAt ? updatedUser.updatedAt.toISOString() : null,
    })
  } catch (error) {
    console.error("Error actualizando perfil:", error)
    return NextResponse.json({ error: "Error interno" }, { status: 500 })
  }
}