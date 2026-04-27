import { updateSettingsSchema } from '../../schemas/catalog.schema'
import { insertAuditLog } from '../../utils/auditLog'
import { invalidateByCatalog, invalidateMarketplaceLanding } from '../../utils/cache'
import { createSupabaseServiceRoleClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = updateSettingsSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: JSON.stringify(parsed.error.flatten()) })
  }

  const supabase = createSupabaseServiceRoleClient(event)
  const { catalogId, settings } = parsed.data
  const { data: current, error: readError } = await supabase.from('catalogs').select('settings').eq('id', catalogId).maybeSingle()
  if (readError || !current) {
    throw createError({ statusCode: 404, statusMessage: 'Catalogo no encontrado' })
  }

  const { error } = await supabase
    .from('catalogs')
    .update({ settings: { ...(current.settings || {}), ...settings } })
    .eq('id', catalogId)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message || 'No se pudo actualizar la configuracion' })
  }

  await insertAuditLog(event, {
    catalogId,
    action: 'setting_change',
    entityType: 'catalog_settings',
    entityId: catalogId,
    payloadBefore: current.settings || {},
    payloadAfter: { ...(current.settings || {}), ...settings },
  })

  await invalidateByCatalog(catalogId)
  await invalidateMarketplaceLanding()

  return { ok: true }
})
