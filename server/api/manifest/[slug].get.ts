import { createSupabaseServerClient } from '../../utils/supabase'
import { getRequestMeta, sanitizeText } from '../../utils/security'

export default defineEventHandler(async (event) => {
  const { requestId } = getRequestMeta(event, 'manifest')
  const slug = sanitizeText(getRouterParam(event, 'slug'), 120).toLowerCase().replace(/\s+/g, '-')
  if (!slug) {
    throw createError({ statusCode: 400, statusMessage: 'Slug invalido' })
  }

  const supabase = createSupabaseServerClient(event)
  const { data, error } = await supabase.rpc('get_public_storefront_payload', {
    slug_text: slug,
  })

  if (error || !data?.catalog) {
    throw createError({ statusCode: 404, statusMessage: 'Catalogo no encontrado' })
  }

  const catalog = data.catalog
  const settings = catalog.settings || {}
  const theme = catalog.theme || {}

  const name = settings.businessName || 'Catálogo Digital'
  const shortName = settings.storeHeaderName || name.slice(0, 12)
  const iconUrl = settings.appIconUrl || settings.logoUrl || ''
  const bgColor = theme.bg || '#111111'
  const themeColor = theme.primary || '#ff5e00'

  const manifest = {
    name,
    short_name: shortName,
    description: settings.tagline || `Catálogo digital de ${name}`,
    start_url: `/${slug}`,
    scope: `/${slug}`,
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: bgColor,
    theme_color: themeColor,
    lang: 'es-MX',
    dir: 'ltr',
    icons: iconUrl
      ? [
          { src: iconUrl, sizes: '192x192', type: 'image/png' },
          { src: iconUrl, sizes: '512x512', type: 'image/png' },
        ]
      : [],
  }

  setHeader(event, 'Content-Type', 'application/manifest+json')
  setHeader(event, 'Cache-Control', 'public, max-age=300, s-maxage=600')
  return manifest
})
