import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

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

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");

    // 👑 SUPERADMIN: Ve absolutamente todos los espacios (o filtrados por workspaceId si se pasa)
    if (userRole === "superadmin") {
      const spaces = await prisma.space.findMany({
        where: workspaceId ? { workspaceId } : {},
        include: {
          workspace: { select: { name: true } },
          _count: { select: { folders: true, lists: true, tasks: true } }
        },
        orderBy: { position: "asc" }
      });
      return NextResponse.json(spaces);
    }

    // 🛡️ ADMIN: Solo ve espacios de workspaces donde es OWNER
    const adminMemberships = await prisma.workspaceMember.findMany({
      where: {
        userId: session.user.id,
        role: "owner" // 🔑 FILTRO CLAVE DE PROPIEDAD
      },
      select: { workspaceId: true }
    });

    const ownedWorkspaceIds = adminMemberships.map((m) => m.workspaceId);

    // Si especificó un workspaceId, verificamos que sea de su propiedad
    if (workspaceId && !ownedWorkspaceIds.includes(workspaceId)) {
      return NextResponse.json({ error: "No tienes acceso a este workspace" }, { status: 403 });
    }

    const spaces = await prisma.space.findMany({
      where: {
        workspaceId: workspaceId ? workspaceId : { in: ownedWorkspaceIds }
      },
      include: {
        workspace: { select: { name: true } },
        _count: { select: { folders: true, lists: true, tasks: true } }
      },
      orderBy: { position: "asc" }
    });

    return NextResponse.json(spaces);
  } catch (error: any) {
    console.error("Error obteniendo spaces:", error);
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
    const { name, workspaceId, description, icon, color, slug } = body;

    if (!name || !workspaceId) {
      return NextResponse.json({ error: "Nombre y workspace son requeridos" }, { status: 400 });
    }

    // Verificar si el admin es OWNER del workspace donde intenta crear el espacio
    if (userRole === "admin") {
      const isOwner = await prisma.workspaceMember.findFirst({
        where: {
          userId: session.user.id,
          workspaceId,
          role: "owner"
        }
      });

      if (!isOwner) {
        return NextResponse.json({ error: "No tienes permisos para crear espacios en este workspace" }, { status: 403 });
      }
    }

    const space = await prisma.space.create({
      data: {
        name,
        slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""),
        workspaceId,
        description: description || null,
        icon: icon || null,
        color: color || "#8b5cf6"
      },
      include: {
        workspace: { select: { name: true } }
      }
    });

    return NextResponse.json(space, { status: 201 });
  } catch (error: any) {
    console.error("Error creando space:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
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
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    // Validar propiedad si es admin
    if (userRole === "admin") {
      const targetSpace = await prisma.space.findUnique({
        where: { id },
        select: { workspaceId: true }
      });

      if (!targetSpace) {
        return NextResponse.json({ error: "Espacio no encontrado" }, { status: 404 });
      }

      const isOwner = await prisma.workspaceMember.findFirst({
        where: {
          userId: session.user.id,
          workspaceId: targetSpace.workspaceId,
          role: "owner"
        }
      });

      if (!isOwner) {
        return NextResponse.json({ error: "No tienes permisos para modificar este espacio" }, { status: 403 });
      }
    }

    const body = await request.json();
    const { name, description, icon, color, slug, position } = body;

    const space = await prisma.space.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(slug !== undefined && { slug }),
        ...(description !== undefined && { description }),
        ...(icon !== undefined && { icon }),
        ...(color !== undefined && { color }),
        ...(position !== undefined && { position })
      },
      include: {
        workspace: { select: { name: true } }
      }
    });

    return NextResponse.json(space);
  } catch (error: any) {
    console.error("Error actualizando space:", error);
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
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    // Validar propiedad si es admin
    if (userRole === "admin") {
      const targetSpace = await prisma.space.findUnique({
        where: { id },
        select: { workspaceId: true }
      });

      if (!targetSpace) {
        return NextResponse.json({ error: "Espacio no encontrado" }, { status: 404 });
      }

      const isOwner = await prisma.workspaceMember.findFirst({
        where: {
          userId: session.user.id,
          workspaceId: targetSpace.workspaceId,
          role: "owner"
        }
      });

      if (!isOwner) {
        return NextResponse.json({ error: "No tienes permisos para eliminar este espacio" }, { status: 403 });
      }
    }

    await prisma.space.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error eliminando space:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}