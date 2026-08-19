import { NextResponse, NextRequest } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, userId, organizationName } = body;

    if (!name || !userId) {
      return NextResponse.json(
        { error: "Faltan datos obligatorios (name o userId)" },
        { status: 400 }
      );
    }

    // Generamos un slug válido
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "") + "-" + Date.now().toString().slice(-4);

    // Transacción para crear organización (si aplica), workspace y membresía
    const result = await prisma.$transaction(async (tx: any) => {
      let orgId = null;

      if (organizationName && organizationName.trim() !== "") {
        const orgSlug = organizationName
          .toLowerCase()
          .trim()
          .replace(/[^\w\s-]/g, "")
          .replace(/[\s_-]+/g, "-")
          .replace(/^-+|-+$/g, "") + "-" + Date.now().toString().slice(-4);
        
        const org = await tx.organization.create({
          data: {
            name: organizationName.trim(),
            slug: orgSlug,
            plan: "free"
          }
        });
        orgId = org.id;
      }

      const workspace = await tx.workspace.create({
        data: {
          name,
          slug,
          plan: "free",
          organizationId: orgId,
          members: {
            create: {
              userId: userId,
              role: "owner", // ✅ En minúsculas, coincidiendo con tu enum WorkspaceRole
              organizationId: orgId
            }
          }
        },
        include: {
          organization: true
        }
      });

      return workspace;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error("ERROR DETALLADO PRISMA:", error.message || error);
    return NextResponse.json(
      { error: error.message || "Error interno del servidor al crear el workspace" },
      { status: 500 }
    );
  }
}
