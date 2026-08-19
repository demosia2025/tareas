"use client"

import { useState, useEffect } from "react"

interface OrganizationModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  organization?: {
    id: string
    name: string
    slug: string
    description?: string | null
    plan?: string
  } | null
}

export default function OrganizationModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  organization 
}: OrganizationModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    plan: "free"
  })

  useEffect(() => {
    if (organization) {
      setFormData({
        name: organization.name || "",
        slug: organization.slug || "",
        description: organization.description || "",
        plan: organization.plan || "free"
      })
    } else {
      setFormData({
        name: "",
        slug: "",
        description: "",
        plan: "free"
      })
    }
  }, [organization, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = organization 
        ? `/api/admin/organizations?id=${organization.id}`
        : "/api/admin/organizations"
      
      const method = organization ? "PATCH" : "POST"

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        onSuccess()
        onClose()
      } else {
        const error = await response.json()
        alert(error.error || "Error al guardar organización")
      }
    } catch (error) {
      console.error("Error:", error)
      alert("Error al guardar organización")
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg shadow-2xl">
        <div className="p-6">
          <h2 className="text-xl font-bold text-white mb-6">
            {organization ? "Editar Organización" : "Crear Organización"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nombre */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Nombre
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20"
                placeholder="Nombre de la organización"
                required
              />
            </div>

            {/* Slug */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Slug
              </label>
              <input
                type="text"
                value={formData.slug}
                onChange={(e) => {
                  const value = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                  setFormData({ ...formData, slug: value })
                }}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20"
                placeholder="nombre-organizacion"
                required
              />
              <p className="text-xs text-slate-500 mt-1">
                URL amigable (minúsculas, sin espacios)
              </p>
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Descripción
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 resize-none"
                placeholder="Descripción de la organización..."
              />
            </div>

            {/* Plan */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Plan
              </label>
              <select
                value={formData.plan}
                onChange={(e) => setFormData({ ...formData, plan: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20"
              >
                <option value="free">Gratis</option>
                <option value="pro">Pro</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>

            {/* Botones */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Guardando..." : (organization ? "Actualizar" : "Crear")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
