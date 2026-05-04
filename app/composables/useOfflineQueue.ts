import { offlineAll, offlineDelete, offlinePut } from '~/utils/offlineStorage'
import { readonly, ref } from 'vue'

export type OfflineOperationType = 'order:create' | 'review:create' | 'analytics:collect' | 'generic:post'
export type OfflineOperationPriority = 1 | 2 | 3

export interface OfflineOperation {
  id: string
  type: OfflineOperationType
  url: string
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body: unknown
  priority: OfflineOperationPriority
  createdAt: string
  expiresAt: string
  attempts: number
  lastError?: string
}

const MAX_QUEUE_SIZE = 100
const OPERATION_TTL_MS = 7 * 24 * 60 * 60 * 1000
const QUEUE_SYNC_EVENT = 'vento-offline-queue-sync'

const pendingCount = ref(0)
const syncing = ref(false)
const lastSyncedAt = ref<string | null>(null)

const nowIso = () => new Date().toISOString()
const expiresIso = () => new Date(Date.now() + OPERATION_TTL_MS).toISOString()

const sortQueue = (items: OfflineOperation[]) =>
  [...items].sort((left, right) => {
    if (left.priority !== right.priority) {
      return left.priority - right.priority
    }

    return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
  })

const isExpired = (operation: OfflineOperation) => Date.parse(operation.expiresAt) < Date.now()

const requestBackgroundSync = async () => {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return
  }

  try {
    const registration = await navigator.serviceWorker.ready
    const syncManager = (registration as ServiceWorkerRegistration & {
      sync?: { register: (tag: string) => Promise<void> }
    }).sync
    await syncManager?.register?.('vento-offline-sync')
  } catch {
    // Background Sync is optional. Online/focus listeners still drain the queue.
  }
}

/**
 * Cola offline para operaciones criticas. Usa IndexedDB, limita tamano y reintenta en reconexion.
 */
export const useOfflineQueue = () => {
  const refreshCount = async () => {
    const items = await offlineAll<OfflineOperation>('queue')
    const activeItems = items.filter(item => !isExpired(item))
    pendingCount.value = activeItems.length

    await Promise.all(items.filter(isExpired).map(item => offlineDelete('queue', item.id)))
    return activeItems
  }

  const enqueue = async (payload: Omit<OfflineOperation, 'id' | 'createdAt' | 'expiresAt' | 'attempts'> & { id?: string }) => {
    const current = sortQueue(await refreshCount())
    const kept = current.slice(0, MAX_QUEUE_SIZE - 1)

    if (kept.length !== current.length) {
      await Promise.all(current.slice(MAX_QUEUE_SIZE - 1).map(item => offlineDelete('queue', item.id)))
    }

    const operation: OfflineOperation = {
      ...payload,
      id: payload.id || crypto.randomUUID(),
      createdAt: nowIso(),
      expiresAt: expiresIso(),
      attempts: 0,
    }

    await offlinePut('queue', operation)
    pendingCount.value = Math.min(kept.length + 1, MAX_QUEUE_SIZE)
    await requestBackgroundSync()

    if (import.meta.client) {
      globalThis.dispatchEvent(new CustomEvent(QUEUE_SYNC_EVENT))
    }

    return operation
  }

  const sendOperation = async (operation: OfflineOperation) => {
    const response = await fetch(operation.url, {
      method: operation.method,
      headers: {
        'content-type': 'application/json',
        'x-vento-offline-operation': operation.id,
      },
      body: JSON.stringify(operation.body),
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`.trim())
    }
  }

  const sync = async () => {
    if (syncing.value || (import.meta.client && navigator.onLine === false)) {
      return
    }

    syncing.value = true
    try {
      const items = sortQueue(await refreshCount())

      for (const operation of items) {
        if (isExpired(operation)) {
          await offlineDelete('queue', operation.id)
          continue
        }

        try {
          await sendOperation(operation)
          await offlineDelete('queue', operation.id)
        } catch (error) {
          await offlinePut('queue', {
            ...operation,
            attempts: operation.attempts + 1,
            lastError: error instanceof Error ? error.message : String(error),
          })
        }
      }

      await refreshCount()
      lastSyncedAt.value = nowIso()
    } finally {
      syncing.value = false
    }
  }

  const bindAutoSync = () => {
    if (!import.meta.client) {
      return () => {}
    }

    const handler = () => {
      void sync()
    }

    globalThis.addEventListener('online', handler)
    globalThis.addEventListener('focus', handler)
    globalThis.addEventListener(QUEUE_SYNC_EVENT, handler)
    void refreshCount()
    if (navigator.onLine !== false) {
      void sync()
    }

    return () => {
      globalThis.removeEventListener('online', handler)
      globalThis.removeEventListener('focus', handler)
      globalThis.removeEventListener(QUEUE_SYNC_EVENT, handler)
    }
  }

  return {
    pendingCount: readonly(pendingCount),
    syncing: readonly(syncing),
    lastSyncedAt: readonly(lastSyncedAt),
    enqueue,
    refreshCount,
    sync,
    bindAutoSync,
  }
}
