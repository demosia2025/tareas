import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { isAdmin: false, isSuperAdmin: false },
        { status: 401 }
      );
    }

    const userRole = (session.user as any).role || "user";
    const isSuperAdmin = userRole === "superadmin";
    const isAdmin = userRole === "admin" || userRole === "superadmin";

    return NextResponse.json({
      isAdmin,
      isSuperAdmin,
      user: {
        id: (session.user as any).id,
        email: session.user.email,
        name: session.user.name,
        role: userRole,
      },
    });
  } catch (error) {
    console.error("Error en /api/admin/check:", error);
    return NextResponse.json(
      { isAdmin: false, isSuperAdmin: false },
      { status: 500 }
    );
  }
}
