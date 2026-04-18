<template>
  <section class="min-h-screen overflow-x-hidden pb-32" :style="themeVars">
    <header class="relative min-h-[40vw] max-h-[280px] overflow-hidden">
      <img v-if="storefront.settings.coverImage" :src="storefront.settings.coverImage" :alt="storefront.settings.businessName" loading="lazy" class="absolute inset-0 h-full w-full object-cover" />
      <div class="absolute inset-0 bg-black/55" />
      <div class="relative flex min-h-[40vw] max-h-[280px] flex-col items-center justify-center gap-3 px-5 py-8 text-center text-white">
        <img v-if="storefront.settings.logoUrl" :src="storefront.settings.logoUrl" :alt="storefront.settings.businessName" loading="lazy" class="h-20 w-20 rounded-full border border-white/20 object-cover shadow-xl" />
        <p class="text-xs font-semibold uppercase tracking-[0.24em] text-white/70">{{ storefront.settings.businessType }}</p>
        <h1 class="text-3xl font-semibold leading-tight">{{ storefront.settings.businessName }}</h1>
        <p class="max-w-md text-sm text-white/80">{{ storefront.settings.tagline }}</p>
      </div>
    </header>

    <div v-if="storefront.theme.bannerText" class="bg-[color:var(--catalog-header)] px-4 py-3 text-center text-sm font-semibold text-[color:var(--catalog-header-text)]">
      {{ storefront.theme.bannerText }}
    </div>

    <section class="px-4 pt-4">
      <div class="rounded-[24px] bg-black/75 px-4 py-3 text-sm text-white shadow-[0_16px_40px_rgba(0,0,0,0.22)]">
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <strong class="block">Estado del negocio</strong>
            <span class="text-white/75">{{ scheduleState.label }}</span>
          </div>
          <div class="flex flex-wrap gap-2">
            <span v-if="availableDelivery" class="rounded-full bg-white/10 px-3 py-1 text-xs">Delivery activo</span>
            <span v-if="availablePickup" class="rounded-full bg-white/10 px-3 py-1 text-xs">Pickup activo</span>
            <span v-if="visibleCoupons.length" class="rounded-full bg-white/10 px-3 py-1 text-xs">{{ visibleCoupons.length }} cupones</span>
          </div>
        </div>
      </div>
    </section>

    <section v-if="!isStoreAcceptingOrders" class="px-4 pt-5">
      <div class="rounded-[28px] bg-black/85 px-5 py-8 text-center text-white">
        <h2 class="text-2xl font-semibold">{{ storefront.settings.businessName }}</h2>
        <p class="mt-3 text-white/75">{{ isClosed ? storefront.settings.closedMessage : scheduleState.label }}</p>
      </div>
    </section>

    <template v-else>
      <section class="sticky top-0 z-30 bg-[color:var(--catalog-header)]/92 px-4 pb-4 pt-4 backdrop-blur-md">
        <input v-model="search" class="min-h-[48px] w-full rounded-full border border-white/10 bg-white/10 px-5 text-base text-white placeholder:text-white/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--catalog-primary)]" placeholder="Buscar plato..." />
        <div class="scrollbar-hide mt-3 flex gap-2 overflow-x-auto [-webkit-overflow-scrolling:touch]">
          <button class="min-h-[44px] rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition" :class="selectedCategoryId === '' ? 'bg-[color:var(--catalog-primary)] text-white' : 'bg-white/10 text-white/70'" @click="selectedCategoryId = ''">Todos</button>
          <button
            v-for="category in storefront.categories"
            :key="category.id"
            class="min-h-[44px] rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition"
            :class="selectedCategoryId === category.id ? 'bg-[color:var(--catalog-primary)] text-white' : 'bg-white/10 text-white/70'"
            @click="selectedCategoryId = category.id"
          >
            {{ category.name }}
          </button>
        </div>
      </section>

      <section v-for="category in filteredCategories" :key="category.id" class="px-4 py-5">
        <div class="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 class="text-2xl font-semibold text-[color:var(--catalog-text)]">{{ category.name }}</h2>
            <p class="text-sm text-[color:var(--catalog-muted)]">{{ productsByCategory(category.id).length }} productos listos para pedir</p>
          </div>
          <div class="inline-flex rounded-full border border-black/10 bg-white/60 p-1">
            <button class="min-h-[44px] min-w-[44px] rounded-full px-3 text-sm" :class="layoutMode === 'grid' ? 'bg-[color:var(--catalog-primary)] text-white' : 'text-[color:var(--catalog-text)]'" @click="setLayout('grid')">▥</button>
            <button class="min-h-[44px] min-w-[44px] rounded-full px-3 text-sm" :class="layoutMode === 'list' ? 'bg-[color:var(--catalog-primary)] text-white' : 'text-[color:var(--catalog-text)]'" @click="setLayout('list')">☰</button>
          </div>
        </div>

        <div :class="layoutMode === 'grid' ? 'grid grid-cols-2 gap-3' : 'flex flex-col gap-2'">
          <article
            v-for="product in productsByCategory(category.id)"
            :key="product.id"
            class="overflow-hidden border border-black/10 bg-[color:var(--catalog-card)] shadow-[0_18px_40px_rgba(0,0,0,0.08)]"
            :class="layoutMode === 'grid' ? 'rounded-[20px]' : 'flex items-center gap-3 rounded-[16px] p-2'"
          >
            <button class="block text-left" :class="layoutMode === 'grid' ? 'w-full' : 'contents'" @click="openProduct(product)">
              <div class="relative overflow-hidden bg-black/10" :class="layoutMode === 'grid' ? 'aspect-square w-full' : 'h-[90px] w-[90px] shrink-0 rounded-[14px]'">
                <img v-if="product.imageUrl" :src="product.imageUrl" :alt="product.name" loading="lazy" class="h-full w-full object-cover" />
                <div v-else class="flex h-full w-full items-center justify-center text-sm text-[color:var(--catalog-muted)]">Sin imagen</div>
                <div v-if="product.productRatingCount" class="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[10px] font-semibold text-yellow-300 backdrop-blur-sm">
                  <span>★ {{ product.productRating.toFixed(1) }}</span>
                  <span class="text-white/70">({{ product.productRatingCount }})</span>
                </div>
              </div>
              <div class="p-3" :class="layoutMode === 'grid' ? 'space-y-2' : 'min-w-0 flex-1 p-0'">
                <h3 class="text-base font-semibold text-[color:var(--catalog-text)]">{{ product.name }}</h3>
                <p class="text-sm text-[color:var(--catalog-muted)]" :class="layoutMode === 'grid' ? 'line-clamp-2' : 'line-clamp-1'">{{ product.description || 'Sin descripcion disponible.' }}</p>
                <div v-if="layoutMode === 'list' && product.productRatingCount" class="inline-flex items-center gap-1 rounded-full bg-black/8 px-2 py-1 text-[11px] text-[color:var(--catalog-muted)]">
                  ★ {{ product.productRating.toFixed(1) }}
                </div>
                <div class="flex items-end justify-between gap-3">
                  <div>
                    <strong class="block text-sm font-semibold text-[color:var(--catalog-price)]">{{ money(activeBasePrice(product), storefront.settings.currency) }}</strong>
                    <span v-if="product.hasPromo && product.promoPrice !== null" class="text-xs text-[color:var(--catalog-muted)] line-through">{{ money(product.basePrice, storefront.settings.currency) }}</span>
                  </div>
                </div>
              </div>
            </button>
            <button class="add-btn-classic" @click.stop="quickAddProduct(product)">+</button>
          </article>
        </div>
      </section>

      <StorefrontReviews :enabled="storefront.settings.reviewsEnabled" :reviews="storefront.reviews" :review-form="reviewForm" @submit="submitReview" />
    </template>

    <StorefrontProductSheet
      :product="selectedProduct"
      :currency="storefront.settings.currency"
      :single-selections="singleSelections"
      :multi-selections="multiSelections"
      :quantity="quantity"
      :instructions="instructions"
      :subtotal="liveSubtotal"
      @close="closeProduct"
      @commit="commitProduct"
      @select-single="selectSingle"
      @toggle-multi="toggleMulti"
      @update:quantity="quantity = $event"
      @update:instructions="instructions = $event"
    />

    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="translate-y-full opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-full opacity-0"
    >
      <div v-if="storefront.settings.cartEnabled && cartStore.isHydrated && cartStore.totalItems > 0 && isStoreAcceptingOrders" class="cart-bar-classic">
        <div class="cart-preview-classic">
          <span v-for="item in cartStore.items.slice(0, 4)" :key="item.cartItemId" class="rounded-full bg-white/10 px-3 py-1 text-xs text-white/80">
            {{ item.quantity }}x {{ item.productName }}
          </span>
        </div>
        <button class="mt-3 flex min-h-[52px] w-full items-center justify-between rounded-full bg-[color:var(--catalog-primary)] px-5 py-3 text-white" @click="cartStore.isOpen = true">
          <span>{{ cartStore.totalItems }} artículos</span>
          <strong>{{ money(finalTotal, storefront.settings.currency) }}</strong>
        </button>
      </div>
    </Transition>

    <StorefrontCartDrawer
      :open="cartStore.isOpen && cartStore.isHydrated"
      :storefront="storefront"
      :slug-key="slugKey"
      :currency="storefront.settings.currency"
      :checkout-form="checkoutForm"
      :available-delivery="availableDelivery"
      :available-pickup="availablePickup"
      :visible-coupons="visibleCoupons"
      :coupon-code="couponCode"
      :applied-coupon="appliedCoupon"
      :coupon-message="couponMessage"
      :subtotal-before-discount="subtotalBeforeDiscount"
      :discount-total="discountTotal"
      :delivery-fee="deliveryFee"
      :final-total="finalTotal"
      @close="cartStore.isOpen = false"
      @submit="submitCheckout"
      @apply-coupon="applyCoupon"
      @remove-coupon="removeCoupon"
      @update:coupon-code="couponCode = $event"
    />
  </section>
</template>

<script setup lang="ts">
import type { StorefrontPayload } from '~/composables/useStorefrontExperience'
import { useStorefrontExperience } from '~/composables/useStorefrontExperience'
import { money } from '~/utils/catalog'

const props = defineProps<{
  storefront: StorefrontPayload
  slugKey: string
}>()

const layoutMode = ref<'grid' | 'list'>('grid')
const storageKey = computed(() => `storefront_layout_mode_${props.slugKey}`)

onMounted(() => {
  const saved = localStorage.getItem(storageKey.value)
  if (saved === 'grid' || saved === 'list') {
    layoutMode.value = saved
  }
})

const setLayout = (value: 'grid' | 'list') => {
  layoutMode.value = value
  localStorage.setItem(storageKey.value, value)
}

const storefrontRef = computed(() => props.storefront)
const slugKey = computed(() => props.slugKey)

const {
  cartStore,
  search,
  selectedCategoryId,
  selectedProduct,
  singleSelections,
  multiSelections,
  quantity,
  instructions,
  checkoutForm,
  reviewForm,
  couponCode,
  appliedCoupon,
  couponMessage,
  isClosed,
  scheduleState,
  isStoreAcceptingOrders,
  availableDelivery,
  availablePickup,
  visibleCoupons,
  subtotalBeforeDiscount,
  discountTotal,
  deliveryFee,
  finalTotal,
  themeVars,
  filteredCategories,
  productsByCategory,
  activeBasePrice,
  liveSubtotal,
  openProduct,
  closeProduct,
  selectSingle,
  toggleMulti,
  commitProduct,
  quickAddProduct,
  applyCoupon,
  removeCoupon,
  submitCheckout,
  submitReview,
} = useStorefrontExperience(storefrontRef, slugKey)
</script>

<style scoped>
.cart-bar-classic {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 40;
  padding: 12px 16px calc(12px + env(safe-area-inset-bottom));
  background: rgba(15, 15, 15, 0.92);
  backdrop-filter: blur(14px);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.cart-preview-classic {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  white-space: nowrap;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.cart-preview-classic::-webkit-scrollbar {
  display: none;
}

.add-btn-classic {
  width: 44px;
  height: 44px;
  min-width: 44px;
  border-radius: 999px;
  border: none;
  background: var(--catalog-primary);
  color: white;
  font-size: 1.35rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 0 12px 0 0;
  align-self: center;
}
</style>
