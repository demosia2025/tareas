"use client";

interface CustomField {
  id: string;
  name: string;
  type: "text" | "number" | "select" | "date" | "checkbox";
  options?: string[];
}

interface CustomFieldRendererProps {
  field: CustomField;
  value: any;
  onChange: (fieldId: string, value: any) => void;
}

export function CustomFieldRenderer({ field, value, onChange }: CustomFieldRendererProps) {
  // ✅ PROTECCIÓN: Si no se pasa el campo, no renderiza nada (evita el error "Cannot read properties of undefined")
  if (!field) {
    return null;
  }

  switch (field.type) {
    case "text":
      return (
        <input
          type="text"
          value={value || ""}
          onChange={(e) => onChange(field.id, e.target.value)}
          className="w-full bg-slate-950/50 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 placeholder-slate-500"
          placeholder="Texto..."
        />
      );
    case "number":
      return (
        <input
          type="number"
          value={value || ""}
          onChange={(e) => onChange(field.id, e.target.value)}
          className="w-full bg-slate-950/50 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 placeholder-slate-500"
          placeholder="0"
        />
      );
    case "select":
      return (
        <select
          value={value || ""}
          onChange={(e) => onChange(field.id, e.target.value)}
          className="w-full bg-slate-950/50 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 appearance-none cursor-pointer"
        >
          <option value="">Seleccionar...</option>
          {field.options?.map((opt, index) => (
            <option key={index} value={opt}>{opt}</option>
          ))}
        </select>
      );
    case "date":
      return (
        <input
          type="date"
          value={value || ""}
          onChange={(e) => onChange(field.id, e.target.value)}
          className="w-full bg-slate-950/50 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
        />
      );
    case "checkbox":
      return (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(field.id, e.target.checked)}
            className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500/50"
          />
          <span className="text-sm text-slate-400">Marcar</span>
        </div>
      );
    default:
      return null;
  }
}