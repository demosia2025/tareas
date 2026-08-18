"use client";

import { useState, useEffect } from "react";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([
    { id: "1", name: "Super Administrador", email: "superadmin@projects-saas.com", role: "super_admin" }
  ]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [newPassword, setNewPassword] = useState("");

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });

      if (res.ok) {
        alert("Contraseña actualizada exitosamente vía API");
        setSelectedUser(null);
        setNewPassword("");
      } else {
        alert("Error al actualizar la contraseña");
      }
    } catch (err) {
      console.error(err);
      alert("Error de red");
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto text-white">
      <h1 className="text-2xl font-bold mb-2">👥 Gestión de Contraseñas de Usuarios</h1>
      <p className="text-gray-400 text-sm mb-6">Modifica credenciales, correos y contraseñas de los usuarios de tu organización.</p>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-800 text-xs text-gray-400 uppercase bg-gray-950/50">
              <th className="p-4">Usuario ID / Nombre</th>
              <th className="p-4">Correo</th>
              <th className="p-4">Rol</th>
              <th className="p-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800 text-sm">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-800/50">
                <td className="p-4">
                  <div className="font-medium">{u.name}</div>
                  <div className="text-xs font-mono text-gray-500">ID: {u.id}</div>
                </td>
                <td className="p-4 text-gray-300">{u.email}</td>
                <td className="p-4">
                  <span className="text-[10px] uppercase font-bold bg-indigo-950 border border-indigo-800 px-2 py-0.5 rounded text-indigo-300">
                    {u.role}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => setSelectedUser(u)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded text-xs font-medium transition-colors"
                  >
                    Modificar Credenciales
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedUser && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold mb-1">Actualizar Credenciales</h3>
            <p className="text-xs text-gray-400 mb-4">Editando a: <span className="text-white font-medium">{selectedUser.name}</span></p>

            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Nueva Contraseña (Bcrypt en Servidor)</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-sm font-medium rounded-md transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-sm font-medium rounded-md transition-colors"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}