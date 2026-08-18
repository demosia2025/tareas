import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/admin-auth";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    // 1. Verificar permisos de Super Admin
    const authCheck = await requireSuperAdmin();
    if (authCheck instanceof NextResponse) return authCheck;

    // 2. Consultas de métricas
    const [totalUsers, totalWorkspaces, totalOrganizations, totalTasks, activeMembers] = await Promise.all([
      prisma.user.count(),
      prisma.workspace.count(),
      prisma.organization.count().catch(() => 0),
      prisma.task.count(),
      prisma.user.count({
        where: {
          OR: [{ role: "superadmin" }, { role: "admin" }]
        }
      }).catch(() => prisma.user.count())
    ]);

    return NextResponse.json({
      totalUsers,
      totalWorkspaces,
      totalOrganizations,
      totalTasks,
      activeMembers
    });
  } catch (error) {
    console.error("Error en /api/admin/stats:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}