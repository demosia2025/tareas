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
`;

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { messages } = await req.json();
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Falta GROQ_API_KEY en Vercel" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const groq = new Groq({ apiKey });

    const groqMessages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages.map((m: any) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content,
      })),
    ];

    // ✅ MODELO ACTUAL, GRATUITO Y ESTABLE DE GROQ
    const stream = await groq.chat.completions.create({
      messages: groqMessages,
      model: "llama-3.1-8b-instant", // ✅ Modelo gratuito, estable y con altos límites 
      temperature: 0.7,
      max_tokens: 800,
      stream: true,
    });

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
        } catch (error) {
          console.error("💥 Error en stream de Groq:", error);
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
    console.error("💥 ERROR CRÍTICO en AI Assistant:", error?.message);
    return new Response(
      JSON.stringify({ error: "Error interno", details: error?.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}