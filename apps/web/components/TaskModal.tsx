// apps/web/components/TaskModal.tsx
"use client";
import { useState, useEffect } from "react";
import { X, Plus, AlertCircle, Circle, UserPlus, Users, Check, Trash2 } from "lucide-react";
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

interface InvitedMember {
  id: string;
  userId: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
  invitedAt: string;
}

export function TaskModal({ isOpen, onClose, onSave, initialData, listId, workspaceId }: TaskModalProps) {
  const [activeTab, setActiveTab] = useState<"details" | "activity" | "invited">("details");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("todo");
  const [priority, setPriority] = useState(2);
  const [dueDate, setDueDate] = useState("");
  const [selectedListId, setSelectedListId] = useState(listId || "");
  const [loading, setLoading] = useState(false);
  const [assigneeId, setAssigneeId] = useState<string | null>(initialData?.assigneeId || initialData?.assignee?.id || null);
  const [workspaceMembers, setWorkspaceMembers] = useState<any[]>([]);
  const [invitedMembers, setInvitedMembers] = useState<InvitedMember[]>([]);
  const [loadingInvited, setLoadingInvited] = useState(false);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || "");
      setDescription(initialData.description || "");
      setStatus(initialData.status || "todo");
      setPriority(initialData.priority ?? 2);
      setDueDate(initialData.dueDate ? new Date(initialData.dueDate).toISOString().split('T')[0] : "");
      setSelectedListId(initialData.listId || listId || "");
      setAssigneeId(initialData.assigneeId || initialData?.assignee?.id || null);
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
    setInvitedMembers([]);
  }, [initialData, isOpen, listId]);

  useEffect(() => {
    if (isOpen && workspaceId) {
      fetch(`/api/workspace/${workspaceId}/members`)
        .then(res => res.ok ? res.json() : [])
        .then(data => setWorkspaceMembers(Array.isArray(data) ? data : []))
        .catch(() => setWorkspaceMembers([]));
    }
  }, [isOpen, workspaceId]);

  // ✅ Cargar miembros invitados cuando se abre la pestaña "invited"
  useEffect(() => {
    if (isOpen && initialData?.id && activeTab === "invited") {
      fetchInvitedMembers();
    }
  }, [isOpen, initialData?.id, activeTab]);

  const fetchInvitedMembers = async () => {
    if (!initialData?.id) return;
    setLoadingInvited(true);
    try {
      const res = await fetch(`/api/tasks/${initialData.id}/members`);
      if (res.ok) {
        const data = await res.json();
        // ✅ Manejar tanto { members: [...] } como array directo
        const list = Array.isArray(data) ? data : (data.members || []);
        setInvitedMembers(list);
      } else {
        setInvitedMembers([]);
      }
    } catch (error) {
      console.error("Error cargando invitados:", error);
      setInvitedMembers([]);
    } finally {
      setLoadingInvited(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!initialData?.id) return;
    if (!confirm("¿Estás seguro de remover a este colaborador de la tarea?")) return;
    
    try {
      const res = await fetch(`/api/tasks/${initialData.id}/members?userId=${userId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchInvitedMembers();
      } else {
        const err = await res.json();
        alert(err.error || "Error al remover colaborador");
      }
    } catch (error) {
      console.error("Error removing member:", error);
      alert("Error al remover colaborador");
    }
  };

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

  if (!isOpen) return null;

  const activeListId = selectedListId || listId;
  const isSubtask = !!(initialData?.parentId || initialData?.parentTaskId);

  // ✅ Encontrar el nombre del usuario asignado
  const assignedUser = workspaceMembers.find((m: any) => 
    (m.user?.id || m.id) === assigneeId
  );
  const assignedUserName = assignedUser?.user?.name || assignedUser?.name || null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/40 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {isSubtask ? (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-purple-500/10 border border-purple-500/30 text-purple-400 text-[10px] font-semibold uppercase tracking-wider">
                  <Circle className="w-3 h-3" />
                  Subtarea
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] font-semibold uppercase tracking-wider">
                  <Circle className="w-3 h-3" />
                  Tarea Principal
                </span>
              )}
            </div>
            <h2 className="text-base font-bold text-white truncate">
              {initialData?.title || "Nueva Tarea"}
            </h2>
            {assigneeId && assignedUserName && (
              <div className="flex items-center gap-1.5 mt-1.5 px-2 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-lg">
                <UserPlus className="w-3 h-3 text-cyan-400" />
                <span className="text-[11px] text-cyan-300 font-medium">
                  Tarea asignada a: <strong>{assignedUserName}</strong>
                </span>
              </div>
            )}
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white ml-4 flex-shrink-0"
            title="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-4 px-5 py-3 border-b border-slate-800 bg-slate-950/20">
          <button
            onClick={() => setActiveTab("details")}
            className={`text-xs font-bold transition-colors pb-0.5 ${
              activeTab === "details" ? "text-cyan-400 border-b-2 border-cyan-400" : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Detalles
          </button>
          {initialData?.id && (
            <>
              <button
                onClick={() => setActiveTab("activity")}
                className={`text-xs font-bold transition-colors pb-0.5 ${
                  activeTab === "activity" ? "text-cyan-400 border-b-2 border-cyan-400" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Actividad
              </button>
              <button
                onClick={() => setActiveTab("invited")}
                className={`text-xs font-bold transition-colors pb-0.5 ${
                  activeTab === "invited" ? "text-cyan-400 border-b-2 border-cyan-400" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Invitados ({invitedMembers.length})
              </button>
            </>
          )}
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === "details" ? (
            <form onSubmit={handleSubmit} className="p-5 space-y-3">
              {!activeListId && (
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/25 rounded-xl text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>Selecciona una lista activa para crear la tarea.</span>
                </div>
              )}
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
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Descripción</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Añade detalles..."
                  rows={2}
                  className="w-full px-3.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-all resize-none"
                />
              </div>
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
                      return <option key={user.id} value={user.id}>{user.name || user.email}</option>;
                    })}
                  </select>
                  {assigneeId && (
                    <span className="text-[10px] text-emerald-400 mt-0.5 block">✓ Responsable asignado correctamente</span>
                  )}
                </div>
              )}
              <div className="grid grid-cols-3 gap-2 pt-0.5">
                <div>
                  <label className="block text-[10px] font-bold text-slate-300 mb-1">Estado</label>
                  <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none cursor-pointer">
                    {statusOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-300 mb-1">Prioridad</label>
                  <select value={priority} onChange={(e) => setPriority(Number(e.target.value))} className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none cursor-pointer">
                    {priorityOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-300 mb-1">Vencimiento</label>
                  <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="w-full px-2 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-[11px] text-white focus:outline-none" />
                </div>
              </div>
              <div className="flex gap-2 pt-3 border-t border-slate-800/80">
                <button type="button" onClick={onClose} className="flex-1 px-4 py-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all text-xs font-semibold">
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
          ) : activeTab === "invited" ? (
            // ✅ PESTAÑA SOLO DE VISUALIZACIÓN
            <div className="p-5 space-y-4">
              <div>
                <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-cyan-400" />
                  Colaboradores Invitados ({invitedMembers.length})
                </h4>
                
                {loadingInvited ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-6 w-6 border-2 border-cyan-500 border-t-transparent" />
                  </div>
                ) : invitedMembers.length === 0 ? (
                  <div className="text-center py-10 border border-dashed border-slate-700 rounded-xl bg-slate-950/30">
                    <Users className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                    <p className="text-xs text-slate-400 font-medium">No hay colaboradores invitados</p>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Los invitados podrán ver y colaborar en esta tarea
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {invitedMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 bg-slate-950/50 border border-slate-800 rounded-xl hover:border-slate-700 transition-all group"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {member.user.image ? (
                            <img
                              src={member.user.image}
                              alt={member.user.name || ""}
                              className="w-9 h-9 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                              {(member.user.name || member.user.email || "U").charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-white truncate">
                              {member.user.name || "Sin nombre"}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate">
                              {member.user.email}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveMember(member.userId)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          title="Remover colaborador"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-4">
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