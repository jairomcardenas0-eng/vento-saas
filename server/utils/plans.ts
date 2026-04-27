import type { CatalogPlan, PlanTier } from '../../app/types/catalog'

type PlanLimit = {
  maxProducts: number
  maxTeamMembers: number
  maxImages: number
  maxCatalogs: number
}

type SupportedPlanTier = Exclude<PlanTier, 'gold'>

export const PLAN_LIMITS: Record<SupportedPlanTier, PlanLimit> = {
  free: { maxProducts: 20, maxTeamMembers: 2, maxImages: 5, maxCatalogs: 1 },
  basic: { maxProducts: 100, maxTeamMembers: 5, maxImages: 10, maxCatalogs: 3 },
  pro: { maxProducts: 500, maxTeamMembers: 15, maxImages: Number.POSITIVE_INFINITY, maxCatalogs: 10 },
  enterprise: { maxProducts: Number.POSITIVE_INFINITY, maxTeamMembers: Number.POSITIVE_INFINITY, maxImages: Number.POSITIVE_INFINITY, maxCatalogs: Number.POSITIVE_INFINITY },
}

export const PLAN_FEATURES: Record<SupportedPlanTier, string[]> = {
  free: ['basic_analytics'],
  basic: ['basic_analytics', 'multi_catalog'],
  pro: ['advanced_analytics', 'multi_catalog', 'webhooks', 'custom_domain'],
  enterprise: ['advanced_analytics', 'multi_catalog', 'webhooks', 'custom_domain', 'api_access'],
}

export const normalizePlanTier = (planType?: string | null): SupportedPlanTier => {
  if (planType === 'basic' || planType === 'pro' || planType === 'enterprise') {
    return planType
  }

  return 'free'
}

export const getPlanLimits = (planType?: string | null): PlanLimit =>
  PLAN_LIMITS[normalizePlanTier(planType)]

export const getPlanFeatures = (planType?: string | null): string[] =>
  PLAN_FEATURES[normalizePlanTier(planType)]

export const checkPlanLimit = (
  planType: string | null | undefined,
  limitKey: keyof PlanLimit,
  nextValue: number,
) => {
  const limits = getPlanLimits(planType)
  const maxAllowed = limits[limitKey]
  return {
    allowed: Number.isFinite(maxAllowed) ? nextValue <= maxAllowed : true,
    current: nextValue,
    limit: maxAllowed,
  }
}

export const isPlanExpiringSoon = (plan: CatalogPlan | null, days = 7): boolean => {
  if (!plan?.expiresAt) {
    return false
  }

  const expiresAt = Date.parse(plan.expiresAt)
  if (Number.isNaN(expiresAt)) {
    return false
  }

  const threshold = Date.now() + (days * 24 * 60 * 60 * 1000)
  return expiresAt <= threshold
}
