import type { Ref } from 'vue'
import type { CatalogCoupon, CatalogOperationalSettings, CatalogReview, CatalogThemeSettings } from '~/types/catalog'
import type { CartModifier } from '~/stores/cart'
import type { CategoryItem, ProductItem } from '~/stores/catalog'
import { useCartStore } from '~/stores/cart'
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
  const cartStore = useCartStore()
  const { encodeOrderToWhatsApp } = useCheckoutEngine()
  const backend = useSupabaseBackend()
  const analytics = useAnalytics()

  const search = ref('')
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

  watch(slugKey, (slug) => {
    if (!slug) {
      return
    }
    cartStore.hydrateCart(slug)
  }, { immediate: true })

  watch(storefront, (value) => {
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

  const isClosed = computed(() => Boolean(storefront.value?.settings.closed || (storefront.value?.settings as any)?.closedIsActive))
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

  watch(() => checkoutForm.method, (value) => {
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
    if (!theme) {
      return {}
    }

    return {
      '--catalog-bg': theme.bg,
      '--catalog-card': theme.cardBg,
      '--catalog-primary': theme.primary,
      '--catalog-text': theme.productTitleColor,
      '--catalog-muted': theme.descColor,
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
    }
  })

  const filteredCategories = computed(() => {
    const source = storefront.value?.categories || []
    if (!selectedCategoryId.value) {
      return source.filter(category => productsByCategory(category.id).length > 0)
    }

    return source.filter(category => category.id === selectedCategoryId.value && productsByCategory(category.id).length > 0)
  })

  const productsByCategory = (categoryId: string) => {
    const needle = search.value.trim().toLowerCase()
    return (storefront.value?.products || []).filter((product) => {
      const matchesCategory = product.categoryId === categoryId
      const matchesSearch = !needle || [product.name, product.description].join(' ').toLowerCase().includes(needle)
      return matchesCategory && matchesSearch
    })
  }

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

  const liveSubtotal = computed(() => {
    if (!selectedProduct.value) {
      return 0
    }

    const modifiersTotal = selectedModifiers.value.reduce((acc, modifier) => acc + modifier.priceDelta, 0)
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

    const missingRequired = selectedProduct.value.variants.find(group => group.options.length > 0 && group.type === 'single' && !singleSelections.value[group.id] && group.options.some(option => option.isRequired))
    if (missingRequired) {
      window.alert(`Selecciona una opcion para ${missingRequired.groupName}`)
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
    couponMessage.value = `Cupón aplicado. Ahorras ${money(validation.discount || 0, storefront.value.settings.currency)}.`
  }

  const removeCoupon = () => {
    appliedCoupon.value = null
    couponCode.value = ''
    couponMessage.value = ''
  }

  const submitCheckout = async () => {
    if (!storefront.value || !isStoreAcceptingOrders.value || !cartStore.items.length) {
      return
    }

    if (checkoutForm.name.trim().length < 2 && storefront.value.settings.checkoutNameReq === 'obligatorio') {
      alert('Ingresa tu nombre antes de continuar.')
      return
    }

    if (checkoutForm.method === 'Delivery' && !availableDelivery.value) {
      alert('El delivery no esta disponible en este momento.')
      return
    }

    if (checkoutForm.method === 'Pickup' && !availablePickup.value) {
      alert('La recogida no esta disponible en este momento.')
      return
    }

    if (checkoutForm.method === 'Delivery' && storefront.value.settings.deliveryFeeType === 'zones' && !checkoutForm.zoneId) {
      alert('Selecciona una zona de entrega antes de continuar.')
      return
    }

    if (checkoutForm.method === 'Delivery' && checkoutForm.address.trim().length <= 10) {
      alert('Ingresa una direccion valida para el delivery.')
      return
    }

    if (checkoutForm.method === 'Delivery' && subtotalBeforeDiscount.value < deliveryResolution.value.minimumOrder) {
      alert(`El pedido minimo para delivery es ${money(deliveryResolution.value.minimumOrder, storefront.value.settings.currency)}.`)
      return
    }

    if (appliedCoupon.value) {
      const validation = validateCoupon(appliedCoupon.value, subtotalBeforeDiscount.value)
      if (!validation.valid) {
        alert(validation.reason)
        return
      }
    }

    const order = {
      id: `order-${Date.now()}`,
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

    try {
      await backend.appendOrder(storefront.value.id, order)
    } catch (error) {
      console.warn('Order ledger persistence failed before WhatsApp redirect', error)
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

    window.open(checkoutUrl, '_blank')
    cartStore.clearCart(slugKey.value)
    cartStore.isOpen = false
    checkoutForm.zoneId = ''
    checkoutForm.address = ''
    checkoutForm.paymentMethod = ''
    removeCoupon()
  }

  const reviewThrottleKey = computed(() => `saas_review_guard_${slugKey.value}`)

  const readRecentReviewAttempts = () => {
    if (import.meta.server) {
      return []
    }

    const now = Date.now()
    const raw = localStorage.getItem(reviewThrottleKey.value)
    const timestamps = raw ? (JSON.parse(raw) as number[]) : []
    return timestamps.filter(timestamp => now - timestamp < 6 * 60 * 60 * 1000)
  }

  const recordReviewAttempt = () => {
    if (import.meta.server) {
      return
    }

    const recent = readRecentReviewAttempts()
    recent.push(Date.now())
    localStorage.setItem(reviewThrottleKey.value, JSON.stringify(recent))
  }

  const submitReview = async () => {
    if (!storefront.value) {
      return
    }

    if (reviewForm.name.trim().length < 2 || reviewForm.comment.trim().length < 3) {
      window.alert('Completa nombre y comentario validos.')
      return
    }

    if (readRecentReviewAttempts().length >= 3) {
      window.alert('Ya enviaste varias reseñas recientemente. Intenta más tarde.')
      return
    }

    const targetProductId = reviewTargetProductId.value || storefront.value.products[0]?.id || 'catalog'
    const targetProductName = storefront.value.products.find(item => item.id === targetProductId)?.name || storefront.value.settings.businessName

    const review: CatalogReview = {
      id: `review-${Date.now()}`,
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
      window.alert('Reseña enviada. Entró a moderación.')
    } catch (error) {
      console.error('ReviewSubmission Error:', error)
      window.alert('No se pudo enviar la reseña.')
    }
  }

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
