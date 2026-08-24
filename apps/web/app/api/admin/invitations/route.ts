import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const currentUserId = session.user.id;
    const body = await req.json();
    const { email, workspaceId, role = "member" } = body;

    if (!email || !workspaceId) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }

    // Verificar que el usuario actual sea admin/owner del workspace
    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: currentUserId,
        },
      },
    });

    if (!membership || (membership.role !== "admin" && membership.role !== "owner")) {
      return NextResponse.json({ error: "No tienes permisos" }, { status: 403 });
    }

    // Buscar el usuario por email
    const targetUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // Verificar que no sea ya miembro
    const existingMembership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: targetUser.id,
        },
      },
    });

    if (existingMembership) {
      return NextResponse.json({ error: "El usuario ya es miembro de este workspace" }, { status: 400 });
    }

    // ✅ CREAR LA MEMBRESÍA DIRECTAMENTE (no solo invitación)
    await prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: targetUser.id,
        role: role as any,
      },
    });

    // Opcional: Crear también un registro de invitación para tracking
    await prisma.userInvitation.create({
      data: {
        workspaceId,
        invitedUserId: targetUser.id,
        invitationType: "workspace",
        status: "accepted",
        invitedBy: currentUserId,
      },
    });

    return NextResponse.json({ 
      success: true, 
      user: { id: targetUser.id, name: targetUser.name, email: targetUser.email } 
    });
  } catch (error) {
    console.error("Error inviting user:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}