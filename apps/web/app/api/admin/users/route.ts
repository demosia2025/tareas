import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// ✅ OBTENER TODOS LOS USUARIOS
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    if (user?.role !== "superadmin" && user?.role !== "admin") {
      return NextResponse.json({ error: "No tienes permisos" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            memberships: true,
            createdTasks: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(users);
  } catch (error: any) {
    console.error("Error obteniendo usuarios:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ✅ CREAR NUEVO USUARIO
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    if (user?.role !== "superadmin" && user?.role !== "admin") {
      return NextResponse.json({ error: "No tienes permisos" }, { status: 403 });
    }

    const body = await request.json();
    const { name, email, password, role, workspaceId } = body;

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Nombre, email y contraseña son requeridos" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "El email ya está en uso" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || "user"
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true
      }
    });

    // Si se proporciona un workspaceId, agregar al usuario como miembro
    if (workspaceId) {
      await prisma.workspaceMember.create({
        data: {
          userId: newUser.id,
          workspaceId,
          role: role === "admin" ? "admin" : "member"
        }
      });
    }

    return NextResponse.json(newUser, { status: 201 });
  } catch (error: any) {
    console.error("Error creando usuario:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ✅ EDITAR USUARIO (El que te estaba fallando)
export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    if (user?.role !== "superadmin" && user?.role !== "admin") {
      return NextResponse.json({ error: "No tienes permisos" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID de usuario requerido" }, { status: 400 });
    }

    const body = await request.json();
    const { name, email, role, password } = body;

    const updateData: any = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (role) updateData.role = role;
    
    // Solo hashear la contraseña si se proporciona una nueva
    if (password && password.trim() !== "") {
      updateData.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true
      }
    });

    return NextResponse.json(updatedUser);
  } catch (error: any) {
    console.error("Error actualizando usuario:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ✅ ELIMINAR USUARIO
export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true }
    });

    if (user?.role !== "superadmin" && user?.role !== "admin") {
      return NextResponse.json({ error: "No tienes permisos" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID de usuario requerido" }, { status: 400 });
    }

    // No permitir eliminar al propio usuario que está haciendo la petición
    if (id === session.user.id) {
      return NextResponse.json({ error: "No puedes eliminarte a ti mismo" }, { status: 400 });
    }

    await prisma.user.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: "Usuario eliminado correctamente" });
  } catch (error: any) {
    console.error("Error eliminando usuario:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}