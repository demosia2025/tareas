// apps/web/app/workspace/[workspaceId]/assigned-users/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Users, Clock, ArrowLeft, Search, CheckSquare, ChevronRight, UserCircle } from "lucide-react";
import Link from "next/link";
import AssignedTasksModal from "@/components/AssignedTasksModal";

interface WorkspaceUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: string;
}

interface AssignedTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  assignedAt: string;
  timeAgo: string;
  diffDays: number;
  diffHours: number;
}

interface UserWithTasks extends WorkspaceUser {
  tasks: AssignedTask[];
  taskCount: number;
}

export default function AssignedUsersPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const workspaceId = params.workspaceid as string;

  const [users, setUsers] = useState<UserWithTasks[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedUserForModal, setSelectedUserForModal] = useState<WorkspaceUser | null>(null);

  useEffect(() => {
    if (workspaceId) {
      fetchUsersWithTasks();
    }
  }, [workspaceId]);

  const fetchUsersWithTasks = async () => {
    try {
      setLoading(true);
      
      // 1. Obtener miembros del workspace
      const membersRes = await fetch(`/api/workspace/${workspaceId}/members`);
      if (!membersRes.ok) {
        throw new Error("Error al cargar miembros del workspace");
      }
      const members = await membersRes.json();
      const membersArray = Array.isArray(members) ? members : members.members || [];

      // 2. Obtener TODAS las tareas del workspace (CON workspaceId)
      const tasksRes = await fetch(`/api/tasks?workspaceId=${workspaceId}`);
      let allTasks: any[] = [];
      
      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();
        allTasks = Array.isArray(tasksData) ? tasksData : [];
      } else {
        console.warn("No se pudieron cargar las tareas del workspace");
      }

      // 3. Para cada miembro, filtrar sus tareas asignadas
      const usersWithTasks = membersArray.map((member: any) => {
        const user = member.user || member;
        const userId = user.id;

        // Filtrar tareas donde este usuario es assignee
        const userTasks = allTasks.filter((task: any) => task.assigneeId === userId);

        const now = new Date();
        const tasksWithTime = userTasks.map((task: any) => {
          const assignedAt = new Date(task.updatedAt || task.createdAt);
          const diffMs = now.getTime() - assignedAt.getTime();
          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

          let timeAgo = "";
          if (diffHours < 1) {
            timeAgo = "Hace minutos";
          } else if (diffHours < 24) {
            timeAgo = `Hace ${diffHours} hora${diffHours > 1 ? "s" : ""}`;
          } else if (diffDays < 7) {
            timeAgo = `Hace ${diffDays} día${diffDays > 1 ? "s" : ""}`;
          } else {
            timeAgo = assignedAt.toLocaleDateString("es-ES");
          }

          return {
            id: task.id,
            title: task.title,
            status: task.status,
            priority: task.priority,
            assignedAt: task.updatedAt || task.createdAt,
            timeAgo,
            diffDays,
            diffHours,
          };
        });

        return {
          id: userId,
          name: user.name,
          email: user.email,
          image: user.image,
          role: member.role || "member",
          tasks: tasksWithTime,
          taskCount: tasksWithTime.length,
        };
      });

      setUsers(usersWithTasks);
    } catch (error) {
      console.error("Error fetching users with tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((user) =>
    user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getElapsedTimeColor = (diffDays: number) => {
    if (diffDays < 1) return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    if (diffDays < 3) return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    if (diffDays < 7) return "text-orange-400 bg-orange-500/10 border-orange-500/20";
    return "text-rose-400 bg-rose-500/10 border-rose-500/20";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "done":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "in_progress":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "review":
        return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      default:
        return "bg-slate-700/50 text-slate-400 border-slate-700";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "done": return "Completada";
      case "in_progress": return "En progreso";
      case "review": return "Revisión";
      default: return "Por hacer";
    }
  };

  const getPriorityLabel = (priority: string) => {
    const p = parseInt(priority) || 2;
    if (p >= 4) return "Urgente";
    if (p >= 3) return "Alta";
    if (p >= 2) return "Media";
    return "Baja";
  };

  const getPriorityColor = (priority: string) => {
    const p = parseInt(priority) || 2;
    if (p >= 4) return "text-rose-400";
    if (p >= 3) return "text-orange-400";
    if (p >= 2) return "text-cyan-400";
    return "text-slate-400";
  };

  return (
    <>
      <div className="min-h-screen bg-slate-950 text-slate-100">
        {/* Header */}
        <header className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Link href="/" className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                </Link>
                <div>
                  <h1 className="text-lg font-bold text-white">Asignaciones de Tareas</h1>
                  <p className="text-xs text-slate-400">
                    {users.length} usuarios • {users.reduce((acc, u) => acc + u.taskCount, 0)} tareas asignadas
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 py-6">
          {/* Barra de búsqueda */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Buscar usuario..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-500 border-t-transparent" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-20 text-slate-500">
              <Users className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>No se encontraron usuarios</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden"
                >
                  {/* Header del usuario */}
                  <div
                    onClick={() => setSelectedUser(selectedUser === user.id ? null : user.id)}
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        {user.image ? (
                          <img
                            src={user.image}
                            alt={user.name || ""}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold">
                            {(user.name || user.email || "U").charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-white">
                          {user.name || "Sin nombre"}
                        </h3>
                        <p className="text-[10px] text-slate-400">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedUserForModal(user);
                        }}
                        className="p-2 hover:bg-cyan-500/10 rounded-lg text-cyan-400 transition-colors"
                        title="Ver tareas asignadas"
                      >
                        <CheckSquare className="w-4 h-4" />
                      </button>
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/60 border border-slate-700">
                        <CheckSquare className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="text-xs font-semibold text-white">{user.taskCount}</span>
                      </div>
                      <ChevronRight
                        className={`w-4 h-4 text-slate-400 transition-transform ${
                          selectedUser === user.id ? "rotate-90" : ""
                        }`}
                      />
                    </div>
                  </div>

                  {/* Lista de tareas asignadas */}
                  {selectedUser === user.id && user.tasks.length > 0 && (
                    <div className="border-t border-slate-800 p-4 space-y-2 bg-slate-950/30">
                      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <UserCircle className="w-3.5 h-3.5" />
                        Tareas Asignadas
                      </h4>
                      {user.tasks.map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center justify-between p-3 bg-slate-900/60 border border-slate-800 rounded-lg hover:border-slate-700 transition-all"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-white truncate">{task.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span
                                className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium border ${getStatusColor(
                                  task.status
                                )}`}
                              >
                                {getStatusLabel(task.status)}
                              </span>
                              <span className={`text-[9px] font-medium ${getPriorityColor(task.priority)}`}>
                                {getPriorityLabel(task.priority)}
                              </span>
                            </div>
                          </div>
                          <div
                            className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[9px] font-medium ${getElapsedTimeColor(
                              task.diffDays
                            )}`}
                          >
                            <Clock className="w-3 h-3" />
                            <span className="hidden sm:inline">{task.timeAgo}</span>
                            <span className="sm:hidden">{task.diffDays < 1 ? `${task.diffHours}h` : `${task.diffDays}d`}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {selectedUser === user.id && user.tasks.length === 0 && (
                    <div className="border-t border-slate-800 p-4 text-center text-xs text-slate-500">
                      No tiene tareas asignadas
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Modal para ver tareas asignadas */}
      {selectedUserForModal && (
        <AssignedTasksModal
          userId={selectedUserForModal.id}
          userName={selectedUserForModal.name || selectedUserForModal.email || "Usuario"}
          workspaceId={workspaceId}
          isOpen={!!selectedUserForModal}
          onClose={() => setSelectedUserForModal(null)}
        />
      )}
    </>
  );
}