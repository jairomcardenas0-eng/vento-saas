import { createHash } from 'node:crypto'
import type { H3Event } from 'h3'

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const PUBLIC_ENTITY_ID_REGEX = /^(order|review)-[a-z0-9][a-z0-9-]{8,78}$/i
const DEFAULT_BODY_LIMIT_BYTES = 32 * 1024

type RateBucket = {
  count: number
  resetAt: number
}

type RequestMeta = {
  requestId: string
  clientIp: string
  userAgent: string
  clientFingerprint: string
}

type EventWithRequestMeta = H3Event & {
  context: H3Event['context'] & {
    __requestMeta?: RequestMeta
  }
}

export const isValidUuid = (value: unknown): value is string =>
  typeof value === 'string' && UUID_REGEX.test(value)

export const isValidPublicEntityId = (value: unknown, prefix?: 'order' | 'review'): value is string => {
  if (typeof value !== 'string') {
    return false
  }

  const normalized = value.trim()
  if (!normalized || !PUBLIC_ENTITY_ID_REGEX.test(normalized)) {
    return false
  }

  return prefix ? normalized.startsWith(`${prefix}-`) : true
}

export const generateServerEntityId = (prefix: 'order' | 'review') =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

export const sanitizeText = (
  value: unknown,
  maxLength: number,
  options?: {
    preserveLineBreaks?: boolean
    uppercase?: boolean
  },
) => {
  const raw = String(value || '')
  const normalizedWhitespace = options?.preserveLineBreaks
    ? raw.replace(/\r\n/g, '\n').replace(/[^\S\n]+/g, ' ')
    : raw.replace(/\s+/g, ' ')
  const withoutHtml = normalizedWhitespace.replace(/<[^>]*>/g, ' ')

  const compact = withoutHtml
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maxLength)

  return options?.uppercase ? compact.toUpperCase() : compact
}

export const sanitizePath = (value: unknown, maxLength = 160) => {
  const path = sanitizeText(value, maxLength)
  if (!path) {
    return null
  }

  if (!path.startsWith('/')) {
    return null
  }

  return path
}

export const sanitizeStringArray = (value: unknown, itemMaxLength: number, maxItems = 20) => {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .slice(0, maxItems)
    .map(item => sanitizeText(item, itemMaxLength))
    .filter(Boolean)
}

export const asMoney = (value: unknown) => {
  const amount = Number(value || 0)
  return Number.isFinite(amount) ? Number(amount.toFixed(2)) : 0
}

export const sameMoney = (left: number, right: number) => Math.abs(left - right) < 0.01

export const safeReadJsonBody = async <T>(event: H3Event, maxBytes = DEFAULT_BODY_LIMIT_BYTES): Promise<T | null> => {
  try {
    const raw = await readRawBody(event)
    if (!raw) {
      return null
    }

    if (Buffer.byteLength(raw, 'utf8') > maxBytes) {
      throw createError({ statusCode: 413, statusMessage: 'Payload demasiado grande' })
    }

    return JSON.parse(raw) as T
  } catch (error: unknown) {
    if (
      typeof error === 'object'
      && error !== null
      && 'statusCode' in error
      && typeof (error as { statusCode?: unknown }).statusCode === 'number'
    ) {
      throw error
    }

    throw createError({ statusCode: 400, statusMessage: 'Payload invalido' })
  }
}

export const enforceRateLimit = (
  buckets: Map<string, RateBucket>,
  key: string,
  options: {
    windowMs: number
    limit: number
  },
) => {
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + options.windowMs })
    return {
      limited: false,
      remaining: Math.max(options.limit - 1, 0),
      resetAt: now + options.windowMs,
      count: 1,
    }
  }

  bucket.count += 1
  return {
    limited: bucket.count > options.limit,
    remaining: Math.max(options.limit - bucket.count, 0),
    resetAt: bucket.resetAt,
    count: bucket.count,
  }
}

export const getRequestMeta = (event: H3Event, scope: string) => {
  const eventWithMeta = event as EventWithRequestMeta
  if (eventWithMeta.context.__requestMeta) {
    return eventWithMeta.context.__requestMeta
  }

  const requestId = `req-${scope}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  const clientIp = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  const userAgent = sanitizeText(getHeader(event, 'user-agent') || '', 240) || 'unknown'
  const fingerprintSeed = [
    userAgent,
    sanitizeText(getHeader(event, 'accept-language') || '', 120),
    sanitizeText(getHeader(event, 'sec-ch-ua') || '', 120),
    sanitizeText(getHeader(event, 'sec-ch-ua-platform') || '', 80),
    sanitizeText(getHeader(event, 'accept') || '', 120),
  ].join('|')
  const clientFingerprint = createHash('sha256')
    .update(fingerprintSeed || 'anonymous')
    .digest('hex')
    .slice(0, 24)

  setHeader(event, 'X-Request-Id', requestId)

  const meta = {
    requestId,
    clientIp,
    userAgent,
    clientFingerprint,
  }

  eventWithMeta.context.__requestMeta = meta
  return meta
}

export const logApiWarn = (scope: string, message: string, meta: Record<string, unknown> = {}) => {
  console.warn(`[${scope}] ${message}`, meta)
}
