"use client";
import { useState } from "react";
import { Users, Wifi, WifiOff } from "lucide-react";

interface ConnectedUser {
  id: string;
  name: string;
  email: string;
  isOnline: boolean;
  lastSeen?: Date;
  avatar?: string;
}

export default function ConnectedUsers() {
  const [isOpen, setIsOpen] = useState(false);
  
  // Datos de ejemplo (deberían venir de un endpoint o WebSocket)
  const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([
    { id: "1", name: "Juan Pérez", email: "juan@saas.com", isOnline: true },
    { id: "2", name: "María García", email: "maria@saas.com", isOnline: true },
    { id: "3", name: "Carlos López", email: "carlos@saas.com", isOnline: false, lastSeen: new Date(Date.now() - 3600000) },
  ]);

  const onlineCount = connectedUsers.filter(u => u.isOnline).length;

  const formatLastSeen = (date?: Date) => {
    if (!date) return "";
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
    if (minutes < 60) return `hace ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `hace ${hours} h`;
    return `hace ${Math.floor(hours / 24)} d`;
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-slate-900/60 hover:bg-slate-800/80 border border-slate-700/60 rounded-xl transition-all"
      >
        <div className="relative">
          <Users className="w-4 h-4 text-slate-300" />
          {onlineCount > 0 && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
          )}
        </div>
        <span className="text-xs font-semibold text-slate-300 hidden sm:inline">
          {onlineCount} {onlineCount === 1 ? "conectado" : "conectados"}
        </span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full right-0 mt-2 w-72 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            
            {/* Header */}
            <div className="p-4 border-b border-slate-800 bg-slate-900/50">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Usuarios Conectados</h3>
                <span className="text-xs text-emerald-400 font-semibold">{onlineCount} online</span>
              </div>
            </div>

            {/* Lista */}
            <div className="max-h-80 overflow-y-auto p-2 space-y-1">
              {connectedUsers.map((user) => (
                <div 
                  key={user.id}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-800/60 transition-all"
                >
                  <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    {user.isOnline ? (
                      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-slate-900 rounded-full" />
                    ) : (
                      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-slate-600 border-2 border-slate-900 rounded-full" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{user.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {user.isOnline ? (
                      <span className="text-emerald-400">Online</span>
                    ) : (
                      formatLastSeen(user.lastSeen)
                    )}
                  </div>
                </div>
              ))}
              
              {connectedUsers.length === 0 && (
                <div className="text-center py-8 text-slate-500 text-xs">
                  No hay usuarios conectados
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
