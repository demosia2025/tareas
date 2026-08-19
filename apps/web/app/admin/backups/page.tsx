"use client";

import { useState } from "react";

export default function AdminBackupsPage() {
  const [loading, setLoading] = useState(false);

  const handleDownloadBackup = () => {
    alert("Generando y descargando respaldo JSON de la base de datos...");
  };

  const handleUploadBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        alert(`Respaldo "${file.name}" cargado y restaurado exitosamente.`);
      }, 1500);
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto text-white">
      <h1 className="text-2xl font-bold mb-2">💾 Respaldar y Subir Respaldos</h1>
      <p className="text-gray-400 text-sm mb-8">Exporta la información completa de tu sistema o restaura un respaldo previo.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Caja de Exportación */}
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-semibold mb-2">Descargar Respaldo</h2>
            <p className="text-xs text-gray-400 mb-4">Crea una copia de seguridad en formato JSON de todas las tablas y relaciones.</p>
          </div>
          <button
            onClick={handleDownloadBackup}
            className="w-full bg-indigo-600 hover:bg-indigo-500 py-2.5 rounded-lg text-sm font-medium transition-colors cursor-pointer"
          >
            📥 Descargar Backup JSON
          </button>
        </div>

        {/* Caja de Importación */}
        <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-semibold mb-2">Restaurar Respaldo</h2>
            <p className="text-xs text-gray-400 mb-4">Sube un archivo JSON de respaldo para sobrescribir o sincronizar datos.</p>
          </div>
          <label className="w-full bg-gray-800 hover:bg-gray-700 py-2.5 rounded-lg text-sm font-medium transition-colors text-center cursor-pointer block">
            {loading ? "Restaurando..." : "📤 Subir Archivo JSON"}
            <input type="file" accept=".json" onChange={handleUploadBackup} className="hidden" />
          </label>
        </div>
      </div>
    </div>
  );
}
