import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { invitationId } = body;

    if (!invitationId) {
      return NextResponse.json({ error: "invitationId es requerido" }, { status: 400 });
    }

    const invitation = await prisma.userInvitation.findUnique({
      where: { id: invitationId },
      include: {
        workspace: true,
        task: true
      }
    });

    if (!invitation) {
      return NextResponse.json({ error: "Invitación no encontrada" }, { status: 404 });
    }

    if (invitation.invitedUserId !== session.user.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    if (invitation.status !== "pending") {
      return NextResponse.json({ error: "Esta invitación ya fue procesada" }, { status: 400 });
    }

    // Si es invitación a workspace completo, agregar como miembro
    if (invitation.invitationType === "workspace") {
      const existingMember = await prisma.workspaceMember.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: invitation.workspaceId,
            userId: session.user.id
          }
        }
      });

      if (!existingMember) {
        await prisma.workspaceMember.create({
          data: {
            workspaceId: invitation.workspaceId,
            userId: session.user.id,
            role: "member"
          }
        });
      }
    }

    // Actualizar estado de la invitación
    await prisma.userInvitation.update({
      where: { id: invitationId },
      data: {
        status: "accepted"
      }
    });

    return NextResponse.json({ 
      message: "Invitación aceptada",
      workspaceId: invitation.workspaceId,
      invitationType: invitation.invitationType,
      taskId: invitation.taskId
    });
  } catch (error: any) {
    console.error("Error aceptando invitación:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}