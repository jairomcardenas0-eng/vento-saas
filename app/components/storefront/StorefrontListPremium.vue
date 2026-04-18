<template>
  <section class="min-h-screen overflow-x-hidden pb-32" :style="themeVars">
    <header class="sticky top-0 z-30 border-b border-black/10 bg-[color:var(--catalog-card)]/95 px-4 py-4 backdrop-blur-md">
      <div class="flex items-center gap-3">
        <img v-if="storefront.settings.logoUrl" :src="storefront.settings.logoUrl" :alt="storefront.settings.businessName" loading="lazy" class="h-[60px] w-[60px] rounded-full border border-black/10 object-cover" />
        <div class="min-w-0 flex-1">
          <p class="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--catalog-muted)]">{{ storefront.settings.businessType }}</p>
          <h1 class="truncate text-2xl font-semibold text-[color:var(--catalog-text)]">{{ storefront.settings.businessName }}</h1>
        </div>
      </div>
      <div class="mt-4">
        <input v-model="search" class="min-h-[48px] w-full rounded-full border border-black/10 bg-white/70 px-5 text-base text-[color:var(--catalog-text)] placeholder:text-[color:var(--catalog-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--catalog-primary)]" placeholder="Buscar plato..." />
      </div>
      <div class="scrollbar-hide mt-3 flex gap-2 overflow-x-auto [-webkit-overflow-scrolling:touch]">
        <button class="min-h-[44px] rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition" :class="selectedCategoryId === '' ? 'bg-[color:var(--catalog-primary)] text-white' : 'bg-black/5 text-[color:var(--catalog-muted)]'" @click="selectedCategoryId = ''">Todos</button>
        <button
          v-for="category in storefront.categories"
          :key="category.id"
          class="min-h-[44px] rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition"
          :class="selectedCategoryId === category.id ? 'bg-[color:var(--catalog-primary)] text-white' : 'bg-black/5 text-[color:var(--catalog-muted)]'"
          @click="selectedCategoryId = category.id"
        >
          {{ category.name }}
        </button>
      </div>
    </header>

    <section v-if="!isStoreAcceptingOrders" class="px-4 py-5">
      <div class="rounded-[28px] bg-black/85 px-5 py-8 text-center text-white">
        <h2 class="text-2xl font-semibold">{{ storefront.settings.businessName }}</h2>
        <p class="mt-3 text-white/75">{{ isClosed ? storefront.settings.closedMessage : scheduleState.label }}</p>
      </div>
    </section>

    <template v-else>
      <section v-for="category in filteredCategories" :key="category.id" class="px-4 py-5">
        <div class="mb-3">
          <h2 class="text-xl font-semibold text-[color:var(--catalog-text)]">{{ category.name }}</h2>
          <p class="text-sm text-[color:var(--catalog-muted)]">{{ productsByCategory(category.id).length }} productos</p>
        </div>

        <div class="flex flex-col gap-2">
          <article
            v-for="product in productsByCategory(category.id)"
            :key="product.id"
            class="flex items-center gap-3 rounded-[18px] border border-black/10 bg-[color:var(--catalog-card)] p-3 shadow-[0_14px_30px_rgba(0,0,0,0.07)]"
          >
            <button class="contents" @click="openProduct(product)">
              <div class="relative h-20 w-20 shrink-0 overflow-hidden rounded-[14px] bg-black/10">
                <img v-if="product.imageUrl" :src="product.imageUrl" :alt="product.name" loading="lazy" class="h-full w-full object-cover" />
                <div v-else class="flex h-full w-full items-center justify-center text-xs text-[color:var(--catalog-muted)]">Sin imagen</div>
              </div>
              <div class="min-w-0 flex-1">
                <h3 class="truncate text-base font-semibold text-[color:var(--catalog-text)]">{{ product.name }}</h3>
                <div v-if="product.productRatingCount" class="mt-1 text-[11px] text-[color:var(--catalog-muted)]">★ {{ product.productRating.toFixed(1) }} · {{ product.productRatingCount }} reseñas</div>
                <p class="truncate text-sm text-[color:var(--catalog-muted)]">{{ product.description || 'Sin descripcion disponible.' }}</p>
                <div class="mt-2 flex items-center gap-2">
                  <strong class="text-sm text-[color:var(--catalog-price)]">{{ money(activeBasePrice(product), storefront.settings.currency) }}</strong>
                  <span v-if="product.hasPromo && product.promoPrice !== null" class="text-xs text-[color:var(--catalog-muted)] line-through">{{ money(product.basePrice, storefront.settings.currency) }}</span>
                </div>
              </div>
            </button>
            <button class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[color:var(--catalog-primary)] text-xl text-white" @click.stop="quickAddProduct(product)">+</button>
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
      <div v-if="storefront.settings.cartEnabled && cartStore.isHydrated && cartStore.totalItems > 0 && isStoreAcceptingOrders" class="fixed inset-x-4 bottom-4 z-40 rounded-[22px] bg-[color:var(--catalog-primary)] px-4 py-3 text-white shadow-[0_18px_45px_rgba(0,0,0,0.25)]">
        <button class="flex min-h-[48px] w-full items-center justify-between gap-4 text-left" @click="cartStore.isOpen = true">
          <div>
            <strong class="block">{{ cartStore.totalItems }} artículos</strong>
            <span class="text-sm text-white/80">Carrito listo para enviar</span>
          </div>
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
