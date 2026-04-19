import type { CatalogAnalyticsTrackPayload } from '~/types/analytics'

const COOKIE_NAME = 'catalog_analytics_id'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365

const createSessionUuid = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

export const useAnalytics = () => {
  const sessionCookie = useCookie<string | null>(COOKIE_NAME, {
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    secure: false,
    default: () => null,
  })

  const ensureSessionUuid = () => {
    if (!sessionCookie.value) {
      sessionCookie.value = createSessionUuid()
    }

    return sessionCookie.value
  }

  const dispatch = (payload: CatalogAnalyticsTrackPayload) => {
    if (import.meta.server) {
      return
    }

    const body = JSON.stringify({
      catalogId: payload.catalogId,
      sessionUuid: payload.sessionUuid,
      eventType: payload.eventType,
      productId: payload.productId ?? null,
      path: payload.path ?? window.location.pathname,
    })

    const url = '/api/analytics/collect'

    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' })
      navigator.sendBeacon(url, blob)
      return
    }

    void fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body,
      keepalive: true,
    }).catch(() => undefined)
  }

  const queueEvent = (payload: Omit<CatalogAnalyticsTrackPayload, 'sessionUuid'>) => {
    if (import.meta.server || !payload.catalogId) {
      return
    }

    const run = () => dispatch({
      ...payload,
      sessionUuid: ensureSessionUuid(),
    })

    if (typeof (window as typeof window & { requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => void }).requestIdleCallback === 'function') {
      ;(window as typeof window & { requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => void }).requestIdleCallback?.(run, { timeout: 1200 })
      return
    }

    window.setTimeout(run, 0)
  }

  const trackPageView = (catalogId: string, path?: string) => {
    queueEvent({
      catalogId,
      eventType: 'page_view',
      path,
    })
  }

  const trackProductClick = (catalogId: string, productId: string) => {
    queueEvent({
      catalogId,
      eventType: 'product_click',
      productId,
    })
  }

  return {
    ensureSessionUuid,
    trackPageView,
    trackProductClick,
  }
}
