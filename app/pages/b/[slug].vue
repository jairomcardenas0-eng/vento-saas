<template>
  <template v-if="storefront">
    <div ref="pageRoot">
    <div
      v-if="offlineFallbackActive"
      class="sticky top-0 z-[70] flex items-center justify-center bg-amber-100 px-4 py-2 text-center text-xs font-medium text-amber-900 dark:bg-amber-500/15 dark:text-amber-100"
    >
      Mostrando una copia guardada del catalogo porque la red fallo.
    </div>
    <StorefrontClassic v-if="layout === 'classic'" :storefront="storefront" :slug-key="slugKey" />
    <StorefrontList v-else-if="layout === 'list'" :storefront="storefront" :slug-key="slugKey" />
    <StorefrontShop v-else-if="layout === 'store'" :storefront="storefront" :slug-key="slugKey" />
    <StorefrontSaas v-else :storefront="storefront" :slug-key="slugKey" />
    </div>
  </template>

  <template v-else>
    <section v-if="status === 'success' || status === 'error'" class="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-stone-900 dark:bg-slate-950 dark:text-white">
      <div class="flex max-w-sm flex-col items-center text-center">
        <div class="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-rose-50 text-rose-500 dark:bg-rose-500/10 dark:text-rose-400">
          <svg class="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        </div>
        <h1 class="text-2xl font-bold tracking-tight">Catalogo no encontrado</h1>
        <p class="mt-3 text-sm leading-relaxed text-stone-500 dark:text-slate-400">El escaparate que buscas no esta disponible o la direccion es incorrecta.</p>
        <NuxtLink to="/catalogos" class="mt-8 flex w-full items-center justify-center rounded-full bg-stone-900 px-6 py-3.5 text-sm font-semibold text-white transition active:scale-95 dark:bg-white dark:text-stone-950">
          Explorar el Marketplace
        </NuxtLink>
      </div>
    </section>

    <section v-else class="flex min-h-screen flex-col items-center justify-center bg-white text-stone-900 dark:bg-slate-950 dark:text-white">
      <div class="flex flex-col items-center text-center">
        <div class="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-stone-100 shadow-inner dark:bg-white/5">
          <div class="h-8 w-8 animate-spin rounded-full border-[3px] border-stone-200 border-t-stone-800 dark:border-white/10 dark:border-t-cyan-400"></div>
        </div>
        <h1 class="text-xl font-semibold tracking-tight">Preparando experiencia</h1>
        <p class="mt-3 max-w-[280px] text-sm text-stone-500 dark:text-slate-400">Optimizando catalogo, imagenes y disponibilidad en tiempo real.</p>
      </div>
    </section>
  </template>
</template>

<script setup lang="ts">
import type { StorefrontPayload } from '~/composables/useStorefrontExperience'

const route = useRoute()
const storefrontCache = useStorefrontCache()
const catalogCache = useCatalogCache<StorefrontPayload>()
const dataSaver = useDataSaver()
const memoryManager = useMemoryManager()
const offlineFallbackActive = ref(false)
const nuxtApp = useNuxtApp()
const $supabase = nuxtApp.$supabase as any
const storefrontChannel = ref<any>(null)
const pageRoot = ref<HTMLElement | null>(null)
let storefrontRefreshTimer: ReturnType<typeof setInterval> | null = null
let storefrontVisibilityCleanup: (() => void) | null = null

if (import.meta.client) {
  storefrontCache.hydrateFromStorage()
}

const slugKey = computed(() => {
  const raw = String(route.params.slug || '')
  const normalized = raw.trim().toLowerCase().replace(/\s+/g, '-')
  if (import.meta.client && raw !== normalized) {
    console.warn(`[slug] Normalizacion aplicada: "${raw}" -> "${normalized}"`)
  }
  return normalized
})

const analytics = useAnalytics()
const initialOfflineSnapshot = import.meta.client
  ? await catalogCache.read(slugKey.value)
  : { payload: null, stale: true, entry: null }

const { data, status } = await useAsyncData<StorefrontPayload | null>(
  `storefront-${slugKey.value}`,
  async () => {
    if (!slugKey.value) {
      return null
    }

    try {
      const payload = await $fetch<StorefrontPayload>(`/api/storefront/${slugKey.value}`)
      offlineFallbackActive.value = false
      storefrontCache.write(slugKey.value, payload)
      await catalogCache.write(slugKey.value, payload)
      return payload
    } catch (error) {
      const offlineCatalog = await catalogCache.read(slugKey.value)
      const fallbackPayload = offlineCatalog.payload || storefrontCache.read(slugKey.value)
      if (fallbackPayload) {
        offlineFallbackActive.value = true
        return fallbackPayload
      }

      offlineFallbackActive.value = false
      throw error
    }
  },
  {
    default: () => initialOfflineSnapshot.payload || storefrontCache.read(slugKey.value),
    watch: [slugKey],
    server: true,
    lazy: false,
  },
)

const storefront = computed(() => data.value)
const layout = computed(() => storefront.value?.settings.storefrontLayout ?? 'classic')

useSeoMeta(() => {
  const s = storefront.value
  if (!s) return {}

  const title = s.settings.businessName || s.settings.storeHeaderName || 'Vento Marketplace'
  const description = s.settings.tagline || s.settings.storeHeroDescription || `Explora productos y envía tu pedido en segundos.`
  const image = s.settings.logoUrl || s.settings.coverImage || s.settings.storeHeroBackgroundImage || ''
  const url = `https://vento.smartiadigital.com/b/${slugKey.value}`

  return {
    title,
    ogTitle: title,
    description,
    ogDescription: description,
    ogImage: image || undefined,
    ogUrl: url,
    twitterCard: 'summary_large_image',
    twitterTitle: title,
    twitterDescription: description,
    twitterImage: image || undefined,
  }
})

const refreshStorefront = async () => {
  if (!slugKey.value) {
    return
  }

  try {
    const payload = await $fetch<StorefrontPayload>(`/api/storefront/${slugKey.value}`)
    data.value = payload
    storefrontCache.write(slugKey.value, payload)
    await catalogCache.write(slugKey.value, payload)
    offlineFallbackActive.value = false
  } catch (error) {
    console.warn('Storefront refresh failed', error)
  }
}

const stopStorefrontLiveSync = () => {
  if (storefrontRefreshTimer) {
    clearInterval(storefrontRefreshTimer)
    storefrontRefreshTimer = null
  }

  storefrontVisibilityCleanup?.()
  storefrontVisibilityCleanup = null

  if (storefrontChannel.value) {
    void $supabase.removeChannel(storefrontChannel.value)
    storefrontChannel.value = null
  }
}

const startStorefrontLiveSync = (catalogId: string) => {
  if (import.meta.server || !catalogId) {
    return
  }

  stopStorefrontLiveSync()
  storefrontVisibilityCleanup?.()
  storefrontVisibilityCleanup = null

  const refresh = () => {
    void refreshStorefront()
  }

  storefrontChannel.value = $supabase
    .channel(`storefront-live:${catalogId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'catalogs', filter: `id=eq.${catalogId}` }, refresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'categories', filter: `catalog_id=eq.${catalogId}` }, refresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'products', filter: `catalog_id=eq.${catalogId}` }, refresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews', filter: `catalog_id=eq.${catalogId}` }, refresh)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'coupons', filter: `catalog_id=eq.${catalogId}` }, refresh)
    .subscribe()

  const scheduleTimer = () => {
    if (storefrontRefreshTimer) {
      clearInterval(storefrontRefreshTimer)
    }

    storefrontRefreshTimer = setInterval(() => {
      if (!document.hidden) {
        void refreshStorefront()
      }
    }, dataSaver.realtimeIntervalMs.value)
  }

  const visibilityHandler = () => {
    if (document.hidden) {
      if (storefrontRefreshTimer) {
        clearInterval(storefrontRefreshTimer)
        storefrontRefreshTimer = null
      }
      return
    }

    void refreshStorefront()
    scheduleTimer()
  }

  document.addEventListener('visibilitychange', visibilityHandler)
  storefrontVisibilityCleanup = () => {
    document.removeEventListener('visibilitychange', visibilityHandler)
  }

  scheduleTimer()
}

watch(slugKey, () => {
  offlineFallbackActive.value = false
  analyticsTracked.value = false
  stopStorefrontLiveSync()
})

const analyticsTracked = ref(false)
watch(storefront, (value) => {
  if (value && !analyticsTracked.value) {
    analyticsTracked.value = true
    analytics.trackPageView(value.id, `/b/${value.slug}`)
  }

  if (value?.id) {
    startStorefrontLiveSync(value.id)
  }
}, { immediate: true })

watch(() => dataSaver.realtimeIntervalMs.value, () => {
  if (storefront.value?.id) {
    startStorefrontLiveSync(storefront.value.id)
  }
})

if (import.meta.client) {
  useTouchGestures(pageRoot, {
    onPullRefresh: refreshStorefront,
    pullThreshold: 64,
  })
}

onUnmounted(() => {
  stopStorefrontLiveSync()
  storefrontVisibilityCleanup?.()
})

memoryManager.registerCleanup(() => {
  stopStorefrontLiveSync()
  storefrontVisibilityCleanup?.()
})

// Dynamic manifest.json for PWA
useHead(() => ({
  link: [
    {
      rel: 'manifest',
      href: `/api/manifest/${slugKey.value}`,
    },
  ],
}))
</script>
