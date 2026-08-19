import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ workspaceid: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // ✅ 1. Guardamos el ID en una constante segura
    const currentUserId = session.user.id;
    const { workspaceid } = await params;

    const membership = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: workspaceid,
        userId: currentUserId
      }
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
            image: true
          }
        }
      },
      orderBy: {
        joinedAt: 'asc'
      }
    });

    const users = members.map((m: any) => ({
      id: m.user.id,
      name: m.user.name || "Usuario",
      email: m.user.email,
      image: m.user.image,
      role: m.role,
      isOnline: m.userId === currentUserId,
      lastSeen: m.userId === currentUserId ? "Ahora" : "Hace 5 min"
    }));

    // ✅ 2. CORREGIDO: Agregar tipos 'any' a 'a' y 'b' en el sort para cumplir con TypeScript estricto
    users.sort((a: any, b: any) => {
      if (a.isOnline && !b.isOnline) return -1;
      if (!a.isOnline && b.isOnline) return 1;
      return 0;
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Error fetching connected users:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}