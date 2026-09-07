"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
  Users, Search, FolderKanban, CheckCircle, Clock, AlertCircle,
  RefreshCw
} from "lucide-react";
import { useDashboard } from "@/hooks/useDashboard";
import { useRouter } from "next/navigation";

interface AssignedUser {
  id: string;
  name: string;
  email: string;
  image?: string;
  taskCount: number;
  tasks: any[];
}

export default function AssignedView() {
  const { data: session } = useSession();
  const dashboard = useDashboard();
  const router = useRouter();
  
  const [users, setUsers] = useState<AssignedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!dashboard.workspaceId) return;
    
    const fetchAssigned = async () => {
      try {
        setLoading(true);
        setError("");
        
        // Obtener todos los miembros del workspace
        const membersRes = await fetch(`/api/workspace/${dashboard.workspaceId}/members`);
        if (!membersRes.ok) throw new Error("No se pudieron cargar los miembros");
        
        const membersData = await membersRes.json();
        const members = membersData.members || [];

        // Para cada miembro, obtener sus tareas asignadas
        const usersWithTasks = await Promise.all(
          members.map(async (member: any) => {
            const tasksRes = await fetch(
              `/api/tasks?workspaceId=${dashboard.workspaceId}&assigneeId=${member.userId}`
            );
            const tasks = tasksRes.ok ? await tasksRes.json() : [];
            
            return {
              id: member.userId,
              name: member.user?.name || "Sin nombre",
              email: member.user?.email || "",
              image: member.user?.image,
              taskCount: Array.isArray(tasks) ? tasks.length : 0,
              tasks: Array.isArray(tasks) ? tasks : []
            };
          })
        );

        setUsers(usersWithTasks);
      } catch (err: any) {
        setError(err.message || "Error al cargar asignaciones");
      } finally {
        setLoading(false);
      }
    };

    fetchAssigned();
  }, [dashboard.workspaceId, retryCount]);

  const handleRetry = () => setRetryCount(prev => prev + 1);

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalTasks = users.reduce((sum, u) => sum + u.taskCount, 0);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "done": return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case "in_progress": return <Clock className="w-4 h-4 text-blue-400" />;
      default: return <AlertCircle className="w-4 h-4 text-slate-400" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "done": return "Completada";
      case "in_progress": return "En Progreso";
      default: return "Por Hacer";
    }
  };

  const getPriorityLabel = (priority: number) => {
    if (priority >= 4) return "🔥 Urgente";
    if (priority === 3) return " Alta";
    if (priority === 2) return "🟡 Media";
    return " Baja";
  };

  const handleGoToTask = (taskId: string) => {
    router.push(`/?openTask=${taskId}`);
  };

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Asignaciones de Tareas</h1>
            <p className="text-sm text-slate-400 mt-1">
              {users.length} usuarios • {totalTasks} tareas asignadas
            </p>
          </div>
        </div>

        {/* Buscador */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              placeholder="Buscar usuario..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
            />
          </div>
        </div>

        {/* Contenido */}
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
            <button
              onClick={handleRetry}
              className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-lg text-cyan-400 transition-colors"
            >
              <RefreshCw className="w-4 h-4" /> Reintentar
            </button>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-20">
            <Users className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-400 text-lg">
              {searchQuery ? "No se encontraron usuarios" : "No hay usuarios en este workspace"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:bg-slate-800/50 transition-all"
              >
                {/* Header del usuario */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {user.image ? (
                      <img
                        src={user.image}
                        alt={user.name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-semibold">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-white">{user.name}</h3>
                      <p className="text-xs text-slate-400">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-lg">
                    <FolderKanban className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm font-bold text-white">{user.taskCount}</span>
                  </div>
                </div>

                {/* Lista de tareas */}
                {user.tasks.length > 0 ? (
                  <div className="space-y-2">
                    {user.tasks.map((task: any) => (
                      <div
                        key={task.id}
                        className="flex items-start justify-between p-3 bg-slate-950/50 border border-slate-800 rounded-lg hover:border-slate-700 transition-all group"
                      >
                        <div className="flex-1 min-w-0 pr-4">
                          <div className="flex items-center gap-2 mb-1">
                            {getStatusIcon(task.status)}
                            <h4 className="text-sm font-semibold text-white truncate">
                              {task.title}
                            </h4>
                          </div>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full border ${
                                task.status === "done"
                                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                                  : "bg-slate-800 text-slate-400 border-slate-700"
                              }`}
                            >
                              {getStatusLabel(task.status)}
                            </span>
                            <span className="text-[10px] text-slate-500">
                              {getPriorityLabel(task.priority)}
                            </span>
                            {task.list?.name && (
                              <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                📁 {task.list.name}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => handleGoToTask(task.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold transition-all opacity-0 group-hover:opacity-100"
                          title="Ir a la tarea"
                        >
                          Ver tarea
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-slate-500 text-sm">
                    Sin tareas asignadas
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}