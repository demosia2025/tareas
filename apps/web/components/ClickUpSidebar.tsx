"use client";

import { useState, useEffect } from "react";
import { ChevronRight, ChevronDown, Folder, List, Plus, Zap, Trash2, Edit2, FolderPlus } from "lucide-react";

interface ClickUpSidebarProps {
  workspaceId: string;
  organizationName?: string;
  onSelectList: (list: { id: string; name: string; spaceId: string; folderId?: string }) => void;
  onOpenFolderModal?: (spaceId: string) => void; // ✅ AGREGADO: Prop opcional para compatibilidad
  currentUser?: { id?: string; role?: string };
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
  onOpenFolderModal, // ✅ AGREGADO: Se acepta la prop
  currentUser 
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

  useEffect(() => {
    if (workspaceId) {
      fetchHierarchy();
    }
  }, [workspaceId]);

  useEffect(() => {
    if (propOrgName) {
      setOrganizationName(propOrgName);
    }
  }, [propOrgName]);

  const fetchHierarchy = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/workspace/${workspaceId}/hierarchy`);
      if (response.ok) {
        const data = await response.json();
        setSpaces(data);
      }
    } catch (error) {
      console.error("Error cargando jerarquía:", error);
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
    if (!confirm("¿Estás seguro de que deseas eliminar este espacio y todo su contenido?")) return;

    try {
      const response = await fetch(`/api/spaces?id=${spaceId}`, { method: "DELETE" });
      if (response.ok) {
        fetchHierarchy();
      } else {
        const data = await response.json();
        alert(data.error || "No tienes permisos para eliminar este espacio");
      }
    } catch (error) {
      console.error("Error eliminando espacio:", error);
    }
  };

  const handleDeleteList = async (listId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("¿Estás seguro de que deseas eliminar esta lista?")) return;

    try {
      const response = await fetch(`/api/lists?id=${listId}`, { method: "DELETE" });
      if (response.ok) fetchHierarchy();
      else {
        const data = await response.json();
        alert(data.error || "No tienes permisos para eliminar esta lista");
      }
    } catch (error) {
      console.error("Error eliminando lista:", error);
    }
  };

  const handleDeleteFolder = async (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("¿Estás seguro de que deseas eliminar esta carpeta?")) return;

    try {
      const response = await fetch(`/api/folders?id=${folderId}`, { method: "DELETE" });
      if (response.ok) fetchHierarchy();
      else {
        const data = await response.json();
        alert(data.error || "No se pudo eliminar la carpeta");
      }
    } catch (error) {
      console.error("Error eliminando carpeta:", error);
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
        alert(data.error || "No tienes permisos para editar esta lista");
      }
    } catch (error) {
      console.error("Error actualizando lista:", error);
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
        alert(data.error || "No se pudo actualizar la carpeta");
      }
    } catch (error) {
      console.error("Error actualizando carpeta:", error);
    }
  };

  const handleCreateSpace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSpaceName.trim()) return;

    try {
      const spaceResponse = await fetch("/api/spaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newSpaceName,
          workspaceId: workspaceId,
        }),
      });

      if (spaceResponse.ok) {
        const createdSpace = await spaceResponse.json();

        const listResponse = await fetch("/api/lists", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "General",
            spaceId: createdSpace.id,
            workspaceId: workspaceId,
          }),
        });

        if (listResponse.ok) {
          const createdList = await listResponse.json();
          onSelectList({ id: createdList.id, name: createdList.name, spaceId: createdSpace.id });
        }

        await fetchHierarchy();
        setNewSpaceName("");
        setShowCreateSpace(false);
      } else {
        const errData = await spaceResponse.json().catch(() => ({}));
        alert(errData.error || "No se pudo crear el espacio.");
      }
    } catch (error) {
      console.error("Error creando space y lista inicial:", error);
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
        body: JSON.stringify({
          name: nameToSubmit,
          spaceId: spaceId,
          workspaceId: workspaceId,
        }),
      });

      if (response.ok) {
        const createdList = await response.json();
        await fetchHierarchy();
        onSelectList({ id: createdList.id, name: createdList.name, spaceId });
      }
    } catch (error) {
      console.error("Error creando lista:", error);
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
        body: JSON.stringify({
          name: nameToSubmit,
          spaceId: spaceId,
          workspaceId: workspaceId,
          folderId: folderId,
        }),
      });

      if (response.ok) {
        const createdList = await response.json();
        await fetchHierarchy();
        onSelectList({ id: createdList.id, name: createdList.name, spaceId, folderId });
      }
    } catch (error) {
      console.error("Error creando lista en carpeta:", error);
    }
  };

  const handleCreateFolderInSpace = async (spaceId: string) => {
    if (!newFolderName.trim()) {
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

      if (response.ok) {
        await fetchHierarchy();
        setExpandedSpaces(prev => new Set(prev).add(spaceId));
      } else {
        const data = await response.json();
        alert(data.error || "No se pudo crear la carpeta");
      }
    } catch (error) {
      console.error("Error creando carpeta:", error);
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
      <div className="flex items-center justify-center h-full p-4 bg-slate-900/40">
        <div className="animate-spin rounded-full h-5 w-5 border-2 border-cyan-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="h-full bg-slate-900/40 backdrop-blur-xl border-r border-slate-800/80 flex flex-col text-slate-200">
      <div className="p-3.5 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5 bg-slate-800/40 p-2 rounded-xl border border-slate-700/40 shadow-inner">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-md shadow-cyan-500/20">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xs font-bold text-white truncate tracking-wide">Mi Workspace</h2>
            <p className="text-[11px] text-slate-400 truncate">
              {organizationName}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        <div className="px-2 flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Espacios</span>
          <button 
            onClick={() => setShowCreateSpace(true)}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
            title="Crear Espacio"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-1">
          {spaces.map((space) => (
            <div key={space.id} className="space-y-0.5">
              <div className="flex items-center group/space relative rounded-xl hover:bg-slate-800/60 border border-transparent hover:border-slate-700/40 transition-all">
                <button
                  onClick={() => toggleSpace(space.id)}
                  className="flex-1 flex items-center gap-2 px-2.5 py-2 text-left"
                >
                  {expandedSpaces.has(space.id) ? (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  )}
                  <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400/50 flex-shrink-0"></div>
                  <span className="flex-1 text-xs font-semibold text-slate-200 truncate group-hover/space:text-white">
                    {space.name}
                  </span>
                </button>
                
                <div className="opacity-0 group-hover/space:opacity-100 flex items-center gap-0.5 mr-1 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      // ✅ Si existe onOpenFolderModal, lo usamos; si no, usamos el flujo interno
                      if (onOpenFolderModal) {
                        onOpenFolderModal(space.id);
                      } else {
                        setActiveSpaceForFolder(space.id);
                        setActiveSpaceForList(null);
                        setNewFolderName("");
                        setExpandedSpaces(prev => new Set(prev).add(space.id));
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-slate-700/60 rounded-lg transition-all"
                    title="Añadir carpeta a este espacio"
                  >
                    <FolderPlus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveSpaceForList(space.id);
                      setActiveSpaceForFolder(null);
                      setNewListName("");
                      setExpandedSpaces(prev => new Set(prev).add(space.id));
                    }}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/60 rounded-lg transition-all"
                    title="Añadir lista al espacio"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  {canModifyItem(space.createdById) && (
                    <button
                      onClick={(e) => handleDeleteSpace(space.id, e)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-700/60 rounded-lg transition-all"
                      title="Eliminar espacio"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {activeSpaceForFolder === space.id && (
                <div className="ml-5 pl-2 my-1">
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleCreateFolderInSpace(space.id);
                      } else if (e.key === "Escape") {
                        setActiveSpaceForFolder(null);
                        setNewFolderName("");
                      }
                    }}
                    placeholder="Nombre de carpeta..."
                    className="w-full bg-slate-950 border border-amber-500/50 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
                    autoFocus
                  />
                </div>
              )}

              {activeSpaceForList === space.id && (
                <div className="ml-5 pl-2 my-1">
                  <input
                    type="text"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleCreateListInSpace(space.id);
                      } else if (e.key === "Escape") {
                        setActiveSpaceForList(null);
                        setNewListName("");
                      }
                    }}
                    placeholder="Nombre de lista..."
                    className="w-full bg-slate-950 border border-cyan-500/50 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
                    autoFocus
                  />
                </div>
              )}

              {expandedSpaces.has(space.id) && (
                <div className="ml-3 pl-2 border-l border-slate-800/80 space-y-1 my-1">
                  {space.folders?.map((folder) => (
                    <div key={folder.id} className="space-y-0.5">
                      <div className="group/folder relative flex items-center">
                        {editingFolderId === folder.id ? (
                          <input
                            type="text"
                            value={editingFolderName}
                            onChange={(e) => setEditingFolderName(e.target.value)}
                            onBlur={() => handleUpdateFolder(folder.id)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleUpdateFolder(folder.id);
                              }
                              if (e.key === "Escape") setEditingFolderId(null);
                            }}
                            className="w-full bg-slate-950 border border-amber-500/50 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
                            autoFocus
                          />
                        ) : (
                          <button
                            onClick={() => toggleFolder(folder.id)}
                            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-800/50 transition-all text-left"
                          >
                            {expandedFolders.has(folder.id) ? (
                              <ChevronDown className="w-3 h-3 text-slate-500 flex-shrink-0" />
                            ) : (
                              <ChevronRight className="w-3 h-3 text-slate-500 flex-shrink-0" />
                            )}
                            <Folder className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                            <span className="flex-1 text-xs text-slate-300 truncate group-hover/folder:text-white">
                              {folder.name}
                            </span>

                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveFolderForList(folder.id);
                                setNewListName("");
                                setExpandedFolders(prev => new Set(prev).add(folder.id));
                              }}
                              className="opacity-0 group-hover/folder:opacity-100 p-1 hover:text-cyan-400 text-slate-400 transition-colors"
                              title="Añadir lista a esta carpeta"
                            >
                              <Plus className="w-3 h-3" />
                            </span>

                            {canModifyItem(folder.createdById) && (
                              <div className="opacity-0 group-hover/folder:opacity-100 flex items-center gap-1 mr-1">
                                <span 
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    setEditingFolderId(folder.id); 
                                    setEditingFolderName(folder.name); 
                                  }}
                                  className="p-1 hover:text-amber-400 text-slate-400 transition-colors"
                                  title="Editar carpeta"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </span>
                                <span 
                                  onClick={(e) => handleDeleteFolder(folder.id, e)}
                                  className="p-1 hover:text-rose-400 text-slate-400 transition-colors"
                                  title="Eliminar carpeta"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </span>
                              </div>
                            )}
                          </button>
                        )}
                      </div>

                      {activeFolderForList === folder.id && (
                        <div className="ml-5 pl-2 my-1">
                          <input
                            type="text"
                            value={newListName}
                            onChange={(e) => setNewListName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleCreateListInFolder(space.id, folder.id);
                              } else if (e.key === "Escape") {
                                setActiveFolderForList(null);
                                setNewListName("");
                              }
                            }}
                            placeholder="Nombre de lista en carpeta..."
                            className="w-full bg-slate-950 border border-cyan-500/50 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
                            autoFocus
                          />
                        </div>
                      )}

                      {expandedFolders.has(folder.id) && folder.lists && (
                        <div className="ml-3 pl-2 border-l border-slate-800/80 space-y-0.5 my-1">
                          {folder.lists.map((list) => (
                            <div key={list.id} className="group/list relative flex items-center">
                              {editingListId === list.id ? (
                                <input
                                  type="text"
                                  value={editingListName}
                                  onChange={(e) => setEditingListName(e.target.value)}
                                  onBlur={() => handleUpdateList(list.id)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      handleUpdateList(list.id);
                                    }
                                    if (e.key === "Escape") setEditingListId(null);
                                  }}
                                  className="w-full bg-slate-950 border border-cyan-500/50 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
                                  autoFocus
                                />
                              ) : (
                                <button
                                  onClick={() => onSelectList({ id: list.id, name: list.name, spaceId: space.id, folderId: folder.id })}
                                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-cyan-500/10 hover:border-cyan-500/20 border border-transparent transition-all text-left"
                                >
                                  <List className="w-3.5 h-3.5 text-slate-400 group-hover/list:text-cyan-400 flex-shrink-0 transition-colors" />
                                  <span className="flex-1 text-xs text-slate-300 truncate group-hover/list:text-white">
                                    {list.name}
                                  </span>
                                  
                                  {canModifyItem(list.createdById) && (
                                    <div className="opacity-0 group-hover/list:opacity-100 flex items-center gap-1 mr-1">
                                      <span 
                                        onClick={(e) => { e.stopPropagation(); setEditingListId(list.id); setEditingListName(list.name); }}
                                        className="p-1 hover:text-cyan-400 text-slate-400"
                                        title="Editar lista"
                                      >
                                        <Edit2 className="w-3 h-3" />
                                      </span>
                                      <span 
                                        onClick={(e) => handleDeleteList(list.id, e)}
                                        className="p-1 hover:text-rose-400 text-slate-400"
                                        title="Eliminar lista"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </span>
                                    </div>
                                  )}

                                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700/60">
                                    {list._count?.tasks || 0}
                                  </span>
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {space.lists?.filter(list => !list.folderId).map((list) => (
                    <div key={list.id} className="group/list relative flex items-center">
                      {editingListId === list.id ? (
                        <input
                          type="text"
                          value={editingListName}
                          onChange={(e) => setEditingListName(e.target.value)}
                          onBlur={() => handleUpdateList(list.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleUpdateList(list.id);
                            }
                            if (e.key === "Escape") setEditingListId(null);
                          }}
                          className="w-full bg-slate-950 border border-cyan-500/50 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
                          autoFocus
                        />
                      ) : (
                        <button
                          onClick={() => onSelectList({ id: list.id, name: list.name, spaceId: space.id })}
                          className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-cyan-500/10 hover:border-cyan-500/20 border border-transparent transition-all text-left"
                        >
                          <List className="w-3.5 h-3.5 text-slate-400 group-hover/list:text-cyan-400 flex-shrink-0 transition-colors" />
                          <span className="flex-1 text-xs text-slate-300 truncate group-hover/list:text-white">
                            {list.name}
                          </span>

                          {canModifyItem(list.createdById) && (
                            <div className="opacity-0 group-hover/list:opacity-100 flex items-center gap-1 mr-1">
                              <span 
                                onClick={(e) => { e.stopPropagation(); setEditingListId(list.id); setEditingListName(list.name); }}
                                className="p-1 hover:text-cyan-400 text-slate-400 transition-colors"
                                title="Editar lista"
                              >
                                <Edit2 className="w-3 h-3" />
                              </span>
                              <span 
                                onClick={(e) => handleDeleteList(list.id, e)}
                                className="p-1 hover:text-rose-400 text-slate-400 transition-colors"
                                title="Eliminar lista"
                              >
                                <Trash2 className="w-3 h-3" />
                              </span>
                            </div>
                          )}

                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700/60">
                            {list._count?.tasks || 0}
                          </span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {showCreateSpace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="text-base font-bold text-white mb-4">Crear Nuevo Espacio</h3>
            <form onSubmit={handleCreateSpace}>
              <div className="mb-4">
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Nombre del espacio</label>
                <input
                  type="text"
                  value={newSpaceName}
                  onChange={(e) => setNewSpaceName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none transition-colors"
                  placeholder="Ej. Marketing, Desarrollo..."
                  autoFocus
                />
              </div>
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowCreateSpace(false)}
                  className="flex-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-semibold transition-all shadow-lg shadow-cyan-500/20"
                >
                  Crear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
