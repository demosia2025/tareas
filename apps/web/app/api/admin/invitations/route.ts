import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// ✅ GET: Listar todas las invitaciones del sistema
export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Verificar que el usuario sea superadmin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });

    if (user?.role !== "superadmin" && user?.role !== "admin") {
      return NextResponse.json({ error: "No tienes permisos" }, { status: 403 });
    }

    // Obtener todas las invitaciones con sus relaciones
    const invitations = await prisma.userInvitation.findMany({
      include: {
        workspace: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        inviter: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        invitedUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ invitations });
  } catch (error) {
    console.error("Error fetching invitations:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// ✅ POST: Crear una nueva invitación
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
    const invitation = await prisma.userInvitation.create({
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
      user: { id: targetUser.id, name: targetUser.name, email: targetUser.email },
      invitation: { id: invitation.id, status: invitation.status }
    });
  } catch (error) {
    console.error("Error inviting user:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}