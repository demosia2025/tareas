"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Shield, Users, Building2, Plus, Search, Edit2, Trash2, Key, Copy, X,
  ChevronLeft, UserPlus, Calendar, Code, LayoutGrid, Settings, Menu,
  Check, User, LogOut, ChevronDown, CreditCard, TrendingUp, AlertTriangle, 
  FolderKanban, Mail, Sparkles, Activity, BarChart3, TrendingDown
} from "lucide-react";

interface Organization {
  id: string; name: string; slug: string; description?: string | null;
  plan: string; createdAt: string; _count?: { workspaces: number };
}
interface UserData {
  id: string; name: string; email: string; role: string; createdAt: string;
  _count?: { memberships: number; createdTasks: number };
}
interface InviteCode {
  id: string; code: string; maxUses: number; usedCount: number;
  expiresAt?: string | null; createdAt: string;
  createdBy: { name: string; email: string };
  workspace?: { name: string };
  usedBy?: Array<{ name: string; email: string }>;
}
interface Space {
  id: string; name: string; slug: string; description?: string | null;
  icon?: string | null; color?: string | null; isPrivate: boolean;
  position: number; createdAt: string; workspace?: { name: string };
  _count?: { folders: number; lists: number };
}
interface Workspace {
  id: string; name: string; slug: string; plan: string; color?: string;
  createdAt: string; _count?: { members: number; spaces: number };
}
interface Invitation {
  id: string; email: string; workspaceId: string; status: "pending" | "accepted" | "rejected";
  createdAt: string; workspace?: { name: string }; inviter?: { name: string };
}

type TabType = "dashboard" | "overview" | "workspaces" | "organizations" | "spaces" | "users" | "invitations" | "invite-codes" | "settings";

const PLANS = {
  FREE: { name: "Free", price: 0, maxUsers: 5 },
  PRO: { name: "Pro", priceUF: 1, maxUsers: 15 },
  PREMIUM: { name: "Premium", priceUF: 2, maxUsers: Infinity }
};

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<TabType>("dashboard");
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [users, setUsers] = useState<UserData[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [inviteCodes, setInviteCodes] = useState<InviteCode[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchWorkspaces, setSearchWorkspaces] = useState("");
  const [searchOrganizations, setSearchOrganizations] = useState("");
  const [searchSpaces, setSearchSpaces] = useState("");
  const [searchUsers, setSearchUsers] = useState("");
  const [searchInvitations, setSearchInvitations] = useState("");
  const [searchInviteCodes, setSearchInviteCodes] = useState("");
  
  const [filterRole, setFilterRole] = useState<string>("all");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const [showCreateUser, setShowCreateUser] = useState(false);
  const [showCreateSpace, setShowCreateSpace] = useState(false);
  const [showCreateInviteCode, setShowCreateInviteCode] = useState(false);
  const [showCreateInvitation, setShowCreateInvitation] = useState(false);
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [editingSpace, setEditingSpace] = useState<Space | null>(null);
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);

  const [userForm, setUserForm] = useState({ name: "", email: "", password: "", role: "user", workspaceId: "" });
  const [spaceForm, setSpaceForm] = useState({ name: "", description: "", color: "#06b6d4", workspaceId: "" });
  const [workspaceForm, setWorkspaceForm] = useState({ name: "", slug: "", plan: "free", color: "#06b6d4" });
  const [inviteForm, setInviteForm] = useState({ workspaceId: "", maxUses: 1, expiresAt: "" });
  const [invitationForm, setInvitationForm] = useState({ email: "", workspaceId: "" });
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  
  const [orgForm, setOrgForm] = useState({ name: "", description: "", plan: "free" });
  const [isEditingOrg, setIsEditingOrg] = useState(false);
  
  const [ufValue, setUfValue] = useState<number>(0);
  const [ivaRate, setIvaRate] = useState<number>(19);

  useEffect(() => {
    if (status === "unauthenticated") { router.push("/api/auth/signin"); return; }
    if (status === "authenticated") { fetchData(); fetchUFValue(); }
  }, [status, router]);

  const fetchUFValue = async () => {
    try {
      const response = await fetch("https://mindicador.cl/api/uf");
      if (response.ok) {
        const data = await response.json();
        setUfValue(data.serie[0].valor);
      } else { setUfValue(36000); }
    } catch (error) { setUfValue(36000); }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [orgRes, usersRes, spacesRes, codesRes, wsRes, invRes] = await Promise.all([
        fetch("/api/admin2/organization"),
        fetch("/api/admin2/users"),
        fetch("/api/admin2/spaces"),
        fetch("/api/admin2/invite-codes"),
        fetch("/api/admin2/workspaces"),
        fetch("/api/admin2/invitations").catch(() => ({ ok: false, json: () => Promise.resolve([]) })),
      ]);

      if (orgRes.ok) {
        const orgData = await orgRes.json();
        setOrganization(orgData);
        setOrgForm({ name: orgData.name, description: orgData.description || "", plan: orgData.plan || "free" });
      }
      if (usersRes.ok) setUsers(await usersRes.json());
      if (spacesRes.ok) setSpaces(await spacesRes.json());
      if (codesRes.ok) setInviteCodes(await codesRes.json());
      if (wsRes.ok) setWorkspaces(await wsRes.json());
      if (invRes.ok) setInvitations(await invRes.json());
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = editingUser ? "PUT" : "POST";
      const url = editingUser ? `/api/admin2/users?id=${editingUser.id}` : "/api/admin2/users";
      const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(userForm) });
      if (response.ok) {
        await fetchData(); setShowCreateUser(false); setEditingUser(null);
        setUserForm({ name: "", email: "", password: "", role: "user", workspaceId: "" });
      } else { 
        const err = await response.json();
        alert(err.error || "Error al guardar usuario"); 
      }
    } catch (error) { alert("Error al guardar usuario"); }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("¿Estás seguro de eliminar este usuario?")) return;
    try {
      const response = await fetch(`/api/admin2/users?id=${userId}`, { method: "DELETE" });
      if (response.ok) await fetchData();
    } catch (error) { console.error(error); }
  };

  const handleSaveSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = editingSpace ? "PUT" : "POST";
      const url = editingSpace ? `/api/admin2/spaces?id=${editingSpace.id}` : "/api/admin2/spaces";
      const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(spaceForm) });
      if (response.ok) {
        await fetchData(); setShowCreateSpace(false); setEditingSpace(null);
        setSpaceForm({ name: "", description: "", color: "#06b6d4", workspaceId: "" });
      } else { alert((await response.json()).error || "Error al guardar espacio"); }
    } catch (error) { alert("Error al guardar espacio"); }
  };

  const handleDeleteSpace = async (spaceId: string) => {
    if (!confirm("¿Estás seguro de eliminar este espacio y todo su contenido?")) return;
    try {
      const response = await fetch(`/api/admin2/spaces?id=${spaceId}`, { method: "DELETE" });
      if (response.ok) await fetchData();
    } catch (error) { console.error(error); }
  };

  const handleSaveWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const method = editingWorkspace ? "PUT" : "POST";
      const url = editingWorkspace ? `/api/admin2/workspaces?id=${editingWorkspace.id}` : "/api/admin2/workspaces";
      const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(workspaceForm) });
      if (response.ok) {
        await fetchData(); setShowCreateWorkspace(false); setEditingWorkspace(null);
        setWorkspaceForm({ name: "", slug: "", plan: "free", color: "#06b6d4" });
      } else { alert((await response.json()).error || "Error al guardar workspace"); }
    } catch (error) { alert("Error al guardar workspace"); }
  };

  const handleDeleteWorkspace = async (workspaceId: string) => {
    if (!confirm("¿Estás seguro de eliminar este workspace?")) return;
    try {
      const response = await fetch(`/api/admin2/workspaces?id=${workspaceId}`, { method: "DELETE" });
      if (response.ok) await fetchData();
    } catch (error) { console.error(error); }
  };

  const handleCreateInviteCode = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/admin2/invite-codes", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(inviteForm),
      });
      if (response.ok) {
        await fetchData(); setShowCreateInviteCode(false);
        setInviteForm({ workspaceId: "", maxUses: 1, expiresAt: "" });
      } else { alert((await response.json()).error || "Error al generar código"); }
    } catch (error) { alert("Error al generar código"); }
  };

  const handleCreateInvitation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/admin2/invitations", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(invitationForm),
      });
      if (response.ok) {
        await fetchData(); setShowCreateInvitation(false);
        setInvitationForm({ email: "", workspaceId: "" });
      } else { alert((await response.json()).error || "Error al crear invitación"); }
    } catch (error) { alert("Error al crear invitación"); }
  };

  const handleSaveOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/admin2/organization", {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(orgForm),
      });
      if (response.ok) { await fetchData(); setIsEditingOrg(false); alert("Organización actualizada con éxito"); }
      else { alert((await response.json()).error || "Error al actualizar organización"); }
    } catch (error) { alert("Error al actualizar organización"); }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const calculatePrice = (planUF: number) => {
    const subtotal = planUF * ufValue;
    const iva = subtotal * (ivaRate / 100);
    return { subtotal, iva, total: subtotal + iva };
  };

  const getFiltered = (data: any[], search: string, fields: string[]) => {
    const q = search.toLowerCase().trim();
    if (!q) return data;
    return data.filter((item: any) => 
      fields.some(field => {
        const val = item[field];
        return val && String(val).toLowerCase().includes(q);
      })
    );
  };

  const filteredWorkspaces = useMemo(() => getFiltered(workspaces, searchWorkspaces, ["name", "slug"]), [workspaces, searchWorkspaces]);
  const filteredOrganizations = useMemo(() => getFiltered(organization ? [organization] : [], searchOrganizations, ["name", "slug"]), [organization, searchOrganizations]);
  const filteredSpaces = useMemo(() => getFiltered(spaces, searchSpaces, ["name", "slug", "description"]), [spaces, searchSpaces]);
  const filteredUsers = useMemo(() => {
    const baseFiltered = getFiltered(users, searchUsers, ["name", "email", "role"]);
    return filterRole === "all" ? baseFiltered : baseFiltered.filter((u: any) => u.role === filterRole);
  }, [users, searchUsers, filterRole]);
  const filteredInvitations = useMemo(() => getFiltered(invitations, searchInvitations, ["email", "workspace.name", "status"]), [invitations, searchInvitations]);
  const filteredInviteCodes = useMemo(() => getFiltered(inviteCodes, searchInviteCodes, ["code", "createdBy.name", "createdBy.email"]), [inviteCodes, searchInviteCodes]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-3 border-cyan-500 border-t-transparent" />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Cargando panel...</span>
        </div>
      </div>
    );
  }

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "overview", label: "Resumen", icon: LayoutGrid },
    { id: "workspaces", label: "Workspaces", icon: FolderKanban },
    { id: "organizations", label: "Organización", icon: Building2 },
    { id: "spaces", label: "Espacios", icon: Code },
    { id: "users", label: "Usuarios", icon: Users },
    { id: "invitations", label: "Invitaciones", icon: Mail },
    { id: "invite-codes", label: "Códigos de Invitación", icon: Key },
    { id: "settings", label: "Configuración", icon: Settings },
  ];

  const SearchInput = ({ value, onChange, placeholder, count }: { value: string; onChange: (val: string) => void; placeholder: string; count?: number }) => (
    <div className="flex items-center gap-3 w-full max-w-2xl">
      <div className="relative flex-1">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input 
          type="text" 
          value={value} 
          onChange={(e) => onChange(e.target.value)} 
          placeholder={placeholder} 
          className="w-full bg-slate-900/80 border border-slate-700/50 rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500/50 transition-all" 
        />
        {value && (
          <button onClick={() => onChange("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded-md transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {count !== undefined && (
        <span className="text-xs font-medium text-slate-400 bg-slate-900/50 px-3 py-2.5 rounded-xl border border-slate-800 whitespace-nowrap">
          {count} resultado{count !== 1 ? 's' : ''}
        </span>
      )}
    </div>
  );

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 flex flex-col">
      {/* HEADER */}
      <header className="h-14 bg-slate-900/80 backdrop-blur-2xl border-b border-slate-800/80 flex-shrink-0 z-[9999]">
        <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="md:hidden p-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300">
              <Menu className="w-4 h-4" />
            </button>
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 via-cyan-500 to-blue-600 flex items-center justify-center shadow-md shadow-cyan-500/25 group-hover:scale-105 transition-transform">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <div className="hidden sm:flex items-center space-x-3 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800 shadow-lg backdrop-blur-sm">
                <span className="text-sm font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
                  Project SaaS - Admin
                </span>
              </div>
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-xl text-xs font-semibold text-slate-300 transition-colors">
              <ChevronLeft className="w-3.5 h-3.5" /><span>Volver al Workspace</span>
            </Link>
            <div className="relative z-50">
              <button onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)} className="flex items-center gap-2.5 px-2.5 py-1 rounded-xl hover:bg-slate-800/60 transition-all border border-slate-800/80 hover:border-slate-700/60 shadow-inner">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs">
                  {(session?.user?.name || "A")[0].toUpperCase()}
                </div>
                <div className="text-left hidden lg:block">
                  <div className="text-[11px] font-bold text-white leading-tight">{session?.user?.name || "Admin"}</div>
                  <div className="text-[9px] text-cyan-400 leading-tight">Administrador {organization?.name ? `(${organization.name})` : ""}</div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>
              {isProfileMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsProfileMenuOpen(false)}></div>
                  <div className="absolute right-0 mt-2 w-52 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-1 z-[9999] backdrop-blur-2xl animate-in fade-in zoom-in-95">
                    <div className="px-3.5 py-2 border-b border-slate-800">
                      <p className="text-xs font-bold text-white truncate">{session?.user?.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{session?.user?.email}</p>
                    </div>
                    <button onClick={() => { setIsProfileMenuOpen(false); router.push("/profile"); }} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-slate-300 hover:bg-slate-800/80 hover:text-white transition-colors">
                      <User className="w-4 h-4 text-slate-400" /><span>Mi Perfil</span>
                    </button>
                    <div className="h-px bg-slate-800 my-1" />
                    <button onClick={() => { setIsProfileMenuOpen(false); setIsLogoutModalOpen(true); }} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-rose-400 hover:bg-rose-500/15 hover:text-rose-300 transition-colors font-medium">
                      <LogOut className="w-4 h-4" /><span>Cerrar Sesión</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* SIDEBAR */}
        <aside className={`w-64 bg-slate-900/95 border-r border-slate-800/80 backdrop-blur-xl flex flex-col transition-all duration-300 ${isSidebarOpen ? "fixed inset-y-0 left-0 z-50" : "hidden md:flex"}`}>
          <div className="p-4 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-cyan-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-bold text-white truncate">{organization?.name || "Cargando..."}</h2>
                <p className="text-[11px] text-cyan-400 font-medium">Panel de Organización</p>
              </div>
            </div>
          </div>
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button 
                  key={item.id} 
                  onClick={() => { setActiveTab(item.id as TabType); setIsSidebarOpen(false); }} 
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
                    isActive 
                      ? "bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 shadow-sm shadow-cyan-500/5" 
                      : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-cyan-400" : "text-slate-500"}`} />
                  <span>{item.label}</span>
                  {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* MAIN CONTENT */}
        <main className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-950 via-slate-950 to-slate-900 p-6 lg:p-8 custom-scrollbar">
          
          {/* DASHBOARD */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                  <BarChart3 className="w-6 h-6 text-cyan-400" /> Dashboard
                </h1>
                <p className="text-sm text-slate-400 mt-1">Métricas y estadísticas de tu organización</p>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-slate-400">Total Usuarios</span>
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                      <Users className="w-4 h-4 text-cyan-400" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-white">{users.length}</p>
                  <p className="text-[10px] text-slate-500 mt-1">+{users.filter(u => new Date(u.createdAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length} esta semana</p>
                </div>

                <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-slate-400">Workspaces</span>
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                      <FolderKanban className="w-4 h-4 text-purple-400" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-white">{workspaces.length}</p>
                  <p className="text-[10px] text-slate-500 mt-1">{workspaces.filter(w => w.plan === 'pro').length} Pro</p>
                </div>

                <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-slate-400">Espacios</span>
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                      <Code className="w-4 h-4 text-emerald-400" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-white">{spaces.length}</p>
                  <p className="text-[10px] text-slate-500 mt-1">{spaces.reduce((acc, s) => acc + (s._count?.lists || 0), 0)} listas</p>
                </div>

                <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-slate-400">Invitaciones Pendientes</span>
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                      <Mail className="w-4 h-4 text-amber-400" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-white">{invitations.filter(i => i.status === 'pending').length}</p>
                  <p className="text-[10px] text-slate-500 mt-1">{invitations.filter(i => i.status === 'accepted').length} aceptadas</p>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl">
                  <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-cyan-400" /> Usuarios Recientes
                  </h3>
                  <div className="space-y-3">
                    {users.slice(0, 5).map((user) => (
                      <div key={user.id} className="flex items-center gap-3 p-3 bg-slate-950/40 rounded-xl border border-slate-800/60">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs">
                          {user.name[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-white truncate">{user.name}</p>
                          <p className="text-[10px] text-slate-400 truncate">{user.email}</p>
                        </div>
                        <span className="text-[10px] text-slate-500">{new Date(user.createdAt).toLocaleDateString()}</span>
                      </div>
                    ))}
                    {users.length === 0 && <p className="text-xs text-slate-500 text-center py-4">No hay usuarios</p>}
                  </div>
                </div>

                <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl">
                  <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-amber-400" /> Invitaciones Recientes
                  </h3>
                  <div className="space-y-3">
                    {invitations.slice(0, 5).map((inv) => (
                      <div key={inv.id} className="flex items-center gap-3 p-3 bg-slate-950/40 rounded-xl border border-slate-800/60">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold text-xs">
                          <Mail className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-white truncate">{inv.email}</p>
                          <p className="text-[10px] text-slate-400 truncate">{inv.workspace?.name || 'Workspace'}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-lg text-[10px] font-bold ${
                          inv.status === 'accepted' ? 'bg-emerald-500/10 text-emerald-400' :
                          inv.status === 'rejected' ? 'bg-rose-500/10 text-rose-400' :
                          'bg-amber-500/10 text-amber-400'
                        }`}>
                          {inv.status === 'accepted' ? 'Aceptada' : inv.status === 'rejected' ? 'Rechazada' : 'Pendiente'}
                        </span>
                      </div>
                    ))}
                    {invitations.length === 0 && <p className="text-xs text-slate-500 text-center py-4">No hay invitaciones</p>}
                  </div>
                </div>
              </div>

              {/* Workspaces Overview */}
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <FolderKanban className="w-4 h-4 text-purple-400" /> Resumen de Workspaces
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {workspaces.map((ws) => (
                    <div key={ws.id} className="bg-slate-950/40 border border-slate-800/60 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-bold text-white">{ws.name}</h4>
                        <span className="px-2 py-1 rounded-lg text-[10px] font-bold bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 capitalize">{ws.plan}</span>
                      </div>
                      <div className="flex items-center gap-4 text-[10px] text-slate-400">
                        <span>{ws._count?.members || 0} miembros</span>
                        <span>{ws._count?.spaces || 0} espacios</span>
                      </div>
                    </div>
                  ))}
                  {workspaces.length === 0 && <p className="text-xs text-slate-500 text-center py-4 col-span-full">No hay workspaces</p>}
                </div>
              </div>
            </div>
          )}

          {/* OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-cyan-400" /> Panel de Administración
                </h1>
                <p className="text-sm text-slate-400 mt-1">Gestiona tu organización: <span className="text-slate-200 font-medium">{organization?.name}</span></p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Total Usuarios", value: users.length, icon: Users, color: "cyan" },
                  { label: "Espacios", value: spaces.length, icon: Code, color: "emerald" },
                  { label: "Códigos Activos", value: inviteCodes.filter((c) => !c.expiresAt || new Date(c.expiresAt) > new Date()).length, icon: Key, color: "amber" },
                  { label: "Plan Actual", value: organization?.plan || "Free", icon: Shield, color: "purple" }
                ].map((stat, idx) => {
                  const colors: any = {
                    cyan: "bg-cyan-500/10 border-cyan-500/20 text-cyan-400",
                    emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
                    amber: "bg-amber-500/10 border-amber-500/20 text-amber-400",
                    purple: "bg-purple-500/10 border-purple-500/20 text-purple-400"
                  };
                  return (
                    <div key={idx} className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl hover:border-slate-700/80 transition-all">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-medium text-slate-400">{stat.label}</span>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors[stat.color]}`}>
                          <stat.icon className="w-4 h-4" />
                        </div>
                      </div>
                      <p className="text-2xl font-bold text-white">{stat.value}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* WORKSPACES */}
          {activeTab === "workspaces" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-white">Workspaces</h1>
                  <p className="text-sm text-slate-400 mt-1">Gestiona los workspaces de tu organización</p>
                </div>
                <button onClick={() => { setWorkspaceForm({ name: "", slug: "", plan: "free", color: "#06b6d4" }); setEditingWorkspace(null); setShowCreateWorkspace(true); }} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-500/25 transition-all">
                  <Plus className="w-4 h-4" /><span>Nuevo Workspace</span>
                </button>
              </div>
              <SearchInput value={searchWorkspaces} onChange={setSearchWorkspaces} placeholder="Buscar por nombre o slug..." count={filteredWorkspaces.length} />
              
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-xl">
                <table className="w-full">
                  <thead className="bg-slate-950/60 border-b border-slate-800">
                    <tr>
                      <th className="text-left py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nombre</th>
                      <th className="text-left py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Slug</th>
                      <th className="text-left py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Plan</th>
                      <th className="text-left py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Miembros</th>
                      <th className="text-right py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredWorkspaces.map((ws) => (
                      <tr key={ws.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 text-xs font-semibold text-white">{ws.name}</td>
                        <td className="py-3 px-4 text-xs text-slate-400 font-mono">{ws.slug}</td>
                        <td className="py-3 px-4"><span className="px-2 py-1 rounded-lg text-[10px] font-bold border bg-cyan-500/10 border-cyan-500/20 text-cyan-300 capitalize">{ws.plan}</span></td>
                        <td className="py-3 px-4 text-xs text-slate-400">{ws._count?.members || 0}</td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => { setEditingWorkspace(ws); setWorkspaceForm({ name: ws.name, slug: ws.slug, plan: ws.plan, color: ws.color || "#06b6d4" }); setShowCreateWorkspace(true); }} className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition-all">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDeleteWorkspace(ws.id)} className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-all">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredWorkspaces.length === 0 && <tr><td colSpan={5} className="py-8 text-center text-slate-500 text-sm">No se encontraron workspaces.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ORGANIZACIONES */}
          {activeTab === "organizations" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-white">Organización</h1>
                <p className="text-sm text-slate-400 mt-1">Información de tu organización actual</p>
              </div>
              <SearchInput value={searchOrganizations} onChange={setSearchOrganizations} placeholder="Buscar por nombre o slug..." count={filteredOrganizations.length} />
              
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-xl">
                <table className="w-full">
                  <thead className="bg-slate-950/60 border-b border-slate-800">
                    <tr>
                      <th className="text-left py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nombre</th>
                      <th className="text-left py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Slug</th>
                      <th className="text-left py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Plan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredOrganizations.map((org) => (
                      <tr key={org.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 text-xs font-semibold text-white">{org.name}</td>
                        <td className="py-3 px-4 text-xs text-slate-400 font-mono">{org.slug}</td>
                        <td className="py-3 px-4"><span className="px-2 py-1 rounded-lg text-[10px] font-bold border bg-purple-500/10 border-purple-500/20 text-purple-300 capitalize">{org.plan}</span></td>
                      </tr>
                    ))}
                    {filteredOrganizations.length === 0 && <tr><td colSpan={3} className="py-8 text-center text-slate-500 text-sm">No se encontraron organizaciones.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ESPACIOS */}
          {activeTab === "spaces" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-white">Espacios</h1>
                  <p className="text-sm text-slate-400 mt-1">Gestiona los espacios de tu organización</p>
                </div>
                <button onClick={() => { setSpaceForm({ name: "", description: "", color: "#06b6d4", workspaceId: workspaces[0]?.id || "" }); setEditingSpace(null); setShowCreateSpace(true); }} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-500/25 transition-all">
                  <Plus className="w-4 h-4" /><span>Nuevo Espacio</span>
                </button>
              </div>
              <SearchInput value={searchSpaces} onChange={setSearchSpaces} placeholder="Buscar por nombre, slug o descripción..." count={filteredSpaces.length} />
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSpaces.map((space) => (
                  <div key={space.id} className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl hover:border-cyan-500/30 transition-all group">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${space.color || "#06b6d4"}20` }}>
                          <Building2 className="w-5 h-5" style={{ color: space.color || "#06b6d4" }} />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white">{space.name}</h3>
                          <p className="text-[11px] text-slate-400">{space.workspace?.name}</p>
                        </div>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                        <button onClick={() => { setEditingSpace(space); setSpaceForm({ name: space.name, description: space.description || "", color: space.color || "#06b6d4", workspaceId: "" }); setShowCreateSpace(true); }} className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition-all">
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDeleteSpace(space.id)} className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    {space.description && <p className="text-xs text-slate-400 mb-3 line-clamp-2">{space.description}</p>}
                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                      <Calendar className="w-3 h-3" />
                      <span>Creado {new Date(space.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
                {filteredSpaces.length === 0 && <div className="col-span-full text-center py-12 text-slate-500 text-sm bg-slate-900/20 rounded-2xl border border-dashed border-slate-800">No se encontraron espacios con esos criterios.</div>}
              </div>
            </div>
          )}

          {/* USUARIOS */}
          {activeTab === "users" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-white">Usuarios</h1>
                  <p className="text-sm text-slate-400 mt-1">Gestiona los usuarios de tu organización</p>
                </div>
                <button onClick={() => { setUserForm({ name: "", email: "", password: "", role: "user", workspaceId: workspaces[0]?.id || "" }); setEditingUser(null); setShowCreateUser(true); }} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-500/25 transition-all">
                  <UserPlus className="w-4 h-4" /><span>Nuevo Usuario</span>
                </button>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <SearchInput value={searchUsers} onChange={setSearchUsers} placeholder="Buscar por nombre, email o rol..." count={filteredUsers.length} />
                <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)} className="w-full sm:w-auto bg-slate-900/80 border border-slate-700/50 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500/50">
                  <option value="all">Todos los roles</option>
                  <option value="user">Usuario</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-xl">
                <table className="w-full">
                  <thead className="bg-slate-950/60 border-b border-slate-800">
                    <tr>
                      <th className="text-left py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Usuario</th>
                      <th className="text-left py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rol</th>
                      <th className="text-left py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Miembro desde</th>
                      <th className="text-right py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs">{user.name[0].toUpperCase()}</div>
                            <div>
                              <p className="text-xs font-semibold text-white">{user.name}</p>
                              <p className="text-[11px] text-slate-400">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 rounded-lg text-[10px] font-bold border bg-cyan-500/10 border-cyan-500/20 text-cyan-300 capitalize">{user.role}</span>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-400">{new Date(user.createdAt).toLocaleDateString()}</td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => { setEditingUser(user); setUserForm({ name: user.name, email: user.email, password: "", role: user.role, workspaceId: "" }); setShowCreateUser(true); }} className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-800 rounded-lg transition-all">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => handleDeleteUser(user.id)} className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-all">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && <tr><td colSpan={4} className="py-8 text-center text-slate-500 text-sm">No se encontraron usuarios con esos criterios.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* INVITACIONES */}
          {activeTab === "invitations" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-white">Invitaciones</h1>
                  <p className="text-sm text-slate-400 mt-1">Gestiona las invitaciones enviadas a usuarios</p>
                </div>
                <button onClick={() => { setInvitationForm({ email: "", workspaceId: workspaces[0]?.id || "" }); setShowCreateInvitation(true); }} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-500/25 transition-all">
                  <UserPlus className="w-4 h-4" /><span>Nueva Invitación</span>
                </button>
              </div>
              <SearchInput value={searchInvitations} onChange={setSearchInvitations} placeholder="Buscar por email, workspace o estado..." count={filteredInvitations.length} />
              
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-xl">
                <table className="w-full">
                  <thead className="bg-slate-950/60 border-b border-slate-800">
                    <tr>
                      <th className="text-left py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email</th>
                      <th className="text-left py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Workspace</th>
                      <th className="text-left py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estado</th>
                      <th className="text-left py-3 px-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredInvitations.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 text-xs font-semibold text-white">{inv.email}</td>
                        <td className="py-3 px-4 text-xs text-slate-400">{inv.workspace?.name || 'N/A'}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${
                            inv.status === "accepted" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300" :
                            inv.status === "rejected" ? "bg-rose-500/10 border-rose-500/20 text-rose-300" :
                            "bg-amber-500/10 border-amber-500/20 text-amber-300"
                          }`}>
                            {inv.status === "accepted" ? "Aceptada" : inv.status === "rejected" ? "Rechazada" : "Pendiente"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-xs text-slate-400">{new Date(inv.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                    {filteredInvitations.length === 0 && <tr><td colSpan={4} className="py-8 text-center text-slate-500 text-sm">No se encontraron invitaciones con esos criterios.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CÓDIGOS DE INVITACIÓN */}
          {activeTab === "invite-codes" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl font-bold text-white">Códigos de Invitación</h1>
                  <p className="text-sm text-slate-400 mt-1">Genera y gestiona códigos para invitar usuarios</p>
                </div>
                <button onClick={() => { setInviteForm({ workspaceId: workspaces[0]?.id || "", maxUses: 1, expiresAt: "" }); setShowCreateInviteCode(true); }} className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-500/25 transition-all">
                  <Plus className="w-4 h-4" /><span>Generar Código</span>
                </button>
              </div>
              <SearchInput value={searchInviteCodes} onChange={setSearchInviteCodes} placeholder="Buscar por código o nombre del creador..." count={filteredInviteCodes.length} />
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredInviteCodes.map((code) => (
                  <div key={code.id} className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl hover:border-slate-700/80 transition-all">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                          <Key className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <code className="text-sm font-bold text-white bg-slate-950/60 px-2 py-1 rounded-lg border border-slate-800 font-mono tracking-wide">{code.code}</code>
                            <button onClick={() => copyToClipboard(code.code)} className="p-1 text-slate-400 hover:text-cyan-400 transition-colors" title="Copiar">
                              {copiedCode === code.code ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1">{code.usedCount} de {code.maxUses} usos</p>
                        </div>
                      </div>
                    </div>
                    {code.workspace && (
                      <p className="text-[11px] text-slate-500 mb-2">Workspace: {code.workspace.name}</p>
                    )}
                    {code.expiresAt && (
                      <div className="mb-3 flex items-center gap-2 text-[11px] text-slate-400">
                        <Calendar className="w-3 h-3" />
                        <span>Expira: {new Date(code.expiresAt).toLocaleDateString()}</span>
                      </div>
                    )}
                    {code.usedBy && Array.isArray(code.usedBy) && code.usedBy.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-800/60">
                        <p className="text-[11px] font-bold text-slate-400 mb-2">Usado por:</p>
                        <div className="space-y-1.5">
                          {code.usedBy.map((user: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-2 text-xs text-slate-300">
                              <div className="w-5 h-5 rounded bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400">{user.name ? user.name[0].toUpperCase() : "U"}</div>
                              <span>{user.email || "Usuario desconocido"}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {filteredInviteCodes.length === 0 && <div className="col-span-full text-center py-12 text-slate-500 text-sm bg-slate-900/20 rounded-2xl border border-dashed border-slate-800">No se encontraron códigos con esos criterios.</div>}
              </div>
            </div>
          )}

          {/* CONFIGURACIÓN */}
          {activeTab === "settings" && (
            <div className="space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-white">Configuración</h1>
                <p className="text-sm text-slate-400 mt-1">Configura tu organización y planes</p>
              </div>
              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl max-w-2xl">
                <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-cyan-400" /> Información de la Organización
                </h2>
                {isEditingOrg ? (
                  <form onSubmit={handleSaveOrganization} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">Nombre</label>
                      <input type="text" value={orgForm.name} onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })} className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500/50" required />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">Descripción</label>
                      <textarea value={orgForm.description} onChange={(e) => setOrgForm({ ...orgForm, description: e.target.value })} className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500/50 resize-none" rows={3} />
                    </div>
                    <div className="flex gap-3 pt-2">
                      <button type="button" onClick={() => { setIsEditingOrg(false); setOrgForm({ name: organization?.name || "", description: organization?.description || "", plan: organization?.plan || "free" }); }} className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors">Cancelar</button>
                      <button type="submit" className="flex-1 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-500/25 transition-all">Guardar Cambios</button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">Nombre</label>
                      <input type="text" value={organization?.name || ""} disabled className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-400 cursor-not-allowed" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">Descripción</label>
                      <textarea value={organization?.description || ""} disabled className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-400 cursor-not-allowed resize-none" rows={3} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">Plan Actual</label>
                      <input type="text" value={organization?.plan || "Free"} disabled className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-400 cursor-not-allowed capitalize" />
                    </div>
                    <button onClick={() => setIsEditingOrg(true)} className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-500/25 transition-all">
                      <Edit2 className="w-4 h-4" /><span>Editar Organización</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 backdrop-blur-xl">
                <h2 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-cyan-400" /> Planes y Suscripción
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="bg-gradient-to-br from-cyan-950/50 to-blue-950/50 border border-cyan-500/30 rounded-2xl p-6 hover:border-cyan-400/50 transition-all">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-white">Plan Pro</h3>
                      <div className="px-3 py-1 bg-cyan-500/20 border border-cyan-500/30 rounded-full text-xs font-bold text-cyan-300">{PLANS.PRO.priceUF} UF/mes</div>
                    </div>
                    <ul className="space-y-2 mb-6">
                      <li className="flex items-center gap-2 text-xs text-slate-300"><Check className="w-3.5 h-3.5 text-cyan-400" /><span>Hasta {PLANS.PRO.maxUsers} usuarios</span></li>
                      <li className="flex items-center gap-2 text-xs text-slate-300"><Check className="w-3.5 h-3.5 text-cyan-400" /><span>Espacios ilimitados</span></li>
                    </ul>
                    {ufValue > 0 && (
                      <div className="mb-4 p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between text-slate-400"><span>Total:</span><span className="text-white font-bold">${calculatePrice(PLANS.PRO.priceUF).total.toLocaleString('es-CL')}</span></div>
                        </div>
                      </div>
                    )}
                    <button className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-500/25 transition-all">Hazte Pro ahora</button>
                  </div>

                  <div className="bg-gradient-to-br from-amber-950/50 to-orange-950/50 border border-amber-500/30 rounded-2xl p-6 hover:border-amber-400/50 transition-all">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-white">Plan Premium</h3>
                      <div className="px-3 py-1 bg-amber-500/20 border border-amber-500/30 rounded-full text-xs font-bold text-amber-300">{PLANS.PREMIUM.priceUF} UF/mes</div>
                    </div>
                    <ul className="space-y-2 mb-6">
                      <li className="flex items-center gap-2 text-xs text-slate-300"><Check className="w-3.5 h-3.5 text-amber-400" /><span>Usuarios ilimitados</span></li>
                      <li className="flex items-center gap-2 text-xs text-slate-300"><Check className="w-3.5 h-3.5 text-amber-400" /><span>Soporte 24/7</span></li>
                    </ul>
                    {ufValue > 0 && (
                      <div className="mb-4 p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between text-slate-400"><span>Total:</span><span className="text-white font-bold">${calculatePrice(PLANS.PREMIUM.priceUF).total.toLocaleString('es-CL')}</span></div>
                        </div>
                      </div>
                    )}
                    <button className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-amber-500/25 transition-all">Hazte Premium ahora</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MODALES */}
      {showCreateUser && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">{editingUser ? "Editar Usuario" : "Nuevo Usuario"}</h3>
              <button onClick={() => { setShowCreateUser(false); setEditingUser(null); }} className="p-1 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Nombre Completo</label>
                <input type="text" required value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500/50" placeholder="Juan Pérez" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Correo Electrónico</label>
                <input type="email" required value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500/50" placeholder="juan@ejemplo.com" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Contraseña {!editingUser && "(Requerida)"}</label>
                <input type="password" required={!editingUser} value={userForm.password} onChange={(e) => setUserForm({ ...userForm, password: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500/50" placeholder="••••••••" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Asignar a Workspace</label>
                <select value={userForm.workspaceId} onChange={(e) => setUserForm({ ...userForm, workspaceId: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500/50" required>
                  <option value="">Selecciona un workspace</option>
                  {workspaces.map((ws) => (<option key={ws.id} value={ws.id}>{ws.name}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Rol</label>
                <select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500/50">
                  <option value="user">Usuario</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowCreateUser(false); setEditingUser(null); }} className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-500/25 transition-all">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCreateWorkspace && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">{editingWorkspace ? "Editar Workspace" : "Nuevo Workspace"}</h3>
              <button onClick={() => { setShowCreateWorkspace(false); setEditingWorkspace(null); }} className="p-1 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveWorkspace} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Nombre</label>
                <input type="text" required value={workspaceForm.name} onChange={(e) => setWorkspaceForm({ ...workspaceForm, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500/50" placeholder="Mi Workspace" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Slug</label>
                <input type="text" required value={workspaceForm.slug} onChange={(e) => setWorkspaceForm({ ...workspaceForm, slug: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500/50" placeholder="mi-workspace" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Plan</label>
                <select value={workspaceForm.plan} onChange={(e) => setWorkspaceForm({ ...workspaceForm, plan: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500/50">
                  <option value="free">Free</option>
                  <option value="pro">Pro</option>
                  <option value="premium">Premium</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Color</label>
                <input type="color" value={workspaceForm.color} onChange={(e) => setWorkspaceForm({ ...workspaceForm, color: e.target.value })} className="w-full h-10 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowCreateWorkspace(false); setEditingWorkspace(null); }} className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-500/25 transition-all">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCreateSpace && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">{editingSpace ? "Editar Espacio" : "Nuevo Espacio"}</h3>
              <button onClick={() => { setShowCreateSpace(false); setEditingSpace(null); }} className="p-1 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveSpace} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Nombre del Espacio</label>
                <input type="text" required value={spaceForm.name} onChange={(e) => setSpaceForm({ ...spaceForm, name: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500/50" placeholder="Ej. Marketing, Desarrollo..." />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Workspace</label>
                <select value={spaceForm.workspaceId} onChange={(e) => setSpaceForm({ ...spaceForm, workspaceId: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500/50" required>
                  <option value="">Selecciona un workspace</option>
                  {workspaces.map((ws) => (<option key={ws.id} value={ws.id}>{ws.name}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Descripción</label>
                <textarea value={spaceForm.description} onChange={(e) => setSpaceForm({ ...spaceForm, description: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500/50 resize-none" rows={3} placeholder="Descripción opcional..." />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Color del Icono</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={spaceForm.color} onChange={(e) => setSpaceForm({ ...spaceForm, color: e.target.value })} className="w-10 h-10 rounded-lg bg-slate-950 border border-slate-800 cursor-pointer" />
                  <span className="text-xs text-slate-400">{spaceForm.color}</span>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowCreateSpace(false); setEditingSpace(null); }} className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-500/25 transition-all">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCreateInviteCode && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Generar Código de Invitación</h3>
              <button onClick={() => setShowCreateInviteCode(false)} className="p-1 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreateInviteCode} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Workspace de destino</label>
                <select value={inviteForm.workspaceId} onChange={(e) => setInviteForm({ ...inviteForm, workspaceId: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500/50" required>
                  <option value="">Selecciona un workspace</option>
                  {workspaces.map((ws) => (<option key={ws.id} value={ws.id}>{ws.name}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Máximo de Usos</label>
                <input type="number" min="1" required value={inviteForm.maxUses} onChange={(e) => setInviteForm({ ...inviteForm, maxUses: parseInt(e.target.value) || 1 })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500/50" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Fecha de Expiración (Opcional)</label>
                <input type="date" value={inviteForm.expiresAt} onChange={(e) => setInviteForm({ ...inviteForm, expiresAt: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500/50" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreateInviteCode(false)} className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-amber-500/25 transition-all">Generar Código</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCreateInvitation && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Nueva Invitación</h3>
              <button onClick={() => setShowCreateInvitation(false)} className="p-1 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreateInvitation} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Email del Usuario</label>
                <input type="email" required value={invitationForm.email} onChange={(e) => setInvitationForm({ ...invitationForm, email: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500/50" placeholder="usuario@ejemplo.com" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Workspace</label>
                <select value={invitationForm.workspaceId} onChange={(e) => setInvitationForm({ ...invitationForm, workspaceId: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500/50" required>
                  <option value="">Selecciona un workspace</option>
                  {workspaces.map((ws) => (<option key={ws.id} value={ws.id}>{ws.name}</option>))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreateInvitation(false)} className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-500/25 transition-all">Enviar Invitación</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-rose-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">¿Cerrar sesión?</h3>
              <p className="text-sm text-slate-400 mb-6">Estás a punto de cerrar tu sesión actual. ¿Deseas continuar?</p>
              <div className="flex gap-3 w-full">
                <button onClick={() => setIsLogoutModalOpen(false)} className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors border border-slate-700">Cancelar</button>
                <button onClick={() => signOut({ callbackUrl: "/login" })} className="flex-1 px-4 py-2.5 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-rose-500/20">Sí, cerrar sesión</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}