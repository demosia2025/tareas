export default function AdminBackupsPage() {
  return (
    <div className="p-8 text-white">
      <h1 className="text-2xl font-bold mb-4">💾 Respaldar y Subir Respaldos</h1>
      <p className="text-gray-400 mb-6">Genera un respaldo completo en JSON o carga un archivo previo.</p>
      
      <div className="flex gap-4">
        <button 
          onClick={() => alert("Descargando respaldo...")}
          className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-md font-medium text-sm"
        >
          📥 Descargar Respaldo JSON
        </button>
        <button 
          onClick={() => alert("Selecciona archivo para restaurar...")}
          className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-md font-medium text-sm"
        >
          📤 Subir / Restaurar Respaldo
        </button>
      </div>
    </div>
  );
}