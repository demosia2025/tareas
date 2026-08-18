import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("taskId");

    if (!taskId) {
      return NextResponse.json({ error: "taskId es requerido" }, { status: 400 });
    }

    const comments = await prisma.comment.findMany({
      where: { taskId },
      include: { 
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        } 
      },
      orderBy: { createdAt: "asc" },
    });

    const attachments = await prisma.attachment.findMany({
      where: { taskId },
      orderBy: { createdAt: "desc" },
    });

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

export async function POST(req: Request) {
  try {
    // ✅ CORREGIDO: Usar la sesión autenticada real
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const bodyData = await req.json();
    const { taskId, body, file } = bodyData;

    if (!taskId) {
      return NextResponse.json({ error: "taskId es requerido" }, { status: 400 });
    }

    // 1. Si viene un archivo adjunto, lo guardamos en la tabla Attachment
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

    // 2. Si viene texto de comentario, lo guardamos con el ID del usuario DE LA SESIÓN
    let newComment = null;
    if (body && body.trim() !== "") {
      newComment = await prisma.comment.create({
        data: {
          taskId,
          creatorId: session.user.id, // ✅ AHORA USA EL ID REAL DEL USUARIO AUTENTICADO
          body,
        },
        include: { 
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true
            }
          } 
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