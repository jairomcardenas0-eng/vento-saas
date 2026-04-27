import { createCatalogRecord, defaultSettings, defaultTheme } from '~/data/defaults'
import type { StorefrontPayload } from '~/composables/useStorefrontExperience'
import type {
  CatalogCategory,
  CatalogCoupon,
  CatalogOperationalSettings,
  CatalogOrder,
  CatalogPlan,
  CatalogPlanHistoryEntry,
  CatalogProduct,
  CatalogRecord,
  CatalogReview,
  CatalogThemeSettings,
  CatalogVariantGroup,
  InventoryItem,
  MarketplaceFeedEntry,
  MarketplaceHub,
  MarketplaceLandingPayload,
  MarketplaceProductCard,
  MarketplaceStoreCard,
  UserProfile,
} from '~/types/catalog'
import type { CategoryItem, ProductItem } from '~/stores/catalog'
import type { MasterDashboardSnapshot } from './types'
import type {
  BackendAuthUser,
  BackendSupabaseClient,
  CatalogHeaderRow,
  CatalogHeaderSnapshot,
  CatalogPlanHistoryRow,
  CatalogPlanRow,
  CategoryRow,
  CouponRow,
  EnsureSuccess,
  MarketplaceFeedEntryRow,
  MarketplaceHubRow,
  MarketplaceProductRow,
  MarketplaceStoreRow,
  OrderRow,
  ProductRow,
  ReviewRow,
  UserProfileRow,
} from './types'

type LocalPlanLimit = {
  maxProducts: number
  maxTeamMembers: number
  maxImages: number
  maxCatalogs: number
}

const PLAN_LIMITS: Record<'free' | 'basic' | 'pro' | 'enterprise', LocalPlanLimit> = {
  free: { maxProducts: 20, maxTeamMembers: 2, maxImages: 5, maxCatalogs: 1 },
  basic: { maxProducts: 100, maxTeamMembers: 5, maxImages: 10, maxCatalogs: 3 },
  pro: { maxProducts: 500, maxTeamMembers: 15, maxImages: Number.POSITIVE_INFINITY, maxCatalogs: 10 },
  enterprise: { maxProducts: Number.POSITIVE_INFINITY, maxTeamMembers: Number.POSITIVE_INFINITY, maxImages: Number.POSITIVE_INFINITY, maxCatalogs: Number.POSITIVE_INFINITY },
}

const normalizePlanTier = (planType?: string | null): keyof typeof PLAN_LIMITS => {
  if (planType === 'basic' || planType === 'pro' || planType === 'enterprise') {
    return planType
  }

  return 'free'
}

const getPlanLimits = (planType?: string | null): LocalPlanLimit =>
  PLAN_LIMITS[normalizePlanTier(planType)]

interface CreateSupabaseCatalogBackendOptions {
  supabase: BackendSupabaseClient
  ensureSuccess: EnsureSuccess
  clone: <T>(value: T) => T
  catalogSelect: string
  categorySelect: string
  productSelect: string
  reviewSelect: string
  orderSelect: string
  userProfileSelect: string
  defaultLivePageSize: number
  createCatalogRecord: typeof createCatalogRecord
  defaultSettings: typeof defaultSettings
  defaultTheme: typeof defaultTheme
  mapRowToCategory: (row: CategoryRow) => CatalogCategory
  mapCategoryToRow: (catalogId: string, category: CatalogCategory) => Record<string, unknown>
  mapRowToProduct: (row: ProductRow) => CatalogProduct
  mapProductToRow: (catalogId: string, product: CatalogProduct) => Record<string, unknown>
  mapRowToReview: (row: ReviewRow) => CatalogReview
  mapReviewToRow: (catalogId: string, review: CatalogReview) => Record<string, unknown>
  mapRowToOrder: (row: OrderRow) => CatalogOrder
  mapRowToCatalogPlan: (row: CatalogPlanRow) => CatalogPlan
  mapCatalogPlanToRow: (catalogId: string, plan: CatalogPlan) => Record<string, unknown>
  mapRowToPlanHistoryEntry: (row: CatalogPlanHistoryRow) => CatalogPlanHistoryEntry
  mapRowToCatalogRecord: (
    row: CatalogHeaderRow,
    categories: CatalogCategory[],
    products: CatalogProduct[],
    reviews: CatalogReview[],
    orders: CatalogOrder[],
  ) => CatalogRecord
  mapRowToUserProfile: (row: UserProfileRow) => UserProfile
  mapCatalogHeader: (row: CatalogHeaderRow) => CatalogHeaderSnapshot
  mapCatalogCategoryToItem: (category: CatalogCategory) => CategoryItem
  mapCatalogProductToItem: (product: CatalogProduct) => ProductItem
  mapRowToCoupon: (row: CouponRow) => CatalogCoupon
  mapRowToMarketplaceStore: (row: MarketplaceStoreRow) => MarketplaceStoreCard
  mapRowToMarketplaceProduct: (row: MarketplaceProductRow) => MarketplaceProductCard
  mapRowToMarketplaceHub: (row: MarketplaceHubRow) => MarketplaceHub
  mapRowToMarketplaceFeedEntry: (row: MarketplaceFeedEntryRow) => MarketplaceFeedEntry
}

export const createSupabaseCatalogBackend = ({
  supabase,
  ensureSuccess,
  clone,
  catalogSelect,
  categorySelect,
  productSelect,
  reviewSelect,
  orderSelect,
  userProfileSelect,
  defaultLivePageSize,
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
}: CreateSupabaseCatalogBackendOptions) => {
  const normalizeVariantGroups = (product: CatalogProduct): CatalogVariantGroup[] => {
    if (Array.isArray(product.variantGroups) && product.variantGroups.length) {
      return clone(product.variantGroups)
    }

    return (product.variants || []).map((group, groupIndex) => ({
      id: group.id || `${product.id}-group-${groupIndex}`,
      catalogId: undefined,
      productId: product.id,
      groupName: group.groupName,
      selectionType: group.type,
      required: Boolean(group.required),
      sortOrder: groupIndex,
      options: (group.options || []).map((option, optionIndex) => ({
        id: option.id || `${product.id}-group-${groupIndex}-option-${optionIndex}`,
        groupId: group.id || `${product.id}-group-${groupIndex}`,
        name: option.name,
        priceDelta: Number(option.priceDelta || 0),
        isRequired: Boolean(option.isRequired),
        sortOrder: optionIndex,
      })),
    }))
  }

  const normalizeInventoryItems = (catalogId: string, product: CatalogProduct, variantGroups: CatalogVariantGroup[]): InventoryItem[] => {
    if (Array.isArray(product.inventoryItems) && product.inventoryItems.length) {
      return clone(product.inventoryItems).map(item => ({
        ...item,
        catalogId,
        productId: product.id,
        variantOptionId: item.variantOptionId || null,
      }))
    }

    const optionIds = variantGroups.flatMap(group => group.options.map(option => option.id))
    if (!optionIds.length) {
      return [{
        id: `${product.id}-inventory-base`,
        catalogId,
        productId: product.id,
        variantOptionId: null,
        sku: '',
        quantity: 0,
        reserved: 0,
        lowStockThreshold: 0,
        trackStock: false,
      }]
    }

    return optionIds.map(optionId => ({
      id: `${product.id}-${optionId}`,
      catalogId,
      productId: product.id,
      variantOptionId: optionId,
      sku: '',
      quantity: 0,
      reserved: 0,
      lowStockThreshold: 0,
      trackStock: false,
    }))
  }

  const syncProductVariantsAndInventory = async (catalogId: string, product: CatalogProduct) => {
    const variantGroups = normalizeVariantGroups(product)
    const inventoryItems = normalizeInventoryItems(catalogId, product, variantGroups)
    const optionIds = variantGroups.flatMap(group => group.options.map(option => option.id))

    const [{ error: inventoryDeleteError }, { error: groupsDeleteError }] = await Promise.all([
      supabase.from('inventory_items').delete().eq('catalog_id', catalogId).eq('product_id', product.id),
      supabase.from('product_variant_groups').delete().eq('catalog_id', catalogId).eq('product_id', product.id),
    ])

    ensureSuccess(inventoryDeleteError, 'No se pudo limpiar el inventario previo')
    ensureSuccess(groupsDeleteError, 'No se pudo limpiar la estructura de variantes previa')

    if (variantGroups.length) {
      const { error: groupsInsertError } = await supabase.from('product_variant_groups').insert(
        variantGroups.map(group => ({
          id: group.id,
          catalog_id: catalogId,
          product_id: product.id,
          group_name: group.groupName,
          selection_type: group.selectionType,
          required: group.required,
          sort_order: group.sortOrder,
        })),
      )
      ensureSuccess(groupsInsertError, 'No se pudieron guardar los grupos de variantes')
    }

    if (optionIds.length) {
      const { error: optionsInsertError } = await supabase.from('product_variant_options').insert(
        variantGroups.flatMap(group => group.options.map(option => ({
          id: option.id,
          group_id: group.id,
          name: option.name,
          price_delta: option.priceDelta,
          is_required: option.isRequired,
          sort_order: option.sortOrder,
        }))),
      )
      ensureSuccess(optionsInsertError, 'No se pudieron guardar las opciones de variantes')
    }

    if (inventoryItems.length) {
      const { error: inventoryInsertError } = await supabase.from('inventory_items').insert(
        inventoryItems.map(item => ({
          id: item.id,
          catalog_id: catalogId,
          product_id: product.id,
          variant_option_id: item.variantOptionId || null,
          sku: item.sku || '',
          quantity: Number(item.quantity || 0),
          reserved: Number(item.reserved || 0),
          low_stock_threshold: Number(item.lowStockThreshold || 0),
          track_stock: item.trackStock === true,
        })),
      )
      ensureSuccess(inventoryInsertError, 'No se pudo guardar el inventario')
    }
  }

  const getCatalogHeaderById = async (catalogId: string): Promise<CatalogHeaderRow | null> => {
    const { data, error } = await supabase
      .from('catalogs')
      .select(catalogSelect)
      .eq('id', catalogId)
      .maybeSingle()

    ensureSuccess(error, 'No se pudo cargar el catalogo')
    return data as CatalogHeaderRow | null
  }

  const fetchCatalogRelations = async (catalogId: string) => {
    const [categoriesRes, productsRes, reviewsRes, ordersRes] = await Promise.all([
      supabase.from('categories').select(categorySelect).eq('catalog_id', catalogId).order('sort_order'),
      supabase.from('products').select(productSelect).eq('catalog_id', catalogId).order('sort_order'),
      supabase.from('reviews').select(reviewSelect).eq('catalog_id', catalogId).order('created_at', { ascending: false }).limit(defaultLivePageSize),
      supabase.from('orders').select(orderSelect).eq('catalog_id', catalogId).order('created_at', { ascending: false }).limit(defaultLivePageSize),
    ])

    ensureSuccess(categoriesRes.error, 'No se pudieron cargar las categorias')
    ensureSuccess(productsRes.error, 'No se pudieron cargar los productos')
    ensureSuccess(reviewsRes.error, 'No se pudieron cargar las resenas')
    ensureSuccess(ordersRes.error, 'No se pudieron cargar los pedidos')

    const categories = (categoriesRes.data || []) as unknown as CategoryRow[]
    const products = (productsRes.data || []) as unknown as ProductRow[]
    const reviews = (reviewsRes.data || []) as unknown as ReviewRow[]
    const orders = (ordersRes.data || []) as unknown as OrderRow[]

    return {
      categories: categories.map(mapRowToCategory),
      products: products.map(mapRowToProduct),
      reviews: reviews.map(mapRowToReview),
      orders: orders.map(mapRowToOrder),
    }
  }

  const fetchPublicCatalogRelations = async (catalogId: string) => {
    const [categoriesRes, productsRes, reviewsRes] = await Promise.all([
      supabase.from('categories').select(categorySelect).eq('catalog_id', catalogId).order('sort_order'),
      supabase.from('products').select(productSelect).eq('catalog_id', catalogId).eq('is_active', true).order('sort_order'),
      supabase.from('reviews').select(reviewSelect).eq('catalog_id', catalogId).eq('approved', true).order('created_at', { ascending: false }).limit(defaultLivePageSize),
    ])

    ensureSuccess(categoriesRes.error, 'No se pudieron cargar las categorias')
    ensureSuccess(productsRes.error, 'No se pudieron cargar los productos')
    ensureSuccess(reviewsRes.error, 'No se pudieron cargar las resenas')

    const categories = (categoriesRes.data || []) as unknown as CategoryRow[]
    const products = (productsRes.data || []) as unknown as ProductRow[]
    const reviews = (reviewsRes.data || []) as unknown as ReviewRow[]

    return {
      categories: categories.map(mapRowToCategory),
      products: products.map(mapRowToProduct),
      reviews: reviews.map(mapRowToReview),
      orders: [] as CatalogOrder[],
    }
  }

  const assembleCatalog = async (row: CatalogHeaderRow): Promise<CatalogRecord> => {
    const relations = await fetchCatalogRelations(row.id)
    return mapRowToCatalogRecord(row, relations.categories, relations.products, relations.reviews, relations.orders)
  }

  const assemblePublicCatalog = async (row: CatalogHeaderRow): Promise<CatalogRecord> => {
    const relations = await fetchPublicCatalogRelations(row.id)
    return mapRowToCatalogRecord(row, relations.categories, relations.products, relations.reviews, relations.orders)
  }

  const ensureUserProfile = async (authUser: BackendAuthUser) => {
    const { data, error } = await supabase
      .from('user_profiles')
      .select(userProfileSelect)
      .eq('uid', authUser.id)
      .maybeSingle()

    ensureSuccess(error, 'No se pudo consultar el perfil')

    if (data) {
      return mapRowToUserProfile(data as unknown as UserProfileRow)
    }

    const profile = {
      uid: authUser.id,
      email: authUser.email || '',
      displayName: authUser.user_metadata?.display_name || authUser.email?.split('@')[0] || 'Owner',
      defaultCatalogId: null,
      systemRole: 'merchant' as const,
      createdAt: new Date().toISOString(),
    }

    const { error: insertError } = await supabase.from('user_profiles').insert({
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
    return catalog
  }

  const updateCatalogJson = async (
    catalogId: string,
    key: 'settings' | 'theme',
    payload: Record<string, unknown>,
  ) => {
    const { error } = await supabase
      .from('catalogs')
      .update({ [key]: clone(payload) })
      .eq('id', catalogId)

    ensureSuccess(error, `No se pudo actualizar ${key}`)
  }

  const recalculateReviewStats = async (catalogId: string) => {
    const [{ data: approvedReviews, error: reviewsError }, { data: products, error: productsError }] = await Promise.all([
      supabase.from('reviews').select('rating, product_id').eq('catalog_id', catalogId).eq('approved', true),
      supabase.from('products').select('id').eq('catalog_id', catalogId),
    ])

    ensureSuccess(reviewsError, 'No se pudieron recalcular las resenas')
    ensureSuccess(productsError, 'No se pudieron recalcular los productos')

    const reviews = (approvedReviews || []) as Array<{ product_id?: string | null, rating?: number | string | null }>
    const ratingApprovedCount = reviews.length
    const ratingAverage = ratingApprovedCount
      ? reviews.reduce((acc: number, review: { rating?: number | string | null }) => acc + Number(review.rating || 0), 0) / ratingApprovedCount
      : 0

    const { error: catalogError } = await supabase
      .from('catalogs')
      .update({
        rating_average: Number(ratingAverage.toFixed(2)),
        rating_approved_count: ratingApprovedCount,
      })
      .eq('id', catalogId)

    ensureSuccess(catalogError, 'No se pudo actualizar el rating del catalogo')

    const reviewByProduct = new Map<string, { total: number, count: number }>()
    reviews.forEach((review: { product_id?: string | null, rating?: number | string | null }) => {
      if (!review.product_id) {
        return
      }

      const current = reviewByProduct.get(review.product_id) || { total: 0, count: 0 }
      current.total += Number(review.rating || 0)
      current.count += 1
      reviewByProduct.set(review.product_id, current)
    })

    await Promise.all(((products || []) as Array<{ id: string }>).map(async (product) => {
      const stats = reviewByProduct.get(product.id) || { total: 0, count: 0 }
      const { error } = await supabase
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
    const [{ data: catalogs, error: catalogsError }, { data: profiles, error: profilesError }, { data: plans, error: plansError }] = await Promise.all([
      supabase.from('catalogs').select(catalogSelect).order('created_at', { ascending: false }),
      supabase.from('user_profiles').select(userProfileSelect),
      supabase.from('catalog_plans').select('catalog_id, plan_type, status, expires_at'),
    ])

    ensureSuccess(catalogsError, 'No se pudieron cargar los catalogos')
    ensureSuccess(profilesError, 'No se pudieron cargar los perfiles')
    ensureSuccess(plansError, 'No se pudieron cargar los planes')

    const usersMap = new Map<string, UserProfileRow>(((profiles || []) as unknown as UserProfileRow[]).map((profile) => [profile.uid, profile]))
    const plansMap = new Map(
      (((plans || []) as Array<Pick<CatalogPlanRow, 'catalog_id' | 'plan_type' | 'status' | 'expires_at'>>) || [])
        .map((plan) => [plan.catalog_id, plan]),
    )

    const businesses = await Promise.all(((catalogs || []) as unknown as CatalogHeaderRow[]).map(async (catalog) => {
      const [{ count: totalOrders }, { count: totalReviews }, { count: totalProducts }] = await Promise.all([
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('catalog_id', catalog.id),
        supabase.from('reviews').select('id', { count: 'exact', head: true }).eq('catalog_id', catalog.id),
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('catalog_id', catalog.id),
      ])

      const owner = usersMap.get(catalog.owner_uid)
      const plan = plansMap.get(catalog.id)

      return {
        id: catalog.id,
        slug: catalog.slug,
        ownerUid: catalog.owner_uid,
        ownerName: owner?.display_name || 'Sin propietario',
        ownerEmail: owner?.email || 'Sin correo',
        businessName: catalog.settings?.businessName || 'Nueva Tienda',
        planTier: plan?.plan_type || catalog.plan_tier,
        isBanned: catalog.is_banned === true,
        status: catalog.status,
        totalOrders: totalOrders || 0,
        totalReviews: totalReviews || 0,
        totalProducts: totalProducts || 0,
        planStatus: plan?.status,
        planExpiresAt: plan?.expires_at ?? null,
        createdAt: catalog.created_at,
      }
    }))

    return {
      totalCatalogs: businesses.filter((item) => !item.isBanned).length,
      ecosystemInteractions: businesses.reduce((acc, item) => acc + item.totalOrders + item.totalReviews, 0),
      businesses,
    }
  }

  return {
    ensureUserProfile,
    getCatalogHeaderById,
    fetchCatalogRelations,
    fetchPublicCatalogRelations,
    assembleCatalog,
    assemblePublicCatalog,
    ensurePaidPlan,
    async getCatalogPlan(catalogId: string): Promise<CatalogPlan | null> {
      const { data, error } = await supabase
        .from('catalog_plans')
        .select('id, catalog_id, plan_type, status, activated_at, expires_at, payment_reference, notes')
        .eq('catalog_id', catalogId)
        .maybeSingle()

      ensureSuccess(error, 'No se pudo cargar el plan del catálogo')
      return data ? mapRowToCatalogPlan(data as CatalogPlanRow) : null
    },
    async getCatalogPlanHistory(catalogId: string): Promise<CatalogPlanHistoryEntry[]> {
      const { data, error } = await supabase
        .from('catalog_plan_history')
        .select('id, catalog_id, previous_plan, new_plan, changed_by, reason, created_at')
        .eq('catalog_id', catalogId)
        .order('created_at', { ascending: false })

      ensureSuccess(error, 'No se pudo cargar el historial del plan')
      return ((data || []) as CatalogPlanHistoryRow[]).map(mapRowToPlanHistoryEntry)
    },
    async upsertCatalogPlan(catalogId: string, payload: Omit<CatalogPlan, 'catalogId'>, historyReason: string) {
      const currentPlan = await this.getCatalogPlan(catalogId)
      const nextPlan: CatalogPlan = {
        ...payload,
        catalogId,
      }

      const { error } = await supabase
        .from('catalog_plans')
        .upsert(mapCatalogPlanToRow(catalogId, nextPlan), { onConflict: 'catalog_id' })

      ensureSuccess(error, 'No se pudo guardar el plan del catálogo')

      const { error: historyError } = await supabase
        .from('catalog_plan_history')
        .insert({
          catalog_id: catalogId,
          previous_plan: currentPlan?.planType || null,
          new_plan: nextPlan.planType,
          changed_by: null,
          reason: historyReason,
        })

      ensureSuccess(historyError, 'No se pudo guardar el historial del plan')
    },
    updateCatalogJson,
    recalculateReviewStats,
    buildMasterDashboard,
    async getMarketplaceLanding(userTags: string[] = [], options?: {
      topStoresLimit?: number
      viralProductsLimit?: number
      feedLimit?: number
    }): Promise<MarketplaceLandingPayload> {
      const topStoresLimit = Math.max(1, Math.min(options?.topStoresLimit ?? 10, 24))
      const viralProductsLimit = Math.max(1, Math.min(options?.viralProductsLimit ?? 8, 24))
      const feedLimit = Math.max(1, Math.min(options?.feedLimit ?? 18, 40))
      const normalizedTags = [...new Set(userTags.map(tag => tag.trim().toLowerCase()).filter(Boolean))].slice(0, 18)

      const [topStoresRes, viralProductsRes, hubsRes, feedRes] = await Promise.all([
        supabase.rpc('get_top_stores', { limit_count: topStoresLimit }),
        supabase.rpc('get_viral_products', { limit_count: viralProductsLimit }),
        supabase.rpc('get_hubs_by_region'),
        supabase.rpc('get_personalized_feed', {
          user_tags: normalizedTags,
          limit_count: feedLimit,
        }),
      ])

      if (topStoresRes.error) console.warn('[marketplace] get_top_stores failed:', topStoresRes.error.message)
      if (viralProductsRes.error) console.warn('[marketplace] get_viral_products failed:', viralProductsRes.error.message)
      if (hubsRes.error) console.warn('[marketplace] get_hubs_by_region failed:', hubsRes.error.message)
      if (feedRes.error) console.warn('[marketplace] get_personalized_feed failed:', feedRes.error.message)

      return {
        topStores: topStoresRes.error ? [] : ((topStoresRes.data || []) as unknown as MarketplaceStoreRow[]).map(mapRowToMarketplaceStore),
        viralProducts: viralProductsRes.error ? [] : ((viralProductsRes.data || []) as unknown as MarketplaceProductRow[]).map(mapRowToMarketplaceProduct),
        hubs: hubsRes.error ? [] : ((hubsRes.data || []) as unknown as MarketplaceHubRow[]).map(mapRowToMarketplaceHub),
        forYou: feedRes.error ? [] : ((feedRes.data || []) as unknown as MarketplaceFeedEntryRow[]).map(mapRowToMarketplaceFeedEntry),
      }
    },
    async getPublicStorefrontBySlug(slug: string): Promise<StorefrontPayload | null> {
      const normalizedSlug = slug.trim().toLowerCase().replace(/\s+/g, '-')
      if (!normalizedSlug) {
        return null
      }

      const { data, error } = await supabase.rpc('get_public_storefront_payload', {
        slug_text: normalizedSlug,
      })

      ensureSuccess(error, 'No se pudo cargar el storefront publico')
      if (!data?.catalog) {
        return null
      }

      const catalog = mapCatalogHeader(data.catalog as unknown as CatalogHeaderRow)
      const categories = ((data.categories || []) as unknown as CategoryRow[]).map(mapRowToCategory).map(mapCatalogCategoryToItem)
      const products = ((data.products || []) as unknown as ProductRow[]).map(mapRowToProduct).map(mapCatalogProductToItem)
      const reviews = ((data.reviews || []) as unknown as ReviewRow[]).map(mapRowToReview)
      const coupons = ((data.coupons || []) as unknown as CouponRow[]).map(mapRowToCoupon)

      return {
        id: catalog.id,
        slug: catalog.slug,
        settings: {
          ...defaultSettings(catalog.settings?.businessName || 'Nueva Tienda', catalog.slug),
          ...catalog.settings,
        },
        theme: {
          ...defaultTheme(),
          ...(catalog.theme || {}),
        },
        categories,
        products,
        reviews,
        coupons,
      }
    },
    async getCatalogEditorPayload(catalogId: string): Promise<{ categories: CategoryItem[], products: ProductItem[] }> {
      if (!catalogId) {
        return { categories: [], products: [] }
      }

      const { data, error } = await supabase.rpc('get_catalog_editor_payload', {
        target_catalog_id: catalogId,
      })

      if (!error && data) {
        return {
          categories: ((data.categories || []) as unknown as CategoryRow[]).map(mapRowToCategory).map(mapCatalogCategoryToItem),
          products: ((data.products || []) as unknown as ProductRow[]).map(mapRowToProduct).map(mapCatalogProductToItem),
        }
      }

      if (error) {
        console.warn('[catalog-editor] RPC fallback:', error.message || error)
      }

      const [categoriesRes, productsRes] = await Promise.all([
        supabase.from('categories').select(categorySelect).eq('catalog_id', catalogId).order('sort_order'),
        supabase.from('products').select(productSelect).eq('catalog_id', catalogId).order('sort_order'),
      ])

      ensureSuccess(categoriesRes.error, 'No se pudieron cargar las categorias')
      ensureSuccess(productsRes.error, 'No se pudieron cargar los productos')

      return {
        categories: ((categoriesRes.data || []) as unknown as CategoryRow[]).map(mapRowToCategory).map(mapCatalogCategoryToItem),
        products: ((productsRes.data || []) as unknown as ProductRow[]).map(mapRowToProduct).map(mapCatalogProductToItem),
      }
    },
    async getCatalogBySlug(slug: string) {
      if (!slug) return null

      const normalizedSlug = slug.trim().toLowerCase().replace(/\s+/g, '-')

      const { data, error } = await supabase
        .from('catalogs')
        .select(catalogSelect)
        .ilike('slug', normalizedSlug)
        .maybeSingle()

      ensureSuccess(error, 'No se pudo cargar el catalogo publico')
      const catalogRow = data as unknown as CatalogHeaderRow | null
      if (!catalogRow || catalogRow.is_banned === true) {
        return null
      }

      return assemblePublicCatalog(catalogRow)
    },
    async getCatalogById(catalogId: string) {
      const data = await getCatalogHeaderById(catalogId)
      if (!data) {
        return null
      }

      return assembleCatalog(data)
    },
    async getMarketplaceCatalogs() {
      const { data, error } = await supabase
        .from('catalogs')
        .select(catalogSelect)
        .eq('status', 'published')
        .eq('is_banned', false)
        .order('created_at', { ascending: false })

      ensureSuccess(error, 'No se pudo cargar el marketplace')
      return ((data || []) as unknown as CatalogHeaderRow[]).map((row) => mapRowToCatalogRecord(row, [], [], [], []))
    },
    async createCatalog(ownerUid: string, name: string, slug: string) {
      const { data: slugMatch, error: slugError } = await supabase
        .from('catalogs')
        .select('id')
        .eq('slug', slug)
        .maybeSingle()

      ensureSuccess(slugError, 'No se pudo validar el slug')
      if (slugMatch) {
        throw new Error('Ese slug ya esta en uso')
      }

      const { data: ownerCatalogs, error: ownerCatalogsError } = await supabase
        .from('catalogs')
        .select('id, plan_tier')
        .eq('owner_uid', ownerUid)

      ensureSuccess(ownerCatalogsError, 'No se pudo validar el limite de catalogos')

      const highestPlanTier = (((ownerCatalogs || []) as Array<{ plan_tier?: string | null }>) || []).reduce<keyof typeof PLAN_LIMITS>((current, row) => {
        const nextTier = normalizePlanTier(row.plan_tier)
        const order = ['free', 'basic', 'pro', 'enterprise'] as const
        return order.indexOf(nextTier) > order.indexOf(current) ? nextTier : current
      }, 'free')

      const maxCatalogs = getPlanLimits(highestPlanTier).maxCatalogs
      const nextCatalogCount = Number((ownerCatalogs || []).length) + 1
      if (Number.isFinite(maxCatalogs) && nextCatalogCount > maxCatalogs) {
        throw new Error('Has alcanzado el limite de catalogos de tu plan. Actualiza para crear mas.')
      }

      const template = createCatalogRecord(ownerUid, slug, name)
      const { data: catalogRow, error } = await supabase
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
        .select(catalogSelect)
        .single()

      ensureSuccess(error, 'No se pudo crear el catalogo')
      if (!catalogRow) {
        throw new Error('No se recibio el catalogo recien creado')
      }
      const createdCatalog = catalogRow as unknown as CatalogHeaderRow

      if (template.categories.length) {
        const { error: categoriesError } = await supabase
          .from('categories')
          .insert(template.categories.map((category) => mapCategoryToRow(createdCatalog.id, category)))
        ensureSuccess(categoriesError, 'No se pudieron crear las categorias iniciales')
      }

      if (template.products.length) {
        const { error: productsError } = await supabase
          .from('products')
          .insert(template.products.map((product) => mapProductToRow(createdCatalog.id, product)))
        ensureSuccess(productsError, 'No se pudieron crear los productos iniciales')
      }

      if (template.reviews.length) {
        const { error: reviewsError } = await supabase
          .from('reviews')
          .insert(template.reviews.map((review) => mapReviewToRow(createdCatalog.id, review)))
        ensureSuccess(reviewsError, 'No se pudieron crear las resenas iniciales')
      }

      await recalculateReviewStats(createdCatalog.id)
      return assembleCatalog(createdCatalog)
    },
    async updateSettings(catalogId: string, settings: Partial<CatalogOperationalSettings>) {
      const { data, error } = await supabase.from('catalogs').select('settings').eq('id', catalogId).single()
      ensureSuccess(error, 'No se pudo cargar la configuracion actual')

      const merged = { ...data?.settings, ...settings }
      await updateCatalogJson(catalogId, 'settings', merged)
    },
    async updateStorefrontLayout(catalogId: string, storefrontLayout: CatalogOperationalSettings['storefrontLayout']) {
      const { data, error } = await supabase.from('catalogs').select('settings').eq('id', catalogId).single()
      ensureSuccess(error, 'No se pudo cargar la configuracion actual')

      const merged = { ...data?.settings, storefrontLayout }
      await updateCatalogJson(catalogId, 'settings', merged)
    },
    async updateTheme(catalogId: string, theme: Partial<CatalogThemeSettings>) {
      const { data, error } = await supabase.from('catalogs').select('theme').eq('id', catalogId).single()
      ensureSuccess(error, 'No se pudo cargar el tema actual')

      const merged = { ...data?.theme, ...theme }
      await updateCatalogJson(catalogId, 'theme', merged)
    },
    async updateCatalogBanStatus(catalogId: string, isBanned: boolean) {
      const { error } = await supabase.from('catalogs').update({ is_banned: isBanned }).eq('id', catalogId)
      ensureSuccess(error, 'No se pudo cambiar el estado del catalogo')
    },
    async getMasterDashboard() {
      return buildMasterDashboard()
    },
    watchMasterDashboard(
      callback: (payload: MasterDashboardSnapshot) => Promise<void> | void,
      onError?: (error: Error) => void,
    ) {
      buildMasterDashboard().then(callback).catch((error) => onError?.(error as Error))

      const channel = supabase
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
        void supabase.removeChannel(channel)
      }
    },
    async upsertCategory(catalogId: string, category: CatalogCategory) {
      await ensurePaidPlan(catalogId)
      const { error } = await supabase.from('categories').upsert(mapCategoryToRow(catalogId, category))
      ensureSuccess(error, 'No se pudo guardar la categoria')
    },
    async deleteCategory(catalogId: string, categoryId: string) {
      await ensurePaidPlan(catalogId)
      const [{ error: deleteError }, { error: productsError }] = await Promise.all([
        supabase.from('categories').delete().eq('catalog_id', catalogId).eq('id', categoryId),
        supabase.from('products').update({ category_id: null }).eq('catalog_id', catalogId).eq('category_id', categoryId),
      ])

      ensureSuccess(deleteError, 'No se pudo eliminar la categoria')
      ensureSuccess(productsError, 'No se pudieron desacoplar los productos de la categoria')
    },
    async upsertProduct(catalogId: string, product: CatalogProduct) {
      await ensurePaidPlan(catalogId)
      const [{ data: existingProduct, error: existingError }, { count: productsCount, error: countError }, catalogHeader] = await Promise.all([
        supabase.from('products').select('id').eq('catalog_id', catalogId).eq('id', product.id).maybeSingle(),
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('catalog_id', catalogId),
        getCatalogHeaderById(catalogId),
      ])

      ensureSuccess(existingError, 'No se pudo validar el producto actual')
      ensureSuccess(countError, 'No se pudo validar el limite de productos')
      if (!catalogHeader) {
        throw new Error('Catalogo no encontrado')
      }

      const maxProducts = getPlanLimits(catalogHeader.plan_tier).maxProducts
      const nextProductsCount = Number(productsCount || 0) + (existingProduct ? 0 : 1)
      if (Number.isFinite(maxProducts) && nextProductsCount > maxProducts) {
        throw new Error('Has alcanzado el limite de productos de tu plan. Actualiza para agregar mas.')
      }

      const { error } = await supabase.from('products').upsert(mapProductToRow(catalogId, product))
      ensureSuccess(error, 'No se pudo guardar el producto')
      await syncProductVariantsAndInventory(catalogId, product)
    },
    async deleteProduct(catalogId: string, productId: string) {
      await ensurePaidPlan(catalogId)
      const { error } = await supabase.from('products').delete().eq('catalog_id', catalogId).eq('id', productId)
      ensureSuccess(error, 'No se pudo eliminar el producto')
    },
  }
}
