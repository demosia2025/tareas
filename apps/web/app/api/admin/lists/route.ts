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

    if (user?.role !== "super_admin" && user?.role !== "admin") {
      return NextResponse.json({ error: "No tienes permisos" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const workspaceId = searchParams.get("workspaceId")
    const spaceId = searchParams.get("spaceId")
    const folderId = searchParams.get("folderId")

    const lists = await prisma.list.findMany({
      where: {
        ...(workspaceId && { workspaceId }),
        ...(spaceId && { spaceId }),
        ...(folderId && { folderId })
      },
      include: {
        space: { select: { name: true } },
        folder: { select: { name: true } },
        workspace: { select: { name: true } },
        _count: {
          select: { tasks: true }
        }
      },
      orderBy: { position: "asc" }
    })

    return NextResponse.json(lists)
  } catch (error: any) {
    console.error("Error obteniendo lists:", error)
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

    if (user?.role !== "super_admin" && user?.role !== "admin") {
      return NextResponse.json({ error: "No tienes permisos" }, { status: 403 })
    }

    const body = await request.json()
    const { name, workspaceId, spaceId, folderId, description, icon, color, view } = body

    if (!name || !workspaceId) {
      return NextResponse.json({ error: "Nombre y workspace son requeridos" }, { status: 400 })
    }

    const list = await prisma.list.create({
      data: {
        name,
        workspaceId,
        spaceId: spaceId || null,
        folderId: folderId || null,
        description: description || null,
        icon: icon || null,
        color: color || null,
        view: view || "list"
      },
      include: {
        space: { select: { name: true } },
        folder: { select: { name: true } },
        workspace: { select: { name: true } }
      }
    })

    return NextResponse.json(list, { status: 201 })
  } catch (error: any) {
    console.error("Error creando list:", error)
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

    if (user?.role !== "super_admin" && user?.role !== "admin") {
      return NextResponse.json({ error: "No tienes permisos" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 })
    }

    const body = await request.json()
    const { name, spaceId, folderId, description, icon, color, view, position } = body

    const list = await prisma.list.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(spaceId !== undefined && { spaceId }),
        ...(folderId !== undefined && { folderId }),
        ...(description !== undefined && { description }),
        ...(icon !== undefined && { icon }),
        ...(color !== undefined && { color }),
        ...(view !== undefined && { view }),
        ...(position !== undefined && { position })
      },
      include: {
        space: { select: { name: true } },
        folder: { select: { name: true } },
        workspace: { select: { name: true } }
      }
    })

    return NextResponse.json(list)
  } catch (error: any) {
    console.error("Error actualizando list:", error)
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

    if (user?.role !== "super_admin" && user?.role !== "admin") {
      return NextResponse.json({ error: "No tienes permisos" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 })
    }

    await prisma.list.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error eliminando list:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}