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

    const { workspaceid } = await params;

    // ✅ CORRECCIÓN CLAVE: Usar findFirst en lugar de findUnique con compound ID 
    // para evitar errores de naming en Prisma que hacían fallar la consulta en silencio.
    const membership = await prisma.workspaceMember.findFirst({
      where: {
        workspaceId: workspaceid,
        userId: session.user.id
      }
    });

    if (!membership) {
      return NextResponse.json({ error: "No tienes acceso" }, { status: 403 });
    }

    // ✅ Obtener TODOS los miembros del workspace
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
      isOnline: m.userId === session.user.id, // Simulación: solo el usuario actual aparece online
      lastSeen: m.userId === session.user.id ? "Ahora" : "Hace 5 min"
    }));

    // ✅ Ordenar: online primero
    users.sort((a, b) => {
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