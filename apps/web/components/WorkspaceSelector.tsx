"use client";
import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { 
  Building2, ChevronDown, Plus, Users, Crown, Check 
} from "lucide-react";

interface WorkspaceSelectorProps {
  memberships: any[];
  currentWorkspaceId: string;
  organizationName: string;
  userCount: number;
  userLimit: number;
  planName: string;
  isOwner: boolean;
  onSwitchWorkspace: (workspaceId: string) => void;
  onCreateWorkspace: () => void;
}

export default function WorkspaceSelector({
  memberships,
  currentWorkspaceId,
  organizationName,
  userCount,
  userLimit,
  planName,
  isOwner,
  onSwitchWorkspace,
  onCreateWorkspace
}: WorkspaceSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // ✅ REFERENCIA PARA DETECTAR CLICS FUERA DEL COMPONENTE
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ✅ EFECTO PARA CERRAR AL HACER CLIC FUERA
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    // Solo agregar el listener si el menú está abierto
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const currentMembership = memberships.find(
    (m: any) => m.workspaceId === currentWorkspaceId
  );
  const currentWorkspaceName = currentMembership?.workspaceName || "Workspace";

  // ✅ CORRECCIÓN: Usar límites reales según el plan
  const getRealLimits = (plan: string) => {
    const planLower = plan.toLowerCase();
    if (planLower === "premium") return { users: Infinity, workspaces: Infinity };
    if (planLower === "pro") return { users: 8, workspaces: 5 };
    return { users: 3, workspaces: 1 }; // Free
  };

  const limits = getRealLimits(planName);
  const displayUserLimit = limits.users === Infinity ? "∞" : limits.users;
  const usagePercentage = limits.users === Infinity 
    ? 100 
    : Math.min((userCount / limits.users) * 100, 100);

  const getUsageColor = () => {
    if (limits.users === Infinity) return "bg-emerald-500";
    if (usagePercentage >= 90) return "bg-rose-500";
    if (usagePercentage >= 70) return "bg-amber-500";
    return "bg-emerald-500";
  };

  return (
    <div className="flex items-center gap-3">
      {/* ✅ AÑADIMOS LA REFERENCIA AQUÍ PARA ABARCAR TODO EL SELECTOR */}
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-xl text-xs font-semibold text-slate-200 transition-colors shadow-sm"
        >
          <Building2 className="w-3.5 h-3.5 text-cyan-400" />
          <span className="max-w-[120px] truncate">{currentWorkspaceName}</span>
          <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>

        {isOpen && (
          <>
            {/* Overlay para cerrar al hacer clic fuera (doble seguridad) */}
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            
            <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-1 z-[9999] backdrop-blur-2xl animate-in fade-in zoom-in-95">
              {/* Header con Organización */}
              <div className="px-3.5 py-2 border-b border-slate-800">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Organización
                </p>
                <p className="text-xs font-semibold text-white truncate">
                  {organizationName}
                </p>
                <p className="text-[10px] text-emerald-400 font-semibold mt-1">
                  Plan {planName}
                </p>
              </div>

              {/* Lista de Workspaces */}
              <div className="max-h-48 overflow-y-auto py-1">
                {memberships.map((m: any) => (
                  <button
                    key={m.workspaceId}
                    onClick={() => {
                      onSwitchWorkspace(m.workspaceId);
                      setIsOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2.5 text-xs hover:bg-slate-800 transition-colors border-l-2 flex items-center gap-2 ${
                      m.workspaceId === currentWorkspaceId
                        ? "bg-cyan-500/10 border-cyan-500 text-cyan-300"
                        : "border-transparent text-slate-300"
                    }`}
                  >
                    <Building2 className="w-3.5 h-3.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold truncate">{m.workspaceName}</div>
                      <div className="text-[10px] text-slate-500 truncate">{m.organizationName}</div>
                    </div>
                    {m.workspaceId === currentWorkspaceId && (
                      <Check className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>

              {/* Indicador de Usuarios - CORREGIDO */}
              <div className="px-3.5 py-2 border-t border-slate-800 bg-slate-950/30">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Users className="w-3 h-3 text-slate-400" />
                    <span className="text-[10px] font-medium text-slate-400">Usuarios</span>
                  </div>
                  <span className="text-[10px] font-bold text-white">
                    {userCount} / {displayUserLimit}
                  </span>
                </div>
                <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getUsageColor()} rounded-full transition-all duration-300`}
                    style={{ width: `${usagePercentage}%` }}
                  />
                </div>
              </div>

              {/* Botón Crear Workspace */}
              <div className="p-2 border-t border-slate-800">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onCreateWorkspace();
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-lg text-xs font-bold transition-all shadow-lg shadow-cyan-500/20"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Crear Nuevo Workspace</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {isOwner && (
        <div className="flex items-center gap-1 px-2 py-1 bg-amber-500/10 border border-amber-500/30 rounded-lg">
          <Crown className="w-3 h-3 text-amber-400" />
          <span className="text-[10px] font-bold text-amber-300">Owner</span>
        </div>
      )}
    </div>
  );
}