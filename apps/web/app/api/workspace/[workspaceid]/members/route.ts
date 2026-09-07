import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { workspaceid } = await params;
    
    if (!workspaceid) {
      return NextResponse.json({ error: "workspaceId requerido" }, { status: 400 });
    }

    const userGlobalRole = (session.user as any)?.role || "user";
    if (userGlobalRole !== "superadmin") {
      const member = await prisma.workspaceMember.findFirst({
        where: {
          userId: session.user.id,
          workspaceId: workspaceid,
        },
      });
      if (!member) {
        return NextResponse.json({ error: "No tienes acceso" }, { status: 403 });
      }
    }

    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId: workspaceid },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } }
      },
      orderBy: { joinedAt: "asc" }
    });

    return NextResponse.json(members);
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { workspaceid } = await params;
    
    if (!workspaceid) {
      return NextResponse.json({ error: "workspaceId requerido" }, { status: 400 });
    }

    const userGlobalRole = (session.user as any)?.role || "user";
    if (userGlobalRole !== "superadmin") {
      const member = await prisma.workspaceMember.findFirst({
        where: {
          userId: session.user.id,
          workspaceId: workspaceid,
          role: { in: ["owner", "admin"] }
        },
      });
      if (!member) {
        return NextResponse.json({ error: "No tienes permisos" }, { status: 403 });
      }
    }

    const { email, role } = await req.json();
    if (!email) {
      return NextResponse.json({ error: "Email requerido" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const existingMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: workspaceid,
          userId: user.id,
        },
      },
    });

    if (existingMember) {
      return NextResponse.json({ error: "Ya es miembro" }, { status: 400 });
    }

    const newMember = await prisma.workspaceMember.create({
      data: {
        workspaceId: workspaceid,
        userId: user.id,
        role: role || "member",
      },
      include: { 
        user: { select: { id: true, name: true, email: true, role: true } }
      },
    });

    return NextResponse.json(newMember, { status: 201 });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { workspaceid } = await params;
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    
    if (!workspaceid || !userId) {
      return NextResponse.json({ error: "Parámetros requeridos" }, { status: 400 });
    }

    const userGlobalRole = (session.user as any)?.role || "user";
    if (userGlobalRole !== "superadmin") {
      const member = await prisma.workspaceMember.findFirst({
        where: {
          userId: session.user.id,
          workspaceId: workspaceid,
          role: { in: ["owner", "admin"] }
        },
      });
      if (!member) {
        return NextResponse.json({ error: "No tienes permisos" }, { status: 403 });
      }
    }

    await prisma.workspaceMember.delete({
      where: {
        workspaceId_userId: {
          workspaceId: workspaceid,
          userId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}