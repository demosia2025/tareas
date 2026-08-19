import { auth } from "../auth";
import { NextResponse } from "next/server";

export async function requireSuperAdmin() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Buscamos el rol directamente en la sesión (inyectado por auth.ts)
  // o en la base de datos como respaldo
  const userRole = (session.user as any).role;

  if (userRole !== "superadmin") {
    return NextResponse.json(
      { error: "Se requieren permisos de super administrador" },
      { status: 403 }
    );
  }

  return { userId: session.user.id, role: userRole };
}
