"use client";
import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Zap, Mail, Lock, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Verificar si ya hay sesión
  useEffect(() => {
    if (status === "authenticated") {
      // Redirigir al home principal (que maneja la lógica de workspace/onboarding)
      router.push("/");
    }
  }, [status, router]);

  // Leer el error de la URL
  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam === "CredentialsSignin") {
      setError("Correo electrónico o contraseña incorrectos. Por favor, verifica tus datos e inténtalo de nuevo.");
    } else if (errorParam) {
      setError("Ocurrió un error inesperado al iniciar sesión.");
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        setError("Correo electrónico o contraseña incorrectos. Por favor, verifica tus datos e inténtalo de nuevo.");
        setIsLoading(false);
      } else {
        // El useEffect detectará el cambio de sesión y redirigirá
        // No hacemos router.push aquí para evitar conflictos
      }
    } catch (err) {
      setError("Ocurrió un error de conexión. Inténtalo más tarde.");
      setIsLoading(false);
    }
  };

  // No renderizar si está cargando la sesión
  if (status === "loading") {
    return (
      <div className="min-h-screen w-full bg-[#06080F] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-3 border-cyan-400 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#06080F] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-white/[0.08] rounded-3xl p-8 shadow-2xl">
        {/* Logo / Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-cyan-500 flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/20">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Bienvenido de nuevo</h1>
          <p className="text-sm text-slate-400 mt-1">Ingresa tus credenciales para acceder</p>
        </div>

        {/* Mensaje de Error */}
        {error && (
          <div className="mb-6 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs font-medium text-rose-300 leading-relaxed">
              {error}
            </p>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider ml-1">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nombre@ejemplo.com"
                className="w-full bg-slate-950/50 border border-white/[0.08] rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between ml-1">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Contraseña
              </label>
              <a href="#" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
                ¿Olvidaste tu contraseña?
              </a>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950/50 border border-white/[0.08] rounded-xl py-3 pl-10 pr-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold py-3.5 rounded-xl transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Verificando...</span>
              </>
            ) : (
              <span>Iniciar Sesión</span>
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-xs text-slate-500 mt-8">
          ¿No tienes una cuenta?{" "}
          <a href="/register" className="font-bold text-indigo-400 hover:text-indigo-300 transition-colors">
            Regístrate aquí
          </a>
        </p>
      </div>
    </div>
  );
}