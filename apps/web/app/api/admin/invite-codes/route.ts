import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

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

    if (user?.role !== "superadmin" && user?.role !== "admin") {
      return NextResponse.json({ error: "No tienes permisos" }, { status: 403 });
    }

    const codes = await prisma.inviteCode.findMany({
      include: {
        createdBy: { select: { name: true } },
        workspace: { select: { name: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(codes);
  } catch (error: any) {
    console.error("Error obteniendo códigos:", error);
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

    if (user?.role !== "superadmin" && user?.role !== "admin") {
      return NextResponse.json({ error: "No tienes permisos" }, { status: 403 });
    }

    const body = await request.json();
    const { code, workspaceId, maxUses, expiresAt } = body;

    if (!code || !workspaceId) {
      return NextResponse.json({ 
        error: "Código y workspaceId son requeridos" 
      }, { status: 400 });
    }

    // ✅ SOLUCIÓN: Siempre proporcionar una fecha válida
    // Si no hay expiresAt, establecer una fecha por defecto (1 año desde ahora)
    const expirationDate = expiresAt 
      ? new Date(expiresAt) 
      : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 año desde ahora

    const inviteCode = await prisma.inviteCode.create({
      data: {
        code,
        workspace: { connect: { id: workspaceId } },
        createdBy: { connect: { id: session.user.id } },
        maxUses: maxUses || 5,
        usedCount: 0,
        active: true,
        expiresAt: expirationDate  // ✅ Siempre una fecha válida, nunca null
      },
      include: {
        createdBy: { select: { name: true } },
        workspace: { select: { name: true } }
      }
    });

    return NextResponse.json(inviteCode, { status: 201 });
  } catch (error: any) {
    console.error("Error creando código:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
