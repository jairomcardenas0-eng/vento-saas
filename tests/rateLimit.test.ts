import { describe, expect, it, beforeEach } from 'vitest'
import { applyLocalRateLimit, normalizeRateLimitKeyPart, resetLocalRateLimitBuckets } from '../server/utils/rateLimit'

describe('rate limit local fallback', () => {
  beforeEach(() => {
    resetLocalRateLimitBuckets()
  })

  it('normalizes noisy key parts', () => {
    expect(normalizeRateLimitKeyPart(' Hello World! ')).toBe('hello-world-')
  })

  it('limits after configured threshold', () => {
    const first = applyLocalRateLimit('test-key', 2, 1000)
    const second = applyLocalRateLimit('test-key', 2, 1000)
    const third = applyLocalRateLimit('test-key', 2, 1000)

    expect(first.limited).toBe(false)
    expect(second.limited).toBe(false)
    expect(third.limited).toBe(true)
  })
})
