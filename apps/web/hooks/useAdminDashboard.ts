import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export function useAdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState({ totalUsers: 0, totalWorkspaces: 0, totalTasks: 0, totalMembers: 0 });

  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [spaces, setSpaces] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [inviteCodes, setInviteCodes] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  
  const [planInfo, setPlanInfo] = useState<any>(null);
  const [orgStats, setOrgStats] = useState<any[]>([]);
  const [workspaceStats, setWorkspaceStats] = useState<any[]>([]);

  const [searchWorkspaces, setSearchWorkspaces] = useState("");
  const [searchSpaces, setSearchSpaces] = useState("");
  const [searchOrgs, setSearchOrgs] = useState("");
  const [searchUsers, setSearchUsers] = useState("");
  const [searchInvitations, setSearchInvitations] = useState("");
  const [searchCodes, setSearchCodes] = useState("");

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [joinForm, setJoinForm] = useState({ inviteCode: "", workspaceSlug: "" });

  const [activeTab, setActiveTab] = useState<"overview" | "workspaces" | "spaces" | "organizations" | "users" | "invitations" | "invite-codes">("overview");
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [createUserForm, setCreateUserForm] = useState({ name: "", email: "", password: "", role: "user", organizationId: "", workspaceId: "" });
  const [editForm, setEditForm] = useState({ role: "user", password: "" });

  const fetchData = async () => {
    try {
      const [statsRes, wsRes, spRes, orgRes, uRes, icRes, invRes, planRes] = await Promise.all([
        fetch("/api/admin/stats"),
        fetch("/api/admin/workspaces"),
        fetch("/api/admin/spaces"),
        fetch("/api/admin/organizations"),
        fetch("/api/admin/users"),
        fetch("/api/admin2/invite-codes"),
        fetch("/api/admin/invitations").catch(() => ({ ok: false, json: () => Promise.resolve({}) })),
        fetch("/api/admin/organizations/plan").catch(() => ({ ok: false, json: () => Promise.resolve(null) } as unknown as Response))
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      
      if (wsRes.ok) {
        const wsData = await wsRes.json();
        const wsArray = Array.isArray(wsData) ? wsData : (wsData.workspaces || []);
        setWorkspaces(wsArray);
        setWorkspaceStats(wsArray);
      }
      
      if (spRes.ok) {
        const spData = await spRes.json();
        setSpaces(Array.isArray(spData) ? spData : (spData.spaces || []));
      }
      
      if (orgRes.ok) {
        const orgData = await orgRes.json();
        const orgArray = Array.isArray(orgData) ? orgData : (orgData.organizations || []);
        setOrganizations(orgArray);
        setOrgStats(orgArray);
      }
      
      if (uRes.ok) {
        const uData = await uRes.json();
        setUsers(Array.isArray(uData) ? uData : (uData.users || []));
      }
      
      if (icRes.ok) {
        const icData = await icRes.json();
        setInviteCodes(Array.isArray(icData) ? icData : (icData.inviteCodes || icData.codes || []));
      }
      
      if (invRes.ok) {
        const invData = await invRes.json();
        setInvitations(Array.isArray(invData) ? invData : (invData.invitations || []));
      }
      
      if (planRes.ok) setPlanInfo(await planRes.json());
      
    } catch (error) {
      console.error("Error fetching admin data:", error);
    }
  };

  const checkAdminAccess = async () => {
    try {
      const response = await fetch("/api/admin/check");
      if (!response.ok) throw new Error();
      const data = await response.json();
      if (!data.isAdmin && !data.isSuperAdmin) {
        setIsLoading(false);
        return;
      }
      setIsAdmin(true);
      await fetchData();
    } catch (error) {
      console.error("Error verificando permisos");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (status === "loading") return;
    if (!session?.user) { router.push("/login"); return; }
    checkAdminAccess();
  }, [status, session, router]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createUserForm),
      });
      
      if (response.ok) {
        fetchData();
        setIsCreateUserOpen(false);
        setCreateUserForm({ name: "", email: "", password: "", role: "user", organizationId: "", workspaceId: "" });
      } else {
        const err = await response.json();
        alert(err.error || "Error al crear usuario");
      }
    } catch (error) { 
      console.error(error); 
      alert("Error al crear usuario");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("¿Eliminar usuario?")) return;
    try {
      await fetch(`/api/admin/users?id=${userId}`, { method: "DELETE" });
      fetchData();
    } catch (error) { console.error(error); }
  };

  const handleJoinWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/workspace/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(joinForm),
      });
      
      if (response.ok) {
        setIsJoinModalOpen(false);
        setJoinForm({ inviteCode: "", workspaceSlug: "" });
        await fetchData();
        alert("Te has unido al workspace correctamente");
      } else {
        const err = await response.json();
        alert(err.error || "Error al unirse al workspace");
      }
    } catch (error) {
      console.error("Error joining workspace:", error);
      alert("Error al unirse al workspace");
    }
  };

  const filteredWorkspaces = useMemo(() => 
    (Array.isArray(workspaces) ? workspaces : []).filter(w => w.name?.toLowerCase().includes(searchWorkspaces.toLowerCase()) || w.slug?.toLowerCase().includes(searchWorkspaces.toLowerCase())), 
    [workspaces, searchWorkspaces]
  );
  
  const filteredSpaces = useMemo(() => 
    (Array.isArray(spaces) ? spaces : []).filter(s => s.name?.toLowerCase().includes(searchSpaces.toLowerCase()) || s.workspace?.name?.toLowerCase().includes(searchSpaces.toLowerCase())), 
    [spaces, searchSpaces]
  );
  
  const filteredOrgs = useMemo(() => 
    (Array.isArray(organizations) ? organizations : []).filter(o => o.name?.toLowerCase().includes(searchOrgs.toLowerCase()) || o.slug?.toLowerCase().includes(searchOrgs.toLowerCase())), 
    [organizations, searchOrgs]
  );
  
  const filteredUsers = useMemo(() => 
    (Array.isArray(users) ? users : []).filter(u => u.name?.toLowerCase().includes(searchUsers.toLowerCase()) || u.email?.toLowerCase().includes(searchUsers.toLowerCase())), 
    [users, searchUsers]
  );
  
  const filteredInvitations = useMemo(() => 
    (Array.isArray(invitations) ? invitations : []).filter(i => i.invitedUser?.email?.toLowerCase().includes(searchInvitations.toLowerCase()) || i.workspace?.name?.toLowerCase().includes(searchInvitations.toLowerCase())), 
    [invitations, searchInvitations]
  );
  
  const filteredCodes = useMemo(() => 
    (Array.isArray(inviteCodes) ? inviteCodes : []).filter(c => c.code?.toLowerCase().includes(searchCodes.toLowerCase()) || c.createdBy?.name?.toLowerCase().includes(searchCodes.toLowerCase())), 
    [inviteCodes, searchCodes]
  );

  return {
    isLoading, isAdmin, stats, activeTab, setActiveTab,
    workspaces: filteredWorkspaces, spaces: filteredSpaces, organizations: filteredOrgs,
    users: filteredUsers, invitations: filteredInvitations, inviteCodes: filteredCodes,
    searchWorkspaces, setSearchWorkspaces, searchSpaces, setSearchSpaces,
    searchOrgs, setSearchOrgs, searchUsers, setSearchUsers,
    searchInvitations, setSearchInvitations, searchCodes, setSearchCodes,
    isCreateUserOpen, setIsCreateUserOpen, editingUser, setEditingUser,
    createUserForm, setCreateUserForm, editForm, setEditForm,
    handleCreateUser, handleDeleteUser, fetchData,
    isProfileMenuOpen, setIsProfileMenuOpen,
    isJoinModalOpen, setIsJoinModalOpen,
    joinForm, setJoinForm,
    handleJoinWorkspace,
    planInfo,
    orgStats,
    workspaceStats
  };
}