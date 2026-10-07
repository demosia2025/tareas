// apps/web/lib/rbac.ts
// Utilidad centralizada de RBAC que reutiliza las entidades existentes:
// - User.role (global: "user" | "admin" | "superadmin")
// - WorkspaceMember.role (local: "member" | "admin" | "owner")
// - InviteCode (códigos de invitación)

import { prisma } from "./prisma";

export type GlobalRole = "user" | "admin" | "superadmin";
export type WorkspaceMemberRole = "member" | "admin" | "owner";

export interface UserRoleContext {
  userId: string;
  globalRole: GlobalRole;
  workspaceId?: string;
  organizationId?: string;
  workspaceRole?: WorkspaceMemberRole;
  isSuperAdmin: boolean;
  // admin2 contextual: admin local dentro de su organización/workspace activo
  isContextualAdmin: boolean;
  // Owner flow: el usuario creó el workspace (rol owner en el workspace activo)
  isOwner: boolean;
}

/**
 * Standardiza el formato de código de invitación.
 * Formato: alfanumérico, 6 caracteres, mayúsculas (ej: "123ABC").
 */
export function normalizeInviteCode(code: string): string {
  if (!code) return "";
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

/**
 * Genera un código de invitación con formato estándar (6 caracteres alfanuméricos).
 */
export function generateInviteCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Obtiene el contexto completo de roles del usuario para el workspace activo.
 * Reutiliza las variables/sesiones existentes y no crea esquemas paralelos.
 */
export async function resolveUserRoleContext(
  userId: string,
  workspaceId?: string
): Promise<UserRoleContext> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  const globalRole = (user?.role || "user") as GlobalRole;
  const isSuperAdmin = globalRole === "superadmin";

  // Si es superadmin, tiene acceso total global persistente sin importar el workspace
  if (isSuperAdmin && workspaceId) {
    return {
      userId,
      globalRole,
      workspaceId,
      isSuperAdmin: true,
      isContextualAdmin: true,
      isOwner: true,
    };
  }

  // Si no hay workspace activo, evaluar rol global
  if (!workspaceId) {
    const isContextualAdmin = globalRole === "admin";
    return {
      userId,
      globalRole,
      isSuperAdmin,
      isContextualAdmin,
      isOwner: false,
    };
  }

  // Evaluar rol contextual en el workspace activo (UserId, ActiveWorkspaceId)
  const membership = await prisma.workspaceMember.findFirst({
    where: {
      userId,
      workspaceId,
    },
    include: { workspace: { select: { organizationId: true } } },
  });

  const workspaceRole = (membership?.role || "member") as WorkspaceMemberRole;
  const isOwner = workspaceRole === "owner";
  // admin2 contextual: rol admin u owner en el workspace activo
  const isContextualAdmin = workspaceRole === "admin" || workspaceRole === "owner";

  return {
    userId,
    globalRole,
    workspaceId,
    organizationId: membership?.workspace?.organizationId || undefined,
    workspaceRole,
    isSuperAdmin,
    isContextualAdmin,
    isOwner,
  };
}

/**
 * Verifica si el usuario puede generar códigos de invitación.
 * Solo admin2 (admin/owner del workspace) o superadmin.
 */
export async function canGenerateInvites(
  userId: string,
  workspaceId: string
): Promise<boolean> {
  const ctx = await resolveUserRoleContext(userId, workspaceId);
  return ctx.isSuperAdmin || ctx.isContextualAdmin;
}

/**
 * Verifica si el usuario puede unirse a un workspace mediante código de invitación.
 */
export async function canJoinViaInvite(
  userId: string,
  workspaceId: string
): Promise<boolean> {
  return true;
}

/**
 * Valida que un código de invitación fue generado legítimamente por un admin/superadmin del workspace.
 */
export async function validateInviteCode(
  rawCode: string,
  workspaceId?: string
): Promise<{ valid: boolean; error?: string; inviteCode?: any }> {
  const code = normalizeInviteCode(rawCode);
  if (!code || code.length !== 6) {
    return { valid: false, error: "El código de invitación debe tener 6 caracteres alfanuméricos" };
  }

  const inviteCode = await prisma.inviteCode.findUnique({
    where: { code },
    include: {
      workspace: true,
      createdBy: { select: { id: true, role: true } },
    },
  });

  if (!inviteCode) {
    return { valid: false, error: "Código de invitación no encontrado" };
  }

  if (!inviteCode.active) {
    return { valid: false, error: "El código de invitación está inactivo" };
  }

  if (inviteCode.expiresAt && new Date() > new Date(inviteCode.expiresAt)) {
    return { valid: false, error: "El código de invitación ha expirado" };
  }

  if (inviteCode.usedCount >= inviteCode.maxUses) {
    return { valid: false, error: "El código ha alcanzado su límite de usos" };
  }

  if (workspaceId && inviteCode.workspaceId !== workspaceId) {
    return { valid: false, error: "El código no corresponde a este workspace" };
  }

  // Verificar que fue generado legítimamente por un Administrador de ese workspace (admin2) o por el Super Admin (admin/superadmin)
  const creatorRole = inviteCode.createdBy?.role;
  const isGlobalAdmin = creatorRole === "admin" || creatorRole === "superadmin";

  let isLegitimateAdmin = isGlobalAdmin;
  if (!isLegitimateAdmin && inviteCode.createdById && inviteCode.workspaceId) {
    const creatorMembership = await prisma.workspaceMember.findFirst({
      where: {
        userId: inviteCode.createdById,
        workspaceId: inviteCode.workspaceId,
        role: { in: ["admin", "owner"] },
      },
    });
    isLegitimateAdmin = !!creatorMembership;
  }

  if (!isLegitimateAdmin) {
    return { valid: false, error: "El código no fue generado por un administrador válido" };
  }

  return { valid: true, inviteCode };
}
