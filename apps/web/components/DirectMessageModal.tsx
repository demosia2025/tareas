"use client";
import { useState, useEffect } from "react";

interface DirectMessageModalProps {
  recipient: { id: string; name: string; isOnline?: boolean };
  onClose: () => void;
}

export function DirectMessageModal({ recipient, onClose }: DirectMessageModalProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");

  // Aquí harías un fetch para traer los mensajes previos con este usuario y otro para enviarlos usando la API POST de arriba.
  
  return (
    <div className="fixed bottom-4 right-4 w-80 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-4 z-50 text-white">
      <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-3">
        <h4 className="text-xs font-bold">Chat con {recipient.name}</h4>
        <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
      </div>
      <p className="text-[10px] text-slate-400 mb-2">
        {recipient.isOnline ? "🟢 En línea ahora" : "⚪ Desconectado (dejaras un mensaje pendiente)"}
      </p>
      {/* Contenedor de mensajes y input para enviar */}
    </div>
  );
}