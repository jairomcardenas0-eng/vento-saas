import { updateCatalogSchema } from '../../schemas/catalog.schema'
import { insertAuditLog } from '../../utils/auditLog'
import { invalidateByCatalog, invalidateMarketplaceLanding } from '../../utils/cache'
import { sanitizePlainText } from '../../utils/sanitize'
import { createSupabaseServiceRoleClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = updateCatalogSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: JSON.stringify(parsed.error.flatten()) })
  }

  const catalogId = getRouterParam(event, 'id') || body.catalogId
  if (!catalogId) {
    throw createError({ statusCode: 400, statusMessage: 'catalogId es requerido' })
  }

  const supabase = createSupabaseServiceRoleClient(event)
  const payload = parsed.data
  const { data: catalog, error: readError } = await supabase.from('catalogs').select('slug, settings').eq('id', catalogId).maybeSingle()
  if (readError || !catalog) {
    throw createError({ statusCode: 404, statusMessage: 'Catalogo no encontrado' })
  }

  const { error } = await supabase
    .from('catalogs')
    .update({
      slug: payload.slug,
      settings: {
        ...(catalog.settings || {}),
        businessName: sanitizePlainText(payload.name, 100),
        whatsapp: sanitizePlainText(payload.whatsapp, 20),
        tagline: sanitizePlainText(payload.description || '', 500),
      },
    })
    .eq('id', catalogId)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message || 'No se pudo actualizar el catalogo' })
  }

  await insertAuditLog(event, {
    catalogId,
    action: 'update',
    entityType: 'catalog',
    entityId: catalogId,
    payloadBefore: { slug: catalog.slug, settings: catalog.settings || {} },
    payloadAfter: {
      slug: payload.slug,
      settings: {
        ...(catalog.settings || {}),
        businessName: sanitizePlainText(payload.name, 100),
        whatsapp: sanitizePlainText(payload.whatsapp, 20),
        tagline: sanitizePlainText(payload.description || '', 500),
      },
    },
  })

  await invalidateByCatalog(catalogId)
  await invalidateMarketplaceLanding()

  return { ok: true }
})
