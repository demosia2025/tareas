import { NextResponse } from "next/server"
import { getTenantContext } from "@/lib/tenant-auth"
import prisma from "@/lib/prisma"

export async function GET() {
  try {
    const ctx = await getTenantContext();
    if ("error" in ctx) return ctx.error;

    // ✅ FILTRO DE AISLAMIENTO: Si no es superadmin, solo ve sus organizaciones
    const whereClause = ctx.isSuperAdmin 
      ? {} 
      : { organizationId: { in: ctx.allowedOrgIds } };

    const workspaces = await prisma.workspace.findMany({
      where: whereClause,
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
    const ctx = await getTenantContext();
    if ("error" in ctx) return ctx.error;

    const body = await request.json();
    const { name, slug, plan, organizationId } = body;

    if (!name || !slug || !organizationId) {
      return NextResponse.json({ error: "Nombre, slug y Organización son requeridos" }, { status: 400 });
    }

    // ✅ VALIDACIÓN: Solo puede crear en orgs a las que pertenece (o superadmin)
    if (!ctx.isSuperAdmin && !ctx.allowedOrgIds?.includes(organizationId)) {
      return NextResponse.json({ error: "No tienes permisos para crear workspaces en esta organización" }, { status: 403 });
    }

    const workspace = await prisma.workspace.create({
      data: {
        name,
        slug,
        plan: plan || "free",
        organizationId
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
    const ctx = await getTenantContext();
    if ("error" in ctx) return ctx.error;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    const body = await request.json();
    const { name, slug, plan, organizationId } = body;

    // ✅ VALIDACIÓN PARA MOVER WORKSPACE DE ORGANIZACIÓN
    if (organizationId) {
      // Verificar si el usuario tiene permiso en la ORGANIZACIÓN DE DESTINO
      if (!ctx.isSuperAdmin && !ctx.allowedOrgIds?.includes(organizationId)) {
        return NextResponse.json({ 
          error: "No tienes permisos para mover este workspace a esa organización" 
        }, { status: 403 });
      }
    }

    const updatedWorkspace = await prisma.workspace.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(slug && { slug }),
        ...(plan && { plan }),
        ...(organizationId && { organizationId }) // ✅ Aquí ocurre el "movimiento"
      },
      include: {
        organization: { select: { id: true, name: true, slug: true } }
      }
    });

    return NextResponse.json(updatedWorkspace);
  } catch (error: any) {
    console.error("Error editando workspace:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const ctx = await getTenantContext();
    if ("error" in ctx) return ctx.error;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json({ error: "ID requerido" }, { status: 400 });
    }

    await prisma.workspace.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error eliminando workspace:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}