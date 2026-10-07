import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ✅ GET: Listar invitaciones con aislamiento por propiedad
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
    
    const userRole = user?.role;

    if (userRole !== "superadmin" && userRole !== "admin") {
      return NextResponse.json({ error: "No tienes permisos" }, { status: 403 });
    }

    // 👑 SUPERADMIN: Ve todas las invitaciones del sistema
    if (userRole === "superadmin") {
      const invitations = await prisma.userInvitation.findMany({
        include: {
          workspace: {
            select: { id: true, name: true, slug: true },
          },
          inviter: {
            select: { id: true, name: true, email: true },
          },
          invitedUser: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json({ invitations });
    }

    // 🛡️ ADMIN: Ve únicamente invitaciones de sus workspaces (owner) o hechas por él
    const adminWorkspaces = await prisma.workspaceMember.findMany({
      where: {
        userId: session.user.id,
        role: "owner" // 🔑 FILTRO ESTRICTO DE PROPIEDAD
      },
      select: { workspaceId: true }
    });

    const ownedWorkspaceIds = adminWorkspaces.map((m) => m.workspaceId);

    const invitations = await prisma.userInvitation.findMany({
      where: {
        OR: [
          { invitedBy: session.user.id },
          { workspaceId: { in: ownedWorkspaceIds } }
        ]
      },
      include: {
        workspace: {
          select: { id: true, name: true, slug: true },
        },
        inviter: {
          select: { id: true, name: true, email: true },
        },
        invitedUser: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
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
    
    const currentUser = await prisma.user.findUnique({
      where: { id: currentUserId },
      select: { role: true }
    });

    const userRole = currentUser?.role;

    if (userRole !== "superadmin" && userRole !== "admin") {
      return NextResponse.json({ error: "No tienes permisos" }, { status: 403 });
    }

    const body = await req.json();
    const { email, workspaceId, role = "member" } = body;

    if (!email || !workspaceId) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }

    // Validar propiedad del workspace para Admin regular
    if (userRole === "admin") {
      const membership = await prisma.workspaceMember.findFirst({
        where: {
          workspaceId,
          userId: currentUserId,
          role: "owner"
        },
      });

      if (!membership) {
        return NextResponse.json({ error: "No tienes permisos de propietario en este workspace" }, { status: 403 });
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

    const userRole = user?.role;

    if (userRole !== "superadmin" && userRole !== "admin") {
      return NextResponse.json({ error: "No tienes permisos" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    // Validar propiedad para Admin regular antes de eliminar
    if (userRole === "admin") {
      const targetInvitation = await prisma.userInvitation.findUnique({
        where: { id },
        select: { invitedBy: true, workspaceId: true }
      });

      if (!targetInvitation) {
        return NextResponse.json({ error: "Invitación no encontrada" }, { status: 404 });
      }

      const isOwnerOfWorkspace = await prisma.workspaceMember.findFirst({
        where: {
          workspaceId: targetInvitation.workspaceId,
          userId: session.user.id,
          role: "owner"
        }
      });

      if (targetInvitation.invitedBy !== session.user.id && !isOwnerOfWorkspace) {
        return NextResponse.json({ error: "No tienes permisos para eliminar esta invitación" }, { status: 403 });
      }
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