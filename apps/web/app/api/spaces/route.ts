import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// ✅ GET - Obtener espacios
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId es requerido" }, { status: 400 });
    }

    // Verificar que el usuario tenga acceso al workspace
    const membership = await prisma.workspaceMember.findFirst({
      where: {
        userId: session.user.id,
        workspaceId: workspaceId
      }
    });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    if (!membership && user?.role !== "superadmin") {
      return NextResponse.json({ error: "No tienes acceso a este workspace" }, { status: 403 });
    }

    const spaces = await prisma.space.findMany({
      where: { workspaceId },
      include: {
        _count: {
          select: {
            folders: true,
            lists: true
          }
        }
      },
      orderBy: { position: "asc" }
    });

    return NextResponse.json(spaces);
  } catch (error: any) {
    console.error("Error obteniendo espacios:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ✅ POST - Crear espacio (PARA USUARIOS NORMALES)
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { name, workspaceId, description, icon, color } = body;

    if (!name || !workspaceId) {
      return NextResponse.json({ error: "Nombre y workspace son requeridos" }, { status: 400 });
    }

    // Verificar que el usuario tenga acceso al workspace
    const membership = await prisma.workspaceMember.findFirst({
      where: {
        userId: session.user.id,
        workspaceId: workspaceId
      }
    });

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    if (!membership && user?.role !== "superadmin") {
      return NextResponse.json({ error: "No tienes permisos para crear espacios en este workspace" }, { status: 403 });
    }

    // Generar slug único
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "") + "-" + Date.now().toString().slice(-4);

    const space = await prisma.space.create({
      data: {
        name,
        slug,
        workspaceId,
        description: description || null,
        icon: icon || null,
        color: color || "#8b5cf6"
      },
      include: {
        _count: {
          select: {
            folders: true,
            lists: true
          }
        }
      }
    });

    return NextResponse.json(space, { status: 201 });
  } catch (error: any) {
    console.error("Error creando espacio:", error);
    return NextResponse.json({ error: error.message || "No se pudo crear el espacio" }, { status: 500 });
  }
}

// ✅ PATCH - Actualizar espacio
export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    const body = await request.json();
    const { name, description, icon, color, position } = body;

    const space = await prisma.space.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(icon !== undefined && { icon }),
        ...(color !== undefined && { color }),
        ...(position !== undefined && { position })
      }
    });

    return NextResponse.json(space);
  } catch (error: any) {
    console.error("Error actualizando espacio:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ✅ DELETE - Eliminar espacio
export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    await prisma.space.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error eliminando espacio:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}