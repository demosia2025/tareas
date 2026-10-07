"use client";
import { useState } from "react";
import { X, FileText, Calendar, User, FolderKanban, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { generateReport } from "@/lib/pdfReports";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: any[];
}

type ReportType = "date" | "user" | "space" | "overdue" | "completed" | "pending";

export default function ReportModal({ isOpen, onClose, tasks }: ReportModalProps) {
  const [reportType, setReportType] = useState<ReportType>("date");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedUser, setSelectedUser] = useState("");
  const [selectedSpace, setSelectedSpace] = useState("");

  if (!isOpen) return null;

  // Obtener usuarios únicos
  const users = Array.from(new Set(tasks.map(t => t.assigneeName).filter(Boolean)));
  const spaces = Array.from(new Set(tasks.map(t => t.spaceName).filter(Boolean)));

  const handleGenerate = () => {
    let filteredTasks = [...tasks];

    // Aplicar filtros según tipo
    if (reportType === "date" && startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      end.setHours(23, 59, 59);
      
      filteredTasks = tasks.filter(t => {
        const taskDate = new Date(t.createdAt || 0);
        return taskDate >= start && taskDate <= end;
      });
    }

    if (reportType === "user" && selectedUser) {
      filteredTasks = tasks.filter(t => t.assigneeName === selectedUser);
    }

    if (reportType === "space" && selectedSpace) {
      filteredTasks = tasks.filter(t => t.spaceName === selectedSpace);
    }

    if (filteredTasks.length === 0) {
      alert("No hay tareas que coincidan con los filtros seleccionados");
      return;
    }

    generateReport(reportType, filteredTasks, {
      startDate,
      endDate,
      userName: selectedUser,
      spaceName: selectedSpace
    });

    onClose();
  };

  const reportTypes = [
    { id: "date", label: "Por Rango de Fechas", icon: Calendar, color: "cyan" },
    { id: "user", label: "Por Usuario", icon: User, color: "purple" },
    { id: "space", label: "Por Espacio", icon: FolderKanban, color: "indigo" },
    { id: "overdue", label: "Tareas Vencidas", icon: AlertCircle, color: "rose" },
    { id: "completed", label: "Tareas Completadas", icon: CheckCircle, color: "emerald" },
    { id: "pending", label: "Tareas Por Hacer", icon: Clock, color: "amber" }
  ];

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            Generar Reporte PDF
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selector de tipo de reporte */}
        <div className="mb-6">
          <label className="block text-xs font-bold text-slate-300 mb-3 uppercase tracking-wider">
            Tipo de Reporte
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {reportTypes.map((type) => {
              const Icon = type.icon;
              const isActive = reportType === type.id;
              return (
                <button
                  key={type.id}
                  onClick={() => setReportType(type.id as ReportType)}
                  className={`flex items-center gap-2 p-3 rounded-xl border transition-all text-xs font-semibold ${
                    isActive
                      ? `bg-${type.color}-500/20 border-${type.color}-500/50 text-${type.color}-300`
                      : "bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{type.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Filtros dinámicos según tipo */}
        <div className="space-y-4 mb-6">
          {reportType === "date" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Fecha Inicio</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Fecha Fin</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
                  />
                </div>
              </div>
            </>
          )}

          {reportType === "user" && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Seleccionar Usuario</label>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
              >
                <option value="">Todos los usuarios</option>
                {users.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
          )}

          {reportType === "space" && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Seleccionar Espacio</label>
              <select
                value={selectedSpace}
                onChange={(e) => setSelectedSpace(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white"
              >
                <option value="">Todos los espacios</option>
                {spaces.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Preview de tareas */}
        <div className="mb-6 p-4 bg-slate-950/50 border border-slate-800 rounded-xl">
          <p className="text-xs text-slate-400 mb-2">
            <span className="text-cyan-400 font-bold">{tasks.length}</span> tareas disponibles
            {reportType === "date" && startDate && endDate && (
              <span> • Filtrando por fechas</span>
            )}
          </p>
          <div className="flex gap-2 flex-wrap">
            {reportType === "overdue" && (
              <span className="px-2 py-1 bg-rose-500/10 border border-rose-500/30 rounded-lg text-[10px] text-rose-400">
                Solo vencidas
              </span>
            )}
            {reportType === "completed" && (
              <span className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-[10px] text-emerald-400">
                Solo completadas
              </span>
            )}
            {reportType === "pending" && (
              <span className="px-2 py-1 bg-amber-500/10 border border-amber-500/30 rounded-lg text-[10px] text-amber-400">
                Solo pendientes
              </span>
            )}
          </div>
        </div>

        {/* Botones */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleGenerate}
            className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-cyan-500/25 flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            Generar PDF
          </button>
        </div>
      </div>
    </div>
  );
}