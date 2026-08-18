"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

interface AdminMenuProps {
  userRole: string;
  isSuperAdmin: boolean;
}

export default function AdminMenuDropdown({ userRole, isSuperAdmin }: AdminMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Cerrar el menú al hacer clic fuera de él
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-700/60 px-3.5 py-1.5 rounded-lg text-xs font-medium text-indigo-200 transition-all shadow-sm focus:outline-none cursor-pointer"
      >
        <span>⚙️ Panel {isSuperAdmin ? "Super Admin" : "Admin"}</span>
        <span className="text-[10px] uppercase tracking-wider bg-indigo-900/80 px-2 py-0.5 rounded text-indigo-300 font-bold">
          {userRole}
        </span>
        <span className="text-[10px] ml-1">▼</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl py-2 z-50 text-white backdrop-blur-xl">
          <div className="px-4 py-2 border-b border-gray-800 text-xs text-gray-400">
            Nivel de Acceso: <span className="font-semibold text-indigo-400 uppercase">{userRole}</span>
          </div>

          {/* Opciones exclusivas de Super Administrador */}
          {isSuperAdmin && (
            <div className="py-1">
              <div className="px-4 py-1 text-[10px] uppercase tracking-wider text-gray-500 font-bold">
                Super Administrador
              </div>
              <Link
                href="/admin/organizations"
                onClick={() => setIsOpen(false)}
                className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
              >
                🏢 Gestionar Organizaciones
              </Link>
              <Link
                href="/admin/backups"
                onClick={() => setIsOpen(false)}
                className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
              >
                💾 Respaldar y Subir Respaldos
              </Link>
            </div>
          )}

          {/* Opciones de Administración (Admin y Super Admin) */}
          <div className="py-1 border-t border-gray-800/60">
            <div className="px-4 py-1 text-[10px] uppercase tracking-wider text-gray-500 font-bold mt-1">
              Gestión Operativa
            </div>
            <Link
              href="/admin/workspaces"
              onClick={() => setIsOpen(false)}
              className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            >
              📁 Cambiar Workspaces (Organizaciones)
            </Link>
            <Link
              href="/admin/users"
              onClick={() => setIsOpen(false)}
              className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
            >
              👥 Gestionar Contraseñas de Usuarios
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}