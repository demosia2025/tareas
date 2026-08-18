"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Users, FolderKanban, Layers, Building2,
  User, LogOut, Plus, Trash2, Edit3, Search, BarChart3, Key, UserPlus, X,
  ChevronLeft, ChevronDown, Crown, Shield
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
    {value && <button onClick={() => onChange("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"><X className="w-3.5 h-3.5" /></button>}
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
                className={`w-full text-left px-3.5 py-2 text-xs hover:bg-slate-800 transition-colors border-b border-slate-800/50 last:border-0 ${
                  item.id === value ? "bg-cyan-500/10 text-cyan-300" : "text-slate-300"
                }`}
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
export default function AdminPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const admin = useAdminDashboard();

  // Estados para datos de búsqueda
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [spaces, setSpaces] = useState<any[]>([]);

  // ✅ NUEVOS ESTADOS PARA MODALES DE EDICIÓN
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

  // ESTADOS PARA MODALES DE CREACIÓN
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

  // GENERADORES
  const generateRandomCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();
  const generateShortId = (length: number = 6) => Math.floor(Math.pow(10, length - 1) + Math.random() * 9 * Math.pow(10, length - 1)).toString();
  const generateRandomSlug = (name: string) => {
    const randomNum = Math.floor(Math.random() * 10000);
    return `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${randomNum}`;
  };

  // ✅ FUNCIONES DE EDICIÓN
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

  const handleUpdateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/admin/workspaces?id=${editingWorkspace.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editWorkspaceForm)
      });
      if (res.ok) {
        if (admin.fetchData) admin.fetchData();
        setIsEditWorkspaceOpen(false);
        setEditingWorkspace(null);
        alert("Workspace actualizado");
      } else {
        const err = await res.json();
        alert(err.error || "Error al actualizar workspace");
      }
    } catch (error) {
      alert("Error de conexión");
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
        if (admin.fetchData) admin.fetchData();
        setIsEditSpaceOpen(false);
        setEditingSpace(null);
        alert("Space actualizado");
      } else {
        const err = await res.json();
        alert(err.error || "Error al actualizar space");
      }
    } catch (error) {
      alert("Error de conexión");
    }
  };

  // ✅ FUNCIONES DE ELIMINACIÓN
  const handleDeleteWorkspace = async (wsId: string) => {
    if (!confirm("¿Estás seguro de eliminar este workspace? Esta acción no se puede deshacer.")) return;
    try {
      const res = await fetch(`/api/admin/workspaces?id=${wsId}`, { method: "DELETE" });
      if (res.ok) {
        if (admin.fetchData) admin.fetchData();
        alert("Workspace eliminado");
      } else {
        const err = await res.json();
        alert(err.error || "Error al eliminar workspace");
      }
    } catch (error) {
      alert("Error de conexión");
    }
  };

  const handleDeleteSpace = async (spaceId: string) => {
    if (!confirm("¿Estás seguro de eliminar este space? Esta acción no se puede deshacer.")) return;
    try {
      const res = await fetch(`/api/admin/spaces?id=${spaceId}`, { method: "DELETE" });
      if (res.ok) {
        if (admin.fetchData) admin.fetchData();
        alert("Space eliminado");
      } else {
        const err = await res.json();
        alert(err.error || "Error al eliminar space");
      }
    } catch (error) {
      alert("Error de conexión");
    }
  };

  const handleDeleteCode = async (codeId: string) => {
    if (!confirm("¿Eliminar este código de invitación?")) return;
    try {
      const res = await fetch(`/api/admin/invite-codes?id=${codeId}`, { method: "DELETE" });
      if (res.ok) {
        if (admin.fetchData) admin.fetchData();
      } else {
        const err = await res.json();
        alert(err.error || "Error al eliminar código");
      }
    } catch (error) {
      alert("Error de conexión");
    }
  };

  const handleDeleteInvitation = async (invitationId: string) => {
    if (!confirm("¿Eliminar esta invitación?")) return;
    try {
      const res = await fetch(`/api/admin/invitations?id=${invitationId}`, { method: "DELETE" });
      if (res.ok) {
        if (admin.fetchData) admin.fetchData();
      } else {
        const err = await res.json();
        alert(err.error || "Error al eliminar invitación");
      }
    } catch (error) {
      alert("Error de conexión");
    }
  };

  // FUNCIONES DE CREACIÓN
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
        if (admin.fetchData) admin.fetchData();
        setIsCreateOrgOpen(false);
        setNewOrgForm({ name: "", slug: "", plan: "free", description: "" });
        alert(`Organización creada con ID: ${orgId}`);
      } else {
        const err = await res.json();
        alert(err.error || "Error al crear organización");
      }
    } catch (error) {
      alert("Error de conexión");
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
        if (admin.fetchData) admin.fetchData();
        setIsCreateWorkspaceOpen(false);
        setNewWorkspaceForm({ name: "", organizationId: "", plan: "free" });
        alert(`Workspace creado con ID: ${wsId}`);
      } else {
        const err = await res.json();
        alert(err.error || "Error al crear workspace");
      }
    } catch (error) {
      alert("Error de conexión");
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
        if (admin.fetchData) admin.fetchData();
        setIsCreateSpaceOpen(false);
        setNewSpaceForm({ name: "", workspaceId: "", description: "", color: "#8b5cf6" });
        alert(`Space creado con ID: ${spaceId}`);
      } else {
        const err = await res.json();
        alert(err.error || "Error al crear space");
      }
    } catch (error) {
      alert("Error de conexión");
    }
  };

  const handleCreateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!newCodeForm.targetId) {
        alert("Debes seleccionar un workspace o space");
        return;
      }
      const res = await fetch("/api/admin/invite-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: generateRandomCode(),
          workspaceId: newCodeForm.targetType === "workspace" ? newCodeForm.targetId : null,
          spaceId: newCodeForm.targetType === "space" ? newCodeForm.targetId : null,
          maxUses: newCodeForm.maxUses,
          expiresAt: newCodeForm.expiresAt ? new Date(newCodeForm.expiresAt) : null
        })
      });
      if (res.ok) {
        if (admin.fetchData) admin.fetchData();
        setIsCreateCodeOpen(false);
        setNewCodeForm({ targetId: "", targetType: "workspace", maxUses: 5, expiresAt: "" });
      } else {
        const err = await res.json();
        alert(err.error || "Error al crear código");
      }
    } catch (error) {
      alert("Error de conexión");
    }
  };

  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!newInvitationForm.email || !newInvitationForm.targetId) {
        alert("Email y workspace/space son requeridos");
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
        if (admin.fetchData) admin.fetchData();
        setIsCreateInvitationOpen(false);
        setNewInvitationForm({ email: "", targetId: "", targetType: "workspace", role: "member" });
      } else {
        const err = await res.json();
        alert(err.error || "Error al crear invitación");
      }
    } catch (error) {
      alert("Error de conexión");
    }
  };

  // FUNCIONES EXCLUSIVAS DE SUPER ADMIN
  const handleChangeOrgPlan = async (orgId: string, newPlan: string) => {
    try {
      const res = await fetch("/api/admin/organizations/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, plan: newPlan })
      });
      if (res.ok) {
        alert("Plan actualizado correctamente");
        if (admin.fetchData) admin.fetchData();
      } else {
        const err = await res.json();
        alert(err.error || "Error al cambiar plan");
      }
    } catch (error) {
      alert("Error de conexión");
    }
  };

  const handleDeleteOrg = async (orgId: string) => {
    if (!confirm("¿Estás seguro de eliminar esta organización y todo su contenido? Esta acción no se puede deshacer.")) return;
    try {
      const res = await fetch(`/api/admin/organizations?id=${orgId}`, { method: "DELETE" });
      if (res.ok) {
        alert("Organización eliminada");
        if (admin.fetchData) admin.fetchData();
      } else {
        const err = await res.json();
        alert(err.error || "Error al eliminar");
      }
    } catch (error) {
      alert("Error de conexión");
    }
  };

  if (admin.isLoading) return <div className="h-screen bg-slate-950 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div></div>;
  if (!admin.isAdmin) return <div className="h-screen bg-slate-950 flex items-center justify-center text-red-500">No tienes permisos de Super Administrador</div>;

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
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col">
      {/* Header */}
      <header className="h-16 bg-slate-900/40 border-b border-slate-800/80 px-4 sm:px-6 flex items-center justify-between backdrop-blur-xl relative z-20 flex-shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/" className="text-lg font-black bg-gradient-to-r from-cyan-400 via-cyan-300 to-blue-500 bg-clip-text text-transparent tracking-tight hover:opacity-90 transition-opacity">
            Project SaaS Kanban
          </Link>
          <div className="h-5 w-px bg-slate-800 hidden sm:block" />
          <Link href="/" className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/80 text-xs font-semibold text-slate-300 hover:text-white transition-all shadow-sm">
            <ChevronLeft className="w-3.5 h-3.5 text-cyan-400" /><span>Volver al Workspace</span>
          </Link>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-xl text-xs font-semibold text-amber-300">
            <Shield className="w-3.5 h-3.5" />
            <span>Super Admin</span>
          </div>

          <div className="relative">
            <button onClick={() => admin.setIsProfileMenuOpen(!admin.isProfileMenuOpen)} className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800/80 transition-all shadow-sm">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-md shadow-cyan-500/20">
                {(session?.user?.name || "U")[0].toUpperCase()}
              </div>
              <span className="text-xs font-semibold text-slate-200 hidden sm:inline">{session?.user?.name || "Usuario"}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>
            
            {admin.isProfileMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => admin.setIsProfileMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-56 bg-slate-900/90 border border-slate-800/80 rounded-2xl shadow-2xl py-1.5 z-50 backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="px-4 py-2 border-b border-slate-800/80 mb-1">
                    <p className="text-xs font-bold text-white truncate">{session?.user?.name}</p>
                    <p className="text-[11px] text-slate-400 truncate">{session?.user?.email}</p>
                  </div>
                  <Link href="/profile" onClick={() => admin.setIsProfileMenuOpen(false)} className="w-full text-left px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800/60 hover:text-white transition-colors flex items-center gap-2">
                    <User className="w-3.5 h-3.5 text-cyan-400" /><span>Mi Perfil</span>
                  </Link>
                  <button onClick={() => { admin.setIsProfileMenuOpen(false); admin.setIsJoinModalOpen(true); }} className="w-full text-left px-4 py-2 text-xs font-medium text-cyan-300 hover:bg-cyan-500/10 hover:text-cyan-200 transition-colors flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5" /><span>Unirme a Workspace</span>
                  </button>
                  <div className="border-t border-slate-800/80 my-1" />
                  <button onClick={() => router.push("/api/auth/signout")} className="w-full text-left px-4 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors flex items-center gap-2">
                    <LogOut className="w-3.5 h-3.5 text-rose-400" /><span>Cerrar Sesión</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex gap-2 border-b border-slate-800/80 overflow-x-auto pb-2 scrollbar-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button key={tab.id} onClick={() => admin.setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all border whitespace-nowrap ${admin.activeTab === tab.id ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-300" : "bg-slate-900/40 border-slate-800/70 text-slate-400 hover:bg-slate-900/80"}`}>
                  <Icon className="w-4 h-4 flex-shrink-0" /><span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB: RESUMEN GLOBAL */}
          {admin.activeTab === "overview" && (
            <div className="space-y-6">
              <div className="rounded-2xl p-4 border bg-gradient-to-r from-amber-950/20 to-orange-950/20 border-amber-500/30">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                    <Crown className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Panel de Super Administrador</h3>
                    <p className="text-xs text-slate-400">Vista global de toda la plataforma</p>
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

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl">
                  <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><Building2 className="w-4 h-4 text-cyan-400" />Distribución de Organizaciones por Plan</h3>
                  <div className="space-y-4">
                    {["Free", "Pro", "Premium"].map((plan, idx) => {
                      const count = admin.orgStats.filter((o: any) => o.plan === plan.toLowerCase()).length;
                      const percentage = admin.orgStats.length > 0 ? (count / admin.orgStats.length) * 100 : 0;
                      const colors = ["bg-slate-500", "bg-blue-500", "bg-purple-500"];
                      return (
                        <div key={plan}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-slate-300">{plan}</span>
                            <span className="text-xs font-bold text-white">{count} ({percentage.toFixed(0)}%)</span>
                          </div>
                          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div className={`h-full ${colors[idx]} rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl">
                  <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2"><FolderKanban className="w-4 h-4 text-purple-400" />Workspaces por Organización</h3>
                  <div className="space-y-3">
                    {admin.orgStats.slice(0, 5).map((org: any) => {
                      const wsCount = admin.workspaceStats.filter((ws: any) => ws.organizationId === org.id).length;
                      return (
                        <div key={org.id} className="flex items-center justify-between p-3 bg-slate-800/40 rounded-xl border border-slate-700/50">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center"><Building2 className="w-4 h-4 text-purple-400" /></div>
                            <div>
                              <p className="text-xs font-semibold text-white">{org.name}</p>
                              <p className="text-[10px] text-slate-400 capitalize">{org.plan}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-300">{wsCount}</span>
                            <FolderKanban className="w-3.5 h-3.5 text-slate-500" />
                          </div>
                        </div>
                      );
                    })}
                    {admin.orgStats.length === 0 && <p className="text-xs text-slate-500 text-center py-4">Sin organizaciones registradas</p>}
                    {admin.orgStats.length > 5 && (
                      <p className="text-xs text-slate-400 text-center pt-2">+{admin.orgStats.length - 5} organizaciones más</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: WORKSPACES - ✅ CON EDITAR Y ELIMINAR */}
          {admin.activeTab === "workspaces" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-white">Workspaces (Todos del sistema)</h2>
                <button onClick={() => setIsCreateWorkspaceOpen(true)} className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-2">
                  <Plus className="w-4 h-4" />Crear Workspace
                </button>
              </div>
              <SearchInput value={admin.searchWorkspaces} onChange={admin.setSearchWorkspaces} placeholder="Buscar workspace por nombre o slug..." />
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden">
                <table className="w-full text-left">
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
                            <button 
                              onClick={() => openEditWorkspace(ws)}
                              className="text-cyan-400 hover:bg-cyan-500/10 p-1.5 rounded"
                              title="Editar workspace"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => handleDeleteWorkspace(ws.id)}
                              className="text-rose-400 hover:bg-rose-500/10 p-1.5 rounded"
                              title="Eliminar workspace"
                            >
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
          )}

          {/* TAB: SPACES - ✅ CON EDITAR Y ELIMINAR */}
          {admin.activeTab === "spaces" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-white">Spaces (Todos del sistema)</h2>
                <button onClick={() => setIsCreateSpaceOpen(true)} className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-2">
                  <Plus className="w-4 h-4" />Crear Space
                </button>
              </div>
              <SearchInput value={admin.searchSpaces} onChange={admin.setSearchSpaces} placeholder="Buscar space por nombre o workspace..." />
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden">
                <table className="w-full text-left">
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
                            <button 
                              onClick={() => openEditSpace(space)}
                              className="text-cyan-400 hover:bg-cyan-500/10 p-1.5 rounded"
                              title="Editar space"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => handleDeleteSpace(space.id)}
                              className="text-rose-400 hover:bg-rose-500/10 p-1.5 rounded"
                              title="Eliminar space"
                            >
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
          )}

          {/* TAB: ORGANIZACIONES */}
          {admin.activeTab === "organizations" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-white">Organizaciones (Todas del sistema)</h2>
                <button onClick={() => setIsCreateOrgOpen(true)} className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-2">
                  <Plus className="w-4 h-4" />Crear Organización
                </button>
              </div>
              <SearchInput value={admin.searchOrgs} onChange={admin.setSearchOrgs} placeholder="Buscar organización..." />
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-950/50 border-b border-slate-800/80 text-[11px] font-bold text-slate-400 uppercase">
                    <tr><th className="px-6 py-3.5">Nombre</th><th className="px-6 py-3.5">Slug</th><th className="px-6 py-3.5">Plan</th><th className="px-6 py-3.5 text-right">Acciones Super Admin</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 text-xs">
                    {admin.organizations.map((org: any) => (
                      <tr key={org.id} className="hover:bg-slate-800/25">
                        <td className="px-6 py-3.5 font-semibold">{org.name}</td>
                        <td className="px-6 py-3.5 text-slate-400">{org.slug}</td>
                        <td className="px-6 py-3.5 capitalize">{org.plan}</td>
                        <td className="px-6 py-3.5 text-right">
                          <div className="flex justify-end gap-2">
                            <select 
                              value={org.plan} 
                              onChange={(e) => handleChangeOrgPlan(org.id, e.target.value)}
                              className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                            >
                              <option value="free">Free</option>
                              <option value="pro">Pro</option>
                              <option value="premium">Premium</option>
                            </select>
                            <button 
                              onClick={() => handleDeleteOrg(org.id)}
                              className="text-rose-400 hover:bg-rose-500/10 p-1.5 rounded"
                              title="Eliminar organización"
                            >
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
          )}

          {/* TAB: USUARIOS */}
          {admin.activeTab === "users" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-white">Usuarios (Todos del sistema)</h2>
                <button onClick={() => admin.setIsCreateUserOpen(true)} className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-2">
                  <Plus className="w-4 h-4" />Crear Usuario
                </button>
              </div>
              <SearchInput value={admin.searchUsers} onChange={admin.setSearchUsers} placeholder="Buscar usuario..." />
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-950/50 border-b border-slate-800/80 text-[11px] font-bold text-slate-400 uppercase">
                    <tr><th className="px-6 py-3.5">Usuario</th><th className="px-6 py-3.5">Email</th><th className="px-6 py-3.5">Rol</th><th className="px-6 py-3.5 text-right">Acciones</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50 text-xs">
                    {admin.users.map((user: any) => (
                      <tr key={user.id} className="hover:bg-slate-800/25">
                        <td className="px-6 py-3.5 font-semibold">{user.name}</td>
                        <td className="px-6 py-3.5 text-slate-400">{user.email}</td>
                        <td className="px-6 py-3.5 capitalize">{user.role}</td>
                        <td className="px-6 py-3.5 text-right flex justify-end gap-2">
                          <button onClick={() => { admin.setEditingUser(user); admin.setEditForm({ role: user.role, password: "" }); }} className="text-cyan-400 hover:bg-cyan-500/10 p-1.5 rounded"><Edit3 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => admin.handleDeleteUser(user.id)} className="text-rose-400 hover:bg-rose-500/10 p-1.5 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: INVITACIONES */}
          {admin.activeTab === "invitations" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-white">Invitaciones (Todas del sistema)</h2>
                <button onClick={() => setIsCreateInvitationOpen(true)} className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-2">
                  <Plus className="w-4 h-4" />Crear Invitación
                </button>
              </div>
              <SearchInput value={admin.searchInvitations} onChange={admin.setSearchInvitations} placeholder="Buscar invitación..." />
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden">
                <table className="w-full text-left">
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
                          <button 
                            onClick={() => handleDeleteInvitation(inv.id)}
                            className="text-rose-400 hover:bg-rose-500/10 p-1.5 rounded"
                            title="Eliminar invitación"
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
          )}

          {/* TAB: CÓDIGOS */}
          {admin.activeTab === "invite-codes" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-white">Códigos de Invitación (Todos del sistema)</h2>
                <button onClick={() => setIsCreateCodeOpen(true)} className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-xl text-xs font-bold flex items-center gap-2">
                  <Plus className="w-4 h-4" />Crear Código
                </button>
              </div>
              <SearchInput value={admin.searchCodes} onChange={admin.setSearchCodes} placeholder="Buscar código..." />
              <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden">
                <table className="w-full text-left">
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
                          <button 
                            onClick={() => handleDeleteCode(code.id)}
                            className="text-rose-400 hover:bg-rose-500/10 p-1.5 rounded"
                            title="Eliminar código"
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
          )}
        </div>
      </main>

      {/* ========================================== */}
      {/* MODALES DE CREACIÓN (sin cambios)          */}
      {/* ========================================== */}

      {/* MODAL CREAR WORKSPACE */}
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

      {/* ✅ MODAL EDITAR WORKSPACE */}
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

      {/* MODAL CREAR ORGANIZACIÓN */}
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

      {/* MODAL CREAR SPACE */}
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

      {/* ✅ MODAL EDITAR SPACE */}
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

      {/* MODAL CREAR CÓDIGO */}
      {isCreateCodeOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">Crear Código de Invitación</h3>
            <form onSubmit={handleCreateCode} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">Tipo de destino</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewCodeForm({...newCodeForm, targetType: "workspace"})}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      newCodeForm.targetType === "workspace" 
                        ? "bg-cyan-500/20 border border-cyan-500/50 text-cyan-300" 
                        : "bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700"
                    }`}
                  >
                    Workspace
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewCodeForm({...newCodeForm, targetType: "space"})}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      newCodeForm.targetType === "space" 
                        ? "bg-cyan-500/20 border border-cyan-500/50 text-cyan-300" 
                        : "bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700"
                    }`}
                  >
                    Space
                  </button>
                </div>
              </div>

              {newCodeForm.targetType === "workspace" ? (
                <SearchableSelect
                  label="Workspace"
                  placeholder="Buscar workspace por nombre o ID..."
                  value={newCodeForm.targetId}
                  onChange={(id) => setNewCodeForm({...newCodeForm, targetId: id})}
                  items={workspaces}
                />
              ) : (
                <SearchableSelect
                  label="Space"
                  placeholder="Buscar space por nombre o ID..."
                  value={newCodeForm.targetId}
                  onChange={(id) => setNewCodeForm({...newCodeForm, targetId: id})}
                  items={spaces}
                />
              )}

              <input 
                type="number" 
                placeholder="Máximo de usos" 
                value={newCodeForm.maxUses} 
                onChange={(e) => setNewCodeForm({...newCodeForm, maxUses: parseInt(e.target.value) || 5})} 
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white" 
                min="1"
                required 
              />
              
              <div>
                <label className="block text-xs text-slate-400 mb-1">Fecha de expiración (opcional)</label>
                <input 
                  type="datetime-local" 
                  value={newCodeForm.expiresAt} 
                  onChange={(e) => setNewCodeForm({...newCodeForm, expiresAt: e.target.value})} 
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white" 
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button type="button" onClick={() => setIsCreateCodeOpen(false)} className="px-4 py-2 text-xs font-semibold bg-slate-800 text-slate-300 rounded-xl">
                  Cancelar
                </button>
                <button type="submit" className="px-4 py-2 text-xs font-bold bg-cyan-600 text-white rounded-xl">
                  Crear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CREAR INVITACIÓN */}
      {isCreateInvitationOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">Crear Invitación</h3>
            <form onSubmit={handleCreateInvitation} className="space-y-4">
              <input type="email" placeholder="Email del usuario" value={newInvitationForm.email} onChange={(e) => setNewInvitationForm({...newInvitationForm, email: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white" required />
              
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">Tipo de destino</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewInvitationForm({...newInvitationForm, targetType: "workspace"})}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      newInvitationForm.targetType === "workspace" 
                        ? "bg-cyan-500/20 border border-cyan-500/50 text-cyan-300" 
                        : "bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700"
                    }`}
                  >
                    Workspace
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewInvitationForm({...newInvitationForm, targetType: "space"})}
                    className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      newInvitationForm.targetType === "space" 
                        ? "bg-cyan-500/20 border border-cyan-500/50 text-cyan-300" 
                        : "bg-slate-800 border border-slate-700 text-slate-400 hover:bg-slate-700"
                    }`}
                  >
                    Space
                  </button>
                </div>
              </div>

              {newInvitationForm.targetType === "workspace" ? (
                <SearchableSelect
                  label="Workspace"
                  placeholder="Buscar workspace por nombre o ID..."
                  value={newInvitationForm.targetId}
                  onChange={(id) => setNewInvitationForm({...newInvitationForm, targetId: id})}
                  items={workspaces}
                />
              ) : (
                <SearchableSelect
                  label="Space"
                  placeholder="Buscar space por nombre o ID..."
                  value={newInvitationForm.targetId}
                  onChange={(id) => setNewInvitationForm({...newInvitationForm, targetId: id})}
                  items={spaces}
                />
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

      {/* MODAL CREAR USUARIO */}
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

      {/* MODAL UNIRME A WORKSPACE */}
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
                <input type="text" placeholder="ABC123" value={admin.joinForm.inviteCode} onChange={(e) => admin.setJoinForm({...admin.joinForm, inviteCode: e.target.value.toUpperCase()})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white uppercase" required />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Slug del Workspace</label>
                <input type="text" placeholder="nombre-del-workspace" value={admin.joinForm.workspaceSlug} onChange={(e) => admin.setJoinForm({...admin.joinForm, workspaceSlug: e.target.value})} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white" required />
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