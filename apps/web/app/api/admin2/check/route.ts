import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
      return NextResponse.json({ error: "No tienes permisos" }, { status: 403 });
    }

    return NextResponse.json({ 
      success: true,
      user: { role: user.role }
    });
  } catch (error) {
    console.error("Error en check:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
