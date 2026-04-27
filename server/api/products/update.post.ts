import { updateProductSchema } from '../../schemas/product.schema'
import { invalidateByCatalog, invalidateMarketplaceLanding } from '../../utils/cache'
import { sanitizePlainText } from '../../utils/sanitize'
import { createSupabaseServiceRoleClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = updateProductSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: JSON.stringify(parsed.error.flatten()) })
  }

  const supabase = createSupabaseServiceRoleClient(event)
  const payload = parsed.data

  const { error } = await supabase
    .from('products')
    .update({
      category_id: payload.categoryId,
      name: sanitizePlainText(payload.name, 100),
      description: sanitizePlainText(payload.description || '', 2000),
      base_price: payload.price,
      promo_price: payload.offerPrice ?? null,
      has_promo: typeof payload.offerPrice === 'number',
      free_ship: payload.freeShip ?? false,
    })
    .eq('catalog_id', payload.catalogId)
    .eq('id', payload.id)

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message || 'No se pudo actualizar el producto' })
  }

  await invalidateByCatalog(payload.catalogId)
  await invalidateMarketplaceLanding()

  return { ok: true }
})
