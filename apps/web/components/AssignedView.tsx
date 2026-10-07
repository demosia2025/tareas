"use client";
import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import {
  Users, Search, FolderKanban, CheckCircle, Clock, AlertCircle,
  RefreshCw, ExternalLink, Calendar, ChevronDown, ChevronRight,
  Filter, X
} from "lucide-react";
import { useDashboard } from "@/hooks/useDashboard";

interface AssignedUser {
  id: string;
  name: string;
  email: string;
  image?: string;
  taskCount: number;
  tasks: any[];
}

interface TaskWithDetails {
  id: string;
  title: string;
  status: string;
  priority: number;
  createdAt: string;
  dueDate?: string | null;
  assignee?: { name: string; email: string; id?: string };
  list?: { name: string; id: string; spaceId?: string };
  space?: { name: string };
  parentTaskId?: string | null;
  parentId?: string | null;
  parent?: { id: string; title: string };
  listId?: string;
  workspaceId?: string;
}

type ViewMode = "users" | "date";

export default function AssignedView() {
  const { data: session } = useSession();
  const dashboard = useDashboard();

  const [users, setUsers] = useState<AssignedUser[]>([]);
  const [allTasks, setAllTasks] = useState<TaskWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("users");
  const [retryCount, setRetryCount] = useState(0);

  // Estado para usuarios expandidos/colapsados
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  // Filtros
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [dateSearchQuery, setDateSearchQuery] = useState("");
  const [dateFilterFrom, setDateFilterFrom] = useState("");
  const [dateFilterTo, setDateFilterTo] = useState("");
  const [showDateFilters, setShowDateFilters] = useState(false);

  // Estado para cuenta regresiva activa
  const [, setTick] = useState(0);

  // Actualizar el contador cada segundo
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!dashboard.workspaceId) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");

        // Obtener todas las tareas del workspace
        const tasksRes = await fetch(`/api/tasks?workspaceId=${dashboard.workspaceId}`);
        if (!tasksRes.ok) throw new Error("No se pudieron cargar las tareas");
        const tasks = await tasksRes.json();

        // Filtrar solo tareas asignadas
        const assignedTasks = tasks.filter((t: any) => t.assigneeId);

        // Enriquecer datos de espacio
        const tasksWithDetails = await Promise.all(
          assignedTasks.map(async (task: any) => {
            let spaceName = "";
            if (task.list?.spaceId) {
              try {
                const spaceRes = await fetch(`/api/spaces?id=${task.list.spaceId}`);
                if (spaceRes.ok) {
                  const spaceData = await spaceRes.json();
                  spaceName = spaceData.name || "";
                }
              } catch (e) {
                console.error("Error cargando espacio:", e);
              }
            }

            return {
              ...task,
              space: spaceName ? { name: spaceName } : undefined,
            };
          })
        );

        // Ordenar por fecha de creación (más reciente primero)
        tasksWithDetails.sort(
          (a: any, b: any) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

        setAllTasks(tasksWithDetails);

        // Obtener miembros para vista por usuario
        const membersRes = await fetch(`/api/workspace/${dashboard.workspaceId}/members`);
        if (!membersRes.ok) throw new Error("No se pudieron cargar los miembros");
        const membersData = await membersRes.json();
        const members = membersData.members || membersData || [];

        const usersWithTasks = await Promise.all(
          members.map(async (member: any) => {
            const userTasks = tasks.filter((t: any) => t.assigneeId === member.userId);
            return {
              id: member.userId,
              name: member.user?.name || member.name || "Sin nombre",
              email: member.user?.email || member.email || "",
              image: member.user?.image || member.image,
              taskCount: userTasks.length,
              tasks: userTasks,
            };
          })
        );

        setUsers(usersWithTasks);
      } catch (err: any) {
        setError(err.message || "Error al cargar datos");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dashboard.workspaceId, retryCount]);

  const handleRetry = () => setRetryCount((prev) => prev + 1);

  const toggleUserExpand = (userId: string) => {
    setExpandedUsers((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const expandAllUsers = () => {
    setExpandedUsers(new Set(users.map((u) => u.id)));
  };

  const collapseAllUsers = () => {
    setExpandedUsers(new Set());
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "done":
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case "in_progress":
        return <Clock className="w-4 h-4 text-blue-400" />;
      default:
        return <AlertCircle className="w-4 h-4 text-slate-400" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "done":
        return "Completada";
      case "in_progress":
        return "En Progreso";
      default:
        return "Por Hacer";
    }
  };

  const getPriorityLabel = (priority: number) => {
    if (priority >= 4) return "🔥 Urgente";
    if (priority === 3) return " Alta";
    if (priority === 2) return "🟡 Media";
    return " Baja";
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "done":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "in_progress":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      default:
        return "bg-slate-800 text-slate-400 border-slate-700";
    }
  };

  // Cuenta regresiva activa
  const getTimeRemaining = (dueDate?: string | null) => {
    if (!dueDate) return null;
    const now = new Date();
    const due = new Date(dueDate);
    const diff = due.getTime() - now.getTime();

    if (diff <= 0) {
      return { text: "Vencida", color: "text-rose-400", bg: "bg-rose-500/10", borderColor: "border-rose-500/30", isOverdue: true };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    let text = "";
    let color = "";
    let bg = "";

    if (days > 7) {
      text = `${days}d ${hours}h`;
      color = "text-emerald-400";
      bg = "bg-emerald-500/10";
    } else if (days > 0) {
      text = `${days}d ${hours}h`;
      color = "text-amber-400";
      bg = "bg-amber-500/10";
    } else if (hours > 0) {
      text = `${hours}h ${minutes}m`;
      color = "text-orange-400";
      bg = "bg-orange-500/10";
    } else if (minutes > 0) {
      text = `${minutes}m ${seconds}s`;
      color = "text-rose-400";
      bg = "bg-rose-500/10";
    } else {
      text = `${seconds}s`;
      color = "text-rose-400";
      bg = "bg-rose-500/10";
    }

    return { text, color, bg, borderColor: `${color.replace("text-", "border-")}/30`, isOverdue: false };
  };

  const handleGoToTask = (taskId: string, taskListId?: string) => {
    if (!taskListId) {
      let foundListId: string | undefined;

      for (const user of users) {
        const task = user.tasks.find((t: any) => t.id === taskId);
        if (task) {
          foundListId = task.listId || task.list?.id;
          break;
        }
      }

      if (!foundListId) {
        for (const task of allTasks) {
          if (task.id === taskId) {
            foundListId = task.listId || task.list?.id;
            break;
          }
        }
      }

      if (foundListId) {
        taskListId = foundListId;
      } else {
        alert("No se pudo encontrar la lista de esta tarea");
        return;
      }
    }

    const url = `/?listId=${taskListId}&openTask=${taskId}`;
    window.location.href = url;
  };

  // Filtrado de usuarios por nombre
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch =
        user.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(userSearchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [users, userSearchQuery]);

  // Filtrado de tareas por nombre y fecha
  const filteredTasks = useMemo(() => {
    return allTasks.filter((task) => {
      const matchesSearch =
        task.title.toLowerCase().includes(dateSearchQuery.toLowerCase()) ||
        task.assignee?.name?.toLowerCase().includes(dateSearchQuery.toLowerCase()) ||
        task.assignee?.email?.toLowerCase().includes(dateSearchQuery.toLowerCase());

      let matchesDate = true;
      if (dateFilterFrom) {
        const fromDate = new Date(dateFilterFrom);
        const taskDate = new Date(task.createdAt);
        if (taskDate < fromDate) matchesDate = false;
      }
      if (dateFilterTo) {
        const toDate = new Date(dateFilterTo);
        toDate.setHours(23, 59, 59, 999);
        const taskDate = new Date(task.createdAt);
        if (taskDate > toDate) matchesDate = false;
      }

      return matchesSearch && matchesDate;
    });
  }, [allTasks, dateSearchQuery, dateFilterFrom, dateFilterTo]);

  const totalTasks = users.reduce((sum, u) => sum + u.taskCount, 0);

  const clearDateFilters = () => {
    setDateFilterFrom("");
    setDateFilterTo("");
  };

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Asignaciones</h1>
            <p className="text-sm text-slate-400 mt-1">
              {viewMode === "users"
                ? `${users.length} usuarios • ${totalTasks} tareas asignadas`
                : `${allTasks.length} tareas en total`}
            </p>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-2 bg-slate-800/60 rounded-lg p-1">
            <button
              onClick={() => setViewMode("users")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold transition-all ${
                viewMode === "users"
                  ? "bg-cyan-500/20 text-cyan-400"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Users className="w-4 h-4" />
              Por Usuario
            </button>
            <button
              onClick={() => setViewMode("date")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-semibold transition-all ${
                viewMode === "date"
                  ? "bg-cyan-500/20 text-cyan-400"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Calendar className="w-4 h-4" />
              Por Fecha
            </button>
          </div>
        </div>

        {/* Barra de filtros */}
        <div className="mb-6 space-y-3">
          {/* Buscador principal */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="text"
                placeholder={
                  viewMode === "users"
                    ? "Buscar usuario por nombre o email..."
                    : "Buscar tarea o asignado..."
                }
                value={viewMode === "users" ? userSearchQuery : dateSearchQuery}
                onChange={(e) =>
                  viewMode === "users"
                    ? setUserSearchQuery(e.target.value)
                    : setDateSearchQuery(e.target.value)
                }
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30"
              />
              {(viewMode === "users" ? userSearchQuery : dateSearchQuery) && (
                <button
                  onClick={() =>
                    viewMode === "users"
                      ? setUserSearchQuery("")
                      : setDateSearchQuery("")
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Botón de filtros avanzados (solo en vista por fecha) */}
            {viewMode === "date" && (
              <button
                onClick={() => setShowDateFilters(!showDateFilters)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-semibold transition-all border ${
                  showDateFilters || dateFilterFrom || dateFilterTo
                    ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30"
                    : "bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800"
                }`}
              >
                <Filter className="w-4 h-4" />
                Filtros de fecha
                {(dateFilterFrom || dateFilterTo) && (
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                )}
              </button>
            )}

            {/* Botones expandir/colapsar (solo en vista por usuario) */}
            {viewMode === "users" && filteredUsers.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={expandAllUsers}
                  className="px-3 py-2 bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 rounded-xl text-xs font-medium transition-all"
                  title="Expandir todos"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
                <button
                  onClick={collapseAllUsers}
                  className="px-3 py-2 bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 rounded-xl text-xs font-medium transition-all"
                  title="Colapsar todos"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Filtros de fecha expandibles */}
          {viewMode === "date" && showDateFilters && (
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Filtrar por rango de fechas
                </span>
                {(dateFilterFrom || dateFilterTo) && (
                  <button
                    onClick={clearDateFilters}
                    className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                  >
                    <X className="w-3 h-3" />
                    Limpiar filtros
                  </button>
                )}
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex-1 min-w-[180px]">
                  <label className="block text-[10px] font-medium text-slate-400 mb-1 uppercase tracking-wider">
                    Desde
                  </label>
                  <input
                    type="date"
                    value={dateFilterFrom}
                    onChange={(e) => setDateFilterFrom(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
                <div className="flex-1 min-w-[180px]">
                  <label className="block text-[10px] font-medium text-slate-400 mb-1 uppercase tracking-wider">
                    Hasta
                  </label>
                  <input
                    type="date"
                    value={dateFilterTo}
                    onChange={(e) => setDateFilterTo(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
              </div>
            </div>
          )}
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
        ) : viewMode === "users" ? (
          /* VISTA POR USUARIO - CONTRAÍBLE */
          <div className="space-y-3">
            {filteredUsers.length === 0 ? (
              <div className="text-center py-20">
                <Users className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-400 text-lg">
                  {userSearchQuery
                    ? "No se encontraron usuarios"
                    : "No hay usuarios en este workspace"}
                </p>
              </div>
            ) : (
              filteredUsers.map((user) => {
                const isExpanded = expandedUsers.has(user.id);
                return (
                  <div
                    key={user.id}
                    className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden hover:bg-slate-800/50 transition-all"
                  >
                    {/* Header del usuario - Click para expandir/colapsar */}
                    <button
                      onClick={() => toggleUserExpand(user.id)}
                      className="w-full flex items-center justify-between p-4 hover:bg-slate-800/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <ChevronDown
                          className={`w-4 h-4 text-cyan-400 flex-shrink-0 transition-transform duration-300 ${
                            isExpanded ? "rotate-0" : "-rotate-90"
                          }`}
                        />
                        {user.image ? (
                          <img
                            src={user.image}
                            alt={user.name}
                            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="text-left min-w-0">
                          <h3 className="font-semibold text-white truncate">
                            {user.name}
                          </h3>
                          <p className="text-xs text-slate-400 truncate">
                            {user.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 rounded-lg flex-shrink-0">
                        <FolderKanban className="w-4 h-4 text-cyan-400" />
                        <span className="text-sm font-bold text-white">
                          {user.taskCount}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {user.taskCount === 1 ? "tarea" : "tareas"}
                        </span>
                      </div>
                    </button>

                    {/* Lista de tareas expandible */}
                    {isExpanded && user.tasks.length > 0 && (
                      <div className="border-t border-slate-800 bg-slate-950/30 p-3 space-y-2 animate-in slide-in-from-top-2">
                        {user.tasks.map((task: any) => (
                          <div
                            key={task.id}
                            className="flex items-start justify-between p-3 bg-slate-900/50 border border-slate-800 rounded-lg hover:border-slate-700 transition-all group"
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
                                  className={`text-[10px] px-2 py-0.5 rounded-full border ${getStatusBadgeClass(
                                    task.status
                                  )}`}
                                >
                                  {getStatusLabel(task.status)}
                                </span>
                                <span className="text-[10px] text-slate-500">
                                  {getPriorityLabel(task.priority)}
                                </span>
                                {task.listName && (
                                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                    📁 {task.listName}
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleGoToTask(task.id, task.listId || task.list?.id);
                              }}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold transition-all opacity-0 group-hover:opacity-100"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              Ver
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {isExpanded && user.tasks.length === 0 && (
                      <div className="border-t border-slate-800 bg-slate-950/30 py-6 text-center text-slate-500 text-sm">
                        Sin tareas asignadas
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* VISTA POR FECHA - CON CUENTA REGRESIVA ACTIVA */
          <div className="space-y-3">
            {filteredTasks.length === 0 ? (
              <div className="text-center py-20">
                <Calendar className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-400 text-lg">
                  {dateSearchQuery || dateFilterFrom || dateFilterTo
                    ? "No se encontraron tareas con los filtros aplicados"
                    : "No hay tareas asignadas"}
                </p>
              </div>
            ) : (
              filteredTasks.map((task) => {
                const timeRemaining = getTimeRemaining(task.dueDate);
                const isSubtask = !!task.parentTaskId || !!task.parentId;
                const createdAt = new Date(task.createdAt);

                return (
                  <div
                    key={task.id}
                    className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 hover:bg-slate-800/50 transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Título y estado */}
                        <div className="flex items-start gap-3 mb-2">
                          {isSubtask && (
                            <div className="flex-shrink-0 mt-1">
                              <div className="w-4 h-4 rounded bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                                <span className="text-[10px] text-purple-400">
                                  ↳
                                </span>
                              </div>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-semibold text-white mb-1 truncate">
                              {task.title}
                            </h4>
                            {isSubtask && task.parent && (
                              <p className="text-xs text-purple-300 flex items-center gap-1">
                                <span className="text-purple-400">↳</span>
                                Subtarea de: {task.parent.title}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Metadata */}
                        <div className="flex flex-wrap items-center gap-3 text-xs mb-3">
                          {/* Fecha de creación */}
                          <span className="flex items-center gap-1.5 text-slate-400">
                            <Calendar className="w-3.5 h-3.5" />
                            Creada:{" "}
                            {createdAt.toLocaleDateString("es-ES", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>

                          {/* Espacio */}
                          {task.space?.name && (
                            <span className="flex items-center gap-1.5 text-slate-400">
                              <FolderKanban className="w-3.5 h-3.5" />
                              {task.space.name}
                            </span>
                          )}

                          {/* Asignado a */}
                          {task.assignee && (
                            <span className="flex items-center gap-1.5 text-cyan-400">
                              <Users className="w-3.5 h-3.5" />
                              {task.assignee.name}
                            </span>
                          )}
                        </div>

                        {/* Badges */}
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`text-[10px] px-2 py-1 rounded-full border flex items-center gap-1.5 ${getStatusBadgeClass(
                              task.status
                            )}`}
                          >
                            {getStatusIcon(task.status)}
                            {getStatusLabel(task.status)}
                          </span>

                          <span className="text-[10px] px-2 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                            {getPriorityLabel(task.priority)}
                          </span>

                          {/* Cuenta regresiva ACTIVA */}
                          {timeRemaining && (
                            <span
                              className={`text-[10px] px-2 py-1 rounded-full border flex items-center gap-1.5 ${timeRemaining.bg} ${timeRemaining.color} ${timeRemaining.borderColor} ${
                                timeRemaining.isOverdue ? "animate-pulse" : ""
                              }`}
                            >
                              <Clock className="w-3.5 h-3.5" />
                              {timeRemaining.isOverdue ? "⚠️ " : "⏱️ "}
                              {timeRemaining.text}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        onClick={() =>
                          handleGoToTask(task.id, task.listId || task.list?.id)
                        }
                        className="flex items-center gap-1.5 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-semibold transition-all flex-shrink-0"
                      >
                        Ver tarea
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}