import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { validateInviteCode, normalizeInviteCode } from "@/lib/rbac";

export async function POST(req: Request) {
  try {
    const { name, email, password, inviteCode } = await req.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
    }

    // Verificar si el usuario ya existe
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ error: "El correo electrónico ya está registrado" }, { status: 400 });
    }

    let workspaceIdToJoin = null;
    let normalizedCode = "";

    // Si se proporciona un código de acceso/invitación generado por admin/admin2, lo validamos con la regla estricta
    if (inviteCode && inviteCode.trim() !== "") {
      normalizedCode = normalizeInviteCode(inviteCode);
      const validation = await validateInviteCode(normalizedCode);
      if (!validation.valid) {
        return NextResponse.json({ error: validation.error || "El código de invitación no es válido" }, { status: 400 });
      }
      workspaceIdToJoin = validation.inviteCode.workspaceId;
    }

    // Hashear la contraseña de forma segura en el servidor
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear el usuario en la base de datos (Invited flow -> rol user)
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "user",
      },
    });

    // Si el usuario ingresó un código válido, vincularlo automáticamente como "member"
    if (workspaceIdToJoin && normalizedCode) {
      await prisma.workspaceMember.create({
        data: {
          userId: newUser.id,
          workspaceId: workspaceIdToJoin,
          role: "member",
        },
      });

      // Incrementar el contador de usos del código de invitación
      await prisma.inviteCode.update({
        where: { code: normalizedCode },
        data: { usedCount: { increment: 1 } },
      });
    }

    return NextResponse.json({ success: true, userId: newUser.id }, { status: 201 });
  } catch (error) {
    console.error("❌ Error en el registro de usuario:", error);
    return NextResponse.json({ error: "Error interno del servidor al procesar el registro" }, { status: 500 });
  }
}
