"use client";
import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import {
  Layers, CheckCircle2, Clock, Activity, Flame,
  BarChart3, PieChart as PieIcon, Calendar,
  ChevronDown, Building2, RotateCcw,
  Eye, FolderKanban, User, AlertCircle, Sparkles,
  FileText, X, Download
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

type TimeFilter = "DÍA" | "SEMANA" | "MES" | "AÑO" | "TODO";
type MetricView = "general" | "workspace" | "user" | "task";
type ReportType = "date" | "user" | "space" | "overdue" | "completed" | "pending";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: number;
  dueDate: string | null;
  createdAt?: string;
  updatedAt?: string;
  listName?: string;
  spaceName?: string;
  completedAt?: string;
  assigneeId?: string;
  assigneeName?: string;
  assigneeEmail?: string;
  assigneeImage?: string;
  workspaceId?: string;
  workspaceName?: string;
  renewalCount?: number;
  lastRenewedAt?: string | null;
}

interface WorkspaceMetrics {
  id: string;
  name: string;
  totalTasks: number;
  completed: number;
  inProgress: number;
  pending: number;
  completionRate: number;
}

interface UserMetrics {
  id: string;
  name: string;
  email: string;
  image?: string;
  tasks: Task[];
  totalTasks: number;
  completed: number;
  inProgress: number;
  pending: number;
  completionRate: number;
}

export default function DashboardView() {
  const { data: session } = useSession();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("TODO");
  const [metricView, setMetricView] = useState<MetricView>("general");
  const [selectedOrg, setSelectedOrg] = useState<string>("Todas las Organizaciones");
  const [organizations, setOrganizations] = useState<string[]>([]);
  const [orgData, setOrgData] = useState<any[]>([]);
  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [expandedWorkspaces, setExpandedWorkspaces] = useState<Set<string>>(new Set());
  const [viewingTask, setViewingTask] = useState<Task | null>(null);

  // Estados para reportes PDF
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState<ReportType>("date");
  const [reportStartDate, setReportStartDate] = useState("");
  const [reportEndDate, setReportEndDate] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedSpace, setSelectedSpace] = useState("");

  // Fetch organizations
  useEffect(() => {
    const fetchOrgs = async () => {
      try {
        const res = await fetch("/api/organizations");
        if (res.ok) {
          const data = await res.json();
          setOrgData(data);
          const orgNames = data.map((org: any) => org.name);
          setOrganizations(["Todas las Organizaciones", ...orgNames]);
        }
      } catch (error) {
        console.error("Error fetching organizations:", error);
      }
    };
    fetchOrgs();
  }, []);

  // Función auxiliar para convertir URL de imagen a Base64
  const getBase64ImageFromUrl = async (imageUrl: string): Promise<string | null> => {
    try {
      const res = await fetch(imageUrl);
      if (!res.ok) return null;
      const blob = await res.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      console.error("Error convirtiendo imagen a base64:", error);
      return null;
    }
  };

  // Fetch tasks with assignee info
  useEffect(() => {
    const fetchAllTasks = async () => {
      if (!session?.user?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const resWorkspace = await fetch(`/api/user/workspace?userId=${session.user.id}`);
        if (!resWorkspace.ok) {
          setLoading(false);
          return;
        }
        const wsData = await resWorkspace.json();

        let currentWorkspaceId: string | null = null;
        if (wsData.workspaceId) {
          currentWorkspaceId = wsData.workspaceId;
        } else if (wsData.memberships && wsData.memberships.length > 0) {
          const activeWs = localStorage.getItem("activeWorkspaceId");
          const isValid = wsData.memberships.some((m: any) => m.workspaceId === activeWs);
          currentWorkspaceId = isValid ? activeWs : wsData.memberships[0].workspaceId;
        }

        if (!currentWorkspaceId) {
          setLoading(false);
          return;
        }

        setWorkspaceId(currentWorkspaceId);

        const resHierarchy = await fetch(`/api/workspace/${currentWorkspaceId}/hierarchy`);
        if (!resHierarchy.ok) {
          setLoading(false);
          return;
        }
        const hierarchy = await resHierarchy.json();

        if (!Array.isArray(hierarchy) || hierarchy.length === 0) {
          setTasks([]);
          setLoading(false);
          return;
        }

        const listRequests: { id: string; name: string; spaceName: string; workspaceId: string; workspaceName: string }[] = [];
        const seenListIds = new Set<string>();

        for (const space of hierarchy) {
          if (space.folders && Array.isArray(space.folders)) {
            for (const folder of space.folders) {
              if (folder.lists && Array.isArray(folder.lists)) {
                for (const list of folder.lists) {
                  if (!seenListIds.has(list.id)) {
                    seenListIds.add(list.id);
                    listRequests.push({
                      id: list.id,
                      name: list.name,
                      spaceName: space.name,
                      workspaceId: space.workspaceId || currentWorkspaceId,
                      workspaceName: space.workspaceName || "Mi Workspace"
                    });
                  }
                }
              }
            }
          }
          if (space.lists && Array.isArray(space.lists)) {
            for (const list of space.lists) {
              if (!seenListIds.has(list.id)) {
                seenListIds.add(list.id);
                listRequests.push({
                  id: list.id,
                  name: list.name,
                  spaceName: space.name,
                  workspaceId: space.workspaceId || currentWorkspaceId,
                  workspaceName: space.workspaceName || "Mi Workspace"
                });
              }
            }
          }
        }

        const tasksArrays = await Promise.all(
          listRequests.map(async (list) => {
            try {
              const resTasks = await fetch(`/api/tasks?listId=${list.id}`);
              if (resTasks.ok) {
                const listTasks = await resTasks.json();
                return listTasks.map((t: any) => ({
                  ...t,
                  priority: Number(t.priority) || 1,
                  listName: list.name,
                  spaceName: list.spaceName,
                  workspaceId: list.workspaceId,
                  workspaceName: list.workspaceName,
                  assigneeId: t.assigneeId || t.assignee?.id,
                  assigneeName: t.assigneeName || t.assignee?.name || "Sin asignar",
                  assigneeEmail: t.assignee?.email,
                  assigneeImage: t.assignee?.image,
                  renewalCount: t.renewalCount || 0,
                  lastRenewedAt: t.lastRenewedAt
                }));
              }
              return [];
            } catch (error) {
              return [];
            }
          })
        );

        const allTasksFlat = tasksArrays.flat();
        const taskMap = new Map<string, Task>();
        allTasksFlat.forEach((task) => {
          if (!taskMap.has(task.id)) {
            taskMap.set(task.id, task);
          }
        });
        const uniqueTasks = Array.from(taskMap.values());
        setTasks(uniqueTasks);
      } catch (error) {
        console.error("Error al cargar datos del dashboard:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAllTasks();
  }, [session?.user?.id]);

  const handleRenewTask = async (taskId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm("¿Deseas reiniciar el tiempo de esta tarea? Se añadirán 48 horas a la fecha de vencimiento.")) return;

    try {
      const res = await fetch("/api/tasks/renew", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId })
      });

      if (res.ok) {
        const updatedTask = await res.json();
        setTasks(prev => prev.map(t =>
          t.id === taskId ? {
            ...t,
            renewalCount: (t.renewalCount || 0) + 1,
            lastRenewedAt: new Date().toISOString(),
            dueDate: updatedTask.dueDate
          } : t
        ));
        alert("✅ Tiempo de la tarea reiniciado exitosamente (+48 horas)");
      } else {
        const err = await res.json();
        alert(`❌ Error: ${err.error}`);
      }
    } catch (error) {
      alert("Error de conexión al renovar la tarea");
    }
  };

  const filteredTasks = useMemo(() => {
    if (timeFilter === "TODO") return tasks;
    const now = new Date();
    return tasks.filter((task) => {
      const taskDate = new Date(task.createdAt || 0);
      if (isNaN(taskDate.getTime())) return false;
      if (timeFilter === "DÍA") return taskDate.toDateString() === now.toDateString();
      if (timeFilter === "SEMANA") {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return taskDate >= weekAgo;
      }
      if (timeFilter === "MES") {
        return taskDate.getMonth() === now.getMonth() && taskDate.getFullYear() === now.getFullYear();
      }
      if (timeFilter === "AÑO") return taskDate.getFullYear() === now.getFullYear();
      return true;
    });
  }, [tasks, timeFilter]);

  const totalTasks = filteredTasks.length;
  const completedTasks = filteredTasks.filter(t => t.status === "done" || t.status === "completed").length;
  const inProgressTasks = filteredTasks.filter(t => t.status === "in_progress" || t.status === "doing").length;
  const pendingTasks = filteredTasks.filter(t => t.status === "todo" || !t.status).length;
  const urgentCount = filteredTasks.filter(t => t.priority === 4).length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const workspaceMetrics = useMemo(() => {
    const wsMap = new Map<string, WorkspaceMetrics>();
    filteredTasks.forEach(task => {
      const wsId = task.workspaceId || "unknown";
      const wsName = task.workspaceName || "Workspace";
      if (!wsMap.has(wsId)) {
        wsMap.set(wsId, { id: wsId, name: wsName, totalTasks: 0, completed: 0, inProgress: 0, pending: 0, completionRate: 0 });
      }
      const ws = wsMap.get(wsId)!;
      ws.totalTasks++;
      if (task.status === "done" || task.status === "completed") ws.completed++;
      else if (task.status === "in_progress" || task.status === "doing") ws.inProgress++;
      else ws.pending++;
    });
    wsMap.forEach(ws => {
      ws.completionRate = ws.totalTasks > 0 ? Math.round((ws.completed / ws.totalTasks) * 100) : 0;
    });
    return Array.from(wsMap.values()).sort((a, b) => b.totalTasks - a.totalTasks);
  }, [filteredTasks]);

  const userMetrics = useMemo(() => {
    const userMap = new Map<string, UserMetrics>();
    filteredTasks.forEach(task => {
      const userId = task.assigneeId || "unassigned";
      const userName = task.assigneeName || "Sin asignar";
      const userEmail = task.assigneeEmail || "";
      const userImage = task.assigneeImage;
      if (!userMap.has(userId)) {
        userMap.set(userId, { id: userId, name: userName, email: userEmail, image: userImage, tasks: [], totalTasks: 0, completed: 0, inProgress: 0, pending: 0, completionRate: 0 });
      }
      const user = userMap.get(userId)!;
      user.tasks.push(task);
      user.totalTasks++;
      if (task.status === "done" || task.status === "completed") user.completed++;
      else if (task.status === "in_progress" || task.status === "doing") user.inProgress++;
      else user.pending++;
    });
    userMap.forEach(user => {
      user.completionRate = user.totalTasks > 0 ? Math.round((user.completed / user.totalTasks) * 100) : 0;
    });
    return Array.from(userMap.values()).sort((a, b) => b.totalTasks - a.totalTasks);
  }, [filteredTasks]);

  const priorityStats = useMemo(() => {
    const stats = { urgente: 0, alta: 0, media: 0, baja: 0 };
    filteredTasks.forEach((task) => {
      const p = task.priority || 0;
      if (p >= 4) stats.urgente++;
      else if (p === 3) stats.alta++;
      else if (p === 2) stats.media++;
      else stats.baja++;
    });
    return stats;
  }, [filteredTasks]);

  const upcomingDeadlines = useMemo(() => {
    const now = new Date();
    return [...filteredTasks]
      .filter(t => t.dueDate && new Date(t.dueDate) > now && t.status !== "done" && t.status !== "completed")
      .sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())
      .slice(0, 5);
  }, [filteredTasks]);

  const recentActivity = useMemo(() => {
    return [...filteredTasks]
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 10);
  }, [filteredTasks]);

  const getPercent = (count: number) => totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0;
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "Sin fecha";
    return new Date(dateStr).toLocaleDateString('es-ES', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  };

  const getPriorityConfig = (priority: number) => {
    const configs: Record<number, { label: string; pillStyle: string }> = {
      1: { label: "Baja", pillStyle: "text-slate-400 bg-slate-800/40 border-slate-700/40" },
      2: { label: "Media", pillStyle: "text-cyan-300 bg-cyan-500/10 border-cyan-500/20" },
      3: { label: "Alta", pillStyle: "text-amber-300 bg-amber-500/10 border-amber-500/20" },
      4: { label: "Urgente", pillStyle: "text-rose-300 bg-rose-500/15 border-rose-500/30" },
    };
    return configs[priority] || configs[1];
  };

  const toggleWorkspaceExpand = (wsId: string) => {
    setExpandedWorkspaces(prev => {
      const next = new Set(prev);
      if (next.has(wsId)) next.delete(wsId);
      else next.add(wsId);
      return next;
    });
  };

  const calculateAvgTime = (tasks: Task[]): string => {
    const completed = tasks.filter(t =>
      (t.status === "done" || t.status === "completed") && t.createdAt && t.completedAt
    );
    if (completed.length === 0) return "N/A";

    let totalMinutes = 0;
    completed.forEach(task => {
      const created = new Date(task.createdAt!).getTime();
      const completedTime = new Date(task.completedAt!).getTime();
      totalMinutes += Math.round((completedTime - created) / (1000 * 60));
    });

    const avg = Math.round(totalMinutes / completed.length);
    const hours = Math.floor(avg / 60);
    const minutes = avg % 60;
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const limpiarTexto = (texto: string | null | undefined): string => {
    if (!texto) return "";
    return texto
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s.,@()-]/gi, "");
  };

  // Generación de reportes PDF con soporte para Logo
  const generatePDFReport = async (type: ReportType, filteredData: Task[], filters?: any, logoBase64?: string | null) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 35, "F");

    let titleX = 14;
    if (logoBase64) {
      try {
        const imageType = logoBase64.startsWith('data:image/png') ? 'PNG' : 'JPEG';
        doc.addImage(logoBase64, imageType, 14, 8, 25, 15);
        titleX = 45;
      } catch (e) {
        console.error("Error agregando logo al PDF:", e);
      }
    }

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Reporte de Tareas", titleX, 16);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Generado: ${new Date().toLocaleString('es-ES')}`, titleX, 24);

    const titles: Record<string, string> = {
      date: "Reporte por Rango de Fechas",
      user: "Reporte por Usuario",
      space: "Reporte por Espacio",
      overdue: "Tareas Vencidas",
      completed: "Tareas Completadas",
      pending: "Tareas Por Hacer"
    };

    doc.setTextColor(6, 182, 212);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(limpiarTexto(titles[type] || "Reporte"), titleX, 32);

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    let filterY = 45;

    if (filters?.startDate && filters?.endDate) {
      doc.text(`Período: ${formatDate(filters.startDate)} - ${formatDate(filters.endDate)}`, 14, filterY);
      filterY += 6;
    }
    if (filters?.userName) {
      doc.text(`Usuario: ${limpiarTexto(filters.userName)}`, 14, filterY);
      filterY += 6;
    }
    if (filters?.spaceName) {
      doc.text(`Espacio: ${limpiarTexto(filters.spaceName)}`, 14, filterY);
      filterY += 6;
    }

    doc.text(`Total de tareas: ${filteredData.length}`, 14, filterY);
    filterY += 10;

    if (type === "user") {
      const userMap = new Map<string, Task[]>();
      filteredData.forEach(task => {
        const key = task.assigneeName || "Sin asignar";
        if (!userMap.has(key)) userMap.set(key, []);
        userMap.get(key)!.push(task);
      });

      const userStats = Array.from(userMap.entries()).map(([name, userTasks]) => {
        const pending = userTasks.filter(t => t.status === "todo" || !t.status).length;
        const inProgress = userTasks.filter(t => t.status === "in_progress" || t.status === "doing").length;
        const completed = userTasks.filter(t => t.status === "done" || t.status === "completed").length;
        const renewed = userTasks.filter(t => (t.renewalCount || 0) > 0).length;
        const avgTime = calculateAvgTime(userTasks);

        return {
          name,
          email: userTasks[0]?.assigneeEmail || "",
          total: userTasks.length,
          pending,
          inProgress,
          completed,
          renewed,
          avgTime
        };
      }).sort((a, b) => b.total - a.total);

      autoTable(doc, {
        startY: filterY,
        head: [["Usuario", "Email", "Total", "Por Hacer", "En Progreso", "Completadas", "Renovadas", "Tiempo Prom."]],
        body: userStats.map(u => [
          limpiarTexto(u.name),
          limpiarTexto(u.email),
          u.total.toString(),
          u.pending.toString(),
          u.inProgress.toString(),
          u.completed.toString(),
          u.renewed.toString(),
          u.avgTime
        ]),
        theme: "striped",
        headStyles: { fillColor: [6, 182, 212], textColor: 255, fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [248, 250, 252] }
      });

      let currentY = (doc as any).lastAutoTable.finalY + 15;

      userStats.forEach(user => {
        if (currentY > 250) {
          doc.addPage();
          currentY = 20;
        }

        doc.setTextColor(6, 182, 212);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(`[+] ${limpiarTexto(user.name)}`, 14, currentY);
        currentY += 6;

        const userTasks = filteredData.filter(t => t.assigneeName === user.name);

        autoTable(doc, {
          startY: currentY,
          head: [["Tarea", "Estado", "Prioridad", "Vencimiento", "Renovaciones"]],
          body: userTasks.map(t => [
            limpiarTexto(t.title),
            t.status === "done" || t.status === "completed" ? "Completada" :
              t.status === "in_progress" || t.status === "doing" ? "En Progreso" : "Por Hacer",
            getPriorityConfig(t.priority).label,
            formatDate(t.dueDate),
            (t.renewalCount || 0).toString()
          ]),
          theme: "grid",
          headStyles: { fillColor: [100, 116, 139], fontSize: 8 },
          bodyStyles: { fontSize: 7 }
        });

        currentY = (doc as any).lastAutoTable.finalY + 10;
      });
    } else if (type === "overdue") {
      const now = new Date();
      const overdueTasks = filteredData.filter(t =>
        t.dueDate && new Date(t.dueDate) < now &&
        t.status !== "done" && t.status !== "completed"
      ).sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());

      if (overdueTasks.length === 0) {
        doc.setTextColor(16, 185, 129);
        doc.setFontSize(12);
        doc.text("No hay tareas vencidas", 14, filterY + 10);
      } else {
        doc.setTextColor(239, 68, 68);
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.text(`Total de tareas vencidas: ${overdueTasks.length}`, 14, filterY + 5);

        autoTable(doc, {
          startY: filterY + 10,
          head: [["Tarea", "Asignado", "Vencimiento", "Días Vencida", "Renovaciones", "Prioridad", "Estado"]],
          body: overdueTasks.map(t => {
            const daysOverdue = Math.floor((now.getTime() - new Date(t.dueDate!).getTime()) / (1000 * 60 * 60 * 24));
            return [
              limpiarTexto(t.title),
              limpiarTexto(t.assigneeName || "Sin asignar"),
              formatDate(t.dueDate),
              `${daysOverdue} días`,
              (t.renewalCount || 0).toString(),
              getPriorityConfig(t.priority).label,
              t.status === "in_progress" || t.status === "doing" ? "En Progreso" : "Por Hacer"
            ];
          }),
          theme: "striped",
          headStyles: { fillColor: [239, 68, 68], textColor: 255, fontSize: 9 },
          bodyStyles: { fontSize: 8 },
          alternateRowStyles: { fillColor: [254, 242, 242] }
        });
      }
    } else {
      let displayTasks = filteredData;

      if (type === "completed") {
        displayTasks = filteredData.filter(t => t.status === "done" || t.status === "completed");
      } else if (type === "pending") {
        displayTasks = filteredData.filter(t => t.status === "todo" || !t.status);
      }

      autoTable(doc, {
        startY: filterY,
        head: [["Título", "Asignado", "Espacio", "Lista", "Estado", "Prioridad", "Vencimiento", "Renov."]],
        body: displayTasks.map(t => [
          limpiarTexto(t.title),
          limpiarTexto(t.assigneeName || "Sin asignar"),
          limpiarTexto(t.spaceName || "-"),
          limpiarTexto(t.listName || "-"),
          t.status === "done" || t.status === "completed" ? "Completada" :
            t.status === "in_progress" || t.status === "doing" ? "En Progreso" : "Por Hacer",
          getPriorityConfig(t.priority).label,
          formatDate(t.dueDate),
          (t.renewalCount || 0).toString()
        ]),
        theme: "striped",
        headStyles: { fillColor: [6, 182, 212], textColor: 255, fontSize: 8 },
        bodyStyles: { fontSize: 7 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { cellWidth: 40 },
          1: { cellWidth: 25 },
          2: { cellWidth: 25 },
          3: { cellWidth: 25 }
        }
      });
    }

    const pageCount = (doc as any).getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Página ${i} de ${pageCount} | Generado por Project SaaS`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: "center" }
      );
    }

    const fileName = `reporte-${type}-${new Date().toISOString().split('T')[0]}.pdf`;
    doc.save(fileName);
  };

  const handleGenerateReport = async () => {
    let filteredData = [...filteredTasks];
    const filters: any = {};

    if (selectedReportType === "date" && reportStartDate && reportEndDate) {
      const start = new Date(reportStartDate);
      const end = new Date(reportEndDate);
      end.setHours(23, 59, 59);

      filteredData = filteredTasks.filter(t => {
        const taskDate = new Date(t.createdAt || 0);
        return taskDate >= start && taskDate <= end;
      });

      filters.startDate = reportStartDate;
      filters.endDate = reportEndDate;
    }

    if (selectedReportType === "user" && selectedUser) {
      filteredData = filteredTasks.filter(t => t.assigneeName === selectedUser);
      filters.userName = selectedUser;
    }

    if (selectedReportType === "space" && selectedSpace) {
      filteredData = filteredTasks.filter(t => t.spaceName === selectedSpace);
      filters.spaceName = selectedSpace;
    }

    if (filteredData.length === 0) {
      alert("No hay tareas que coincidan con los filtros seleccionados");
      return;
    }

    let logoBase64: string | null = null;
    const currentOrg = selectedOrg === "Todas las Organizaciones"
      ? orgData[0]
      : orgData.find((o: any) => o.name === selectedOrg);

    if (currentOrg?.logo) {
      logoBase64 = await getBase64ImageFromUrl(currentOrg.logo);
    }

    await generatePDFReport(selectedReportType, filteredData, filters, logoBase64);
    setIsReportModalOpen(false);
  };

  const uniqueUsers = Array.from(new Set(tasks.map(t => t.assigneeName).filter(Boolean)));
  const uniqueSpaces = Array.from(new Set(tasks.map(t => t.spaceName).filter(Boolean)));

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-cyan-400 border-t-transparent mx-auto mb-3"></div>
          <p className="text-slate-400 font-light text-xs">Cargando métricas del dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full p-3 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto">
      {/* ✅ HEADER RESPONSIVO - Patrón iconos en móvil, texto en desktop */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Selector de organización - Solo icono en móvil */}
        <div className="relative">
          <button
            onClick={() => setIsOrgDropdownOpen(!isOrgDropdownOpen)}
            className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 bg-slate-900/60 border border-slate-800 rounded-xl text-xs font-medium text-white hover:bg-slate-800 transition-colors"
            title={selectedOrg}
          >
            <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 shrink-0" />
            <span className="hidden sm:inline truncate max-w-[150px]">{selectedOrg}</span>
            <span className="sm:hidden truncate max-w-[80px] text-[10px]">{selectedOrg.split(' ')[0]}</span>
            <ChevronDown className="w-3 h-3 text-slate-400 shrink-0 hidden sm:block" />
          </button>
          {isOrgDropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsOrgDropdownOpen(false)}></div>
              <div className="absolute top-full mt-2 left-0 w-64 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 py-2 max-h-64 overflow-y-auto">
                {organizations.map((org) => (
                  <button
                    key={org}
                    onClick={() => {
                      setSelectedOrg(org);
                      setIsOrgDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-xs hover:bg-slate-800 transition-colors ${selectedOrg === org ? "bg-cyan-500/10 text-cyan-400" : "text-white"}`}
                  >
                    {org}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Botones de vista - Solo iconos en móvil */}
        <div className="flex items-center gap-1 bg-slate-900/60 border border-slate-800 rounded-xl p-1">
          {[
            { id: "general", label: "General", icon: BarChart3 },
            { id: "workspace", label: "Espacios", icon: FolderKanban },
            { id: "user", label: "Usuarios", icon: User },
            { id: "task", label: "Tareas", icon: Layers }
          ].map((view) => (
            <button
              key={view.id}
              onClick={() => setMetricView(view.id as MetricView)}
              className={`flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${metricView === view.id ? "bg-cyan-500 text-white" : "text-slate-400 hover:text-white"}`}
              title={view.label}
            >
              <view.icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">{view.label}</span>
            </button>
          ))}
        </div>

        {/* Filtros de tiempo - Abreviaturas en móvil */}
        <div className="flex items-center gap-1 bg-slate-900/60 border border-slate-800 rounded-xl p-1">
          {([
            { key: "DÍA", short: "D" },
            { key: "SEMANA", short: "S" },
            { key: "MES", short: "M" },
            { key: "AÑO", short: "A" },
            { key: "TODO", short: "T" }
          ] as { key: TimeFilter; short: string }[]).map((filter) => (
            <button
              key={filter.key}
              onClick={() => setTimeFilter(filter.key)}
              className={`px-2 sm:px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${timeFilter === filter.key ? "bg-indigo-500 text-white" : "text-slate-400 hover:text-white"}`}
              title={filter.key}
            >
              <span className="hidden sm:inline">{filter.key}</span>
              <span className="sm:hidden">{filter.short}</span>
            </button>
          ))}
        </div>

        {/* Botón de reporte - Solo icono en móvil */}
        <button
          onClick={() => setIsReportModalOpen(true)}
          className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-cyan-500/25"
          title="Generar Reporte PDF"
        >
          <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="hidden sm:inline">Generar Reporte PDF</span>
        </button>
      </div>

      {/* Título del Dashboard */}
      <div className="flex items-center justify-between px-3 sm:px-5 py-3 sm:py-4 rounded-2xl border border-slate-800/80 bg-slate-900/40 backdrop-blur-xl shadow-xl">
        <div className="flex items-center gap-2 sm:gap-3.5 min-w-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
            <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight truncate">
              Panel de Control - {metricView === "general" ? "General" : metricView === "workspace" ? "Espacios" : metricView === "user" ? "Usuarios" : "Tareas"}
            </h1>
            <p className="text-[10px] sm:text-xs text-slate-400 hidden sm:block">Resumen y métricas de desempeño</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg shrink-0">
          <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400 animate-pulse"></div>
          <span className="text-[10px] sm:text-xs font-semibold text-emerald-400">En Vivo</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between shadow-xl backdrop-blur-xl">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Tareas</span>
            <span className="text-xl sm:text-2xl font-black text-white tracking-tight">{totalTasks}</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
            <Layers className="w-4 h-4" />
          </div>
        </div>
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between shadow-xl backdrop-blur-xl">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Completadas</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-emerald-400 tracking-tight">{completedTasks}</span>
              <span className="text-[10px] sm:text-xs font-bold text-emerald-500">({completionRate}%)</span>
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between shadow-xl backdrop-blur-xl">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">En Progreso</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl sm:text-2xl font-black text-cyan-400 tracking-tight">{inProgressTasks}</span>
              <span className="text-[10px] sm:text-[11px] text-slate-400">({pendingTasks} pend.)</span>
            </div>
          </div>
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
            <Activity className="w-4 h-4" />
          </div>
        </div>
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between shadow-xl backdrop-blur-xl">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Urgentes</span>
            <span className="text-xl sm:text-2xl font-black text-rose-400 tracking-tight">{urgentCount}</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
            <Flame className="w-4 h-4" />
          </div>
        </div>
      </div>

      {metricView === "general" && (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
            <div className="xl:col-span-5 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 sm:p-5 flex flex-col justify-between backdrop-blur-xl shadow-xl">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-bold text-white tracking-tight flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-cyan-400" /> Carga por Prioridad
                </h2>
                <span className="text-[11px] font-bold text-slate-400">{totalTasks} tareas</span>
              </div>
              <div className="grid grid-cols-4 gap-2 sm:gap-3 items-end h-32 sm:h-36 pt-4 pb-2 border-b border-slate-800">
                {[
                  { label: "Urgente", count: priorityStats.urgente, pct: getPercent(priorityStats.urgente), color: "bg-rose-500" },
                  { label: "Alta", count: priorityStats.alta, pct: getPercent(priorityStats.alta), color: "bg-amber-500" },
                  { label: "Media", count: priorityStats.media, pct: getPercent(priorityStats.media), color: "bg-cyan-500" },
                  { label: "Baja", count: priorityStats.baja, pct: getPercent(priorityStats.baja), color: "bg-slate-500" },
                ].map((bar, idx) => (
                  <div key={idx} className="flex flex-col items-center h-full justify-end">
                    <span className="text-[10px] sm:text-xs font-bold text-white">{bar.count}</span>
                    <div className="w-full max-w-[32px] bg-slate-950/80 rounded-xl h-full flex items-end p-0.5 border border-slate-800 relative overflow-hidden">
                      <div
                        className={`w-full ${bar.color} rounded-lg transition-all duration-500 shadow-sm relative`}
                        style={{ height: `${Math.max(bar.pct, 8)}%` }}
                      />
                    </div>
                    <span className="mt-1 text-[9px] sm:text-[10px] font-bold text-slate-400 text-center leading-tight truncate w-full">{bar.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="xl:col-span-3 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-between backdrop-blur-xl shadow-xl">
              <div className="w-full text-left">
                <h3 className="text-xs font-bold text-white tracking-tight flex items-center gap-2">
                  <PieIcon className="w-4 h-4 text-emerald-400" /> Tasa de Éxito
                </h3>
              </div>
              <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center my-2">
                <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="38" className="stroke-slate-950" strokeWidth="10" fill="transparent" />
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
                  <span className="text-xl sm:text-2xl font-black text-white">{completionRate}%</span>
                  <span className="text-[8px] sm:text-[9px] font-bold text-emerald-400 uppercase">Resueltas</span>
                </div>
              </div>
              <span className="text-[10px] sm:text-[11px] font-medium text-slate-300 text-center">{completedTasks} de {totalTasks}</span>
            </div>
            <div className="xl:col-span-4 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 sm:p-5 flex flex-col justify-between backdrop-blur-xl shadow-xl">
              <h3 className="text-xs font-bold text-white tracking-tight flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-cyan-400" /> Próximos Vencimientos
              </h3>
              <div className="space-y-2">
                {upcomingDeadlines.length > 0 ? upcomingDeadlines.map((task) => {
                  const p = getPriorityConfig(task.priority);
                  return (
                    <div key={task.id} className="flex items-center justify-between p-2 sm:p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/80 gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-200 truncate">{task.title}</p>
                        <p className="text-[10px] text-slate-400 truncate">{task.assigneeName}</p>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 shrink-0">
                        <span className={`text-[9px] sm:text-[10px] font-medium px-2 py-0.5 rounded-lg border ${p.pillStyle}`}>{p.label}</span>
                        <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium whitespace-nowrap">{formatDate(task.dueDate)}</span>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="text-center py-6 text-slate-500 text-xs flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> No hay entregas pendientes
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 sm:p-5 backdrop-blur-xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-white tracking-tight flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" /> ÚLTIMAS TAREAS REGISTRADAS
              </h3>
              <span className="text-[11px] text-slate-400 hidden sm:inline">Actividad del espacio de trabajo</span>
            </div>
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left min-w-[700px]">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] sm:text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                    <th className="pb-2 px-2 sm:px-3">Tarea</th>
                    <th className="pb-2 px-2 sm:px-3">Asignado</th>
                    <th className="pb-2 px-2 sm:px-3">Lista</th>
                    <th className="pb-2 px-2 sm:px-3">Estado</th>
                    <th className="pb-2 px-2 sm:px-3">Prioridad</th>
                    <th className="pb-2 px-2 sm:px-3">Vencimiento</th>
                    <th className="pb-2 px-2 sm:px-3">Renov.</th>
                    <th className="pb-2 px-2 sm:px-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {recentActivity.length > 0 ? recentActivity.map((task) => {
                    const p = getPriorityConfig(task.priority);
                    const isDone = task.status === "done" || task.status === "completed";
                    const isInProgress = task.status === "in_progress" || task.status === "doing";
                    const isExpired = task.dueDate && new Date(task.dueDate) < new Date() && !isDone;
                    return (
                      <tr key={task.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-2 sm:py-2.5 px-2 sm:px-3 text-[10px] sm:text-xs font-medium text-slate-200 truncate max-w-[150px] sm:max-w-[200px]">{task.title}</td>
                        <td className="py-2 sm:py-2.5 px-2 sm:px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-[9px] shrink-0">
                              {(task.assigneeName || "S")[0].toUpperCase()}
                            </div>
                            <span className="text-[10px] sm:text-xs text-slate-300 truncate max-w-[80px]">{task.assigneeName}</span>
                          </div>
                        </td>
                        <td className="py-2 sm:py-2.5 px-2 sm:px-3 text-[10px] sm:text-xs text-slate-400">{task.listName || "General"}</td>
                        <td className="py-2 sm:py-2.5 px-2 sm:px-3">
                          <span className={`text-[9px] sm:text-[10px] font-medium px-2 py-0.5 rounded-lg border whitespace-nowrap ${isDone ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" : isInProgress ? "text-cyan-300 bg-cyan-500/10 border-cyan-500/20" : "text-slate-400 bg-slate-800/40 border-slate-700/40"}`}>
                            {isDone ? "Completada" : isInProgress ? "En Progreso" : "Por Hacer"}
                          </span>
                        </td>
                        <td className="py-2 sm:py-2.5 px-2 sm:px-3">
                          <span className={`text-[9px] sm:text-[10px] font-medium px-2 py-0.5 rounded-lg border whitespace-nowrap ${p.pillStyle}`}>{p.label}</span>
                        </td>
                        <td className="py-2 sm:py-2.5 px-2 sm:px-3">
                          <div className="flex flex-col gap-1">
                            <span className={`text-[9px] sm:text-[10px] font-medium whitespace-nowrap ${isExpired ? "text-rose-400 font-bold" : "text-slate-400"}`}>
                              {task.dueDate ? formatDate(task.dueDate) : "Sin fecha"}
                            </span>
                            {task.renewalCount && task.renewalCount > 0 && (
                              <span className="inline-flex items-center gap-1 w-fit px-1.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[8px] sm:text-[9px] font-bold">
                                <RotateCcw className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
                                {task.renewalCount}x
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 sm:py-2.5 px-2 sm:px-3 text-right">
                          {isExpired ? (
                            <button
                              onClick={(e) => handleRenewTask(task.id, e)}
                              className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 sm:py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-[9px] sm:text-[10px] font-semibold transition-all whitespace-nowrap"
                              title="Reiniciar tiempo (+48 horas)"
                            >
                              <RotateCcw className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                              <span className="hidden sm:inline">Reiniciar</span>
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-600">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-xs text-slate-500">Sin registros recientes</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {metricView === "workspace" && (
        <div className="space-y-4">
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 sm:p-5 backdrop-blur-xl shadow-xl">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <FolderKanban className="w-4 h-4 text-cyan-400" /> Métricas por Espacio de Trabajo
            </h3>
            {workspaceMetrics.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                {workspaceMetrics.map((ws) => {
                  const isExpanded = expandedWorkspaces.has(ws.id);
                  const wsTasks = filteredTasks.filter(t => t.workspaceId === ws.id);
                  const pendingWs = wsTasks.filter(t => t.status === "todo" || !t.status);
                  const inProgressWs = wsTasks.filter(t => t.status === "in_progress" || t.status === "doing");
                  const completedWs = wsTasks.filter(t => t.status === "done" || t.status === "completed");
                  return (
                    <div key={ws.id} className="border border-slate-800/60 rounded-xl overflow-hidden bg-slate-950/40">
                      <div
                        className="flex items-center justify-between p-4 hover:bg-slate-950/60 cursor-pointer transition-colors gap-3"
                        onClick={() => toggleWorkspaceExpand(ws.id)}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 flex items-center justify-center shrink-0">
                            <FolderKanban className="w-5 h-5 text-cyan-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{ws.name}</p>
                            <p className="text-[10px] text-slate-400">{ws.totalTasks} tareas totales</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right">
                            <p className="text-xs font-bold text-cyan-400">{ws.completionRate}%</p>
                            <p className="text-[10px] text-slate-500">completado</p>
                          </div>
                          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </div>
                      </div>
                      <div className="px-4 pb-3">
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-500"
                            style={{ width: `${ws.completionRate}%` }}
                          />
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="border-t border-slate-800/60 bg-slate-900/20 p-4 space-y-3">
                          <div className="grid grid-cols-3 gap-2">
                            <div className="bg-slate-950/60 rounded-lg p-2 text-center">
                              <p className="text-base sm:text-lg font-bold text-emerald-400">{completedWs.length}</p>
                              <p className="text-[10px] text-slate-400">Completadas</p>
                            </div>
                            <div className="bg-slate-950/60 rounded-lg p-2 text-center">
                              <p className="text-base sm:text-lg font-bold text-cyan-400">{inProgressWs.length}</p>
                              <p className="text-[10px] text-slate-400">En progreso</p>
                            </div>
                            <div className="bg-slate-950/60 rounded-lg p-2 text-center">
                              <p className="text-base sm:text-lg font-bold text-slate-400">{pendingWs.length}</p>
                              <p className="text-[10px] text-slate-400">Pendientes</p>
                            </div>
                          </div>
                          <div className="space-y-2 max-h-64 overflow-y-auto">
                            {wsTasks.map(task => {
                              const p = getPriorityConfig(task.priority);
                              const isDone = task.status === "done" || task.status === "completed";
                              const isInProgress = task.status === "in_progress" || task.status === "doing";
                              const isExpired = task.dueDate && new Date(task.dueDate) < new Date() && !isDone;
                              return (
                                <div key={task.id} className="flex items-center justify-between p-2 sm:p-2.5 bg-slate-950/40 rounded-lg border border-slate-800/60 hover:border-cyan-500/30 transition-colors gap-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-white truncate">{task.title}</p>
                                    <p className="text-[10px] text-slate-400 truncate">{task.listName} • {task.spaceName}</p>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className={`text-[9px] sm:text-[10px] font-medium px-2 py-0.5 rounded-lg border whitespace-nowrap ${isDone ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" : isInProgress ? "text-cyan-300 bg-cyan-500/10 border-cyan-500/20" : "text-slate-400 bg-slate-800/40 border-slate-700/40"}`}>
                                      {isDone ? "✓" : isInProgress ? "" : "○"}
                                    </span>
                                    <span className={`text-[9px] sm:text-[10px] font-medium px-2 py-0.5 rounded-lg border whitespace-nowrap ${p.pillStyle}`}>
                                      {p.label}
                                    </span>
                                    {task.renewalCount && task.renewalCount > 0 && (
                                      <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[8px] font-bold">
                                        <RotateCcw className="w-2 h-2" />
                                        {task.renewalCount}
                                      </span>
                                    )}
                                    {isExpired && (
                                      <button
                                        onClick={(e) => handleRenewTask(task.id, e)}
                                        className="p-1 text-amber-400 hover:bg-amber-500/10 rounded transition-colors"
                                        title="Reiniciar tiempo"
                                      >
                                        <RotateCcw className="w-3 h-3" />
                                      </button>
                                    )}
                                    <button
                                      onClick={() => setViewingTask(task)}
                                      className="p-1 text-cyan-400 hover:bg-cyan-500/10 rounded transition-colors"
                                    >
                                      <Eye className="w-3 h-3" />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                <FolderKanban className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No hay datos de espacios de trabajo disponibles</p>
              </div>
            )}
          </div>
        </div>
      )}

      {metricView === "user" && (
        <div className="space-y-4">
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 sm:p-5 backdrop-blur-xl shadow-xl">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-cyan-400" /> Métricas por Usuario
            </h3>
            {userMetrics.length > 0 ? (
              <div className="space-y-3">
                {userMetrics.map((user) => {
                  const isExpanded = expandedWorkspaces.has(user.id);
                  const userTasks = user.tasks;
                  const pendingTasks = userTasks.filter(t => t.status === "todo" || !t.status);
                  const inProgressTasks = userTasks.filter(t => t.status === "in_progress" || t.status === "doing");
                  const completedTasks = userTasks.filter(t => t.status === "done" || t.status === "completed");
                  return (
                    <div key={user.id} className="border border-slate-800/60 rounded-xl overflow-hidden bg-slate-950/40">
                      <div
                        className="flex flex-col xl:flex-row items-start xl:items-center justify-between p-4 hover:bg-slate-950/60 cursor-pointer transition-colors gap-3"
                        onClick={() => toggleWorkspaceExpand(user.id)}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                            {(user.name || "S")[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white truncate">{user.name}</p>
                            <p className="text-[10px] text-slate-400 truncate">{user.email || "Sin correo"}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 sm:gap-4 w-full xl:w-auto justify-between xl:justify-end">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-slate-400">Total: <span className="text-white font-semibold">{user.totalTasks}</span></span>
                            <span className="text-emerald-400">✓ {user.completed}</span>
                            <span className="text-cyan-400">⟳ {user.inProgress}</span>
                            <span className="text-slate-400">○ {user.pending}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-16 sm:w-20 h-2 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500"
                                style={{ width: `${user.completionRate}%` }}
                              />
                            </div>
                            <span className="text-xs font-bold text-white">{user.completionRate}%</span>
                          </div>
                          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="border-t border-slate-800/60 bg-slate-900/20 p-4 space-y-3">
                          {pendingTasks.length > 0 && (
                            <div>
                              <h4 className="text-xs font-bold text-slate-400 mb-2 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                                Por Hacer ({pendingTasks.length})
                              </h4>
                              <div className="space-y-2">
                                {pendingTasks.map(task => (
                                  <div key={task.id} className="flex items-center justify-between p-2 sm:p-2.5 bg-slate-950/40 rounded-lg border border-slate-800/60 gap-2">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium text-white truncate">{task.title}</p>
                                      <p className="text-[10px] text-slate-400 truncate">{task.listName} • {task.spaceName}</p>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <span className={`text-[9px] sm:text-[10px] font-medium px-2 py-0.5 rounded-lg border whitespace-nowrap ${getPriorityConfig(task.priority).pillStyle}`}>
                                        {getPriorityConfig(task.priority).label}
                                      </span>
                                      {task.renewalCount && task.renewalCount > 0 && (
                                        <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[8px] font-bold">
                                          <RotateCcw className="w-2 h-2" />
                                          {task.renewalCount}
                                        </span>
                                      )}
                                      <button
                                        onClick={() => setViewingTask(task)}
                                        className="p-1 text-cyan-400 hover:bg-cyan-500/10 rounded transition-colors"
                                      >
                                        <Eye className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {inProgressTasks.length > 0 && (
                            <div>
                              <h4 className="text-xs font-bold text-cyan-400 mb-2 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                                En Progreso ({inProgressTasks.length})
                              </h4>
                              <div className="space-y-2">
                                {inProgressTasks.map(task => (
                                  <div key={task.id} className="flex items-center justify-between p-2 sm:p-2.5 bg-slate-950/40 rounded-lg border border-cyan-500/20 gap-2">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium text-white truncate">{task.title}</p>
                                      <p className="text-[10px] text-slate-400 truncate">{task.listName} • {task.spaceName}</p>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <span className={`text-[9px] sm:text-[10px] font-medium px-2 py-0.5 rounded-lg border whitespace-nowrap ${getPriorityConfig(task.priority).pillStyle}`}>
                                        {getPriorityConfig(task.priority).label}
                                      </span>
                                      {task.renewalCount && task.renewalCount > 0 && (
                                        <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[8px] font-bold">
                                          <RotateCcw className="w-2 h-2" />
                                          {task.renewalCount}
                                        </span>
                                      )}
                                      <button
                                        onClick={() => setViewingTask(task)}
                                        className="p-1 text-cyan-400 hover:bg-cyan-500/10 rounded transition-colors"
                                      >
                                        <Eye className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {completedTasks.length > 0 && (
                            <div>
                              <h4 className="text-xs font-bold text-emerald-400 mb-2 flex items-center gap-2">
                                <CheckCircle2 className="w-3 h-3" />
                                Completadas ({completedTasks.length})
                              </h4>
                              <div className="space-y-2">
                                {completedTasks.map(task => (
                                  <div key={task.id} className="flex items-center justify-between p-2 sm:p-2.5 bg-slate-950/40 rounded-lg border border-emerald-500/20 opacity-75 gap-2">
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium text-slate-300 truncate line-through">{task.title}</p>
                                      <p className="text-[10px] text-slate-500 truncate">{task.listName} • {task.spaceName}</p>
                                    </div>
                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <span className="text-[9px] sm:text-[10px] text-emerald-400 font-medium whitespace-nowrap">✓ Completada</span>
                                      <button
                                        onClick={() => setViewingTask(task)}
                                        className="p-1 text-cyan-400 hover:bg-cyan-500/10 rounded transition-colors"
                                      >
                                        <Eye className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-500">
                <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No hay datos de usuarios disponibles</p>
              </div>
            )}
          </div>
        </div>
      )}

      {metricView === "task" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 sm:p-5 backdrop-blur-xl shadow-xl">
              <h3 className="text-xs font-bold text-white mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Por Estado
              </h3>
              <div className="space-y-3">
                {[
                  { label: "Completadas", count: completedTasks, color: "bg-emerald-500", pct: getPercent(completedTasks) },
                  { label: "En Progreso", count: inProgressTasks, color: "bg-cyan-500", pct: getPercent(inProgressTasks) },
                  { label: "Pendientes", count: pendingTasks, color: "bg-slate-500", pct: getPercent(pendingTasks) }
                ].map((item, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">{item.label}</span>
                      <span className="text-white font-semibold">{item.count} ({item.pct}%)</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full ${item.color} transition-all duration-500`} style={{ width: `${item.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 sm:p-5 backdrop-blur-xl shadow-xl">
              <h3 className="text-xs font-bold text-white mb-4 flex items-center gap-2">
                <Flame className="w-4 h-4 text-rose-400" /> Por Prioridad
              </h3>
              <div className="space-y-3">
                {[
                  { label: "Urgente", count: priorityStats.urgente, color: "bg-rose-500", pct: getPercent(priorityStats.urgente) },
                  { label: "Alta", count: priorityStats.alta, color: "bg-amber-500", pct: getPercent(priorityStats.alta) },
                  { label: "Media", count: priorityStats.media, color: "bg-cyan-500", pct: getPercent(priorityStats.media) },
                  { label: "Baja", count: priorityStats.baja, color: "bg-slate-500", pct: getPercent(priorityStats.baja) }
                ].map((item, idx) => (
                  <div key={idx}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300">{item.label}</span>
                      <span className="text-white font-semibold">{item.count} ({item.pct}%)</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div className={`h-full ${item.color} transition-all duration-500`} style={{ width: `${item.pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 sm:p-5 backdrop-blur-xl shadow-xl">
              <h3 className="text-xs font-bold text-white mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" /> Resumen
              </h3>
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-2xl sm:text-3xl font-black text-white">{totalTasks}</p>
                  <p className="text-xs text-slate-400 mt-1">Total de Tareas</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-950/40 rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-emerald-400">{completedTasks}</p>
                    <p className="text-[10px] text-slate-400">Completadas</p>
                  </div>
                  <div className="bg-slate-950/40 rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-rose-400">{urgentCount}</p>
                    <p className="text-[10px] text-slate-400">Urgentes</p>
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-800">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Tasa de completitud:</span>
                    <span className="text-white font-bold">{completionRate}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 sm:p-5 backdrop-blur-xl shadow-xl overflow-hidden">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" /> Todas las Tareas
            </h3>
            <div className="overflow-x-auto w-full">
              <table className="w-full min-w-[700px]">
                <thead>
                  <tr className="border-b border-slate-800 text-[10px] sm:text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                    <th className="pb-2 px-2 sm:px-3 text-left">Título</th>
                    <th className="pb-2 px-2 sm:px-3 text-left">Asignado</th>
                    <th className="pb-2 px-2 sm:px-3 text-left">Lista</th>
                    <th className="pb-2 px-2 sm:px-3 text-center">Estado</th>
                    <th className="pb-2 px-2 sm:px-3 text-center">Prioridad</th>
                    <th className="pb-2 px-2 sm:px-3 text-center">Vencimiento</th>
                    <th className="pb-2 px-2 sm:px-3 text-center">Renov.</th>
                    <th className="pb-2 px-2 sm:px-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredTasks.length > 0 ? filteredTasks.map((task) => {
                    const p = getPriorityConfig(task.priority);
                    const isDone = task.status === "done" || task.status === "completed";
                    const isInProgress = task.status === "in_progress" || task.status === "doing";
                    const isExpired = task.dueDate && new Date(task.dueDate) < new Date() && !isDone;
                    return (
                      <tr key={task.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-2 sm:py-2.5 px-2 sm:px-3 text-[10px] sm:text-xs font-medium text-white truncate max-w-[180px]">{task.title}</td>
                        <td className="py-2 sm:py-2.5 px-2 sm:px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-[9px] shrink-0">
                              {(task.assigneeName || "S")[0].toUpperCase()}
                            </div>
                            <span className="text-[10px] sm:text-xs text-slate-300 truncate max-w-[100px]">{task.assigneeName}</span>
                          </div>
                        </td>
                        <td className="py-2 sm:py-2.5 px-2 sm:px-3 text-[10px] sm:text-xs text-slate-400">{task.listName || "General"}</td>
                        <td className="py-2 sm:py-2.5 px-2 sm:px-3 text-center">
                          <span className={`text-[9px] sm:text-[10px] font-medium px-2 py-0.5 rounded-lg border whitespace-nowrap ${isDone ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" : isInProgress ? "text-cyan-300 bg-cyan-500/10 border-cyan-500/20" : "text-slate-400 bg-slate-800/40 border-slate-700/40"}`}>
                            {isDone ? "Completada" : isInProgress ? "En Progreso" : "Por Hacer"}
                          </span>
                        </td>
                        <td className="py-2 sm:py-2.5 px-2 sm:px-3 text-center">
                          <span className={`text-[9px] sm:text-[10px] font-medium px-2 py-0.5 rounded-lg border whitespace-nowrap ${p.pillStyle}`}>{p.label}</span>
                        </td>
                        <td className="py-2 sm:py-2.5 px-2 sm:px-3 text-center text-[10px] sm:text-xs text-slate-400 whitespace-nowrap">
                          {task.dueDate ? (
                            <span className={isExpired ? "text-rose-400 font-semibold" : ""}>
                              {formatDate(task.dueDate)}
                            </span>
                          ) : "Sin fecha"}
                        </td>
                        <td className="py-2 sm:py-2.5 px-2 sm:px-3 text-center">
                          {task.renewalCount && task.renewalCount > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[9px] sm:text-[10px] font-bold whitespace-nowrap">
                              <RotateCcw className="w-2.5 h-2.5" />
                              {task.renewalCount}x
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-600">-</span>
                          )}
                        </td>
                        <td className="py-2 sm:py-2.5 px-2 sm:px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {isExpired && (
                              <button
                                onClick={(e) => handleRenewTask(task.id, e)}
                                className="p-1.5 text-amber-400 hover:bg-amber-500/10 rounded-lg transition-colors"
                                title="Reiniciar tiempo"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => setViewingTask(task)}
                              className="p-1.5 text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-colors"
                              title="Ver tarea"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-xs text-slate-500">No hay tareas registradas</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal para ver tarea */}
      {viewingTask && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 w-full max-w-lg sm:max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Eye className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
                Detalle de la Tarea
              </h3>
              <button onClick={() => setViewingTask(null)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Título</label>
                <p className="text-sm font-semibold text-white mt-1 break-words">{viewingTask.title}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Asignado a</label>
                  <div className="flex items-center gap-2 mt-1 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-[10px] shrink-0">
                      {(viewingTask.assigneeName || "S")[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-white truncate">{viewingTask.assigneeName}</p>
                      <p className="text-[10px] text-slate-400 truncate">{viewingTask.assigneeEmail}</p>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estado</label>
                  <p className="text-xs font-medium text-white mt-1 capitalize">{viewingTask.status.replace('_', ' ')}</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Prioridad</label>
                  <p className="text-xs font-medium text-white mt-1">{getPriorityConfig(viewingTask.priority).label}</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vencimiento</label>
                  <p className="text-xs text-slate-300 mt-1">
                    {viewingTask.dueDate ? formatDate(viewingTask.dueDate) : "Sin fecha"}
                  </p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Renovaciones</label>
                  <div className="flex items-center gap-2 mt-1">
                    {viewingTask.renewalCount && viewingTask.renewalCount > 0 ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold">
                        <RotateCcw className="w-3.5 h-3.5" />
                        {viewingTask.renewalCount} veces
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500">Sin renovaciones</span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lista</label>
                  <p className="text-xs font-medium text-white mt-1 truncate">{viewingTask.listName || "General"}</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Espacio</label>
                  <p className="text-xs font-medium text-white mt-1 truncate">{viewingTask.spaceName || "General"}</p>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800 mt-4">
              <button
                onClick={() => setViewingTask(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Reporte PDF */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 w-full max-w-lg sm:max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-400" />
                Generar Reporte PDF
              </h3>
              <button onClick={() => setIsReportModalOpen(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mb-4 sm:mb-6">
              <label className="block text-xs font-bold text-slate-300 mb-3 uppercase tracking-wider">
                Tipo de Reporte
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: "date", label: "Por Fechas", icon: Calendar, color: "cyan" },
                  { id: "user", label: "Por Usuario", icon: User, color: "purple" },
                  { id: "space", label: "Por Espacio", icon: FolderKanban, color: "indigo" },
                  { id: "overdue", label: "Vencidas", icon: AlertCircle, color: "rose" },
                  { id: "completed", label: "Completadas", icon: CheckCircle2, color: "emerald" },
                  { id: "pending", label: "Pendientes", icon: Clock, color: "amber" }
                ].map((type) => {
                  const Icon = type.icon;
                  const isActive = selectedReportType === type.id;
                  return (
                    <button
                      key={type.id}
                      onClick={() => setSelectedReportType(type.id as ReportType)}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border transition-all text-xs font-semibold ${isActive
                          ? `bg-cyan-500/20 border-cyan-500/50 text-cyan-300`
                          : "bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800"
                        }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{type.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-4 mb-4 sm:mb-6">
              {selectedReportType === "date" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Fecha de Inicio</label>
                    <input
                      type="date"
                      value={reportStartDate}
                      onChange={(e) => setReportStartDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Fecha de Fin</label>
                    <input
                      type="date"
                      value={reportEndDate}
                      onChange={(e) => setReportEndDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
                    />
                  </div>
                </div>
              )}
              {selectedReportType === "user" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Seleccionar Usuario</label>
                  <select
                    value={selectedUser}
                    onChange={(e) => setSelectedUser(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
                  >
                    <option value="">Todos los usuarios</option>
                    {uniqueUsers.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              )}
              {selectedReportType === "space" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Seleccionar Espacio</label>
                  <select
                    value={selectedSpace}
                    onChange={(e) => setSelectedSpace(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
                  >
                    <option value="">Todos los espacios</option>
                    {uniqueSpaces.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-slate-950/50 border border-slate-800 rounded-xl">
              <p className="text-xs text-slate-400 mb-2">
                <span className="text-cyan-400 font-bold">{tasks.length}</span> tareas disponibles
              </p>
            </div>
            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleGenerateReport}
                className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Generar PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}