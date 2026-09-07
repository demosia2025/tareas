import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> } // ✅ params es ahora una Promesa
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // ✅ CORRECCIÓN CRÍTICA: Await params para obtener el id
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "ID de attachment requerido" }, { status: 400 });
    }

    const attachment = await prisma.attachment.findUnique({
      where: { id },
      include: {
        task: {
          include: {
            workspace: {
              include: {
                members: {
                  where: { userId: session.user.id },
                },
              },
            },
          },
        },
      },
    });

    if (!attachment) {
      return NextResponse.json({ error: "Archivo no encontrado" }, { status: 404 });
    }

    // Verificar que el usuario tenga acceso al workspace de la tarea
    if (!attachment.task.workspace.members.length) {
      return NextResponse.json({ error: "No tienes acceso a este archivo" }, { status: 403 });
    }

    // Fetch the file from Cloudinary
    const cloudinaryResponse = await fetch(attachment.fileUrl);
    
    if (!cloudinaryResponse.ok) {
      throw new Error("Failed to fetch file from Cloudinary");
    }

    const blob = await cloudinaryResponse.blob();
    
    return new NextResponse(blob, {
      headers: {
        "Content-Type": attachment.fileType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${attachment.fileName}"`,
        "Cache-Control": "public, max-age=31536000",
      },
    });
  } catch (error) {
    console.error("Error serving attachment:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}