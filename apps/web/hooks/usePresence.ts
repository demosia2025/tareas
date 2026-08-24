import { useEffect } from "react";

export function usePresence(workspaceId?: string) {
  useEffect(() => {
    // Función para enviar ping de presencia
    const sendPresencePing = async () => {
      try {
        await fetch("/api/user/presence", {
          method: "POST",
        });
      } catch (error) {
        console.error("Error sending presence ping:", error);
      }
    };

    // Enviar ping inmediatamente
    sendPresencePing();

    // Enviar ping cada 30 segundos
    const pingInterval = setInterval(sendPresencePing, 30000);

    // Enviar ping cuando la ventana vuelva a estar activa
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        sendPresencePing();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(pingInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [workspaceId]);
}