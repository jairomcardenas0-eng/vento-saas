import { describe, expect, it } from 'vitest'
import { checkPlanLimit, getPlanFeatures, getPlanLimits, normalizePlanTier } from '../server/utils/plans'

describe('plans utils', () => {
  it('normalizes unsupported plans to free', () => {
    expect(normalizePlanTier('gold')).toBe('free')
    expect(normalizePlanTier('')).toBe('free')
  })

  it('returns expected product limits', () => {
    expect(getPlanLimits('free').maxProducts).toBe(20)
    expect(getPlanLimits('basic').maxTeamMembers).toBe(5)
  })

  it('blocks limits when next value exceeds tier cap', () => {
    expect(checkPlanLimit('free', 'maxProducts', 21).allowed).toBe(false)
    expect(checkPlanLimit('pro', 'maxCatalogs', 10).allowed).toBe(true)
  })

  it('exposes plan features', () => {
    expect(getPlanFeatures('pro')).toContain('advanced_analytics')
    expect(getPlanFeatures('free')).not.toContain('custom_domain')
  })
})
