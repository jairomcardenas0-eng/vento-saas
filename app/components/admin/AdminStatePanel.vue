<template>
  <section class="panel-card span-2">
    <div
      class="flex flex-col items-center justify-center rounded-[24px] border border-dashed px-6 py-10 text-center"
      :class="toneClass"
    >
      <div
        class="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl"
        :class="iconWrapClass"
      >
        <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" :d="iconPath" />
        </svg>
      </div>
      <h3 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">{{ title }}</h3>
      <p class="mt-2 max-w-xl text-sm text-zinc-500 dark:text-zinc-400">{{ description }}</p>
      <div v-if="$slots.actions" class="mt-5">
        <slot name="actions" />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const props = withDefaults(defineProps<{
  title: string
  description: string
  tone?: 'default' | 'error' | 'loading'
}>(), {
  tone: 'default',
})

const toneClass = computed(() => {
  if (props.tone === 'error') {
    return 'border-rose-300 bg-rose-50/70 dark:border-rose-800 dark:bg-rose-950/20'
  }

  return 'border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950'
})

const iconWrapClass = computed(() => {
  if (props.tone === 'error') {
    return 'bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'
  }

  if (props.tone === 'loading') {
    return 'bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400'
  }

  return 'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'
})

const iconPath = computed(() => {
  if (props.tone === 'error') {
    return 'M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.72 3h16.92a2 2 0 0 0 1.72-3L13.71 3.86a2 2 0 0 0-3.42 0Z'
  }

  if (props.tone === 'loading') {
    return 'M21 12a9 9 0 1 1-9-9'
  }

  return 'M12 6v6l4 2M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z'
})
</script>
