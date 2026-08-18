import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function POST(req: Request) {
  try {
    const session = await auth();
    
    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { name, spaceId, workspaceId } = body;

    if (!name || !spaceId) {
      return NextResponse.json({ error: "Faltan campos obligatorios (name, spaceId)" }, { status: 400 });
    }

    const folderData: any = {
      name: name.trim(),
      spaceId: spaceId,
    };

    if (workspaceId) {
      folderData.workspaceId = workspaceId;
    }

    const folder = await prisma.folder.create({
      data: folderData,
    });

    return NextResponse.json(folder, { status: 201 });
  } catch (error: any) {
    console.error("--- ERROR EN POST /api/folders ---", error);
    return NextResponse.json({ error: "Error interno del servidor", details: error?.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const { id, name } = body;

    if (!id || !name) {
      return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
    }

    const updatedFolder = await prisma.folder.update({
      where: { id },
      data: { name: name.trim() },
    });

    return NextResponse.json(updatedFolder);
  } catch (error: any) {
    console.error("--- ERROR EN PUT /api/folders ---", error);
    return NextResponse.json({ error: "Error interno del servidor", details: error?.message }, { status: 500 });
  }
}

// NUEVO: Método DELETE para eliminar carpetas
export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Falta el ID de la carpeta" }, { status: 400 });
    }

    await prisma.folder.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("--- ERROR EN DELETE /api/folders ---", error);
    return NextResponse.json({ error: "Error interno del servidor", details: error?.message }, { status: 500 });
  }
}