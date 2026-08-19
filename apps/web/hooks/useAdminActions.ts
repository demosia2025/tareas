import { useState, useEffect } from "react";

export function useAdminActions(admin: any) {
  // Estado para el modal de límite de plan
  const [limitModal, setLimitModal] = useState({
    isOpen: false,
    type: "users" as "users" | "workspaces",
    currentPlan: "free",
    currentLimit: 3,
    currentCount: 0
  });

  // Estado del workspace actualmente seleccionado
  const [currentWorkspace, setCurrentWorkspace] = useState<any>(null);

  // Nombre de la organización actual
  const [organizationName, setOrganizationName] = useState("");

  // Determina si el usuario es owner del workspace
  const [isOwner, setIsOwner] = useState(false);

  // Sincronizar datos cuando cambian
  useEffect(() => {
    if (admin.planInfo?.organization) {
      setOrganizationName(admin.planInfo.organization.name);
    }
    if (admin.workspaceStats && admin.workspaceStats.length > 0) {
      setCurrentWorkspace(admin.workspaceStats[0]);
    }
    // TODO: Determinar isOwner desde el backend basado en membresía
    setIsOwner(true);
  }, [admin.planInfo, admin.workspaceStats]);

  // Cambiar de workspace
  const handleSwitchWorkspace = (workspaceId: string) => {
    const ws = admin.workspaceStats?.find((w: any) => w.id === workspaceId);
    if (ws) setCurrentWorkspace(ws);
  };

  // Crear usuario con validación de límites
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(admin.createUserForm)
      });

      if (response.ok) {
        admin.fetchData();
        admin.setIsCreateUserOpen(false);
        admin.setCreateUserForm({
          name: "",
          email: "",
          password: "",
          role: "user",
          organizationId: "",
          workspaceId: ""
        });
      } else {
        const err = await response.json();
        if (response.status === 403 && err.needsUpgrade) {
          setLimitModal({
            isOpen: true,
            type: "users",
            currentPlan: admin.planInfo?.organization.plan || "free",
            currentLimit: admin.planInfo?.usage.userLimit || 3,
            currentCount: admin.planInfo?.usage.currentUsers || 0
          });
        } else {
          alert(err.error || "Error al crear usuario");
        }
      }
    } catch (error) {
      console.error(error);
      alert("Error al crear usuario");
    }
  };

  // Solicitar creación de workspace (muestra modal de límite)
  const handleRequestCreateWorkspace = () => {
    setLimitModal({
      isOpen: true,
      type: "workspaces",
      currentPlan: admin.planInfo?.organization.plan || "free",
      currentLimit: admin.planInfo?.limits?.maxWorkspaces || 1,
      currentCount: (admin.workspaceStats || []).length
    });
  };

  return {
    // Estados
    limitModal,
    setLimitModal,
    currentWorkspace,
    setCurrentWorkspace,
    organizationName,
    setOrganizationName,
    isOwner,
    setIsOwner,
    // Funciones
    handleSwitchWorkspace,
    handleCreateUser,
    handleRequestCreateWorkspace
  };
}
