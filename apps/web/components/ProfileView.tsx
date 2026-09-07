"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { User, Mail, Shield, Calendar, Edit3, Save, X, Lock, CheckCircle } from "lucide-react";

export default function ProfileView() {
  const { data: session, update } = useSession();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: session?.user?.name || "",
    email: session?.user?.email || "",
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        await update();
        setMessage({ type: "success", text: "Perfil actualizado correctamente" });
        setIsEditing(false);
        setTimeout(() => setMessage(null), 3000);
      } else {
        const err = await res.json();
        setMessage({ type: "error", text: err.error || "Error al actualizar perfil" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error de conexión" });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: "error", text: "Las contraseñas no coinciden" });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/user/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Contraseña actualizada correctamente" });
        setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
        setShowPasswordForm(false);
        setTimeout(() => setMessage(null), 3000);
      } else {
        const err = await res.json();
        setMessage({ type: "error", text: err.error || "Error al cambiar contraseña" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error de conexión" });
    } finally {
      setSaving(false);
    }
  };

  const getRoleBadge = (role: string) => {
    const roles: Record<string, { label: string; color: string }> = {
      superadmin: { label: "Super Admin", color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
      admin: { label: "Administrador", color: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" },
      user: { label: "Usuario", color: "bg-slate-700/50 text-slate-300 border-slate-700" },
    };
    const roleInfo = roles[role?.toLowerCase()] || roles.user;
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${roleInfo.color}`}>
        <Shield className="w-3 h-3 mr-1.5" />
        {roleInfo.label}
      </span>
    );
  };

  // ✅ CORREGIDO: Type assertion para acceder a propiedades extendidas del usuario
  const userExtended = session?.user as any;

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Mi Perfil</h1>
          <p className="text-sm text-slate-400 mt-1">Gestiona tu información personal y seguridad</p>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-xl border flex items-center gap-3 ${
            message.type === "success" 
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
              : "bg-rose-500/10 border-rose-500/30 text-rose-400"
          }`}>
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm font-medium">{message.text}</span>
          </div>
        )}

        {/* Información del Perfil */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <User className="w-5 h-5 text-cyan-400" />
              Información Personal
            </h2>
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-xl text-xs font-semibold text-cyan-400 transition-colors"
              >
                <Edit3 className="w-4 h-4" />
                Editar
              </button>
            ) : (
              <button
                onClick={() => setIsEditing(false)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-300 transition-colors"
              >
                <X className="w-4 h-4" />
                Cancelar
              </button>
            )}
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">Nombre</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/50"
                    required
                  />
                ) : (
                  <div className="bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white">
                    {session?.user?.name}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">Email</label>
                {isEditing ? (
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/50"
                    required
                  />
                ) : (
                  <div className="bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-500" />
                    {session?.user?.email}
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2">Rol</label>
              <div className="bg-slate-950/50 border border-slate-800 rounded-xl px-4 py-2.5">
                {getRoleBadge((session?.user as any)?.role || "user")}
              </div>
            </div>

            {isEditing && (
              <div className="flex justify-end pt-4 border-t border-slate-800">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-cyan-500/25 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Seguridad */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-cyan-400" />
              Seguridad
            </h2>
            {!showPasswordForm ? (
              <button
                onClick={() => setShowPasswordForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-xl text-xs font-semibold text-cyan-400 transition-colors"
              >
                <Lock className="w-4 h-4" />
                Cambiar Contraseña
              </button>
            ) : (
              <button
                onClick={() => setShowPasswordForm(false)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-300 transition-colors"
              >
                <X className="w-4 h-4" />
                Cancelar
              </button>
            )}
          </div>

          {showPasswordForm && (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">Contraseña Actual</label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/50"
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2">Nueva Contraseña</label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/50"
                    required
                    minLength={6}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-2">Confirmar Nueva Contraseña</label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500/50"
                    required
                    minLength={6}
                  />
                </div>
              </div>
              <div className="flex justify-end pt-4 border-t border-slate-800">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-cyan-500/25 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? "Guardando..." : "Actualizar Contraseña"}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Información de Cuenta */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 mt-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-cyan-400" />
            Información de la Cuenta
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-400 mb-1">Miembro desde</p>
              <p className="text-sm text-white font-semibold">
                {userExtended?.createdAt 
                  ? new Date(userExtended.createdAt).toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric" })
                  : "No disponible"}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400 mb-1">Última conexión</p>
              <p className="text-sm text-white font-semibold">
                {userExtended?.lastSeen 
                  ? new Date(userExtended.lastSeen).toLocaleDateString("es-ES", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })
                  : "No disponible"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}