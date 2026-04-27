<template>
  <div class="min-h-screen overflow-x-hidden bg-zinc-50 text-zinc-900 transition-colors duration-200 dark:bg-black dark:text-zinc-100">
    <div class="flex min-h-screen">
      <Transition
        enter-active-class="transition duration-150 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-100 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="sidebarOpen"
          class="fixed inset-0 z-40 bg-black/50 lg:hidden"
          @click="sidebarOpen = false"
        />
      </Transition>

      <ClientOnly>
        <aside
          :class="[
            'fixed inset-y-0 left-0 z-50 flex w-full flex-col border-r p-0 transition-transform duration-200 ease-out will-change-transform lg:w-[290px]',
            'bg-white dark:bg-[#0F172A] border-slate-200 dark:border-slate-800',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          ]"
        >
          <div class="flex items-center justify-between border-b border-slate-100 px-5 py-5 dark:border-slate-800/80">
            <div class="flex min-w-0 items-center gap-3">
              <div v-if="activeCatalog?.settings.logoUrl" class="h-10 w-10 overflow-hidden rounded-2xl border border-slate-200 shadow-lg dark:border-slate-800">
                <img :src="activeCatalog.settings.logoUrl" :alt="activeCatalog.settings.businessName" class="h-full w-full object-cover" />
              </div>
              <div v-else class="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/20">
                <svg class="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div class="min-w-0">
                <h1 class="truncate text-[15px] font-bold tracking-tight text-slate-900 dark:text-slate-100">{{ activeCatalog?.settings.businessName || 'Mi catálogo' }}</h1>
                <p class="text-[11px] font-medium text-slate-400">Panel de administración</p>
              </div>
            </div>
            <button
              class="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 lg:hidden"
              aria-label="Cerrar menú lateral"
              @click="sidebarOpen = false"
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <nav class="scrollbar-hide flex-1 space-y-5 overflow-y-auto px-3 py-4">
            <div v-for="group in navGroups" :key="group.title" v-show="isEditingNav || groupHasVisibleItems(group)">
              <p class="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-300 dark:text-slate-600 transition-opacity" :class="[isEditingNav && !groupHasVisibleItems(group) ? 'opacity-40' : '']">
                {{ group.title }}
              </p>
              <div class="space-y-1.5">
                <div v-for="item in group.items" :key="item.to">
                  <div v-show="itemIsVisible(item)" class="relative">
                    <NuxtLink
                      :to="item.to"
                      class="nav-link group flex w-full min-w-0 items-center gap-3.5 rounded-[22px] p-2 pr-4 text-[14.5px] font-semibold text-slate-500 transition-all duration-300 hover:bg-slate-100/70 hover:text-slate-900 active:scale-[0.98] dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-100"
                      active-class="!bg-gradient-to-r !from-blue-600 !to-indigo-600 !text-white shadow-[0_8px_16px_-6px_rgba(59,130,246,0.5)] ring-1 ring-white/10 dark:!from-blue-500 dark:!to-indigo-500"
                      :class="[archivedNavItems.includes(item.to) && isEditingNav ? 'opacity-40 grayscale' : '']"
                      @click.prevent="!isEditingNav && goTo(item.to)"
                    >
                      <div class="nav-icon relative flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-[16px] bg-slate-100 text-slate-500 transition-all duration-300 group-hover:scale-105 group-hover:bg-white group-hover:text-blue-600 group-hover:shadow-md dark:bg-slate-800/80 dark:text-slate-400 dark:group-hover:bg-slate-700 dark:group-hover:text-blue-400">
                        <svg class="h-[20px] w-[20px] transition-transform duration-300 group-hover:scale-110" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" v-html="navIcons[item.icon]" />
                      </div>
                      <span class="min-w-0 flex-1 truncate text-left">{{ item.label }}</span>
                      <span v-if="!isEditingNav" class="opacity-0 transition-all duration-300 group-hover:opacity-100 group-hover:-translate-x-1 text-slate-400 dark:text-slate-500">›</span>
                    </NuxtLink>

                    <button
                      v-if="isEditingNav"
                      class="absolute right-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-slate-600 transition hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 z-10 shadow-sm"
                      :title="archivedNavItems.includes(item.to) ? 'Restaurar opción' : 'Archivar opción'"
                      @click.prevent.stop="toggleArchive(item.to)"
                    >
                      <svg v-if="archivedNavItems.includes(item.to)" class="h-4 w-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <!-- Plus / Add -->
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                      </svg>
                      <svg v-else class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <!-- Archive / Hide -->
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div class="mt-8 px-3 pb-2">
              <button
                type="button"
                class="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 px-3 py-2 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                @click="isEditingNav = !isEditingNav"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110 4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110 4m0 4v2m0-6V4" />
                </svg>
                {{ isEditingNav ? 'Terminar personalización' : 'Personalizar menú' }}
              </button>
            </div>
          </nav>

          <div class="border-t border-slate-100 px-4 py-4 dark:border-slate-800">
            <div v-if="catalogStore.ownerCatalogs.length" class="mb-3">
              <label
                for="catalog-select"
                class="mb-2 block px-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500"
              >
                Catálogo activo
              </label>
              <div class="flex min-w-0 items-stretch gap-2">
                <div class="relative min-w-0 flex-1">
                  <select
                    id="catalog-select"
                    :value="catalogStore.activeCatalogId || ''"
                    class="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pr-10 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    @change="changeCatalog(($event.target as HTMLSelectElement).value)"
                  >
                    <option v-for="catalog in catalogStore.ownerCatalogs" :key="catalog.id" :value="catalog.id">
                      {{ catalog.settings.businessName }}
                    </option>
                  </select>
                  <svg class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                <NuxtLink
                  to="/admin/settings"
                  class="flex items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                  title="Ajustes del catálogo"
                >
                  <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </NuxtLink>
              </div>
            </div>

            <div class="flex items-center justify-between border-t border-slate-100 pt-4 dark:border-slate-800">
              <div class="flex min-w-0 items-center gap-3">
                <div class="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs font-bold">
                  {{ userInitials }}
                </div>
                <div class="min-w-0">
                  <p class="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{{ authStore.user?.displayName || authStore.user?.email || 'Usuario' }}</p>
                  <p class="truncate text-xs text-slate-500 dark:text-slate-400">{{ authStore.user?.email }}</p>
                </div>
              </div>
              <button
                class="flex h-9 w-9 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label="Cerrar sesión"
                @click="handleLogout"
              >
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </aside>

        <template #fallback>
          <aside
            :class="[
              'fixed inset-y-0 left-0 z-50 flex w-full flex-col border-r p-0 lg:w-[290px]',
              'bg-white dark:bg-[#0F172A] border-slate-200 dark:border-slate-800',
              sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
            ]"
          >
            <div class="flex h-full items-center justify-center">
              <div class="text-center">
                <div class="h-8 w-8 mx-auto animate-spin rounded-full border-2 border-slate-200 border-t-blue-500 dark:border-slate-700"></div>
                <p class="mt-4 text-sm text-slate-500 dark:text-slate-400">Cargando...</p>
              </div>
            </div>
          </aside>
        </template>
      </ClientOnly>

      <main class="min-w-0 flex-1 overflow-x-hidden lg:pl-[290px]">
        <header class="fixed left-0 right-0 top-0 z-30 border-b border-slate-200/60 bg-[#F8FAFC] dark:border-slate-800/60 dark:bg-[#0B1120] lg:left-[290px]">
          <div class="flex items-center gap-3.5 px-5 py-3.5">
            <button
              class="press flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200/60 bg-white shadow-sm transition dark:border-slate-700 dark:bg-slate-800 lg:hidden"
              aria-label="Abrir menú lateral"
              @click="sidebarOpen = true"
            >
              <svg class="h-[18px] w-[18px] text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
            <div class="min-w-0 flex-1">
              <h2 class="text-[17px] font-bold leading-tight tracking-tight text-slate-900 dark:text-slate-100">{{ pageTitle }}</h2>
              <p class="truncate text-[11px] font-medium text-slate-400"><ClientOnly>{{ authStore.displayName }}<template #fallback>Invitado</template></ClientOnly><span v-if="activeCatalog"> · {{ activeCatalog.slug }}</span></p>
            </div>
            <button
              class="flex items-center gap-1.5 rounded-full bg-blue-500 px-3 py-2 text-white shadow-sm shadow-blue-500/30 transition hover:bg-blue-600"
              title="Ver vista previa"
              @click="previewStore.openPreview()"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span class="hidden text-[11px] font-bold sm:inline">Vista previa</span>
            </button>
            <div class="hidden items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 dark:bg-emerald-500/10 sm:flex">
              <div class="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span class="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">En línea</span>
            </div>
          </div>
        </header>

        <div class="px-2 pt-[78px] pb-3 sm:px-4 sm:pt-[82px] sm:pb-4 lg:px-6">
          <slot />
        </div>
      </main>
    </div>

    <AdminPreviewModal />
  </div>
</template>

<script setup lang="ts">
type NavIconKey =
  | 'dashboard'
  | 'orders'
  | 'reviews'
  | 'catalog'
  | 'inventory'
  | 'settings'
  | 'coupons'
  | 'appearance'
  | 'share'
  | 'team'
  | 'schedule'
  | 'delivery'
  | 'pickup'
  | 'checkout'
  | 'referrals'

type NavItem = {
  to: string
  label: string
  icon: NavIconKey
}

type NavGroup = {
  title: string
  icon: 'overview' | 'catalog' | 'commerce'
  items: NavItem[]
}

const navIcons: Record<NavIconKey, string> = {
  dashboard: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  orders: '<path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>',
  reviews: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  catalog: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2Z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7Z"/>',
  inventory: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
  settings: '<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/><circle cx="12" cy="12" r="3"/>',
  coupons: '<path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82Z"/><circle cx="7" cy="7" r="1.5" fill="currentColor"/>',
  appearance: '<circle cx="13.5" cy="6.5" r="1"/><circle cx="17.5" cy="10.5" r="1"/><circle cx="8.5" cy="7.5" r="1"/><circle cx="6.5" cy="12.5" r="1"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.5 6.25 17.25 2 12 2z"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>',
  team: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  schedule: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  delivery: '<path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3"/><rect x="9" y="11" width="14" height="10" rx="2" ry="2"/><circle cx="12" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>',
  pickup: '<path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>',
  checkout: '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>',
  referrals: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
}

const route = useRoute()
const colorMode = useColorMode()
const authStore = useAuthStore()
const catalogStore = useCatalogStore()

const sidebarOpen = ref(false)
const previewStore = usePreviewStore()

const isEditingNav = ref(false)
const archivedNavItems = ref<string[]>([])

const loadArchivedItems = () => {
  if (import.meta.server || !activeCatalog.value?.id) return
  const key = `vento-archived-nav-${activeCatalog.value.id}`
  try {
    const raw = localStorage.getItem(key)
    if (raw) archivedNavItems.value = JSON.parse(raw)
    else archivedNavItems.value = []
  } catch {
    archivedNavItems.value = []
  }
}

const toggleArchive = (path: string) => {
  if (archivedNavItems.value.includes(path)) {
    archivedNavItems.value = archivedNavItems.value.filter(p => p !== path)
  } else {
    archivedNavItems.value.push(path)
  }
  
  if (import.meta.client && activeCatalog.value?.id) {
    const key = `vento-archived-nav-${activeCatalog.value.id}`
    localStorage.setItem(key, JSON.stringify(archivedNavItems.value))
  }
}

const groupHasVisibleItems = (group: NavGroup) => {
  return group.items.some(item => itemIsVisible(item))
}

const itemIsVisible = (item: NavItem) => {
  const hasAccess = catalogStore.hasRouteAccess(item.to)
  const isArchived = archivedNavItems.value.includes(item.to)
  return hasAccess && (isEditingNav.value || !isArchived)
}

watch(() => route.fullPath, () => {
  previewStore.setSettings(null)
  previewStore.setTheme(null)
  previewStore.closePreview()
})

watch(sidebarOpen, (isOpen) => {
  if (import.meta.client) {
    document.body.style.overflow = isOpen ? 'hidden' : ''
  }
})

const navGroups: NavGroup[] = [
  {
    title: 'Operación',
    icon: 'overview',
    items: [
      { to: '/admin', label: 'Resumen', icon: 'dashboard' },
      { to: '/admin/orders', label: 'Pedidos', icon: 'orders' },
      { to: '/admin/reviews', label: 'Reseñas', icon: 'reviews' },
    ],
  },
  {
    title: 'Catálogo',
    icon: 'catalog',
    items: [
      { to: '/admin/catalog', label: 'Gestor de catálogo', icon: 'catalog' },
    ],
  },
  {
    title: 'Comercial',
    icon: 'commerce',
    items: [
      { to: '/admin/settings', label: 'Ajustes', icon: 'settings' },
      { to: '/admin/schedule', label: 'Horarios', icon: 'schedule' },
      { to: '/admin/delivery', label: 'Entrega', icon: 'delivery' },
      { to: '/admin/pickup', label: 'Recogida', icon: 'pickup' },
      { to: '/admin/checkout', label: 'Pedido', icon: 'checkout' },
      { to: '/admin/coupons', label: 'Cupones', icon: 'coupons' },
      { to: '/admin/appearance', label: 'Apariencia', icon: 'appearance' },
      { to: '/admin/share', label: 'Compartir', icon: 'share' },
      { to: '/admin/referrals', label: 'Referidos', icon: 'referrals' },
      { to: '/admin/team', label: 'Equipo', icon: 'team' },
    ],
  },
]

const titleMap: Record<string, string> = {
  '/admin': 'Resumen',
  '/admin/catalog': 'Gestor de catálogo',
  '/admin/products': 'Productos',
  '/admin/categories': 'Categorías',
  '/admin/appearance': 'Apariencia',
  '/admin/settings': 'Ajustes del negocio',
  '/admin/schedule': 'Horarios',
  '/admin/delivery': 'Entrega a domicilio',
  '/admin/pickup': 'Recogida en tienda',
  '/admin/checkout': 'Pedido y visibilidad',
  '/admin/share': 'Compartir',
  '/admin/reviews': 'Reseñas',
  '/admin/orders': 'Pedidos',
  '/admin/coupons': 'Cupones',
  '/admin/referrals': 'Programa de referidos',
  '/admin/team': 'Equipo',
}

const pageTitle = computed(() => titleMap[route.path] || 'Panel')
const activeCatalog = computed(() => catalogStore.activeCatalog)
const loadingCatalogs = ref(false)
const catalogsLoadedForUser = ref<string | null>(null)
const userInitials = computed(() => {
  const user = authStore.user
  if (!user) return '?'
  const name = user.displayName || user.email || ''
  return name.slice(0, 2).toUpperCase()
})
let visibilityCleanup: (() => void) | null = null

watch(
  () => route.path,
  () => {
    sidebarOpen.value = false
    isEditingNav.value = false
  },
  { immediate: true },
)

watch(
  () => activeCatalog.value?.id,
  () => {
    loadArchivedItems()
    isEditingNav.value = false
  },
  { immediate: true },
)

const ensureOwnerCatalogs = async () => {
  const user = authStore.user

  if (!user) {
    catalogsLoadedForUser.value = null
    catalogStore.resetAdminState()
    return
  }

  const shouldReload = catalogsLoadedForUser.value !== user.uid
    || !catalogStore.ownerCatalogs.length
    || (user.defaultCatalogId && catalogStore.activeCatalogId !== user.defaultCatalogId)

  if (!shouldReload || loadingCatalogs.value) {
    return
  }

  loadingCatalogs.value = true
  try {
    await catalogStore.loadAdminBootstrap(user.defaultCatalogId, {
      cacheKey: `${user.uid}:${user.email || ''}:${user.defaultCatalogId || ''}`,
    })
    catalogsLoadedForUser.value = user.uid
  } finally {
    loadingCatalogs.value = false
  }
}

watch(
  () => [authStore.user?.uid || '', authStore.user?.defaultCatalogId || ''],
  async () => {
    await ensureOwnerCatalogs()
  },
  { immediate: true },
)

const changeCatalog = async (catalogId: string) => {
  if (!catalogId) {
    return
  }

  await catalogStore.setActiveCatalog(catalogId)
  if (authStore.user?.defaultCatalogId !== catalogId) {
    await authStore.setDefaultCatalog(catalogId)
  }
}

const goTo = async (path: string) => {
  sidebarOpen.value = false
  if (!catalogStore.hasRouteAccess(path)) {
    return
  }
  await navigateTo(path)
}

const goToCreateCatalog = async () => {
  await goTo('/onboarding/create-catalog')
}

const openStorefront = () => {
  if (!activeCatalog.value || import.meta.server) {
    return
  }

  sidebarOpen.value = false
  const storefrontUrl = `/b/${activeCatalog.value.slug}`
  window.open(storefrontUrl, '_blank', 'noopener,noreferrer')
}

const toggleColorMode = () => {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}

const handleLogout = async () => {
  sidebarOpen.value = false

  try {
    await authStore.logout()
  } finally {
    await navigateTo('/login')
  }
}

onMounted(() => {
  const revalidateAdminBootstrap = async () => {
    if (document.hidden || !authStore.user) {
      return
    }

    if (!catalogStore.activeCatalog || !catalogStore.ownerCatalogs.length) {
      await ensureOwnerCatalogs()
    }
  }

  const handleVisibility = () => {
    void revalidateAdminBootstrap()
  }

  document.addEventListener('visibilitychange', handleVisibility)
  window.addEventListener('focus', handleVisibility)

  visibilityCleanup = () => {
    document.removeEventListener('visibilitychange', handleVisibility)
    window.removeEventListener('focus', handleVisibility)
    visibilityCleanup = null
  }
})

onBeforeUnmount(() => {
  visibilityCleanup?.()
})
</script>

<style scoped>
.nav-link.router-link-active .nav-icon,
.nav-link.router-link-exact-active .nav-icon {
  background: rgba(255, 255, 255, 0.18) !important;
  color: #ffffff !important;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.25);
}
</style>
