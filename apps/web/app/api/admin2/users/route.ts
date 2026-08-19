import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

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
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
    if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
      return NextResponse.json({ error: "No tienes permisos" }, { status: 403 });
    }

    const adminOrgId = await getAdminOrganization(session.user.id);
    if (!adminOrgId) {
      return NextResponse.json({ error: "No tienes una organización asignada" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      where: {
        memberships: {
          some: {
            workspace: { organizationId: adminOrgId }
          }
        }
      },
      include: {
        _count: { select: { memberships: true, createdTasks: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(users);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
    if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
      return NextResponse.json({ error: "No tienes permisos" }, { status: 403 });
    }

    const body = await req.json();
    const { name, email, password, role, workspaceId } = body;

    if (!name || !email || !password || !workspaceId) {
      return NextResponse.json({ error: "Todos los campos son requeridos" }, { status: 400 });
    }

    const adminOrgId = await getAdminOrganization(session.user.id);
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    
    if (!workspace || workspace.organizationId !== adminOrgId) {
      return NextResponse.json({ error: "Workspace no pertenece a tu organización" }, { status: 403 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "El email ya está registrado" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: { name, email, password: hashedPassword, role: role || "user" }
    });

    await prisma.workspaceMember.create({
      data: { userId: newUser.id, workspaceId, role: "member" }
    });

    return NextResponse.json({ message: "Usuario creado correctamente", user: newUser }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
    if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
      return NextResponse.json({ error: "No tienes permisos" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

    const body = await req.json();
    let { name, email, password, role, workspaceId } = body;

    if (password && password.trim() !== "") {
      password = await bcrypt.hash(password, 10);
    } else {
      password = undefined;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(password && { password }),
        ...(role && { role })
      }
    });

    if (workspaceId) {
      const adminOrgId = await getAdminOrganization(session.user.id);
      const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
      if (!workspace || workspace.organizationId !== adminOrgId) {
        return NextResponse.json({ error: "Workspace no pertenece a tu organización" }, { status: 403 });
      }

      const existingMembership = await prisma.workspaceMember.findUnique({
        where: { userId_workspaceId: { userId: id, workspaceId } }
      });

      if (!existingMembership) {
        await prisma.workspaceMember.create({
          data: { userId: id, workspaceId, role: "member" }
        });
      }
    }

    return NextResponse.json(updatedUser);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
    if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
      return NextResponse.json({ error: "No tienes permisos" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

    await prisma.workspaceMember.deleteMany({ where: { userId: id } });
    await prisma.user.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
