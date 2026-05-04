import type { StorefrontPayload } from '~/composables/useStorefrontExperience'

interface StorefrontCacheEntry {
  payload: StorefrontPayload
  fetchedAt: string
}

type StorefrontCacheMap = Record<string, StorefrontCacheEntry>

const CACHE_KEY = 'storefront.cache.v1'
const STALE_AFTER_MS = 5 * 60 * 1000
const EXPIRE_AFTER_MS = 24 * 60 * 60 * 1000

const emptyCache = (): StorefrontCacheMap => ({})

export const useStorefrontCache = () => {
  const cache = useState<StorefrontCacheMap>('storefront-cache', emptyCache)

  const hydrateFromStorage = () => {
    if (import.meta.server) {
      return
    }

    try {
      const raw = localStorage.getItem(CACHE_KEY)
      if (!raw) {
        return
      }

      const parsed = JSON.parse(raw) as StorefrontCacheMap
      cache.value = typeof parsed === 'object' && parsed ? parsed : {}
    } catch {
      cache.value = {}
    }
  }

  const persistToStorage = () => {
    if (import.meta.server) {
      return
    }

    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache.value))
    } catch {
      // Ignore storage write failures on constrained devices.
    }
  }

  const normalizeSlug = (slug: string) =>
    slug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\-_]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')

  const read = (slug: string): StorefrontPayload | null => {
    const entry = cache.value[normalizeSlug(slug)]
    if (!entry?.payload || !entry?.fetchedAt) {
      return null
    }

    const ageMs = Date.now() - Date.parse(entry.fetchedAt)
    if (Number.isNaN(ageMs) || ageMs > EXPIRE_AFTER_MS) {
      return null
    }

    return entry.payload
  }

  const isStale = (slug: string) => {
    const entry = cache.value[normalizeSlug(slug)]
    if (!entry?.fetchedAt) {
      return true
    }

    return Date.now() - Date.parse(entry.fetchedAt) > STALE_AFTER_MS
  }

  const write = (slug: string, payload: StorefrontPayload) => {
    cache.value = {
      ...cache.value,
      [normalizeSlug(slug)]: {
        payload,
        fetchedAt: new Date().toISOString(),
      },
    }
    persistToStorage()
  }

  const clear = (slug?: string) => {
    if (!slug) {
      cache.value = {}
    } else {
      const next = { ...cache.value }
      delete next[normalizeSlug(slug)]
      cache.value = next
    }

    if (import.meta.client) {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache.value))
    }
  }

  return {
    cache,
    hydrateFromStorage,
    read,
    isStale,
    write,
    clear,
  }
}
