import { GoogleGenerativeAI } from "@google/generative-ai";
import { auth } from "@/auth";

export const runtime = "nodejs";

const SYSTEM_PROMPT = `Eres el asistente oficial de "Gestión de Tareas". Responde SIEMPRE en español. Sé conciso y útil.`;

function convertMessages(messages: any[]) {
  return messages.map((msg) => ({
    role: msg.role === "user" ? "user" : "model",
    parts: [{ text: msg.content }],
  }));
}

export async function POST(req: Request) {
  try {
    console.log("🔍 [AI API] === INICIANDO PETICIÓN ===");

    const session = await auth();
    console.log("🔑 [AI API] Session email:", session?.user?.email);

    if (!session?.user?.id) {
      console.warn("⚠️ [AI API] No autorizado");
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { messages } = await req.json();
    console.log("📨 [AI API] Mensajes recibidos:", messages.length);

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    console.log("🔑 [AI API] Key presente en Vercel:", !!apiKey);
    console.log("🔑 [AI API] Key empieza con:", apiKey ? apiKey.substring(0, 10) : "NO HAY KEY");

    if (!apiKey) {
      console.error("❌ [AI API] ERROR CRÍTICO: Falta GOOGLE_GENERATIVE_AI_API_KEY");
      return new Response(
        JSON.stringify({ error: "Falta GOOGLE_GENERATIVE_AI_API_KEY en Vercel" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("🤖 [AI API] Inicializando GoogleGenerativeAI...");
    const genAI = new GoogleGenerativeAI(apiKey);

    console.log(" [AI API] Obteniendo modelo gemini-1.5-flash...");
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
    });

    const geminiMessages = [
      { role: "user" as const, parts: [{ text: SYSTEM_PROMPT }] },
      { role: "model" as const, parts: [{ text: "Entendido." }] },
      ...convertMessages(messages),
    ];

    console.log("📤 [AI API] Enviando a Gemini...");

    const result = await model.generateContentStream({
      contents: geminiMessages,
      generationConfig: {
        maxOutputTokens: 800,
        temperature: 0.7,
      },
    });

    console.log("✅ [AI API] Stream iniciado, enviando respuesta...");

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) {
              const data = JSON.stringify({ text });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          }
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
          console.log("✅ [AI API] Stream completado");
        } catch (error) {
          console.error("💥 [AI API] Error en stream:", error);
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
  } catch (error: any) {
    console.error("💥 [AI API] ERROR CRÍTICO:", error?.message);
    console.error("💥 [AI API] Stack:", error?.stack);
    return new Response(
      JSON.stringify({
        error: "Error interno del servidor",
        details: error?.message || String(error),
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}