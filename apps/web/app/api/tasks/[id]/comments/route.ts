import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(req: Request, { params }: { params: { taskId: string } }) {
  try {
    const comments = await prisma.comment.findMany({
      where: { taskId: params.taskId },
      include: { creator: true },
      orderBy: { createdAt: "asc" },
    });

    const attachments = await prisma.attachment.findMany({
      where: { taskId: params.taskId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ comments, attachments });
  } catch (error) {
    console.error("Error cargando comentarios:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: { taskId: string } }) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Obtenemos el ID del usuario real desde la sesión o buscándolo en la BD por email
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
          taskId: params.taskId,
          creatorId: userRecord.id,
          body,
        },
        include: { creator: true },
      });
    }

    if (file) {
      newAttachment = await prisma.attachment.create({
        data: {
          taskId: params.taskId,
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