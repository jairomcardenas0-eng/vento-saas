import { updateAppearanceSchema } from '../../schemas/catalog.schema'
import { insertAuditLog } from '../../utils/auditLog'
import { invalidateByCatalog, invalidateMarketplaceLanding } from '../../utils/cache'
import { createSupabaseServiceRoleClient } from '../../utils/supabase'
import { requireCatalogAccess } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = updateAppearanceSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: JSON.stringify(parsed.error.flatten()) })
  }

  const { catalogId, theme } = parsed.data
  await requireCatalogAccess(event, catalogId, 'viewSettings')

  const supabase = createSupabaseServiceRoleClient(event)
  const { data: current, error: readError } = await supabase.from('catalogs').select('theme').eq('id', catalogId).maybeSingle()
  if (readError || !current) {
    throw createError({ statusCode: 404, statusMessage: 'Catalogo no encontrado' })
  }

  const { error } = await supabase
    .from('catalogs')
    .update({ theme: { ...(current.theme || {}), ...theme } })
    .eq('id', catalogId)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message || 'No se pudo actualizar la apariencia' })
  }

  await insertAuditLog(event, {
    catalogId,
    action: 'setting_change',
    entityType: 'catalog_theme',
    entityId: catalogId,
    payloadBefore: current.theme || {},
    payloadAfter: { ...(current.theme || {}), ...theme },
  })

  await invalidateByCatalog(catalogId)
  await invalidateMarketplaceLanding()

  return { ok: true }
})
