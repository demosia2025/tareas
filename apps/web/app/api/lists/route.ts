import { NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const spaceId = searchParams.get("spaceId")
    const folderId = searchParams.get("folderId")

    const lists = await prisma.list.findMany({
      where: {
        ...(spaceId && { spaceId }),
        ...(folderId && { folderId })
      },
      include: {
        _count: {
          select: { tasks: true }
        }
      },
      orderBy: { position: "asc" }
    })

    return NextResponse.json(lists)
  } catch (error: any) {
    console.error("Error obteniendo listas:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const body = await request.json()
    let { name, spaceId, folderId, workspaceId, color } = body

    if (!name) {
      return NextResponse.json({ error: "El nombre de la lista es requerido" }, { status: 400 })
    }

    // CORRECCIÓN: Si viene folderId pero no spaceId, autocompletamos el spaceId de la carpeta
    if (folderId && !spaceId) {
      const folder = await prisma.folder.findUnique({
        where: { id: folderId },
        select: { spaceId: true, workspaceId: true },
      })
      if (folder) {
        spaceId = folder.spaceId
        if (!workspaceId) {
          workspaceId = folder.workspaceId
        }
      }
    }

    if (!workspaceId && spaceId) {
      const space = await prisma.space.findUnique({
        where: { id: spaceId },
        select: { workspaceId: true },
      })

      if (space && space.workspaceId) {
        workspaceId = space.workspaceId
      }
    }

    if (!workspaceId) {
      return NextResponse.json({ error: "Workspace es requerido" }, { status: 400 })
    }

    const existingList = await prisma.list.findFirst({
      where: {
        name: name.trim(),
        workspaceId,
        spaceId: spaceId || null,
        folderId: folderId || null,
      }
    })

    if (existingList) {
      return NextResponse.json(existingList, { status: 200 })
    }

    const count = await prisma.list.count({
      where: { workspaceId }
    })

    const list = await prisma.list.create({
      data: {
        name: name.trim(),
        workspaceId,
        spaceId: spaceId || null,
        folderId: folderId || null,
        color: color || null,
        view: "list",
        position: count,
      },
      include: {
        _count: {
          select: { tasks: true }
        }
      }
    })

    return NextResponse.json(list, { status: 201 })
  } catch (error: any) {
    console.error("Error creando lista:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const body = await request.json()
    const { id, name, spaceId, folderId, color, view } = body

    if (!id) {
      return NextResponse.json({ error: "ID es requerido" }, { status: 400 })
    }

    const existingList = await prisma.list.findUnique({
      where: { id },
      select: { workspaceId: true }
    })

    if (!existingList) {
      return NextResponse.json({ error: "Lista no encontrada" }, { status: 404 })
    }

    const userId = session.user.id;
    const userRole = (session.user as any).role;

    const membership = await prisma.workspaceMember.findFirst({
      where: {
        userId,
        workspaceId: existingList.workspaceId
      }
    })

    const isAdminOrSuper = userRole === "ADMIN" || userRole === "superadmin" || membership?.role === "admin";

    if (!isAdminOrSuper && !membership) {
      return NextResponse.json(
        { error: "No tienes permisos para editar esta lista" },
        { status: 403 }
      )
    }

    const list = await prisma.list.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(spaceId !== undefined && { spaceId }),
        ...(folderId !== undefined && { folderId }),
        ...(color !== undefined && { color }),
        ...(view && { view })
      }
    })

    return NextResponse.json(list)
  } catch (error: any) {
    console.error("Error actualizando lista:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "ID es requerido" }, { status: 400 })
    }

    const existingList = await prisma.list.findUnique({
      where: { id },
      select: { workspaceId: true }
    })

    if (!existingList) {
      return NextResponse.json({ error: "Lista no encontrada" }, { status: 404 })
    }

    const userId = session.user.id;
    const userRole = (session.user as any).role;

    const membership = await prisma.workspaceMember.findFirst({
      where: {
        userId,
        workspaceId: existingList.workspaceId
      }
    })

    const isAdminOrSuper = userRole === "ADMIN" || userRole === "superadmin" || membership?.role === "admin";

    if (!isAdminOrSuper && !membership) {
      return NextResponse.json(
        { error: "No tienes permisos para eliminar esta lista" },
        { status: 403 }
      )
    }

    await prisma.list.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error eliminando lista:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
