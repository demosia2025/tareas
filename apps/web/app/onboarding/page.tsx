"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Shield, ChevronDown, User, LogOut, AlertTriangle, Building2 } from "lucide-react";

export default function OnboardingPage() {
  const [step, setStep] = useState<"create" | "join">("create");
  const [workspaceName, setWorkspaceName] = useState("");
  const [organizationName, setOrganizationName] = useState(""); // ✅ RESTAURADO
  const [inviteCode, setInviteCode] = useState("");
  const [workspaceSlug, setWorkspaceSlug] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  
  const router = useRouter();
  const { data: session } = useSession();

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceName.trim()) return;

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/workspace/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: workspaceName,
          organizationName: organizationName, // ✅ ENVIADO
          userId: session?.user?.id,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        router.push("/");
      } else {
        setError(data.error || "Error al crear workspace");
      }
    } catch (err) {
      setError("Error al conectar con el servidor");
      console.error(err);
    }

    setIsLoading(false);
  };

  const handleJoinWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim() || !workspaceSlug.trim()) return;

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/workspace/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          inviteCode,
          workspaceSlug,
          userId: session?.user?.id,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        router.push("/");
      } else {
        setError(data.error || "Error al unirse al workspace");
      }
    } catch (err) {
      setError("Error al conectar con el servidor");
      console.error(err);
    }

    setIsLoading(false);
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 flex flex-col">
      <header className="h-14 bg-slate-900/80 backdrop-blur-2xl border-b border-slate-800/80 flex-shrink-0 z-[9999]">
        <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 via-cyan-500 to-blue-600 flex items-center justify-center shadow-md shadow-cyan-500/25 group-hover:scale-105 transition-transform">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <div className="hidden sm:flex items-center space-x-3 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-slate-800 shadow-lg backdrop-blur-sm">
                <span className="text-sm font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">
                  Project SaaS - Onboarding
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative z-50">
              <button 
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)} 
                className="flex items-center gap-2.5 px-2.5 py-1 rounded-xl hover:bg-slate-800/60 transition-all border border-slate-800/80 hover:border-slate-700/60 shadow-inner"
              >
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs">
                  {(session?.user?.name || "U")[0].toUpperCase()}
                </div>
                <div className="text-left hidden lg:block">
                  <div className="text-[11px] font-bold text-white leading-tight">{session?.user?.name || "Usuario"}</div>
                  <div className="text-[9px] text-cyan-400 leading-tight">Configuración inicial</div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>
              
              {isProfileMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsProfileMenuOpen(false)}></div>
                  <div className="absolute right-0 mt-2 w-52 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-1 z-[9999] backdrop-blur-2xl animate-in fade-in zoom-in-95">
                    <div className="px-3.5 py-2 border-b border-slate-800">
                      <p className="text-xs font-bold text-white truncate">{session?.user?.name}</p>
                      <p className="text-[10px] text-slate-400 truncate">{session?.user?.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        router.push("/profile");
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-slate-300 hover:bg-slate-800/80 hover:text-white transition-colors"
                    >
                      <User className="w-4 h-4 text-slate-400" />
                      <span>Mi Perfil</span>
                    </button>
                    <div className="h-px bg-slate-800 my-1" />
                    <button 
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        setIsLogoutModalOpen(true);
                      }} 
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-rose-400 hover:bg-rose-500/15 hover:text-rose-300 transition-colors font-medium"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Cerrar Sesión</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto bg-gradient-to-br from-slate-950 via-slate-950 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl bg-slate-900/60 border border-slate-800/80 rounded-2xl p-8 backdrop-blur-xl shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Bienvenido a Project SaaS</h1>
            <p className="text-slate-400 text-sm">
              {step === "create" 
                ? "Crea tu workspace para comenzar" 
                : "Únete a un workspace existente"}
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-300 text-xs font-medium">
              {error}
            </div>
          )}

          <div className="flex gap-2 mb-8">
            <button
              onClick={() => { setStep("create"); setError(""); }}
              className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all ${
                step === "create"
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25"
                  : "bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              Crear Workspace
            </button>
            <button
              onClick={() => { setStep("join"); setError(""); }}
              className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all ${
                step === "join"
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25"
                  : "bg-slate-800/60 text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              Unirme a Workspace
            </button>
          </div>

          {step === "create" && (
            <form onSubmit={handleCreateWorkspace} className="space-y-4">
              {/* ✅ CAMPO DE ORGANIZACIÓN RESTAURADO */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                  Nombre de la Organización
                </label>
                <input
                  type="text"
                  required
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  placeholder="Ej: Mi Empresa S.A."
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:border-cyan-500/50 focus:outline-none transition-all"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Este nombre aparecerá en el sidebar junto a tus workspaces
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Nombre del Workspace
                </label>
                <input
                  type="text"
                  required
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  placeholder="Mi Workspace"
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:border-cyan-500/50 focus:outline-none transition-all"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Este será tu espacio de trabajo personal o de equipo
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold py-3 rounded-xl text-xs transition-all shadow-lg shadow-cyan-500/25 disabled:opacity-50"
              >
                {isLoading ? "Creando workspace..." : "Crear Workspace"}
              </button>
            </form>
          )}

          {step === "join" && (
            <form onSubmit={handleJoinWorkspace} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Código de Invitación
                </label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  required
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:border-cyan-500/50 focus:outline-none transition-all"
                  placeholder="ABC123"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Slug del Workspace
                </label>
                <input
                  type="text"
                  value={workspaceSlug}
                  onChange={(e) => setWorkspaceSlug(e.target.value.toLowerCase())}
                  required
                  className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:border-cyan-500/50 focus:outline-none transition-all"
                  placeholder="mi-workspace"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Pídele este dato al administrador del workspace
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold py-3 rounded-xl text-xs transition-all shadow-lg shadow-cyan-500/25 disabled:opacity-50"
              >
                {isLoading ? "Uniéndote..." : "Unirme al Workspace"}
              </button>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-slate-400 text-xs">
              {step === "create"
                ? "¿Tienes un código de invitación? "
                : "¿No tienes invitación? "}
              <button
                type="button"
                onClick={() => {
                  setStep(step === "create" ? "join" : "create");
                  setError("");
                }}
                className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors"
              >
                {step === "create" ? "Únete a uno existente" : "Crea el tuyo"}
              </button>
            </p>
          </div>
        </div>
      </main>

      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-rose-400" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">¿Cerrar sesión?</h3>
              <p className="text-sm text-slate-400 mb-6">Estás a punto de cerrar tu sesión actual. ¿Deseas continuar?</p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setIsLogoutModalOpen(false)}
                  className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors border border-slate-700"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-rose-600 to-rose-500 hover:from-rose-500 hover:to-rose-400 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-rose-500/20"
                >
                  Sí, cerrar sesión
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}