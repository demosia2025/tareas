import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { inviteCode, workspaceSlug, userId } = await request.json();

    if (!inviteCode || !workspaceSlug || !userId) {
      return NextResponse.json(
        { error: "Todos los campos son requeridos" },
        { status: 400 }
      );
    }

    // Buscar por slug normalizado
    const normalizedSlug = workspaceSlug.toLowerCase().trim().replace(/\s+/g, '-');
    
    const workspace = await prisma.workspace.findFirst({
      where: {
        OR: [
          { slug: normalizedSlug },
          { slug: workspaceSlug } // Por si acaso
        ]
      },
    });

    if (!workspace) {
      return NextResponse.json(
        { 
          error: "Workspace no encontrado",
          debug: { searchedSlug: normalizedSlug, originalSlug: workspaceSlug }
        },
        { status: 404 }
      );
    }

    // Verificar invitación
    const invite = await prisma.workspaceInvite.findUnique({
      where: { code: inviteCode },
    });

    if (!invite || invite.workspaceId !== workspace.id) {
      return NextResponse.json(
        { error: "Código de invitación inválido o no corresponde a este workspace" },
        { status: 400 }
      );
    }

    // Verificar que no haya expirado
    if (invite.expiresAt && invite.expiresAt <= new Date()) {
      return NextResponse.json(
        { error: "El código de invitación ha expirado" },
        { status: 400 }
      );
    }

    // Verificar si el código ya fue utilizado
    if (invite.usedAt) {
      return NextResponse.json(
        { error: "Este código de invitación ya ha sido utilizado" },
        { status: 400 }
      );
    }

    // ✅ CORREGIDO: Usar findFirst para evitar errores de claves compuestas en Prisma
    const existingMember = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: workspace.id,
        userId,
      },
    });

    if (existingMember) {
      return NextResponse.json(
        { error: "Ya eres miembro de este workspace" },
        { status: 400 }
      );
    }

    // Agregar al workspace
    await prisma.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId,
        role: "member", // ✅ CORREGIDO: minúsculas para coincidir con el enum WorkspaceRole
      },
    });

    // ✅ CORREGIDO: WorkspaceInvite no tiene usedCount, usa usedAt y usedBy
    await prisma.workspaceInvite.update({
      where: { code: inviteCode },
      data: {
        usedAt: new Date(),
        usedBy: userId,
      },
    });

    return NextResponse.json({
      message: "Te has unido al workspace exitosamente",
      workspaceId: workspace.id,
      workspaceName: workspace.name,
    });
  } catch (error: any) {
    console.error("Error uniéndose al workspace:", error);
    return NextResponse.json(
      { error: error.message || "Error al unirse al workspace" },
      { status: 500 }
    );
  }
}