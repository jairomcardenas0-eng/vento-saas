import type { CatalogAnalyticsOverview } from '~/types/analytics'
import type {
  AnalyticsSnapshotRow,
  BackendSupabaseClient,
  EnsureSuccess,
} from './types'

interface CreateSupabaseAnalyticsBackendOptions {
  supabase: BackendSupabaseClient
  ensureSuccess: EnsureSuccess
}

export const createSupabaseAnalyticsBackend = ({
  supabase,
  ensureSuccess,
}: CreateSupabaseAnalyticsBackendOptions) => {
  const runtime = globalThis as typeof globalThis & {
    document?: {
      hidden?: boolean
      addEventListener?: (type: string, listener: () => void) => void
      removeEventListener?: (type: string, listener: () => void) => void
    }
    window?: {
      addEventListener?: (type: string, listener: () => void) => void
      removeEventListener?: (type: string, listener: () => void) => void
    }
  }

  const getCatalogAnalytics = async (catalogId: string, rangeDays = 7): Promise<CatalogAnalyticsOverview> => {
    const normalizedRange = Math.max(1, Math.min(Math.round(rangeDays || 7), 60))
    const { data, error } = await supabase.rpc('get_catalog_analytics_snapshot', {
      target_catalog_id: catalogId,
      range_days: normalizedRange,
    })

    ensureSuccess(error, 'No se pudieron cargar las metricas del catalogo')

    const snapshot = (data || {}) as AnalyticsSnapshotRow

    return {
      rangeDays: Number(snapshot.rangeDays || normalizedRange),
      totals: {
        pageViews: Number(snapshot.totals?.pageViews || 0),
        activeUsers: Number(snapshot.totals?.activeUsers || 0),
        newUsers: Number(snapshot.totals?.newUsers || 0),
        productClicks: Number(snapshot.totals?.productClicks || 0),
      },
      daily: Array.isArray(snapshot.daily)
        ? snapshot.daily.map((point) => ({
          day: String(point?.day || ''),
          pageViews: Number(point?.pageViews || 0),
          activeUsers: Number(point?.activeUsers || 0),
          newUsers: Number(point?.newUsers || 0),
          productClicks: Number(point?.productClicks || 0),
        }))
        : [],
    }
  }

  const watchCatalogAnalytics = (
    catalogId: string,
    callback: (payload: CatalogAnalyticsOverview) => Promise<void> | void,
    onError?: (error: Error) => void,
    rangeDays = 7,
    onRealtimeHit?: () => void,
  ) => {
    if (!catalogId) {
      return () => {}
    }

    const ACTIVE_POLL_INTERVAL_MS = 15000
    const IDLE_POLL_INTERVAL_MS = 60000
    const ACTIVE_WINDOW_MS = 90000
    let disposed = false
    let inFlight = false
    let lastActiveAt = Date.now()
    let timer: ReturnType<typeof setTimeout> | null = null

    const clearTimer = () => {
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
    }

    const scheduleNextFetch = (forceActive = false) => {
      if (disposed || import.meta.server) {
        return
      }

      clearTimer()

      if (runtime.document?.hidden) {
        return
      }

      const now = Date.now()
      const interval = forceActive || now - lastActiveAt < ACTIVE_WINDOW_MS
        ? ACTIVE_POLL_INTERVAL_MS
        : IDLE_POLL_INTERVAL_MS

      timer = setTimeout(() => {
        timer = null
        fetchAnalytics()
          .catch((error) => onError?.(error as Error))
          .finally(() => scheduleNextFetch())
      }, interval)
    }

    const fetchAnalytics = async () => {
      if (disposed || inFlight) {
        return
      }

      inFlight = true

      try {
        await callback(await getCatalogAnalytics(catalogId, rangeDays))
      } finally {
        inFlight = false
      }
    }

    fetchAnalytics()
      .catch((error) => onError?.(error as Error))
      .finally(() => scheduleNextFetch(true))

    const visibilityHandler = () => {
      lastActiveAt = Date.now()

      if (runtime.document?.hidden) {
        clearTimer()
        return
      }

      onRealtimeHit?.()
      fetchAnalytics()
        .catch((error) => onError?.(error as Error))
        .finally(() => scheduleNextFetch(true))
    }

    if (import.meta.client) {
      runtime.document?.addEventListener?.('visibilitychange', visibilityHandler)
      runtime.window?.addEventListener?.('focus', visibilityHandler)
    }

    return () => {
      disposed = true
      clearTimer()
      if (import.meta.client) {
        runtime.document?.removeEventListener?.('visibilitychange', visibilityHandler)
        runtime.window?.removeEventListener?.('focus', visibilityHandler)
      }
    }
  }

  return {
    getCatalogAnalytics,
    watchCatalogAnalytics,
  }
}
