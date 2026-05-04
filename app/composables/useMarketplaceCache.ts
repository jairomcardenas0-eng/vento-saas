import type { MarketplaceFeedEntry, MarketplaceHub, MarketplaceProductCard, MarketplaceStoreCard } from '~/types/catalog'

export interface MarketplaceLandingCache {
  topStores: MarketplaceStoreCard[]
  viralProducts: MarketplaceProductCard[]
  hubs: MarketplaceHub[]
  forYou: MarketplaceFeedEntry[]
  fetchedAt: string | null
  signature: string
}

const CACHE_KEY = 'marketplace.landing.cache.v2'
// Data is shown instantly and refreshed in background after this window (2 min)
const STALE_AFTER_MS = 2 * 60 * 1000
// Data is fully expired and must be refetched before showing after this window (15 min)
const EXPIRE_AFTER_MS = 15 * 60 * 1000

const emptyCache = (): MarketplaceLandingCache => ({
  topStores: [],
  viralProducts: [],
  hubs: [],
  forYou: [],
  fetchedAt: null,
  signature: '',
})

export const useMarketplaceCache = () => {
  const cache = useState<MarketplaceLandingCache>('marketplace-landing-cache', emptyCache)

  /**
   * Loads persisted data from localStorage into reactive state immediately.
   * Call this as early as possible (onBeforeMount or inline) so the UI paints
   * before any network request completes.
   */
  const hydrateFromStorage = () => {
    if (import.meta.server) {
      return
    }

    try {
      const raw = localStorage.getItem(CACHE_KEY)
      if (!raw) {
        return
      }

      const parsed = JSON.parse(raw) as Partial<MarketplaceLandingCache>

      // Validate the shape minimally
      if (!parsed.fetchedAt) {
        return
      }

      cache.value = {
        topStores: Array.isArray(parsed.topStores) ? parsed.topStores : [],
        viralProducts: Array.isArray(parsed.viralProducts) ? parsed.viralProducts : [],
        hubs: Array.isArray(parsed.hubs) ? parsed.hubs : [],
        forYou: Array.isArray(parsed.forYou) ? parsed.forYou : [],
        fetchedAt: parsed.fetchedAt ?? null,
        signature: parsed.signature ?? '',
      }
    } catch {
      // Corrupt data — ignore and start fresh
    }
  }

  /**
   * Persist the current cache to localStorage so it survives page reloads.
   */
  const persistToStorage = () => {
    if (import.meta.server) {
      return
    }

    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache.value))
    } catch {
      // localStorage might be full or disabled — not critical
    }
  }

  const hasContent = computed(() =>
    cache.value.topStores.length > 0
    || cache.value.viralProducts.length > 0
    || cache.value.hubs.length > 0
    || cache.value.forYou.length > 0,
  )

  const ageMs = computed(() => {
    if (!cache.value.fetchedAt) {
      return Infinity
    }

    const parsed = Date.parse(cache.value.fetchedAt)
    if (Number.isNaN(parsed)) {
      return Infinity
    }

    return Date.now() - parsed
  })

  /** Data exists but is old enough to warrant a background refresh */
  const isStale = computed(() => ageMs.value > STALE_AFTER_MS)

  /** Data is so old it should not be shown until a fresh fetch completes */
  const isExpired = computed(() => ageMs.value > EXPIRE_AFTER_MS)

  const write = (payload: Omit<MarketplaceLandingCache, 'fetchedAt' | 'signature'>, signature: string) => {
    cache.value = {
      ...payload,
      fetchedAt: new Date().toISOString(),
      signature,
    }
    persistToStorage()
  }

  const clear = () => {
    cache.value = emptyCache()

    if (import.meta.client) {
      localStorage.removeItem(CACHE_KEY)
    }
  }

  return {
    cache,
    hasContent,
    isStale,
    isExpired,
    hydrateFromStorage,
    write,
    clear,
  }
}
