import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { normalizeInviteCode, generateInviteCode } from "@/lib/rbac";

export const dynamic = "force-dynamic";
export const revalidate = 0;

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

    const userRole = user?.role;

    if (userRole !== "superadmin" && userRole !== "admin") {
      return NextResponse.json({ error: "No tienes permisos" }, { status: 403 });
    }

    // 👑 SUPERADMIN: Ve la totalidad de códigos de invitación
    if (userRole === "superadmin") {
      const codes = await prisma.inviteCode.findMany({
        include: {
          createdBy: { select: { name: true, email: true } },
          workspace: { select: { name: true } }
        },
        orderBy: { createdAt: "desc" }
      });
      return NextResponse.json(codes);
    }

    // 🛡️ ADMIN: Ve solo los códigos vinculados a Workspaces de su propiedad (owner) o creados por él
    const adminWorkspaces = await prisma.workspaceMember.findMany({
      where: {
        userId: session.user.id,
        role: "owner" // 🔑 FILTRO ESTRICTO DE PROPIEDAD
      },
      select: { workspaceId: true }
    });

    const ownedWorkspaceIds = adminWorkspaces.map((m) => m.workspaceId);

    const codes = await prisma.inviteCode.findMany({
      where: {
        OR: [
          { createdById: session.user.id },
          { workspaceId: { in: ownedWorkspaceIds } }
        ]
      },
      include: {
        createdBy: { select: { name: true, email: true } },
        workspace: { select: { name: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(codes);
  } catch (error: any) {
    console.error("Error obteniendo códigos:", error);
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

    const userRole = user?.role;

    if (userRole !== "superadmin" && userRole !== "admin") {
      return NextResponse.json({ error: "No tienes permisos" }, { status: 403 });
    }

    const body = await request.json();
    const { code: rawCode, workspaceId, maxUses, expiresAt } = body;

    if (!workspaceId) {
      return NextResponse.json({ 
        error: "workspaceId es requerido" 
      }, { status: 400 });
    }

    // Si es un admin normal, validar que el workspace destino le pertenezca como OWNER
    if (userRole === "admin") {
      const isOwner = await prisma.workspaceMember.findFirst({
        where: {
          workspaceId,
          userId: session.user.id,
          role: "owner"
        }
      });

      if (!isOwner) {
        return NextResponse.json({ error: "No tienes permisos para crear códigos en este workspace" }, { status: 403 });
      }
    }

    const code = rawCode ? normalizeInviteCode(rawCode) : generateInviteCode();

    if (code.length !== 6) {
      return NextResponse.json({ error: "El código de invitación debe tener 6 caracteres alfanuméricos" }, { status: 400 });
    }

    const expirationDate = expiresAt 
      ? new Date(expiresAt) 
      : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 año por defecto

    const inviteCode = await prisma.inviteCode.create({
      data: {
        code,
        workspace: { connect: { id: workspaceId } },
        createdBy: { connect: { id: session.user.id } },
        maxUses: maxUses || 5,
        usedCount: 0,
        active: true,
        expiresAt: expirationDate
      },
      include: {
        createdBy: { select: { name: true, email: true } },
        workspace: { select: { name: true } }
      }
    });

    return NextResponse.json(inviteCode, { status: 201 });
  } catch (error: any) {
    console.error("Error creando código:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

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
      return NextResponse.json({ error: "ID del código es requerido" }, { status: 400 });
    }

    // Si es un admin normal, verificar jurisdicción antes de borrar
    if (userRole === "admin") {
      const targetCode = await prisma.inviteCode.findUnique({
        where: { id },
        select: { createdById: true, workspaceId: true }
      });

      if (!targetCode) {
        return NextResponse.json({ error: "Código no encontrado" }, { status: 404 });
      }

      const isOwnerOfWorkspace = await prisma.workspaceMember.findFirst({
        where: {
          workspaceId: targetCode.workspaceId,
          userId: session.user.id,
          role: "owner"
        }
      });

      if (targetCode.createdById !== session.user.id && !isOwnerOfWorkspace) {
        return NextResponse.json({ error: "No tienes permisos para eliminar este código" }, { status: 403 });
      }
    }

    await prisma.inviteCode.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: "Código eliminado correctamente" });
  } catch (error: any) {
    console.error("Error eliminando código:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}