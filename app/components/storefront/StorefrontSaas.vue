<template>
  <section class="catalog-shell min-h-screen overflow-x-hidden pb-32" :style="themeVars">
    <header class="catalog-header">
      <div>
        <p class="eyebrow">{{ storefront.settings.businessType }}</p>
        <h1>{{ storefront.settings.businessName }}</h1>
        <p>{{ storefront.settings.tagline }}</p>
      </div>
      <NuxtLink to="/catálogos" class="ghost-btn">Marketplace</NuxtLink>
    </header>

    <div v-if="storefront.theme.bannerText" class="catalog-banner">{{ storefront.theme.bannerText }}</div>

    <section class="mb-6 rounded-[24px] border border-black/10 bg-white/60 px-5 py-4 text-sm text-[#5c4335] shadow-[0_12px_30px_rgba(36,20,15,0.08)]">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <strong class="block text-[#24140f]">Estado del negocio</strong>
          <span>{{ scheduleState.label }}</span>
        </div>
        <div class="flex flex-wrap gap-2">
          <span v-if="availableDelivery" class="rounded-full border border-black/10 px-3 py-1 text-xs">Delivery activo</span>
          <span v-if="availablePickup" class="rounded-full border border-black/10 px-3 py-1 text-xs">Pickup activo</span>
          <span v-if="visibleCoupons.length" class="rounded-full border border-black/10 px-3 py-1 text-xs">{{ visibleCoupons.length }} cupones</span>
        </div>
      </div>
    </section>

    <section v-if="!isStoreAcceptingOrders" class="closed-state">
      <div class="closed-box">
        <h2>{{ storefront.settings.businessName }}</h2>
        <p>{{ isClosed ? storefront.settings.closedMessage : scheduleState.label }}</p>
      </div>
    </section>

    <template v-else>
      <section class="catalog-toolbar">
        <input v-model="search" class="catalog-search" placeholder="Buscar producto..." />
        <div class="chip-row">
          <button class="chip" :class="{ active: selectedCategoryId === '' }" @click="selectedCategoryId = ''">Todos</button>
          <button
            v-for="category in storefront.categories"
            :key="category.id"
            class="chip"
            :class="{ active: selectedCategoryId === category.id }"
            @click="selectedCategoryId = category.id"
          >
            {{ category.name }}
          </button>
        </div>
      </section>

      <section v-for="category in filteredCategories" :key="category.id" class="catalog-category">
        <div class="category-head">
          <div>
            <h2>{{ category.name }}</h2>
            <p>{{ productsByCategory(category.id).length }} productos listos para pedir</p>
          </div>
        </div>

        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <article
            v-for="product in productsByCategory(category.id)"
            :key="product.id"
            class="overflow-hidden rounded-[26px] border border-[#24140f]/10 bg-[color:var(--catalog-card)] shadow-[0_18px_50px_rgba(59,34,26,0.08)] ring-1 ring-black/5"
          >
            <button class="block w-full text-left" @click="openProduct(product)">
              <div class="relative h-52 overflow-hidden bg-[linear-gradient(135deg,#f5e3d8,#fef7f0)]">
                <img v-if="product.imageUrl" :src="product.imageUrl" :alt="product.name" loading="lazy" class="h-full w-full object-cover" />
                <div v-else class="flex h-full items-center justify-center text-sm text-[color:var(--catalog-muted)]">Sin imagen</div>
                <span v-if="product.hasPromo" class="absolute left-3 top-3 rounded-full bg-[color:var(--catalog-primary)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white">
                  Promo
                </span>
              </div>
              <div class="space-y-3 p-4">
                <div>
                  <h3 class="m-0 text-xl text-[color:var(--catalog-text)]">{{ product.name }}</h3>
                  <p class="mt-2 line-clamp-3 text-sm text-[color:var(--catalog-muted)]">{{ product.description || 'Sin descripción disponible.' }}</p>
                </div>
                <div class="flex items-end justify-between gap-3">
                  <div>
                    <strong class="block text-2xl text-[color:var(--catalog-price)]">{{ money(activeBasePrice(product), storefront.settings.currency) }}</strong>
                    <span v-if="product.hasPromo && product.promoPrice !== null" class="text-sm text-[#8f837d] line-through">{{ money(product.basePrice, storefront.settings.currency) }}</span>
                  </div>
                  <span class="rounded-full border border-black/10 px-3 py-1 text-xs text-[color:var(--catalog-muted)]">{{ product.variants.length }} grupos</span>
                </div>
              </div>
            </button>
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
      <div
        v-if="storefront.settings.cartEnabled && cartStore.isHydrated && cartStore.totalItems > 0 && isStoreAcceptingOrders"
        class="fixed inset-x-4 bottom-4 z-40 rounded-[24px] border border-black/10 bg-[#24140f] px-4 py-3 text-[#fff7f2] shadow-[0_20px_50px_rgba(20,12,10,0.35)] sm:left-1/2 sm:max-w-xl sm:-translate-x-1/2"
      >
        <button class="flex w-full items-center justify-between gap-4 text-left" @click="cartStore.isOpen = true">
          <div>
            <strong class="block">{{ cartStore.totalItems }} artículos</strong>
            <span class="text-sm text-white/70">Carrito persistente y listo para checkout</span>
          </div>
          <span class="text-lg font-semibold">{{ money(finalTotal, storefront.settings.currency) }}</span>
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
  applyCoupon,
  removeCoupon,
  submitCheckout,
  submitReview,
} = useStorefrontExperience(storefrontRef, slugKey)
</script>
