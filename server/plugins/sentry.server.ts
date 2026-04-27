import * as Sentry from '@sentry/node'

export default defineNitroPlugin(() => {
  const config = useRuntimeConfig()
  if (config.private.sentryDsn) {
    Sentry.init({
      dsn: config.private.sentryDsn,
      environment: config.private.sentryEnvironment || 'dev',
      tracesSampleRate: 0.1,
    })
  }
})
