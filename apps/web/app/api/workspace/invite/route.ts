import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function POST(request: Request) {
  try {
    const session = await auth();
    const { workspaceId } = await request.json();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Usuario no autenticado" },
        { status: 401 }
      );
    }

    // Verificar si el usuario es admin del workspace
    const member = await prisma.workspaceMember.findFirst({
      where: {
        userId: session.user.id as string,
        workspaceId,
      },
      include: { workspace: true },
    });

    if (!member || member.role !== "admin") {
      return NextResponse.json(
        { error: "No tienes permisos para generar invitaciones" },
        { status: 403 }
      );
    }

    // Generar código único
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 días de validez

    // Crear invitación
    const invite = await prisma.workspaceInvite.create({
      data: {
        workspaceId,
        code,
        expiresAt,
      },
    });

    return NextResponse.json({
      code: invite.code,
      expiresAt: invite.expiresAt,
    });
  } catch (error) {
    console.error("Error generando invitación:", error);
    return NextResponse.json(
      { error: "Error al generar el código" },
      { status: 500 }
    );
  }
}