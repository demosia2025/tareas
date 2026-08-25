// apps/web/app/workspace/[workspaceid]/users/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Users, Wifi, WifiOff, Search, ArrowLeft, MessageCircle, RefreshCw, LayoutGrid, List } from "lucide-react";
import Link from "next/link";

interface ConnectedUser {
  id: string;
  name: string;
  email: string;
  image?: string;
  role: string;
  isOnline: boolean;
  lastSeen: string;
}

export default function WorkspaceUsersPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session, status } = useSession();
  const workspaceId = params.workspaceid as string;
  
  const [users, setUsers] = useState<ConnectedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [chatWith, setChatWith] = useState<ConnectedUser | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!workspaceId || status !== "authenticated") return;

    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError("");
        
        const res = await fetch(`/api/workspace/${workspaceId}/connected-users`, {
          cache: 'no-store'
        });
        
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || `Error ${res.status}: No se pudieron cargar los usuarios`);
        }
        
        const data = await res.json();
        setUsers(data.users || []);
      } catch (err: any) {
        setError(err.message || "Error al cargar usuarios");
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
    const interval = setInterval(fetchUsers, 30000);
    return () => clearInterval(interval);
  }, [workspaceId, status, retryCount]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const onlineCount = users.filter((u) => u.isOnline).length;

  return (
    <>
      <div className="min-h-screen bg-slate-950 text-slate-100">
        {/* Header */}
        <header className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center gap-4">
                <Link href="/" className="p-2 rounded-lg hover:bg-slate-800 transition-colors">
                  <ArrowLeft className="w-5 h-5" />
                </Link>
                <div>
                  <h1 className="text-xl font-bold text-white">Usuarios del Workspace</h1>
                  <p className="text-sm text-slate-400">
                    {onlineCount} en línea • {users.length} total
                  </p>
                </div>
              </div>

              {/* Toggle de vista */}
              <div className="flex items-center gap-2 bg-slate-800/60 rounded-lg p-1">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 rounded-md transition-all ${
                    viewMode === "grid"
                      ? "bg-cyan-500/20 text-cyan-400"
                      : "text-slate-400 hover:text-white"
                  }`}
                  title="Vista de cuadrícula"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 rounded-md transition-all ${
                    viewMode === "list"
                      ? "bg-cyan-500/20 text-cyan-400"
                      : "text-slate-400 hover:text-white"
                  }`}
                  title="Vista de lista"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Contenido principal */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Barra de búsqueda */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar usuarios..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
              />
            </div>
          </div>

          {/* Lista de usuarios */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent" />
            </div>
          ) : error ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-rose-400" />
              </div>
              <p className="text-rose-400 text-lg mb-2">{error}</p>
              <p className="text-slate-500 text-sm mb-6">
                Verifica que tengas acceso a este workspace
              </p>
              <button
                onClick={handleRetry}
                className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-lg text-cyan-400 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Reintentar
              </button>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-20">
              <Users className="w-16 h-16 text-slate-700 mx-auto mb-4" />
              <p className="text-slate-400 text-lg">
                {searchQuery ? "No se encontraron usuarios" : "No hay usuarios en este workspace"}
              </p>
            </div>
          ) : viewMode === "grid" ? (
            /* VISTA DE CUADRÍCULA */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:bg-slate-800/50 hover:border-slate-700 transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="relative">
                      {user.image ? (
                        <img
                          src={user.image}
                          alt={user.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div
                        className={`absolute bottom-0 right-0 w-3.5 h-3.5 border-2 border-slate-900 rounded-full ${
                          user.isOnline ? "bg-emerald-500" : "bg-slate-600"
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white truncate">{user.name}</h3>
                      <p className="text-sm text-slate-400 truncate">{user.email}</p>
                      <p className="text-xs text-slate-500 capitalize mt-1">{user.role}</p>
                      <div className="flex items-center gap-2 mt-2">
                        {user.isOnline ? (
                          <span className="flex items-center gap-1 text-xs text-emerald-400">
                            <Wifi className="w-3.5 h-3.5" />
                            En línea
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <WifiOff className="w-3.5 h-3.5" />
                            {user.lastSeen}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setChatWith(user)}
                      className="p-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 transition-colors cursor-pointer"
                      title="Enviar mensaje"
                    >
                      <MessageCircle className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* VISTA DE LISTA */
            <div className="space-y-2">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:bg-slate-800/50 hover:border-slate-700 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      {user.image ? (
                        <img
                          src={user.image}
                          alt={user.name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold">
                          {user.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div
                        className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-slate-900 rounded-full ${
                          user.isOnline ? "bg-emerald-500" : "bg-slate-600"
                        }`}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white truncate">{user.name}</h3>
                      <p className="text-sm text-slate-400 truncate">{user.email}</p>
                    </div>
                    <div className="hidden sm:block">
                      <p className="text-xs text-slate-500 capitalize">{user.role}</p>
                    </div>
                    <div className="hidden md:block">
                      {user.isOnline ? (
                        <span className="flex items-center gap-1 text-xs text-emerald-400">
                          <Wifi className="w-3.5 h-3.5" />
                          En línea
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <WifiOff className="w-3.5 h-3.5" />
                          {user.lastSeen}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setChatWith(user)}
                      className="p-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 transition-colors cursor-pointer"
                      title="Enviar mensaje"
                    >
                      <MessageCircle className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* MODAL DE CHAT */}
      {chatWith && (
        <DirectMessageModal
          user={chatWith}
          workspaceId={workspaceId}
          onClose={() => setChatWith(null)}
        />
      )}
    </>
  );
}

// Componente del Modal de Chat
function DirectMessageModal({
  user,
  workspaceId,
  onClose,
}: {
  user: ConnectedUser;
  workspaceId: string;
  onClose: () => void;
}) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, [user.id]);

  const fetchMessages = async () => {
    try {
      const res = await fetch(
        `/api/messages?otherUserId=${user.id}&workspaceId=${workspaceId}`
      );
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          receiverId: user.id,
          content: newMessage.trim(),
          workspaceId,
        }),
      });

      if (res.ok) {
        setNewMessage("");
        await fetchMessages();
      } else {
        alert("Error al enviar mensaje");
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="relative">
              {user.image ? (
                <img src={user.image} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div
                className={`absolute bottom-0 right-0 w-2.5 h-2.5 border-2 border-slate-900 rounded-full ${
                  user.isOnline ? "bg-emerald-500" : "bg-slate-600"
                }`}
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{user.name}</p>
              <p className="text-[10px] text-slate-400">
                {user.isOnline ? "En línea" : user.lastSeen}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px]">
          {messages.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              No hay mensajes aún. ¡Inicia la conversación!
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.senderId === session?.user?.id;
              return (
                <div
                  key={msg.id}
                  className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[75%] px-3 py-2 rounded-xl text-xs ${
                      isMine
                        ? "bg-cyan-500/20 border border-cyan-500/30 text-cyan-100"
                        : "bg-slate-800 border border-slate-700 text-slate-200"
                    }`}
                  >
                    <p className="break-words">{msg.content}</p>
                    <p className="text-[9px] text-slate-500 mt-1">
                      {new Date(msg.createdAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <form onSubmit={handleSend} className="p-4 border-t border-slate-800 flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Escribe un mensaje..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50"
          />
          <button
            type="submit"
            disabled={sending || !newMessage.trim()}
            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
          >
            {sending ? "..." : "Enviar"}
          </button>
        </form>
      </div>
    </div>
  );
}

import { X } from "lucide-react";