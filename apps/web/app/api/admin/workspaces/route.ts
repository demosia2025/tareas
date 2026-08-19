import { NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } })
    if (user?.role !== "superadmin" && user?.role !== "admin") {
      return NextResponse.json({ error: "No tienes permisos" }, { status: 403 })
    }

    // ✅ INCLUIMOS LA ORGANIZACIÓN PARA EL SIDEBAR
    const workspaces = await prisma.workspace.findMany({
      include: {
        organization: { select: { id: true, name: true, slug: true } }
      },
      orderBy: { createdAt: "desc" }
    })

    return NextResponse.json(workspaces)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } })
    if (user?.role !== "superadmin" && user?.role !== "admin") {
      return NextResponse.json({ error: "No tienes permisos" }, { status: 403 })
    }

    const body = await request.json()
    const { name, slug, plan, organizationId } = body

    if (!name || !slug || !organizationId) {
      return NextResponse.json({ error: "Nombre, slug y Organización son requeridos" }, { status: 400 })
    }

    const workspace = await prisma.workspace.create({
      data: {
        name,
        slug,
        plan: plan || "free",
        organizationId // ✅ Vinculación explícita
      },
      include: {
        organization: { select: { id: true, name: true, slug: true } }
      }
    })

    return NextResponse.json(workspace, { status: 201 })
  } catch (error: any) {
    console.error("Error creando workspace:", error)
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "El slug ya está en uso" }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } })
    if (user?.role !== "superadmin" && user?.role !== "admin") {
      return NextResponse.json({ error: "No tienes permisos" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 })

    const body = await request.json()
    const { name, slug, plan, organizationId } = body

    const updatedWorkspace = await prisma.workspace.update({
      where: { id },
      data: {
        name,
        slug,
        plan,
        organizationId: organizationId || null
      },
      include: {
        organization: { select: { id: true, name: true, slug: true } }
      }
    })

    return NextResponse.json(updatedWorkspace)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } })
    if (user?.role !== "superadmin" && user?.role !== "admin") {
      return NextResponse.json({ error: "No tienes permisos" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 })

    await prisma.workspace.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
