import { beforeEach, describe, expect, it } from 'vitest'
import { __cacheInternals } from '../server/utils/cache'

describe('cache internals', () => {
  beforeEach(() => {
    __cacheInternals.reset()
  })

  it('prefixes logical keys with environment namespace', () => {
    expect(__cacheInternals.toFullKey('storefront:catalog-1:v1')).toBe('vento:dev:storefront:catalog-1:v1')
  })

  it('marks large payloads as compressed and stale windows correctly', () => {
    const envelope = __cacheInternals.serializeEnvelope(
      { body: 'x'.repeat(12 * 1024) },
      300,
      300,
      'storefront',
      'catalog-1',
    )

    expect(envelope.compressed).toBe(true)
    expect(envelope.catalogId).toBe('catalog-1')
    expect(envelope.staleUntil).toBeGreaterThan(envelope.expiresAt)
    expect(envelope.rescueUntil).toBeGreaterThan(envelope.staleUntil)
  })
})
