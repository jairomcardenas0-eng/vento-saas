import { randomUUID } from 'node:crypto'
import {
  asMoney,
  generateServerEntityId,
  getRequestMeta,
  isValidPublicEntityId,
  isValidUuid,
  logApiWarn,
  safeReadJsonBody,
  sameMoney,
  sanitizeStringArray,
  sanitizeText,
} from '../../utils/security'
import { invalidateByCatalog, invalidateMarketplaceLanding } from '../../utils/cache'
import { logError, logInfo, setCorrelationId } from '../../utils/logger'
import { enforceRequestRateLimit } from '../../utils/rateLimit'
import { createSupabaseServiceRoleClient } from '../../utils/supabase'
import { getCurrentScheduleState } from '../../../app/utils/catalog'
import type { CatalogOperationalSettings, DeliveryZone } from '../../../app/types/catalog'

type OrderItemInput = {
  productId?: string
  productName?: string
  qty?: number
  unitPrice?: number
  totalPrice?: number
  variantSummary?: string[]
  variantOptionIds?: string[]
}

type OrderInput = {
  id?: string
  customerName?: string
  customerAddress?: string
  paymentMethod?: string
  deliveryMode?: 'delivery' | 'pickup'
  deliveryZoneId?: string
  deliveryZoneName?: string
  notes?: string
  items?: OrderItemInput[]
  subtotal?: number
  discountTotal?: number
  deliveryFee?: number
  appliedCoupon?: {
    id?: string
    code?: string
    type?: 'percentage' | 'fixed'
    value?: number
  } | null
  total?: number
}

type Body = {
  catalogId?: string
  order?: OrderInput
}

type CatalogSettingsSnapshot = Partial<CatalogOperationalSettings> & {
  deliveryZones?: DeliveryZone[]
}

const ORDER_WINDOW_MS = 60 * 60 * 1000
const ORDER_LIMIT = 5

export default defineEventHandler(async (event) => {
  setCorrelationId(event, randomUUID())
  const requestMeta = getRequestMeta(event, 'order')
  const { requestId } = requestMeta
  logInfo(event, 'orders:create', 'received request', { requestId })
  const body = await safeReadJsonBody<Body>(event)
  const catalogId = sanitizeText(body?.catalogId, 64)
  const order = body?.order

  if (!isValidUuid(catalogId) || !order) {
    throw createError({ statusCode: 400, statusMessage: 'Pedido invalido' })
  }

  if (await enforceRequestRateLimit(event, {
    scope: 'orders:create',
    limit: ORDER_LIMIT,
    windowMs: ORDER_WINDOW_MS,
    keyParts: [catalogId],
    requestMeta,
  })) {
    throw createError({ statusCode: 429, statusMessage: 'Demasiados intentos' })
  }

  if (!Array.isArray(order.items) || !order.items.length) {
    throw createError({ statusCode: 400, statusMessage: 'El pedido no tiene productos' })
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

  const settings = (catalog.settings || {}) as CatalogSettingsSnapshot
  const scheduleState = getCurrentScheduleState(settings as CatalogOperationalSettings)
  if (!scheduleState.isOpen) {
    throw createError({ statusCode: 400, statusMessage: 'El negocio no esta aceptando pedidos en este momento' })
  }

  const productIds = [...new Set(
    order.items
      .map(item => sanitizeText(item.productId, 80))
      .filter(Boolean),
  )]

  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, name, base_price, promo_price, has_promo, is_active')
    .eq('catalog_id', catalogId)
    .in('id', productIds)

  if (productsError) {
    logApiWarn('orders:create', 'product validation failed', { requestId, catalogId, error: productsError.message })
    throw createError({ statusCode: 500, statusMessage: 'No se pudo validar el pedido' })
  }

  const productMap = new Map((products || []).map(product => [String(product.id), product]))
  const normalizedItems = order.items.map((item) => {
    const productId = sanitizeText(item.productId, 80)
    const product = productMap.get(productId)

    if (!product || product.is_active === false) {
      throw createError({ statusCode: 400, statusMessage: 'Uno de los productos ya no esta disponible' })
    }

    const qty = Math.max(1, Math.min(100, Math.floor(Number(item.qty || 0))))
    const baseUnitPrice = product.has_promo && product.promo_price !== null
      ? asMoney(product.promo_price)
      : asMoney(product.base_price)
    const clientUnitPrice = asMoney(item.unitPrice)

    if (!sameMoney(clientUnitPrice, baseUnitPrice)) {
      throw createError({ statusCode: 400, statusMessage: 'El precio del pedido ya cambio' })
    }

    if (!sameMoney(asMoney(item.totalPrice), asMoney(clientUnitPrice * qty))) {
      throw createError({ statusCode: 400, statusMessage: 'El total de uno de los productos no coincide' })
    }

    return {
      productId,
      productName: sanitizeText(item.productName || product.name, 160),
      qty,
      unitPrice: clientUnitPrice,
      totalPrice: asMoney(clientUnitPrice * qty),
      variantSummary: sanitizeStringArray(item.variantSummary, 120, 16),
      variantOptionIds: sanitizeStringArray(item.variantOptionIds, 80, 16),
    }
  })

  const subtotal = asMoney(normalizedItems.reduce((sum, item) => sum + item.totalPrice, 0))
  if (!sameMoney(subtotal, asMoney(order.subtotal))) {
    throw createError({ statusCode: 400, statusMessage: 'El subtotal no coincide con el catalogo actual' })
  }

  const deliveryMode = order.deliveryMode === 'pickup' ? 'pickup' : 'delivery'
  const deliveryEnabled = settings.deliveryEnabled === true && settings.deliveryPaused !== true
  const pickupEnabled = settings.pickupEnabled === true

  if (deliveryMode === 'delivery' && !deliveryEnabled) {
    throw createError({ statusCode: 400, statusMessage: 'El delivery no esta disponible' })
  }

  if (deliveryMode === 'pickup' && !pickupEnabled) {
    throw createError({ statusCode: 400, statusMessage: 'La recogida no esta disponible' })
  }

  const customerName = sanitizeText(order.customerName, 120)
  const customerAddress = sanitizeText(order.customerAddress, 240)
  const paymentMethod = sanitizeText(order.paymentMethod || 'Pendiente por WhatsApp', 120)
  const notes = sanitizeText(order.notes, 500, { preserveLineBreaks: true })
  const deliveryZoneId = sanitizeText(order.deliveryZoneId, 120)
  const deliveryZoneName = sanitizeText(order.deliveryZoneName, 160)

  const isNameRequired = settings.checkoutNameReq !== 'optional'
  if (customerName.length < 2 && isNameRequired) {
    throw createError({ statusCode: 400, statusMessage: 'El nombre del cliente no es valido' })
  }

  let deliveryFee = 0
  if (deliveryMode === 'delivery') {
    if (settings.deliveryFeeType === 'zones') {
      const zones: DeliveryZone[] = Array.isArray(settings.deliveryZones) ? settings.deliveryZones : []
      const zone = zones.find((entry: DeliveryZone) => String(entry.id || '') === deliveryZoneId)
      if (!zone) {
        throw createError({ statusCode: 400, statusMessage: 'La zona de entrega ya no es valida' })
      }
      if (subtotal < asMoney(zone.minOrder)) {
        throw createError({ statusCode: 400, statusMessage: 'No cumple el minimo de la zona seleccionada' })
      }
      deliveryFee = asMoney(zone.price)
    } else {
      const minimumOrder = asMoney(settings.deliveryMinimumOrder)
      if (minimumOrder > 0 && subtotal < minimumOrder) {
        throw createError({ statusCode: 400, statusMessage: 'No cumple el minimo para delivery' })
      }
      deliveryFee = asMoney(settings.deliveryFlatFee)
    }

    if (customerAddress.length < 10) {
      throw createError({ statusCode: 400, statusMessage: 'La direccion no es valida' })
    }
  }

  let appliedCoupon: Record<string, unknown> | null = null
  let discountTotal = 0

  if (order.appliedCoupon?.id || order.appliedCoupon?.code) {
    let couponQuery = supabase
      .from('coupons')
      .select('id, code, discount_type, discount_value, minimum_order, usage_limit, used_count, starts_at, expires_at, visible_publicly, is_active')
      .eq('catalog_id', catalogId)
      .eq('is_active', true)

    const couponId = sanitizeText(order.appliedCoupon?.id, 120)
    const couponCode = sanitizeText(order.appliedCoupon?.code, 80, { uppercase: true })

    if (couponId) {
      couponQuery = couponQuery.eq('id', couponId)
    } else {
      couponQuery = couponQuery.eq('code', couponCode)
    }

    const { data: coupon, error: couponError } = await couponQuery.maybeSingle()
    if (couponError || !coupon || coupon.visible_publicly !== true) {
      throw createError({ statusCode: 400, statusMessage: 'El cupon ya no es valido' })
    }

    const now = Date.now()
    if (coupon.starts_at && Date.parse(coupon.starts_at) > now) {
      throw createError({ statusCode: 400, statusMessage: 'El cupon aun no esta activo' })
    }
    if (coupon.expires_at && Date.parse(coupon.expires_at) < now) {
      throw createError({ statusCode: 400, statusMessage: 'El cupon ya expiro' })
    }
    if (subtotal < asMoney(coupon.minimum_order)) {
      throw createError({ statusCode: 400, statusMessage: 'El pedido no cumple el minimo del cupon' })
    }
    if (coupon.usage_limit !== null && Number(coupon.used_count || 0) >= Number(coupon.usage_limit || 0)) {
      throw createError({ statusCode: 400, statusMessage: 'El cupon ya alcanzo su limite' })
    }

    discountTotal = coupon.discount_type === 'percentage'
      ? asMoney(subtotal * (Number(coupon.discount_value || 0) / 100))
      : asMoney(coupon.discount_value)
    discountTotal = Math.min(discountTotal, subtotal)

    appliedCoupon = {
      id: coupon.id,
      code: coupon.code,
      type: coupon.discount_type,
      value: Number(coupon.discount_value || 0),
    }
  }

  if (!sameMoney(discountTotal, asMoney(order.discountTotal))) {
    throw createError({ statusCode: 400, statusMessage: 'El descuento ya no coincide' })
  }

  if (!sameMoney(deliveryFee, asMoney(order.deliveryFee))) {
    throw createError({ statusCode: 400, statusMessage: 'El costo de entrega cambio' })
  }

  const total = asMoney(subtotal - discountTotal + deliveryFee)
  if (!sameMoney(total, asMoney(order.total))) {
    throw createError({ statusCode: 400, statusMessage: 'El total del pedido ya cambio' })
  }

  const normalizedOrderId = isValidPublicEntityId(order.id, 'order')
    ? order.id.trim()
    : generateServerEntityId('order')

  const { data: existingOrder, error: existingOrderError } = await supabase
    .from('orders')
    .select('id')
    .eq('catalog_id', catalogId)
    .eq('id', normalizedOrderId)
    .maybeSingle()

  if (existingOrderError) {
    logApiWarn('orders:create', 'duplicate check failed', { requestId, catalogId, orderId: normalizedOrderId, error: existingOrderError.message })
    throw createError({ statusCode: 500, statusMessage: 'No se pudo validar el pedido' })
  }

  if (existingOrder) {
    return { ok: true, duplicate: true, orderId: existingOrder.id, requestId }
  }

  const inventoryRelevantItems = normalizedItems
    .filter(item => item.variantOptionIds.length > 0)
    .map(item => ({
      productId: item.productId,
      qty: item.qty,
      variantOptionIds: item.variantOptionIds,
    }))

  if (inventoryRelevantItems.length) {
    const { data: reservationResult, error: reservationError } = await supabase.rpc('reserve_order_inventory', {
      order_catalog_id: catalogId,
      order_reference_id: normalizedOrderId,
      order_items_payload: inventoryRelevantItems,
    })

    if (reservationError) {
      logApiWarn('orders:create', 'inventory reservation failed', {
        requestId,
        catalogId,
        orderId: normalizedOrderId,
        error: reservationError.message,
      })
      throw createError({ statusCode: 400, statusMessage: 'No hay stock suficiente para completar el pedido' })
    }

    if (reservationResult && typeof reservationResult === 'object' && 'ok' in reservationResult && reservationResult.ok === false) {
      const reason = typeof reservationResult.reason === 'string' ? reservationResult.reason : 'No hay stock suficiente para completar el pedido'
      throw createError({ statusCode: 400, statusMessage: reason })
    }
  }

  const payload = {
    catalog_id: catalogId,
    id: normalizedOrderId,
    channel: 'whatsapp',
    status: 'new',
    customer_name: customerName,
    customer_address: deliveryMode === 'delivery' ? customerAddress : '',
    payment_method: paymentMethod,
    delivery_mode: deliveryMode,
    delivery_zone_id: deliveryMode === 'delivery' ? deliveryZoneId || null : null,
    delivery_zone_name: deliveryMode === 'delivery' ? deliveryZoneName || null : null,
    notes,
    items: normalizedItems,
    subtotal,
    discount_total: discountTotal,
    delivery_fee: deliveryFee,
    applied_coupon: appliedCoupon,
    total,
    created_at: new Date().toISOString(),
  }

  const { error: insertError } = await supabase.from('orders').insert(payload)
  if (insertError) {
    if (inventoryRelevantItems.length) {
      const { error: releaseError } = await supabase.rpc('release_order_inventory_reservations', {
        order_catalog_id: catalogId,
        order_reference_id: normalizedOrderId,
      })

      if (releaseError) {
        logApiWarn('orders:create', 'inventory rollback failed', {
          requestId,
          catalogId,
          orderId: normalizedOrderId,
          error: releaseError.message,
        })
      }
    }

    logApiWarn('orders:create', 'insert failed', { requestId, catalogId, orderId: normalizedOrderId, error: insertError.message })
    logError(event, 'orders:create', insertError, { requestId, catalogId, orderId: normalizedOrderId })
    throw createError({ statusCode: 500, statusMessage: 'No se pudo guardar el pedido' })
  }

  if (appliedCoupon?.id) {
    const { data: coupon, error: couponReadError } = await supabase
      .from('coupons')
      .select('used_count')
      .eq('catalog_id', catalogId)
      .eq('id', String(appliedCoupon.id))
      .maybeSingle()

    if (!couponReadError && coupon) {
      const { error: couponUpdateError } = await supabase
        .from('coupons')
        .update({
          used_count: Number(coupon.used_count || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('catalog_id', catalogId)
        .eq('id', String(appliedCoupon.id))

      if (couponUpdateError) {
        logApiWarn('orders:create', 'coupon usage update failed', { requestId, catalogId, orderId: normalizedOrderId, couponId: appliedCoupon.id, error: couponUpdateError.message })
      }
    } else if (couponReadError) {
      logApiWarn('orders:create', 'coupon read failed after insert', { requestId, catalogId, orderId: normalizedOrderId, couponId: appliedCoupon.id, error: couponReadError.message })
    }
  }

  await invalidateByCatalog(catalogId)
  await invalidateMarketplaceLanding()

  return { ok: true, orderId: normalizedOrderId, requestId }
})
