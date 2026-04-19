type TrackerEventType = 'search' | 'store_view' | 'product_view' | 'hub_view'

interface TrackerEvent {
  type: TrackerEventType
  value: string
  tags: string[]
  at: string
}

interface TrackerSnapshot {
  recentSearches: string[]
  preferredTags: string[]
  events: TrackerEvent[]
  lastUpdatedAt: string | null
}

const TRACKER_KEY = 'marketplace.algorithmic.tracker.v1'
const MAX_EVENTS = 120
const MAX_RECENT_SEARCHES = 5

const normalizeTokens = (values: Array<string | null | undefined>) =>
  [...new Set(
    values
      .flatMap(value => String(value || '').split(/[,|/]/g))
      .map(value => value.trim().toLowerCase())
      .filter(value => value.length >= 2),
  )]

const createEmptySnapshot = (): TrackerSnapshot => ({
  recentSearches: [],
  preferredTags: [],
  events: [],
  lastUpdatedAt: null,
})

export const useAlgorithmicTracker = () => {
  const tracker = useState<TrackerSnapshot>('marketplace-algorithmic-tracker', createEmptySnapshot)

  const rebuildPreferredTags = () => {
    const scores = new Map<string, number>()

    tracker.value.events.forEach((event, index) => {
      const freshnessBoost = Math.max(1, tracker.value.events.length - index)
      event.tags.forEach((tag) => {
        scores.set(tag, (scores.get(tag) || 0) + freshnessBoost)
      })
    })

    tracker.value.preferredTags = [...scores.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 12)
      .map(([tag]) => tag)
  }

  const persist = () => {
    tracker.value.lastUpdatedAt = new Date().toISOString()
    rebuildPreferredTags()

    if (import.meta.client) {
      localStorage.setItem(TRACKER_KEY, JSON.stringify(tracker.value))
    }
  }

  const hydrate = () => {
    if (import.meta.server) {
      return
    }

    try {
      const raw = localStorage.getItem(TRACKER_KEY)
      if (!raw) {
        return
      }

      const parsed = JSON.parse(raw) as Partial<TrackerSnapshot>
      tracker.value = {
        recentSearches: Array.isArray(parsed.recentSearches) ? parsed.recentSearches.filter(Boolean).slice(0, MAX_RECENT_SEARCHES) : [],
        preferredTags: Array.isArray(parsed.preferredTags) ? parsed.preferredTags.filter(Boolean).slice(0, 12) : [],
        events: Array.isArray(parsed.events) ? parsed.events.slice(-MAX_EVENTS).map((entry) => ({
          type: entry.type || 'search',
          value: String(entry.value || ''),
          tags: normalizeTokens(Array.isArray(entry.tags) ? entry.tags : []),
          at: entry.at || new Date().toISOString(),
        })) : [],
        lastUpdatedAt: parsed.lastUpdatedAt || null,
      }
      rebuildPreferredTags()
    } catch {
      tracker.value = createEmptySnapshot()
    }
  }

  const pushEvent = (type: TrackerEventType, value: string, tags: string[]) => {
    const normalizedValue = value.trim()
    const normalizedTags = normalizeTokens([normalizedValue, ...tags])

    if (!normalizedValue && !normalizedTags.length) {
      return
    }

    tracker.value.events = [
      ...tracker.value.events,
      {
        type,
        value: normalizedValue,
        tags: normalizedTags,
        at: new Date().toISOString(),
      },
    ].slice(-MAX_EVENTS)

    persist()
  }

  const rememberSearch = (term: string) => {
    const normalized = term.trim()
    if (!normalized) {
      return
    }

    tracker.value.recentSearches = [
      normalized,
      ...tracker.value.recentSearches.filter(item => item.toLowerCase() !== normalized.toLowerCase()),
    ].slice(0, MAX_RECENT_SEARCHES)

    pushEvent('search', normalized, [normalized])
  }

  const trackStoreView = (payload: { store: string, businessTypes?: string[], city?: string, tagline?: string }) => {
    pushEvent('store_view', payload.store, [
      payload.store,
      ...(payload.businessTypes || []),
      payload.city || '',
      payload.tagline || '',
    ])
  }

  const trackProductView = (payload: { product: string, tags?: string[], businessName?: string, city?: string }) => {
    pushEvent('product_view', payload.product, [
      payload.product,
      ...(payload.tags || []),
      payload.businessName || '',
      payload.city || '',
    ])
  }

  const trackHubView = (payload: { region: string, city?: string, stateCode?: string }) => {
    pushEvent('hub_view', payload.region, [payload.region, payload.city || '', payload.stateCode || ''])
  }

  const clear = () => {
    tracker.value = createEmptySnapshot()
    if (import.meta.client) {
      localStorage.removeItem(TRACKER_KEY)
    }
  }

  return {
    tracker: readonly(tracker),
    hydrate,
    clear,
    rememberSearch,
    trackStoreView,
    trackProductView,
    trackHubView,
    preferredTags: computed(() => tracker.value.preferredTags),
    recentSearches: computed(() => tracker.value.recentSearches),
  }
}
