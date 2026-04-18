<template>
  <div v-if="catalog" class="admin-grid">
    <section class="panel-card span-2">
      <UiSectionHeader eyebrow="POS" title="Caja registradora en tiempo real" description="Pedidos entrando por snapshot con detalle expandible y control de estados." />

      <div class="order-filters" role="tablist" aria-label="Filtros de pedidos">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="order-filter"
          :class="{ 'is-active': activeTab === tab.key }"
          @click="activeTab = tab.key"
        >
          <span class="order-filter-label">{{ tab.label }}</span>
        </button>
      </div>


      <div class="table-list">
        <article v-for="order in filteredOrders" :key="order.id" class="list-row">
          <div>
            <strong>#{{ order.id }} · {{ order.customerName || 'Cliente sin nombre' }}</strong>
            <p>{{ order.items.map(item => `${item.qty}x ${item.productName}`).join(', ') }}</p>
            <small class="inline-muted">{{ new Date(order.createdAt).toLocaleString('es-MX') }} · {{ order.deliveryMode }} · {{ order.deliveryZoneName || 'Sin zona' }}</small>
          </div>
          <div class="row-meta wrap">
            <span>{{ money(order.total, catalog.settings.currency) }}</span>
            <select :value="normalizeStatus(order.status)" @change="changeStatus(order.id, ($event.target as HTMLSelectElement).value as any)">
              <option value="new">Nuevo</option>
              <option value="preparing">Preparando</option>
              <option value="completed">Completado</option>
              <option value="cancelled">Cancelado</option>
            </select>
            <button class="ghost-btn small" @click="selectedOrder = order">Ver detalle</button>
          </div>
        </article>
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
        <div class="absolute inset-y-4 right-4 left-4 mx-auto max-w-3xl overflow-y-auto rounded-[32px] border border-zinc-200 bg-white/95 p-6 shadow-[0_30px_90px_rgba(16,12,10,0.28)] dark:border-zinc-800 dark:bg-zinc-950/95">
          <div class="mb-5 flex items-start justify-between gap-4">
            <div>
              <p class="eyebrow">Pedido</p>
              <h3 class="m-0 text-2xl text-zinc-900 dark:text-zinc-100">#{{ selectedOrder.id }}</h3>
              <p class="section-copy mt-2 text-sm">{{ new Date(selectedOrder.createdAt).toLocaleString('es-MX') }}</p>
            </div>
            <button class="ghost-btn small" @click="selectedOrder = null">Cerrar</button>
          </div>

          <div class="grid gap-4 md:grid-cols-2">
            <div class="rounded-[24px] border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <strong class="block text-zinc-900 dark:text-zinc-100">Cliente</strong>
              <p class="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{{ selectedOrder.customerName || 'Sin nombre' }}</p>
              <p class="mt-2 text-sm text-zinc-600 dark:text-zinc-300">{{ selectedOrder.customerAddress || 'Sin direccion' }}</p>
              <p class="mt-2 text-sm text-zinc-600 dark:text-zinc-300">Pago: {{ selectedOrder.paymentMethod }}</p>
            </div>
            <div class="rounded-[24px] border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
              <strong class="block text-zinc-900 dark:text-zinc-100">Operacion</strong>
              <p class="mt-2 text-sm text-zinc-600 dark:text-zinc-300">Modalidad: {{ selectedOrder.deliveryMode }}</p>
              <p class="mt-2 text-sm text-zinc-600 dark:text-zinc-300">Zona: {{ selectedOrder.deliveryZoneName || 'No aplica' }}</p>
              <p class="mt-2 text-sm text-zinc-600 dark:text-zinc-300">Estado: {{ normalizeStatus(selectedOrder.status) }}</p>
            </div>
          </div>

          <div class="mt-5 rounded-[24px] border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <strong class="block text-zinc-900 dark:text-zinc-100">Lineas del pedido</strong>
            <div class="mt-4 space-y-3">
              <article v-for="item in selectedOrder.items" :key="`${selectedOrder.id}-${item.productId}-${item.productName}`" class="rounded-[18px] border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
                <div class="flex items-start justify-between gap-4">
                  <div>
                    <strong class="block text-zinc-900 dark:text-zinc-100">{{ item.qty }}x {{ item.productName }}</strong>
                    <p v-if="item.variantSummary.length" class="mt-2 text-sm text-zinc-500 dark:text-zinc-400">{{ item.variantSummary.join(', ') }}</p>
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
              <div v-if="selectedOrder.appliedCoupon?.code" class="pt-2 text-xs uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">Cupón aplicado: {{ selectedOrder.appliedCoupon.code }}</div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import type { CatalogOrder, OrderStatus } from '~/types/catalog'
import { money } from '~/utils/catalog'

definePageMeta({ layout: 'admin' })

const catalogStore = useCatalogStore()
const ordersStore = useOrdersStore()
const catalog = computed(() => catalogStore.activeCatalog)
const activeTab = ref<'all' | 'new' | 'preparing' | 'completed' | 'cancelled'>('all')
const selectedOrder = ref<CatalogOrder | null>(null)

const normalizeStatus = (status: OrderStatus) => {
  if (status === 'viewed') {
    return 'preparing'
  }
  if (status === 'closed') {
    return 'completed'
  }
  return status
}

const tabs = computed(() => [
  { key: 'all' as const, label: 'Todos', count: ordersStore.items.length },
  { key: 'new' as const, label: 'Pendientes', count: ordersStore.byStatus('new').length },
  { key: 'preparing' as const, label: 'En proceso', count: ordersStore.byStatus('preparing').length },
  { key: 'completed' as const, label: 'Completados', count: ordersStore.byStatus('completed').length },
  { key: 'cancelled' as const, label: 'Cancelados', count: ordersStore.byStatus('cancelled').length },
])

const filteredOrders = computed(() => {
  if (activeTab.value === 'all') {
    return ordersStore.items
  }

  return ordersStore.items.filter(order => normalizeStatus(order.status) === activeTab.value)
})

watch(catalog, (value) => {
  if (!value) {
    return
  }

  ordersStore.startRealtime(value.id)
}, { immediate: true })

onBeforeUnmount(() => {
  ordersStore.stopRealtime()
})

const changeStatus = async (orderId: string, status: OrderStatus) => {
  if (!catalog.value) {
    return
  }

  await ordersStore.updateStatus(catalog.value.id, orderId, status)
  if (selectedOrder.value?.id === orderId) {
    selectedOrder.value.status = status
  }
}
</script>

<style scoped>
.order-filters {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  margin-bottom: 1.25rem;
}

.order-filter {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.85rem;
  border-radius: 18px;
  border: 1.5px solid rgba(148, 163, 184, 0.25);
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.95), rgba(248, 250, 252, 0.9));
  color: #1e293b;
  padding: 1rem 1.1rem;
  font-size: 0.95rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
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

@media (min-width: 900px) {
  .order-filters {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}
</style>
