"use client";
import React, { useState, useRef, useEffect, useCallback, memo } from "react";
import { Layers, User, Calendar, ArrowRight, ArrowLeft, Eye, Clock, AlertCircle } from "lucide-react";

export interface Task {
  id: string;
  title: string;
  status: string;
  priority: number;
  dueDate: string | null;
  createdAt?: string;
  description?: string | null;
  listId?: string;
  listName?: string;
  spaceId?: string;
  parentTaskId?: string | null;
  parentId?: string | null;
  parent?: { id: string; title: string };
  creator?: { name?: string; email?: string };
  children?: Task[];
}

interface KanbanBoardProps {
  tasks: Task[];
  onUpdateStatus: (taskId: string, newStatus: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask?: (taskId: string) => void;
  onQuickUpdate?: (taskId: string, updates: { title?: string; dueDate?: string | null }) => void;
}

const toInputDate = (dateString: string | null | undefined): string => {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatPretty = (dateString: string | null | undefined): string => {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
};

const toISO = (dateString: string | null): string | null => {
  if (!dateString) return null;
  const d = new Date(dateString + 'T12:00:00');
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
};

export function KanbanBoard({ tasks, onUpdateStatus, onEditTask, onDeleteTask, onQuickUpdate }: KanbanBoardProps) {
  const columns = [
    { id: "todo", label: "Por hacer", color: "text-slate-400 border-slate-700/40" },
    { id: "in_progress", label: "En progreso", color: "text-cyan-400 border-cyan-500/30" },
    { id: "done", label: "Completado", color: "text-emerald-400 border-emerald-500/30" }
  ];

  const handleDragStart = useCallback((e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("text/plain", taskId);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("text/plain");
    if (taskId && onUpdateStatus) {
      await onUpdateStatus(taskId, targetStatus);
    }
  }, [onUpdateStatus]);

  const moveTask = useCallback(async (taskId: string, currentStatus: string, direction: 'left' | 'right') => {
    const statusOrder = ['todo', 'in_progress', 'done'];
    const currentIndex = statusOrder.indexOf(currentStatus);
    if (currentIndex === -1) return;
    const newIndex = direction === 'right' ? currentIndex + 1 : currentIndex - 1;
    if (newIndex >= 0 && newIndex < statusOrder.length) {
      if (onUpdateStatus) {
        await onUpdateStatus(taskId, statusOrder[newIndex]);
      }
    }
  }, [onUpdateStatus]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full min-h-[500px]">
      {columns.map((col, colIdx) => {
        const colTasks = tasks.filter((t: any) => t.status === col.id || (col.id === "todo" && (!t.status || t.status === "todo")));
        return (
          <div
            key={col.id}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, col.id)}
            className="flex flex-col rounded-2xl bg-slate-900/60 border border-slate-800/80 p-4 backdrop-blur-xl shadow-xl min-h-[450px]"
          >
            <div className="flex items-center justify-between mb-4 px-1">
              <h3 className={`text-xs font-bold uppercase tracking-wider flex items-center gap-2 ${col.color}`}>
                <span className="w-2 h-2 rounded-full bg-current" />
                {col.label}
              </h3>
              <span className="text-xs font-medium px-2 py-0.5 rounded-lg bg-slate-800/80 text-slate-400 border border-slate-700/50">
                {colTasks.length}
              </span>
            </div>
            <div className="space-y-3 flex-1 overflow-y-auto pr-1 custom-scrollbar">
              {colTasks.map((task: any) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  colId={col.id}
                  colIdx={colIdx}
                  columns={columns}
                  onUpdateStatus={onUpdateStatus}
                  onEditTask={onEditTask}
                  onDeleteTask={onDeleteTask}
                  moveTask={moveTask}
                  onQuickUpdate={onQuickUpdate}
                />
              ))}
              {colTasks.length === 0 && (
                <div className="h-28 border border-dashed border-slate-800/80 rounded-xl flex items-center justify-center text-xs text-slate-500 italic">
                  Sin tareas
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface TaskCardProps {
  task: any;
  colId: string;
  colIdx: number;
  columns: any[];
  onUpdateStatus: any;
  onEditTask: any;
  onDeleteTask?: any;
  moveTask: any;
  onQuickUpdate?: any;
}

const TaskCard = memo(({ task, colId, colIdx, columns, onUpdateStatus, onEditTask, onDeleteTask, moveTask, onQuickUpdate }: TaskCardProps) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [isEditingDate, setIsEditingDate] = useState(false);
  const [editDate, setEditDate] = useState(toInputDate(task.dueDate));
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [isOverdue, setIsOverdue] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const deadline = task.dueDate
        ? new Date(task.dueDate).getTime()
        : new Date(task.createdAt || Date.now()).getTime() + (48 * 60 * 60 * 1000);
      const now = new Date().getTime();
      const difference = deadline - now;
      if (difference <= 0) {
        setTimeLeft("¡Tiempo agotado!");
        setIsOverdue(true);
        return;
      }
      setIsOverdue(false);
      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);
      setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    };
    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [task.dueDate, task.createdAt]);

  useEffect(() => {
    if (isEditingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [isEditingTitle]);

  useEffect(() => {
    if (isEditingDate && dateInputRef.current) {
      dateInputRef.current.focus();
      dateInputRef.current.showPicker?.();
    }
  }, [isEditingDate]);

  // ✅ Guardar título con Enter o clic fuera
  const handleTitleSave = useCallback(() => {
    if (editTitle.trim() && editTitle.trim() !== task.title) {
      onQuickUpdate?.(task.id, { title: editTitle.trim() });
    } else {
      setEditTitle(task.title);
    }
    setIsEditingTitle(false);
  }, [editTitle, task.title, task.id, onQuickUpdate]);

  const handleDateSave = useCallback(() => {
    const newDate = toISO(editDate);
    const oldDateStr = toInputDate(task.dueDate);
    if (oldDateStr !== editDate) {
      onQuickUpdate?.(task.id, { dueDate: newDate });
    }
    setIsEditingDate(false);
  }, [editDate, task.dueDate, task.id, onQuickUpdate]);

  const handleDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setEditDate(newValue);
    const newDate = toISO(newValue);
    onQuickUpdate?.(task.id, { dueDate: newDate });
    setIsEditingDate(false);
  }, [task.id, onQuickUpdate]);

  const isSubtask = !!(task.parentId || task.parentTaskId);
  const parentName = task.parent?.title;
  const creatorName = task.creator?.name || task.creator?.email || "Usuario";
  const formattedDate = formatPretty(task.dueDate);
  const formattedCreatedAt = task.createdAt ? formatPretty(task.createdAt) : null;

  return (
    <div
      draggable
      onDragStart={(e) => {
        // ✅ No iniciar drag si estamos editando
        if (isEditingTitle || isEditingDate) {
          e.preventDefault();
          return;
        }
        e.dataTransfer.setData("text/plain", task.id);
      }}
      // ✅ REMOVIDO: onClick que abría el modal al hacer clic en toda la tarjeta
      className="group relative bg-slate-900/90 border border-slate-800/80 hover:border-cyan-500/40 rounded-xl p-3.5 cursor-grab active:cursor-grabbing transition-all duration-200 shadow-md hover:shadow-cyan-500/5"
    >
      {isSubtask && (
        <div className="flex items-center gap-1.5 text-[10px] text-purple-300 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded-md mb-2 w-fit">
          <Layers className="w-3 h-3 text-purple-400 shrink-0" />
          <span className="font-medium truncate max-w-[200px]">
            Subtarea de: {parentName}
          </span>
        </div>
      )}

      <div className="flex items-start justify-between gap-2 mb-2">
        {/* ✅ TÍTULO EDITABLE CON DOBLE CLIC */}
        {isEditingTitle ? (
          <input
            ref={titleInputRef}
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleTitleSave();
              }
              if (e.key === 'Escape') {
                setEditTitle(task.title);
                setIsEditingTitle(false);
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-slate-950 border border-cyan-500/50 rounded px-1.5 py-0.5 text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
          />
        ) : (
          <h4
            onDoubleClick={(e) => {
              e.stopPropagation();
              setEditTitle(task.title);
              setIsEditingTitle(true);
            }}
            className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-2 cursor-pointer flex-1"
            title="Doble clic para editar"
          >
            {task.title}
          </h4>
        )}

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {/* ✅ BOTÓN VER TAREA - ÚNICA FORMA DE ABRIR EL MODAL */}
          <button
            type="button"
            title="Ver tarea"
            onClick={(e) => {
              e.stopPropagation();
              onEditTask(task);
            }}
            className="p-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
          >
            <Eye className="w-3 h-3" />
          </button>

          {colIdx > 0 && (
            <button
              type="button"
              title="Mover atrás"
              onClick={(e) => {
                e.stopPropagation();
                moveTask(task.id, colId, 'left');
              }}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              <ArrowLeft className="w-3 h-3" />
            </button>
          )}

          {colIdx < columns.length - 1 && (
            <button
              type="button"
              title="Mover adelante"
              onClick={(e) => {
                e.stopPropagation();
                moveTask(task.id, colId, 'right');
              }}
              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
            >
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {task.description && (
        <p className="text-[11px] text-slate-400 line-clamp-2 mb-3 font-light">
          {task.description}
        </p>
      )}

      {timeLeft && (
        <div className={`mb-2 px-2 py-1 rounded-lg border text-[10px] font-bold w-fit flex items-center gap-1.5 ${
          isOverdue
            ? "bg-rose-500/10 border-rose-500/30 text-rose-400 animate-pulse"
            : "bg-slate-800 border-slate-700 text-slate-300"
        }`}>
          {isOverdue ? <AlertCircle className="w-3 h-3" /> : <Clock className="w-3 h-3 text-cyan-400" />}
          ⏰ {timeLeft}
        </div>
      )}

      {formattedCreatedAt && (
        <div className="mb-2 text-[9px] text-slate-500 flex items-center gap-1">
          <span>📅 Creada: {formattedCreatedAt}</span>
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-[10px] text-slate-400">
        <div className="flex items-center gap-1.5 truncate">
          <User className="w-3 h-3 text-cyan-400 shrink-0" />
          <span className="truncate max-w-[120px]" title={creatorName}>
            {creatorName}
          </span>
        </div>

        {isEditingDate ? (
          <input
            ref={dateInputRef}
            type="date"
            value={editDate}
            onChange={handleDateChange}
            onBlur={handleDateSave}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setEditDate(toInputDate(task.dueDate));
                setIsEditingDate(false);
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-950 border border-cyan-500/50 rounded px-1.5 py-0.5 text-[10px] text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/30"
          />
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditDate(toInputDate(task.dueDate));
              setIsEditingDate(true);
            }}
            className={`flex items-center gap-1 text-slate-300 bg-slate-950/40 px-2 py-0.5 rounded border border-slate-800 hover:border-cyan-500/50 transition-all ${
              formattedDate ? '' : 'text-slate-500'
            }`}
            title="Clic para editar fecha"
          >
            <Calendar className="w-3 h-3 text-cyan-400" />
            <span>{formattedDate || 'Sin fecha'}</span>
          </button>
        )}
      </div>
    </div>
  );
});

TaskCard.displayName = 'TaskCard';
export default KanbanBoard;