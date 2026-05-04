import { compressToUTF16, decompressFromUTF16 } from 'lz-string'
import { estimateOfflineStorage, offlineDelete, offlineGet, offlinePut } from '~/utils/offlineStorage'

export interface CatalogCacheEntry<T = unknown> {
  id: string
  catalogId: string
  compressedPayload: string
  createdAt: string
  updatedAt: string
  expiresAt: string
  lastSyncAt: string | null
  bytes: number
  version: number
  payload?: T
}

export interface CatalogCacheOptions {
  ttlMs?: number
  maxCatalogBytes?: number
}

const DEFAULT_TTL_MS = 60 * 60 * 1000
const DEFAULT_MAX_CATALOG_BYTES = 50 * 1024 * 1024
const CACHE_VERSION = 1

const byteLength = (value: string) => new Blob([value]).size

const stripHeavyImageData = <T>(payload: T): T => {
  const cloned = JSON.parse(JSON.stringify(payload)) as T
  const walk = (value: unknown) => {
    if (!value || typeof value !== 'object') {
      return
    }

    if (Array.isArray(value)) {
      value.forEach(walk)
      return
    }

    const record = value as Record<string, unknown>
    if (Array.isArray(record.image_urls)) {
      record.image_urls = record.image_urls.slice(0, 3)
    }
    if (Array.isArray(record.images)) {
      record.images = record.images.slice(0, 3)
    }

    Object.values(record).forEach(walk)
  }

  walk(cloned)
  return cloned
}

/**
 * Cache SWR de catalogos en IndexedDB. Guarda JSON comprimido y evita payloads pesados.
 */
export const useCatalogCache = <T = unknown>(options: CatalogCacheOptions = {}) => {
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS
  const maxCatalogBytes = options.maxCatalogBytes ?? DEFAULT_MAX_CATALOG_BYTES

  const read = async (catalogId: string): Promise<{ payload: T | null; stale: boolean; entry: CatalogCacheEntry<T> | null }> => {
    const entry = await offlineGet<CatalogCacheEntry<T>>('catalogs', catalogId)
    if (!entry) {
      return { payload: null, stale: true, entry: null }
    }

    const json = decompressFromUTF16(entry.compressedPayload)
    if (!json) {
      await offlineDelete('catalogs', catalogId)
      return { payload: null, stale: true, entry: null }
    }

    return {
      payload: JSON.parse(json) as T,
      stale: Date.parse(entry.expiresAt) < Date.now(),
      entry,
    }
  }

  const write = async (catalogId: string, payload: T, lastSyncAt?: string | null) => {
    const slimPayload = stripHeavyImageData(payload)
    const json = JSON.stringify(slimPayload)
    const compressedPayload = compressToUTF16(json)
    const bytes = byteLength(compressedPayload)

    if (bytes > maxCatalogBytes) {
      throw new Error('El catalogo excede el limite offline permitido.')
    }

    const now = new Date()
    const entry: CatalogCacheEntry<T> = {
      id: catalogId,
      catalogId,
      compressedPayload,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + ttlMs).toISOString(),
      lastSyncAt: lastSyncAt || now.toISOString(),
      bytes,
      version: CACHE_VERSION,
    }

    await offlinePut('catalogs', entry)
    return entry
  }

  const remove = (catalogId: string) => offlineDelete('catalogs', catalogId)

  return {
    read,
    write,
    remove,
    estimate: estimateOfflineStorage,
  }
}
