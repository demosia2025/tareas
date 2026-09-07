"use client";
import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import {
  Layers, CheckCircle2, Clock, Activity, Flame,
  BarChart3, PieChart as PieIcon, Calendar,
  Download, ChevronDown, Building2
} from "lucide-react";

type TimeFilter = "DIA" | "SEMANA" | "MES" | "AÑO" | "TODO";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: number;
  dueDate: string | null;
  createdAt?: string;
  updatedAt?: string;
  listName?: string;
  spaceName?: string;
  completedAt?: string;
}

export default function DashboardView() {
  const { data: session } = useSession();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("TODO");
  const [selectedOrg, setSelectedOrg] = useState<string>("Todas las Organizaciones");
  const [organizations, setOrganizations] = useState<string[]>([]);
  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);

  // Fetch organizations
  useEffect(() => {
    const fetchOrgs = async () => {
      try {
        const res = await fetch("/api/organizations");
        if (res.ok) {
          const data = await res.json();
          const orgNames = data.map((org: any) => org.name);
          setOrganizations(["Todas las Organizaciones", ...orgNames]);
        }
      } catch (error) {
        console.error("Error fetching organizations:", error);
      }
    };
    fetchOrgs();
  }, []);

  // Fetch all tasks
  useEffect(() => {
    const fetchAllTasks = async () => {
      if (!session?.user?.id) return;
      setLoading(true);
      try {
        const resWorkspace = await fetch(`/api/user/workspace?userId=${session.user.id}`);
        const wsData = await resWorkspace.json();
        
        if (wsData.workspaceId) {
          const resHierarchy = await fetch(`/api/workspace/${wsData.workspaceId}/hierarchy`);
          if (!resHierarchy.ok) return;
          const hierarchy = await resHierarchy.json();
          
          const listRequests: { id: string; name: string; spaceName: string }[] = [];
          for (const space of hierarchy) {
            for (const folder of space.folders || []) {
              for (const list of folder.lists || []) {
                listRequests.push({ id: list.id, name: list.name, spaceName: space.name });
              }
            }
            for (const list of space.lists || []) {
              listRequests.push({ id: list.id, name: list.name, spaceName: space.name });
            }
          }
          
          const tasksArrays = await Promise.all(
            listRequests.map(async (list) => {
              const resTasks = await fetch(`/api/tasks?listId=${list.id}`);
              if (resTasks.ok) {
                const listTasks = await resTasks.json();
                return listTasks.map((t: any) => ({
                  ...t,
                  priority: Number(t.priority) || 1,
                  listName: list.name,
                  spaceName: list.spaceName
                }));
              }
              return [];
            })
          );
          setTasks(tasksArrays.flat());
        }
      } catch (error) {
        console.error("Error al cargar datos del dashboard:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAllTasks();
  }, [session]);

  // Filter tasks by time
  const filteredTasks = useMemo(() => {
    if (timeFilter === "TODO") return tasks;
    const now = new Date();
    return tasks.filter((task) => {
      const taskDate = new Date(task.createdAt || 0);
      if (timeFilter === "DIA") {
        return taskDate.toDateString() === now.toDateString();
      }
      if (timeFilter === "SEMANA") {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return taskDate >= weekAgo;
      }
      if (timeFilter === "MES") {
        return taskDate.getMonth() === now.getMonth() && taskDate.getFullYear() === now.getFullYear();
      }
      if (timeFilter === "AÑO") {
        return taskDate.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [tasks, timeFilter]);

  // Metrics
  const totalTasks = filteredTasks.length;
  const completedTasks = filteredTasks.filter(t => t.status === "done" || t.status === "completed").length;
  const inProgressTasks = filteredTasks.filter(t => t.status === "in_progress" || t.status === "doing").length;
  const pendingTasks = filteredTasks.filter(t => t.status === "todo" || !t.status).length;
  const urgentCount = filteredTasks.filter(t => t.priority === 4).length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Average resolution time
  const avgResolutionTime = useMemo(() => {
    const completed = filteredTasks.filter(t =>
      (t.status === "done" || t.status === "completed") && t.createdAt && t.completedAt
    );
    if (completed.length === 0) return "0m";
    
    let totalMinutes = 0;
    completed.forEach((task) => {
      const created = new Date(task.createdAt!).getTime();
      const completed = new Date(task.completedAt!).getTime();
      totalMinutes += Math.round((completed - created) / (1000 * 60));
    });
    
    const avg = Math.round(totalMinutes / completed.length);
    const hours = Math.floor(avg / 60);
    const minutes = avg % 60;
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  }, [filteredTasks]);

  // Priority stats
  const priorityStats = useMemo(() => {
    const stats = { urgente: 0, alta: 0, media: 0, baja: 0 };
    filteredTasks.forEach((task) => {
      const p = task.priority || 0;
      if (p >= 4) stats.urgente++;
      else if (p === 3) stats.alta++;
      else if (p === 2) stats.media++;
      else stats.baja++;
    });
    return stats;
  }, [filteredTasks]);

  const maxPriority = Math.max(
    priorityStats.urgente,
    priorityStats.alta,
    priorityStats.media,
    priorityStats.baja,
    1
  );

  // Upcoming deadlines
  const upcomingDeadlines = useMemo(() => {
    const now = new Date();
    return [...filteredTasks]
      .filter(t => t.dueDate && new Date(t.dueDate) > now && t.status !== "done" && t.status !== "completed")
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
      .slice(0, 5);
  }, [filteredTasks]);

  // Recent activity
  const recentActivity = useMemo(() => {
    return [...filteredTasks]
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 10);
  }, [filteredTasks]);

  const getPercent = (count: number) => totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0;

  // ✅ CORREGIDO: Aceptar también 'undefined' además de 'string | null'
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "Sin fecha";
    return new Date(dateStr).toLocaleDateString('es-ES', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  };

  const getPriorityConfig = (priority: number) => {
    const configs: Record<number, { label: string; pillStyle: string }> = {
      1: { label: "Baja", pillStyle: "text-slate-400 bg-slate-800/40 border-slate-700/40 " },
      2: { label: "Media", pillStyle: "text-cyan-300 bg-cyan-500/10 border-cyan-500/20 " },
      3: { label: "Alta", pillStyle: "text-amber-300 bg-amber-500/10 border-amber-500/20 " },
      4: { label: "Urgente", pillStyle: "text-rose-300 bg-rose-500/15 border-rose-500/30 " },
    };
    return configs[priority] || configs[1];
  };

  const handleDownloadReport = () => {
    const reportData = {
      fecha: new Date().toLocaleDateString('es-ES'),
      totalTareas: totalTasks,
      completadas: completedTasks,
      enProgreso: inProgressTasks,
      pendientes: pendingTasks,
      tasaCompletitud: `${completionRate}%`,
      tiempoPromedio: avgResolutionTime,
      tareas: filteredTasks.map(t => ({
        titulo: t.title,
        lista: t.listName,
        estado: t.status,
        prioridad: getPriorityConfig(t.priority).label,
        fecha: formatDate(t.createdAt) // ✅ Ahora TypeScript no se queja
      }))
    };
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-dashboard-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-cyan-400 border-t-transparent mx-auto mb-3"></div>
          <p className="text-slate-400 font-light text-xs">Cargando métricas del workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full p-6 space-y-5 overflow-y-auto">
      {/* Header con selector de organizaciones y filtros */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1">
          {/* Selector de organizaciones */}
          <div className="relative">
            <button
              onClick={() => setIsOrgDropdownOpen(!isOrgDropdownOpen)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900/60 border border-slate-800 rounded-xl text-xs font-medium text-white hover:bg-slate-800 transition-colors"
            >
              <Building2 className="w-4 h-4 text-slate-400" />
              <span>{selectedOrg}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
            {isOrgDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsOrgDropdownOpen(false)}></div>
                <div className="absolute top-full mt-2 left-0 w-64 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 py-2">
                  {organizations.map((org) => (
                    <button
                      key={org}
                      onClick={() => {
                        setSelectedOrg(org);
                        setIsOrgDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-xs hover:bg-slate-800 transition-colors ${
                        selectedOrg === org ? "bg-cyan-500/10 text-cyan-400" : "text-white"
                      }`}
                    >
                      {org}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Filtros de tiempo */}
          <div className="flex items-center gap-1 bg-slate-900/60 border border-slate-800 rounded-xl p-1">
            {(["DÍA", "SEMANA", "MES", "AÑO", "TODO"] as TimeFilter[]).map((filter) => (
              <button
                key={filter}
                onClick={() => setTimeFilter(filter)}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  timeFilter === filter
                    ? "bg-indigo-500 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
        
        {/* Botón de descarga */}
        <button
          onClick={handleDownloadReport}
          className="flex items-center gap-2 px-4 py-2 bg-slate-900/60 border border-slate-800 rounded-xl text-xs font-medium text-white hover:bg-slate-800 transition-colors"
        >
          <Download className="w-4 h-4" />
          <span>Descargar Reporte</span>
        </button>
      </div>

      {/* Título del Dashboard */}
      <div className="flex items-center justify-between px-5 py-4 rounded-2xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-xl shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">Panel de Control</h1>
            <p className="text-xs text-slate-400">Resumen y métricas de desempeño del proyecto</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
          <span className="text-xs font-semibold text-emerald-400">En Vivo</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between shadow-xl backdrop-blur-xl">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Tareas</span>
            <span className="text-2xl font-black text-white tracking-tight">{totalTasks}</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Layers className="w-4 h-4" />
          </div>
        </div>
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between shadow-xl backdrop-blur-xl">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Completadas</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-emerald-400 tracking-tight">{completedTasks}</span>
              <span className="text-xs font-bold text-emerald-500">({completionRate}%)</span>
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between shadow-xl backdrop-blur-xl">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tiempo Promedio</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-amber-400 tracking-tight">{avgResolutionTime}</span>
            </div>
            <span className="text-[10px] text-slate-500">por tarea completada</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between shadow-xl backdrop-blur-xl">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">En Progreso</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-cyan-400 tracking-tight">{inProgressTasks}</span>
              <span className="text-[11px] text-slate-400">({pendingTasks} pendientes)</span>
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Activity className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Gráficos y Métricas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Carga por Prioridad */}
        <div className="lg:col-span-5 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between backdrop-blur-xl shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-bold text-white tracking-tight flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-cyan-400" /> Carga por Prioridad
            </h2>
            <span className="text-[11px] font-bold text-slate-400">{totalTasks} tareas</span>
          </div>
          <div className="grid grid-cols-4 gap-3 items-end h-36 pt-4 pb-2 border-b border-slate-800">
            {[
              { label: "Urgente", count: priorityStats.urgente, pct: getPercent(priorityStats.urgente), color: "bg-rose-500" },
              { label: "Alta", count: priorityStats.alta, pct: getPercent(priorityStats.alta), color: "bg-amber-500" },
              { label: "Media", count: priorityStats.media, pct: getPercent(priorityStats.media), color: "bg-cyan-500" },
              { label: "Baja", count: priorityStats.baja, pct: getPercent(priorityStats.baja), color: "bg-slate-500" },
            ].map((bar, idx) => (
              <div key={idx} className="flex flex-col items-center h-full justify-end">
                <span className="text-xs font-bold text-white">{bar.count}</span>
                <div className="w-full max-w-[32px] bg-slate-950/80 rounded-xl h-full flex items-end p-0.5 border border-slate-800 relative overflow-hidden">
                  <div 
                    className={`w-full ${bar.color} rounded-lg transition-all duration-500 shadow-sm relative`}
                    style={{ height: `${Math.max(bar.pct, 8)}%` }}
                  />
                </div>
                <span className="mt-1 text-[10px] font-bold text-slate-400">{bar.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full border-2 border-cyan-400"></div>
            Distribución porcentual sobre el total
          </div>
        </div>

        {/* Tasa de Éxito */}
        <div className="lg:col-span-3 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 flex flex-col items-center justify-between backdrop-blur-xl shadow-xl">
          <div className="w-full text-left">
            <h3 className="text-xs font-bold text-white tracking-tight flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-emerald-400" /> Tasa de Éxito
            </h3>
          </div>
          <div className="relative w-28 h-28 flex items-center justify-center my-2">
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="38" className="stroke-slate-950" strokeWidth="10" fill="transparent" />
              <circle
                cx="50" cy="50" r="38"
                className="stroke-emerald-400 transition-all duration-700"
                strokeWidth="10" 
                strokeDasharray="238.76" 
                strokeDashoffset={238.76 - (238.76 * completionRate) / 100} 
                strokeLinecap="round" 
                fill="transparent"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-black text-white">{completionRate}%</span>
              <span className="text-[9px] font-bold text-emerald-400 uppercase">Resueltas</span>
            </div>
          </div>
          <span className="text-[11px] font-medium text-slate-300">
            {completedTasks} de {totalTasks} completadas
          </span>
        </div>

        {/* Próximos Vencimientos */}
        <div className="lg:col-span-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between backdrop-blur-xl shadow-xl">
          <h3 className="text-xs font-bold text-white tracking-tight flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-cyan-400" /> Próximos Vencimientos
          </h3>
          <div className="space-y-2">
            {upcomingDeadlines.length > 0 ? upcomingDeadlines.map((task) => {
              const p = getPriorityConfig(task.priority);
              return (
                <div key={task.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/80">
                  <div className="flex-1 min-w-0 mr-2">
                    <p className="text-xs font-medium text-slate-200 truncate">{task.title}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-lg border ${p.pillStyle}`}>{p.label}</span>
                    <span className="text-[11px] text-slate-400 font-medium">{formatDate(task.dueDate)}</span>
                  </div>
                </div>
              );
            }) : (
              <div className="text-center py-6 text-slate-500 text-xs flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> No hay entregas pendientes
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabla de Actividad */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold text-white tracking-tight flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" /> ÚLTIMAS TAREAS REGISTRADAS
          </h3>
          <span className="text-[11px] text-slate-400">Actividad del workspace</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                <th className="pb-2 px-3">Tarea</th>
                <th className="pb-2 px-3">Lista</th>
                <th className="pb-2 px-3">Estado</th>
                <th className="pb-2 px-3">Prioridad</th>
                <th className="pb-2 px-3">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {recentActivity.length > 0 ? recentActivity.map((task) => {
                const p = getPriorityConfig(task.priority);
                const isDone = task.status === "done" || task.status === "completed";
                const isInProgress = task.status === "in_progress" || task.status === "doing";
                return (
                  <tr key={task.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 px-3 text-xs font-medium text-slate-200 truncate max-w-[220px]">{task.title}</td>
                    <td className="py-2.5 px-3 text-xs text-slate-400">{task.listName || "General"}</td>
                    <td className="py-2.5 px-3">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-lg border ${
                        isDone 
                          ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" 
                          : isInProgress 
                          ? "text-cyan-300 bg-cyan-500/10 border-cyan-500/20" 
                          : "text-slate-400 bg-slate-800/40 border-slate-700/40"
                      }`}>
                        {isDone ? "Completada" : isInProgress ? "En Progreso" : "Por Hacer"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-lg border ${p.pillStyle}`}>{p.label}</span>
                    </td>
                    <td className="py-2.5 px-3 text-xs text-slate-400 font-medium">{formatDate(task.createdAt || task.dueDate)}</td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-xs text-slate-500">Sin registros recientes</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}