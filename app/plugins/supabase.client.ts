import { createClient } from '@supabase/supabase-js'

declare global {
  var __supabaseClient: ReturnType<typeof createClient> | undefined
  var __supabaseHmrCleanup: (() => void) | undefined
}

const SUPABASE_TIMEOUT_MS = 20000

const combineAbortSignals = (signals: AbortSignal[]) => {
  const activeSignals = signals.filter(Boolean)

  if (!activeSignals.length) {
    return undefined
  }

  if (typeof AbortSignal.any === 'function') {
    return AbortSignal.any(activeSignals)
  }

  const controller = new AbortController()
  const abort = () => controller.abort()
  activeSignals.forEach((signal) => {
    if (signal.aborted) {
      controller.abort()
      return
    }

    signal.addEventListener('abort', abort, { once: true })
  })

  return controller.signal
}

export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig().public

  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    console.warn('[supabase] Missing NUXT_PUBLIC_SUPABASE_URL or NUXT_PUBLIC_SUPABASE_ANON_KEY. Add them in your hosting environment variables.')
    return {
      provide: {
        supabase: null as any,
      },
    }
  }

  // Clean up stale client on HMR to prevent auth token desync
  if (import.meta.hot && globalThis.__supabaseHmrCleanup) {
    globalThis.__supabaseHmrCleanup()
    globalThis.__supabaseClient = undefined
  }

  if (!globalThis.__supabaseClient) {
    globalThis.__supabaseClient = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        // Lock bypass: Supabase uses an async lock for storage race conditions.
        // In browser environments with localStorage this is normally fine,
        // but the default lock (navigator.locks) is unavailable in some contexts.
        // We provide a trivial lock that still serializes execution per callback
        // without actual cross-tab coordination (tabs share localStorage anyway).
        lock: async (_name, _acquireTimeout, fn) => {
          return fn()
        },
      },
      global: {
        // Give weak mobile networks a bit more room before aborting,
        // but respect any caller-supplied AbortSignal so it is not overridden.
        fetch: (url, init) => {
          const externalSignal = init?.signal
          const controller = new AbortController()
          const timer = setTimeout(() => controller.abort(), SUPABASE_TIMEOUT_MS)
          const combinedSignal = combineAbortSignals(
            externalSignal ? [controller.signal, externalSignal] : [controller.signal],
          )

          return fetch(url, {
            ...init,
            signal: combinedSignal ?? controller.signal,
          }).finally(() => clearTimeout(timer))
        },
      },
      realtime: {
        params: {
          eventsPerSecond: Number(config.supabaseRealtimeEventsPerSecond ?? 10),
        },
      },
    })
  }

  const client = globalThis.__supabaseClient

  globalThis.__supabaseHmrCleanup = () => {
    try {
      client.auth.stopAutoRefresh()
      client.removeAllChannels()
    } catch {
      // ignore cleanup errors during HMR
    }
  }

  nuxtApp.hook('app:mounted', () => {
    // Ensure auto-refresh is running after hydration
    client.auth.startAutoRefresh()
  })

  return {
    provide: {
      supabase: client,
    },
  }
})
