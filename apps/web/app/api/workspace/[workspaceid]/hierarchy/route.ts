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
        membership = await prisma.workspaceMember.create({
          data: {
            userId: session.user.id,
            workspaceId: workspaceId,
            role: "member"
          }
        })
        console.log(`✅ Membresía de respaldo creada para ${session.user.id} en workspace ${workspaceId}`)
      } else {
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
          },
          orderBy: { position: "asc" }
        }
      },
      orderBy: { position: "asc" }
    })

    // 4. ✅ CONTEO EXPLÍCITO DE TAREAS POR LISTA
    // Recopilar todos los listIds
    const allListIds: string[] = []
    spaces.forEach(space => {
      space.lists?.forEach(list => allListIds.push(list.id))
      space.folders?.forEach(folder => {
        folder.lists?.forEach(list => allListIds.push(list.id))
      })
    })

    // Contar tareas por lista (incluyendo subtareas)
    const taskCounts = await prisma.task.groupBy({
      by: ['listId'],
      where: {
        listId: { in: allListIds }
      },
      _count: {
        id: true
      }
    })

    // Crear un mapa de conteos
    const countMap = new Map<string, number>()
    taskCounts.forEach(item => {
      if (item.listId) {
        countMap.set(item.listId, item._count.id)
      }
    })

    // 5. Adjuntar el conteo a cada lista
    const spacesWithCounts = spaces.map(space => ({
      ...space,
      lists: space.lists?.map(list => ({
        ...list,
        _count: { tasks: countMap.get(list.id) || 0 }
      })),
      folders: space.folders?.map(folder => ({
        ...folder,
        lists: folder.lists?.map(list => ({
          ...list,
          _count: { tasks: countMap.get(list.id) || 0 }
        }))
      }))
    }))

    return NextResponse.json(spacesWithCounts)
  } catch (error: any) {
    console.error("Error obteniendo jerarquía:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}