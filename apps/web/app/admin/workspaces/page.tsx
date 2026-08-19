// apps/web/app/admin/workspaces/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Building2, Plus, Edit2, Trash2 } from "lucide-react";

export default function AdminWorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const fetchWorkspaces = async () => {
    try {
      const res = await fetch("/admin/workspaces");
      if (res.ok) {
        const data = await res.json();
        setWorkspaces(data);
      }
    } catch (error) {
      console.error("Error cargando workspaces:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-400">Cargando workspaces...</div>;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Building2 className="w-6 h-6 text-cyan-400" /> Workspaces
        </h1>
        <button className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition-all">
          <Plus className="w-4 h-4" /> Nuevo Workspace
        </button>
      </div>

      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-950/60 border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <tr>
              <th className="py-3 px-4">Nombre</th>
              <th className="py-3 px-4">Organización</th>
              <th className="py-3 px-4">Plan</th>
              <th className="py-3 px-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {workspaces.map((ws) => (
              <tr key={ws.id} className="hover:bg-slate-800/30 transition-colors text-xs">
                <td className="py-3 px-4 font-semibold text-white">{ws.name}</td>
                <td className="py-3 px-4 text-slate-400">{ws.organization?.name || "N/A"}</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 capitalize">
                    {ws.plan}
                  </span>
                </td>
                <td className="py-3 px-4 text-right flex justify-end gap-2">
                  <button className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition-all">
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-all">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
            {workspaces.length === 0 && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-slate-500">No hay workspaces registrados.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}