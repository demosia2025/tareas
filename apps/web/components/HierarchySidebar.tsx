"use client"

import { useState, useEffect } from "react"

interface HierarchySidebarProps {
  workspaceId: string
  onListSelect: (list: { id: string; name: string; spaceId: string; folderId?: string }) => void
}

interface Space {
  id: string
  name: string
  icon?: string | null
  color?: string | null
  folders?: FolderData[]
  lists?: ListData[]
}

interface FolderData {
  id: string
  name: string
  icon?: string | null
  color?: string | null
  lists?: ListData[]
}

interface ListData {
  id: string
  name: string
  icon?: string | null
  color?: string | null
  _count?: { tasks: number }
}

export function HierarchySidebar({ workspaceId, onListSelect }: HierarchySidebarProps) {
  const [spaces, setSpaces] = useState<Space[]>([])
  const [expandedSpaces, setExpandedSpaces] = useState<Set<string>>(new Set())
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [showCreateSpace, setShowCreateSpace] = useState(false)
  const [newSpaceName, setNewSpaceName] = useState("")

  useEffect(() => {
    fetchHierarchy()
  }, [workspaceId])

  const fetchHierarchy = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/workspace/${workspaceId}/hierarchy`)
      if (response.ok) {
        const data = await response.json()
        setSpaces(data)
        // Expandir el primer space por defecto
        if (data.length > 0) {
          setExpandedSpaces(new Set([data[0].id]))
        }
      }
    } catch (error) {
      console.error("Error cargando jerarquía:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSpace = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSpaceName.trim()) return

    try {
      const response = await fetch("/api/admin/spaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSpaceName,
          workspaceId: workspaceId,
          slug: newSpaceName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          description: "",
          icon: "",
          color: "#8b5cf6"
        }),
      })

      if (response.ok) {
        await fetchHierarchy()
        setNewSpaceName("")
        setShowCreateSpace(false)
      }
    } catch (error) {
      console.error("Error creando space:", error)
    }
  }

  const toggleSpace = (spaceId: string) => {
    const newExpanded = new Set(expandedSpaces)
    if (newExpanded.has(spaceId)) {
      newExpanded.delete(spaceId)
    } else {
      newExpanded.add(spaceId)
    }
    setExpandedSpaces(newExpanded)
  }

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId)
    } else {
      newExpanded.add(folderId)
    }
    setExpandedFolders(newExpanded)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-4">
        <div className="animate-spin rounded-full h-5 w-5 border-2 border-cyan-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="h-full bg-slate-900/50 flex flex-col">
      <div className="p-3 border-b border-slate-800">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Espacios</span>
          <button 
            onClick={() => setShowCreateSpace(true)}
            className="p-1 text-slate-500 hover:text-cyan-400 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        <div className="space-y-0.5">
          {spaces.map((space) => (
            <div key={space.id}>
              {/* Space Header */}
              <button
                onClick={() => toggleSpace(space.id)}
                className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-800/50 transition-colors group"
              >
                {expandedSpaces.has(space.id) ? (
                  <svg className="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: space.color || '#06b6d4' }}></span>
                <span className="flex-1 text-sm text-slate-300 text-left group-hover:text-white truncate font-medium">
                  {space.name}
                </span>
              </button>

              {/* Space Content */}
              {expandedSpaces.has(space.id) && (
                <div className="ml-4">
                  {/* Folders */}
                  {space.folders?.map((folder) => (
                    <div key={folder.id}>
                      <button
                        onClick={() => toggleFolder(folder.id)}
                        className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-800/50 transition-colors group"
                      >
                        {expandedFolders.has(folder.id) ? (
                          <svg className="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        ) : (
                          <svg className="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        )}
                        <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                        </svg>
                        <span className="flex-1 text-sm text-slate-400 text-left group-hover:text-slate-200 truncate">
                          {folder.name}
                        </span>
                      </button>

                      {/* Folder Lists */}
                      {expandedFolders.has(folder.id) && folder.lists && (
                        <div className="ml-6 space-y-0.5">
                          {folder.lists.map((list) => (
                            <button
                              key={list.id}
                              onClick={() => onListSelect({ id: list.id, name: list.name, spaceId: space.id, folderId: folder.id })}
                              className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-800/50 transition-colors group"
                            >
                              <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                              </svg>
                              <span className="flex-1 text-sm text-slate-400 text-left group-hover:text-slate-200 truncate">
                                {list.name}
                              </span>
                              <span className="text-xs text-slate-600 bg-slate-800 px-1.5 py-0.5 rounded">
                                {list._count?.tasks || 0}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Space Lists (sin folder) */}
                  {space.lists?.map((list) => (
                    <button
                      key={list.id}
                      onClick={() => onListSelect({ id: list.id, name: list.name, spaceId: space.id })}
                      className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-800/50 transition-colors group ml-4"
                    >
                      <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                      </svg>
                      <span className="flex-1 text-sm text-slate-400 text-left group-hover:text-slate-200 truncate">
                        {list.name}
                      </span>
                      <span className="text-xs text-slate-600 bg-slate-800 px-1.5 py-0.5 rounded">
                        {list._count?.tasks || 0}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Modal Crear Space */}
      {showCreateSpace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">Crear Nuevo Espacio</h3>
            <form onSubmit={handleCreateSpace}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-400 mb-2">Nombre</label>
                <input
                  type="text"
                  value={newSpaceName}
                  onChange={(e) => setNewSpaceName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
                  placeholder="Nombre del espacio"
                  autoFocus
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateSpace(false)}
                  className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition-colors"
                >
                  Crear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}