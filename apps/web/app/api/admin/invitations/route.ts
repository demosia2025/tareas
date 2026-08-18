import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(request: Request) {
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

    const invitations = await prisma.userInvitation.findMany({
      include: {
        invitedUser: { select: { name: true, email: true } },
        workspace: { select: { name: true } },
        inviter: { select: { name: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(invitations);
  } catch (error: any) {
    console.error("Error obteniendo invitaciones:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
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

    const body = await request.json();
    const { email, workspaceId, invitationType } = body;

    if (!email || !workspaceId || !invitationType) {
      return NextResponse.json({ 
        error: "email, workspaceId e invitationType son requeridos" 
      }, { status: 400 });
    }

    const invitedUser = await prisma.user.findUnique({
      where: { email }
    });

    if (!invitedUser) {
      return NextResponse.json({ 
        error: "Usuario no encontrado con ese email" 
      }, { status: 404 });
    }

    const invitation = await prisma.userInvitation.create({
      data: {
        workspace: { connect: { id: workspaceId } },
        invitedUser: { connect: { id: invitedUser.id } },
        inviter: { connect: { id: session.user.id } },
        invitationType,
        status: "pending"
      },
      include: {
        invitedUser: { select: { name: true, email: true } },
        workspace: { select: { name: true } },
        inviter: { select: { name: true } }
      }
    });

    return NextResponse.json(invitation, { status: 201 });
  } catch (error: any) {
    console.error("Error creando invitación:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}