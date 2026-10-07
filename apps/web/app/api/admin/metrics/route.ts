import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    const userId = session.user.id;

    if (userRole === "superadmin") {
      // Superadmin ve métricas de TODO el sistema
      const [totalOrganizations, totalWorkspaces, totalUsers, totalTasks] = await Promise.all([
        prisma.organization.count(),
        prisma.workspace.count(),
        prisma.user.count({ where: { role: { not: "superadmin" } } }),
        prisma.task.count()
      ]);

      return NextResponse.json({
        totalOrganizations,
        totalWorkspaces,
        totalUsers,
        totalTasks
      });
    } else if (userRole === "admin") {
      // Admin solo ve métricas de SU organización
      const memberships = await prisma.workspaceMember.findMany({
        where: {
          userId,
          role: { in: ["admin", "owner"] }
        },
        include: {
          workspace: {
            select: { organizationId: true }
          }
        }
      });

      const orgIds = memberships
        .map(m => m.workspace.organizationId)
        .filter((id): id is string => Boolean(id));

      if (orgIds.length === 0) {
        return NextResponse.json({
          totalOrganizations: 0,
          totalWorkspaces: 0,
          totalUsers: 0,
          totalTasks: 0
        });
      }

      const [totalOrganizations, totalWorkspaces, totalUsers, totalTasks] = await Promise.all([
        prisma.organization.count({ where: { id: { in: orgIds } } }),
        prisma.workspace.count({ where: { organizationId: { in: orgIds } } }),
        prisma.user.count({
          where: {
            memberships: {
              some: {
                workspace: {
                  organizationId: { in: orgIds }
                }
              }
            },
            role: { not: "superadmin" }
          }
        }),
        prisma.task.count({
          where: {
            workspace: {
              organizationId: { in: orgIds }
            }
          }
        })
      ]);

      return NextResponse.json({
        totalOrganizations,
        totalWorkspaces,
        totalUsers,
        totalTasks
      });
    } else {
      return NextResponse.json({ error: "No tienes permisos" }, { status: 403 });
    }
  } catch (error: any) {
    console.error("Error obteniendo métricas:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}