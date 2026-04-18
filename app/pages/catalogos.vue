<template>
  <section class="marketplace-shell">
    <header class="marketplace-header">
      <div>
        <p class="eyebrow">Marketplace</p>
        <h1>Catálogos publicados</h1>
      </div>
      <NuxtLink to="/" class="ghost-btn">Volver</NuxtLink>
    </header>

    <div class="market-grid">
      <article v-for="catalog in catalogs" :key="catalog.id" class="market-card">
        <p class="market-type">{{ catalog.settings.businessType }}</p>
        <h2>{{ catalog.settings.businessName }}</h2>
        <p>{{ catalog.settings.tagline }}</p>
        <div class="market-tags">
          <span>{{ catalog.products.length }} productos</span>
          <span>{{ catalog.orders.length }} pedidos</span>
        </div>
        <NuxtLink :to="`/b/${catalog.slug}`" class="solid-btn">Explorar</NuxtLink>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
const catalogStore = useCatalogStore()
const catalogs = computed(() => catalogStore.ownerCatalogs)

onMounted(async () => {
  await catalogStore.loadMarketplace()
})
</script>
