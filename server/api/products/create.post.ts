import { createProductSchema } from '../../schemas/product.schema'
import { insertAuditLog } from '../../utils/auditLog'
import { invalidateByCatalog, invalidateMarketplaceLanding } from '../../utils/cache'
import { checkPlanLimit } from '../../utils/plans'
import { sanitizePlainText } from '../../utils/sanitize'
import { createSupabaseServiceRoleClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = createProductSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: JSON.stringify(parsed.error.flatten()) })
  }

  const supabase = createSupabaseServiceRoleClient(event)
  const payload = parsed.data

  const [{ data: catalog, error: catalogError }, { count: currentCount, error: countError }] = await Promise.all([
    supabase.from('catalogs').select('plan_tier').eq('id', payload.catalogId).maybeSingle(),
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('catalog_id', payload.catalogId),
  ])

  if (catalogError || !catalog) {
    throw createError({ statusCode: 404, statusMessage: 'Catalogo no encontrado' })
  }

  if (countError) {
    throw createError({ statusCode: 500, statusMessage: 'No se pudo validar el limite de productos' })
  }

  const limitCheck = checkPlanLimit(catalog.plan_tier, 'maxProducts', Number(currentCount || 0) + 1)
  if (!limitCheck.allowed) {
    throw createError({ statusCode: 403, statusMessage: 'Has alcanzado el limite de productos de tu plan. Actualiza para agregar mas.' })
  }

  const { data, error } = await supabase
    .from('products')
    .insert({
      catalog_id: payload.catalogId,
      category_id: payload.categoryId,
      name: sanitizePlainText(payload.name, 100),
      description: sanitizePlainText(payload.description || '', 2000),
      base_price: payload.price,
      promo_price: payload.offerPrice ?? null,
      has_promo: typeof payload.offerPrice === 'number',
      is_active: true,
      free_ship: payload.freeShip ?? false,
    })
    .select('id')
    .single()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message || 'No se pudo crear el producto' })
  }

  await insertAuditLog(event, {
    catalogId: payload.catalogId,
    action: 'create',
    entityType: 'product',
    entityId: data?.id ? String(data.id) : null,
    payloadAfter: {
      name: payload.name,
      categoryId: payload.categoryId,
      freeShip: payload.freeShip ?? false,
    },
  })

  await invalidateByCatalog(payload.catalogId)
  await invalidateMarketplaceLanding()

  return { ok: true, id: data?.id || null }
})
