"use client";
import { useState, useEffect } from "react";
import { X, Plus, AlertCircle, Circle, UserPlus, Users, Check } from "lucide-react";
import { ActivityTab } from "./ActivityTab";

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: any) => Promise<void>;
  initialData?: any;
  listId?: string;
  workspaceId?: string;
}

const priorityOptions = [
  { value: 0, label: "Ninguna", color: "text-slate-400" },
  { value: 1, label: "Baja", color: "text-blue-400" },
  { value: 2, label: "Media", color: "text-amber-400" },
  { value: 3, label: "Alta", color: "text-orange-400" },
  { value: 4, label: "Urgente", color: "text-rose-400" },
];

const statusOptions = [
  { value: "todo", label: "Por Hacer", color: "bg-slate-600" },
  { value: "in_progress", label: "En Progreso", color: "bg-blue-500" },
  { value: "done", label: "Completado", color: "bg-emerald-500" },
];

export function TaskModal({ isOpen, onClose, onSave, initialData, listId, workspaceId }: TaskModalProps) {
  const [activeTab, setActiveTab] = useState<"details" | "activity">("details");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("todo");
  const [priority, setPriority] = useState(2);
  const [dueDate, setDueDate] = useState("");
  const [selectedListId, setSelectedListId] = useState(listId || "");
  const [loading, setLoading] = useState(false);
  
  // ✅ NUEVOS ESTADOS PARA ASIGNAR RESPONSABLE E INVITAR
  const [assigneeId, setAssigneeId] = useState<string | null>(initialData?.assigneeId || initialData?.assignee?.id || null);
  const [workspaceMembers, setWorkspaceMembers] = useState<any[]>([]);
  const [inviteMemberId, setInviteMemberId] = useState("");
  const [invitedMembers, setInvitedMembers] = useState<any[]>([]);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || "");
      setDescription(initialData.description || "");
      setStatus(initialData.status || "todo");
      setPriority(initialData.priority ?? 2);
      setDueDate(initialData.dueDate ? new Date(initialData.dueDate).toISOString().split('T')[0] : "");
      setSelectedListId(initialData.listId || listId || "");
      setAssigneeId(initialData.assigneeId || initialData.assignee?.id || null);
    } else {
      setTitle("");
      setDescription("");
      setStatus("todo");
      setPriority(2);
      setDueDate("");
      setSelectedListId(listId || "");
      setAssigneeId(null);
    }
    setActiveTab("details");
  }, [initialData, isOpen, listId]);

  // ✅ OBTENER MIEMBROS DEL WORKSPACE
  useEffect(() => {
    if (isOpen && workspaceId) {
      fetch(`/api/workspace/${workspaceId}/members`)
        .then(res => res.ok ? res.json() : [])
        .then(data => setWorkspaceMembers(Array.isArray(data) ? data : []))
        .catch(() => setWorkspaceMembers([]));
    }
  }, [isOpen, workspaceId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetListId = selectedListId || listId;
    if (!title.trim() || !targetListId) return;

    setLoading(true);
    try {
      await onSave({
        id: initialData?.id,
        title: title.trim(),
        description: description.trim() || null,
        listId: targetListId,
        status,
        priority,
        dueDate: dueDate || null,
        assigneeId: assigneeId,
        parentId: initialData?.parentId || initialData?.parentTaskId || undefined,
        parentTaskId: initialData?.parentId || initialData?.parentTaskId || undefined,
      });
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ FUNCIÓN PARA INVITAR COLABORADOR
  const handleInviteMember = async () => {
    if (!inviteMemberId || !initialData?.id) return;
    
    try {
      const res = await fetch(`/api/tasks/${initialData.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: inviteMemberId }),
      });

      if (res.ok) {
        const member = workspaceMembers.find(m => (m.user?.id || m.id) === inviteMemberId);
        if (member) {
          setInvitedMembers(prev => [...prev, member.user || member]);
        }
        setInviteMemberId("");
        alert("Colaborador invitado exitosamente");
      } else {
        const err = await res.json();
        alert(err.error || "Error al invitar colaborador");
      }
    } catch (error) {
      console.error("Error inviting member:", error);
      alert("Error al invitar colaborador");
    }
  };

  if (!isOpen) return null;

  const activeListId = selectedListId || listId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab("details")}
              className={`text-sm font-medium transition-colors ${
                activeTab === "details" ? "text-cyan-400" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Detalles
            </button>
            {initialData?.id && (
              <button
                onClick={() => setActiveTab("activity")}
                className={`text-sm font-medium transition-colors ${
                  activeTab === "activity" ? "text-cyan-400" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Actividad
              </button>
            )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-hidden">
          {activeTab === "details" ? (
            <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-140px)]">
              {!activeListId && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Debes seleccionar una lista activa para crear una tarea en este espacio.</span>
                </div>
              )}

              {/* Título */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Título <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="¿Qué necesitas hacer?"
                  className="w-full px-4 py-2.5 bg-slate-950/50 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-all"
                  autoFocus
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Descripción
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Añade detalles..."
                  rows={3}
                  className="w-full px-4 py-2.5 bg-slate-950/50 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-all resize-none"
                />
              </div>

              {/* ✅ SECCIÓN 1: ASIGNAR RESPONSABLE */}
              {workspaceId && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-cyan-400" />
                    Asignar Responsable Principal
                  </label>
                  <select
                    value={assigneeId || ""}
                    onChange={(e) => setAssigneeId(e.target.value || null)}
                    className="w-full px-4 py-2.5 bg-slate-950/50 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-all appearance-none cursor-pointer"
                  >
                    <option value="">Sin asignar</option>
                    {workspaceMembers.map((m: any) => {
                      const user = m.user || m;
                      return (
                        <option key={user.id} value={user.id}>
                          {user.name || user.email}
                        </option>
                      );
                    })}
                  </select>
                  {assigneeId && (
                    <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Responsable asignado correctamente
                    </p>
                  )}
                </div>
              )}

              {/* ✅ SECCIÓN 2: INVITAR COLABORADORES */}
              {workspaceId && workspaceMembers.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2 flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-400" />
                    Invitar Colaboradores a la Tarea
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={inviteMemberId}
                      onChange={(e) => setInviteMemberId(e.target.value)}
                      className="flex-1 px-4 py-2.5 bg-slate-950/50 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500/50 transition-all appearance-none cursor-pointer"
                    >
                      <option value="">Seleccionar usuario...</option>
                      {workspaceMembers
                        .filter((m: any) => {
                          const userId = m.user?.id || m.id;
                          return userId !== assigneeId;
                        })
                        .map((m: any) => {
                          const user = m.user || m;
                          return (
                            <option key={user.id} value={user.id}>
                              {user.name || user.email}
                            </option>
                          );
                        })}
                    </select>
                    <button
                      type="button"
                      onClick={handleInviteMember}
                      disabled={!inviteMemberId || !initialData?.id}
                      className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-all font-medium flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Invitar
                    </button>
                  </div>
                  {invitedMembers.length > 0 && (
                    <div className="mt-2 space-y-1">
                      <p className="text-xs text-slate-400">Colaboradores invitados:</p>
                      {invitedMembers.map((member: any) => (
                        <div key={member.id} className="flex items-center gap-2 text-xs text-slate-300">
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>{member.name || member.email}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {!initialData?.id && (
                    <p className="text-xs text-slate-500 mt-1">
                      Guarda la tarea primero para poder invitar colaboradores.
                    </p>
                  )}
                </div>
              )}

              {/* Estado y Prioridad */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Estado
                  </label>
                  <div className="relative">
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-950/50 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-all appearance-none cursor-pointer"
                    >
                      {statusOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <Circle className="w-4 h-4 text-slate-500" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Prioridad
                  </label>
                  <div className="relative">
                    <select
                      value={priority}
                      onChange={(e) => setPriority(Number(e.target.value))}
                      className="w-full px-4 py-2.5 bg-slate-950/50 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-all appearance-none cursor-pointer"
                    >
                      {priorityOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      <AlertCircle className="w-4 h-4 text-slate-500" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Fecha de vencimiento */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Fecha de vencimiento
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-950/50 border border-slate-800 rounded-xl text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500/50 transition-all"
                />
              </div>

              {/* Botones */}
              <div className="flex gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-all font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || !title.trim() || !activeListId}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-all font-medium shadow-lg shadow-cyan-500/20"
                >
                  {loading ? "Guardando..." : initialData ? "Guardar cambios" : "Crear tarea"}
                </button>
              </div>
            </form>
          ) : (
            /* ✅ PESTAÑA ACTIVIDAD - CORREGIDO: Pasar workspaceId */
            <div className="h-full overflow-y-auto p-6">
              {initialData?.id ? (
                <ActivityTab 
                  taskId={initialData.id} 
                  workspaceId={workspaceId || ""}
                />
              ) : (
                <p className="text-center text-slate-500 text-sm py-8">
                  Guarda la tarea primero para ver la actividad y el chat.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}