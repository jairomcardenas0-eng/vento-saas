<template>
  <div class="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(253,224,71,0.16),_transparent_30%),linear-gradient(180deg,_#fffaf2_0%,_#fff 44%,_#fff7ed_100%)] text-stone-950 dark:bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.12),_transparent_26%),linear-gradient(180deg,_#020617_0%,_#0f172a_55%,_#111827_100%)] dark:text-white">
    <div class="mx-auto flex min-h-screen w-full max-w-[430px] flex-col px-4 pb-10 pt-4">
      <header class="sticky top-0 z-40 -mx-1 mb-5 px-1 pt-safe">
        <div class="header-card">
          <div class="flex items-start justify-between gap-4">
            <div class="min-w-0">
              <h1 class="text-[1.9rem] font-serif leading-none text-stone-950 dark:text-white">Pide facil en tu ciudad</h1>
              <p class="mt-2 text-sm text-stone-500 dark:text-slate-400">{{ coverageLabel }}</p>
            </div>
            <button
              type="button"
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-stone-200 text-stone-600 transition active:scale-95 dark:border-white/10 dark:text-slate-300"
              :title="colorMode.preference === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'"
              @click="toggleColorMode"
            >
              <svg v-if="colorMode.preference === 'dark'" class="h-[18px] w-[18px] text-amber-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="5" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42m12.72-12.72l1.42-1.42" />
              </svg>
              <svg v-else class="h-[18px] w-[18px] text-slate-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
              </svg>
            </button>
          </div>

          <button
            type="button"
            class="mt-4 flex h-[52px] w-full items-center gap-3 rounded-full bg-stone-950 px-4 text-left text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] active:scale-[0.99] dark:bg-white dark:text-stone-950"
            @click="openSearch"
          >
            <span class="text-base opacity-55">Search</span>
            <span class="min-w-0 flex-1 truncate text-sm font-medium">
              {{ activeQuery || 'Busca restaurantes, platos o categorias' }}
            </span>
          </button>
        </div>
      </header>

      <section class="mb-6">
        <div class="flex items-end justify-between gap-4">
          <div>
            <p class="text-[11px] uppercase tracking-[0.28em] text-stone-500 dark:text-slate-400">Categorias</p>
            <h2 class="mt-1 text-2xl font-semibold leading-tight">{{ activeQuery ? `Resultados para ${activeQuery}` : 'Explora lo que mas se vende' }}</h2>
          </div>
          <button
            v-if="activeQuery"
            type="button"
            class="rounded-full border border-stone-300 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-600 active:scale-95 dark:border-white/10 dark:text-slate-300"
            @click="clearFilters"
          >
            Limpiar
          </button>
        </div>
        <p class="mt-2 text-sm leading-6 text-stone-600 dark:text-slate-300">
          Tiendas activas, productos con movimiento y categorias reales tomadas del marketplace.
        </p>

        <div class="mt-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none]">
          <button
            v-for="chip in categoryChips"
            :key="chip"
            type="button"
            class="shrink-0 rounded-full border px-4 py-2 text-xs font-semibold capitalize transition active:scale-95"
            :class="chip === activeQuery
              ? 'border-stone-950 bg-stone-950 text-white dark:border-white dark:bg-white dark:text-stone-950'
              : 'border-stone-300 bg-white/90 text-stone-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200'"
            @click="selectChip(chip)"
          >
            {{ chip }}
          </button>
        </div>
      </section>

      <section v-if="errorMessage" class="mb-5 rounded-[24px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
        {{ errorMessage }}
      </section>

      <section v-if="pending && !hasAnyContent" class="space-y-4">
        <div v-for="item in 4" :key="`home-skeleton-${item}`" class="animate-pulse overflow-hidden rounded-[28px] border border-stone-200/80 bg-white/80 dark:border-white/10 dark:bg-white/5">
          <div class="aspect-[1.18] bg-stone-200 dark:bg-slate-800" />
          <div class="space-y-3 p-4">
            <div class="h-4 w-2/3 rounded-full bg-stone-200 dark:bg-slate-800" />
            <div class="h-3 w-1/2 rounded-full bg-stone-200 dark:bg-slate-800" />
          </div>
        </div>
      </section>

      <template v-else>
        <section v-if="topStores.length" class="mb-7">
          <div class="mb-3 flex items-end justify-between">
            <div>
              <p class="text-[11px] uppercase tracking-[0.28em] text-stone-500 dark:text-slate-400">Tiendas</p>
              <h2 class="text-xl font-semibold">Tiendas destacadas</h2>
            </div>
            <span class="text-xs text-stone-500 dark:text-slate-400">{{ topStores.length }} activas</span>
          </div>

          <div class="flex gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none]">
            <NuxtLink
              v-for="store in topStores"
              :key="store.id"
              :to="`/b/${store.slug}`"
              class="w-[146px] shrink-0 overflow-hidden rounded-[24px] border border-white/70 bg-white/92 p-2.5 shadow-[0_18px_40px_-26px_rgba(15,23,42,0.32)] transition-transform active:scale-[0.99] dark:border-white/10 dark:bg-slate-900/75"
            >
              <div class="flex flex-col text-center">
                <div class="relative mb-2 flex aspect-square w-full items-center justify-center overflow-hidden rounded-[18px] border border-white/70 bg-stone-100 shadow-[0_12px_22px_-18px_rgba(15,23,42,0.42)] dark:border-white/10 dark:bg-slate-900">
                  <img :src="store.logoUrl || store.coverImage" :alt="store.businessName" class="h-full w-full object-cover" loading="lazy" decoding="async">
                </div>

                <p class="line-clamp-1 w-full text-[12px] font-semibold leading-tight text-stone-900 dark:text-slate-100">{{ store.businessName }}</p>
                <p class="mt-0.5 line-clamp-1 w-full text-[10px] leading-4 text-stone-500 dark:text-slate-400">
                  {{ store.city || 'Disponible en marketplace' }}
                </p>
              </div>

              <div class="mt-2 flex items-center justify-between gap-2 border-t border-stone-100 pt-2.5 dark:border-white/10">
                <div class="min-w-0">
                  <p class="truncate text-[10px] font-medium text-stone-800 dark:text-slate-100">{{ store.businessTypes.join(' · ') || 'Tienda local' }}</p>
                  <p class="mt-0.5 text-[10px] text-stone-500 dark:text-slate-400">{{ store.activeProducts }} productos</p>
                </div>
                <span class="shrink-0 rounded-full bg-stone-950 px-2.5 py-1.5 text-[10px] font-semibold text-white dark:bg-white dark:text-slate-950">Ver</span>
              </div>
            </NuxtLink>
          </div>
        </section>

        <section v-if="featuredProducts.length" class="mb-7">
          <div class="mb-3 flex items-end justify-between">
            <div>
              <p class="text-[11px] uppercase tracking-[0.28em] text-stone-500 dark:text-slate-400">Productos</p>
              <h2 class="text-xl font-semibold">Populares hoy</h2>
            </div>
            <span class="text-xs text-stone-500 dark:text-slate-400">{{ featuredProducts.length }} visibles</span>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <NuxtLink
              v-for="product in featuredProducts"
              :key="`${product.catalogSlug}-${product.productId}`"
              :to="`/b/${product.catalogSlug}`"
              class="overflow-hidden rounded-[26px] border border-white/70 bg-white/92 shadow-[0_20px_48px_-30px_rgba(15,23,42,0.34)] active:scale-[0.99] dark:border-white/10 dark:bg-slate-900/75"
            >
              <div class="aspect-square overflow-hidden bg-stone-100 dark:bg-slate-900">
                <img :src="product.imageUrl" :alt="product.productName" class="h-full w-full object-cover" loading="lazy" decoding="async">
              </div>
              <div class="space-y-2 p-3">
                <p class="line-clamp-2 text-sm font-semibold text-stone-900 dark:text-slate-100">{{ product.productName }}</p>
                <p class="truncate text-xs text-stone-500 dark:text-slate-400">{{ product.businessName }}</p>
                <div class="flex items-end justify-between gap-2">
                  <strong class="text-base text-stone-950 dark:text-white">{{ money(product.promoPrice ?? product.price) }}</strong>
                  <span class="text-[11px] text-stone-500 dark:text-slate-400">{{ product.orderCount }} ventas</span>
                </div>
              </div>
            </NuxtLink>
          </div>
        </section>

        <section v-if="feedItems.length" class="mb-7">
          <div class="mb-3 flex items-end justify-between">
            <div>
              <p class="text-[11px] uppercase tracking-[0.28em] text-stone-500 dark:text-slate-400">Recomendados</p>
              <h2 class="text-xl font-semibold">Para ti</h2>
            </div>
            <span class="text-xs text-stone-500 dark:text-slate-400">{{ feedItems.length }} hallazgos</span>
          </div>

          <div class="space-y-4">
            <NuxtLink
              v-for="item in feedItems"
              :key="`${item.slug}-${item.productId}`"
              :to="`/b/${item.slug}`"
              class="block overflow-hidden rounded-[30px] border border-white/70 bg-white/92 shadow-[0_22px_60px_-34px_rgba(15,23,42,0.42)] active:scale-[0.995] dark:border-white/10 dark:bg-slate-900/78"
            >
              <div class="relative aspect-[1.16] overflow-hidden bg-stone-100 dark:bg-slate-950">
                <img :src="item.productImageUrl || item.coverImage" :alt="item.productName" class="h-full w-full object-cover" loading="lazy" decoding="async">
                <div class="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
                <div class="absolute inset-x-0 bottom-0 p-4 text-white">
                  <div class="mb-2 flex items-center gap-3">
                    <img :src="item.logoUrl || item.coverImage" :alt="item.businessName" class="h-10 w-10 rounded-full border border-white/35 object-cover" loading="lazy" decoding="async">
                    <div class="min-w-0">
                      <p class="truncate text-sm font-semibold">{{ item.businessName }}</p>
                      <p class="truncate text-[11px] text-white/75">{{ item.businessTypes.join(' · ') || 'Negocio local' }}</p>
                    </div>
                  </div>
                  <p class="max-w-[85%] text-2xl font-semibold leading-tight">{{ item.productName }}</p>
                </div>
              </div>
              <div class="space-y-3 p-4">
                <p class="line-clamp-2 text-sm leading-6 text-stone-600 dark:text-slate-300">{{ item.productDescription || item.tagline || 'Disponible para pedir ahora mismo.' }}</p>
                <div class="flex flex-wrap gap-2">
                  <span
                    v-for="tag in item.matchedTags.slice(0, 3)"
                    :key="`${item.productId}-${tag}`"
                    class="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold text-amber-800 dark:bg-cyan-500/15 dark:text-cyan-200"
                  >
                    {{ tag }}
                  </span>
                </div>
                <div class="flex items-end justify-between gap-3">
                  <div>
                    <p class="text-[11px] uppercase tracking-[0.22em] text-stone-400 dark:text-slate-500">Desde</p>
                    <p class="text-2xl font-semibold">{{ money(item.promoPrice ?? item.price) }}</p>
                  </div>
                  <div class="text-right text-[11px] text-stone-500 dark:text-slate-400">
                    <p>{{ item.orderCount }} ventas</p>
                    <p>{{ item.recentVisits }} vistas</p>
                  </div>
                </div>
              </div>
            </NuxtLink>
          </div>
        </section>

        <section v-if="hubs.length" class="mb-8">
          <div class="mb-3">
            <p class="text-[11px] uppercase tracking-[0.28em] text-stone-500 dark:text-slate-400">Zonas</p>
            <h2 class="text-xl font-semibold">Cerca de ti</h2>
          </div>

          <div class="space-y-3">
            <NuxtLink
              v-for="hub in hubs"
              :key="hub.regionKey"
              :to="hub.sampleStoreSlug ? `/b/${hub.sampleStoreSlug}` : '/catalogos'"
              class="relative block overflow-hidden rounded-[28px] border border-white/70 bg-stone-950 text-white shadow-[0_20px_60px_-34px_rgba(15,23,42,0.68)] active:scale-[0.99] dark:border-white/10"
            >
              <div class="absolute inset-0">
                <img :src="hub.sampleImageUrl" :alt="hub.regionLabel" class="h-full w-full object-cover opacity-40" loading="lazy" decoding="async">
              </div>
              <div class="relative px-4 py-5">
                <p class="text-[11px] uppercase tracking-[0.3em] text-cyan-200">{{ hub.city || 'Zona activa' }}</p>
                <h3 class="mt-2 text-2xl font-semibold">{{ hub.regionLabel }}</h3>
                <div class="mt-4 flex flex-wrap gap-2 text-[11px] text-white/80">
                  <span class="rounded-full bg-white/12 px-3 py-1">{{ hub.storeCount }} tiendas</span>
                  <span class="rounded-full bg-white/12 px-3 py-1">{{ hub.activeProducts }} productos</span>
                </div>
              </div>
            </NuxtLink>
          </div>
        </section>

        <section v-if="!hasAnyContent" class="rounded-[28px] border border-dashed border-stone-300 bg-white/70 px-5 py-10 text-center text-sm text-stone-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
          No encontramos resultados con los filtros actuales.
        </section>

        <footer class="mt-auto overflow-hidden rounded-[34px] border border-stone-900/10 bg-[linear-gradient(180deg,_#1c1917_0%,_#0f172a_100%)] text-white shadow-[0_32px_90px_-40px_rgba(2,6,23,0.95)]">
          <div class="px-5 py-6">
            <p class="text-[11px] uppercase tracking-[0.34em] text-cyan-300">Para comercios</p>
            <h2 class="mt-3 text-3xl font-semibold leading-tight">Digitaliza tu negocio y empieza a vender desde una sola app.</h2>
            <p class="mt-3 text-sm leading-6 text-white/70">
              Crea tu catalogo, publica productos con imagen y recibe pedidos en tiempo real.
            </p>
            <div class="mt-5 flex gap-3">
              <NuxtLink to="/register" class="flex-1 rounded-full bg-white px-4 py-3 text-center text-sm font-semibold text-stone-950 active:scale-95">
                Crear tienda
              </NuxtLink>
              <NuxtLink to="/login" class="flex-1 rounded-full border border-white/15 bg-white/5 px-4 py-3 text-center text-sm font-semibold text-white active:scale-95">
                Ingresar
              </NuxtLink>
            </div>
          </div>
        </footer>
      </template>
    </div>

    <Transition
      enter-active-class="duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="isSearchOpen" class="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-sm" @click.self="closeSearch">
        <div class="mx-auto flex min-h-screen w-full max-w-[430px] flex-col px-4 pb-6 pt-6">
          <div class="rounded-[32px] border border-white/10 bg-stone-950 p-4 text-white shadow-[0_28px_90px_-30px_rgba(0,0,0,0.75)]">
            <div class="mb-4 flex items-center gap-3">
              <div class="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-xs font-semibold uppercase tracking-[0.18em]">Buscar</div>
              <input
                ref="searchInput"
                v-model="searchDraft"
                type="search"
                inputmode="search"
                placeholder="Escribe una tienda, plato o categoria"
                class="h-12 w-full rounded-full border border-white/10 bg-white/10 px-4 text-sm outline-none placeholder:text-white/40"
                @keydown.enter.prevent="commitSearch(searchDraft)"
              >
            </div>

            <div class="mb-4 flex items-center justify-between">
              <p class="text-[11px] uppercase tracking-[0.28em] text-white/50">Sugerencias</p>
              <button type="button" class="text-xs text-white/70 active:scale-95" @click="closeSearch">Cerrar</button>
            </div>

            <div class="space-y-2">
              <button
                v-for="chip in categoryChips.slice(0, 6)"
                :key="`search-${chip}`"
                type="button"
                class="flex w-full items-center justify-between rounded-[22px] border border-white/10 bg-white/5 px-4 py-3 text-left active:scale-95"
                @click="commitSearch(chip)"
              >
                <span class="truncate text-sm capitalize">{{ chip }}</span>
                <span class="text-white/40">Ir</span>
              </button>
              <button
                v-if="searchDraft.trim()"
                type="button"
                class="mt-3 flex w-full items-center justify-center rounded-full bg-amber-400 px-4 py-3 text-sm font-semibold text-stone-950 active:scale-95 dark:bg-cyan-300"
                @click="commitSearch(searchDraft)"
              >
                Buscar "{{ searchDraft.trim() }}"
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import type {
  MarketplaceFeedEntry,
  MarketplaceHub,
  MarketplaceLandingPayload,
  MarketplaceProductCard,
  MarketplaceStoreCard,
} from '~/types/catalog'

definePageMeta({
  pageTransition: false,
})

const searchInput = useTemplateRef<HTMLInputElement>('searchInput')
const isSearchOpen = ref(false)
const searchDraft = ref('')
const searchQuery = ref('')
const colorMode = useColorMode()

const toggleColorMode = () => {
  colorMode.preference = colorMode.preference === 'dark' ? 'light' : 'dark'
}

const emptyPayload = (): MarketplaceLandingPayload => ({
  topStores: [],
  viralProducts: [],
  hubs: [],
  forYou: [],
})

const activeQuery = computed(() => searchQuery.value.trim().toLowerCase())

const {
  data: landing,
  pending,
  error,
  refresh,
} = await useAsyncData(
  'marketplace-home',
  () => $fetch<MarketplaceLandingPayload>('/api/marketplace/landing', {
    query: activeQuery.value ? { q: activeQuery.value } : undefined,
  }),
  {
    default: emptyPayload,
    watch: [activeQuery],
  },
)

const reloadLanding = () => refresh()

const payload = computed(() => landing.value || emptyPayload())
const topStores = computed<MarketplaceStoreCard[]>(() => payload.value.topStores || [])
const viralProducts = computed<MarketplaceProductCard[]>(() => payload.value.viralProducts || [])
const hubs = computed<MarketplaceHub[]>(() => payload.value.hubs || [])
const feedItems = computed<MarketplaceFeedEntry[]>(() => payload.value.forYou || [])
const featuredProducts = computed(() => {
  if (viralProducts.value.length) {
    return viralProducts.value.slice(0, 6)
  }

  return feedItems.value.slice(0, 6).map(item => ({
    catalogId: item.catalogId,
    catalogSlug: item.slug,
    productId: item.productId,
    productName: item.productName,
    description: item.productDescription,
    imageUrl: item.productImageUrl || item.coverImage,
    price: item.price,
    promoPrice: item.promoPrice,
    orderCount: item.orderCount,
    rating: item.productRating,
    tags: item.matchedTags,
    businessName: item.businessName,
    businessType: item.businessTypes[0] || '',
    logoUrl: item.logoUrl,
    city: item.city,
    score: item.relevanceScore,
  }))
})

const hasAnyContent = computed(() =>
  topStores.value.length > 0
  || featuredProducts.value.length > 0
  || feedItems.value.length > 0
  || hubs.value.length > 0,
)

const coverageLabel = computed(() => {
  const detectedCity = landing.value?.detectedCity
  const firstHub = hubs.value[0]
  const storeCount = topStores.value.length || firstHub?.storeCount || 0

  if (detectedCity) {
    return `${storeCount} tiendas activas en ${detectedCity}`
  }

  if (!firstHub) {
    return 'Marketplace activo con tiendas disponibles'
  }

  return `${firstHub.storeCount} tiendas activas en ${firstHub.city || firstHub.regionLabel}`
})

useSeoMeta(() => {
  const detectedCity = landing.value?.detectedCity
  const firstHub = hubs.value[0]
  const city = detectedCity || firstHub?.city || firstHub?.regionLabel || 'tu ciudad'
  const storeCount = topStores.value.length || firstHub?.storeCount || 0
  const title = storeCount > 0
    ? `Vento Marketplace — ${storeCount} tiendas activas en ${city}`
    : 'Vento Marketplace — Descubre tiendas locales y productos destacados'
  const description = `Explora ${storeCount} tiendas activas, productos populares y envía tu pedido directo por WhatsApp en ${city}.`
  const image = topStores.value[0]?.logoUrl || topStores.value[0]?.coverImage || ''

  return {
    title,
    ogTitle: title,
    description,
    ogDescription: description,
    ogImage: image || undefined,
    ogUrl: 'https://vento.smartiadigital.com',
    twitterCard: 'summary_large_image',
    twitterTitle: title,
    twitterDescription: description,
    twitterImage: image || undefined,
  }
})

const categoryChips = computed(() => {
  const values = new Set<string>()

  topStores.value.forEach(store => {
    store.businessTypes.forEach(type => {
      const cleaned = String(type || '').trim().toLowerCase()
      if (cleaned) values.add(cleaned)
    })
  })

  featuredProducts.value.forEach(product => {
    product.tags.forEach(tag => {
      const cleaned = String(tag || '').trim().toLowerCase()
      if (cleaned) values.add(cleaned)
    })
    const businessType = String(product.businessType || '').trim().toLowerCase()
    if (businessType) values.add(businessType)
  })

  const result = [...values].filter(value => value.length >= 3).slice(0, 8)
  return result.length ? result : ['restaurantes', 'bebidas', 'combos', 'postres']
})

const errorMessage = computed(() => {
  if (!error.value) {
    return ''
  }

  return 'No se pudo cargar el marketplace completo. Mostramos lo disponible.'
})

const currencyFormatterCache = new Map<string, Intl.NumberFormat>()
const money = (value: number, currency = 'MXN') => {
  if (!currencyFormatterCache.has(currency)) {
    currencyFormatterCache.set(currency, new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }))
  }

  return currencyFormatterCache.get(currency)!.format(value || 0)
}

const openSearch = async () => {
  isSearchOpen.value = true
  searchDraft.value = searchQuery.value
  await nextTick()
  searchInput.value?.focus()
}

const closeSearch = () => {
  isSearchOpen.value = false
}

const commitSearch = async (value: string) => {
  searchQuery.value = value.trim()
  closeSearch()
}

const clearFilters = async () => {
  searchQuery.value = ''
  searchDraft.value = ''
  await refresh()
}

const selectChip = async (chip: string) => {
  if (activeQuery.value === chip) {
    await clearFilters()
    return
  }

  searchQuery.value = chip
}
</script>
