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
        inviter: { select: { name: true } }
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
    const { email, workspaceId, invitationType = "workspace" } = body;

    if (!email || !workspaceId) {
      return NextResponse.json({ error: "Email y workspace son requeridos" }, { status: 400 });
    }

    const adminOrgId = await getAdminOrganization(session.user.id);
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    
    if (!workspace || workspace.organizationId !== adminOrgId) {
      return NextResponse.json({ error: "Workspace no pertenece a tu organización" }, { status: 403 });
    }

    // ✅ CORREGIDO: Uso de 'email' según el esquema de Prisma
    const existingInvitation = await prisma.userInvitation.findFirst({
      where: {
        email,
        workspaceId,
        status: "pending"
      }
    });

    if (existingInvitation) {
      return NextResponse.json({ error: "Ya existe una invitación pendiente para este email" }, { status: 400 });
    }

    // ✅ CORREGIDO: Uso de 'email' en la creación
    const invitation = await prisma.userInvitation.create({
      data: {
        email,
        workspaceId,
        invitationType,
        inviterId: session.user.id,
        status: "pending"
      },
      include: {
        workspace: { select: { name: true } }
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