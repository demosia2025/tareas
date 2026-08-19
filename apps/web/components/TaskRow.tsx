"use client"

import { CheckCircle2, Circle, ChevronRight, ChevronDown, MoreHorizontal, Edit3, Trash2, Plus } from "lucide-react"

interface Task {
  id: string
  title: string
  status: string
  priority: number
  dueDate: string | null
  children?: Task[]
}

interface TaskRowProps {
  task: Task
  depth: number
  expandedTasks: Set<string>
  customFields: any[]
  onToggleExpand: (id: string) => void
  onToggleStatus: (id: string, status: string) => void
  onEdit: (task: Task) => void
  onDelete: (id: string) => void
  onCreateSubtask: (parentId: string) => void
}

export function TaskRow({ task, depth, expandedTasks, onToggleExpand, onToggleStatus, onEdit, onDelete, onCreateSubtask }: TaskRowProps) {
  const isExpanded = expandedTasks.has(task.id)
  const hasChildren = task.children && task.children.length > 0

  const priorityLabels = ["Ninguna", "Baja", "Media", "Alta", "Urgente"]
  const priorityColors = ["text-slate-400", "text-blue-400", "text-amber-400", "text-orange-400", "text-rose-400"]

  return (
    <div>
      <div 
        className="group flex items-center gap-3 p-3 rounded-xl hover:bg-slate-900/60 border border-transparent hover:border-slate-800 transition-all"
        style={{ paddingLeft: `${depth * 24 + 12}px` }}
      >
        {/* Expand/Collapse */}
        <button 
          onClick={() => hasChildren && onToggleExpand(task.id)}
          className={`w-5 h-5 flex items-center justify-center rounded hover:bg-slate-800 transition-colors ${hasChildren ? 'text-slate-400' : 'invisible'}`}
        >
          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>

        {/* Status Toggle */}
        <button 
          onClick={() => onToggleStatus(task.id, task.status === 'done' ? 'todo' : 'done')}
          className="flex-shrink-0 hover:scale-110 transition-transform"
        >
          {task.status === 'done' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          ) : (
            <Circle className="w-5 h-5 text-slate-600 group-hover:text-slate-400" />
          )}
        </button>

        {/* Task Info */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onEdit(task)}>
          <div className={`text-sm font-medium truncate ${task.status === 'done' ? 'line-through text-slate-500' : 'text-slate-200'}`}>
            {task.title}
          </div>
        </div>

        {/* Priority Badge */}
        <div className={`hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-md bg-slate-900 border border-slate-800 text-xs font-medium ${priorityColors[task.priority] || priorityColors[0]}`}>
          <span>{priorityLabels[task.priority] || "Ninguna"}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onCreateSubtask(task.id)} className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors" title="Añadir subtarea">
            <Plus className="w-4 h-4" />
          </button>
          <button onClick={() => onEdit(task)} className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors" title="Editar">
            <Edit3 className="w-4 h-4" />
          </button>
          <button onClick={() => onDelete(task.id)} className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors" title="Eliminar">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Subtareas */}
      {isExpanded && hasChildren && (
        <div>
          {task.children!.map(child => (
            <TaskRow
              key={child.id}
              task={child}
              depth={depth + 1}
              expandedTasks={expandedTasks}
              customFields={[]}
              onToggleExpand={onToggleExpand}
              onToggleStatus={onToggleStatus}
              onEdit={onEdit}
              onDelete={onDelete}
              onCreateSubtask={onCreateSubtask}
            />
          ))}
        </div>
      )}
    </div>
  )
}
