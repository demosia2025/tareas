import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

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

    // Si se proporciona un código de acceso/invitación generado por admin2, lo validamos
    if (inviteCode && inviteCode.trim() !== "") {
      const validInvite = await prisma.inviteCode.findUnique({
        where: { code: inviteCode.trim() },
        include: { workspace: true }
      });

      if (!validInvite || !validInvite.active) {
        return NextResponse.json({ error: "El código de acceso no es válido o está inactivo" }, { status: 400 });
      }

      if (validInvite.usedCount >= validInvite.maxUses) {
        return NextResponse.json({ error: "Este código de acceso ha alcanzado su límite máximo de usos" }, { status: 400 });
      }

      if (new Date() > new Date(validInvite.expiresAt)) {
        return NextResponse.json({ error: "El código de acceso ha expirado" }, { status: 400 });
      }

      workspaceIdToJoin = validInvite.workspaceId;
    }

    // Hashear la contraseña de forma segura en el servidor
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear el usuario en la base de datos
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "user",
      },
    });

    // Si el usuario ingresó un código válido, vincularlo automáticamente al workspace de la organización
    if (workspaceIdToJoin) {
      await prisma.workspaceMember.create({
        data: {
          userId: newUser.id,
          workspaceId: workspaceIdToJoin,
          role: "member",
        },
      });

      // Incrementar el contador de usos del código de invitación
      await prisma.inviteCode.update({
        where: { code: inviteCode.trim() },
        data: { usedCount: { increment: 1 } },
      });
    }

    return NextResponse.json({ success: true, userId: newUser.id }, { status: 201 });
  } catch (error) {
    console.error("❌ Error en el registro de usuario:", error);
    return NextResponse.json({ error: "Error interno del servidor al procesar el registro" }, { status: 500 });
  }
}
