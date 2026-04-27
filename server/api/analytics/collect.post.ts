import { randomUUID } from 'node:crypto'
import {
  getRequestMeta,
  isValidUuid,
  logApiWarn,
  safeReadJsonBody,
  sanitizePath,
  sanitizeText,
} from '../../utils/security'
import { logError, logInfo, setCorrelationId } from '../../utils/logger'
import { enforceRequestRateLimit } from '../../utils/rateLimit'
import { createSupabaseServiceRoleClient } from '../../utils/supabase'

type AnalyticsRequestBody = {
  catalogId?: string
  sessionUuid?: string
  eventType?: 'page_view' | 'product_click'
  productId?: string | null
  path?: string | null
}

const VALID_EVENT_TYPES = new Set(['page_view', 'product_click'])
const RATE_LIMIT_WINDOW_MS = 60 * 1000
const RATE_LIMIT_MAX_EVENTS = 100

const isValidEventType = (value: unknown): value is 'page_view' | 'product_click' =>
  typeof value === 'string' && VALID_EVENT_TYPES.has(value)

export default defineEventHandler(async (event) => {
  setCorrelationId(event, randomUUID())
  setResponseStatus(event, 202)

  const requestMeta = getRequestMeta(event, 'analytics')
  const { requestId, userAgent } = requestMeta
  logInfo(event, 'analytics:collect', 'received request', { requestId })
  const payload = await safeReadJsonBody<AnalyticsRequestBody>(event, 8 * 1024).catch(() => null)

  if (!payload) {
    return { ok: false, reason: 'invalid_payload', requestId }
  }

  if (await enforceRequestRateLimit(event, {
    scope: 'analytics:collect',
    limit: RATE_LIMIT_MAX_EVENTS,
    windowMs: RATE_LIMIT_WINDOW_MS,
    requestMeta,
  })) {
    return { ok: false, reason: 'rate_limited', requestId }
  }

  if (
    !isValidUuid(sanitizeText(payload.catalogId, 64))
    || !isValidUuid(sanitizeText(payload.sessionUuid, 64))
    || !isValidEventType(payload.eventType)
  ) {
    return { ok: false, reason: 'invalid_payload', requestId }
  }

  const supabase = createSupabaseServiceRoleClient(event)

  const { error } = await supabase.rpc('track_analytics_event', {
    p_catalog_id: sanitizeText(payload.catalogId, 64),
    p_session_uuid: sanitizeText(payload.sessionUuid, 64),
    p_event_type: payload.eventType,
    p_product_id: sanitizeText(payload.productId, 120) || null,
    p_path: sanitizePath(payload.path) || null,
    p_user_agent: userAgent,
  })

  if (error) {
    logApiWarn('analytics:collect', 'rpc failed', {
      requestId,
      catalogId: payload.catalogId,
      sessionUuid: payload.sessionUuid,
      eventType: payload.eventType,
      error: error.message,
    })
    logError(event, 'analytics:collect', error, { requestId, catalogId: payload.catalogId, eventType: payload.eventType })
    return { ok: false, requestId }
  }

  return { ok: true, requestId }
})
