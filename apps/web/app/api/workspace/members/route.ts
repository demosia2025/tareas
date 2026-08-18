import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: Request, { params }: { params: { workspaceId: string } }) {
  try {
    const members = await db.workspaceMember.findMany({
      where: { workspaceId: params.workspaceId },
      include: { user: true },
    });

    return NextResponse.json(members);
  } catch (error) {
    console.error("Error obteniendo miembros:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: { workspaceId: string } }) {
  try {
    const { email } = await req.json();
    
    const user = await db.user.findUnique({ where: { email } });

    if (!user) {
      return NextResponse.json({ error: "El usuario no está registrado en la plataforma" }, { status: 404 });
    }

    // Verificar si ya es miembro
    const existingMember = await db.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: params.workspaceId,
          userId: user.id,
        },
      },
    });

    if (existingMember) {
      return NextResponse.json({ error: "El usuario ya forma parte de este workspace" }, { status: 400 });
    }

    const newMember = await db.workspaceMember.create({
      data: {
        workspaceId: params.workspaceId,
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