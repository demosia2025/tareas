import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function getTenantContext() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "No autorizado" }, { status: 401 }) };
  }

  const userRole = (session.user as any).role || "user";
  const isSuperAdmin = userRole === "superadmin";

  // Si es Super Admin, tiene acceso a todo (omitiendo filtros de org)
  if (isSuperAdmin) {
    return { 
      userId: session.user.id, 
      role: userRole, 
      isSuperAdmin: true, 
      allowedOrgIds: null,
      allowedWorkspaceIds: null 
    };
  }

  // Para Admin y User, obtenemos sus organizaciones y workspaces permitidos
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId: session.user.id },
    select: { organizationId: true, workspaceId: true }
  });

      const rawOrgIds = memberships.map((m: any) => m.organizationId).filter(Boolean) as string[];
  const allowedOrgIds = [...new Set<string>(rawOrgIds)];
  const allowedWorkspaceIds = memberships.map((m: any) => m.workspaceId).filter(Boolean) as string[];
  if (allowedOrgIds.length === 0) {
    return { error: NextResponse.json({ error: "No perteneces a ninguna organización" }, { status: 403 }) };
  }

  return {
    userId: session.user.id,
    role: userRole,
    isSuperAdmin: false,
    allowedOrgIds,
    allowedWorkspaceIds
  };
}