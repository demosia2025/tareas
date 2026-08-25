import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// GET: Obtiene la lista de usuarios del workspace ordenados por conexión
export async function GET(
  req: Request,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const currentUserId = session.user.id;
    const { workspaceid } = await params;

    const membership = await prisma.workspaceMember.findFirst({
      where: { workspaceId: workspaceid, userId: currentUserId },
    });

    if (!membership) {
      return NextResponse.json({ error: "No tienes acceso" }, { status: 403 });
    }

    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId: workspaceid },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            lastSeen: true,
          },
        },
      },
      orderBy: { joinedAt: "asc" },
    });

    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);

    const users = members
      .filter((m: any) => m.user.id !== currentUserId) // Opcional: excluirte a ti mismo de la lista
      .map((m: any) => {
        const lastSeenDate = m.user.lastSeen ? new Date(m.user.lastSeen) : new Date(0);
        const isOnline = lastSeenDate > oneMinuteAgo;

        return {
          id: m.user.id,
          name: m.user.name || "Usuario",
          email: m.user.email,
          avatar: m.user.image,
          role: m.role,
          isOnline: isOnline,
          lastSeen: m.user.lastSeen,
        };
      });

    // Ordenar: conectados primero, luego alfabéticamente
    users.sort((a: any, b: any) => {
      const ahora = Date.now();
      const umbralActividad = 60 * 1000;
      
      const aConectado = a.lastSeen && (ahora - new Date(a.lastSeen).getTime() < umbralActividad);
      const bConectado = b.lastSeen && (ahora - new Date(b.lastSeen).getTime() < umbralActividad);

      if (aConectado && !bConectado) return -1;
      if (!aConectado && bConectado) return 1;

      return (a.name || "").localeCompare(b.name || "");
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Error fetching connected users:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

// POST: Envía un mensaje a cualquier usuario (conectado o desconectado)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { receiverId, content } = await req.json();
    if (!receiverId || !content?.trim()) {
      return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
    }

    const message = await prisma.message.create({
      data: {
        content: content.trim(),
        senderId: session.user.id,
        receiverId,
      },
    });

    return NextResponse.json(message);
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json({ error: "Error al enviar mensaje" }, { status: 500 });
  }
}