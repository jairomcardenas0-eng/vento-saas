import { runDailyJobs } from '../../jobs'

export default defineEventHandler(async (event) => {
  const secret = getHeader(event, 'x-job-secret')
  const config = useRuntimeConfig(event)

  if (!config.private.jobSecret || secret !== config.private.jobSecret) {
    throw createError({ statusCode: 401, statusMessage: 'No autorizado' })
  }

  const result = await runDailyJobs({ event })
  return {
    ...result,
  }
})
