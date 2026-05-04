import { useSeoMeta } from 'nuxt/app'
import { computed, onUnmounted, reactive, ref, watch } from 'vue'
import type { Ref } from 'vue'
import type { CatalogCoupon, CatalogOperationalSettings, CatalogReview, CatalogThemeSettings } from '~/types/catalog'
import type { CartModifier } from '~/stores/cart'
import type { CategoryItem, ProductItem } from '~/stores/catalog'
import { useAnalytics } from '~/composables/useAnalytics'
import { useCheckoutEngine } from '~/composables/useCheckoutEngine'
import { useSupabaseBackend } from '~/composables/useSupabaseBackend'
import { useCartStore } from '~/stores/cart'
import { generatePublicEntityId } from '~/utils/entityIds'
import { getCurrentScheduleState, money, resolveDeliveryFee, validateCoupon } from '~/utils/catalog'

export interface StorefrontPayload {
  id: string
  slug: string
  settings: CatalogOperationalSettings
  theme: CatalogThemeSettings
  categories: CategoryItem[]
  products: ProductItem[]
  reviews: CatalogReview[]
  coupons: CatalogCoupon[]
}

export const useStorefrontExperience = (storefront: Ref<StorefrontPayload | null>, slugKey: Ref<string>) => {
  const runtime = globalThis as typeof globalThis & {
    localStorage?: Storage
    window?: {
      open?: (url?: string | URL, target?: string, features?: string) => Window | null
      alert?: (message?: unknown) => void
    }
  }

  const cartStore = useCartStore()
  const { encodeOrderToWhatsApp } = useCheckoutEngine()
  const backend = useSupabaseBackend()
  const analytics = useAnalytics()

  const search = ref('')
  const debouncedSearch = ref('')
  const selectedCategoryId = ref('')
  const selectedProduct = ref<ProductItem | null>(null)
  const singleSelections = ref<Record<string, string>>({})
  const multiSelections = ref<Record<string, string[]>>({})
  const quantity = ref(1)
  const instructions = ref('')
  const reviewTargetProductId = ref<string | null>(null)

  const checkoutForm = reactive({
    name: '',
    address: '',
    method: 'Delivery',
    paymentMethod: '',
    zoneId: '',
  })

  const reviewForm = reactive({
    name: '',
    rating: 5,
    comment: '',
  })

  const couponCode = ref('')
  const appliedCoupon = ref<CatalogCoupon | null>(null)
  const couponMessage = ref('')
  const checkoutSubmitting = ref(false)
  const reviewSubmitting = ref(false)

  const notify = (message: string) => {
    runtime.window?.alert?.(message)
  }

  watch(slugKey, (slug: string) => {
    if (!slug) {
      return
    }

    cartStore.hydrateCart(slug)
  }, { immediate: true })

  let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null
  watch(search, (value) => {
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer)
    }

    searchDebounceTimer = setTimeout(() => {
      debouncedSearch.value = value
    }, 220)
  }, { immediate: true })

  watch(storefront, (value: StorefrontPayload | null) => {
    if (!value) {
      return
    }

    if (!selectedCategoryId.value && value.categories[0]) {
      selectedCategoryId.value = value.categories[0].id
    }

    useSeoMeta({
      title: value.settings.ogTitle || value.settings.businessName,
      description: value.settings.ogDescription,
    })
  }, { immediate: true })

  const isClosed = computed(() => Boolean(storefront.value?.settings.closed))
  const scheduleState = computed(() => storefront.value ? getCurrentScheduleState(storefront.value.settings) : { isOpen: false, label: '' })
  const isStoreAcceptingOrders = computed(() => !isClosed.value && scheduleState.value.isOpen)
  const availableDelivery = computed(() => Boolean(storefront.value?.settings.deliveryEnabled && !storefront.value?.settings.deliveryPaused))
  const availablePickup = computed(() => Boolean(storefront.value?.settings.pickupEnabled))
  const visibleCoupons = computed(() => storefront.value?.coupons || [])
  const deliveryResolution = computed(() => storefront.value ? resolveDeliveryFee(storefront.value.settings, checkoutForm.zoneId || null) : { fee: 0, minimumOrder: 0, zone: null })
  const subtotalBeforeDiscount = computed(() => cartStore.totalPrice)
  const couponValidation = computed(() => {
    if (!appliedCoupon.value) {
      return { valid: true, reason: '', discount: 0 }
    }

    return validateCoupon(appliedCoupon.value, subtotalBeforeDiscount.value)
  })
  const discountTotal = computed(() => couponValidation.value.valid ? Number(couponValidation.value.discount || 0) : 0)
  const deliveryFee = computed(() => checkoutForm.method === 'Delivery' ? Number(deliveryResolution.value.fee || 0) : 0)
  const finalTotal = computed(() => Math.max(0, subtotalBeforeDiscount.value - discountTotal.value + deliveryFee.value))

  watch(() => checkoutForm.method, (value: string) => {
    if (value !== 'Delivery') {
      checkoutForm.zoneId = ''
      checkoutForm.address = ''
    }
  })

  watch([availableDelivery, availablePickup], ([delivery, pickup]) => {
    if (!delivery && pickup) {
      checkoutForm.method = 'Pickup'
    } else if (delivery && !pickup) {
      checkoutForm.method = 'Delivery'
    }
  }, { immediate: true })

  const themeVars = computed(() => {
    const theme = storefront.value?.theme
    const settings = storefront.value?.settings
    if (!theme) {
      return {}
    }

    const isStoreMode = settings?.storefrontLayout === 'store'

    return {
      '--catalog-bg': isStoreMode && settings?.storeBgColor ? settings.storeBgColor : theme.bg,
      '--catalog-card': isStoreMode && settings?.storeCardBgColor ? settings.storeCardBgColor : theme.cardBg,
      '--catalog-primary': theme.primary,
      '--catalog-text': isStoreMode && settings?.storeTextPrimaryColor ? settings.storeTextPrimaryColor : theme.productTitleColor,
      '--catalog-muted': isStoreMode && settings?.storeTextSecondaryColor ? settings.storeTextSecondaryColor : theme.descColor,
      '--catalog-header': theme.headerBg,
      '--catalog-header-text': theme.headerText,
      '--catalog-tag-bg': theme.tagBg,
      '--catalog-tag-text': theme.tagText,
      '--catalog-price': theme.priceColor,
      '--catalog-old-price': theme.priceOldColor,
      '--catalog-offer-bg': theme.offerBadgeBg,
      '--catalog-offer-text': theme.offerBadgeText,
      '--catalog-detail-bg': theme.detailBg,
      '--catalog-btn-cart': theme.btnCartBg,
      '--catalog-btn-wa': theme.btnWaBg,
      '--catalog-store-cart-bg': isStoreMode && settings?.storeCartBgColor ? settings.storeCartBgColor : '#0f172a',
      '--catalog-store-cart-text': isStoreMode && settings?.storeCartTextColor ? settings.storeCartTextColor : '#ffffff',
    }
  })

  const productsByCategory = (categoryId: string) => {
    const needle = debouncedSearch.value.trim().toLowerCase()
    return (storefront.value?.products || []).filter((product) => {
      const matchesCategory = product.categoryId === categoryId
      const matchesSearch = !needle || [product.name, product.description].join(' ').toLowerCase().includes(needle)
      return matchesCategory && matchesSearch
    })
  }

  const filteredCategories = computed<CategoryItem[]>(() => {
    const source = storefront.value?.categories || []
    if (!selectedCategoryId.value) {
      return source.filter(category => productsByCategory(category.id).length > 0)
    }

    return source.filter(category => category.id === selectedCategoryId.value && productsByCategory(category.id).length > 0)
  })

  const activeBasePrice = (product: ProductItem) =>
    product.hasPromo && product.promoPrice !== null ? product.promoPrice : product.basePrice

  const selectedModifiers = computed<CartModifier[]>(() => {
    if (!selectedProduct.value) {
      return []
    }

    return selectedProduct.value.variants.flatMap((group) => {
      const selectedIds = group.type === 'single'
        ? (singleSelections.value[group.id] ? [singleSelections.value[group.id]] : [])
        : (multiSelections.value[group.id] || [])

      return group.options
        .filter(option => selectedIds.includes(option.id))
        .map(option => ({
          groupId: group.id,
          groupName: group.groupName,
          optionId: option.id,
          optionName: option.name,
          priceDelta: option.priceDelta,
        }))
    })
  })

  const liveSubtotal = computed<number>(() => {
    if (!selectedProduct.value) {
      return 0
    }

    const modifiersTotal = selectedModifiers.value.reduce((acc: number, modifier: CartModifier) => acc + modifier.priceDelta, 0)
    return (activeBasePrice(selectedProduct.value) + modifiersTotal) * quantity.value
  })

  const openProduct = (product: ProductItem) => {
    if (storefront.value) {
      analytics.trackProductClick(storefront.value.id, product.id)
    }

    selectedProduct.value = product
    reviewTargetProductId.value = product.id
    singleSelections.value = {}
    multiSelections.value = {}
    quantity.value = 1
    instructions.value = ''
  }

  const closeProduct = () => {
    selectedProduct.value = null
  }

  const selectSingle = (groupId: string, optionId: string) => {
    singleSelections.value[groupId] = optionId
  }

  const toggleMulti = (groupId: string, optionId: string) => {
    const current = multiSelections.value[groupId] || []
    multiSelections.value[groupId] = current.includes(optionId)
      ? current.filter(item => item !== optionId)
      : [...current, optionId]
  }

  const commitProduct = () => {
    if (!selectedProduct.value || !storefront.value) {
      return
    }

    const trackedInventory = (selectedProduct.value.inventoryItems || []).filter(item => item.trackStock)
    if (trackedInventory.length && trackedInventory.some(item => Number(item.available ?? (item.quantity - item.reserved)) <= 0)) {
      notify(`${selectedProduct.value.name} ya no tiene stock disponible.`)
      return
    }

    const missingRequired = selectedProduct.value.variants.find(group => group.options.length > 0 && group.type === 'single' && !singleSelections.value[group.id] && group.options.some(option => option.isRequired))
    if (missingRequired) {
      notify(`Selecciona una opcion para ${missingRequired.groupName}`)
      return
    }

    cartStore.addToCart(
      slugKey.value,
      selectedProduct.value,
      selectedModifiers.value,
      quantity.value,
      instructions.value.trim().slice(0, 180),
    )

    closeProduct()
  }

  const quickAddProduct = (product: ProductItem) => {
    if (storefront.value) {
      analytics.trackProductClick(storefront.value.id, product.id)
    }

    const trackedInventory = (product.inventoryItems || []).filter(item => item.trackStock)
    if (trackedInventory.length && trackedInventory.some(item => Number(item.available ?? (item.quantity - item.reserved)) <= 0)) {
      notify(`${product.name} ya no tiene stock disponible.`)
      return
    }

    if (product.variants.length > 0) {
      openProduct(product)
      return
    }

    cartStore.addToCart(slugKey.value, product, [], 1)
  }

  const applyCoupon = () => {
    if (!storefront.value) {
      return
    }

    const code = couponCode.value.trim().toUpperCase()
    if (!code) {
      couponMessage.value = 'Ingresa un codigo para validar.'
      appliedCoupon.value = null
      return
    }

    const match = visibleCoupons.value.find(coupon => coupon.code.trim().toUpperCase() === code)
    if (!match) {
      appliedCoupon.value = null
      couponMessage.value = 'Ese cupon no existe en este catalogo.'
      return
    }

    const validation = validateCoupon(match, subtotalBeforeDiscount.value)
    if (!validation.valid) {
      appliedCoupon.value = null
      couponMessage.value = validation.reason
      return
    }

    appliedCoupon.value = match
    couponMessage.value = `Cupon aplicado. Ahorras ${money(validation.discount || 0, storefront.value.settings.currency)}.`
  }

  const removeCoupon = () => {
    appliedCoupon.value = null
    couponCode.value = ''
    couponMessage.value = ''
  }

  const submitCheckout = async () => {
    if (!storefront.value || !isStoreAcceptingOrders.value || !cartStore.items.length || checkoutSubmitting.value) {
      return
    }

    if (checkoutForm.name.trim().length < 2) {
      notify('Ingresa tu nombre antes de continuar.')
      return
    }

    if (checkoutForm.method === 'Delivery' && !availableDelivery.value) {
      notify('El delivery no esta disponible en este momento.')
      return
    }

    if (checkoutForm.method === 'Pickup' && !availablePickup.value) {
      notify('La recogida no esta disponible en este momento.')
      return
    }

    if (checkoutForm.method === 'Delivery' && storefront.value.settings.deliveryFeeType === 'zones' && !checkoutForm.zoneId) {
      notify('Selecciona una zona de entrega antes de continuar.')
      return
    }

    if (checkoutForm.method === 'Delivery' && checkoutForm.address.trim().length <= 10) {
      notify('Ingresa una direccion valida para el delivery.')
      return
    }

    if (checkoutForm.method === 'Delivery' && subtotalBeforeDiscount.value < deliveryResolution.value.minimumOrder) {
      notify(`El pedido minimo para delivery es ${money(deliveryResolution.value.minimumOrder, storefront.value.settings.currency)}.`)
      return
    }

    if (appliedCoupon.value) {
      const validation = validateCoupon(appliedCoupon.value, subtotalBeforeDiscount.value)
      if (!validation.valid) {
        notify(validation.reason)
        return
      }
    }

    // Re-verify stock at checkout to reduce race-condition impact
    const outOfStockItem = cartStore.items.find(item => {
      const product = storefront.value?.products.find(p => p.id === item.productId)
      if (!product) return false
      const tracked = (product.inventoryItems || []).filter((i: { trackStock?: boolean }) => i.trackStock)
      if (!tracked.length) return false
      return tracked.some((inv: { available?: number }) => Number(inv.available ?? 0) <= 0)
    })
    if (outOfStockItem) {
      notify('Algunos productos en tu carrito ya no tienen stock disponible.')
      return
    }

    checkoutSubmitting.value = true

    const order = {
      id: generatePublicEntityId('order'),
      catalogId: storefront.value.id,
      channel: 'whatsapp' as const,
      status: 'new' as const,
      customerName: checkoutForm.name.trim(),
      customerAddress: checkoutForm.method === 'Delivery' ? checkoutForm.address.trim() : '',
      paymentMethod: checkoutForm.paymentMethod.trim() || 'Pendiente en WhatsApp',
      deliveryMode: checkoutForm.method === 'Delivery' ? 'delivery' as const : 'pickup' as const,
      deliveryZoneId: checkoutForm.method === 'Delivery' ? checkoutForm.zoneId || undefined : undefined,
      deliveryZoneName: checkoutForm.method === 'Delivery' ? deliveryResolution.value.zone?.name || undefined : undefined,
      notes: '',
      items: cartStore.items.map(item => ({
        productId: item.productId,
        productName: item.productName,
        qty: item.quantity,
        unitPrice: item.finalUnitPrice,
        totalPrice: item.finalUnitPrice * item.quantity,
        variantSummary: item.modifiers.map(modifier => `${modifier.groupName}: ${modifier.optionName}`),
        variantOptionIds: item.modifiers.map(modifier => modifier.optionId),
      })),
      subtotal: subtotalBeforeDiscount.value,
      discountTotal: discountTotal.value,
      deliveryFee: deliveryFee.value,
      appliedCoupon: appliedCoupon.value
        ? {
          id: appliedCoupon.value.id,
          code: appliedCoupon.value.code,
          type: appliedCoupon.value.discountType,
          value: appliedCoupon.value.discountValue,
        }
        : null,
      total: finalTotal.value,
      createdAt: new Date().toISOString(),
    }

    let orderPersisted = false
    try {
      await backend.appendOrder(storefront.value.id, order)
      orderPersisted = true
    } catch (error) {
      console.warn('Order ledger persistence failed before WhatsApp redirect', error)
      notify('No se pudo guardar el pedido en el sistema. Intentalo de nuevo.')
      checkoutSubmitting.value = false
      return
    } finally {
      if (!orderPersisted) {
        checkoutSubmitting.value = false
      }
    }

    const checkoutUrl = encodeOrderToWhatsApp(
      cartStore.items,
      storefront.value.settings,
      {
        name: checkoutForm.name,
        address: checkoutForm.address,
        method: checkoutForm.method,
        paymentMethod: checkoutForm.paymentMethod,
        zoneName: deliveryResolution.value.zone?.name || '',
        couponCode: appliedCoupon.value?.code || '',
        discountTotal: discountTotal.value,
        deliveryFee: deliveryFee.value,
      },
      finalTotal.value,
    )

    const popup = runtime.window?.open?.(checkoutUrl, '_blank')
    if (!popup) {
      notify('El navegador bloqueo la ventana de WhatsApp. Habilita popups para este sitio.')
      checkoutSubmitting.value = false
      return
    }

    cartStore.clearCart(slugKey.value)
    cartStore.isOpen = false
    checkoutForm.zoneId = ''
    checkoutForm.address = ''
    checkoutForm.paymentMethod = ''
    removeCoupon()
    checkoutSubmitting.value = false
  }

  const REVIEW_THROTTLE_PREFIX = 'saas_review_guard_'
  const reviewThrottleKey = computed(() => `${REVIEW_THROTTLE_PREFIX}${slugKey.value}`)

  const cleanupOldReviewThrottleKeys = () => {
    if (import.meta.server || !runtime.localStorage) return
    const now = Date.now()
    const maxAge = 24 * 60 * 60 * 1000
    for (let i = runtime.localStorage.length - 1; i >= 0; i--) {
      const key = runtime.localStorage.key(i)
      if (key?.startsWith(REVIEW_THROTTLE_PREFIX)) {
        try {
          const raw = runtime.localStorage.getItem(key)
          const timestamps: number[] = raw ? JSON.parse(raw) : []
          const hasRecent = timestamps.some(ts => now - ts < maxAge)
          if (!hasRecent) {
            runtime.localStorage.removeItem(key)
          }
        } catch {
          runtime.localStorage.removeItem(key)
        }
      }
    }
  }

  const readRecentReviewAttempts = () => {
    if (import.meta.server) {
      return []
    }

    const now = Date.now()
    const raw = runtime.localStorage?.getItem(reviewThrottleKey.value)
    const timestamps = raw ? (JSON.parse(raw) as number[]) : []
    return timestamps.filter(timestamp => now - timestamp < 6 * 60 * 60 * 1000)
  }

  const recordReviewAttempt = () => {
    if (import.meta.server) {
      return
    }

    const recent = readRecentReviewAttempts()
    recent.push(Date.now())
    runtime.localStorage?.setItem(reviewThrottleKey.value, JSON.stringify(recent))
    cleanupOldReviewThrottleKeys()
  }

  const submitReview = async () => {
    if (!storefront.value || reviewSubmitting.value) {
      return
    }

    if (reviewForm.name.trim().length < 2 || reviewForm.comment.trim().length < 3) {
      notify('Completa nombre y comentario validos.')
      return
    }

    if (readRecentReviewAttempts().length >= 3) {
      notify('Ya enviaste varias reseñas recientemente. Intenta mas tarde.')
      return
    }

    reviewSubmitting.value = true

    const targetProductId = reviewTargetProductId.value || storefront.value.products[0]?.id || 'catalog'
    const targetProductName = storefront.value.products.find(item => item.id === targetProductId)?.name || storefront.value.settings.businessName

    const review: CatalogReview = {
      id: generatePublicEntityId('review'),
      productId: targetProductId,
      productName: targetProductName,
      name: reviewForm.name.trim(),
      comment: reviewForm.comment.trim(),
      rating: reviewForm.rating,
      approved: false,
      createdAt: new Date().toISOString(),
    }

    try {
      await backend.appendReview(storefront.value.id, review)
      recordReviewAttempt()
      reviewForm.name = ''
      reviewForm.comment = ''
      reviewForm.rating = 5
      notify('Reseña enviada. Entro a moderacion.')
    } catch (error) {
      console.error('ReviewSubmission Error:', error)
      notify('No se pudo enviar la reseña.')
    } finally {
      reviewSubmitting.value = false
    }
  }

  onUnmounted(() => {
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer)
    }
  })

  return {
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
    checkoutSubmitting,
    reviewSubmitting,
    isClosed,
    scheduleState,
    isStoreAcceptingOrders,
    availableDelivery,
    availablePickup,
    visibleCoupons,
    deliveryResolution,
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
  }
}
