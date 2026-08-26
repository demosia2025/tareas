"use client";

import { useState, useEffect } from "react";
import { X, Clock, CheckCircle, AlertCircle } from "lucide-react";

interface AssignedTasksModalProps {
  userId: string;
  userName: string;
  workspaceId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface Task {
  id: string;
  title: string;
  status: string;
  priority: number;
  createdAt: string;
  updatedAt: string;
  assigneeId?: string;
  list?: {
    id: string;
    name: string;
  };
}

export default function AssignedTasksModal({
  userId,
  userName,
  workspaceId,
  isOpen,
  onClose,
}: AssignedTasksModalProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && userId && workspaceId) {
      fetchAssignedTasks();
    } else {
      setTasks([]); // Limpiar al cerrar
    }
  }, [isOpen, userId, workspaceId]);

  const fetchAssignedTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      // Consultamos directamente filtrando por workspace y por el usuario asignado
      const res = await fetch(`/api/tasks?workspaceId=${workspaceId}&assigneeId=${userId}`);
      
      if (res.ok) {
        const userTasks: Task[] = await res.json();
        setTasks(Array.isArray(userTasks) ? userTasks : []);
      } else {
        setError("No se pudieron cargar las tareas");
      }
    } catch (err) {
      console.error("Error al cargar tareas:", err);
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const getElapsedTime = (dateString: string) => {
    if (!dateString) return "Sin fecha";
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours} hora${diffHours > 1 ? "s" : ""}`;
    if (diffDays < 7) return `Hace ${diffDays} día${diffDays > 1 ? "s" : ""}`;
    return date.toLocaleDateString("es-ES");
  };

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
    if (priority === 3) return "⚡ Alta";
    if (priority === 2) return "🟡 Media";
    return "🔵 Baja";
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div>
            <h3 className="text-lg font-bold text-white">Tareas Asignadas</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Mostrando tareas asignadas a <span className="text-cyan-400 font-semibold">{userName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-500 border-t-transparent" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-3" />
              <p className="text-sm text-rose-400">{error}</p>
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-sm text-slate-400">Este usuario no tiene tareas asignadas actualmente.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-start justify-between p-4 bg-slate-950/50 border border-slate-800 rounded-xl hover:border-slate-700 transition-all group"
                >
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusIcon(task.status)}
                      <h4 className="text-sm font-semibold text-white truncate">{task.title}</h4>
                    </div>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                        task.status === "done" 
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" 
                          : "bg-slate-800 text-slate-400 border-slate-700"
                      }`}>
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
                  
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[10px] font-medium text-slate-300">
                      <Clock className="w-3 h-3 text-cyan-400" />
                      <span>{getElapsedTime(task.updatedAt || task.createdAt)}</span>
                    </div>
                    <span className="text-[9px] text-slate-600">
                      {new Date(task.updatedAt || task.createdAt).toLocaleDateString("es-ES")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/30 rounded-b-2xl">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Total de tareas asignadas: <strong className="text-white">{tasks.length}</strong></span>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}