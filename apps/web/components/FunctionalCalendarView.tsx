"use client";
import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Task } from "./InlineTaskRow";

interface FunctionalCalendarViewProps {
  tasks: Task[];
  onEditTask: (task: Task) => void;
}

export function FunctionalCalendarView({ tasks, onEditTask }: FunctionalCalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const daysOfWeek = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

  const calendarGrid = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    let startDayOfWeek = firstDayOfMonth.getDay() - 1; 
    if (startDayOfWeek === -1) startDayOfWeek = 6; 
    const totalDays = lastDayOfMonth.getDate();
    const daysArray = [];
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      daysArray.push({ date: new Date(year, month - 1, prevMonthLastDay - i), isCurrentMonth: false });
    }
    for (let i = 1; i <= totalDays; i++) {
      daysArray.push({ date: new Date(year, month, i), isCurrentMonth: true });
    }
    const remainingDays = 7 - (daysArray.length % 7);
    if (remainingDays < 7) {
      for (let i = 1; i <= remainingDays; i++) {
        daysArray.push({ date: new Date(year, month + 1, i), isCurrentMonth: false });
      }
    }
    return daysArray;
  }, [year, month]);

  const tasksByDate = useMemo(() => {
    const map = new Map<string, Task[]>();
    tasks.forEach(task => {
      if (!task.dueDate) return;
      const d = new Date(task.dueDate);
      const dateKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(task);
    });
    return map;
  }, [tasks]);

  return (
    <div className="h-full flex flex-col bg-slate-900/40 border border-slate-800/80 rounded-2xl backdrop-blur-xl overflow-hidden shadow-2xl">
      <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-800/80 bg-slate-900/60 flex-shrink-0">
        <h2 className="text-sm sm:text-base font-bold text-white capitalize">{monthNames[month]} {year}</h2>
        <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700/80">
          <button onClick={() => setCurrentDate(new Date(year, month - 1, 1))} className="p-1.5 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-all"><ChevronLeft className="w-4 h-4" /></button>
          <button onClick={() => setCurrentDate(new Date())} className="px-2.5 py-1 bg-slate-700/60 hover:bg-slate-700 text-slate-200 hover:text-white rounded-md text-xs font-semibold transition-all">Hoy</button>
          <button onClick={() => setCurrentDate(new Date(year, month + 1, 1))} className="p-1.5 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-all"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 border-b border-slate-800/80 bg-slate-950/40 text-center flex-shrink-0">
        {daysOfWeek.map((day, idx) => <div key={idx} className="py-2 text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">{day}</div>)}
      </div>
      <div className="grid grid-cols-7 flex-1 bg-slate-950/25 divide-x divide-y divide-slate-800/50">
        {calendarGrid.map(({ date, isCurrentMonth }, index) => {
          const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          const dayTasks = tasksByDate.get(dateKey) || [];
          const today = new Date();
          const isToday = date.getDate() === today.getDate() && date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();

          return (
            <div key={index} className={`p-1.5 sm:p-2 flex flex-col transition-colors overflow-hidden ${isCurrentMonth ? 'bg-slate-900/20' : 'bg-slate-950/40 opacity-40'} hover:bg-slate-800/20`}>
              <div className="flex items-center justify-between mb-1 flex-shrink-0">
                <span className={`text-[11px] sm:text-xs font-bold w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-lg ${isToday ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/30' : isCurrentMonth ? 'text-slate-300' : 'text-slate-600'}`}>{date.getDate()}</span>
                {dayTasks.length > 0 && <span className="text-[9px] sm:text-[10px] font-medium text-cyan-400 px-1 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">{dayTasks.length}</span>}
              </div>
              <div className="flex-1 space-y-1 overflow-y-auto pr-0.5 custom-scrollbar min-h-0">
                {dayTasks.map(task => (
                  <div key={task.id} onClick={() => onEditTask(task)} className={`px-1.5 py-1 sm:px-2 sm:py-1 rounded-lg text-[10px] sm:text-[11px] font-medium truncate cursor-pointer transition-all border ${task.status === 'done' ? 'bg-slate-900/40 border-slate-800 text-slate-500 line-through' : 'bg-cyan-500/15 border-cyan-500/30 text-cyan-200 hover:bg-cyan-500/25 shadow-sm shadow-cyan-500/5'}`} title={task.title}>
                    {task.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
