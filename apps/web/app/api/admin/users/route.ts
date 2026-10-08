import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ==========================================
// GET: Obtener usuarios (Con blindaje de seguridad)
// ==========================================
export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const currentUserRole = (session.user as any)?.role;
    let users: any[] = [];

    if (currentUserRole === "superadmin") {
      // 👑 Super Admin puede ver a todos los usuarios excepto a otros Super Admins (por seguridad)
      users = await prisma.user.findMany({
        where: {
          role: {
            not: "superadmin"
          }
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" }
      });
    } else if (currentUserRole === "admin") {
      // 🛡️ ADMIN: Solo ver usuarios de SU organización (donde es OWNER) y NUNCA al superadmin
      const adminMemberships = await prisma.workspaceMember.findMany({
        where: {
          userId: session.user.id,
          role: "owner"
        },
        select: {
          workspaceId: true,
          workspace: {
            select: { organizationId: true }
          }
        }
      });

      const ownedWorkspaceIds = adminMemberships.map(m => m.workspaceId);
      const orgIds = adminMemberships
        .map(m => m.workspace?.organizationId)
        .filter((id): id is string => Boolean(id));

      if (ownedWorkspaceIds.length === 0) {
        return NextResponse.json([]);
      }

      const orgMemberships = await prisma.workspaceMember.findMany({
        where: {
          workspace: {
            OR: [
              { id: { in: ownedWorkspaceIds } },
              { organizationId: { in: orgIds } }
            ]
          },
          user: {
            role: {
              not: "superadmin"
            }
          }
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              createdAt: true,
            }
          }
        }
      });

      const uniqueUsersMap = new Map();
      orgMemberships.forEach(m => {
        if (m.user && !uniqueUsersMap.has(m.user.id)) {
          uniqueUsersMap.set(m.user.id, m.user);
        }
      });

      users = Array.from(uniqueUsersMap.values());
    } else {
      return NextResponse.json({ error: "No tienes permisos para ver esta información" }, { status: 403 });
    }

    return NextResponse.json(users);
  } catch (error: any) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

// ==========================================
// PATCH: Actualizar usuario (Con soporte para contraseña)
// ==========================================
export async function PATCH(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const currentUserRole = (session.user as any)?.role;
    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get("id");

    if (!targetUserId) {
      return NextResponse.json({ error: "Falta el ID del usuario" }, { status: 400 });
    }

    // 🛡️ Verificar si el usuario objetivo es superadmin
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, role: true }
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    if (targetUser.role === "superadmin") {
      return NextResponse.json({ error: "No tienes permisos para modificar un Super Admin" }, { status: 403 });
    }

    // Si es admin, verificar que tenga jurisdicción sobre este usuario
    if (currentUserRole === "admin") {
      const adminMemberships = await prisma.workspaceMember.findMany({
        where: {
          userId: session.user.id,
          role: "owner"
        },
        select: {
          workspaceId: true,
          workspace: { select: { organizationId: true } }
        }
      });

      const ownedWorkspaceIds = adminMemberships.map(m => m.workspaceId);
      const orgIds = adminMemberships
        .map(m => m.workspace?.organizationId)
        .filter((id): id is string => Boolean(id));

      const isAuthorized = await prisma.workspaceMember.findFirst({
        where: {
          userId: targetUserId,
          workspace: {
            OR: [
              { id: { in: ownedWorkspaceIds } },
              { organizationId: { in: orgIds } }
            ]
          }
        }
      });

      if (!isAuthorized) {
        return NextResponse.json({ error: "No tienes permisos para modificar este usuario" }, { status: 403 });
      }
    }

    const body = await req.json();
    const { name, email, role, password } = body;

    // Un admin no puede promover a alguien a superadmin
    if (currentUserRole === "admin" && role === "superadmin") {
      return NextResponse.json({ error: "No puedes asignar el rol de Super Admin" }, { status: 403 });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;

    // ✅ NUEVO: Manejar actualización de contraseña
    if (password !== undefined && password !== null && password !== "") {
      if (password.length < 6) {
        return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      updateData.password = hashedPassword;
      console.log(`✅ Contraseña hasheada para el usuario ${targetUserId}`);
    }

    // Si no hay nada que actualizar, retornar error
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No hay datos para actualizar" }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      }
    });

    console.log(`✅ Usuario actualizado: ${updatedUser.id}`);
    return NextResponse.json(updatedUser);
  } catch (error: any) {
    console.error("Error updating user:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

// ==========================================
// DELETE: Eliminar usuario (Con protección anti-eliminación de superadmin)
// ==========================================
export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const currentUserRole = (session.user as any)?.role;
    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get("id");

    if (!targetUserId) {
      return NextResponse.json({ error: "Falta el ID del usuario" }, { status: 400 });
    }

    // 🛡️ Verificar si el usuario objetivo es superadmin
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, role: true }
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    if (targetUser.role === "superadmin") {
      return NextResponse.json({ error: "No tienes permisos para eliminar un Super Admin" }, { status: 403 });
    }

    // Si es admin, verificar que tenga jurisdicción sobre este usuario
    if (currentUserRole === "admin") {
      const adminMemberships = await prisma.workspaceMember.findMany({
        where: {
          userId: session.user.id,
          role: "owner"
        },
        select: {
          workspaceId: true,
          workspace: { select: { organizationId: true } }
        }
      });

      const ownedWorkspaceIds = adminMemberships.map(m => m.workspaceId);
      const orgIds = adminMemberships
        .map(m => m.workspace?.organizationId)
        .filter((id): id is string => Boolean(id));

      const isAuthorized = await prisma.workspaceMember.findFirst({
        where: {
          userId: targetUserId,
          workspace: {
            OR: [
              { id: { in: ownedWorkspaceIds } },
              { organizationId: { in: orgIds } }
            ]
          }
        }
      });

      if (!isAuthorized) {
        return NextResponse.json({ error: "No tienes permisos para eliminar este usuario" }, { status: 403 });
      }
    }

    await prisma.user.delete({
      where: { id: targetUserId }
    });

    return NextResponse.json({ success: true, message: "Usuario eliminado correctamente" });
  } catch (error: any) {
    console.error("Error deleting user:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}