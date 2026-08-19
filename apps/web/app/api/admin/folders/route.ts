import { NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (user?.role !== "superadmin" && user?.role !== "admin") {
      return NextResponse.json({ error: "No tienes permisos" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get("workspaceId")

    const spaces = await prisma.space.findMany({
      where: workspaceId ? { workspaceId } : {},
      include: {
        workspace: { select: { name: true } },
        _count: {
          select: { folders: true, lists: true, tasks: true }
        }
      },
      orderBy: { position: "asc" }
    })

    return NextResponse.json(spaces)
  } catch (error: any) {
    console.error("Error obteniendo spaces:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (user?.role !== "superadmin" && user?.role !== "admin") {
      return NextResponse.json({ error: "No tienes permisos" }, { status: 403 })
    }

    const body = await request.json()
    const { name, workspaceId, description, icon, color, slug } = body

    if (!name || !workspaceId) {
      return NextResponse.json({ error: "Nombre y workspace son requeridos" }, { status: 400 })
    }

    const space = await prisma.space.create({
      data: {
        name,
        slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
        workspaceId,
        description: description || null,
        icon: icon || null,
        color: color || "#8b5cf6"
      },
      include: {
        workspace: { select: { name: true } }
      }
    })

    return NextResponse.json(space, { status: 201 })
  } catch (error: any) {
    console.error("Error creando space:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (user?.role !== "superadmin" && user?.role !== "admin") {
      return NextResponse.json({ error: "No tienes permisos" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 })
    }

    const body = await request.json()
    const { name, description, icon, color, slug, position } = body

    const space = await prisma.space.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(slug !== undefined && { slug }),
        ...(description !== undefined && { description }),
        ...(icon !== undefined && { icon }),
        ...(color !== undefined && { color }),
        ...(position !== undefined && { position })
      },
      include: {
        workspace: { select: { name: true } }
      }
    })

    return NextResponse.json(space)
  } catch (error: any) {
    console.error("Error actualizando space:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    if (user?.role !== "superadmin" && user?.role !== "admin") {
      return NextResponse.json({ error: "No tienes permisos" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 })
    }

    await prisma.space.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error eliminando space:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}