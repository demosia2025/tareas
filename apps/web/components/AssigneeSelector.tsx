"use client";

import { useState, useEffect } from "react";
import { Users } from "lucide-react";

interface Member {
  id: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
}

interface AssigneeSelectorProps {
  taskId: string;
  workspaceId: string;
  currentAssigneeId?: string | null;
  onAssigneeChanged: (newAssigneeId: string | null) => void;
}

export default function AssigneeSelector({
  taskId,
  workspaceId,
  currentAssigneeId,
  onAssigneeChanged,
}: AssigneeSelectorProps) {
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(currentAssigneeId || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchWorkspaceMembers();
  }, [workspaceId]);

  const fetchWorkspaceMembers = async () => {
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/members`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data);
      }
    } catch (error) {
      console.error("Error al cargar los miembros del workspace:", error);
    }
  };

  const handleAssign = async (userId: string | null) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/assignees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigneeId: userId }),
      });

      if (res.ok) {
        setSelectedId(userId);
        onAssigneeChanged(userId);
      }
    } catch (error) {
      console.error("Error al actualizar la asignación de la tarea:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
        <Users className="w-3.5 h-3.5 text-cyan-400" />
        <span>Responsable Asignado</span>
      </label>
      
      <select
        value={selectedId || ""}
        onChange={(e) => handleAssign(e.target.value ? e.target.value : null)}
        disabled={loading}
        className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/50 shadow-inner"
      >
        <option value="">Sin asignar</option>
        {members.map((m) => (
          <option key={m.user.id} value={m.user.id}>
            {m.user.name || m.user.email}
          </option>
        ))}
      </select>
    </div>
  );
}