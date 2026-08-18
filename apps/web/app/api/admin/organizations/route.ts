import { NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"

export async function GET() {
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

    const organizations = await prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        plan: true,
        createdAt: true,
        _count: {
          select: {
            workspaces: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    })

    return NextResponse.json(organizations)
  } catch (error: any) {
    console.error("Error obteniendo organizaciones:", error)
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
    const { name, slug, description, plan } = body

    if (!name || !slug) {
      return NextResponse.json({ error: "Nombre y slug son requeridos" }, { status: 400 })
    }

    const organization = await prisma.organization.create({
      data: {
        name,
        slug,
        description: description || null,
        plan: plan || "free"
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        plan: true,
        createdAt: true
      }
    })

    return NextResponse.json(organization, { status: 201 })
  } catch (error: any) {
    console.error("Error creando organización:", error)
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
    const { name, slug, description, plan, modificationReason } = body

    const organization = await prisma.organization.findUnique({
      where: { id },
      select: { name: true, slug: true, description: true, plan: true }
    })

    if (!organization) {
      return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 })
    }

    const fieldsChanged = 
      organization.name !== name ||
      organization.slug !== slug ||
      organization.description !== description ||
      organization.plan !== plan

    if (fieldsChanged && !modificationReason) {
      return NextResponse.json({ error: "Se requiere un motivo de modificación" }, { status: 400 })
    }

    const updatedOrg = await prisma.organization.update({
      where: { id },
      data: {
        name,
        slug,
        description: description || null,
        plan: plan || "free"
      }
    })

    return NextResponse.json(updatedOrg)
  } catch (error: any) {
    console.error("Error editando organización:", error)
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

    await prisma.organization.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Error eliminando organización:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}