import { randomUUID } from 'node:crypto'
import { Redis } from '@upstash/redis'
import { compressToBase64, decompressFromBase64 } from 'lz-string'

type CacheEntryEnvelope = {
  value: string
  compressed: boolean
  createdAt: number
  expiresAt: number
  staleUntil: number
  rescueUntil: number
  catalogId?: string
  keyType: string
  sizeBytes: number
}

type CacheMetricsBucket = {
  hits: number
  staleHits: number
  misses: number
  reconstructions: number
  lockWaits: number
  lockTimeouts: number
  staleServedOnError: number
  failures: number
  totalReconstructionMs: number
  reconstructionSamples: number[]
  bytesStored: number
}

type CacheHealthSnapshot = {
  configured: boolean
  backend: 'redis' | 'memory'
  redisAvailable: boolean
  breaker: {
    state: CircuitBreakerState
    consecutiveFailures: number
    openedAt: string | null
    nextProbeAt: string | null
  }
}

type GetOrReconstructOptions = {
  lockTimeoutMs?: number
  maxWaitMs?: number
  catalogId?: string
}

type CircuitBreakerState = 'closed' | 'open' | 'half-open'

type CacheStatus = 'fresh' | 'stale' | 'expired' | 'rescue' | 'missing'

const DEFAULT_LOCK_TIMEOUT_MS = 30_000
const DEFAULT_MAX_WAIT_MS = 5_000
const POLL_INTERVAL_MS = 100
const CACHE_VERSION = 'v1'
const COMPRESSION_THRESHOLD_BYTES = 10 * 1024
const BREAKER_FAILURE_THRESHOLD = 10
const BREAKER_OPEN_MS = 30_000
const BREAKER_HALF_OPEN_RETRY_MS = 5_000

const localCache = new Map<string, CacheEntryEnvelope>()
const metricsByType = new Map<string, CacheMetricsBucket>()

const circuitBreaker = {
  state: 'closed' as CircuitBreakerState,
  consecutiveFailures: 0,
  openedAt: 0,
  nextProbeAt: 0,
}

let redisClient: Redis | null = null
let redisDisabledUntil = 0

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

const now = () => Date.now()

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const parseCacheEnv = () => {
  const explicit = String(process.env.VENTO_CACHE_ENV || process.env.NUXT_PUBLIC_APP_ENV || process.env.APP_ENV || '').trim().toLowerCase()
  if (explicit === 'prod' || explicit === 'production') {
    return 'prod'
  }
  if (explicit === 'staging') {
    return 'staging'
  }

  const nodeEnv = String(process.env.NODE_ENV || '').trim().toLowerCase()
  return nodeEnv === 'production' ? 'prod' : 'dev'
}

const getCachePrefix = () => `vento:${parseCacheEnv()}`

const toFullKey = (key: string) => {
  const normalized = key.startsWith(`${getCachePrefix()}:`) ? key : `${getCachePrefix()}:${key.replace(/^:+/, '')}`
  return normalized
}

const extractKeyType = (logicalKey: string) => logicalKey.replace(/^:+/, '').split(':')[0] || 'unknown'

const getMetricsBucket = (keyType: string) => {
  const existing = metricsByType.get(keyType)
  if (existing) {
    return existing
  }

  const created: CacheMetricsBucket = {
    hits: 0,
    staleHits: 0,
    misses: 0,
    reconstructions: 0,
    lockWaits: 0,
    lockTimeouts: 0,
    staleServedOnError: 0,
    failures: 0,
    totalReconstructionMs: 0,
    reconstructionSamples: [],
    bytesStored: 0,
  }
  metricsByType.set(keyType, created)
  return created
}

const recordReconstruction = (keyType: string, elapsedMs: number) => {
  const bucket = getMetricsBucket(keyType)
  bucket.reconstructions += 1
  bucket.totalReconstructionMs += elapsedMs
  bucket.reconstructionSamples.push(elapsedMs)
  if (bucket.reconstructionSamples.length > 250) {
    bucket.reconstructionSamples.shift()
  }
}

const getPercentile = (values: number[], percentile: number) => {
  if (!values.length) {
    return 0
  }

  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((percentile / 100) * sorted.length) - 1))
  return sorted[index]
}

const deriveCatalogId = (logicalKey: string, value: unknown, explicitCatalogId?: string) => {
  if (explicitCatalogId) {
    return explicitCatalogId
  }

  if (logicalKey.startsWith('catalog:slug:') && isObject(value) && typeof value.catalogId === 'string' && value.catalogId) {
    return value.catalogId
  }

  return undefined
}

const serializeEnvelope = (value: unknown, ttlSeconds: number, staleTtlSeconds: number, keyType: string, catalogId?: string) => {
  const raw = JSON.stringify(value)
  const rawBytes = Buffer.byteLength(raw, 'utf8')
  const compressed = rawBytes > COMPRESSION_THRESHOLD_BYTES
  const payload = compressed ? compressToBase64(raw) : raw
  const createdAt = now()
  const ttlMs = ttlSeconds * 1000
  const staleMs = staleTtlSeconds * 1000
  const rescueMs = Math.max(staleMs, 60_000)

  const envelope: CacheEntryEnvelope = {
    value: payload,
    compressed,
    createdAt,
    expiresAt: createdAt + ttlMs,
    staleUntil: createdAt + ttlMs + staleMs,
    rescueUntil: createdAt + ttlMs + staleMs + rescueMs,
    catalogId,
    keyType,
    sizeBytes: rawBytes,
  }

  return envelope
}

const decodeEnvelope = <T>(envelope: CacheEntryEnvelope): T => {
  const decoded = envelope.compressed ? decompressFromBase64(envelope.value) : envelope.value
  return JSON.parse(decoded) as T
}

const classifyEnvelope = (envelope: CacheEntryEnvelope | null | undefined): CacheStatus => {
  if (!envelope) {
    return 'missing'
  }

  const timestamp = now()
  if (timestamp < envelope.expiresAt) {
    return 'fresh'
  }
  if (timestamp < envelope.staleUntil) {
    return 'stale'
  }
  if (timestamp < envelope.rescueUntil) {
    return 'rescue'
  }
  return 'expired'
}

const getRuntimeConfigSafe = () => {
  try {
    return useRuntimeConfig()
  } catch {
    return null
  }
}

const hasRedisConfiguration = () => {
  const config = getRuntimeConfigSafe()
  const url = String(config?.private?.upstashRedisRestUrl || process.env.UPSTASH_REDIS_REST_URL || '').trim()
  const token = String(config?.private?.upstashRedisRestToken || process.env.UPSTASH_REDIS_REST_TOKEN || '').trim()
  return Boolean(url && token)
}

const getRedisClient = () => {
  if (redisDisabledUntil > now()) {
    return null
  }

  if (redisClient) {
    return redisClient
  }

  const config = getRuntimeConfigSafe()
  const url = String(config?.private?.upstashRedisRestUrl || process.env.UPSTASH_REDIS_REST_URL || '').trim()
  const token = String(config?.private?.upstashRedisRestToken || process.env.UPSTASH_REDIS_REST_TOKEN || '').trim()

  if (!url || !token) {
    return null
  }

  redisClient = new Redis({
    url,
    token,
  })

  return redisClient
}

const markRedisUnavailable = () => {
  redisDisabledUntil = now() + 15_000
}

const readLocalEntry = (fullKey: string) => {
  const envelope = localCache.get(fullKey)
  if (!envelope) {
    return null
  }

  if (classifyEnvelope(envelope) === 'expired') {
    localCache.delete(fullKey)
    return null
  }

  return envelope
}

const writeLocalEntry = (fullKey: string, envelope: CacheEntryEnvelope) => {
  localCache.set(fullKey, envelope)
}

const deleteLocalKey = (fullKey: string) => {
  localCache.delete(fullKey)
}

const readEntry = async (fullKey: string) => {
  const redis = getRedisClient()
  if (redis) {
    try {
      const raw = await redis.get<string>(fullKey)
      if (raw) {
        const parsed = JSON.parse(raw) as CacheEntryEnvelope
        writeLocalEntry(fullKey, parsed)
        return parsed
      }
    } catch (error) {
      console.warn('[cache] redis get failed, using local fallback', { key: fullKey, error })
      markRedisUnavailable()
    }
  }

  return readLocalEntry(fullKey)
}

const writeEntry = async (fullKey: string, envelope: CacheEntryEnvelope, ttlSeconds: number, staleTtlSeconds: number) => {
  writeLocalEntry(fullKey, envelope)
  const redis = getRedisClient()
  if (!redis) {
    return
  }

  const rescueSeconds = Math.max(staleTtlSeconds, 60)
  const redisTtlSeconds = ttlSeconds + staleTtlSeconds + rescueSeconds

  try {
    await redis.set(fullKey, JSON.stringify(envelope), { ex: redisTtlSeconds })
  } catch (error) {
    console.warn('[cache] redis set failed, using local fallback', { key: fullKey, error })
    markRedisUnavailable()
  }
}

const deleteKeyInternal = async (fullKey: string) => {
  deleteLocalKey(fullKey)
  const redis = getRedisClient()
  if (!redis) {
    return
  }

  try {
    await redis.del(fullKey)
  } catch (error) {
    console.warn('[cache] redis del failed', { key: fullKey, error })
    markRedisUnavailable()
  }
}

const acquireLock = async (lockKey: string, token: string, lockTimeoutMs: number) => {
  const redis = getRedisClient()
  if (redis) {
    try {
      const result = await redis.set(lockKey, token, { nx: true, px: lockTimeoutMs })
      return result === 'OK'
    } catch (error) {
      console.warn('[cache] redis lock failed, using local lock fallback', { key: lockKey, error })
      markRedisUnavailable()
    }
  }

  const existing = readLocalEntry(lockKey)
  if (existing) {
    return false
  }

  const envelope = serializeEnvelope({ token }, Math.ceil(lockTimeoutMs / 1000), 0, 'lock')
  envelope.expiresAt = now() + lockTimeoutMs
  envelope.staleUntil = envelope.expiresAt
  envelope.rescueUntil = envelope.expiresAt
  writeLocalEntry(lockKey, envelope)
  return true
}

const releaseLock = async (lockKey: string, token: string) => {
  const redis = getRedisClient()
  if (redis) {
    try {
      await redis.eval(
        "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
        [lockKey],
        [token],
      )
    } catch (error) {
      console.warn('[cache] redis unlock failed', { key: lockKey, error })
      markRedisUnavailable()
    }
  }

  const localLock = readLocalEntry(lockKey)
  if (localLock) {
    try {
      const parsed = decodeEnvelope<{ token?: string }>(localLock)
      if (parsed.token === token) {
        deleteLocalKey(lockKey)
      }
    } catch {
      deleteLocalKey(lockKey)
    }
  }
}

const maybeOpenCircuitBreaker = () => {
  if (circuitBreaker.consecutiveFailures < BREAKER_FAILURE_THRESHOLD) {
    return
  }

  circuitBreaker.state = 'open'
  circuitBreaker.openedAt = now()
  circuitBreaker.nextProbeAt = now() + BREAKER_HALF_OPEN_RETRY_MS
  console.warn('[cache] circuit breaker opened', {
    failures: circuitBreaker.consecutiveFailures,
    nextProbeAt: new Date(circuitBreaker.nextProbeAt).toISOString(),
  })
}

const recordBreakerSuccess = () => {
  const wasOpen = circuitBreaker.state !== 'closed'
  circuitBreaker.state = 'closed'
  circuitBreaker.consecutiveFailures = 0
  circuitBreaker.openedAt = 0
  circuitBreaker.nextProbeAt = 0
  if (wasOpen) {
    console.info('[cache] circuit breaker closed')
  }
}

const recordBreakerFailure = () => {
  circuitBreaker.consecutiveFailures += 1
  maybeOpenCircuitBreaker()
}

const canRunReconstruction = () => {
  if (circuitBreaker.state === 'closed') {
    return true
  }

  if (circuitBreaker.state === 'open' && now() >= circuitBreaker.nextProbeAt) {
    circuitBreaker.state = 'half-open'
    return true
  }

  return circuitBreaker.state === 'half-open'
}

const runWithCircuitBreaker = async <T>(reconstructFn: () => Promise<T>) => {
  if (!canRunReconstruction()) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Circuit breaker abierto: reconstruccion temporalmente deshabilitada',
    })
  }

  try {
    const result = await reconstructFn()
    recordBreakerSuccess()
    return result
  } catch (error) {
    recordBreakerFailure()
    throw error
  }
}

const reconstructAndCache = async <T>(
  fullKey: string,
  logicalKey: string,
  ttlSeconds: number,
  staleTtlSeconds: number,
  reconstructFn: () => Promise<T>,
  catalogId?: string,
) => {
  const startedAt = now()
  const result = await runWithCircuitBreaker(reconstructFn)
  const keyType = extractKeyType(logicalKey)
  const envelope = serializeEnvelope(result, ttlSeconds, staleTtlSeconds, keyType, deriveCatalogId(logicalKey, result, catalogId))
  await writeEntry(fullKey, envelope, ttlSeconds, staleTtlSeconds)
  recordReconstruction(keyType, now() - startedAt)
  getMetricsBucket(keyType).bytesStored = envelope.sizeBytes
  return result
}

const waitForCacheFill = async <T>(fullKey: string, maxWaitMs: number) => {
  const startedAt = now()
  while (now() - startedAt < maxWaitMs) {
    const entry = await readEntry(fullKey)
    const status = classifyEnvelope(entry)
    if (entry && status !== 'expired' && status !== 'missing') {
      return decodeEnvelope<T>(entry)
    }
    await sleep(POLL_INTERVAL_MS)
  }
  return null
}

const revalidateInBackground = async <T>(
  fullKey: string,
  logicalKey: string,
  ttlSeconds: number,
  staleTtlSeconds: number,
  reconstructFn: () => Promise<T>,
  lockTimeoutMs: number,
  catalogId?: string,
) => {
  const token = randomUUID()
  const lockKey = `${fullKey}:lock`
  const acquired = await acquireLock(lockKey, token, lockTimeoutMs)
  if (!acquired) {
    return
  }

  try {
    await reconstructAndCache(fullKey, logicalKey, ttlSeconds, staleTtlSeconds, reconstructFn, catalogId)
  } catch (error) {
    getMetricsBucket(extractKeyType(logicalKey)).failures += 1
    console.warn('[cache] background revalidation failed', { key: logicalKey, error })
  } finally {
    await releaseLock(lockKey, token)
  }
}

const invalidateLocalByPredicate = (predicate: (key: string, value: CacheEntryEnvelope) => boolean) => {
  const deleted: string[] = []
  for (const [key, value] of localCache.entries()) {
    if (predicate(key, value)) {
      localCache.delete(key)
      deleted.push(key)
    }
  }
  return deleted
}

const scanRedisKeys = async (pattern: string) => {
  const redis = getRedisClient()
  if (!redis) {
    return [] as string[]
  }

  const found = new Set<string>()
  let cursor = '0'

  try {
    do {
      const response = await redis.scan(cursor, { match: pattern, count: 200 }) as unknown
      if (Array.isArray(response)) {
        cursor = String(response[0] || '0')
        for (const key of Array.isArray(response[1]) ? response[1] : []) {
          found.add(String(key))
        }
      } else if (isObject(response)) {
        const scanResponse = response as { cursor?: string | number, keys?: unknown[] }
        cursor = String(scanResponse.cursor || '0')
        const keys = Array.isArray(scanResponse.keys) ? scanResponse.keys : []
        for (const key of keys) {
          found.add(String(key))
        }
      } else {
        cursor = '0'
      }
    } while (cursor !== '0')
  } catch (error) {
    console.warn('[cache] redis scan failed', { pattern, error })
    markRedisUnavailable()
  }

  return [...found]
}

export const cacheKeys = {
  storefront: (catalogId: string) => `storefront:${catalogId}:${CACHE_VERSION}`,
  product: (catalogId: string, productId: string) => `product:${catalogId}:${productId}`,
  catalogMeta: (catalogId: string) => `catalog:${catalogId}:meta`,
  catalogCategories: (catalogId: string) => `catalog:${catalogId}:categories`,
  catalogReviewsCount: (catalogId: string) => `catalog:${catalogId}:reviews:count`,
  ordersDay: (catalogId: string, date: string) => `orders:${catalogId}:${date}`,
  marketplaceLanding: () => 'marketplace:landing',
  marketplaceLandingSearch: (queryKey: string) => `marketplace:landing:${queryKey}`,
  analytics: (catalogId: string, granularity: string, date: string) => `analytics:${catalogId}:${granularity}:${date}`,
  catalogSlug: (slug: string) => `catalog:slug:${slug}`,
}

export async function getOrReconstruct<T>(
  key: string,
  ttlSeconds: number,
  staleTtlSeconds: number,
  reconstructFn: () => Promise<T>,
  options: GetOrReconstructOptions = {},
): Promise<T> {
  const fullKey = toFullKey(key)
  const keyType = extractKeyType(key)
  const bucket = getMetricsBucket(keyType)
  const lockTimeoutMs = options.lockTimeoutMs ?? DEFAULT_LOCK_TIMEOUT_MS
  const maxWaitMs = options.maxWaitMs ?? DEFAULT_MAX_WAIT_MS
  const existingEntry = await readEntry(fullKey)
  const status = classifyEnvelope(existingEntry)

  if (status === 'fresh' && existingEntry) {
    bucket.hits += 1
    return decodeEnvelope<T>(existingEntry)
  }

  if (status === 'stale' && existingEntry) {
    bucket.staleHits += 1
    void revalidateInBackground(fullKey, key, ttlSeconds, staleTtlSeconds, reconstructFn, lockTimeoutMs, options.catalogId)
    return decodeEnvelope<T>(existingEntry)
  }

  bucket.misses += 1
  const token = randomUUID()
  const lockKey = `${fullKey}:lock`
  const acquired = await acquireLock(lockKey, token, lockTimeoutMs)

  if (acquired) {
    try {
      return await reconstructAndCache(fullKey, key, ttlSeconds, staleTtlSeconds, reconstructFn, options.catalogId)
    } catch (error) {
      bucket.failures += 1
      if (existingEntry) {
        bucket.staleServedOnError += 1
        return decodeEnvelope<T>(existingEntry)
      }
      throw error
    } finally {
      await releaseLock(lockKey, token)
    }
  }

  bucket.lockWaits += 1
  const waited = await waitForCacheFill<T>(fullKey, maxWaitMs)
  if (waited !== null) {
    return waited
  }

  bucket.lockTimeouts += 1
  try {
    return await runWithCircuitBreaker(reconstructFn)
  } catch (error) {
    bucket.failures += 1
    if (existingEntry) {
      bucket.staleServedOnError += 1
      return decodeEnvelope<T>(existingEntry)
    }
    throw error
  }
}

export async function invalidateKey(key: string): Promise<void> {
  const fullKey = toFullKey(key)
  await deleteKeyInternal(fullKey)
  await deleteKeyInternal(`${fullKey}:lock`)
}

export async function invalidateByCatalog(catalogId: string): Promise<void> {
  const prefix = getCachePrefix()
  const inlinePatterns = [
    `${prefix}:*:${catalogId}:*`,
    `${prefix}:storefront:${catalogId}:*`,
    `${prefix}:product:${catalogId}:*`,
    `${prefix}:catalog:${catalogId}:*`,
    `${prefix}:orders:${catalogId}:*`,
    `${prefix}:analytics:${catalogId}:*`,
  ]

  const localDeleted = invalidateLocalByPredicate((key, entry) => key.includes(`:${catalogId}:`) || entry.catalogId === catalogId)
  const redisKeys = new Set<string>()

  for (const pattern of inlinePatterns) {
    const matches = await scanRedisKeys(pattern)
    for (const key of matches) {
      redisKeys.add(key)
    }
  }

  for (const key of await scanRedisKeys(`${prefix}:catalog:slug:*`)) {
    const entry = await readEntry(key)
    if (entry?.catalogId === catalogId) {
      redisKeys.add(key)
    }
  }

  for (const key of redisKeys) {
    await deleteKeyInternal(key)
    await deleteKeyInternal(`${key}:lock`)
  }

  console.info('[cache] catalog invalidated', {
    catalogId,
    timestamp: new Date().toISOString(),
    localDeleted: localDeleted.length,
    redisDeleted: redisKeys.size,
  })
}

export async function invalidateMarketplaceLanding(): Promise<void> {
  const prefix = getCachePrefix()
  const pattern = `${prefix}:marketplace:landing*`
  const localDeleted = invalidateLocalByPredicate((key) => key.startsWith(`${prefix}:marketplace:landing`))
  const redisKeys = await scanRedisKeys(pattern)

  for (const key of redisKeys) {
    await deleteKeyInternal(key)
    await deleteKeyInternal(`${key}:lock`)
  }

  console.info('[cache] marketplace landing invalidated', {
    timestamp: new Date().toISOString(),
    localDeleted: localDeleted.length,
    redisDeleted: redisKeys.length,
  })
}

export const getCacheMetricsSnapshot = () => {
  const entries = [...metricsByType.entries()].map(([keyType, bucket]) => ({
    keyType,
    hitRate: bucket.hits + bucket.staleHits + bucket.misses === 0
      ? 0
      : Number((((bucket.hits + bucket.staleHits) / (bucket.hits + bucket.staleHits + bucket.misses)) * 100).toFixed(2)),
    hits: bucket.hits,
    staleHits: bucket.staleHits,
    misses: bucket.misses,
    reconstructions: bucket.reconstructions,
    lockWaits: bucket.lockWaits,
    lockTimeouts: bucket.lockTimeouts,
    staleServedOnError: bucket.staleServedOnError,
    failures: bucket.failures,
    bytesStored: bucket.bytesStored,
    reconstructionMs: {
      p50: getPercentile(bucket.reconstructionSamples, 50),
      p95: getPercentile(bucket.reconstructionSamples, 95),
      p99: getPercentile(bucket.reconstructionSamples, 99),
      average: bucket.reconstructionSamples.length
        ? Math.round(bucket.totalReconstructionMs / bucket.reconstructionSamples.length)
        : 0,
    },
  }))

  return {
    generatedAt: new Date().toISOString(),
    backend: getRedisClient() ? 'redis' : 'memory',
    keyspaces: entries,
    localEntries: localCache.size,
  }
}

export const getCacheHealthSnapshot = async (): Promise<CacheHealthSnapshot> => {
  const redis = getRedisClient()
  let redisAvailable = false

  if (redis) {
    try {
      await redis.ping()
      redisAvailable = true
    } catch {
      redisAvailable = false
      markRedisUnavailable()
    }
  }

  return {
    configured: hasRedisConfiguration(),
    backend: redisAvailable ? 'redis' : 'memory',
    redisAvailable,
    breaker: {
      state: circuitBreaker.state,
      consecutiveFailures: circuitBreaker.consecutiveFailures,
      openedAt: circuitBreaker.openedAt ? new Date(circuitBreaker.openedAt).toISOString() : null,
      nextProbeAt: circuitBreaker.nextProbeAt ? new Date(circuitBreaker.nextProbeAt).toISOString() : null,
    },
  }
}

export const __cacheInternals = {
  classifyEnvelope,
  serializeEnvelope,
  toFullKey,
  parseCacheEnv,
  reset() {
    localCache.clear()
    metricsByType.clear()
    redisClient = null
    redisDisabledUntil = 0
    circuitBreaker.state = 'closed'
    circuitBreaker.consecutiveFailures = 0
    circuitBreaker.openedAt = 0
    circuitBreaker.nextProbeAt = 0
  },
}
