import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Task } from "@/components/InlineTaskRow";

export interface ListData {
  id: string;
  name: string;
  tasks: Task[];
}

type ViewMode = "list" | "kanban" | "calendar";
type StatusFilter = "all" | "todo" | "in_progress" | "done";
type PriorityFilter = "all" | "low" | "medium" | "high" | "urgent";
type SortOption = "custom" | "due_date_asc" | "due_date_desc" | "priority_desc" | "title_asc";

export function useDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [selectedList, setSelectedList] = useState<ListData | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [customFields, setCustomFields] = useState<any[]>([]);
  const [spaces, setSpaces] = useState<any[]>([]);
  
  const [isSyncing, setIsSyncing] = useState(false);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [targetSpaceIdForFolder, setTargetSpaceIdForFolder] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [parentTaskForSubtask, setParentTaskForSubtask] = useState<string | null>(null);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("all");
  const [sortOption, setSortOption] = useState<SortOption>("custom");
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  // ✅ MULTI-TENANT Y LOGIN
  const [memberships, setMemberships] = useState<any[]>([]);
  const [isWsDropdownOpen, setIsWsDropdownOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [joinForm, setJoinForm] = useState({ inviteCode: "", workspaceSlug: "" });
  const [joinError, setJoinError] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  // ✅ NUEVOS ESTADOS PARA LÍMITES Y ROLES
  const [isOwner, setIsOwner] = useState(false);
  const [planInfo, setPlanInfo] = useState<any>(null);
  const [planLimitModal, setPlanLimitModal] = useState({
    isOpen: false,
    type: "users" as "users" | "workspaces",
    currentPlan: "free",
    currentCount: 0,
    limit: 3
  });

     const rawRole = ((session?.user as any)?.role || "user").toLowerCase().trim();
  const isAdmin = rawRole === "admin";
  const isSuperAdmin = rawRole === "superadmin" || rawRole === "superadmin";

  useEffect(() => {
    if (status === "unauthenticated") return;
    
    const fetchWorkspace = async () => {
      if (!session?.user?.id) return;
      try {
        const response = await fetch(`/api/user/workspace?userId=${session.user.id}`);
        const data = await response.json();
        
        if (data.memberships && data.memberships.length > 0) {
          setMemberships(data.memberships);
          
          const activeWs = localStorage.getItem("activeWorkspaceId");
          const isValid = data.memberships.some((m: any) => m.workspaceId === activeWs);
          const targetWs = isValid ? activeWs : data.memberships[0].workspaceId;
          
          localStorage.setItem("activeWorkspaceId", targetWs);
          setWorkspaceId(targetWs);
        } else {
          router.push('/onboarding');
        }
      } catch (error) {
        console.error("Error fetching workspace:", error);
      } finally {
        setLoading(false);
      }
    };
    
    if (status === "authenticated") fetchWorkspace();
  }, [session, status, router]);

  // ✅ VERIFICAR SI ES OWNER Y OBTENER INFO DEL PLAN
  useEffect(() => {
    const fetchWorkspaceDetails = async () => {
      if (!workspaceId) return;
      try {
        // 1. Verificar si es owner
        const membersRes = await fetch(`/api/workspace/${workspaceId}/members`);
        if (membersRes.ok) {
          // ✅ CORREGIDO: Agregado 'as any' para evitar error de tipo en TypeScript
          const members = await (membersRes as any).json();
          const currentMember = members.find((m: any) => m.userId === session?.user?.id);
          setIsOwner(currentMember?.role === "owner");
        }

        // 2. Obtener info del plan
        const planRes = await fetch(`/api/workspace/${workspaceId}/plan`);
        if (planRes.ok) {
          // ✅ CORREGIDO: Agregado 'as any' para evitar error de tipo en TypeScript
          const data = await (planRes as any).json();
          setPlanInfo(data);
        }
      } catch (error) {
        console.error("Error fetching workspace details:", error);
      }
    };

    fetchWorkspaceDetails();
  }, [workspaceId, session?.user?.id]);

  const fetchHierarchy = async () => {
    if (!workspaceId) return;
    try {
      const response = await fetch(`/api/workspace/${workspaceId}/hierarchy`);
      if (response.ok) setSpaces(await response.json());
    } catch (error) {
      console.error("Error loading hierarchy:", error);
    }
  };

  useEffect(() => { if (workspaceId) fetchHierarchy(); }, [workspaceId]);
  
  useEffect(() => {
    if (selectedList?.id) { loadTasks(selectedList.id); fetchCustomFields(selectedList.id); } 
    else { setTasks([]); setCustomFields([]); }
  }, [selectedList?.id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setIsPaletteOpen(prev => !prev); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const loadTasks = async (listId: string) => {
    try {
      const response = await fetch(`/api/tasks?listId=${listId}`);
      if (response.ok) setTasks(await response.json());
    } catch (error) { console.error("Error loading tasks:", error); }
  };

  const fetchCustomFields = async (listId: string) => {
    try {
      const response = await fetch(`/api/custom-fields?listId=${listId}`);
      setCustomFields((await response.json()) || []);
    } catch (error) { setCustomFields([]); }
  };

  const handleListSelect = (list: { id: string; name: string; spaceId: string; folderId?: string }) => {
    setSelectedList({ id: list.id, name: list.name, tasks: [] });
    loadTasks(list.id);
    setIsSidebarOpen(false);
  };

  const toggleTaskExpand = (id: string) => {
    setExpandedTasks(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const handleCreateTask = async (taskData: any) => {
    setIsSyncing(true);
    try {
      const response = await fetch('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(taskData) });
      if (response.ok && selectedList) await loadTasks(selectedList.id);
    } catch (error) { console.error("Error creating task:", error); } finally { setIsSyncing(false); }
  };

  const handleUpdateTask = async (taskData: any) => {
    setIsSyncing(true);
    try {
      const response = await fetch('/api/tasks', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(taskData) });
      if (response.ok && selectedList) await loadTasks(selectedList.id);
    } catch (error) { console.error("Error updating task:", error); } finally { setIsSyncing(false); }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('¿Eliminar esta tarea y todas sus subtareas?')) return;
    setIsSyncing(true);
    try {
      const response = await fetch(`/api/tasks?id=${taskId}`, { method: 'DELETE' });
      if (response.ok && selectedList) await loadTasks(selectedList.id);
    } catch (error) { console.error("Error deleting task:", error); } finally { setIsSyncing(false); }
  };

  const openCreateModal = () => { setEditingTask(null); setParentTaskForSubtask(null); setIsModalOpen(true); };
  const openEditModal = (task: Task) => { setEditingTask(task); setParentTaskForSubtask(null); setIsModalOpen(true); };
  const openCreateSubtaskModal = (parentId: string) => { setEditingTask(null); setParentTaskForSubtask(parentId); setIsModalOpen(true); };

  const handleSaveWithParent = async (taskData: any) => {
    if (parentTaskForSubtask) taskData.parentTaskId = parentTaskForSubtask;
    if (editingTask) await handleUpdateTask({ ...taskData, id: editingTask.id });
    else await handleCreateTask(taskData);
    setIsModalOpen(false);
  };

  const createFirstList = async () => {
    if (!workspaceId || spaces.length === 0) return;
    setIsSyncing(true);
    try {
      const response = await fetch('/api/lists', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Mi Primera Lista', workspaceId: workspaceId, spaceId: spaces[0].id }) });
      if (response.ok) {
        await fetchHierarchy();
        const updatedSpaces = await fetch(`/api/workspace/${workspaceId}/hierarchy`).then(res => res.json());
        const newList = updatedSpaces[0]?.lists?.[0];
        if (newList) { setSelectedList({ id: newList.id, name: newList.name, tasks: [] }); loadTasks(newList.id); }
      }
    } catch (error) { console.error("Error creating first list:", error); } finally { setIsSyncing(false); }
  };

  const handleOpenFolderModal = (spaceId: string) => { setTargetSpaceIdForFolder(spaceId); setNewFolderName(""); setIsFolderModalOpen(true); };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim() || !targetSpaceIdForFolder || !workspaceId) return;
    setIsSyncing(true);
    try {
      const response = await fetch('/api/folders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newFolderName.trim(), spaceId: targetSpaceIdForFolder, workspaceId: workspaceId }) });
      if (response.ok) { await fetchHierarchy(); setIsFolderModalOpen(false); setNewFolderName(""); }
    } catch (error) { console.error("Error creating folder:", error); } finally { setIsSyncing(false); }
  };

  const handleJoinWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsJoining(true);
    setJoinError("");

    try {
      const response = await fetch("/api/workspace/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...joinForm, userId: session?.user?.id }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(`¡Te has unido a ${data.workspaceName}!`);
        setIsJoinModalOpen(false);
        setJoinForm({ inviteCode: "", workspaceSlug: "" });
        window.location.reload();
      } else {
        setJoinError(data.error || "Error al unirse al workspace");
      }
    } catch (error) {
      console.error("Error joining workspace:", error);
      setJoinError("Error de conexión al unirse al workspace");
    } finally {
      setIsJoining(false);
    }
  };

  const filteredTasks = useMemo(() => {
    let result = tasks.filter(task => {
      if (searchQuery.trim() !== "") {
        const q = searchQuery.toLowerCase();
        if (!task.title.toLowerCase().includes(q) && !task.description?.toLowerCase().includes(q)) return false;
      }
      if (statusFilter !== "all" && task.status !== statusFilter) return false;
      if (priorityFilter !== "all") {
        const priorityMap: Record<PriorityFilter, number[]> = { all: [0, 1, 2, 3, 4], low: [1], medium: [2], high: [3], urgent: [4] };
        if (!priorityMap[priorityFilter].includes(task.priority)) return false;
      }
      return true;
    });
    if (sortOption !== "custom") {
      result = [...result].sort((a, b) => {
        if (sortOption === "due_date_asc") return (a.dueDate ? new Date(a.dueDate).getTime() : Infinity) - (b.dueDate ? new Date(b.dueDate).getTime() : Infinity);
        if (sortOption === "due_date_desc") return (b.dueDate ? new Date(b.dueDate).getTime() : 0) - (a.dueDate ? new Date(a.dueDate).getTime() : 0);
        if (sortOption === "priority_desc") return b.priority - a.priority;
        if (sortOption === "title_asc") return a.title.localeCompare(b.title);
        return 0;
      });
    }
    return result;
  }, [tasks, searchQuery, statusFilter, priorityFilter, sortOption]);

  const hierarchicalTasks = useMemo(() => {
    const taskMap = new Map<string, Task & { children: Task[] }>();
    filteredTasks.forEach(task => taskMap.set(task.id, { ...task, children: [] }));
    const rootTasks: Task[] = [];
    filteredTasks.forEach(task => {
      const parentId = task.parentTaskId || task.parentId || (task as any).parent_id;
      const mappedTask = taskMap.get(task.id);
      if (!mappedTask) return;
      if (parentId && taskMap.has(parentId)) taskMap.get(parentId)!.children.push(mappedTask);
      else rootTasks.push(mappedTask);
    });
    return rootTasks;
  }, [filteredTasks]);

  const allWorkspaceTasks = useMemo(() => {
    return tasks.map(t => ({ ...t, listId: selectedList?.id, listName: selectedList?.name }));
  }, [tasks, selectedList]);

  return {
    session, status, workspaceId, selectedList, tasks, loading, viewMode, expandedTasks, customFields, spaces,
    isSyncing, isFolderModalOpen, targetSpaceIdForFolder, newFolderName, isSidebarOpen, isModalOpen, editingTask,
    parentTaskForSubtask, isPaletteOpen, searchQuery, statusFilter, priorityFilter, sortOption, isFilterDropdownOpen,
    isProfileMenuOpen, isAdmin, isSuperAdmin, filteredTasks, hierarchicalTasks, allWorkspaceTasks,
    memberships, isWsDropdownOpen, isJoinModalOpen, joinForm, joinError, isJoining, isLogoutModalOpen,
    // ✅ NUEVOS RETORNOS
    isOwner, planInfo, planLimitModal, setPlanLimitModal,
    // ✅ NUEVOS SETTERS
    setWorkspaceId, setSelectedList, setViewMode, setExpandedTasks, setCustomFields, setSpaces, setIsSyncing,
    setIsFolderModalOpen, setTargetSpaceIdForFolder, setNewFolderName, setIsSidebarOpen, setIsModalOpen, setEditingTask,
    setParentTaskForSubtask, setIsPaletteOpen, setSearchQuery, setStatusFilter, setPriorityFilter, setSortOption,
    setIsFilterDropdownOpen, setIsProfileMenuOpen, setIsWsDropdownOpen, setIsJoinModalOpen, setJoinForm, setJoinError, 
    setIsJoining, setIsLogoutModalOpen,
    // ✅ FUNCIONES
    fetchHierarchy, loadTasks, handleListSelect, toggleTaskExpand,
    handleCreateTask, handleUpdateTask, handleDeleteTask, openCreateModal, openEditModal, openCreateSubtaskModal,
    handleSaveWithParent, createFirstList, handleOpenFolderModal, handleCreateFolder, handleJoinWorkspace
  };
}
