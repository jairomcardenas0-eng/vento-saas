<template>
  <AdminStatePanel
    v-if="!catalog"
    title="No hay un catalogo activo"
    description="Selecciona un catalogo para revisar los pedidos."
  />

  <div v-else ref="pageRef" class="admin-grid">
    <section class="panel-card span-2 min-w-0">
      <UiSectionHeader eyebrow="Operacion" title="Pedidos en tiempo real" description="Bandeja operativa con SLA, timeline, asignacion y seguimiento interno." />

      <div class="mb-4 grid gap-3 lg:grid-cols-[1.2fr,0.8fr]">
        <div class="rounded-[22px] border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
          <label class="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">Buscar en la bandeja cargada</label>
          <div class="mt-2 flex items-center gap-2 rounded-[18px] border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950">
            <span class="text-zinc-400">⌕</span>
            <input
              v-model.trim="rawSearchTerm"
              type="search"
              inputmode="search"
              placeholder="Cliente, ID o producto"
              class="w-full bg-transparent text-sm outline-none placeholder:text-zinc-400"
            >
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <article class="metric-card">
            <p class="metric-label">Ventas del mes</p>
            <p class="metric-value">{{ money(ordersStore.monthSales, catalog.settings.currency) }}</p>
          </article>
          <article class="metric-card">
            <p class="metric-label">Cargados</p>
            <p class="metric-value">{{ ordersStore.items.length }}/{{ ordersStore.filteredTotal }}</p>
          </article>
        </div>
      </div>

      <div class="mb-4 space-y-3">
        <div
          v-if="ordersStore.loading"
          class="rounded-[18px] border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300"
        >
          <span class="flex items-center gap-2">
            <svg class="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Actualizando caja y pedidos en tiempo real...
          </span>
        </div>
        <div
          v-if="ordersStore.realtimeError"
          class="rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300"
        >
          {{ ordersStore.realtimeError }}
        </div>
      </div>

      <div class="order-filters" role="tablist" aria-label="Filtros de pedidos">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="order-filter"
          :class="{ 'is-active': ordersStore.currentFilter === tab.key }"
          @click="setActiveTab(tab.key)"
        >
          <span class="order-filter-label">{{ tab.label }}</span>
          <span class="text-xs opacity-70">{{ tab.count }}</span>
        </button>
      </div>

      <div class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-zinc-200 bg-zinc-50/70 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-300">
        <span>
          Mostrando <strong>{{ visibleOrders.length }}</strong> de <strong>{{ ordersStore.filteredTotal }}</strong> pedidos en <strong>{{ activeTabLabel }}</strong>.
        </span>
        <span v-if="ordersStore.remainingCount > 0" class="text-xs uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500">
          Restan {{ ordersStore.remainingCount }}
        </span>
      </div>

      <div v-if="!visibleOrders.length" class="rounded-[20px] border border-dashed border-zinc-300 px-6 py-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        {{ emptyStateMessage }}
      </div>

      <div v-else class="table-list">
        <UiVirtualList
          v-if="shouldVirtualizeOrders"
          :items="visibleOrders"
          :item-height="148"
          :max-height="840"
          class="admin-virtual-list"
        >
          <template #default="{ item: order }">
            <article class="list-row min-w-0">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <strong class="block break-words">#{{ order.id }}</strong>
                  <span class="status-pill" :class="`status-${normalizeStatus(order.status)}`">{{ statusLabel(order.status) }}</span>
                  <span class="sla-pill" :class="`sla-${slaState(order.createdAt)}`">{{ elapsedLabel(order.createdAt) }}</span>
                  <span v-if="order.internalNotes?.trim()" class="note-pill" title="Este pedido tiene notas internas">Nota</span>
                </div>
                <p class="mt-1 break-words text-sm font-medium text-zinc-800 dark:text-zinc-100">{{ order.customerName || 'Cliente sin nombre' }}</p>
                <p class="break-words">{{ order.items.map(item => `${item.qty}x ${item.productName}`).join(', ') }}</p>
                <small class="inline-muted block break-words">
                  {{ new Date(order.createdAt).toLocaleString('es-MX') }} · {{ deliveryModeLabel(order.deliveryMode) }} · {{ order.deliveryZoneName || 'Sin zona' }}
                </small>
              </div>
              <div class="row-meta wrap min-w-0">
                <span>{{ money(order.total, catalog.settings.currency) }}</span>
                <button class="ghost-btn small" @click="openStatusModal(order)">Cambiar estado</button>
                <button class="ghost-btn small" @click="openOrderDetail(order)">Ver detalle</button>
              </div>
            </article>
          </template>
        </UiVirtualList>

        <template v-else>
          <article v-for="order in visibleOrders" :key="order.id" class="list-row min-w-0">
            <div class="min-w-0">
              <div class="flex flex-wrap items-center gap-2">
                <strong class="block break-words">#{{ order.id }}</strong>
                <span class="status-pill" :class="`status-${normalizeStatus(order.status)}`">{{ statusLabel(order.status) }}</span>
                <span class="sla-pill" :class="`sla-${slaState(order.createdAt)}`">{{ elapsedLabel(order.createdAt) }}</span>
                <span v-if="order.internalNotes?.trim()" class="note-pill" title="Este pedido tiene notas internas">Nota</span>
              </div>
              <p class="mt-1 break-words text-sm font-medium text-zinc-800 dark:text-zinc-100">{{ order.customerName || 'Cliente sin nombre' }}</p>
              <p class="break-words">{{ order.items.map(item => `${item.qty}x ${item.productName}`).join(', ') }}</p>
              <small class="inline-muted block break-words">
                {{ new Date(order.createdAt).toLocaleString('es-MX') }} · {{ deliveryModeLabel(order.deliveryMode) }} · {{ order.deliveryZoneName || 'Sin zona' }}
              </small>
            </div>
            <div class="row-meta wrap min-w-0">
              <span>{{ money(order.total, catalog.settings.currency) }}</span>
              <button class="ghost-btn small" @click="openStatusModal(order)">Cambiar estado</button>
              <button class="ghost-btn small" @click="openOrderDetail(order)">Ver detalle</button>
            </div>
          </article>
        </template>
      </div>

      <div class="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p class="text-xs uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500">
          {{ ordersStore.listening ? 'Realtime activo' : 'Realtime en espera' }}
        </p>
        <button v-if="ordersStore.hasMore" class="ghost-btn" :disabled="ordersStore.loadingMore" @click="ordersStore.loadMore()">
          {{ ordersStore.loadingMore ? 'Cargando mas pedidos...' : `Cargar ${Math.min(ordersStore.remainingCount || 25, 25)} mas` }}
        </button>
      </div>
    </section>

    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="selectedOrder" class="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm" @click.self="selectedOrder = null">
        <div class="absolute inset-x-4 inset-y-4 mx-auto max-w-5xl overflow-y-auto rounded-[32px] border border-zinc-200 bg-white/95 p-6 shadow-[0_30px_90px_rgba(16,12,10,0.28)] dark:border-zinc-800 dark:bg-zinc-950/95">
          <div class="mb-5 flex items-start justify-between gap-4">
            <div class="min-w-0">
              <p class="eyebrow">Pedido</p>
              <h3 class="m-0 break-all text-2xl text-zinc-900 dark:text-zinc-100">#{{ selectedOrder.id }}</h3>
              <p class="section-copy mt-2 text-sm">{{ new Date(selectedOrder.createdAt).toLocaleString('es-MX') }}</p>
              <div class="mt-3 flex flex-wrap gap-2">
                <span class="status-pill" :class="`status-${normalizeStatus(selectedOrder.status)}`">{{ statusLabel(selectedOrder.status) }}</span>
                <span class="sla-pill" :class="`sla-${slaState(selectedOrder.createdAt)}`">{{ elapsedLabel(selectedOrder.createdAt) }}</span>
              </div>
            </div>
            <button class="ghost-btn small" @click="selectedOrder = null">Cerrar</button>
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <div class="rounded-[24px] border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <strong class="block text-zinc-900 dark:text-zinc-100">Cliente</strong>
              <p class="mt-2 break-words text-sm text-zinc-600 dark:text-zinc-300">{{ selectedOrder.customerName || 'Sin nombre' }}</p>
              <p class="mt-2 break-words text-sm text-zinc-600 dark:text-zinc-300">{{ selectedOrder.customerAddress || 'Sin direccion' }}</p>
              <p class="mt-2 break-words text-sm text-zinc-600 dark:text-zinc-300">Pago: {{ selectedOrder.paymentMethod || 'Pendiente' }}</p>
            </div>
            <div class="rounded-[24px] border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <strong class="block text-zinc-900 dark:text-zinc-100">Operacion</strong>
              <p class="mt-2 text-sm text-zinc-600 dark:text-zinc-300">Modalidad: {{ deliveryModeLabel(selectedOrder.deliveryMode) }}</p>
              <p class="mt-2 text-sm text-zinc-600 dark:text-zinc-300">Zona: {{ selectedOrder.deliveryZoneName || 'No aplica' }}</p>
              <p class="mt-2 text-sm text-zinc-600 dark:text-zinc-300">Estado: {{ statusLabel(selectedOrder.status) }}</p>
              <p class="mt-2 text-sm text-zinc-600 dark:text-zinc-300">Asignado a: {{ selectedOrder.assignedToName || 'Sin asignar' }}</p>
              <div class="mt-4 flex flex-wrap gap-2">
                <button
                  v-for="nextStatus in getAllowedTransitions(selectedOrder.status)"
                  :key="nextStatus"
                  class="ghost-btn small"
                  @click="openStatusModal(selectedOrder, nextStatus)"
                >
                  {{ transitionButtonLabel(nextStatus) }}
                </button>
              </div>
            </div>
          </div>

          <div class="mt-5 rounded-[24px] border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <strong class="block text-zinc-900 dark:text-zinc-100">Lineas del pedido</strong>
            <div class="mt-4 space-y-3">
              <article v-for="item in selectedOrder.items" :key="`${selectedOrder.id}-${item.productId}-${item.productName}`" class="rounded-[18px] border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
                <div class="flex flex-wrap items-start justify-between gap-4">
                  <div class="min-w-0">
                    <strong class="block break-words text-zinc-900 dark:text-zinc-100">{{ item.qty }}x {{ item.productName }}</strong>
                    <p v-if="item.variantSummary.length" class="mt-2 break-words text-sm text-zinc-500 dark:text-zinc-400">{{ item.variantSummary.join(', ') }}</p>
                  </div>
                  <strong class="text-zinc-900 dark:text-zinc-100">{{ money(item.totalPrice, catalog.settings.currency) }}</strong>
                </div>
              </article>
            </div>
          </div>

          <div class="mt-5 rounded-[24px] border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <strong class="block text-zinc-900 dark:text-zinc-100">Resumen financiero</strong>
            <div class="mt-3 space-y-2 text-sm text-zinc-600 dark:text-zinc-300">
              <div class="flex items-center justify-between"><span>Subtotal</span><strong>{{ money(selectedOrder.subtotal || selectedOrder.total, catalog.settings.currency) }}</strong></div>
              <div class="flex items-center justify-between"><span>Descuento</span><strong>-{{ money(selectedOrder.discountTotal || 0, catalog.settings.currency) }}</strong></div>
              <div class="flex items-center justify-between"><span>Envio</span><strong>{{ money(selectedOrder.deliveryFee || 0, catalog.settings.currency) }}</strong></div>
              <div class="flex items-center justify-between border-t border-zinc-200 pt-2 dark:border-zinc-800"><span>Total</span><strong class="text-lg text-zinc-900 dark:text-zinc-100">{{ money(selectedOrder.total, catalog.settings.currency) }}</strong></div>
              <div v-if="selectedOrder.appliedCoupon?.code" class="pt-2 text-xs uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">Cupon aplicado: {{ selectedOrder.appliedCoupon.code }}</div>
            </div>
          </div>

          <div class="mt-5 grid gap-4 md:grid-cols-[0.95fr,1.05fr]">
            <div class="rounded-[24px] border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <strong class="block text-zinc-900 dark:text-zinc-100">Seguimiento interno</strong>
              <label class="mt-4 block text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">Asignado a</label>
              <select
                v-model="workflowDraft.assignedToUid"
                class="mt-2 w-full rounded-[16px] border border-zinc-200 bg-white px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                @change="applySelectedAssignee"
              >
                <option value="">Sin asignar</option>
                <option v-for="member in teamMembers" :key="member.id" :value="member.id">
                  {{ member.name }} · {{ member.email }}
                </option>
              </select>
              <p class="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                Responsable actual: {{ workflowDraft.assignedToName || 'Sin asignar' }}
              </p>

              <label class="mt-4 block text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">Notas internas</label>
              <textarea
                v-model.trim="workflowDraft.internalNotes"
                rows="5"
                placeholder="Notas para el equipo, SLA, incidencias o contexto del pedido."
                class="mt-2 w-full rounded-[16px] border border-zinc-200 bg-white px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
                @blur="saveWorkflow"
              />
              <div class="mt-4 flex flex-wrap items-center gap-3">
                <button class="ghost-btn" :disabled="savingWorkflow" @click="saveWorkflow">
                  {{ savingWorkflow ? 'Guardando...' : 'Guardar seguimiento' }}
                </button>
                <span v-if="workflowSavedMessage" class="text-xs uppercase tracking-[0.14em] text-emerald-600 dark:text-emerald-400">{{ workflowSavedMessage }}</span>
              </div>
            </div>

            <div class="rounded-[24px] border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <strong class="block text-zinc-900 dark:text-zinc-100">Timeline</strong>
              <div class="mt-4">
                <ClientOnly>
                  <AdminOrderTimeline :order-id="selectedOrder.id" :catalog-id="selectedOrder.catalogId" />
                  <template #fallback>
                    <div class="h-40 animate-pulse rounded-[18px] bg-zinc-100 dark:bg-zinc-950" />
                  </template>
                </ClientOnly>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div v-if="statusModal.open && statusModal.order" class="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="closeStatusModal" />
        <div class="relative z-10 w-full max-w-lg rounded-[28px] border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
          <div class="flex items-start justify-between gap-4">
            <div>
              <p class="eyebrow">Cambio de estado</p>
              <h3 class="m-0 text-xl text-zinc-900 dark:text-zinc-100">Pedido #{{ statusModal.order.id }}</h3>
            </div>
            <button class="ghost-btn small" @click="closeStatusModal">Cerrar</button>
          </div>

          <label class="mt-5 block text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">Nuevo estado</label>
          <select v-model="statusModal.nextStatus" class="mt-2 w-full rounded-[16px] border border-zinc-200 bg-white px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-950">
            <option v-for="option in statusModal.options" :key="option" :value="option">
              {{ statusLabel(option) }}
            </option>
          </select>

          <label class="mt-5 block text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">Nota interna</label>
          <textarea
            v-model.trim="statusModal.note"
            rows="4"
            placeholder="Motivo, contexto o instruccion para el equipo."
            class="mt-2 w-full rounded-[16px] border border-zinc-200 bg-white px-4 py-3 text-sm dark:border-zinc-800 dark:bg-zinc-950"
          />

          <div class="mt-5 flex justify-end gap-3">
            <button class="ghost-btn" @click="closeStatusModal">Cancelar</button>
            <button class="solid-btn" :disabled="savingStatusModal" @click="confirmStatusChange">
              {{ savingStatusModal ? 'Guardando...' : 'Confirmar' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import type { CatalogOrder, CatalogTeamMember, OrderStatus } from '~/types/catalog'
import { money } from '~/utils/catalog'
import type { OrdersFilterKey } from '~/stores/orders'

definePageMeta({ layout: 'admin' })

const catalogStore = useCatalogStore()
const ordersStore = useOrdersStore()
const backend = useSupabaseBackend()
const nuxtApp = useNuxtApp()
const $supabase = nuxtApp.$supabase as any
const AdminOrderTimeline = defineAsyncComponent(() => import('~/components/admin/OrderTimeline.vue'))
const { registerCleanup } = useMemoryManager()
const catalog = computed(() => catalogStore.activeCatalog)
const pageRef = ref<HTMLElement | null>(null)
const selectedOrder = ref<CatalogOrder | null>(null)
const rawSearchTerm = ref('')
const searchTerm = ref('')
const savingWorkflow = ref(false)
const savingStatusModal = ref(false)
const workflowSavedMessage = ref('')
const teamMembers = ref<CatalogTeamMember[]>([])
const statusCounts = ref({
  new: 0,
  preparing: 0,
  ready: 0,
  cancelled: 0,
})
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null

const workflowDraft = ref({
  assignedToUid: '',
  assignedToName: '',
  internalNotes: '',
})

const statusModal = reactive<{
  open: boolean
  order: CatalogOrder | null
  nextStatus: OrderStatus
  note: string
  options: OrderStatus[]
}>({
  open: false,
  order: null,
  nextStatus: 'viewed',
  note: '',
  options: [],
})

const normalizeStatus = (status: OrderStatus) => {
  if (status === 'viewed' || status === 'ready') {
    return 'preparing'
  }

  if (status === 'closed' || status === 'completed' || status === 'delivered') {
    return 'completed'
  }

  return status
}

const statusLabel = (status: OrderStatus | string) => {
  if (status === 'new') return 'Nuevo'
  if (status === 'viewed') return 'Visto'
  if (status === 'preparing') return 'Preparando'
  if (status === 'ready') return 'Listo'
  if (status === 'delivered') return 'Entregado'
  if (status === 'completed') return 'Completado'
  if (status === 'closed') return 'Cerrado'
  if (status === 'cancelled') return 'Cancelado'
  return String(status)
}

const deliveryModeLabel = (mode: CatalogOrder['deliveryMode']) =>
  mode === 'delivery' ? 'Entrega a domicilio' : 'Recogida'

const tabs = computed(() => [
  { key: 'all' as const, label: 'Todos', count: ordersStore.stats.total },
  { key: 'new' as const, label: 'Nuevos', count: statusCounts.value.new },
  { key: 'preparing' as const, label: 'En preparacion', count: statusCounts.value.preparing + statusCounts.value.ready },
  { key: 'completed' as const, label: 'Entregados', count: ordersStore.stats.completed },
  { key: 'cancelled' as const, label: 'Cancelados', count: statusCounts.value.cancelled },
])

const activeTabLabel = computed(() =>
  tabs.value.find(tab => tab.key === ordersStore.currentFilter)?.label || 'Todos',
)

const visibleOrders = computed(() => {
  const needle = searchTerm.value.trim().toLowerCase()
  if (!needle) {
    return ordersStore.items
  }

  return ordersStore.items.filter((order) => {
    const haystack = [
      order.id,
      order.customerName,
      order.customerAddress,
      order.deliveryZoneName,
      order.paymentMethod,
      order.assignedToName,
      ...order.items.map(item => item.productName),
    ]

    return haystack.some(value => String(value || '').toLowerCase().includes(needle))
  })
})

const shouldVirtualizeOrders = computed(() => visibleOrders.value.length > 40)

const emptyStateMessage = computed(() => {
  if (searchTerm.value.trim()) {
    return `No hubo coincidencias dentro de la bandeja cargada para "${searchTerm.value.trim()}".`
  }

  return `No hay pedidos en ${activeTabLabel.value.toLowerCase()}.`
})

const getAllowedTransitions = (status: OrderStatus): OrderStatus[] => {
  if (status === 'new') return ['viewed', 'cancelled']
  if (status === 'viewed') return ['preparing', 'cancelled']
  if (status === 'preparing') return ['ready', 'cancelled']
  if (status === 'ready') return ['delivered', 'cancelled']
  return []
}

const transitionButtonLabel = (status: OrderStatus) => {
  if (status === 'viewed') return 'Marcar visto'
  if (status === 'preparing') return 'Pasar a preparacion'
  if (status === 'ready') return 'Marcar listo'
  if (status === 'delivered') return 'Marcar entregado'
  if (status === 'cancelled') return 'Cancelar pedido'
  return statusLabel(status)
}

const elapsedMinutes = (createdAt: string) => {
  const parsed = Date.parse(createdAt)
  if (Number.isNaN(parsed)) return 0
  return Math.max(0, Math.floor((Date.now() - parsed) / 60000))
}

const elapsedLabel = (createdAt: string) => {
  const minutes = elapsedMinutes(createdAt)
  if (minutes < 1) return 'Hace segundos'
  if (minutes < 60) return `Hace ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `Hace ${hours}h`
  const days = Math.floor(hours / 24)
  return `Hace ${days}d`
}

const slaState = (createdAt: string) => {
  const minutes = elapsedMinutes(createdAt)
  if (minutes < 15) return 'green'
  if (minutes < 60) return 'yellow'
  return 'red'
}

const loadTeamMembers = async (catalogId: string) => {
  teamMembers.value = await backend.getTeamMembers(catalogId).catch(() => [])
}

const refreshStatusCounts = async (catalogId: string) => {
  const [newRes, preparingRes, readyRes, cancelledRes] = await Promise.all([
    $supabase.from('orders').select('id', { count: 'exact', head: true }).eq('catalog_id', catalogId).eq('status', 'new'),
    $supabase.from('orders').select('id', { count: 'exact', head: true }).eq('catalog_id', catalogId).in('status', ['viewed', 'preparing']),
    $supabase.from('orders').select('id', { count: 'exact', head: true }).eq('catalog_id', catalogId).eq('status', 'ready'),
    $supabase.from('orders').select('id', { count: 'exact', head: true }).eq('catalog_id', catalogId).eq('status', 'cancelled'),
  ])

  statusCounts.value = {
    new: Number(newRes.count || 0),
    preparing: Number(preparingRes.count || 0),
    ready: Number(readyRes.count || 0),
    cancelled: Number(cancelledRes.count || 0),
  }
}

const refreshOrdersBoard = async () => {
  if (!catalog.value?.id) {
    return
  }

  await Promise.all([
    ordersStore.hydrate(catalog.value.id, { filter: ordersStore.currentFilter }),
    loadTeamMembers(catalog.value.id),
    refreshStatusCounts(catalog.value.id),
  ])
}

watch(selectedOrder, (value) => {
  workflowSavedMessage.value = ''
  workflowDraft.value = {
    assignedToUid: value?.assignedToUid || '',
    assignedToName: value?.assignedToName || '',
    internalNotes: value?.internalNotes || '',
  }
})

watch(rawSearchTerm, (value) => {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
  }

  searchDebounceTimer = setTimeout(() => {
    searchTerm.value = value
  }, 220)
})

watch(catalog, (value) => {
  if (!value) {
    ordersStore.stopRealtime()
    return
  }

  ordersStore.startRealtime(value.id)
  void loadTeamMembers(value.id)
  void refreshStatusCounts(value.id)
}, { immediate: true })

watch(() => ordersStore.items.map(order => `${order.id}:${order.status}`).join('|'), () => {
  if (catalog.value?.id) {
    void refreshStatusCounts(catalog.value.id)
  }
})

registerCleanup(() => {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer)
    searchDebounceTimer = null
  }
})
registerCleanup(() => {
  ordersStore.stopRealtime()
})

const setActiveTab = async (filter: OrdersFilterKey) => {
  rawSearchTerm.value = ''
  searchTerm.value = ''
  selectedOrder.value = null
  await ordersStore.setFilter(filter)
}

const activeTabIndex = computed(() => tabs.value.findIndex(tab => tab.key === ordersStore.currentFilter))
const moveTab = (direction: 1 | -1) => {
  const nextTab = tabs.value[activeTabIndex.value + direction]
  if (nextTab) {
    void setActiveTab(nextTab.key)
  }
}

useTouchGestures(pageRef, {
  onPullRefresh: refreshOrdersBoard,
  onSwipeLeft: () => moveTab(1),
  onSwipeRight: () => moveTab(-1),
})

const openOrderDetail = async (order: CatalogOrder) => {
  selectedOrder.value = order
  if (!catalog.value || order.status !== 'new') {
    return
  }

  await backend.updateOrderStatus(catalog.value.id, order.id, {
    status: 'viewed',
    assignedToUid: order.assignedToUid || null,
    assignedToName: order.assignedToName || null,
    internalNotes: order.internalNotes || '',
  })

  order.status = 'viewed'
  if (selectedOrder.value?.id === order.id) {
    selectedOrder.value.status = 'viewed'
  }
  await refreshStatusCounts(catalog.value.id)
}

const openStatusModal = (order: CatalogOrder, preferredStatus?: OrderStatus) => {
  const options = getAllowedTransitions(order.status)
  if (!options.length) {
    return
  }

  statusModal.open = true
  statusModal.order = order
  statusModal.options = options
  statusModal.nextStatus = preferredStatus && options.includes(preferredStatus) ? preferredStatus : options[0] || 'cancelled'
  statusModal.note = ''
}

const closeStatusModal = () => {
  statusModal.open = false
  statusModal.order = null
  statusModal.nextStatus = 'viewed'
  statusModal.note = ''
  statusModal.options = []
}

const confirmStatusChange = async () => {
  if (!catalog.value || !statusModal.order) {
    return
  }

  savingStatusModal.value = true
  try {
    await backend.updateOrderStatus(catalog.value.id, statusModal.order.id, {
      status: statusModal.nextStatus,
      note: statusModal.note || '',
      assignedToUid: statusModal.order.assignedToUid || null,
      assignedToName: statusModal.order.assignedToName || null,
      internalNotes: statusModal.order.internalNotes || '',
    })

    statusModal.order.status = statusModal.nextStatus
    if (selectedOrder.value?.id === statusModal.order.id) {
      selectedOrder.value.status = statusModal.nextStatus
    }
    await refreshStatusCounts(catalog.value.id)
    closeStatusModal()
  } finally {
    savingStatusModal.value = false
  }
}

const applySelectedAssignee = () => {
  const member = teamMembers.value.find(item => item.id === workflowDraft.value.assignedToUid)
  workflowDraft.value.assignedToName = member?.name || ''
}

const saveWorkflow = async () => {
  if (!catalog.value || !selectedOrder.value) {
    return
  }

  savingWorkflow.value = true
  workflowSavedMessage.value = ''

  try {
    await backend.updateOrderStatus(catalog.value.id, selectedOrder.value.id, {
      status: selectedOrder.value.status,
      assignedToName: workflowDraft.value.assignedToName || null,
      assignedToUid: workflowDraft.value.assignedToUid || null,
      internalNotes: workflowDraft.value.internalNotes || '',
    })

    selectedOrder.value.assignedToName = workflowDraft.value.assignedToName || null
    selectedOrder.value.assignedToUid = workflowDraft.value.assignedToUid || null
    selectedOrder.value.internalNotes = workflowDraft.value.internalNotes || ''
    workflowSavedMessage.value = 'Seguimiento guardado'
    await refreshStatusCounts(catalog.value.id)
  } finally {
    savingWorkflow.value = false
  }
}
</script>

<style scoped>
.table-list {
  content-visibility: auto;
}

.admin-virtual-list {
  border-radius: 22px;
}

.admin-virtual-list :deep(.virtual-list-item + .virtual-list-item) {
  margin-top: 0.75rem;
}

.order-filters {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.order-filter {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  border-radius: 18px;
  border: 1.5px solid rgba(148, 163, 184, 0.25);
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.95), rgba(248, 250, 252, 0.9));
  color: #1e293b;
  padding: 0.65rem 0.6rem;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  min-width: 0;
  overflow: hidden;
}

.order-filter:hover {
  border-color: rgba(59, 130, 246, 0.5);
  background: linear-gradient(160deg, rgba(239, 246, 255, 0.95), rgba(219, 234, 254, 0.9));
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
}

.order-filter.is-active {
  border-color: rgba(37, 99, 235, 0.8);
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  color: #fff;
  box-shadow: 0 8px 24px rgba(37, 99, 235, 0.3);
  transform: translateY(-1px);
}

.order-filter-label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
}

.metric-card {
  border-radius: 18px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: linear-gradient(160deg, rgba(15, 23, 42, 0.06), rgba(15, 23, 42, 0.02));
  padding: 0.95rem 0.9rem;
  text-align: center;
}

.metric-label {
  margin: 0;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #64748b;
  font-weight: 700;
}

.metric-value {
  margin: 0.35rem 0 0;
  font-size: 1.2rem;
  line-height: 1.15;
  font-weight: 800;
  color: #0f172a;
}

.status-pill,
.sla-pill,
.note-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.25rem 0.65rem;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.status-new {
  background: rgba(59, 130, 246, 0.12);
  color: #1d4ed8;
}

.status-preparing {
  background: rgba(245, 158, 11, 0.14);
  color: #b45309;
}

.status-completed {
  background: rgba(34, 197, 94, 0.14);
  color: #15803d;
}

.status-cancelled {
  background: rgba(239, 68, 68, 0.14);
  color: #b91c1c;
}

.sla-green {
  background: rgba(34, 197, 94, 0.14);
  color: #15803d;
}

.sla-yellow {
  background: rgba(245, 158, 11, 0.14);
  color: #b45309;
}

.sla-red {
  background: rgba(239, 68, 68, 0.14);
  color: #b91c1c;
}

.note-pill {
  background: rgba(24, 24, 27, 0.08);
  color: #3f3f46;
}

.dark .order-filter {
  border-color: rgba(100, 116, 139, 0.35);
  background: linear-gradient(160deg, rgba(15, 23, 42, 0.85), rgba(30, 41, 59, 0.8));
  color: #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.dark .order-filter:hover {
  border-color: rgba(59, 130, 246, 0.6);
  background: linear-gradient(160deg, rgba(30, 41, 59, 0.95), rgba(51, 65, 85, 0.9));
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
}

.dark .order-filter.is-active {
  border-color: rgba(59, 130, 246, 0.85);
  background: linear-gradient(135deg, #3b82f6, #2563eb);
  box-shadow: 0 8px 24px rgba(59, 130, 246, 0.4);
}

.dark .metric-card {
  border-color: rgba(100, 116, 139, 0.35);
  background: linear-gradient(160deg, rgba(15, 23, 42, 0.6), rgba(15, 23, 42, 0.3));
}

.dark .metric-label {
  color: #94a3b8;
}

.dark .metric-value {
  color: #f8fafc;
}

.dark .note-pill {
  background: rgba(244, 244, 245, 0.12);
  color: #e4e4e7;
}

@media (min-width: 480px) {
  .order-filter {
    font-size: 0.95rem;
    padding: 1rem 1.1rem;
    gap: 0.6rem;
  }
}

@media (min-width: 900px) {
  .order-filters {
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 1rem;
  }
}
</style>
