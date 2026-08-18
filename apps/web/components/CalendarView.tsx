"use client";

import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: number;
  dueDate: string | null;
}

interface CalendarViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

export function CalendarView({ tasks, onTaskClick }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    
    const daysInMonth = lastDayOfMonth.getDate();
    const startingDay = firstDayOfMonth.getDay(); // 0 = Domingo
    
    const days: (Date | null)[] = [];
    for (let i = 0; i < startingDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));
    
    return days;
  }, [currentDate]);

  const getTasksForDay = (date: Date) => {
    return tasks.filter(task => {
      if (!task.dueDate) return false;
      const taskDate = new Date(task.dueDate);
      
      // Comparamos usando UTC para evitar el desfase de zona horaria
      return (
        taskDate.getUTCDate() === date.getDate() &&
        taskDate.getUTCMonth() === date.getMonth() &&
        taskDate.getUTCFullYear() === date.getFullYear()
      );
    });
  };

  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const weekDays = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  const previousMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const resetToToday = () => setCurrentDate(new Date());

  const isToday = (date: Date) => date.toDateString() === new Date().toDateString();

  const monthRangeLabel = useMemo(() => {
    const firstDay = calendarDays.find(d => d !== null);
    const lastDay = [...calendarDays].reverse().find(d => d !== null);
    
    if (!firstDay || !lastDay) return "";
    
    const start = firstDay.getDate();
    const end = lastDay.getDate();
    const month = monthNames[currentDate.getMonth()];
    const year = currentDate.getFullYear();

    return `${month} ${start} - ${end}, ${year}`;
  }, [calendarDays, currentDate]);

  const getPriorityIndicator = (priority: number) => {
    switch (priority) {
      case 4: return "bg-rose-500 shadow-rose-500/50";
      case 3: return "bg-orange-500 shadow-orange-500/50";
      case 2: return "bg-amber-500 shadow-amber-500/50";
      case 1: return "bg-blue-500 shadow-blue-500/50";
      default: return "bg-slate-500 shadow-slate-500/50";
    }
  };

  return (
    <div className="h-full w-full px-4 sm:px-6 py-2 flex flex-col box-border bg-slate-950 text-slate-100 overflow-hidden">
      {/* Contenedor Principal Ajustado hacia Arriba */}
      <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col min-h-0">
        
        {/* Header Superior Compacto */}
        <header className="flex items-center justify-between mb-3 flex-shrink-0 px-1">
          <div className="flex flex-col">
            <h2 className="text-2xl font-extrabold text-white tracking-tight flex items-baseline gap-2">
              <span>{monthNames[currentDate.getMonth()]}</span>
              <span className="text-slate-500 font-medium text-lg">{currentDate.getFullYear()}</span>
            </h2>
            <p className="text-[11px] text-cyan-400 font-semibold tracking-wide uppercase">
              {monthRangeLabel}
            </p>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-900/75 backdrop-blur-sm rounded-xl p-1 border border-slate-800 shadow-lg">
            <button 
              onClick={previousMonth} 
              className="p-2 hover:bg-slate-800/80 rounded-lg text-slate-400 hover:text-white transition-all active:scale-95"
              title="Mes anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={resetToToday} 
              className="px-4 py-1.5 text-xs font-bold text-white rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 transition-all shadow-md shadow-cyan-500/20 active:scale-95"
            >
              Hoy
            </button>
            <button 
              onClick={nextMonth} 
              className="p-2 hover:bg-slate-800/80 rounded-lg text-slate-400 hover:text-white transition-all active:scale-95"
              title="Mes siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Estructura del Calendario Optimizada en Altura */}
        <div className="flex-1 bg-slate-900/30 border border-slate-800/60 rounded-2xl shadow-2xl backdrop-blur-lg flex flex-col min-h-0 overflow-hidden mb-2">
          
          {/* Cabecera de Días de la Semana */}
          <div className="grid grid-cols-7 border-b border-slate-800/60 bg-slate-900/50 flex-shrink-0 py-2.5 px-2">
            {weekDays.map((day) => (
              <div key={day} className="text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
                {day}
              </div>
            ))}
          </div>

          {/* Celdas del Mes */}
          <div className="flex-1 grid grid-cols-7 grid-rows-5 bg-slate-950/30 p-1.5 gap-1">
            {calendarDays.map((date, index) => {
              if (!date) {
                return (
                  <div 
                    key={index} 
                    className="bg-slate-950/20 border border-slate-800/20 rounded-xl opacity-30 select-none" 
                  />
                );
              }

              const dayTasks = getTasksForDay(date);
              const today = isToday(date);

              return (
                <div
                  key={index}
                  className={`relative p-2.5 border border-slate-800/30 rounded-xl transition-all hover:bg-slate-800/30 flex flex-col min-h-0 ${
                    today ? "bg-cyan-950/20 ring-2 ring-cyan-500/40 z-10 shadow-lg shadow-cyan-950/30" : "bg-slate-950/30"
                  }`}
                >
                  {/* Número del día */}
                  <div className="flex items-center justify-between mb-1 flex-shrink-0">
                    <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-lg transition-all ${
                      today 
                        ? "bg-gradient-to-tr from-cyan-500 to-blue-500 text-white shadow-md shadow-cyan-500/30" 
                        : "text-slate-200 hover:bg-slate-700"
                    }`}>
                      {date.getDate()}
                    </span>
                    {dayTasks.length > 0 && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-800/80 text-slate-300 border border-slate-700/60">
                        {dayTasks.length}
                      </span>
                    )}
                  </div>

                  {/* Tareas */}
                  <div className="flex-1 flex flex-col gap-1 min-h-0 overflow-hidden">
                    {dayTasks.slice(0, 2).map((task) => (
                      <button
                        key={task.id}
                        onClick={() => onTaskClick(task)}
                        className="w-full text-left px-2 py-1.5 rounded-lg text-xs bg-slate-900/90 hover:bg-slate-800 border border-slate-800/90 hover:border-slate-700 transition-all group flex items-center gap-2 shadow-inner flex-shrink-0"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 shadow-md ${getPriorityIndicator(task.priority)}`}></span>
                        <span className="truncate font-semibold text-slate-200 group-hover:text-white transition-colors text-[11px]">
                          {task.title}
                        </span>
                      </button>
                    ))}
                    
                    {dayTasks.length > 2 && (
                      <div className="text-[10px] font-bold text-cyan-400 pl-1 pt-0.5 flex-shrink-0 hover:text-cyan-300 cursor-pointer">
                        +{dayTasks.length - 2} más
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

        </div>

      </div>
    </div>
  );
}