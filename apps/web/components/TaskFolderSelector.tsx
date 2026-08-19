"use client";

import { useState } from "react";

interface Folder {
  id: string;
  name: string;
}

interface TaskFolderSelectorProps {
  taskId: string;
  currentFolderId: string | null;
  spaceFolders: Folder[];
  onTaskMoved: () => void;
}

export function TaskFolderSelector({
  taskId,
  currentFolderId,
  spaceFolders,
  onTaskMoved,
}: TaskFolderSelectorProps) {
  const [loading, setLoading] = useState(false);

  const handleFolderChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newFolderId = e.target.value === "" ? null : e.target.value;
    setLoading(true);

    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId: newFolderId }),
      });

      if (response.ok) {
        onTaskMoved(); // Recarga la tarea o la lista actual para reflejar el cambio
      } else {
        const data = await response.json();
        alert(data.error || "No se pudo mover la tarea de carpeta");
      }
    } catch (error) {
      console.error("Error al mover la tarea:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-slate-400">Carpeta de destino</label>
      <select
        defaultValue={currentFolderId || ""}
        onChange={handleFolderChange}
        disabled={loading}
        className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none disabled:opacity-50 transition-colors"
      >
        <option value="">Sin carpeta (Raíz del espacio)</option>
        {spaceFolders.map((folder) => (
          <option key={folder.id} value={folder.id}>
            {folder.name}
          </option>
        ))}
      </select>
    </div>
  );
}
