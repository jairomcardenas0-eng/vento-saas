<template>
  <ClientOnly>
    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="translate-y-3 opacity-0"
      enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-3 opacity-0"
    >
      <div
        v-if="visible"
        class="fixed bottom-4 left-1/2 z-[400] flex w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 items-center gap-3 rounded-2xl border px-4 py-3 text-sm shadow-lg backdrop-blur sm:bottom-5"
        :class="online
          ? 'border-emerald-200 bg-white/95 text-emerald-700 dark:border-emerald-900/60 dark:bg-zinc-950/95 dark:text-emerald-300'
          : 'border-amber-200 bg-white/95 text-amber-800 dark:border-amber-900/60 dark:bg-zinc-950/95 dark:text-amber-300'"
        role="status"
        aria-live="polite"
      >
        <span
          class="h-2.5 w-2.5 flex-shrink-0 rounded-full"
          :class="online ? 'bg-emerald-500' : 'bg-amber-500'"
        />
        <span class="min-w-0 flex-1">
          <strong class="font-semibold">{{ title }}</strong>
          <span v-if="description" class="ml-1 text-current/75">{{ description }}</span>
        </span>
        <span v-if="syncing" class="h-4 w-4 flex-shrink-0 rounded-full border-2 border-current border-t-transparent motion-safe:animate-spin" />
      </div>
    </Transition>
  </ClientOnly>
</template>

<script setup lang="ts">
const online = ref(true)
const recentlySynced = ref(false)
const queue = useOfflineQueue()
let cleanupQueue: (() => void) | null = null
let syncedTimer: ReturnType<typeof setTimeout> | null = null

const syncing = computed(() => queue.syncing.value)
const pending = computed(() => queue.pendingCount.value)
const visible = computed(() => !online.value || syncing.value || pending.value > 0 || recentlySynced.value)
const title = computed(() => {
  if (!online.value) return 'Sin conexion - modo offline'
  if (syncing.value) return 'Sincronizando cambios'
  if (pending.value > 0) return `${pending.value} cambios pendientes`
  return 'Datos sincronizados'
})
const description = computed(() => {
  if (!online.value) return 'Puedes seguir usando Vento.'
  if (syncing.value) return 'Guardando cuando la red responda.'
  if (pending.value > 0) return 'Se enviaran al reconectar.'
  return ''
})

const updateOnline = () => {
  online.value = navigator.onLine !== false
}

watch(() => queue.lastSyncedAt.value, (value) => {
  if (!value || pending.value > 0) return
  recentlySynced.value = true
  if (syncedTimer) clearTimeout(syncedTimer)
  syncedTimer = setTimeout(() => {
    recentlySynced.value = false
  }, 2200)
})

onMounted(() => {
  updateOnline()
  cleanupQueue = queue.bindAutoSync()
  window.addEventListener('online', updateOnline)
  window.addEventListener('offline', updateOnline)
})

onBeforeUnmount(() => {
  cleanupQueue?.()
  window.removeEventListener('online', updateOnline)
  window.removeEventListener('offline', updateOnline)
  if (syncedTimer) clearTimeout(syncedTimer)
})
</script>
