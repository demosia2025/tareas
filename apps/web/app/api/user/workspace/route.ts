import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId es requerido" }, { status: 400 });
    }

    const memberships = await prisma.workspaceMember.findMany({
      where: { userId },
      include: {
        workspace: {
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
                plan: true,
                logo: true, // ✅ Incluir el logo de la organización
              }
            }
          }
        }
      }
    });

    // ✅ Formatear la respuesta para incluir organizationId y organizationLogo
    const formattedMemberships = memberships.map((m) => ({
      workspaceId: m.workspaceId,
      workspaceName: m.workspace.name,
      organizationId: m.workspace.organizationId, // ✅ CLAVE: Devolver organizationId
      organizationName: m.workspace.organization?.name || "Sin organización",
      organizationLogo: m.workspace.organization?.logo || null, // ✅ CLAVE: Devolver logo directamente
      role: m.role,
      joinedAt: m.joinedAt
    }));

    return NextResponse.json({ memberships: formattedMemberships });
  } catch (error: any) {
    console.error("Error obteniendo workspaces del usuario:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}