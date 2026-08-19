import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> } // ✅ params ahora es una Promesa
) {
  try {
    const { id } = await params; // ✅ Resolvemos la promesa para obtener el id
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const superAdminMember = await prisma.workspaceMember.findFirst({
      where: {
        userId: session.user.id,
        role: "super_admin",
      },
    });

    if (!superAdminMember) {
      return NextResponse.json({ error: "No eres super admin" }, { status: 403 });
    }

    const body = await request.json();
    const { name, slug, plan, organizationId } = body;

    const updatedWorkspace = await prisma.workspace.update({
      where: { id }, // ✅ Usamos el id resuelto
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
  { params }: { params: Promise<{ id: string }> } // ✅ params ahora es una Promesa
) {
  try {
    const { id } = await params; // ✅ Resolvemos la promesa para obtener el id
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const superAdminMember = await prisma.workspaceMember.findFirst({
      where: {
        userId: session.user.id,
        role: "super_admin",
      },
    });

    if (!superAdminMember) {
      return NextResponse.json({ error: "No eres super admin" }, { status: 403 });
    }

    await prisma.workspace.delete({
      where: { id }, // ✅ Usamos el id resuelto
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting workspace:", error);
    return NextResponse.json({ error: "Error al eliminar workspace" }, { status: 500 });
  }
}