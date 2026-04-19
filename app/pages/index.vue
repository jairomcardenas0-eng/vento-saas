<template>
  <div class="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(253,224,71,0.2),_transparent_34%),linear-gradient(180deg,_#fffaf2_0%,_#fff_42%,_#fff7ed_100%)] text-stone-950 dark:bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.16),_transparent_28%),linear-gradient(180deg,_#020617_0%,_#0f172a_55%,_#111827_100%)] dark:text-white">
    <div class="mx-auto flex min-h-screen w-full max-w-[430px] flex-col px-4 pb-10 pt-4">
      <header class="sticky top-0 z-40 -mx-1 mb-4 px-1 pt-safe" style="will-change: transform;">
        <div class="rounded-[28px] border border-white/65 bg-white/95 p-3 shadow-[0_20px_60px_-28px_rgba(15,23,42,0.42)] dark:border-white/10 dark:bg-stone-950/95">
          <div class="mb-4 flex items-center justify-between gap-3">
            <div class="min-w-0">
              <p class="truncate text-[10px] font-semibold uppercase tracking-[0.34em] text-amber-600 dark:text-cyan-300">Marketplace Engine</p>
              <h1 class="truncate font-serif text-[1.75rem] leading-none">Descubre algo brutal</h1>
            </div>
            <button
              class="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-stone-200 bg-white text-lg active:scale-95 dark:border-white/10 dark:bg-white/10"
              type="button"
              @click="toggleColorMode"
            >
              {{ colorMode.preference === 'dark' ? '☀' : '☾' }}
            </button>
          </div>

          <div class="flex items-center gap-2">
            <button
              type="button"
              aria-label="Abrir destinos"
              class="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full border border-stone-200/80 bg-stone-950 text-xl text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition active:scale-95 dark:border-white/10 dark:bg-white dark:text-stone-950"
              @click="isGeoMenuOpen = true"
            >
              ≡
            </button>
            <button
              type="button"
              class="flex h-[46px] flex-1 items-center gap-3 rounded-full border border-stone-200/80 bg-stone-950 px-4 text-left text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition active:scale-95 dark:border-white/10 dark:bg-white dark:text-stone-950"
              @click="openSearch"
            >
              <span class="text-base text-white/50 dark:text-stone-950/50">⌕</span>
              <span class="truncate text-sm font-medium">
                {{ searchQuery || 'Busca tacos, sushi, café o una región...' }}
              </span>
            </button>
          </div>
        </div>
      </header>

      <section class="mb-5">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-[11px] uppercase tracking-[0.28em] text-stone-500 dark:text-slate-400">Pulso del día</p>
            <h2 class="text-2xl font-semibold leading-tight">{{ heroHeadline }}</h2>
          </div>
          <button
            type="button"
            class="rounded-full border border-stone-300 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] active:scale-95 dark:border-white/15"
            @click="refreshLanding(true)"
          >
            Reset
          </button>
        </div>
        <p class="mt-2 max-w-[24rem] text-sm leading-6 text-stone-600 dark:text-slate-300">
          Feed curado por ventas, visitas recientes y el rastro local de este teléfono.
        </p>
        <div class="mt-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none]">
          <span
            v-for="tag in chips"
            :key="tag"
            class="shrink-0 rounded-full border border-stone-300/80 bg-white/80 px-3 py-2 text-xs font-medium text-stone-700 active:scale-95 dark:border-white/10 dark:bg-white/10 dark:text-slate-200"
          >
            {{ tag }}
          </span>
        </div>
      </section>

      <section v-if="pending && !hasContent" class="space-y-6">
        <div class="grid grid-cols-4 gap-3">
          <div v-for="item in 4" :key="`orbit-skeleton-${item}`" class="animate-pulse">
            <div class="aspect-square rounded-full bg-stone-200 dark:bg-slate-800" />
            <div class="mx-auto mt-2 h-3 w-16 rounded-full bg-stone-200 dark:bg-slate-800" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div v-for="item in 4" :key="`viral-skeleton-${item}`" class="animate-pulse overflow-hidden rounded-[26px] border border-stone-200/80 dark:border-white/10">
            <div class="aspect-square bg-stone-200 dark:bg-slate-800" />
            <div class="space-y-2 p-3">
              <div class="h-4 rounded-full bg-stone-200 dark:bg-slate-800" />
              <div class="h-3 w-2/3 rounded-full bg-stone-200 dark:bg-slate-800" />
            </div>
          </div>
        </div>
        <div v-for="item in 3" :key="`feed-skeleton-${item}`" class="animate-pulse overflow-hidden rounded-[30px] border border-stone-200/80 dark:border-white/10">
          <div class="aspect-[1.12] bg-stone-200 dark:bg-slate-800" />
          <div class="space-y-3 p-4">
            <div class="h-4 rounded-full bg-stone-200 dark:bg-slate-800" />
            <div class="h-4 w-3/4 rounded-full bg-stone-200 dark:bg-slate-800" />
            <div class="h-3 w-1/2 rounded-full bg-stone-200 dark:bg-slate-800" />
          </div>
        </div>
      </section>

      <template v-else>
        <section v-if="filteredTopStores.length" class="mb-7">
          <div class="mb-3 flex items-end justify-between">
            <div>
              <p class="text-[11px] uppercase tracking-[0.28em] text-stone-500 dark:text-slate-400">Órbitas</p>
              <h2 class="text-xl font-semibold">Tiendas encendidas</h2>
            </div>
            <span class="text-xs text-stone-500 dark:text-slate-400">{{ filteredTopStores.length }} activas</span>
          </div>
          <div class="flex snap-x gap-3 overflow-x-auto pb-2 pr-4 [-ms-overflow-style:none] [scrollbar-width:none]">
            <NuxtLink
              v-for="store in filteredTopStores"
              :key="store.id"
              :to="`/b/${store.slug}`"
              class="group w-[92px] shrink-0 snap-start active:scale-95"
              @click="trackStoreTap(store)"
            >
              <div class="relative aspect-square overflow-hidden rounded-full border border-white/70 shadow-[0_18px_44px_-24px_rgba(15,23,42,0.65)] dark:border-white/10">
                <img :src="store.logoUrl || store.coverImage" :alt="store.businessName" class="h-full w-full object-cover transition duration-300 group-active:scale-95" loading="lazy">
                <span class="absolute bottom-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-sky-500 text-[11px] text-white shadow-lg">✓</span>
              </div>
              <p class="mt-2 truncate text-center text-[12px] font-semibold">{{ store.businessName }}</p>
              <p class="truncate text-center text-[10px] text-stone-500 dark:text-slate-400">{{ store.city || store.businessTypes[0] }}</p>
            </NuxtLink>
          </div>
        </section>

        <section v-if="filteredViralProducts.length" class="mb-7">
          <div class="mb-3 flex items-end justify-between">
            <div>
              <p class="text-[11px] uppercase tracking-[0.28em] text-stone-500 dark:text-slate-400">Mosaicos</p>
              <h2 class="text-xl font-semibold">Virales ahora</h2>
            </div>
            <span class="rounded-full bg-stone-950 px-3 py-1 text-[11px] font-semibold text-white dark:bg-orange-500">🔥 Hot</span>
          </div>
          <div class="grid grid-cols-2 gap-3">
            <NuxtLink
              v-for="product in filteredViralProducts"
              :key="`${product.catalogId}-${product.productId}`"
              :to="`/b/${product.catalogSlug}`"
              class="overflow-hidden rounded-[28px] border border-white/70 bg-stone-950 text-white shadow-[0_20px_60px_-32px_rgba(15,23,42,0.9)] active:scale-95 dark:border-white/10 dark:bg-slate-900"
              @click="trackProductTap(product)"
            >
              <div class="relative aspect-square">
                <img :src="product.imageUrl" :alt="product.productName" class="h-full w-full object-cover" loading="lazy">
                <div class="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/60 to-transparent px-3 pb-3 pt-8">
                  <p class="line-clamp-2 text-sm font-semibold">{{ product.productName }}</p>
                  <p class="mt-1 text-[11px] text-white/70">{{ product.businessName }}</p>
                </div>
                <span class="absolute left-3 top-3 rounded-full bg-orange-500 px-2.5 py-1 text-[10px] font-semibold text-white">🔥 {{ product.orderCount }}</span>
              </div>
            </NuxtLink>
          </div>
        </section>

        <section v-if="filteredHubs.length" class="mb-7">
          <div class="mb-3">
            <p class="text-[11px] uppercase tracking-[0.28em] text-stone-500 dark:text-slate-400">Destinos</p>
            <h2 class="text-xl font-semibold">Zonas con tracción</h2>
          </div>
          <div class="space-y-3">
            <NuxtLink
              v-for="(hub, index) in filteredHubs"
              :key="hub.regionKey"
              :to="hub.sampleStoreSlug ? `/b/${hub.sampleStoreSlug}` : '/catalogos'"
              class="relative block overflow-hidden rounded-[30px] active:scale-95"
              @click="trackHubTap(hub)"
            >
              <div class="absolute inset-0">
                <img
                  :src="hub.sampleImageUrl"
                  :alt="hub.regionLabel"
                  class="h-full w-full scale-110 object-cover"
                  loading="lazy"
                >
              </div>
              <div class="relative overflow-hidden rounded-[30px] border border-white/70 bg-gradient-to-r from-stone-950/85 via-stone-950/50 to-stone-950/20 px-4 py-5 text-white dark:border-white/10 dark:from-slate-950/90 dark:via-slate-900/55">
                <p class="text-[11px] uppercase tracking-[0.3em] text-cyan-200">{{ hub.city }}</p>
                <h3 class="mt-2 text-2xl font-semibold leading-none">{{ hub.regionLabel }}</h3>
                <div class="mt-4 flex items-center gap-2 text-[11px] text-white/80">
                  <span class="rounded-full bg-white/12 px-3 py-1">{{ hub.storeCount }} tiendas</span>
                  <span class="rounded-full bg-white/12 px-3 py-1">{{ hub.activeProducts }} productos</span>
                  <span class="rounded-full bg-white/12 px-3 py-1">{{ hub.recentVisits }} vistas</span>
                </div>
              </div>
            </NuxtLink>
          </div>
        </section>

        <section>
          <div class="mb-3 flex items-end justify-between">
            <div>
              <p class="text-[11px] uppercase tracking-[0.28em] text-stone-500 dark:text-slate-400">Feed For You</p>
              <h2 class="text-xl font-semibold">Recomendado para este teléfono</h2>
            </div>
            <span class="text-xs text-stone-500 dark:text-slate-400">{{ filteredFeed.length }} hallazgos</span>
          </div>

          <div v-if="filteredFeed.length" class="space-y-4">
            <NuxtLink
              v-for="item in filteredFeed"
              :key="`${item.catalogId}-${item.productId}`"
              :to="`/b/${item.slug}`"
              class="block overflow-hidden rounded-[32px] border border-white/70 bg-white/90 shadow-[0_24px_80px_-36px_rgba(15,23,42,0.65)] backdrop-blur active:scale-95 dark:border-white/10 dark:bg-slate-900/80"
              @click="trackFeedTap(item)"
            >
              <div class="relative aspect-[1.1] overflow-hidden">
                <img :src="item.coverImage || item.productImageUrl" :alt="item.businessName" class="h-full w-full object-cover" loading="lazy">
                <div class="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                <div class="absolute inset-x-0 bottom-0 p-4 text-white">
                  <div class="mb-2 flex items-center gap-2">
                    <img :src="item.logoUrl" :alt="item.businessName" class="h-10 w-10 rounded-full border border-white/40 object-cover">
                    <div>
                      <p class="text-sm font-semibold">{{ item.businessName }}</p>
                      <p class="text-[11px] text-white/70">{{ item.city }}{{ item.stateCode ? `, ${item.stateCode}` : '' }}</p>
                    </div>
                  </div>
                  <p class="max-w-[85%] text-2xl font-semibold leading-tight">{{ item.productName }}</p>
                </div>
              </div>
              <div class="space-y-3 p-4">
                <p class="line-clamp-2 text-sm leading-6 text-stone-600 dark:text-slate-300">{{ item.productDescription || item.tagline }}</p>
                <div class="flex flex-wrap gap-2">
                  <span
                    v-for="tag in item.matchedTags.slice(0, 3)"
                    :key="`${item.productId}-${tag}`"
                    class="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold text-amber-800 dark:bg-cyan-500/15 dark:text-cyan-200"
                  >
                    {{ tag }}
                  </span>
                </div>
                <div class="flex items-end justify-between gap-3">
                  <div>
                    <p class="text-[11px] uppercase tracking-[0.24em] text-stone-400 dark:text-slate-500">Desde</p>
                    <p class="text-2xl font-semibold">{{ money(item.promoPrice ?? item.price) }}</p>
                  </div>
                  <div class="text-right text-[11px] text-stone-500 dark:text-slate-400">
                    <p>{{ item.orderCount }} ventas</p>
                    <p>{{ item.recentVisits }} vistas</p>
                  </div>
                </div>
              </div>
            </NuxtLink>
          </div>

          <div v-else class="rounded-[30px] border border-dashed border-stone-300 bg-white/70 px-5 py-10 text-center text-sm text-stone-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
            No hubo coincidencias para "{{ searchQuery }}". Borra el término o toca una búsqueda reciente.
          </div>
        </section>

        <footer class="mt-8 overflow-hidden rounded-[36px] border border-stone-900/10 bg-[linear-gradient(180deg,_#1c1917_0%,_#0f172a_100%)] text-white shadow-[0_32px_90px_-40px_rgba(2,6,23,0.95)]">
          <div class="border-b border-white/10 px-5 py-6">
            <p class="text-[11px] uppercase tracking-[0.34em] text-cyan-300">Lanza tu SaaS</p>
            <h2 class="mt-3 text-3xl font-semibold leading-tight">¿Aún no tienes tu tienda? Crea una ahora mismo y comienza a vender en minutos.</h2>
            <p class="mt-3 max-w-[28rem] text-sm leading-6 text-white/70">
              Activa tu escaparate móvil, publica productos con imagen y convierte visitas del marketplace en pedidos reales.
            </p>
            <div class="mt-5 flex gap-3">
              <NuxtLink to="/register" class="flex-1 rounded-full bg-white px-4 py-3 text-center text-sm font-semibold text-stone-950 active:scale-95">
                Crear tienda
              </NuxtLink>
              <NuxtLink to="/login" class="flex-1 rounded-full border border-white/15 bg-white/5 px-4 py-3 text-center text-sm font-semibold text-white active:scale-95">
                Ingresar
              </NuxtLink>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-6 px-5 py-6">
            <div>
              <p class="text-[11px] uppercase tracking-[0.28em] text-white/45">Comunidad</p>
              <div class="mt-4 space-y-3">
                <button type="button" class="block text-left text-sm text-white/78 active:scale-95" @click="showComingSoon('Necesitas Ayuda')">¿Necesitas Ayuda?</button>
                <button type="button" class="block text-left text-sm text-white/78 active:scale-95" @click="showComingSoon('FAQ')">FAQ</button>
                <button type="button" class="block text-left text-sm text-white/78 active:scale-95" @click="showComingSoon('Blog')">Blog</button>
              </div>
            </div>
            <div>
              <p class="text-[11px] uppercase tracking-[0.28em] text-white/45">Legal</p>
              <div class="mt-4 space-y-3">
                <button type="button" class="block text-left text-sm text-white/78 active:scale-95" @click="showComingSoon('Términos')">Términos</button>
                <button type="button" class="block text-left text-sm text-white/78 active:scale-95" @click="showComingSoon('Privacidad')">Privacidad</button>
              </div>
            </div>
          </div>

          <div class="flex items-center justify-between border-t border-white/10 px-5 py-4 text-[11px] text-white/40">
            <p>© {{ currentYear }} Marketplace Engine</p>
            <p>Built for mobile commerce</p>
          </div>
        </footer>
      </template>
    </div>

    <Transition
      enter-active-class="duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="isSearchOpen" class="fixed inset-0 z-50 bg-stone-950/60 backdrop-blur-sm" @click.self="closeSearch">
        <div class="mx-auto flex min-h-screen w-full max-w-[430px] flex-col px-4 pb-6 pt-6">
          <div class="rounded-[32px] border border-white/10 bg-stone-950 p-4 text-white shadow-[0_28px_90px_-30px_rgba(0,0,0,0.75)]">
            <div class="mb-4 flex items-center gap-3">
              <div class="flex h-12 w-12 items-center justify-center rounded-full bg-white/10 text-lg">⌕</div>
              <input
                ref="searchInput"
                v-model="searchDraft"
                type="search"
                inputmode="search"
                placeholder="Busca una tienda, producto o ciudad"
                class="h-12 w-full rounded-full border border-white/10 bg-white/10 px-4 text-sm outline-none placeholder:text-white/40"
                @keydown.enter.prevent="commitSearch(searchDraft)"
              >
            </div>

            <div class="mb-4 flex items-center justify-between">
              <p class="text-[11px] uppercase tracking-[0.28em] text-white/50">Top 5 recientes</p>
              <button type="button" class="text-xs text-white/70 active:scale-95" @click="closeSearch">Cerrar</button>
            </div>

            <div class="space-y-2">
              <button
                v-for="term in recentSearches"
                :key="term"
                type="button"
                class="flex w-full items-center justify-between rounded-[22px] border border-white/10 bg-white/5 px-4 py-3 text-left active:scale-95"
                @click="commitSearch(term)"
              >
                <span class="truncate text-sm">{{ term }}</span>
                <span class="text-white/40">↗</span>
              </button>
              <button
                v-if="searchDraft.trim()"
                type="button"
                class="mt-3 flex w-full items-center justify-center rounded-full bg-amber-400 px-4 py-3 text-sm font-semibold text-stone-950 active:scale-95 dark:bg-cyan-300"
                @click="commitSearch(searchDraft)"
              >
                Buscar "{{ searchDraft.trim() }}"
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <Transition
      enter-active-class="duration-300 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="duration-200 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="isGeoMenuOpen" class="fixed inset-0 z-[60] bg-stone-950/55 backdrop-blur-sm" @click.self="isGeoMenuOpen = false">
        <div class="h-full w-full max-w-[430px]">
          <aside
            class="h-full w-[88%] max-w-[360px] border-r border-white/10 bg-white/80 px-4 pb-6 pt-5 shadow-[0_24px_90px_-28px_rgba(15,23,42,0.75)] backdrop-blur-xl transition-transform duration-300 dark:bg-stone-950/90"
            :class="isGeoMenuOpen ? 'translate-x-0' : '-translate-x-full'"
          >
            <div class="mb-4 flex items-center justify-between">
              <div>
                <p class="text-[11px] uppercase tracking-[0.3em] text-stone-500 dark:text-slate-400">Geo Menu</p>
                <h2 class="mt-1 text-2xl font-semibold">Explora por región</h2>
              </div>
              <button
                type="button"
                class="flex h-11 w-11 items-center justify-center rounded-full border border-stone-300 bg-white active:scale-95 dark:border-white/10 dark:bg-white/10"
                @click="isGeoMenuOpen = false"
              >
                ×
              </button>
            </div>

            <div class="rounded-[26px] border border-stone-200/80 bg-white/70 p-3 text-sm text-stone-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
              Toca un municipio para disparar la búsqueda y filtrar todo el feed al instante.
            </div>

            <div class="mt-4 space-y-3 overflow-y-auto pb-6">
              <details
                v-for="country in geoMenuTree"
                :key="country.countryCode"
                class="group rounded-[24px] border border-stone-200/80 bg-white/65 p-2 dark:border-white/10 dark:bg-white/5"
              >
                <summary class="flex cursor-pointer list-none items-center justify-between rounded-[18px] px-3 py-3 text-sm font-semibold marker:content-none">
                  <div>
                    <p>{{ country.countryLabel }}</p>
                    <p class="mt-1 text-[11px] font-medium text-stone-500 dark:text-slate-400">{{ country.storeCount }} tiendas activas</p>
                  </div>
                  <span class="text-stone-400 transition group-open:rotate-90 dark:text-slate-500">›</span>
                </summary>

                <div class="mt-2 space-y-2 px-1 pb-1">
                  <details
                    v-for="state in country.states"
                    :key="`${country.countryCode}-${state.stateCode}`"
                    class="group/state rounded-[20px] border border-stone-200/80 bg-stone-50/80 p-2 dark:border-white/10 dark:bg-stone-900/40"
                  >
                    <summary class="flex cursor-pointer list-none items-center justify-between rounded-[16px] px-3 py-3 text-sm font-semibold marker:content-none">
                      <div>
                        <p>{{ state.stateLabel }}</p>
                        <p class="mt-1 text-[11px] font-medium text-stone-500 dark:text-slate-400">{{ state.storeCount }} tiendas</p>
                      </div>
                      <span class="text-stone-400 transition group-open/state:rotate-90 dark:text-slate-500">›</span>
                    </summary>

                    <div class="mt-2 flex flex-col gap-2 px-1 pb-1">
                      <button
                        v-for="city in state.cities"
                        :key="city.regionKey"
                        type="button"
                        class="flex items-center justify-between rounded-[16px] border border-stone-200/80 bg-white px-3 py-3 text-left text-sm font-medium active:scale-95 dark:border-white/10 dark:bg-white/5"
                        @click="selectGeoCity(city.city)"
                      >
                        <span>{{ city.city }}</span>
                        <span class="rounded-full bg-stone-950 px-2 py-1 text-[10px] font-semibold text-white dark:bg-cyan-400 dark:text-stone-950">
                          {{ city.storeCount }}
                        </span>
                      </button>
                    </div>
                  </details>
                </div>
              </details>
            </div>
          </aside>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import type { MarketplaceFeedEntry, MarketplaceHub, MarketplaceProductCard, MarketplaceStoreCard } from '~/types/catalog'

definePageMeta({
  pageTransition: false,
})

type GeoStateNode = {
  stateCode: string
  stateLabel: string
  storeCount: number
  cities: MarketplaceHub[]
}

type GeoCountryNode = {
  countryCode: string
  countryLabel: string
  storeCount: number
  states: GeoStateNode[]
}

const backend = useSupabaseBackend()
const trackerEngine = useAlgorithmicTracker()
const colorMode = useColorMode()

const landingCache = useState<{
  topStores: MarketplaceStoreCard[]
  viralProducts: MarketplaceProductCard[]
  hubs: MarketplaceHub[]
  forYou: MarketplaceFeedEntry[]
  fetchedAt: string | null
  signature: string
}>('marketplace-landing-cache', () => ({
  topStores: [],
  viralProducts: [],
  hubs: [],
  forYou: [],
  fetchedAt: null,
  signature: '',
}))

const pending = ref(false)
const errorMessage = ref('')
const isSearchOpen = ref(false)
const isGeoMenuOpen = ref(false)
const searchQuery = ref('')
const searchDraft = ref('')
const searchInput = useTemplateRef<HTMLInputElement>('searchInput')

const topStores = computed(() => landingCache.value.topStores)
const viralProducts = computed(() => landingCache.value.viralProducts)
const hubs = computed(() => landingCache.value.hubs)
const forYou = computed(() => landingCache.value.forYou)
const preferredTags = trackerEngine.preferredTags
const recentSearches = trackerEngine.recentSearches
const currentYear = new Date().getFullYear()

const hasContent = computed(() =>
  topStores.value.length > 0 || viralProducts.value.length > 0 || hubs.value.length > 0 || forYou.value.length > 0,
)

const chips = computed(() => {
  const base = preferredTags.value.length ? preferredTags.value : ['delivery', 'viral', 'nuevo', 'cerca']
  return base.slice(0, 6)
})

const searchNeedle = computed(() => searchQuery.value.trim().toLowerCase())

const matchText = (fields: Array<string | number | null | undefined>) => {
  if (!searchNeedle.value) {
    return true
  }

  return fields
    .map(value => String(value || '').toLowerCase())
    .some(value => value.includes(searchNeedle.value))
}

const filteredTopStores = computed(() => topStores.value.filter(store => matchText([
  store.businessName,
  store.tagline,
  store.city,
  store.stateCode,
  ...store.businessTypes,
])))

const filteredViralProducts = computed(() => viralProducts.value.filter(product => matchText([
  product.productName,
  product.description,
  product.businessName,
  product.businessType,
  product.city,
  ...product.tags,
])))

const filteredHubs = computed(() => hubs.value.filter(hub => matchText([
  hub.regionLabel,
  hub.city,
  hub.stateCode,
  hub.countryCode,
])))

const filteredFeed = computed(() => forYou.value.filter(item => matchText([
  item.businessName,
  item.tagline,
  item.city,
  item.stateCode,
  item.productName,
  item.productDescription,
  ...item.businessTypes,
  ...item.matchedTags,
])))

const geoMenuTree = computed<GeoCountryNode[]>(() => {
  const countryMap = new Map<string, {
    countryCode: string
    countryLabel: string
    storeCount: number
    statesMap: Map<string, {
      stateCode: string
      stateLabel: string
      storeCount: number
      cities: MarketplaceHub[]
    }>
  }>()

  hubs.value.forEach((hub) => {
    if (!hub.city || hub.storeCount <= 0) {
      return
    }

    const countryCode = (hub.countryCode || 'XX').trim().toUpperCase()
    const stateCode = (hub.stateCode || 'NA').trim().toUpperCase()

    if (!countryMap.has(countryCode)) {
      countryMap.set(countryCode, {
        countryCode,
        countryLabel: countryCode,
        storeCount: 0,
        statesMap: new Map(),
      })
    }

    const country = countryMap.get(countryCode)!
    country.storeCount += hub.storeCount

    if (!country.statesMap.has(stateCode)) {
      country.statesMap.set(stateCode, {
        stateCode,
        stateLabel: stateCode,
        storeCount: 0,
        cities: [],
      })
    }

    const state = country.statesMap.get(stateCode)!
    state.storeCount += hub.storeCount
    state.cities.push(hub)
  })

  return [...countryMap.values()]
    .map(country => ({
      countryCode: country.countryCode,
      countryLabel: country.countryLabel,
      storeCount: country.storeCount,
      states: [...country.statesMap.values()]
        .map(state => ({
          stateCode: state.stateCode,
          stateLabel: state.stateLabel,
          storeCount: state.storeCount,
          cities: [...state.cities].sort((left, right) => right.storeCount - left.storeCount || left.city.localeCompare(right.city)),
        }))
        .sort((left, right) => right.storeCount - left.storeCount || left.stateLabel.localeCompare(right.stateLabel)),
    }))
    .sort((left, right) => right.storeCount - left.storeCount || left.countryLabel.localeCompare(right.countryLabel))
})

const heroHeadline = computed(() => {
  if (errorMessage.value) {
    return 'Carga parcial disponible'
  }

  if (searchQuery.value) {
    return `Explorando "${searchQuery.value.trim()}"`
  }

  if (preferredTags.value[0]) {
    return `Afinado para ${preferredTags.value[0]}`
  }

  return 'Elige desde el feed premium'
})

const money = (value: number) => new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
}).format(value || 0)

const trackerSignature = computed(() => preferredTags.value.join('|'))

const refreshLanding = async (force = false) => {
  const lastFetchMs = landingCache.value.fetchedAt ? Date.parse(landingCache.value.fetchedAt) : 0
  const isFresh = lastFetchMs && Date.now() - lastFetchMs < 1000 * 60 * 8
  const nextSignature = trackerSignature.value

  if (!force && isFresh && landingCache.value.signature === nextSignature && hasContent.value) {
    return
  }

  pending.value = true
  errorMessage.value = ''

  try {
    const payload = await backend.getMarketplaceLanding(preferredTags.value)
    landingCache.value = {
      ...payload,
      fetchedAt: new Date().toISOString(),
      signature: nextSignature,
    }
  } catch (error: any) {
    errorMessage.value = error?.message || 'No se pudo refrescar el feed'
  } finally {
    pending.value = false
  }
}

const openSearch = async () => {
  isSearchOpen.value = true
  searchDraft.value = searchQuery.value
  await nextTick()
  searchInput.value?.focus()
}

const closeSearch = () => {
  isSearchOpen.value = false
}

const commitSearch = async (term: string) => {
  const normalized = term.trim()
  if (!normalized) {
    searchQuery.value = ''
    closeSearch()
    return
  }

  searchQuery.value = normalized
  trackerEngine.rememberSearch(normalized)
  closeSearch()
  await refreshLanding(true)
}

const selectGeoCity = async (city: string) => {
  isGeoMenuOpen.value = false
  await commitSearch(city)
}

const toggleColorMode = () => {
  colorMode.preference = colorMode.preference === 'dark' ? 'light' : 'dark'
}

const showComingSoon = (label: string) => {
  if (import.meta.client) {
    window.alert(`${label}: Próximamente`)
  }
}

const trackStoreTap = (store: MarketplaceStoreCard) => {
  trackerEngine.trackStoreView({
    store: store.businessName,
    businessTypes: store.businessTypes,
    city: store.city,
    tagline: store.tagline,
  })
}

const trackProductTap = (product: MarketplaceProductCard) => {
  trackerEngine.trackProductView({
    product: product.productName,
    tags: product.tags,
    businessName: product.businessName,
    city: product.city,
  })
}

const trackHubTap = (hub: MarketplaceHub) => {
  trackerEngine.trackHubView({
    region: hub.regionLabel,
    city: hub.city,
    stateCode: hub.stateCode,
  })
}

const trackFeedTap = (item: MarketplaceFeedEntry) => {
  trackerEngine.trackProductView({
    product: item.productName,
    tags: item.matchedTags,
    businessName: item.businessName,
    city: item.city,
  })
}

watch(preferredTags, async () => {
  await refreshLanding()
}, { deep: true })

onMounted(async () => {
  trackerEngine.hydrate()
  await refreshLanding()
})
</script>
