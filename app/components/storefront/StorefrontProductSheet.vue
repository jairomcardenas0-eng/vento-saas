<template>
  <Transition
    enter-active-class="transition-transform duration-300 ease-out"
    enter-from-class="translate-y-full"
    enter-to-class="translate-y-0"
    leave-active-class="transition-transform duration-300 ease-in"
    leave-from-class="translate-y-0"
    leave-to-class="translate-y-full"
  >
    <div v-if="product" class="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" @click.self="$emit('close')">
      <div class="absolute inset-x-0 bottom-0 max-h-[90vh] overflow-y-auto rounded-t-[32px] border border-white/10 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]" :style="{ background: 'var(--catalog-detail-bg, var(--catalog-card))' }">
        <div class="mx-auto mb-4 h-1.5 w-14 rounded-full bg-white/20" />

        <!-- Galería de imágenes -->
        <div class="relative overflow-hidden rounded-[24px] bg-black/10">
          <div v-if="galleryImages.length" class="relative">
            <img
              :src="optimizedGalleryImage(galleryImages[galleryActiveIndex], 'detail')"
              :srcset="gallerySrcset(galleryImages[galleryActiveIndex], 'detail')"
              :sizes="imageSizes('detail')"
              :alt="product.name"
              loading="lazy"
              class="aspect-video w-full object-cover cursor-pointer"
              @click="openLightbox"
            />
            <!-- Badge de oferta en galería -->
            <span
              v-if="product.hasPromo && product.offerLabel"
              class="absolute left-3 top-3 inline-flex items-center rounded-full bg-[color:var(--catalog-primary)] px-3 py-1 text-xs font-bold text-white shadow-lg"
            >
              {{ product.offerLabel }}
            </span>
            <!-- Contador de imágenes -->
            <div
              v-if="galleryImages.length > 1"
              class="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md"
            >
              <span>{{ galleryActiveIndex + 1 }} / {{ galleryImages.length }}</span>
              <button
                class="ml-0.5 grid h-6 w-6 place-items-center rounded-full bg-white/20 hover:bg-white/30 transition"
                @click.stop="openLightbox"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
              </button>
            </div>
            <!-- Flechas de navegación en galería -->
            <button
              v-if="galleryImages.length > 1"
              class="absolute left-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white backdrop-blur-md hover:bg-black/60 transition"
              @click.stop="galleryPrev"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <button
              v-if="galleryImages.length > 1"
              class="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-black/40 text-white backdrop-blur-md hover:bg-black/60 transition"
              @click.stop="galleryNext"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
          <div v-else class="flex aspect-video items-center justify-center text-sm text-white/60">Sin imagen</div>
        </div>

        <!-- Miniaturas debajo de la galería -->
        <div v-if="galleryImages.length > 1" class="mt-3 flex gap-2 overflow-x-auto pb-1">
          <button
            v-for="(image, index) in galleryImages"
            :key="index"
            class="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border-2 transition"
            :class="index === galleryActiveIndex ? 'border-[color:var(--catalog-primary)]' : 'border-white/10 opacity-70 hover:opacity-100'"
            @click="galleryActiveIndex = index"
          >
            <img
              :src="optimizedGalleryImage(image, 'thumb')"
              :srcset="gallerySrcset(image, 'thumb')"
              :sizes="imageSizes('thumb')"
              :alt="`${product.name} ${index + 1}`"
              class="h-full w-full object-cover"
              loading="lazy"
            />
          </button>
        </div>

        <div class="mt-5 space-y-5">
          <div class="flex items-start justify-between gap-4">
            <div>
              <div class="mb-2 inline-flex items-center gap-2 rounded-full bg-black/20 px-3 py-1 text-xs text-yellow-300" v-if="product.productRatingCount">
                <span>★ {{ product.productRating.toFixed(1) }}</span>
                <span class="text-white/70">({{ product.productRatingCount }})</span>
              </div>
              <h3 class="text-2xl font-semibold text-[color:var(--catalog-text)]">{{ product.name }}</h3>
              <p class="mt-2 text-sm leading-6 text-[color:var(--catalog-muted)]">{{ product.description }}</p>
              <!-- Tags del producto -->
              <div v-if="product.tags.length" class="mt-3 flex flex-wrap gap-1.5">
                <span
                  v-for="tag in product.tags"
                  :key="tag"
                  class="inline-flex rounded-full bg-[color:var(--catalog-tag-bg)] px-2.5 py-0.5 text-[10px] font-bold text-[color:var(--catalog-tag-text)]"
                >{{ tag }}</span>
              </div>
              <!-- Timer de oferta -->
              <div
                v-if="product.timerHours && timerDisplay"
                class="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[color:var(--catalog-offer-bg)] px-3 py-1.5 text-xs font-bold text-[color:var(--catalog-offer-text)]"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                <span>{{ timerDisplay }}</span>
              </div>
            </div>
            <button class="ghost-btn small !min-h-[44px]" @click="$emit('close')">Cerrar</button>
          </div>

          <!-- Share button -->
          <div class="flex gap-2">
            <button class="share-btn" type="button" @click="shareProduct">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
              <span>Compartir</span>
            </button>
          </div>

          <section v-for="group in product.variants" :key="group.id" class="rounded-[24px] border border-white/10 bg-black/10 p-4">
            <div class="mb-3 flex items-center justify-between gap-3">
              <strong class="text-[color:var(--catalog-text)]">{{ group.groupName }}</strong>
              <small class="text-[color:var(--catalog-muted)]">{{ group.type === 'single' ? 'Seleccion unica' : 'Seleccion multiple' }}</small>
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="option in group.options"
                :key="option.id"
                type="button"
                class="min-h-[44px] min-w-[140px] flex-1 rounded-[14px] border px-4 py-3 text-left text-sm transition"
                :class="isSelected(group, option.id) ? 'border-[color:var(--catalog-primary)] bg-[color:var(--catalog-primary)] text-white' : 'border-white/10 bg-white/5 text-[color:var(--catalog-text)]'"
                @click="group.type === 'single' ? $emit('select-single', group.id, option.id) : $emit('toggle-multi', group.id, option.id)"
              >
                <span class="block font-medium">{{ option.name }}</span>
                <small class="mt-1 block opacity-75">{{ option.priceDelta > 0 ? `+${money(option.priceDelta, currency)}` : 'Incluido' }}</small>
              </button>
            </div>
          </section>

          <label class="block">
            <span class="mb-2 block text-sm text-[color:var(--catalog-muted)]">Instrucciones</span>
            <textarea :value="instructions" maxlength="180" class="min-h-[110px] w-full rounded-[18px] border border-white/10 bg-white/5 px-4 py-3 text-[color:var(--catalog-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--catalog-primary)]" placeholder="Ej: sin cebolla, salsa aparte" @input="$emit('update:instructions', ($event.target as HTMLTextAreaElement).value)" />
          </label>

          <div class="flex items-center justify-between gap-4 rounded-[22px] border border-white/10 bg-black/10 p-4">
            <div class="flex items-center gap-2">
              <button class="ghost-btn small !min-h-[44px] !w-[44px] !rounded-full !p-0" @click="$emit('update:quantity', Math.max(1, quantity - 1))">-</button>
              <span class="min-w-8 text-center text-lg font-semibold text-[color:var(--catalog-text)]">{{ quantity }}</span>
              <button class="ghost-btn small !min-h-[44px] !w-[44px] !rounded-full !p-0" @click="$emit('update:quantity', quantity + 1)">+</button>
            </div>
            <div class="text-right">
              <small class="block text-[color:var(--catalog-muted)]">Subtotal del producto</small>
              <strong class="text-2xl text-[color:var(--catalog-price)]">{{ money(subtotal, currency) }}</strong>
            </div>
          </div>

          <button class="solid-btn w-full !min-h-[52px]" @click="$emit('commit')">Agregar al carrito</button>
        </div>
      </div>
    </div>
  </Transition>

  <!-- Lightbox para galería -->
  <StorefrontLightbox
    :is-open="lightboxOpen"
    :images="galleryImages"
    :initial-index="galleryActiveIndex"
    @close="lightboxOpen = false"
  />
</template>

<script setup lang="ts">
import type { ProductItem, VariantGroup } from '~/stores/catalog'
import { useImageOptimizer } from '~/composables/useImageOptimizer'
import { money } from '~/utils/catalog'

const props = defineProps<{
  product: ProductItem | null
  currency: string
  singleSelections: Record<string, string>
  multiSelections: Record<string, string[]>
  quantity: number
  instructions: string
  subtotal: number
}>()
const imageOptimizer = useImageOptimizer()

defineEmits<{
  close: []
  commit: []
  'select-single': [groupId: string, optionId: string]
  'toggle-multi': [groupId: string, optionId: string]
  'update:quantity': [value: number]
  'update:instructions': [value: string]
}>()

const lightboxOpen = ref(false)
const galleryActiveIndex = ref(0)
const imageSizes = (context: 'thumb' | 'grid' | 'detail' | 'hero' = 'grid') => imageOptimizer.sizes(context)
const optimizedGalleryImage = (url: string | null | undefined, context: 'thumb' | 'detail') =>
  imageOptimizer.optimizedUrl(url, { width: context === 'detail' ? 600 : 200, quality: 72 })
const gallerySrcset = (url: string | null | undefined, context: 'thumb' | 'detail') =>
  imageOptimizer.srcset(url, context === 'detail' ? [320, 480, 600, 800] : [120, 200, 320])

const galleryImages = computed(() => {
  if (!props.product) return []
  const images: string[] = []
  if (props.product.imageUrl) images.push(props.product.imageUrl)
  if (props.product.imageUrls?.length) {
    props.product.imageUrls.forEach((url) => {
      if (url && !images.includes(url)) images.push(url)
    })
  }
  return images
})

watch(() => props.product, () => {
  galleryActiveIndex.value = 0
  lightboxOpen.value = false
})

const openLightbox = () => {
  lightboxOpen.value = true
}

const galleryPrev = () => {
  if (galleryImages.value.length > 1) {
    galleryActiveIndex.value = (galleryActiveIndex.value - 1 + galleryImages.value.length) % galleryImages.value.length
  }
}

const galleryNext = () => {
  if (galleryImages.value.length > 1) {
    galleryActiveIndex.value = (galleryActiveIndex.value + 1) % galleryImages.value.length
  }
}

const isSelected = (group: VariantGroup, optionId: string) => group.type === 'single'
  ? props.singleSelections[group.id] === optionId
  : props.multiSelections[group.id]?.includes(optionId) || false

// Timer countdown
const timerDisplay = ref('')
let timerInterval: ReturnType<typeof setInterval> | null = null

const updateTimer = () => {
  if (!import.meta.client || !props.product?.timerHours) {
    timerDisplay.value = ''
    return
  }

  const totalSeconds = props.product.timerHours * 3600
  const startTime = localStorage.getItem(`vento_timer_${props.product.id}`)
  let remaining: number

  if (startTime) {
    const elapsed = (Date.now() - Number(startTime)) / 1000
    remaining = Math.max(0, totalSeconds - elapsed)
  } else {
    localStorage.setItem(`vento_timer_${props.product.id}`, String(Date.now()))
    remaining = totalSeconds
  }

  if (remaining <= 0) {
    timerDisplay.value = 'Oferta finalizada'
    if (timerInterval) clearInterval(timerInterval)
    return
  }

  const hours = Math.floor(remaining / 3600)
  const minutes = Math.floor((remaining % 3600) / 60)
  const seconds = Math.floor(remaining % 60)

  const parts: string[] = []
  if (hours > 0) parts.push(`${hours}h`)
  if (props.product.timerShowMinutes) parts.push(`${minutes}m`)
  if (props.product.timerShowSeconds) parts.push(`${seconds}s`)

  timerDisplay.value = parts.join(' ')
}

watch(() => props.product?.id, () => {
  if (timerInterval) clearInterval(timerInterval)
  updateTimer()
  if (props.product?.timerHours) {
    timerInterval = setInterval(updateTimer, 1000)
  }
}, { immediate: true })

const shareProduct = async () => {
  if (!import.meta.client || !props.product) return
  const url = window.location.href
  const text = `${props.product.name} - ${money(props.product.hasPromo && props.product.promoPrice ? props.product.promoPrice : props.product.basePrice, props.currency)}`

  if (navigator.share) {
    try {
      await navigator.share({ title: props.product.name, text, url })
    } catch {}
  } else {
    const wa = `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`
    window.open(wa, '_blank')
  }
}

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval)
})
</script>
