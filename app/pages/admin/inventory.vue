<template>
  <div class="admin-grid" v-if="catalog">
    <section class="panel-card span-2">
      <UiSectionHeader
        eyebrow="Operacion"
        title="Inventario"
        description="Detecta productos agotados, stock bajo y referencias sin tracking."
      />

      <div class="inventory-toolbar">
        <select v-model="filter">
          <option value="all">Todos</option>
          <option value="out">Agotados</option>
          <option value="low">Bajo stock</option>
          <option value="ok">En stock</option>
          <option value="untracked">Sin tracking</option>
        </select>
        <span class="toolbar-stat">{{ filteredRows.length }} filas</span>
      </div>

      <div class="table-list">
        <article v-for="row in filteredRows" :key="row.rowKey" class="list-row inventory-row">
          <div>
            <strong>{{ row.productName }}</strong>
            <p>{{ row.variantLabel }}</p>
            <small class="inline-muted">{{ row.sku || 'Sin SKU' }}</small>
          </div>

          <div class="inventory-metrics">
            <span class="metric">Disponible: {{ row.available }}</span>
            <span class="metric">Reservado: {{ row.reserved }}</span>
            <span class="metric">Total: {{ row.quantity }}</span>
            <span class="status-pill" :class="`status-${row.status}`">{{ row.statusLabel }}</span>
          </div>
        </article>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { CatalogProduct, InventoryItem } from '~/types/catalog'

definePageMeta({ layout: 'admin' })

const catalogStore = useCatalogStore()
const catalog = computed(() => catalogStore.activeCatalog)
const filter = ref<'all' | 'out' | 'low' | 'ok' | 'untracked'>('all')

type InventoryRowView = {
  rowKey: string
  productName: string
  variantLabel: string
  sku: string
  quantity: number
  reserved: number
  available: number
  status: 'out' | 'low' | 'ok' | 'untracked'
  statusLabel: string
}

const rows = computed<InventoryRowView[]>(() => (catalogStore.products || []).flatMap((product) => {
  const inventoryItems = (product.inventoryItems || []).map(toInventoryRow)
  if (!inventoryItems.length) {
    return [{
      rowKey: `${product.id}-untracked`,
      productName: product.name,
      variantLabel: 'Sin inventario configurado',
      sku: '',
      quantity: 0,
      reserved: 0,
      available: 0,
      status: 'untracked',
      statusLabel: 'Sin tracking',
    }]
  }

  return inventoryItems.map((item) => ({
    rowKey: item.id,
    productName: product.name,
    variantLabel: resolveVariantLabel(product, item.variantOptionId),
    sku: item.sku,
    quantity: item.quantity,
    reserved: item.reserved,
    available: item.available,
    status: item.status,
    statusLabel: item.status === 'out'
      ? 'Agotado'
      : item.status === 'low'
        ? 'Bajo stock'
        : item.status === 'ok'
          ? 'En stock'
          : 'Sin tracking',
  }))
}))

const filteredRows = computed(() =>
  rows.value.filter(row => filter.value === 'all' || row.status === filter.value),
)

const toInventoryRow = (item: InventoryItem): InventoryItem & { available: number, status: InventoryRowView['status'] } => {
  const quantity = Number(item.quantity || 0)
  const reserved = Number(item.reserved || 0)
  const available = quantity - reserved
  const status = item.trackStock !== true
    ? 'untracked'
    : available <= 0
      ? 'out'
      : available <= Number(item.lowStockThreshold || 0)
        ? 'low'
        : 'ok'

  return {
    ...item,
    quantity,
    reserved,
    available,
    status,
  }
}

const resolveVariantLabel = (product: CatalogProduct, variantOptionId: string | null) => {
  if (!variantOptionId) {
    return 'Stock base'
  }

  for (const group of product.variants) {
    const option = group.options.find(entry => entry.id === variantOptionId)
    if (option) {
      return `${group.groupName}: ${option.name}`
    }
  }

  return 'Variante vinculada'
}
</script>

<style scoped>
.inventory-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.inventory-row {
  align-items: center;
}

.inventory-metrics {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.75rem;
  align-items: center;
}

.metric,
.status-pill {
  display: inline-flex;
  align-items: center;
  padding: 0.3rem 0.65rem;
  border-radius: 999px;
  font-size: 0.74rem;
  font-weight: 700;
}

.metric {
  background: #f4f4f5;
  color: #3f3f46;
}

.status-out {
  background: #fee2e2;
  color: #b91c1c;
}

.status-low {
  background: #ffedd5;
  color: #c2410c;
}

.status-ok {
  background: #dcfce7;
  color: #166534;
}

.status-untracked {
  background: #e4e4e7;
  color: #52525b;
}
</style>
