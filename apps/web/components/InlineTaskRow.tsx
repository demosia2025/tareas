"use client";
import { ChevronRight, ChevronDown, CheckCircle2, Circle, Plus, Edit3, Trash2, Calendar as CalendarIcon } from "lucide-react";

export interface Task {
  id: string;
  title: string;
  status: string;
  priority: number;
  dueDate: string | null;
  description?: string | null;
  customData?: string | null;
  children?: Task[];
  listId?: string;
  listName?: string;
  spaceId?: string;
  folderId?: string;
  parentTaskId?: string | null;
  parentId?: string | null;
}

interface InlineTaskRowProps {
  task: Task;
  depth?: number;
  expandedTasks: Set<string>;
  customFields: any[];
  onToggleExpand: (id: string) => void;
  onToggleStatus: (id: string, status: string) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onCreateSubtask: (parentId: string) => void;
}

export function InlineTaskRow({
  task, depth = 0, expandedTasks, customFields, onToggleExpand, onToggleStatus, onEdit, onDelete, onCreateSubtask
}: InlineTaskRowProps) {
  const hasChildren = task.children && task.children.length > 0;
  const isExpanded = expandedTasks.has(task.id);

  const priorityConfig: Record<number, { label: string; dotColor: string; pillStyle: string }> = {
    1: { label: "Baja", dotColor: "bg-slate-400", pillStyle: "text-slate-400 bg-slate-800/40 border-slate-700/40" },
    2: { label: "Media", dotColor: "bg-cyan-400", pillStyle: "text-cyan-300 bg-cyan-500/10 border-cyan-500/20" },
    3: { label: "Alta", dotColor: "bg-amber-400", pillStyle: "text-amber-300 bg-amber-500/10 border-amber-500/20" },
    4: { label: "Urgente", dotColor: "bg-rose-500", pillStyle: "text-rose-300 bg-rose-500/15 border-rose-500/30 shadow-sm shadow-rose-500/10" },
  };

  const priority = priorityConfig[task.priority] || priorityConfig[1];
  const formattedDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString('es-ES', { timeZone: 'UTC', month: 'short', day: 'numeric' }) : null;

  return (
    <div className="flex flex-col relative group/row">
      {depth > 0 && <div className="absolute top-0 bottom-1/2 w-px bg-slate-800/60 pointer-events-none" style={{ left: `${(depth * 28) - 14}px` }} />}
      <div onClick={() => onEdit(task)} className={`group relative flex items-center justify-between py-2 px-3.5 my-1 rounded-xl transition-all duration-300 border cursor-pointer backdrop-blur-xl ${task.status === 'done' ? 'bg-slate-950/30 border-slate-900/60 opacity-40 hover:opacity-70' : 'bg-slate-900/60 hover:bg-slate-900/90 border-slate-800/70 hover:border-cyan-500/30 shadow-xl shadow-black/20 hover:shadow-cyan-500/5'}`} style={{ marginLeft: `${depth * 28}px` }}>
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-cyan-500/0 via-cyan-500/[0.03] to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        <div className="flex items-center gap-3 min-w-0 flex-1 mr-4 relative z-10">
          {hasChildren ? (
            <button onClick={(e) => { e.stopPropagation(); onToggleExpand(task.id); }} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all shrink-0">
              {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-cyan-400" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          ) : <div className="w-5 shrink-0" />}
          <button onClick={(e) => { e.stopPropagation(); onToggleStatus(task.id, task.status === 'done' ? 'todo' : 'done'); }} className="text-slate-500 hover:text-cyan-400 transition-all transform hover:scale-110 shrink-0">
            {task.status === 'done' ? <CheckCircle2 className="w-4 h-4 text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.3)]" /> : <Circle className="w-4 h-4 hover:border-cyan-400 hover:bg-cyan-500/10 rounded-full transition-colors" />}
          </button>
          <div className="flex flex-col min-w-0 flex-1">
            <div className={`px-3 py-1 rounded-xl border w-fit max-w-full shadow-lg transition-all ${task.status === 'done' ? 'line-through text-slate-500 bg-slate-950/20 border-slate-900 font-normal shadow-none' : 'text-white bg-gradient-to-r from-cyan-500 via-cyan-600 to-blue-600 border-cyan-400/30 shadow-cyan-500/20 font-bold'}`}>
              <span className="text-xs tracking-tight truncate block">{task.title}</span>
            </div>
            {task.description && <span className="text-[11px] text-slate-400/70 truncate mt-1 font-light px-3">{task.description}</span>}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 relative z-10">
          {formattedDate && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950/40 border border-slate-800/80 text-[11px] font-medium text-slate-300 shadow-sm">
              <CalendarIcon className="w-3 h-3 text-cyan-400" /><span>{formattedDate}</span>
            </div>
          )}
          <div className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg border text-[11px] font-medium ${priority.pillStyle}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${priority.dotColor} shadow-sm`} />
            <span className="hidden sm:inline">{priority.label}</span>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover/row:opacity-100 transition-all duration-200 translate-x-1 group-hover/row:translate-x-0">
            <button onClick={(e) => { e.stopPropagation(); onCreateSubtask(task.id); }} title="Añadir subtarea" className="p-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-[11px] flex items-center gap-1 transition-all border border-slate-700 shadow-sm hover:border-cyan-500/50">
              <Plus className="w-3 h-3 text-cyan-400" /><span className="hidden md:inline font-light">Sub</span>
            </button>
            <button onClick={(e) => { e.stopPropagation(); onEdit(task); }} title="Editar" className="p-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 transition-all border border-slate-700 shadow-sm hover:border-cyan-500/50">
              <Edit3 className="w-3 h-3" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(task.id); }} title="Eliminar" className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-all border border-rose-500/20 shadow-sm">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
      {hasChildren && isExpanded && (
        <div className="space-y-1 relative animate-in fade-in slide-in-from-top-1 duration-200 mt-0.5">
          {task.children!.map((childTask) => (
            <InlineTaskRow key={childTask.id} task={childTask} depth={depth + 1} expandedTasks={expandedTasks} customFields={customFields} onToggleExpand={onToggleExpand} onToggleStatus={onToggleStatus} onEdit={onEdit} onDelete={onDelete} onCreateSubtask={onCreateSubtask} />
          ))}
        </div>
      )}
    </div>
  );
}