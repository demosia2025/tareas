"use client";

import { useState, useEffect } from "react";

export default function AdminOrganizationsPage() {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newOrgName, setNewOrgName] = useState("");

  useEffect(() => {
    // Aquí puedes conectar a tu API de organizaciones si la tienes creada
    setLoading(false);
  }, []);

  return (
    <div className="p-8 max-w-4xl mx-auto text-white">
      <h1 className="text-2xl font-bold mb-2">🏢 Gestión de Organizaciones</h1>
      <p className="text-gray-400 text-sm mb-6">Administra las organizaciones del sistema (Solo Super Admin).</p>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden p-6">
        <p className="text-sm text-gray-300">Panel de control de organizaciones conectado y listo para interactuar.</p>
      </div>
    </div>
  );
}
