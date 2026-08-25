"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

export function usePresence() {
  const { data: session, status } = useSession();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Solo ejecutar si la sesión está autenticada y el usuario existe
    if (status !== "authenticated" || !session?.user?.id) return;

    const updatePresence = async () => {
      try {
        // ✅ CORREGIDO: No enviamos el userId en el body. 
        // La API ya lo obtiene de forma segura desde el servidor con auth()
        await fetch("/api/user/presence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        console.error("Error updating presence:", error);
      }
    };

    // Actualizar inmediatamente
    updatePresence();
    
    // Actualizar cada 30 segundos
    intervalRef.current = setInterval(updatePresence, 30000);

    // Actualizar al cerrar la pestaña
    const handleBeforeUnload = () => updatePresence();
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [session?.user?.id, status]);
}