import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ✅ GET: Listar organizaciones
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;

    // Superadmin ve TODAS las organizaciones
    if (userRole === "superadmin") {
      const organizations = await prisma.organization.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { workspaces: true } }
        }
      });
      return NextResponse.json(organizations);
    }

    // Admin/Propietario ve SOLO organizaciones donde es OWNER
    const memberships = await prisma.workspaceMember.findMany({
      where: { 
        userId: session.user.id,
        role: "owner"
      },
      include: {
        workspace: {
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
                plan: true,
                logo: true,
              }
            }
          }
        }
      }
    });

    const orgMap = new Map<string, any>();
    memberships.forEach((membership) => {
      const org = membership.workspace?.organization;
      if (org && !orgMap.has(org.id)) {
        orgMap.set(org.id, {
          id: org.id,
          name: org.name,
          slug: org.slug,
          plan: org.plan || "free",
          logo: org.logo || null,
        });
      }
    });

    return NextResponse.json(Array.from(orgMap.values()));
  } catch (error: any) {
    console.error("Error obteniendo organizaciones:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ✅ POST: Crear organización
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, slug, plan } = body;

    if (!name) {
      return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });
    }

    const organization = await prisma.organization.create({
      data: {
        ...(id && { id }),
        name,
        slug: slug || name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        plan: plan || "free",
      },
    });

    return NextResponse.json(organization, { status: 201 });
  } catch (error: any) {
    console.error("Error creando organización:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ✅ PATCH: Actualizar organización o plan (Soluciona el error 405 Method Not Allowed)
export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    if (userRole !== "superadmin") {
      return NextResponse.json({ error: "Solo el superadmin puede editar organizaciones" }, { status: 403 });
    }

    const body = await request.json();
    const { id, orgId, plan, name } = body;
    const targetId = id || orgId;

    if (!targetId) {
      return NextResponse.json({ error: "ID de organización es requerido" }, { status: 400 });
    }

    const organization = await prisma.organization.update({
      where: { id: targetId },
      data: {
        ...(plan && { plan: plan.toLowerCase() }),
        ...(name && { name }),
      },
    });

    return NextResponse.json(organization);
  } catch (error: any) {
    console.error("Error actualizando organización:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ✅ PUT: Compatibilidad adicional
export async function PUT(request: Request) {
  return PATCH(request);
}