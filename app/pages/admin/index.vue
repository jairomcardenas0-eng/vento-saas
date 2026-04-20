<template>
  <div v-if="catalog" class="space-y-4">
    <section class="panel-card overflow-hidden !p-0">
      <div class="border-b border-slate-200/70 px-5 py-5 dark:border-slate-800/70 sm:px-6">
        <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p class="text-sm font-semibold uppercase tracking-[0.18em] text-blue-600/80">Visitas y usuarios</p>
            <h1 class="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">Ultima semana del catalogo</h1>
            <p class="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
              Resumen diario de trafico publico y comportamiento de usuarios activos dentro de <strong class="text-slate-900 dark:text-slate-100">{{ catalog.settings.businessName }}</strong>.
            </p>
          </div>

          <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-300">
            <div class="font-medium text-slate-900 dark:text-slate-100">{{ analyticsLabel }}</div>
            <div>{{ dailyAverageVisits }} visitas promedio por dia</div>
          </div>
        </div>
      </div>

      <div class="space-y-4 px-4 py-4 sm:px-6 sm:py-6">
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          <article
            v-for="item in topCards"
            :key="item.label"
            class="rounded-[22px] border bg-white p-4 shadow-[0_16px_40px_rgba(15,23,42,0.05)] dark:bg-slate-950 transition-all duration-300"
            :class="item.isLive && realtimePulse
              ? 'border-blue-400 shadow-[0_0_0_3px_rgba(59,130,246,0.18),0_16px_40px_rgba(15,23,42,0.05)] dark:border-blue-500'
              : 'border-slate-200 dark:border-slate-800'"
          >
            <div class="flex items-start justify-between gap-4">
              <div>
                <div class="flex items-center gap-2">
                  <p class="text-sm font-medium text-slate-500 dark:text-slate-400">{{ item.label }}</p>
                  <!-- Badge "En vivo" palpitante: solo en el card de visitas totales -->
                  <span
                    v-if="item.isLive"
                    class="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-all duration-300"
                    :class="realtimePulse
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'"
                  >
                    <span
                      class="h-1.5 w-1.5 rounded-full transition-all duration-300"
                      :class="realtimePulse ? 'bg-blue-500 animate-ping' : 'bg-slate-400'"
                    />
                    En vivo
                  </span>
                </div>
                <p class="mt-3 text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">{{ item.value }}</p>
              </div>

              <div :class="item.iconClass">
                <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" :d="item.iconPath" />
                </svg>
              </div>
            </div>

            <p class="mt-4 text-sm text-slate-600 dark:text-slate-400">{{ item.caption }}</p>
          </article>
        </div>

        <div class="grid grid-cols-1 gap-4 2xl:grid-cols-2">
          <section class="rounded-[24px] border border-slate-200 bg-white py-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-950">
            <div class="flex flex-col gap-4 px-4 sm:px-6">
              <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div class="flex items-center gap-3">
                  <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300">
                    <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
                    </svg>
                  </div>
                  <div>
                    <p class="text-sm text-slate-500 dark:text-slate-400">Visitas totales</p>
                    <p class="text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">{{ analytics?.totals.pageViews || 0 }}</p>
                  </div>
                </div>

                <div class="text-xs text-slate-500 dark:text-slate-400">
                  Visitas por dia:
                  <span class="font-semibold text-slate-900 dark:text-slate-100">{{ dailyAverageVisits }}</span>
                </div>
              </div>

              <AnalyticsLineChart :labels="chartLabels" :values="visitsDataset" color="#2563eb" />

              <div>
                <h2 class="text-base font-semibold text-slate-950 dark:text-slate-50">Resumen de visitas</h2>
                <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Lectura diaria de page views sobre el storefront publico del catalogo.
                </p>
              </div>
            </div>
          </section>

          <section class="rounded-[24px] border border-slate-200 bg-white py-5 shadow-[0_18px_44px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-950">
            <div class="flex flex-col gap-4 px-4 sm:px-6">
              <div class="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div class="flex items-center gap-3">
                  <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M16 19a4 4 0 0 0-8 0" />
                      <circle cx="12" cy="11" r="3.25" stroke-width="1.8" />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M4 19a3 3 0 0 1 3-3m10 3a3 3 0 0 1 3-3" />
                    </svg>
                  </div>
                  <div>
                    <p class="text-sm text-slate-500 dark:text-slate-400">Usuarios activos</p>
                    <p class="text-2xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">{{ analytics?.totals.activeUsers || 0 }}</p>
                  </div>
                </div>

                <div class="text-xs text-slate-500 dark:text-slate-400">
                  Usuarios activos por dia:
                  <span class="font-semibold text-slate-900 dark:text-slate-100">{{ dailyAverageUsers }}</span>
                </div>
              </div>

              <AnalyticsLineChart :labels="chartLabels" :values="usersDataset" color="#0f172a" />

              <div>
                <h2 class="text-base font-semibold text-slate-950 dark:text-slate-50">Resumen de usuarios activos</h2>
                <p class="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  Usuarios unicos detectados por dia con cookie anonima persistente.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </section>

    <section class="panel-card">
      <UiSectionHeader
        eyebrow="Accesos rapidos"
        title="Atajos del panel"
        description="Mantengo el acceso directo a tus secciones operativas principales."
      />
      <div class="quick-links">
        <NuxtLink to="/admin/orders" class="quick-link">Ver pedidos</NuxtLink>
        <NuxtLink to="/admin/reviews" class="quick-link">Revisar reseñas</NuxtLink>
        <NuxtLink to="/admin/catalog" class="quick-link">Gestionar catalogo</NuxtLink>
        <NuxtLink to="/admin/settings" class="quick-link">Ir a ajustes</NuxtLink>
      </div>
    </section>
  </div>

  <section v-else-if="catalogStore.loading" class="panel-card">
    <p class="text-sm text-slate-500 dark:text-slate-400">Cargando catalogo y metricas...</p>
  </section>

  <section v-else class="panel-card">
    <p class="text-sm text-slate-500 dark:text-slate-400">No hay un catalogo activo para mostrar analiticas.</p>
  </section>
</template>

<script setup lang="ts">
import type { CatalogAnalyticsOverview } from '~/types/analytics'

definePageMeta({ layout: 'admin' })

const RANGE_DAYS = 7
const PULSE_DURATION_MS = 2500

const catalogStore = useCatalogStore()
const backend = useSupabaseBackend()
const catalog = computed(() => catalogStore.activeCatalog)
const analytics = ref<CatalogAnalyticsOverview | null>(null)

/** Controla la animación de pulso cuando llega un hit en tiempo real */
const realtimePulse = ref(false)
let pulseTimer: ReturnType<typeof setTimeout> | null = null

const triggerPulse = () => {
  realtimePulse.value = true
  if (pulseTimer) clearTimeout(pulseTimer)
  pulseTimer = setTimeout(() => {
    realtimePulse.value = false
  }, PULSE_DURATION_MS)
}

let stopAnalyticsWatch: (() => void) | null = null

const topCards = computed(() => {
  const overview = analytics.value

  return [
    {
      label: 'Visitas totales',
      value: overview?.totals.pageViews || 0,
      caption: 'Page views registradas en los ultimos 7 dias.',
      iconClass: 'flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-300',
      iconPath: 'M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z',
      isLive: true,
    },
    {
      label: 'Usuarios activos',
      value: overview?.totals.activeUsers || 0,
      caption: 'Usuarios unicos con actividad en el rango actual.',
      iconClass: 'flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
      iconPath: 'M16 19a4 4 0 0 0-8 0 M12 14.25A3.25 3.25 0 1 0 12 7.75a3.25 3.25 0 0 0 0 6.5 M4 19a3 3 0 0 1 3-3m10 3a3 3 0 0 1 3-3',
      isLive: false,
    },
    {
      label: 'Nuevos usuarios',
      value: overview?.totals.newUsers || 0,
      caption: 'Primeras visitas detectadas en los ultimos 7 dias.',
      iconClass: 'flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
      iconPath: 'M12 5v14 M5 12h14',
      isLive: false,
    },
  ]
})

const chartLabels = computed(() => (analytics.value?.daily || []).map((row) => (
  new Intl.DateTimeFormat('es-MX', { weekday: 'short', day: 'numeric' }).format(new Date(`${row.day}T12:00:00Z`))
)))

const visitsDataset = computed(() => (analytics.value?.daily || []).map((row) => row.pageViews))
const usersDataset = computed(() => (analytics.value?.daily || []).map((row) => row.activeUsers))

const dailyAverageVisits = computed(() => {
  const total = analytics.value?.totals.pageViews || 0
  return (total / RANGE_DAYS).toFixed(1)
})

const dailyAverageUsers = computed(() => {
  const total = analytics.value?.daily.reduce((sum, row) => sum + row.activeUsers, 0) || 0
  return (total / RANGE_DAYS).toFixed(1)
})

const analyticsLabel = computed(() => `Ultimos ${RANGE_DAYS} dias`)

const startAnalytics = (catalogId: string) => {
  stopAnalyticsWatch?.()
  analytics.value = null

  stopAnalyticsWatch = backend.watchCatalogAnalytics(
    catalogId,
    (payload) => {
      analytics.value = payload
    },
    (error) => {
      console.error('CatalogAnalyticsWatch Error:', error)
    },
    RANGE_DAYS,
    triggerPulse,
  )
}

watch(catalog, (value) => {
  if (!value) {
    stopAnalyticsWatch?.()
    stopAnalyticsWatch = null
    analytics.value = null
    return
  }

  startAnalytics(value.id)
}, { immediate: true })

onBeforeUnmount(() => {
  stopAnalyticsWatch?.()
  if (pulseTimer) clearTimeout(pulseTimer)
})
</script>
