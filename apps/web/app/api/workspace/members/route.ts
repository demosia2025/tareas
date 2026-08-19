import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(req: Request) { // ✅ Eliminamos 'params' de aquí
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId requerido" }, { status: 400 });
    }

    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: { select: { id: true, name: true, email: true } }
      }
    });

    return NextResponse.json(members);
  } catch (error) {
    console.error("Error obteniendo miembros:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: Request) { // ✅ Eliminamos 'params' de aquí también
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId requerido" }, { status: 400 });
    }

    const { email } = await req.json();
    
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return NextResponse.json({ error: "El usuario no está registrado en la plataforma" }, { status: 404 });
    }

    // Verificar si ya es miembro
    const existingMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: workspaceId,
          userId: user.id,
        },
      },
    });

    if (existingMember) {
      return NextResponse.json({ error: "El usuario ya forma parte de este workspace" }, { status: 400 });
    }

    const newMember = await prisma.workspaceMember.create({
      data: {
        workspaceId: workspaceId,
        userId: user.id,
        role: "member",
      },
      include: { user: true },
    });

    return NextResponse.json(newMember);
  } catch (error) {
    console.error("Error invitando usuario:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}