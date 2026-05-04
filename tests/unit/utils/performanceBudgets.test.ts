import { describe, expect, it } from 'vitest'
import { checkBudget, formatBytes, PERFORMANCE_BUDGETS } from '../../../app/utils/performanceBudgets'

describe('performance budgets', () => {
  it('defines strict mobile budgets for the critical app surfaces', () => {
    expect(PERFORMANCE_BUDGETS).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'storefront-js', maxBytes: 200 * 1024 }),
      expect.objectContaining({ name: 'admin-js', maxBytes: 400 * 1024 }),
      expect.objectContaining({ name: 'onboarding-js', maxBytes: 300 * 1024 }),
    ]))
  })

  it('flags assets that exceed the configured budget', () => {
    expect(checkBudget('storefront-js', 150 * 1024).ok).toBe(true)
    expect(checkBudget('storefront-js', 250 * 1024).ok).toBe(false)
  })

  it('formats bytes in compact human-readable units', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(1536)).toBe('1.5 KB')
    expect(formatBytes(2 * 1024 * 1024)).toBe('2.00 MB')
  })
})
