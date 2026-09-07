import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

// ✅ CORREGIDO: Ahora usa params de la ruta dinámica en lugar de query params
export async function GET(
  req: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // ✅ Extraer workspaceId de los params de la ruta dinámica
    const { workspaceId } = await params;
    
    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId requerido" }, { status: 400 });
    }

    // ✅ BYPASS PARA SUPER ADMIN: Acceso total sin validación de membresía
    const userGlobalRole = (session.user as any)?.role || "user";
    if (userGlobalRole !== "superadmin") {
      // Para admin/owner/user: verificar que sea miembro del workspace
      const member = await prisma.workspaceMember.findFirst({
        where: {
          userId: session.user.id,
          workspaceId: workspaceId,
        },
      });
      if (!member) {
        return NextResponse.json({ error: "No tienes acceso a este workspace" }, { status: 403 });
      }
    }

    const members = await prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } }
      }
    });

    return NextResponse.json(members);
  } catch (error) {
    console.error("Error obteniendo miembros:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // ✅ Extraer workspaceId de los params de la ruta dinámica
    const { workspaceId } = await params;
    
    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId requerido" }, { status: 400 });
    }

    // ✅ BYPASS PARA SUPER ADMIN: Puede asignar usuarios a CUALQUIER workspace
    const userGlobalRole = (session.user as any)?.role || "user";
    if (userGlobalRole !== "superadmin") {
      // Para admin/owner: verificar que tenga permisos en este workspace
      const member = await prisma.workspaceMember.findFirst({
        where: {
          userId: session.user.id,
          workspaceId: workspaceId,
          role: { in: ["owner", "admin"] }
        },
      });
      if (!member) {
        return NextResponse.json({ 
          error: "No tienes permisos para asignar usuarios en este workspace" 
        }, { status: 403 });
      }
    }

    const { email, role } = await req.json();
    if (!email) {
      return NextResponse.json({ error: "Email es requerido" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return NextResponse.json({ 
        error: "El usuario no está registrado en la plataforma" 
      }, { status: 404 });
    }

    // Verificar si ya es miembro
    const existingMember = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: workspaceId,
          userId: user.id,
        },
      },
    });

    if (existingMember) {
      return NextResponse.json({ 
        error: "El usuario ya forma parte de este workspace" 
      }, { status: 400 });
    }

    const newMember = await prisma.workspaceMember.create({
      data: {
        workspaceId: workspaceId,
        userId: user.id,
        role: role || "member",
      },
      include: { 
        user: { 
          select: { 
            id: true, 
            name: true, 
            email: true,
            role: true 
          } 
        } 
      },
    });

    return NextResponse.json(newMember, { status: 201 });
  } catch (error) {
    console.error("Error asignando usuario:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // ✅ Extraer workspaceId de los params de la ruta dinámica
    const { workspaceId } = await params;
    
    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId requerido" }, { status: 400 });
    }

    // ✅ BYPASS PARA SUPER ADMIN
    const userGlobalRole = (session.user as any)?.role || "user";
    if (userGlobalRole !== "superadmin") {
      const member = await prisma.workspaceMember.findFirst({
        where: {
          userId: session.user.id,
          workspaceId: workspaceId,
          role: { in: ["owner", "admin"] }
        },
      });
      if (!member) {
        return NextResponse.json({ error: "No tienes permisos" }, { status: 403 });
      }
    }

    const { userId, role } = await req.json();
    if (!userId || !role) {
      return NextResponse.json({ error: "userId y role son requeridos" }, { status: 400 });
    }

    const updatedMember = await prisma.workspaceMember.update({
      where: {
        workspaceId_userId: {
          workspaceId: workspaceId,
          userId: userId,
        },
      },
      data: { role },
      include: {
        user: { select: { id: true, name: true, email: true } }
      }
    });

    return NextResponse.json(updatedMember);
  } catch (error) {
    console.error("Error actualizando miembro:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // ✅ Extraer workspaceId de los params de la ruta dinámica
    const { workspaceId } = await params;
    
    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId requerido" }, { status: 400 });
    }

    // ✅ BYPASS PARA SUPER ADMIN
    const userGlobalRole = (session.user as any)?.role || "user";
    if (userGlobalRole !== "superadmin") {
      const member = await prisma.workspaceMember.findFirst({
        where: {
          userId: session.user.id,
          workspaceId: workspaceId,
          role: { in: ["owner", "admin"] }
        },
      });
      if (!member) {
        return NextResponse.json({ error: "No tienes permisos" }, { status: 403 });
      }
    }

    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: "userId es requerido" }, { status: 400 });
    }

    await prisma.workspaceMember.delete({
      where: {
        workspaceId_userId: {
          workspaceId: workspaceId,
          userId: userId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error eliminando miembro:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}