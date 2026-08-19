import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const comments = await prisma.comment.findMany({
      where: { taskId: id },
      include: { creator: true },
      orderBy: { createdAt: "asc" },
    });

    const attachments = await prisma.attachment.findMany({
      where: { taskId: id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ comments, attachments });
  } catch (error) {
    console.error("Error cargando comentarios:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const userRecord = await prisma.user.findUnique({
      where: { email: session.user.email as string },
    });

    if (!userRecord) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const bodyData = await req.json();
    const { body, file } = bodyData;

    let newComment = null;
    let newAttachment = null;

    if (body && body.trim() !== "") {
      newComment = await prisma.comment.create({
        data: {
          taskId: id,
          creatorId: userRecord.id,
          body,
        },
        include: { creator: true },
      });
    }

    if (file) {
      newAttachment = await prisma.attachment.create({
        data: {
          taskId: id,
          fileName: file.name,
          fileUrl: file.url,
          fileType: file.type || "file",
          fileSize: file.size || 0,
        },
      });
    }

    return NextResponse.json({ comment: newComment, attachment: newAttachment });
  } catch (error) {
    console.error("Error guardando comentario:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}