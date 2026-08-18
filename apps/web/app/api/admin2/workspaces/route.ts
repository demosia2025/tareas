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
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
    if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
      return NextResponse.json({ error: "No tienes permisos" }, { status: 403 });
    }

    const adminOrgId = await getAdminOrganization(session.user.id);
    
    const workspaces = await prisma.workspace.findMany({
      where: { organizationId: adminOrgId },
      include: {
        _count: { select: { members: true, spaces: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(workspaces);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
    if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
      return NextResponse.json({ error: "No tienes permisos" }, { status: 403 });
    }

    const body = await req.json();
    const { name, slug, plan = "free", color = "#06b6d4" } = body;

    if (!name || !slug) {
      return NextResponse.json({ error: "Nombre y slug son requeridos" }, { status: 400 });
    }

    const adminOrgId = await getAdminOrganization(session.user.id);
    if (!adminOrgId) {
      return NextResponse.json({ error: "No tienes una organización asignada" }, { status: 403 });
    }

    const workspace = await prisma.workspace.create({
      data: {
        name,
        slug,
        plan,
        color,
        organizationId: adminOrgId
      }
    });

    return NextResponse.json({ message: "Workspace creado", workspace }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
    if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
      return NextResponse.json({ error: "No tienes permisos" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

    const body = await req.json();
    const { name, slug, plan, color } = body;

    const adminOrgId = await getAdminOrganization(session.user.id);
    const existingWorkspace = await prisma.workspace.findUnique({ where: { id } });
    
    if (!existingWorkspace || existingWorkspace.organizationId !== adminOrgId) {
      return NextResponse.json({ error: "Workspace no encontrado o no pertenece a tu organización" }, { status: 403 });
    }

    const updatedWorkspace = await prisma.workspace.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(slug && { slug }),
        ...(plan && { plan }),
        ...(color && { color })
      }
    });

    return NextResponse.json(updatedWorkspace);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
    if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
      return NextResponse.json({ error: "No tienes permisos" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

    const adminOrgId = await getAdminOrganization(session.user.id);
    const existingWorkspace = await prisma.workspace.findUnique({ where: { id } });
    
    if (!existingWorkspace || existingWorkspace.organizationId !== adminOrgId) {
      return NextResponse.json({ error: "Workspace no encontrado o no pertenece a tu organización" }, { status: 403 });
    }

    await prisma.workspace.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}