// apps/web/app/workspace/[workspaceid]/users/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Users, Wifi, WifiOff, Search, ArrowLeft, MessageCircle,
  RefreshCw, LayoutGrid, List, X, Send, Bell, CheckCheck, Sparkles
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
  sender?: { id: string; name: string; image?: string };
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
    const loadUsers = async () => {
      try {
        setLoading(true);
        setError("");
        const res = await fetch(`/api/workspace/${workspaceId}/connected-users`, { cache: 'no-store' });
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({}));
          throw new Error(errorData.error || `Error ${res.status}`);
        }
        const data = await res.json();
        setUsers(data.users || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadUsers();
    const interval = setInterval(loadUsers, 30000);
    return () => clearInterval(interval);
  }, [workspaceId, status, retryCount]);

  // ✅ Filtrar usuario actual y aplicar búsqueda
  const filteredUsers = users.filter(
    (user) => user.id !== session?.user?.id &&
      (user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
       user.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const onlineCount = users.filter((u) => u.isOnline).length;

  const handleOpenChat = (user: ConnectedUser) => {
    setChatWith(user);
    setUnreadMessages(prev => {
      const next = new Set(prev);
      next.delete(user.id);
      return next;
    });
  };

  const handleNewMessage = (senderId: string) => {
    if (chatWith?.id === senderId) return;
    setUnreadMessages(prev => new Set(prev).add(senderId));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors">
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div>
                <h1 className="text-lg font-bold text-white">Usuarios</h1>
                <p className="text-xs text-slate-400">{onlineCount} en línea • {users.length} total</p>
              </div>
            </div>
            <div className="flex gap-1 bg-slate-800/60 rounded-lg p-0.5">
              <button onClick={() => setViewMode("grid")} className={`p-1.5 rounded-md transition-all ${viewMode === "grid" ? "bg-cyan-500/20 text-cyan-400" : "text-slate-400 hover:text-white"}`}>
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button onClick={() => setViewMode("list")} className={`p-1.5 rounded-md transition-all ${viewMode === "list" ? "bg-cyan-500/20 text-cyan-400" : "text-slate-400 hover:text-white"}`}>
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-5">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-500 border-t-transparent" /></div>
        ) : error ? (
          <div className="text-center py-20 text-rose-400">
            <p>{error}</p>
            <button onClick={() => setRetryCount(p => p + 1)} className="mt-3 text-xs underline">Reintentar</button>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-20 text-slate-500 text-sm">No hay usuarios</div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredUsers.map((user) => (
              <div key={user.id} className="bg-slate-900/50 border border-slate-800 rounded-lg p-3 hover:bg-slate-800/50 transition-all">
                <div className="flex items-start gap-2.5">
                  <div className="relative">
                    {user.image ? <img src={user.image} alt={user.name} className="w-9 h-9 rounded-full object-cover" /> : (
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-semibold text-xs">{user.name.charAt(0)}</div>
                    )}
                    <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 border-2 border-slate-900 rounded-full ${user.isOnline ? "bg-emerald-500" : "bg-slate-600"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white text-sm truncate">{user.name}</h3>
                    <p className="text-xs text-slate-400 truncate">{user.email}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{user.isOnline ? <span className="text-emerald-400">En línea</span> : user.lastSeen}</p>
                  </div>
                  <button onClick={() => handleOpenChat(user)} className="relative p-1.5 hover:bg-cyan-500/10 rounded-lg text-cyan-400 transition-colors">
                    <MessageCircle className="w-4 h-4" />
                    {unreadMessages.has(user.id) && <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-rose-500 rounded-full flex items-center justify-center"><Bell className="w-2 h-2 text-white" /></span>}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredUsers.map((user) => (
              <div key={user.id} className="bg-slate-900/50 border border-slate-800 rounded-lg p-3 hover:bg-slate-800/50 transition-all">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    {user.image ? <img src={user.image} alt={user.name} className="w-8 h-8 rounded-full object-cover" /> : (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-semibold text-xs">{user.name.charAt(0)}</div>
                    )}
                    <div className={`absolute bottom-0 right-0 w-2 h-2 border-2 border-slate-900 rounded-full ${user.isOnline ? "bg-emerald-500" : "bg-slate-600"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white text-sm truncate">{user.name}</h3>
                    <p className="text-xs text-slate-400 truncate">{user.email}</p>
                  </div>
                  <div className="hidden sm:block text-xs text-slate-500">{user.role}</div>
                  <div className="hidden md:block text-xs">{user.isOnline ? <span className="text-emerald-400">En línea</span> : <span className="text-slate-500">{user.lastSeen}</span>}</div>
                  <button onClick={() => handleOpenChat(user)} className="relative p-1.5 hover:bg-cyan-500/10 rounded-lg text-cyan-400 transition-colors">
                    <MessageCircle className="w-4 h-4" />
                    {unreadMessages.has(user.id) && <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-rose-500 rounded-full flex items-center justify-center"><Bell className="w-2 h-2 text-white" /></span>}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {chatWith && <ChatModal user={chatWith} workspaceId={workspaceId} onClose={() => setChatWith(null)} onNewMessage={handleNewMessage} />}
    </div>
  );
}

// ✅ MODAL ULTRA-COMPACTO CON ALERTA DE MENSAJES NUEVOS
function ChatModal({ user, workspaceId, onClose, onNewMessage }: { user: ConnectedUser; workspaceId: string; onClose: () => void; onNewMessage: (id: string) => void }) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [showNewAlert, setShowNewAlert] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMsgId = useRef<string | null>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // ✅ FUNCIÓN RENOMBRADA: fetchMessages (en lugar de fetch) para evitar conflicto con fetch global
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/messages?otherUserId=${user.id}&workspaceId=${workspaceId}`);
        if (res.ok) {
          const data = await res.json();
          const msgs: Message[] = data.messages || [];
          if (msgs.length > 0) {
            const last = msgs[msgs.length - 1];
            // ✅ DETECCIÓN DE MENSAJE NUEVO
            if (last.id !== lastMsgId.current && last.senderId !== session?.user?.id) {
              lastMsgId.current = last.id;
              setShowNewAlert(true);
              onNewMessage(last.senderId);
              setTimeout(() => setShowNewAlert(false), 3000);
            } else if (last.id !== lastMsgId.current) {
              lastMsgId.current = last.id;
            }
          }
          setMessages(msgs);
        }
      } catch (e) { console.error(e); }
    };
    fetchMessages();
    const int = setInterval(fetchMessages, 3000);
    return () => clearInterval(int);
  }, [user.id, workspaceId, session?.user?.id]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiverId: user.id, content: newMessage.trim(), workspaceId }),
      });
      if (res.ok) {
        setNewMessage("");
        const res2 = await fetch(`/api/messages?otherUserId=${user.id}&workspaceId=${workspaceId}`);
        if (res2.ok) {
          const data = await res2.json();
          setMessages(data.messages || []);
          if (data.messages?.length > 0) lastMsgId.current = data.messages[data.messages.length - 1].id;
        }
      }
    } catch (e) { console.error(e); }
    finally { setSending(false); }
  };

  const time = (d: string) => new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black/60 backdrop-blur-sm p-3">
      {/* ✅ ULTRA-COMPACTO: 240px máximo */}
      <div className="bg-slate-900 border border-slate-700/50 rounded-xl w-full max-w-[240px] shadow-2xl flex flex-col max-h-[75vh] overflow-hidden">

        {/* Header minimalista */}
        <div className="flex items-center justify-between px-2.5 py-2 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="relative">
              {user.image ? <img src={user.image} alt="" className="w-6 h-6 rounded-full object-cover" /> : (
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-semibold text-[10px]">{user.name.charAt(0)}</div>
              )}
              <div className={`absolute bottom-0 right-0 w-1.5 h-1.5 border border-slate-900 rounded-full ${user.isOnline ? "bg-emerald-500" : "bg-slate-600"}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user.name}</p>
              <p className="text-[9px] text-slate-400 truncate">{user.isOnline ? "En línea" : user.lastSeen}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-0.5 text-slate-400 hover:text-white transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* ✅ ALERTA DE MENSAJE NUEVO */}
        {showNewAlert && (
          <div className="px-2.5 py-1 bg-cyan-500/10 border-b border-cyan-500/20 flex items-center justify-center gap-1 animate-in slide-in-from-top">
            <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
            <span className="text-[9px] text-cyan-300 font-medium">Nuevo mensaje</span>
          </div>
        )}

        {/* Mensajes ultra-compactos */}
        <div className="flex-1 overflow-y-auto px-2.5 py-2 space-y-1.5 bg-slate-950/20">
          {messages.length === 0 ? (
            <div className="text-center py-6 text-slate-500 text-[10px]">Sin mensajes</div>
          ) : (
            messages.map((msg) => {
              const mine = msg.senderId === session?.user?.id;
              return (
                <div key={msg.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] px-2 py-1 rounded-lg text-[10px] ${mine ? "bg-cyan-500/20 text-cyan-100 rounded-br-sm" : "bg-slate-800 text-slate-200 rounded-bl-sm"}`}>
                    <p className="leading-tight">{msg.content}</p>
                    <p className="text-[8px] text-slate-500 mt-0.5">{time(msg.createdAt)}</p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input minimalista */}
        <form onSubmit={send} className="px-2.5 py-2 border-t border-slate-800 bg-slate-900/50">
          <div className="flex gap-1">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="..."
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-[10px] text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50"
              autoFocus
            />
            <button type="submit" disabled={sending || !newMessage.trim()} className="p-1.5 bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg transition-colors disabled:opacity-40">
              {sending ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="w-3 h-3" />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}