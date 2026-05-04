import type { StorefrontPayload } from '~/composables/useStorefrontExperience'
import { defaultSettings, defaultTheme } from '~/data/defaults'
import type { CatalogCoupon, CatalogReview } from '~/types/catalog'
import type { CategoryItem, ProductItem } from '~/stores/catalog'

type StorefrontRow = Record<string, unknown>
type VariantGroupRow = Record<string, unknown>
type VariantOptionRow = Record<string, unknown>
type PromoTagRow = { label?: unknown, position?: unknown }
type TimerRow = {
  hours?: unknown
  position?: unknown
  showMinutes?: unknown
  showSeconds?: unknown
  linkSale?: unknown
  carouselEnabled?: unknown
  carouselIntervalSeconds?: unknown
}
type AdminReplyRow = { name?: unknown, text?: unknown }
type CatalogRow = {
  id?: unknown
  slug?: unknown
  settings?: Record<string, unknown>
  theme?: Record<string, unknown>
}

const mapCategory = (row: StorefrontRow): CategoryItem => ({
  id: String(row.id || ''),
  name: String(row.name || ''),
  description: String(row.description || ''),
  sortOrder: Number(row.sort_order || 0),
})

const mapProduct = (row: StorefrontRow): ProductItem => ({
  id: String(row.id || ''),
  categoryId: String(row.category_id || ''),
  name: String(row.name || ''),
  description: String(row.description || ''),
  basePrice: Number(row.base_price || 0),
  imageUrl: typeof row.image_url === 'string' ? row.image_url : null,
  imageUrls: Array.isArray(row.image_urls) && row.image_urls.length
    ? [
        ...row.image_urls.slice(0, 3).map(item => typeof item === 'string' ? item : null),
        ...Array.from({ length: Math.max(0, 3 - row.image_urls.length) }, () => null),
      ]
    : [null, null, null],
  isActive: row.is_active !== false,
  variants: Array.isArray(row.variants)
    ? row.variants.map((group, groupIndex) => {
      const typedGroup = (group || {}) as VariantGroupRow
      return {
        id: String(typedGroup.id || `${row.id}-group-${groupIndex}`),
        groupName: String(typedGroup.groupName || ''),
        type: typedGroup.type === 'multiple' ? 'multiple' : 'single',
        required: Boolean(typedGroup.required),
        options: Array.isArray(typedGroup.options)
          ? typedGroup.options.map((option, optionIndex) => {
            const typedOption = (option || {}) as VariantOptionRow
            return {
              id: String(typedOption.id || `${row.id}-group-${groupIndex}-option-${optionIndex}`),
              name: String(typedOption.name || ''),
              priceDelta: Number(typedOption.priceDelta || 0),
              isRequired: Boolean(typedOption.isRequired ?? typedGroup.required),
            }
          })
          : [],
      }
    })
    : [],
  hasPromo: row.has_promo === true,
  promoPrice: row.promo_price === null || row.promo_price === undefined ? null : Number(row.promo_price),
  sortOrder: Number(row.sort_order || 0),
  offerLabel: String(((row.promo_tag || {}) as PromoTagRow).label || ''),
  offerLabelPosition: ((row.promo_tag || {}) as PromoTagRow).position === 'price' ? 'price' : 'image',
  timerHours: ((row.timer || {}) as TimerRow).hours === null || ((row.timer || {}) as TimerRow).hours === undefined
    ? null
    : Number(((row.timer || {}) as TimerRow).hours),
  timerPosition: ((row.timer || {}) as TimerRow).position === 'price-below' ? 'price-below' : 'image-right',
  timerShowMinutes: Boolean(((row.timer || {}) as TimerRow).showMinutes ?? true),
  timerShowSeconds: Boolean(((row.timer || {}) as TimerRow).showSeconds ?? false),
  timerLinkSale: Boolean(((row.timer || {}) as TimerRow).linkSale ?? false),
  carouselEnabled: Boolean(((row.timer || {}) as TimerRow).carouselEnabled ?? false),
  carouselIntervalSeconds: (() => {
    const raw = ((row.timer || {}) as TimerRow).carouselIntervalSeconds
    const num = raw === null || raw === undefined ? 3 : Number(raw)
    if (!Number.isFinite(num) || num < 1) return 3 as 1 | 2 | 3 | 4 | 5
    if (num > 5) return 5 as 1 | 2 | 3 | 4 | 5
    return Math.round(num) as 1 | 2 | 3 | 4 | 5
  })(),
  tags: Array.isArray(row.tags) ? row.tags : [],
  productRating: Number(row.product_rating || 0),
  productRatingCount: Number(row.product_rating_count || 0),
  freeShip: row.free_ship === true,
  inventoryItems: [],
  createdAt: null,
  updatedAt: null,
})

const mapReview = (row: StorefrontRow): CatalogReview => ({
  id: String(row.id || ''),
  productId: String(row.product_id || ''),
  productName: String(row.product_name || ''),
  name: String(row.customer_name || ''),
  comment: String(row.comment || ''),
  rating: Number(row.rating || 0),
  approved: row.approved === true,
  adminReply: row.admin_reply && typeof row.admin_reply === 'object'
    ? {
        name: String(((row.admin_reply || {}) as AdminReplyRow).name || ''),
        text: String(((row.admin_reply || {}) as AdminReplyRow).text || ''),
      }
    : undefined,
  createdAt: String(row.created_at || ''),
})

const mapCoupon = (row: StorefrontRow): CatalogCoupon => ({
  id: String(row.id || ''),
  name: String(row.name || ''),
  code: String(row.code || ''),
  discountType: row.discount_type === 'percentage' ? 'percentage' : 'fixed',
  discountValue: Number(row.discount_value || 0),
  minimumOrder: Number(row.minimum_order || 0),
  usageLimit: row.usage_limit === null || row.usage_limit === undefined ? null : Number(row.usage_limit),
  usedCount: Number(row.used_count || 0),
  startsAt: typeof row.starts_at === 'string' ? row.starts_at : null,
  expiresAt: typeof row.expires_at === 'string' ? row.expires_at : null,
  visiblePublicly: row.visible_publicly === true,
  active: row.is_active === true,
  createdAt: String(row.created_at || ''),
  updatedAt: String(row.updated_at || ''),
})

export const mapStorefrontRpcPayload = (data: Record<string, unknown> | null | undefined): StorefrontPayload | null => {
  if (!data?.catalog) {
    return null
  }

  const catalog = (data.catalog || {}) as CatalogRow

  return {
    id: String(catalog.id || ''),
    slug: String(catalog.slug || ''),
    settings: {
      ...defaultSettings(String(catalog.settings?.businessName || 'Nueva Tienda'), String(catalog.slug || '')),
      ...(catalog.settings || {}),
    },
    theme: {
      ...defaultTheme(),
      ...(catalog.theme || {}),
    },
    categories: Array.isArray(data.categories) ? data.categories.map(mapCategory) : [],
    products: Array.isArray(data.products) ? data.products.map(mapProduct) : [],
    reviews: Array.isArray(data.reviews) ? data.reviews.map(mapReview) : [],
    coupons: Array.isArray(data.coupons) ? data.coupons.map(mapCoupon) : [],
  }
}
