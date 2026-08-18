"use client";
import { useState, useEffect } from "react";
import { Users, Wifi, WifiOff, X, Search } from "lucide-react";

interface ConnectedUsersPanelProps {
  workspaceId: string;
}

interface ConnectedUser {
  id: string;
  name: string;
  email: string;
  image?: string;
  role: string;
  isOnline: boolean;
  lastSeen: string;
}

export default function ConnectedUsersPanel({ workspaceId }: ConnectedUsersPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [users, setUsers] = useState<ConnectedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (!isOpen || !workspaceId) return;

    const fetchUsers = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/workspace/${workspaceId}/connected-users`);
        if (res.ok) {
          const data = await res.json();
          setUsers(data.users || []);
        }
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
    const interval = setInterval(fetchUsers, 30000);
    return () => clearInterval(interval);
  }, [isOpen, workspaceId]);

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const onlineCount = users.filter(u => u.isOnline).length;

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-xl text-xs font-semibold text-slate-200 transition-colors shadow-sm relative"
      >
        <Users className="w-3.5 h-3.5 text-cyan-400" />
        <span className="hidden sm:inline">Usuarios</span>
        {onlineCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
            {onlineCount}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">Usuarios del Workspace</h3>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-800 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por nombre o email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-400 border-t-transparent" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              {searchQuery ? "No se encontraron usuarios" : "No hay usuarios en este workspace"}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-3 bg-slate-950/50 border border-slate-800 rounded-xl hover:bg-slate-800/50 transition-colors"
                >
                  <div className="relative">
                    {user.image ? (
                      <img
                        src={user.image}
                        alt={user.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
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
                    <p className="text-sm font-semibold text-white truncate">
                      {user.name}
                    </p>
                    <p className="text-xs text-slate-400 truncate">{user.email}</p>
                    <p className="text-[10px] text-slate-500 capitalize">{user.role}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {user.isOnline ? (
                      <>
                        <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-[10px] font-medium text-emerald-400">Online</span>
                      </>
                    ) : (
                      <>
                        <WifiOff className="w-3.5 h-3.5 text-slate-500" />
                        <span className="text-[10px] text-slate-500">{user.lastSeen}</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/30 flex-shrink-0">
          <p className="text-[10px] text-slate-500 text-center">
            {onlineCount} usuario{onlineCount !== 1 ? "s" : ""} en línea • {users.length} total
          </p>
        </div>
      </div>
    </div>
  );
}