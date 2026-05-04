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
            <strong class="block text-base text-white">{{ authStore.displayName || authStore.user?.email?.split('@')[0] || 'Owner' }}</strong>
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
            {{ filteredBusinesses.length }} de {{ snapshot.businesses.length }} registros
          </div>
        </div>

        <div class="mt-5 flex flex-wrap gap-2">
          <button
            v-for="filter in planFilters"
            :key="filter.value"
            type="button"
            class="rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] transition"
            :class="selectedPlanStatus === filter.value ? 'border-amber-300/40 bg-amber-400/20 text-amber-50' : 'border-white/10 bg-black/20 text-white/60 hover:bg-white/10'"
            @click="selectedPlanStatus = filter.value"
          >
            {{ filter.label }}
          </button>
        </div>

        <div v-if="expiredBusinesses.length" class="mt-5 rounded-[24px] border border-amber-300/25 bg-amber-400/10 px-5 py-4 text-sm text-amber-50/90">
          <strong class="block text-amber-100">Alertas de catálogos expirados</strong>
          <p class="mt-2">
            {{ expiredBusinesses.map(item => item.businessName).join(', ') }}
          </p>
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
                <tr v-for="business in filteredBusinesses" :key="business.id" class="align-top">
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
                    <span class="mt-2 block text-xs text-white/45">
                      {{ business.planStatus || 'active' }}<template v-if="business.planExpiresAt"> · {{ formatDate(business.planExpiresAt) }}</template>
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
                    <div class="flex flex-col gap-2">
                      <button
                        type="button"
                        class="inline-flex min-h-[44px] items-center justify-center rounded-2xl px-4 py-2 font-medium text-white transition"
                        :class="business.isBanned ? 'bg-emerald-500 hover:bg-emerald-400' : 'bg-rose-600 hover:bg-rose-500'"
                        :disabled="pendingIds.includes(business.id)"
                        @click="toggleBan(business.id, !business.isBanned)"
                      >
                        {{ pendingIds.includes(business.id) ? 'Procesando...' : (business.isBanned ? 'Reactivar' : 'Banear / Congelar') }}
                      </button>
                      <button
                        type="button"
                        class="inline-flex min-h-[40px] items-center justify-center rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white transition hover:bg-white/15"
                        @click="openPlanModal(business)"
                      >
                        Cambiar plan
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <p v-if="errorMessage" class="mt-4 text-sm text-rose-300">{{ errorMessage }}</p>
      </section>

      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div v-if="planModalOpen && editingBusiness" class="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm" @click.self="closePlanModal">
          <div class="absolute inset-x-4 top-10 mx-auto max-w-xl rounded-[32px] border border-white/10 bg-[#120d0c] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.38)]">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-xs uppercase tracking-[0.22em] text-white/45">Cambio de plan</p>
                <h3 class="mt-2 text-2xl font-semibold text-white">{{ editingBusiness.businessName }}</h3>
              </div>
              <button type="button" class="rounded-full border border-white/10 px-3 py-2 text-xs text-white/70" @click="closePlanModal">Cerrar</button>
            </div>

            <div class="mt-5 grid gap-4">
              <label class="text-sm text-white/70">
                <span class="mb-2 block font-medium text-white">Plan</span>
                <select v-model="planDraft.planType" class="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none">
                  <option value="free">Free</option>
                  <option value="basic">Basic</option>
                  <option value="pro">Pro</option>
                  <option value="enterprise">Enterprise</option>
                </select>
              </label>
              <label class="text-sm text-white/70">
                <span class="mb-2 block font-medium text-white">Estado</span>
                <select v-model="planDraft.status" class="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none">
                  <option value="trial">Trial</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="blocked">Blocked</option>
                  <option value="expired">Expired</option>
                </select>
              </label>
              <label class="text-sm text-white/70">
                <span class="mb-2 block font-medium text-white">Razón</span>
                <textarea v-model.trim="planDraft.reason" rows="4" class="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-white outline-none" placeholder="Motivo del cambio manual" />
              </label>
            </div>

            <div class="mt-5 flex justify-end">
              <button type="button" class="rounded-2xl bg-amber-400 px-5 py-3 text-sm font-semibold text-stone-950 transition hover:bg-amber-300" :disabled="savingPlan" @click="savePlanChange">
                {{ savingPlan ? 'Guardando...' : 'Guardar cambio' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { MasterCatalogSnapshot, MasterDashboardSnapshot } from '~/composables/useSupabaseBackend'
import type { CatalogPlan } from '~/types/catalog'

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
const selectedPlanStatus = ref<'all' | CatalogPlan['status']>('all')
const planModalOpen = ref(false)
const savingPlan = ref(false)
const editingBusiness = ref<MasterCatalogSnapshot | null>(null)
const planDraft = reactive({
  planType: 'free' as CatalogPlan['planType'],
  status: 'active' as CatalogPlan['status'],
  reason: '',
})

const frozenBusinesses = computed(() => snapshot.value.businesses.filter(item => item.isBanned).length)
const expiredBusinesses = computed(() => snapshot.value.businesses.filter(item => item.planStatus === 'expired'))
const planFilters = [
  { value: 'all' as const, label: 'Todos' },
  { value: 'trial' as const, label: 'Trial' },
  { value: 'active' as const, label: 'Active' },
  { value: 'paused' as const, label: 'Paused' },
  { value: 'expired' as const, label: 'Expired' },
]
const filteredBusinesses = computed(() =>
  selectedPlanStatus.value === 'all'
    ? snapshot.value.businesses
    : snapshot.value.businesses.filter(item => item.planStatus === selectedPlanStatus.value),
)

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

const openPlanModal = (business: MasterCatalogSnapshot) => {
  editingBusiness.value = business
  planDraft.planType = (business.planTier === 'gold' ? 'pro' : business.planTier) as CatalogPlan['planType']
  planDraft.status = business.planStatus || 'active'
  planDraft.reason = ''
  planModalOpen.value = true
}

const closePlanModal = () => {
  planModalOpen.value = false
  editingBusiness.value = null
  planDraft.reason = ''
}

const savePlanChange = async () => {
  if (!editingBusiness.value || !planDraft.reason.trim()) {
    errorMessage.value = 'Debes indicar una razón para el cambio manual.'
    return
  }

  savingPlan.value = true
  try {
    await backend.upsertCatalogPlan(editingBusiness.value.id, {
      id: crypto.randomUUID(),
      planType: planDraft.planType,
      status: planDraft.status,
      activatedAt: new Date().toISOString(),
      expiresAt: editingBusiness.value.planExpiresAt || null,
      paymentReference: '',
      notes: planDraft.reason.trim(),
    }, planDraft.reason.trim())
    await syncDashboard()
    closePlanModal()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'No se pudo actualizar el plan.'
  } finally {
    savingPlan.value = false
  }
}

const dateFormatter = new Intl.DateTimeFormat('es-MX', {
  dateStyle: 'medium',
  timeStyle: 'short',
})
const formatDate = (value: string) => {
  if (!value) {
    return 'Fecha no disponible'
  }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'Fecha inválida'
  }
  return dateFormatter.format(date)
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
