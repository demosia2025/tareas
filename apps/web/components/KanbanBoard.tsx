"use client";

import { useMemo, useState, useRef } from "react";
import { Calendar, Pencil } from "lucide-react";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: number;
  dueDate: string | null;
  description?: string | null;
  children?: Task[];
}

interface KanbanBoardProps {
  tasks: Task[];
  onUpdateStatus: (taskId: string, newStatus: string) => void;
  onEditTask?: (task: Task) => void;
}

export function KanbanBoard({ tasks, onUpdateStatus, onEditTask }: KanbanBoardProps) {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const justDroppedRef = useRef(false);

  const columns = [
    { id: "todo", title: "Por hacer", color: "from-slate-500/20 to-slate-600/10", border: "border-slate-800", headerColor: "text-slate-300", dot: "bg-slate-400" },
    { id: "in_progress", title: "En progreso", color: "from-cyan-500/15 to-blue-600/10", border: "border-cyan-500/20", headerColor: "text-cyan-300", dot: "bg-cyan-400" },
    { id: "done", title: "Completadas", color: "from-emerald-500/15 to-teal-600/10", border: "border-emerald-500/20", headerColor: "text-emerald-300", dot: "bg-emerald-400" },
  ];

  const tasksByStatus = useMemo(() => {
    const map: Record<string, Task[]> = {
      todo: [],
      in_progress: [],
      done: []
    };

    tasks.forEach(task => {
      const status = task.status === 'in_progress' || task.status === 'doing' ? 'in_progress' : task.status === 'done' ? 'done' : 'todo';
      if (map[status]) {
        map[status].push(task);
      } else {
        map['todo'].push(task);
      }
    });

    return map;
  }, [tasks]);

  const priorityConfig: Record<number, { label: string; dotColor: string; pillStyle: string }> = {
    1: { label: "Baja", dotColor: "bg-slate-400", pillStyle: "text-slate-400 bg-slate-800/40 border-slate-700/40" },
    2: { label: "Media", dotColor: "bg-cyan-400", pillStyle: "text-cyan-300 bg-cyan-500/10 border-cyan-500/20" },
    3: { label: "Alta", dotColor: "bg-amber-400", pillStyle: "text-amber-300 bg-amber-500/10 border-amber-500/20" },
    4: { label: "Urgente", dotColor: "bg-rose-500", pillStyle: "text-rose-300 bg-rose-500/15 border-rose-500/30" },
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.stopPropagation();
    justDroppedRef.current = false;
    setDraggedTaskId(taskId);
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverColumn !== columnId) {
      setDragOverColumn(columnId);
    }
  };

  const handleDragLeave = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    if (dragOverColumn === columnId) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    setDragOverColumn(null);
    justDroppedRef.current = true;
    
    setTimeout(() => {
      justDroppedRef.current = false;
    }, 300);

    const taskId = e.dataTransfer.getData("text/plain") || draggedTaskId;
    
    if (taskId) {
      onUpdateStatus(taskId, targetStatus);
    }
    setDraggedTaskId(null);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full pb-4 overflow-x-auto min-w-[768px] lg:min-w-0">
      {columns.map(column => {
        const columnTasks = tasksByStatus[column.id] || [];
        const isTargeted = dragOverColumn === column.id;

        return (
          <div 
            key={column.id}
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDragLeave={(e) => handleDragLeave(e, column.id)}
            onDrop={(e) => handleDrop(e, column.id)}
            className={`flex flex-col rounded-2xl bg-gradient-to-b ${column.color} border ${isTargeted ? 'border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.15)] bg-slate-900/85' : column.border} backdrop-blur-xl shadow-2xl overflow-hidden max-h-full transition-all duration-200`}
          >
            {/* Cabecera de columna */}
            <div className="px-4 py-3.5 border-b border-slate-800/80 bg-slate-900/60 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <span className={`w-2.5 h-2.5 rounded-full ${column.dot} shadow-sm`} />
                <h3 className={`text-xs font-bold uppercase tracking-wider ${column.headerColor}`}>
                  {column.title}
                </h3>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-slate-800/80 border border-slate-700/60 text-[11px] font-bold text-slate-300 shadow-inner">
                {columnTasks.length}
              </span>
            </div>

            {/* Lista de tarjetas */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
              {columnTasks.map(task => {
                const priority = priorityConfig[task.priority] || priorityConfig[1];
                const formattedDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString('es-ES', { timeZone: 'UTC', month: 'short', day: 'numeric' }) : null;
                const isDragging = draggedTaskId === task.id;

                return (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    onDragEnd={() => {
                      setDraggedTaskId(null);
                      justDroppedRef.current = true;
                      setTimeout(() => {
                        justDroppedRef.current = false;
                      }, 300);
                    }}
                    onClick={(e) => {
                      if (justDroppedRef.current) return;
                      // Si hacen clic en la tarjeta, abrimos la edición
                      if (onEditTask) onEditTask(task);
                    }}
                    className={`group relative bg-slate-900/90 hover:bg-slate-900 border ${isDragging ? 'opacity-40 border-dashed border-cyan-500' : 'border-slate-800/80 hover:border-cyan-500/40'} rounded-xl p-3.5 shadow-xl transition-all duration-200 cursor-pointer backdrop-blur-md hover:shadow-cyan-500/5 hover:-translate-y-0.5`}
                  >
                    <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500/0 via-cyan-500/[0.02] to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                    {/* Botón flotante explícito de edición para garantizar el acceso directo */}
                    {onEditTask && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation(); // Evita que se propague al div contenedor
                          if (!justDroppedRef.current) {
                            onEditTask(task);
                          }
                        }}
                        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-slate-300 transition-all shadow-md z-20"
                        title="Editar tarea"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}

                    <div className="flex items-start justify-between gap-2 mb-2 relative z-10 pr-6">
                      <h4 className={`text-xs font-bold leading-snug transition-colors ${task.status === 'done' ? 'line-through text-slate-500' : 'text-white group-hover:text-cyan-300'}`}>
                        {task.title}
                      </h4>
                    </div>

                    {task.description && (
                      <p className="text-[11px] text-slate-400/80 line-clamp-2 mb-3 font-light relative z-10">
                        {task.description}
                      </p>
                    )}

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/60 relative z-10 text-[11px]">
                      <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border font-medium ${priority.pillStyle}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${priority.dotColor}`} />
                        <span>{priority.label}</span>
                      </div>

                      {formattedDate && (
                        <div className="flex items-center gap-1 text-slate-400 font-medium bg-slate-950/40 px-2 py-0.5 rounded-lg border border-slate-800/80">
                          <Calendar className="w-3 h-3 text-cyan-400" />
                          <span>{formattedDate}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {columnTasks.length === 0 && (
                <div className="h-32 flex flex-col items-center justify-center border-2 border-dashed border-slate-800/60 rounded-xl text-center p-4">
                  <p className="text-xs text-slate-500 font-light">Arrastra tareas aquí</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}