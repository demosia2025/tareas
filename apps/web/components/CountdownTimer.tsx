"use client";
import { useState, useEffect } from "react";
import { Clock, AlertCircle } from "lucide-react";

interface CountdownTimerProps {
  dueDate: string;
  status: string;
}

export default function CountdownTimer({ dueDate, status }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState("");
  const [isExpired, setIsExpired] = useState(false);
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const target = new Date(dueDate);
      const diff = target.getTime() - now.getTime();

      if (status === "done" || status === "completed") {
        setTimeLeft("Completada");
        setIsExpired(false);
        setIsUrgent(false);
        return;
      }

      if (diff <= 0) {
        setIsExpired(true);
        setIsUrgent(false);
        const absDiff = Math.abs(diff);
        const days = Math.floor(absDiff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((absDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        
        if (days > 0) {
          setTimeLeft(`Vencida hace ${days}d ${hours}h`);
        } else {
          setTimeLeft(`Vencida hace ${hours}h`);
        }
        return;
      }

      setIsExpired(false);
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      // Marcar como urgente si faltan menos de 24 horas
      if (diff < 24 * 60 * 60 * 1000) {
        setIsUrgent(true);
      } else {
        setIsUrgent(false);
      }

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m`);
      } else {
        setTimeLeft(`${minutes}m`);
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 60000); // Actualizar cada minuto

    return () => clearInterval(timer);
  }, [dueDate, status]);

  if (status === "done" || status === "completed") {
    return (
      <span className="text-[10px] text-emerald-400 font-medium">
        ✓ Completada
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1">
      {isExpired ? (
        <AlertCircle className="w-3 h-3 text-rose-400" />
      ) : isUrgent ? (
        <Clock className="w-3 h-3 text-amber-400 animate-pulse" />
      ) : (
        <Clock className="w-3 h-3 text-cyan-400" />
      )}
      <span className={`text-[10px] font-medium ${
        isExpired ? "text-rose-400" : isUrgent ? "text-amber-400" : "text-cyan-400"
      }`}>
        {timeLeft}
      </span>
    </div>
  );
}