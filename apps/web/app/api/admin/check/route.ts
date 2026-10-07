import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ isAdmin: false, isSuperAdmin: false }, { status: 401 });
    }

    // 1. Obtener el rol GLOBAL del usuario
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, role: true, email: true, name: true }
    });

    // ✅ Validación explícita para evitar el error de TypeScript "user is possibly null"
    if (!user) {
      return NextResponse.json({ isAdmin: false, isSuperAdmin: false, error: "Usuario no encontrado" }, { status: 404 });
    }

    const globalRole = (user.role || "user").toLowerCase().trim();

    // 2. 🛡️ REGLA DE ORO: Super Admin tiene acceso total SIEMPRE.
    if (globalRole === "superadmin") {
      return NextResponse.json({
        isSuperAdmin: true,
        isAdmin: true,
        accessLevel: "global",
        user: { id: user.id, name: user.name, email: user.email, role: globalRole }
      });
    }

    // 3. Para usuarios normales, verificamos su rol CONTEXTUAL en el workspace activo.
    // Buscamos si el usuario es owner o admin de AL MENOS UN workspace en su organización.
    const workspaceMembership = await prisma.workspaceMember.findFirst({
      where: {
        userId: session.user.id,
        role: { in: ["admin", "owner"] }
      }
    });

    const isWorkspaceAdmin = !!workspaceMembership;

    return NextResponse.json({
      isSuperAdmin: false,
      // Solo es admin si el usuario es owner/admin de al menos un workspace, 
      // y ese espacio es su contexto de administración principal.
      isAdmin: isWorkspaceAdmin, 
      accessLevel: isWorkspaceAdmin ? "workspace" : "member",
      user: { id: user.id, name: user.name, email: user.email, role: globalRole }
    });

  } catch (error) {
    console.error("Error en /api/admin/check:", error);
    return NextResponse.json({ isAdmin: false, isSuperAdmin: false }, { status: 500 });
  }
}