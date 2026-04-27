<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-250 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen && images.length > 0"
        class="lightbox-overlay"
        @click.self="close"
        @keydown.escape="close"
        @keydown.left="navigate(-1)"
        @keydown.right="navigate(1)"
      >
        <button class="lightbox-close" @click="close" aria-label="Cerrar galería">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>

        <div class="lightbox-counter">
          {{ activeIndex + 1 }} / {{ images.length }}
        </div>

        <button
          v-if="images.length > 1"
          class="lightbox-nav lightbox-nav--prev"
          @click.stop="navigate(-1)"
          aria-label="Imagen anterior"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
        </button>

        <button
          v-if="images.length > 1"
          class="lightbox-nav lightbox-nav--next"
          @click.stop="navigate(1)"
          aria-label="Imagen siguiente"
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
        </button>

        <div
          class="lightbox-stage"
          @touchstart="onTouchStart"
          @touchmove="onTouchMove"
          @touchend="onTouchEnd"
        >
          <Transition
            :name="transitionName"
            mode="out-in"
          >
            <div
              :key="activeIndex"
              class="lightbox-image-wrap"
              :style="zoomStyle"
              @dblclick="toggleZoom"
            >
              <img
                :src="images[activeIndex]"
                :alt="`Imagen ${activeIndex + 1}`"
                class="lightbox-image"
                draggable="false"
                @load="onImageLoad"
              />
            </div>
          </Transition>
        </div>

        <div v-if="images.length > 1" class="lightbox-thumbnails">
          <button
            v-for="(image, index) in images"
            :key="index"
            class="lightbox-thumb"
            :class="{ active: index === activeIndex }"
            @click="activeIndex = index"
          >
            <img :src="image" :alt="`Miniatura ${index + 1}`" loading="lazy" />
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
const props = defineProps<{
  isOpen: boolean
  images: string[]
  initialIndex?: number
}>()

const emit = defineEmits<{
  close: []
}>()

const activeIndex = ref(0)
const isZoomed = ref(false)
const zoomStyle = ref<Record<string, string>>({})
const transitionName = ref('lightbox-slide-right')
const lastDirection = ref(1)

let touchStartX = 0
let touchCurrentX = 0

watch(() => props.isOpen, (value) => {
  if (value) {
    activeIndex.value = Math.min(props.initialIndex || 0, Math.max(0, props.images.length - 1))
    isZoomed.value = false
    zoomStyle.value = {}
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
})

onUnmounted(() => {
  document.body.style.overflow = ''
})

const close = () => {
  isZoomed.value = false
  zoomStyle.value = {}
  emit('close')
}

const navigate = (direction: number) => {
  lastDirection.value = direction
  transitionName.value = direction > 0 ? 'lightbox-slide-right' : 'lightbox-slide-left'
  isZoomed.value = false
  zoomStyle.value = {}
  activeIndex.value = (activeIndex.value + direction + props.images.length) % props.images.length
}

const toggleZoom = () => {
  isZoomed.value = !isZoomed.value
  zoomStyle.value = isZoomed.value
    ? { cursor: 'zoom-out', transform: 'scale(2)', transition: 'transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }
    : { cursor: 'zoom-in', transform: 'scale(1)', transition: 'transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)' }
}

const onImageLoad = () => {
  // imagen cargada
}

const onTouchStart = (event: TouchEvent) => {
  const firstTouch = event.touches[0]
  if (!firstTouch) {
    return
  }
  touchStartX = firstTouch.clientX
  touchCurrentX = touchStartX
}

const onTouchMove = (event: TouchEvent) => {
  const firstTouch = event.touches[0]
  if (!firstTouch) {
    return
  }
  touchCurrentX = firstTouch.clientX
}

const onTouchEnd = () => {
  const delta = touchStartX - touchCurrentX
  if (Math.abs(delta) > 60 && props.images.length > 1) {
    navigate(delta > 0 ? 1 : -1)
  }
}
</script>

<style scoped>
.lightbox-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: rgba(0, 0, 0, 0.96);
  backdrop-filter: blur(24px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  user-select: none;
  -webkit-user-select: none;
}

.lightbox-close {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 210;
  width: 48px;
  height: 48px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.08);
  color: white;
  display: grid;
  place-items: center;
  cursor: pointer;
  backdrop-filter: blur(12px);
  transition: all 0.2s ease;
}

.lightbox-close:hover {
  background: rgba(255, 255, 255, 0.18);
  transform: scale(1.08);
}

.lightbox-counter {
  position: fixed;
  top: 1.25rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 205;
  padding: 0.5rem 1rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(12px);
  color: white;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.06em;
}

.lightbox-nav {
  position: fixed;
  top: 50%;
  transform: translateY(-50%);
  z-index: 210;
  width: 52px;
  height: 52px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.06);
  color: white;
  display: grid;
  place-items: center;
  cursor: pointer;
  backdrop-filter: blur(12px);
  transition: all 0.2s ease;
}

.lightbox-nav:hover {
  background: rgba(255, 255, 255, 0.16);
  transform: translateY(-50%) scale(1.1);
}

.lightbox-nav--prev {
  left: 1rem;
}

.lightbox-nav--next {
  right: 1rem;
}

.lightbox-stage {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 5rem 4.5rem;
  overflow: hidden;
}

.lightbox-image-wrap {
  max-width: 100%;
  max-height: 100%;
  display: grid;
  place-items: center;
  cursor: zoom-in;
  transition: transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.lightbox-image {
  max-width: 100%;
  max-height: 75vh;
  object-fit: contain;
  border-radius: 16px;
  box-shadow: 0 32px 80px rgba(0, 0, 0, 0.5);
}

.lightbox-thumbnails {
  position: fixed;
  bottom: 1.5rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 205;
  display: flex;
  gap: 0.6rem;
  padding: 0.65rem 0.9rem;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(16px);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  overflow-x: auto;
  max-width: calc(100vw - 2rem);
}

.lightbox-thumb {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  overflow: hidden;
  border: 2px solid transparent;
  cursor: pointer;
  flex-shrink: 0;
  padding: 0;
  background: transparent;
  transition: all 0.2s ease;
}

.lightbox-thumb.active {
  border-color: white;
  box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.3);
}

.lightbox-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* Transiciones para el slide de imágenes */
.lightbox-slide-left-enter-active,
.lightbox-slide-left-leave-active,
.lightbox-slide-right-enter-active,
.lightbox-slide-right-leave-active {
  transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.lightbox-slide-left-enter-from {
  opacity: 0;
  transform: translateX(-60px);
}

.lightbox-slide-left-leave-to {
  opacity: 0;
  transform: translateX(60px);
}

.lightbox-slide-right-enter-from {
  opacity: 0;
  transform: translateX(60px);
}

.lightbox-slide-right-leave-to {
  opacity: 0;
  transform: translateX(-60px);
}

@media (max-width: 768px) {
  .lightbox-stage {
    padding: 4rem 1rem;
  }

  .lightbox-nav {
    width: 40px;
    height: 40px;
  }

  .lightbox-nav--prev {
    left: 0.5rem;
  }

  .lightbox-nav--next {
    right: 0.5rem;
  }

  .lightbox-thumbnails {
    bottom: 1rem;
    gap: 0.4rem;
    padding: 0.5rem 0.7rem;
  }

  .lightbox-thumb {
    width: 40px;
    height: 40px;
    border-radius: 10px;
  }
}
</style>
