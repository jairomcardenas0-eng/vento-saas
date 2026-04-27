import { createClient } from '@supabase/supabase-js'
import type { H3Event } from 'h3'

const serverClientOptions = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
}

export const createSupabaseServerClient = (event: H3Event) => {
  const config = useRuntimeConfig(event)

  return createClient(
    config.public.supabaseUrl,
    config.public.supabaseAnonKey,
    serverClientOptions,
  )
}

export const createSupabaseServiceRoleClient = (event: H3Event) => {
  const config = useRuntimeConfig(event)

  return createClient(
    config.public.supabaseUrl,
    config.private.supabaseServiceRoleKey,
    serverClientOptions,
  )
}
