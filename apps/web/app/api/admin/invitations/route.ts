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
    
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });
    
    if (user?.role !== "superadmin" && user?.role !== "admin") {
      return NextResponse.json({ error: "No tienes permisos" }, { status: 403 });
    }

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
    
    // ✅ VERIFICAR SI EL USUARIO ES SUPER ADMIN
    const currentUser = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: { role: true }
    });

    const isSuperAdmin = currentUser?.role === "superadmin";

    const body = await req.json();
    const { email, workspaceId, role = "member" } = body;

    if (!email || !workspaceId) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }

    // ✅ BYPASS PARA SUPER ADMIN: No necesita ser miembro del workspace
    if (!isSuperAdmin) {
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
    }

    const targetUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

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

    // Crear la membresía directamente
    await prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: targetUser.id,
        role: role as any,
      },
    });

    // Crear registro de invitación para tracking
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

// ✅ DELETE: Eliminar invitación
export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    if (user?.role !== "superadmin" && user?.role !== "admin") {
      return NextResponse.json({ error: "No tienes permisos" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    await prisma.userInvitation.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: "Invitación eliminada correctamente" });
  } catch (error: any) {
    console.error("Error eliminando invitación:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}