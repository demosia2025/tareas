"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"

interface Comment {
  id: string
  body?: string
  content?: string
  createdAt: string
  creatorId?: string
  userId?: string
  creator?: {
    id: string
    name: string | null
    email: string | null
  } | null
  user?: {
    id: string
    name: string | null
    email: string | null
  } | null
}

interface Task {
  id: string
  title: string
  description: string | null
  dueDate: string | null
  priority: "low" | "medium" | "high" | "urgent"
  status: string
  workspaceId: string
  createdAt: string
  updatedAt: string
  comments: Comment[]
  assignee?: {
    id: string
    name: string | null
    email: string | null
  } | null
}

export default function TaskDetails() {
  const params = useParams()
  const taskId = params.taskId as string
  
  const [task, setTask] = useState<Task | null>(null)
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState("")
  const [activeTab, setActiveTab] = useState<"details" | "activity">("details")
  const [isUpdating, setIsUpdating] = useState(false)

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    dueDate: "",
    priority: "medium" as Task["priority"],
    status: "todo"
  })

  useEffect(() => {
    if (taskId) {
      fetchTask()
    }
  }, [taskId])

  const fetchTask = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/tasks/${taskId}`)
      if (response.ok) {
        const data = await response.json()
        setTask(data)
        setFormData({
          title: data.title,
          description: data.description || "",
          dueDate: data.dueDate ? new Date(data.dueDate).toISOString().split('T')[0] : "",
          priority: data.priority || "medium",
          status: data.status || "todo"
        })
      }
    } catch (error) {
      console.error("Error fetching task:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateTask = async () => {
    try {
      setIsUpdating(true)
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      })
      
      if (response.ok) {
        await fetchTask()
        alert("Tarea actualizada correctamente")
      }
    } catch (error) {
      console.error("Error updating task:", error)
      alert("Error al actualizar la tarea")
    } finally {
      setIsUpdating(false)
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim()) return

    try {
      const response = await fetch(`/api/tasks/${taskId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment })
      })

      if (response.ok) {
        setNewComment("")
        await fetchTask()
      }
    } catch (error) {
      console.error("Error adding comment:", error)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "bg-red-500/20 text-red-400 border-red-500/40"
      case "high":
        return "bg-orange-500/20 text-orange-400 border-orange-500/40"
      case "medium":
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/40"
      case "low":
        return "bg-blue-500/20 text-blue-400 border-blue-500/40"
      default:
        return "bg-slate-500/20 text-slate-400 border-slate-500/40"
    }
  }

  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, string> = {
      urgent: "Urgente",
      high: "Alta",
      medium: "Media",
      low: "Baja"
    }
    return labels[priority] || priority
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
      </div>
    )
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center text-slate-400">Tarea no encontrada</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-cyan-500/20 text-cyan-400 rounded-lg text-sm font-medium border border-cyan-500/40">
                {task.id.slice(-6).toUpperCase()}
              </span>
              <span className={`px-3 py-1 rounded-lg text-sm font-medium border ${getPriorityColor(task.priority)}`}>
                {getPriorityLabel(task.priority)}
              </span>
            </div>
            <button
              onClick={() => window.history.back()}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors cursor-pointer"
            >
              Cerrar Detalles
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="flex gap-2 bg-slate-900/50 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setActiveTab("details")}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                  activeTab === "details"
                    ? "bg-cyan-600 text-white"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                Detalles
              </button>
              <button
                onClick={() => setActiveTab("activity")}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                  activeTab === "activity"
                    ? "bg-cyan-600 text-white"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                Actividad {task.comments.length > 0 && `(${task.comments.length})`}
              </button>
            </div>

            {activeTab === "details" ? (
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    TÍTULO DE LA TAREA
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20"
                    placeholder="Nueva tarea"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    FECHA DE VENCIMIENTO
                  </label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    PRIORIDAD
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as Task["priority"] })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20"
                  >
                    <option value="low">Baja</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                    <option value="urgent">Urgente</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    ESTADO
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20"
                  >
                    <option value="todo">Por Hacer</option>
                    <option value="inprogress">En Progreso</option>
                    <option value="review">Revisión</option>
                    <option value="done">Completado</option>
                  </select>
                </div>

                <button
                  onClick={handleUpdateTask}
                  disabled={isUpdating}
                  className="w-full px-4 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isUpdating ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            ) : (
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden">
                <div className="p-6 space-y-4 max-h-[500px] overflow-y-auto">
                  {task.comments.length === 0 ? (
                    <div className="text-center text-slate-500 py-8">
                      No hay comentarios aún
                    </div>
                  ) : (
                    task.comments.map((comment) => {
                      // 🛡️ Filtro estricto: Forzamos a que si el texto es un UUID largo o empieza con '@', se reemplace por "Usuario"
                      const rawName = comment.creator?.name || comment.user?.name || comment.creator?.email || comment.user?.email || "";
                      const isUuid = rawName.length > 20 || rawName.includes("-") || rawName.startsWith("@");
                      
                      const authorName = isUuid || !rawName ? "Usuario" : rawName;
                      const authorInitial = authorName.charAt(0).toUpperCase();
                      const commentBody = comment.body || comment.content || "";

                      return (
                        <div key={comment.id} className="flex gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                            {authorInitial}
                          </div>
                          
                          <div className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-white text-sm">
                                  {authorName}
                                </span>
                                <span className="text-xs text-slate-500">
                                  {new Date(comment.createdAt).toLocaleString('es-ES', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                            </div>
                            <p className="text-slate-300 text-sm whitespace-pre-wrap">{commentBody}</p>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>

                <div className="border-t border-slate-800 p-4">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleAddComment())}
                      placeholder="Escribe un comentario..."
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20"
                    />
                    <button
                      onClick={handleAddComment}
                      disabled={!newComment.trim()}
                      className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-lg transition-colors font-medium cursor-pointer"
                    >
                      Enviar
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-white mb-4">ATRIBUTOS</h3>
              
              <div className="space-y-4">
                {task.dueDate && (
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Vence</div>
                    <div className="text-sm text-white">
                      {new Date(task.dueDate).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                      })}
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-xs text-slate-500 mb-1">Prioridad</div>
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                    {getPriorityLabel(task.priority)}
                  </span>
                </div>

                <div>
                  <div className="text-xs text-slate-500 mb-1">Estado</div>
                  <div className="text-sm text-white capitalize">
                    {task.status === 'todo' && 'Por Hacer'}
                    {task.status === 'inprogress' && 'En Progreso'}
                    {task.status === 'review' && 'Revisión'}
                    {task.status === 'done' && 'Completado'}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-slate-500 mb-1">Creado</div>
                  <div className="text-sm text-slate-300">
                    {new Date(task.createdAt).toLocaleDateString('es-ES')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
