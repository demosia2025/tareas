import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { pusherServer } from "@/lib/pusher";
import { getServerSession } from "next-auth";
// Ajusta esta ruta si tu authOptions está en otro archivo (ej: "@/app/api/auth/[...nextauth]/route")
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; 

// GET: Obtener comentarios, archivos adjuntos y datos de la tarea
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("taskId");

    if (!taskId) {
      return NextResponse.json({ error: "Falta el ID de la tarea" }, { status: 400 });
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        labels: true,
      },
    });

    const comments = await prisma.comment.findMany({
      where: { taskId },
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const attachments = await prisma.attachment.findMany({
      where: { taskId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ task, comments, attachments });
  } catch (error) {
    console.error("Error al obtener actividad:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

// POST: Crear comentario o archivo y disparar tiempo real con Pusher
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const body = await req.json();
    const { taskId, body: commentBody, file } = body;

    if (!taskId) {
      return NextResponse.json({ error: "Falta el ID de la tarea" }, { status: 400 });
    }

    // Obtenemos el ID del usuario autenticado de forma segura si existe
    const userId = session?.user ? (session.user as any).id : null;

    let newComment = null;
    let newAttachment = null;

    // Si viene texto de comentario
    if (commentBody && commentBody.trim() !== "") {
      newComment = await prisma.comment.create({
        data: {
          body: commentBody.trim(),
          taskId: taskId,
          creatorId: userId,
        },
        include: {
          creator: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      // Disparamos la notificación en tiempo real con Pusher
      await pusherServer.trigger(`task-${taskId}`, "new-comment", {
        comment: newComment,
      });
    }

    // Si viene un archivo adjunto
    if (file) {
      newAttachment = await prisma.attachment.create({
        data: {
          fileName: file.name,
          fileUrl: file.url,
          fileType: file.type,
          fileSize: file.size,
          taskId: taskId,
        },
      });
    }

    return NextResponse.json({
      success: true,
      comment: newComment,
      attachment: newAttachment,
    });
  } catch (error) {
    console.error("Error al procesar la actividad:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}