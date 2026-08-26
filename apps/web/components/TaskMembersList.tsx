// apps/web/components/TaskMembersList.tsx
"use client";
import { useState, useEffect } from "react";
import { Clock, UserPlus, AlertCircle, Check, Trash2 } from "lucide-react";

interface TaskMember {
  id: string;
  userId: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
  assignedAt: string;
  timeAgo: string;
  diffDays: number;
  diffHours: number;
  diffMinutes: number;
}

interface AssigneeInfo {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  assignedAt: string;
  timeAgo: string;
  diffDays: number;
}

interface TaskMembersListProps {
  taskId: string;
  workspaceId: string;
  currentUserId: string;
}

export function TaskMembersList({ taskId, workspaceId, currentUserId }: TaskMembersListProps) {
  const [members, setMembers] = useState<TaskMember[]>([]);
  const [assignee, setAssignee] = useState<AssigneeInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [workspaceMembers, setWorkspaceMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // ✅ CORREGIDO: Cargar miembros de la tarea Y del workspace al montar
  useEffect(() => {
    fetchMembers();
    if (workspaceId) {
      fetchWorkspaceMembers();
    }
  }, [taskId, workspaceId]);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/tasks/${taskId}/members`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
        setAssignee(data.assignee || null);
      }
    } catch (error) {
      console.error("Error fetching members:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkspaceMembers = async () => {
    if (!workspaceId) return; // ✅ Evita llamar a la API con undefined
    try {
      setLoadingMembers(true);
      const res = await fetch(`/api/workspace/${workspaceId}/members`);
      if (res.ok) {
        const data = await res.json();
        setWorkspaceMembers(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Error fetching workspace members:", error);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;
    try {
      const res = await fetch(`/api/tasks/${taskId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUserId }),
      });
      if (res.ok) {
        setSelectedUserId("");
        setShowInviteForm(false);
        await fetchMembers();
      } else {
        const err = await res.json();
        alert(err.error || "No se pudo agregar el miembro");
      }
    } catch (error) {
      console.error("Error adding member:", error);
      alert("Error al agregar el miembro");
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm("¿Eliminar esta asignación?")) return;
    try {
      const res = await fetch(`/api/tasks/${taskId}/members?userId=${userId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchMembers();
      } else {
        alert("No se pudo eliminar el miembro");
      }
    } catch (error) {
      console.error("Error removing member:", error);
      alert("Error al eliminar el miembro");
    }
  };

  const getElapsedTimeColor = (diffDays: number) => {
    if (diffDays < 1) return "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    if (diffDays < 3) return "text-amber-400 bg-amber-500/10 border-amber-500/20";
    if (diffDays < 7) return "text-orange-400 bg-orange-500/10 border-orange-500/20";
    return "text-rose-400 bg-rose-500/10 border-rose-500/20";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-cyan-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ✅ ASSIGNEE PRINCIPAL */}
      {assignee && (
        <div>
          <h4 className="text-sm font-bold text-white flex items-center gap-2 mb-3">
            <Check className="w-4 h-4 text-cyan-400" />
            Assignee Principal
          </h4>
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  {assignee.image ? (
                    <img src={assignee.image} alt={assignee.name || ""} className="w-10 h-10 rounded-full object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold">
                      {(assignee.name || assignee.email || "A").charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{assignee.name || "Sin nombre"}</p>
                  <p className="text-[10px] text-slate-400">{assignee.email}</p>
                </div>
              </div>
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-medium ${getElapsedTimeColor(assignee.diffDays)}`}>
                <Clock className="w-3 h-3" />
                <span>{assignee.timeAgo}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ✅ MIEMBROS DE LA TAREA (TaskMember) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-purple-400" />
            Miembros Colaboradores ({members.length})
          </h4>
          <button
            onClick={() => {
              setShowInviteForm(!showInviteForm);
              if (!showInviteForm && workspaceMembers.length === 0) {
                fetchWorkspaceMembers();
              }
            }}
            className="px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-lg text-xs font-semibold text-purple-400 transition-colors cursor-pointer"
          >
            {showInviteForm ? "Cancelar" : "+ Agregar"}
          </button>
        </div>
        {showInviteForm && (
          <form onSubmit={handleAddMember} className="mb-4 p-3 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
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
                  const isAlreadyMember = members.some((tm) => tm.userId === userId);
                  const isAssignee = assignee?.id === userId;
                  return !isAlreadyMember && !isAssignee && userId !== currentUserId;
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
              Agregar como colaborador
            </button>
          </form>
        )}
        {members.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No hay miembros colaboradores en esta tarea</p>
            <p className="text-[10px] mt-1">Haz clic en "+ Agregar" para invitar miembros</p>
          </div>
        ) : (
          <div className="space-y-2">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 bg-slate-950/40 border border-slate-800 rounded-xl hover:border-slate-700 transition-all group"
              >
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
                  <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[10px] font-medium ${getElapsedTimeColor(member.diffDays)}`}>
                    <Clock className="w-3 h-3" />
                    <span className="hidden sm:inline">{member.timeAgo}</span>
                    <span className="sm:hidden">{member.diffDays < 1 ? `${member.diffHours}h` : `${member.diffDays}d`}</span>
                  </div>
                  {member.userId !== currentUserId && (
                    <button
                      onClick={() => handleRemoveMember(member.userId)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                      title="Eliminar asignación"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}