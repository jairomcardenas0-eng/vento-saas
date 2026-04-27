<template>
  <section class="shop-shell min-h-screen pb-32" :style="themeVars">
    <!-- Toast de notificación -->
    <Transition
      enter-active-class="transition-all duration-300 ease-out"
      enter-from-class="opacity-0 -translate-y-4"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition-all duration-200 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-4"
    >
      <div v-if="toastMessage" class="toast-bar">
        <span>{{ toastMessage }}</span>
      </div>
    </Transition>

    <!-- Barra superior -->
    <div
      v-if="topBarText"
      class="shop-topbar"
      v-html="topBarText"
    />

    <!-- Header -->
    <header class="shop-header">
      <button class="brand-block" type="button" @click="scrollToTop">
        <img v-if="storefront.settings.logoUrl" :src="storefront.settings.logoUrl" :alt="resolvedHeaderName" class="brand-logo" />
        <component :is="resolvedStoreIcon" v-else class="brand-logo-icon" />
        <div class="brand-copy">
          <span class="brand-eyebrow">{{ storefront.settings.businessType.join(' · ') || 'Tienda digital' }}</span>
          <strong>{{ resolvedHeaderName }}</strong>
        </div>
      </button>

      <div class="header-actions">
        <button class="header-btn" type="button" @click="searchOpen = !searchOpen">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" class="mr-1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          Buscar
        </button>
        <button class="header-btn" type="button" @click="toggleFavoritesView">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" class="mr-1.5"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          Favoritos {{ favoriteIds.length ? `(${favoriteIds.length})` : '' }}
        </button>
        <button v-if="pwaInstallReady" class="header-btn" type="button" @click="installPwa">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" class="mr-1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          App
        </button>
      </div>
    </header>

    <!-- Búsqueda -->
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 -translate-y-2"
      enter-to-class="opacity-100 translate-y-0"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 translate-y-0"
      leave-to-class="opacity-0 -translate-y-2"
    >
      <div v-if="searchOpen" class="search-wrap">
        <input v-model="search" class="search-input" type="search" placeholder="Busca productos, marcas o palabras clave..." />
      </div>
    </Transition>

    <!-- Hero Section -->
    <section class="hero-card" :style="heroStyle">
      <div class="hero-overlay" />
      <div class="hero-copy">
        <span class="hero-tag">{{ storefront.settings.storeHeroTag || 'Tienda destacada' }}</span>
        <h1>{{ storefront.settings.storeHeroTitle || storefront.settings.businessName }}</h1>
        <p>{{ storefront.settings.storeHeroDescription || storefront.settings.tagline }}</p>

        <div class="hero-meta">
          <span>{{ scheduleState.label }}</span>
          <span v-if="availableDelivery">Delivery activo</span>
          <span v-if="availablePickup">Recogida disponible</span>
        </div>

        <div class="hero-actions">
          <button class="hero-primary" type="button" @click="scrollToCatalog">
            {{ storefront.settings.storeHeroButtonText || 'Ver productos' }}
          </button>
          <a
            v-if="whatsAppHref"
            class="hero-secondary"
            :href="whatsAppHref"
            target="_blank"
            rel="noopener noreferrer"
          >
            WhatsApp
          </a>
        </div>
      </div>

      <div class="hero-side">
        <div class="hero-kpis">
          <span>{{ filteredProductCount }} productos</span>
          <span>{{ storefront.categories.length }} categorias</span>
          <span>{{ storefront.reviews.length }} reseñas</span>
        </div>
        <div v-if="storefront.settings.storeShowPremiumBadge" class="premium-badge">
          <span>Experiencia premium</span>
        </div>
      </div>
    </section>

    <!-- Estado cerrado -->
    <section v-if="!isStoreAcceptingOrders" class="closed-state">
      <div class="closed-card">
        <strong>{{ storefront.settings.businessName }}</strong>
        <p>{{ isClosed ? storefront.settings.closedMessage : scheduleState.label }}</p>
      </div>
    </section>

    <!-- Contenido principal: catálogo -->
    <template v-else>
      <!-- Barra de ordenamiento y filtros -->
      <div class="toolbar-row" id="catalog-anchor">
        <div class="toolbar-left">
          <span class="toolbar-count">{{ filteredProductCount }} productos</span>
          <select v-model="sortMode" class="sort-select">
            <option value="default">Destacados</option>
            <option value="price-asc">Precio: menor a mayor</option>
            <option value="price-desc">Precio: mayor a menor</option>
            <option value="name-asc">Nombre: A-Z</option>
            <option value="name-desc">Nombre: Z-A</option>
            <option value="sale">En oferta</option>
          </select>
        </div>
        <div class="toolbar-right">
          <button class="filter-toggle-btn" type="button" @click="mobileFilterOpen = !mobileFilterOpen">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>
            Filtros
            <span v-if="hasActiveFilters" class="filter-dot" />
          </button>
          <button
            class="filter-toggle-btn"
            :class="{ active: showHistory }"
            type="button"
            @click="showHistory = !showHistory; favoritesOnly = false"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" class="mr-1"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Historial
          </button>
        </div>
      </div>

      <!-- Panel de filtros de precio -->
      <Transition
        enter-active-class="transition-all duration-250 ease-out"
        enter-from-class="opacity-0 max-h-0 overflow-hidden"
        enter-to-class="opacity-100 max-h-64"
        leave-active-class="transition-all duration-200 ease-in"
        leave-from-class="opacity-100 max-h-64"
        leave-to-class="opacity-0 max-h-0 overflow-hidden"
      >
        <div v-if="mobileFilterOpen" class="filter-panel">
          <div class="filter-section">
            <span class="filter-label">Rango de precio</span>
            <div class="filter-presets">
              <button class="filter-preset-chip" :class="{ active: pricePreset === '0-50' }" @click="setPricePreset('0-50')">Hasta $50</button>
              <button class="filter-preset-chip" :class="{ active: pricePreset === '0-100' }" @click="setPricePreset('0-100')">Hasta $100</button>
              <button class="filter-preset-chip" :class="{ active: pricePreset === '100-200' }" @click="setPricePreset('100-200')">$100 - $200</button>
              <button class="filter-preset-chip" :class="{ active: pricePreset === '200-plus' }" @click="setPricePreset('200-plus')">$200+</button>
            </div>
            <div class="filter-custom">
              <input v-model.number="priceMin" type="number" placeholder="Min" class="filter-price-input" @input="pricePreset = ''" />
              <span class="filter-price-sep">a</span>
              <input v-model.number="priceMax" type="number" placeholder="Max" class="filter-price-input" @input="pricePreset = ''" />
              <button class="filter-apply-btn" @click="applyPriceFilter">Filtrar</button>
              <button v-if="hasActiveFilters" class="filter-clear-btn" @click="clearPriceFilter">Limpiar</button>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Navegación de categorías (móvil / horizontal) -->
      <section v-if="!isStoreMode" class="category-strip">
        <button class="category-pill" :class="{ active: selectedCategoryId === '' && !favoritesOnly && !showHistory }" @click="selectCategory('')">Todo</button>
        <button class="category-pill" :class="{ active: favoritesOnly }" @click="toggleFavoritesOnly">Favoritos</button>
        <button
          v-for="category in visibleCategories"
          :key="category.id"
          class="category-pill"
          :class="{ active: selectedCategoryId === category.id && !favoritesOnly && !showHistory }"
          @click="selectCategory(category.id)"
        >
          {{ category.name }}
        </button>
      </section>

      <!-- Layout con sidebar para modo tienda en desktop -->
      <div v-if="isStoreMode" class="store-layout">
        <aside class="store-sidebar">
          <nav class="sidebar-nav">
            <button class="sidebar-link" :class="{ active: selectedCategoryId === '' && !favoritesOnly && !showHistory }" @click="selectCategory('')">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
              <span>Todo</span>
            </button>
            <button class="sidebar-link" :class="{ active: favoritesOnly }" @click="toggleFavoritesOnly">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              <span>Favoritos</span>
              <span v-if="favoriteIds.length" class="sidebar-badge">{{ favoriteIds.length }}</span>
            </button>
            <button
              v-for="category in visibleCategories"
              :key="category.id"
              class="sidebar-link"
              :class="{ active: selectedCategoryId === category.id && !favoritesOnly && !showHistory }"
              @click="selectCategory(category.id)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
              <span>{{ category.name }}</span>
            </button>
          </nav>
        </aside>
        <div class="store-main">
          <!-- Navegación de categorías móvil para modo tienda -->
          <section class="category-strip md:hidden">
            <button class="category-pill" :class="{ active: selectedCategoryId === '' && !favoritesOnly && !showHistory }" @click="selectCategory('')">Todo</button>
            <button class="category-pill" :class="{ active: favoritesOnly }" @click="toggleFavoritesOnly">Favoritos</button>
            <button
              v-for="category in visibleCategories"
              :key="category.id"
              class="category-pill"
              :class="{ active: selectedCategoryId === category.id && !favoritesOnly && !showHistory }"
              @click="selectCategory(category.id)"
            >
              {{ category.name }}
            </button>
          </section>

          <!-- Vista de historial de pedidos -->
          <section v-if="showHistory" class="history-section">
        <div class="section-head">
          <h2>Historial de pedidos</h2>
          <p>Pedidos recientes realizados desde este dispositivo.</p>
        </div>
        <div v-if="orderHistory.length === 0" class="history-empty">
          <p>No hay pedidos recientes en este dispositivo.</p>
        </div>
        <div v-else class="history-list">
          <article v-for="order in orderHistory" :key="order.id" class="history-card">
            <div class="history-card-header">
              <strong>Pedido #{{ order.id.slice(-6).toUpperCase() }}</strong>
              <span class="history-date">{{ formatDate(order.createdAt) }}</span>
            </div>
            <div class="history-items">
              <span v-for="item in order.items.slice(0, 3)" :key="item.productId" class="history-item-chip">
                {{ item.qty }}x {{ item.productName }}
              </span>
              <span v-if="order.items.length > 3" class="history-item-more">+{{ order.items.length - 3 }} mas</span>
            </div>
            <div class="history-card-footer">
              <strong>{{ money(order.total, storefront.settings.currency) }}</strong>
              <span class="history-status" :class="`status-${order.status}`">{{ orderStatusLabel(order.status) }}</span>
            </div>
          </article>
        </div>
      </section>

      <!-- Grid de productos por categoría -->
      <template v-else>
        <section v-for="(category, catIndex) in renderedCategories" :key="category.id" class="catalog-section">
          <div class="section-head">
            <div>
              <h2>{{ category.name }}</h2>
              <p>{{ category.description || `${productsForSection(category.id).length} productos listos para pedir.` }}</p>
            </div>
          </div>

          <div class="product-grid">
            <article
              v-for="product in productsForSection(category.id)"
              :key="product.id"
              class="product-card"
            >
              <button class="favorite-btn" type="button" :aria-pressed="isFavorite(product.id)" @click="toggleFavoriteWithAnimation(product.id, $event)">
                {{ isFavorite(product.id) ? '♥' : '♡' }}
              </button>

              <button class="product-hit" type="button" @click="openProduct(product)">
                <div class="product-image-wrap">
                  <img v-if="product.imageUrl" :src="product.imageUrl" :alt="product.name" class="product-image" loading="lazy" />
                  <div v-else class="product-image product-image--fallback">Sin imagen</div>
                  <span v-if="product.hasPromo && product.offerLabel" class="promo-chip">{{ product.offerLabel }}</span>
                  <!-- Timer countdown en tarjeta -->
                  <span
                    v-if="product.timerHours && !product.timerLinkSale"
                    class="timer-chip"
                    :class="{ 'timer-chip--image': product.timerPosition === 'image-right' }"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" class="mr-1"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    {{ resolveTimerLabel(product) }}
                  </span>
                </div>

                <div class="product-copy">
                  <div class="product-headline">
                    <h3>{{ product.name }}</h3>
                    <span v-if="product.tags.length" class="product-tags">{{ product.tags.slice(0, 2).join(' · ') }}</span>
                  </div>
                  <p>{{ product.description || 'Producto listo para compra directa por WhatsApp.' }}</p>
                  <div class="stock-badge-row">
                    <span class="stock-badge" :class="`stock-${productStockState(product)}`">{{ productStockLabel(product) }}</span>
                  </div>
                  <div class="product-footer">
                    <div class="price-block">
                      <strong>{{ money(activeBasePrice(product), storefront.settings.currency) }}</strong>
                      <span v-if="product.hasPromo && product.promoPrice !== null">{{ money(product.basePrice, storefront.settings.currency) }}</span>
                    </div>
                    <div class="product-footer-right">
                      <span v-if="product.freeShip" class="free-ship-badge">Envio gratis</span>
                      <span v-if="product.productRatingCount" class="product-rating-stars">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" class="star-icon"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                        {{ product.productRating.toFixed(1) }} ({{ product.productRatingCount }})
                      </span>
                      <button
                        v-if="!product.variants.length"
                        class="quick-add-btn"
                        :disabled="productStockState(product) === 'out'"
                        type="button"
                        @click.stop="quickAddWithFeedback(product)"
                        title="Agregar al carrito"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      </button>
                    </div>
                  </div>
                </div>
              </button>
            </article>
          </div>
        </section>

        <!-- Infinite scroll sentinel -->
        <div v-if="hasMoreProducts" ref="scrollSentinel" class="scroll-sentinel">
          <button class="load-more-btn" @click="loadMore">Cargar mas productos</button>
        </div>
        <p v-if="!hasMoreProducts && visibleProductLimit > 12" class="scroll-end-message">Has visto todos los productos</p>
      </template>

        <!-- Reseñas -->
        <StorefrontReviews
          v-if="!showHistory && !favoritesOnly"
          :enabled="storefront.settings.reviewsEnabled"
          :reviews="storefront.reviews"
          :review-form="reviewForm"
          @submit="submitReview"
        />
        </div><!-- /store-main -->
      </div><!-- /store-layout -->

      <!-- Reseñas (modo no-store) -->
      <StorefrontReviews
        v-if="!isStoreMode && !showHistory && !favoritesOnly"
        :enabled="storefront.settings.reviewsEnabled"
        :reviews="storefront.reviews"
        :review-form="reviewForm"
        @submit="submitReview"
      />
    </template>

    <!-- Footer -->
    <footer class="shop-footer">
      <p>{{ storefront.settings.storeFooterText || storefront.settings.tagline }}</p>
    </footer>

    <!-- Barra de navegación inferior móvil -->
    <nav class="mobile-bottom-bar md:hidden">
      <button class="mobile-bottom-btn" :class="{ active: !showHistory }" @click="showHistory = false; favoritesOnly = false; scrollToTop()">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
        <span>Inicio</span>
      </button>
      <button class="mobile-bottom-btn" @click="mobileFilterOpen = !mobileFilterOpen; showHistory = false">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>
        <span>Filtros</span>
      </button>
      <button class="mobile-bottom-btn" :class="{ active: favoritesOnly }" @click="toggleFavoritesOnly; showHistory = false">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        <span>Favoritos</span>
      </button>
      <button class="mobile-bottom-btn" :class="{ active: showHistory }" @click="showHistory = !showHistory; favoritesOnly = false">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        <span>Historial</span>
      </button>
      <a
        v-if="whatsAppHref"
        class="mobile-bottom-btn wa-btn"
        :href="whatsAppHref"
        target="_blank"
        rel="noopener noreferrer"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347"/></svg>
        <span>WhatsApp</span>
      </a>
    </nav>

    <!-- Product Sheet Modal -->
    <StorefrontProductSheet
      :product="selectedProduct"
      :currency="storefront.settings.currency"
      :single-selections="singleSelections"
      :multi-selections="multiSelections"
      :quantity="quantity"
      :instructions="instructions"
      :subtotal="liveSubtotal"
      @close="closeProduct"
      @commit="commitProductWithFeedback"
      @select-single="selectSingle"
      @toggle-multi="toggleMulti"
      @update:quantity="quantity = $event"
      @update:instructions="instructions = $event"
    />

    <!-- Cart FAB -->
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
        class="cart-fab"
      >
        <button class="cart-fab-btn" @click="cartStore.isOpen = true">
          <div>
            <strong>{{ cartStore.totalItems }} productos</strong>
            <span>{{ money(finalTotal, storefront.settings.currency) }}</span>
          </div>
          <span>Abrir pedido</span>
        </button>
      </div>
    </Transition>

    <!-- Cart Drawer -->
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
import {
  ShoppingBag, ShoppingCart, Store, Package, Gem, Shirt, Watch, House,
  UtensilsCrossed, Coffee, Smartphone, Laptop, Truck, Sparkles, GlassWater,
} from 'lucide-vue-next'
import type { StorefrontPayload } from '~/composables/useStorefrontExperience'
import { useStorefrontExperience } from '~/composables/useStorefrontExperience'
import type { CatalogOrder, CatalogOrderItem } from '~/types/catalog'
import type { ProductItem } from '~/stores/catalog'
import { money } from '~/utils/catalog'

type IconComponent = typeof ShoppingBag

const STORE_ICON_MAP: Record<string, IconComponent> = {
  'shopping-bag': ShoppingBag,
  'shopping-cart': ShoppingCart,
  'store': Store,
  'package': Package,
  'gem': Gem,
  'shirt': Shirt,
  'watch': Watch,
  'house': House,
  'utensils-crossed': UtensilsCrossed,
  'coffee': Coffee,
  'smartphone': Smartphone,
  'laptop': Laptop,
  'truck': Truck,
  'sparkles': Sparkles,
  'glass-water': GlassWater,
}

interface OrderHistoryEntry {
  id: string
  createdAt: string
  items: { productId: string; productName: string; qty: number }[]
  total: number
  status: CatalogOrder['status']
}

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

const searchOpen = ref(false)
const favoritesOnly = ref(false)
const showHistory = ref(false)
const visibleProductLimit = ref(12)
const scrollSentinel = ref<HTMLElement | null>(null)

const hasMoreProducts = computed(() => {
  let total = 0
  props.storefront.categories.forEach(cat => {
    const filtered = favoritesOnly.value
      ? productsByCategory(cat.id).filter(p => favoriteIds.value.includes(p.id)).filter(hasPrice)
      : productsByCategory(cat.id).filter(hasPrice)
    total += filtered.length
  })
  return total > visibleProductLimit.value
})

const loadMore = () => {
  visibleProductLimit.value += 12
}
const favoriteIds = ref<string[]>([])
const favoritesStorageKey = computed(() => `vento_store_favorites_${slugKey.value}`)
const toastMessage = ref('')
let toastTimer: ReturnType<typeof setTimeout> | null = null

// PWA
const pwaInstallReady = ref(false)
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed', platform: string }>
}

let pwaDeferredPrompt: BeforeInstallPromptEvent | null = null

if (import.meta.client) {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    pwaDeferredPrompt = event as BeforeInstallPromptEvent
    pwaInstallReady.value = true
  })
}

const installPwa = async () => {
  if (!pwaDeferredPrompt) return
  pwaDeferredPrompt.prompt()
  const result = await pwaDeferredPrompt.userChoice
  if (result.outcome === 'accepted') {
    pwaInstallReady.value = false
  }
}

// Sorting
type SortMode = 'default' | 'price-asc' | 'price-desc' | 'name-asc' | 'name-desc' | 'sale'
const sortMode = ref<SortMode>('default')

// Price filter
const mobileFilterOpen = ref(false)
const pricePreset = ref('')
const priceMin = ref<number | null>(null)
const priceMax = ref<number | null>(null)
const hasActiveFilters = computed(() => priceMin.value !== null || priceMax.value !== null || pricePreset.value !== '')

// Order history
const orderHistory = computed<OrderHistoryEntry[]>(() => {
  if (import.meta.server) return []
  const raw = localStorage.getItem(`vento_orders_${slugKey.value}`)
  return raw ? (JSON.parse(raw) as OrderHistoryEntry[]) : []
})

// Toast
const showToast = (message: string) => {
  toastMessage.value = message
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastMessage.value = '' }, 2500)
}

// Timer labels for product cards
const timerLabels = ref<Record<string, string>>({})
const timerIntervals: Record<string, ReturnType<typeof setInterval>> = {}

const resolveTimerLabel = (product: ProductItem) => {
  return timerLabels.value[product.id] || ''
}

const updateTimerLabel = (product: ProductItem) => {
  if (!product.timerHours) return
  const totalSeconds = product.timerHours * 3600
  const startKey = `vento_timer_${product.id}`
  const startTime = localStorage.getItem(startKey)
  let remaining: number

  if (startTime) {
    remaining = Math.max(0, totalSeconds - (Date.now() - Number(startTime)) / 1000)
  } else {
    localStorage.setItem(startKey, String(Date.now()))
    remaining = totalSeconds
  }

  if (remaining <= 0) {
    timerLabels.value[product.id] = 'Finalizada'
    return
  }

  const hours = Math.floor(remaining / 3600)
  const minutes = Math.floor((remaining % 3600) / 60)
  const seconds = Math.floor(remaining % 60)
  const parts: string[] = []
  if (hours > 0) parts.push(`${hours}h`)
  parts.push(`${minutes}m`)
  if (product.timerShowSeconds) parts.push(`${seconds}s`)
  timerLabels.value[product.id] = parts.join(' ')
}

// Inicializar timers
watch(() => props.storefront?.products, (products) => {
  Object.values(timerIntervals).forEach(clearInterval)
  if (!products) return
  products.forEach((product) => {
    if (product.timerHours) {
      updateTimerLabel(product)
      timerIntervals[product.id] = setInterval(() => updateTimerLabel(product), 1000)
    }
  })
}, { immediate: true })

// Infinite scroll IntersectionObserver
let scrollObserver: IntersectionObserver | null = null

onMounted(() => {
  if (import.meta.client && scrollSentinel.value) {
    scrollObserver = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && hasMoreProducts.value) {
        loadMore()
      }
    }, { rootMargin: '200px' })
    if (scrollSentinel.value) scrollObserver.observe(scrollSentinel.value)
  }
})

watch(scrollSentinel, (el) => {
  if (scrollObserver) scrollObserver.disconnect()
  if (el) {
    scrollObserver = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && hasMoreProducts.value) {
        loadMore()
      }
    }, { rootMargin: '200px' })
    scrollObserver.observe(el)
  }
})

onUnmounted(() => {
  Object.values(timerIntervals).forEach(clearInterval)
  if (scrollObserver) scrollObserver.disconnect()
})

// Helpers
const resolvedHeaderName = computed(() => props.storefront.settings.storeHeaderName || props.storefront.settings.businessName)
const topBarText = computed(() => props.storefront.settings.storeTopBarHtml || '')
const isStoreMode = computed(() => props.storefront.settings.storefrontLayout === 'store')
const resolvedStoreIcon = computed(() => {
  const iconName = props.storefront.settings.storeIcon || 'shopping-bag'
  return STORE_ICON_MAP[iconName] || ShoppingBag
})
const whatsAppHref = computed(() => {
  const phone = (props.storefront.settings.whatsapp || '').replace(/\D/g, '')
  return phone ? `https://wa.me/${phone}` : ''
})

const heroStyle = computed(() => {
  const image = props.storefront.settings.storeHeroBackgroundImage || props.storefront.settings.coverImage || ''
  if (!image) return {}
  return {
    backgroundImage: `linear-gradient(135deg, rgba(15,23,42,0.72), rgba(15,23,42,0.28)), url("${image}")`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  }
})

const visibleCategories = computed(() => filteredCategories.value)
const renderedCategories = computed(() => {
  if (favoritesOnly.value) {
    return visibleCategories.value.filter(category => productsForSection(category.id).length > 0)
  }
  return visibleCategories.value
})

// Productos filtrados y ordenados
const filteredProductCount = computed(() => {
  let count = 0
  props.storefront.categories.forEach(cat => {
    count += productsForSection(cat.id).length
  })
  return count
})

// Sorting
const sortProducts = (products: ProductItem[]) => {
  const sorted = [...products]
  switch (sortMode.value) {
    case 'price-asc':
      return sorted.sort((a, b) => activeBasePrice(a) - activeBasePrice(b))
    case 'price-desc':
      return sorted.sort((a, b) => activeBasePrice(b) - activeBasePrice(a))
    case 'name-asc':
      return sorted.sort((a, b) => a.name.localeCompare(b.name))
    case 'name-desc':
      return sorted.sort((a, b) => b.name.localeCompare(a.name))
    case 'sale':
      return sorted.filter(p => p.hasPromo)
    default:
      return sorted
  }
}

// Price filter functions
const setPricePreset = (preset: string) => {
  pricePreset.value = preset
  switch (preset) {
    case '0-50': priceMin.value = 0; priceMax.value = 50; break
    case '0-100': priceMin.value = 0; priceMax.value = 100; break
    case '100-200': priceMin.value = 100; priceMax.value = 200; break
    case '200-plus': priceMin.value = 200; priceMax.value = null; break
  }
}

const applyPriceFilter = () => {
  mobileFilterOpen.value = false
}

const clearPriceFilter = () => {
  pricePreset.value = ''
  priceMin.value = null
  priceMax.value = null
}

const hasPrice = (product: ProductItem) => {
  const price = activeBasePrice(product)
  if (priceMin.value !== null && price < priceMin.value) return false
  if (priceMax.value !== null && price > priceMax.value) return false
  return true
}

// Track how many products we've shown per category for infinite scroll
const categoryProductCounts = ref<Record<string, number>>({})

// Override productsByCategory to include sorting, price filtering, and infinite scroll
const productsForSection = (categoryId: string) => {
  const raw = productsByCategory(categoryId)
  let filtered = favoritesOnly.value
    ? raw.filter(product => favoriteIds.value.includes(product.id))
    : raw
  filtered = filtered.filter(hasPrice)
  const sorted = sortProducts(filtered)
  const limit = categoryProductCounts.value[categoryId] || visibleProductLimit.value
  return sorted.slice(0, limit)
}

// Reset category counts when filters change
watch([favoritesOnly, selectedCategoryId, sortMode, priceMin, priceMax], () => {
  visibleProductLimit.value = 12
  categoryProductCounts.value = {}
})

// Favorites with animation
const loadFavorites = () => {
  if (import.meta.server) return
  const raw = localStorage.getItem(favoritesStorageKey.value)
  favoriteIds.value = raw ? JSON.parse(raw) as string[] : []
}

const persistFavorites = () => {
  if (import.meta.server) return
  localStorage.setItem(favoritesStorageKey.value, JSON.stringify(favoriteIds.value))
}

watch(favoritesStorageKey, () => loadFavorites(), { immediate: true })

const isFavorite = (productId: string) => favoriteIds.value.includes(productId)

const toggleFavorite = (productId: string) => {
  favoriteIds.value = isFavorite(productId)
    ? favoriteIds.value.filter(id => id !== productId)
    : [...favoriteIds.value, productId]
  persistFavorites()
}

const toggleFavoriteWithAnimation = (productId: string, event: MouseEvent) => {
  toggleFavorite(productId)
  const btn = event.currentTarget as HTMLElement
  btn.classList.add('animate-heart-pop')
  setTimeout(() => btn.classList.remove('animate-heart-pop'), 400)
}

const toggleFavoritesOnly = () => {
  showHistory.value = false
  favoritesOnly.value = !favoritesOnly.value
  if (favoritesOnly.value) selectedCategoryId.value = ''
}

const toggleFavoritesView = () => {
  showHistory.value = false
  favoritesOnly.value = !favoritesOnly.value
  if (favoritesOnly.value) selectedCategoryId.value = ''
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

const approvedReviewCount = (productId: string) =>
  props.storefront.reviews.filter(review => review.productId === productId && review.approved).length

const selectCategory = (categoryId: string) => {
  showHistory.value = false
  favoritesOnly.value = false
  selectedCategoryId.value = categoryId
}

const scrollToTop = () => {
  if (import.meta.client) window.scrollTo({ top: 0, behavior: 'smooth' })
}

const scrollToCatalog = () => {
  if (import.meta.client) {
    document.getElementById('catalog-anchor')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

const productStockState = (product: ProductItem): 'out' | 'low' | 'ok' | 'untracked' => {
  const tracked = (product.inventoryItems || []).filter(item => item.trackStock)
  if (!tracked.length) {
    return 'untracked'
  }

  if (tracked.some(item => Number(item.available ?? (item.quantity - item.reserved)) <= 0)) {
    return 'out'
  }

  if (tracked.some(item => Number(item.available ?? (item.quantity - item.reserved)) <= item.lowStockThreshold)) {
    return 'low'
  }

  return 'ok'
}

const productStockLabel = (product: ProductItem) => {
  const status = productStockState(product)
  if (status === 'out') return 'Agotado'
  if (status === 'low') return 'Pocas unidades'
  if (status === 'ok') return 'En stock'
  return 'Disponible'
}

// Quick add with feedback
const quickAddWithFeedback = (product: ProductItem) => {
  if (productStockState(product) === 'out') {
    showToast(`${product.name} esta agotado`)
    return
  }

  cartStore.addToCart(slugKey.value, product, [], 1)
  showToast(`${product.name} agregado al carrito`)
}

const commitProductWithFeedback = () => {
  commitProduct()
  const name = selectedProduct.value?.name || 'Producto'
  showToast(`${name} agregado al carrito`)
}

// Order history tracking
const trackOrder = (order: Pick<CatalogOrder, 'id' | 'createdAt' | 'items' | 'total' | 'status'>) => {
  if (import.meta.server) return
  const entry: OrderHistoryEntry = {
    id: order.id,
    createdAt: order.createdAt,
    items: order.items.map((item: CatalogOrderItem) => ({
      productId: item.productId,
      productName: item.productName,
      qty: item.qty,
    })),
    total: order.total,
    status: order.status,
  }
  const history = [...orderHistory.value]
  history.unshift(entry)
  localStorage.setItem(`vento_orders_${slugKey.value}`, JSON.stringify(history.slice(0, 50)))
}

const formatDate = (iso: string) => {
  const date = new Date(iso)
  return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const orderStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    new: 'Nuevo',
    viewed: 'Visto',
    preparing: 'En preparacion',
    completed: 'Completado',
    closed: 'Cerrado',
    cancelled: 'Cancelado',
  }
  return labels[status] || status
}

// Override submitCheckout to track orders
const originalSubmitCheckout = submitCheckout
const wrappedSubmitCheckout = () => {
  // We intercept the order creation, but the original function handles everything
  // Track the order by watching cart items before they're cleared
  if (cartStore.items.length > 0) {
    const order = {
      id: `local-${Date.now().toString(36)}`,
      createdAt: new Date().toISOString(),
      items: cartStore.items.map(item => ({
        productId: item.productId,
        productName: item.productName,
        qty: item.quantity,
        unitPrice: item.finalUnitPrice,
        totalPrice: item.finalUnitPrice * item.quantity,
        variantSummary: [],
      })),
      total: finalTotal.value,
      status: 'new' as const,
    }
    trackOrder(order)
  }
  originalSubmitCheckout()
}
</script>

<style scoped>
.shop-shell {
  background:
    radial-gradient(circle at top, color-mix(in srgb, var(--catalog-primary) 28%, transparent), transparent 42%),
    linear-gradient(180deg, color-mix(in srgb, var(--catalog-bg) 94%, white), var(--catalog-bg));
  color: var(--catalog-text);
}

/* Toast */
.toast-bar {
  position: fixed;
  top: 1rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 300;
  padding: 0.85rem 1.5rem;
  border-radius: 999px;
  background: #111827;
  color: white;
  font-size: 0.82rem;
  font-weight: 700;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.35);
  white-space: nowrap;
}

/* Top bar */
.shop-topbar {
  padding: 0.7rem 1rem;
  background: color-mix(in srgb, var(--catalog-primary) 18%, #111827);
  color: white;
  text-align: center;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

/* Containers */
.shop-header,
.search-wrap,
.hero-card,
.toolbar-row,
.filter-panel,
.category-strip,
.catalog-section,
.history-section,
.shop-footer {
  width: min(1180px, calc(100% - 1.5rem));
  margin-inline: auto;
}

/* Header */
.shop-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 0 0.75rem;
}

.brand-block {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  background: transparent;
  border: 0;
  color: inherit;
  padding: 0;
  text-align: left;
  cursor: pointer;
}

.brand-logo,
.brand-mark,
.brand-logo-icon {
  width: 52px;
  height: 52px;
  border-radius: 18px;
}

.brand-logo-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--catalog-primary);
  color: white;
  padding: 10px;
  flex-shrink: 0;
}

.brand-logo {
  object-fit: cover;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.14);
}

.brand-mark {
  display: grid;
  place-items: center;
  background: var(--catalog-primary);
  color: white;
  font-weight: 800;
}

.brand-copy {
  display: flex;
  flex-direction: column;
}

.brand-eyebrow {
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--catalog-muted);
}

.header-actions {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.header-btn,
.category-pill,
.hero-secondary,
.hero-primary,
.cart-fab-btn,
.filter-toggle-btn,
.mobile-bottom-btn,
.mobile-bottom-btn.wa-btn,
.filter-preset-chip,
.filter-apply-btn,
.filter-clear-btn {
  border: 0;
  cursor: pointer;
}

.header-btn {
  display: inline-flex;
  align-items: center;
  padding: 0.82rem 1rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--catalog-card) 90%, white);
  color: var(--catalog-text);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
  font-size: 0.82rem;
  font-weight: 600;
  transition: all 0.2s ease;
}

.header-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.12);
}

/* Search */
.search-wrap {
  padding-bottom: 0.8rem;
}

.search-input {
  width: 100%;
  border: 1px solid color-mix(in srgb, var(--catalog-primary) 18%, #cbd5e1);
  border-radius: 24px;
  padding: 1rem 1.2rem;
  background: color-mix(in srgb, var(--catalog-card) 92%, white);
  color: var(--catalog-text);
}

/* Hero */
.hero-card {
  position: relative;
  display: grid;
  gap: 1rem;
  grid-template-columns: minmax(0, 1.6fr) minmax(260px, 0.8fr);
  overflow: hidden;
  border-radius: 32px;
  padding: 2rem;
  background: linear-gradient(135deg, color-mix(in srgb, var(--catalog-primary) 14%, white), color-mix(in srgb, var(--catalog-card) 88%, white));
  box-shadow: 0 26px 80px rgba(15, 23, 42, 0.14);
}

.hero-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.08), transparent 55%);
  pointer-events: none;
}

.hero-copy,
.hero-side {
  position: relative;
  z-index: 1;
}

.hero-tag,
.premium-badge,
.promo-chip,
.timer-chip,
.product-rating {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
}

.hero-tag {
  padding: 0.45rem 0.8rem;
  background: color-mix(in srgb, var(--catalog-primary) 16%, white);
  color: var(--catalog-primary);
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.hero-copy h1 {
  margin: 0.9rem 0 0.75rem;
  font-size: clamp(2rem, 5vw, 4rem);
  line-height: 0.95;
}

.hero-copy p {
  max-width: 52ch;
  color: color-mix(in srgb, var(--catalog-text) 74%, white);
}

.hero-meta,
.hero-actions,
.hero-kpis {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.hero-meta span,
.hero-kpis span {
  padding: 0.6rem 0.8rem;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.66);
  backdrop-filter: blur(16px);
}

.hero-primary,
.hero-secondary {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  padding: 0.9rem 1.2rem;
  border-radius: 18px;
  font-weight: 700;
  text-decoration: none;
}

.hero-primary {
  background: var(--catalog-primary);
  color: white;
}

.hero-secondary {
  background: rgba(255, 255, 255, 0.78);
  color: var(--catalog-text);
}

.hero-side {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  justify-content: space-between;
}

.premium-badge {
  width: fit-content;
  padding: 0.8rem 1rem;
  background: #111827;
  color: white;
  font-weight: 700;
}

/* Closed */
.closed-state {
  margin: 1rem auto 0;
}

.closed-card {
  padding: 1.25rem 1.4rem;
  border-radius: 24px;
  background: color-mix(in srgb, #7f1d1d 8%, white);
  color: #7f1d1d;
}

/* Toolbar */
.toolbar-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 0 0.5rem;
  flex-wrap: wrap;
}

.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.toolbar-count {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--catalog-muted);
}

.sort-select {
  padding: 0.6rem 2rem 0.6rem 1rem;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--catalog-primary) 12%, #cbd5e1);
  background: color-mix(in srgb, var(--catalog-card) 92%, white);
  color: var(--catalog-text);
  font-size: 0.8rem;
  font-weight: 600;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%2364748b' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.8rem center;
}

.filter-toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.6rem 1rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--catalog-card) 90%, white);
  color: var(--catalog-text);
  font-size: 0.8rem;
  font-weight: 600;
  transition: all 0.2s ease;
  position: relative;
}

.filter-toggle-btn.active,
.filter-toggle-btn:hover {
  background: color-mix(in srgb, var(--catalog-primary) 14%, white);
  color: var(--catalog-primary);
}

.filter-dot {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--catalog-primary);
}

/* Filter panel */
.filter-panel {
  padding: 1rem 0;
}

.filter-section {
  padding: 1.2rem;
  border-radius: 20px;
  background: color-mix(in srgb, var(--catalog-card) 88%, white);
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.06);
}

.filter-label {
  display: block;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--catalog-muted);
  margin-bottom: 0.75rem;
}

.filter-presets {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 0.75rem;
}

.filter-preset-chip {
  padding: 0.5rem 1rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--catalog-bg) 80%, white);
  color: var(--catalog-text);
  font-size: 0.72rem;
  font-weight: 700;
  transition: all 0.2s ease;
}

.filter-preset-chip.active {
  background: var(--catalog-primary);
  color: white;
}

.filter-custom {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.filter-price-input {
  width: 90px;
  padding: 0.55rem 0.8rem;
  border-radius: 12px;
  border: 1px solid color-mix(in srgb, var(--catalog-primary) 12%, #cbd5e1);
  background: white;
  color: var(--catalog-text);
  font-size: 0.82rem;
}

.filter-price-sep {
  color: var(--catalog-muted);
  font-size: 0.78rem;
}

.filter-apply-btn {
  padding: 0.55rem 1.2rem;
  border-radius: 12px;
  background: var(--catalog-primary);
  color: white;
  font-size: 0.78rem;
  font-weight: 700;
}

.filter-clear-btn {
  padding: 0.55rem 1rem;
  border-radius: 12px;
  background: transparent;
  color: var(--catalog-muted);
  font-size: 0.75rem;
  font-weight: 600;
  text-decoration: underline;
}

/* Categories */
.category-strip {
  display: flex;
  gap: 0.7rem;
  overflow-x: auto;
  padding: 1.2rem 0;
}

.category-pill {
  padding: 0.82rem 1rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--catalog-card) 90%, white);
  color: var(--catalog-text);
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.08);
  font-size: 0.82rem;
  font-weight: 600;
  white-space: nowrap;
  transition: all 0.2s ease;
}

.category-pill.active {
  background: var(--catalog-primary);
  color: white;
}

/* Catalog sections */
.catalog-section {
  margin-bottom: 2rem;
}

.section-head {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.section-head h2 {
  margin: 0;
  font-size: 1.6rem;
}

.section-head p {
  margin: 0.25rem 0 0;
  color: var(--catalog-muted);
}

/* Product grid */
.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 1rem;
}

.product-card {
  position: relative;
  overflow: hidden;
  border-radius: 28px;
  background: color-mix(in srgb, var(--catalog-card) 92%, white);
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.product-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 28px 60px rgba(15, 23, 42, 0.14);
}

.favorite-btn {
  position: absolute;
  top: 0.85rem;
  right: 0.85rem;
  z-index: 2;
  width: 40px;
  height: 40px;
  border-radius: 999px;
  border: 0;
  background: rgba(255, 255, 255, 0.9);
  color: #e11d48;
  font-size: 1.1rem;
  cursor: pointer;
  transition: transform 0.2s ease;
}

.favorite-btn:hover {
  transform: scale(1.15);
}

.product-hit {
  display: block;
  width: 100%;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.product-image-wrap {
  position: relative;
  height: 220px;
  background: linear-gradient(135deg, color-mix(in srgb, var(--catalog-primary) 18%, white), color-mix(in srgb, var(--catalog-card) 80%, white));
}

.product-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.product-image--fallback {
  display: grid;
  place-items: center;
  color: var(--catalog-muted);
}

.promo-chip {
  position: absolute;
  left: 0.85rem;
  top: 0.85rem;
  padding: 0.45rem 0.7rem;
  background: var(--catalog-offer-bg, var(--catalog-primary));
  color: var(--catalog-offer-text, white);
  font-size: 0.72rem;
  font-weight: 700;
  z-index: 1;
}

.timer-chip {
  position: absolute;
  right: 0.85rem;
  bottom: 0.85rem;
  padding: 0.4rem 0.65rem;
  background: var(--catalog-timer-bg, #222);
  color: var(--catalog-timer-text, white);
  font-size: 0.68rem;
  font-weight: 700;
  z-index: 1;
  gap: 0.25rem;
}

.timer-chip--image {
  right: auto;
  left: 0.85rem;
  bottom: auto;
  top: 3rem;
}

.product-copy {
  padding: 1rem;
}

.product-headline {
  margin-bottom: 0.45rem;
}

.product-headline h3 {
  margin: 0;
  font-size: 1.05rem;
}

.product-tags,
.product-copy p,
.price-block span {
  color: var(--catalog-muted);
}

.product-copy p {
  min-height: 3.2rem;
}

.stock-badge-row {
  display: flex;
  margin-top: -0.1rem;
}

.stock-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.28rem 0.62rem;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.03em;
}

.stock-out {
  background: #fee2e2;
  color: #b91c1c;
}

.stock-low {
  background: #ffedd5;
  color: #c2410c;
}

.stock-ok {
  background: #dcfce7;
  color: #166534;
}

.stock-untracked {
  background: rgba(24, 24, 27, 0.08);
  color: #52525b;
}

.product-footer {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 0.8rem;
}

.product-footer-right {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.price-block {
  display: flex;
  flex-direction: column;
}

.price-block strong {
  font-size: 1.35rem;
  color: var(--catalog-price);
}

.price-block span {
  text-decoration: line-through;
}

.product-rating {
  padding: 0.45rem 0.7rem;
  background: color-mix(in srgb, var(--catalog-primary) 10%, white);
  color: var(--catalog-primary);
  font-size: 0.75rem;
  font-weight: 700;
}

.quick-add-btn {
  width: 36px;
  height: 36px;
  border-radius: 999px;
  border: 0;
  background: var(--catalog-primary);
  color: white;
  display: grid;
  place-items: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.quick-add-btn:hover {
  transform: scale(1.15);
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.2);
}

.quick-add-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* Footer */
.shop-footer {
  padding: 2rem 0;
  color: var(--catalog-muted);
  text-align: center;
}

/* Cart FAB */
.cart-fab {
  position: fixed;
  left: 1rem;
  right: 1rem;
  bottom: 5rem;
  z-index: 40;
}

@media (min-width: 769px) {
  .cart-fab {
    bottom: 1rem;
  }
}

.cart-fab-btn {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.2rem;
  border-radius: 24px;
  background: #111827;
  color: white;
  box-shadow: 0 22px 50px rgba(15, 23, 42, 0.32);
  font-weight: 700;
  transition: transform 0.2s ease;
}

.cart-fab-btn:hover {
  transform: translateY(-2px);
}

/* Mobile bottom bar */
.mobile-bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 45;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.6rem 1rem calc(0.6rem + env(safe-area-inset-bottom));
  background: color-mix(in srgb, var(--catalog-card) 96%, white);
  border-top: 1px solid rgba(0, 0, 0, 0.06);
  backdrop-filter: blur(16px);
  box-shadow: 0 -8px 32px rgba(15, 23, 42, 0.06);
}

.mobile-bottom-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  background: transparent;
  color: var(--catalog-muted);
  font-size: 0.6rem;
  font-weight: 600;
  padding: 0.35rem 0.6rem;
  border-radius: 12px;
  transition: all 0.2s ease;
  text-decoration: none;
  min-width: 56px;
}

.mobile-bottom-btn.active {
  color: var(--catalog-primary);
}

.mobile-bottom-btn.wa-btn {
  color: #25d366;
}

/* History */
.history-section {
  padding: 1rem 0 2rem;
}

.history-empty {
  padding: 3rem 1rem;
  text-align: center;
  color: var(--catalog-muted);
  border-radius: 20px;
  background: color-mix(in srgb, var(--catalog-card) 80%, white);
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.history-card {
  padding: 1rem 1.2rem;
  border-radius: 20px;
  background: color-mix(in srgb, var(--catalog-card) 88%, white);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.04);
}

.history-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  font-size: 0.85rem;
}

.history-date {
  color: var(--catalog-muted);
  font-size: 0.75rem;
}

.history-items {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-bottom: 0.6rem;
}

.history-item-chip {
  padding: 0.25rem 0.65rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--catalog-primary) 8%, white);
  color: var(--catalog-text);
  font-size: 0.7rem;
  font-weight: 600;
}

.history-item-more {
  font-size: 0.7rem;
  color: var(--catalog-muted);
  align-self: center;
}

.history-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.history-status {
  padding: 0.25rem 0.7rem;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 700;
}

.status-new { background: #dbeafe; color: #1e40af; }
.status-viewed { background: #fef3c7; color: #92400e; }
.status-preparing { background: #e0e7ff; color: #3730a3; }
.status-completed { background: #d1fae5; color: #065f46; }
.status-closed { background: #f3f4f6; color: #374151; }
.status-cancelled { background: #fee2e2; color: #991b1b; }

/* Animations */
@keyframes heartPop {
  0% { transform: scale(1); }
  50% { transform: scale(1.4); }
  100% { transform: scale(1); }
}

.animate-heart-pop {
  animation: heartPop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  color: #ef4444 !important;
}

/* Free shipping badge */
.free-ship-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.3rem 0.6rem;
  border-radius: 999px;
  background: #d1fae5;
  color: #065f46;
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

/* Rating stars */
.product-rating-stars {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  padding: 0.35rem 0.6rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--catalog-primary) 10%, white);
  color: var(--catalog-primary);
  font-size: 0.72rem;
  font-weight: 700;
}

.star-icon {
  color: #f59e0b;
  flex-shrink: 0;
}

/* Store sidebar layout */
.store-layout {
  display: flex;
  gap: 2rem;
  margin-top: 1rem;
}

.store-sidebar {
  width: 240px;
  flex-shrink: 0;
  display: none;
}

@media (min-width: 769px) {
  .store-sidebar {
    display: block;
  }
}

.sidebar-nav {
  position: sticky;
  top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.sidebar-link {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  width: 100%;
  padding: 0.75rem 1rem;
  border-radius: 14px;
  border: 0;
  background: transparent;
  color: var(--catalog-text);
  font-size: 0.82rem;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
  transition: all 0.15s ease;
}

.sidebar-link:hover {
  background: color-mix(in srgb, var(--catalog-primary) 8%, white);
}

.sidebar-link.active {
  background: color-mix(in srgb, var(--catalog-primary) 14%, white);
  color: var(--catalog-primary);
}

.sidebar-badge {
  margin-left: auto;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  background: var(--catalog-primary);
  color: white;
  font-size: 0.65rem;
  font-weight: 700;
}

.store-main {
  flex: 1;
  min-width: 0;
}

/* Infinite scroll */
.scroll-sentinel {
  display: flex;
  justify-content: center;
  padding: 2rem 0;
}

.load-more-btn {
  padding: 0.85rem 2rem;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--catalog-primary) 30%, #cbd5e1);
  background: color-mix(in srgb, var(--catalog-card) 90%, white);
  color: var(--catalog-text);
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
}

.load-more-btn:hover {
  background: var(--catalog-primary);
  color: white;
  border-color: var(--catalog-primary);
}

.scroll-end-message {
  text-align: center;
  padding: 2rem 0;
  color: var(--catalog-muted);
  font-size: 0.82rem;
  font-weight: 600;
}

/* Share button on product sheet */
.share-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.7rem 1.2rem;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.08);
  color: var(--catalog-text);
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.share-btn:hover {
  background: rgba(255, 255, 255, 0.15);
  border-color: rgba(255, 255, 255, 0.25);
}

/* Responsive */
@media (max-width: 900px) {
  .hero-card {
    grid-template-columns: 1fr;
    padding: 1.4rem;
  }

  .shop-header {
    flex-direction: column;
    align-items: stretch;
  }

  .header-actions {
    width: 100%;
  }

  .header-btn {
    flex: 1;
  }

  .product-grid {
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 0.75rem;
  }

  .product-image-wrap {
    height: 180px;
  }
}

@media (min-width: 769px) {
  .mobile-bottom-bar {
    display: none;
  }
}
</style>
