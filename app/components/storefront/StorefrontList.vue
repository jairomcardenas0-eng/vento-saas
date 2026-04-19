<template>
  <StorefrontMenuBase :storefront="storefront" :slug-key="slugKey" layout="list" />
</template>

<script setup lang="ts">
import type { StorefrontPayload } from '~/composables/useStorefrontExperience'

defineProps<{
  storefront: StorefrontPayload
  slugKey: string
}>()
</script>
