import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // ✅ CORREGIDO: Verificamos el rol global en el modelo User, no en WorkspaceMember
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    if (user?.role !== "superadmin" && user?.role !== "admin") {
      return NextResponse.json({ error: "No tienes permisos de administrador" }, { status: 403 });
    }

    const body = await request.json();
    const { name, slug, plan, organizationId } = body;

    const updatedWorkspace = await prisma.workspace.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(slug !== undefined && { slug }),
        ...(plan !== undefined && { plan }),
      },
    });

    return NextResponse.json(updatedWorkspace);
  } catch (error) {
    console.error("Error updating workspace:", error);
    return NextResponse.json({ error: "Error al actualizar workspace" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // ✅ CORREGIDO: Verificamos el rol global en el modelo User, no en WorkspaceMember
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    if (user?.role !== "superadmin" && user?.role !== "admin") {
      return NextResponse.json({ error: "No tienes permisos de administrador" }, { status: 403 });
    }

    await prisma.workspace.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting workspace:", error);
    return NextResponse.json({ error: "Error al eliminar workspace" }, { status: 500 });
  }
}