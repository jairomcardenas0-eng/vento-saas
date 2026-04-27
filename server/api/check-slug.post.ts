import { createSupabaseServerClient } from '../utils/supabase'
import { enforceRequestRateLimit } from '../utils/rateLimit'
import { getRequestMeta, safeReadJsonBody, sanitizeText } from '../utils/security'

type Body = {
  slug?: string
}

const SLUG_WINDOW_MS = 60 * 1000
const SLUG_LIMIT = 20

export default defineEventHandler(async (event) => {
  const requestMeta = getRequestMeta(event, 'check-slug')
  const body = await safeReadJsonBody<Body>(event, 4 * 1024)
  const slug = sanitizeText(body?.slug, 120).toLowerCase().replace(/\s+/g, '-')

  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Slug requerido' })
  }

  if (await enforceRequestRateLimit(event, {
    scope: 'check-slug',
    limit: SLUG_LIMIT,
    windowMs: SLUG_WINDOW_MS,
    requestMeta,
  })) {
    throw createError({ statusCode: 429, statusMessage: 'Demasiadas validaciones de slug en poco tiempo' })
  }

  const supabase = createSupabaseServerClient(event)
  const { data, error } = await supabase.rpc('check_slug_availability', {
    slug_text: slug,
  })

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message || 'No se pudo validar el slug' })
  }

  return data
})
