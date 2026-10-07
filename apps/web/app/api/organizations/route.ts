import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// ✅ GET: Listar organizaciones (con filtro por rol)
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

    // Admin/Usuario normal ve SOLO organizaciones donde es admin u owner
    const memberships = await prisma.workspaceMember.findMany({
      where: { 
        userId: session.user.id,
        role: { in: ["admin", "owner"] }
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

    // Extraer organizaciones únicas
    const orgMap = new Map<string, any>();
    memberships.forEach((membership) => {
      const org = membership.workspace.organization;
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

    const organizations = Array.from(orgMap.values());
    return NextResponse.json(organizations);
  } catch (error: any) {
    console.error("Error obteniendo organizaciones:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Función interna unificada para actualizar el plan
async function handleUpdateOrganization(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userRole = (session.user as any)?.role;
    if (userRole !== "superadmin") {
      return NextResponse.json({ error: "Solo el superadmin puede cambiar planes" }, { status: 403 });
    }

    const body = await request.json();
    const { id, orgId, plan } = body;
    const targetId = id || orgId;

    if (!targetId || !plan) {
      return NextResponse.json({ error: "ID de la organización y plan son requeridos" }, { status: 400 });
    }

    const organization = await prisma.organization.update({
      where: { id: targetId },
      data: { plan },
    });

    return NextResponse.json(organization);
  } catch (error: any) {
    console.error("Error actualizando organización:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ✅ Soportar PATCH y PUT para evitar "405 Method Not Allowed"
export async function PATCH(request: Request) {
  return handleUpdateOrganization(request);
}

export async function PUT(request: Request) {
  return handleUpdateOrganization(request);
}