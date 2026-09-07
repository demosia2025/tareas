import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { v2 as cloudinary } from "cloudinary";
import { prisma } from "@/lib/prisma";

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const taskId = formData.get("taskId") as string;

    if (!file || !taskId) {
      return NextResponse.json({ error: "Archivo y taskId son requeridos" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Determinar el tipo de recurso según el tipo de archivo
    const isImage = file.type.startsWith("image/");
    const resourceType = isImage ? "image" : "raw";

    // ✅ CORREGIDO: Subir a Cloudinary con validación de TypeScript
    const result = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `tasks/${taskId}`,
          resource_type: resourceType,
          access_mode: "public",
          public_id: `${Date.now()}-${file.name.replace(/\.[^/.]+$/, "")}`,
          ...(file.type === "application/pdf" && {
            format: "pdf",
            resource_type: "raw"
          })
        },
        (error, result) => {
          if (error) {
            console.error("❌ Error en upload de Cloudinary:", error);
            reject(error);
          } else if (result) {
            // ✅ Verificación explícita para satisfacer a TypeScript
            console.log("✅ Archivo subido:", result.secure_url);
            resolve(result);
          } else {
            reject(new Error("Error desconocido al subir archivo a Cloudinary"));
          }
        }
      );
      uploadStream.end(buffer);
    });

    // Guardar en base de datos
    const attachment = await prisma.attachment.create({
      data: {
        taskId,
        fileName: file.name,
        fileUrl: result.secure_url,
        fileType: file.type,
        fileSize: file.size,
      },
    });

    return NextResponse.json({
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      attachment,
    });
  } catch (error: any) {
    console.error("❌ Error uploading file:", error);
    return NextResponse.json({ error: error.message || "Error interno al subir el archivo" }, { status: 500 });
  }
}