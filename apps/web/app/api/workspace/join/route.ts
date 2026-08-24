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
    const { inviteCode, workspaceSlug } = body;

    if (!inviteCode || !workspaceSlug) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }

    // ✅ CORRECCIÓN 1: Buscar el código en MAYÚSCULAS (case-insensitive)
    const code = inviteCode.toUpperCase().trim();
    const slug = workspaceSlug.toLowerCase().trim();

    // Buscar el workspace por slug
    const workspace = await prisma.workspace.findUnique({
      where: { slug },
      include: {
        inviteCodes: {
          where: {
            code: code,
            active: true,
          },
        },
      },
    });

    if (!workspace) {
      return NextResponse.json({ 
        error: "No se encontró el workspace con ese slug" 
      }, { status: 404 });
    }

    // Verificar que el código de invitación sea válido
    const inviteCodeRecord = workspace.inviteCodes[0];
    
    if (!inviteCodeRecord) {
      return NextResponse.json({ 
        error: "El código de invitación no es válido para este workspace" 
      }, { status: 400 });
    }

    // Verificar que el código no haya expirado
    if (inviteCodeRecord.expiresAt && new Date(inviteCodeRecord.expiresAt) < new Date()) {
      return NextResponse.json({ 
        error: "El código de invitación ha expirado" 
      }, { status: 400 });
    }

    // Verificar que no se haya excedido el límite de usos
    if (inviteCodeRecord.usedCount >= inviteCodeRecord.maxUses) {
      return NextResponse.json({ 
        error: "El código de invitación ha alcanzado su límite de usos" 
      }, { status: 400 });
    }

    // Verificar que el usuario no sea ya miembro
    const existingMembership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: workspace.id,
          userId: currentUserId,
        },
      },
    });

    if (existingMembership) {
      return NextResponse.json({ 
        error: "Ya eres miembro de este workspace" 
      }, { status: 400 });
    }

    // ✅ CREAR LA MEMBRESÍA
    await prisma.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId: currentUserId,
        role: "member",
      },
    });

    // ✅ ACTUALIZAR EL CONTADOR DE USOS DEL CÓDIGO
    await prisma.inviteCode.update({
      where: { id: inviteCodeRecord.id },
      data: {
        usedCount: { increment: 1 },
        usedBy: currentUserId,
        usedAt: new Date(),
      },
    });

    return NextResponse.json({ 
      success: true, 
      workspace: { id: workspace.id, name: workspace.name, slug: workspace.slug } 
    });
  } catch (error) {
    console.error("Error joining workspace:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}