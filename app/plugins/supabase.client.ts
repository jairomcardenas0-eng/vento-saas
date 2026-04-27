import { createClient } from '@supabase/supabase-js'

let supabaseClient: ReturnType<typeof createClient> | null = null

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
        // Give weak mobile networks a bit more room before aborting.
        fetch: (url, init) => {
          const controller = new AbortController()
          const timer = setTimeout(() => controller.abort(), 18000)
          return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer))
        },
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    })
  }

  return {
    provide: {
      supabase: supabaseClient,
    },
  }
})
