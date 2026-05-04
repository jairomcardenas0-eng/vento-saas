export type LocalPlanLimit = {
  maxProducts: number
  maxTeamMembers: number
  maxImages: number
  maxCatalogs: number
}

export const PLAN_LIMITS: Record<'free' | 'basic' | 'pro' | 'enterprise', LocalPlanLimit> = {
  free: { maxProducts: 20, maxTeamMembers: 2, maxImages: 5, maxCatalogs: 1 },
  basic: { maxProducts: 100, maxTeamMembers: 5, maxImages: 10, maxCatalogs: 3 },
  pro: { maxProducts: 500, maxTeamMembers: 15, maxImages: Number.POSITIVE_INFINITY, maxCatalogs: 10 },
  enterprise: { maxProducts: Number.POSITIVE_INFINITY, maxTeamMembers: Number.POSITIVE_INFINITY, maxImages: Number.POSITIVE_INFINITY, maxCatalogs: Number.POSITIVE_INFINITY },
}

export const normalizePlanTier = (planType?: string | null): keyof typeof PLAN_LIMITS => {
  if (planType === 'basic' || planType === 'pro' || planType === 'enterprise') {
    return planType
  }

  return 'free'
}

export const getPlanLimits = (planType?: string | null): LocalPlanLimit =>
  PLAN_LIMITS[normalizePlanTier(planType)]
