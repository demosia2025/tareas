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
- NUNCA inventes datos sobre tareas o usuarios específicos.`;

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
        JSON.stringify({ error: "Falta GROQ_API_KEY en las variables de entorno" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Usar directamente el cliente nativo de Groq
    const groq = new Groq({ apiKey });

    // Adaptar mensajes al formato de Groq
    const groqMessages = [
      { role: "system" as const, content: SYSTEM_PROMPT },
      ...messages.map((m: any) => ({
        role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content: m.content || "",
      })),
    ];

    const stream = await groq.chat.completions.create({
      messages: groqMessages,
      model: "llama-3.1-8b-instant",
      temperature: 0.7,
      max_tokens: 800,
      stream: true,
    });

    // Formatear stream según el protocolo que espera Vercel AI SDK / useChat
    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              // Formato de Vercel AI SDK Data Stream Protocol (0:"texto\n")
              controller.enqueue(encoder.encode(`0:${JSON.stringify(content)}\n`));
            }
          }
          controller.close();
        } catch (error) {
          console.error("💥 Error en streaming de Groq:", error);
          controller.error(error);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "x-vercel-ai-ui-stream": "true",
        "Cache-Control": "no-cache",
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