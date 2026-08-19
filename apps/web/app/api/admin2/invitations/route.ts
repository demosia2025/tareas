import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function getAdminOrganization(userId: string) {
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId, role: { in: ["admin", "owner"] } },
    include: { workspace: { select: { organizationId: true } } }
  });
  return membership?.workspace?.organizationId;
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
    if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
      return NextResponse.json({ error: "No tienes permisos" }, { status: 403 });
    }

    const adminOrgId = await getAdminOrganization(session.user.id);
    
    const invitations = await prisma.userInvitation.findMany({
      where: {
        workspace: { organizationId: adminOrgId }
      },
      include: {
        invitedUser: { select: { name: true, email: true } },
        workspace: { select: { name: true } },
        inviter: { select: { name: true, email: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(invitations);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
    if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
      return NextResponse.json({ error: "No tienes permisos" }, { status: 403 });
    }

    const body = await req.json();
    const { email, workspaceId, invitationType = "workspace", taskId } = body;

    if (!email || !workspaceId) {
      return NextResponse.json({ error: "Email y workspace son requeridos" }, { status: 400 });
    }

    const adminOrgId = await getAdminOrganization(session.user.id);
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    
    if (!workspace || workspace.organizationId !== adminOrgId) {
      return NextResponse.json({ error: "Workspace no pertenece a tu organización" }, { status: 403 });
    }

    // 1. Buscar el usuario que se va a invitar por su correo
    const targetUser = await prisma.user.findUnique({ where: { email } });
    if (!targetUser) {
      return NextResponse.json({ error: "El usuario con este correo no está registrado" }, { status: 404 });
    }

    // 2. Verificar si ya existe una invitación pendiente usando `invitedUserId`
    const existingInvitation = await prisma.userInvitation.findFirst({
      where: {
        invitedUserId: targetUser.id,
        workspaceId,
        taskId: taskId || null,
        status: "pending"
      }
    });

    if (existingInvitation) {
      return NextResponse.json({ error: "Ya existe una invitación pendiente para este usuario" }, { status: 400 });
    }

    // 3. Crear la invitación usando `invitedUserId` y `invitedBy`
    const invitation = await prisma.userInvitation.create({
      data: {
        workspaceId,
        invitedUserId: targetUser.id,
        invitedBy: session.user.id,
        invitationType,
        taskId: taskId || null,
        status: "pending"
      },
      include: {
        workspace: { select: { name: true } },
        invitedUser: { select: { name: true, email: true } }
      }
    });

    return NextResponse.json({ message: "Invitación creada", invitation }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
    if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
      return NextResponse.json({ error: "No tienes permisos" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

    const adminOrgId = await getAdminOrganization(session.user.id);
    const invitation = await prisma.userInvitation.findUnique({ 
      where: { id },
      include: { workspace: { select: { organizationId: true } } }
    });
    
    if (!invitation || invitation.workspace.organizationId !== adminOrgId) {
      return NextResponse.json({ error: "Invitación no encontrada o no pertenece a tu organización" }, { status: 403 });
    }

    await prisma.userInvitation.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}