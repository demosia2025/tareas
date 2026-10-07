import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { validateInviteCode, normalizeInviteCode } from "@/lib/rbac";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { inviteCode, workspaceSlug } = await req.json();

    if (!inviteCode || !workspaceSlug) {
      return NextResponse.json({ error: "Código y slug de workspace son requeridos" }, { status: 400 });
    }

    const normalizedCode = normalizeInviteCode(inviteCode);
    if (!normalizedCode || normalizedCode.length !== 6) {
      return NextResponse.json({ error: "El código de invitación debe tener 6 caracteres alfanuméricos" }, { status: 400 });
    }

    // Buscar el workspace por slug
    const workspace = await prisma.workspace.findUnique({
      where: { slug: workspaceSlug.trim().toLowerCase() },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace no encontrado" }, { status: 404 });
    }

    // Validar el código contra el workspace y verificar que haya sido generado por un Admin / Super Admin legítimo
    const validation = await validateInviteCode(normalizedCode, workspace.id);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error || "Código de invitación inválido" }, { status: 400 });
    }

    // Verificar si el usuario ya es miembro
    const existingMember = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: workspace.id,
        userId: session.user.id,
      },
    });

    if (existingMember) {
      return NextResponse.json({ error: "Ya eres miembro de este workspace" }, { status: 400 });
    }

    // Agregar usuario al workspace como miembro estándar
    await prisma.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId: session.user.id,
        role: "member",
        organizationId: workspace.organizationId,
      },
    });

    // Incrementar contador de usos del código
    await prisma.inviteCode.update({
      where: { id: validation.inviteCode.id },
      data: {
        usedCount: { increment: 1 },
      },
    });

    return NextResponse.json({ 
      success: true, 
      workspaceName: workspace.name 
    });
  } catch (error) {
    console.error("Error joining workspace:", error);
    return NextResponse.json({ error: "Error interno al unirse al workspace" }, { status: 500 });
  }
}