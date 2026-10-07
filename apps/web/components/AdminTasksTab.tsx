"use client";
import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { CheckSquare, AlertCircle, Clock, Layers } from "lucide-react";

export default function AdminTasksTab() {
  const { data: session } = useSession();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<"DÍA" | "SEMANA" | "MES" | "AÑO" | "TODO">("TODO");

  useEffect(() => {
    const fetchTasks = async () => {
      setLoading(true);
      try {
        // 🔑 Se apunta a la ruta real de tu API: /api/tasks
        const res = await fetch("/api/tasks");
        if (res.ok) {
          const data = await res.json();
          setTasks(Array.isArray(data) ? data : []);
        } else {
          console.error("Error HTTP al obtener tareas:", res.status);
          setTasks([]);
        }
      } catch (error) {
        console.error("Error al cargar tareas:", error);
        setTasks([]);
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, [session?.user?.id]);

  // Normalización de estados flexibles
  const isTaskCompleted = (status: string) => {
    const s = (status || "").toLowerCase();
    return s === "completed" || s === "done" || s === "completada" || s === "resuelta";
  };

  const isTaskInProgress = (status: string) => {
    const s = (status || "").toLowerCase();
    return s === "in_progress" || s === "doing" || s === "en_progreso" || s === "en progreso";
  };

  // Cálculos de métricas
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => isTaskCompleted(t.status)).length;
  const inProgressTasks = tasks.filter((t) => isTaskInProgress(t.status)).length;
  const urgentTasks = tasks.filter((t) => Number(t.priority) >= 4 || t.priority === "urgent" || t.priority === "urgente").length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "Sin fecha";
    try {
      return new Date(dateStr).toLocaleDateString('es-ES', { month: 'short', day: 'numeric', timeZone: 'UTC' });
    } catch {
      return "Sin fecha";
    }
  };

  const getPriorityConfig = (priority: number | string) => {
    const p = typeof priority === "string" ? priority.toLowerCase() : priority;
    if (p === 4 || p === "4" || p === "urgent" || p === "urgente") {
      return { label: "Urgente", pillStyle: "text-rose-300 bg-rose-500/15 border-rose-500/30" };
    }
    if (p === 3 || p === "3" || p === "high" || p === "alta") {
      return { label: "Alta", pillStyle: "text-amber-300 bg-amber-500/10 border-amber-500/20" };
    }
    if (p === 2 || p === "2" || p === "medium" || p === "media") {
      return { label: "Media", pillStyle: "text-cyan-300 bg-cyan-500/10 border-cyan-500/20" };
    }
    return { label: "Baja", pillStyle: "text-slate-400 bg-slate-800/40 border-slate-700/40" };
  };

  if (loading) {
    return (
      <div className="h-64 w-full flex flex-col items-center justify-center p-12 gap-3 text-slate-400 text-xs">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-400 border-t-transparent"></div>
        <span>Cargando tareas del sistema...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5 w-full">
      {/* BARRA SUPERIOR DE FILTRO DE TIEMPO */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-xs font-semibold text-cyan-400">
          <CheckSquare className="w-4 h-4" />
          <span>Métricas y Control de Tareas</span>
        </div>

        <div className="flex items-center bg-slate-900/60 border border-slate-800/80 p-1 rounded-xl text-xs">
          {(["DÍA", "SEMANA", "MES", "AÑO", "TODO"] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setTimeFilter(filter)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                timeFilter === filter ? "bg-cyan-500 text-slate-950 font-bold" : "text-slate-400 hover:text-white"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* TARJETAS DE MÉTRICAS CLAVE */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between shadow-xl backdrop-blur-xl">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">TOTAL TAREAS</p>
            <p className="text-2xl font-black text-white tracking-tight mt-1">{totalTasks}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between shadow-xl backdrop-blur-xl">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">COMPLETADAS</p>
            <p className="text-2xl font-black text-emerald-400 tracking-tight mt-1">
              {completedTasks}{" "}
              <span className="text-xs text-emerald-500 font-semibold">({completionRate}%)</span>
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckSquare className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between shadow-xl backdrop-blur-xl">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">EN PROGRESO</p>
            <p className="text-2xl font-black text-cyan-400 tracking-tight mt-1">{inProgressTasks}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between shadow-xl backdrop-blur-xl">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">URGENTES</p>
            <p className="text-2xl font-black text-rose-400 tracking-tight mt-1">{urgentTasks}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* TABLA DE TAREAS */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-xl backdrop-blur-xl overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold text-white tracking-tight uppercase flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-cyan-400" /> Listado General de Tareas
          </h3>
          <span className="text-xs text-slate-400">{tasks.length} registros</span>
        </div>

        <div className="overflow-x-auto w-full">
          <table className="w-full text-left min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] sm:text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                <th className="pb-3 px-3">Tarea</th>
                <th className="pb-3 px-3">Asignado</th>
                <th className="pb-3 px-3">Lista</th>
                <th className="pb-3 px-3">Estado</th>
                <th className="pb-3 px-3">Prioridad</th>
                <th className="pb-3 px-3">Vencimiento</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {tasks.length > 0 ? (
                tasks.map((task) => {
                  const p = getPriorityConfig(task.priority);
                  const isDone = isTaskCompleted(task.status);
                  const isInProgress = isTaskInProgress(task.status);
                  return (
                    <tr key={task.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-3 font-medium text-slate-200">{task.title}</td>
                      <td className="py-3 px-3 text-slate-300">
                        {task.assignee?.name || task.assignee?.email || task.assigneeName || "Sin asignar"}
                      </td>
                      <td className="py-3 px-3 text-slate-400">
                        {task.list?.name || task.listName || "General"}
                      </td>
                      <td className="py-3 px-3">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg border ${
                          isDone ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" :
                          isInProgress ? "text-cyan-300 bg-cyan-500/10 border-cyan-500/20" :
                          "text-slate-400 bg-slate-800/40 border-slate-700/40"
                        }`}>
                          {isDone ? "Completada" : isInProgress ? "En Progreso" : "Por Hacer"}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg border ${p.pillStyle}`}>
                          {p.label}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-400">{formatDate(task.dueDate)}</td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No hay tareas registradas en este espacio de trabajo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}