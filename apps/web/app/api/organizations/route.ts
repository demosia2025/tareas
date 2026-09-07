import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Obtener todos los workspaces donde el usuario es miembro
    const memberships = await prisma.workspaceMember.findMany({
      where: { userId: session.user.id },
      include: {
        workspace: {
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
                plan: true,
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