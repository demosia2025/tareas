"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import {
  Zap, Menu, Shield, User, LogOut, ChevronDown, LayoutDashboard,
  List, LayoutGrid, Calendar as CalendarIcon, Search, X, SlidersHorizontal, 
  Layers, Sparkles, RefreshCw, Plus, Building2, AlertTriangle, Users,
  FolderPlus, FolderKanban, CheckSquare, Clock, ArrowRight, FileText, Folder
} from "lucide-react";

import { useDashboard } from "@/hooks/useDashboard";
import { ClickUpSidebar } from "@/components/ClickUpSidebar";
import { TaskModal } from "@/components/TaskModal";
import { KanbanBoard } from "@/components/KanbanBoard";
import { CommandPalette } from "@/components/CommandPalette";
import { InlineTaskRow } from "@/components/InlineTaskRow";
import { FunctionalCalendarView } from "@/components/FunctionalCalendarView";

import WorkspaceSelector from "@/components/WorkspaceSelector";
import ConnectedUsersPanel from "@/components/ConnectedUsersPanel";
import PlanLimitModal from "@/components/PlanLimitModal";

export default function HomePage() {
  const { status, data: session } = useSession();
  const router = useRouter();
  const dashboard = useDashboard();

  // ESTADOS PARA MODALES DE CREACIÓN RÁPIDA
  const [isCreateWorkspaceModalOpen, setIsCreateWorkspaceModalOpen] = useState(false);
  const [isCreateSpaceModalOpen, setIsCreateSpaceModalOpen] = useState(false);
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [newSpaceName, setNewSpaceName] = useState("");
  const [selectedSpaceForTask, setSelectedSpaceForTask] = useState<string>("");
  const [selectedSpaceForFolder, setSelectedSpaceForFolder] = useState<string>("");
  const [newFolderName, setNewFolderName] = useState("");
  
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [isCreatingSpace, setIsCreatingSpace] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  // ESTADO PARA TODAS LAS TAREAS DEL WORKSPACE
  const [allRecentTasks, setAllRecentTasks] = useState<any[]>([]);
  const [isLoadingAllTasks, setIsLoadingAllTasks] = useState(false);

  // REFERENCIAS PARA LOS MENÚS
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const workspaceMenuRef = useRef<HTMLDivElement>(null);

  // DETECCIÓN SIMPLIFICADA
  const hasWorkspace = dashboard.workspaceId !== null;

  // VERIFICAR LÍMITES
  const canCreateWorkspace = dashboard.planInfo?.workspaceLimit === Infinity || 
    (dashboard.planInfo?.workspaceCount || 0) < (dashboard.planInfo?.workspaceLimit || 0);

  // REDIRECCIÓN SEGURA DE AUTENTICACIÓN
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // CERRAR MENÚS AL HACER CLIC FUERA
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      if (dashboard.isProfileMenuOpen && profileMenuRef.current && !profileMenuRef.current.contains(target)) {
        dashboard.setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dashboard.isProfileMenuOpen]);

  // OBTENER TAREAS EN PARALELO SIN CONGELAR LA PÁGINA
  useEffect(() => {
    const fetchAllTasks = async () => {
      if (!dashboard.workspaceId || !dashboard.spaces || dashboard.spaces.length === 0) {
        setAllRecentTasks([]);
        setIsLoadingAllTasks(false);
        return;
      }

      setIsLoadingAllTasks(true);
      try {
        const fetchPromises: Promise<any>[] = [];

        for (const space of dashboard.spaces) {
          if (space.lists) {
            for (const list of space.lists) {
              fetchPromises.push(
                fetch(`/api/tasks?listId=${list.id}`)
                  .then(async (res) => {
                    if (res.ok) {
                      const tasks = await res.json();
                      return tasks.map((task: any) => ({
                        ...task,
                        listId: list.id,
                        listName: list.name,
                        spaceId: space.id,
                        spaceName: space.name
                      }));
                    }
                    return [];
                  })
                  .catch(() => [])
              );
            }
          }
        }

        const results = await Promise.all(fetchPromises);
        const allTasks = results.flat();

        const sorted = allTasks
          .sort((a, b) => {
            const dateA = new Date(a.updatedAt || a.created_at || 0).getTime();
            const dateB = new Date(b.updatedAt || b.created_at || 0).getTime();
            return dateB - dateA;
          })
          .slice(0, 5);

        setAllRecentTasks(sorted);
      } catch (error) {
        console.error("Error fetching all tasks:", error);
      } finally {
        setIsLoadingAllTasks(false);
      }
    };

    fetchAllTasks();
  }, [dashboard.workspaceId, dashboard.spaces]);

  // FUNCIONES DE CREACIÓN
  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;
    setIsCreatingWorkspace(true);
    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newWorkspaceName.trim() })
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("activeWorkspaceId", data.id);
        window.location.reload();
      } else {
        const err = await res.json();
        alert(err.error || "Error al crear workspace");
      }
    } catch (error) {
      alert("Error de conexión");
    } finally {
      setIsCreatingWorkspace(false);
    }
  };

  const handleCreateSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSpaceName.trim()) return;
    setIsCreatingSpace(true);
    try {
      let targetWorkspaceId = dashboard.workspaceId;

      if (!targetWorkspaceId) {
        const wsRes = await fetch("/api/workspaces", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Mi Workspace" })
        });
        if (wsRes.ok) {
          const wsData = await wsRes.json();
          targetWorkspaceId = wsData.id;
          localStorage.setItem("activeWorkspaceId", wsData.id);
        } else {
          alert("Error al crear workspace automático");
          return;
        }
      }

      const res = await fetch("/api/spaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name: newSpaceName.trim(), 
          workspaceId: targetWorkspaceId 
        })
      });
      
      if (res.ok) {
        await dashboard.fetchHierarchy();
        setIsCreateSpaceModalOpen(false);
        setNewSpaceName("");
      } else {
        const err = await res.json();
        alert(err.error || "Error al crear espacio");
      }
    } catch (error) {
      alert("Error de conexión");
    } finally {
      setIsCreatingSpace(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingTask(true);
    try {
      if (dashboard.spaces.length === 0) {
        let targetWorkspaceId = dashboard.workspaceId;
        
        if (!targetWorkspaceId) {
          const wsRes = await fetch("/api/workspaces", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "Mi Workspace" })
          });
          if (wsRes.ok) {
            const wsData = await wsRes.json();
            targetWorkspaceId = wsData.id;
            localStorage.setItem("activeWorkspaceId", wsData.id);
          }
        }

        const spaceRes = await fetch("/api/spaces", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            name: "Espacio Principal", 
            workspaceId: targetWorkspaceId 
          })
        });

        if (spaceRes.ok) {
          const spaceData = await spaceRes.json();
          await dashboard.fetchHierarchy();
          
          const firstList = { id: spaceData.id, name: spaceData.name, spaceId: spaceData.id };
          dashboard.handleListSelect(firstList);
          setIsCreateTaskModalOpen(false);
          setTimeout(() => dashboard.openCreateModal(), 300);
          return;
        }
      }

      const targetSpaceId = selectedSpaceForTask || dashboard.spaces[0]?.id;
      
      if (targetSpaceId) {
        const space = dashboard.spaces.find(s => s.id === targetSpaceId);
        if (space && space.lists && space.lists.length > 0) {
          dashboard.handleListSelect({ 
            id: space.lists[0].id, 
            name: space.lists[0].name,
            spaceId: space.id 
          });
          setIsCreateTaskModalOpen(false);
          setSelectedSpaceForTask("");
          setTimeout(() => dashboard.openCreateModal(), 300);
        } else {
          alert("El espacio seleccionado no tiene listas. Crea una lista primero.");
        }
      } else {
        alert("Debe seleccionar un espacio");
      }
    } catch (error) {
      alert("Error de conexión");
    } finally {
      setIsCreatingTask(false);
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    setIsCreatingFolder(true);
    try {
      let targetSpaceId = selectedSpaceForFolder;

      if (dashboard.spaces.length === 0) {
        let targetWorkspaceId = dashboard.workspaceId;
        
        if (!targetWorkspaceId) {
          const wsRes = await fetch("/api/workspaces", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: "Mi Workspace" })
          });
          if (wsRes.ok) {
            const wsData = await wsRes.json();
            targetWorkspaceId = wsData.id;
            localStorage.setItem("activeWorkspaceId", wsData.id);
          }
        }

        const spaceRes = await fetch("/api/spaces", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            name: "Espacio Principal", 
            workspaceId: targetWorkspaceId 
          })
        });

        if (spaceRes.ok) {
          const spaceData = await spaceRes.json();
          await dashboard.fetchHierarchy();
          targetSpaceId = spaceData.id;
        }
      } else if (!targetSpaceId) {
        targetSpaceId = dashboard.spaces[0]?.id;
      }

      if (targetSpaceId && dashboard.workspaceId) {
        const res = await fetch("/api/folders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            name: newFolderName.trim(),
            spaceId: targetSpaceId,
            workspaceId: dashboard.workspaceId
          })
        });

        if (res.ok) {
          await dashboard.fetchHierarchy();
          setIsCreateFolderModalOpen(false);
          setNewFolderName("");
          setSelectedSpaceForFolder("");
        } else {
          const err = await res.json();
          alert(err.error || "Error al crear carpeta");
        }
      } else {
        alert("Error: No hay workspace activo");
      }
    } catch (error) {
      alert("Error de conexión");
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleCreateTaskFromHome = () => {
    setIsCreateTaskModalOpen(true);
  };

  // ✅ PANTALLA DE CARGA CON DIAGNÓSTICO EN PANTALLA
  if (status === "loading" || dashboard.loading) {
    return (
      <div className="h-screen w-screen overflow-hidden bg-slate-950 flex items-center justify-center flex-col gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-[3px] border-cyan-400 border-t-transparent mx-auto mb-4"></div>
        <p className="text-slate-400 font-light text-xs tracking-wide">Cargando workspace...</p>
        
        <div className="mt-8 bg-red-950/80 border border-red-500/50 p-4 rounded-lg text-xs text-red-200 font-mono shadow-2xl max-w-md w-full">
          <p className="font-bold text-red-400 mb-2 border-b border-red-500/30 pb-1">🔍 ESTADO ACTUAL DEL SISTEMA:</p>
          <p>1. NextAuth Status: <span className="text-white font-bold">{status}</span></p>
          <p>2. Dashboard Loading: <span className="text-white font-bold">{String(dashboard.loading)}</span></p>
          <p>3. Sesión Existe: <span className="text-white font-bold">{session ? "SÍ" : "NO"}</span></p>
          <p>4. User ID: <span className="text-white font-bold">{session?.user?.id || "INDEFINIDO"}</span></p>
        </div>
      </div>
    );
  }

  // EVITA MOSTRAR CONTENIDO SI NO HAY SESIÓN
  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-white">
      {/* HEADER */}
      <header className="h-14 bg-slate-900/80 backdrop-blur-2xl border-b border-slate-800/80 flex-shrink-0 z-[9999]">
        <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => dashboard.setIsSidebarOpen(!dashboard.isSidebarOpen)} className="md:hidden p-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 transition-colors">
              <Menu className="w-4 h-4" />
            </button>
            
            <div 
              onClick={() => {
                if (dashboard.selectedList) {
                  dashboard.setSelectedList(null);
                }
                router.push("/");
              }} 
              className="flex items-center gap-2.5 group cursor-pointer" 
              title="Ir al inicio"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 via-cyan-500 to-blue-600 flex items-center justify-center shadow-md shadow-cyan-500/25 group-hover:scale-105 transition-transform">
                <Zap className="w-4 h-4 text-white fill-white/20" />
              </div>
              <div className="flex items-center space-x-3 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800 shadow-lg backdrop-blur-sm hidden sm:flex group-hover:bg-slate-800/80 transition-colors">
                <span className="text-sm font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
                  Gestion de tareas
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {dashboard.isOwner && (
              <Link href="/admin2" className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-xl text-xs font-semibold text-cyan-400 transition-colors shadow-sm">
                <Shield className="w-3.5 h-3.5" /><span>Administrador</span>
              </Link>
            )}
            
            {dashboard.isSuperAdmin && (
              <Link href="/admin" className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500/10 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20 border border-amber-500/30 hover:border-amber-400 rounded-xl text-xs font-semibold text-amber-300 transition-colors shadow-sm">
                <Shield className="w-3.5 h-3.5" /><span>Super Admin</span>
              </Link>
            )}

            {dashboard.memberships && dashboard.memberships.length > 0 && (
              <div ref={workspaceMenuRef}>
                <WorkspaceSelector
                  memberships={dashboard.memberships}
                  currentWorkspaceId={dashboard.workspaceId || ""}
                  organizationName={dashboard.planInfo?.organizationName || "Mi Organización"}
                  userCount={dashboard.planInfo?.userCount || 0}
                  userLimit={dashboard.planInfo?.userLimit || 3}
                  planName={dashboard.planInfo?.planName || "Free"}
                  isOwner={dashboard.isOwner}
                  onSwitchWorkspace={(id) => {
                    localStorage.setItem("activeWorkspaceId", id);
                    dashboard.setWorkspaceId(id);
                    setTimeout(() => window.location.reload(), 100);
                  }}
                  onCreateWorkspace={() => {
                    if (!canCreateWorkspace) {
                      dashboard.setPlanLimitModal({
                        isOpen: true,
                        type: "workspaces",
                        currentPlan: dashboard.planInfo?.planName || "Free",
                        currentCount: dashboard.planInfo?.workspaceCount || 0,
                        limit: dashboard.planInfo?.workspaceLimit || 0
                      });
                    } else {
                      setIsCreateWorkspaceModalOpen(true);
                    }
                  }}
                />
              </div>
            )}

            {dashboard.workspaceId && (
              <Link
                href={`/workspace/${dashboard.workspaceId}/users`}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-xl text-xs font-semibold text-slate-200 transition-colors shadow-sm"
              >
                <Users className="w-3.5 h-3.5 text-cyan-400" />
                <span className="hidden sm:inline">Usuarios</span>
              </Link>
            )}
            
            <div className="relative" ref={profileMenuRef}>
              <button onClick={() => dashboard.setIsProfileMenuOpen(!dashboard.isProfileMenuOpen)} className="flex items-center gap-2.5 px-2.5 py-1 rounded-xl hover:bg-slate-800/60 transition-all border border-slate-800/80 hover:border-slate-700/60 shadow-inner">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs shadow-sm shadow-cyan-500/20">
                  {(session?.user?.name || "U")[0].toUpperCase()}
                </div>
                <div className="text-left hidden lg:block">
                  <div className="text-[11px] font-bold text-white leading-tight">{session?.user?.name || "Usuario"}</div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>
              
              {dashboard.isProfileMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => dashboard.setIsProfileMenuOpen(false)}></div>
                  <div className="absolute right-0 mt-2 w-52 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-1 z-[9999] backdrop-blur-2xl animate-in fade-in zoom-in-95">
                    <div className="px-3.5 py-2 border-b border-slate-800">
                      <p className="text-xs font-bold text-white truncate">{session?.user?.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{session?.user?.email}</p>
                    </div>
                    <button onClick={() => { dashboard.setIsProfileMenuOpen(false); router.push('/profile'); }} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-slate-300 hover:bg-slate-800/80 hover:text-white transition-colors">
                      <User className="w-4 h-4 text-slate-400" /><span>Mi Perfil</span>
                    </button>
                    
                    <button 
                      onClick={() => { 
                        dashboard.setIsProfileMenuOpen(false); 
                        dashboard.setIsJoinModalOpen(true); 
                      }} 
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-cyan-300 hover:bg-cyan-500/10 hover:text-cyan-200 transition-colors"
                    >
                      <Building2 className="w-4 h-4" />
                      <span>Unirme a Workspace</span>
                    </button>
                    
                    <div className="h-px bg-slate-800 my-1" />
                    
                    <button 
                      onClick={() => { 
                        dashboard.setIsProfileMenuOpen(false); 
                        dashboard.setIsLogoutModalOpen(true); 
                      }} 
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-rose-400 hover:bg-rose-500/15 hover:text-rose-300 transition-colors font-medium"
                    >
                      <LogOut className="w-4 h-4" /><span>Cerrar Sesión</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* LAYOUT PRINCIPAL */}
      <div className="flex flex-1 overflow-hidden relative">
        {dashboard.isSidebarOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-20 md:hidden transition-opacity" onClick={() => dashboard.setIsSidebarOpen(false)} />}
        
        <aside className={`absolute md:relative z-30 h-full w-64 flex-shrink-0 bg-slate-900/90 md:bg-slate-900/40 border-r border-slate-800/80 backdrop-blur-2xl transition-transform duration-300 ease-in-out flex flex-col overflow-hidden ${dashboard.isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
          <div className="flex-1 overflow-y-auto">
            <ClickUpSidebar 
              workspaceId={dashboard.workspaceId || ""} 
              organizationName={dashboard.planInfo?.organizationName || "Mi Organización"}
              onSelectList={dashboard.handleListSelect} 
              onOpenFolderModal={dashboard.handleOpenFolderModal} 
            />
          </div>
          <div className="p-3 pt-2 flex-shrink-0 border-t border-slate-800/60 bg-slate-950/20">
            <Link href="/dashboard" className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border border-slate-800 hover:bg-slate-800/80 text-slate-300 hover:text-white transition-all text-xs font-semibold">
              <LayoutDashboard className="w-4 h-4 text-cyan-400" /><span>Dashboard</span>
            </Link>
          </div>
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-slate-950 via-slate-950 to-slate-900 min-w-0">
          {dashboard.selectedList ? (
            <>
              <div className="px-4 sm:px-6 py-4 border-b border-slate-800/60 bg-slate-900/30 backdrop-blur-xl flex-shrink-0 relative z-10">
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-bold tracking-wider uppercase shadow-inner transition-all duration-300 ${dashboard.isSyncing ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'}`}>
                      {dashboard.isSyncing ? <><RefreshCw className="w-3 h-3 animate-spin" /><span>Sincronizando...</span></> : <><Sparkles className="w-3 h-3 animate-pulse" /><span>Activa</span></>}
                    </div>
                    <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2 truncate">{dashboard.selectedList.name}</h1>
                    <p className="text-[11px] text-slate-400 font-light">{dashboard.filteredTasks?.length || 0} {(dashboard.filteredTasks?.length === 1) ? 'tarea en curso' : 'tareas en curso'}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button onClick={() => dashboard.setIsPaletteOpen(true)} className="flex items-center gap-2 px-3 py-1.5 bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-xl text-xs font-medium text-slate-300 transition-all shadow-sm group">
                      <Search className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" /><span className="hidden sm:inline">Buscar...</span>
                      <kbd className="px-1 py-0.5 text-[9px] bg-slate-800/80 border border-slate-700 rounded-lg text-slate-400 font-mono">⌘K</kbd>
                    </button>
                    <div className="flex bg-slate-900/90 rounded-xl p-1 border border-slate-800 shadow-inner">
                      <button onClick={() => dashboard.setViewMode("list")} className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${dashboard.viewMode === "list" ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25" : "text-slate-400 hover:text-slate-200"}`}>
                        <List className="w-3.5 h-3.5" /><span className="hidden sm:inline">Lista</span>
                      </button>
                      <button onClick={() => dashboard.setViewMode("kanban")} className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${dashboard.viewMode === "kanban" ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25" : "text-slate-400 hover:text-slate-200"}`}>
                        <LayoutGrid className="w-3.5 h-3.5" /><span className="hidden sm:inline">Tablero</span>
                      </button>
                      <button onClick={() => dashboard.setViewMode("calendar")} className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${dashboard.viewMode === "calendar" ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/25" : "text-slate-400 hover:text-slate-200"}`}>
                        <CalendarIcon className="w-3.5 h-3.5" /><span className="hidden sm:inline">Calendario</span>
                      </button>
                    </div>
                    <button onClick={dashboard.openCreateModal} className="flex items-center gap-2 px-3.5 sm:px-4 py-1.5 bg-gradient-to-r from-cyan-500 via-cyan-600 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl transition-all text-xs font-bold shadow-lg shadow-cyan-500/25 active:scale-95 ml-auto sm:ml-0">
                      <Plus className="w-3.5 h-3.5" /><span>Nueva Tarea</span>
                    </button>
                  </div>
                </div>
                
                <div className="mt-3.5 pt-3 border-t border-slate-800/60 flex flex-wrap items-center justify-between gap-3 relative z-10">
                  <div className="flex items-center gap-2.5 flex-1 min-w-[240px]">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                      <input type="text" value={dashboard.searchQuery} onChange={(e) => dashboard.setSearchQuery(e.target.value)} placeholder="Filtrar tareas..." className="w-full bg-slate-950/60 border border-slate-800 rounded-xl pl-9 pr-8 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 transition-all shadow-inner" />
                      {dashboard.searchQuery && <button onClick={() => dashboard.setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"><X className="w-3.5 h-3.5" /></button>}
                    </div>
                    <div className="relative">
                      <button onClick={() => dashboard.setIsFilterDropdownOpen(!dashboard.isFilterDropdownOpen)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${dashboard.statusFilter !== "all" || dashboard.priorityFilter !== "all" || dashboard.sortOption !== "custom" ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-300" : "bg-slate-900/80 border-slate-800 text-slate-300 hover:bg-slate-800"}`}>
                        <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" /><span className="hidden sm:inline">Filtros & Orden</span>
                      </button>
                      {dashboard.isFilterDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => dashboard.setIsFilterDropdownOpen(false)}></div>
                          <div className="absolute left-0 md:left-auto md:right-0 mt-2 w-72 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-4 z-50 backdrop-blur-2xl space-y-4 animate-in fade-in zoom-in-95">
                            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                              <span className="text-xs font-bold text-white flex items-center gap-1.5"><SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" /><span>Filtros y Ordenamiento</span></span>
                            </div>
                            <div className="space-y-1.5">
                              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estado</label>
                              <div className="grid grid-cols-2 gap-1.5">
                                {[{ id: "all", label: "Todos" }, { id: "todo", label: "Por hacer" }, { id: "in_progress", label: "En progreso" }, { id: "done", label: "Completadas" }].map((item) => (
                                  <button key={item.id} onClick={() => dashboard.setStatusFilter(item.id as any)} className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-left transition-all border ${dashboard.statusFilter === item.id ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-200" : "bg-slate-950/40 border-slate-800 text-slate-400 hover:bg-slate-800/80"}`}>{item.label}</button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-hidden p-4 sm:p-6 lg:p-8 flex flex-col relative z-0">
                {dashboard.viewMode === "list" ? (
                  <div className="max-w-4xl mx-auto w-full overflow-y-auto flex-1 pr-1">
                    <div className="space-y-1.5">
                      {dashboard.hierarchicalTasks?.map((task) => (
                        <InlineTaskRow key={task.id} task={task} depth={0} expandedTasks={dashboard.expandedTasks} customFields={dashboard.customFields} onToggleExpand={dashboard.toggleTaskExpand} onToggleStatus={(id, status) => dashboard.handleUpdateTask({ id, status })} onEdit={dashboard.openEditModal} onDelete={dashboard.handleDeleteTask} onCreateSubtask={dashboard.openCreateSubtaskModal} />
                      ))}
                    </div>
                  </div>
                ) : dashboard.viewMode === "kanban" ? (
                  <div className="h-full overflow-x-auto flex-1"><KanbanBoard tasks={dashboard.filteredTasks || []} onUpdateStatus={async (taskId, newStatus) => { await dashboard.handleUpdateTask({ id: taskId, status: newStatus }); }} onEditTask={dashboard.openEditModal} /></div>
                ) : (
                  <div className="h-full flex-1 flex flex-col overflow-hidden"><FunctionalCalendarView tasks={dashboard.filteredTasks || []} onEditTask={dashboard.openEditModal} /></div>
                )}
              </div>
            </>
          ) : hasWorkspace ? (
            <div className="flex-1 overflow-y-auto p-6 lg:p-10">
              <div className="max-w-6xl mx-auto">
                <div className="text-center mb-10">
                  <h1 className="text-2xl font-bold text-white mb-2">¿Qué quieres hacer hoy?</h1>
                  <p className="text-xs text-slate-400">Elige una opción para continuar</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-0 md:gap-8 items-start">
                  <div className={`space-y-5 ${hasWorkspace ? 'md:border-r md:border-slate-800/60 md:pr-8' : ''}`}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 flex items-center justify-center">
                        <Clock className="w-4 h-4 text-cyan-400" />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-white">¿Seguimos trabajando en?</h2>
                        <p className="text-[10px] text-slate-400 mt-0.5">Tus tareas más recientes</p>
                      </div>
                    </div>

                    {isLoadingAllTasks ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-400 border-t-transparent"></div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {allRecentTasks.map((task) => (
                          <button
                            key={task.id}
                            onClick={() => {
                              const space = dashboard.spaces?.find((s: any) => s.id === task.spaceId);
                              const list = space?.lists?.find((l: any) => l.id === task.listId);
                              if (list && space) {
                                dashboard.handleListSelect({ id: list.id, name: list.name, spaceId: space.id });
                                setTimeout(() => dashboard.openEditModal(task as any), 300);
                              }
                            }}
                            className="w-full text-left p-3.5 bg-slate-900/40 hover:bg-slate-900/60 border border-slate-800/60 hover:border-cyan-500/30 rounded-xl transition-all group"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-semibold text-white truncate group-hover:text-cyan-300 transition-colors">
                                  {task.title}
                                </h3>
                                {task.description && (
                                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                                    {task.description}
                                  </p>
                                )}
                                <div className="flex items-center gap-2 mt-2 flex-wrap">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                    task.status === 'done' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                                    task.status === 'in_progress' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                                    'bg-slate-700/50 text-slate-400 border border-slate-700'
                                  }`}>
                                    {task.status === 'done' ? 'Completada' : task.status === 'in_progress' ? 'En progreso' : 'Por hacer'}
                                  </span>
                                  {task.priority && task.priority > 0 && (
                                    <span className={`text-[10px] font-medium ${
                                      task.priority >= 4 ? 'text-rose-400' :
                                      task.priority >= 3 ? 'text-orange-400' :
                                      'text-slate-400'
                                    }`}>
                                      {task.priority >= 4 ? '🔥 Urgente' : task.priority >= 3 ? ' Alta' : 'Normal'}
                                    </span>
                                  )}
                                  <span className="text-[10px] text-slate-500">
                                    {task.listName}
                                  </span>
                                </div>
                              </div>
                              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all flex-shrink-0 mt-1" />
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {!isLoadingAllTasks && allRecentTasks.length === 0 && (
                      <div className="text-center py-12">
                        <CheckSquare className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                        <p className="text-sm text-slate-400">No hay tareas recientes</p>
                        <p className="text-xs text-slate-500 mt-1">Crea tu primera tarea para comenzar</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-5 md:pl-8">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-600/20 border border-purple-500/30 flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-purple-400" />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-white">¿O prefieres crear algo nuevo?</h2>
                        <p className="text-[10px] text-slate-400 mt-0.5">Empieza algo nuevo</p>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <button
                        onClick={() => {
                          if (!canCreateWorkspace) {
                            dashboard.setPlanLimitModal({
                              isOpen: true,
                              type: "workspaces",
                              currentPlan: dashboard.planInfo?.planName || "Free",
                              currentCount: dashboard.planInfo?.workspaceCount || 0,
                              limit: dashboard.planInfo?.workspaceLimit || 0
                            });
                          } else {
                            setIsCreateWorkspaceModalOpen(true);
                          }
                        }}
                        className="w-full flex items-center gap-3.5 p-3.5 bg-slate-900/40 hover:bg-slate-900/60 border border-slate-800/60 hover:border-amber-500/30 rounded-xl transition-all group"
                      >
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Building2 className="w-5 h-5 text-amber-400" />
                        </div>
                        <div className="flex-1 text-left">
                          <h3 className="text-sm font-semibold text-white group-hover:text-amber-300 transition-colors">Nuevo Workspace</h3>
                          <p className="text-xs text-slate-400 mt-0.5">Crea un espacio de trabajo completo</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
                      </button>

                      <button
                        onClick={() => setIsCreateSpaceModalOpen(true)}
                        className="w-full flex items-center gap-3.5 p-3.5 bg-slate-900/40 hover:bg-slate-900/60 border border-slate-800/60 hover:border-purple-500/30 rounded-xl transition-all group"
                      >
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <FolderKanban className="w-5 h-5 text-purple-400" />
                        </div>
                        <div className="flex-1 text-left">
                          <h3 className="text-sm font-semibold text-white group-hover:text-purple-300 transition-colors">Nuevo Espacio</h3>
                          <p className="text-xs text-slate-400 mt-0.5">Organiza tus proyectos en espacios</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 group-hover:translate-x-1 transition-all" />
                      </button>

                      <button
                        onClick={() => setIsCreateFolderModalOpen(true)}
                        className="w-full flex items-center gap-3.5 p-3.5 bg-slate-900/40 hover:bg-slate-900/60 border border-slate-800/60 hover:border-indigo-500/30 rounded-xl transition-all group"
                      >
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500/20 to-blue-500/20 border border-indigo-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Folder className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div className="flex-1 text-left">
                          <h3 className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors">Nueva Carpeta</h3>
                          <p className="text-xs text-slate-400 mt-0.5">Organiza dentro de un espacio</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                      </button>

                      <button
                        onClick={handleCreateTaskFromHome}
                        className="w-full flex items-center gap-3.5 p-3.5 bg-slate-900/40 hover:bg-slate-900/60 border border-slate-800/60 hover:border-cyan-500/30 rounded-xl transition-all group"
                      >
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-teal-500/20 border border-cyan-500/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                          <CheckSquare className="w-5 h-5 text-cyan-400" />
                        </div>
                        <div className="flex-1 text-left">
                          <h3 className="text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors">Nueva Tarea</h3>
                          <p className="text-xs text-slate-400 mt-0.5">Agrega una tarea a tu lista</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center p-6">
              <div className="text-center max-w-sm p-8 rounded-2xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-2xl shadow-xl shadow-cyan-500/5">
                <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto mb-4 text-cyan-400 shadow-lg"><Layers className="w-6 h-6" /></div>
                <h2 className="text-lg font-bold text-white mb-1">Project SaaS</h2>
                <p className="text-xs text-slate-400 mb-6 font-light">Selecciona una lista en el panel izquierdo para comenzar a planificar.</p>
                <button onClick={dashboard.createFirstList} className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl font-bold shadow-lg shadow-cyan-500/25 transition-all text-xs">Crear mi primera lista</button>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MODALES */}
      <TaskModal isOpen={dashboard.isModalOpen} onClose={() => dashboard.setIsModalOpen(false)} onSave={dashboard.handleSaveWithParent} initialData={dashboard.editingTask} listId={dashboard.selectedList?.id || ""} />
      <CommandPalette isOpen={dashboard.isPaletteOpen} onClose={() => dashboard.setIsPaletteOpen(false)} allTasks={dashboard.allWorkspaceTasks || []} onSelectTask={(task) => { if (task.listId) { dashboard.setSelectedList({ id: task.listId, name: task.listName || "", tasks: [] }); setTimeout(() => dashboard.openEditModal(task as any), 100); } }} />

      {isCreateWorkspaceModalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Crear Nuevo Workspace</h3>
              <button onClick={() => { setIsCreateWorkspaceModalOpen(false); setNewWorkspaceName(""); }} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateWorkspace} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Nombre del Workspace</label>
                <input
                  type="text"
                  required
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  placeholder="Mi nuevo workspace"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500/50"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setIsCreateWorkspaceModalOpen(false); setNewWorkspaceName(""); }}
                  className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingWorkspace}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-amber-500/25 disabled:opacity-50"
                >
                  {isCreatingWorkspace ? "Creando..." : "Crear Workspace"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isCreateSpaceModalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Crear Nuevo Espacio</h3>
              <button onClick={() => { setIsCreateSpaceModalOpen(false); setNewSpaceName(""); }} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateSpace} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Nombre del Espacio</label>
                <input
                  type="text"
                  required
                  value={newSpaceName}
                  onChange={(e) => setNewSpaceName(e.target.value)}
                  placeholder="Mi nuevo espacio"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500/50"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setIsCreateSpaceModalOpen(false); setNewSpaceName(""); }}
                  className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingSpace}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-400 hover:to-pink-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-purple-500/25 disabled:opacity-50"
                >
                  {isCreatingSpace ? "Creando..." : "Crear Espacio"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isCreateTaskModalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Crear Nueva Tarea</h3>
              <button onClick={() => { setIsCreateTaskModalOpen(false); setSelectedSpaceForTask(""); }} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateTask} className="space-y-4">
              {dashboard.spaces && dashboard.spaces.length > 0 ? (
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Seleccionar Espacio</label>
                  <select
                    value={selectedSpaceForTask}
                    onChange={(e) => setSelectedSpaceForTask(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500/50"
                  >
                    <option value="">Selecciona un espacio...</option>
                    {dashboard.spaces.map((space) => (
                      <option key={space.id} value={space.id}>{space.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl">
                  <p className="text-xs text-cyan-300">No tienes espacios. Se creará uno automáticamente.</p>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setIsCreateTaskModalOpen(false); setSelectedSpaceForTask(""); }}
                  className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingTask}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-600 hover:from-cyan-400 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-cyan-500/25 disabled:opacity-50"
                >
                  {isCreatingTask ? "Creando..." : "Crear Tarea"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isCreateFolderModalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Crear Nueva Carpeta</h3>
              <button onClick={() => { setIsCreateFolderModalOpen(false); setNewFolderName(""); setSelectedSpaceForFolder(""); }} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateFolder} className="space-y-4">
              {dashboard.spaces && dashboard.spaces.length > 0 ? (
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Seleccionar Espacio</label>
                  <select
                    value={selectedSpaceForFolder}
                    onChange={(e) => setSelectedSpaceForFolder(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500/50"
                  >
                    <option value="">Selecciona un espacio...</option>
                    {dashboard.spaces.map((space) => (
                      <option key={space.id} value={space.id}>{space.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
                  <p className="text-xs text-indigo-300">No tienes espacios. Se creará uno automáticamente.</p>
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Nombre de la Carpeta</label>
                <input
                  type="text"
                  required
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Mi nueva carpeta"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500/50"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setIsCreateFolderModalOpen(false); setNewFolderName(""); setSelectedSpaceForFolder(""); }}
                  className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingFolder}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-400 hover:to-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-50"
                >
                  {isCreatingFolder ? "Creando..." : "Crear Carpeta"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {dashboard.isJoinModalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">Unirme a Workspace</h3>
              <button onClick={() => { dashboard.setIsJoinModalOpen(false); dashboard.setJoinError(""); }} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {dashboard.joinError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs font-medium text-rose-300 leading-relaxed">{dashboard.joinError}</p>
              </div>
            )}

            <form onSubmit={dashboard.handleJoinWorkspace} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Código de Invitación</label>
                <input
                  type="text"
                  required
                  value={dashboard.joinForm.inviteCode}
                  onChange={(e) => dashboard.setJoinForm({ ...dashboard.joinForm, inviteCode: e.target.value.toUpperCase() })}
                  placeholder="ABC123"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500/50"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Slug del Workspace</label>
                <input
                  type="text"
                  required
                  value={dashboard.joinForm.workspaceSlug}
                  onChange={(e) => dashboard.setJoinForm({ ...dashboard.joinForm, workspaceSlug: e.target.value })}
                  placeholder="nombre-del-workspace"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500/50"
                />
                <p className="text-[10px] text-slate-500 mt-1">Pídele este dato al administrador del workspace</p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { dashboard.setIsJoinModalOpen(false); dashboard.setJoinError(""); }}
                  className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={dashboard.isJoining}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-cyan-500/25 disabled:opacity-50"
                >
                  {dashboard.isJoining ? "Uniéndote..." : "Unirme al Workspace"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {dashboard.isLogoutModalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-rose-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">¿Cerrar sesión?</h3>
              <p className="text-sm text-slate-400 mb-6">Estás a punto de cerrar tu sesión actual. ¿Deseas continuar?</p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => dashboard.setIsLogoutModalOpen(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors border border-slate-700"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-rose-500/20"
                >
                  Sí, cerrar sesión
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {dashboard.planLimitModal.isOpen && (
        <PlanLimitModal
          isOpen={dashboard.planLimitModal.isOpen}
          onClose={() => dashboard.setPlanLimitModal({ ...dashboard.planLimitModal, isOpen: false })}
          type={dashboard.planLimitModal.type}
          currentPlan={dashboard.planLimitModal.currentPlan}
          currentCount={dashboard.planLimitModal.currentCount}
          limit={dashboard.planLimitModal.limit}
        />
      )}
    </div>
  );
}