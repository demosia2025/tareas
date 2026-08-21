"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "ai/react";
import { useSession } from "next-auth/react"; // ✅ 1. Importar useSession
import { MessageSquare, X, Send, Bot, User, Loader2 } from "lucide-react";

export default function AIAssistant() {
  const { data: session } = useSession(); // ✅ 2. Obtener la sesión del usuario
  
  // ✅ 3. Extraer el primer nombre (ej: "Rafael" de "Rafael Pérez") o usar "amigo" por defecto
  const userName = session?.user?.name?.split(" ")[0] || "amigo";

  const [isOpen, setIsOpen] = useState(false);
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/ai-assistant",
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <>
      {/* Botón flotante */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30 hover:scale-110 transition-transform flex items-center justify-center"
        title="Asistente IA"
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
      </button>

      {/* Panel del chat */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-96 h-[500px] bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 fade-in">
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Bot className="w-5 h-5 text-white" />
              <div>
                <h3 className="text-sm font-bold text-white">Asistente IA</h3>
                <p className="text-[10px] text-cyan-100">Pregúntame sobre el sistema</p>
              </div>
            </div>
          </div>

          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-8">
                <Bot className="w-10 h-10 text-cyan-400 mx-auto mb-3" />
                
                {/* ✅ 4. Saludo personalizado con el nombre */}
                <p className="text-xs text-slate-400">
                  ¡Hola, <span className="text-cyan-300 font-semibold">{userName}</span>! Soy tu asistente inteligente.
                </p>
                
                <p className="text-xs text-slate-400 mt-1">Pregúntame sobre:</p>
                <ul className="text-[10px] text-slate-500 mt-2 space-y-1 text-left max-w-[250px] mx-auto">
                  <li>• "¿Cuántas tareas tengo pendientes?"</li>
                  <li>• "¿Quién está asignado a la tarea X?"</li>
                  <li>• "Muéstrame mis workspaces"</li>
                  <li>• "¿Cuál es el progreso de mi workspace?"</li>
                  <li>• "¿Cómo creo un nuevo espacio?"</li>
                </ul>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-2 ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.role === "assistant" && (
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] px-3 py-2 rounded-xl text-xs whitespace-pre-wrap ${
                    message.role === "user"
                      ? "bg-cyan-600 text-white rounded-br-none"
                      : "bg-slate-800 text-slate-200 rounded-bl-none"
                  }`}
                >
                  {message.content}
                </div>
                {message.role === "user" && (
                  <div className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="bg-slate-800 px-3 py-2 rounded-xl rounded-bl-none">
                  <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleSubmit} className="p-3 border-t border-slate-800 bg-slate-900/80">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={handleInputChange}
                placeholder="Escribe tu pregunta..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="w-9 h-9 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center text-white disabled:opacity-50 hover:scale-105 transition-transform"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}