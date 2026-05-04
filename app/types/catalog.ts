export type CatalogStatus = 'draft' | 'published'
export type OrderStatus = 'new' | 'viewed' | 'preparing' | 'ready' | 'delivered' | 'completed' | 'cancelled' | 'closed'
export type DeliveryMode = 'delivery' | 'pickup'
export type SystemRole = 'owner' | 'merchant'
export type PlanTier = 'free' | 'basic' | 'pro' | 'enterprise' | 'gold'
export type DeliveryFeeType = 'flat' | 'zones'
export type DiscountType = 'percentage' | 'fixed'
export type OrderEventType = 'viewed' | 'preparing' | 'ready' | 'delivered' | 'cancelled' | 'payment_received' | 'note_added' | 'assigned'
export type CatalogPlanStatus = 'trial' | 'active' | 'paused' | 'blocked' | 'expired'
export type OrderChannel = 'whatsapp' | 'web' | 'app' | 'phone' | 'pos' | 'other'

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
  viewInventory: boolean
  manageInventory: boolean
  viewReviews: boolean
  manageReviews: boolean
  viewCoupons: boolean
  manageCoupons: boolean
  viewStats: boolean
  viewSettings: boolean
}

export interface CatalogAccessProfile {
  catalogId: string
  isOwner: boolean
  role: TeamMemberRole | null
  permissions: TeamMemberPermissions
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
  bannerEnabled: boolean
  bannerText: string
  bannerMode: 'static' | 'loop'
  bannerSticky: boolean
  bannerBg: string
  bannerTextColor: string
}

export type StorefrontLayout = 'classic' | 'list' | 'saas' | 'store'

export interface CatalogOperationalSettings {
  businessName: string
  businessType: string[]
  tagline: string
  logoUrl: string
  coverImage: string
  storefrontLayout: StorefrontLayout
  /** NOTE: this field is rendered via v-html in storefront UI. Sanitize server-side before storage to prevent XSS. */
  storeTopBarHtml: string
  storeHeaderName: string
  storeShowPremiumBadge: boolean
  storeHeroTag: string
  storeHeroTitle: string
  storeHeroDescription: string
  storeHeroButtonText: string
  storeHeroBackgroundImage: string
  storeFooterText: string
  storeIcon: string
  appIconUrl: string
  storeBgColor: string
  storeCardBgColor: string
  storeCartBgColor: string
  storeTextPrimaryColor: string
  storeTextSecondaryColor: string
  storeCartTextColor: string
  storeToastFrom: string
  storeToastTo: string
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
  callEnabled: boolean
  productCarouselEnabled: boolean
  productCarouselSeconds: 1 | 2 | 3 | 4 | 5
  checkoutNameEnabled: boolean
  checkoutNameReq: 'required' | 'optional'
  checkoutAddressEnabled: boolean
  checkoutAddressReq: 'required' | 'optional'
  checkoutPaymentEnabled: boolean
  checkoutPaymentReq: 'required' | 'optional'
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

export interface CatalogVariantOption {
  id: string
  groupId: string
  name: string
  priceDelta: number
  isRequired: boolean
  sortOrder: number
}

export interface CatalogVariantGroup {
  id: string
  /** TODO: make required once all creation paths populate these FKs. */
  catalogId?: string
  /** TODO: make required once all creation paths populate these FKs. */
  productId?: string
  groupName: string
  selectionType: 'single' | 'multiple'
  required: boolean
  sortOrder: number
  options: CatalogVariantOption[]
}

export interface InventoryItem {
  id: string
  catalogId?: string
  productId: string
  variantOptionId: string | null
  sku: string
  quantity: number
  reserved: number
  lowStockThreshold: number
  trackStock: boolean
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
  carouselEnabled?: boolean
  carouselIntervalSeconds?: 1 | 2 | 3 | 4 | 5
  tags: string[]
  /**
   * @deprecated Legacy JSONB variants snapshot kept for backwards compatibility.
   * TODO: migrate all consumers to variantGroups and remove this field.
   */
  variants: ProductVariantGroup[]
  variantGroups?: CatalogVariantGroup[]
  inventoryItems?: InventoryItem[]
  freeShip: boolean
  reviewsApprovedCount: number
  productRating: number
  productRatingCount: number
}

export interface CatalogReview {
  id: string
  productId: string
  /** Snapshot of product name at time of review. Denormalized for display stability. */
  productName: string
  name: string
  comment: string
  /** Expected range 1–5. Runtime validation required. */
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
  /** Snapshot of product name at time of order. Denormalized for display stability. */
  productName: string
  qty: number
  unitPrice: number
  totalPrice: number
  variantSummary: string[]
  variantOptionIds?: string[]
}

export interface CatalogOrderStatusHistory {
  id: string
  orderId: string
  status: OrderStatus
  previousStatus: OrderStatus | null
  changedBy: string | null
  /** Snapshot of user name at time of event. Denormalized for display stability. */
  changedByName: string
  note: string
  createdAt: string
}

export interface CatalogOrderEvent {
  id: string
  orderId: string
  eventType: OrderEventType
  /** TODO: replace with discriminated union per eventType for type safety. */
  payload: Record<string, unknown> | null
  createdBy: string | null
  createdAt: string
}

export interface CatalogPlan {
  id: string
  catalogId: string
  planType: PlanTier
  status: CatalogPlanStatus
  activatedAt: string
  expiresAt: string | null
  paymentReference: string | null
  notes: string
}

export interface CatalogPlanHistoryEntry {
  id: string
  catalogId: string
  previousPlan: PlanTier | null
  newPlan: PlanTier
  changedBy: string | null
  reason: string
  createdAt: string
}

export interface CatalogOrder {
  id: string
  catalogId: string
  channel: OrderChannel
  status: OrderStatus
  customerName: string
  /** TODO: refactor into structured Address object for validation and geocoding. */
  customerAddress: string
  /** TODO: narrow to union of known payment methods (cash | card | transfer | wallet | other). */
  paymentMethod: string
  deliveryMode: DeliveryMode
  deliveryZoneId?: string
  deliveryZoneName?: string
  notes: string
  internalNotes?: string
  assignedToUid?: string | null
  /** Snapshot of assignee name at time of order. Denormalized for display stability. */
  assignedToName?: string | null
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
  statusHistory?: CatalogOrderStatusHistory[]
  events?: CatalogOrderEvent[]
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
  /** Always equal to slug. Kept separate to allow future migration where id becomes UUID. */
  id: string
  slug: string
  ownerUid: string
  status: CatalogStatus
  planTier: PlanTier
  isBanned: boolean
  createdAt: string
  ratingAverage: number
  ratingApprovedCount: number
  theme: CatalogThemeSettings
  settings: CatalogOperationalSettings
  categories: CatalogCategory[]
  products: CatalogProduct[]
  reviews: CatalogReview[]
  /** TODO: extract orders into separate collection/table. Embedding limits scalability. */
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
  /** NOTE: inconsistent with MarketplaceStoreCard.businessTypes (plural array). Consider aligning. */
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
