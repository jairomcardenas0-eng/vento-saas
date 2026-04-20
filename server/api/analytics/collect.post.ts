/**
 * POST /api/analytics/collect
 *
 * Server route que recibe eventos de analítica desde el cliente público.
 * Usa la RPC atómica `track_analytics_event` para evitar race conditions.
 *
 * Seguridad:
 *  - Valida UUIDs antes de tocar la base de datos.
 *  - Valida event_type contra lista blanca.
 *  - Siempre responde 202 (no revela errores internos al cliente).
 *  - Usa anon key: la RPC tiene SECURITY DEFINER para bypassear RLS.
 */

import { createClient } from '@supabase/supabase-js'
import type { H3Event } from 'h3'

// ─── Tipos ───────────────────────────────────────────────────────────────────

type AnalyticsRequestBody = {
  catalogId?: string
  sessionUuid?: string
  eventType?: 'page_view' | 'product_click'
  productId?: string | null
  path?: string | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const VALID_EVENT_TYPES = new Set(['page_view', 'product_click'])

const isValidUuid = (value: unknown): value is string =>
  typeof value === 'string' && UUID_REGEX.test(value)

const isValidEventType = (value: unknown): value is 'page_view' | 'product_click' =>
  typeof value === 'string' && VALID_EVENT_TYPES.has(value)

const parsePayload = async (event: H3Event): Promise<AnalyticsRequestBody> => {
  try {
    const raw = await readRawBody(event)
    if (!raw) return {}
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

// ─── Handler ─────────────────────────────────────────────────────────────────

export default defineEventHandler(async (event) => {
  // Siempre responder 202 Accepted (fire-and-forget desde el cliente)
  setResponseStatus(event, 202)

  const payload = await parsePayload(event)

  // Validación estricta de campos requeridos
  if (
    !isValidUuid(payload.catalogId)
    || !isValidUuid(payload.sessionUuid)
    || !isValidEventType(payload.eventType)
  ) {
    return { ok: false, reason: 'invalid_payload' }
  }

  const config = useRuntimeConfig(event)

  // Usamos anon key: la RPC track_analytics_event tiene SECURITY DEFINER
  // y maneja sus propias validaciones internas.
  const supabase = createClient(
    config.public.supabaseUrl,
    config.public.supabaseAnonKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  )

  const userAgent = getHeader(event, 'user-agent') || null

  // Llamada a la RPC atómica: upsert sesión + insert evento en una transacción
  const { error } = await supabase.rpc('track_analytics_event', {
    p_catalog_id: payload.catalogId,
    p_session_uuid: payload.sessionUuid,
    p_event_type: payload.eventType,
    p_product_id: payload.productId || null,
    p_path: payload.path || null,
    p_user_agent: userAgent,
  })

  if (error) {
    // Log interno sin exponer detalles al cliente
    console.warn('[analytics:collect] RPC error:', error.message)
    return { ok: false }
  }

  return { ok: true }
})
