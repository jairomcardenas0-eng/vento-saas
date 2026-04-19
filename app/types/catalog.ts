export type CatalogStatus = 'draft' | 'published'
export type OrderStatus = 'new' | 'preparing' | 'completed' | 'cancelled' | 'viewed' | 'closed'
export type DeliveryMode = 'delivery' | 'pickup'
export type SystemRole = 'owner' | 'merchant'
export type PlanTier = 'free' | 'pro' | 'gold'
export type DeliveryFeeType = 'flat' | 'zones'
export type DiscountType = 'percentage' | 'fixed'

export interface UserProfile {
  uid: string
  email: string
  displayName: string
  defaultCatalogId: string | null
  systemRole: SystemRole
  createdAt: string
  referralCode?: string
}

export type TeamMemberRole = 'admin' | 'editor' | 'viewer'
export type TeamMemberStatus = 'active' | 'pending' | 'suspended'

export interface TeamMemberPermissions {
  viewOrders: boolean
  manageOrders: boolean
  viewProducts: boolean
  manageProducts: boolean
  viewReviews: boolean
  manageReviews: boolean
  viewCoupons: boolean
  manageCoupons: boolean
  viewStats: boolean
  viewSettings: boolean
}

export interface CatalogTeamMember {
  id: string
  catalogId: string
  email: string
  name: string
  role: TeamMemberRole
  permissions: TeamMemberPermissions
  status: TeamMemberStatus
  invitedBy: string | null
  createdAt: string
  updatedAt: string
}

export interface CatalogThemeSettings {
  primary: string
  bg: string
  bgType: 'color' | 'image'
  bgImage: string
  headerBg: string
  headerText: string
  cardBg: string
  cardStyle: 'flat' | 'shadow' | 'glass-premium' | 'holographic'
  priceColor: string
  descColor: string
  productTitleColor: string
  catNoteColor: string
  offerBadgeBg: string
  offerBadgeText: string
  timerBadgeBg: string
  timerBadgeText: string
  priceOldColor: string
  tagBg: string
  tagText: string
  searchInputBg: string
  searchInputBorder: string
  qtyBg: string
  qtyMinusBg: string
  detailBg: string
  detailNameColor: string
  detailDescColor: string
  detailPriceColor: string
  btnCartBg: string
  btnCartText: string
  btnWaBg: string
  btnWaText: string
  bannerText: string
  bannerMode: 'static' | 'loop'
  bannerSticky: boolean
  bannerBg: string
  bannerTextColor: string
}

export interface CatalogOperationalSettings {
  businessName: string
  businessType: string[]
  tagline: string
  logoUrl: string
  coverImage: string
  storefrontLayout: 'classic' | 'list' | 'saas'
  timezone: string
  address: {
    countryCode: string
    stateCode: string
    city: string
    details: string
    lat: number
    lng: number
  }
  instagram: string
  facebook: string
  website: string
  ogTitle: string
  ogDescription: string
  ogImageUrl: string
  phone: string
  whatsapp: string
  currency: string
  scheduleMode: 'always' | 'weekly'
  weeklySchedule: BusinessDaySchedule[]
  cartEnabled: boolean
  whatsappEnabled: boolean
  productCarouselEnabled: boolean
  productCarouselSeconds: number
  checkoutNameReq: 'obligatorio' | 'opcional'
  checkoutAddressReq: 'obligatorio' | 'opcional'
  checkoutPaymentReq: 'obligatorio' | 'opcional'
  deliveryEnabled: boolean
  deliveryPaused: boolean
  deliveryFeeType: DeliveryFeeType
  deliveryFlatFee: number
  deliveryMinimumOrder: number
  deliveryZones: DeliveryZone[]
  riderInstructions: string
  pickupEnabled: boolean
  pickupPoint: string
  pickupInstructions: string
  pickupEtaMinutes: number
  closed: boolean
  closedMessage: string
  closedTextSizeLarge: number
  closedTextSizeSmall: number
  closedTextColor: string
  closedBgType: 'color' | 'image'
  closedBgColor: string
  closedBgImage: string
  closedTextBox: boolean
  closedTextBoxColor: string
  closedTextBoxOpacity: number
  closedShowMenuBtn: boolean
  closedMenuBtnBg: string
  closedMenuBtnText: string
  closedShowWhatsapp: boolean
  closedShowCall: boolean
  reviewsEnabled: boolean
  reviewModeration: boolean
  adminReplyName: string
  qrDotColor: string
  qrBgColor: string
  qrDotType: 'square' | 'rounded' | 'dots' | 'classy' | 'extra-rounded'
  qrCornerType: 'square' | 'extra-rounded' | 'dot'
  qrLogoUrl: string
}

export interface BusinessScheduleRange {
  start: string
  end: string
}

export interface BusinessDaySchedule {
  dayKey: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday'
  label: string
  enabled: boolean
  ranges: BusinessScheduleRange[]
}

export interface DeliveryZone {
  id: string
  name: string
  price: number
  minOrder: number
  estimatedMinutes: number
}

export interface CatalogCategory {
  id: string
  name: string
  note: string
  order: number
  active: boolean
}

export interface ProductVariantOption {
  id: string
  name: string
  priceDelta: number
  isRequired: boolean
}

export interface ProductVariantGroup {
  id: string
  groupName: string
  type: 'single' | 'multiple'
  required?: boolean
  options: ProductVariantOption[]
}

export interface CatalogProduct {
  id: string
  categoryId: string
  name: string
  description: string
  price: number
  salePrice: number | null
  order: number
  image: string
  images: string[]
  active: boolean
  offerLabel: string
  offerPosition: 'image' | 'price'
  timerHours: number | null
  timerPosition: 'image-right' | 'price-below'
  timerShowMinutes: boolean
  timerShowSeconds: boolean
  timerLinkSale: boolean
  tags: string[]
  variants: ProductVariantGroup[]
  reviewsApprovedCount: number
  productRating: number
  productRatingCount: number
}

export interface CatalogReview {
  id: string
  productId: string
  productName: string
  name: string
  comment: string
  rating: number
  approved: boolean
  adminReply?: {
    name: string
    text: string
  }
  createdAt: string
}

export interface CatalogOrderItem {
  productId: string
  productName: string
  qty: number
  unitPrice: number
  totalPrice: number
  variantSummary: string[]
}

export interface CatalogOrder {
  id: string
  catalogId: string
  channel: 'whatsapp'
  status: OrderStatus
  customerName: string
  customerAddress: string
  paymentMethod: string
  deliveryMode: DeliveryMode
  deliveryZoneId?: string
  deliveryZoneName?: string
  notes: string
  items: CatalogOrderItem[]
  subtotal: number
  discountTotal: number
  deliveryFee: number
  appliedCoupon?: {
    id: string
    code: string
    type: DiscountType
    value: number
  } | null
  total: number
  createdAt: string
}

export interface CatalogCoupon {
  id: string
  name: string
  code: string
  discountType: DiscountType
  discountValue: number
  minimumOrder: number
  usageLimit: number | null
  usedCount: number
  startsAt: string | null
  expiresAt: string | null
  visiblePublicly: boolean
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface CatalogRecord {
  id: string
  slug: string
  ownerUid: string
  status: CatalogStatus
  planTier: PlanTier
  isBanned: boolean
  createdAt: string
  ratingAverage?: number
  ratingApprovedCount?: number
  theme: CatalogThemeSettings
  settings: CatalogOperationalSettings
  categories: CatalogCategory[]
  products: CatalogProduct[]
  reviews: CatalogReview[]
  orders: CatalogOrder[]
}

export interface MarketplaceStoreCard {
  id: string
  slug: string
  businessName: string
  businessTypes: string[]
  tagline: string
  city: string
  stateCode: string
  logoUrl: string
  coverImage: string
  ratingAverage: number
  ratingApprovedCount: number
  recentVisits: number
  activeProducts: number
  score: number
}

export interface MarketplaceProductCard {
  catalogId: string
  catalogSlug: string
  productId: string
  productName: string
  description: string
  imageUrl: string
  price: number
  promoPrice: number | null
  orderCount: number
  rating: number
  tags: string[]
  businessName: string
  businessType: string
  logoUrl: string
  city: string
  score: number
}

export interface MarketplaceHub {
  regionKey: string
  regionLabel: string
  city: string
  stateCode: string
  countryCode: string
  storeCount: number
  activeProducts: number
  recentVisits: number
  sampleImageUrl: string
  sampleStoreSlug: string
}

export interface MarketplaceFeedEntry {
  catalogId: string
  slug: string
  productId: string
  businessName: string
  businessTypes: string[]
  tagline: string
  city: string
  stateCode: string
  logoUrl: string
  coverImage: string
  productName: string
  productDescription: string
  productImageUrl: string
  price: number
  promoPrice: number | null
  ratingAverage: number
  productRating: number
  recentVisits: number
  orderCount: number
  relevanceScore: number
  matchedTags: string[]
}

export interface MarketplaceLandingPayload {
  topStores: MarketplaceStoreCard[]
  viralProducts: MarketplaceProductCard[]
  hubs: MarketplaceHub[]
  forYou: MarketplaceFeedEntry[]
}
