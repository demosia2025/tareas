import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// GET: Obtener comentarios y archivos adjuntos de una tarea
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("taskId");

    if (!taskId) {
      return NextResponse.json({ error: "taskId es requerido" }, { status: 400 });
    }

    // Consultar comentarios con los datos del usuario creador
    const comments = await prisma.comment.findMany({
      where: { taskId },
      include: { 
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        }, 
      },
      orderBy: { createdAt: "asc" },
    });

    // Consultar archivos adjuntos asociados a la tarea
    const attachments = await prisma.attachment.findMany({
      where: { taskId },
      orderBy: { createdAt: "desc" },
    });

    // Formatear la lista de comentarios
    const formattedActivities = comments.map((c) => ({
      id: c.id,
      type: "comment",
      body: c.body,
      user: c.creator?.name || c.creator?.email || "Usuario",
      userId: c.creatorId,
      createdAt: c.createdAt,
    }));

    return NextResponse.json({
      comments: formattedActivities,
      attachments: attachments.map((att) => ({
        id: att.id,
        fileName: att.fileName,
        fileUrl: att.fileUrl,
        fileType: att.fileType,
        fileSize: att.fileSize,
        createdAt: att.createdAt,
      })),
    });
  } catch (error) {
    console.error("Error cargando actividades:", error);
    return NextResponse.json({ comments: [], attachments: [] }, { status: 500 });
  }
}

// POST: Crear un comentario o adjuntar un archivo en una tarea
export async function POST(req: Request) {
  try {
    // Validar la sesión autenticada del usuario
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const bodyData = await req.json();
    const { taskId, body, file } = bodyData;

    if (!taskId) {
      return NextResponse.json({ error: "taskId es requerido" }, { status: 400 });
    }

    // 1. Guardar archivo adjunto si viene en el payload
    if (file && file.name && file.url) {
      await prisma.attachment.create({
        data: {
          taskId,
          fileName: file.name,
          fileUrl: file.url,
          fileType: file.type || "application/octet-stream",
          fileSize: file.size || 0,
        },
      });
    }

    // 2. Guardar comentario asociado al usuario de la sesión
    let newComment = null;
    if (body && body.trim() !== "") {
      newComment = await prisma.comment.create({
        data: {
          taskId,
          creatorId: session.user.id,
          body,
        },
        include: { 
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
            },
          }, 
        },
      });
    }

    return NextResponse.json({
      success: true,
      comment: newComment
        ? {
            id: newComment.id,
            type: "comment",
            body: newComment.body,
            user: newComment.creator?.name || newComment.creator?.email || "Usuario",
            userId: newComment.creatorId,
            createdAt: newComment.createdAt,
          }
        : null,
    });
  } catch (error) {
    console.error("Error guardando actividad o archivo:", error);
    return NextResponse.json({ error: "Error interno al guardar" }, { status: 500 });
  }
}