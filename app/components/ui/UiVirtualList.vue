<template>
  <div
    ref="containerRef"
    class="virtual-list"
    :style="containerStyle"
    @scroll.passive="handleScroll"
  >
    <div class="virtual-list-track" :style="{ height: `${totalHeight}px` }">
      <div
        class="virtual-list-window"
        :style="{ transform: `translateY(${offsetTop}px)` }"
      >
        <div
          v-for="(item, index) in visibleItems"
          :key="itemKey(item, startIndex + index)"
          class="virtual-list-item"
          :style="{ minHeight: `${itemHeight}px` }"
        >
          <slot :item="item" :index="startIndex + index" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts" generic="T">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const props = withDefaults(defineProps<{
  items: T[]
  itemHeight: number
  maxHeight?: number
  overscan?: number
  keyField?: string
}>(), {
  maxHeight: 720,
  overscan: 6,
  keyField: 'id',
})

const containerRef = ref<HTMLElement | null>(null)
const scrollTop = ref(0)
const viewportHeight = ref(props.maxHeight)
let resizeObserver: ResizeObserver | null = null

const totalHeight = computed(() => props.items.length * props.itemHeight)
const visibleCount = computed(() => Math.max(1, Math.ceil(viewportHeight.value / props.itemHeight)))
const startIndex = computed(() => Math.max(0, Math.floor(scrollTop.value / props.itemHeight) - props.overscan))
const endIndex = computed(() => Math.min(
  props.items.length,
  startIndex.value + visibleCount.value + (props.overscan * 2),
))
const visibleItems = computed(() => props.items.slice(startIndex.value, endIndex.value))
const offsetTop = computed(() => startIndex.value * props.itemHeight)
const containerStyle = computed(() => ({
  maxHeight: `${props.maxHeight}px`,
}))

const updateViewport = () => {
  viewportHeight.value = containerRef.value?.clientHeight || props.maxHeight
}

const handleScroll = (event: Event) => {
  scrollTop.value = (event.target as HTMLElement).scrollTop
}

const itemKey = (item: T, index: number) => {
  if (item && typeof item === 'object' && props.keyField in item) {
    return String((item as Record<string, unknown>)[props.keyField] ?? index)
  }

  return index
}

onMounted(() => {
  updateViewport()

  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => updateViewport())
    if (containerRef.value) {
      resizeObserver.observe(containerRef.value)
    }
  } else {
    window.addEventListener('resize', updateViewport, { passive: true })
  }
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
  window.removeEventListener('resize', updateViewport)
})
</script>

<style scoped>
.virtual-list {
  overflow-y: auto;
  overscroll-behavior: contain;
}

.virtual-list-track {
  position: relative;
  width: 100%;
}

.virtual-list-window {
  position: absolute;
  inset-inline: 0;
  top: 0;
  will-change: transform;
}

.virtual-list-item {
  width: 100%;
}
</style>
