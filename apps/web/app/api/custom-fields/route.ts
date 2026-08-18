import { NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const listId = searchParams.get("listId")

    if (!listId) return NextResponse.json([])

    const list = await prisma.list.findUnique({ where: { id: listId }, select: { workspaceId: true } })
    if (!list) return NextResponse.json([])

    const fields = await prisma.customField.findMany({
      where: { workspaceId: list.workspaceId },
      orderBy: { position: "asc" }
    })

    return NextResponse.json(fields)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

    const body = await request.json()
    const { name, type, options, listId } = body

    if (!name || !type || !listId) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 })
    }

    const list = await prisma.list.findUnique({ where: { id: listId }, select: { workspaceId: true } })
    if (!list) return NextResponse.json({ error: "Lista no encontrada" }, { status: 404 })

    const field = await prisma.customField.create({
      data: {
        name,
        type,
        options: options || null,
        workspaceId: list.workspaceId
      }
    })

    return NextResponse.json(field, { status: 201 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}