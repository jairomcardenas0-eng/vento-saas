<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="previewStore.open"
        class="fixed inset-0 z-[100] flex flex-col bg-black/70"
        @click.self="previewStore.closePreview()"
      >
        <!-- Header -->
        <div class="flex items-center justify-between gap-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4 py-3 shadow-sm">
          <div class="flex items-center gap-2">
            <svg class="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <div>
              <p class="text-sm font-bold text-zinc-900 dark:text-zinc-100">Vista previa en vivo</p>
              <p class="text-[11px] text-zinc-500 dark:text-zinc-400">Cambios sin publicar · Así verán los clientes tu tienda</p>
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button class="ghost-btn small !min-h-[36px]" type="button" @click="previewMode = previewMode === 'mobile' ? 'desktop' : 'mobile'">
              {{ previewMode === 'mobile' ? 'Móvil' : 'Desktop' }}
            </button>
            <button
              class="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
              @click="previewStore.closePreview()"
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        <!-- Storefront preview -->
        <div class="flex-1 overflow-y-auto bg-zinc-100 dark:bg-zinc-950">
          <div v-if="!previewPayload" class="flex h-full items-center justify-center p-8 text-center">
            <p class="text-zinc-500">Selecciona un catálogo activo para ver la vista previa.</p>
          </div>
          <div
            v-else
            class="mx-auto min-h-full bg-white transition-[width,max-width] duration-200 dark:bg-zinc-950"
            :class="previewMode === 'mobile' ? 'max-w-[375px]' : 'w-full max-w-[1280px]'"
          >
            <StorefrontClassic v-if="layout === 'classic'" :storefront="previewPayload" :slug-key="previewPayload.slug" />
            <StorefrontList v-else-if="layout === 'list'" :storefront="previewPayload" :slug-key="previewPayload.slug" />
            <StorefrontShop v-else-if="layout === 'store'" :storefront="previewPayload" :slug-key="previewPayload.slug" />
            <StorefrontSaas v-else :storefront="previewPayload" :slug-key="previewPayload.slug" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import type { StorefrontPayload } from '~/composables/useStorefrontExperience'
import type { CatalogCategory, CatalogProduct, ProductVariantGroup, ProductVariantOption } from '~/types/catalog'
import type { CategoryItem, ProductItem } from '~/stores/catalog'
import { defaultSettings } from '~/data/defaults'

const previewStore = usePreviewStore()
const catalogStore = useCatalogStore()
const catalogEngine = useCatalogEngineStore()

const catalog = computed(() => catalogStore.activeCatalog)
const previewMode = ref<'mobile' | 'desktop'>('mobile')

// Lock body scroll when preview is open
watch(() => previewStore.open, (isOpen) => {
  if (import.meta.client) {
    document.body.style.overflow = isOpen ? 'hidden' : ''
  }
})

type PreviewCategoryLike = CategoryItem | CatalogCategory
type PreviewProductLike = ProductItem | CatalogProduct

const mapCategory = (category: PreviewCategoryLike): CategoryItem => ({
  id: category.id,
  name: category.name,
  description: 'note' in category ? (category.note || '') : (category.description || ''),
  sortOrder: 'order' in category ? (category.order ?? 0) : (category.sortOrder ?? 0),
})

const normalizeVariantOption = (
  productId: string,
  group: ProductVariantGroup,
  option: ProductVariantOption,
  groupIndex: number,
  optionIndex: number,
): ProductVariantOption => ({
  id: option.id || `${productId}-group-${groupIndex}-option-${optionIndex}`,
  name: option.name || '',
  priceDelta: Number(option.priceDelta || 0),
  isRequired: Boolean(option.isRequired ?? group.required),
})

const normalizeVariantGroup = (
  productId: string,
  group: ProductVariantGroup,
  groupIndex: number,
): ProductVariantGroup => ({
  id: group.id || `${productId}-group-${groupIndex}`,
  groupName: group.groupName || '',
  type: group.type === 'multiple' ? 'multiple' : 'single',
  required: Boolean(group.required),
  options: Array.isArray(group.options)
    ? group.options.map((option, optionIndex) => normalizeVariantOption(productId, group, option, groupIndex, optionIndex))
    : [],
})

const mapProduct = (product: PreviewProductLike): ProductItem => {
  if ('basePrice' in product) {
    return product
  }

  return {
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
    variants: Array.isArray(product.variants)
      ? product.variants.map((group, groupIndex) => normalizeVariantGroup(product.id, group, groupIndex))
      : [],
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
    freeShip: product.freeShip ?? false,
    inventoryItems: product.inventoryItems || [],
    productRating: Number(product.productRating || 0),
    productRatingCount: Number(product.productRatingCount || 0),
    createdAt: null,
    updatedAt: null,
  }
}

const previewPayload = computed<StorefrontPayload | null>(() => {
  if (!catalog.value) return null

  const baseSettings = {
    ...defaultSettings(catalog.value.settings?.businessName || 'Nueva Tienda', catalog.value.slug),
    ...catalog.value.settings,
  }

  const mergedSettings = previewStore.settingsOverride
    ? { ...baseSettings, ...previewStore.settingsOverride }
    : baseSettings

  const mergedTheme = previewStore.themeOverride
    ? { ...catalog.value.theme, ...previewStore.themeOverride }
    : catalog.value.theme

  // Use engine store if it has products (has unsaved draft products in memory), else use catalog store
  const categories = catalogEngine.categories.length
    ? catalogEngine.categories
    : catalog.value.categories
      .filter(category => category.active)
      .sort((left, right) => left.order - right.order)
      .map(mapCategory)

  const products = catalogEngine.products.length
    ? catalogEngine.products.filter(p => p.isActive)
    : catalog.value.products
      .filter(product => product.active)
      .sort((left, right) => left.order - right.order)
      .map(mapProduct)

  return {
    id: catalog.value.id,
    slug: catalog.value.slug,
    settings: mergedSettings,
    theme: mergedTheme,
    categories,
    products,
    reviews: catalog.value.reviews || [],
    coupons: [],
  }
})

const layout = computed(() => previewPayload.value?.settings.storefrontLayout ?? 'classic')
</script>
