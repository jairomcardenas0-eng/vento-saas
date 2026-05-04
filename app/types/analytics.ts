export type AnalyticsEventType =
  | 'page_view'
  | 'product_click'
  | 'add_to_cart'
  | 'remove_from_cart'
  | 'checkout_start'
  | 'checkout_complete'
  | 'purchase'
  | 'search'
  | 'share'
  | 'favorite'
  | 'coupon_apply'
  | 'filter_use'
  | 'category_view'

export interface CatalogAnalyticsDayPoint {
  day: string
  pageViews: number
  activeUsers: number
  newUsers: number
  productClicks: number
  addToCarts: number
  checkouts: number
  purchases: number
  searches: number
}

export interface CatalogAnalyticsOverview {
  rangeDays: number
  totals: {
    pageViews: number
    activeUsers: number
    newUsers: number
    productClicks: number
    addToCarts: number
    checkouts: number
    purchases: number
    searches: number
  }
  daily: CatalogAnalyticsDayPoint[]
}

export interface CatalogAnalyticsTrackPayload {
  catalogId: string
  sessionUuid: string
  eventType: AnalyticsEventType
  /** Unix timestamp in milliseconds. Server-side fallback if omitted. */
  timestamp?: number
  productId?: string | null
  path?: string | null
  /** Client metadata for segmentation */
  deviceType?: 'mobile' | 'tablet' | 'desktop' | 'unknown'
  referrer?: string
  countryCode?: string
  screenSize?: string
}
