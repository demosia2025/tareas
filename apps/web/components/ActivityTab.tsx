"use client";

import React, { useState, useEffect } from "react";
import { Send, Paperclip, FileText, UserPlus, Image as ImageIcon, Loader2, Trash2 } from "lucide-react";

interface ActivityTabProps {
  taskId: string;
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

export function ActivityTab({ taskId }: ActivityTabProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [newComment, setNewComment] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [loadingInvite, setLoadingInvite] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<"chat" | "members">("chat");

  const fetchData = async () => {
    try {
      // 1. Cargar comentarios y archivos de la actividad
      const res = await fetch(`/api/activities?taskId=${taskId}`);
      if (res.ok) {
        const data = await res.json();
        setActivities(Array.isArray(data.comments) ? data.comments : []);
        if (data.attachments) setAttachments(data.attachments);
      }

      // 2. Cargar usuarios invitados específicamente a esta tarea
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

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      alert("Por favor ingresa un correo electrónico.");
      return;
    }

    try {
      setLoadingInvite(true);
      const res = await fetch(`/api/tasks/${taskId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail }),
      });

      if (res.ok) {
        setInviteEmail("");
        fetchData();
        alert("¡Usuario invitado a la tarea correctamente!");
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "No se pudo invitar al usuario. Comprueba que el correo exista.");
      }
    } catch (error) {
      console.error("Error invitando usuario a la tarea:", error);
      alert("Error de red al intentar invitar al usuario.");
    } finally {
      setLoadingInvite(false);
    }
  };

  // Función para remover usuario invitado de la tarea
  const handleRemoveUser = async (userId: string) => {
    if (!confirm("¿Estás seguro de remover a este usuario de la tarea?")) return;

    try {
      const res = await fetch(`/api/tasks/${taskId}/members?userId=${userId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        fetchData();
      } else {
        const err = await res.json().catch(() => ({}));
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

  return (
    <div className="flex flex-col h-full space-y-4 p-4 text-slate-200">
      
      {/* Sub-navegación interna */}
      <div className="flex border-b border-slate-800 pb-2 gap-4">
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
        <div className="flex flex-col h-[65vh] space-y-3">
          
          {/* Archivos Adjuntos con Miniatura Base64 */}
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

          {/* Lista de mensajes / comentarios */}
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
                      {/* ✅ CORREGIDO: Ahora muestra Fecha y Hora completa */}
                      <span className="text-[10px] text-slate-500">
                        {activity.createdAt ? new Date(activity.createdAt).toLocaleString('es-ES', { 
                          day: '2-digit', 
                          month: '2-digit', 
                          year: 'numeric', 
                          hour: '2-digit', 
                          minute: '2-digit' 
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

          {/* Formulario de Chat */}
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
        <div className="flex flex-col h-[65vh] space-y-4">
          
          {/* Invitar Usuario a la Tarea */}
          <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5 text-cyan-400" />
              Agregar Usuario a la Tarea
            </h4>
            <form onSubmit={handleInviteUser} className="flex gap-2">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="correo@ejemplo.com"
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
              />
              <button
                type="submit"
                disabled={loadingInvite}
                className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1"
              >
                {loadingInvite && <Loader2 className="w-3 h-3 animate-spin" />}
                Asignar
              </button>
            </form>
          </div>

          {/* Listado de Miembros de la Tarea con botón de eliminar */}
          <div className="flex-1 overflow-y-auto space-y-2">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Usuarios en esta Tarea</h4>
            {members.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-4">No hay usuarios asignados a esta tarea.</p>
            ) : (
              members.map((member) => {
                const u = member.user || member;
                const targetUserId = u.id || member.id;
                return (
                  <div key={targetUserId} className="flex items-center justify-between p-2.5 bg-slate-900/40 rounded-lg border border-slate-800 text-xs">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-full bg-cyan-600 flex items-center justify-center text-white font-bold text-[10px]">
                        {u.name?.[0]?.toUpperCase() || "U"}
                      </div>
                      <div>
                        <p className="font-medium text-white">{u.name || "Sin nombre"}</p>
                        <p className="text-[10px] text-slate-400">{u.email}</p>
                      </div>
                    </div>

                    {/* Botón de Remover */}
                    <button
                      onClick={() => handleRemoveUser(targetUserId)}
                      className="text-red-400 hover:text-red-300 text-[11px] px-2.5 py-1 rounded bg-red-500/10 hover:bg-red-500/20 transition-colors flex items-center gap-1"
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
      )}
    </div>
  );
}
