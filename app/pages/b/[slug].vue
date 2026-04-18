<template>
  <section v-if="pending" class="auth-shell">
    <div class="auth-card">
      <h1>Cargando storefront</h1>
      <p class="section-copy">Sincronizando categorias, productos y configuracion desde Supabase.</p>
    </div>
  </section>

  <section v-else-if="!storefront" class="auth-shell">
    <div class="auth-card">
      <h1>Catalogo no encontrado</h1>
      <NuxtLink to="/catalogos" class="solid-btn">Ir al marketplace</NuxtLink>
    </div>
  </section>

  <StorefrontClassic v-else-if="layout === 'classic'" :storefront="storefront" :slug-key="slugKey" />
  <StorefrontListPremium v-else-if="layout === 'list'" :storefront="storefront" :slug-key="slugKey" />
  <StorefrontSaas v-else :storefront="storefront" :slug-key="slugKey" />
</template>

<script setup lang="ts">
import { defaultSettings } from '~/data/defaults'
import type { StorefrontPayload } from '~/composables/useStorefrontExperience'
import type { CategoryItem, ProductItem } from '~/stores/catalog'

const route = useRoute()
const slugKey = computed(() => String(route.params.slug || ''))
const backend = useSupabaseBackend()

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
  productRating: Number(product.productRating || 0),
  productRatingCount: Number(product.productRatingCount || 0),
  createdAt: null,
  updatedAt: null,
})

const { data, pending } = await useAsyncData<StorefrontPayload | null>(
  () => `storefront-${slugKey.value}`,
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
      theme: catalog.theme,
      categories: catalog.categories
        .filter((category) => category.active)
        .sort((left, right) => left.order - right.order)
        .map(mapCategory),
      products: catalog.products
        .filter((product) => product.active)
        .sort((left, right) => left.order - right.order)
        .map(mapProduct),
      reviews: catalog.reviews.filter((review) => review.approved),
      coupons,
    }
  },
  {
    default: () => null,
    watch: [slugKey],
  },
)

const storefront = computed(() => data.value)
const layout = computed(() => storefront.value?.settings.storefrontLayout ?? 'classic')
</script>
