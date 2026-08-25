"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { 
  Users, Wifi, WifiOff, Search, ArrowLeft, MessageCircle, 
  RefreshCw, LayoutGrid, List, X, Send, Bell, CheckCheck,
  Sparkles
} from "lucide-react";
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

interface Message {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  createdAt: string;
  sender?: {
    id: string;
    name: string;
    image?: string;
  };
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
  const [unreadMessages, setUnreadMessages] = useState<Set<string>>(new Set());

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

  const handleOpenChat = (user: ConnectedUser) => {
    setChatWith(user);
    // Limpiar badge de no leídos al abrir el chat
    setUnreadMessages(prev => {
      const next = new Set(prev);
      next.delete(user.id);
      return next;
    });
  };

  const handleNewMessage = (senderId: string) => {
    // Si el chat está abierto con este usuario, no marcar como no leído
    if (chatWith?.id === senderId) return;
    setUnreadMessages(prev => new Set(prev).add(senderId));
  };

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
                      onClick={() => handleOpenChat(user)}
                      className="relative p-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 transition-colors cursor-pointer"
                      title="Enviar mensaje"
                    >
                      <MessageCircle className="w-5 h-5" />
                      {/* Badge de mensaje no leído */}
                      {unreadMessages.has(user.id) && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full flex items-center justify-center animate-pulse">
                          <Bell className="w-2.5 h-2.5 text-white" />
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
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
                      onClick={() => handleOpenChat(user)}
                      className="relative p-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 transition-colors cursor-pointer"
                      title="Enviar mensaje"
                    >
                      <MessageCircle className="w-5 h-5" />
                      {unreadMessages.has(user.id) && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full flex items-center justify-center animate-pulse">
                          <Bell className="w-2.5 h-2.5 text-white" />
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {chatWith && (
        <DirectMessageModal
          user={chatWith}
          workspaceId={workspaceId}
          onClose={() => setChatWith(null)}
          onNewMessage={handleNewMessage}
        />
      )}
    </>
  );
}

// ✅ MODAL DE CHAT REFINADO - Más delgado, profesional y elegante
function DirectMessageModal({
  user,
  workspaceId,
  onClose,
  onNewMessage,
}: {
  user: ConnectedUser;
  workspaceId: string;
  onClose: () => void;
  onNewMessage: (senderId: string) => void;
}) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [previousCount, setPreviousCount] = useState(0);
  const [showNewAlert, setShowNewAlert] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll al final cuando llegan nuevos mensajes
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!user) return;

    const fetchMessages = async () => {
      try {
        const res = await fetch(
          `/api/messages?otherUserId=${user.id}&workspaceId=${workspaceId}`
        );
        if (res.ok) {
          const data = await res.json();
          const newMessages: Message[] = data.messages || [];
          
          // Detectar si hay mensajes nuevos
          if (newMessages.length > previousCount && previousCount > 0) {
            const lastMessage = newMessages[newMessages.length - 1];
            if (lastMessage.senderId !== session?.user?.id) {
              setShowNewAlert(true);
              onNewMessage(lastMessage.senderId);
              setTimeout(() => setShowNewAlert(false), 3000);
            }
          }
          
          setMessages(newMessages);
          setPreviousCount(newMessages.length);
        }
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    };

    fetchMessages();
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [user.id, workspaceId, session?.user?.id]);

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
        // Refrescar inmediatamente
        const res2 = await fetch(
          `/api/messages?otherUserId=${user.id}&workspaceId=${workspaceId}`
        );
        if (res2.ok) {
          const data = await res2.json();
          setMessages(data.messages || []);
          setPreviousCount((data.messages || []).length);
        }
      } else {
        alert("Error al enviar mensaje");
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Hoy";
    if (date.toDateString() === yesterday.toDateString()) return "Ayer";
    return date.toLocaleDateString([], { day: "numeric", month: "short" });
  };

  // Agrupar mensajes por fecha
  const groupedMessages: { date: string; messages: Message[] }[] = [];
  messages.forEach((msg) => {
    const dateLabel = formatDate(msg.createdAt);
    const lastGroup = groupedMessages[groupedMessages.length - 1];
    if (lastGroup && lastGroup.date === dateLabel) {
      lastGroup.messages.push(msg);
    } else {
      groupedMessages.push({ date: dateLabel, messages: [msg] });
    }
  });

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      {/* ✅ MODAL MÁS DELGADO Y ELEGANTE */}
      <div className="bg-slate-900/95 border border-slate-700/50 rounded-2xl w-full max-w-sm shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        
        {/* Header refinado */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/60 bg-gradient-to-r from-slate-900 to-slate-800/50">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="relative flex-shrink-0">
              {user.image ? (
                <img 
                  src={user.image} 
                  alt={user.name} 
                  className="w-9 h-9 rounded-full object-cover ring-2 ring-slate-700/50" 
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-semibold text-sm ring-2 ring-slate-700/50">
                  {user.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div
                className={`absolute bottom-0 right-0 w-2.5 h-2.5 border-2 border-slate-900 rounded-full ${
                  user.isOnline ? "bg-emerald-500" : "bg-slate-600"
                }`}
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{user.name}</p>
              <p className="text-[10px] text-slate-400 flex items-center gap-1">
                {user.isOnline ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    En línea
                  </>
                ) : (
                  <>
                    <WifiOff className="w-2.5 h-2.5" />
                    {user.lastSeen}
                  </>
                )}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Alerta de mensaje nuevo */}
        {showNewAlert && (
          <div className="px-4 py-2 bg-cyan-500/10 border-b border-cyan-500/20 flex items-center gap-2 animate-in slide-in-from-top">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-[11px] text-cyan-300 font-medium">Nuevo mensaje recibido</span>
          </div>
        )}

        {/* Área de mensajes */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-slate-950/30">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-14 h-14 rounded-full bg-slate-800/50 flex items-center justify-center mb-3">
                <MessageCircle className="w-6 h-6 text-slate-500" />
              </div>
              <p className="text-sm text-slate-400 font-medium">Inicia la conversación</p>
              <p className="text-[11px] text-slate-500 mt-1">Envía el primer mensaje a {user.name}</p>
            </div>
          ) : (
            groupedMessages.map((group, groupIdx) => (
              <div key={groupIdx} className="space-y-2">
                {/* Separador de fecha */}
                <div className="flex items-center gap-2 py-2">
                  <div className="flex-1 h-px bg-slate-800/60" />
                  <span className="text-[10px] text-slate-500 font-medium px-2">{group.date}</span>
                  <div className="flex-1 h-px bg-slate-800/60" />
                </div>
                
                {group.messages.map((msg) => {
                  const isMine = msg.senderId === session?.user?.id;
                  const senderName = isMine 
                    ? "Tú" 
                    : (msg.sender?.name || user.name);
                  const senderImage = isMine 
                    ? session?.user?.image 
                    : (msg.sender?.image || user.image);

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMine ? "justify-end" : "justify-start"} gap-2`}
                    >
                      {/* Avatar del remitente (solo para mensajes recibidos) */}
                      {!isMine && (
                        <div className="flex-shrink-0 self-end">
                          {senderImage ? (
                            <img 
                              src={senderImage} 
                              alt={senderName}
                              className="w-6 h-6 rounded-full object-cover" 
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white text-[10px] font-semibold">
                              {senderName.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className={`max-w-[75%] ${isMine ? "items-end" : "items-start"} flex flex-col`}>
                        {/* Nombre del remitente */}
                        {!isMine && (
                          <span className="text-[10px] text-slate-400 font-medium mb-0.5 ml-1">
                            {senderName}
                          </span>
                        )}
                        
                        {/* Burbuja de mensaje */}
                        <div
                          className={`px-3 py-2 rounded-2xl text-xs shadow-sm ${
                            isMine
                              ? "bg-gradient-to-br from-cyan-500 to-blue-600 text-white rounded-br-md"
                              : "bg-slate-800/80 border border-slate-700/50 text-slate-100 rounded-bl-md"
                          }`}
                        >
                          <p className="break-words leading-relaxed">{msg.content}</p>
                        </div>
                        
                        {/* Hora */}
                        <div className={`flex items-center gap-1 mt-1 ${isMine ? "mr-1" : "ml-1"}`}>
                          <span className="text-[9px] text-slate-500">
                            {formatTime(msg.createdAt)}
                          </span>
                          {isMine && (
                            <CheckCheck className="w-3 h-3 text-cyan-400/70" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input de mensaje */}
        <form onSubmit={handleSend} className="px-4 py-3 border-t border-slate-800/60 bg-slate-900/50">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Escribe un mensaje..."
              className="flex-1 bg-slate-950/60 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all"
              autoFocus
            />
            <button
              type="submit"
              disabled={sending || !newMessage.trim()}
              className="p-2.5 bg-gradient-to-br from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/20 flex-shrink-0"
            >
              {sending ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}