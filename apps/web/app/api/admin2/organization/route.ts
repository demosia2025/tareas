import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// ✅ CORREGIDO: Especificamos que devuelve string | undefined (nunca null)
async function getAdminOrganization(userId: string): Promise<string | undefined> {
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId, role: { in: ["admin", "owner"] } },
    include: { workspace: { select: { organizationId: true } } }
  });
  // Convertimos null a undefined para que Prisma lo acepte en el 'where'
  return membership?.workspace?.organizationId || undefined;
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ 
      where: { id: session.user.id }, 
      select: { role: true } 
    });
    
    if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
      return NextResponse.json({ error: "No tienes permisos" }, { status: 403 });
    }

    const adminOrgId = await getAdminOrganization(session.user.id);
    
    // ✅ CORREGIDO: Validamos que exista antes de hacer la consulta a Prisma
    if (!adminOrgId) {
      return NextResponse.json({ error: "No tienes una organización asignada" }, { status: 404 });
    }

    const organization = await prisma.organization.findUnique({
      where: { id: adminOrgId },
      include: {
        _count: { select: { workspaces: true } }
      }
    });

    if (!organization) {
      return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
    }

    return NextResponse.json(organization);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ 
      where: { id: session.user.id }, 
      select: { role: true } 
    });
    
    if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
      return NextResponse.json({ error: "No tienes permisos" }, { status: 403 });
    }

    const adminOrgId = await getAdminOrganization(session.user.id);
    
    // ✅ CORREGIDO: Validamos que exista antes de hacer la actualización
    if (!adminOrgId) {
      return NextResponse.json({ error: "No tienes una organización asignada" }, { status: 404 });
    }

    const body = await req.json();
    const { name, description, plan } = body;

    const updatedOrg = await prisma.organization.update({
      where: { id: adminOrgId },
      data: {
        ...(name && { name, slug: name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') }),
        ...(description !== undefined && { description }),
        ...(plan && { plan })
      }
    });

    return NextResponse.json(updatedOrg);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}