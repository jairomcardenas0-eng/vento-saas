import * as Sentry from '@sentry/vue'

function isValidDsn(dsn: unknown): dsn is string {
  return typeof dsn === 'string' && dsn.startsWith('https://') && dsn.length > 20
}

const EXTENSION_ERROR_PATTERNS = [
  /chrome-extension:\/\//i,
  /moz-extension:\/\//i,
  /safari-extension:\/\//i,
  /safari-web-extension:\/\//i,
  /webkit-masked-url:\/\/hidden/i,
  /microsoftedgeextensions\./i,
  /\/(extensions|extension\-frame)\//i,
]

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig()
  const dsn = config.public.sentryDsn

  if (!isValidDsn(dsn)) {
    return
  }

  const env = config.public.sentryEnvironment || (import.meta.dev ? 'dev' : 'production')
  const sampleRate = Number(config.public.sentrySampleRate ?? 0.1)

  Sentry.init({
    app: nuxtApp.vueApp,
    dsn,
    environment: env,
    release: typeof config.public.sentryRelease === 'string' ? config.public.sentryRelease : undefined,
    dist: typeof config.public.sentryDist === 'string' ? config.public.sentryDist : undefined,
    tracesSampleRate: Math.min(Math.max(sampleRate, 0), 1),
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    beforeSend(event) {
      if (!event.exception) return event
      const frames = event.exception.values?.[0]?.stacktrace?.frames ?? []
      const isExtensionError = frames.some(frame =>
        EXTENSION_ERROR_PATTERNS.some(pattern =>
          pattern.test(frame.filename ?? '')
        )
      )
      return isExtensionError ? null : event
    },
    denyUrls: [
      /^(chrome|moz|safari|edge)-extension:\/\//i,
      /^blob:/i,
      /^data:/i,
      /^filesystem:/i,
    ],
  })
})
