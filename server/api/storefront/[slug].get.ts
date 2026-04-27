import { createSupabaseServerClient } from '../../utils/supabase'
import { cacheKeys, getOrReconstruct } from '../../utils/cache'
import { mapStorefrontRpcPayload } from '../../../app/utils/storefrontPayload'
import { getRequestMeta, logApiWarn, sanitizeText } from '../../utils/security'

export default defineEventHandler(async (event) => {
  const { requestId } = getRequestMeta(event, 'storefront')
  const slug = sanitizeText(getRouterParam(event, 'slug'), 120).toLowerCase().replace(/\s+/g, '-')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Slug invalido' })
  }

  const supabase = createSupabaseServerClient(event)
  const catalogMeta = await getOrReconstruct(
    cacheKeys.catalogSlug(slug),
    3600,
    3600,
    async () => {
      const { data, error } = await supabase
        .from('catalogs')
        .select('id, status, is_banned')
        .eq('slug', slug)
        .maybeSingle()

      if (error) {
        logApiWarn('storefront:get', 'catalog lookup failed', { requestId, slug, error: error.message })
        throw createError({ statusCode: 500, statusMessage: 'No se pudo resolver el catalogo' })
      }

      if (!data || data.status !== 'published' || data.is_banned) {
        throw createError({ statusCode: 404, statusMessage: 'Catalogo no encontrado' })
      }

      return { catalogId: String(data.id) }
    },
  )

  const payload = await getOrReconstruct(
    cacheKeys.storefront(catalogMeta.catalogId),
    300,
    300,
    async () => {
      const { data, error } = await supabase.rpc('get_public_storefront_payload', {
        slug_text: slug,
      })

      if (error) {
        logApiWarn('storefront:get', 'rpc failed', { requestId, slug, error: error.message })
        throw createError({ statusCode: 500, statusMessage: 'No se pudo cargar el storefront' })
      }

      if (!data?.catalog) {
        throw createError({ statusCode: 404, statusMessage: 'Catalogo no encontrado' })
      }

      return mapStorefrontRpcPayload(data)
    },
    { catalogId: catalogMeta.catalogId },
  )

  setHeader(event, 'Vary', 'Accept-Encoding')
  setHeader(event, 'Cache-Control', 'public, max-age=5, s-maxage=60, stale-while-revalidate=300')
  return payload
})
