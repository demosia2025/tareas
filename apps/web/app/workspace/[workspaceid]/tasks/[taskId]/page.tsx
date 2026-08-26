// apps/web/app/workspace/[workspaceId]/tasks/[taskId]/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Clock, CheckCircle, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function TaskDetailsPage() {
  const params = useParams();
  const router = useRouter();
  
  // ✅ CORREGIDO: Soporta tanto mayúsculas como minúsculas en el nombre de la carpeta dinámica
  const workspaceId = (params.workspaceId || params.workspaceid) as string;
  const taskId = (params.taskId || params.taskid) as string;

  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("🔍 [DEBUG] useEffect ejecutado. workspaceId:", workspaceId, "taskId:", taskId);
    
    // ✅ CORREGIDO: Si faltan parámetros, detenemos la carga inmediatamente para evitar bucle infinito
    if (!taskId || !workspaceId) {
      console.warn("⚠️ [DEBUG] Faltan parámetros. Deteniendo carga.");
      setLoading(false);
      setError("Faltan parámetros de la ruta (workspaceId o taskId)");
      return;
    }
    
    fetchTask();
  }, [taskId, workspaceId]);

  const fetchTask = async () => {
    console.log("🚀 [DEBUG] Iniciando fetchTask para taskId:", taskId);
    try {
      setLoading(true);
      setError(null);
      
      const url = `/api/tasks?workspaceId=${workspaceId}`;
      console.log("🌐 [DEBUG] Haciendo petición a:", url);
      
      // ✅ CORREGIDO: Agregamos un timeout de 10 segundos por si la API se cuelga
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      
      console.log("📡 [DEBUG] Respuesta recibida. Status:", response.status);
      
      if (response.ok) {
        const tasks = await response.json();
        console.log("✅ [DEBUG] Tareas obtenidas:", tasks.length);
        const foundTask = tasks.find((t: any) => t.id === taskId);
        
        if (foundTask) {
          console.log("🎯 [DEBUG] Tarea encontrada:", foundTask.title);
          setTask(foundTask);
        } else {
          console.warn("❌ [DEBUG] La tarea no se encontró en la lista");
          setError("Tarea no encontrada en este workspace");
        }
      } else {
        console.error("❌ [DEBUG] Error en la respuesta:", response.status);
        setError(`Error al cargar la tarea (HTTP ${response.status})`);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error("💥 [DEBUG] La petición tardó demasiado (Timeout)");
        setError("La petición tardó demasiado. Intenta de nuevo.");
      } else {
        console.error("💥 [DEBUG] Error de red o excepción:", error);
        setError("Error de conexión");
      }
    } finally {
      console.log("🏁 [DEBUG] Finalizando fetchTask, estableciendo loading = false");
      setLoading(false); // ✅ Esto AHORA SIEMPRE se ejecuta
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-cyan-500 border-t-transparent mx-auto mb-4"></div>
          <p className="text-slate-400">Cargando detalles de la tarea...</p>
          <p className="text-xs text-slate-600 mt-2">ID: {taskId || "No ID"}</p>
          <p className="text-xs text-slate-600">Workspace: {workspaceId || "No ID"}</p>
        </div>
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-rose-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">{error || "Tarea no encontrada"}</h2>
          <div className="flex flex-col items-center gap-2">
            <Link
              href={`/workspace/${workspaceId}/assigned-users`}
              className="text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver a asignaciones
            </Link>
            <button 
              onClick={() => { setLoading(true); fetchTask(); }}
              className="text-sm text-slate-400 hover:text-white underline mt-2"
            >
              Reintentar carga
            </button>
          </div>
        </div>
      </div>
    );
  }

  const getPriorityColor = (priority: string) => {
    const p = parseInt(priority) || 2;
    if (p >= 4) return "bg-rose-500/20 text-rose-400 border-rose-500/40";
    if (p === 3) return "bg-orange-500/20 text-orange-400 border-orange-500/40";
    if (p === 2) return "bg-amber-500/20 text-amber-400 border-amber-500/40";
    return "bg-blue-500/20 text-blue-400 border-blue-500/40";
  };

  const getPriorityLabel = (priority: string) => {
    const p = parseInt(priority) || 2;
    if (p >= 4) return "Urgente";
    if (p === 3) return "Alta";
    if (p === 2) return "Media";
    return "Baja";
  };

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
              onClick={() => router.back()}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4 inline mr-2" />
              Volver
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">TÍTULO DE LA TAREA</label>
                <h1 className="text-2xl font-bold text-white">{task.title}</h1>
              </div>
              
              {task.description && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">DESCRIPCIÓN</label>
                  <p className="text-slate-200 whitespace-pre-wrap">{task.description}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {task.dueDate && (
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Vence</div>
                    <div className="text-sm text-white flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      {new Date(task.dueDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                )}
                {task.assignee && (
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Asignado a</div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-xs font-bold">
                        {(task.assignee.name || task.assignee.email || "U").charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm text-white">{task.assignee.name || task.assignee.email}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
              <h3 className="text-sm font-semibold text-white mb-4">ATRIBUTOS</h3>
              <div className="space-y-4">
                <div>
                  <div className="text-xs text-slate-500 mb-1">Estado</div>
                  <div className="text-sm text-white capitalize">
                    {task.status === 'todo' && 'Por Hacer'}
                    {task.status === 'in_progress' && 'En Progreso'}
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
  );
}