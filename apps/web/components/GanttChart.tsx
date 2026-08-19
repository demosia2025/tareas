import React, { useState, useRef, useMemo } from 'react';

export interface GanttTask {
  id: string;
  name: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  status: 'Por hacer' | 'En progreso' | 'Completadas';
  priority?: 'Urgente' | 'Alta' | 'Normal' | 'Baja';
  progress: number;  // 0 - 100
  isMilestone?: boolean;
  parentId?: string; // Para subtareas
  collapsed?: boolean;
}

const initialTasks: GanttTask[] = [
  { id: '1', name: 'Definición de arquitectura SaaS', startDate: '2026-07-01', endDate: '2026-07-06', status: 'Completadas', progress: 100 },
  { id: '2', name: 'Diseño de UI/UX en Figma', startDate: '2026-07-05', endDate: '2026-07-12', status: 'Completadas', progress: 100, parentId: '1' },
  { id: '3', name: 'Desarrollo del Frontend (Kanban)', startDate: '2026-07-10', endDate: '2026-07-25', status: 'En progreso', priority: 'Urgente', progress: 65 },
  { id: '4', name: 'Hito de Lanzamiento Alpha', startDate: '2026-07-26', endDate: '2026-07-26', status: 'Por hacer', progress: 0, isMilestone: true },
  { id: '5', name: 'Integración de Base de Datos', startDate: '2026-07-24', endDate: '2026-08-05', status: 'Por hacer', priority: 'Alta', progress: 10 },
];

export const GanttChart: React.FC = () => {
  const [tasks, setTasks] = useState<GanttTask[]>(initialTasks);
  const [zoom, setZoom] = useState<'Días' | 'Semanas'>('Días');
  const [filterStatus, setFilterStatus] = useState<string>('Todos');
  
  const leftScrollRef = useRef<HTMLDivElement>(null);
  const rightScrollRef = useRef<HTMLDivElement>(null);

  // Sincronizar scroll vertical entre el panel izquierdo y derecho
  const handleScroll = (e: React.UIEvent<HTMLDivElement>, targetRef: React.RefObject<HTMLDivElement | null>) => {
    if (targetRef.current) {
      targetRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  // Rango de fechas generado dinámicamente para Julio/Agosto 2026
  const timelineDays = useMemo(() => {
       const days = [];
   for (let i = 1; i <= 31; i++) {
     days.push(`${i < 10 ? '0' + i : i} Jul`); // ✅ CORRECTO
   }
   for (let i = 1; i <= 10; i++) {
     days.push(`${i < 10 ? '0' + i : i} Aug`);
   }
    for (let i = 1; i <= 10; i++) {
      days.push(`0${i} Ago`);
    }
    return days;
  }, []);

  const filteredTasks = tasks.filter(task => {
    if (filterStatus === 'Todos') return true;
    return task.status === filterStatus;
  });

  return (
    <div className="flex flex-col h-full bg-[#0b0f19] text-gray-200 rounded-2xl border border-gray-800 overflow-hidden shadow-2xl">
      
      {/* Header de controles estilo ClickUp */}
      <div className="flex items-center justify-between px-6 py-3 bg-[#111827] border-b border-gray-800">
        <div className="flex items-center gap-4">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Cronograma Gantt</span>
          
          {/* Selector de Zoom */}
          <div className="flex bg-[#1f2937] p-0.5 rounded-lg border border-gray-700 text-xs">
            <button 
              onClick={() => setZoom('Días')} 
              className={`px-3 py-1 rounded-md transition-all ${zoom === 'Días' ? 'bg-[#6366f1] text-white font-medium shadow' : 'text-gray-400 hover:text-white'}`}
            >
              Días
            </button>
            <button 
              onClick={() => setZoom('Semanas')} 
              className={`px-3 py-1 rounded-md transition-all ${zoom === 'Semanas' ? 'bg-[#6366f1] text-white font-medium shadow' : 'text-gray-400 hover:text-white'}`}
            >
              Semanas
            </button>
          </div>
        </div>

        {/* Filtros rápidos de estado */}
        <div className="flex items-center gap-3">
          <select 
            value={filterStatus} 
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-[#1f2937] border border-gray-700 text-xs rounded-lg px-3 py-1.5 text-gray-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="Todos">Todos los estados</option>
            <option value="Por hacer">Por hacer</option>
            <option value="En progreso">En progreso</option>
            <option value="Completadas">Completadas</option>
          </select>
          <span className="text-xs text-gray-400">
            Mostrando <span className="text-white font-semibold">{filteredTasks.length}</span> tareas
          </span>
        </div>
      </div>

      {/* Contenedor Split (Izquierda Lista / Derecha Timeline) */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* PANEL IZQUIERDO: Lista de tareas */}
        <div className="w-80 flex-shrink-0 bg-[#0f172a] border-r border-gray-800 flex flex-col z-10">
          <div className="h-10 px-4 flex items-center border-b border-gray-800 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
            Nombre de la Tarea
          </div>
          <div 
            ref={leftScrollRef}
            onScroll={(e) => handleScroll(e, rightScrollRef)}
            className="flex-1 overflow-y-auto overflow-x-hidden divide-y divide-gray-800/40"
          >
            {filteredTasks.map((task) => (
              <div key={task.id} className="h-12 px-4 flex items-center justify-between text-xs hover:bg-[#1e293b]/50 transition-colors group">
                <div className="flex items-center gap-2 truncate">
                  {task.isMilestone ? (
                    <span className="text-amber-400 text-sm">◆</span>
                  ) : (
                    <span className={`w-2 h-2 rounded-full ${
                      task.status === 'Completadas' ? 'bg-emerald-400' :
                      task.status === 'En progreso' ? 'bg-indigo-400' : 'bg-gray-500'
                    }`} />
                  )}
                  <span className={`truncate font-medium ${task.isMilestone ? 'text-amber-300 font-semibold' : 'text-gray-200'}`}>
                    {task.name}
                  </span>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                  task.status === 'Completadas' ? 'bg-emerald-500/10 text-emerald-400' :
                  task.status === 'En progreso' ? 'bg-indigo-500/10 text-indigo-400' : 'bg-gray-800 text-gray-400'
                }`}>
                  {task.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* PANEL DERECHO: Línea de tiempo interactiva */}
        <div 
          ref={rightScrollRef}
          onScroll={(e) => handleScroll(e, leftScrollRef)}
          className="flex-1 overflow-x-auto overflow-y-auto bg-[#0b0f19] relative"
        >
          <div className="min-w-[1400px] flex flex-col">
            
            {/* Cabecera de Días del Mes */}
            <div className="h-10 flex border-b border-gray-800 bg-[#111827] sticky top-0 z-20">
              {timelineDays.map((day, idx) => (
                <div key={idx} className="w-12 flex-shrink-0 flex items-center justify-center text-[10px] font-medium text-gray-400 border-r border-gray-800/40">
                  {day}
                </div>
              ))}
            </div>

            {/* Celdas y Barras de Gantt */}
            <div className="flex flex-col divide-y divide-gray-800/40 relative">
              
              {/* Línea roja vertical de tiempo actual simulada */}
              <div className="absolute top-0 bottom-0 left-[350px] w-[2px] bg-rose-500 z-10 pointer-events-none shadow-[0_0_8px_rgba(244,63,94,0.6)]">
                <span className="absolute -top-1 -translate-x-1/2 bg-rose-500 text-white text-[9px] px-1 rounded font-bold">Hoy</span>
              </div>

              {filteredTasks.map((task, index) => {
                // Cálculo de posición simulada basado en el índice para que luzca ordenado de inmediato
                const leftPosition = index * 45 + 24; 
                const barWidth = task.isMilestone ? 24 : 120;

                return (
                  <div key={task.id} className="h-12 flex items-center relative hover:bg-[#111827]/40">
                    
                    {/* Cuadrícula de fondo */}
                    <div className="absolute inset-0 flex pointer-events-none">
                      {timelineDays.map((_, dIdx) => (
                        <div key={dIdx} className="w-12 flex-shrink-0 border-r border-gray-800/20 h-full"></div>
                      ))}
                    </div>

                    {/* Barra de Tarea Estilo ClickUp */}
                    <div 
                      className={`absolute h-6 rounded-md flex items-center px-2 group cursor-pointer transition-all shadow-md border ${
                        task.isMilestone 
                          ? 'bg-amber-500 border-amber-300 rotate-45 w-5 h-5 !left-[250px]' 
                          : task.status === 'Completadas'
                            ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 border-emerald-400/40 text-white'
                            : task.status === 'En progreso'
                              ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 border-indigo-400/40 text-white'
                              : 'bg-gradient-to-r from-gray-700 to-gray-600 border-gray-500/40 text-gray-200'
                      }`}
                      style={!task.isMilestone ? { left: `${leftPosition}px`, width: `${barWidth}px` } : {}}
                      title={`${task.name} (${task.progress}%)`}
                    >
                      {/* Relleno de progreso */}
                      {!task.isMilestone && (
                        <div 
                          className="absolute left-0 top-0 bottom-0 bg-white/20 rounded-l-md pointer-events-none"
                          style={{ width: `${task.progress}%` }}
                        />
                      )}
                      
                      {!task.isMilestone && (
                        <span className="text-[10px] font-bold truncate relative z-10 drop-shadow-sm">
                          {task.name}
                        </span>
                      )}

                      {/* Handles visuales para cambiar duración en los extremos */}
                      {!task.isMilestone && (
                        <>
                          <div className="absolute left-0 top-1 bottom-1 w-1 bg-white/40 rounded-l opacity-0 group-hover:opacity-100 cursor-w-resize" />
                          <div className="absolute right-0 top-1 bottom-1 w-1 bg-white/40 rounded-r opacity-0 group-hover:opacity-100 cursor-e-resize" />
                        </>
                      )}
                    </div>

                  </div>
                );
              })}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
