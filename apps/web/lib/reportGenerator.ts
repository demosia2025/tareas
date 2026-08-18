import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface ReportData {
  companyName: string;
  reportTitle: string;
  generatedDate: string;
  period: string;
  organization: string;
  metrics: {
    totalTasks: number;
    completedTasks: number;
    inProgressTasks: number;
    pendingTasks: number;
    completionRate: number;
    avgCompletionTime: string;
  };
  tasksByPriority: {
    urgent: number;
    high: number;
    medium: number;
    low: number;
  };
  recentTasks: Array<{
    title: string;
    space: string;
    list: string;
    status: string;
    priority: string;
    createdAt: string;
    duration: string;
  }>;
}

export function generateExecutiveReport(data: ReportData): Blob {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" }) as any;
  const pageWidth = doc.internal.pageSize.getWidth();

  // --- 1. ENCABEZADO CORPORATIVO (Estilo One-Pager) ---
  doc.setFillColor(15, 23, 42); // Fondo oscuro elegante (Slate 900)
  doc.rect(0, 0, pageWidth, 28, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text(data.companyName.toUpperCase(), 14, 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184); // Slate 400
  doc.text(data.reportTitle, 14, 19);

  doc.setFontSize(8);
  doc.text(`Generado: ${data.generatedDate}`, pageWidth - 14, 12, { align: "right" });
  doc.text(`Organización: ${data.organization}`, pageWidth - 14, 19, { align: "right" });

  // --- 2. BARRA DE FILTRO Y CONTEXTO ---
  doc.setFillColor(241, 245, 249); // Slate 100
  doc.roundedRect(14, 34, pageWidth - 28, 10, 2, 2, "F");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(`PERÍODO DE ANÁLISIS: ${data.period.toUpperCase()}`, 18, 40.5);

  // --- 3. BLOQUE DE TARJETAS DE KPIs (Cajas estilo Dashboard) ---
  const startYCards = 48;
  const cardWidth = (pageWidth - 28 - 9) / 4; // 4 columnas con separación de 3mm
  const cardHeight = 18;

  const kpis = [
    { label: "TOTAL TAREAS", value: data.metrics.totalTasks.toString(), color: [79, 70, 229] },
    { label: "COMPLETADAS", value: `${data.metrics.completedTasks} (${data.metrics.completionRate}%)`, color: [16, 185, 129] },
    { label: "EN PROGRESO", value: data.metrics.inProgressTasks.toString(), color: [59, 130, 246] },
    { label: "TIEMPO PROMEDIO", value: data.metrics.avgCompletionTime, color: [245, 158, 11] },
  ];

  kpis.forEach((kpi, idx) => {
    const x = 14 + idx * (cardWidth + 3);
    
    // Fondo de tarjeta
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, startYCards, cardWidth, cardHeight, 1.5, 1.5, "FD");

    // Indicador lateral de color
    doc.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2]);
    doc.rect(x, startYCards, 1.5, cardHeight, "F");

    // Textos
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, x + 5, startYCards + 6);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text(kpi.value, x + 5, startYCards + 14);
  });

  // --- 4. DISTRIBUCIÓN POR PRIORIDAD (Mini tabla resumen) ---
  const startYPriorities = startYCards + cardHeight + 8;
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text("Desglose de Carga por Prioridad", 14, startYPriorities);

  autoTable(doc, {
    startY: startYPriorities + 3,
    head: [["Urgente", "Alta", "Media", "Baja"]],
    body: [[
      data.tasksByPriority.urgent.toString(),
      data.tasksByPriority.high.toString(),
      data.tasksByPriority.medium.toString(),
      data.tasksByPriority.low.toString()
    ]],
    theme: "grid",
    headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontSize: 8, halign: "center" },
    bodyStyles: { fontSize: 9, fontStyle: "bold", halign: "center", textColor: [30, 41, 59] },
    columnStyles: {
      0: { textColor: [225, 29, 72] }, // Urgente (Rojo)
      1: { textColor: [217, 119, 6] },  // Alta (Ámbar)
      2: { textColor: [79, 70, 229] },  // Media (Índigo)
      3: { textColor: [100, 116, 139] } // Baja (Gris)
    }
  });

  // --- 5. TABLA DETALLADA DE TAREAS RECIENTES ---
  const finalYPriorities = doc.lastAutoTable?.finalY || startYPriorities + 20;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text("Detalle Reciente de Actividad y Tiempos de Resolución", 14, finalYPriorities + 8);

  const taskRows = data.recentTasks.map(t => [
    t.title,
    t.space,
    t.status,
    t.priority,
    t.createdAt,
    t.duration
  ]);

  autoTable(doc, {
    startY: finalYPriorities + 11,
    head: [["Tarea / Asunto", "Espacio / Ubicación", "Estado", "Prioridad", "Creación", "Resolución"]],
    body: taskRows,
    theme: "striped",
    headStyles: { 
      fillColor: [15, 23, 42], 
      textColor: [255, 255, 255], 
      fontSize: 8, 
      fontStyle: "bold" 
    },
    bodyStyles: { 
      fontSize: 7.5, 
      textColor: [51, 65, 85],
      cellPadding: 2.5
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 55 },
      1: { cellWidth: 35 },
      2: { cellWidth: 25 },
      3: { cellWidth: 22 },
      4: { cellWidth: 22 },
      5: { cellWidth: 23 },
    }
  });

  // --- 6. PIE DE PÁGINA PROFESIONAL ---
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Project SaaS Kanban — Reporte Ejecutivo Automatizado (Página ${i} de ${pageCount})`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 8,
      { align: "center" }
    );
  }

  return doc.output("blob");
}