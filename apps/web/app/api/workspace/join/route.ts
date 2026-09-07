import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { inviteCode, workspaceSlug } = await req.json();

    if (!inviteCode || !workspaceSlug) {
      return NextResponse.json({ error: "Código y slug son requeridos" }, { status: 400 });
    }

    // ✅ Normalizar el código a mayúsculas para la búsqueda
    const normalizedCode = inviteCode.toUpperCase().trim();

    // Buscar el workspace por slug
    const workspace = await prisma.workspace.findUnique({
      where: { slug: workspaceSlug },
      include: {
        inviteCodes: {
          where: {
            code: normalizedCode,
            active: true,
          },
        },
      },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace no encontrado" }, { status: 404 });
    }

    // Verificar si el código es válido
    const validCode = workspace.inviteCodes[0];
    if (!validCode) {
      return NextResponse.json({ error: "Código de invitación inválido" }, { status: 400 });
    }

    // Verificar expiración
    if (validCode.expiresAt && new Date() > new Date(validCode.expiresAt)) {
      return NextResponse.json({ error: "El código de invitación ha expirado" }, { status: 400 });
    }

    // Verificar límite de usos
    if (validCode.usedCount >= validCode.maxUses) {
      return NextResponse.json({ error: "El código de invitación ha alcanzado su límite de usos" }, { status: 400 });
    }

    // Verificar si el usuario ya es miembro
    const existingMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: workspace.id,
          userId: session.user.id,
        },
      },
    });

    if (existingMember) {
      return NextResponse.json({ error: "Ya eres miembro de este workspace" }, { status: 400 });
    }

    // Agregar usuario al workspace
    await prisma.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId: session.user.id,
        role: "member",
      },
    });

    // Incrementar contador de usos del código
    await prisma.inviteCode.update({
      where: { id: validCode.id },
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