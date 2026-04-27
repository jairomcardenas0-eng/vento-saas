import { createCouponSchema } from '../../schemas/coupon.schema'
import { invalidateByCatalog, invalidateMarketplaceLanding } from '../../utils/cache'
import { createSupabaseServiceRoleClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = createCouponSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: JSON.stringify(parsed.error.flatten()) })
  }

  const supabase = createSupabaseServiceRoleClient(event)
  const payload = parsed.data

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
