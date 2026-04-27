import type { H3Event } from 'h3'
import { enforceRateLimit, getRequestMeta } from './security'

type LocalBucket = {
  count: number
  resetAt: number
}

type RateLimitOptions = {
  scope: string
  limit: number
  windowMs: number
  keyParts?: Array<string | null | undefined>
  requestMeta?: ReturnType<typeof getRequestMeta>
}

type RateLimitResult = {
  limited: boolean
  remaining: number
  resetAt: number
}

const localBuckets = new Map<string, LocalBucket>()

export const normalizeRateLimitKeyPart = (value: string | null | undefined) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9:_-]+/g, '-')
    .slice(0, 120) || 'global'

const applyRateLimitHeaders = (event: H3Event, limit: number, result: RateLimitResult) => {
  const retryAfterSeconds = Math.max(Math.ceil((result.resetAt - Date.now()) / 1000), 0)
  setHeader(event, 'X-RateLimit-Limit', String(limit))
  setHeader(event, 'X-RateLimit-Remaining', String(result.remaining))
  setHeader(event, 'X-RateLimit-Reset', String(Math.ceil(result.resetAt / 1000)))
  if (result.limited && retryAfterSeconds > 0) {
    setHeader(event, 'Retry-After', retryAfterSeconds)
  }
}

export const applyLocalRateLimit = (key: string, limit: number, windowMs: number): RateLimitResult =>
  enforceRateLimit(localBuckets, key, { limit, windowMs })

export const resetLocalRateLimitBuckets = () => {
  localBuckets.clear()
}

const applyUpstashRateLimit = async (
  baseUrl: string,
  token: string,
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> => {
  const response = await fetch(`${baseUrl.replace(/\/+$/, '')}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([
      ['INCR', key],
      ['PEXPIRE', key, String(windowMs), 'NX'],
      ['PTTL', key],
    ]),
  })

  if (!response.ok) {
    throw new Error(`Upstash rate limit failed with status ${response.status}`)
  }

  const payload = await response.json() as Array<{ result?: unknown, error?: string }>
  const count = Number(payload?.[0]?.result || 0)
  const ttlMs = Number(payload?.[2]?.result || windowMs)
  const safeTtlMs = ttlMs > 0 ? ttlMs : windowMs

  return {
    limited: count > limit,
    remaining: Math.max(limit - count, 0),
    resetAt: Date.now() + safeTtlMs,
  }
}

export const enforceRequestRateLimit = async (
  event: H3Event,
  options: RateLimitOptions,
): Promise<boolean> => {
  const requestMeta = options.requestMeta || getRequestMeta(event, options.scope)
  const keyParts = (options.keyParts || []).map(normalizeRateLimitKeyPart).join(':')
  const key = [
    'rl',
    normalizeRateLimitKeyPart(options.scope),
    keyParts || 'global',
    normalizeRateLimitKeyPart(requestMeta.clientIp),
    normalizeRateLimitKeyPart(requestMeta.clientFingerprint),
  ].join(':')

  const config = useRuntimeConfig(event)
  const upstashUrl = String(config.private?.upstashRedisRestUrl || '').trim()
  const upstashToken = String(config.private?.upstashRedisRestToken || '').trim()

  let result: RateLimitResult

  if (upstashUrl && upstashToken) {
    try {
      result = await applyUpstashRateLimit(upstashUrl, upstashToken, key, options.limit, options.windowMs)
    } catch {
      result = applyLocalRateLimit(key, options.limit, options.windowMs)
    }
  } else {
    result = applyLocalRateLimit(key, options.limit, options.windowMs)
  }

  applyRateLimitHeaders(event, options.limit, result)
  return result.limited
}
