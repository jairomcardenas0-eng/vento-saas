<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <ConnectionStatus />
</template>

<script setup lang="ts">
const authStore = useAuthStore()
authStore.initAuth()
</script>
