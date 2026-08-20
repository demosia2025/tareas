import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> } // ✅ params ahora es una Promesa
) {
  try {
    const { id } = await params; // ✅ Resolvemos la promesa para obtener el id
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { userIds } = body;

    if (!Array.isArray(userIds)) {
      return NextResponse.json({ error: "userIds debe ser un array" }, { status: 400 });
    }

    await prisma.taskMember.deleteMany({
      where: { taskId: id } // ✅ Usamos el id resuelto
    });

    const assignees = await Promise.all(
      userIds.map((userId: string) =>
        prisma.taskMember.create({
          data: { taskId: id, userId } // ✅ Usamos el id resuelto
        })
      )
    );

    return NextResponse.json(assignees);
  } catch (error) {
    console.error("Error asignando usuarios:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> } // ✅ params ahora es una Promesa
) {
  try {
    const { id } = await params; // ✅ Resolvemos la promesa para obtener el id
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const assignees = await prisma.taskMember.findMany({
      where: { taskId: id }, // ✅ Usamos el id resuelto
      include: {
        user: { select: { id: true, name: true, email: true } }
      }
    });

    return NextResponse.json(assignees);
  } catch (error) {
    console.error("Error obteniendo assignees:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}