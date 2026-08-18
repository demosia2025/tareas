import { auth } from "../auth";
import { NextResponse } from "next/server";

export async function requireAdmin() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const userRole = (session.user as any).role;

  if (userRole !== "admin" && userRole !== "superadmin") {
    return NextResponse.json(
      { error: "Se requieren permisos de administrador" },
      { status: 403 }
    );
  }

  return { userId: session.user.id, role: userRole };
}