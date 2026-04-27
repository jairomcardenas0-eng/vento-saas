import { randomUUID } from 'node:crypto'
import {
  generateServerEntityId,
  getRequestMeta,
  isValidPublicEntityId,
  isValidUuid,
  logApiWarn,
  safeReadJsonBody,
  sanitizeText,
} from '../../utils/security'
import { invalidateByCatalog, invalidateMarketplaceLanding } from '../../utils/cache'
import { logError, logInfo, setCorrelationId } from '../../utils/logger'
import { enforceRequestRateLimit } from '../../utils/rateLimit'
import { createSupabaseServiceRoleClient } from '../../utils/supabase'

type ReviewInput = {
  id?: string
  productId?: string
  productName?: string
  name?: string
  comment?: string
  rating?: number
  approved?: boolean
}

type Body = {
  catalogId?: string
  review?: ReviewInput
}

const REVIEW_WINDOW_MS = 6 * 60 * 60 * 1000
const REVIEW_LIMIT = 3

export default defineEventHandler(async (event) => {
  setCorrelationId(event, randomUUID())
  const requestMeta = getRequestMeta(event, 'review')
  const { requestId } = requestMeta
  logInfo(event, 'reviews:create', 'received request', { requestId })
  const body = await safeReadJsonBody<Body>(event, 12 * 1024)
  const catalogId = sanitizeText(body?.catalogId, 64)
  const review = body?.review

  if (!isValidUuid(catalogId) || !review) {
    throw createError({ statusCode: 400, statusMessage: 'Resena invalida' })
  }

  if (await enforceRequestRateLimit(event, {
    scope: 'reviews:create',
    limit: REVIEW_LIMIT,
    windowMs: REVIEW_WINDOW_MS,
    keyParts: [catalogId],
    requestMeta,
  })) {
    throw createError({ statusCode: 429, statusMessage: 'Demasiadas resenas en poco tiempo' })
  }

  const customerName = sanitizeText(review.name, 80)
  const comment = sanitizeText(review.comment, 300, { preserveLineBreaks: true })
  const productId = sanitizeText(review.productId, 80)
  const productName = sanitizeText(review.productName, 160)
  const rating = Math.max(1, Math.min(5, Math.round(Number(review.rating || 0))))

  if (customerName.length < 2 || comment.length < 3 || !productId) {
    throw createError({ statusCode: 400, statusMessage: 'Completa los datos de la resena' })
  }

  const supabase = createSupabaseServiceRoleClient(event)

  const { data: catalog, error: catalogError } = await supabase
    .from('catalogs')
    .select('id, status, is_banned, settings')
    .eq('id', catalogId)
    .maybeSingle()

  if (catalogError || !catalog || catalog.status !== 'published' || catalog.is_banned) {
    throw createError({ statusCode: 404, statusMessage: 'Catalogo no disponible' })
  }

  if (catalog.settings?.reviewsEnabled === false) {
    throw createError({ statusCode: 400, statusMessage: 'Las resenas estan desactivadas' })
  }

  const { data: product, error: productError } = await supabase
    .from('products')
    .select('id, name, is_active')
    .eq('catalog_id', catalogId)
    .eq('id', productId)
    .maybeSingle()

  if (productError || !product || product.is_active === false) {
    throw createError({ statusCode: 400, statusMessage: 'El producto no esta disponible para resenas' })
  }

  const normalizedReviewId = isValidPublicEntityId(review.id, 'review')
    ? review.id.trim()
    : generateServerEntityId('review')

  const { data: existingReview, error: existingReviewError } = await supabase
    .from('reviews')
    .select('id')
    .eq('catalog_id', catalogId)
    .eq('id', normalizedReviewId)
    .maybeSingle()

  if (existingReviewError) {
    logApiWarn('reviews:create', 'duplicate check failed', { requestId, catalogId, reviewId: normalizedReviewId, error: existingReviewError.message })
    throw createError({ statusCode: 500, statusMessage: 'No se pudo validar la resena' })
  }

  if (existingReview) {
    return { ok: true, duplicate: true, approved: false, reviewId: existingReview.id, requestId }
  }

  const payload = {
    catalog_id: catalogId,
    id: normalizedReviewId,
    product_id: productId,
    product_name: productName || String(product.name || '').trim().slice(0, 160),
    customer_name: customerName,
    comment,
    rating,
    approved: catalog.settings?.reviewModeration === false,
    created_at: new Date().toISOString(),
  }

  const { error: insertError } = await supabase.from('reviews').insert(payload)
  if (insertError) {
    logApiWarn('reviews:create', 'insert failed', { requestId, catalogId, reviewId: normalizedReviewId, error: insertError.message })
    logError(event, 'reviews:create', insertError, { requestId, catalogId, reviewId: normalizedReviewId })
    throw createError({ statusCode: 500, statusMessage: 'No se pudo guardar la resena' })
  }

  await invalidateByCatalog(catalogId)
  await invalidateMarketplaceLanding()

  return { ok: true, approved: payload.approved, reviewId: normalizedReviewId, requestId }
})
