<template>
  <section class="menu-shell" :style="themeVars">
    <div v-if="bannerEnabled && !theme.bannerSticky" class="top-banner-slot">
      <div v-if="theme.bannerMode === 'loop'" class="top-banner loop">
        <div class="top-banner-track">
          <span v-for="index in 2" :key="index" class="top-banner-item">
            {{ theme.bannerText }}
            <span class="top-banner-sep">•</span>
            {{ theme.bannerText }}
            <span class="top-banner-sep">•</span>
            {{ theme.bannerText }}
          </span>
        </div>
      </div>
      <div v-else class="top-banner static">{{ theme.bannerText }}</div>
    </div>

    <div class="sticky-wrapper">
      <div v-if="bannerEnabled && theme.bannerSticky" class="top-banner-slot">
        <div v-if="theme.bannerMode === 'loop'" class="top-banner loop">
          <div class="top-banner-track">
            <span v-for="index in 2" :key="index" class="top-banner-item">
              {{ theme.bannerText }}
              <span class="top-banner-sep">•</span>
              {{ theme.bannerText }}
              <span class="top-banner-sep">•</span>
              {{ theme.bannerText }}
            </span>
          </div>
        </div>
        <div v-else class="top-banner static">{{ theme.bannerText }}</div>
      </div>

      <div class="header">
        <div class="header-brand">
          <img v-if="settings.logoUrl" :src="settings.logoUrl" :alt="settings.businessName" class="header-logo">
          <div v-else class="header-logo header-logo-placeholder">{{ initials }}</div>
          <h1 id="header-title">{{ settings.businessName }}</h1>
        </div>
        <div class="header-actions">
          <button v-if="availableTags.length" class="search-btn filter-btn" @click="filtersOpen = true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
          </button>
          <button class="search-btn" @click="toggleSearch">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            Buscar
          </button>
        </div>
      </div>

      <div class="search-container" :class="{ active: searchOpen }">
        <input v-model="search" class="search-input" type="text" placeholder="Buscar platillo...">
      </div>

      <nav class="categories-nav">
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

    <div v-if="loadingVisible" id="loading">
      <div class="loading-shell">
        <div class="loading-brand">{{ settings.logoUrl ? '🍽️' : initials }}</div>
        <div class="loading-title">Preparando tu menú</div>
        <div class="loading-subtitle">Cargando tu menú digital...</div>
        <div class="loading-progress"></div>
      </div>
    </div>

    <div v-if="showClosedOverlay" id="closed-screen">
      <div id="closed-content">
        <div id="closed-text-box" :style="closedTextBoxStyle">
          <div id="closed-text" :style="closedTextStyle">{{ closedMessage }}</div>
        </div>
        <div id="closed-buttons">
          <button
            v-if="settings.closedShowMenuBtn"
            id="closed-menu-btn"
            :style="closedMenuButtonStyle"
            @click="viewingMenuFromClosed = true"
          >
            Ver menú
          </button>
          <a v-if="settings.closedShowWhatsapp && whatsappHref" id="closed-whatsapp-btn" :href="whatsappHref" target="_blank" rel="noopener noreferrer">WhatsApp</a>
          <a v-if="settings.closedShowCall && phoneHref" id="closed-call-btn" :href="phoneHref">Llamar</a>
        </div>
      </div>
    </div>

    <div id="menu-content">
      <section v-for="category in renderedCategories" :key="category.id" class="category-section" :id="`cat-${category.id}`">
        <h2 class="category-title">{{ category.name }}</h2>
        <p v-if="category.description" class="category-note">{{ category.description }}</p>

        <div class="products-grid" :class="layoutClass">
          <article
            v-for="product in productsByCategory(category.id)"
            :key="product.id"
            class="product-card"
            @click="openDetail(product)"
          >
            <div class="product-img-container" :class="{ list: layout === 'list' }">
              <span v-if="approvedReviewCount(product.id) > 0" class="product-review-badge">
                <span class="icon">💬</span>
                <span>{{ approvedReviewCount(product.id) }}</span>
              </span>
              <img v-if="primaryImage(product)" :src="primaryImage(product)" :alt="product.name" class="product-img">
              <div v-else class="product-img fallback">Sin imagen</div>
              <span v-if="showOfferOnImage(product)" class="product-offer-badge image">{{ product.offerLabel }}</span>
              <span v-if="timerMeta(product) && timerMeta(product)?.position === 'image-right'" class="product-timer-badge image-right">
                {{ timerMeta(product)?.text }}
              </span>
            </div>

            <div class="product-info">
              <div class="product-name">{{ product.name }}</div>
              <div v-if="product.tags.length" class="product-tags">
                <span v-for="tag in product.tags.slice(0, 2)" :key="tag" class="product-tag-badge">{{ tag }}</span>
              </div>
              <div v-if="product.description" class="product-desc">{{ product.description }}</div>
              <div class="product-footer">
                <span class="product-price">
                  <span class="product-price-stack">
                    <span class="product-price-row">
                      <span>{{ money(activePrice(product), settings.currency) }}</span>
                      <span v-if="product.hasPromo && product.promoPrice !== null" class="product-price-old">{{ money(product.basePrice, settings.currency) }}</span>
                      <span v-if="showOfferInline(product)" class="product-offer-badge" :class="{ 'inline-list': layout === 'list' }">{{ product.offerLabel }}</span>
                    </span>
                    <span v-if="timerMeta(product) && timerMeta(product)?.position === 'price-below'" class="product-timer-badge">{{ timerMeta(product)?.text }}</span>
                    <span v-if="timerMeta(product) && timerMeta(product)?.position === 'image-right' && layout === 'list'" class="product-timer-badge inline-list">{{ timerMeta(product)?.text }}</span>
                    <div v-if="product.variants[0]?.options?.length" class="product-variants-preview">
                      <span v-for="option in product.variants[0].options.slice(0, 3)" :key="option.id" class="variant-tag-mini">
                        {{ option.name }}<template v-if="option.priceDelta > 0"> +{{ money(option.priceDelta, settings.currency) }}</template>
                      </span>
                      <span v-if="product.variants[0].options.length > 3" class="variant-tag-mini">...</span>
                    </div>
                  </span>
                </span>

                <button v-if="!settings.cartEnabled" class="add-btn-mini hidden-action">+</button>
                <button v-else-if="product.variants.length > 0" class="add-btn-mini" @click.stop="openDetail(product)">+</button>
                <div v-else-if="cartQty(product.id) > 0" class="card-qty-control" @click.stop>
                  <button class="card-qty-btn minus" @click="changeSimpleQty(product, -1)">{{ cartQty(product.id) === 1 ? '✕' : '−' }}</button>
                  <div class="card-qty-val">{{ cartQty(product.id) }}</div>
                  <button class="card-qty-btn plus" @click="changeSimpleQty(product, 1)">+</button>
                </div>
                <button v-else class="add-btn-mini" @click.stop="quickAdd(product)">+</button>
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>

    <section v-if="hasMap" id="menu-map-section" class="menu-map-section">
      <h3 class="menu-map-title">📍 Ubicación</h3>
      <iframe id="menu-map-frame" class="menu-map-frame" :src="mapEmbedUrl" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen />
      <div class="menu-map-open-wrap">
        <a id="menu-map-open" class="menu-map-open" :href="mapsSearchUrl" target="_blank" rel="noopener noreferrer">🗺️ Abrir en Google Maps</a>
      </div>
    </section>

    <div v-if="settings.cartEnabled && cartStore.isHydrated && cartStore.totalItems > 0" class="cart-bar" :class="{ visible: cartStore.totalItems > 0 }">
      <div class="cart-preview">
        <div v-for="item in cartStore.items.slice(0, 4)" :key="item.cartItemId" class="preview-tag">
          <span class="preview-qty">{{ item.quantity }}x</span>
          <span>{{ item.productName }}</span>
          <button class="preview-remove" @click="removeFromCart(item.cartItemId)">✕</button>
        </div>
      </div>
      <div class="cart-main-row">
        <div class="cart-info">
          <div class="cart-icon">🛒 <span class="cart-badge">{{ cartStore.totalItems }}</span></div>
          <div>
            <div class="cart-total">{{ money(cartStore.totalPrice, settings.currency) }}</div>
            <div class="cart-subtext">Total estimado</div>
          </div>
        </div>
        <button class="cart-view-btn" @click="cartOpen = true">Ver Pedido</button>
      </div>
    </div>

    <div v-if="filtersOpen" class="modal-overlay active" @click.self="filtersOpen = false">
      <div class="modal-header">
        <span class="modal-title">Filtros del Menú</span>
        <button class="close-btn" @click="filtersOpen = false">×</button>
      </div>
      <div class="detail-content modal-pad">
        <p class="modal-copy">Selecciona una o más etiquetas para filtrar los platillos:</p>
        <div class="tags-filter-bar">
          <button
            v-for="tag in availableTags"
            :key="tag"
            class="tag-filter-chip"
            :class="{ active: activeTags.includes(tag) }"
            @click="toggleTag(tag)"
          >
            {{ tag }}
          </button>
        </div>
      </div>
      <div class="detail-actions">
        <button class="btn-large btn-add-cart" @click="filtersOpen = false">Ver Resultados</button>
      </div>
    </div>

    <div v-if="selectedProduct" class="modal-overlay active" @click.self="closeDetail">
      <div class="modal-header">
        <span class="modal-title">Detalle</span>
        <button class="close-btn" @click="closeDetail">×</button>
      </div>
      <div class="detail-content">
        <div class="detail-gallery">
          <img :src="detailImages[detailImageIndex] || ''" :alt="selectedProduct.name" class="detail-img">
          <span v-if="showOfferOnImage(selectedProduct)" class="product-offer-badge image">{{ selectedProduct.offerLabel }}</span>
          <span v-if="timerMeta(selectedProduct) && timerMeta(selectedProduct)?.position === 'image-right'" class="product-timer-badge image-right">{{ timerMeta(selectedProduct)?.text }}</span>
          <button v-if="detailImages.length > 1" class="detail-gallery-btn prev" @click="detailImageIndex = previousDetailImage">‹</button>
          <button v-if="detailImages.length > 1" class="detail-gallery-btn next" @click="detailImageIndex = nextDetailImage">›</button>
          <div v-if="detailImages.length > 1" class="detail-gallery-count">{{ detailImageIndex + 1 }}/{{ detailImages.length }}</div>
        </div>
        <div v-if="detailImages.length > 1" class="detail-gallery-dots">
          <button
            v-for="(image, index) in detailImages"
            :key="`${selectedProduct.id}-${index}`"
            class="detail-dot"
            :class="{ active: detailImageIndex === index }"
            @click="detailImageIndex = index"
          />
        </div>
        <div class="detail-body">
          <h2 class="detail-name">{{ selectedProduct.name }}</h2>
          <div class="detail-price">
            <div class="detail-price-stack">
              <div class="detail-price-row">
                <span>{{ money(detailUnitPrice, settings.currency) }}</span>
                <span v-if="selectedProduct.hasPromo && selectedProduct.promoPrice !== null" class="product-price-old">{{ money(selectedProduct.basePrice, settings.currency) }}</span>
                <span v-if="selectedProduct.offerLabel && selectedProduct.offerLabelPosition === 'price'" class="product-offer-badge">{{ selectedProduct.offerLabel }}</span>
              </div>
              <div v-if="timerMeta(selectedProduct) && timerMeta(selectedProduct)?.position === 'price-below'" class="product-timer-badge">{{ timerMeta(selectedProduct)?.text }}</div>
            </div>
          </div>
          <div v-if="selectedProduct.tags.length" class="tags-container">
            <span v-for="tag in selectedProduct.tags" :key="tag" class="product-tag-badge large">{{ tag }}</span>
          </div>
          <p class="detail-desc">{{ selectedProduct.description }}</p>

          <div v-if="selectedProduct.variants.length" class="detail-variants-container">
            <div v-for="group in selectedProduct.variants" :key="group.id" class="variant-group">
              <div class="variant-group-head">
                <strong>{{ group.groupName }}</strong>
                <span v-if="groupRequired(group)" class="variant-required">Requerido</span>
              </div>
              <div class="variant-options">
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
                  <span>{{ option.name }}</span>
                  <span v-if="option.priceDelta > 0">+{{ money(option.priceDelta, settings.currency) }}</span>
                </label>
              </div>
            </div>
          </div>

          <div class="detail-qty-row">
            <button class="card-qty-btn minus" @click="detailQty = Math.max(1, detailQty - 1)">−</button>
            <div class="card-qty-val detail">{{ detailQty }}</div>
            <button class="card-qty-btn plus" @click="detailQty += 1">+</button>
          </div>

          <div v-if="settings.reviewsEnabled" class="reviews-section">
            <div class="reviews-section-title">
              💬 Reseñas
              <span class="reviews-count-badge">{{ currentApprovedReviewCount }}</span>
            </div>

            <div class="review-form">
              <div class="review-form-row">
                <label class="review-form-label">Tu nombre</label>
                <input v-model="reviewForm.name" class="review-form-input" type="text" maxlength="20" placeholder="Escribe tu nombre" autocomplete="off">
              </div>
              <div class="review-form-row">
                <label class="review-form-label">Tu calificación</label>
                <select v-model.number="reviewForm.rating" class="review-form-input">
                  <option :value="5">★★★★★ (5)</option>
                  <option :value="4">★★★★☆ (4)</option>
                  <option :value="3">★★★☆☆ (3)</option>
                  <option :value="2">★★☆☆☆ (2)</option>
                  <option :value="1">★☆☆☆☆ (1)</option>
                </select>
                <label class="review-form-label">Tu comentario</label>
                <textarea v-model="reviewForm.comment" class="review-form-input" maxlength="300" rows="3" placeholder="¿Qué te pareció este platillo?&#10;Compártenos tu opinión" />
                <div class="char-counter-wrap">
                  <span class="char-counter-text">{{ reviewForm.comment.length }} / 300</span>
                  <div class="char-progress-bar">
                    <div class="char-progress-fill" :style="{ width: `${Math.min(100, (reviewForm.comment.length / 300) * 100)}%` }"></div>
                  </div>
                </div>
              </div>
              <button class="review-submit-btn" :disabled="reviewSubmitting" :class="{ loading: reviewSubmitting }" @click="submitReview">
                <span class="btn-text">Enviar Reseña</span>
                <span class="spinner"></span>
              </button>
            </div>

            <div class="review-list">
              <div v-if="!currentVisibleReviews.length" class="review-empty">
                <div class="review-empty-icon">💬</div>
                <div class="review-empty-text">Sé el primero en dejar una reseña</div>
              </div>
              <div
                v-for="review in currentVisibleReviews"
                :key="review.id"
                class="review-item"
                :class="{ 'pending-approval': review.approved === false }"
              >
                <div class="review-header">
                  <div class="review-avatar" :style="{ background: avatarGradient(review.name) }">{{ reviewInitials(review.name) }}</div>
                  <div class="review-meta">
                    <div class="review-author">{{ review.name || 'Anónimo' }}</div>
                    <div class="review-date">{{ formatReviewDate(review.createdAt) }} · {{ reviewStars(review.rating) }}</div>
                  </div>
                  <span v-if="review.approved === false" class="review-pending-badge">Pendiente de aprobación</span>
                </div>
                <div class="review-text">{{ review.comment }}</div>
              </div>
            </div>

            <button v-if="canLoadMoreReviews" class="review-load-more" @click="reviewPage += 1">Ver más comentarios ▾</button>
          </div>
        </div>
      </div>
      <div class="detail-actions">
        <button v-if="settings.cartEnabled" class="btn-large btn-add-cart" @click="addSelectedToCart">🛒 Agregar al carrito</button>
        <button v-if="settings.whatsappEnabled && whatsappHref" class="btn-large btn-whatsapp" @click="orderSelectedNow">💬 Pedir Ahora</button>
      </div>
    </div>

    <div v-if="cartOpen" class="modal-overlay active" @click.self="cartOpen = false">
      <div class="modal-header">
        <span class="modal-title">Tu Pedido 🛒</span>
        <button class="close-btn" @click="cartOpen = false">×</button>
      </div>
      <div class="cart-list">
        <div v-if="!cartStore.items.length" class="review-empty">
          <div class="review-empty-icon">🛒</div>
          <div class="review-empty-text">Tu carrito está vacío</div>
        </div>
        <div v-for="item in cartStore.items" :key="item.cartItemId" class="cart-item">
          <img v-if="cartItemImage(item.productId)" :src="cartItemImage(item.productId)!" class="cart-item-img">
          <div v-else class="cart-item-img fallback small">Sin imagen</div>
          <div class="cart-item-info">
            <div class="cart-item-name">{{ item.productName }}</div>
            <div v-if="item.modifiers.length" class="cart-item-modifiers">{{ item.modifiers.map((modifier) => `${modifier.groupName}: ${modifier.optionName}`).join(', ') }}</div>
            <div class="cart-item-price">{{ money(item.finalUnitPrice * item.quantity, settings.currency) }}</div>
          </div>
          <div class="card-qty-control vertical">
            <button class="card-qty-btn minus" @click="changeCartQty(item.cartItemId, -1)">{{ item.quantity === 1 ? '✕' : '−' }}</button>
            <div class="card-qty-val">{{ item.quantity }}</div>
            <button class="card-qty-btn plus" @click="changeCartQty(item.cartItemId, 1)">+</button>
          </div>
        </div>
      </div>
      <div class="cart-footer">
        <div class="cart-total-row">
          <span>Total:</span>
          <span>{{ money(cartStore.totalPrice, settings.currency) }}</span>
        </div>
        <div class="cart-footer-btns">
          <a v-if="phoneHref" class="btn-large btn-call" :href="phoneHref">📞 Llamar</a>
          <button class="btn-large btn-whatsapp" :disabled="!cartStore.items.length || sendingCartOrder" @click="sendCartOrder">
            {{ sendingCartOrder ? 'Enviando...' : '💬 Enviar Pedido' }}
          </button>
        </div>
        <div v-if="mapsSearchUrl" class="cart-location-row">
          <span class="cart-location-text">{{ settings.address.details || settings.address.city }}</span>
          <a class="cart-location-link" :href="mapsSearchUrl" target="_blank" rel="noopener noreferrer">📍 Ver ubicación</a>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { CatalogReview, ProductVariantGroup } from '~/types/catalog'
import type { StorefrontPayload } from '~/composables/useStorefrontExperience'
import type { CartItem } from '~/stores/cart'
import type { ProductItem } from '~/stores/catalog'
import { getAllProductImages, getCurrentScheduleState, money } from '~/utils/catalog'

const props = defineProps<{
  storefront: StorefrontPayload
  slugKey: string
  layout: 'classic' | 'list'
}>()

const cartStore = useCartStore()
const backend = useSupabaseBackend()
const { encodeOrderToWhatsApp } = useCheckoutEngine()

const loadingVisible = ref(true)
const viewingMenuFromClosed = ref(false)
const searchOpen = ref(false)
const search = ref('')
const selectedCategoryId = ref('')
const filtersOpen = ref(false)
const activeTags = ref<string[]>([])
const selectedProduct = ref<ProductItem | null>(null)
const detailImageIndex = ref(0)
const detailQty = ref(1)
const selectedSingle = ref<Record<string, string>>({})
const selectedMulti = ref<Record<string, string[]>>({})
const reviewPage = ref(1)
const reviewSubmitting = ref(false)
const cartOpen = ref(false)
const sendingCartOrder = ref(false)
const localReviews = ref<CatalogReview[]>([])
const timerStarts = ref<Record<string, number>>({})

const reviewForm = reactive({
  name: '',
  rating: 5,
  comment: '',
})

// Helper functions - must be defined before computed that use them
const productsByCategory = (categoryId: string) => props.storefront.products.filter((product) => {
  const matchesCategory = product.categoryId === categoryId
  const needle = search.value.trim().toLowerCase()
  const matchesSearch = !needle || `${product.name} ${product.description}`.toLowerCase().includes(needle)
  const matchesTags = !activeTags.value.length || activeTags.value.every((tag) => product.tags.includes(tag))
  return matchesCategory && matchesSearch && matchesTags
})

const activePrice = (product: ProductItem) => product.hasPromo && product.promoPrice !== null ? product.promoPrice : product.basePrice
const primaryImage = (product: ProductItem) => product.imageUrl || product.imageUrls.find(Boolean) || ''
const showOfferOnImage = (product: ProductItem) => Boolean(product.offerLabel && product.offerLabelPosition === 'image')
const showOfferInline = (product: ProductItem) => Boolean(product.offerLabel && product.offerLabelPosition === 'price')
const approvedReviewCount = (productId: string) => localReviews.value.filter((review) => review.productId === productId && review.approved).length
const cartQty = (productId: string) => cartStore.items.filter((item) => item.productId === productId).reduce((sum, item) => sum + item.quantity, 0)
const cartItemImage = (productId: string) => {
  const product = props.storefront.products.find((entry) => entry.id === productId)
  return product ? primaryImage(product) : ''
}

const groupRequired = (group: ProductVariantGroup) => group.options.some((option) => option.isRequired)

const theme = computed(() => props.storefront.theme)
const settings = computed(() => props.storefront.settings)
const layout = computed(() => props.layout)
const initials = computed(() => (settings.value.businessName || 'M').trim().slice(0, 1).toUpperCase())
const bannerEnabled = computed(() => Boolean(theme.value.bannerText?.trim()))
const layoutClass = computed(() => (props.layout === 'list' ? 'layout-1' : 'layout-2'))
const visibleCategories = computed(() => props.storefront.categories.filter((category) => productsByCategory(category.id).length > 0))
const renderedCategories = computed(() => {
  if (!selectedCategoryId.value) {
    return visibleCategories.value
  }
  return visibleCategories.value.filter((category) => category.id === selectedCategoryId.value)
})

const themeVars = computed<Record<string, string>>(() => ({
  '--primary': theme.value.primary,
  '--bg': theme.value.bg,
  '--card-bg': theme.value.cardBg,
  '--text': theme.value.headerText,
  '--product-title-color': theme.value.productTitleColor,
  '--text-muted': theme.value.descColor,
  '--header-bg': theme.value.headerBg,
  '--cat-note-color': theme.value.catNoteColor,
  '--detail-bg': theme.value.detailBg,
  '--detail-name-color': theme.value.detailNameColor,
  '--detail-price-color': theme.value.detailPriceColor,
  '--detail-desc-color': theme.value.detailDescColor,
  '--btn-cart-bg': theme.value.btnCartBg,
  '--btn-cart-text': theme.value.btnCartText,
  '--btn-wa-bg': theme.value.btnWaBg,
  '--btn-wa-text': theme.value.btnWaText,
  '--offer-badge-bg': theme.value.offerBadgeBg,
  '--offer-badge-text': theme.value.offerBadgeText,
  '--timer-badge-bg': theme.value.timerBadgeBg,
  '--timer-badge-text': theme.value.timerBadgeText,
  '--banner-bg': theme.value.bannerBg,
  '--banner-text': theme.value.bannerTextColor,
  '--tag-bg': theme.value.tagBg,
  '--tag-text': theme.value.tagText,
  '--search-input-bg': theme.value.searchInputBg,
  '--search-input-border': theme.value.searchInputBorder,
  '--search-btn-bg': `${theme.value.headerText}1A`,
  '--search-btn-border': `${theme.value.headerText}26`,
  '--search-btn-active': `${theme.value.headerText}33`,
}))

const scheduleState = computed(() => getCurrentScheduleState(settings.value))
const isStoreAcceptingOrders = computed(() => !settings.value.closed && scheduleState.value.isOpen)
const showClosedOverlay = computed(() => !isStoreAcceptingOrders.value && !viewingMenuFromClosed.value)
const closedMessage = computed(() => settings.value.closedMessage || scheduleState.value.label)
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
const availableTags = computed(() => {
  const allTags = props.storefront.products.flatMap((product) => product.tags || [])
  return [...new Set(allTags.filter(Boolean))].sort((left, right) => left.localeCompare(right, 'es'))
})

const closedTextStyle = computed(() => ({
  color: settings.value.closedTextColor,
  fontSize: `${settings.value.closedTextSizeLarge}px`,
}))
const closedTextBoxStyle = computed(() => settings.value.closedTextBox
  ? {
      backgroundColor: hexToRgba(settings.value.closedTextBoxColor, settings.value.closedTextBoxOpacity / 100),
      borderRadius: '16px',
      padding: '25px 35px',
    }
  : {})
const closedMenuButtonStyle = computed(() => ({
  background: settings.value.closedMenuBtnBg,
  color: settings.value.closedMenuBtnText,
}))

const detailImages = computed(() => {
  if (!selectedProduct.value) {
    return []
  }
  return getAllProductImages({
    id: selectedProduct.value.id,
    categoryId: selectedProduct.value.categoryId,
    name: selectedProduct.value.name,
    description: selectedProduct.value.description,
    price: selectedProduct.value.basePrice,
    salePrice: selectedProduct.value.promoPrice,
    order: selectedProduct.value.sortOrder,
    image: selectedProduct.value.imageUrl || '',
    images: (selectedProduct.value.imageUrls || []).filter(Boolean) as string[],
    active: selectedProduct.value.isActive,
    offerLabel: selectedProduct.value.offerLabel,
    offerPosition: selectedProduct.value.offerLabelPosition,
    timerHours: selectedProduct.value.timerHours,
    timerPosition: selectedProduct.value.timerPosition,
    timerShowMinutes: selectedProduct.value.timerShowMinutes,
    timerShowSeconds: selectedProduct.value.timerShowSeconds,
    timerLinkSale: selectedProduct.value.timerLinkSale,
    tags: selectedProduct.value.tags,
    variants: [],
    reviewsApprovedCount: selectedProduct.value.productRatingCount,
    productRating: selectedProduct.value.productRating,
    productRatingCount: selectedProduct.value.productRatingCount,
  })
})

const selectedModifiers = computed(() => {
  if (!selectedProduct.value) {
    return []
  }
  return selectedProduct.value.variants.flatMap((group) => {
    const ids = group.type === 'single'
      ? (selectedSingle.value[group.id] ? [selectedSingle.value[group.id]] : [])
      : (selectedMulti.value[group.id] || [])
    return group.options
      .filter((option) => ids.includes(option.id))
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

const currentProductReviews = computed(() => {
  if (!selectedProduct.value) {
    return []
  }
  return [...localReviews.value]
    .filter((review) => review.productId === selectedProduct.value?.id)
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
})
const currentApprovedReviewCount = computed(() => currentProductReviews.value.filter((review) => review.approved).length)
const currentVisibleReviews = computed(() => currentProductReviews.value.slice(0, reviewPage.value * 5))
const canLoadMoreReviews = computed(() => currentProductReviews.value.length > currentVisibleReviews.value.length)
const previousDetailImage = computed(() => detailImages.value.length ? (detailImageIndex.value - 1 + detailImages.value.length) % detailImages.value.length : 0)
const nextDetailImage = computed(() => detailImages.value.length ? (detailImageIndex.value + 1) % detailImages.value.length : 0)

watch(() => props.slugKey, (slug) => {
  cartStore.hydrateCart(slug)
}, { immediate: true })

watch(() => props.storefront.reviews, (reviews) => {
  localReviews.value = JSON.parse(JSON.stringify(reviews || []))
}, { immediate: true, deep: true })

watch(() => props.storefront.products, (products) => {
  const now = Date.now()
  timerStarts.value = Object.fromEntries(products
    .filter((product) => product.timerHours && product.timerHours > 0)
    .map((product) => [product.id, now + (Number(product.timerHours) * 60 * 60 * 1000)]))
}, { immediate: true, deep: true })

watch(visibleCategories, (categories) => {
  if (!selectedCategoryId.value && categories[0]) {
    selectedCategoryId.value = categories[0].id
  }
  if (selectedCategoryId.value && !categories.some((category) => category.id === selectedCategoryId.value)) {
    selectedCategoryId.value = categories[0]?.id || ''
  }
}, { immediate: true })

watch(selectedProduct, () => {
  reviewPage.value = 1
})

onMounted(() => {
  window.setTimeout(() => {
    loadingVisible.value = false
  }, 650)
})

const toggleSearch = () => {
  searchOpen.value = !searchOpen.value
  if (!searchOpen.value) {
    search.value = ''
  }
}

const toggleTag = (tag: string) => {
  activeTags.value = activeTags.value.includes(tag)
    ? activeTags.value.filter((item) => item !== tag)
    : [...activeTags.value, tag]
}

const openDetail = (product: ProductItem) => {
  selectedProduct.value = product
  detailImageIndex.value = 0
  detailQty.value = 1
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
    window.alert(`Selecciona una opción para ${missing.groupName}`)
    return false
  }
  return true
}

const quickAdd = (product: ProductItem) => {
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

const buildSingleItem = (): CartItem | null => {
  if (!selectedProduct.value) {
    return null
  }
  const finalUnitPrice = detailUnitPrice.value
  return {
    cartItemId: `${selectedProduct.value.id}_${Date.now()}`,
    productId: selectedProduct.value.id,
    productName: selectedProduct.value.name,
    basePrice: activePrice(selectedProduct.value),
    finalUnitPrice,
    quantity: detailQty.value,
    modifiers: selectedModifiers.value,
    instructions: '',
  }
}

const orderSelectedNow = () => {
  if (!selectedProduct.value || !validateDetailSelection()) {
    return
  }
  const item = buildSingleItem()
  if (!item) {
    return
  }
  const url = encodeOrderToWhatsApp([item], settings.value, {
    name: '',
    address: '',
    method: 'Pedido directo',
    paymentMethod: '',
  }, item.finalUnitPrice * item.quantity)
  window.open(url, '_blank')
}

const sendCartOrder = async () => {
  if (!cartStore.items.length) {
    return
  }
  sendingCartOrder.value = true
  try {
    await backend.appendOrder(props.storefront.id, {
      id: `order-${Date.now()}`,
      catalogId: props.storefront.id,
      channel: 'whatsapp',
      status: 'new',
      customerName: '',
      customerAddress: '',
      paymentMethod: '',
      deliveryMode: 'pickup',
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
      deliveryFee: 0,
      appliedCoupon: null,
      total: cartStore.totalPrice,
      createdAt: new Date().toISOString(),
    })
  } catch (error) {
    console.warn('No se pudo guardar el pedido antes de WhatsApp', error)
  } finally {
    const url = encodeOrderToWhatsApp(cartStore.items, settings.value, {
      name: '',
      address: '',
      method: 'Pedido del carrito',
      paymentMethod: '',
    }, cartStore.totalPrice)
    window.open(url, '_blank')
    cartStore.clearCart(props.slugKey)
    cartOpen.value = false
    sendingCartOrder.value = false
  }
}

const submitReview = async () => {
  if (!selectedProduct.value) {
    return
  }
  if (reviewForm.name.trim().length < 2 || reviewForm.name.trim().length > 20 || reviewForm.comment.trim().length < 3 || reviewForm.comment.trim().length > 300) {
    window.alert('Revisa nombre y comentario antes de enviar.')
    return
  }
  reviewSubmitting.value = true
  const review: CatalogReview = {
    id: `review-${Date.now()}`,
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
    localReviews.value.unshift(review)
    reviewForm.name = ''
    reviewForm.rating = 5
    reviewForm.comment = ''
  } finally {
    reviewSubmitting.value = false
  }
}

const timerMeta = (product: ProductItem) => {
  if (!product.timerHours || !timerStarts.value[product.id]) {
    return null
  }
  const remaining = timerStarts.value[product.id] - Date.now()
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
    text: `Termina en ${parts.join(' ')}`,
    position: product.timerPosition,
  }
}

const avatarGradient = (name: string) => {
  const seed = [...(name || 'A')].reduce((sum, char) => sum + char.charCodeAt(0), 0)
  const hues = [seed % 360, (seed * 1.7) % 360]
  return `linear-gradient(135deg, hsl(${hues[0]} 75% 55%), hsl(${hues[1]} 75% 45%))`
}

const reviewInitials = (name: string) => (name || 'A').split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()
const reviewStars = (rating: number) => '★'.repeat(Math.max(1, Math.min(5, Number(rating) || 5))) + '☆'.repeat(5 - Math.max(1, Math.min(5, Number(rating) || 5)))
const formatReviewDate = (date: string) => new Date(date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace('#', '')
  const safe = normalized.length === 3
    ? normalized.split('').map((char) => char + char).join('')
    : normalized
  const value = Number.parseInt(safe, 16)
  const red = (value >> 16) & 255
  const green = (value >> 8) & 255
  const blue = value & 255
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}
</script>

<style scoped>
.menu-shell {
  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
  padding-bottom: 108px;
}

.sticky-wrapper {
  position: sticky;
  top: 0;
  z-index: 40;
  background: var(--header-bg);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.22);
}

.header,
.header-brand,
.header-actions,
.search-btn,
.product-footer,
.cart-main-row,
.cart-info,
.modal-header,
.detail-actions,
.review-header,
.variant-group-head,
.detail-qty-row,
.cart-total-row,
.cart-footer-btns,
.cart-location-row,
.top-banner-item,
.menu-map-open-wrap {
  display: flex;
  align-items: center;
}

.header {
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
}

.header-brand {
  gap: 10px;
  min-width: 0;
}

.header-logo {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  object-fit: cover;
  background: rgba(255, 255, 255, 0.12);
}

.header-logo-placeholder {
  justify-content: center;
  font-weight: 800;
}

#header-title {
  font-size: 1rem;
  font-weight: 800;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.header-actions {
  gap: 8px;
}

.search-btn {
  gap: 8px;
  border: 1px solid var(--search-btn-border);
  background: var(--search-btn-bg);
  color: var(--text);
  border-radius: 999px;
  min-height: 36px;
  padding: 0 14px;
  font-weight: 700;
  cursor: pointer;
}

.filter-btn {
  width: 36px;
  justify-content: center;
  padding: 0;
}

.search-container {
  max-height: 0;
  opacity: 0;
  overflow: hidden;
  transition: all 0.25s ease;
  padding: 0 16px;
}

.search-container.active {
  max-height: 80px;
  opacity: 1;
  padding-bottom: 12px;
}

.search-input {
  width: 100%;
  border-radius: 14px;
  border: 1px solid var(--search-input-border);
  background: var(--search-input-bg);
  color: var(--product-title-color);
  padding: 12px 14px;
}

.categories-nav {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding: 0 16px 14px;
  scrollbar-width: none;
}

.categories-nav::-webkit-scrollbar,
.cart-preview::-webkit-scrollbar,
.review-list::-webkit-scrollbar {
  display: none;
}

.category-chip {
  flex: 0 0 auto;
  background: var(--card-bg);
  border: 1px solid #333;
  color: var(--text-muted);
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.3s;
}

.category-chip.active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
  box-shadow: 0 2px 8px rgba(255, 94, 0, 0.3);
}

.top-banner {
  width: 100%;
  background: var(--banner-bg);
  color: var(--banner-text);
  overflow: hidden;
}

.top-banner.static {
  text-align: center;
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 700;
}

.top-banner.loop {
  white-space: nowrap;
}

.top-banner-track {
  display: inline-flex;
  min-width: max-content;
  padding: 10px 0;
  animation: bannerLoop 18s linear infinite;
}

.top-banner-item {
  gap: 28px;
  padding-left: 20px;
  font-size: 13px;
  font-weight: 700;
}

.top-banner-sep {
  opacity: 0.65;
}

#loading {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(1200px 600px at 20% 0%, rgba(255, 94, 0, 0.22), transparent 55%),
    radial-gradient(1000px 500px at 100% 100%, rgba(37, 211, 102, 0.14), transparent 60%),
    linear-gradient(145deg, #0d0d12 0%, #131622 45%, #0f111a 100%);
}

.loading-shell {
  width: min(92vw, 460px);
  border-radius: 22px;
  padding: 28px 22px;
  text-align: center;
  color: #fff;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.16);
  backdrop-filter: blur(12px);
}

.loading-brand {
  width: 60px;
  height: 60px;
  margin: 0 auto 14px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  background: linear-gradient(135deg, #ff5e00, #ff9068);
}

.loading-title {
  font-size: 1.2rem;
  font-weight: 800;
  margin-bottom: 8px;
}

.loading-subtitle {
  color: rgba(255, 255, 255, 0.9);
  margin-bottom: 18px;
}

.loading-progress {
  height: 9px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  overflow: hidden;
  position: relative;
}

.loading-progress::before {
  content: "";
  position: absolute;
  inset: 0 auto 0 -40%;
  width: 40%;
  background: linear-gradient(90deg, #ff5e00, #ff9068, #ffd3b3);
  animation: loadingBar 1.25s ease-in-out infinite;
}

#closed-screen {
  position: fixed;
  inset: 0;
  z-index: 110;
  background: var(--bg);
  overflow: auto;
}

#closed-content {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 20px;
  text-align: center;
}

#closed-text {
  white-space: pre-line;
  line-height: 1.35;
}

#closed-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 24px;
}

#closed-menu-btn,
#closed-whatsapp-btn,
#closed-call-btn {
  min-width: 220px;
  border: none;
  border-radius: 999px;
  padding: 14px 24px;
  color: #fff;
  text-decoration: none;
  font-weight: 700;
}

#closed-whatsapp-btn {
  background: #25d366;
}

#closed-call-btn {
  background: #007bff;
}

.category-section {
  padding: 15px;
  scroll-margin-top: 130px;
}

.category-title {
  font-size: 1.3rem;
  margin-bottom: 4px;
  color: var(--primary);
  border-left: 3px solid var(--primary);
  padding-left: 10px;
}

.category-note {
  font-size: 0.85rem;
  color: var(--cat-note-color, var(--text-muted));
  margin-bottom: 12px;
  padding-left: 13px;
  white-space: pre-line;
}

.products-grid {
  display: grid;
  gap: 10px;
  align-items: start;
}

.products-grid.layout-2 {
  grid-template-columns: repeat(2, 1fr);
}

.products-grid.layout-1 {
  grid-template-columns: 1fr;
  gap: 12px;
}

.product-card {
  background: var(--card-bg);
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s;
  border: 1px solid #222;
  align-self: start;
}

.product-card:active {
  transform: scale(0.98);
}

.products-grid.layout-1 .product-card {
  display: flex;
  flex-direction: row;
  padding: 10px;
  gap: 12px;
  align-items: center;
}

.product-img-container {
  position: relative;
  width: 100%;
  padding-top: 100%;
  background: rgba(255, 255, 255, 0.06);
}

.products-grid.layout-1 .product-img-container {
  width: 90px;
  padding-top: 90px;
  flex-shrink: 0;
}

.product-img {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: #222;
}

.detail-img {
  width: 100%;
  height: 300px;
  object-fit: contain;
  background: #000;
  display: block;
}

.fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  font-size: 0.85rem;
}

.product-review-badge,
.product-offer-badge,
.product-timer-badge,
.product-tag-badge,
.variant-tag-mini,
.reviews-count-badge,
.review-pending-badge,
.tag-filter-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.product-review-badge {
  position: absolute;
  left: 10px;
  top: 10px;
  z-index: 2;
  gap: 6px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 11px;
  font-weight: 700;
  backdrop-filter: blur(8px);
}

.product-offer-badge {
  background: var(--offer-badge-bg);
  color: var(--offer-badge-text);
  border-radius: 999px;
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.01em;
  line-height: 1;
}

.product-offer-badge.image {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 2;
  border-radius: 10px;
}

.product-offer-badge.inline-list {
  display: none;
}

.products-grid.layout-1 .product-offer-badge.image {
  display: none;
}

.products-grid.layout-1 .product-offer-badge.inline-list {
  display: inline-flex;
}

.product-timer-badge {
  background: var(--timer-badge-bg);
  color: var(--timer-badge-text);
  border-radius: 999px;
  padding: 4px 8px;
  font-size: 11px;
  font-weight: 800;
  white-space: nowrap;
  letter-spacing: 0.01em;
  line-height: 1;
  width: fit-content;
}

.product-timer-badge.image-right {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 2;
}

.product-timer-badge.inline-list {
  display: none;
}

.products-grid.layout-1 .product-timer-badge.image-right {
  display: none;
}

.products-grid.layout-1 .product-timer-badge.inline-list {
  display: inline-flex;
}

.product-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 8px 10px 10px;
  min-width: 0;
}

.product-footer {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-top: 4px;
  gap: 10px;
}

.products-grid.layout-1 .product-info {
  flex: 1;
  padding: 0;
  justify-content: center;
}

.product-name {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--product-title-color, var(--text));
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.2;
}

.products-grid.layout-1 .product-name {
  font-size: 1rem;
}

.detail-name {
  color: var(--detail-name-color);
  font-weight: 800;
}

.product-desc,
.detail-desc,
.modal-copy,
.review-date,
.review-text,
.cart-location-text,
.cart-item-modifiers {
  color: var(--text-muted);
}

.product-desc {
  font-size: 0.72rem;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  overflow: hidden;
  -webkit-line-clamp: 2;
  line-height: 1.35;
}

.products-grid.layout-1 .product-desc {
  -webkit-line-clamp: 1;
  min-height: auto;
}

.product-tags,
.tags-container,
.product-variants-preview,
.variant-options,
.tags-filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.product-tag-badge,
.variant-tag-mini,
.tag-filter-chip {
  border-radius: 999px;
  background: color-mix(in srgb, var(--tag-bg) 30%, transparent);
  color: var(--tag-text);
  border: 1px solid color-mix(in srgb, var(--tag-bg) 55%, transparent);
  padding: 5px 10px;
  font-size: 11px;
  font-weight: 700;
}

.product-tag-badge.large {
  font-size: 12px;
}

.product-price-stack {
  display: inline-flex;
  flex-direction: column;
  gap: 6px;
}

.product-price-row,
.detail-price-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  color: var(--detail-price-color);
  font-weight: 800;
}

.product-price-old {
  text-decoration: line-through;
  color: rgba(255, 255, 255, 0.45);
  font-size: 0.86rem;
}

.add-btn-mini,
.card-qty-btn,
.detail-dot,
.close-btn,
.detail-gallery-btn {
  border: none;
  cursor: pointer;
}

.add-btn-mini {
  width: 38px;
  height: 38px;
  border-radius: 999px;
  background: var(--primary);
  color: #fff;
  font-size: 1.3rem;
  flex: 0 0 auto;
}

.hidden-action {
  opacity: 0;
  pointer-events: none;
}

.card-qty-control {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.card-qty-control.vertical {
  flex-direction: column;
}

.card-qty-btn {
  width: 30px;
  height: 30px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  font-weight: 800;
}

.card-qty-val {
  min-width: 24px;
  text-align: center;
  font-weight: 700;
  color: var(--product-title-color);
}

.card-qty-val.detail {
  min-width: 48px;
}

.cart-bar {
  position: fixed;
  left: 12px;
  right: 12px;
  bottom: 12px;
  z-index: 60;
  border-radius: 24px;
  background: rgba(17, 17, 17, 0.94);
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(12px);
  padding: 12px 14px;
}

.cart-preview {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-bottom: 10px;
}

.preview-tag {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  border-radius: 999px;
  padding: 6px 10px;
  font-size: 12px;
}

.preview-remove {
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
}

.cart-main-row {
  justify-content: space-between;
  gap: 12px;
}

.cart-icon {
  gap: 8px;
}

.cart-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  border-radius: 999px;
  background: var(--primary);
  color: #fff;
  font-size: 11px;
  font-weight: 800;
}

.cart-total {
  color: #fff;
  font-size: 1rem;
  font-weight: 800;
}

.cart-subtext {
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
}

.cart-view-btn,
.btn-large {
  border: none;
  border-radius: 999px;
  padding: 14px 18px;
  font-weight: 800;
  cursor: pointer;
  text-decoration: none;
  text-align: center;
}

.cart-view-btn {
  background: var(--primary);
  color: #fff;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 90;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.modal-header {
  justify-content: space-between;
  padding: 16px;
  background: var(--detail-bg);
  color: var(--detail-name-color);
  border-radius: 26px 26px 0 0;
}

.modal-title {
  font-size: 1.1rem;
  font-weight: 800;
}

.close-btn {
  width: 36px;
  height: 36px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  font-size: 1.4rem;
}

.detail-content,
.cart-list {
  background: var(--detail-bg);
  overflow: auto;
  max-height: calc(100vh - 180px);
}

.modal-pad {
  padding: 20px;
}

.detail-gallery {
  position: relative;
  background: #000;
}

.detail-gallery-btn {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.45);
  color: white;
  font-size: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 2;
}

.detail-gallery-btn.prev {
  left: 12px;
}

.detail-gallery-btn.next {
  right: 12px;
}

.detail-gallery-count {
  position: absolute;
  right: 12px;
  bottom: 12px;
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.55);
  color: white;
  font-size: 12px;
  font-weight: 700;
}

.detail-gallery-dots {
  display: flex;
  justify-content: center;
  gap: 8px;
  padding: 12px 20px 0;
  background: var(--detail-bg);
}

.detail-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
  cursor: pointer;
}

.detail-dot.active {
  background: var(--primary);
  transform: scale(1.05);
}

.detail-body {
  padding: 20px;
}

.detail-name {
  color: var(--detail-name-color);
  font-size: 1.6rem;
  font-weight: 800;
  margin-bottom: 10px;
  line-height: 1.1;
}

.detail-price {
  color: var(--detail-price-color);
  font-size: 1.4rem;
  font-weight: 700;
  margin-bottom: 15px;
}

.detail-price-stack {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 15px;
}

.detail-price-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  font-weight: 700;
}

.detail-price-old {
  color: #9ca3af;
  text-decoration: line-through;
  font-size: 1rem;
  font-weight: 500;
}

.detail-desc {
  font-size: 1rem;
  color: var(--detail-desc-color, var(--text-muted));
  line-height: 1.6;
  margin-bottom: 16px;
  white-space: pre-line;
}

.variant-group {
  margin-bottom: 16px;
}

.variant-group-head {
  justify-content: space-between;
  margin-bottom: 8px;
  color: var(--detail-name-color);
}

.variant-required {
  color: var(--primary);
  font-size: 12px;
  font-weight: 800;
}

.variant-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.06);
  padding: 10px 12px;
  color: var(--detail-name-color);
}

.detail-qty-row {
  justify-content: center;
  gap: 10px;
  margin: 6px 0 22px;
}

.reviews-section {
  margin-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 15px;
}

.reviews-section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--detail-name-color, #fff);
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: 12px;
}

.reviews-count-badge {
  font-size: 0.75rem;
  background: var(--primary);
  color: white;
  padding: 2px 8px;
  border-radius: 999px;
  font-weight: 600;
  min-width: unset;
  height: unset;
}

.review-form {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 14px;
  margin-bottom: 14px;
}

.review-form-row {
  margin-bottom: 10px;
}

.review-form-label {
  display: block;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-muted);
  margin-bottom: 5px;
}

.review-form-input {
  width: 100%;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1.5px solid rgba(255, 255, 255, 0.12);
  background: rgba(0, 0, 0, 0.25);
  color: white;
  font-size: 0.9rem;
  outline: none;
  transition: border-color 0.2s;
  font-family: inherit;
}

.review-form-input:focus {
  border-color: var(--primary);
}

.review-form-input::placeholder {
  color: rgba(255, 255, 255, 0.3);
}

textarea.review-form-input {
  resize: vertical;
  min-height: 70px;
  max-height: 150px;
  line-height: 1.4;
}

.char-counter-wrap {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 5px;
}

.char-counter-text {
  font-size: 0.7rem;
  color: var(--text-muted);
}

.char-progress-bar {
  width: 80px;
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

.char-progress-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.2s, background 0.3s;
  background: var(--primary);
}

.review-submit-btn {
  width: 100%;
  padding: 12px;
  border: none;
  border-radius: 12px;
  background: var(--primary);
  color: white;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;
  margin-top: 10px;
  position: relative;
  overflow: hidden;
}

.review-submit-btn:hover {
  filter: brightness(1.1);
}

.review-submit-btn:active {
  transform: scale(0.98);
}

.review-submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  filter: brightness(0.7);
}

.review-submit-btn .btn-text {
  transition: opacity 0.2s;
}

.review-submit-btn .spinner {
  display: none;
  width: 20px;
  height: 20px;
  border: 2.5px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

.review-submit-btn.loading .btn-text {
  display: none;
}

.review-submit-btn.loading .spinner {
  display: block;
}

.review-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 350px;
  overflow-y: auto;
  padding-right: 4px;
}

.review-list::-webkit-scrollbar {
  width: 4px;
}

.review-list::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: 2px;
}

.review-item {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 12px;
  animation: reviewSlideIn 0.3s ease-out;
}

.review-item.pending-approval {
  opacity: 0.6;
  border-style: dashed;
  border-color: rgba(245, 158, 11, 0.4);
  background: rgba(245, 158, 11, 0.04);
}

.review-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.review-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 700;
  color: white;
  flex-shrink: 0;
  text-transform: uppercase;
}

.review-meta {
  flex: 1;
  min-width: 0;
}

.review-author {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--detail-name-color, #fff);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.review-date {
  font-size: 0.7rem;
  color: var(--text-muted);
}

.review-text {
  font-size: 0.85rem;
  color: var(--detail-desc-color, #ccc);
  line-height: 1.5;
  word-wrap: break-word;
}

.review-pending-badge {
  font-size: 0.65rem;
  background: rgba(245, 158, 11, 0.2);
  color: #f59e0b;
  padding: 2px 8px;
  border-radius: 999px;
  font-weight: 600;
  white-space: nowrap;
}

.review-load-more {
  width: 100%;
  padding: 10px;
  border: 1.5px dashed rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  background: transparent;
  color: var(--primary);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  margin-top: 10px;
  transition: all 0.2s;
}

.review-load-more:hover {
  border-color: var(--primary);
  background: rgba(255, 255, 255, 0.03);
}

.review-empty {
  text-align: center;
  padding: 20px 10px;
  color: var(--text-muted);
}

.review-empty-icon {
  font-size: 2rem;
  margin-bottom: 8px;
  opacity: 0.4;
}

.review-empty-text {
  font-size: 0.85rem;
}

.detail-actions,
.cart-footer {
  background: var(--detail-bg);
  padding: 14px 16px calc(14px + env(safe-area-inset-bottom));
  gap: 10px;
}

.detail-actions {
  justify-content: stretch;
}

.detail-actions .btn-large,
.cart-footer .btn-large {
  flex: 1;
}

.btn-add-cart {
  background: var(--btn-cart-bg);
  color: var(--btn-cart-text);
}

.btn-whatsapp {
  background: var(--btn-wa-bg);
  color: var(--btn-wa-text);
}

.btn-call {
  background: #007bff;
  color: #fff;
}

.cart-list {
  flex: 1;
  overflow-y: auto;
  padding: 15px;
  background: var(--detail-bg, var(--card-bg));
}

.cart-item {
  display: flex;
  align-items: center;
  gap: 15px;
  padding: 15px 0;
  border-bottom: 1px solid #222;
}

.cart-item-img {
  width: 70px;
  height: 70px;
  border-radius: 10px;
  object-fit: cover;
  background: #222;
  flex-shrink: 0;
}

.cart-item-img.small {
  font-size: 11px;
}

.cart-item-info {
  flex: 1;
}

.cart-item-name {
  color: #fff;
  font-weight: 600;
  margin-bottom: 4px;
}

.cart-item-price {
  color: var(--primary);
  font-weight: 700;
}

.cart-footer {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.cart-total-row {
  justify-content: space-between;
  color: #fff;
  font-weight: 800;
  margin-bottom: 12px;
}

.cart-footer-btns {
  gap: 10px;
}

.cart-location-row {
  justify-content: space-between;
  gap: 10px;
  margin-top: 12px;
}

.cart-location-link,
.menu-map-open,
.menu-footer a {
  color: #87ceeb;
}

.tags-filter-bar {
  padding: 0;
}

.tag-filter-chip {
  border: 1px solid color-mix(in srgb, var(--tag-bg) 55%, transparent);
  cursor: pointer;
}

.tag-filter-chip.active {
  background: var(--tag-bg);
}

.menu-map-section {
  padding: 18px 16px 8px;
}

.menu-map-title {
  color: var(--detail-name-color);
  font-size: 1.15rem;
  font-weight: 800;
  margin-bottom: 12px;
}

.menu-map-frame {
  width: 100%;
  height: 260px;
  border: none;
  border-radius: 22px;
}

.menu-map-open-wrap {
  justify-content: center;
  margin-top: 12px;
}

.menu-map-open {
  text-decoration: underline;
  font-weight: 700;
}

.menu-footer {
  padding: 40px 20px 120px;
  text-align: center;
}

.menu-footer-pill {
  display: inline-block;
  background: rgba(0, 0, 0, 0.7);
  padding: 12px 24px;
  border-radius: 30px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
}

.menu-footer span {
  color: rgba(135, 206, 235, 0.8);
  font-size: 13px;
  font-weight: 500;
}

.menu-footer a {
  margin-left: 4px;
  font-size: 16px;
  font-weight: 700;
}

@keyframes bannerLoop {
  0% {
    transform: translateX(0);
  }
  100% {
    transform: translateX(-50%);
  }
}

@keyframes loadingBar {
  0% {
    left: -40%;
  }
  100% {
    left: 100%;
  }
}

@keyframes reviewSlideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes slideUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@media (max-width: 640px) {
  .products-grid.layout-2 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .detail-actions,
  .cart-footer-btns {
    flex-direction: column;
  }
}
</style>
