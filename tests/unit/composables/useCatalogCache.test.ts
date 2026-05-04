import { beforeEach, describe, expect, it, vi } from 'vitest'

const catalogStore = new Map<string, Record<string, unknown>>()

vi.mock('~/utils/offlineStorage', () => ({
  estimateOfflineStorage: vi.fn(async () => ({ quota: 1024 * 1024, usage: 2048 })),
  offlineDelete: vi.fn(async (_store: string, id: string) => {
    catalogStore.delete(id)
  }),
  offlineGet: vi.fn(async (_store: string, id: string) => (catalogStore.get(id) as Record<string, unknown> | undefined) || null),
  offlinePut: vi.fn(async (_store: string, value: Record<string, unknown>) => {
    catalogStore.set(String(value.id), value)
  }),
}))

describe('useCatalogCache', () => {
  beforeEach(() => {
    catalogStore.clear()
    vi.resetModules()
  })

  it('writes compressed catalog payloads and reads them back', async () => {
    const { useCatalogCache } = await import('../../../app/composables/useCatalogCache')
    const cache = useCatalogCache<{ id: string; images: string[] }>({ ttlMs: 60_000 })

    await cache.write('cat-1', { id: 'cat-1', images: ['a', 'b', 'c', 'd'] })
    const result = await cache.read('cat-1')

    expect(result.stale).toBe(false)
    expect(result.payload).toEqual({ id: 'cat-1', images: ['a', 'b', 'c'] })
    expect(catalogStore.get('cat-1')).toMatchObject({ catalogId: 'cat-1', version: 1 })
  })

  it('marks expired entries as stale without losing the payload', async () => {
    const { useCatalogCache } = await import('../../../app/composables/useCatalogCache')
    const cache = useCatalogCache<{ id: string }>({ ttlMs: -1000 })

    await cache.write('cat-2', { id: 'cat-2' })
    const result = await cache.read('cat-2')

    expect(result.stale).toBe(true)
    expect(result.payload).toEqual({ id: 'cat-2' })
  })

  it('rejects payloads that exceed the configured offline budget', async () => {
    const { useCatalogCache } = await import('../../../app/composables/useCatalogCache')
    const cache = useCatalogCache<{ huge: string }>({ maxCatalogBytes: 10 })

    await expect(cache.write('cat-3', { huge: 'x'.repeat(200) })).rejects.toThrow('offline')
  })
})
