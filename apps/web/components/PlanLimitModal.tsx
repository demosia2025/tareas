"use client";
import { useRouter } from "next/navigation";
import { Crown, Users, FolderKanban, X, ArrowRight, Lock } from "lucide-react";

interface PlanLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "users" | "workspaces";
  currentPlan: string;
  currentCount: number;
  limit: number;
}

export default function PlanLimitModal({
  isOpen,
  onClose,
  type,
  currentPlan,
  currentCount,
  limit
}: PlanLimitModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const isUsers = type === "users";
  const Icon = isUsers ? Users : FolderKanban;

  // Definir el orden de los planes (de menor a mayor)
  const PLAN_ORDER = ["free", "pro", "premium"];
  const currentPlanIndex = PLAN_ORDER.indexOf(currentPlan.toLowerCase());

  const plans = [
    { name: "Free", users: 3, workspaces: 1, price: "Gratis" },
    { name: "Pro", users: 8, workspaces: 5, price: "1 UF/mes" },
    { name: "Premium", users: Infinity, workspaces: Infinity, price: "2 UF/mes" }
  ];

  // Filtrar solo el plan actual y los superiores
  const availablePlans = plans.filter((plan) => {
    const planIndex = PLAN_ORDER.indexOf(plan.name.toLowerCase());
    return planIndex >= currentPlanIndex;
  });

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-900/50 to-pink-900/50 p-6 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <Crown className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {isUsers ? "Límite de Usuarios Alcanzado" : "Límite de Workspaces Alcanzado"}
                </h2>
                <p className="text-sm text-slate-300">Plan actual: {currentPlan.toUpperCase()}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Mensaje */}
          <div className="bg-rose-950/30 border border-rose-500/30 rounded-xl p-4">
            <p className="text-sm text-slate-300 leading-relaxed">
              {isUsers
                ? `Has alcanzado el límite de ${limit === Infinity ? "" : limit} usuarios para tu plan ${currentPlan.toUpperCase()}. Actualmente tienes ${currentCount} usuarios.`
                : `Has alcanzado el límite de ${limit === Infinity ? "∞" : limit} workspaces para tu plan ${currentPlan.toUpperCase()}.`}
            </p>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">
              {isUsers
                ? "Si desea agregar más usuarios, debe actualizar a uno de nuestros planes superiores."
                : "Para crear más espacios de trabajo, debe actualizar su plan."}
            </p>
          </div>

          {/* Planes Disponibles */}
          <div>
            <h3 className="text-sm font-bold text-white mb-4">
              {currentPlanIndex === PLAN_ORDER.length - 1 
                ? "Has alcanzado el plan máximo" 
                : "Planes Disponibles para Actualizar:"}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {availablePlans.map((plan) => {
                const isCurrentPlan = plan.name.toLowerCase() === currentPlan.toLowerCase();
                
                return (
                  <div
                    key={plan.name}
                    className={`relative p-4 rounded-xl border transition-all ${
                      isCurrentPlan
                        ? "bg-slate-800/50 border-slate-700/50 opacity-60"
                        : "bg-slate-900/50 border-slate-700 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/10"
                    }`}
                  >
                    {/* Badge de plan actual */}
                    {isCurrentPlan && (
                      <div className="absolute top-3 right-3 flex items-center gap-1 px-2 py-1 bg-slate-700 rounded-lg">
                        <Lock className="w-3 h-3 text-slate-400" />
                        <span className="text-[10px] font-bold text-slate-400">Actual</span>
                      </div>
                    )}

                    <h4 className="text-sm font-bold text-white mb-2">{plan.name}</h4>
                    <p className="text-xs text-slate-400 mb-3">{plan.price}</p>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-center gap-2 text-slate-300">
                        <Users className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{plan.users === Infinity ? "Ilimitados" : `${plan.users} usuarios`}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-300">
                        <FolderKanban className="w-3.5 h-3.5 text-purple-400" />
                        <span>{plan.workspaces === Infinity ? "Ilimitados" : `${plan.workspaces} workspaces`}</span>
                      </div>
                    </div>
                    
                    {isCurrentPlan ? (
                      <button
                        disabled
                        className="w-full mt-3 px-3 py-2 bg-slate-700 text-slate-400 rounded-lg text-xs font-bold cursor-not-allowed flex items-center justify-center gap-1.5"
                      >
                        <Lock className="w-3 h-3" />
                        <span>Plan Actual</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => router.push("/upgrade")}
                        className="w-full mt-3 px-3 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-500/20"
                      >
                        <span>Actualizar</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
          >
            Cancelar
          </button>
          
          {/* 
            Botón "Ver Todos los Planes" comentado temporalmente.
            Para reactivarlo, simplemente elimina las etiquetas {/* y * /} que lo envuelven.
          */}
          {/* 
          {currentPlanIndex < PLAN_ORDER.length - 1 && (
            <button
              onClick={() => router.push("/upgrade")}
              className="px-6 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-cyan-500/25 flex items-center gap-2"
            >
              <span>Ver Todos los Planes</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
          */}
          
        </div>
      </div>
    </div>
  );
}