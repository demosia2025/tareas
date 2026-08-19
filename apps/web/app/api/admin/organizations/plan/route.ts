import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    // ✅ Super Admin: puede ver cualquier organización
    if (user?.role === "superadmin") {
      // Obtener la primera organización del sistema (o puedes hacer que reciba un parámetro)
      const org = await prisma.organization.findFirst({
        orderBy: { createdAt: "desc" }
      });

      if (!org) {
        return NextResponse.json({ error: "No hay organizaciones" }, { status: 404 });
      }

      // Contar usuarios totales en todos los workspaces de esta org
      const workspaces = await prisma.workspace.findMany({
        where: { organizationId: org.id },
        include: { members: true }
      });

      // ✅ CORREGIDO: Agregado ': any' a los parámetros
      const totalUsers = workspaces.reduce((acc: any, ws: any) => acc + ws.members.length, 0);

      const planLimits: Record<string, { maxUsers: number; maxWorkspaces: number }> = {
        free: { maxUsers: 3, maxWorkspaces: 1 },
        pro: { maxUsers: 8, maxWorkspaces: 5 },
        premium: { maxUsers: Infinity, maxWorkspaces: Infinity }
      };

      const limits = planLimits[org.plan?.toLowerCase() || "free"] || planLimits.free;

      return NextResponse.json({
        organization: {
          id: org.id,
          name: org.name,
          plan: org.plan
        },
        limits: {
          maxUsers: limits.maxUsers,
          maxWorkspaces: limits.maxWorkspaces
        },
        usage: {
          currentUsers: totalUsers,
          userLimit: limits.maxUsers,
          canAddMoreUsers: limits.maxUsers === Infinity || totalUsers < limits.maxUsers
        },
        display: {
          userLimitText: limits.maxUsers === Infinity ? "Ilimitados" : `${limits.maxUsers} usuarios`,
          planName: (org.plan || "free").charAt(0).toUpperCase() + (org.plan || "free").slice(1)
        }
      });
    }

    // ✅ Admin normal: buscar su membresía
    const membership = await prisma.workspaceMember.findFirst({
      where: { userId: session.user.id },
      include: {
        organization: true
      }
    });

    if (!membership?.organization) {
      return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
    }

    const org = membership.organization;

    const workspaces = await prisma.workspace.findMany({
      where: { organizationId: org.id },
      include: { members: true }
    });

    // ✅ CORREGIDO: Agregado ': any' a los parámetros
    const totalUsers = workspaces.reduce((acc: any, ws: any) => acc + ws.members.length, 0);

    const planLimits: Record<string, { maxUsers: number; maxWorkspaces: number }> = {
      free: { maxUsers: 3, maxWorkspaces: 1 },
      pro: { maxUsers: 8, maxWorkspaces: 5 },
      premium: { maxUsers: Infinity, maxWorkspaces: Infinity }
    };

    const limits = planLimits[org.plan?.toLowerCase() || "free"] || planLimits.free;

    return NextResponse.json({
      organization: {
        id: org.id,
        name: org.name,
        plan: org.plan
      },
      limits: {
        maxUsers: limits.maxUsers,
        maxWorkspaces: limits.maxWorkspaces
      },
      usage: {
        currentUsers: totalUsers,
        userLimit: limits.maxUsers,
        canAddMoreUsers: limits.maxUsers === Infinity || totalUsers < limits.maxUsers
      },
      display: {
        userLimitText: limits.maxUsers === Infinity ? "Ilimitados" : `${limits.maxUsers} usuarios`,
        planName: (org.plan || "free").charAt(0).toUpperCase() + (org.plan || "free").slice(1)
      }
    });
  } catch (error: any) {
    console.error("Error fetching plan info:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ✅ Endpoint para cambiar plan (solo Super Admin)
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    if (user?.role !== "superadmin") {
      return NextResponse.json({ error: "Solo el Super Admin puede cambiar planes" }, { status: 403 });
    }

    const body = await request.json();
    const { orgId, plan } = body;

    if (!orgId || !plan) {
      return NextResponse.json({ error: "orgId y plan son requeridos" }, { status: 400 });
    }

    const validPlans = ["free", "pro", "premium"];
    if (!validPlans.includes(plan.toLowerCase())) {
      return NextResponse.json({ error: "Plan no válido" }, { status: 400 });
    }

    const org = await prisma.organization.update({
      where: { id: orgId },
      data: { plan: plan.toLowerCase() }
    });

    return NextResponse.json(org);
  } catch (error: any) {
    console.error("Error cambiando plan:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
