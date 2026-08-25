"use client";

import { useState, useEffect } from "react";

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen?: string;
}

export function WorkspaceChatPanel({ workspaceId }: { workspaceId: string }) {
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);

  // 1. Cargar la lista de usuarios de la API que creamos
  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch(`/api/workspace/${workspaceId}/connected-users`);
        const data = await res.json();
        if (data.users) {
          setUsers(data.users);
        }
      } catch (error) {
        console.error("Error al cargar usuarios:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchUsers();
    // Opcional: Actualizar la lista cada 30 segundos para refrescar estados en línea
    const interval = setInterval(fetchUsers, 30000);
    return () => clearInterval(interval);
  }, [workspaceId]);

  // Función para enviar mensaje (funciona igual para conectados o desconectados)
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !newMessage.trim()) return;

    try {
      const res = await fetch(`/api/workspace/${workspaceId}/connected-users`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId: selectedUser.id,
          content: newMessage,
        }),
      });

      if (res.ok) {
        const sentMsg = await res.json();
        setMessages((prev) => [...prev, sentMsg]);
        setNewMessage("");
      }
    } catch (error) {
      console.error("Error al enviar mensaje:", error);
    }
  };

  if (loading) return <div className="p-4 text-slate-400 text-xs">Cargando equipo...</div>;

  return (
    <div className="flex h-[500px] border border-slate-800 rounded-xl bg-slate-950 text-white overflow-hidden shadow-xl">
      {/* Lista de usuarios (Conectados primero) */}
      <div className="w-1/3 border-r border-slate-800 flex flex-col">
        <div className="p-3 border-b border-slate-800 font-semibold text-xs text-slate-300">
          Miembros del Espacio
        </div>
        <div className="overflow-y-auto flex-1 divide-y divide-slate-900">
          {users.map((user) => (
            <div
              key={user.id}
              onClick={() => setSelectedUser(user)}
              className={`flex items-center gap-3 p-3 cursor-pointer transition hover:bg-slate-900 ${
                selectedUser?.id === user.id ? "bg-slate-900/80" : ""
              }`}
            >
              <div className="relative">
                <img
                  src={user.avatar || "https://avatar.vercel.sh/" + user.email}
                  alt={user.name}
                  className="w-8 h-8 rounded-full object-cover"
                />
                {/* Indicador de punto verde/gris */}
                <span
                  className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-slate-950 ${
                    user.isOnline ? "bg-emerald-500" : "bg-slate-600"
                  }`}
                />
              </div>
              <div className="overflow-hidden flex-1">
                <p className="text-xs font-medium truncate">{user.name}</p>
                <p className="text-[10px] text-slate-400 truncate">
                  {user.isOnline ? "En línea" : "Desconectado (dejar recado)"}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Ventana de chat / Dejar mensaje */}
      <div className="w-2/3 flex flex-col bg-slate-900/40">
        {selectedUser ? (
          <>
            <div className="p-3 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold">{selectedUser.name}</h4>
                <p className="text-[10px] text-slate-400">
                  {selectedUser.isOnline ? "🟢 Conectado ahora" : "⚪ Desconectado — El usuario verá tu mensaje al volver"}
                </p>
              </div>
            </div>

            {/* Contenedor de mensajes */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {messages.length === 0 ? (
                <p className="text-center text-xs text-slate-500 my-auto">
                  No hay mensajes previos. Escribe algo para iniciar la conversación o dejar un recado.
                </p>
              ) : (
                messages.map((msg, i) => (
                  <div key={i} className="text-xs bg-slate-800 p-2.5 rounded-lg max-w-[80%]">
                    {msg.content}
                  </div>
                ))
              )}
            </div>

            {/* Input de envío */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-800 flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={selectedUser.isOnline ? "Escribe un mensaje..." : "Deja un mensaje para cuando se conecte..."}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-1.5 rounded-lg text-xs font-medium transition"
              >
                Enviar
              </button>
            </form>
          </>
        ) : (
          <div className="m-auto text-center text-slate-500 text-xs">
            Selecciona un miembro de la izquierda para ver su estado o enviarle un mensaje.
          </div>
        )}
      </div>
    </div>
  );
}