"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Users, Wifi, WifiOff, Search, ArrowLeft, Building2, FolderKanban, CheckCircle2, X } from "lucide-react";
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
  // ✅ CORRECCIÓN: Extracción segura del parámetro
  const params = useParams<{ workspaceid: string }>();
  const workspaceId = params.workspaceid;
  const router = useRouter();
  
  const [users, setUsers] = useState<ConnectedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<ConnectedUser | null>(null);
  const [showAssignMenu, setShowAssignMenu] = useState(false);

  useEffect(() => {
    if (!workspaceId || workspaceId === "undefined") return;

    const fetchUsers = async () => {
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
  }, [workspaceId]);

  const sortedUsers = [...users].sort((a, b) => {
    if (a.isOnline && !b.isOnline) return -1;
    if (!a.isOnline && b.isOnline) return 1;
    return 0;
  });

  const filteredUsers = sortedUsers.filter(user =>
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const onlineCount = users.filter(u => u.isOnline).length;

  const handleAssign = (type: string) => {
    alert(`Funcionalidad de asignar a ${type} para el usuario ${selectedUser?.name} (Implementar lógica de backend)`);
    setShowAssignMenu(false);
    setSelectedUser(null);
  };

  if (!workspaceId || workspaceId === "undefined") {
    return <div className="h-screen flex items-center justify-center text-slate-400">Workspace no válido</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="h-14 bg-slate-900/80 backdrop-blur-xl border-b border-slate-800/80 px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-xs font-semibold text-slate-300 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /><span>Volver al Workspace</span>
          </Link>
          <div className="h-5 w-px bg-slate-800 hidden sm:block" />
          <h1 className="text-sm font-bold text-white">Miembros del Equipo</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
            <Wifi className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-bold text-emerald-400">{onlineCount} en línea</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/60 border border-slate-700/60 rounded-xl">
            <Users className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-semibold text-slate-300">{users.length} total</span>
          </div>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar por nombre o email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/60 border border-slate-800 rounded-xl pl-12 pr-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 transition-all"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-cyan-500 border-t-transparent" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/40 border border-slate-800 rounded-2xl">
            <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-sm">{searchQuery ? "No se encontraron usuarios" : "No hay miembros en este workspace"}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredUsers.map((user) => (
              <div key={user.id} className="flex items-center gap-4 p-4 bg-slate-900/60 border border-slate-800 rounded-xl hover:bg-slate-800/60 hover:border-slate-700 transition-all group">
                <div className="relative">
                  {user.image ? (
                    <img src={user.image} alt={user.name} className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 border-2 border-slate-900 rounded-full ${user.isOnline ? "bg-emerald-500" : "bg-slate-600"}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-white truncate group-hover:text-cyan-300 transition-colors">{user.name}</h3>
                  <p className="text-xs text-slate-400 truncate">{user.email}</p>
                  <p className="text-[10px] text-slate-500 capitalize mt-0.5">{user.role}</p>
                </div>

                <div className="flex items-center gap-2">
                  {user.isOnline ? (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                      <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-xs font-medium text-emerald-400 hidden sm:inline">En línea</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg">
                      <WifiOff className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-xs text-slate-500 hidden sm:inline">{user.lastSeen}</span>
                    </div>
                  )}
                  <button
                    onClick={() => { setSelectedUser(user); setShowAssignMenu(true); }}
                    className="px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-lg text-xs font-semibold text-cyan-400 transition-colors"
                  >
                    Asignar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {showAssignMenu && selectedUser && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-white">Asignar a {selectedUser.name}</h4>
              <button onClick={() => { setShowAssignMenu(false); setSelectedUser(null); }} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2">
              <button onClick={() => handleAssign("Organización")} className="w-full flex items-center gap-3 p-3 bg-slate-950/60 hover:bg-slate-800/60 border border-slate-800 rounded-xl transition-colors text-left">
                <Building2 className="w-5 h-5 text-cyan-400" />
                <div><p className="text-xs font-semibold text-white">Organización</p><p className="text-[10px] text-slate-400">Agregar como miembro</p></div>
              </button>
              <button onClick={() => handleAssign("Workspace")} className="w-full flex items-center gap-3 p-3 bg-slate-950/60 hover:bg-slate-800/60 border border-slate-800 rounded-xl transition-colors text-left">
                <FolderKanban className="w-5 h-5 text-purple-400" />
                <div><p className="text-xs font-semibold text-white">Workspace</p><p className="text-[10px] text-slate-400">Agregar a un workspace</p></div>
              </button>
              <button onClick={() => handleAssign("Tarea")} className="w-full flex items-center gap-3 p-3 bg-slate-950/60 hover:bg-slate-800/60 border border-slate-800 rounded-xl transition-colors text-left">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <div><p className="text-xs font-semibold text-white">Tarea</p><p className="text-[10px] text-slate-400">Asignar a una tarea</p></div>
              </button>
              <button onClick={() => { setShowAssignMenu(false); setSelectedUser(null); }} className="w-full mt-3 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}