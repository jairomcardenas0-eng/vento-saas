import { createCatalogRecord, defaultSettings, defaultTheme } from '~/data/defaults'
import type { CatalogAnalyticsOverview } from '~/types/analytics'
import type {
  CatalogCategory,
  CatalogCoupon,
  MarketplaceFeedEntry,
  MarketplaceHub,
  MarketplaceLandingPayload,
  MarketplaceProductCard,
  MarketplaceStoreCard,
  CatalogOperationalSettings,
  CatalogOrder,
  CatalogProduct,
  CatalogRecord,
  CatalogReview,
  CatalogThemeSettings,
  UserProfile,
} from '~/types/catalog'

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))

const mapRowToCategory = (row: any): CatalogCategory => ({
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

const mapRowToProduct = (row: any): CatalogProduct => ({
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
  tags: Array.isArray(row.tags) ? row.tags : [],
  variants: Array.isArray(row.variants) ? row.variants : [],
  reviewsApprovedCount: Number(row.reviews_approved_count || 0),
  productRating: Number(row.product_rating || 0),
  productRatingCount: Number(row.product_rating_count || 0),
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
  },
  tags: product.tags || [],
  variants: product.variants || [],
  reviews_approved_count: product.reviewsApprovedCount || 0,
  product_rating: product.productRating || 0,
  product_rating_count: product.productRatingCount || 0,
})

const mapRowToReview = (row: any): CatalogReview => ({
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

const mapRowToOrder = (row: any): CatalogOrder => ({
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
  items: Array.isArray(row.items) ? row.items : [],
  subtotal: Number(row.subtotal || 0),
  discountTotal: Number(row.discount_total || 0),
  deliveryFee: Number(row.delivery_fee || 0),
  appliedCoupon: row.applied_coupon || null,
  total: Number(row.total || 0),
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
  items: order.items || [],
  subtotal: order.subtotal,
  discount_total: order.discountTotal,
  delivery_fee: order.deliveryFee,
  applied_coupon: order.appliedCoupon || null,
  total: order.total,
  created_at: order.createdAt || new Date().toISOString(),
})

const mapRowToCoupon = (row: any): CatalogCoupon => ({
  id: row.id,
  name: row.name,
  code: row.code,
  discountType: row.discount_type,
  discountValue: Number(row.discount_value || 0),
  minimumOrder: Number(row.minimum_order || 0),
  usageLimit: row.usage_limit,
  usedCount: Number(row.used_count || 0),
  startsAt: row.starts_at,
  expiresAt: row.expires_at,
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

const mapRowToUserProfile = (row: any): UserProfile => ({
  uid: row.uid,
  email: row.email || '',
  displayName: row.display_name || 'Owner',
  defaultCatalogId: row.default_catalog_id || null,
  systemRole: row.system_role === 'owner' ? 'owner' : 'merchant',
  createdAt: row.created_at || new Date().toISOString(),
})

const mapAnalyticsOverview = (payload: any, rangeDays: number): CatalogAnalyticsOverview => ({
  rangeDays: Number(payload?.rangeDays || rangeDays),
  totals: {
    pageViews: Number(payload?.totals?.pageViews || 0),
    activeUsers: Number(payload?.totals?.activeUsers || 0),
    newUsers: Number(payload?.totals?.newUsers || 0),
    productClicks: Number(payload?.totals?.productClicks || 0),
  },
  daily: Array.isArray(payload?.daily)
    ? payload.daily.map((row: any) => ({
      day: String(row.day || ''),
      pageViews: Number(row.pageViews || 0),
      activeUsers: Number(row.activeUsers || 0),
      newUsers: Number(row.newUsers || 0),
      productClicks: Number(row.productClicks || 0),
    }))
    : [],
})

const mapCatalogHeader = (row: any) => ({
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

const mapRowToMarketplaceStore = (row: any): MarketplaceStoreCard => ({
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

const mapRowToMarketplaceProduct = (row: any): MarketplaceProductCard => ({
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

const mapRowToMarketplaceHub = (row: any): MarketplaceHub => ({
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

const mapRowToMarketplaceFeedEntry = (row: any): MarketplaceFeedEntry => ({
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
  row: any,
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

type RealtimeDocChange<T> = {
  type: 'added' | 'modified' | 'removed'
  doc: {
    id: string
    data: () => T
  }
}

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
  createdAt: string
}

export interface MasterDashboardSnapshot {
  totalCatalogs: number
  ecosystemInteractions: number
  businesses: MasterCatalogSnapshot[]
}

export const useSupabaseBackend = () => {
  const { $supabase } = useNuxtApp()

  const ensureSuccess = (error: any, fallbackMessage: string) => {
    if (error) {
      throw new Error(error.message || fallbackMessage)
    }
  }

  const getCatalogHeaderById = async (catalogId: string) => {
    const { data, error } = await $supabase
      .from('catalogs')
      .select('*')
      .eq('id', catalogId)
      .maybeSingle()

    ensureSuccess(error, 'No se pudo cargar el catálogo')
    return data
  }

  const fetchCatalogRelations = async (catalogId: string) => {
    const [categoriesRes, productsRes, reviewsRes, ordersRes] = await Promise.all([
      $supabase.from('categories').select('*').eq('catalog_id', catalogId).order('sort_order'),
      $supabase.from('products').select('*').eq('catalog_id', catalogId).order('sort_order'),
      $supabase.from('reviews').select('*').eq('catalog_id', catalogId).order('created_at', { ascending: false }),
      $supabase.from('orders').select('*').eq('catalog_id', catalogId).order('created_at', { ascending: false }),
    ])

    ensureSuccess(categoriesRes.error, 'No se pudieron cargar las categorías')
    ensureSuccess(productsRes.error, 'No se pudieron cargar los productos')
    ensureSuccess(reviewsRes.error, 'No se pudieron cargar las reseñas')
    ensureSuccess(ordersRes.error, 'No se pudieron cargar los pedidos')

    return {
      categories: (categoriesRes.data || []).map(mapRowToCategory),
      products: (productsRes.data || []).map(mapRowToProduct),
      reviews: (reviewsRes.data || []).map(mapRowToReview),
      orders: (ordersRes.data || []).map(mapRowToOrder),
    }
  }

  const assembleCatalog = async (row: any): Promise<CatalogRecord> => {
    const relations = await fetchCatalogRelations(row.id)
    return mapRowToCatalogRecord(row, relations.categories, relations.products, relations.reviews, relations.orders)
  }

  const ensureUserProfile = async (authUser: any): Promise<UserProfile> => {
    const { data, error } = await $supabase
      .from('user_profiles')
      .select('*')
      .eq('uid', authUser.id)
      .maybeSingle()

    ensureSuccess(error, 'No se pudo consultar el perfil')

    if (data) {
      return mapRowToUserProfile(data)
    }

    const profile: UserProfile = {
      uid: authUser.id,
      email: authUser.email || '',
      displayName: authUser.user_metadata?.display_name || authUser.email?.split('@')[0] || 'Owner',
      defaultCatalogId: null,
      systemRole: 'merchant',
      createdAt: new Date().toISOString(),
    }

    const { error: insertError } = await $supabase.from('user_profiles').insert({
      uid: profile.uid,
      email: profile.email,
      display_name: profile.displayName,
      default_catalog_id: null,
      system_role: profile.systemRole,
      created_at: profile.createdAt,
    })

    ensureSuccess(insertError, 'No se pudo crear el perfil')
    return profile
  }

  const ensurePaidPlan = async (catalogId: string) => {
    const catalog = await getCatalogHeaderById(catalogId)
    if (!catalog) {
      throw new Error('Catalogo no encontrado')
    }
    // Paywall removed - developer has full access
    return catalog
  }

  const updateCatalogJson = async (
    catalogId: string,
    key: 'settings' | 'theme',
    payload: Record<string, any>,
  ) => {
    const { error } = await $supabase
      .from('catalogs')
      .update({ [key]: clone(payload) })
      .eq('id', catalogId)

    ensureSuccess(error, `No se pudo actualizar ${key}`)
  }

  const recalculateReviewStats = async (catalogId: string) => {
    const [{ data: approvedReviews, error: reviewsError }, { data: products, error: productsError }] = await Promise.all([
      $supabase.from('reviews').select('rating, product_id').eq('catalog_id', catalogId).eq('approved', true),
      $supabase.from('products').select('id').eq('catalog_id', catalogId),
    ])

    ensureSuccess(reviewsError, 'No se pudieron recalcular las reseñas')
    ensureSuccess(productsError, 'No se pudieron recalcular los productos')

    const reviews = approvedReviews || []
    const ratingApprovedCount = reviews.length
    const ratingAverage = ratingApprovedCount
      ? reviews.reduce((acc: number, review: any) => acc + Number(review.rating || 0), 0) / ratingApprovedCount
      : 0

    const { error: catalogError } = await $supabase
      .from('catalogs')
      .update({
        rating_average: Number(ratingAverage.toFixed(2)),
        rating_approved_count: ratingApprovedCount,
      })
      .eq('id', catalogId)

    ensureSuccess(catalogError, 'No se pudo actualizar el rating del catálogo')

    const reviewByProduct = new Map<string, { total: number, count: number }>()
    reviews.forEach((review: any) => {
      if (!review.product_id) {
        return
      }

      const current = reviewByProduct.get(review.product_id) || { total: 0, count: 0 }
      current.total += Number(review.rating || 0)
      current.count += 1
      reviewByProduct.set(review.product_id, current)
    })

    await Promise.all((products || []).map(async (product: any) => {
      const stats = reviewByProduct.get(product.id) || { total: 0, count: 0 }
      const { error } = await $supabase
        .from('products')
        .update({
          product_rating: stats.count ? Number((stats.total / stats.count).toFixed(2)) : 0,
          product_rating_count: stats.count,
          reviews_approved_count: stats.count,
        })
        .eq('id', product.id)

      ensureSuccess(error, 'No se pudo actualizar el rating del producto')
    }))
  }

  const buildMasterDashboard = async (): Promise<MasterDashboardSnapshot> => {
    const [{ data: catalogs, error: catalogsError }, { data: profiles, error: profilesError }] = await Promise.all([
      $supabase.from('catalogs').select('*').order('created_at', { ascending: false }),
      $supabase.from('user_profiles').select('*'),
    ])

    ensureSuccess(catalogsError, 'No se pudieron cargar los catálogos')
    ensureSuccess(profilesError, 'No se pudieron cargar los perfiles')

    const usersMap = new Map((profiles || []).map((profile: any) => [profile.uid, profile]))

    const businesses = await Promise.all((catalogs || []).map(async (catalog: any) => {
      const [{ count: totalOrders }, { count: totalReviews }, { count: totalProducts }] = await Promise.all([
        $supabase.from('orders').select('id', { count: 'exact', head: true }).eq('catalog_id', catalog.id),
        $supabase.from('reviews').select('id', { count: 'exact', head: true }).eq('catalog_id', catalog.id),
        $supabase.from('products').select('id', { count: 'exact', head: true }).eq('catalog_id', catalog.id),
      ])

      const owner = usersMap.get(catalog.owner_uid)

      return {
        id: catalog.id,
        slug: catalog.slug,
        ownerUid: catalog.owner_uid,
        ownerName: owner?.display_name || 'Sin propietario',
        ownerEmail: owner?.email || 'Sin correo',
        businessName: catalog.settings?.businessName || 'Nueva Tienda',
        planTier: catalog.plan_tier,
        isBanned: catalog.is_banned === true,
        status: catalog.status,
        totalOrders: totalOrders || 0,
        totalReviews: totalReviews || 0,
        totalProducts: totalProducts || 0,
        createdAt: catalog.created_at,
      } satisfies MasterCatalogSnapshot
    }))

    return {
      totalCatalogs: businesses.filter((item) => !item.isBanned).length,
      ecosystemInteractions: businesses.reduce((acc, item) => acc + item.totalOrders + item.totalReviews, 0),
      businesses,
    }
  }

  const buildRealtimeDocChange = <T>(type: RealtimeDocChange<T>['type'], id: string, data: T): RealtimeDocChange<T> => ({
    type,
    doc: {
      id,
      data: () => data,
    },
  })

  const getCatalogAnalytics = async (catalogId: string, rangeDays = 7) => {
    const { data, error } = await $supabase.rpc('get_catalog_analytics_snapshot', {
      target_catalog_id: catalogId,
      range_days: rangeDays,
    })

    ensureSuccess(error, 'No se pudieron cargar las metricas del catalogo')
    return mapAnalyticsOverview(data, rangeDays)
  }

  const getMarketplaceLanding = async (userTags: string[] = [], options?: {
    topStoresLimit?: number
    viralProductsLimit?: number
    feedLimit?: number
  }): Promise<MarketplaceLandingPayload> => {
    const topStoresLimit = Math.max(1, Math.min(options?.topStoresLimit ?? 10, 24))
    const viralProductsLimit = Math.max(1, Math.min(options?.viralProductsLimit ?? 8, 24))
    const feedLimit = Math.max(1, Math.min(options?.feedLimit ?? 18, 40))
    const normalizedTags = [...new Set(userTags.map(tag => tag.trim().toLowerCase()).filter(Boolean))].slice(0, 18)

    const [topStoresRes, viralProductsRes, hubsRes, feedRes] = await Promise.all([
      $supabase.rpc('get_top_stores', { limit_count: topStoresLimit }),
      $supabase.rpc('get_viral_products', { limit_count: viralProductsLimit }),
      $supabase.rpc('get_hubs_by_region'),
      $supabase.rpc('get_personalized_feed', {
        user_tags: normalizedTags,
        limit_count: feedLimit,
      }),
    ])

    ensureSuccess(topStoresRes.error, 'No se pudo cargar el ranking de tiendas')
    ensureSuccess(viralProductsRes.error, 'No se pudo cargar la seccion viral')
    ensureSuccess(hubsRes.error, 'No se pudieron cargar las zonas')
    ensureSuccess(feedRes.error, 'No se pudo cargar el feed personalizado')

    return {
      topStores: (topStoresRes.data || []).map(mapRowToMarketplaceStore),
      viralProducts: (viralProductsRes.data || []).map(mapRowToMarketplaceProduct),
      hubs: (hubsRes.data || []).map(mapRowToMarketplaceHub),
      forYou: (feedRes.data || []).map(mapRowToMarketplaceFeedEntry),
    }
  }

  const watchCatalogAnalytics = (
    catalogId: string,
    callback: (payload: CatalogAnalyticsOverview) => Promise<void> | void,
    onError?: (error: Error) => void,
    rangeDays = 7,
  ) => {
    const fetchAnalytics = async () => {
      await callback(await getCatalogAnalytics(catalogId, rangeDays))
    }

    fetchAnalytics().catch((error) => onError?.(error as Error))

    const channel = $supabase
      .channel(`catalog-analytics:${catalogId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'catalog_analytics_daily', filter: `catalog_id=eq.${catalogId}` }, async () => {
        try {
          await fetchAnalytics()
        } catch (error) {
          onError?.(error as Error)
        }
      })
      .subscribe()

    return () => {
      void $supabase.removeChannel(channel)
    }
  }

  return {
    async initPersistence() {},
    watchSession(callback: (profile: UserProfile | null) => Promise<void> | void) {
      $supabase.auth.getSession()
        .then(async ({ data: { session } }) => {
          if (!session?.user) {
            await callback(null)
            return
          }

          await callback(await ensureUserProfile(session.user))
        })
        .catch(async () => {
          await callback(null)
        })

      const { data: { subscription } } = $supabase.auth.onAuthStateChange(async (_event, session) => {
        try {
          if (!session?.user) {
            await callback(null)
            return
          }

          await callback(await ensureUserProfile(session.user))
        } catch {
          await callback(null)
        }
      })

      return () => subscription.unsubscribe()
    },
    async login(email: string, password: string) {
      console.log('[auth] login: signInWithPassword start')
      const signInPromise = $supabase.auth.signInWithPassword({ email, password })
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Tiempo de espera agotado. Revisa tu conexión a internet.')), 10000),
      )
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = (await Promise.race([signInPromise, timeoutPromise])) as any
      console.log('[auth] login: signInWithPassword done', { hasUser: !!data?.user, error })
      ensureSuccess(error, 'Correo o contraseña incorrectos')
      if (!data?.user) {
        throw new Error('No se recibió información del usuario')
      }
      console.log('[auth] login: ensureUserProfile start')
      const profile = await ensureUserProfile(data.user)
      console.log('[auth] login: ensureUserProfile done', profile)
      return profile
    },
    async register(displayName: string, email: string, password: string) {
      const { data, error } = await $supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName.trim(),
          },
        },
      })

      ensureSuccess(error, 'No se pudo crear la cuenta')
      if (!data.user) {
        throw new Error('Supabase no devolvió el usuario recién creado')
      }
      return ensureUserProfile(data.user)
    },
    async logout() {
      const { error } = await $supabase.auth.signOut()
      ensureSuccess(error, 'No se pudo cerrar sesión')
    },
    async saveUser(profile: UserProfile) {
      const { error } = await $supabase.from('user_profiles').upsert({
        uid: profile.uid,
        email: profile.email,
        display_name: profile.displayName,
        default_catalog_id: profile.defaultCatalogId,
        system_role: profile.systemRole,
        created_at: profile.createdAt,
      })

      ensureSuccess(error, 'No se pudo guardar el usuario')
    },
    async getCatalogsByOwner(ownerUid: string) {
      const { data, error } = await $supabase
        .from('catalogs')
        .select('*')
        .eq('owner_uid', ownerUid)
        .order('created_at', { ascending: false })

      ensureSuccess(error, 'No se pudieron cargar los catálogos del propietario')
      return Promise.all((data || []).map(assembleCatalog))
    },
    async getCatalogBySlug(slug: string) {
      const { data, error } = await $supabase
        .from('catalogs')
        .select('*')
        .eq('slug', slug)
        .maybeSingle()

      ensureSuccess(error, 'No se pudo cargar el catálogo público')
      if (!data || data.is_banned === true) {
        return null
      }

      return assembleCatalog(data)
    },
    async getCatalogById(catalogId: string) {
      const data = await getCatalogHeaderById(catalogId)
      if (!data) {
        return null
      }

      return assembleCatalog(data)
    },
    async getMarketplaceCatalogs() {
      const { data, error } = await $supabase
        .from('catalogs')
        .select('*')
        .eq('status', 'published')
        .eq('is_banned', false)
        .order('created_at', { ascending: false })

      ensureSuccess(error, 'No se pudo cargar el marketplace')
      return Promise.all((data || []).map(assembleCatalog))
    },
    getMarketplaceLanding,
    async createCatalog(ownerUid: string, name: string, slug: string) {
      const { data: slugMatch, error: slugError } = await $supabase
        .from('catalogs')
        .select('id')
        .eq('slug', slug)
        .maybeSingle()

      ensureSuccess(slugError, 'No se pudo validar el slug')
      if (slugMatch) {
        throw new Error('Ese slug ya esta en uso')
      }

      const template = createCatalogRecord(ownerUid, slug, name)
      const { data: catalogRow, error } = await $supabase
        .from('catalogs')
        .insert({
          slug: template.slug,
          owner_uid: template.ownerUid,
          status: template.status,
          plan_tier: template.planTier,
          is_banned: template.isBanned,
          created_at: template.createdAt,
          rating_average: template.ratingAverage,
          rating_approved_count: template.ratingApprovedCount,
          theme: template.theme,
          settings: template.settings,
        })
        .select('*')
        .single()

      ensureSuccess(error, 'No se pudo crear el catálogo')

      if (template.categories.length) {
        const { error: categoriesError } = await $supabase
          .from('categories')
          .insert(template.categories.map((category) => mapCategoryToRow(catalogRow.id, category)))
        ensureSuccess(categoriesError, 'No se pudieron crear las categorías iniciales')
      }

      if (template.products.length) {
        const { error: productsError } = await $supabase
          .from('products')
          .insert(template.products.map((product) => mapProductToRow(catalogRow.id, product)))
        ensureSuccess(productsError, 'No se pudieron crear los productos iniciales')
      }

      if (template.reviews.length) {
        const { error: reviewsError } = await $supabase
          .from('reviews')
          .insert(template.reviews.map((review) => mapReviewToRow(catalogRow.id, review)))
        ensureSuccess(reviewsError, 'No se pudieron crear las reseñas iniciales')
      }

      await recalculateReviewStats(catalogRow.id)
      return assembleCatalog(catalogRow)
    },
    async updateSettings(catalogId: string, settings: Partial<CatalogOperationalSettings>) {
      await updateCatalogJson(catalogId, 'settings', settings)
    },
    async updateStorefrontLayout(catalogId: string, storefrontLayout: CatalogOperationalSettings['storefrontLayout']) {
      await updateCatalogJson(catalogId, 'settings', { storefrontLayout })
    },
    async updateTheme(catalogId: string, theme: Partial<CatalogThemeSettings>) {
      await updateCatalogJson(catalogId, 'theme', theme)
    },
    async updateCatalogBanStatus(catalogId: string, isBanned: boolean) {
      const { error } = await $supabase.from('catalogs').update({ is_banned: isBanned }).eq('id', catalogId)
      ensureSuccess(error, 'No se pudo cambiar el estado del catálogo')
    },
    async getMasterDashboard() {
      return buildMasterDashboard()
    },
    watchMasterDashboard(
      callback: (payload: MasterDashboardSnapshot) => Promise<void> | void,
      onError?: (error: Error) => void,
    ) {
      buildMasterDashboard().then(callback).catch((error) => onError?.(error as Error))

      const channel = $supabase
        .channel('master-dashboard')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'catalogs' }, async () => {
          try {
            await callback(await buildMasterDashboard())
          } catch (error) {
            onError?.(error as Error)
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'user_profiles' }, async () => {
          try {
            await callback(await buildMasterDashboard())
          } catch (error) {
            onError?.(error as Error)
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, async () => {
          try {
            await callback(await buildMasterDashboard())
          } catch (error) {
            onError?.(error as Error)
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews' }, async () => {
          try {
            await callback(await buildMasterDashboard())
          } catch (error) {
            onError?.(error as Error)
          }
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, async () => {
          try {
            await callback(await buildMasterDashboard())
          } catch (error) {
            onError?.(error as Error)
          }
        })
        .subscribe()

      return () => {
        void $supabase.removeChannel(channel)
      }
    },
    async upsertCategory(catalogId: string, category: CatalogCategory) {
      const { error } = await $supabase.from('categories').upsert(mapCategoryToRow(catalogId, category))
      ensureSuccess(error, 'No se pudo guardar la categoría')
    },
    async deleteCategory(catalogId: string, categoryId: string) {
      const [{ error: deleteError }, { error: productsError }] = await Promise.all([
        $supabase.from('categories').delete().eq('catalog_id', catalogId).eq('id', categoryId),
        $supabase.from('products').update({ category_id: null }).eq('catalog_id', catalogId).eq('category_id', categoryId),
      ])

      ensureSuccess(deleteError, 'No se pudo eliminar la categoría')
      ensureSuccess(productsError, 'No se pudieron desacoplar los productos de la categoría')
    },
    async upsertProduct(catalogId: string, product: CatalogProduct) {
      const { error } = await $supabase.from('products').upsert(mapProductToRow(catalogId, product))
      ensureSuccess(error, 'No se pudo guardar el producto')
    },
    async deleteProduct(catalogId: string, productId: string) {
      const { error } = await $supabase.from('products').delete().eq('catalog_id', catalogId).eq('id', productId)
      ensureSuccess(error, 'No se pudo eliminar el producto')
    },
    async updateReview(catalogId: string, reviewId: string, payload: Partial<CatalogReview>) {
      const { error } = await $supabase
        .from('reviews')
        .update({
          approved: payload.approved,
          admin_reply: payload.adminReply,
        })
        .eq('catalog_id', catalogId)
        .eq('id', reviewId)

      ensureSuccess(error, 'No se pudo actualizar la reseña')
      await recalculateReviewStats(catalogId)
    },
    async deleteReview(catalogId: string, reviewId: string) {
      const { error } = await $supabase.from('reviews').delete().eq('catalog_id', catalogId).eq('id', reviewId)
      ensureSuccess(error, 'No se pudo eliminar la reseña')
      await recalculateReviewStats(catalogId)
    },
    async appendReview(catalogId: string, review: CatalogReview) {
      const { error } = await $supabase.from('reviews').insert(mapReviewToRow(catalogId, review))
      ensureSuccess(error, 'No se pudo guardar la reseña')
      if (review.approved) {
        await recalculateReviewStats(catalogId)
      }
    },
    watchReviews(catalogId: string, callback: (reviews: CatalogReview[]) => void, onError?: (error: Error) => void) {
      const fetchReviews = async () => {
        const { data, error } = await $supabase
          .from('reviews')
          .select('*')
          .eq('catalog_id', catalogId)
          .order('created_at', { ascending: false })

        if (error) {
          throw error
        }

        callback((data || []).map(mapRowToReview))
      }

      fetchReviews().catch((error) => onError?.(error as Error))

      const channel = $supabase
        .channel(`reviews:${catalogId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews', filter: `catalog_id=eq.${catalogId}` }, async () => {
          try {
            await fetchReviews()
          } catch (error) {
            onError?.(error as Error)
          }
        })
        .subscribe()

      return () => {
        void $supabase.removeChannel(channel)
      }
    },
    async updateOrderStatus(catalogId: string, orderId: string, status: CatalogOrder['status']) {
      const { error } = await $supabase
        .from('orders')
        .update({ status })
        .eq('catalog_id', catalogId)
        .eq('id', orderId)

      ensureSuccess(error, 'No se pudo actualizar el pedido')
    },
    async appendOrder(catalogId: string, order: CatalogOrder) {
      const { error } = await $supabase.from('orders').insert(mapOrderToRow(catalogId, order))
      ensureSuccess(error, 'No se pudo guardar el pedido')

      if (order.appliedCoupon?.id) {
        const { data: coupon, error: couponError } = await $supabase
          .from('coupons')
          .select('used_count')
          .eq('id', order.appliedCoupon.id)
          .eq('catalog_id', catalogId)
          .maybeSingle()

        ensureSuccess(couponError, 'No se pudo leer el cupón aplicado')
        if (coupon) {
          const { error: updateError } = await $supabase
            .from('coupons')
            .update({
              used_count: Number(coupon.used_count || 0) + 1,
              updated_at: new Date().toISOString(),
            })
            .eq('catalog_id', catalogId)
            .eq('id', order.appliedCoupon.id)

          ensureSuccess(updateError, 'No se pudo actualizar el uso del cupón')
        }
      }
    },
    watchOrders(
      catalogId: string,
      callback: (payload: { orders: CatalogOrder[], changes: RealtimeDocChange<CatalogOrder>[] }) => void,
      onError?: (error: Error) => void,
    ) {
      const fetchOrders = async (changes: RealtimeDocChange<CatalogOrder>[] = []) => {
        const { data, error } = await $supabase
          .from('orders')
          .select('*')
          .eq('catalog_id', catalogId)
          .order('created_at', { ascending: false })

        if (error) {
          throw error
        }

        callback({
          orders: (data || []).map(mapRowToOrder),
          changes,
        })
      }

      fetchOrders().catch((error) => onError?.(error as Error))

      const channel = $supabase
        .channel(`orders:${catalogId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `catalog_id=eq.${catalogId}` }, async (payload) => {
          try {
            const changes: RealtimeDocChange<CatalogOrder>[] = []

            if (payload.eventType === 'INSERT' && payload.new) {
              changes.push(buildRealtimeDocChange('added', String((payload.new as any).id), mapRowToOrder(payload.new)))
            } else if (payload.eventType === 'UPDATE' && payload.new) {
              changes.push(buildRealtimeDocChange('modified', String((payload.new as any).id), mapRowToOrder(payload.new)))
            } else if (payload.eventType === 'DELETE' && payload.old) {
              changes.push(buildRealtimeDocChange('removed', String((payload.old as any).id), mapRowToOrder(payload.old)))
            }

            await fetchOrders(changes)
          } catch (error) {
            onError?.(error as Error)
          }
        })
        .subscribe()

      return () => {
        void $supabase.removeChannel(channel)
      }
    },
    async getCoupons(catalogId: string) {
      const { data, error } = await $supabase
        .from('coupons')
        .select('*')
        .eq('catalog_id', catalogId)
        .order('created_at', { ascending: false })

      ensureSuccess(error, 'No se pudieron cargar los cupones')
      return (data || []).map(mapRowToCoupon)
    },
    getCatalogAnalytics,
    watchCatalogAnalytics,
    watchCoupons(catalogId: string, callback: (coupons: CatalogCoupon[]) => void, onError?: (error: Error) => void) {
      const fetchCoupons = async () => {
        const { data, error } = await $supabase
          .from('coupons')
          .select('*')
          .eq('catalog_id', catalogId)
          .order('created_at', { ascending: false })

        if (error) {
          throw error
        }

        callback((data || []).map(mapRowToCoupon))
      }

      fetchCoupons().catch((error) => onError?.(error as Error))

      const channel = $supabase
        .channel(`coupons:${catalogId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'coupons', filter: `catalog_id=eq.${catalogId}` }, async () => {
          try {
            await fetchCoupons()
          } catch (error) {
            onError?.(error as Error)
          }
        })
        .subscribe()

      return () => {
        void $supabase.removeChannel(channel)
      }
    },
    async upsertCoupon(catalogId: string, coupon: CatalogCoupon) {
      const { error } = await $supabase.from('coupons').upsert(mapCouponToRow(catalogId, coupon))
      ensureSuccess(error, 'No se pudo guardar el cupón')
    },
    async deleteCoupon(catalogId: string, couponId: string) {
      const { error } = await $supabase.from('coupons').delete().eq('catalog_id', catalogId).eq('id', couponId)
      ensureSuccess(error, 'No se pudo eliminar el cupón')
    },
    async hydrateCatalogList(catalogIds: string[]) {
      if (!catalogIds.length) {
        return []
      }

      const { data, error } = await $supabase.from('catalogs').select('*').in('id', catalogIds)
      ensureSuccess(error, 'No se pudieron hidratar los catálogos')
      return Promise.all((data || []).map(assembleCatalog))
    },

    // ─── Referidos ────────────────────────────────────────────────────────────

    async ensureReferralCode(uid: string): Promise<string> {
      // Si ya tiene código, retornarlo directo
      const { data: existing } = await $supabase
        .from('user_profiles')
        .select('referral_code')
        .eq('uid', uid)
        .maybeSingle()

      if (existing?.referral_code) {
        return existing.referral_code
      }

      // Generar código único: 3 letras aleatorias + 5 chars del UUID
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
      const prefix = Array.from({ length: 3 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
      const suffix = uid.replace(/-/g, '').slice(0, 5).toUpperCase()
      const code = `${prefix}${suffix}`

      const { error } = await $supabase
        .from('user_profiles')
        .update({ referral_code: code })
        .eq('uid', uid)

      ensureSuccess(error, 'No se pudo generar el código de referido')
      return code
    },

    async linkReferral(newUserUid: string, referralCode: string): Promise<void> {
      if (!referralCode) return

      // Buscar el UID del referidor por su código
      const { data: referrerData } = await $supabase
        .rpc('get_uid_by_referral_code', { code: referralCode.toUpperCase() })

      if (!referrerData || referrerData === newUserUid) return

      // Guardar referred_by en el perfil del nuevo usuario
      await $supabase
        .from('user_profiles')
        .update({ referred_by: referrerData })
        .eq('uid', newUserUid)

      // Insertar en la tabla de referidos (ignorar si ya existe)
      await $supabase
        .from('referrals')
        .upsert({
          referrer_uid: referrerData,
          referred_uid: newUserUid,
          status: 'active',
        }, { onConflict: 'referrer_uid,referred_uid', ignoreDuplicates: true })
    },

    async getReferralData(uid: string): Promise<{
      code: string
      referrals: Array<{ uid: string; displayName: string; email: string; createdAt: string; status: string }>
      total: number
    }> {
      const code = await this.ensureReferralCode(uid)

      const { data, error } = await $supabase
        .from('referrals')
        .select('referred_uid, status, created_at, user_profiles!referrals_referred_uid_fkey(display_name, email)')
        .eq('referrer_uid', uid)
        .order('created_at', { ascending: false })

      ensureSuccess(error, 'No se pudieron cargar los referidos')

      const referrals = (data || []).map((row: any) => ({
        uid: row.referred_uid,
        displayName: row.user_profiles?.display_name || 'Sin nombre',
        email: row.user_profiles?.email || '',
        createdAt: row.created_at,
        status: row.status,
      }))

      return { code, referrals, total: referrals.length }
    },
  }
}
