<template>
  <section class="panel-card stat-card">
    <p class="eyebrow">{{ eyebrow }}</p>
    <h3 class="m-0 text-3xl font-semibold text-zinc-900 dark:text-zinc-100">{{ value }}</h3>
    <p class="m-0 text-sm text-zinc-500 dark:text-zinc-400">{{ description }}</p>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  eyebrow: string
  value: string | number
  description: string
}>()
</script>
