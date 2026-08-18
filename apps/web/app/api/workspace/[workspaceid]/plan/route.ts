import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { workspaceid } = await params;

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceid },
      include: {
        organization: true,
        members: {
          include: {
            user: true
          }
        }
      }
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace no encontrado" }, { status: 404 });
    }

    // ✅ CORRECCIÓN CLAVE: Buscar el plan en la Organización primero, luego en el Workspace
    const rawPlan = (workspace.organization?.plan || workspace.plan)?.toLowerCase() || "free";
    
    const planLimits: Record<string, { users: number; workspaces: number; displayName: string }> = {
      free: { users: 3, workspaces: 1, displayName: "Free" },
      pro: { users: 8, workspaces: 5, displayName: "Pro" },
      premium: { users: Infinity, workspaces: Infinity, displayName: "Premium" }
    };

    const limits = planLimits[rawPlan] || planLimits.free;

    return NextResponse.json({
      organizationName: workspace.organization?.name || "Sin organización",
      planName: limits.displayName,
      plan: rawPlan,
      userCount: workspace.members.length,
      userLimit: limits.users,
      workspaceCount: 1,
      workspaceLimit: limits.workspaces
    });
  } catch (error) {
    console.error("Error fetching plan info:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}