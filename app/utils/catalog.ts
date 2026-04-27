import type {
  BusinessDaySchedule,
  CatalogCoupon,
  CatalogOperationalSettings,
  CatalogOrderItem,
  CatalogProduct,
  DeliveryZone,
  ProductVariantGroup,
} from '~/types/catalog'

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

export const money = (value: number, currency = 'MXN') =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(value || 0)

export const effectivePrice = (product: CatalogProduct) => product.salePrice ?? product.price

export const getAllProductImages = (product: CatalogProduct) => {
  const images = [product.image, ...product.images].map(item => item?.trim()).filter(Boolean) as string[]
  return [...new Set(images)]
}

export const createTimerText = (hours: number | null) => {
  if (!hours || hours <= 0) {
    return ''
  }
  const end = new Date(Date.now() + hours * 60 * 60 * 1000)
  return end.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

export const summarizeVariantGroups = (groups: ProductVariantGroup[]) =>
  groups.map(group => ({
    title: group.groupName,
    options: group.options.length,
    mode: group.type === 'multiple' ? 'multi' : 'single',
    required: group.required,
  }))

export const buildWhatsAppMessage = (
  businessName: string,
  items: CatalogOrderItem[],
  total: number,
  customer: { name: string; address: string; payment: string; notes: string },
) => {
  const lines = [
    `Hola ${businessName}, quiero hacer un pedido.`,
    ...items.map(item => `- ${item.qty}x ${item.productName}${item.variantSummary.length ? ` (${item.variantSummary.join(', ')})` : ''} · ${money(item.totalPrice)}`),
    `Total: ${money(total)}`,
    customer.name ? `Nombre: ${customer.name}` : '',
    customer.address ? `Dirección: ${customer.address}` : '',
    customer.payment ? `Pago: ${customer.payment}` : '',
    customer.notes ? `Notas: ${customer.notes}` : '',
  ]
  return lines.filter(Boolean).join('\n')
}

const dayIndexMap: Record<BusinessDaySchedule['dayKey'], number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
}

const timeToMinutes = (value: string) => {
  const [hours, minutes] = value.split(':').map(Number)
  return (hours || 0) * 60 + (minutes || 0)
}

export const getCurrentScheduleState = (settings: CatalogOperationalSettings) => {
  if (settings.closed) {
    return { isOpen: false, label: 'Cerrado por el negocio' }
  }

  if (settings.scheduleMode === 'always') {
    return { isOpen: true, label: 'Abierto 24/7' }
  }

  const now = new Date()
  const currentDay = settings.weeklySchedule.find(day => dayIndexMap[day.dayKey] === now.getDay())
  if (!currentDay?.enabled) {
    return { isOpen: false, label: `Cerrado hoy` }
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes()
  const currentRange = currentDay.ranges.find(range => currentMinutes >= timeToMinutes(range.start) && currentMinutes <= timeToMinutes(range.end))
  if (currentRange) {
    return { isOpen: true, label: `Abierto ahora · cierra ${currentRange.end}` }
  }

  const upcoming = currentDay.ranges.find(range => currentMinutes < timeToMinutes(range.start))
  if (upcoming) {
    return { isOpen: false, label: `Abre hoy a las ${upcoming.start}` }
  }

  return { isOpen: false, label: 'Cerrado por horario' }
}

export const resolveDeliveryFee = (settings: CatalogOperationalSettings, zoneId: string | null) => {
  if (!settings.deliveryEnabled || settings.deliveryPaused) {
    return { fee: 0, minimumOrder: 0, zone: null as DeliveryZone | null }
  }

  if (settings.deliveryFeeType === 'zones') {
    const zone = settings.deliveryZones.find(item => item.id === zoneId) || null
    return {
      fee: zone?.price || 0,
      minimumOrder: zone?.minOrder || 0,
      zone,
    }
  }

  return {
    fee: settings.deliveryFlatFee,
    minimumOrder: settings.deliveryMinimumOrder,
    zone: null as DeliveryZone | null,
  }
}

export const validateCoupon = (coupon: CatalogCoupon, subtotal: number, now = new Date()) => {
  if (!coupon.active) {
    return { valid: false, reason: 'Este cupón está desactivado.' }
  }
  if (coupon.startsAt && now < new Date(coupon.startsAt)) {
    return { valid: false, reason: 'Este cupón todavía no está activo.' }
  }
  if (coupon.expiresAt && now > new Date(coupon.expiresAt)) {
    return { valid: false, reason: 'Este cupón ya expiró.' }
  }
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
    return { valid: false, reason: 'Este cupón ya agotó sus usos.' }
  }
  if (subtotal < coupon.minimumOrder) {
    return { valid: false, reason: `Necesitas ${money(coupon.minimumOrder)} para usar este cupón.` }
  }

  const discount = coupon.discountType === 'percentage'
    ? subtotal * (coupon.discountValue / 100)
    : coupon.discountValue

  return {
    valid: true,
    reason: '',
    discount: Math.max(0, Math.min(subtotal, Number(discount.toFixed(2)))),
  }
}
