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
          <div v-for="group in navGroups" :key="group.title">
            <p class="mb-2 px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-300 dark:text-slate-600">
              {{ group.title }}
            </p>
            <div class="space-y-0.5">
              <NuxtLink
                v-for="item in group.items"
                :key="item.to"
                :to="item.to"
                class="nav-link group flex w-full min-w-0 items-center gap-3 rounded-2xl px-3 py-2.5 text-[13px] font-medium text-slate-500 transition-all duration-200 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800"
                active-class="!bg-blue-500 !text-white shadow-md shadow-blue-500/20"
                @click.prevent="goTo(item.to)"
              >
                <span class="nav-icon flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition-all duration-200 group-hover:bg-white group-hover:text-blue-600 group-hover:shadow-sm dark:bg-slate-800 dark:text-slate-400 dark:group-hover:bg-slate-700 dark:group-hover:text-blue-300">
                  <svg class="h-[17px] w-[17px]" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" v-html="navIcons[item.icon]" />
                </span>
                <span class="min-w-0 flex-1 truncate text-left">{{ item.label }}</span>
              </NuxtLink>
            </div>
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
                to="/onboarding/create-catalog"
                class="inline-flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-2xl border border-dashed border-blue-300/70 bg-blue-50/70 text-blue-700 transition hover:bg-blue-100/80 dark:border-blue-700/60 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/30"
                title="Agregar nuevo catálogo"
                aria-label="Agregar nuevo catálogo"
                @click="sidebarOpen = false"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v14m-7-7h14" />
                </svg>
              </NuxtLink>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2">
            <button
              type="button"
              class="press inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-slate-200/60 bg-slate-50 px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              @click="toggleColorMode"
            >
              <svg v-if="colorMode.value === 'dark'" class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 3v2.25M12 18.75V21M4.97 4.97l1.59 1.59M17.44 17.44l1.59 1.59M3 12h2.25M18.75 12H21M4.97 19.03l1.59-1.59M17.44 6.56l1.59-1.59M15.75 12A3.75 3.75 0 1 1 8.25 12a3.75 3.75 0 0 1 7.5 0Z" />
              </svg>
              <svg v-else class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M21 12.79A9 9 0 1 1 11.21 3c-.07.32-.11.66-.11 1a8 8 0 0 0 8 8c.34 0 .68-.04 1-.11Z" />
              </svg>
              <span>{{ colorMode.value === 'dark' ? 'Claro' : 'Oscuro' }}</span>
            </button>

            <NuxtLink
              v-if="activeCatalog"
              :to="`/b/${activeCatalog.slug}`"
              class="press inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-slate-200/60 bg-slate-50 px-3 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              @click="sidebarOpen = false"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M7 17 17 7M9 7h8v8" />
              </svg>
              <span>Ver menú</span>
            </NuxtLink>
          </div>

          <button
            class="press mt-2 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl border border-slate-200/60 bg-slate-50 px-4 text-sm font-medium text-slate-600 transition hover:bg-rose-50 hover:text-rose-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-rose-950/30 dark:hover:text-rose-400"
            @click="logout"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6A2.25 2.25 0 0 0 5.25 5.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m-8.25-3h12m0 0-3-3m3 3-3 3" />
            </svg>
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>

      <main class="min-w-0 flex-1 overflow-x-hidden lg:pl-[290px]">
        <header class="sticky top-0 z-30 border-b border-slate-200/60 bg-[#F8FAFC] dark:border-slate-800/60 dark:bg-[#0B1120]">
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
              <p class="truncate text-[11px] font-medium text-slate-400">{{ authStore.displayName }}<span v-if="activeCatalog"> · {{ activeCatalog.slug }}</span></p>
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

        <div class="px-2 py-3 sm:px-4 sm:py-4 lg:px-6">
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

watch(
  () => route.path,
  () => {
    sidebarOpen.value = false
  },
  { immediate: true },
)

onMounted(async () => {
  if (authStore.user) {
    await catalogStore.loadOwnerCatalogs(authStore.user.uid, authStore.user.defaultCatalogId)
  }
})

const changeCatalog = async (catalogId: string) => {
  await catalogStore.setActiveCatalog(catalogId)
}

const goTo = async (path: string) => {
  sidebarOpen.value = false
  await navigateTo(path)
}

const toggleColorMode = () => {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
}

const logout = async () => {
  await authStore.logout()
  await navigateTo('/login')
}
</script>

<style scoped>
.nav-link.router-link-active .nav-icon,
.nav-link.router-link-exact-active .nav-icon {
  background: rgba(255, 255, 255, 0.18) !important;
  color: #ffffff !important;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.25);
}
</style>
