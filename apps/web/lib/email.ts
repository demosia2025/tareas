import sgMail from '@sendgrid/mail';

// Inicializar SendGrid con la API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

// ==========================================
// 1. Notificación de Tarea Asignada
// ==========================================
interface SendTaskNotificationParams {
  to: string;
  taskTitle: string;
  taskDescription?: string;
  assignedBy: string;
  taskId: string;
}

export async function sendTaskNotification({
  to,
  taskTitle,
  taskDescription,
  assignedBy,
  taskId,
}: SendTaskNotificationParams): Promise<void> {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('⚠️ SENDGRID_API_KEY no está configurada. El correo no se enviará.');
    return;
  }

  const msg = {
    to,
    from: process.env.SENDGRID_FROM_EMAIL || 'noreply@comulsa.com',
    subject: `Nueva tarea asignada: ${taskTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #0ea5e9;">Nueva Tarea Asignada</h2>
        <p>Hola,</p>
        <p>Se te ha asignado una nueva tarea en el sistema de gestión:</p>
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0ea5e9;">
          <h3 style="margin-top: 0; color: #1e293b;">${taskTitle}</h3>
          ${taskDescription ? `<p style="color: #64748b;">${taskDescription}</p>` : ''}
          <p style="color: #64748b; margin-bottom: 0;"><strong>Asignado por:</strong> ${assignedBy}</p>
        </div>
        <p>Puedes ver los detalles de la tarea en el sistema.</p>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 30px;">Este es un correo automático, por favor no responder.</p>
      </div>
    `,
  };

  try {
    await sgMail.send(msg);
    console.log(`✅ Correo de tarea enviado exitosamente a ${to}`);
  } catch (error) {
    console.error('❌ Error enviando correo de tarea con SendGrid:', error);
    throw error;
  }
}

// ==========================================
// 2. Notificación de Nuevo Comentario
// ==========================================
interface SendCommentNotificationParams {
  to: string;
  taskTitle: string;
  commentText: string;
  commentedBy: string;
  taskId: string;
}

export async function sendCommentNotification({
  to,
  taskTitle,
  commentText,
  commentedBy,
  taskId,
}: SendCommentNotificationParams): Promise<void> {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('⚠️ SENDGRID_API_KEY no está configurada. El correo no se enviará.');
    return;
  }

  const msg = {
    to,
    from: process.env.SENDGRID_FROM_EMAIL || 'noreply@comulsa.com',
    subject: `Nuevo comentario en: ${taskTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <h2 style="color: #0ea5e9;">Nuevo Comentario en Tarea</h2>
        <p>Hola,</p>
        <p>Hay un nuevo comentario en la tarea <strong>"${taskTitle}"</strong>:</p>
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
          <p style="color: #334155; font-style: italic; margin-top: 0;">"${commentText}"</p>
          <p style="color: #64748b; margin-bottom: 0;"><strong>Comentado por:</strong> ${commentedBy}</p>
        </div>
        <p>Puedes revisar la conversación completa en el sistema.</p>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 30px;">Este es un correo automático, por favor no responder.</p>
      </div>
    `,
  };

  try {
    await sgMail.send(msg);
    console.log(`✅ Correo de comentario enviado exitosamente a ${to}`);
  } catch (error) {
    console.error('❌ Error enviando correo de comentario con SendGrid:', error);
    throw error;
  }
}