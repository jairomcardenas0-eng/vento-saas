import { createClient } from '@supabase/supabase-js'
import type { H3Event } from 'h3'

type AnalyticsRequestBody = {
  catalogId?: string
  sessionUuid?: string
  eventType?: 'page_view' | 'product_click'
  productId?: string | null
  path?: string | null
}

const parsePayload = async (event: H3Event): Promise<AnalyticsRequestBody> => {
  const raw = await readRawBody(event)

  if (!raw) {
    return {}
  }

  try {
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

export default defineEventHandler(async (event) => {
  const payload = await parsePayload(event)

  if (!payload.catalogId || !payload.sessionUuid || !payload.eventType) {
    setResponseStatus(event, 202)
    return { ok: false }
  }

  const config = useRuntimeConfig(event)
  const supabase = createClient(
    config.public.supabaseUrl,
    config.public.supabaseAnonKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  )

  const now = new Date().toISOString()

  const { error: sessionInsertError } = await supabase
    .from('catalog_analytics_sessions')
    .upsert({
      catalog_id: payload.catalogId,
      session_uuid: payload.sessionUuid,
      first_seen_at: now,
      last_seen_at: now,
      user_agent: getHeader(event, 'user-agent') || null,
      last_path: payload.path || null,
    }, {
      onConflict: 'catalog_id,session_uuid',
      ignoreDuplicates: true,
    })

  if (sessionInsertError) {
    console.warn('[analytics] session insert failed', sessionInsertError.message)
    setResponseStatus(event, 202)
    return { ok: false }
  }

  const { error: sessionUpdateError } = await supabase
    .from('catalog_analytics_sessions')
    .update({
      last_seen_at: now,
      user_agent: getHeader(event, 'user-agent') || null,
      last_path: payload.path || null,
    })
    .eq('catalog_id', payload.catalogId)
    .eq('session_uuid', payload.sessionUuid)

  if (sessionUpdateError) {
    console.warn('[analytics] session update failed', sessionUpdateError.message)
    setResponseStatus(event, 202)
    return { ok: false }
  }

  const { error: eventError } = await supabase
    .from('catalog_analytics_events')
    .insert({
      catalog_id: payload.catalogId,
      session_uuid: payload.sessionUuid,
      event_type: payload.eventType,
      product_id: payload.productId || null,
      path: payload.path || null,
      created_at: now,
    })

  if (eventError) {
    console.warn('[analytics] event insert failed', eventError.message)
  }

  setResponseStatus(event, 202)
  return { ok: !eventError }
})
