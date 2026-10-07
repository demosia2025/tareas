import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// ✅ GET: Libre acceso para cualquier usuario autenticado que necesite ver el logo del sistema de la organización
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;

    // Buscamos directamente la organización para retornar su logo de manera global
    const organization = await prisma.organization.findUnique({
      where: { id },
      select: { logo: true }
    });

    if (!organization) {
      return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ logo: organization.logo });
  } catch (error: any) {
    console.error("Error getting organization logo:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 🔒 POST: Solo owner, admin o superadmin pueden CAMBIAR el logo
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { logo } = body;

    if (!logo) {
      return NextResponse.json({ error: "Logo es requerido" }, { status: 400 });
    }

    const membership = await prisma.workspaceMember.findFirst({
      where: {
        userId: session.user.id,
        workspace: {
          organizationId: id
        }
      },
      include: {
        workspace: true
      }
    });

    const userRole = (session.user as any)?.role;
    const isSuperAdmin = userRole === "superadmin";
    const isOwnerOrAdmin = membership?.role === "owner" || membership?.role === "admin";

    if (!membership && !isSuperAdmin) {
      return NextResponse.json({ error: "No tienes acceso" }, { status: 403 });
    }

    if (!isSuperAdmin && !isOwnerOrAdmin) {
      return NextResponse.json({ 
        error: "Solo el propietario o administrador puede cambiar el logo" 
      }, { status: 403 });
    }

    const updatedOrg = await prisma.organization.update({
      where: { id },
      data: { logo }
    });

    return NextResponse.json({ logo: updatedOrg.logo });
  } catch (error: any) {
    console.error("Error updating organization logo:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// 🔒 DELETE: Solo owner, admin o superadmin pueden ELIMINAR el logo
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;

    const membershipRecord = await prisma.workspaceMember.findFirst({
      where: {
        userId: session.user.id,
        workspace: {
          organizationId: id
        }
      }
    });

    const userRole = (session.user as any)?.role;
    const isSuperAdmin = userRole === "superadmin";
    const isOwnerOrAdmin = membershipRecord?.role === "owner" || membershipRecord?.role === "admin";

    if (!membershipRecord && !isSuperAdmin) {
      return NextResponse.json({ error: "No tienes acceso" }, { status: 403 });
    }

    if (!isSuperAdmin && !isOwnerOrAdmin) {
      return NextResponse.json({ 
        error: "Solo el propietario o administrador puede eliminar el logo" 
      }, { status: 403 });
    }

    await prisma.organization.update({
      where: { id },
      data: { logo: null }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting organization logo:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}