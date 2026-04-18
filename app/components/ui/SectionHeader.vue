<template>
  <div class="section-head justify-between">
    <div>
      <p class="eyebrow">{{ eyebrow }}</p>
      <h3 class="m-0 text-xl font-semibold text-zinc-900 dark:text-zinc-100">{{ title }}</h3>
      <p v-if="description" class="section-copy">{{ description }}</p>
    </div>
    <div v-if="$slots.actions" class="section-actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  eyebrow: string
  title: string
  description?: string
}>()
</script>
