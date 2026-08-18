import { auth } from "../../../auth";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { isAdmin: false },
        { status: 401 }
      );
    }

    const userRole = (session.user as any).role || "user";
    const isAdmin = userRole === "admin" || userRole === "superadmin";

    return NextResponse.json({
      isAdmin,
      user: {
        id: (session.user as any).id,
        email: session.user.email,
        name: session.user.name,
        role: userRole,
      },
    });
  } catch (error) {
    console.error("Error en /api/admin2/check:", error);
    return NextResponse.json(
      { isAdmin: false },
      { status: 500 }
    );
  }
}