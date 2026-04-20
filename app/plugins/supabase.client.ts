import { createClient } from '@supabase/supabase-js'

let supabaseClient: ReturnType<typeof createClient> | null = null

// Keeps the Supabase connection warm so the first query doesn't hit a cold start.
// Runs a lightweight ping every 4 minutes.
const KEEP_ALIVE_INTERVAL_MS = 4 * 60 * 1000

let keepAliveTimer: ReturnType<typeof setInterval> | null = null

function startKeepAlive(client: ReturnType<typeof createClient>) {
  if (keepAliveTimer) {
    return
  }

  keepAliveTimer = setInterval(async () => {
    try {
      // Cheapest possible query — just checks the connection, no data transfer
      await (client as any).rpc('pg_sleep', { seconds: 0 }).maybeSingle()
    } catch {
      // Ignore — it's just a keep-alive ping
    }
  }, KEEP_ALIVE_INTERVAL_MS)
}

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig().public

  if (!supabaseClient) {
    supabaseClient = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        lock: async (_name, _acquireTimeout, fn) => fn(),
      },
      global: {
        // Aggressive connection timeout to fail fast and retry
        fetch: (url, init) => {
          const controller = new AbortController()
          const timer = setTimeout(() => controller.abort(), 12000)
          return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer))
        },
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })

    // Start warm-up ping immediately, then on interval
    startKeepAlive(supabaseClient)
  }

  return {
    provide: {
      supabase: supabaseClient,
    },
  }
})
