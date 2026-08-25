import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function POST(req: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // ✅ CORREGIDO: Usamos el ID de la sesión, no del body
    await prisma.user.update({
      where: { id: session.user.id },
      data: { lastSeen: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating presence:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}