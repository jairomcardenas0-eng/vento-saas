import { readonly, ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const queueStore = new Map<string, Record<string, unknown>>()

vi.mock('~/utils/offlineStorage', () => ({
  offlineAll: vi.fn(async () => Array.from(queueStore.values())),
  offlineDelete: vi.fn(async (_store: string, id: string) => {
    queueStore.delete(id)
  }),
  offlinePut: vi.fn(async (_store: string, value: Record<string, unknown>) => {
    queueStore.set(String(value.id), value)
  }),
}))

describe('useOfflineQueue', () => {
  beforeEach(() => {
    queueStore.clear()
    vi.resetModules()
    vi.stubGlobal('useState', (_key: string, init: () => unknown) => ref(init()))
    vi.stubGlobal('readonly', readonly)
    vi.stubGlobal('crypto', { randomUUID: () => `op-${queueStore.size + 1}` })
    vi.stubGlobal('navigator', { onLine: true })
    vi.stubGlobal('window', {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })
    vi.stubGlobal('CustomEvent', class CustomEvent {
      type: string
      constructor(type: string) {
        this.type = type
      }
    })
  })

  it('stores pending operations with priority and generated metadata', async () => {
    const { useOfflineQueue } = await import('../../../app/composables/useOfflineQueue')
    const queue = useOfflineQueue()

    const operation = await queue.enqueue({
      type: 'order:create',
      url: '/api/orders/create',
      method: 'POST',
      body: { catalogId: 'cat-1' },
      priority: 1,
    })

    expect(operation.id).toBe('op-1')
    expect(operation.attempts).toBe(0)
    expect(queue.pendingCount.value).toBe(1)
    expect(queueStore.get('op-1')).toMatchObject({ type: 'order:create', priority: 1 })
  })

  it('syncs successful operations and removes them from the queue', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true })))
    const { useOfflineQueue } = await import('../../../app/composables/useOfflineQueue')
    const queue = useOfflineQueue()

    await queue.enqueue({
      type: 'review:create',
      url: '/api/reviews/create',
      method: 'POST',
      body: { review: { rating: 5 } },
      priority: 2,
    })
    await queue.sync()

    expect(queue.pendingCount.value).toBe(0)
    expect(queueStore.size).toBe(0)
    expect(fetch).toHaveBeenCalledWith('/api/reviews/create', expect.objectContaining({
      method: 'POST',
      cache: 'no-store',
    }))
  })

  it('keeps failed operations and increments attempts for later retry', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 503, statusText: 'Offline' })))
    const { useOfflineQueue } = await import('../../../app/composables/useOfflineQueue')
    const queue = useOfflineQueue()

    await queue.enqueue({
      type: 'order:create',
      url: '/api/orders/create',
      method: 'POST',
      body: { catalogId: 'cat-1' },
      priority: 1,
    })
    await queue.sync()

    expect(queue.pendingCount.value).toBe(1)
    expect(queueStore.get('op-1')).toMatchObject({ attempts: 1, lastError: '503 Offline' })
  })
})
