import { createGroq } from "@ai-sdk/groq";
import { streamText } from "ai";
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

    // Instancia el cliente de Groq de forma explícita
    const groq = createGroq({ apiKey });

    const result = await streamText({
      model: groq("llama-3.1-8b-instant") as any,
      system: SYSTEM_PROMPT,
      messages,
      maxTokens: 800,
      temperature: 0.7,
    });

    return result.toDataStreamResponse();
  } catch (error: any) {
    console.error("💥 ERROR CRÍTICO en AI Assistant:", error?.message);
    return new Response(
      JSON.stringify({ error: "Error interno", details: error?.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}