// apps/web/lib/authorization.ts

import { prisma } from "@/lib/prisma";
import { getPlanLimits,} from "./plan-limits";

export interface AuthContext {
  userId: string;
  workspaceId?: string;
  organizationId?: string;
}

export async function checkUserLimit(organizationId: string): Promise<{
  allowed: boolean;
  currentCount: number;
  limit: number;
  plan: string;
}> {
  // Obtener la organización y su plan
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: {
      workspaces: {
        include: {
          members: true
        }
      }
    }
  });

  if (!org) {
    return { allowed: false, currentCount: 0, limit: 0, plan: "free" };
  }

  // Contar usuarios únicos en todos los workspaces de la organización
  const uniqueUserIds = new Set<string>();
  org.workspaces.forEach(ws => {
    ws.members.forEach(member => {
      uniqueUserIds.add(member.userId);
    });
  });

  const currentCount = uniqueUserIds.size;
  const limits = getPlanLimits(org.plan);

  return {
    allowed: currentCount < limits.maxUsers,
    currentCount,
    limit: limits.maxUsers === Infinity ? -1 : limits.maxUsers,
    plan: org.plan
  };
}

export async function checkWorkspaceLimit(organizationId: string): Promise<{
  allowed: boolean;
  currentCount: number;
  limit: number;
}> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    include: {
      workspaces: true
    }
  });

  if (!org) {
    return { allowed: false, currentCount: 0, limit: 0 };
  }

  const currentCount = org.workspaces.length;
  const limits = getPlanLimits(org.plan);

  return {
    allowed: currentCount < limits.maxWorkspaces,
    currentCount,
    limit: limits.maxWorkspaces === Infinity ? -1 : limits.maxWorkspaces
  };
}

export async function getUserRoleInWorkspace(
  userId: string, 
  workspaceId: string
): Promise<string | null> {
  const membership = await prisma.workspaceMember.findUnique({
    where: {
      userId_workspaceId: {
        userId,
        workspaceId
      }
    }
  });

  return membership?.role || null;
}

export async function isWorkspaceOwner(
  userId: string, 
  workspaceId: string
): Promise<boolean> {
  const role = await getUserRoleInWorkspace(userId, workspaceId);
  return role === "owner";
}

export async function isWorkspaceAdmin(
  userId: string, 
  workspaceId: string
): Promise<boolean> {
  const role = await getUserRoleInWorkspace(userId, workspaceId);
  return role === "admin" || role === "owner";
}