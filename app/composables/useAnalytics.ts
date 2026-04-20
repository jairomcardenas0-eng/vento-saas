/**
 * useAnalytics — Sistema de analíticas anti-spam, anti-SSR, idempotente.
 *
 * Garantías:
 *  1. Solo corre en el cliente (import.meta.client).
 *  2. Idempotencia por TAB: sessionStorage marca si ya se disparó el evento
 *     en esta pestaña. Recargar (F5) no suma visita nueva.
 *  3. El persistent_visitor_id (cookie de 1 año) distingue usuarios nuevos
 *     vs recurrentes en el backend, pero NO controla el disparo del evento.
 *  4. Cada nueva pestaña/ventana tiene su propio sessionStorage → sí suma.
 *  5. Usa requestIdleCallback para no bloquear el hilo principal.
 */

import type { CatalogAnalyticsTrackPayload } from '~/types/analytics'

// ─── Constantes ──────────────────────────────────────────────────────────────

/** Cookie de larga duración: identifica al visitante entre sesiones (nuevo vs recurrente). */
const VISITOR_COOKIE = 'catalog_visitor_id'
const VISITOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 // 1 año

/** Prefijo de clave en sessionStorage: marca si ya se disparó el page_view en esta TAB. */
const SESSION_FIRED_PREFIX = 'analytics_fired_'

// ─── Helpers ─────────────────────────────────────────────────────────────────

const generateUuid = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  // Fallback para navegadores muy antiguos
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}-${Math.random().toString(16).slice(2)}`
}

/**
 * Devuelve un UUID de sesión de TAB único.
 * Se genera una vez por pestaña y se guarda en sessionStorage.
 * Al cerrar la pestaña desaparece → nueva pestaña = nueva sesión.
 */
const getTabSessionUuid = (): string => {
  const key = 'analytics_tab_session_uuid'
  let uuid = sessionStorage.getItem(key)
  if (!uuid) {
    uuid = generateUuid()
    sessionStorage.setItem(key, uuid)
  }
  return uuid
}

/**
 * Verifica si ya se disparó el page_view para este catalogId en esta TAB.
 * Retorna true si ya se disparó (no volver a disparar).
 */
const isPageViewAlreadyFired = (catalogId: string): boolean => {
  return sessionStorage.getItem(`${SESSION_FIRED_PREFIX}${catalogId}`) === '1'
}

/** Marca el page_view como disparado para este catalogId en esta TAB. */
const markPageViewFired = (catalogId: string): void => {
  sessionStorage.setItem(`${SESSION_FIRED_PREFIX}${catalogId}`, '1')
}

// ─── Composable ──────────────────────────────────────────────────────────────

export const useAnalytics = () => {
  // Cookie de larga duración: identifica al visitante (no controla idempotencia)
  const visitorCookie = useCookie<string | null>(VISITOR_COOKIE, {
    sameSite: 'lax',
    maxAge: VISITOR_COOKIE_MAX_AGE,
    secure: false,
    default: () => null,
  })

  /**
   * Asegura que el visitante tenga un ID persistente (cookie de 1 año).
   * Este ID se usa como session_uuid en el backend para distinguir
   * usuarios nuevos vs recurrentes entre sesiones de navegador.
   */
  const ensureVisitorId = (): string => {
    if (!visitorCookie.value) {
      visitorCookie.value = generateUuid()
    }
    return visitorCookie.value
  }

  /**
   * Despacha el evento al server route /api/analytics/collect.
   * Usa sendBeacon si está disponible (no bloquea la navegación).
   */
  const dispatch = (payload: CatalogAnalyticsTrackPayload): void => {
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
      headers: { 'content-type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => undefined)
  }

  /**
   * Encola el evento para ejecutarse en tiempo de inactividad del navegador.
   * Garantiza que no bloquea el render inicial.
   */
  const queueDispatch = (payload: CatalogAnalyticsTrackPayload): void => {
    const run = () => dispatch(payload)

    const win = window as typeof window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => void
    }

    if (typeof win.requestIdleCallback === 'function') {
      win.requestIdleCallback(run, { timeout: 1500 })
    } else {
      window.setTimeout(run, 0)
    }
  }

  /**
   * Registra un page_view con idempotencia de TAB.
   *
   * - Solo se ejecuta en el cliente (import.meta.client).
   * - Si ya se disparó en esta pestaña → no hace nada (anti-F5).
   * - Usa el UUID de la TAB como session_uuid (nueva pestaña = nueva sesión).
   * - El visitor_id (cookie) va como metadato para distinguir nuevos vs recurrentes.
   */
  const trackPageView = (catalogId: string, path?: string): void => {
    if (!import.meta.client || !catalogId) return

    // Guard de idempotencia: si ya se disparó en esta TAB, salir
    if (isPageViewAlreadyFired(catalogId)) return

    // Marcar como disparado ANTES de enviar (evita doble disparo en race conditions)
    markPageViewFired(catalogId)

    // El session_uuid es el UUID de esta TAB (único por pestaña, muere al cerrarla)
    const sessionUuid = getTabSessionUuid()

    // Asegurar que el visitante tenga cookie de larga duración
    ensureVisitorId()

    queueDispatch({
      catalogId,
      sessionUuid,
      eventType: 'page_view',
      path: path ?? window.location.pathname,
    })
  }

  /**
   * Registra un product_click.
   * No tiene guard de idempotencia (el usuario puede clickear múltiples productos).
   * Sí requiere estar en el cliente.
   */
  const trackProductClick = (catalogId: string, productId: string): void => {
    if (!import.meta.client || !catalogId || !productId) return

    const sessionUuid = getTabSessionUuid()

    queueDispatch({
      catalogId,
      sessionUuid,
      eventType: 'product_click',
      productId,
      path: window.location.pathname,
    })
  }

  return {
    trackPageView,
    trackProductClick,
    /** Expuesto para compatibilidad con código existente */
    ensureSessionUuid: ensureVisitorId,
  }
}
