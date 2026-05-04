import { createCouponSchema } from '../../schemas/coupon.schema'
import { invalidateByCatalog, invalidateMarketplaceLanding } from '../../utils/cache'
import { createSupabaseServiceRoleClient } from '../../utils/supabase'
import { requireCatalogAccess } from '../../utils/auth'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = createCouponSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: JSON.stringify(parsed.error.flatten()) })
  }

  const payload = parsed.data
  await requireCatalogAccess(event, payload.catalogId, 'manageCoupons')

  const supabase = createSupabaseServiceRoleClient(event)

  const { data: existingCoupon, error: duplicateError } = await supabase
    .from('coupons')
    .select('id')
    .eq('catalog_id', payload.catalogId)
    .eq('code', payload.code.toUpperCase())
    .maybeSingle()

  if (duplicateError) {
    throw createError({ statusCode: 500, statusMessage: 'No se pudo validar la unicidad del cupon' })
  }

  if (existingCoupon) {
    throw createError({ statusCode: 409, statusMessage: 'Ya existe un cupon con ese codigo en este catalogo' })
  }

  const { data, error } = await supabase
    .from('coupons')
    .insert({
      catalog_id: payload.catalogId,
      name: payload.code,
      code: payload.code.toUpperCase(),
      discount_type: payload.type,
      discount_value: payload.value,
      minimum_order: payload.minAmount ?? 0,
      usage_limit: payload.maxUses ?? null,
      used_count: 0,
      expires_at: payload.expiresAt ?? null,
      visible_publicly: true,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message || 'No se pudo crear el cupon' })
  }

  await invalidateByCatalog(payload.catalogId)
  await invalidateMarketplaceLanding()

  return { ok: true, id: data?.id || null }
})
