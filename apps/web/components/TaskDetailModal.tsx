"use client";
import { useState, useEffect } from "react";
import { Send, Paperclip, X, FileText, Check, Users, MessageSquare, UserPlus, Plus, Circle, ChevronRight, ArrowLeft, Clock, Trash2 } from "lucide-react";
import AssigneeSelector from "@/components/AssigneeSelector";
import { ActivityTab } from "@/components/ActivityTab"; // 👈 Importado correctamente

interface TaskDetailModalProps {
  taskId: string;
  workspaceId: string;
  onClose: () => void;
}

interface TaskMember {
  id: string;
  userId: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
  invitedAt: string;
  timeAgo: string;
}

export function TaskDetailModal({ taskId, workspaceId, onClose }: TaskDetailModalProps) {
  const [taskStack, setTaskStack] = useState<{ id: string; title: string; listId?: string }[]>([]);
  const currentTask = taskStack.length > 0 ? taskStack[taskStack.length - 1] : { id: taskId, title: "Cargando..." };
  const [activeTab, setActiveTab] = useState<"details" | "subtasks" | "activity">("details");
  const [comments, setComments] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [members, setMembers] = useState<any[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [currentAssigneeId, setCurrentAssigneeId] = useState<string | null>(null);
  const [subtasks, setSubtasks] = useState<any[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [listId, setListId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  
  const [taskMembers, setTaskMembers] = useState<TaskMember[]>([]);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [workspaceMembers, setWorkspaceMembers] = useState<any[]>([]);

  useEffect(() => {
    if (currentTask.id) {
      fetchData(currentTask.id);
      fetchTaskMembers(currentTask.id);
      fetchWorkspaceMembers();
    }
  }, [currentTask.id, workspaceId]);

  const fetchData = async (targetTaskId: string) => {
    try {
      setLoading(true);
      const chatRes = await fetch(`/api/activities?taskId=${targetTaskId}`);
      if (chatRes.ok) {
        const data = await chatRes.json();
        setComments(data.comments || []);
        setAttachments(data.attachments || []);
        if (data.task) {
          if (data.task.listId) setListId(data.task.listId);
          if (data.task.assigneeId) setCurrentAssigneeId(data.task.assigneeId);
          if (taskStack.length === 0) {
            setTaskStack([{ id: targetTaskId, title: data.task.title, listId: data.task.listId }]);
          }
        }
      }
      const subRes = await fetch(`/api/tasks?listId=${listId || 'placeholder'}&parentId=${targetTaskId}`);
      if (subRes.ok) {
        const subData = await subRes.json();
        setSubtasks(Array.isArray(subData) ? subData : []);
      }
      const memRes = await fetch(`/api/workspace/${workspaceId}/members`);
      if (memRes.ok) {
        const memData = await memRes.json();
        setMembers(Array.isArray(memData) ? memData : []);
      }
    } catch (error) {
      console.error("Error cargando datos:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTaskMembers = async (targetTaskId: string) => {
    try {
      const res = await fetch(`/api/tasks/${targetTaskId}/members`);
      if (res.ok) {
        const data = await res.json();
        setTaskMembers(data.members || []);
        if (data.assignee) {
          setCurrentAssigneeId(data.assignee.id);
        }
      }
    } catch (error) {
      console.error("Error fetching task members:", error);
    }
  };

  const fetchWorkspaceMembers = async () => {
    try {
      if (!workspaceId) return;
      const res = await fetch(`/api/workspace/${workspaceId}/members`);
      if (res.ok) {
        const data = await res.json();
        setWorkspaceMembers(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Error fetching workspace members:", error);
    }
  };

  const handleInviteCollaborator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;
    try {
      const res = await fetch(`/api/tasks/${currentTask.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUserId }),
      });
      if (res.ok) {
        setSelectedUserId("");
        setShowInviteForm(false);
        await fetchTaskMembers(currentTask.id);
      } else {
        const err = await res.json();
        alert(err.error || "No se pudo invitar al colaborador");
      }
    } catch (error) {
      console.error("Error inviting collaborator:", error);
      alert("Error al invitar el colaborador");
    }
  };

  const handleRemoveCollaborator = async (userId: string) => {
    if (!confirm("¿Eliminar este colaborador de la tarea?")) return;
    try {
      const res = await fetch(`/api/tasks/${currentTask.id}/members?userId=${userId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchTaskMembers(currentTask.id);
      } else {
        alert("No se pudo eliminar el colaborador");
      }
    } catch (error) {
      console.error("Error removing collaborator:", error);
      alert("Error al eliminar el colaborador");
    }
  };

  const handleCreateSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim() || !listId) return;
    try {
      const res = await fetch(`/api/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newSubtaskTitle.trim(),
          listId,
          workspaceId,
          parentId: currentTask.id,
        }),
      });
      if (res.ok) {
        const newSub = await res.json();
        setSubtasks((prev) => [newSub, ...prev]);
        setNewSubtaskTitle("");
      } else {
        const err = await res.json();
        alert(err.error || "No se pudo crear la subtarea");
      }
    } catch (error) {
      console.error("Error creando subtarea:", error);
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    try {
      const res = await fetch(`/api/workspace/${workspaceId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail }),
      });
      if (res.ok) {
        const newMember = await res.json();
        setMembers((prev) => [...prev, newMember]);
        setInviteEmail("");
        alert("Usuario invitado exitosamente al workspace.");
      }
    } catch (error) {
      console.error("Error en invitación:", error);
    }
  };

  const getElapsedTimeColor = (timeAgo: string) => {
    if (timeAgo.includes("min")) return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    if (timeAgo.includes("hora")) return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    if (timeAgo.includes("día")) return "text-orange-400 bg-orange-500/10 border-orange-500/20";
    return "text-slate-400 bg-slate-500/10 border-slate-500/20";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl h-[88vh] flex flex-col shadow-2xl overflow-hidden text-slate-200">
        {/* Cabecera y Navegación */}
        <div className="px-6 pt-4 border-b border-slate-800 flex flex-col gap-2">
          {taskStack.length > 1 && (
            <button
              onClick={() => setTaskStack((prev) => prev.slice(0, prev.length - 1))}
              className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 w-fit font-medium transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Regresar a la tarea anterior
            </button>
          )}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white truncate max-w-lg">{currentTask.title}</h3>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-6 mt-2">
            <button
              onClick={() => setActiveTab("details")}
              className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${activeTab === "details" ? "border-cyan-500 text-cyan-400" : "border-transparent text-slate-400 hover:text-slate-200"}`}
            >
              <Users className="w-3.5 h-3.5" />
              Detalles y Miembros
            </button>
            <button
              onClick={() => setActiveTab("subtasks")}
              className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${activeTab === "subtasks" ? "border-cyan-500 text-cyan-400" : "border-transparent text-slate-400 hover:text-slate-200"}`}
            >
              <Plus className="w-3.5 h-3.5" />
              Subtareas ({subtasks.length})
            </button>
            <button
              onClick={() => setActiveTab("activity")}
              className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${activeTab === "activity" ? "border-cyan-500 text-cyan-400" : "border-transparent text-slate-400 hover:text-slate-200"}`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Actividad y Chat
            </button>
          </div>
        </div>

        {/* Contenido Dinámico por Pestañas */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center h-full text-xs text-slate-400">Cargando información...</div>
          ) : activeTab === "details" ? (
            <div className="space-y-6">
              {/* SECCIÓN 1: ASIGNAR RESPONSABLE PRINCIPAL */}
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
                  <UserPlus className="w-4 h-4 text-cyan-400" />
                  Responsable Principal (Asignar)
                </h4>
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                  <AssigneeSelector
                    taskId={currentTask.id}
                    workspaceId={workspaceId}
                    currentAssigneeId={currentAssigneeId}
                    onAssigneeChanged={(newId) => {
                      setCurrentAssigneeId(newId);
                      fetchTaskMembers(currentTask.id);
                    }}
                  />
                </div>
              </div>

              {/* SECCIÓN 2: INVITAR COLABORADORES A LA TAREA */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-400" />
                    Colaboradores Invitados ({taskMembers.length})
                  </h4>
                  <button
                    onClick={() => setShowInviteForm(!showInviteForm)}
                    className="px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-lg text-xs font-semibold text-purple-400 transition-colors cursor-pointer"
                  >
                    {showInviteForm ? "Cancelar" : "+ Invitar"}
                  </button>
                </div>
                {showInviteForm && (
                  <form onSubmit={handleInviteCollaborator} className="mb-4 p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
                    <label className="block text-xs font-semibold text-slate-400">
                      Seleccionar usuario del workspace:
                    </label>
                    <select
                      value={selectedUserId}
                      onChange={(e) => setSelectedUserId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500/50"
                    >
                      <option value="">Seleccionar...</option>
                      {workspaceMembers
                        .filter((m) => {
                          const userId = m.user?.id || m.id;
                          const isAlreadyMember = taskMembers.some((tm) => tm.userId === userId);
                          const isAssignee = currentAssigneeId === userId;
                          return !isAlreadyMember && !isAssignee;
                        })
                        .map((m) => {
                          const userObj = m.user || m;
                          return (
                            <option key={userObj.id} value={userObj.id}>
                              {userObj.name || userObj.email}
                            </option>
                          );
                        })}
                    </select>
                    <button
                      type="submit"
                      disabled={!selectedUserId}
                      className="w-full px-3 py-2 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-400 hover:to-pink-500 text-white rounded-lg text-xs font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      Invitar como colaborador
                    </button>
                  </form>
                )}
                {taskMembers.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs">
                    <UserPlus className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No hay colaboradores invitados</p>
                    <p className="text-[10px] mt-1">Haz clic en "+ Invitar" para agregar miembros</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {taskMembers.map((member) => (
                      <div key={member.id} className="flex items-center justify-between p-3 bg-slate-950/40 border border-slate-800 rounded-xl hover:border-slate-700 transition-all group">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="relative">
                            {member.user.image ? (
                              <img src={member.user.image} alt={member.user.name || ""} className="w-9 h-9 rounded-full object-cover" />
                            ) : (
                              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center text-white text-xs font-bold">
                                {(member.user.name || member.user.email || "M").charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{member.user.name || "Sin nombre"}</p>
                            <p className="text-[10px] text-slate-400 truncate">{member.user.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-medium ${getElapsedTimeColor(member.timeAgo)}`}>
                            <Clock className="w-3 h-3" />
                            <span>{member.timeAgo}</span>
                          </div>
                          <button
                            onClick={() => handleRemoveCollaborator(member.userId)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                            title="Eliminar invitación"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Invitación de Usuarios al Workspace */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-2">
                  <UserPlus className="w-3.5 h-3.5 text-cyan-400" />
                  Invitar usuario al Workspace
                </h4>
                <form onSubmit={handleInviteUser} className="flex gap-2">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="correo@ejemplo.com"
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                  />
                  <button type="submit" className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold">
                    Invitar
                  </button>
                </form>
              </div>

              {/* Lista de Miembros del Workspace */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Miembros de la Organización</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {members.map((member) => {
                    const userObj = member.user || member;
                    const isAssigned = currentAssigneeId === userObj.id;
                    return (
                      <div
                        key={userObj.id}
                        className={`flex items-center justify-between p-3 rounded-xl border text-xs font-medium transition-all ${isAssigned ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-400" : "bg-slate-950/50 border-slate-800 text-slate-300"}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-xs text-white font-bold">
                            {userObj.name?.[0]?.toUpperCase() || "U"}
                          </div>
                          <div className="text-left">
                            <p className="font-semibold text-white">{userObj.name || "Sin nombre"}</p>
                            <p className="text-[10px] text-slate-400">{userObj.email}</p>
                          </div>
                        </div>
                        {isAssigned && <Check className="w-4 h-4 text-cyan-400" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : activeTab === "subtasks" ? (
            <div className="space-y-4">
              <form onSubmit={handleCreateSubtask} className="flex gap-2">
                <input
                  type="text"
                  value={newSubtaskTitle}
                  onChange={(e) => setNewSubtaskTitle(e.target.value)}
                  placeholder="Crear subtarea interna..."
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
                />
                <button type="submit" className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5">
                  <Plus className="w-4 h-4" />
                  Añadir
                </button>
              </form>
              <div className="space-y-2">
                {subtasks.length === 0 ? (
                  <p className="text-center text-xs text-slate-500 py-8">No hay subtareas en este nivel.</p>
                ) : (
                  subtasks.map((sub) => (
                    <div
                      key={sub.id}
                      onClick={() => setTaskStack((prev) => [...prev, { id: sub.id, title: sub.title, listId: sub.listId }])}
                      className="flex items-center justify-between p-3 bg-slate-950/40 hover:bg-slate-800/50 border border-slate-800 rounded-xl cursor-pointer transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <Circle className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                        <span className="text-xs font-semibold text-slate-200">{sub.title}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-300">Entrar y gestionar</span>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            /* 👈 SECCIÓN DE ACTIVIDAD INTEGRADA CORRECTAMENTE CON ActivityTab */
            <ActivityTab 
              taskId={currentTask.id} 
              workspaceId={workspaceId} 
            />
          )}
        </div>
      </div>
    </div>
  );
}