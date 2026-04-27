import { createSupabaseServerClient } from '../../utils/supabase'
import { cacheKeys, getOrReconstruct } from '../../utils/cache'
import {
  emptyMarketplaceLanding,
  mapMarketplaceLandingPayload,
  mapMarketplaceFeedEntry,
  mapMarketplaceHub,
  mapMarketplaceProduct,
  mapMarketplaceStore,
} from '../../utils/marketplace'

const parseTags = (value: string | string[] | undefined) => {
  const source = Array.isArray(value) ? value.join(',') : (value || '')
  return [...new Set(
    source
      .split(',')
      .map(tag => tag.trim().toLowerCase())
      .filter(Boolean),
  )].slice(0, 18)
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const q = String(query.q || '').trim().toLowerCase()
  const tags = parseTags(query.tags as string | string[] | undefined)
  const supabase = createSupabaseServerClient(event)
  const queryKey = q
    ? `search:${encodeURIComponent(q)}:${tags.join('|') || 'none'}`
    : (tags.length ? `tags:${tags.join('|')}` : 'landing')

  const loadLanding = async () => {
    const aggregatedRes = await supabase.rpc('get_marketplace_landing_payload', {
      query_text: q || null,
      user_tags: tags,
      stores_limit: 10,
      products_limit: 8,
      hubs_limit: 12,
      feed_limit: 18,
    })

    if (!aggregatedRes.error && aggregatedRes.data) {
      return mapMarketplaceLandingPayload(aggregatedRes.data)
    }

    if (q) {
      const [storesRes, productsRes, hubsRes] = await Promise.all([
        supabase.rpc('search_marketplace_stores', { query_text: q, limit_count: 10 }),
        supabase.rpc('search_marketplace_feed', { query_text: q, limit_count: 18 }),
        supabase.rpc('search_marketplace_hubs', { query_text: q, limit_count: 12 }),
      ])

      const payload = emptyMarketplaceLanding()
      if (!storesRes.error) {
        payload.topStores = (storesRes.data || []).map(mapMarketplaceStore)
      }
      if (!productsRes.error) {
        const feed = (productsRes.data || []).map(mapMarketplaceFeedEntry)
        payload.forYou = feed
        payload.viralProducts = feed.slice(0, 8).map(mapMarketplaceProduct)
      }
      if (!hubsRes.error) {
        payload.hubs = (hubsRes.data || []).map(mapMarketplaceHub)
      }

      return payload
    }

    const [topStoresRes, viralProductsRes, hubsRes, feedRes] = await Promise.all([
      supabase.rpc('get_top_stores', { limit_count: 10 }),
      supabase.rpc('get_viral_products', { limit_count: 8 }),
      supabase.rpc('get_hubs_by_region'),
      supabase.rpc('get_personalized_feed', {
        user_tags: tags,
        limit_count: 18,
      }),
    ])

    const payload = emptyMarketplaceLanding()
    if (!topStoresRes.error) {
      payload.topStores = (topStoresRes.data || []).map(mapMarketplaceStore)
    }
    if (!viralProductsRes.error) {
      payload.viralProducts = (viralProductsRes.data || []).map(mapMarketplaceProduct)
    }
    if (!hubsRes.error) {
      payload.hubs = (hubsRes.data || []).map(mapMarketplaceHub)
    }
    if (!feedRes.error) {
      payload.forYou = (feedRes.data || []).map(mapMarketplaceFeedEntry)
    }

    return payload
  }

  const payload = await getOrReconstruct(
    q || tags.length ? cacheKeys.marketplaceLandingSearch(queryKey) : cacheKeys.marketplaceLanding(),
    q ? 30 : 60,
    q ? 120 : 120,
    loadLanding,
  )

  setHeader(
    event,
    'Cache-Control',
    q
      ? 'public, max-age=30, s-maxage=60, stale-while-revalidate=120'
      : 'public, max-age=60, s-maxage=120, stale-while-revalidate=120',
  )
  return payload
})
