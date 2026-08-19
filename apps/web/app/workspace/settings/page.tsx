"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function WorkspaceSettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [workspace, setWorkspace] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [inviteCode, setInviteCode] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user?.id) {
      router.push("/login");
      return;
    }

    const fetchWorkspace = async () => {
      try {
        const response = await fetch(
          `/api/user/workspace?userId=${session?.user?.id || ""}`
        );
        const data = await response.json();

        if (!data.workspaceId) {
          router.push("/onboarding");
          return;
        }

        setWorkspace(data.workspace);

        // Obtener miembros del workspace
        const membersResponse = await fetch(
          `/api/workspace/members?workspaceId=${data.workspaceId}`
        );
        const membersData = await membersResponse.json();
        setMembers(membersData);
      } catch (error) {
        console.error("Error fetching workspace:", error);
        showNotification("Error al cargar el workspace", "error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchWorkspace();
  }, [status, session, router]);

  const showNotification = (message: string, type: "success" | "error") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const generateInviteCode = async () => {
    setIsGenerating(true);
    setInviteCode("");

    try {
      const response = await fetch("/api/workspace/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId: workspace.id }),
      });

      const data = await response.json();

      if (response.ok) {
        setInviteCode(data.code);
        showNotification("¡Código generado exitosamente!", "success");
      } else {
        throw new Error(data.error || "Error al generar código");
      }
    } catch (error) {
      console.error("Error generando código:", error);
      showNotification("No se pudo generar el código", "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    if (!inviteCode) return;

    navigator.clipboard.writeText(inviteCode).then(() => {
      showNotification("¡Código copiado al portapapeles!", "success");
    });
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-400 border-t-transparent mx-auto mb-4"></div>
          <p className="text-white font-medium text-lg">
            Cargando configuración...
          </p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-6">
      <div className="max-w-3xl mx-auto">
        {/* Notificación */}
        {notification && (
          <div
            className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg transition-all ${
              notification.type === "success"
                ? "bg-emerald-500 text-white"
                : "bg-red-500 text-white"
            }`}
          >
            {notification.message}
          </div>
        )}

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">
              Configuración del Workspace
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Gestiona tu espacio de trabajo
            </p>
          </div>
          <button
            onClick={() => router.back()}
            className="flex items-center text-slate-400 hover:text-white transition-colors"
          >
            <svg
              className="w-4 h-4 mr-1"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Volver
          </button>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-8">
          <h2 className="text-xl font-bold text-white mb-4">
            Información del Workspace
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900/50 border border-white/5 rounded-xl p-4">
              <p className="text-slate-500 text-sm mb-1">Nombre</p>
              <p className="text-white font-medium">{workspace?.name}</p>
            </div>
            <div className="bg-slate-900/50 border border-white/5 rounded-xl p-4">
              <p className="text-slate-500 text-sm mb-1">Slug</p>
              <p className="text-white font-mono">{workspace?.slug}</p>
            </div>
            <div className="bg-slate-900/50 border border-white/5 rounded-xl p-4">
              <p className="text-slate-500 text-sm mb-1">Plan</p>
              <p className="text-white font-medium">{workspace?.plan}</p>
            </div>
            <div className="bg-slate-900/50 border border-white/5 rounded-xl p-4">
              <p className="text-slate-500 text-sm mb-1">Tipo</p>
              <p className="text-white font-medium">
                {workspace?.isPrivate ? "Privado" : "Público"}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white">Invitaciones</h2>
            <button
              onClick={generateInviteCode}
              disabled={isGenerating}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-all disabled:opacity-50"
            >
              {isGenerating ? "Generando..." : "Generar Código"}
            </button>
          </div>

          {inviteCode && (
            <div className="relative bg-slate-900 border border-white/10 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between">
                <p className="text-slate-400 text-sm">Código de invitación</p>
                <button
                  onClick={copyToClipboard}
                  className="text-slate-400 hover:text-white transition-colors text-sm"
                >
                  Copiar
                </button>
              </div>
              <p className="font-mono text-lg text-white mt-2 break-words">
                {inviteCode}
              </p>
            </div>
          )}

          <div className="bg-slate-900/50 border border-white/5 rounded-xl p-4">
            <p className="text-slate-400 text-sm">
              Comparte este código con tu equipo para que se unan a tu
              workspace.
            </p>
            <p className="text-slate-400 text-sm mt-2">
              <span className="text-cyan-400 font-medium">Nota:</span> Los
              códigos expiran en 7 días.
            </p>
          </div>
        </div>

        <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-4">Miembros</h2>

          {members.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <p className="text-sm">
                Aún no hay miembros en este workspace
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {members.map((member: any) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between bg-slate-900/50 border border-white/5 rounded-xl p-4"
                >
                  <div className="flex items-center">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mr-3">
                      <span className="text-white font-bold text-sm">
                        {member.user.name?.charAt(0) || "U"}
                      </span>
                    </div>
                    <div>
                      <p className="text-white font-medium">
                        {member.user.name}
                      </p>
                      <p className="text-slate-400 text-sm">
                        {member.user.email}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs px-2 py-1 rounded-full bg-slate-800 text-slate-300">
                    {member.role}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}