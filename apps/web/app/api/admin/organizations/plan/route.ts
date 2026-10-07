import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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
      const org = await prisma.organization.findFirst({
        orderBy: { createdAt: "desc" }
      });

      if (!org) {
        return NextResponse.json({ error: "No hay organizaciones" }, { status: 404 });
      }

      const workspaces = await prisma.workspace.findMany({
        where: { organizationId: org.id },
        include: { members: true }
      });

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

// Lógica unificada para procesar el cambio de plan
async function handleUpdatePlan(request: Request) {
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
    const { orgId, id, plan } = body;
    const targetId = orgId || id;

    if (!targetId || !plan) {
      return NextResponse.json({ error: "ID de organización (orgId/id) y plan son requeridos" }, { status: 400 });
    }

    const validPlans = ["free", "pro", "premium"];
    if (!validPlans.includes(plan.toLowerCase())) {
      return NextResponse.json({ error: "Plan no válido" }, { status: 400 });
    }

    const org = await prisma.organization.update({
      where: { id: targetId },
      data: { plan: plan.toLowerCase() }
    });

    return NextResponse.json(org);
  } catch (error: any) {
    console.error("Error cambiando plan:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ✅ MÉTODOS HTTP PERMITIDOS PARA EL CAMBIO DE PLAN:
export async function POST(request: Request) {
  return handleUpdatePlan(request);
}

export async function PATCH(request: Request) {
  return handleUpdatePlan(request);
}

export async function PUT(request: Request) {
  return handleUpdatePlan(request);
}