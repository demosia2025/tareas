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
      } else {
        const err = await res.json();
        alert(err.error || "Error al invitar colaborador");
      }
    } catch (error) {
      console.error("Error inviting member:", error);
    }
  };

  if (!isOpen) return null;
  const activeListId = selectedListId || listId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      {/* Contenedor principal sin desbordamiento (overflow-hidden) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header compacto */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-950/20">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveTab("details")}
              className={`text-xs font-bold transition-colors pb-0.5 ${
                activeTab === "details" ? "text-cyan-400 border-b-2 border-cyan-400" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Detalles
            </button>
            {initialData?.id && (
              <button
                onClick={() => setActiveTab("activity")}
                className={`text-xs font-bold transition-colors pb-0.5 ${
                  activeTab === "activity" ? "text-cyan-400 border-b-2 border-cyan-400" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Actividad
              </button>
            )}
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Contenido */}
        <div className="flex-1">
          {activeTab === "details" ? (
            <form onSubmit={handleSubmit} className="p-5 space-y-3">
              {!activeListId && (
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/25 rounded-xl text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Selecciona una lista activa para crear la tarea.</span>
                </div>
              )}

              {/* Título */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Título <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="¿Qué necesitas hacer?"
                  className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-all"
                  autoFocus
                />
              </div>

              {/* Descripción compacta */}
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Descripción
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Añade detalles..."
                  rows={2}
                  className="w-full px-3.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-all resize-none"
                />
              </div>

              {/* Responsable Principal */}
              {workspaceId && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                    <UserPlus className="w-3.5 h-3.5 text-cyan-400" />
                    Asignar Responsable Principal
                  </label>
                  <select
                    value={assigneeId || ""}
                    onChange={(e) => setAssigneeId(e.target.value || null)}
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-cyan-500/50 cursor-pointer"
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
                    <span className="text-[10px] text-emerald-400 mt-0.5 block">✓ Responsable asignado correctamente</span>
                  )}
                </div>
              )}

              {/* Invitar Colaboradores */}
              {workspaceId && workspaceMembers.length > 0 && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-purple-400" />
                    Invitar Colaboradores
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={inviteMemberId}
                      onChange={(e) => setInviteMemberId(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-purple-500/50 cursor-pointer"
                    >
                      <option value="">Seleccionar usuario...</option>
                      {workspaceMembers
                        .filter((m: any) => (m.user?.id || m.id) !== assigneeId)
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
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" />
                      Invitar
                    </button>
                  </div>
                </div>
              )}

              {/* Fila en dos columnas para Estado, Prioridad y Fecha */}
              <div className="grid grid-cols-3 gap-2 pt-0.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-300 mb-1">Estado</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none cursor-pointer"
                  >
                    {statusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-300 mb-1">Prioridad</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none cursor-pointer"
                  >
                    {priorityOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-300 mb-1">Vencimiento</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-[11px] text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Botones de acción inferiores */}
              <div className="flex gap-2 pt-3 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || !title.trim() || !activeListId}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-white rounded-xl transition-all text-xs font-bold shadow-lg shadow-cyan-500/20"
                >
                  {loading ? "Guardando..." : initialData ? "Guardar cambios" : "Crear tarea"}
                </button>
              </div>
            </form>
          ) : (
            <div className="p-4 h-[350px] overflow-y-auto">
              {initialData?.id ? (
                <ActivityTab taskId={initialData.id} workspaceId={workspaceId || ""} />
              ) : (
                <p className="text-center text-slate-500 text-xs py-8">
                  Guarda la tarea primero para ver la actividad.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}