import sgMail from '@sendgrid/mail';

// Inicializar SendGrid con la API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

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
  // Verificar que la API key esté configurada
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('⚠️ SENDGRID_API_KEY no está configurada. El correo no se enviará.');
    return;
  }

  const msg = {
    to,
    from: process.env.SENDGRID_FROM_EMAIL || 'noreply@comulsa.com',
    subject: `Nueva tarea asignada: ${taskTitle}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #0ea5e9;">Nueva Tarea Asignada</h2>
        <p>Hola,</p>
        <p>Se te ha asignado una nueva tarea en el sistema de gestión:</p>
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #1e293b;">${taskTitle}</h3>
          ${taskDescription ? `<p style="color: #64748b;">${taskDescription}</p>` : ''}
          <p style="color: #64748b;"><strong>Asignado por:</strong> ${assignedBy}</p>
        </div>
        <p>Puedes ver los detalles de la tarea en el sistema.</p>
        <p style="color: #94a3b8; font-size: 12px;">Este es un correo automático, por favor no responder.</p>
      </div>
    `,
  };

  try {
    await sgMail.send(msg);
    console.log(`✅ Correo enviado exitosamente a ${to}`);
  } catch (error) {
    console.error('❌ Error enviando correo con SendGrid:', error);
    throw error;
  }
}