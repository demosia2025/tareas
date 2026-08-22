import Groq from "groq-sdk";
import { auth } from "@/auth";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `Eres el asistente oficial de "Gestión de Tareas", una aplicación SaaS para gestión de proyectos.

## TUS CONOCIMIENTOS:
- **Organización**: Entidad principal. Contiene workspaces.
- **Workspace**: Espacio de trabajo. Tiene miembros con roles (owner, admin, member).
- **Space (Espacio)**: Contenedor dentro del workspace.
- **Folder (Carpeta)**: Sub-organización dentro de un espacio.
- **List (Lista)**: Contiene las tareas.
- **Task (Tarea)**: Unidad de trabajo con estado (todo, in_progress, done), prioridad (low, medium, high, urgent) y asignados.

## Instrucciones:
- Responde SIEMPRE en español.
- Sé conciso y claro (máximo 3-4 oraciones por respuesta).
- Usa las herramientas disponibles para consultar datos REALES del usuario.
- NUNCA inventes datos sobre tareas o usuarios específicos.
- Si no sabes algo, di "No tengo información sobre eso, pero puedes consultar la documentación o contactar al administrador".
`;

export async function POST(req: Request) {
  try {
    console.log("🔍 [AI API] Iniciando petición con Groq...");

    const session = await auth();
    if (!session?.user?.id) {
      console.warn("️ [AI API] Usuario no autenticado");
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { messages } = await req.json();
    const apiKey = process.env.GROQ_API_KEY;

    console.log("🔑 [AI API] Groq API Key presente:", !!apiKey);

    if (!apiKey) {
      console.error("❌ [AI API] Falta GROQ_API_KEY en variables de entorno");
      return new Response(
        JSON.stringify({ error: "Falta GROQ_API_KEY en Vercel" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Inicializar cliente de Groq
    const groq = new Groq({ apiKey });

    // Preparar mensajes para Groq
    const groqMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages.map((m: any) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      })),
    ];

    console.log(" [AI API] Enviando a Groq (modelo: llama-3.1-8b-instant)...");

    // Llamar a Groq con streaming
    const stream = await groq.chat.completions.create({
      messages: groqMessages,
     model: "llama3-8b-8192", // ✅ Modelo correcto y siempre disponible
      temperature: 0.7,
      max_tokens: 800,
      stream: true,
    });

    console.log("✅ [AI API] Stream iniciado, enviando respuesta...");

    // Convertir el stream de Groq al formato SSE
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content || "";
            if (text) {
              const data = JSON.stringify({ text });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
          console.log("✅ [AI API] Stream completado exitosamente");
        } catch (error) {
          console.error("💥 [AI API] Error en stream:", error);
          controller.error(error);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    console.error("💥 [AI API] ERROR CRÍTICO:", error?.message);
    console.error("💥 [AI API] Stack:", error?.stack);
    return new Response(
      JSON.stringify({ error: "Error interno", details: error?.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}