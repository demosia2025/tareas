"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { 
  ArrowLeft, 
  CheckCircle2, 
  Layers, 
  BarChart3,
  PieChart as PieIcon,
  Activity,
  Calendar,
  ShieldCheck,
  Clock,
  Download,
  ChevronDown,
  Building2,
  User,
  LogOut
} from "lucide-react";
import { generateExecutiveReport } from "@/lib/reportGenerator";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: number | string;
  dueDate: string | null;
  createdAt?: string;
  updatedAt?: string;
  listName?: string;
  spaceName?: string;
  organizationId?: string;
}

interface Organization {
  id: string;
  name: string;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  
  // Filtros
  const [selectedOrgId, setSelectedOrgId] = useState<string>("all");
  const [timeFilter, setTimeFilter] = useState<"day" | "week" | "month" | "year" | "all">("month");
  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const hasLoadedRef = useRef(false);

     const userRole = ((session?.user as any)?.role || "").toLowerCase();
  const isAdmin = userRole === "admin" || userRole === "superadmin";

  useEffect(() => {
    if (hasLoadedRef.current) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        const resWorkspace = await fetch(`/api/user/workspace?userId=${session?.user?.id}`);
        const wsData = await resWorkspace.json();
        
        // ✅ CORREGIDO: La API ahora devuelve { memberships: [...] }
        if (wsData.memberships && wsData.memberships.length > 0) {
          
          // Obtener el workspace activo del localStorage, o usar el primero por defecto
          const activeWs = localStorage.getItem("activeWorkspaceId");
          const isValid = wsData.memberships.some((m: any) => m.workspaceId === activeWs);
          const targetWorkspaceId = isValid ? activeWs : wsData.memberships[0].workspaceId;

          if (isAdmin) {
            const resOrgs = await fetch("/api/admin/organizations");
            if (resOrgs.ok) {
              const orgs = await resOrgs.json();
              setOrganizations(orgs);
            }
          }

          // ✅ Usamos el targetWorkspaceId correcto
          const resHierarchy = await fetch(`/api/workspace/${targetWorkspaceId}/hierarchy`);
          const hierarchy = await resHierarchy.json();
          
          if (!Array.isArray(hierarchy)) {
            console.error("Error cargando jerarquía:", hierarchy);
            setTasks([]);
            hasLoadedRef.current = true;
            return;
          }
          
          let allTasks: Task[] = [];
          for (const space of hierarchy) {
            for (const folder of space.folders || []) {
              for (const list of folder.lists || []) {
                const resTasks = await fetch(`/api/tasks?listId=${list.id}`);
                if (resTasks.ok) {
                  const listTasks = await resTasks.json();
                  allTasks = [...allTasks, ...listTasks.map((t: any) => ({ 
                    ...t, 
                    listName: list.name,
                    spaceName: space.name
                  }))];
                }
              }
            }
            for (const list of space.lists || []) {
              const resTasks = await fetch(`/api/tasks?listId=${list.id}`);
              if (resTasks.ok) {
                const listTasks = await resTasks.json();
                allTasks = [...allTasks, ...listTasks.map((t: any) => ({ 
                  ...t, 
                  listName: list.name,
                  spaceName: space.name
                }))];
              }
            }
          }
          
          // ✅ ELIMINAR DUPLICADOS antes de guardar
          const uniqueTasks = Array.from(
            new Map(allTasks.map(task => [task.id, task])).values()
          );
          
          setTasks(uniqueTasks);
          hasLoadedRef.current = true;
        }
      } catch (error) {
        console.error("Error al cargar datos del dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    if (session?.user?.id) {
      fetchData();
    }
  }, [session, isAdmin]);

  const filteredTasks = useMemo(() => {
    const now = new Date();
    const startDate = new Date();
    
    if (timeFilter === "day") startDate.setDate(now.getDate() - 1);
    else if (timeFilter === "week") startDate.setDate(now.getDate() - 7);
    else if (timeFilter === "month") startDate.setMonth(now.getMonth() - 1);
    else if (timeFilter === "year") startDate.setFullYear(now.getFullYear() - 1);
    else startDate.setFullYear(2000);

    return tasks.filter(t => {
      const taskDate = new Date(t.createdAt || 0);
      const matchesOrg = selectedOrgId === "all" || t.organizationId === selectedOrgId;
      const matchesTime = taskDate >= startDate;
      return matchesOrg && matchesTime;
    });
  }, [tasks, selectedOrgId, timeFilter]);

  const totalTasks = filteredTasks.length;
  const completedTasks = filteredTasks.filter(t => t.status === "done" || t.status === "completed").length;
  const inProgressTasks = filteredTasks.filter(t => t.status === "in_progress" || t.status === "doing").length;
  const pendingTasks = filteredTasks.filter(t => t.status === "todo" || !t.status).length;

  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const completedTasksWithTime = filteredTasks.filter(t => 
    (t.status === "done" || t.status === "completed") && t.createdAt && t.updatedAt
  );
  
  let totalCompletionTimeMs = 0;
  completedTasksWithTime.forEach(t => {
    const created = new Date(t.createdAt!).getTime();
    const updated = new Date(t.updatedAt!).getTime();
    if (updated > created) {
      totalCompletionTimeMs += (updated - created);
    }
  });

  const avgCompletionTimeMs = completedTasksWithTime.length > 0 
    ? totalCompletionTimeMs / completedTasksWithTime.length 
    : 0;

  const formatDuration = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))}m`;
    return `${Math.floor(ms / (1000 * 60))}m`;
  };

  const handleDownloadReport = async () => {
    setIsDownloading(true);
    try {
      const reportData = {
        companyName: "Project SaaS Kanban",
        reportTitle: "REPORTE EJECUTIVO DE RENDIMIENTO",
        generatedDate: new Date().toLocaleDateString('es-ES', {
          year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
        }),
        period: getFilterLabel(),
        organization: getOrganizationName(),
        metrics: {
          totalTasks, completedTasks, inProgressTasks, pendingTasks, completionRate,
          avgCompletionTime: formatDuration(avgCompletionTimeMs)
        },
        tasksByPriority: {
          urgent: filteredTasks.filter(t => Number(t.priority) === 4).length,
          high: filteredTasks.filter(t => Number(t.priority) === 3).length,
          medium: filteredTasks.filter(t => Number(t.priority) === 2).length,
          low: filteredTasks.filter(t => Number(t.priority) <= 1).length
        },
        recentTasks: filteredTasks.slice(0, 20).map(task => {
          let durationStr = '-';
          if ((task.status === 'done' || task.status === 'completed') && task.createdAt && task.updatedAt) {
            const created = new Date(task.createdAt).getTime();
            const updated = new Date(task.updatedAt).getTime();
            if (updated > created) {
              const ms = updated - created;
              const hours = Math.floor(ms / (1000 * 60 * 60));
              const days = Math.floor(hours / 24);
              if (days > 0) durationStr = `${days}d ${hours % 24}h`;
              else if (hours > 0) durationStr = `${hours}h ${Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))}m`;
              else durationStr = `${Math.floor(ms / (1000 * 60))}m`;
            }
          }
          return {
            title: task.title,
            space: task.spaceName || 'General',
            list: task.listName || 'General',
            status: task.status === 'done' || task.status === 'completed' ? 'Completada' : 
                    task.status === 'in_progress' || task.status === 'doing' ? 'En Progreso' : 'Pendiente',
            priority: Number(task.priority) === 4 ? 'Urgente' : Number(task.priority) === 3 ? 'Alta' : Number(task.priority) === 2 ? 'Media' : 'Baja',
            createdAt: new Date(task.createdAt || '').toLocaleDateString('es-ES'),
            duration: durationStr
          };
        })
      };
      
      const pdfBlob = generateExecutiveReport(reportData);
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Reporte_Ejecutivo_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error generando reporte:", error);
      alert("Error al generar el reporte PDF");
    } finally {
      setIsDownloading(false);
    }
  };

  const getFilterLabel = () => {
    switch(timeFilter) {
      case "day": return "Último Día";
      case "week": return "Última Semana";
      case "month": return "Último Mes";
      case "year": return "Último Año";
      case "all": return "Todo el Período";
      default: return "";
    }
  };

  const getOrganizationName = () => {
    if (selectedOrgId === "all") return "Todas las Organizaciones";
    return organizations.find(o => o.id === selectedOrgId)?.name || "Todas";
  };

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-[#06080F] text-slate-100 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin"></div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Cargando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#06080F] text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Topbar */}
      <header className="h-12 bg-[#06080F]/90 backdrop-blur-xl border-b border-white/[0.08] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-1.5 px-3 py-1 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] rounded-xl text-[11px] font-semibold text-slate-300 transition-all">
          <ArrowLeft className="w-3.5 h-3.5 text-indigo-400" />
          <span>Volver al Workspace</span>
        </Link>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={handleDownloadReport}
            disabled={isDownloading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 rounded-xl text-[11px] font-semibold text-indigo-300 transition-all disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isDownloading ? "Generando..." : "Descargar Reporte PDF"}</span>
          </button>

          <div className="relative z-50">
            <button 
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex items-center gap-2 bg-slate-900/80 border border-white/[0.08] px-3 py-1 rounded-xl hover:bg-slate-800/80 transition-all"
            >
              <div className="w-5 h-5 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-extrabold text-[10px]">
                {(session?.user?.name || "U")[0].toUpperCase()}
              </div>
              <span className="text-[11px] font-bold text-slate-200">{session?.user?.name || "Admin"}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>
            
            {isProfileMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsProfileMenuOpen(false)}></div>
                <div className="absolute right-0 mt-2 w-52 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-1 z-[9999] backdrop-blur-2xl animate-in fade-in zoom-in-95">
                  <div className="px-3.5 py-2 border-b border-slate-800">
                    <p className="text-xs font-bold text-white truncate">{session?.user?.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{session?.user?.email}</p>
                  </div>
                  <Link href="/profile" onClick={() => setIsProfileMenuOpen(false)} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-slate-300 hover:bg-slate-800/80 hover:text-white transition-colors">
                    <User className="w-4 h-4 text-slate-400" /><span>Mi Perfil</span>
                  </Link>
                  <div className="h-px bg-slate-800 my-1" />
                  <button onClick={() => signOut({ callbackUrl: "/" })} className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-rose-400 hover:bg-rose-500/15 hover:text-rose-300 transition-colors font-medium">
                    <LogOut className="w-4 h-4" /><span>Cerrar Sesión</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-4 space-y-4">
        {/* Panel de Filtros */}
        <div className="flex flex-wrap items-center gap-3 p-3 rounded-2xl border border-white/[0.08] bg-slate-900/40">
          {isAdmin && organizations.length > 0 && (
            <div className="relative">
              <button 
                onClick={() => setIsOrgDropdownOpen(!isOrgDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-medium text-slate-200 transition-all"
              >
                <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>{selectedOrgId === "all" ? "Todas las Organizaciones" : organizations.find(o => o.id === selectedOrgId)?.name}</span>
                <ChevronDown className="w-3 h-3" />
              </button>
              {isOrgDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 py-1">
                  <button onClick={() => { setSelectedOrgId("all"); setIsOrgDropdownOpen(false); }} className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white">
                    Todas las Organizaciones
                  </button>
                  {organizations.map(org => (
                    <button key={org.id} onClick={() => { setSelectedOrgId(org.id); setIsOrgDropdownOpen(false); }} className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white">
                      {org.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1 border border-slate-700">
            {(["day", "week", "month", "year", "all"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setTimeFilter(filter)}
                className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${
                  timeFilter === filter ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {filter === "all" ? "Todo" : filter === "day" ? "Día" : filter === "week" ? "Semana" : filter === "month" ? "Mes" : "Año"}
              </button>
            ))}
          </div>
        </div>

        {/* Banner Superior */}
        <div className="flex items-center justify-between px-4 py-3 rounded-2xl border border-white/[0.08] bg-gradient-to-r from-indigo-950/40 via-slate-900/60 to-slate-950/80 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300 shrink-0">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-base font-black text-white tracking-tight leading-none">Panel de Control</h1>
              <p className="text-[10px] text-slate-400 mt-0.5">Resumen analítico en tiempo real</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-[10px] font-bold text-emerald-400">En Vivo</span>
          </div>
        </div>

        {/* METRICAS KPI */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-slate-900/60 border border-white/[0.08] rounded-2xl p-3.5 flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Tareas</span>
              <span className="text-2xl font-black text-white tracking-tight">{totalTasks}</span>
            </div>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-slate-900/60 border border-white/[0.08] rounded-2xl p-3.5 flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Completadas</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-emerald-400 tracking-tight">{completedTasks}</span>
                <span className="text-[10px] font-bold text-emerald-500">({completionRate}%)</span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-slate-900/60 border border-white/[0.08] rounded-2xl p-3.5 flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tiempo Promedio</span>
              <span className="text-xl font-black text-amber-400 tracking-tight">{formatDuration(avgCompletionTimeMs)}</span>
              <span className="text-[9px] text-slate-500 block">por tarea completada</span>
            </div>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-slate-900/60 border border-white/[0.08] rounded-2xl p-3.5 flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">En Progreso</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-blue-400 tracking-tight">{inProgressTasks}</span>
                <span className="text-[10px] text-slate-400">({pendingTasks} pendientes)</span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Activity className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* PANEL CENTRAL */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
          <div className="lg:col-span-5 bg-slate-900/60 border border-white/[0.08] rounded-2xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-bold text-white tracking-tight flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-indigo-400" /> Carga por Prioridad
              </h2>
              <span className="text-[10px] font-bold text-slate-400">{totalTasks} tareas</span>
            </div>

            <div className="grid grid-cols-4 gap-3 items-end h-36 pt-4 pb-2 border-b border-white/[0.06]">
              {[
                { label: "Urgente", count: filteredTasks.filter(t => Number(t.priority) === 4).length, pct: totalTasks > 0 ? Math.round((filteredTasks.filter(t => Number(t.priority) === 4).length / totalTasks) * 100) : 0, badge: "text-rose-400" },
                { label: "Alta", count: filteredTasks.filter(t => Number(t.priority) === 3).length, pct: totalTasks > 0 ? Math.round((filteredTasks.filter(t => Number(t.priority) === 3).length / totalTasks) * 100) : 0, badge: "text-amber-400" },
                { label: "Media", count: filteredTasks.filter(t => Number(t.priority) === 2).length, pct: totalTasks > 0 ? Math.round((filteredTasks.filter(t => Number(t.priority) === 2).length / totalTasks) * 100) : 0, badge: "text-indigo-400" },
                { label: "Baja", count: filteredTasks.filter(t => Number(t.priority) <= 1).length, pct: totalTasks > 0 ? Math.round((filteredTasks.filter(t => Number(t.priority) <= 1).length / totalTasks) * 100) : 0, badge: "text-slate-400" },
              ].map((bar, idx) => (
                <div key={idx} className="flex flex-col items-center h-full justify-end">
                  <span className={`text-xs font-black ${bar.badge}`}>{bar.count}</span>
                  <div className="w-full max-w-[32px] bg-slate-950/80 rounded-xl h-full flex items-end p-0.5 border border-white/[0.05] relative overflow-hidden">
                    <div className={`w-full bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-lg transition-all duration-500 shadow-sm relative`} style={{ height: `${Math.max(bar.pct, 10)}%` }}>
                      <div className="absolute top-0 left-0 right-0 h-1 bg-white/40 rounded-t-lg"></div>
                    </div>
                  </div>
                  <span className="mt-1 text-[10px] font-bold text-slate-400">{bar.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-3 bg-slate-900/60 border border-white/[0.08] rounded-2xl p-4 flex flex-col items-center justify-between">
            <div className="w-full text-left">
              <h3 className="text-xs font-bold text-white tracking-tight flex items-center gap-1.5">
                <PieIcon className="w-3.5 h-3.5 text-emerald-400" /> Rendimiento
              </h3>
            </div>

            <div className="relative w-28 h-28 flex items-center justify-center my-1">
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="38" className="stroke-slate-900" strokeWidth="10" fill="transparent" />
                <circle
                  cx="50" cy="50" r="38"
                  className="stroke-emerald-400 transition-all duration-700"
                  strokeWidth="10" 
                  strokeDasharray="238.76" 
                  strokeDashoffset={238.76 - (238.76 * completionRate) / 100} 
                  strokeLinecap="round" 
                  fill="transparent"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-black text-white">{completionRate}%</span>
                <span className="text-[8px] font-bold text-emerald-400 uppercase">Éxito</span>
              </div>
            </div>

            <span className="text-[10px] font-semibold text-slate-300">
              {completedTasks} de {totalTasks} resueltas
            </span>
          </div>

          <div className="lg:col-span-4 bg-slate-900/60 border border-white/[0.08] rounded-2xl p-4 flex flex-col justify-between">
            <h3 className="text-xs font-bold text-white tracking-tight flex items-center gap-1.5 mb-2">
              <Calendar className="w-3.5 h-3.5 text-indigo-400" /> Próximos Vencimientos
            </h3>
            
            <div className="space-y-1.5">
              {filteredTasks.filter(t => t.status !== "done" && t.status !== "completed" && t.dueDate)
                .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
                .slice(0, 4).map((task) => {
                  const num = Number(task.priority);
                  const p = num === 4 ? { label: "Urgente", color: "text-rose-400 bg-rose-500/10 border-rose-500/30" } :
                            num === 3 ? { label: "Alta", color: "text-amber-400 bg-amber-500/10 border-amber-500/30" } :
                            num === 2 ? { label: "Media", color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/30" } :
                            { label: "Baja", color: "text-slate-400 bg-slate-500/10 border-slate-500/30" };
                  
                  const formatDate = (dateStr: string | null) => {
                    if (!dateStr) return "Sin fecha";
                    return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
                  };

                  return (
                    <div key={task.id} className="flex items-center justify-between p-2 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                      <div className="flex-1 min-w-0 mr-2">
                        <p className="text-[11px] font-bold text-slate-200 truncate">{task.title}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded border ${p.color}`}>{p.label}</span>
                        <span className="text-[10px] text-slate-400 font-semibold">{formatDate(task.dueDate)}</span>
                      </div>
                    </div>
                  );
              })}
              {filteredTasks.filter(t => t.status !== "done" && t.status !== "completed" && t.dueDate).length === 0 && (
                <div className="text-center py-4 text-slate-500 text-[10px] flex items-center justify-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-500/50" /> Sin pendientes con fecha
                </div>
              )}
            </div>
          </div>
        </div>

        {/* TABLA DE TAREAS */}
        <div className="bg-slate-900/60 border border-white/[0.08] rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-white tracking-tight flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-blue-400" /> DETALLE DE TAREAS Y TIEMPOS
            </h3>
            <span className="text-[10px] text-slate-400">Registros filtrados</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/[0.08] text-[9px] font-extrabold text-slate-400 uppercase tracking-wider">
                  <th className="pb-2 px-2">Tarea</th>
                  <th className="pb-2 px-2">Espacio / Lista</th>
                  <th className="pb-2 px-2">Estado</th>
                  <th className="pb-2 px-2">Prioridad</th>
                  <th className="pb-2 px-2">Creada</th>
                  <th className="pb-2 px-2">Tiempo Resolución</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filteredTasks.slice(0, 20).map((task) => {
                  const num = Number(task.priority);
                  const p = num === 4 ? { label: "Urgente", color: "text-rose-400 bg-rose-500/10 border-rose-500/30" } :
                            num === 3 ? { label: "Alta", color: "text-amber-400 bg-amber-500/10 border-amber-500/30" } :
                            num === 2 ? { label: "Media", color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/30" } :
                            { label: "Baja", color: "text-slate-400 bg-slate-500/10 border-slate-500/30" };
                  
                  const statusConfig: Record<string, { label: string; color: string }> = {
                    done: { label: "Completada", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
                    completed: { label: "Completada", color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
                    in_progress: { label: "En Progreso", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
                    doing: { label: "En Progreso", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
                    todo: { label: "Pendiente", color: "text-slate-400 bg-slate-500/10 border-slate-500/20" },
                  };
                  const s = statusConfig[task.status] || statusConfig.todo;

                  let durationStr = "-";
                  if ((task.status === "done" || task.status === "completed") && task.createdAt && task.updatedAt) {
                    const created = new Date(task.createdAt).getTime();
                    const updated = new Date(task.updatedAt).getTime();
                    if (updated > created) {
                      const ms = updated - created;
                      const hours = Math.floor(ms / (1000 * 60 * 60));
                      const days = Math.floor(hours / 24);
                      if (days > 0) durationStr = `${days}d ${hours % 24}h`;
                      else if (hours > 0) durationStr = `${hours}h ${Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60))}m`;
                      else durationStr = `${Math.floor(ms / (1000 * 60))}m`;
                    }
                  }

                  const formatDate = (dateStr: string | null) => {
                    if (!dateStr) return "-";
                    return new Date(dateStr).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: '2-digit' });
                  };

                  return (
                    <tr key={task.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-2 px-2 text-xs font-semibold text-slate-200 truncate max-w-[200px]">{task.title}</td>
                      <td className="py-2 px-2 text-[11px] text-slate-400">{task.spaceName} / {task.listName || "General"}</td>
                      <td className="py-2 px-2">
                        <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded border ${s.color}`}>{s.label}</span>
                      </td>
                      <td className="py-2 px-2">
                        <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded border ${p.color}`}>{p.label}</span>
                      </td>
                      <td className="py-2 px-2 text-[11px] text-slate-400 font-medium">{formatDate(task.createdAt ?? null)}</td>
                      <td className="py-2 px-2 text-[11px] text-amber-400 font-bold">{durationStr}</td>
                    </tr>
                  );
                })}
                {filteredTasks.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-4 text-center text-[11px] text-slate-500">Sin registros para los filtros aplicados</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {filteredTasks.length > 20 && (
            <div className="mt-2 text-center text-[10px] text-slate-500">
              Mostrando 20 de {filteredTasks.length} registros.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}