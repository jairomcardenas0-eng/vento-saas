import type {
  AuthChangeEvent,
  RealtimePostgresChangesPayload,
  Session,
  SupabaseClient,
  User,
} from '@supabase/supabase-js'
import type {
  CatalogAccessProfile,
  CatalogCategory,
  CatalogCoupon,
  CatalogOperationalSettings,
  CatalogOrder,
  CatalogOrderEvent,
  CatalogOrderStatusHistory,
  CatalogPlan,
  CatalogPlanHistoryEntry,
  CatalogProduct,
  CatalogRecord,
  CatalogReview,
  CatalogVariantGroup,
  InventoryItem,
  CatalogThemeSettings,
  TeamMemberPermissions,
  TeamMemberRole,
  TeamMemberStatus,
  UserProfile,
} from '~/types/catalog'
import type { CatalogAnalyticsDayPoint } from '~/types/analytics'

export interface MasterCatalogSnapshot {
  id: string
  slug: string
  ownerUid: string
  ownerName: string
  ownerEmail: string
  businessName: string
  planTier: CatalogRecord['planTier']
  isBanned: boolean
  status: CatalogRecord['status']
  totalOrders: number
  totalReviews: number
  totalProducts: number
  planStatus?: CatalogPlan['status']
  planExpiresAt?: string | null
  createdAt: string
}

export interface MasterDashboardSnapshot {
  totalCatalogs: number
  ecosystemInteractions: number
  businesses: MasterCatalogSnapshot[]
}

export interface OrdersStatsSnapshot {
  total: number
  new: number
  preparing: number
  completed: number
  cancelled: number
  monthSales: number
}

export interface ReviewsStatsSnapshot {
  pending: number
  approved: number
  averageApprovedRating: number
  positivityPercent: number
}

export interface TeamMemberPayload {
  id?: string
  catalogId: string
  email: string
  name: string
  role: 'admin' | 'editor' | 'viewer'
  status: 'active' | 'pending' | 'suspended'
  permissions: Record<string, boolean>
  invitedBy?: string | null
}

export interface AdminBootstrapPayload {
  catalogs: CatalogRecord[]
  accessByCatalogId: Record<string, CatalogAccessProfile>
  activeCatalogId: string | null
}

export type BackendSupabaseClient = SupabaseClient
export type BackendAuthUser = User
export type BackendSession = Session | null
export type BackendAuthChangeEvent = AuthChangeEvent
export type BackendRealtimePayload<T extends Record<string, unknown>> = RealtimePostgresChangesPayload<T>
export type BackendErrorLike = { message?: string | null } | null | undefined
export type EnsureSuccess = (error: BackendErrorLike, fallbackMessage: string) => void
export type JsonRecord = Record<string, unknown>
export type CatalogHeaderSnapshot = Omit<CatalogRecord, 'categories' | 'products' | 'reviews' | 'orders'>

export interface CategoryRow extends JsonRecord {
  catalog_id?: string
  id: string
  name: string
  description?: string | null
  sort_order?: number | null
  is_active?: boolean | null
}

export interface ProductPromoTagRow extends JsonRecord {
  label?: string | null
  position?: CatalogProduct['offerPosition'] | null
}

export interface ProductTimerRow extends JsonRecord {
  hours?: number | null
  position?: CatalogProduct['timerPosition'] | null
  showMinutes?: boolean | null
  showSeconds?: boolean | null
  linkSale?: boolean | null
  carouselEnabled?: boolean | null
  carouselIntervalSeconds?: number | null
}

export interface ProductRow extends JsonRecord {
  catalog_id?: string
  id: string
  category_id?: string | null
  name: string
  description?: string | null
  base_price?: number | string | null
  promo_price?: number | string | null
  has_promo?: boolean | null
  image_url?: string | null
  image_urls?: string[] | null
  sort_order?: number | null
  is_active?: boolean | null
  promo_tag?: ProductPromoTagRow | null
  timer?: ProductTimerRow | null
  tags?: string[] | null
  variants?: CatalogProduct['variants'] | null
  variant_groups?: CatalogVariantGroup[] | null
  inventory_items?: InventoryItem[] | null
  product_rating?: number | null
  product_rating_count?: number | null
  reviews_approved_count?: number | null
  free_ship?: boolean | null
}

export interface ReviewRow extends JsonRecord {
  catalog_id?: string
  id: string
  product_id?: string | null
  product_name?: string | null
  customer_name?: string | null
  comment?: string | null
  rating?: number | string | null
  approved?: boolean | null
  admin_reply?: CatalogReview['adminReply'] | null
  created_at: string
}

export interface OrderRow extends JsonRecord {
  catalog_id: string
  id: string
  channel?: CatalogOrder['channel'] | null
  status: CatalogOrder['status']
  customer_name?: string | null
  customer_address?: string | null
  payment_method?: string | null
  delivery_mode: CatalogOrder['deliveryMode']
  delivery_zone_id?: string | null
  delivery_zone_name?: string | null
  notes?: string | null
  internal_notes?: string | null
  assigned_to_uid?: string | null
  assigned_to_name?: string | null
  items?: CatalogOrder['items'] | null
  subtotal?: number | string | null
  discount_total?: number | string | null
  delivery_fee?: number | string | null
  applied_coupon?: CatalogOrder['appliedCoupon'] | null
  total?: number | string | null
  status_history?: CatalogOrderStatusHistory[] | null
  events?: CatalogOrderEvent[] | null
  created_at: string
}

export interface CatalogPlanRow extends JsonRecord {
  id: string
  catalog_id: string
  plan_type: CatalogPlan['planType']
  status: CatalogPlan['status']
  activated_at: string
  expires_at?: string | null
  payment_reference?: string | null
  notes?: string | null
}

export interface CatalogPlanHistoryRow extends JsonRecord {
  id: string
  catalog_id: string
  previous_plan?: CatalogPlanHistoryEntry['previousPlan'] | null
  new_plan: CatalogPlanHistoryEntry['newPlan']
  changed_by?: string | null
  reason?: string | null
  created_at: string
}

export interface CouponRow extends JsonRecord {
  catalog_id?: string
  id: string
  name: string
  code: string
  discount_type: CatalogCoupon['discountType']
  discount_value?: number | string | null
  minimum_order?: number | string | null
  usage_limit?: number | null
  used_count?: number | null
  starts_at?: string | null
  expires_at?: string | null
  visible_publicly?: boolean | null
  is_active?: boolean | null
  created_at: string
  updated_at: string
}

export interface UserProfileRow extends JsonRecord {
  uid: string
  email?: string | null
  display_name?: string | null
  default_catalog_id?: string | null
  system_role?: UserProfile['systemRole'] | string | null
  referral_code?: string | null
  referred_by?: string | null
  created_at?: string | null
}

export interface CatalogSettingsRow extends JsonRecord, Partial<CatalogOperationalSettings> {
  businessName?: string
}

export interface CatalogHeaderRow extends JsonRecord {
  id: string
  slug: string
  owner_uid: string
  status: CatalogRecord['status']
  plan_tier: CatalogRecord['planTier']
  is_banned?: boolean | null
  created_at: string
  rating_average?: number | string | null
  rating_approved_count?: number | null
  theme?: Partial<CatalogThemeSettings> | null
  settings?: CatalogSettingsRow | null
}

export interface MarketplaceStoreRow extends JsonRecord {
  id: string
  slug: string
  business_name?: string | null
  business_types?: string[] | null
  tagline?: string | null
  city?: string | null
  state_code?: string | null
  logo_url?: string | null
  cover_image?: string | null
  rating_average?: number | string | null
  rating_approved_count?: number | null
  recent_visits?: number | null
  active_products?: number | null
  score?: number | string | null
}

export interface MarketplaceProductRow extends JsonRecord {
  catalog_id: string
  catalog_slug?: string | null
  product_id?: string | null
  product_name?: string | null
  description?: string | null
  image_url?: string | null
  price?: number | string | null
  promo_price?: number | string | null
  order_count?: number | null
  rating?: number | string | null
  tags?: string[] | null
  business_name?: string | null
  business_type?: string | null
  logo_url?: string | null
  city?: string | null
  score?: number | string | null
}

export interface MarketplaceHubRow extends JsonRecord {
  region_key?: string | null
  region_label?: string | null
  city?: string | null
  state_code?: string | null
  country_code?: string | null
  store_count?: number | null
  active_products?: number | null
  recent_visits?: number | null
  sample_image_url?: string | null
  sample_store_slug?: string | null
}

export interface MarketplaceFeedEntryRow extends JsonRecord {
  catalog_id: string
  slug?: string | null
  product_id?: string | null
  business_name?: string | null
  business_types?: string[] | null
  tagline?: string | null
  city?: string | null
  state_code?: string | null
  logo_url?: string | null
  cover_image?: string | null
  product_name?: string | null
  product_description?: string | null
  product_image_url?: string | null
  price?: number | string | null
  promo_price?: number | string | null
  rating_average?: number | string | null
  product_rating?: number | string | null
  recent_visits?: number | null
  order_count?: number | null
  relevance_score?: number | string | null
  matched_tags?: string[] | null
}

export interface CatalogAccessRow extends JsonRecord {
  catalogId?: string
  isOwner?: boolean | null
  role?: TeamMemberRole | null
  permissions?: Partial<TeamMemberPermissions> | null
}

export interface TeamMemberRow extends JsonRecord {
  id: string
  catalog_id: string
  email: string
  name: string
  role: TeamMemberRole
  permissions?: Partial<TeamMemberPermissions> | null
  status: TeamMemberStatus
  invited_by?: string | null
  created_at: string
  updated_at: string
}

export interface ReferralJoinedProfileRow extends JsonRecord {
  display_name?: string | null
  email?: string | null
}

export interface ReferralRow extends JsonRecord {
  referred_uid: string
  status: string
  created_at: string
  user_profiles?: ReferralJoinedProfileRow[] | null
}

export interface OrdersStatsRow extends JsonRecord {
  total_count?: number | null
  new_count?: number | null
  preparing_count?: number | null
  completed_count?: number | null
  cancelled_count?: number | null
  month_sales?: number | string | null
}

export interface ReviewsStatsRow extends JsonRecord {
  pending_count?: number | null
  approved_count?: number | null
  average_rating?: number | string | null
}

export interface AnalyticsTotalsRow extends JsonRecord {
  pageViews?: number | null
  activeUsers?: number | null
  newUsers?: number | null
  productClicks?: number | null
}

export interface AnalyticsSnapshotRow extends JsonRecord {
  rangeDays?: number | null
  totals?: AnalyticsTotalsRow | null
  daily?: Array<Partial<CatalogAnalyticsDayPoint>> | null
}
