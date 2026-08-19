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
    if (!session?.user?.id) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
    if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
      return NextResponse.json({ error: "No tienes permisos" }, { status: 403 });
    }

    const adminOrgId = await getAdminOrganization(session.user.id);
    const spaces = await prisma.space.findMany({
      where: { workspace: { organizationId: adminOrgId } },
      include: {
        _count: { select: { folders: true, lists: true } },
        workspace: { select: { name: true } }
      },
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json(spaces);
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
    const { name, description, color = "#06b6d4", workspaceId } = body;

    if (!name || !workspaceId) {
      return NextResponse.json({ error: "Nombre y workspace son requeridos" }, { status: 400 });
    }

    const adminOrgId = await getAdminOrganization(session.user.id);
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    
    if (!workspace || workspace.organizationId !== adminOrgId) {
      return NextResponse.json({ error: "Workspace no pertenece a tu organización" }, { status: 403 });
    }

    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const space = await prisma.space.create({
      data: { name, slug, description, color, workspaceId }
    });

    return NextResponse.json({ message: "Espacio creado", space }, { status: 201 });
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
    const { name, description, color } = body;

    const adminOrgId = await getAdminOrganization(session.user.id);
    const existingSpace = await prisma.space.findUnique({ 
      where: { id },
      include: { workspace: { select: { organizationId: true } } }
    });

    if (!existingSpace || existingSpace.workspace.organizationId !== adminOrgId) {
      return NextResponse.json({ error: "Espacio no encontrado o no pertenece a tu organización" }, { status: 403 });
    }

    const updatedSpace = await prisma.space.update({
      where: { id },
      data: {
        ...(name && { name, slug: name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') }),
        ...(description !== undefined && { description }),
        ...(color && { color })
      }
    });

    return NextResponse.json(updatedSpace);
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

    const adminOrgId = await getAdminOrganization(session.user.id);
    const existingSpace = await prisma.space.findUnique({ 
      where: { id },
      include: { workspace: { select: { organizationId: true } } }
    });

    if (!existingSpace || existingSpace.workspace.organizationId !== adminOrgId) {
      return NextResponse.json({ error: "Espacio no encontrado o no pertenece a tu organización" }, { status: 403 });
    }

    await prisma.space.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
