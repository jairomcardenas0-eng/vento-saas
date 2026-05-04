import { useNuxtApp } from 'nuxt/app'
import { createCatalogRecord, defaultSettings, defaultTheme } from '~/data/defaults'
import type {
  CatalogAccessProfile,
  CatalogCategory,
  CatalogCoupon,
  CatalogPlan,
  CatalogPlanHistoryEntry,
  CatalogVariantGroup,
  CatalogVariantOption,
  InventoryItem,
  MarketplaceFeedEntry,
  MarketplaceHub,
  MarketplaceProductCard,
  MarketplaceStoreCard,
  CatalogOrder,
  CatalogProduct,
  CatalogRecord,
  CatalogReview,
  UserProfile,
} from '~/types/catalog'
import type { CategoryItem, ProductItem } from '~/stores/catalog'
import { createOwnerAccessProfile, normalizeTeamPermissions } from '~/utils/adminAccess'
import { createSupabaseAnalyticsBackend } from '~/composables/backend/analytics'
import { createSupabaseAuthBackend } from '~/composables/backend/auth'
import { createSupabaseCatalogBackend } from '~/composables/backend/catalog'
import { createSupabaseCommerceBackend } from '~/composables/backend/commerce'
import { createSupabaseNotificationsBackend } from '~/composables/backend/notifications'
import { createSupabaseOperationsBackend } from '~/composables/backend/operations'
import type {
  CatalogAccessRow,
  CatalogHeaderRow,
  CatalogPlanHistoryRow,
  CatalogPlanRow,
  CatalogHeaderSnapshot,
  CategoryRow,
  CouponRow,
  EnsureSuccess,
  MarketplaceFeedEntryRow,
  MarketplaceHubRow,
  MarketplaceProductRow,
  MarketplaceStoreRow,
  OrderRow,
  ProductRow,
  ProductVariantGroupRow,
  ProductVariantOptionRow,
  InventoryItemRow,
  ReviewRow,
  UserProfileRow,
  BackendSupabaseClient,
} from '~/composables/backend/types'
export type {
  AdminBootstrapPayload,
  MasterCatalogSnapshot,
  MasterDashboardSnapshot,
  OrdersStatsSnapshot,
  ReviewsStatsSnapshot,
  TeamMemberPayload,
} from '~/composables/backend/types'

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))

const CATALOG_SELECT = 'id, slug, owner_uid, status, plan_tier, is_banned, created_at, rating_average, rating_approved_count, theme, settings'
const CATEGORY_SELECT = 'catalog_id, id, name, description, sort_order, is_active'
const PRODUCT_SELECT = 'catalog_id, id, category_id, name, description, base_price, promo_price, has_promo, image_url, image_urls, sort_order, is_active, promo_tag, timer, tags, variants, product_rating, product_rating_count, reviews_approved_count, free_ship, product_variant_groups(id, catalog_id, product_id, group_name, selection_type, required, sort_order, product_variant_options(id, group_id, name, price_delta, is_required, sort_order)), inventory_items(id, catalog_id, product_id, variant_option_id, sku, quantity, reserved, low_stock_threshold, track_stock)'
const REVIEW_SELECT = 'catalog_id, id, product_id, product_name, customer_name, comment, rating, approved, admin_reply, created_at'
const ORDER_SELECT = 'catalog_id, id, channel, status, customer_name, customer_address, payment_method, delivery_mode, delivery_zone_id, delivery_zone_name, notes, internal_notes, assigned_to_uid, assigned_to_name, items, subtotal, discount_total, delivery_fee, applied_coupon, total, created_at, status_history:order_status_history(id, order_id, status, previous_status, changed_by, changed_by_name, note, created_at), events:order_events(id, order_id, event_type, payload, created_by, created_at)'
const COUPON_SELECT = 'catalog_id, id, name, code, discount_type, discount_value, minimum_order, usage_limit, used_count, starts_at, expires_at, visible_publicly, is_active, created_at, updated_at'
const USER_PROFILE_SELECT = 'uid, email, display_name, default_catalog_id, system_role, referral_code, referred_by, created_at'
const DEFAULT_LIVE_PAGE_SIZE = 50
const normalizeCarouselIntervalSeconds = (value: number | null | undefined): 1 | 2 | 3 | 4 | 5 => {
  const normalized = Math.round(Number(value || 3))
  if (normalized === 1 || normalized === 2 || normalized === 3 || normalized === 4 || normalized === 5) {
    return normalized
  }
  return 3
}

const mapRowToCategory = (row: CategoryRow): CatalogCategory => ({
  id: row.id,
  name: row.name,
  note: row.description || '',
  order: Number(row.sort_order || 0),
  active: row.is_active !== false,
})

const mapCategoryToRow = (catalogId: string, category: CatalogCategory) => ({
  id: category.id,
  catalog_id: catalogId,
  name: category.name,
  description: category.note || '',
  sort_order: category.order,
  is_active: category.active,
})

const mapVariantOptionRow = (row: ProductVariantOptionRow): CatalogVariantOption => ({
  id: row.id,
  groupId: row.group_id || '',
  name: row.name || '',
  priceDelta: Number(row.price_delta || 0),
  isRequired: row.is_required === true,
  sortOrder: Number(row.sort_order || 0),
})

const mapVariantGroupRow = (row: ProductVariantGroupRow): CatalogVariantGroup => ({
  id: row.id,
  catalogId: row.catalog_id || undefined,
  productId: row.product_id || undefined,
  groupName: row.group_name || '',
  selectionType: row.selection_type === 'multiple' ? 'multiple' : 'single',
  required: row.required === true,
  sortOrder: Number(row.sort_order || 0),
  options: Array.isArray(row.product_variant_options) ? row.product_variant_options.map(mapVariantOptionRow) : [],
})

const mapInventoryItemRow = (row: InventoryItemRow): InventoryItem => ({
  id: row.id,
  catalogId: row.catalog_id || undefined,
  productId: row.product_id || '',
  variantOptionId: row.variant_option_id || null,
  sku: row.sku || '',
  quantity: Number(row.quantity || 0),
  reserved: Number(row.reserved || 0),
  lowStockThreshold: Number(row.low_stock_threshold || 0),
  trackStock: row.track_stock === true,
})

const mapRowToProduct = (row: ProductRow): CatalogProduct => ({
  id: row.id,
  categoryId: row.category_id || '',
  name: row.name,
  description: row.description || '',
  price: Number(row.base_price || 0),
  salePrice: row.promo_price === null || row.promo_price === undefined ? null : Number(row.promo_price),
  order: Number(row.sort_order || 0),
  image: row.image_url || '',
  images: Array.isArray(row.image_urls) ? row.image_urls.filter(Boolean) : [],
  active: row.is_active !== false,
  offerLabel: row.promo_tag?.label || '',
  offerPosition: row.promo_tag?.position || 'image',
  timerHours: row.timer?.hours ?? null,
  timerPosition: row.timer?.position || 'image-right',
  timerShowMinutes: row.timer?.showMinutes ?? true,
  timerShowSeconds: row.timer?.showSeconds ?? false,
  timerLinkSale: row.timer?.linkSale ?? false,
  carouselEnabled: row.timer?.carouselEnabled ?? false,
  carouselIntervalSeconds: normalizeCarouselIntervalSeconds(row.timer?.carouselIntervalSeconds),
  tags: Array.isArray(row.tags) ? row.tags : [],
  variants: Array.isArray(row.variants) ? row.variants : [],
  variantGroups: Array.isArray(row.product_variant_groups)
    ? row.product_variant_groups.map(mapVariantGroupRow)
    : Array.isArray(row.variant_groups)
      ? row.variant_groups
      : [],
  inventoryItems: Array.isArray(row.inventory_items)
    ? row.inventory_items.map(mapInventoryItemRow)
    : [],
  reviewsApprovedCount: Number(row.reviews_approved_count || 0),
  productRating: Number(row.product_rating || 0),
  productRatingCount: Number(row.product_rating_count || 0),
  freeShip: row.free_ship ?? false,
})

const mapProductToRow = (catalogId: string, product: CatalogProduct) => ({
  id: product.id,
  catalog_id: catalogId,
  category_id: product.categoryId || null,
  name: product.name,
  description: product.description || '',
  base_price: product.price,
  promo_price: product.salePrice ?? null,
  has_promo: product.salePrice !== null && product.salePrice !== undefined,
  image_url: product.image || null,
  image_urls: product.images || [],
  sort_order: product.order,
  is_active: product.active,
  promo_tag: {
    label: product.offerLabel || '',
    position: product.offerPosition || 'image',
  },
  timer: {
    hours: product.timerHours,
    position: product.timerPosition,
    showMinutes: product.timerShowMinutes,
    showSeconds: product.timerShowSeconds,
    linkSale: product.timerLinkSale,
    carouselEnabled: product.carouselEnabled ?? false,
    carouselIntervalSeconds: product.carouselIntervalSeconds ?? 3,
  },
  tags: product.tags || [],
  variants: product.variantGroups?.length
    ? product.variantGroups.map(group => ({
      id: group.id,
      groupName: group.groupName,
      type: group.selectionType,
      required: group.required,
      options: group.options.map(option => ({
        id: option.id,
        name: option.name,
        priceDelta: option.priceDelta,
        isRequired: option.isRequired,
      })),
    }))
    : product.variants || [],
  reviews_approved_count: product.reviewsApprovedCount || 0,
  product_rating: product.productRating || 0,
  product_rating_count: product.productRatingCount || 0,
  free_ship: product.freeShip ?? false,
})

const mapRowToReview = (row: ReviewRow): CatalogReview => ({
  id: row.id,
  productId: row.product_id || '',
  productName: row.product_name || '',
  name: row.customer_name || '',
  comment: row.comment || '',
  rating: Number(row.rating || 0),
  approved: row.approved === true,
  adminReply: row.admin_reply || undefined,
  createdAt: row.created_at,
})

const mapReviewToRow = (catalogId: string, review: CatalogReview) => ({
  id: review.id,
  catalog_id: catalogId,
  product_id: review.productId || null,
  product_name: review.productName || '',
  customer_name: review.name,
  comment: review.comment || '',
  rating: review.rating,
  approved: review.approved === true,
  admin_reply: review.adminReply || null,
  created_at: review.createdAt || new Date().toISOString(),
})

const mapRowToOrder = (row: OrderRow): CatalogOrder => ({
  id: row.id,
  catalogId: row.catalog_id,
  channel: row.channel || 'whatsapp',
  status: row.status,
  customerName: row.customer_name || '',
  customerAddress: row.customer_address || '',
  paymentMethod: row.payment_method || '',
  deliveryMode: row.delivery_mode,
  deliveryZoneId: row.delivery_zone_id || undefined,
  deliveryZoneName: row.delivery_zone_name || undefined,
  notes: row.notes || '',
  internalNotes: row.internal_notes || '',
  assignedToUid: row.assigned_to_uid || null,
  assignedToName: row.assigned_to_name || null,
  items: Array.isArray(row.items) ? row.items : [],
  subtotal: Number(row.subtotal || 0),
  discountTotal: Number(row.discount_total || 0),
  deliveryFee: Number(row.delivery_fee || 0),
  appliedCoupon: row.applied_coupon || null,
  total: Number(row.total || 0),
  createdAt: row.created_at,
  statusHistory: Array.isArray(row.status_history) ? row.status_history : [],
  events: Array.isArray(row.events) ? row.events : [],
})

const mapRowToCatalogPlan = (row: CatalogPlanRow): CatalogPlan => ({
  id: row.id,
  catalogId: row.catalog_id,
  planType: row.plan_type,
  status: row.status,
  activatedAt: row.activated_at,
  expiresAt: row.expires_at ?? null,
  paymentReference: row.payment_reference || '',
  notes: row.notes || '',
})

const mapCatalogPlanToRow = (catalogId: string, plan: CatalogPlan) => ({
  id: plan.id,
  catalog_id: catalogId,
  plan_type: plan.planType,
  status: plan.status,
  activated_at: plan.activatedAt,
  expires_at: plan.expiresAt,
  payment_reference: plan.paymentReference || null,
  notes: plan.notes || null,
})

const mapRowToPlanHistoryEntry = (row: CatalogPlanHistoryRow): CatalogPlanHistoryEntry => ({
  id: row.id,
  catalogId: row.catalog_id,
  previousPlan: row.previous_plan ?? null,
  newPlan: row.new_plan,
  changedBy: row.changed_by || null,
  reason: row.reason || '',
  createdAt: row.created_at,
})

const mapOrderToRow = (catalogId: string, order: CatalogOrder) => ({
  id: order.id,
  catalog_id: catalogId,
  channel: order.channel,
  status: order.status,
  customer_name: order.customerName || '',
  customer_address: order.customerAddress || '',
  payment_method: order.paymentMethod || '',
  delivery_mode: order.deliveryMode,
  delivery_zone_id: order.deliveryZoneId || null,
  delivery_zone_name: order.deliveryZoneName || null,
  notes: order.notes || '',
  internal_notes: order.internalNotes || '',
  assigned_to_uid: order.assignedToUid || null,
  assigned_to_name: order.assignedToName || null,
  items: order.items || [],
  subtotal: order.subtotal,
  discount_total: order.discountTotal,
  delivery_fee: order.deliveryFee,
  applied_coupon: order.appliedCoupon || null,
  total: order.total,
  created_at: order.createdAt || new Date().toISOString(),
})

const mapRowToCoupon = (row: CouponRow): CatalogCoupon => ({
  id: row.id,
  name: row.name,
  code: row.code,
  discountType: row.discount_type,
  discountValue: Number(row.discount_value || 0),
  minimumOrder: Number(row.minimum_order || 0),
  usageLimit: row.usage_limit ?? null,
  usedCount: Number(row.used_count || 0),
  startsAt: row.starts_at ?? null,
  expiresAt: row.expires_at ?? null,
  visiblePublicly: row.visible_publicly === true,
  active: row.is_active === true,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
})

const mapCouponToRow = (catalogId: string, coupon: CatalogCoupon) => ({
  id: coupon.id,
  catalog_id: catalogId,
  name: coupon.name,
  code: coupon.code,
  discount_type: coupon.discountType,
  discount_value: coupon.discountValue,
  minimum_order: coupon.minimumOrder,
  usage_limit: coupon.usageLimit,
  used_count: coupon.usedCount || 0,
  starts_at: coupon.startsAt || null,
  expires_at: coupon.expiresAt || null,
  visible_publicly: coupon.visiblePublicly,
  is_active: coupon.active,
  created_at: coupon.createdAt || new Date().toISOString(),
  updated_at: coupon.updatedAt || new Date().toISOString(),
})

const mapRowToUserProfile = (row: UserProfileRow): UserProfile => ({
  uid: row.uid,
  email: row.email || '',
  displayName: row.display_name || 'Owner',
  defaultCatalogId: row.default_catalog_id || null,
  systemRole: row.system_role === 'owner' ? 'owner' : 'merchant',
  createdAt: row.created_at || new Date().toISOString(),
})

const mapCatalogHeader = (row: CatalogHeaderRow): CatalogHeaderSnapshot => ({
  id: row.id,
  slug: row.slug,
  ownerUid: row.owner_uid,
  status: row.status,
  planTier: row.plan_tier,
  isBanned: row.is_banned === true,
  createdAt: row.created_at,
  ratingAverage: Number(row.rating_average || 0),
  ratingApprovedCount: Number(row.rating_approved_count || 0),
  theme: {
    ...defaultTheme(),
    ...(row.theme || {}),
  },
  settings: {
    ...defaultSettings(row.settings?.businessName || 'Nueva Tienda', row.slug),
    ...(row.settings || {}),
  },
})

const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map(item => typeof item === 'string' ? item.trim() : '')
    .filter(Boolean)
}

const mapRowToMarketplaceStore = (row: MarketplaceStoreRow): MarketplaceStoreCard => ({
  id: row.id,
  slug: row.slug,
  businessName: row.business_name || 'Tienda',
  businessTypes: asStringArray(row.business_types),
  tagline: row.tagline || '',
  city: row.city || '',
  stateCode: row.state_code || '',
  logoUrl: row.logo_url || '',
  coverImage: row.cover_image || '',
  ratingAverage: Number(row.rating_average || 0),
  ratingApprovedCount: Number(row.rating_approved_count || 0),
  recentVisits: Number(row.recent_visits || 0),
  activeProducts: Number(row.active_products || 0),
  score: Number(row.score || 0),
})

const mapRowToMarketplaceProduct = (row: MarketplaceProductRow): MarketplaceProductCard => ({
  catalogId: row.catalog_id,
  catalogSlug: row.catalog_slug || '',
  productId: row.product_id || '',
  productName: row.product_name || '',
  description: row.description || '',
  imageUrl: row.image_url || '',
  price: Number(row.price || 0),
  promoPrice: row.promo_price === null || row.promo_price === undefined ? null : Number(row.promo_price),
  orderCount: Number(row.order_count || 0),
  rating: Number(row.rating || 0),
  tags: asStringArray(row.tags),
  businessName: row.business_name || 'Tienda',
  businessType: row.business_type || '',
  logoUrl: row.logo_url || '',
  city: row.city || '',
  score: Number(row.score || 0),
})

const mapRowToMarketplaceHub = (row: MarketplaceHubRow): MarketplaceHub => ({
  regionKey: row.region_key || '',
  regionLabel: row.region_label || '',
  city: row.city || '',
  stateCode: row.state_code || '',
  countryCode: row.country_code || '',
  storeCount: Number(row.store_count || 0),
  activeProducts: Number(row.active_products || 0),
  recentVisits: Number(row.recent_visits || 0),
  sampleImageUrl: row.sample_image_url || '',
  sampleStoreSlug: row.sample_store_slug || '',
})

const mapRowToMarketplaceFeedEntry = (row: MarketplaceFeedEntryRow): MarketplaceFeedEntry => ({
  catalogId: row.catalog_id,
  slug: row.slug || '',
  productId: row.product_id || '',
  businessName: row.business_name || 'Tienda',
  businessTypes: asStringArray(row.business_types),
  tagline: row.tagline || '',
  city: row.city || '',
  stateCode: row.state_code || '',
  logoUrl: row.logo_url || '',
  coverImage: row.cover_image || '',
  productName: row.product_name || '',
  productDescription: row.product_description || '',
  productImageUrl: row.product_image_url || '',
  price: Number(row.price || 0),
  promoPrice: row.promo_price === null || row.promo_price === undefined ? null : Number(row.promo_price),
  ratingAverage: Number(row.rating_average || 0),
  productRating: Number(row.product_rating || 0),
  recentVisits: Number(row.recent_visits || 0),
  orderCount: Number(row.order_count || 0),
  relevanceScore: Number(row.relevance_score || 0),
  matchedTags: asStringArray(row.matched_tags),
})

const mapRowToCatalogRecord = (
  row: CatalogHeaderRow,
  categories: CatalogCategory[],
  products: CatalogProduct[],
  reviews: CatalogReview[],
  orders: CatalogOrder[],
): CatalogRecord => ({
  ...mapCatalogHeader(row),
  categories,
  products,
  reviews,
  orders,
})

const mapCatalogCategoryToItem = (category: CatalogCategory): CategoryItem => ({
  id: category.id,
  name: category.name,
  description: category.note || '',
  sortOrder: category.order,
})

const mapCatalogProductToItem = (product: CatalogProduct): ProductItem => ({
  id: product.id,
  categoryId: product.categoryId,
  name: product.name,
  description: product.description,
  basePrice: product.price,
  imageUrl: product.image || null,
  imageUrls: product.images?.length
    ? [...product.images.slice(0, 3), ...Array.from({ length: Math.max(0, 3 - product.images.length) }, () => null)]
    : [null, null, null],
  isActive: product.active,
  variants: (product.variants || []).map((group, groupIndex) => ({
    id: group.id || `${product.id}-group-${groupIndex}`,
    groupName: group.groupName,
    type: group.type,
    required: Boolean(group.required),
    sortOrder: groupIndex,
    options: (group.options || []).map((option, optionIndex) => ({
      id: option.id || `${product.id}-group-${groupIndex}-option-${optionIndex}`,
      groupId: group.id || `${product.id}-group-${groupIndex}`,
      name: option.name,
      priceDelta: option.priceDelta,
      isRequired: option.isRequired ?? Boolean(group.required),
      sortOrder: optionIndex,
    })),
  })),
  hasPromo: product.salePrice !== null && product.salePrice !== undefined,
  promoPrice: product.salePrice,
  sortOrder: product.order,
  offerLabel: product.offerLabel || '',
  offerLabelPosition: product.offerPosition || 'image',
  timerHours: product.timerHours ?? null,
  timerPosition: product.timerPosition || 'image-right',
  timerShowMinutes: product.timerShowMinutes ?? true,
  timerShowSeconds: product.timerShowSeconds ?? false,
  timerLinkSale: product.timerLinkSale ?? false,
  carouselEnabled: product.carouselEnabled ?? false,
  carouselIntervalSeconds: product.carouselIntervalSeconds ?? 3,
  tags: product.tags || [],
  productRating: Number(product.productRating || 0),
  productRatingCount: Number(product.productRatingCount || 0),
  freeShip: product.freeShip ?? false,
  inventoryItems: (product.inventoryItems || []).map((item) => {
    const quantity = Number(item.quantity || 0)
    const reserved = Number(item.reserved || 0)
    const available = quantity - reserved
    return {
      ...item,
      quantity,
      reserved,
      available,
      status: item.trackStock !== true
        ? 'untracked'
        : available <= 0
          ? 'out'
          : available <= Number(item.lowStockThreshold || 0)
            ? 'low'
            : 'ok',
    }
  }),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
})

export const useSupabaseBackend = () => {
  const { $supabase: supabaseRaw } = useNuxtApp()
  const $supabase = supabaseRaw as BackendSupabaseClient

  const ensureSuccess: EnsureSuccess = (error, fallbackMessage) => {
    if (error) {
      throw new Error(error.message || fallbackMessage)
    }
  }

  const mapAccessRowToProfile = (row: CatalogAccessRow): CatalogAccessProfile => {
    const catalogId = String(row?.catalogId || row?.catalog_id || '')
    const isOwner = row?.isOwner === true || row?.is_owner === true

    if (isOwner) {
      return createOwnerAccessProfile(catalogId)
    }

    return {
      catalogId,
      isOwner: false,
      role: row?.role || null,
      permissions: normalizeTeamPermissions(row?.permissions || {}),
    }
  }

  const catalogBackend = createSupabaseCatalogBackend({
    supabase: $supabase,
    ensureSuccess,
    clone,
    catalogSelect: CATALOG_SELECT,
    categorySelect: CATEGORY_SELECT,
    productSelect: PRODUCT_SELECT,
    reviewSelect: REVIEW_SELECT,
    orderSelect: ORDER_SELECT,
    userProfileSelect: USER_PROFILE_SELECT,
    defaultLivePageSize: DEFAULT_LIVE_PAGE_SIZE,
    createCatalogRecord,
    defaultSettings,
    defaultTheme,
    mapRowToCategory,
    mapCategoryToRow,
    mapRowToProduct,
    mapProductToRow,
    mapRowToReview,
    mapReviewToRow,
    mapRowToOrder,
    mapRowToCatalogPlan,
    mapCatalogPlanToRow,
    mapRowToPlanHistoryEntry,
    mapRowToCatalogRecord,
    mapRowToUserProfile,
    mapCatalogHeader,
    mapCatalogCategoryToItem,
    mapCatalogProductToItem,
    mapRowToCoupon,
    mapRowToMarketplaceStore,
    mapRowToMarketplaceProduct,
    mapRowToMarketplaceHub,
    mapRowToMarketplaceFeedEntry,
  })

  const authBackend = createSupabaseAuthBackend({
    supabase: $supabase,
    ensureSuccess,
    ensureUserProfile: catalogBackend.ensureUserProfile,
    catalogSelect: CATALOG_SELECT,
    mapRowToCatalogRecord,
    mapAccessRowToProfile,
  })

  const commerceBackend = createSupabaseCommerceBackend({
    supabase: $supabase,
    ensureSuccess,
    orderSelect: ORDER_SELECT,
    reviewSelect: REVIEW_SELECT,
    couponSelect: COUPON_SELECT,
    defaultLivePageSize: DEFAULT_LIVE_PAGE_SIZE,
    mapRowToOrder,
    mapOrderToRow,
    mapRowToReview,
    mapReviewToRow,
    recalculateReviewStats: catalogBackend.recalculateReviewStats,
  })

  const analyticsBackend = createSupabaseAnalyticsBackend({
    supabase: $supabase,
    ensureSuccess,
  })

  const operationsBackend = createSupabaseOperationsBackend({
    supabase: $supabase,
    ensureSuccess,
    couponSelect: COUPON_SELECT,
    catalogSelect: CATALOG_SELECT,
    mapRowToCoupon,
    mapCouponToRow,
    mapRowToCatalogRecord,
  })

  const notificationsBackend = createSupabaseNotificationsBackend({
    supabase: $supabase,
    ensureSuccess,
  })

  return {
    ...authBackend,
    ...catalogBackend,
    ...commerceBackend,
    ...analyticsBackend,
    ...operationsBackend,
    ...notificationsBackend,
  }
}
