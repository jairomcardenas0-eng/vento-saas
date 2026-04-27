import { useCookie } from 'nuxt/app'
import type { CatalogAnalyticsTrackPayload } from '~/types/analytics'

const VISITOR_COOKIE = 'catalog_visitor_id'
const VISITOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365
const SESSION_FIRED_PREFIX = 'analytics_fired_'

const runtime = globalThis as typeof globalThis & {
  sessionStorage?: Storage
  window?: {
    location?: { pathname?: string }
    setTimeout?: typeof setTimeout
    requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => void
  }
  navigator?: {
    sendBeacon?: (url: string, data?: unknown) => boolean
  }
}

const currentPath = () => runtime.window?.location?.pathname || '/'

const generateUuid = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`
}

const getTabSessionUuid = (): string => {
  const key = 'analytics_tab_session_uuid'
  let uuid = runtime.sessionStorage?.getItem(key) || null
  if (!uuid) {
    uuid = generateUuid()
    runtime.sessionStorage?.setItem(key, uuid)
  }
  return uuid
}

const isPageViewAlreadyFired = (catalogId: string): boolean =>
  runtime.sessionStorage?.getItem(`${SESSION_FIRED_PREFIX}${catalogId}`) === '1'

const markPageViewFired = (catalogId: string): void => {
  runtime.sessionStorage?.setItem(`${SESSION_FIRED_PREFIX}${catalogId}`, '1')
}

export const useAnalytics = () => {
  const visitorCookie = useCookie<string | null>(VISITOR_COOKIE, {
    sameSite: 'lax',
    maxAge: VISITOR_COOKIE_MAX_AGE,
    secure: false,
    default: () => null,
  })

  const ensureVisitorId = (): string => {
    if (!visitorCookie.value) {
      visitorCookie.value = generateUuid()
    }
    return visitorCookie.value
  }

  const dispatch = (payload: CatalogAnalyticsTrackPayload): void => {
    const body = JSON.stringify({
      catalogId: payload.catalogId,
      sessionUuid: payload.sessionUuid,
      eventType: payload.eventType,
      productId: payload.productId ?? null,
      path: payload.path ?? currentPath(),
    })

    const url = '/api/analytics/collect'

    if (runtime.navigator?.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' })
      runtime.navigator.sendBeacon(url, blob)
      return
    }

    void fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => undefined)
  }

  const queueDispatch = (payload: CatalogAnalyticsTrackPayload): void => {
    const run = () => dispatch(payload)

    if (typeof runtime.window?.requestIdleCallback === 'function') {
      runtime.window.requestIdleCallback(run, { timeout: 1500 })
    } else {
      runtime.window?.setTimeout?.(run, 0)
    }
  }

  const trackPageView = (catalogId: string, path?: string): void => {
    if (!import.meta.client || !catalogId) return
    if (isPageViewAlreadyFired(catalogId)) return

    markPageViewFired(catalogId)
    const sessionUuid = getTabSessionUuid()
    ensureVisitorId()

    queueDispatch({
      catalogId,
      sessionUuid,
      eventType: 'page_view',
      path: path ?? currentPath(),
    })
  }

  const trackProductClick = (catalogId: string, productId: string): void => {
    if (!import.meta.client || !catalogId || !productId) return

    queueDispatch({
      catalogId,
      sessionUuid: getTabSessionUuid(),
      eventType: 'product_click',
      productId,
      path: currentPath(),
    })
  }

  return {
    trackPageView,
    trackProductClick,
    ensureSessionUuid: ensureVisitorId,
  }
}
