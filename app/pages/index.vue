<template>
  <section class="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
    <header class="flex flex-col gap-4 rounded-[32px] border border-zinc-200 bg-white/90 px-6 py-5 shadow-[0_20px_60px_rgba(24,24,27,0.08)] backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/90 md:flex-row md:items-center md:justify-between">
      <div>
        <p class="eyebrow">Marketplace SaaS</p>
        <h1 class="m-0 text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-5xl">Cientos de Menus, a un Clic</h1>
      </div>
      <div class="flex flex-wrap gap-3">
        <NuxtLink to="/catalogos" class="ghost-btn">Explorar todo</NuxtLink>
        <NuxtLink to="/login" class="solid-btn">Entrar al admin</NuxtLink>
      </div>
    </header>

    <section class="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
      <div class="relative overflow-hidden rounded-[36px] border border-zinc-200 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.9),_rgba(228,228,231,0.72))] p-6 shadow-[0_24px_80px_rgba(24,24,27,0.08)] dark:border-zinc-800 dark:bg-[radial-gradient(circle_at_top_left,_rgba(63,63,70,0.55),_rgba(9,9,11,0.98))] sm:p-8">
        <div class="absolute inset-y-0 right-0 hidden w-1/2 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.65),_transparent_70%)] dark:bg-[radial-gradient(circle_at_center,_rgba(161,161,170,0.22),_transparent_70%)] lg:block" />
        <div class="relative max-w-2xl">
          <p class="eyebrow">Directorio en vivo</p>
          <h2 class="m-0 text-3xl font-semibold leading-tight text-zinc-900 dark:text-zinc-100 sm:text-5xl">Descubre restaurantes activos, filtra por antojo y entra directo a pedir.</h2>
          <p class="mt-4 max-w-xl text-base leading-7 text-zinc-600 dark:text-zinc-300">
            La raiz publica ahora funciona como hub comercial: restaurantes publicados, carrusel editorial y salto inmediato al storefront por slug.
          </p>
          <div class="mt-6 flex flex-wrap gap-3">
            <NuxtLink to="/register" class="solid-btn">Publicar mi negocio</NuxtLink>
            <NuxtLink to="/catalogos" class="ghost-btn">Ver marketplace</NuxtLink>
          </div>
          <div class="mt-8 grid gap-3 sm:grid-cols-3">
            <div class="rounded-3xl border border-zinc-200 bg-white/80 px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900/80">
              <p class="text-sm uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">Activos</p>
              <strong class="mt-2 block text-3xl text-zinc-900 dark:text-zinc-100">{{ catalogs.length }}</strong>
            </div>
            <div class="rounded-3xl border border-zinc-200 bg-white/80 px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900/80">
              <p class="text-sm uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">Productos</p>
              <strong class="mt-2 block text-3xl text-zinc-900 dark:text-zinc-100">{{ totalProducts }}</strong>
            </div>
            <div class="rounded-3xl border border-zinc-200 bg-white/80 px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900/80">
              <p class="text-sm uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">Resenas</p>
              <strong class="mt-2 block text-3xl text-zinc-900 dark:text-zinc-100">{{ totalReviews }}</strong>
            </div>
          </div>
        </div>
      </div>

      <aside class="rounded-[36px] border border-zinc-200 bg-white/90 p-6 shadow-[0_24px_80px_rgba(24,24,27,0.08)] dark:border-zinc-800 dark:bg-zinc-900/90">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="eyebrow">Ahora sonando</p>
            <h3 class="m-0 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">Carrusel editorial</h3>
          </div>
          <span class="rounded-full border border-zinc-200 px-3 py-1 text-xs uppercase tracking-[0.18em] text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">Live</span>
        </div>

        <div class="mt-5 overflow-hidden">
          <div class="carousel-track">
            <NuxtLink
              v-for="catalog in carouselItems"
              :key="`${catalog.id}-${catalog.slug}`"
              :to="`/b/${catalog.slug}`"
              class="group flex min-w-[260px] flex-col justify-between rounded-[28px] border border-zinc-200 bg-zinc-50 p-4 transition hover:-translate-y-1 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
            >
              <div>
                <p class="text-xs uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">{{ catalog.settings.businessType || 'Restaurante' }}</p>
                <h4 class="mt-2 text-xl font-semibold text-zinc-900 dark:text-zinc-100">{{ catalog.settings.businessName }}</h4>
                <p class="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">{{ catalog.settings.tagline || 'Catalogo disponible para pedidos directos por WhatsApp.' }}</p>
              </div>
              <div class="mt-5 flex items-center justify-between text-sm text-zinc-500 dark:text-zinc-400">
                <span>{{ catalog.products.length }} productos</span>
                <span>/b/{{ catalog.slug }}</span>
              </div>
            </NuxtLink>
          </div>
        </div>
      </aside>
    </section>

    <section class="rounded-[32px] border border-zinc-200 bg-white/90 p-6 shadow-[0_20px_60px_rgba(24,24,27,0.08)] dark:border-zinc-800 dark:bg-zinc-900/90">
      <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p class="eyebrow">Restaurantes activos</p>
          <h2 class="m-0 text-3xl font-semibold text-zinc-900 dark:text-zinc-100">Tablero publico del marketplace</h2>
          <p class="mt-2 text-zinc-600 dark:text-zinc-300">Selecciona cualquier tienda y entra directo a su menu publico.</p>
        </div>
        <NuxtLink to="/catalogos" class="ghost-btn">Ver directorio completo</NuxtLink>
      </div>

      <div v-if="loading" class="mt-6 rounded-[28px] border border-dashed border-zinc-300 bg-zinc-50 px-6 py-10 text-center text-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400">
        Cargando catalogos publicados...
      </div>

      <div v-else-if="!catalogs.length" class="mt-6 rounded-[28px] border border-dashed border-zinc-300 bg-zinc-50 px-6 py-10 text-center text-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400">
        Aun no hay restaurantes publicados en el marketplace.
      </div>

      <div v-else class="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <NuxtLink
          v-for="catalog in catalogs"
          :key="catalog.id"
          :to="`/b/${catalog.slug}`"
          class="group overflow-hidden rounded-[30px] border border-zinc-200 bg-zinc-50 transition hover:-translate-y-1 hover:border-zinc-300 hover:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
        >
          <div class="flex h-44 items-end bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.96),_rgba(228,228,231,0.8))] p-5 dark:bg-[radial-gradient(circle_at_top_left,_rgba(63,63,70,0.6),_rgba(9,9,11,1))]">
            <div>
              <p class="text-xs uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">{{ catalog.settings.businessType || 'Restaurante' }}</p>
              <h3 class="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{{ catalog.settings.businessName }}</h3>
            </div>
          </div>
          <div class="space-y-4 p-5">
            <p class="text-sm leading-6 text-zinc-600 dark:text-zinc-300">{{ catalog.settings.tagline || 'Menu digital activo y listo para recibir pedidos.' }}</p>
            <div class="flex flex-wrap gap-2 text-sm text-zinc-500 dark:text-zinc-400">
              <span class="rounded-full border border-zinc-200 px-3 py-1 dark:border-zinc-800">{{ catalog.products.length }} productos</span>
              <span class="rounded-full border border-zinc-200 px-3 py-1 dark:border-zinc-800">{{ catalog.categories.length }} categorias</span>
              <span class="rounded-full border border-zinc-200 px-3 py-1 dark:border-zinc-800">{{ Number(catalog.ratingAverage || 0).toFixed(1) }} rating</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-sm font-medium text-zinc-900 dark:text-zinc-100">Abrir menu</span>
              <span class="text-sm text-zinc-500 transition group-hover:text-zinc-900 dark:text-zinc-400 dark:group-hover:text-zinc-100">/{{ catalog.slug }}</span>
            </div>
          </div>
        </NuxtLink>
      </div>
    </section>
  </section>
</template>

<script setup lang="ts">
import type { CatalogRecord } from '~/types/catalog'

const backend = useSupabaseBackend()
const catalogs = ref<CatalogRecord[]>([])
const loading = ref(true)

const totalProducts = computed(() => catalogs.value.reduce((acc, catalog) => acc + catalog.products.length, 0))
const totalReviews = computed(() => catalogs.value.reduce((acc, catalog) => acc + (catalog.ratingApprovedCount || 0), 0))
const carouselItems = computed(() => {
  if (!catalogs.value.length) {
    return []
  }

  return catalogs.value.length > 1
    ? [...catalogs.value, ...catalogs.value]
    : catalogs.value
})

useSeoMeta({
  title: 'Marketplace | Cientos de Menus, a un Clic',
  description: 'Directorio publico de restaurantes con menus digitales activos y acceso inmediato a cada storefront.',
})

onMounted(async () => {
  try {
    catalogs.value = await backend.getMarketplaceCatalogs()
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.carousel-track {
  display: flex;
  gap: 1rem;
  width: max-content;
  animation: marquee 32s linear infinite;
}

.carousel-track:hover {
  animation-play-state: paused;
}

@keyframes marquee {
  from {
    transform: translateX(0);
  }

  to {
    transform: translateX(calc(-50% - 0.5rem));
  }
}
</style>
