export type AnalyticsEventType = 'page_view' | 'product_click'

export interface CatalogAnalyticsDayPoint {
  day: string
  pageViews: number
  activeUsers: number
  newUsers: number
  productClicks: number
}

export interface CatalogAnalyticsOverview {
  rangeDays: number
  totals: {
    pageViews: number
    activeUsers: number
    newUsers: number
    productClicks: number
  }
  daily: CatalogAnalyticsDayPoint[]
}

export interface CatalogAnalyticsTrackPayload {
  catalogId: string
  sessionUuid: string
  eventType: AnalyticsEventType
  productId?: string | null
  path?: string | null
}
