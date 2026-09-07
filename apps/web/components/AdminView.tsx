"use client";
import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import {
  Users, FolderKanban, Layers, Building2,
  Plus, Trash2, Edit3, Search, BarChart3, Key, UserPlus, X,
  Crown, Shield
} from "lucide-react";
import { useAdminDashboard } from "@/hooks/useAdminDashboard";

// ==========================================
// COMPONENTES REUTILIZABLES
// ==========================================
const SearchInput = ({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) => (
  <div className="relative max-w-sm">
    <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
    <input type="text" placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full bg-slate-900/60 border border-slate-800/80 rounded-xl pl-10 pr-10 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-all" />
    {value && <button onClick={() => onChange("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"> <X className="w-3.5 h-3.5" /> </button>}
  </div>
);

const SearchableSelect = ({
  label, placeholder, value, onChange, items, optional = false, maxHeight = "max-h-32"
}: {
  label: string; placeholder: string; value: string; onChange: (v: string) => void;
  items: any[]; optional?: boolean; maxHeight?: string;
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);
  const filteredItems = items.filter(item =>
    item.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.id?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const selectedItem = items.find(item => item.id === value);
  return (
    <div className="space-y-1" ref={containerRef}>
      {label && (
        <label className="block text-xs font-semibold text-slate-400">
          {label} {optional && <span className="text-slate-500">(opcional)</span>}
        </label>
      )}
      <div className="relative">
        <input
          type="text"
          placeholder={searchTerm || selectedItem ? selectedItem?.name || placeholder : placeholder}
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setIsOpen(true); }}
          onFocus={() => setIsOpen(true)}
          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
        />
        {isOpen && filteredItems.length > 0 && (
          <div className={`absolute z-50 w-full mt-1 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl ${maxHeight} overflow-y-auto`}>
            {filteredItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => { onChange(item.id); setSearchTerm(""); setIsOpen(false); }}
                className={`w-full text-left px-3.5 py-2 text-xs hover:bg-slate-800 transition-colors border-b border-slate-800/50 last:border-0 ${item.id === value ? "bg-cyan-500/10 text-cyan-300" : "text-slate-300"}`}
              >
                <div className="font-semibold">{item.name}</div>
                <div className="text-[10px] text-slate-500">ID: {item.id}</div>
              </button>
            ))}
          </div>
        )}
        {isOpen && filteredItems.length === 0 && searchTerm && (
          <div className="absolute z-50 w-full mt-1 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-3 text-xs text-slate-400">
            No se encontraron resultados
          </div>
        )}
      </div>
    </div>
  );
};

// ==========================================
// COMPONENTE PRINCIPAL
// ==========================================
export default function AdminView({ isSuperAdmin = false }: { isSuperAdmin?: boolean }) {
  const { data: session } = useSession();
  const admin = useAdminDashboard();
  
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [spaces, setSpaces] = useState<any[]>([]);
  
  const [isEditWorkspaceOpen, setIsEditWorkspaceOpen] = useState(false);
  const [isEditSpaceOpen, setIsEditSpaceOpen] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<any>(null);
  const [editingSpace, setEditingSpace] = useState<any>(null);
  const [editWorkspaceForm, setEditWorkspaceForm] = useState({ name: "", plan: "free", slug: "" });
  const [editSpaceForm, setEditSpaceForm] = useState({ name: "", color: "#8b5cf6", description: "" });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [wsRes, orgRes, spRes] = await Promise.all([
          fetch("/api/admin/workspaces"),
          fetch("/api/admin/organizations"),
          fetch("/api/admin/spaces")
        ]);
        if (wsRes.ok) setWorkspaces(await wsRes.json());
        if (orgRes.ok) setOrganizations(await orgRes.json());
        if (spRes.ok) setSpaces(await spRes.json());
      } catch (error) {
        console.error("Error loading data:", error);
      }
    };
    loadData();
  }, []);

  const [isCreateOrgOpen, setIsCreateOrgOpen] = useState(false);
  const [isCreateSpaceOpen, setIsCreateSpaceOpen] = useState(false);
  const [isCreateCodeOpen, setIsCreateCodeOpen] = useState(false);
  const [isCreateInvitationOpen, setIsCreateInvitationOpen] = useState(false);
  const [isCreateWorkspaceOpen, setIsCreateWorkspaceOpen] = useState(false);
  
  const [newOrgForm, setNewOrgForm] = useState({ name: "", slug: "", plan: "free", description: "" });
  const [newSpaceForm, setNewSpaceForm] = useState({ name: "", workspaceId: "", description: "", color: "#8b5cf6" });
  const [newCodeForm, setNewCodeForm] = useState({ targetId: "", targetType: "workspace", maxUses: 5, expiresAt: "" });
  const [newInvitationForm, setNewInvitationForm] = useState({ email: "", targetId: "", targetType: "workspace", role: "member" });
  const [newWorkspaceForm, setNewWorkspaceForm] = useState({ name: "", organizationId: "", plan: "free" });

  // ✅ GENERADOR DE CÓDIGO UNIFICADO: 6 caracteres alfanuméricos en mayúsculas
  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const generateShortId = (length: number = 6) => Math.floor(Math.pow(10, length - 1) + Math.random() * 9 * Math.pow(10, length - 1)).toString();
  const generateRandomSlug = (name: string) => {
    const randomNum = Math.floor(Math.random() * 10000);
    return `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${randomNum}`;
  };

  const openEditWorkspace = (ws: any) => {
    setEditingWorkspace(ws);
    setEditWorkspaceForm({ name: ws.name, plan: ws.plan, slug: ws.slug });
    setIsEditWorkspaceOpen(true);
  };
  
  const openEditSpace = (space: any) => {
    setEditingSpace(space);
    setEditSpaceForm({ name: space.name, color: space.color || "#8b5cf6", description: space.description || "" });
    setIsEditSpaceOpen(true);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!admin.editingUser) return;
    try {
      const body: any = { 
        name: admin.editForm.name,
        email: admin.editForm.email,
        role: admin.editForm.role 
      };
      if (admin.editForm.password && admin.editForm.password.trim() !== "") {
        body.password = admin.editForm.password;
      }
      const res = await fetch(`/api/admin/users?id=${admin.editingUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (res.ok) {
        await admin.fetchData();
        admin.setEditingUser(null);
        admin.setEditForm({ name: "", email: "", role: "user", password: "" });
        alert("✅ Usuario actualizado correctamente");
      } else {
        const err = await res.json();
        alert(`❌ Error: ${err.error || "No se pudo actualizar el usuario"}`);
      }
    } catch (error) {
      console.error("Error updating user:", error);
      alert("❌ Error de conexión");
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!confirm(`¿Estás seguro de eliminar al usuario "${userName}"? Esta acción no se puede deshacer.`)) return;
    try {
      const res = await fetch(`/api/admin/users?id=${userId}`, { method: "DELETE" });
      if (res.ok) {
        await admin.fetchData();
        alert("✅ Usuario eliminado correctamente");
      } else {
        const err = await res.json();
        alert(`❌ Error: ${err.error || "No se pudo eliminar. Es posible que el usuario tenga tareas o membresías asociadas."}`);
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("❌ Error de conexión");
    }
  };

  const handleUpdateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/admin/workspaces?id=${editingWorkspace.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editWorkspaceForm)
      });
      if (res.ok) {
        if (admin.fetchData) await admin.fetchData();
        setIsEditWorkspaceOpen(false);
        setEditingWorkspace(null);
        alert("✅ Workspace actualizado");
      } else {
        const err = await res.json();
        alert(`❌ Error: ${err.error || "Error al actualizar workspace"}`);
      }
    } catch (error) {
      alert("❌ Error de conexión");
    }
  };

  const handleUpdateSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/admin/spaces?id=${editingSpace.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editSpaceForm)
      });
      if (res.ok) {
        if (admin.fetchData) await admin.fetchData();
        setIsEditSpaceOpen(false);
        setEditingSpace(null);
        alert("✅ Space actualizado");
      } else {
        const err = await res.json();
        alert(`❌ Error: ${err.error || "Error al actualizar space"}`);
      }
    } catch (error) {
      alert("❌ Error de conexión");
    }
  };

  const handleDeleteWorkspace = async (wsId: string) => {
    if (!confirm("¿Estás seguro de eliminar este workspace? Esta acción no se puede deshacer.")) return;
    try {
      const res = await fetch(`/api/admin/workspaces?id=${wsId}`, { method: "DELETE" });
      if (res.ok) {
        if (admin.fetchData) await admin.fetchData();
        alert("✅ Workspace eliminado");
      } else {
        const err = await res.json();
        alert(`❌ Error: ${err.error || "Error al eliminar workspace"}`);
      }
    } catch (error) {
      alert("❌ Error de conexión");
    }
  };

  const handleDeleteSpace = async (spaceId: string) => {
    if (!confirm("¿Estás seguro de eliminar este space? Esta acción no se puede deshacer.")) return;
    try {
      const res = await fetch(`/api/admin/spaces?id=${spaceId}`, { method: "DELETE" });
      if (res.ok) {
        if (admin.fetchData) await admin.fetchData();
        alert("✅ Space eliminado");
      } else {
        const err = await res.json();
        alert(`❌ Error: ${err.error || "Error al eliminar space"}`);
      }
    } catch (error) {
      alert("❌ Error de conexión");
    }
  };

  const handleDeleteCode = async (codeId: string) => {
    if (!confirm("¿Eliminar este código de invitación?")) return;
    try {
      const res = await fetch(`/api/admin/invite-codes?id=${codeId}`, { method: "DELETE" });
      if (res.ok) {
        if (admin.fetchData) await admin.fetchData();
        alert("✅ Código eliminado");
      } else {
        const err = await res.json();
        alert(`❌ Error: ${err.error || "Error al eliminar código"}`);
      }
    } catch (error) {
      alert("❌ Error de conexión");
    }
  };

  const handleDeleteInvitation = async (invitationId: string) => {
    if (!confirm("¿Eliminar esta invitación?")) return;
    try {
      const res = await fetch(`/api/admin/invitations?id=${invitationId}`, { method: "DELETE" });
      if (res.ok) {
        if (admin.fetchData) await admin.fetchData();
        alert("✅ Invitación eliminada");
      } else {
        const err = await res.json();
        alert(`❌ Error: ${err.error || "Error al eliminar invitación"}`);
      }
    } catch (error) {
      alert("❌ Error de conexión");
    }
  };

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const orgId = generateShortId(6);
      const res = await fetch("/api/admin/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newOrgForm, id: orgId, slug: newOrgForm.slug || generateRandomSlug(newOrgForm.name) })
      });
      if (res.ok) {
        if (admin.fetchData) await admin.fetchData();
        setIsCreateOrgOpen(false);
        setNewOrgForm({ name: "", slug: "", plan: "free", description: "" });
        alert(`✅ Organización creada con ID: ${orgId}`);
      } else {
        const err = await res.json();
        alert(`❌ Error: ${err.error || "Error al crear organización"}`);
      }
    } catch (error) {
      alert("❌ Error de conexión");
    }
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const wsId = generateShortId(8);
      const res = await fetch("/api/admin/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newWorkspaceForm, id: wsId, slug: generateRandomSlug(newWorkspaceForm.name) })
      });
      if (res.ok) {
        if (admin.fetchData) await admin.fetchData();
        setIsCreateWorkspaceOpen(false);
        setNewWorkspaceForm({ name: "", organizationId: "", plan: "free" });
        alert(`✅ Workspace creado con ID: ${wsId}`);
      } else {
        const err = await res.json();
        alert(`❌ Error: ${err.error || "Error al crear workspace"}`);
      }
    } catch (error) {
      alert("❌ Error de conexión");
    }
  };

  const handleCreateSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const spaceId = generateShortId(8);
      const res = await fetch("/api/admin/spaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newSpaceForm, id: spaceId, slug: generateRandomSlug(newSpaceForm.name) })
      });
      if (res.ok) {
        if (admin.fetchData) await admin.fetchData();
        setIsCreateSpaceOpen(false);
        setNewSpaceForm({ name: "", workspaceId: "", description: "", color: "#8b5cf6" });
        alert(`✅ Space creado con ID: ${spaceId}`);
      } else {
        const err = await res.json();
        alert(`❌ Error: ${err.error || "Error al crear space"}`);
      }
    } catch (error) {
      alert("❌ Error de conexión");
    }
  };

  const handleCreateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!newCodeForm.targetId) {
        alert("⚠️ Debes seleccionar un workspace o space");
        return;
      }
      const res = await fetch("/api/admin/invite-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: generateRandomCode(), // ✅ Código unificado de 6 caracteres
          workspaceId: newCodeForm.targetType === "workspace" ? newCodeForm.targetId : null,
          spaceId: newCodeForm.targetType === "space" ? newCodeForm.targetId : null,
          maxUses: newCodeForm.maxUses,
          expiresAt: newCodeForm.expiresAt ? new Date(newCodeForm.expiresAt) : null
        })
      });
      if (res.ok) {
        if (admin.fetchData) await admin.fetchData();
        setIsCreateCodeOpen(false);
        setNewCodeForm({ targetId: "", targetType: "workspace", maxUses: 5, expiresAt: "" });
        alert("✅ Código creado");
      } else {
        const err = await res.json();
        alert(`❌ Error: ${err.error || "Error al crear código"}`);
      }
    } catch (error) {
      alert("❌ Error de conexión");
    }
  };

  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!newInvitationForm.email || !newInvitationForm.targetId) {
        alert("⚠️ Email y workspace/space son requeridos");
        return;
      }
      const res = await fetch("/api/admin/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newInvitationForm.email,
          workspaceId: newInvitationForm.targetType === "workspace" ? newInvitationForm.targetId : null,
          spaceId: newInvitationForm.targetType === "space" ? newInvitationForm.targetId : null,
          invitationType: newInvitationForm.targetType,
          role: newInvitationForm.role
        })
      });
      if (res.ok) {
        if (admin.fetchData) await admin.fetchData();
        setIsCreateInvitationOpen(false);
        setNewInvitationForm({ email: "", targetId: "", targetType: "workspace", role: "member" });
        alert("✅ Invitación creada");
      } else {
        const err = await res.json();
        alert(`❌ Error: ${err.error || "Error al crear invitación"}`);
      }
    } catch (error) {
      alert("❌ Error de conexión");
    }
  };

  const handleChangeOrgPlan = async (orgId: string, newPlan: string) => {
    try {
      const res = await fetch("/api/admin/organizations/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, plan: newPlan })
      });
      if (res.ok) {
        alert("✅ Plan actualizado correctamente");
        if (admin.fetchData) await admin.fetchData();
      } else {
        const err = await res.json();
        alert(`❌ Error: ${err.error || "Error al cambiar plan"}`);
      }
    } catch (error) {
      alert("❌ Error de conexión");
    }
  };

  const handleDeleteOrg = async (orgId: string) => {
    if (!confirm("¿Estás seguro de eliminar esta organización y todo su contenido? Esta acción no se puede deshacer.")) return;
    try {
      const res = await fetch(`/api/admin/organizations?id=${orgId}`, { method: "DELETE" });
      if (res.ok) {
        alert("✅ Organización eliminada");
        if (admin.fetchData) await admin.fetchData();
      } else {
        const err = await res.json();
        alert(`❌ Error: ${err.error || "Error al eliminar"}`);
      }
    } catch (error) {
      alert("❌ Error de conexión");
    }
  };

  if (admin.isLoading) return (
    <div className="h-full flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
    </div>
  );
  
  if (!admin.isAdmin) return (
    <div className="h-full flex items-center justify-center text-red-500">
      No tienes permisos de Administrador
    </div>
  );

  const tabs = [
    { id: "overview", label: "Resumen Global", icon: BarChart3 },
    { id: "workspaces", label: "Workspaces", icon: FolderKanban },
    { id: "spaces", label: "Spaces", icon: Layers },
    { id: "organizations", label: "Organizaciones", icon: Building2 },
    { id: "users", label: "Usuarios", icon: Users },
    { id: "invitations", label: "Invitaciones", icon: UserPlus },
    { id: "invite-codes", label: "Códigos", icon: Key }
  ];

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isSuperAdmin ? (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center">
                <Crown className="w-5 h-5 text-amber-400" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 flex items-center justify-center">
                <Shield className="w-5 h-5 text-cyan-400" />
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-white">
                {isSuperAdmin ? "Panel de Super Administrador" : "Panel de Administrador"}
              </h1>
              <p className="text-xs text-slate-400">
                {isSuperAdmin 
                  ? "Acceso total a todas las organizaciones, workspaces y usuarios del sistema" 
                  : "Gestión de workspaces, espacios y usuarios"}
              </p>
            </div>
          </div>
          {isSuperAdmin && (
            <div className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <span className="text-xs font-semibold text-amber-400">👑 Super Admin</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 border-b border-slate-800/80 pb-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button 
                key={tab.id} 
                onClick={() => admin.setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${
                  admin.activeTab === tab.id 
                    ? isSuperAdmin && tab.id === "overview"
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-300"
                      : "bg-cyan-500/10 border-cyan-500/30 text-cyan-300"
                    : "bg-slate-900/40 border-slate-800/70 text-slate-400 hover:bg-slate-900/80"
                }`}
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="whitespace-nowrap">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {admin.activeTab === "overview" && isSuperAdmin && (
          <div className="space-y-6">
            <div className="rounded-2xl p-4 border bg-gradient-to-r from-amber-950/20 to-orange-950/20 border-amber-500/30">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Vista Global del Sistema</h3>
                  <p className="text-xs text-slate-400">Métricas de toda la plataforma</p>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-900/60 rounded-xl p-3">
                  <p className="text-[10px] text-slate-400 uppercase">Total Organizaciones</p>
                  <p className="text-2xl font-bold text-white">{admin.orgStats.length}</p>
                </div>
                <div className="bg-slate-900/60 rounded-xl p-3">
                  <p className="text-[10px] text-slate-400 uppercase">Total Workspaces</p>
                  <p className="text-2xl font-bold text-white">{admin.stats.totalWorkspaces}</p>
                </div>
                <div className="bg-slate-900/60 rounded-xl p-3">
                  <p className="text-[10px] text-slate-400 uppercase">Total Usuarios</p>
                  <p className="text-2xl font-bold text-white">{admin.stats.totalUsers}</p>
                </div>
                <div className="bg-slate-900/60 rounded-xl p-3">
                  <p className="text-[10px] text-slate-400 uppercase">Total Tareas</p>
                  <p className="text-2xl font-bold text-white">{admin.stats.totalTasks}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {admin.activeTab === "workspaces" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">Workspaces</h2>
              <button onClick={() => setIsCreateWorkspaceOpen(true)} className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-2">
                <Plus className="w-4 h-4" />Crear Workspace
              </button>
            </div>
            <SearchInput value={admin.searchWorkspaces} onChange={admin.setSearchWorkspaces} placeholder="Buscar workspace..." />
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[600px]">
                  <thead className="bg-slate-950/50 border-b border-slate-800/80 text-[11px] font-bold text-slate-400 uppercase">
                    <tr>
                      <th className="px-6 py-3.5">Nombre</th>
                      <th className="px-6 py-3.5">Slug</th>
                      <th className="px-6 py-3.5">Plan</th>
                      <th className="px-6 py-3.5 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 text-xs">
                    {admin.workspaces.map((ws: any) => (
                      <tr key={ws.id} className="hover:bg-slate-800/25">
                        <td className="px-6 py-3.5 font-semibold">{ws.name}</td>
                        <td className="px-6 py-3.5 text-slate-400">{ws.slug}</td>
                        <td className="px-6 py-3.5 capitalize">{ws.plan}</td>
                        <td className="px-6 py-3.5 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => openEditWorkspace(ws)} className="text-cyan-400 hover:bg-cyan-500/10 p-1.5 rounded" title="Editar">
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDeleteWorkspace(ws.id)} className="text-rose-400 hover:bg-rose-500/10 p-1.5 rounded" title="Eliminar">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {admin.activeTab === "spaces" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">Spaces</h2>
              <button onClick={() => setIsCreateSpaceOpen(true)} className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-2">
                <Plus className="w-4 h-4" />Crear Space
              </button>
            </div>
            <SearchInput value={admin.searchSpaces} onChange={admin.setSearchSpaces} placeholder="Buscar space..." />
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[600px]">
                  <thead className="bg-slate-950/50 border-b border-slate-800/80 text-[11px] font-bold text-slate-400 uppercase">
                    <tr>
                      <th className="px-6 py-3.5">Nombre</th>
                      <th className="px-6 py-3.5">Workspace</th>
                      <th className="px-6 py-3.5">Color</th>
                      <th className="px-6 py-3.5 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 text-xs">
                    {admin.spaces.map((space: any) => (
                      <tr key={space.id} className="hover:bg-slate-800/25">
                        <td className="px-6 py-3.5 font-semibold flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: space.color }} />
                          {space.name}
                        </td>
                        <td className="px-6 py-3.5 text-slate-400">{space.workspace?.name}</td>
                        <td className="px-6 py-3.5 font-mono text-slate-400">{space.color}</td>
                        <td className="px-6 py-3.5 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => openEditSpace(space)} className="text-cyan-400 hover:bg-cyan-500/10 p-1.5 rounded" title="Editar">
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDeleteSpace(space.id)} className="text-rose-400 hover:bg-rose-500/10 p-1.5 rounded" title="Eliminar">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {admin.activeTab === "organizations" && isSuperAdmin && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">Organizaciones</h2>
              <button onClick={() => setIsCreateOrgOpen(true)} className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-2">
                <Plus className="w-4 h-4" />Crear Organización
              </button>
            </div>
            <SearchInput value={admin.searchOrgs} onChange={admin.setSearchOrgs} placeholder="Buscar organización..." />
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[600px]">
                  <thead className="bg-slate-950/50 border-b border-slate-800/80 text-[11px] font-bold text-slate-400 uppercase">
                    <tr><th className="px-6 py-3.5">Nombre</th><th className="px-6 py-3.5">Slug</th><th className="px-6 py-3.5">Plan</th><th className="px-6 py-3.5 text-right">Acciones</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 text-xs">
                    {admin.organizations.map((org: any) => (
                      <tr key={org.id} className="hover:bg-slate-800/25">
                        <td className="px-6 py-3.5 font-semibold">{org.name}</td>
                        <td className="px-6 py-3.5 text-slate-400">{org.slug}</td>
                        <td className="px-6 py-3.5 capitalize">{org.plan}</td>
                        <td className="px-6 py-3.5 text-right">
                          <div className="flex justify-end gap-2">
                            <select value={org.plan} onChange={(e) => handleChangeOrgPlan(org.id, e.target.value)} className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white">
                              <option value="free">Free</option>
                              <option value="pro">Pro</option>
                              <option value="premium">Premium</option>
                            </select>
                            <button onClick={() => handleDeleteOrg(org.id)} className="text-rose-400 hover:bg-rose-500/10 p-1.5 rounded" title="Eliminar">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {admin.activeTab === "users" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">Usuarios</h2>
              <button onClick={() => admin.setIsCreateUserOpen(true)} className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-2">
                <Plus className="w-4 h-4" />Crear Usuario
              </button>
            </div>
            <SearchInput value={admin.searchUsers} onChange={admin.setSearchUsers} placeholder="Buscar usuario..." />
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[600px]">
                  <thead className="bg-slate-950/50 border-b border-slate-800/80 text-[11px] font-bold text-slate-400 uppercase">
                    <tr><th className="px-6 py-3.5">Usuario</th><th className="px-6 py-3.5">Email</th><th className="px-6 py-3.5">Rol</th><th className="px-6 py-3.5 text-right">Acciones</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 text-xs">
                    {admin.users.map((user: any) => (
                      <tr key={user.id} className="hover:bg-slate-800/25">
                        <td className="px-6 py-3.5 font-semibold">{user.name}</td>
                        <td className="px-6 py-3.5 text-slate-400">{user.email}</td>
                        <td className="px-6 py-3.5 capitalize">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            user.role === 'superadmin' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                            user.role === 'admin' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' :
                            'bg-slate-700/50 text-slate-300 border border-slate-700'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-right flex justify-end gap-2">
                          <button 
                            onClick={() => { 
                              admin.setEditingUser(user); 
                              admin.setEditForm({ 
                                name: user.name || "", 
                                email: user.email || "", 
                                role: user.role, 
                                password: "" 
                              }); 
                            }} 
                            className="text-cyan-400 hover:bg-cyan-500/10 p-1.5 rounded"
                            title="Editar usuario"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => handleDeleteUser(user.id, user.name)} 
                            className="text-rose-400 hover:bg-rose-500/10 p-1.5 rounded"
                            title="Eliminar usuario"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {admin.activeTab === "invitations" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">Invitaciones</h2>
              <button onClick={() => setIsCreateInvitationOpen(true)} className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-2">
                <Plus className="w-4 h-4" />Crear Invitación
              </button>
            </div>
            <SearchInput value={admin.searchInvitations} onChange={admin.setSearchInvitations} placeholder="Buscar invitación..." />
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[700px]">
                  <thead className="bg-slate-950/50 border-b border-slate-800/80 text-[11px] font-bold text-slate-400 uppercase">
                    <tr><th className="px-6 py-3.5">Usuario</th><th className="px-6 py-3.5">Workspace/Space</th><th className="px-6 py-3.5">Tipo</th><th className="px-6 py-3.5">Estado</th><th className="px-6 py-3.5 text-right">Acciones</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 text-xs">
                    {admin.invitations.map((inv: any) => (
                      <tr key={inv.id} className="hover:bg-slate-800/25">
                        <td className="px-6 py-3.5 font-semibold">{inv.invitedUser?.email}</td>
                        <td className="px-6 py-3.5 text-slate-400">{inv.workspace?.name || inv.space?.name || "N/A"}</td>
                        <td className="px-6 py-3.5 capitalize text-slate-300">{inv.invitationType || "workspace"}</td>
                        <td className="px-6 py-3.5 capitalize">{inv.status}</td>
                        <td className="px-6 py-3.5 text-right">
                          <button onClick={() => handleDeleteInvitation(inv.id)} className="text-rose-400 hover:bg-rose-500/10 p-1.5 rounded" title="Eliminar">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {admin.activeTab === "invite-codes" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-white">Códigos de Invitación</h2>
              <button onClick={() => setIsCreateCodeOpen(true)} className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-2">
                <Plus className="w-4 h-4" />Crear Código
              </button>
            </div>
            <SearchInput value={admin.searchCodes} onChange={admin.setSearchCodes} placeholder="Buscar código..." />
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left min-w-[700px]">
                  <thead className="bg-slate-950/50 border-b border-slate-800/80 text-[11px] font-bold text-slate-400 uppercase">
                    <tr><th className="px-6 py-3.5">Código</th><th className="px-6 py-3.5">Workspace/Space</th><th className="px-6 py-3.5">Usos</th><th className="px-6 py-3.5">Creado por</th><th className="px-6 py-3.5 text-right">Acciones</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 text-xs">
                    {admin.inviteCodes.map((code: any) => (
                      <tr key={code.id} className="hover:bg-slate-800/25">
                        <td className="px-6 py-3.5 font-mono font-bold text-cyan-400">{code.code}</td>
                        <td className="px-6 py-3.5 text-slate-400">{code.workspace?.name || code.space?.name || "N/A"}</td>
                        <td className="px-6 py-3.5">{code.usedCount} / {code.maxUses}</td>
                        <td className="px-6 py-3.5 text-slate-400">{code.createdBy?.name}</td>
                        <td className="px-6 py-3.5 text-right">
                          <button onClick={() => handleDeleteCode(code.id)} className="text-rose-400 hover:bg-rose-500/10 p-1.5 rounded" title="Eliminar">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {admin.editingUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white">Editar Usuario</h3>
              <button onClick={() => { admin.setEditingUser(null); admin.setEditForm({ name: "", email: "", role: "user", password: "" }); }} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Nombre</label>
                <input 
                  type="text" 
                  value={admin.editForm.name} 
                  onChange={(e) => admin.setEditForm({...admin.editForm, name: e.target.value})} 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white" 
                  required 
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Email</label>
                <input 
                  type="email" 
                  value={admin.editForm.email} 
                  onChange={(e) => admin.setEditForm({...admin.editForm, email: e.target.value})} 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white" 
                  required 
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Rol</label>
                <select 
                  value={admin.editForm.role} 
                  onChange={(e) => admin.setEditForm({...admin.editForm, role: e.target.value})} 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
                >
                  <option value="user">Usuario</option>
                  <option value="admin">Admin</option>
                  <option value="superadmin">Super Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Nueva Contraseña <span className="text-slate-500">(opcional)</span></label>
                <input 
                  type="password" 
                  value={admin.editForm.password} 
                  onChange={(e) => admin.setEditForm({...admin.editForm, password: e.target.value})} 
                  placeholder="Dejar en blanco para mantener la actual"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white" 
                />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => { admin.setEditingUser(null); admin.setEditForm({ name: "", email: "", role: "user", password: "" }); }} className="px-4 py-2 text-xs font-semibold bg-slate-800 text-slate-300 rounded-xl">Cancelar</button>
                <button type="submit" className="px-4 py-2 text-xs font-bold bg-cyan-600 text-white rounded-xl">Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {admin.isCreateUserOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">Crear Usuario</h3>
            <form onSubmit={(e) => { e.preventDefault(); admin.handleCreateUser(e); }} className="space-y-4">
              <input type="text" placeholder="Nombre" value={admin.createUserForm.name} onChange={(e) => admin.setCreateUserForm({...admin.createUserForm, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white" required />
              <input type="email" placeholder="Email" value={admin.createUserForm.email} onChange={(e) => admin.setCreateUserForm({...admin.createUserForm, email: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white" required />
              <input type="password" placeholder="Contraseña" value={admin.createUserForm.password} onChange={(e) => admin.setCreateUserForm({...admin.createUserForm, password: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white" required />
              <select value={admin.createUserForm.role || "user"} onChange={(e) => admin.setCreateUserForm({...admin.createUserForm, role: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white">
                <option value="user">Usuario</option>
                <option value="admin">Admin</option>
                <option value="superadmin">Super Admin</option>
              </select>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => admin.setIsCreateUserOpen(false)} className="px-4 py-2 text-xs font-semibold bg-slate-800 text-slate-300 rounded-xl">Cancelar</button>
                <button type="submit" className="px-4 py-2 text-xs font-bold bg-cyan-600 text-white rounded-xl">Crear</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isCreateWorkspaceOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">Crear Workspace</h3>
            <form onSubmit={handleCreateWorkspace} className="space-y-4">
              <input type="text" placeholder="Nombre" value={newWorkspaceForm.name} onChange={(e) => setNewWorkspaceForm({...newWorkspaceForm, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white" required />
              <SearchableSelect label="Organización" placeholder="Buscar organización..." value={newWorkspaceForm.organizationId} onChange={(id) => setNewWorkspaceForm({...newWorkspaceForm, organizationId: id})} items={organizations} optional={true} />
              <select value={newWorkspaceForm.plan} onChange={(e) => setNewWorkspaceForm({...newWorkspaceForm, plan: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white">
                <option value="free">Free</option>
                <option value="pro">Pro</option>
                <option value="premium">Premium</option>
              </select>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setIsCreateWorkspaceOpen(false)} className="px-4 py-2 text-xs font-semibold bg-slate-800 text-slate-300 rounded-xl">Cancelar</button>
                <button type="submit" className="px-4 py-2 text-xs font-bold bg-cyan-600 text-white rounded-xl">Crear</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditWorkspaceOpen && editingWorkspace && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">Editar Workspace</h3>
            <form onSubmit={handleUpdateWorkspace} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Nombre</label>
                <input type="text" value={editWorkspaceForm.name} onChange={(e) => setEditWorkspaceForm({...editWorkspaceForm, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Slug</label>
                <input type="text" value={editWorkspaceForm.slug} onChange={(e) => setEditWorkspaceForm({...editWorkspaceForm, slug: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Plan</label>
                <select value={editWorkspaceForm.plan} onChange={(e) => setEditWorkspaceForm({...editWorkspaceForm, plan: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white">
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                  <option value="premium">Premium</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setIsEditWorkspaceOpen(false)} className="px-4 py-2 text-xs font-semibold bg-slate-800 text-slate-300 rounded-xl">Cancelar</button>
                <button type="submit" className="px-4 py-2 text-xs font-bold bg-cyan-600 text-white rounded-xl">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isCreateOrgOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">Crear Organización</h3>
            <form onSubmit={handleCreateOrganization} className="space-y-4">
              <input type="text" placeholder="Nombre" value={newOrgForm.name} onChange={(e) => setNewOrgForm({...newOrgForm, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white" required />
              <input type="text" placeholder="Slug (opcional)" value={newOrgForm.slug} onChange={(e) => setNewOrgForm({...newOrgForm, slug: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white" />
              <select value={newOrgForm.plan} onChange={(e) => setNewOrgForm({...newOrgForm, plan: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white">
                <option value="free">Free</option>
                <option value="pro">Pro</option>
                <option value="premium">Premium</option>
              </select>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setIsCreateOrgOpen(false)} className="px-4 py-2 text-xs font-semibold bg-slate-800 text-slate-300 rounded-xl">Cancelar</button>
                <button type="submit" className="px-4 py-2 text-xs font-bold bg-cyan-600 text-white rounded-xl">Crear</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isCreateSpaceOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">Crear Space</h3>
            <form onSubmit={handleCreateSpace} className="space-y-4">
              <input type="text" placeholder="Nombre" value={newSpaceForm.name} onChange={(e) => setNewSpaceForm({...newSpaceForm, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white" required />
              <SearchableSelect label="Workspace" placeholder="Buscar workspace..." value={newSpaceForm.workspaceId} onChange={(id) => setNewSpaceForm({...newSpaceForm, workspaceId: id})} items={workspaces} optional={true} />
              <input type="color" value={newSpaceForm.color} onChange={(e) => setNewSpaceForm({...newSpaceForm, color: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5" />
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setIsCreateSpaceOpen(false)} className="px-4 py-2 text-xs font-semibold bg-slate-800 text-slate-300 rounded-xl">Cancelar</button>
                <button type="submit" className="px-4 py-2 text-xs font-bold bg-cyan-600 text-white rounded-xl">Crear</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isEditSpaceOpen && editingSpace && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">Editar Space</h3>
            <form onSubmit={handleUpdateSpace} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Nombre</label>
                <input type="text" value={editSpaceForm.name} onChange={(e) => setEditSpaceForm({...editSpaceForm, name: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white" required />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Descripción</label>
                <textarea value={editSpaceForm.description} onChange={(e) => setEditSpaceForm({...editSpaceForm, description: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white" rows={3} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Color</label>
                <input type="color" value={editSpaceForm.color} onChange={(e) => setEditSpaceForm({...editSpaceForm, color: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5" />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setIsEditSpaceOpen(false)} className="px-4 py-2 text-xs font-semibold bg-slate-800 text-slate-300 rounded-xl">Cancelar</button>
                <button type="submit" className="px-4 py-2 text-xs font-bold bg-cyan-600 text-white rounded-xl">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isCreateCodeOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">Crear Código de Invitación</h3>
            <form onSubmit={handleCreateCode} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">Tipo de destino</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setNewCodeForm({...newCodeForm, targetType: "workspace"})} className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${newCodeForm.targetType === "workspace" ? "bg-cyan-500/20 border border-cyan-500/50 text-cyan-300" : "bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700"}`}>Workspace</button>
                  <button type="button" onClick={() => setNewCodeForm({...newCodeForm, targetType: "space"})} className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${newCodeForm.targetType === "space" ? "bg-cyan-500/20 border border-cyan-500/50 text-cyan-300" : "bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700"}`}>Space</button>
                </div>
              </div>
              {newCodeForm.targetType === "workspace" ? (
                <SearchableSelect label="Workspace" placeholder="Buscar workspace..." value={newCodeForm.targetId} onChange={(id) => setNewCodeForm({...newCodeForm, targetId: id})} items={workspaces} />
              ) : (
                <SearchableSelect label="Space" placeholder="Buscar space..." value={newCodeForm.targetId} onChange={(id) => setNewCodeForm({...newCodeForm, targetId: id})} items={spaces} />
              )}
              <input type="number" placeholder="Máximo de usos" value={newCodeForm.maxUses} onChange={(e) => setNewCodeForm({...newCodeForm, maxUses: parseInt(e.target.value) || 5})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white" min="1" required />
              <div>
                <label className="block text-xs text-slate-400 mb-1">Fecha de expiración (opcional)</label>
                <input type="datetime-local" value={newCodeForm.expiresAt} onChange={(e) => setNewCodeForm({...newCodeForm, expiresAt: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white" />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setIsCreateCodeOpen(false)} className="px-4 py-2 text-xs font-semibold bg-slate-800 text-slate-300 rounded-xl">Cancelar</button>
                <button type="submit" className="px-4 py-2 text-xs font-bold bg-cyan-600 text-white rounded-xl">Crear</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isCreateInvitationOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">Crear Invitación</h3>
            <form onSubmit={handleCreateInvitation} className="space-y-4">
              <input type="email" placeholder="Email del usuario" value={newInvitationForm.email} onChange={(e) => setNewInvitationForm({...newInvitationForm, email: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white" required />
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">Tipo de destino</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setNewInvitationForm({...newInvitationForm, targetType: "workspace"})} className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${newInvitationForm.targetType === "workspace" ? "bg-cyan-500/20 border border-cyan-500/50 text-cyan-300" : "bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700"}`}>Workspace</button>
                  <button type="button" onClick={() => setNewInvitationForm({...newInvitationForm, targetType: "space"})} className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${newInvitationForm.targetType === "space" ? "bg-cyan-500/20 border border-cyan-500/50 text-cyan-300" : "bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700"}`}>Space</button>
                </div>
              </div>
              {newInvitationForm.targetType === "workspace" ? (
                <SearchableSelect label="Workspace" placeholder="Buscar workspace..." value={newInvitationForm.targetId} onChange={(id) => setNewInvitationForm({...newInvitationForm, targetId: id})} items={workspaces} />
              ) : (
                <SearchableSelect label="Space" placeholder="Buscar space..." value={newInvitationForm.targetId} onChange={(id) => setNewInvitationForm({...newInvitationForm, targetId: id})} items={spaces} />
              )}
              <select value={newInvitationForm.role} onChange={(e) => setNewInvitationForm({...newInvitationForm, role: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white">
                <option value="member">Miembro</option>
                <option value="admin">Administrador</option>
              </select>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setIsCreateInvitationOpen(false)} className="px-4 py-2 text-xs font-semibold bg-slate-800 text-slate-300 rounded-xl">Cancelar</button>
                <button type="submit" className="px-4 py-2 text-xs font-bold bg-cyan-600 text-white rounded-xl">Crear</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {admin.isJoinModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800/80 w-full max-w-md rounded-2xl p-6 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white">Unirme a Workspace</h3>
              <button onClick={() => admin.setIsJoinModalOpen(false)} className="p-1 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); admin.handleJoinWorkspace(e); }} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Código de Invitación</label>
                <input 
                  type="text" 
                  placeholder="ABC123" 
                  value={admin.joinForm.inviteCode} 
                  onChange={(e) => admin.setJoinForm({...admin.joinForm, inviteCode: e.target.value.toUpperCase()})} 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white uppercase tracking-widest font-mono" 
                  maxLength={6}
                  required 
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Slug del Workspace</label>
                <input 
                  type="text" 
                  placeholder="nombre-del-workspace" 
                  value={admin.joinForm.workspaceSlug} 
                  onChange={(e) => admin.setJoinForm({...admin.joinForm, workspaceSlug: e.target.value.toLowerCase()})} 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white lowercase" 
                  required 
                />
              </div>
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800/80">
                <button type="button" onClick={() => admin.setIsJoinModalOpen(false)} className="px-4 py-2 text-xs font-semibold bg-slate-800/80 hover:bg-slate-800 text-slate-300 rounded-xl transition-all">Cancelar</button>
                <button type="submit" className="px-4 py-2 text-xs font-bold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl transition-all shadow-lg shadow-cyan-500/20">Unirme al Workspace</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}