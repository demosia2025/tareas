"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

export function usePresence() {
  const { data: session, status } = useSession();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) return;

    const updatePresence = async () => {
      try {
        // ✅ No enviamos body, la API obtiene el ID de la sesión
        await fetch("/api/user/presence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
      } catch (error) {
        console.error("Error updating presence:", error);
      }
    };

    updatePresence();
    intervalRef.current = setInterval(updatePresence, 30000);

    const handleBeforeUnload = () => updatePresence();
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [session?.user?.id, status]);
}