import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
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

    // 👑 SUPERADMIN: Ve la totalidad de workspaces del sistema
    if (userRole === "superadmin") {
      const workspaces = await prisma.workspace.findMany({
        include: {
          organization: { select: { id: true, name: true, slug: true } }
        },
        orderBy: { createdAt: "desc" }
      });
      return NextResponse.json(workspaces);
    }

    // 🛡️ ADMIN: Ve únicamente los workspaces donde su relación es de OWNER
    const workspaces = await prisma.workspace.findMany({
      where: {
        members: {
          some: {
            userId: session.user.id,
            role: "owner" // 🔑 FILTRO ESTRICTO DE PROPIEDAD
          }
        }
      },
      include: {
        organization: { select: { id: true, name: true, slug: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(workspaces);
  } catch (error: any) {
    console.error("Error obteniendo workspaces:", error);
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
    const { name, slug, plan, organizationId } = body;

    if (!name || !slug || !organizationId) {
      return NextResponse.json({ error: "Nombre, slug y Organización son requeridos" }, { status: 400 });
    }

    // Si es un admin normal, validar que la organización le pertenezca como owner en algún workspace
    if (userRole === "admin") {
      const isOwnerOfOrg = await prisma.workspaceMember.findFirst({
        where: {
          userId: session.user.id,
          role: "owner",
          workspace: { organizationId }
        }
      });

      if (!isOwnerOfOrg) {
        return NextResponse.json({ error: "No tienes permisos para crear workspaces en esta organización" }, { status: 403 });
      }
    }

    // Crear el workspace asignando la membresía OWNER al usuario creador
    const workspace = await prisma.workspace.create({
      data: {
        name,
        slug,
        plan: plan || "free",
        organizationId,
        members: {
          create: {
            userId: session.user.id,
            role: "owner" // 🔑 Asignación automática de propiedad
          }
        }
      },
      include: {
        organization: { select: { id: true, name: true, slug: true } }
      }
    });

    return NextResponse.json(workspace, { status: 201 });
  } catch (error: any) {
    console.error("Error creando workspace:", error);
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "El slug ya está en uso" }, { status: 409 });
    }
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
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

    // Validar propiedad en caso de ser admin
    if (userRole === "admin") {
      const isOwner = await prisma.workspaceMember.findFirst({
        where: {
          workspaceId: id,
          userId: session.user.id,
          role: "owner"
        }
      });

      if (!isOwner) {
        return NextResponse.json({ error: "No tienes permisos para editar este workspace" }, { status: 403 });
      }
    }

    const body = await request.json();
    const { name, slug, plan, organizationId } = body;

    const updatedWorkspace = await prisma.workspace.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(slug && { slug }),
        ...(plan && { plan }),
        ...(organizationId !== undefined && { organizationId })
      },
      include: {
        organization: { select: { id: true, name: true, slug: true } }
      }
    });

    return NextResponse.json(updatedWorkspace);
  } catch (error: any) {
    console.error("Error actualizando workspace:", error);
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
    if (!id) return NextResponse.json({ error: "ID requerido" }, { status: 400 });

    // Validar propiedad si es admin
    if (userRole === "admin") {
      const isOwner = await prisma.workspaceMember.findFirst({
        where: {
          workspaceId: id,
          userId: session.user.id,
          role: "owner"
        }
      });

      if (!isOwner) {
        return NextResponse.json({ error: "No tienes permisos para eliminar este workspace" }, { status: 403 });
      }
    }

    await prisma.workspace.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error eliminando workspace:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}