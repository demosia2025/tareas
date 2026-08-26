// apps/web/components/ActivityTab.tsx
"use client";
import React, { useState, useEffect } from "react";
import { Send, Paperclip, FileText, UserPlus, Users, Image as ImageIcon, Loader2, Trash2, Search, X, Check } from "lucide-react";

interface ActivityTabProps {
  taskId: string;
  workspaceId: string;
}

interface Activity {
  id: string;
  type?: string;
  body?: string;
  user?: string;
  createdAt?: string;
}

interface Attachment {
  id: string;
  fileName: string;
  fileUrl: string;
  fileType?: string;
}

interface Member {
  id: string;
  name?: string;
  email: string;
  user?: { id: string; name?: string; email: string };
}

interface WorkspaceMember {
  id: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
}

export function ActivityTab({ taskId, workspaceId }: ActivityTabProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);
  const [newComment, setNewComment] = useState("");
  const [inviteMemberId, setInviteMemberId] = useState<string>("");
  const [loadingInvite, setLoadingInvite] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<"chat" | "members">("chat");
  const [memberTab, setMemberTab] = useState<"assign" | "invite">("assign");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string>("");
  const [assigning, setAssigning] = useState(false);

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/activities?taskId=${taskId}`);
      if (res.ok) {
        const data = await res.json();
        setActivities(Array.isArray(data.comments) ? data.comments : []);
        if (data.attachments) setAttachments(data.attachments);
        if (data.task?.assigneeId) {
          setSelectedAssigneeId(data.task.assigneeId);
        }
      }
      const memRes = await fetch(`/api/tasks/${taskId}/members`);
      if (memRes.ok) {
        const memData = await memRes.json();
        setMembers(Array.isArray(memData) ? memData : []);
      }
    } catch (error) {
      console.error("Error al cargar datos de la tarea:", error);
    }
  };

  useEffect(() => {
    if (taskId) {
      fetchData();
    }
  }, [taskId]);

  useEffect(() => {
    const fetchWorkspaceMembers = async () => {
      if (!workspaceId) {
        console.warn("ActivityTab: workspaceId no está definido.");
        return;
      }
      try {
        let res = await fetch(`/api/workspace/${workspaceId}/members`);
        if (!res.ok) {
          res = await fetch(`/api/workspaces/${workspaceId}/members`);
        }
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : data.members || [];
          setWorkspaceMembers(list);
        } else {
          console.error("No se pudieron cargar los miembros del workspace. Código:", res.status);
        }
      } catch (error) {
        console.error("Error de red al cargar miembros del workspace:", error);
      }
    };
    fetchWorkspaceMembers();
  }, [workspaceId]);

  const handleAssignResponsible = async () => {
    if (!selectedAssigneeId) {
      alert("Por favor selecciona un usuario");
      return;
    }
    setAssigning(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigneeId: selectedAssigneeId }),
      });
      if (res.ok) {
        await fetchData();
        alert("Responsable asignado correctamente");
      } else {
        const err = await res.json();
        alert(err.error || "No se pudo asignar el responsable");
      }
    } catch (error) {
      console.error("Error al asignar responsable:", error);
      alert("Error al asignar responsable");
    } finally {
      setAssigning(false);
    }
  };

  const handleSend = async (
    e?: React.FormEvent,
    fileData?: { name: string; url: string; type: string; size: number }
  ) => {
    if (e && typeof e.preventDefault === "function") {
      e.preventDefault();
    }
    if (!newComment.trim() && !fileData) return;
    try {
      const res = await fetch(`/api/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId,
          body: newComment,
          file: fileData || null,
        }),
      });
      if (res.ok) {
        setNewComment("");
        fetchData();
      }
    } catch (error) {
      console.error("Error al enviar comentario o archivo:", error);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64String = reader.result as string;
      handleSend(undefined, {
        name: file.name,
        url: base64String,
        type: file.type,
        size: file.size,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleInviteCollaborator = async () => {
    if (!inviteMemberId) {
      alert("Por favor selecciona un usuario.");
      return;
    }
    setLoadingInvite(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: inviteMemberId }),
      });
      if (res.ok) {
        setInviteMemberId("");
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || "No se pudo invitar al colaborador");
      }
    } catch (error) {
      console.error("Error inviting collaborator:", error);
      alert("Error al invitar colaborador");
    } finally {
      setLoadingInvite(false);
    }
  };

  const handleRemoveCollaborator = async (userId: string) => {
    if (!confirm("¿Estás seguro de remover a este colaborador de la tarea?")) return;
    try {
      const res = await fetch(`/api/tasks/${taskId}/members?userId=${userId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || "No se pudo remover al usuario.");
      }
    } catch (error) {
      console.error("Error al remover usuario:", error);
      alert("Error de red al intentar remover el usuario.");
    }
  };

  const isImage = (type?: string, name?: string) => {
    if (type && type.startsWith("image/")) return true;
    if (name && /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(name)) return true;
    return false;
  };

  const filteredMembers = workspaceMembers.filter(m => {
    const userObj = m.user || m;
    const name = userObj.name?.toLowerCase() || "";
    const email = userObj.email?.toLowerCase() || "";
    const query = searchQuery.toLowerCase();
    return name.includes(query) || email.includes(query);
  });

  return (
    <div className="flex flex-col text-slate-200">
      {/* Sub-navegación interna */}
      <div className="flex border-b border-slate-800 pb-2 gap-4 flex-shrink-0">
        <button
          onClick={() => setActiveSubTab("chat")}
          className={`text-xs font-bold uppercase tracking-wider pb-1 transition-colors ${
            activeSubTab === "chat" ? "text-cyan-400 border-b-2 border-cyan-400" : "text-slate-400 hover:text-white"
          }`}
        >
          Chat y Archivos
        </button>
        <button
          onClick={() => setActiveSubTab("members")}
          className={`text-xs font-bold uppercase tracking-wider pb-1 transition-colors ${
            activeSubTab === "members" ? "text-cyan-400 border-b-2 border-cyan-400" : "text-slate-400 hover:text-white"
          }`}
        >
          Miembros de la Tarea
        </button>
      </div>

      {activeSubTab === "chat" ? (
        /* ✅ CHAT: Mantiene h-[65vh] porque necesita scroll para mensajes */
        <div className="flex flex-col h-[65vh] space-y-3">
          {attachments.length > 0 && (
            <div className="bg-slate-900/40 p-2.5 rounded-lg border border-slate-800">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
                Archivos Adjuntos
              </span>
              <div className="grid grid-cols-2 gap-2.5">
                {attachments.map((att) => {
                  const imageFile = isImage(att.fileType, att.fileName);
                  return (
                    <a
                      key={att.id}
                      href={att.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="group flex flex-col bg-slate-950 border border-slate-800 hover:border-cyan-500/50 rounded-lg overflow-hidden transition-all"
                    >
                      {imageFile ? (
                        <div className="w-full h-24 bg-slate-900 overflow-hidden relative">
                          <img
                            src={att.fileUrl}
                            alt={att.fileName}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      ) : (
                        <div className="w-full h-24 bg-slate-900/80 flex items-center justify-center text-cyan-400">
                          <FileText className="w-8 h-8 opacity-80" />
                        </div>
                      )}
                      <div className="p-2 flex items-center gap-1.5 bg-slate-950">
                        {imageFile ? <ImageIcon className="w-3.5 h-3.5 text-cyan-400 shrink-0" /> : <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                        <span className="truncate text-[11px] text-slate-300 group-hover:text-cyan-400 transition-colors">
                          {att.fileName}
                        </span>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>
          )}
          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
            {Array.isArray(activities) && activities.length > 0 ? (
              activities.map((activity) => (
                <div key={activity.id} className="flex gap-3 bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                    {activity.user?.charAt(0).toUpperCase() || "U"}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-300">{activity.user || "Usuario"}</span>
                      <span className="text-[10px] text-slate-500">
                        {activity.createdAt ? new Date(activity.createdAt).toLocaleString('es-ES', { 
                          day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' 
                        }) : ""}
                      </span>
                    </div>
                    <p className="text-xs text-slate-100 break-words">{activity.body}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 text-center py-6">No hay mensajes ni actividad registrada aún.</p>
            )}
          </div>
          <form onSubmit={(e) => handleSend(e)} className="pt-2 flex items-center gap-2 mt-auto border-t border-slate-800">
            <label className="p-2 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer transition-colors" title="Adjuntar archivo">
              <Paperclip className="w-4 h-4" />
              <input type="file" onChange={handleFileUpload} className="hidden" />
            </label>
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Escribe un comentario..."
              className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
            />
            <button
              type="submit"
              disabled={!newComment.trim()}
              className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              Enviar
            </button>
          </form>
        </div>
      ) : (
        /* ✅ MIEMBROS: SIN h-[65vh], compacto sin scroll general */
        <div className="space-y-3">
          {/* Pestañas internas: Asignar / Invitar */}
          <div className="flex gap-2 bg-slate-900/40 p-1 rounded-lg border border-slate-800 flex-shrink-0">
            <button
              onClick={() => setMemberTab("assign")}
              className={`flex-1 px-3 py-2 rounded-md text-xs font-semibold transition-all ${
                memberTab === "assign" ? "bg-cyan-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              <UserPlus className="w-3.5 h-3.5 inline mr-1.5" />
              Asignar Responsable
            </button>
            <button
              onClick={() => setMemberTab("invite")}
              className={`flex-1 px-3 py-2 rounded-md text-xs font-semibold transition-all ${
                memberTab === "invite" ? "bg-purple-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              <Users className="w-3.5 h-3.5 inline mr-1.5" />
              Invitar Colaboradores
            </button>
          </div>

          {memberTab === "assign" ? (
            /* SECCIÓN: ASIGNAR RESPONSABLE - Compacta sin scroll general */
            <div className="space-y-3">
              <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5 text-cyan-400" />
                  Responsable Principal
                </h4>
                <select
                  value={selectedAssigneeId}
                  onChange={(e) => setSelectedAssigneeId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 mb-2"
                >
                  <option value="">Sin asignar</option>
                  {filteredMembers.map((m) => {
                    const u = m.user || m;
                    return (
                      <option key={u.id} value={u.id}>
                        {u.name || u.email}
                      </option>
                    );
                  })}
                </select>
                <button
                  onClick={handleAssignResponsible}
                  disabled={assigning || !selectedAssigneeId}
                  className="w-full px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all"
                >
                  {assigning ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Asignando...</>
                  ) : (
                    <><Check className="w-3.5 h-3.5" /> Asignar Responsable</>
                  )}
                </button>
                {selectedAssigneeId && (
                  <span className="text-[10px] text-emerald-400 mt-1 block">✓ Responsable asignado correctamente</span>
                )}
              </div>

              {/* ✅ Lista de usuarios con scroll interno SOLO en la lista (max-h-32) */}
              <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Usuarios de la Organización ({filteredMembers.length})
                </h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {filteredMembers.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-2">No hay usuarios que coincidan o cargando...</p>
                  ) : (
                    filteredMembers.map((m) => {
                      const u = m.user || m;
                      return (
                        <div key={u.id} className="flex items-center justify-between p-2 rounded-lg border text-xs transition-all bg-slate-950/40 border-slate-800 text-slate-300 hover:bg-slate-800/50">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-[10px]">
                              {u.name?.[0]?.toUpperCase() || "U"}
                            </div>
                            <div>
                              <p className="font-medium text-white">{u.name || "Sin nombre"}</p>
                              <p className="text-[10px] text-slate-400">{u.email}</p>
                            </div>
                          </div>
                          {selectedAssigneeId === u.id && (
                            <Check className="w-3.5 h-3.5 text-cyan-400" />
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* SECCIÓN: INVITAR COLABORADORES - Compacta sin scroll general */
            <div className="space-y-3">
              <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-purple-400" />
                  Invitar Colaboradores
                </h4>
                <div className="flex gap-2">
                  <select
                    value={inviteMemberId}
                    onChange={(e) => setInviteMemberId(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="">Seleccionar usuario...</option>
                    {filteredMembers.map((m) => {
                      const u = m.user || m;
                      return (
                        <option key={u.id} value={u.id}>
                          {u.name || u.email}
                        </option>
                      );
                    })}
                  </select>
                  <button
                    type="button"
                    onClick={handleInviteCollaborator}
                    disabled={loadingInvite || !inviteMemberId}
                    className="px-3 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
                  >
                    {loadingInvite && <Loader2 className="w-3 h-3 animate-spin" />}
                    Invitar
                  </button>
                </div>
              </div>

              {/* ✅ Lista de colaboradores con scroll interno SOLO en la lista (max-h-32) */}
              <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Colaboradores Invitados ({members.length})
                </h4>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {members.length === 0 ? (
                    <p className="text-xs text-slate-500 text-center py-2">No hay colaboradores invitados a esta tarea.</p>
                  ) : (
                    members.map((member: any) => {
                      const u = member.user || member;
                      const targetUserId = u.id || member.id;
                      return (
                        <div key={targetUserId} className="flex items-center justify-between p-2 bg-slate-950/40 rounded-lg border border-slate-800 text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-[10px]">
                              {u.name?.[0]?.toUpperCase() || "U"}
                            </div>
                            <div>
                              <p className="font-medium text-white">{u.name || "Sin nombre"}</p>
                              <p className="text-[10px] text-slate-400">{u.email}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemoveCollaborator(targetUserId)}
                            className="text-red-400 hover:text-red-300 text-[11px] px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20 transition-colors flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            Remover
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}