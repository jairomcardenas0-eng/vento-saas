<template>
  <template v-if="storefront">
    <StorefrontClassic v-if="layout === 'classic'" :storefront="storefront" :slug-key="slugKey" />
    <StorefrontList v-else-if="layout === 'list'" :storefront="storefront" :slug-key="slugKey" />
    <StorefrontSaas v-else :storefront="storefront" :slug-key="slugKey" />
  </template>

  <template v-else>
    <section v-if="status === 'success' || status === 'error'" class="flex min-h-screen flex-col items-center justify-center bg-white px-6 text-stone-900 dark:bg-slate-950 dark:text-white">
      <div class="flex max-w-sm flex-col items-center text-center">
        <div class="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-rose-50 text-rose-500 dark:bg-rose-500/10 dark:text-rose-400">
          <svg class="h-10 w-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        </div>
        <h1 class="text-2xl font-bold tracking-tight">Catálogo no encontrado</h1>
        <p class="mt-3 text-sm leading-relaxed text-stone-500 dark:text-slate-400">El escaparate que buscas no está disponible o la dirección es incorrecta.</p>
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
        <p class="mt-3 max-w-[280px] text-sm text-stone-500 dark:text-slate-400">Optimizando catálogo, imágenes y disponibilidad en tiempo real.</p>
      </div>
    </section>
  </template>
</template>

<script setup lang="ts">
import { defaultSettings, defaultTheme } from '~/data/defaults'
import type { StorefrontPayload } from '~/composables/useStorefrontExperience'
import type { CategoryItem, ProductItem } from '~/stores/catalog'

const route = useRoute()
// Normalizar el slug que viene de la URL: trim, lowercase, espacios → guiones
const slugKey = computed(() => {
  const raw = String(route.params.slug || '')
  const normalized = raw.trim().toLowerCase().replace(/\s+/g, '-')
  if (import.meta.client && raw !== normalized) {
    console.warn(`[slug] Normalización aplicada: "${raw}" → "${normalized}"`)
  }
  return normalized
})
const backend = useSupabaseBackend()
const analytics = useAnalytics()

const mapCategory = (category: any): CategoryItem => ({
  id: category.id,
  name: category.name,
  description: category.note || '',
  sortOrder: category.order,
})

const mapProduct = (product: any): ProductItem => ({
  id: product.id,
  categoryId: product.categoryId,
  name: product.name,
  description: product.description,
  basePrice: product.price,
  imageUrl: product.image || null,
  imageUrls: product.images?.length
    ? [...product.images.slice(0, 3), ...Array.from({ length: Math.max(0, 3 - product.images.length) }, () => null)]
    : [null, null, null],
  isActive: product.active,
  variants: (product.variants || []).map((group: any, groupIndex: number) => ({
    id: `${product.id}-group-${groupIndex}`,
    groupName: group.group,
    type: group.selection,
    options: (group.options || []).map((option: any, optionIndex: number) => ({
      id: `${product.id}-group-${groupIndex}-option-${optionIndex}`,
      name: option.name,
      priceDelta: option.price,
      isRequired: group.required,
    })),
  })),
  hasPromo: product.salePrice !== null && product.salePrice !== undefined,
  promoPrice: product.salePrice,
  sortOrder: product.order,
  offerLabel: product.offerLabel || '',
  offerLabelPosition: product.offerPosition || 'image',
  timerHours: product.timerHours ?? null,
  timerPosition: product.timerPosition || 'image-right',
  timerShowMinutes: product.timerShowMinutes ?? true,
  timerShowSeconds: product.timerShowSeconds ?? false,
  timerLinkSale: product.timerLinkSale ?? false,
  carouselEnabled: product.carouselEnabled ?? false,
  carouselIntervalSeconds: product.carouselIntervalSeconds ?? 3,
  tags: product.tags || [],
  productRating: Number(product.productRating || 0),
  productRatingCount: Number(product.productRatingCount || 0),
  createdAt: null,
  updatedAt: null,
})

const { data, status } = await useAsyncData<StorefrontPayload | null>(
  `storefront-${slugKey.value}`,
  async () => {
    if (!slugKey.value) {
      return null
    }

    const catalog = await backend.getCatalogBySlug(slugKey.value)
    if (!catalog) {
      return null
    }

    const coupons = (await backend.getCoupons(catalog.id)).filter((coupon) => coupon.visiblePublicly && coupon.active)

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
      categories: catalog.categories
        .filter((category) => category.active)
        .sort((left, right) => left.order - right.order)
        .map(mapCategory),
      products: catalog.products
        .filter((product) => product.active)
        .sort((left, right) => left.order - right.order)
        .map(mapProduct),
      reviews: catalog.reviews,
      coupons,
    }
  },
  {
    default: () => null,
    watch: [slugKey],
    server: false,
    lazy: true,
  },
)

const storefront = computed(() => data.value)
const layout = computed(() => storefront.value?.settings.storefrontLayout ?? 'classic')

// Analítica: watch en lugar de onMounted para capturar cuando el fetch
// termina después del montaje (lazy: true + server: false).
const analyticsTracked = ref(false)
watch(storefront, (value) => {
  if (value && !analyticsTracked.value) {
    analyticsTracked.value = true
    analytics.trackPageView(value.id, `/b/${value.slug}`)
  }
}, { immediate: true })
</script>
