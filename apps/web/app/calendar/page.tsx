"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createReplicacheClient } from '@pm-saas/sync-engine';

export default function CalendarPage() {
  const [rep, setRep] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    let active = true;
    const initClient = async () => {
      try {
        const client = createReplicacheClient('5249325e-1eaf-4f8b-8484-43da16f0c661', 'user-demo-123');
        if (!active) { await client.close(); return; }
        setRep(client);
        setIsReady(true);
      } catch (err) { console.error('❌ Error:', err); }
    };
    initClient();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!rep) return;
    const unsubscribe = rep.subscribe(
      async (tx: any) => {
        const keys = await tx.scan({ prefix: 'task/' }).keys().toArray();
        const loaded = await Promise.all(keys.map(async (k: string) => await tx.get(k)));
        return loaded.filter((t: any) => t && t.dueDate);
      },
      { onData: (loaded: any[]) => setTasks(loaded) }
    );
    return () => unsubscribe();
  }, [rep]);

  const changeMonth = (offset: number) => {
    const d = new Date(currentDate);
    d.setMonth(d.getMonth() + offset);
    setCurrentDate(d);
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: (Date | null)[] = [];
    for (let i = 0; i < firstDay.getDay(); i++) days.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) days.push(new Date(year, month, d));
    return days;
  };

  const getTasksForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return tasks.filter((t: any) => new Date(t.dueDate).toISOString().split('T')[0] === dateStr);
  };

  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  if (!isReady) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-6 flex items-center justify-center">
      <div className="w-full max-w-4xl">
        {/* Header elegante y atractivo */}
        <div className="backdrop-blur-xl bg-gradient-to-r from-white/10 to-white/5 rounded-2xl p-5 border border-white/20 shadow-2xl mb-6">
          <div className="flex items-center justify-between">
            {/* Botón Volver estilizado */}
            <Link 
              href="/" 
              className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-cyan-400/30 transition-all duration-300"
            >
              <svg className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Volver al Kanban</span>
            </Link>

            {/* Título con icono */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Calendario</h1>
                <p className="text-xs text-slate-400">Tareas por fecha de vencimiento</p>
              </div>
            </div>

            {/* Navegación de mes elegante */}
            <div className="flex items-center gap-2 bg-slate-900/50 backdrop-blur-sm rounded-xl p-1.5 border border-white/10">
              <button 
                onClick={() => changeMonth(-1)} 
                className="p-2 text-slate-400 hover:text-white hover:bg-cyan-500/20 hover:border-cyan-400/30 border border-transparent rounded-lg transition-all duration-300"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <span className="text-white font-semibold px-4 text-sm min-w-[160px] text-center">
                {monthNames[currentDate.getMonth()]} <span className="text-cyan-400">{currentDate.getFullYear()}</span>
              </span>
              <button 
                onClick={() => changeMonth(1)} 
                className="p-2 text-slate-400 hover:text-white hover:bg-cyan-500/20 hover:border-cyan-400/30 border border-transparent rounded-lg transition-all duration-300"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Calendario compacto */}
        <div className="backdrop-blur-xl bg-white/5 rounded-2xl p-5 border border-white/10 shadow-2xl">
          <div className="grid grid-cols-7 gap-1.5 mb-2">
            {weekDays.map(day => (
              <div key={day} className="text-center text-slate-400 text-xs font-medium py-2 uppercase tracking-wider">{day}</div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 gap-1.5">
            {getDaysInMonth(currentDate).map((date, i) => {
              if (!date) return <div key={`empty-${i}`} />;
              const dayTasks = getTasksForDate(date);
              const isToday = date.toDateString() === new Date().toDateString();
              
              return (
                <div key={i} className={`relative aspect-square rounded-lg p-1.5 transition-all hover:scale-105 ${isToday ? 'bg-blue-500/20 border border-blue-400/50' : 'bg-white/[0.02] border border-white/5 hover:bg-white/[0.05]'}`}>
                  <span className={`text-xs font-medium ${isToday ? 'text-blue-300' : 'text-slate-400'}`}>{date.getDate()}</span>
                  <div className="mt-1 space-y-0.5">
                    {dayTasks.slice(0, 3).map((task: any) => (
                      <div key={task.id} className={`text-[9px] px-1 py-0.5 rounded truncate ${task.priority === 1 ? 'bg-red-500/20 text-red-300' : task.priority === 2 ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/20 text-emerald-300'}`} title={task.title}>
                        {task.identifier}
                      </div>
                    ))}
                    {dayTasks.length > 3 && <div className="text-[9px] text-slate-500 text-center">+{dayTasks.length - 3}</div>}
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
