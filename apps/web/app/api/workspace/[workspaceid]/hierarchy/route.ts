import { NextResponse } from "next/server"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const resolvedParams = await params
    const workspaceId = resolvedParams.workspaceid

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId es requerido" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    })

    // 1. Verificar membresía directa en el workspace
    let membership = await prisma.workspaceMember.findFirst({
      where: {
        userId: session.user.id,
        workspaceId: workspaceId
      }
    })

    // 2. ✅ RESPALDO INFALIBLE: Si no tiene membresía, verificar si tiene tareas asignadas aquí
    if (!membership && user?.role !== "superadmin") {
      const hasTaskInWorkspace = await prisma.task.findFirst({
        where: {
          workspaceId: workspaceId,
          OR: [
            { assigneeId: session.user.id },
            { members: { some: { userId: session.user.id } } }
          ]
        }
      })

      if (hasTaskInWorkspace) {
        // ✅ Crear membresía automáticamente para que tenga acceso consistente de ahora en adelante
        membership = await prisma.workspaceMember.create({
          data: {
            userId: session.user.id,
            workspaceId: workspaceId,
            role: "member"
          }
        })
        console.log(`✅ Membresía de respaldo creada para ${session.user.id} en workspace ${workspaceId}`)
      } else {
        // Si realmente no tiene nada que ver aquí, bloquear el acceso
        return NextResponse.json({ error: "No tienes acceso a este workspace" }, { status: 403 })
      }
    }

    // 3. Obtener spaces con folders y lists
    const spaces = await prisma.space.findMany({
      where: { workspaceId: workspaceId },
      include: {
        folders: {
          include: {
            lists: {
              select: {
                id: true,
                name: true,
                icon: true,
                color: true,
                spaceId: true,
                folderId: true,
                _count: {
                  select: { tasks: true }
                }
              },
              orderBy: { position: "asc" }
            }
          },
          orderBy: { position: "asc" }
        },
        lists: {
          select: {
            id: true,
            name: true,
            icon: true,
            color: true,
            spaceId: true,
            folderId: true,
            _count: {
              select: { tasks: true }
            }
          },
          orderBy: { position: "asc" }
        }
      },
      orderBy: { position: "asc" }
    })

    return NextResponse.json(spaces)
  } catch (error: any) {
    console.error("Error obteniendo jerarquía:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}