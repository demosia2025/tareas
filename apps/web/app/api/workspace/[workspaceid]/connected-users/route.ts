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
      console.log("❌ No hay sesión o user.id");
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const currentUserId = session.user.id;
    const { workspaceid } = await params;

    console.log(" Buscando membresía para:", { workspaceid, currentUserId });

    const membership = await prisma.workspaceMember.findFirst({
      where: { workspaceId: workspaceid, userId: currentUserId },
    });

    if (!membership) {
      console.log("❌ Usuario no es miembro del workspace");
      return NextResponse.json({ error: "No tienes acceso" }, { status: 403 });
    }

    console.log("✅ Usuario es miembro. Buscando todos los miembros...");

    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId: workspaceid },
      include: {
        user: {
          select: { id: true, name: true, email: true, image: true, lastSeen: true },
        },
      },
      orderBy: { joinedAt: "asc" },
    });

    console.log(" Miembros encontrados:", members.length);

    // Considera "online" si lastSeen es menor a 2 minutos
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

    const users = members.map((m: any) => {
      const lastSeenDate = m.user.lastSeen || new Date(0);
      const isOnline = lastSeenDate > twoMinutesAgo;

      return {
        id: m.user.id,
        name: m.user.name || "Usuario",
        email: m.user.email,
        image: m.user.image,
        role: m.role,
        isOnline,
        lastSeen: isOnline ? "Ahora" : formatLastSeen(lastSeenDate),
      };
    });

    // Ordenar: online primero
    users.sort((a: any, b: any) => {
      if (a.isOnline && !b.isOnline) return -1;
      if (!a.isOnline && b.isOnline) return 1;
      return 0;
    });

    console.log("✅ Usuarios procesados:", users.length);
    return NextResponse.json({ users });
  } catch (error) {
    console.error("❌ Error en connected-users API:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

function formatLastSeen(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return "Ahora";
  if (minutes < 60) return `Hace ${minutes} min`;
  if (hours < 24) return `Hace ${hours} h`;
  return `Hace ${days} d`;
}