import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Asegurar que autoTable se registre correctamente
if (typeof autoTable === "function") {
  (jsPDF as any).autoTable = autoTable;
}

interface Task {
  id: string;
  title: string;
  status: string;
  priority: number;
  dueDate: string | null;
  createdAt?: string;
  completedAt?: string;
  listName?: string;
  spaceName?: string;
  assigneeName?: string;
  assigneeEmail?: string;
  workspaceName?: string;
  renewalCount?: number;
  lastRenewedAt?: string | null;
}

interface UserStats {
  name: string;
  email: string;
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  renewed: number;
  avgCompletionTime: string;
}

const getPriorityLabel = (p: number) => {
  const labels: Record<number, string> = { 1: "Baja", 2: "Media", 3: "Alta", 4: "Urgente" };
  return labels[p] || "Media";
};

const getStatusLabel = (s: string) => {
  const labels: Record<string, string> = {
    todo: "Por Hacer",
    in_progress: "En Progreso",
    doing: "En Progreso",
    done: "Completada",
    completed: "Completada"
  };
  return labels[s] || s;
};

const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return "Sin fecha";
  return new Date(dateStr).toLocaleDateString('es-ES', { 
    year: 'numeric', month: 'short', day: 'numeric',
    timeZone: 'UTC'
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

// ✅ FUNCIÓN PRINCIPAL: Generar reporte completo
export const generateReport = (
  type: "date" | "user" | "space" | "overdue" | "completed" | "pending",
  tasks: Task[],
  filters?: {
    startDate?: string;
    endDate?: string;
    userName?: string;
    spaceName?: string;
  }
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 30, "F");
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Reporte de Tareas", 14, 15);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Generado: ${new Date().toLocaleString('es-ES')}`, 14, 23);
  
  // Título del tipo de reporte
  doc.setTextColor(6, 182, 212);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  
  const titles: Record<string, string> = {
    date: "Reporte por Rango de Fechas",
    user: "Reporte por Usuario",
    space: "Reporte por Espacio",
    overdue: "Tareas Vencidas",
    completed: "Tareas Completadas",
    pending: "Tareas Por Hacer"
  };
  
  doc.text(titles[type] || "Reporte", 14, 42);
  
  // Filtros aplicados
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  let filterY = 50;
  
  if (filters?.startDate && filters?.endDate) {
    doc.text(`Período: ${formatDate(filters.startDate)} - ${formatDate(filters.endDate)}`, 14, filterY);
    filterY += 6;
  }
  if (filters?.userName) {
    doc.text(`Usuario: ${filters.userName}`, 14, filterY);
    filterY += 6;
  }
  if (filters?.spaceName) {
    doc.text(`Espacio: ${filters.spaceName}`, 14, filterY);
    filterY += 6;
  }
  
  // Resumen de métricas
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Resumen", 14, filterY + 5);
  
  const totalTasks = tasks.length;
  const completed = tasks.filter(t => t.status === "done" || t.status === "completed").length;
  const inProgress = tasks.filter(t => t.status === "in_progress" || t.status === "doing").length;
  const pending = tasks.filter(t => t.status === "todo" || !t.status).length;
  const urgent = tasks.filter(t => t.priority === 4).length;
  const renewed = tasks.filter(t => (t.renewalCount || 0) > 0).length;
  
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Total: ${totalTasks} | Completadas: ${completed} | En Progreso: ${inProgress} | Pendientes: ${pending} | Urgentes: ${urgent} | Renovadas: ${renewed}`, 14, filterY + 12);
  
  // Contenido según tipo de reporte
  let startY = filterY + 20;
  
  if (type === "user") {
    generateUserReport(doc, tasks, startY);
  } else if (type === "overdue") {
    generateOverdueReport(doc, tasks, startY);
  } else {
    generateTaskTableReport(doc, tasks, type, startY);
  }
  
  // Footer
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
  
  // Descargar
  const fileName = `reporte-${type}-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};

// ✅ REPORTE POR USUARIO (con estadísticas detalladas)
const generateUserReport = (doc: jsPDF, tasks: Task[], startY: number) => {
  const userMap = new Map<string, Task[]>();
  
  tasks.forEach(task => {
    const key = task.assigneeName || "Sin asignar";
    if (!userMap.has(key)) userMap.set(key, []);
    userMap.get(key)!.push(task);
  });
  
  const userStats: UserStats[] = Array.from(userMap.entries()).map(([name, userTasks]) => {
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
      avgCompletionTime: avgTime
    };
  }).sort((a, b) => b.total - a.total);
  
  (doc as any).autoTable({
    startY,
    head: [["Usuario", "Email", "Total", "Por Hacer", "En Progreso", "Completadas", "Renovadas", "Tiempo Prom."]],
    body: userStats.map(u => [
      u.name,
      u.email,
      u.total.toString(),
      u.pending.toString(),
      u.inProgress.toString(),
      u.completed.toString(),
      u.renewed.toString(),
      u.avgCompletionTime
    ]),
    theme: "striped",
    headStyles: { fillColor: [6, 182, 212], textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 250, 252] }
  });
  
  // Detalle por usuario
  let currentY = (doc as any).lastAutoTable.finalY + 15;
  
  userStats.forEach(user => {
    if (currentY > 250) {
      doc.addPage();
      currentY = 20;
    }
    
    doc.setTextColor(6, 182, 212);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`📊 ${user.name}`, 14, currentY);
    currentY += 6;
    
    const userTasks = tasks.filter(t => t.assigneeName === user.name);
    
    (doc as any).autoTable({
      startY: currentY,
      head: [["Tarea", "Estado", "Prioridad", "Vencimiento", "Renovaciones"]],
      body: userTasks.map(t => [
        t.title,
        getStatusLabel(t.status),
        getPriorityLabel(t.priority),
        formatDate(t.dueDate),
        (t.renewalCount || 0).toString()
      ]),
      theme: "grid",
      headStyles: { fillColor: [100, 116, 139], fontSize: 8 },
      bodyStyles: { fontSize: 7 }
    });
    
    currentY = (doc as any).lastAutoTable.finalY + 10;
  });
};

// ✅ REPORTE DE TAREAS VENCIDAS (con renovaciones)
const generateOverdueReport = (doc: jsPDF, tasks: Task[], startY: number) => {
  const now = new Date();
  const overdueTasks = tasks.filter(t => 
    t.dueDate && new Date(t.dueDate) < now && 
    t.status !== "done" && t.status !== "completed"
  ).sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());
  
  if (overdueTasks.length === 0) {
    doc.setTextColor(16, 185, 129);
    doc.setFontSize(12);
    doc.text("✅ No hay tareas vencidas", 14, startY + 10);
    return;
  }
  
  doc.setTextColor(239, 68, 68);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text(`⚠️ Total de tareas vencidas: ${overdueTasks.length}`, 14, startY + 5);
  
  (doc as any).autoTable({
    startY: startY + 10,
    head: [["Tarea", "Asignado", "Vencimiento", "Días Vencida", "Renovaciones", "Prioridad", "Estado"]],
    body: overdueTasks.map(t => {
      const daysOverdue = Math.floor((now.getTime() - new Date(t.dueDate!).getTime()) / (1000 * 60 * 60 * 24));
      return [
        t.title,
        t.assigneeName || "Sin asignar",
        formatDate(t.dueDate),
        `${daysOverdue} días`,
        (t.renewalCount || 0).toString(),
        getPriorityLabel(t.priority),
        getStatusLabel(t.status)
      ];
    }),
    theme: "striped",
    headStyles: { fillColor: [239, 68, 68], textColor: 255, fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [254, 242, 242] }
  });
};

// ✅ REPORTE GENÉRICO DE TAREAS
const generateTaskTableReport = (doc: jsPDF, tasks: Task[], type: string, startY: number) => {
  let filteredTasks = tasks;
  
  if (type === "completed") {
    filteredTasks = tasks.filter(t => t.status === "done" || t.status === "completed");
  } else if (type === "pending") {
    filteredTasks = tasks.filter(t => t.status === "todo" || !t.status);
  }
  
  (doc as any).autoTable({
    startY,
    head: [["Título", "Asignado", "Espacio", "Lista", "Estado", "Prioridad", "Vencimiento", "Renov."]],
    body: filteredTasks.map(t => [
      t.title,
      t.assigneeName || "Sin asignar",
      t.spaceName || "-",
      t.listName || "-",
      getStatusLabel(t.status),
      getPriorityLabel(t.priority),
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
};