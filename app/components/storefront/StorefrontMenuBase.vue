<template>
  <section class="storefront-shell" :style="themeVars">
    <div v-if="bannerVisible && !theme.bannerSticky" class="banner-bar" :class="{ loop: theme.bannerMode === 'loop' }">
      <div v-if="theme.bannerMode === 'loop'" class="banner-track">
        <span v-for="index in 2" :key="index" class="banner-copy">{{ theme.bannerText }} <span class="banner-sep">|</span> {{ theme.bannerText }}</span>
      </div>
      <span v-else>{{ theme.bannerText }}</span>
    </div>

    <div class="sticky-shell">
      <div v-if="bannerVisible && theme.bannerSticky" class="banner-bar" :class="{ loop: theme.bannerMode === 'loop' }">
        <div v-if="theme.bannerMode === 'loop'" class="banner-track">
          <span v-for="index in 2" :key="index" class="banner-copy">{{ theme.bannerText }} <span class="banner-sep">|</span> {{ theme.bannerText }}</span>
        </div>
        <span v-else>{{ theme.bannerText }}</span>
      </div>

      <header class="topbar">
        <div class="brand-block">
          <img v-if="settings.logoUrl" :src="settings.logoUrl" :alt="settings.businessName" class="brand-logo">
          <div v-else class="brand-fallback">{{ initials }}</div>
          <div class="brand-copy">
            <h1>{{ settings.businessName }}</h1>
            <p>{{ scheduleState.label }}</p>
          </div>
        </div>

        <div class="topbar-actions">
          <button class="icon-btn" type="button" @click="searchOpen = !searchOpen" aria-label="Buscar">
            Buscar
          </button>
          <button v-if="availableTags.length" class="icon-btn" type="button" @click="filtersOpen = true" aria-label="Filtrar">
            Filtros
          </button>
        </div>
      </header>

      <Transition name="fade-slide">
        <div v-if="searchOpen" class="search-wrap">
          <input v-model="search" class="search-input" type="search" placeholder="Buscar producto..." />
        </div>
      </Transition>

      <nav class="categories-strip">
        <button class="category-chip" :class="{ active: selectedCategoryId === '' }" @click="selectedCategoryId = ''">Todo</button>
        <button
          v-for="category in visibleCategories"
          :key="category.id"
          class="category-chip"
          :class="{ active: selectedCategoryId === category.id }"
          @click="selectedCategoryId = category.id"
        >
          {{ category.name }}
        </button>
      </nav>
    </div>

    <Transition name="fade">
      <div v-if="loadingVisible" class="loading-screen">
        <div class="loading-card">
          <div class="loading-mark">{{ initials }}</div>
          <strong>Preparando tu menú</strong>
          <span>Cargando catálogo y disponibilidad…</span>
        </div>
      </div>
    </Transition>

    <div v-if="showClosedOverlay" class="closed-screen">
      <div class="closed-card" :style="closedTextBoxStyle">
        <p class="closed-message" :style="closedTextStyle">{{ closedMessage }}</p>
        <div class="closed-actions">
          <button v-if="settings.closedShowMenuBtn" class="closed-btn" :style="closedMenuButtonStyle" @click="viewingMenuFromClosed = true">Ver menú</button>
          <a v-if="settings.closedShowWhatsapp && whatsappHref" class="closed-btn whatsapp" :href="whatsappHref" target="_blank" rel="noopener noreferrer">WhatsApp</a>
          <a v-if="settings.callEnabled && settings.closedShowCall && phoneHref" class="closed-btn call" :href="phoneHref">Llamar</a>
        </div>
      </div>
    </div>

    <div class="menu-content" :class="{ dimmed: showClosedOverlay }">
      <section v-for="category in renderedCategories" :key="category.id" class="category-section">
        <div class="category-head">
          <div>
            <h2>{{ category.name }}</h2>
            <p v-if="category.description">{{ category.description }}</p>
          </div>
        </div>

        <div class="products-grid" :class="[layoutClass]">
          <article
            v-for="product in productsByCategory(category.id)"
            :key="product.id"
            class="product-card"
            :class="[cardStyleClass, { list: layout === 'list' }]"
            @click="openDetail(product)"
          >
            <div class="product-media" :class="{ list: layout === 'list' }">
              <template v-if="productImages(product).length">
                <img
                  v-for="(image, index) in productImages(product)"
                  :key="`${product.id}-${index}`"
                  :src="image"
                  :alt="product.name"
                  class="product-image"
                  :class="{ active: currentProductImageIndex(product) === index }"
                />
              </template>
              <div v-else class="product-image fallback active">Sin imagen</div>

              <div class="media-badges">
                <span v-if="approvedReviewCount(product.id) > 0" class="badge review">{{ approvedReviewCount(product.id) }} reseñas</span>
                <span v-if="showOfferOnImage(product)" class="badge offer">{{ product.offerLabel }}</span>
                <span v-if="timerMeta(product) && timerMeta(product)?.position === 'image-right'" class="badge timer">{{ timerMeta(product)?.text }}</span>
              </div>

              <div v-if="isCarouselActive(product)" class="carousel-controls">
                <button type="button" class="carousel-btn" aria-label="Imagen anterior" @click.stop="moveProductCarousel(product.id, -1)">
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m15 18-6-6 6-6" />
                  </svg>
                </button>
                <button type="button" class="carousel-btn" aria-label="Imagen siguiente" @click.stop="moveProductCarousel(product.id, 1)">
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m9 6 6 6-6 6" />
                  </svg>
                </button>
              </div>
            </div>

            <div class="product-body">
              <div class="product-title">{{ product.name }}</div>
              <div v-if="product.tags.length" class="tag-row">
                <span v-for="tag in product.tags.slice(0, 2)" :key="tag" class="tag-chip">{{ tag }}</span>
              </div>
              <div v-if="product.description" class="product-desc">{{ product.description }}</div>

              <div class="product-footer">
                <div class="price-stack">
                  <div class="price-row">
                    <span class="price-main">{{ money(activePrice(product), settings.currency) }}</span>
                    <span v-if="product.hasPromo && product.promoPrice !== null" class="price-old">{{ money(product.basePrice, settings.currency) }}</span>
                    <span v-if="showOfferInline(product)" class="badge offer inline">{{ product.offerLabel }}</span>
                  </div>
                  <span v-if="timerMeta(product) && timerMeta(product)?.position === 'price-below'" class="badge timer inline">{{ timerMeta(product)?.text }}</span>
                </div>

                <template v-if="settings.cartEnabled">
                  <button v-if="product.variants.length > 0" class="add-btn-mini" @click.stop="openDetail(product)">+</button>
                  <div v-else-if="cartQty(product.id) > 0" class="qty-inline" @click.stop>
                    <button class="qty-btn" @click="changeSimpleQty(product, -1)">-</button>
                    <span class="qty-value">{{ cartQty(product.id) }}</span>
                    <button class="qty-btn" @click="changeSimpleQty(product, 1)">+</button>
                  </div>
                  <button v-else class="add-btn-mini" @click.stop="quickAdd(product)">+</button>
                </template>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section v-if="hasMap" class="map-section">
        <h3>Ubicación</h3>
        <iframe class="map-frame" :src="mapEmbedUrl" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen />
        <a class="map-link" :href="mapsSearchUrl" target="_blank" rel="noopener noreferrer">Abrir en Google Maps</a>
      </section>
    </div>

    <Transition name="fade-slide-up">
      <div v-if="settings.cartEnabled && cartStore.isHydrated && cartStore.totalItems > 0" class="cart-bar">
        <div class="cart-preview">
          <span v-for="item in cartStore.items.slice(0, 4)" :key="item.cartItemId" class="preview-pill">
            {{ item.quantity }}x {{ item.productName }}
            <button type="button" class="preview-remove" aria-label="Quitar producto" @click="removeFromCart(item.cartItemId)">x</button>
          </span>
        </div>
        <div class="cart-summary">
          <div>
            <strong>{{ cartStore.totalItems }} productos</strong>
            <span>{{ money(cartStore.totalPrice, settings.currency) }}</span>
          </div>
          <button class="cart-open-btn" @click="cartOpen = true">Ver pedido</button>
        </div>
      </div>
    </Transition>

    <div v-if="filtersOpen" class="modal-overlay" @click.self="filtersOpen = false">
      <div class="sheet">
        <div class="sheet-head">
          <strong>Filtros</strong>
          <button class="close-btn" aria-label="Cerrar filtros" @click="filtersOpen = false">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div class="sheet-body">
          <div class="tag-row">
            <button
              v-for="tag in availableTags"
              :key="tag"
              class="tag-chip filter"
              :class="{ active: activeTags.includes(tag) }"
              @click="toggleTag(tag)"
            >
              {{ tag }}
            </button>
          </div>
        </div>
        <div class="sheet-actions single">
          <button class="primary-btn" @click="filtersOpen = false">Ver resultados</button>
        </div>
      </div>
    </div>

    <div v-if="selectedProduct" class="modal-overlay" @click.self="closeDetail">
      <div class="sheet">
        <div class="sheet-head">
          <strong>Detalle del producto</strong>
          <button class="close-btn" aria-label="Cerrar detalle" @click="closeDetail">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="sheet-body">
          <div class="detail-gallery">
            <img
              v-for="(image, index) in detailImages"
              :key="`${selectedProduct.id}-detail-${index}`"
              :src="image"
              :alt="selectedProduct.name"
              class="detail-image"
              :class="{ active: detailImageIndex === index }"
            />
            <div v-if="!detailImages.length" class="detail-image fallback active">Sin imagen</div>
            <button v-if="detailImages.length > 1" class="detail-nav prev" aria-label="Imagen anterior" @click="detailImageIndex = previousDetailImage">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <button v-if="detailImages.length > 1" class="detail-nav next" aria-label="Imagen siguiente" @click="detailImageIndex = nextDetailImage">
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m9 6 6 6-6 6" />
              </svg>
            </button>
          </div>

          <div v-if="detailImages.length > 1" class="detail-dots">
            <button
              v-for="(image, index) in detailImages"
              :key="`${selectedProduct.id}-dot-${index}`"
              class="detail-dot"
              :class="{ active: detailImageIndex === index }"
              @click="detailImageIndex = index"
            />
          </div>

          <div class="detail-copy">
            <h2>{{ selectedProduct.name }}</h2>
            <div class="price-stack detail">
              <div class="price-row">
                <span class="price-main">{{ money(detailUnitPrice, settings.currency) }}</span>
                <span v-if="selectedProduct.hasPromo && selectedProduct.promoPrice !== null" class="price-old">{{ money(selectedProduct.basePrice, settings.currency) }}</span>
                <span v-if="showOfferInline(selectedProduct)" class="badge offer inline">{{ selectedProduct.offerLabel }}</span>
              </div>
              <span v-if="timerMeta(selectedProduct) && timerMeta(selectedProduct)?.position === 'price-below'" class="badge timer inline">{{ timerMeta(selectedProduct)?.text }}</span>
            </div>
            <p class="detail-desc">{{ selectedProduct.description }}</p>

            <div v-if="selectedProduct.tags.length" class="tag-row">
              <span v-for="tag in selectedProduct.tags" :key="tag" class="tag-chip">{{ tag }}</span>
            </div>
          </div>

          <div v-if="selectedProduct.variants.length" class="variant-groups">
            <article v-for="group in selectedProduct.variants" :key="group.id" class="variant-group">
              <div class="variant-head">
                <strong>{{ group.groupName }}</strong>
                <span v-if="groupRequired(group)">Obligatorio</span>
              </div>
              <label v-for="option in group.options" :key="option.id" class="variant-option">
                <input
                  v-if="group.type === 'single'"
                  :checked="selectedSingle[group.id] === option.id"
                  type="radio"
                  :name="group.id"
                  @change="selectedSingle[group.id] = option.id"
                >
                <input
                  v-else
                  :checked="(selectedMulti[group.id] || []).includes(option.id)"
                  type="checkbox"
                  @change="toggleMulti(group.id, option.id)"
                >
                <span class="variant-label">{{ option.name }}</span>
                <span v-if="option.priceDelta > 0" class="variant-price">+{{ money(option.priceDelta, settings.currency) }}</span>
              </label>
            </article>
          </div>

          <div class="detail-qty">
            <button class="qty-btn" @click="detailQty = Math.max(1, detailQty - 1)">-</button>
            <span class="qty-value detail">{{ detailQty }}</span>
            <button class="qty-btn" @click="detailQty += 1">+</button>
          </div>

          <div v-if="settings.reviewsEnabled" class="reviews-section">
            <div class="section-title">Reseñas <span>{{ currentApprovedReviewCount }}</span></div>

            <div class="review-form">
              <label class="field">
                <span>Tu nombre</span>
                <input v-model="reviewForm.name" class="field-input" type="text" maxlength="20" placeholder="Escribe tu nombre">
              </label>
              <label class="field">
                <span>Tu calificación</span>
                <select v-model.number="reviewForm.rating" class="field-input">
                  <option :value="5">5 de 5</option>
                  <option :value="4">4 de 5</option>
                  <option :value="3">3 de 5</option>
                  <option :value="2">2 de 5</option>
                  <option :value="1">1 de 5</option>
                </select>
              </label>
              <label class="field">
                <span>Tu comentario</span>
                <textarea v-model="reviewForm.comment" class="field-input" rows="3" maxlength="300" placeholder="Compártenos tu opinión sobre este producto" />
              </label>
              <button class="primary-btn" :disabled="reviewSubmitting" @click="submitReview">
                {{ reviewSubmitting ? 'Enviando...' : 'Enviar reseña' }}
              </button>
            </div>

            <div class="reviews-list">
              <div v-if="!currentVisibleReviews.length" class="empty-review">Todavía no hay reseñas para este producto.</div>
              <article v-for="review in currentVisibleReviews" :key="review.id" class="review-card">
                <div class="review-head">
                  <div>
                    <strong>{{ review.name || 'Anónimo' }}</strong>
                    <span>{{ formatReviewDate(review.createdAt) }} | {{ reviewStars(review.rating) }}</span>
                  </div>
                  <span v-if="review.approved === false" class="review-pending">Pendiente</span>
                </div>
                <p>{{ review.comment }}</p>
              </article>
            </div>
          </div>
        </div>

        <div class="sheet-actions" :class="detailActionsClass">
          <button v-if="settings.cartEnabled" class="primary-btn" @click="addSelectedToCart">Agregar al carrito</button>
          <button v-if="settings.cartEnabled && settings.whatsappEnabled && whatsappHref" class="wa-btn" @click="orderSelectedNow">Pedir ahora</button>
        </div>
      </div>
    </div>

    <div v-if="cartOpen" class="modal-overlay" @click.self="cartOpen = false">
      <div class="sheet">
        <div class="sheet-head">
          <strong>Tu pedido</strong>
          <button class="close-btn" aria-label="Cerrar carrito" @click="cartOpen = false">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="sheet-body cart-body">
          <div v-if="!cartStore.items.length" class="empty-review">Tu carrito está vacío.</div>

          <article v-for="item in cartStore.items" :key="item.cartItemId" class="cart-item">
            <div class="cart-thumb">
              <img v-if="cartItemImage(item.productId)" :src="cartItemImage(item.productId)!" :alt="item.productName" />
              <div v-else class="cart-thumb fallback">Sin imagen</div>
            </div>

            <div class="cart-item-copy">
              <strong>{{ item.productName }}</strong>
              <span v-if="item.modifiers.length" class="cart-modifiers">{{ item.modifiers.map((modifier) => `${modifier.groupName}: ${modifier.optionName}`).join(', ') }}</span>
              <span class="cart-item-price">{{ money(item.finalUnitPrice * item.quantity, settings.currency) }}</span>
            </div>

            <div class="cart-item-actions">
              <div class="qty-inline cart-qty">
                <button class="qty-btn" @click="changeCartQty(item.cartItemId, -1)">-</button>
                <span class="qty-value">{{ item.quantity }}</span>
                <button class="qty-btn" @click="changeCartQty(item.cartItemId, 1)">+</button>
              </div>
              <button class="link-btn" @click="removeFromCart(item.cartItemId)">Quitar</button>
            </div>
          </article>

          <div v-if="showCheckoutFields" class="checkout-form">
            <label v-if="settings.checkoutNameEnabled" class="field">
              <span>Nombre del cliente</span>
              <input v-model="checkoutForm.name" class="field-input" type="text" maxlength="80" :placeholder="settings.checkoutNameReq === 'obligatorio' ? 'Obligatorio' : 'Opcional'">
            </label>

            <label class="field">
              <span>Modalidad</span>
              <select v-model="checkoutForm.method" class="field-input">
                <option value="Delivery" :disabled="!availableDelivery">Entrega a domicilio</option>
                <option value="Pickup" :disabled="!availablePickup">Recogida en tienda</option>
              </select>
            </label>

            <label v-if="settings.checkoutPaymentEnabled" class="field">
              <span>Método de pago</span>
              <input v-model="checkoutForm.paymentMethod" class="field-input" type="text" maxlength="80" :placeholder="settings.checkoutPaymentReq === 'obligatorio' ? 'Obligatorio' : 'Opcional'">
            </label>

            <label v-if="checkoutForm.method === 'Delivery' && settings.deliveryFeeType === 'zones'" class="field">
              <span>Zona de entrega</span>
              <select v-model="checkoutForm.zoneId" class="field-input">
                <option value="">Selecciona una zona</option>
                <option v-for="zone in settings.deliveryZones" :key="zone.id" :value="zone.id">
                  {{ zone.name }} · {{ money(zone.price, settings.currency) }}
                </option>
              </select>
            </label>

            <label v-if="checkoutForm.method === 'Delivery' && settings.checkoutAddressEnabled" class="field">
              <span>Dirección de entrega</span>
              <textarea v-model="checkoutForm.address" class="field-input" rows="3" maxlength="180" :placeholder="settings.checkoutAddressReq === 'obligatorio' ? 'Obligatoria' : 'Opcional'" />
            </label>

            <div v-if="checkoutForm.method === 'Pickup'" class="pickup-card">
              <strong>{{ settings.pickupPoint }}</strong>
              <p>{{ settings.pickupInstructions }}</p>
              <span>Tiempo estimado: {{ settings.pickupEtaMinutes }} min</span>
            </div>
          </div>

          <div class="cart-total-box">
            <div class="total-row">
              <span>Total</span>
              <strong>{{ money(cartStore.totalPrice, settings.currency) }}</strong>
            </div>

            <div v-if="mapsSearchUrl" class="location-row">
              <span>{{ settings.address.details || settings.address.city }}</span>
              <a :href="mapsSearchUrl" target="_blank" rel="noopener noreferrer">Ver ubicación</a>
            </div>
          </div>
        </div>

        <div class="sheet-actions double">
          <a v-if="settings.callEnabled && phoneHref" class="secondary-btn" :href="phoneHref">Llamar</a>
          <button class="wa-btn" :disabled="!cartStore.items.length || sendingCartOrder" @click="sendCartOrder">
            {{ sendingCartOrder ? 'Enviando...' : 'Enviar pedido' }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { defaultSettings, defaultTheme } from '~/data/defaults'
import type { CatalogOrder, CatalogReview, ProductVariantGroup } from '~/types/catalog'
import type { StorefrontPayload } from '~/composables/useStorefrontExperience'
import type { CartItem } from '~/stores/cart'
import { generatePublicEntityId } from '~/utils/entityIds'
import type { ProductItem } from '~/stores/catalog'
import { getAllProductImages, getCurrentScheduleState, money, resolveDeliveryFee } from '~/utils/catalog'

const props = defineProps<{
  storefront: StorefrontPayload
  slugKey: string
  layout: 'classic' | 'list'
}>()

const cartStore = useCartStore()
const backend = useSupabaseBackend()
const analytics = useAnalytics()
const { encodeOrderToWhatsApp } = useCheckoutEngine()

const loadingVisible = ref(true)
const nowTick = ref(Date.now())
const searchOpen = ref(false)
const search = ref('')
const selectedCategoryId = ref('')
const filtersOpen = ref(false)
const activeTags = ref<string[]>([])
const viewingMenuFromClosed = ref(false)
const selectedProduct = ref<ProductItem | null>(null)
const detailQty = ref(1)
const detailImageIndex = ref(0)
const selectedSingle = ref<Record<string, string>>({})
const selectedMulti = ref<Record<string, string[]>>({})
const localReviews = ref<CatalogReview[]>([])
const reviewSubmitting = ref(false)
const cartOpen = ref(false)
const sendingCartOrder = ref(false)
const timerEnds = ref<Record<string, number>>({})
const manualCarouselIndex = ref<Record<string, number>>({})
const manualCarouselTouchedAt = ref<Record<string, number>>({})

const reviewForm = reactive({
  name: '',
  rating: 5,
  comment: '',
})

const checkoutForm = reactive({
  name: '',
  address: '',
  method: 'Delivery',
  paymentMethod: '',
  zoneId: '',
})

let nowTimer: ReturnType<typeof setInterval> | null = null

const hexToRgba = (hex: string, alpha: number) => {
  const normalized = hex.replace('#', '')
  const safe = normalized.length === 3 ? normalized.split('').map((char) => char + char).join('') : normalized
  const parsed = Number.parseInt(safe, 16)
  const red = (parsed >> 16) & 255
  const green = (parsed >> 8) & 255
  const blue = parsed & 255
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

const activePrice = (product: ProductItem) => product.hasPromo && product.promoPrice !== null ? product.promoPrice : product.basePrice

const formatReviewDate = (dateStr: string | null) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })
}

const reviewStars = (rating: number) => '★'.repeat(rating) + '☆'.repeat(5 - rating)


const settings = computed(() => ({
  ...defaultSettings(props.storefront.settings.businessName || 'Nueva Tienda', props.storefront.slug || props.slugKey),
  ...props.storefront.settings,
}))
const theme = computed(() => ({
  ...defaultTheme(),
  ...props.storefront.theme,
}))
const layout = computed(() => props.layout)
const initials = computed(() => (settings.value.businessName || 'M').trim().slice(0, 1).toUpperCase())
const scheduleState = computed(() => getCurrentScheduleState(settings.value))
const isStoreAcceptingOrders = computed(() => !settings.value.closed && scheduleState.value.isOpen)
const showClosedOverlay = computed(() => !isStoreAcceptingOrders.value && !viewingMenuFromClosed.value)
const closedMessage = computed(() => settings.value.closedMessage || scheduleState.value.label)
const bannerVisible = computed(() => theme.value.bannerEnabled && Boolean(theme.value.bannerText?.trim()))
const hasMap = computed(() => Boolean(settings.value.address?.lat && settings.value.address?.lng))
const mapQuery = computed(() => {
  const address = [settings.value.address.details, settings.value.address.city].filter(Boolean).join(', ')
  return address || `${settings.value.address.lat},${settings.value.address.lng}`
})
const mapEmbedUrl = computed(() => `https://www.google.com/maps?q=${encodeURIComponent(mapQuery.value)}&z=15&output=embed`)
const mapsSearchUrl = computed(() => mapQuery.value ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery.value)}` : '')
const phoneHref = computed(() => {
  const phone = (settings.value.phone || '').replace(/\D/g, '')
  return phone ? `tel:${phone}` : ''
})
const whatsappHref = computed(() => {
  const phone = (settings.value.whatsapp || '').replace(/\D/g, '')
  return phone ? `https://wa.me/${phone}` : ''
})
const availableDelivery = computed(() => Boolean(settings.value.deliveryEnabled && !settings.value.deliveryPaused))
const availablePickup = computed(() => Boolean(settings.value.pickupEnabled))
const availableTags = computed(() => {
  const allTags = props.storefront.products.flatMap((product) => product.tags || [])
  return [...new Set(allTags.filter(Boolean))].sort((left, right) => left.localeCompare(right, 'es'))
})
const cardStyleClass = computed(() => `card-style-${theme.value.cardStyle}`)
const layoutClass = computed(() => (layout.value === 'list' ? 'layout-list' : 'layout-grid'))
const showCheckoutFields = computed(() => settings.value.cartEnabled)
const detailActionsClass = computed(() => ({
  double: Boolean(settings.value.cartEnabled && settings.value.whatsappEnabled && whatsappHref.value),
  single: !settings.value.cartEnabled || !settings.value.whatsappEnabled || !whatsappHref.value,
}))
const deliveryResolution = computed(() => resolveDeliveryFee(settings.value, checkoutForm.zoneId || null))

const themeVars = computed<Record<string, string>>(() => ({
  '--primary': theme.value.primary,
  '--bg': theme.value.bg,
  '--card-bg': theme.value.cardBg,
  '--text': theme.value.headerText,
  '--header-bg': theme.value.headerBg,
  '--text-muted': theme.value.descColor,
  '--product-title': theme.value.productTitleColor,
  '--price-color': theme.value.priceColor,
  '--price-old-color': theme.value.priceOldColor,
  '--detail-bg': theme.value.detailBg,
  '--detail-name': theme.value.detailNameColor,
  '--detail-desc': theme.value.detailDescColor,
  '--detail-price': theme.value.detailPriceColor,
  '--tag-bg': theme.value.tagBg,
  '--tag-text': theme.value.tagText,
  '--offer-bg': theme.value.offerBadgeBg,
  '--offer-text': theme.value.offerBadgeText,
  '--timer-bg': theme.value.timerBadgeBg,
  '--timer-text': theme.value.timerBadgeText,
  '--btn-cart-bg': theme.value.btnCartBg,
  '--btn-cart-text': theme.value.btnCartText,
  '--btn-wa-bg': theme.value.btnWaBg,
  '--btn-wa-text': theme.value.btnWaText,
  '--banner-bg': theme.value.bannerBg,
  '--banner-text': theme.value.bannerTextColor,
  '--search-bg': theme.value.searchInputBg,
  '--search-border': theme.value.searchInputBorder,
}))

const closedTextStyle = computed(() => ({
  color: settings.value.closedTextColor,
  fontSize: `${settings.value.closedTextSizeLarge}px`,
}))

const closedMenuButtonStyle = computed(() => ({
  backgroundColor: settings.value.closedMenuBtnBg,
  color: settings.value.closedMenuBtnText,
}))

const closedTextBoxStyle = computed(() => settings.value.closedTextBox
  ? {
      backgroundColor: hexToRgba(settings.value.closedTextBoxColor, settings.value.closedTextBoxOpacity / 100),
    }
  : {})

const productsByCategory = (categoryId: string) => {
  const needle = search.value.trim().toLowerCase()
  return props.storefront.products.filter((product) => {
    const matchesCategory = product.categoryId === categoryId
    const matchesSearch = !needle || `${product.name} ${product.description}`.toLowerCase().includes(needle)
    const matchesTags = !activeTags.value.length || activeTags.value.every((tag) => product.tags.includes(tag))
    return matchesCategory && matchesSearch && matchesTags
  })
}

const productImages = (product: ProductItem) => {
  const images = getAllProductImages({
    id: product.id,
    categoryId: product.categoryId,
    name: product.name,
    description: product.description,
    price: product.basePrice,
    salePrice: product.promoPrice,
    order: product.sortOrder,
    image: product.imageUrl || '',
    images: (product.imageUrls || []).filter(Boolean) as string[],
    active: product.isActive,
    offerLabel: product.offerLabel,
    offerPosition: product.offerLabelPosition,
    timerHours: product.timerHours,
    timerPosition: product.timerPosition,
    timerShowMinutes: product.timerShowMinutes,
    timerShowSeconds: product.timerShowSeconds,
    timerLinkSale: product.timerLinkSale,
    carouselEnabled: product.carouselEnabled,
    carouselIntervalSeconds: product.carouselIntervalSeconds,
    tags: product.tags,
    variants: [],
    freeShip: product.freeShip ?? false,
    reviewsApprovedCount: product.productRatingCount,
    productRating: product.productRating,
    productRatingCount: product.productRatingCount,
  })

  return images
}

const visibleCategories = computed(() => props.storefront.categories.filter((category) => productsByCategory(category.id).length > 0))
const renderedCategories = computed(() => {
  if (!selectedCategoryId.value) {
    return visibleCategories.value
  }
  return visibleCategories.value.filter((category) => category.id === selectedCategoryId.value)
})

const detailImages = computed(() => selectedProduct.value ? productImages(selectedProduct.value) : [])
const previousDetailImage = computed(() => detailImages.value.length ? (detailImageIndex.value - 1 + detailImages.value.length) % detailImages.value.length : 0)
const nextDetailImage = computed(() => detailImages.value.length ? (detailImageIndex.value + 1) % detailImages.value.length : 0)

const currentProductReviews = computed(() => {
  if (!selectedProduct.value) {
    return []
  }
  return [...localReviews.value]
    .filter((review) => review.productId === selectedProduct.value?.id)
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
})

const currentApprovedReviewCount = computed(() => currentProductReviews.value.filter((review) => review.approved).length)
const currentVisibleReviews = computed(() => currentProductReviews.value.slice(0, 6))

const selectedModifiers = computed(() => {
  if (!selectedProduct.value) {
    return []
  }

  return selectedProduct.value.variants.flatMap((group) => {
    const selectedIds = group.type === 'single'
      ? (selectedSingle.value[group.id] ? [selectedSingle.value[group.id]] : [])
      : (selectedMulti.value[group.id] || [])

    return group.options
      .filter((option) => selectedIds.includes(option.id))
      .map((option) => ({
        groupId: group.id,
        groupName: group.groupName,
        optionId: option.id,
        optionName: option.name,
        priceDelta: option.priceDelta,
      }))
  })
})

const detailUnitPrice = computed(() => {
  if (!selectedProduct.value) {
    return 0
  }
  return activePrice(selectedProduct.value) + selectedModifiers.value.reduce((sum, modifier) => sum + modifier.priceDelta, 0)
})

watch(() => props.slugKey, (slug) => {
  cartStore.hydrateCart(slug)
}, { immediate: true })

watch(() => props.storefront.reviews, (reviews) => {
  localReviews.value = JSON.parse(JSON.stringify(reviews || []))
}, { immediate: true, deep: true })

watch(() => props.storefront.products, (products) => {
  const base = Date.now()
  timerEnds.value = Object.fromEntries(products
    .filter((product) => product.timerHours && product.timerHours > 0)
    .map((product) => [product.id, base + (Number(product.timerHours) * 60 * 60 * 1000)]))
}, { immediate: true, deep: true })

watch([availableDelivery, availablePickup], ([delivery, pickup]) => {
  if (!delivery && pickup) {
    checkoutForm.method = 'Pickup'
  } else if (delivery && !pickup) {
    checkoutForm.method = 'Delivery'
  }
}, { immediate: true })

watch(visibleCategories, (categories) => {
  if (!selectedCategoryId.value && categories[0]) {
    selectedCategoryId.value = categories[0].id
  }

  if (selectedCategoryId.value && !categories.some((category) => category.id === selectedCategoryId.value)) {
    selectedCategoryId.value = ''
  }
}, { immediate: true })

watch(selectedProduct, () => {
  detailQty.value = 1
  detailImageIndex.value = 0
})

onMounted(() => {
  nowTimer = setInterval(() => {
    nowTick.value = Date.now()
  }, 1000)

  window.setTimeout(() => {
    loadingVisible.value = false
  }, 600)
})

onUnmounted(() => {
  if (nowTimer) {
    clearInterval(nowTimer)
  }
})



const isCarouselActive = (product: ProductItem) =>
  Boolean(settings.value.productCarouselEnabled && product.carouselEnabled && productImages(product).length > 1)

const currentProductImageIndex = (product: ProductItem) => {
  const images = productImages(product)
  if (!images.length) {
    return 0
  }
  if (!isCarouselActive(product)) {
    return 0
  }
  const manual = manualCarouselIndex.value[product.id]
  const manualTouchedAt = manualCarouselTouchedAt.value[product.id] || 0
  if (manual !== undefined && Date.now() - manualTouchedAt < 5000) {
    return manual % images.length
  }
  const intervalMs = Number((product.carouselIntervalSeconds || settings.value.productCarouselSeconds || 4) * 1000)
  return Math.floor(nowTick.value / intervalMs) % images.length
}

const moveProductCarousel = (productId: string, delta: number) => {
  const product = props.storefront.products.find((entry) => entry.id === productId)
  if (!product) {
    return
  }
  const total = productImages(product).length
  if (total <= 1) {
    return
  }
  const current = currentProductImageIndex(product)
  manualCarouselIndex.value[productId] = (current + delta + total) % total
  manualCarouselTouchedAt.value[productId] = Date.now()
}

const showOfferOnImage = (product: ProductItem) => Boolean(product.offerLabel && product.offerLabelPosition === 'image')
const showOfferInline = (product: ProductItem) => Boolean(product.offerLabel && product.offerLabelPosition === 'price')
const approvedReviewCount = (productId: string) => localReviews.value.filter((review) => review.productId === productId && review.approved).length
const cartQty = (productId: string) => cartStore.items.filter((item) => item.productId === productId).reduce((sum, item) => sum + item.quantity, 0)
const cartItemImage = (productId: string) => {
  const product = props.storefront.products.find((entry) => entry.id === productId)
  return product ? productImages(product)[0] || '' : ''
}
const groupRequired = (group: ProductVariantGroup) => group.options.some((option) => option.isRequired)

const toggleTag = (tag: string) => {
  activeTags.value = activeTags.value.includes(tag)
    ? activeTags.value.filter((item) => item !== tag)
    : [...activeTags.value, tag]
}

const openDetail = (product: ProductItem) => {
  analytics.trackProductClick(props.storefront.id, product.id)
  selectedProduct.value = product
  selectedSingle.value = {}
  selectedMulti.value = {}
}

const closeDetail = () => {
  selectedProduct.value = null
}

const toggleMulti = (groupId: string, optionId: string) => {
  const current = selectedMulti.value[groupId] || []
  selectedMulti.value[groupId] = current.includes(optionId)
    ? current.filter((id) => id !== optionId)
    : [...current, optionId]
}

const validateDetailSelection = () => {
  if (!selectedProduct.value) {
    return false
  }

  const missing = selectedProduct.value.variants.find((group) => {
    if (!groupRequired(group)) {
      return false
    }

    if (group.type === 'single') {
      return !selectedSingle.value[group.id]
    }

    return !(selectedMulti.value[group.id] || []).length
  })

  if (missing) {
    window.alert(`Selecciona una opción para ${missing.groupName}.`)
    return false
  }

  return true
}

const quickAdd = (product: ProductItem) => {
  analytics.trackProductClick(props.storefront.id, product.id)
  cartStore.addToCart(props.slugKey, product, [], 1)
}

const addSelectedToCart = () => {
  if (!selectedProduct.value || !validateDetailSelection()) {
    return
  }

  cartStore.addToCart(props.slugKey, selectedProduct.value, selectedModifiers.value, detailQty.value)
  closeDetail()
}

const changeSimpleQty = (product: ProductItem, delta: number) => {
  const hash = cartStore.generateCartHash(product.id, [])
  if (delta > 0 && !cartStore.items.find((item) => item.cartItemId === hash)) {
    cartStore.addToCart(props.slugKey, product, [], 1)
    return
  }
  cartStore.updateQuantity(props.slugKey, hash, delta)
}

const changeCartQty = (hash: string, delta: number) => {
  cartStore.updateQuantity(props.slugKey, hash, delta)
}

const removeFromCart = (hash: string) => {
  cartStore.removeFromCart(props.slugKey, hash)
}

const timerMeta = (product: ProductItem) => {
  const endsAt = timerEnds.value[product.id]
  if (!product.timerHours || !endsAt) {
    return null
  }

  const remaining = endsAt - nowTick.value
  if (remaining <= 0) {
    return null
  }

  const totalSeconds = Math.floor(remaining / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const parts = [`${hours}h`]

  if (product.timerShowMinutes) {
    parts.push(`${minutes}m`)
  }

  if (product.timerShowSeconds) {
    parts.push(`${seconds}s`)
  }

  return {
    text: parts.join(' '),
    position: product.timerPosition,
  }
}

const orderSelectedNow = () => {
  if (!selectedProduct.value || !validateDetailSelection()) {
    return
  }

  const item: CartItem = {
    cartItemId: `${selectedProduct.value.id}_${Date.now()}`,
    productId: selectedProduct.value.id,
    productName: selectedProduct.value.name,
    basePrice: activePrice(selectedProduct.value),
    finalUnitPrice: detailUnitPrice.value,
    quantity: detailQty.value,
    modifiers: selectedModifiers.value,
    instructions: '',
  }

  const url = encodeOrderToWhatsApp([item], settings.value, {
    name: '',
    address: '',
    method: 'Pedido directo',
    paymentMethod: '',
  }, item.finalUnitPrice * item.quantity)

  window.open(url, '_blank')
}

const validateCartCheckout = () => {
  if (!cartStore.items.length) {
    return false
  }

  if (checkoutForm.method === 'Delivery' && !availableDelivery.value) {
    window.alert('La entrega a domicilio no está disponible en este momento.')
    return false
  }

  if (checkoutForm.method === 'Pickup' && !availablePickup.value) {
    window.alert('La recogida en tienda no está disponible en este momento.')
    return false
  }

  if (settings.value.checkoutNameEnabled && settings.value.checkoutNameReq === 'obligatorio' && checkoutForm.name.trim().length < 2) {
    window.alert('Ingresa el nombre del cliente para continuar.')
    return false
  }

  if (checkoutForm.method === 'Delivery' && settings.value.deliveryFeeType === 'zones' && !checkoutForm.zoneId) {
    window.alert('Selecciona una zona de entrega.')
    return false
  }

  if (checkoutForm.method === 'Delivery' && settings.value.checkoutAddressEnabled && settings.value.checkoutAddressReq === 'obligatorio' && checkoutForm.address.trim().length < 8) {
    window.alert('Ingresa una dirección de entrega válida.')
    return false
  }

  if (settings.value.checkoutPaymentEnabled && settings.value.checkoutPaymentReq === 'obligatorio' && checkoutForm.paymentMethod.trim().length < 2) {
    window.alert('Indica el método de pago.')
    return false
  }

  if (checkoutForm.method === 'Delivery' && cartStore.totalPrice < deliveryResolution.value.minimumOrder) {
    window.alert(`El pedido mínimo para entrega es ${money(deliveryResolution.value.minimumOrder, settings.value.currency)}.`)
    return false
  }

  return true
}

const sendCartOrder = async () => {
  if (!validateCartCheckout()) {
    return
  }

  sendingCartOrder.value = true

  const order: CatalogOrder = {
    id: generatePublicEntityId('order'),
    catalogId: props.storefront.id,
    channel: 'whatsapp',
    status: 'new',
    customerName: settings.value.checkoutNameEnabled ? checkoutForm.name.trim() : '',
    customerAddress: checkoutForm.method === 'Delivery' && settings.value.checkoutAddressEnabled ? checkoutForm.address.trim() : '',
    paymentMethod: settings.value.checkoutPaymentEnabled ? checkoutForm.paymentMethod.trim() : '',
    deliveryMode: checkoutForm.method === 'Delivery' ? 'delivery' : 'pickup',
    deliveryZoneId: checkoutForm.method === 'Delivery' ? checkoutForm.zoneId || undefined : undefined,
    deliveryZoneName: checkoutForm.method === 'Delivery' ? deliveryResolution.value.zone?.name || undefined : undefined,
    notes: '',
    items: cartStore.items.map((item) => ({
      productId: item.productId,
      productName: item.productName,
      qty: item.quantity,
      unitPrice: item.finalUnitPrice,
      totalPrice: item.finalUnitPrice * item.quantity,
      variantSummary: item.modifiers.map((modifier) => `${modifier.groupName}: ${modifier.optionName}`),
    })),
    subtotal: cartStore.totalPrice,
    discountTotal: 0,
    deliveryFee: checkoutForm.method === 'Delivery' ? deliveryResolution.value.fee : 0,
    appliedCoupon: null,
    total: cartStore.totalPrice + (checkoutForm.method === 'Delivery' ? deliveryResolution.value.fee : 0),
    createdAt: new Date().toISOString(),
  }

  try {
    await backend.appendOrder(props.storefront.id, order)
  } catch (error) {
    console.warn('No se pudo registrar el pedido antes de abrir WhatsApp', error)
  } finally {
    const url = encodeOrderToWhatsApp(cartStore.items, settings.value, {
      name: settings.value.checkoutNameEnabled ? checkoutForm.name.trim() : '',
      address: checkoutForm.method === 'Delivery' && settings.value.checkoutAddressEnabled ? checkoutForm.address.trim() : '',
      method: checkoutForm.method === 'Delivery' ? 'Entrega a domicilio' : 'Recogida en tienda',
      paymentMethod: settings.value.checkoutPaymentEnabled ? checkoutForm.paymentMethod.trim() : '',
      zoneName: checkoutForm.method === 'Delivery' ? deliveryResolution.value.zone?.name || '' : '',
      deliveryFee: checkoutForm.method === 'Delivery' ? deliveryResolution.value.fee : 0,
    }, order.total)

    window.open(url, '_blank')
    cartStore.clearCart(props.slugKey)
    cartOpen.value = false
    sendingCartOrder.value = false
    checkoutForm.address = ''
    checkoutForm.paymentMethod = ''
    checkoutForm.zoneId = ''
  }
}

const submitReview = async () => {
  if (!selectedProduct.value) {
    return
  }

  if (reviewForm.name.trim().length < 2 || reviewForm.comment.trim().length < 3) {
    window.alert('Completa nombre y comentario antes de enviar la reseña.')
    return
  }

  reviewSubmitting.value = true
  const review: CatalogReview = {
    id: generatePublicEntityId('review'),
    productId: selectedProduct.value.id,
    productName: selectedProduct.value.name,
    name: reviewForm.name.trim(),
    comment: reviewForm.comment.trim(),
    rating: reviewForm.rating,
    approved: !settings.value.reviewModeration,
    createdAt: new Date().toISOString(),
  }

  try {
    await backend.appendReview(props.storefront.id, review)
    if (review.approved) {
      localReviews.value.unshift(review)
    }
    reviewForm.name = ''
    reviewForm.rating = 5
    reviewForm.comment = ''
  } finally {
    reviewSubmitting.value = false
  }
}


</script>

<style scoped>
.storefront-shell {
  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
  padding-bottom: 112px;
}

.sticky-shell {
  position: sticky;
  top: 0;
  z-index: 30;
  background: var(--header-bg);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.18);
}

.banner-bar {
  background: var(--banner-bg);
  color: var(--banner-text);
  padding: 0.75rem 1rem;
  font-size: 0.82rem;
  font-weight: 700;
  overflow: hidden;
}

.banner-bar.loop {
  white-space: nowrap;
}

.banner-track {
  display: inline-flex;
  min-width: max-content;
  animation: banner-loop 18s linear infinite;
}

.banner-copy {
  display: inline-flex;
  gap: 1rem;
  padding-right: 1rem;
}

.banner-sep {
  opacity: 0.6;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem;
}

.brand-block {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  min-width: 0;
}

.brand-logo,
.brand-fallback {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  flex-shrink: 0;
}

.brand-logo {
  object-fit: cover;
}

.brand-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.12);
  font-weight: 800;
}

.brand-copy {
  min-width: 0;
}

.brand-copy h1 {
  margin: 0;
  font-size: 1rem;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.brand-copy p {
  margin: 0.2rem 0 0;
  color: color-mix(in srgb, var(--text) 70%, transparent);
  font-size: 0.78rem;
}

.topbar-actions {
  display: flex;
  gap: 0.5rem;
}

.icon-btn {
  border: 1px solid color-mix(in srgb, var(--text) 16%, transparent);
  background: color-mix(in srgb, var(--text) 9%, transparent);
  color: var(--text);
  border-radius: 999px;
  padding: 0.65rem 0.9rem;
  font-weight: 700;
  cursor: pointer;
}

.search-wrap {
  padding: 0 1rem 1rem;
}

.search-input {
  width: 100%;
  border-radius: 16px;
  border: 1px solid var(--search-border);
  background: var(--search-bg);
  color: var(--product-title);
  padding: 0.85rem 1rem;
}

.categories-strip {
  display: flex;
  gap: 0.65rem;
  overflow-x: auto;
  padding: 0 1rem 1rem;
  scrollbar-width: none;
}

.categories-strip::-webkit-scrollbar,
.cart-preview::-webkit-scrollbar {
  display: none;
}

.category-chip {
  flex: 0 0 auto;
  border: 1px solid color-mix(in srgb, var(--text) 14%, transparent);
  background: color-mix(in srgb, var(--card-bg) 84%, transparent);
  color: color-mix(in srgb, var(--text) 70%, transparent);
  border-radius: 999px;
  padding: 0.6rem 0.95rem;
  cursor: pointer;
  font-size: 0.82rem;
  font-weight: 700;
}

.category-chip.active {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary);
}

.loading-screen {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(10, 10, 12, 0.72);
  backdrop-filter: blur(14px);
}

.loading-card {
  width: min(90vw, 360px);
  border-radius: 26px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.14);
  padding: 1.4rem;
  text-align: center;
  color: #fff;
}

.loading-card strong,
.loading-card span {
  display: block;
}

.loading-mark {
  width: 56px;
  height: 56px;
  margin: 0 auto 1rem;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 60%, white));
  font-size: 1.5rem;
  font-weight: 800;
}

.loading-card span {
  margin-top: 0.45rem;
  color: rgba(255, 255, 255, 0.78);
}

.closed-screen {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: color-mix(in srgb, var(--bg) 88%, black);
}

.closed-card {
  width: min(92vw, 520px);
  border-radius: 28px;
  padding: 1.5rem;
  text-align: center;
}

.closed-message {
  margin: 0;
  white-space: pre-line;
  line-height: 1.35;
}

.closed-actions {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  margin-top: 1.25rem;
}

.closed-btn {
  border: 0;
  border-radius: 999px;
  padding: 0.95rem 1.2rem;
  font-weight: 800;
  text-decoration: none;
}

.closed-btn.whatsapp {
  background: #25d366;
  color: #fff;
}

.closed-btn.call {
  background: #2563eb;
  color: #fff;
}

.menu-content {
  padding: 1rem;
}

.menu-content.dimmed {
  filter: blur(2px);
}

.category-section + .category-section {
  margin-top: 1.4rem;
}

.category-head h2 {
  margin: 0;
  color: var(--primary);
  font-size: 1.28rem;
}

.category-head p {
  margin: 0.3rem 0 0;
  color: var(--text-muted);
}

.products-grid {
  display: grid;
  gap: 0.85rem;
  margin-top: 0.9rem;
}

.products-grid.layout-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.products-grid.layout-list {
  grid-template-columns: 1fr;
}

.product-card {
  border: 1px solid color-mix(in srgb, var(--text) 10%, transparent);
  background: var(--card-bg);
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.product-card:hover {
  transform: translateY(-1px);
}

.product-card.list {
  display: flex;
  gap: 0.85rem;
  align-items: stretch;
}

.card-style-flat {
  border-radius: 18px;
  box-shadow: none;
}

.card-style-shadow {
  border-radius: 20px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.15);
}

.card-style-glass-premium {
  border-radius: 22px;
  background: color-mix(in srgb, var(--card-bg) 70%, rgba(255, 255, 255, 0.16));
  backdrop-filter: blur(14px);
  box-shadow: 0 18px 38px rgba(0, 0, 0, 0.18);
}

.card-style-holographic {
  border-radius: 24px;
  background:
    linear-gradient(160deg, color-mix(in srgb, var(--card-bg) 85%, rgba(255, 255, 255, 0.2)), color-mix(in srgb, var(--card-bg) 72%, rgba(0, 255, 255, 0.12))),
    linear-gradient(120deg, rgba(255, 255, 255, 0.1), transparent 45%);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.22);
}

.product-media {
  position: relative;
  aspect-ratio: 1 / 1;
  background: rgba(255, 255, 255, 0.06);
  overflow: hidden;
}

.product-media.list {
  width: 108px;
  min-width: 108px;
  aspect-ratio: auto;
}

.product-image,
.detail-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 0.45s ease;
}

.product-image.active,
.detail-image.active {
  opacity: 1;
}

.fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
}

.media-badges {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 800;
  line-height: 1;
  padding: 0.42rem 0.65rem;
}

.badge.review {
  position: absolute;
  top: 0.65rem;
  left: 0.65rem;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
}

.badge.offer {
  position: absolute;
  bottom: 0.65rem;
  left: 0.65rem;
  background: var(--offer-bg);
  color: var(--offer-text);
}

.badge.offer.inline,
.badge.timer.inline {
  position: static;
}

.badge.timer {
  position: absolute;
  top: 0.65rem;
  right: 0.65rem;
  background: var(--timer-bg);
  color: var(--timer-text);
}

.carousel-controls {
  position: absolute;
  inset: auto 0.65rem 0.65rem auto;
  display: flex;
  gap: 0.35rem;
}

.carousel-btn,
.qty-btn,
.add-btn-mini,
.close-btn,
.detail-nav,
.cart-open-btn,
.primary-btn,
.wa-btn,
.secondary-btn,
.link-btn {
  cursor: pointer;
}

.carousel-btn,
.detail-nav,
.close-btn {
  border: 0;
  border-radius: 999px;
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.48);
  color: #fff;
}

.product-body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 0.45rem;
  padding: 0.85rem 0.95rem 1rem;
  min-width: 0;
}

.product-title {
  color: var(--product-title);
  font-size: 0.95rem;
  font-weight: 800;
  line-height: 1.25;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.tag-chip {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  background: color-mix(in srgb, var(--tag-bg) 28%, transparent);
  border: 1px solid color-mix(in srgb, var(--tag-bg) 45%, transparent);
  color: var(--tag-text);
  padding: 0.34rem 0.64rem;
  font-size: 0.7rem;
  font-weight: 700;
}

.tag-chip.filter.active {
  background: var(--tag-bg);
}

.product-desc {
  color: var(--text-muted);
  font-size: 0.78rem;
  line-height: 1.45;
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.product-footer {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 0.8rem;
  margin-top: auto;
}

.price-stack {
  display: inline-flex;
  flex-direction: column;
  gap: 0.35rem;
}

.price-stack.detail {
  margin: 0.9rem 0 1rem;
}

.price-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.price-main {
  color: var(--detail-price, var(--price-color));
  font-size: 1rem;
  font-weight: 900;
}

.price-old {
  color: var(--price-old-color);
  text-decoration: line-through;
  font-size: 0.82rem;
}

.add-btn-mini {
  border: 0;
  width: 38px;
  height: 38px;
  border-radius: 999px;
  background: var(--btn-cart-bg);
  color: var(--btn-cart-text);
  font-size: 1.2rem;
  font-weight: 800;
}

.qty-inline {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
}

.qty-btn {
  border: 0;
  width: 32px;
  height: 32px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  color: var(--text);
  font-size: 1rem;
  font-weight: 900;
}

.qty-value {
  min-width: 20px;
  text-align: center;
  color: var(--product-title);
  font-weight: 800;
}

.qty-value.detail {
  min-width: 44px;
  color: var(--detail-name);
}

.map-section {
  margin-top: 1.4rem;
  padding: 0 1rem 1rem;
}

.map-section h3 {
  color: var(--detail-name);
  margin-bottom: 0.8rem;
}

.map-frame {
  width: 100%;
  height: 260px;
  border: 0;
  border-radius: 22px;
}

.map-link {
  display: inline-block;
  margin-top: 0.75rem;
  color: #87ceeb;
  font-weight: 700;
}

.cart-bar {
  position: fixed;
  left: 0.75rem;
  right: 0.75rem;
  bottom: 0.75rem;
  z-index: 50;
  border-radius: 24px;
  background: rgba(15, 15, 18, 0.95);
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
  padding: 0.85rem;
}

.cart-preview {
  display: flex;
  gap: 0.45rem;
  overflow-x: auto;
  padding-bottom: 0.65rem;
}

.preview-pill {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  padding: 0.45rem 0.7rem;
  font-size: 0.75rem;
}

.preview-remove {
  border: 0;
  background: transparent;
  color: inherit;
}

.cart-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.cart-summary strong,
.cart-summary span {
  display: block;
  color: #fff;
}

.cart-summary span {
  color: rgba(255, 255, 255, 0.72);
  font-size: 0.78rem;
}

.cart-open-btn,
.primary-btn,
.wa-btn,
.secondary-btn {
  border: 0;
  border-radius: 999px;
  padding: 0.9rem 1.15rem;
  font-weight: 800;
  text-align: center;
  text-decoration: none;
}

.cart-open-btn,
.primary-btn {
  background: var(--btn-cart-bg);
  color: var(--btn-cart-text);
}

.wa-btn {
  background: var(--btn-wa-bg);
  color: var(--btn-wa-text);
}

.secondary-btn {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 80;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(0, 0, 0, 0.62);
  backdrop-filter: blur(6px);
  padding: 0.75rem;
}

.sheet {
  width: min(100%, 760px);
  max-height: calc(100vh - 1.5rem);
  display: flex;
  flex-direction: column;
  border-radius: 28px;
  overflow: hidden;
  background: var(--detail-bg);
  color: var(--detail-name);
  box-shadow: 0 30px 90px rgba(0, 0, 0, 0.3);
}

.sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1rem 0.8rem;
}

.sheet-body {
  overflow-y: auto;
  padding: 0 1rem 1rem;
}

.sheet-actions {
  display: grid;
  gap: 0.75rem;
  padding: 0.95rem 1rem calc(0.95rem + env(safe-area-inset-bottom));
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.sheet-actions.double {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.sheet-actions.single {
  grid-template-columns: 1fr;
}

.detail-gallery {
  position: relative;
  aspect-ratio: 16 / 10;
  overflow: hidden;
  border-radius: 22px;
  background: rgba(0, 0, 0, 0.28);
}

.detail-dots {
  display: flex;
  justify-content: center;
  gap: 0.45rem;
  margin-top: 0.75rem;
}

.detail-dot {
  border: 0;
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.22);
}

.detail-dot.active {
  background: var(--primary);
}

.detail-copy h2 {
  margin: 1rem 0 0;
  color: var(--detail-name);
  font-size: 1.5rem;
}

.detail-desc {
  margin: 0;
  color: var(--detail-desc);
  line-height: 1.6;
  white-space: pre-line;
}

.variant-groups {
  display: grid;
  gap: 0.85rem;
  margin-top: 1rem;
}

.variant-group {
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  padding: 0.9rem;
}

.variant-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.7rem;
}

.variant-head span {
  color: var(--primary);
  font-size: 0.78rem;
  font-weight: 800;
}

.variant-option {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.65rem;
  align-items: center;
  border-radius: 16px;
  padding: 0.7rem 0.8rem;
  background: rgba(255, 255, 255, 0.04);
}

.variant-label,
.variant-price {
  color: var(--detail-name);
}

.variant-price {
  font-weight: 700;
}

.detail-qty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.7rem;
  margin: 1rem 0 1.2rem;
}

.section-title {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  font-weight: 800;
  margin-bottom: 0.85rem;
}

.section-title span {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 24px;
  height: 24px;
  border-radius: 999px;
  background: var(--primary);
  color: #fff;
  font-size: 0.75rem;
}

.review-form,
.checkout-form,
.cart-total-box,
.pickup-card {
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  padding: 0.95rem;
}

.review-form,
.checkout-form {
  display: grid;
  gap: 0.85rem;
}

.field {
  display: grid;
  gap: 0.4rem;
}

.field span {
  color: var(--text-muted);
  font-size: 0.8rem;
  font-weight: 700;
}

.field-input {
  width: 100%;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.2);
  color: var(--detail-name);
  padding: 0.85rem 0.95rem;
  font: inherit;
}

.reviews-list {
  display: grid;
  gap: 0.75rem;
  margin-top: 0.85rem;
}

.review-card {
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.04);
  padding: 0.9rem;
}

.review-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.45rem;
}

.review-head strong,
.review-head span {
  display: block;
}

.review-head span,
.review-card p,
.pickup-card p,
.pickup-card span,
.cart-modifiers,
.location-row span {
  color: var(--detail-desc);
}

.review-card p {
  margin: 0;
  line-height: 1.5;
}

.review-pending {
  border-radius: 999px;
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
  padding: 0.25rem 0.55rem;
  font-size: 0.72rem;
  font-weight: 800;
}

.empty-review {
  color: var(--detail-desc);
  text-align: center;
  padding: 1rem 0.5rem;
}

.cart-body {
  display: grid;
  gap: 0.85rem;
}

.cart-item {
  display: grid;
  grid-template-columns: 68px minmax(0, 1fr) auto;
  gap: 0.8rem;
  align-items: center;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.03);
  padding: 0.85rem;
}

.cart-thumb,
.cart-thumb img {
  width: 68px;
  height: 68px;
  border-radius: 16px;
}

.cart-thumb img {
  object-fit: cover;
}

.cart-item-copy {
  min-width: 0;
  display: grid;
  gap: 0.25rem;
}

.cart-item-copy strong {
  color: var(--detail-name);
}

.cart-item-price {
  color: var(--detail-price);
  font-weight: 800;
}

.cart-item-actions {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.55rem;
}

.cart-qty {
  flex-wrap: nowrap;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  padding: 0.2rem;
}

.link-btn {
  border: 0;
  background: transparent;
  color: #f87171;
  font-weight: 700;
}

.total-row,
.location-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.location-row {
  margin-top: 0.8rem;
}

.location-row a {
  color: #87ceeb;
  font-weight: 700;
}

.fade-enter-active,
.fade-leave-active,
.fade-slide-enter-active,
.fade-slide-leave-active,
.fade-slide-up-enter-active,
.fade-slide-up-leave-active {
  transition: all 0.22s ease;
}

.fade-enter-from,
.fade-leave-to,
.fade-slide-enter-from,
.fade-slide-leave-to,
.fade-slide-up-enter-from,
.fade-slide-up-leave-to {
  opacity: 0;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  transform: translateY(-8px);
}

.fade-slide-up-enter-from,
.fade-slide-up-leave-to {
  transform: translateY(10px);
}

@keyframes banner-loop {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-50%);
  }
}

@media (max-width: 640px) {
  .products-grid.layout-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .sheet-actions.double {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .cart-item {
    grid-template-columns: 56px minmax(0, 1fr);
  }

  .cart-item-actions {
    grid-column: 1 / -1;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
  }
}

@media (min-width: 900px) {
  .products-grid.layout-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
</style>
