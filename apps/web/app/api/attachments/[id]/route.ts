import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { v2 as cloudinary } from "cloudinary";

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// GET: Servir archivo desde Cloudinary
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

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

// DELETE: Eliminar archivo de Cloudinary y de la base de datos
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "ID de attachment requerido" }, { status: 400 });
    }

    // Buscar el attachment con información de la tarea
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

    // Verificar permisos: solo usuarios con acceso al workspace pueden eliminar
    const userRole = (session.user as any)?.role;
    const hasWorkspaceAccess = attachment.task.workspace.members.length > 0;
    
    if (!hasWorkspaceAccess && userRole !== "superadmin") {
      return NextResponse.json({ error: "No tienes permisos para eliminar este archivo" }, { status: 403 });
    }

    // Extraer el public_id de la URL de Cloudinary
    // URL formato: https://res.cloudinary.com/{cloud_name}/image/upload/v{version}/{public_id}.{format}
    const fileUrl = attachment.fileUrl;
    let publicId = "";
    
    try {
      const url = new URL(fileUrl);
      const pathParts = url.pathname.split("/");
      
      // Encontrar el índice de "upload"
      const uploadIndex = pathParts.indexOf("upload");
      if (uploadIndex !== -1) {
        // Tomar todo después de "upload"
        const afterUpload = pathParts.slice(uploadIndex + 1);
        
        // Si el primer elemento es la versión (v1234567890), removerlo
        if (afterUpload[0] && afterUpload[0].startsWith("v") && /^\d+/.test(afterUpload[0].substring(1))) {
          afterUpload.shift();
        }
        
        // Unir y remover la extensión
        const fullPath = afterUpload.join("/");
        const lastDotIndex = fullPath.lastIndexOf(".");
        publicId = lastDotIndex !== -1 ? fullPath.substring(0, lastDotIndex) : fullPath;
      }
    } catch (error) {
      console.error("Error extrayendo public_id:", error);
    }

    // Eliminar de Cloudinary si tenemos el public_id
    if (publicId) {
      try {
        const result = await cloudinary.uploader.destroy(publicId);
        console.log(`✅ Archivo eliminado de Cloudinary: ${publicId}`, result);
      } catch (cloudinaryError) {
        console.error("Error eliminando de Cloudinary:", cloudinaryError);
        // Continuamos aunque falle Cloudinary, al menos eliminamos de la BD
      }
    }

    // Eliminar de la base de datos
    await prisma.attachment.delete({
      where: { id },
    });

    console.log(`✅ Attachment eliminado de la base de datos: ${id}`);

    return NextResponse.json({ 
      success: true, 
      message: "Archivo eliminado correctamente" 
    });
  } catch (error) {
    console.error("Error deleting attachment:", error);
    return NextResponse.json({ error: "Error interno al eliminar el archivo" }, { status: 500 });
  }
}