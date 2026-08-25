// apps/web/app/api/messages/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// GET: Obtener mensajes entre dos usuarios
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const otherUserId = searchParams.get("otherUserId");
    const workspaceId = searchParams.get("workspaceId");

    if (!otherUserId || !workspaceId) {
      return NextResponse.json({ error: "Parámetros faltantes" }, { status: 400 });
    }

    // Verificar que ambos están en el mismo workspace
    const [member1, member2] = await Promise.all([
      prisma.workspaceMember.findFirst({
        where: { workspaceId, userId: session.user.id },
      }),
      prisma.workspaceMember.findFirst({
        where: { workspaceId, userId: otherUserId },
      }),
    ]);

    if (!member1 || !member2) {
      return NextResponse.json({ error: "No tienes acceso" }, { status: 403 });
    }

    // ✅ CORREGIDO: Usar 'message' en lugar de 'directMessage'
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: session.user.id, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: session.user.id },
        ],
      },
      include: {
        sender: { select: { id: true, name: true, image: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// POST: Enviar mensaje
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { receiverId, content, workspaceId } = await req.json();

    if (!receiverId || !content || !workspaceId) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    // Verificar membresía
    const [senderMember, receiverMember] = await Promise.all([
      prisma.workspaceMember.findFirst({
        where: { workspaceId, userId: session.user.id },
      }),
      prisma.workspaceMember.findFirst({
        where: { workspaceId, userId: receiverId },
      }),
    ]);

    if (!senderMember || !receiverMember) {
      return NextResponse.json({ error: "No tienes acceso" }, { status: 403 });
    }

    // ✅ CORREGIDO: Usar 'message' en lugar de 'directMessage'
    const message = await prisma.message.create({
      data: {
        senderId: session.user.id,
        receiverId,
        content,
      },
      include: {
        sender: { select: { id: true, name: true, image: true } },
      },
    });

    return NextResponse.json({ message });
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}