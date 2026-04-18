<template>
  <section class="min-h-screen bg-[radial-gradient(circle_at_top_left,#23130e,#09090b_62%)] px-4 py-6 text-white sm:px-6 lg:px-8">
    <div class="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <header class="rounded-[32px] border border-white/10 bg-white/5 px-6 py-5 shadow-[0_30px_80px_rgba(0,0,0,0.22)] backdrop-blur">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p class="text-xs font-semibold uppercase tracking-[0.28em] text-amber-300/80">Owner Command Center</p>
            <h1 class="mt-3 text-4xl font-semibold tracking-tight">Trono Global del Ecosistema</h1>
            <p class="mt-3 max-w-2xl text-sm leading-6 text-white/65">
              Visibilidad total sobre tenants, actividad viva del SaaS y capacidad de congelar negocios desde un solo tablero.
            </p>
          </div>
          <div class="rounded-[28px] border border-white/10 bg-black/20 px-5 py-4 text-sm text-white/70">
            <strong class="block text-base text-white">{{ authStore.displayName }}</strong>
            <span>{{ authStore.user?.email }}</span>
          </div>
        </div>
      </header>

      <div class="grid gap-4 md:grid-cols-3">
        <div class="rounded-[28px] border border-emerald-400/20 bg-emerald-500/10 p-5 backdrop-blur">
          <p class="text-xs uppercase tracking-[0.22em] text-emerald-200/70">Catalogos Activos</p>
          <strong class="mt-3 block text-4xl text-white">{{ snapshot.totalCatalogs }}</strong>
          <p class="mt-2 text-sm text-emerald-50/70">Tiendas no congeladas y operativas dentro del cluster.</p>
        </div>
        <div class="rounded-[28px] border border-amber-300/20 bg-amber-400/10 p-5 backdrop-blur">
          <p class="text-xs uppercase tracking-[0.22em] text-amber-100/70">Interacciones Ecosistema</p>
          <strong class="mt-3 block text-4xl text-white">{{ snapshot.ecosystemInteractions }}</strong>
          <p class="mt-2 text-sm text-amber-50/70">Pedidos persistidos + reseñas registradas en todos los tenants.</p>
        </div>
        <div class="rounded-[28px] border border-rose-300/20 bg-rose-500/10 p-5 backdrop-blur">
          <p class="text-xs uppercase tracking-[0.22em] text-rose-100/70">Congelados</p>
          <strong class="mt-3 block text-4xl text-white">{{ frozenBusinesses }}</strong>
          <p class="mt-2 text-sm text-rose-50/70">Negocios suspendidos y fuera de lectura pública.</p>
        </div>
      </div>

      <section class="rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.18)] backdrop-blur">
        <div class="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p class="text-xs uppercase tracking-[0.22em] text-white/45">Tenants en vivo</p>
            <h2 class="mt-2 text-3xl font-semibold text-white">Tabla estelar de negocios</h2>
          </div>
          <div class="text-sm text-white/50">
            {{ snapshot.businesses.length }} registros sincronizados
          </div>
        </div>

        <div v-if="loading" class="mt-6 rounded-[28px] border border-dashed border-white/15 bg-black/15 px-6 py-10 text-center text-white/60">
          Sincronizando estado global...
        </div>

        <div v-else class="mt-6 overflow-hidden rounded-[28px] border border-white/10">
          <div class="overflow-x-auto">
            <table class="min-w-full divide-y divide-white/10 text-sm">
              <thead class="bg-black/20 text-left text-white/55">
                <tr>
                  <th class="px-4 py-4 font-medium">Negocio</th>
                  <th class="px-4 py-4 font-medium">Owner</th>
                  <th class="px-4 py-4 font-medium">Plan</th>
                  <th class="px-4 py-4 font-medium">Interacciones</th>
                  <th class="px-4 py-4 font-medium">Estado</th>
                  <th class="px-4 py-4 font-medium">Accion</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-white/10 bg-white/5">
                <tr v-for="business in snapshot.businesses" :key="business.id" class="align-top">
                  <td class="px-4 py-4">
                    <strong class="block text-white">{{ business.businessName }}</strong>
                    <span class="text-white/50">/b/{{ business.slug }}</span>
                  </td>
                  <td class="px-4 py-4">
                    <strong class="block text-white">{{ business.ownerName }}</strong>
                    <span class="text-white/50">{{ business.ownerEmail }}</span>
                  </td>
                  <td class="px-4 py-4">
                    <span class="inline-flex rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-amber-100/80">
                      {{ business.planTier }}
                    </span>
                  </td>
                  <td class="px-4 py-4 text-white/70">
                    <strong class="block text-white">{{ business.totalOrders + business.totalReviews }}</strong>
                    <span>{{ business.totalOrders }} pedidos / {{ business.totalReviews }} reseñas</span>
                  </td>
                  <td class="px-4 py-4">
                    <span
                      :class="business.isBanned ? 'bg-rose-500/20 text-rose-100 border-rose-300/20' : 'bg-emerald-500/20 text-emerald-100 border-emerald-300/20'"
                      class="inline-flex rounded-full border px-3 py-1 text-xs uppercase tracking-[0.18em]"
                    >
                      {{ business.isBanned ? 'Congelado' : 'Activo' }}
                    </span>
                    <span class="mt-2 block text-xs text-white/45">{{ formatDate(business.createdAt) }}</span>
                  </td>
                  <td class="px-4 py-4">
                    <button
                      type="button"
                      class="inline-flex min-h-[44px] items-center justify-center rounded-2xl px-4 py-2 font-medium text-white transition"
                      :class="business.isBanned ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-rose-600 hover:bg-rose-500'"
                      :disabled="pendingIds.includes(business.id)"
                      @click="toggleBan(business.id, !business.isBanned)"
                    >
                      {{ pendingIds.includes(business.id) ? 'Procesando...' : (business.isBanned ? 'Reactivar' : 'Banear / Congelar') }}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <p v-if="errorMessage" class="mt-4 text-sm text-rose-300">{{ errorMessage }}</p>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { MasterDashboardSnapshot } from '~/composables/useSupabaseBackend'

const authStore = useAuthStore()
const backend = useSupabaseBackend()

const snapshot = ref<MasterDashboardSnapshot>({
  totalCatalogs: 0,
  ecosystemInteractions: 0,
  businesses: [],
})
const loading = ref(true)
const errorMessage = ref('')
const pendingIds = ref<string[]>([])

const frozenBusinesses = computed(() => snapshot.value.businesses.filter(item => item.isBanned).length)

let stopDashboardWatcher: (() => void) | null = null

const syncDashboard = async () => {
  try {
    snapshot.value = await backend.getMasterDashboard()
    errorMessage.value = ''
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'No se pudo cargar el tablero global.'
  } finally {
    loading.value = false
  }
}

const toggleBan = async (catalogId: string, isBanned: boolean) => {
  pendingIds.value = [...pendingIds.value, catalogId]
  try {
    await backend.updateCatalogBanStatus(catalogId, isBanned)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'No se pudo cambiar el estado del negocio.'
  } finally {
    pendingIds.value = pendingIds.value.filter(item => item !== catalogId)
  }
}

const formatDate = (value: string) => {
  if (!value) {
    return 'Fecha no disponible'
  }

  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

onMounted(async () => {
  await syncDashboard()
  stopDashboardWatcher = backend.watchMasterDashboard(
    async (payload) => {
      snapshot.value = payload
      loading.value = false
    },
    (error) => {
      errorMessage.value = error.message
      loading.value = false
    },
  )
})

onBeforeUnmount(() => {
  stopDashboardWatcher?.()
})
</script>
