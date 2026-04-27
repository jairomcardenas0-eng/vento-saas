import { getCacheHealthSnapshot, getCacheMetricsSnapshot } from '../utils/cache'
import { createSupabaseServiceRoleClient } from '../utils/supabase'

export default defineEventHandler(async (event) => {
  const checks: {
    supabase: boolean
    redis: boolean | null
    cache: Awaited<ReturnType<typeof getCacheHealthSnapshot>> | null
    uptime: number
    memory: ReturnType<typeof process.memoryUsage>
    timestamp: string
  } = {
    supabase: false,
    redis: false,
    cache: null,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString(),
  }

  try {
    const supabase = createSupabaseServiceRoleClient(event)
    const { error } = await supabase.from('catalogs').select('id').limit(1)
    checks.supabase = !error
  } catch {
    checks.supabase = false
  }

  try {
    checks.cache = await getCacheHealthSnapshot()
    checks.redis = checks.cache.configured ? checks.cache.redisAvailable : null
  } catch {
    checks.redis = false
    checks.cache = null
  }

  setResponseStatus(event, checks.supabase ? 200 : 503)

  return {
    status: checks.supabase ? 'healthy' : 'degraded',
    checks,
    cacheMetrics: getCacheMetricsSnapshot(),
  }
})
