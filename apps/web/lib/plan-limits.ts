export interface PlanLimits {
  maxUsers: number;
  maxWorkspaces: number;
  features: string[];
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  free: {
    maxUsers: 3,
    maxWorkspaces: 1,
    features: ["basic-tasks", "basic-spaces"]
  },
  pro: {
    maxUsers: 8,
    maxWorkspaces: 5,
    features: ["basic-tasks", "basic-spaces", "advanced-reports", "custom-fields"]
  },
  premium: {
    maxUsers: Infinity,
    maxWorkspaces: Infinity,
    features: ["basic-tasks", "basic-spaces", "advanced-reports", "custom-fields", "api-access", "priority-support"]
  }
};

export function getPlanLimits(plan: string): PlanLimits {
  return PLAN_LIMITS[plan.toLowerCase()] || PLAN_LIMITS.free;
}

export function getUserLimitForPlan(plan: string): string {
  const limits = getPlanLimits(plan);
  if (limits.maxUsers === Infinity) return "Ilimitados";
  return `${limits.maxUsers} usuarios`;
}