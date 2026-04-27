import { getCacheHealthSnapshot, getCacheMetricsSnapshot } from '../../utils/cache'

export default defineEventHandler(async () => {
  const health = await getCacheHealthSnapshot()
  const metrics = getCacheMetricsSnapshot()

  return {
    status: health.redisAvailable || !health.configured ? 'healthy' : 'degraded',
    health,
    metrics,
  }
})
