"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { 
  CheckCircle2, 
  Layers, 
  BarChart3,
  Flame,
  PieChart as PieIcon,
  Activity,
  Calendar,
  ShieldCheck,
  Target,
  LayoutGrid
} from "lucide-react";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: number;
  dueDate: string | null;
  createdAt?: string;
  listName?: string;
}

export default function DashboardView() {
  const { data: session } = useSession();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllWorkspaceTasks = async () => {
      if (!session?.user?.id) return;
      try {
        const resWorkspace = await fetch(`/api/user/workspace?userId=${session.user.id}`);
        const wsData = await resWorkspace.json();
        
        if (wsData.workspaceId) {
          const resHierarchy = await fetch(`/api/workspace/${wsData.workspaceId}/hierarchy`);
          if (!resHierarchy.ok) return;
          const hierarchy = await resHierarchy.json();
          
          const listRequests: { id: string; name: string }[] = [];

          for (const space of hierarchy) {
            for (const folder of space.folders || []) {
              for (const list of folder.lists || []) {
                listRequests.push({ id: list.id, name: list.name });
              }
            }
            for (const list of space.lists || []) {
              listRequests.push({ id: list.id, name: list.name });
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
                  listName: list.name
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

    fetchAllWorkspaceTasks();
  }, [session]);

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === "done" || t.status === "completed").length;
  const inProgressTasks = tasks.filter(t => t.status === "in_progress" || t.status === "doing").length;
  const pendingTasks = tasks.filter(t => t.status === "todo" || !t.status).length;

  const urgentCount = tasks.filter(t => t.priority === 4).length;
  const highCount = tasks.filter(t => t.priority === 3).length;
  const mediumCount = tasks.filter(t => t.priority === 2).length;
  const lowCount = tasks.filter(t => t.priority <= 1).length;

  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const getPercent = (count: number) => totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0;

  const recentActivity = useMemo(() => {
    return [...tasks]
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 5);
  }, [tasks]);

  const upcomingDeadlines = useMemo(() => {
    return [...tasks]
      .filter(t => t.status !== "done" && t.status !== "completed" && t.dueDate)
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
      .slice(0, 4);
  }, [tasks]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "Sin fecha";
    return new Date(dateStr).toLocaleDateString('es-ES', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  };

  const getPriorityConfig = (priority: number) => {
    const configs: Record<number, { label: string; pillStyle: string }> = {
      1: { label: "Baja", pillStyle: "text-slate-400 bg-slate-800/40 border-slate-700/40" },
      2: { label: "Media", pillStyle: "text-cyan-300 bg-cyan-500/10 border-cyan-500/20" },
      3: { label: "Alta", pillStyle: "text-amber-300 bg-amber-500/10 border-amber-500/20" },
      4: { label: "Urgente", pillStyle: "text-rose-300 bg-rose-500/15 border-rose-500/30" },
    };
    return configs[priority] || configs[1];
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
      {/* Title Banner */}
      <div className="flex items-center justify-between px-5 py-4 rounded-2xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-xl shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
            <LayoutGrid className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">Dashboard General</h1>
            <p className="text-xs text-slate-400">Resumen y métricas de desempeño del proyecto</p>
          </div>
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

        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between shadow-xl backdrop-blur-xl">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Urgentes</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-rose-400 tracking-tight">{urgentCount}</span>
              <span className="text-xs text-rose-500 font-bold">({getPercent(urgentCount)}%)</span>
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <Flame className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Gráficos y Métricas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-5 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 flex flex-col justify-between backdrop-blur-xl shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-bold text-white tracking-tight flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-cyan-400" /> Carga por Prioridad
            </h2>
            <span className="text-[11px] font-bold text-slate-400">{totalTasks} tareas</span>
          </div>

          <div className="grid grid-cols-4 gap-3 items-end h-36 pt-4 pb-2 border-b border-slate-800">
            {[
              { label: "Urgente", count: urgentCount, pct: getPercent(urgentCount), from: "from-rose-500", via: "via-rose-600", to: "to-rose-800", badge: "text-rose-400" },
              { label: "Alta", count: highCount, pct: getPercent(highCount), from: "from-amber-400", via: "via-amber-500", to: "to-amber-700", badge: "text-amber-400" },
              { label: "Media", count: mediumCount, pct: getPercent(mediumCount), from: "from-cyan-500", via: "via-cyan-600", to: "to-blue-700", badge: "text-cyan-400" },
              { label: "Baja", count: lowCount, pct: getPercent(lowCount), from: "from-slate-400", via: "via-slate-500", to: "to-slate-700", badge: "text-slate-400" },
            ].map((bar, idx) => (
              <div key={idx} className="flex flex-col items-center h-full justify-end">
                <span className={`text-xs font-bold ${bar.badge}`}>{bar.count}</span>
                <div className="w-full max-w-[32px] bg-slate-950/80 rounded-xl h-full flex items-end p-0.5 border border-slate-800 relative overflow-hidden">
                  <div 
                    className={`w-full bg-gradient-to-t ${bar.from} ${bar.via} ${bar.to} rounded-lg transition-all duration-500 shadow-sm relative`}
                    style={{ height: `${Math.max(bar.pct, 8)}%` }}
                  />
                </div>
                <span className="mt-1 text-[10px] font-bold text-slate-400">{bar.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-cyan-400" /> Distribución porcentual sobre el total
          </div>
        </div>

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
                <ShieldCheck className="w-4 h-4 text-emerald-400" /> No hay entregas pendientes
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