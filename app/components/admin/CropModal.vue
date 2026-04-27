<template>
  <div v-if="open" class="fixed inset-0 z-[200] flex items-center justify-center p-4">
    <div class="absolute inset-0 bg-black/70 backdrop-blur-md" @click="$emit('close')" />
    <div class="relative z-10 w-full max-w-lg rounded-[28px] border border-white/10 bg-white p-6 shadow-2xl dark:bg-zinc-900">
      <div class="mb-4 flex items-center justify-between">
        <div>
          <h3 class="text-lg font-bold text-zinc-900 dark:text-white">Recortar imagen</h3>
          <p class="text-xs text-zinc-500">Arrastra y haz zoom para ajustar el recorte</p>
        </div>
        <button class="ghost-btn small !min-h-[36px]" @click="$emit('close')">Cancelar</button>
      </div>

      <!-- Área de recorte -->
      <div
        ref="cropContainer"
        class="relative mx-auto mb-4 overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-800"
        :style="{ width: `${cropSize}px`, height: `${cropSize}px` }"
        @mousedown="startDrag"
        @touchstart.prevent="handleTouchStart"
      >
        <img
          ref="cropImage"
          :src="imageSrc"
          class="absolute max-w-none select-none"
          :style="imageStyle"
          draggable="false"
        />
        <!-- Marco de recorte -->
        <div class="pointer-events-none absolute inset-0 rounded-2xl border-[3px] border-white shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]" />
        <!-- Guías -->
        <div class="pointer-events-none absolute inset-0">
          <div class="absolute left-1/2 top-0 h-full w-[1px] bg-white/30" />
          <div class="absolute left-0 top-1/2 h-[1px] w-full bg-white/30" />
        </div>
      </div>

      <!-- Zoom slider -->
      <div class="mb-4 flex items-center gap-3">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input
          type="range"
          :min="minZoom"
          :max="maxZoom"
          :step="0.01"
          :value="zoom"
          class="flex-1"
          @input="setZoom(parseFloat(($event.target as HTMLInputElement).value))"
        />
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <span class="min-w-[48px] text-right text-xs font-mono text-zinc-500">{{ Math.round(zoom * 100) }}%</span>
      </div>

      <!-- Botones de acción -->
      <div class="flex gap-3">
        <button class="ghost-btn flex-1 !min-h-[44px]" @click="resetCrop">Restablecer</button>
        <button class="solid-btn flex-1 !min-h-[44px]" @click="confirmCrop">Recortar y guardar</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  open: boolean
  file: File | null
}>()

const emit = defineEmits<{
  close: []
  cropped: [blob: Blob]
}>()

const cropSize = 280
const cropContainer = ref<HTMLElement | null>(null)
const cropImage = ref<HTMLImageElement | null>(null)

const imageSrc = ref('')
const zoom = ref(1)
const minZoom = ref(0.5)
const maxZoom = ref(3)
const imgX = ref(0)
const imgY = ref(0)
const naturalW = ref(0)
const naturalH = ref(0)

let dragActive = false
let dragStartX = 0
let dragStartY = 0
let dragImgX = 0
let dragImgY = 0

const imageStyle = computed(() => ({
  width: `${naturalW.value * zoom.value}px`,
  height: `${naturalH.value * zoom.value}px`,
  left: `${imgX.value}px`,
  top: `${imgY.value}px`,
}))

watch(() => props.file, (file) => {
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => {
    imageSrc.value = e.target?.result as string
  }
  reader.readAsDataURL(file)
})

watch(imageSrc, () => {
  nextTick(() => {
    const img = cropImage.value
    if (!img) return
    img.onload = () => {
      naturalW.value = img.naturalWidth
      naturalH.value = img.naturalHeight
      const scale = Math.max(cropSize / naturalW.value, cropSize / naturalH.value) * 1.05
      zoom.value = scale
      minZoom.value = scale * 0.5
      maxZoom.value = Math.max(3, scale * 3)
      centerImage()
    }
  })
})

function centerImage() {
  const containerW = cropSize
  const containerH = cropSize
  const imgW = naturalW.value * zoom.value
  const imgH = naturalH.value * zoom.value
  imgX.value = (containerW - imgW) / 2
  imgY.value = (containerH - imgH) / 2
}

function setZoom(value: number) {
  const oldW = naturalW.value * zoom.value
  const oldH = naturalH.value * zoom.value
  zoom.value = value
  const newW = naturalW.value * zoom.value
  const newH = naturalH.value * zoom.value
  const ratioX = newW / oldW
  const ratioY = newH / oldH
  imgX.value = imgX.value * ratioX
  imgY.value = imgY.value * ratioY
  clampPosition()
}

function startDrag(e: MouseEvent) {
  dragActive = true
  dragStartX = e.clientX
  dragStartY = e.clientY
  dragImgX = imgX.value
  dragImgY = imgY.value
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
}

function handleTouchStart(e: TouchEvent) {
  const firstTouch = e.touches[0]
  if (e.touches.length === 1 && firstTouch) {
    dragActive = true
    dragStartX = firstTouch.clientX
    dragStartY = firstTouch.clientY
    dragImgX = imgX.value
    dragImgY = imgY.value
    document.addEventListener('touchmove', onTouchDrag, { passive: false })
    document.addEventListener('touchend', stopTouchDrag)
  }
}

function onDrag(e: MouseEvent) {
  if (!dragActive) return
  imgX.value = dragImgX + e.clientX - dragStartX
  imgY.value = dragImgY + e.clientY - dragStartY
  clampPosition()
}

function onTouchDrag(e: TouchEvent) {
  if (!dragActive) return
  const firstTouch = e.touches[0]
  if (!firstTouch) {
    return
  }
  e.preventDefault()
  imgX.value = dragImgX + firstTouch.clientX - dragStartX
  imgY.value = dragImgY + firstTouch.clientY - dragStartY
  clampPosition()
}

function stopDrag() {
  dragActive = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}

function stopTouchDrag() {
  dragActive = false
  document.removeEventListener('touchmove', onTouchDrag)
  document.removeEventListener('touchend', stopTouchDrag)
}

function clampPosition() {
  const imgW = naturalW.value * zoom.value
  const imgH = naturalH.value * zoom.value
  const minX = cropSize - imgW - 20
  const maxX = 20
  const minY = cropSize - imgH - 20
  const maxY = 20
  imgX.value = Math.min(maxX, Math.max(minX, imgX.value))
  imgY.value = Math.min(maxY, Math.max(minY, imgY.value))
}

function resetCrop() {
  const scale = Math.max(cropSize / naturalW.value, cropSize / naturalH.value) * 1.05
  zoom.value = scale
  centerImage()
}

function confirmCrop() {
  const img = cropImage.value
  if (!img) return

  const imgW = naturalW.value * zoom.value
  const imgH = naturalH.value * zoom.value
  const frameX = cropSize
  const frameY = cropSize

  const scaleX = naturalW.value / imgW
  const scaleY = naturalH.value / imgH
  const srcX = (0 - imgX.value) * scaleX
  const srcY = (0 - imgY.value) * scaleY
  const srcSize = frameX * scaleX

  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, srcX, srcY, srcSize, srcSize * (scaleX / scaleY), 0, 0, 512, 512)

  canvas.toBlob((blob) => {
    if (blob) {
      emit('cropped', blob)
    }
  }, 'image/png', 0.95)
}

onUnmounted(() => {
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.removeEventListener('touchmove', onTouchDrag)
  document.removeEventListener('touchend', stopTouchDrag)
})
</script>
