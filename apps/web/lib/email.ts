import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendCommentNotification(to: string, senderName: string, content: string, taskId: string, taskTitle: string) {
  try {
    await resend.emails.send({
      from: "Notificaciones SaaS <onboarding@resend.dev>",
      to: [to],
      subject: `Nuevo comentario en: ${taskTitle}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0891b2;">¡Nuevo comentario!</h2>
          <p><strong>${senderName}</strong> ha comentado en la tarea:</p>
          <div style="background: #f1f5f9; padding: 15px; border-radius: 8px;">
            <h3 style="margin-top: 0;">${taskTitle}</h3>
            <p>${content}</p>
          </div>
          <p style="margin-top: 20px;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/tasks/${taskId}" 
               style="background: #0891b2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
               Ver Comentario
            </a>
          </p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Error enviando correo de comentario:", error);
  }
}

// Re-importing sendTaskNotification that was lost in the previous edit
export async function sendTaskNotification(to: string, taskTitle: string, description: string, creatorName: string, taskId: string) {
  try {
    await resend.emails.send({
      from: "Notificaciones SaaS <onboarding@resend.dev>",
      to: [to],
      subject: `Nueva Tarea Asignada: ${taskTitle}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #0891b2;">¡Nueva tarea asignada!</h2>
          <p>Hola,</p>
          <p>Se te ha asignado una nueva tarea por <strong>${creatorName}</strong>.</p>
          <div style="background: #f1f5f9; padding: 15px; border-radius: 8px;">
            <h3 style="margin-top: 0;">${taskTitle}</h3>
            <p>${description || "Sin descripción."}</p>
          </div>
          <p style="margin-top: 20px;">
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/tasks/${taskId}" 
               style="background: #0891b2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">
               Ver Tarea
            </a>
          </p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Error enviando correo:", error);
  }
}

