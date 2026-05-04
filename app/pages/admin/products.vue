<template>
  <div v-if="catalog" class="admin-grid">
    <section class="panel-card span-2">
      <UiSectionHeader
        eyebrow="Catalogo operativo"
        title="Productos e inventario"
        description="Administra precios, variantes y el stock base desde un solo flujo."
      >
        <template #actions>
          <div class="header-actions">
            <NuxtLink to="/admin/inventory" class="ghost-btn">Ver inventario</NuxtLink>
            <button class="solid-btn" :disabled="productLimitReached" :title="productLimitReached ? productLimitMessage : ''" @click="resetForm">Nuevo producto</button>
          </div>
        </template>
      </UiSectionHeader>

      <div class="mb-4 rounded-[20px] border px-4 py-3 text-sm" :class="planUsageClass(productUsageRatio)">
        <strong>{{ productUsageText }}</strong>
        <span class="ml-2">{{ productLimitMessage }}</span>
      </div>

      <div class="table-list">
        <template v-for="category in catalog.categories" :key="category.id">
          <div class="category-group-header">
            <span class="category-group-title">{{ category.name }}</span>
            <span class="category-group-count">{{ productsForCategory(category.id).length }} productos</span>
          </div>

          <article v-for="product in productsForCategory(category.id)" :key="product.id" class="list-row product-row">
            <div class="product-main">
              <strong>{{ product.name }}</strong>
              <p>{{ product.description || 'Sin descripcion corta.' }}</p>
              <div class="product-meta-line">
                <span class="meta-chip">{{ variantCount(product) }} variantes</span>
                <span class="meta-chip" :class="inventoryPillClass(product)">{{ inventoryLabel(product) }}</span>
                <span v-if="product.freeShip" class="free-ship-chip">Envio gratis</span>
              </div>
            </div>

            <div class="row-meta">
              <span>{{ money(product.price, catalog.settings.currency) }}</span>
              <span>{{ product.tags.join(', ') || 'Sin tags' }}</span>
              <button class="ghost-btn small" @click="editProduct(product)">Editar</button>
            </div>
          </article>
        </template>
      </div>
    </section>

    <section class="panel-card span-2">
      <UiSectionHeader
        eyebrow="Editor"
        :title="form.id ? 'Editar producto' : 'Nuevo producto'"
        description="Variantes relacionales con stock por opcion y orden manual."
      />

      <form class="grid-form" @submit.prevent="save">
        <label><span>Nombre</span><input v-model="form.name" required /></label>
        <label>
          <span>Categoria</span>
          <select v-model="form.categoryId" required>
            <option v-for="category in catalog.categories" :key="category.id" :value="category.id">{{ category.name }}</option>
          </select>
        </label>
        <label><span>Precio</span><input v-model.number="form.basePrice" type="number" min="0" step="0.01" required /></label>
        <label><span>Precio promo</span><input v-model.number="form.promoPrice" type="number" min="0" step="0.01" /></label>
        <label class="full"><span>Descripcion</span><textarea v-model="form.description" rows="3" /></label>
        <label><span>Imagen principal URL</span><input v-model="form.imageUrl" /></label>
        <label><span>Galeria (coma separada)</span><input v-model="imagesInput" /></label>
        <label><span>Tags (coma separada)</span><input v-model="tagsInput" /></label>
        <label><span>Etiqueta promocional</span><input v-model="form.offerLabel" /></label>
        <label><span>SKU base</span><input v-model="baseInventory.sku" /></label>
        <label><span>Stock base</span><input v-model.number="baseInventory.quantity" type="number" min="0" step="1" /></label>
        <label><span>Reservado base</span><input v-model.number="baseInventory.reserved" type="number" min="0" step="1" /></label>
        <label><span>Umbral bajo</span><input v-model.number="baseInventory.lowStockThreshold" type="number" min="0" step="1" /></label>
        <label class="toggle"><input v-model="form.isActive" type="checkbox" /><span>Activo</span></label>
        <label class="toggle"><input v-model="form.timerLinkSale" type="checkbox" /><span>Quitar promo al vencer</span></label>
        <label class="toggle"><input v-model="form.freeShip" type="checkbox" /><span>Envio gratis</span></label>
        <label class="toggle"><input v-model="baseInventory.trackStock" type="checkbox" /><span>Controlar stock base</span></label>

        <div class="full variant-section">
          <div class="variant-header">
            <div>
              <h3>Grupos de variantes</h3>
              <p>Arrastra para reordenar grupos y opciones. Cada opcion puede tener stock propio.</p>
            </div>
            <button class="ghost-btn" type="button" @click="addGroup">Agregar grupo</button>
          </div>

          <div v-if="!form.variants.length" class="empty-variants">
            <p>Este producto aun no tiene variantes.</p>
          </div>

          <div
            v-for="(group, groupIndex) in form.variants"
            :key="group.id"
            class="variant-group-card"
            draggable="true"
            @dragstart="onGroupDragStart(groupIndex)"
            @dragover.prevent
            @drop="onGroupDrop(groupIndex)"
          >
            <div class="variant-group-top">
              <div class="drag-label">Arrastrar</div>
              <label><span>Nombre del grupo</span><input v-model="group.groupName" required /></label>
              <label>
                <span>Tipo</span>
                <select v-model="group.type">
                  <option value="single">Seleccion unica</option>
                  <option value="multiple">Seleccion multiple</option>
                </select>
              </label>
              <label class="toggle compact"><input v-model="group.required" type="checkbox" /><span>Obligatorio</span></label>
              <button class="danger-btn small" type="button" @click="removeGroup(groupIndex)">Eliminar grupo</button>
            </div>

            <div class="options-stack">
              <article
                v-for="(option, optionIndex) in group.options"
                :key="option.id"
                class="variant-option-row"
                draggable="true"
                @dragstart="onOptionDragStart(groupIndex, optionIndex)"
                @dragover.prevent
                @drop="onOptionDrop(groupIndex, optionIndex)"
              >
                <div class="drag-label small">Mover</div>
                <label><span>Opcion</span><input v-model="option.name" required /></label>
                <label><span>Extra</span><input v-model.number="option.priceDelta" type="number" step="0.01" /></label>
                <label><span>SKU</span><input v-model="inventoryForOption(option.id).sku" /></label>
                <label><span>Cantidad</span><input v-model.number="inventoryForOption(option.id).quantity" type="number" min="0" step="1" /></label>
                <label><span>Reservado</span><input v-model.number="inventoryForOption(option.id).reserved" type="number" min="0" step="1" /></label>
                <label><span>Umbral</span><input v-model.number="inventoryForOption(option.id).lowStockThreshold" type="number" min="0" step="1" /></label>
                <label class="toggle compact"><input v-model="inventoryForOption(option.id).trackStock" type="checkbox" /><span>Track</span></label>
                <button class="ghost-btn small" type="button" @click="duplicateOption(groupIndex, optionIndex)">Duplicar</button>
                <button class="danger-btn small" type="button" @click="removeOption(groupIndex, optionIndex)">Quitar</button>
              </article>
            </div>

            <div class="variant-group-actions">
              <button class="ghost-btn small" type="button" @click="addOption(groupIndex)">Agregar opcion</button>
            </div>
          </div>
        </div>

        <div class="full form-actions">
          <button class="solid-btn">Guardar producto</button>
        </div>
      </form>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { CatalogProduct, InventoryItem } from '~/types/catalog'
import type { InventoryItemSummary, ProductItem, VariantGroup, VariantOption } from '~/stores/catalog'
import { createEmptyProduct, createEmptyVariantGroup, createEmptyVariantOption } from '~/stores/catalog'
import { money } from '~/utils/catalog'

definePageMeta({ layout: 'admin' })

const catalogStore = useCatalogStore()
const catalog = computed(() => catalogStore.activeCatalog)
const products = computed(() => catalogStore.products)

const planLimits = {
  free: { maxProducts: 20 },
  basic: { maxProducts: 100 },
  pro: { maxProducts: Number.POSITIVE_INFINITY },
  enterprise: { maxProducts: Number.POSITIVE_INFINITY },
} as const

const draggedGroupIndex = ref<number | null>(null)
const draggedOptionRef = ref<{ groupIndex: number, optionIndex: number } | null>(null)

const productsForCategory = (categoryId: string) =>
  products.value.filter(product => product.categoryId === categoryId)

const productLimit = computed(() =>
  planLimits[catalog.value?.planTier === 'basic' || catalog.value?.planTier === 'pro' || catalog.value?.planTier === 'enterprise' ? catalog.value.planTier : 'free'].maxProducts,
)

const productUsageRatio = computed(() =>
  Number.isFinite(productLimit.value) && productLimit.value > 0 ? products.value.length / productLimit.value : 0,
)

const productLimitReached = computed(() =>
  Number.isFinite(productLimit.value) && products.value.length >= productLimit.value && !form.value.id,
)

const productUsageText = computed(() =>
  Number.isFinite(productLimit.value)
    ? `${products.value.length}/${productLimit.value} productos`
    : `${products.value.length} productos activos`,
)

const productLimitMessage = computed(() => {
  if (!Number.isFinite(productLimit.value)) {
    return 'Tu plan actual no tiene tope de productos.'
  }

  if (productLimitReached.value) {
    return 'Has alcanzado el límite de tu plan. Actualiza para crear más productos.'
  }

  if (productUsageRatio.value >= 0.8) {
    return 'Estás cerca del límite de tu plan.'
  }

  return 'Aún tienes margen para seguir agregando productos.'
})

const planUsageClass = (ratio: number) => {
  if (ratio >= 1) {
    return 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300'
  }

  if (ratio >= 0.8) {
    return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300'
  }

  return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300'
}

const toInventorySummary = (item: InventoryItem | InventoryItemSummary): InventoryItemSummary => {
  const quantity = Number(item.quantity || 0)
  const reserved = Number(item.reserved || 0)
  const available = quantity - reserved
  return {
    ...item,
    quantity,
    reserved,
    available,
    status: item.trackStock !== true
      ? 'untracked'
      : available <= 0
        ? 'out'
        : available <= Number(item.lowStockThreshold || 0)
          ? 'low'
          : 'ok',
  }
}

const mapCatalogProductToForm = (product: CatalogProduct): ProductItem => ({
  id: product.id,
  categoryId: product.categoryId,
  name: product.name,
  description: product.description,
  basePrice: product.price,
  imageUrl: product.image || null,
  imageUrls: product.images?.length ? product.images : [null, null, null],
  isActive: product.active,
  variants: (product.variantGroups?.length ? product.variantGroups.map(group => ({
    id: group.id,
    catalogId: group.catalogId,
    productId: group.productId,
    groupName: group.groupName,
    type: group.selectionType,
    required: group.required,
    sortOrder: group.sortOrder,
    options: group.options.map(option => ({
      id: option.id,
      groupId: option.groupId,
      name: option.name,
      priceDelta: option.priceDelta,
      isRequired: option.isRequired,
      sortOrder: option.sortOrder,
    })),
  })) : product.variants.map((group, groupIndex) => ({
    id: group.id,
    groupName: group.groupName,
    type: group.type,
    required: Boolean(group.required),
    sortOrder: groupIndex,
    options: group.options.map((option, optionIndex) => ({
      id: option.id,
      groupId: group.id,
      name: option.name,
      priceDelta: option.priceDelta,
      isRequired: option.isRequired,
      sortOrder: optionIndex,
    })),
  }))),
  hasPromo: product.salePrice !== null,
  promoPrice: product.salePrice,
  sortOrder: product.order,
  offerLabel: product.offerLabel,
  offerLabelPosition: product.offerPosition,
  timerHours: product.timerHours,
  timerPosition: product.timerPosition,
  timerShowMinutes: product.timerShowMinutes,
  timerShowSeconds: product.timerShowSeconds,
  timerLinkSale: product.timerLinkSale,
  carouselEnabled: product.carouselEnabled ?? false,
  carouselIntervalSeconds: product.carouselIntervalSeconds ?? 3,
  tags: product.tags || [],
  freeShip: product.freeShip ?? false,
  inventoryItems: (product.inventoryItems || []).map(toInventorySummary),
  productRating: product.productRating || 0,
  productRatingCount: product.productRatingCount || 0,
  createdAt: null,
  updatedAt: null,
})

const emptyInventoryItem = (productId: string, variantOptionId: string | null): InventoryItemSummary => ({
  id: `${productId || 'draft'}-${variantOptionId || 'base'}`,
  catalogId: catalog.value?.id,
  productId,
  variantOptionId,
  sku: '',
  quantity: 0,
  reserved: 0,
  lowStockThreshold: 0,
  trackStock: false,
  available: 0,
  status: 'untracked',
})

const form = ref<ProductItem>(createEmptyProduct(catalog.value?.categories[0]?.id || ''))
const tagsInput = ref('')
const imagesInput = ref('')

const baseInventory = computed<InventoryItemSummary>({
  get: () => {
    const existing = (form.value.inventoryItems || []).find(item => item.variantOptionId === null)
    if (existing) {
      return existing
    }

    const created = emptyInventoryItem(form.value.id, null)
    form.value.inventoryItems = [...(form.value.inventoryItems || []), created]
    return created
  },
  set: (value) => {
    const next = (form.value.inventoryItems || []).filter(item => item.variantOptionId !== null)
    next.unshift(withInventoryDerivedState(value))
    form.value.inventoryItems = next
  },
})

const withInventoryDerivedState = (item: InventoryItemSummary): InventoryItemSummary => {
  const available = Number(item.quantity || 0) - Number(item.reserved || 0)
  return {
    ...item,
    available,
    status: item.trackStock !== true
      ? 'untracked'
      : available <= 0
        ? 'out'
        : available <= Number(item.lowStockThreshold || 0)
          ? 'low'
          : 'ok',
  }
}

const normalizeInventory = () => {
  form.value.inventoryItems = (form.value.inventoryItems || []).map(withInventoryDerivedState)
}

const ensureOptionInventory = (optionId: string): InventoryItemSummary => {
  const existing = (form.value.inventoryItems || []).find(item => item.variantOptionId === optionId)
  if (existing) {
    return existing
  }

  const created = withInventoryDerivedState(emptyInventoryItem(form.value.id, optionId))
  form.value.inventoryItems = [...(form.value.inventoryItems || []), created]
  return created
}

const inventoryForOption = (optionId: string) => ensureOptionInventory(optionId)

const variantCount = (product: CatalogProduct) =>
  (product.variantGroups?.length
    ? product.variantGroups.reduce((sum, group) => sum + group.options.length, 0)
    : product.variants.reduce((sum, group) => sum + group.options.length, 0))

const inventoryStatus = (product: CatalogProduct): 'untracked' | 'out' | 'low' | 'ok' => {
  const tracked = (product.inventoryItems || []).map(toInventorySummary).filter(item => item.trackStock)
  if (!tracked.length) {
    return 'untracked'
  }

  if (tracked.some(item => Number(item.available ?? (item.quantity - item.reserved)) <= 0)) {
    return 'out'
  }

  if (tracked.some(item => Number(item.available ?? (item.quantity - item.reserved)) <= item.lowStockThreshold)) {
    return 'low'
  }

  return 'ok'
}

const inventoryLabel = (product: CatalogProduct) => {
  const status = inventoryStatus(product)
  if (status === 'out') return 'Agotado'
  if (status === 'low') return 'Pocas unidades'
  if (status === 'ok') return 'En stock'
  return 'Sin tracking'
}

const inventoryPillClass = (product: CatalogProduct) => ({
  'pill-out': inventoryStatus(product) === 'out',
  'pill-low': inventoryStatus(product) === 'low',
  'pill-ok': inventoryStatus(product) === 'ok',
  'pill-untracked': inventoryStatus(product) === 'untracked',
})

const sortGroupsAndOptions = () => {
  form.value.variants = form.value.variants.map((group, groupIndex) => ({
    ...group,
    sortOrder: groupIndex,
    options: group.options.map((option, optionIndex) => ({
      ...option,
      groupId: group.id,
      sortOrder: optionIndex,
    })),
  }))
}

const addGroup = () => {
  const group = createEmptyVariantGroup()
  group.sortOrder = form.value.variants.length
  group.options = [createEmptyVariantOption()]
  if (group.options[0]) {
    group.options[0].groupId = group.id
  }
  form.value.variants.push(group)
}

const removeGroup = (groupIndex: number) => {
  const removed = form.value.variants[groupIndex]
  if (!removed) {
    return
  }
  form.value.variants.splice(groupIndex, 1)
  const optionIds = new Set(removed.options.map(option => option.id))
  form.value.inventoryItems = (form.value.inventoryItems || []).filter(item => !item.variantOptionId || !optionIds.has(item.variantOptionId))
  sortGroupsAndOptions()
}

const addOption = (groupIndex: number) => {
  const group = form.value.variants[groupIndex]
  if (!group) {
    return
  }
  const option = createEmptyVariantOption()
  option.groupId = group.id
  option.sortOrder = group.options.length
  group.options.push(option)
  ensureOptionInventory(option.id)
}

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`
}

const duplicateOption = (groupIndex: number, optionIndex: number) => {
  const group = form.value.variants[groupIndex]
  if (!group) {
    return
  }
  const source = group.options[optionIndex]
  if (!source) {
    return
  }
  const nextId = generateId()
  group.options.splice(optionIndex + 1, 0, {
    ...source,
    id: nextId,
    groupId: group.id,
    sortOrder: optionIndex + 1,
  })

  const inventory = inventoryForOption(source.id)
  form.value.inventoryItems = [...(form.value.inventoryItems || []), withInventoryDerivedState({
    ...inventory,
    id: `${form.value.id || 'draft'}-${nextId}`,
    variantOptionId: nextId,
    sku: inventory.sku ? `${inventory.sku}-COPY` : '',
  })]
  sortGroupsAndOptions()
}

const removeOption = (groupIndex: number, optionIndex: number) => {
  const group = form.value.variants[groupIndex]
  if (!group) {
    return
  }
  const [removed] = group.options.splice(optionIndex, 1)
  if (!removed) {
    return
  }
  form.value.inventoryItems = (form.value.inventoryItems || []).filter(item => item.variantOptionId !== removed.id)
  sortGroupsAndOptions()
}

const onGroupDragStart = (groupIndex: number) => {
  draggedGroupIndex.value = groupIndex
}

const onGroupDrop = (targetIndex: number) => {
  if (draggedGroupIndex.value === null || draggedGroupIndex.value === targetIndex) {
    return
  }

  const [moved] = form.value.variants.splice(draggedGroupIndex.value, 1)
  if (!moved) {
    draggedGroupIndex.value = null
    return
  }
  form.value.variants.splice(targetIndex, 0, moved)
  draggedGroupIndex.value = null
  sortGroupsAndOptions()
}

const onOptionDragStart = (groupIndex: number, optionIndex: number) => {
  draggedOptionRef.value = { groupIndex, optionIndex }
}

const onOptionDrop = (groupIndex: number, optionIndex: number) => {
  if (!draggedOptionRef.value || draggedOptionRef.value.groupIndex !== groupIndex) {
    return
  }

  const sourceGroup = form.value.variants[groupIndex]
  if (!sourceGroup) {
    draggedOptionRef.value = null
    return
  }
  const [moved] = sourceGroup.options.splice(draggedOptionRef.value.optionIndex, 1)
  if (!moved) {
    draggedOptionRef.value = null
    return
  }
  sourceGroup.options.splice(optionIndex, 0, moved)
  draggedOptionRef.value = null
  sortGroupsAndOptions()
}

const editProduct = (product: CatalogProduct) => {
  form.value = JSON.parse(JSON.stringify(mapCatalogProductToForm(product))) as ProductItem
  tagsInput.value = product.tags.join(', ')
  imagesInput.value = product.images.filter(Boolean).join(', ')
  sortGroupsAndOptions()
  normalizeInventory()
}

const resetForm = () => {
  form.value = createEmptyProduct(catalog.value?.categories[0]?.id || '')
  form.value.inventoryItems = [emptyInventoryItem('', null)]
  tagsInput.value = ''
  imagesInput.value = ''
}

const save = async () => {
  if (productLimitReached.value) {
    return
  }

  if (!form.value.name.trim()) {
    return
  }

  if (!form.value.categoryId) {
    return
  }

  sortGroupsAndOptions()
  normalizeInventory()

  const productId = form.value.id || `${form.value.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const normalizedInventory = (form.value.inventoryItems || []).map(item => withInventoryDerivedState({
    ...item,
    id: item.id || `${productId}-${item.variantOptionId || 'base'}`,
    productId,
  }))

  await catalogStore.upsertProduct({
    id: productId,
    categoryId: form.value.categoryId,
    name: form.value.name,
    description: form.value.description,
    price: Number(form.value.basePrice || 0),
    salePrice: form.value.promoPrice,
    order: Number(form.value.sortOrder || 0),
    image: form.value.imageUrl || '',
    images: imagesInput.value.split(',').map(item => item.trim()).filter(Boolean),
    active: form.value.isActive,
    offerLabel: form.value.offerLabel,
    offerPosition: form.value.offerLabelPosition,
    timerHours: form.value.timerHours,
    timerPosition: form.value.timerPosition,
    timerShowMinutes: form.value.timerShowMinutes,
    timerShowSeconds: form.value.timerShowSeconds,
    timerLinkSale: form.value.timerLinkSale,
    carouselEnabled: form.value.carouselEnabled,
    carouselIntervalSeconds: form.value.carouselIntervalSeconds,
    tags: tagsInput.value.split(',').map(item => item.trim()).filter(Boolean),
    freeShip: form.value.freeShip,
    variants: form.value.variants.map((group: VariantGroup) => ({
      ...group,
      options: group.options.filter((option: VariantOption) => option.name.trim()),
    })),
    variantGroups: form.value.variants.map((group: VariantGroup) => ({
      id: group.id,
      catalogId: catalog.value?.id,
      productId,
      groupName: group.groupName,
      selectionType: group.type,
      required: Boolean(group.required),
      sortOrder: Number(group.sortOrder || 0),
      options: group.options
        .filter((option: VariantOption) => option.name.trim())
        .map((option: VariantOption, optionIndex: number) => ({
          id: option.id,
          groupId: group.id,
          name: option.name.trim(),
          priceDelta: Number(option.priceDelta || 0),
          isRequired: Boolean(option.isRequired),
          sortOrder: Number(option.sortOrder ?? optionIndex),
        })),
    })),
    inventoryItems: normalizedInventory,
    reviewsApprovedCount: form.value.productRatingCount,
    productRating: form.value.productRating,
    productRatingCount: form.value.productRatingCount,
  })

  resetForm()
}

watch(() => catalog.value?.id, () => {
  resetForm()
}, { immediate: true })
</script>

<style scoped>
.header-actions {
  display: flex;
  gap: 0.75rem;
}

.product-row {
  align-items: center;
}

.product-main {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.product-meta-line {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.meta-chip,
.free-ship-chip {
  display: inline-flex;
  align-items: center;
  padding: 0.22rem 0.6rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
}

.meta-chip {
  background: #f4f4f5;
  color: #3f3f46;
}

.free-ship-chip {
  background: #d1fae5;
  color: #065f46;
}

.pill-out {
  background: #fee2e2;
  color: #b91c1c;
}

.pill-low {
  background: #ffedd5;
  color: #c2410c;
}

.pill-ok {
  background: #dcfce7;
  color: #166534;
}

.pill-untracked {
  background: #e4e4e7;
  color: #52525b;
}

.category-group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  margin-top: 1.5rem;
  border-radius: 14px;
  background: #f4f4f5;
}

.category-group-title {
  font-weight: 700;
  font-size: 0.85rem;
  color: #18181b;
}

.category-group-count {
  font-size: 0.75rem;
  color: #71717a;
  font-weight: 600;
}

.variant-section {
  display: grid;
  gap: 1rem;
}

.variant-header,
.variant-group-top,
.variant-group-actions,
.options-stack {
  display: grid;
  gap: 0.9rem;
}

.variant-header {
  grid-template-columns: 1fr auto;
  align-items: start;
}

.empty-variants {
  padding: 1rem;
  border: 1px dashed #d4d4d8;
  border-radius: 16px;
  color: #71717a;
}

.variant-group-card {
  display: grid;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid #e4e4e7;
  border-radius: 20px;
  background: #fafafa;
}

.variant-group-top {
  grid-template-columns: 80px repeat(2, minmax(0, 1fr)) auto auto;
  align-items: end;
}

.variant-option-row {
  display: grid;
  grid-template-columns: 64px repeat(6, minmax(0, 1fr)) auto auto;
  gap: 0.75rem;
  align-items: end;
  padding: 0.85rem;
  border-radius: 16px;
  background: white;
  border: 1px solid #e4e4e7;
}

.drag-label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  border-radius: 14px;
  background: #18181b;
  color: white;
  font-size: 0.72rem;
  font-weight: 700;
}

.drag-label.small {
  min-height: 38px;
  font-size: 0.68rem;
}

.toggle.compact {
  min-width: auto;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
}

@media (max-width: 1024px) {
  .variant-group-top,
  .variant-option-row,
  .variant-header {
    grid-template-columns: 1fr;
  }
}
</style>
