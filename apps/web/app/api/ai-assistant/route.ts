import { GoogleGenerativeAI } from "@google/generative-ai";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `Eres el asistente oficial de "Gestión de Tareas", una aplicación SaaS para gestión de proyectos.

## TUS CONOCIMIENTOS:
- **Organización**: Entidad principal. Contiene workspaces.
- **Workspace**: Espacio de trabajo. Tiene miembros con roles (owner, admin, member).
- **Space (Espacio)**: Contenedor dentro del workspace.
- **Folder (Carpeta)**: Sub-organización dentro de un espacio.
- **List (Lista)**: Contiene las tareas.
- **Task (Tarea)**: Unidad de trabajo con estado (todo, in_progress, done), prioridad y asignados.

## Instrucciones:
- Responde SIEMPRE en español.
- Sé conciso y claro (máximo 3-4 oraciones por respuesta).
- Usa las herramientas disponibles para consultar datos REALES del usuario.
- NUNCA inventes datos sobre tareas o usuarios específicos.
`;

// ✅ Función para convertir mensajes al formato de Gemini
function convertMessages(messages: any[]) {
  return messages.map((msg) => ({
    role: msg.role === "user" ? "user" : "model",
    parts: [{ text: msg.content }],
  }));
}

export async function POST(req: Request) {
  try {
    console.log(" [AI API] Iniciando petición con Google Gemini...");

    const session = await auth();

    if (!session?.user?.id) {
      console.warn("⚠️ [AI API] Usuario no autenticado");
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const userId = session.user.id;
    const { messages } = await req.json();

    console.log("✅ [AI API] Usuario autenticado:", userId);

    // ✅ Inicializar Google Gemini con la API Key desde variables de entorno
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      console.error("❌ [AI API] Falta GOOGLE_GENERATIVE_AI_API_KEY en variables de entorno");
      return new Response(
        JSON.stringify({ error: "API Key de Google no configurada" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash", // ✅ Modelo gratuito y rápido
      systemInstruction: SYSTEM_PROMPT,
    });

    // ✅ Convertir mensajes al formato de Gemini
    const geminiMessages = convertMessages(messages);

    // ✅ Generar contenido con streaming
    const result = await model.generateContentStream({
      contents: geminiMessages,
      generationConfig: {
        maxOutputTokens: 800,
        temperature: 0.7,
      },
    });

    // ✅ Convertir el stream de Gemini a formato SSE compatible con el frontend
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let fullText = "";
          for await (const chunk of result.stream) {
            const text = chunk.text();
            fullText += text;
            // Enviar en formato SSE compatible con useChat de Vercel AI
            const data = JSON.stringify({ text });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }
          // Señal de fin
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        } catch (error) {
          console.error("💥 Error en stream:", error);
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("💥 ERROR CRÍTICO en AI Assistant:", error);
    return new Response(
      JSON.stringify({ error: "Error interno del servidor", details: String(error) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}