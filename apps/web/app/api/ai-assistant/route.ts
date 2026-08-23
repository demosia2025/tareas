import { auth } from "@/auth";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `Eres el asistente oficial de "Gestión de Tareas", una aplicación SaaS para gestión de proyectos.
Responde SIEMPRE en español y de forma concisa (máximo 3 oraciones).`;

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const apiKey = (process.env.MISTRAL_API_KEY || "").trim();

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "Falta MISTRAL_API_KEY en .env.local" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const { messages } = await req.json();

    const formattedMessages = Array.isArray(messages)
      ? messages.map((m: any) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: String(m.content || ""),
        }))
      : [];

    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "mistral-small-latest",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...formattedMessages,
        ],
        temperature: 0.5,
        max_tokens: 500,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: data?.error?.message || "Error devuelto por Mistral" }),
        { status: response.status, headers: { "Content-Type": "application/json" } }
      );
    }

    const responseContent = data.choices?.[0]?.message?.content || "Sin respuesta.";

    return new Response(
      JSON.stringify({ role: "assistant", content: responseContent }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error?.message || "Error interno del servidor" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}