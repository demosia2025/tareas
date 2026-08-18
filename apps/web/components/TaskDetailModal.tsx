"use client";

import { useState, useEffect } from "react";
import { Send, Paperclip, X, FileText, Check, Users, MessageSquare, UserPlus, Plus, Circle, ChevronRight, ArrowLeft } from "lucide-react";
import AssigneeSelector from "@/components/AssigneeSelector";
import TaskLabelsManager from "@/components/TaskLabelsManager";

interface TaskDetailModalProps {
  taskId: string;
  workspaceId: string;
  onClose: () => void;
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
  const [currentTaskLabels, setCurrentTaskLabels] = useState<any[]>([]);
  
  const [subtasks, setSubtasks] = useState<any[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [listId, setListId] = useState<string>("");

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentTask.id) {
      fetchData(currentTask.id);
    }
  }, [currentTask.id]);

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
          if (data.task.labels) setCurrentTaskLabels(data.task.labels);
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

  const handleSend = async (e: React.FormEvent, fileData?: { name: string; url: string; type: string; size: number }) => {
    if (e) e.preventDefault();
    if (!newComment.trim() && !fileData) return;

    try {
      const res = await fetch(`/api/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: currentTask.id,
          body: newComment,
          file: fileData || null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.comment) setComments((prev) => [...prev, data.comment]);
        if (data.attachment) setAttachments((prev) => [...prev, data.attachment]);
        setNewComment("");
      }
    } catch (error) {
      console.error("Error enviando mensaje:", error);
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
        alert("Usuario invitado exitosamente.");
      }
    } catch (error) {
      console.error("Error en invitación:", error);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fakeUrl = URL.createObjectURL(file);
    handleSend(undefined as any, {
      name: file.name,
      url: fakeUrl,
      type: file.type,
      size: file.size,
    });
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
            <h3 className="text-sm font-bold text-white truncate max-w-lg">
              {currentTask.title}
            </h3>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-6 mt-2">
            <button
              onClick={() => setActiveTab("details")}
              className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
                activeTab === "details" ? "border-cyan-500 text-cyan-400" : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Detalles y Miembros
            </button>
            <button
              onClick={() => setActiveTab("subtasks")}
              className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
                activeTab === "subtasks" ? "border-cyan-500 text-cyan-400" : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              Subtareas ({subtasks.length})
            </button>
            <button
              onClick={() => setActiveTab("activity")}
              className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-2 ${
                activeTab === "activity" ? "border-cyan-500 text-cyan-400" : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
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
              {/* Selector de Asignados */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <AssigneeSelector
                  taskId={currentTask.id}
                  workspaceId={workspaceId}
                  currentAssigneeId={currentAssigneeId}
                  onAssigneeChanged={(newId) => setCurrentAssigneeId(newId)}
                />
              </div>

              {/* Administrador de Etiquetas */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800">
                <TaskLabelsManager
                  taskId={currentTask.id}
                  workspaceId={workspaceId}
                  currentLabels={currentTaskLabels}
                  onLabelsUpdated={(labels) => setCurrentTaskLabels(labels)}
                />
              </div>

              {/* Invitación de Usuarios */}
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

              {/* Lista de Miembros */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Miembros de la Organización</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {members.map((member) => {
                    const userObj = member.user || member;
                    const isAssigned = currentAssigneeId === userObj.id;

                    return (
                      <div
                        key={userObj.id}
                        className={`flex items-center justify-between p-3 rounded-xl border text-xs font-medium transition-all ${
                          isAssigned ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-400" : "bg-slate-950/50 border-slate-800 text-slate-300"
                        }`}
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
            <div className="flex flex-col h-full space-y-4">
              {attachments.length > 0 && (
                <div className="pb-2 border-b border-slate-800">
                  <label className="block text-xs font-semibold text-slate-400 mb-2">Archivos Adjuntos</label>
                  <div className="grid grid-cols-2 gap-2">
                    {attachments.map((att) => (
                      <a
                        key={att.id}
                        href={att.fileUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 p-2.5 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl text-xs text-cyan-400"
                      >
                        <FileText className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate flex-1 text-slate-300">{att.fileName}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex-1 space-y-3 overflow-y-auto">
                {comments.length === 0 ? (
                  <p className="text-center text-xs text-slate-500 py-6">No hay mensajes aún.</p>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="flex items-start gap-3 bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
                      <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-xs text-white font-bold flex-shrink-0">
                        {comment.creator?.name?.[0]?.toUpperCase() || "U"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-white">{comment.creator?.name || "Usuario"}</span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 break-words">{comment.body}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <form onSubmit={(e) => handleSend(e)} className="flex items-center gap-2 pt-3 border-t border-slate-800 mt-auto">
                <label className="p-2.5 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-xl cursor-pointer">
                  <Paperclip className="w-4 h-4" />
                  <input type="file" onChange={handleFileUpload} className="hidden" />
                </label>
                
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Escribe un comentario..."
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
                />

                <button type="submit" className="px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2">
                  <Send className="w-3.5 h-3.5" />
                  Enviar
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}