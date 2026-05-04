import type {
  MarketplaceFeedEntry,
  MarketplaceHub,
  MarketplaceLandingPayload,
  MarketplaceProductCard,
  MarketplaceStoreCard,
} from '~/types/catalog'

type MarketplaceRow = Record<string, unknown>

const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map(item => typeof item === 'string' ? item.trim() : '')
    .filter(Boolean)
}

export const mapMarketplaceStore = (row: MarketplaceRow): MarketplaceStoreCard => ({
  id: String(row.id || ''),
  slug: String(row.slug || ''),
  businessName: String(row.business_name || 'Tienda'),
  businessTypes: asStringArray(row.business_types),
  tagline: String(row.tagline || ''),
  city: String(row.city || ''),
  stateCode: String(row.state_code || ''),
  logoUrl: String(row.logo_url || ''),
  coverImage: String(row.cover_image || ''),
  ratingAverage: Number(row.rating_average) || 0,
  ratingApprovedCount: Number(row.rating_approved_count) || 0,
  recentVisits: Number(row.recent_visits) || 0,
  activeProducts: Number(row.active_products) || 0,
  score: Number(row.score) || 0,
})

export const mapMarketplaceProduct = (row: MarketplaceRow): MarketplaceProductCard => ({
  catalogId: String(row.catalog_id || ''),
  catalogSlug: String(row.catalog_slug || row.slug || ''),
  productId: String(row.product_id || ''),
  productName: String(row.product_name || ''),
  description: String(row.description || row.product_description || ''),
  imageUrl: String(row.image_url || row.product_image_url || ''),
  price: Number(row.price) || 0,
  promoPrice: row.promo_price === null || row.promo_price === undefined ? null : Number(row.promo_price) || null,
  orderCount: Number(row.order_count) || 0,
  rating: Number(row.rating ?? row.product_rating) || 0,
  tags: asStringArray(row.tags || row.matched_tags),
  businessName: String(row.business_name || 'Tienda'),
  businessType: String(row.business_type || asStringArray(row.business_types)[0] || ''),
  logoUrl: String(row.logo_url || ''),
  city: String(row.city || ''),
  score: Number(row.score ?? row.relevance_score) || 0,
})

export const mapMarketplaceHub = (row: MarketplaceRow): MarketplaceHub => ({
  regionKey: String(row.region_key || ''),
  regionLabel: String(row.region_label || ''),
  city: String(row.city || ''),
  stateCode: String(row.state_code || ''),
  countryCode: String(row.country_code || ''),
  storeCount: Number(row.store_count) || 0,
  activeProducts: Number(row.active_products) || 0,
  recentVisits: Number(row.recent_visits) || 0,
  sampleImageUrl: String(row.sample_image_url || ''),
  sampleStoreSlug: String(row.sample_store_slug || ''),
})

export const mapMarketplaceFeedEntry = (row: MarketplaceRow): MarketplaceFeedEntry => ({
  catalogId: String(row.catalog_id || ''),
  slug: String(row.slug || ''),
  productId: String(row.product_id || ''),
  businessName: String(row.business_name || 'Tienda'),
  businessTypes: asStringArray(row.business_types),
  tagline: String(row.tagline || ''),
  city: String(row.city || ''),
  stateCode: String(row.state_code || ''),
  logoUrl: String(row.logo_url || ''),
  coverImage: String(row.cover_image || ''),
  productName: String(row.product_name || ''),
  productDescription: String(row.product_description || ''),
  productImageUrl: String(row.product_image_url || ''),
  price: Number(row.price) || 0,
  promoPrice: row.promo_price === null || row.promo_price === undefined ? null : Number(row.promo_price) || null,
  ratingAverage: Number(row.rating_average) || 0,
  productRating: Number(row.product_rating) || 0,
  recentVisits: Number(row.recent_visits) || 0,
  orderCount: Number(row.order_count) || 0,
  relevanceScore: Number(row.relevance_score ?? row.score) || 0,
  matchedTags: asStringArray(row.matched_tags),
})

export const emptyMarketplaceLanding = (): MarketplaceLandingPayload => ({
  topStores: [],
  viralProducts: [],
  hubs: [],
  forYou: [],
})

export const mapMarketplaceLandingPayload = (row: Record<string, unknown> | null | undefined): MarketplaceLandingPayload => {
  const payload = emptyMarketplaceLanding()

  if (!row || typeof row !== 'object') {
    return payload
  }

  payload.topStores = Array.isArray(row.topStores)
    ? row.topStores.map(mapMarketplaceStore)
    : []

  payload.viralProducts = Array.isArray(row.viralProducts)
    ? row.viralProducts.map(mapMarketplaceProduct)
    : []

  payload.hubs = Array.isArray(row.hubs)
    ? row.hubs.map(mapMarketplaceHub)
    : []

  payload.forYou = Array.isArray(row.forYou)
    ? row.forYou.map(mapMarketplaceFeedEntry)
    : []

  return payload
}
