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
    // ✅ CORREGIDO: Verificamos explícitamente session.user.id
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } });
    if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
      return NextResponse.json({ error: "No tienes permisos" }, { status: 403 });
    }

    const adminOrgId = await getAdminOrganization(session.user.id);
    
    const codes = await prisma.inviteCode.findMany({
      where: {
        workspace: { organizationId: adminOrgId }
      },
      include: {
        createdBy: { select: { name: true, email: true } },
        usedBy: { select: { name: true, email: true } },
        workspace: { select: { name: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(codes);
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
    const { workspaceId, maxUses = 1, expiresAt } = body;

    if (!workspaceId) {
      return NextResponse.json({ error: "Workspace es requerido" }, { status: 400 });
    }

    const adminOrgId = await getAdminOrganization(session.user.id);
    const workspace = await prisma.workspace.findUnique({ where: { id: workspaceId } });
    
    if (!workspace || workspace.organizationId !== adminOrgId) {
      return NextResponse.json({ error: "Workspace no pertenece a tu organización" }, { status: 403 });
    }

    const code = Math.random().toString(36).substring(2, 8).toUpperCase();

    const inviteCode = await prisma.inviteCode.create({
      data: {
        code,
        maxUses,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        workspaceId,
        createdById: session.user.id
      },
      include: {
        workspace: { select: { name: true } }
      }
    });

    return NextResponse.json({ message: "Código creado", inviteCode }, { status: 201 });
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
    const inviteCode = await prisma.inviteCode.findUnique({ 
      where: { id },
      include: { workspace: { select: { organizationId: true } } }
    });
    
    if (!inviteCode || inviteCode.workspace.organizationId !== adminOrgId) {
      return NextResponse.json({ error: "Código no encontrado o no pertenece a tu organización" }, { status: 403 });
    }

    await prisma.inviteCode.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}