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
