import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "Falta el userId" }, { status: 400 });
    }

    // 1. Obtener membresías directas al workspace
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: userId },
      include: {
        workspace: {
          include: {
            organization: true,
          },
        },
      },
    });

    // 2. ✅ RESPALDO INFALIBLE: Obtener workspaces donde el usuario tiene al menos una tarea asignada
    // Esto asegura que si la membresía de workspace no se creó automáticamente en el pasado, 
    // el usuario siga viendo el workspace porque tiene tareas asignadas ahí.
    const taskMemberships = await prisma.taskMember.findMany({
      where: { userId: userId },
      include: {
        task: {
          include: {
            workspace: {
              include: {
                organization: true,
              }
            }
          }
        }
      }
    });

    // Combinar y eliminar duplicados basados en workspaceId usando un Map
    const workspaceMap = new Map();

    // Agregar membresías directas primero
    for (const m of memberships) {
      workspaceMap.set(m.workspace.id, {
        workspaceId: m.workspace.id,
        workspaceName: m.workspace.name,
        organizationName: m.workspace.organization?.name || "Sin organización",
        role: m.role,
      });
    }

    // Agregar workspaces por tareas asignadas (solo si no existen ya en el mapa)
    for (const tm of taskMemberships) {
      const ws = tm.task?.workspace;
      if (ws && !workspaceMap.has(ws.id)) {
        workspaceMap.set(ws.id, {
          workspaceId: ws.id,
          workspaceName: ws.name,
          organizationName: ws.organization?.name || "Sin organización",
          role: "member",
        });
      }
    }

    const finalWorkspaces = Array.from(workspaceMap.values());

    if (finalWorkspaces.length === 0) {
      return NextResponse.json({ memberships: [] }, { status: 200 });
    }

    return NextResponse.json({
      memberships: finalWorkspaces,
    }, { status: 200 });

  } catch (error) {
    console.error("Error obteniendo workspaces:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}