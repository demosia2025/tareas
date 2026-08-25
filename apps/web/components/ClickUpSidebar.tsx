"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronRight, ChevronDown, Folder, List, Plus, Zap, Trash2, Edit2, FolderPlus, Sparkles } from "lucide-react";

interface ClickUpSidebarProps {
  workspaceId: string;
  organizationName?: string;
  onSelectList: (list: { id: string; name: string; spaceId: string; folderId?: string }) => void;
  onOpenFolderModal?: (spaceId: string) => void;
  currentUser?: { id?: string; role?: string };
  refreshKey?: number;
}

interface Space {
  id: string;
  name: string;
  createdById?: string | null;
  folders?: FolderData[];
  lists?: ListData[];
}

interface FolderData {
  id: string;
  name: string;
  createdById?: string | null;
  lists?: ListData[];
}

interface ListData {
  id: string;
  name: string;
  createdById?: string | null;
  _count?: { tasks: number };
  folderId?: string | null;
}

export function ClickUpSidebar({ 
  workspaceId, 
  organizationName: propOrgName, 
  onSelectList, 
  onOpenFolderModal,
  currentUser,
  refreshKey = 0
}: ClickUpSidebarProps) {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [organizationName, setOrganizationName] = useState<string>(propOrgName || "Mi Organización");
  const [expandedSpaces, setExpandedSpaces] = useState<Set<string>>(new Set());
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showCreateSpace, setShowCreateSpace] = useState(false);
  const [newSpaceName, setNewSpaceName] = useState("");

  const [activeSpaceForList, setActiveSpaceForList] = useState<string | null>(null);
  const [newListName, setNewListName] = useState("");

  const [activeSpaceForFolder, setActiveSpaceForFolder] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");

  const [activeFolderForList, setActiveFolderForList] = useState<string | null>(null);

  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editingListName, setEditingListName] = useState("");

  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState("");

  const createSpaceModalRef = useRef<HTMLDivElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const listInputRef = useRef<HTMLInputElement>(null);
  const folderListInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (workspaceId) {
      fetchHierarchy();
    }
  }, [workspaceId, refreshKey]);

  useEffect(() => {
    if (propOrgName) {
      setOrganizationName(propOrgName);
    }
  }, [propOrgName]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showCreateSpace) {
          setShowCreateSpace(false);
          setNewSpaceName("");
          return;
        }
        if (activeSpaceForFolder) {
          setActiveSpaceForFolder(null);
          setNewFolderName("");
          return;
        }
        if (activeSpaceForList) {
          setActiveSpaceForList(null);
          setNewListName("");
          return;
        }
        if (activeFolderForList) {
          setActiveFolderForList(null);
          setNewListName("");
          return;
        }
        if (editingFolderId) {
          setEditingFolderId(null);
          setEditingFolderName("");
          return;
        }
        if (editingListId) {
          setEditingListId(null);
          setEditingListName("");
          return;
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showCreateSpace, activeSpaceForFolder, activeSpaceForList, activeFolderForList, editingFolderId, editingListId]);

  useEffect(() => {
    if (!showCreateSpace) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (createSpaceModalRef.current && !createSpaceModalRef.current.contains(e.target as Node)) {
        setShowCreateSpace(false);
        setNewSpaceName("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showCreateSpace]);

  useEffect(() => {
    const handleClickOutsideInline = (e: MouseEvent) => {
      const target = e.target as Node;
      
      if (activeSpaceForFolder && folderInputRef.current && !folderInputRef.current.contains(target)) {
        setActiveSpaceForFolder(null);
        setNewFolderName("");
      }
      
      if (activeSpaceForList && listInputRef.current && !listInputRef.current.contains(target)) {
        setActiveSpaceForList(null);
        setNewListName("");
      }
      
      if (activeFolderForList && folderListInputRef.current && !folderListInputRef.current.contains(target)) {
        setActiveFolderForList(null);
        setNewListName("");
      }
    };

    document.addEventListener("mousedown", handleClickOutsideInline);
    return () => document.removeEventListener("mousedown", handleClickOutsideInline);
  }, [activeSpaceForFolder, activeSpaceForList, activeFolderForList]);

  const fetchHierarchy = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/workspace/${workspaceId}/hierarchy`);
      if (response.ok) {
        const data = await response.json();
        setSpaces(data);
      }
    } catch (error) {
      console.error("Error al sincronizar la estructura:", error);
    } finally {
      setLoading(false);
    }
  };

  const canModifyItem = (createdById?: string | null) => {
    const role = currentUser?.role?.toLowerCase() || "";
    const isAdminOrSuper = role === "admin" || role === "superadmin";
    const isCreator = currentUser?.id && createdById === currentUser.id;
    return isAdminOrSuper || isCreator || !createdById;
  };

  const handleDeleteSpace = async (spaceId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("¿Deseas retirar este espacio junto con todos sus elementos asociados?")) return;
    try {
      const response = await fetch(`/api/spaces?id=${spaceId}`, { method: "DELETE" });
      if (response.ok) fetchHierarchy();
      else {
        const data = await response.json();
        alert(data.error || "No posees los permisos necesarios para retirar este espacio.");
      }
    } catch (error) {
      console.error("Error al procesar la solicitud:", error);
    }
  };

  const handleDeleteList = async (listId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("¿Deseas retirar esta lista de manera definitiva?")) return;
    try {
      const response = await fetch(`/api/lists?id=${listId}`, { method: "DELETE" });
      if (response.ok) fetchHierarchy();
      else {
        const data = await response.json();
        alert(data.error || "No posees los permisos necesarios para retirar esta lista.");
      }
    } catch (error) {
      console.error("Error al procesar la solicitud:", error);
    }
  };

  const handleDeleteFolder = async (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("¿Deseas retirar esta carpeta?")) return;
    try {
      const response = await fetch(`/api/folders?id=${folderId}`, { method: "DELETE" });
      if (response.ok) fetchHierarchy();
      else {
        const data = await response.json();
        alert(data.error || "No fue posible completar la acción.");
      }
    } catch (error) {
      console.error("Error al procesar la solicitud:", error);
    }
  };

  const handleUpdateList = async (listId: string) => {
    if (!editingListName.trim()) {
      setEditingListId(null);
      return;
    }
    try {
      const response = await fetch(`/api/lists`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: listId, name: editingListName.trim() }),
      });
      if (response.ok) {
        setEditingListId(null);
        setEditingListName("");
        fetchHierarchy();
      } else {
        const data = await response.json();
        alert(data.error || "No posees los permisos necesarios para modificar esta lista.");
      }
    } catch (error) {
      console.error("Error al actualizar la lista:", error);
    }
  };

  const handleUpdateFolder = async (folderId: string) => {
    if (!editingFolderName.trim()) {
      setEditingFolderId(null);
      return;
    }
    try {
      const response = await fetch(`/api/folders`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: folderId, name: editingFolderName.trim() }),
      });
      if (response.ok) {
        setEditingFolderId(null);
        setEditingFolderName("");
        fetchHierarchy();
      } else {
        const data = await response.json();
        alert(data.error || "No fue posible actualizar la carpeta.");
      }
    } catch (error) {
      console.error("Error al actualizar la carpeta:", error);
    }
  };

  const handleCreateSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSpaceName.trim()) return;
    try {
      const spaceResponse = await fetch("/api/spaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newSpaceName, workspaceId: workspaceId }),
      });
      
      if (spaceResponse.ok) {
        const createdSpace = await spaceResponse.json();
        await fetchHierarchy();
        setNewSpaceName("");
        setShowCreateSpace(false);
        setExpandedSpaces(prev => new Set(prev).add(createdSpace.id));
      } else {
        const errData = await spaceResponse.json().catch(() => ({}));
        alert(errData.error || "No se pudo configurar el nuevo espacio.");
      }
    } catch (error) {
      console.error("Error al configurar el espacio:", error);
    }
  };

  const handleCreateListInSpace = async (spaceId: string) => {
    if (!newListName.trim()) {
      setActiveSpaceForList(null);
      return;
    }
    const nameToSubmit = newListName.trim();
    setNewListName("");
    setActiveSpaceForList(null);
    try {
      const response = await fetch("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameToSubmit, spaceId: spaceId, workspaceId: workspaceId }),
      });
      if (response.ok) {
        const createdList = await response.json();
        await fetchHierarchy();
        onSelectList({ id: createdList.id, name: createdList.name, spaceId });
      }
    } catch (error) {
      console.error("Error al crear la lista:", error);
    }
  };

  const handleCreateListInFolder = async (spaceId: string, folderId: string) => {
    if (!newListName.trim()) {
      setActiveFolderForList(null);
      return;
    }
    const nameToSubmit = newListName.trim();
    setNewListName("");
    setActiveFolderForList(null);
    try {
      const response = await fetch("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: nameToSubmit, spaceId: spaceId, workspaceId: workspaceId, folderId: folderId }),
      });
      if (response.ok) {
        const createdList = await response.json();
        await fetchHierarchy();
        onSelectList({ id: createdList.id, name: createdList.name, spaceId, folderId });
      }
    } catch (error) {
      console.error("Error al crear la lista en la carpeta:", error);
    }
  };

  const handleCreateFolderInSpace = async (spaceId: string) => {
    if (!newFolderName.trim()) {
      setActiveSpaceForFolder(null);
      return;
    }

    if (!workspaceId || !spaceId) {
      alert("Aviso: Información incompleta para procesar la acción.");
      setActiveSpaceForFolder(null);
      return;
    }

    const nameToSubmit = newFolderName.trim();
    setNewFolderName("");
    setActiveSpaceForFolder(null);

    try {
      const response = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nameToSubmit,
          spaceId: spaceId,
          workspaceId: workspaceId,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        await fetchHierarchy();
        setExpandedSpaces(prev => new Set(prev).add(spaceId));
      } else {
        alert(`Aviso: ${data.error || "No se pudo registrar la carpeta."}`);
      }
    } catch (error) {
      console.error("Error de conexión:", error);
      alert("No se pudo establecer conexión para completar la acción.");
    }
  };

  const toggleSpace = (spaceId: string) => {
    const newExpanded = new Set(expandedSpaces);
    newExpanded.has(spaceId) ? newExpanded.delete(spaceId) : newExpanded.add(spaceId);
    setExpandedSpaces(newExpanded);
  };

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    newExpanded.has(folderId) ? newExpanded.delete(folderId) : newExpanded.add(folderId);
    setExpandedFolders(newExpanded);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-4 bg-slate-950">
        <div className="relative">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-400 border-t-transparent shadow-[0_0_15px_rgba(6,182,212,0.8)]" />
          <div className="absolute inset-0 rounded-full animate-ping bg-cyan-400/20" />
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Inyección de CSS y Keyframes personalizados para transiciones fluidas y efectos de luz */}
      <style jsx global>{`
        @keyframes customSlideDown {
          from {
            opacity: 0;
            transform: translateY(-8px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        @keyframes customPulseGlow {
          0%, 100% {
            box-shadow: 0 0 15px rgba(6, 182, 212, 0.2);
          }
          50% {
            box-shadow: 0 0 25px rgba(6, 182, 212, 0.4);
          }
        }

        @keyframes twinkle {
          0%, 100% {
            opacity: 0.2;
            transform: scale(0.8);
          }
          50% {
            opacity: 1;
            transform: scale(1.2);
          }
        }

        .animate-custom-slide {
          animation: customSlideDown 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .sidebar-tree-collapse {
          display: grid;
          grid-template-rows: 0fr;
          transition: grid-template-rows 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease-in-out;
          opacity: 0;
        }

        .sidebar-tree-collapse.expanded {
          grid-template-rows: 1fr;
          opacity: 1;
        }

        .sidebar-tree-content {
          overflow: hidden;
        }
      `}</style>

      <div className="h-full bg-[#05070c] backdrop-blur-xl border-r border-slate-800/80 flex flex-col text-slate-200 select-none shadow-[5px_0_30px_rgba(0,0,0,0.6)]">
        {/* Cabecera estilo píldora de lujo */}
        <div className="p-3 border-b border-slate-800/60 bg-gradient-to-b from-slate-900/60 to-transparent">
          <div className="relative group flex items-center gap-2.5 bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-slate-950 p-2.5 rounded-2xl border border-slate-700/60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15),0_4px_20px_rgba(0,0,0,0.5)] overflow-hidden transition-all duration-300 hover:border-cyan-500/40 hover:shadow-[0_0_20px_rgba(6,182,212,0.2)]">
            {/* Destello de luz superior tipo cristal */}
            <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400/60 to-transparent" />
            
            {/* Botón del agente IA con destellos de estrellas integrados */}
            <div className="relative w-7 h-7 rounded-xl bg-gradient-to-br from-cyan-400 via-cyan-500 to-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.5)] flex-shrink-0 border border-cyan-300/30 transition-transform duration-300 group-hover:scale-105 overflow-visible">
              {/* Destellos de estrellas alrededor / dentro del icono */}
              <span className="absolute -top-1 -left-1 w-1.5 h-1.5 bg-white rounded-full animate-[twinkle_1.5s_infinite_ease-in-out] shadow-[0_0_6px_#fff]" />
              <span className="absolute -bottom-1 -right-1 w-1 h-1 bg-cyan-200 rounded-full animate-[twinkle_2s_infinite_ease-in-out_0.5s] shadow-[0_0_4px_#38bdf8]" />
              <span className="absolute -top-0.5 right-0 w-1 h-1 bg-white rounded-full animate-[twinkle_1s_infinite_ease-in-out_0.2s]" />

              <Zap className="w-3.5 h-3.5 text-white drop-shadow relative z-10" />
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="text-xs font-semibold text-slate-100 truncate tracking-wide flex items-center gap-1.5">
                Mi Workspace <Sparkles className="w-3 h-3 text-cyan-400 animate-pulse" />
              </h2>
              <p className="text-[11px] text-cyan-300/80 truncate font-medium">{organizationName}</p>
            </div>
          </div>
        </div>

        {/* Contenedor principal de la jerarquía */}
        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-3.5 scrollbar-thin scrollbar-thumb-slate-800">
          <div className="px-2 flex items-center justify-between">
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">Espacios</span>
            <button 
              onClick={() => setShowCreateSpace(true)}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white bg-slate-900/80 hover:bg-cyan-500/20 border border-slate-800 hover:border-cyan-500/40 transition-all duration-200 active:scale-95 shadow-sm hover:shadow-[0_0_12px_rgba(6,182,212,0.3)]"
              title="Crear Espacio"
            >
              <Plus className="w-3.5 h-3.5 transition-transform duration-200 hover:rotate-90" />
            </button>
          </div>

          <div className="space-y-1.5">
            {spaces.map((space) => {
              const isSpaceExpanded = expandedSpaces.has(space.id);

              return (
                <div key={space.id} className="space-y-1">
                  {/* Espacio con estilo de placa metálica/cristal brillante */}
                  <div className="group/space relative rounded-xl bg-gradient-to-r from-slate-900/60 to-slate-950/40 hover:from-cyan-950/40 hover:via-slate-900/70 hover:to-slate-950 border border-slate-800/80 hover:border-cyan-500/40 shadow-[0_2px_10px_rgba(0,0,0,0.3)] hover:shadow-[0_0_20px_rgba(6,182,212,0.15)] transition-all duration-300 overflow-hidden">
                    <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-white/15 to-transparent opacity-0 group-hover/space:opacity-100 transition-opacity" />
                    
                    <div className="flex items-center">
                      <button onClick={() => toggleSpace(space.id)} className="flex-1 flex items-center gap-2 px-2.5 py-2 text-left">
                        <ChevronDown className={`w-3.5 h-3.5 text-cyan-400 flex-shrink-0 transition-transform duration-300 ${isSpaceExpanded ? 'rotate-0' : '-rotate-90 text-slate-400'}`} />
                        <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)] flex-shrink-0 transition-all duration-300 group-hover/space:scale-125"></div>
                        <span className="flex-1 text-xs font-semibold text-slate-200 truncate group-hover/space:text-cyan-100 transition-colors">{space.name}</span>
                      </button>
                      
                      {/* Acciones flotantes del Espacio */}
                      <div className="opacity-80 sm:opacity-0 group-hover/space:opacity-100 flex items-center gap-0.5 mr-1.5 transition-all duration-200">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveSpaceForFolder(space.id);
                            setActiveSpaceForList(null);
                            setNewFolderName("");
                            setExpandedSpaces(prev => new Set(prev).add(space.id));
                          }}
                          className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-800/80 rounded-lg transition-all active:scale-95"
                          title="Añadir carpeta"
                        >
                          <FolderPlus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveSpaceForList(space.id);
                            setActiveSpaceForFolder(null);
                            setNewListName("");
                            setExpandedSpaces(prev => new Set(prev).add(space.id));
                          }}
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-lg transition-all active:scale-95"
                          title="Añadir lista"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        {canModifyItem(space.createdById) && (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteSpace(space.id, e)}
                            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 rounded-lg transition-all active:scale-95"
                            title="Eliminar espacio"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Input crear carpeta en espacio con animación personalizada */}
                  {activeSpaceForFolder === space.id && (
                    <div className="ml-5 pl-2 my-1 animate-custom-slide">
                      <input
                        ref={folderInputRef}
                        type="text"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { e.preventDefault(); handleCreateFolderInSpace(space.id); } 
                          else if (e.key === "Escape") { setActiveSpaceForFolder(null); setNewFolderName(""); }
                        }}
                        placeholder="Nombre de la carpeta..."
                        className="w-full bg-slate-950 border border-amber-500/60 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 shadow-[0_0_12px_rgba(245,158,11,0.2)] focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
                        autoFocus
                      />
                    </div>
                  )}

                  {/* Input crear lista en espacio con animación personalizada */}
                  {activeSpaceForList === space.id && (
                    <div className="ml-5 pl-2 my-1 animate-custom-slide">
                      <input
                        ref={listInputRef}
                        type="text"
                        value={newListName}
                        onChange={(e) => setNewListName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { e.preventDefault(); handleCreateListInSpace(space.id); } 
                          else if (e.key === "Escape") { setActiveSpaceForList(null); setNewListName(""); }
                        }}
                        placeholder="Nombre de la lista..."
                        className="w-full bg-slate-950 border border-cyan-500/60 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 shadow-[0_0_12px_rgba(6,182,212,0.2)] focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                        autoFocus
                      />
                    </div>
                  )}

                  {/* Elementos internos del espacio con colapso fluido */}
                  <div className={`sidebar-tree-collapse ${isSpaceExpanded ? 'expanded' : ''}`}>
                    <div className="sidebar-tree-content">
                      <div className="ml-3 pl-3 border-l border-cyan-500/20 space-y-1.5 my-1.5">
                        {space.folders?.map((folder) => {
                          const isFolderExpanded = expandedFolders.has(folder.id);

                          return (
                            <div key={folder.id} className="space-y-1">
                              <div className="group/folder relative flex items-center">
                                {editingFolderId === folder.id ? (
                                  <input
                                    type="text"
                                    value={editingFolderName}
                                    onChange={(e) => setEditingFolderName(e.target.value)}
                                    onBlur={() => handleUpdateFolder(folder.id)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") { e.preventDefault(); handleUpdateFolder(folder.id); }
                                      if (e.key === "Escape") setEditingFolderId(null);
                                    }}
                                    className="w-full bg-slate-950 border border-amber-500/60 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all shadow-[0_0_12px_rgba(245,158,11,0.2)]"
                                    autoFocus
                                  />
                                ) : (
                                  /* Carpeta con estilo cristal ámbar y transición fluida */
                                  <button
                                    onClick={() => toggleFolder(folder.id)}
                                    className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-900/40 hover:bg-gradient-to-r hover:from-amber-950/30 hover:to-slate-900/80 border border-slate-800/60 hover:border-amber-500/40 hover:shadow-[0_0_15px_rgba(245,158,11,0.15)] transition-all duration-300 text-left group"
                                  >
                                    <ChevronDown className={`w-3 h-3 text-amber-400 flex-shrink-0 transition-transform duration-300 ${isFolderExpanded ? 'rotate-0' : '-rotate-90 text-slate-500'}`} />
                                    <Folder className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 drop-shadow-[0_0_8px_rgba(245,158,11,0.6)] transition-transform duration-300 group-hover/folder:scale-110" />
                                    <span className="flex-1 text-xs font-medium text-slate-300 truncate group-hover/folder:text-amber-200 transition-colors">{folder.name}</span>
                                    
                                    <span
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveFolderForList(folder.id);
                                        setNewListName("");
                                        setExpandedFolders(prev => new Set(prev).add(folder.id));
                                      }}
                                      className="opacity-80 sm:opacity-0 group-hover/folder:opacity-100 p-1 hover:text-cyan-400 text-slate-400 transition-all duration-200 active:scale-95 cursor-pointer"
                                      title="Añadir lista"
                                    >
                                      <Plus className="w-3 h-3" />
                                    </span>
                                    
                                    {canModifyItem(folder.createdById) && (
                                      <div className="opacity-80 sm:opacity-0 group-hover/folder:opacity-100 flex items-center gap-0.5 mr-1 transition-all duration-200">
                                        <span 
                                          onClick={(e) => { e.stopPropagation(); setEditingFolderId(folder.id); setEditingFolderName(folder.name); }}
                                          className="p-1 hover:text-amber-400 text-slate-400 transition-colors cursor-pointer"
                                          title="Editar"
                                        >
                                          <Edit2 className="w-3 h-3" />
                                        </span>
                                        <span 
                                          onClick={(e) => handleDeleteFolder(folder.id, e)}
                                          className="p-1 hover:text-rose-400 text-slate-400 transition-colors cursor-pointer"
                                          title="Eliminar"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </span>
                                      </div>
                                    )}
                                  </button>
                                )}
                              </div>

                              {/* Input crear lista en carpeta con animación personalizada */}
                              {activeFolderForList === folder.id && (
                                <div className="ml-5 pl-2 my-1 animate-custom-slide">
                                  <input
                                    ref={folderListInputRef}
                                    type="text"
                                    value={newListName}
                                    onChange={(e) => setNewListName(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") { e.preventDefault(); handleCreateListInFolder(space.id, folder.id); } 
                                      else if (e.key === "Escape") { setActiveFolderForList(null); setNewListName(""); }
                                    }}
                                    placeholder="Nombre de la lista..."
                                    className="w-full bg-slate-950 border border-cyan-500/60 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all shadow-[0_0_12px_rgba(6,182,212,0.2)]"
                                    autoFocus
                                  />
                                </div>
                              )}

                              {/* Listas dentro de la carpeta con colapso fluido */}
                              <div className={`sidebar-tree-collapse ${isFolderExpanded ? 'expanded' : ''}`}>
                                <div className="sidebar-tree-content">
                                  <div className="ml-3 pl-3 border-l border-amber-500/20 space-y-1 my-1">
                                    {folder.lists?.map((list) => (
                                      <div key={list.id} className="group/list relative flex items-center">
                                        {editingListId === list.id ? (
                                          <input
                                            type="text"
                                            value={editingListName}
                                            onChange={(e) => setEditingListName(e.target.value)}
                                            onBlur={() => handleUpdateList(list.id)}
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter") { e.preventDefault(); handleUpdateList(list.id); }
                                              if (e.key === "Escape") setEditingListId(null);
                                            }}
                                            className="w-full bg-slate-950 border border-cyan-500/60 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all shadow-[0_0_12px_rgba(6,182,212,0.2)]"
                                            autoFocus
                                          />
                                        ) : (
                                          /* Listas estilo botón de cristal con destello y microinteracción */
                                          <button
                                            onClick={() => onSelectList({ id: list.id, name: list.name, spaceId: space.id, folderId: folder.id })}
                                            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-900/30 hover:bg-gradient-to-r hover:from-cyan-950/50 hover:to-slate-900/70 border border-slate-800/60 hover:border-cyan-500/50 hover:shadow-[0_0_15px_rgba(6,182,212,0.2)] transition-all duration-300 text-left group"
                                          >
                                            <List className="w-3.5 h-3.5 text-slate-400 group-hover/list:text-cyan-400 flex-shrink-0 transition-all duration-300 group-hover/list:scale-110" />
                                            <span className="flex-1 text-xs text-slate-300 truncate group-hover/list:text-white transition-colors">{list.name}</span>
                                            
                                            {canModifyItem(list.createdById) && (
                                              <div className="opacity-80 sm:opacity-0 group-hover/list:opacity-100 flex items-center gap-0.5 mr-1 transition-all duration-200">
                                                <span 
                                                  onClick={(e) => { e.stopPropagation(); setEditingListId(list.id); setEditingListName(list.name); }}
                                                  className="p-1 hover:text-cyan-400 text-slate-400 cursor-pointer transition-colors"
                                                  title="Editar"
                                                >
                                                  <Edit2 className="w-3 h-3" />
                                                </span>
                                                <span 
                                                  onClick={(e) => handleDeleteList(list.id, e)}
                                                  className="p-1 hover:text-rose-400 text-slate-400 cursor-pointer transition-colors"
                                                  title="Eliminar"
                                                >
                                                  <Trash2 className="w-3 h-3" />
                                                </span>
                                              </div>
                                            )}
                                            
                                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-slate-950 text-cyan-300/80 border border-slate-800 shadow-inner group-hover/list:border-cyan-500/40 transition-colors">
                                              {list._count?.tasks || 0}
                                            </span>
                                          </button>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}

                        {/* Listas sueltas en el espacio */}
                        {space.lists?.filter(list => !list.folderId).map((list) => (
                          <div key={list.id} className="group/list relative flex items-center">
                            {editingListId === list.id ? (
                              <input
                                type="text"
                                value={editingListName}
                                onChange={(e) => setEditingListName(e.target.value)}
                                onBlur={() => handleUpdateList(list.id)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") { e.preventDefault(); handleUpdateList(list.id); }
                                  if (e.key === "Escape") setEditingListId(null);
                                }}
                                className="w-full bg-slate-950 border border-cyan-500/60 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all shadow-[0_0_12px_rgba(6,182,212,0.2)]"
                                autoFocus
                              />
                            ) : (
                              <button
                                onClick={() => onSelectList({ id: list.id, name: list.name, spaceId: space.id })}
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-900/30 hover:bg-gradient-to-r hover:from-cyan-950/50 hover:to-slate-900/70 border border-slate-800/60 hover:border-cyan-500/50 hover:shadow-[0_0_15px_rgba(6,182,212,0.2)] transition-all duration-300 text-left group"
                              >
                                <List className="w-3.5 h-3.5 text-slate-400 group-hover/list:text-cyan-400 flex-shrink-0 transition-all duration-300 group-hover/list:scale-110" />
                                <span className="flex-1 text-xs text-slate-300 truncate group-hover/list:text-white transition-colors">{list.name}</span>
                                
                                {canModifyItem(list.createdById) && (
                                  <div className="opacity-80 sm:opacity-0 group-hover/list:opacity-100 flex items-center gap-0.5 mr-1 transition-all duration-200">
                                    <span 
                                      onClick={(e) => { e.stopPropagation(); setEditingListId(list.id); setEditingListName(list.name); }}
                                      className="p-1 hover:text-cyan-400 text-slate-400 transition-colors cursor-pointer"
                                      title="Editar"
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </span>
                                    <span 
                                      onClick={(e) => handleDeleteList(list.id, e)}
                                      className="p-1 hover:text-rose-400 text-slate-400 transition-colors cursor-pointer"
                                      title="Eliminar"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </span>
                                  </div>
                                )}
                                
                                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-slate-950 text-cyan-300/80 border border-slate-800 shadow-inner group-hover/list:border-cyan-500/40 transition-colors">
                                  {list._count?.tasks || 0}
                                </span>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal para Crear Espacio con animación de aparición suave */}
        {showCreateSpace && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div 
              ref={createSpaceModalRef}
              className="relative bg-slate-900/90 border border-slate-700/80 rounded-2xl p-5 w-full max-w-xs shadow-[0_0_40px_rgba(6,182,212,0.3)] backdrop-blur-xl animate-custom-slide"
            >
              {/* Brillo superior en el modal */}
              <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent" />

              <h3 className="text-sm font-semibold text-white mb-3 tracking-tight flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" /> Configurar Nuevo Espacio
              </h3>
              <form onSubmit={handleCreateSpace}>
                <div className="mb-3.5">
                  <label className="block text-[11px] font-medium text-slate-400 mb-1">Nombre del espacio</label>
                  <input
                    type="text"
                    value={newSpaceName}
                    onChange={(e) => setNewSpaceName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 focus:outline-none transition-all shadow-inner"
                    placeholder="Ej. Marketing, Desarrollo..."
                    autoFocus
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setShowCreateSpace(false); setNewSpaceName(""); }}
                    className="flex-1 px-3 py-2 bg-slate-800/80 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-medium transition-all active:scale-95 border border-slate-700/50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-3 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-semibold transition-all active:scale-95 shadow-[0_0_20px_rgba(6,182,212,0.4)] border border-cyan-300/30"
                  >
                    Guardar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}