<template>
  <div v-if="catalog" class="admin-grid">
    <section class="panel-card span-2">
      <UiSectionHeader eyebrow="Inventario visual" title="Productos" description="Editor con campos clave de la plantilla vieja convertidos a módulos del SaaS.">
        <template #actions>
          <button class="solid-btn" @click="resetForm">Nuevo producto</button>
        </template>
      </UiSectionHeader>

      <div class="table-list">
        <article v-for="product in products" :key="product.id" class="list-row">
          <div>
            <strong>{{ product.name }}</strong>
            <p>{{ product.description }}</p>
            <small class="inline-muted">{{ summarizeVariantGroups(product.variants).map(item => `${item.title} (${item.options})`).join(' · ') || 'Sin variantes' }}</small>
          </div>
          <div class="row-meta">
            <span>{{ money(product.price, catalog.settings.currency) }}</span>
            <span>{{ product.tags.join(', ') || 'Sin tags' }}</span>
            <button class="ghost-btn small" @click="editProduct(product)">Editar</button>
          </div>
        </article>
      </div>
    </section>

    <section class="panel-card span-2">
      <UiSectionHeader eyebrow="Editor" :title="form.id ? 'Editar producto' : 'Nuevo producto'" description="Diseñado para migrar luego los campos avanzados restantes del admin HTML." />

      <form class="grid-form" @submit.prevent="save">
        <label><span>Nombre</span><input v-model="form.name" required /></label>
        <label><span>Categoría</span>
          <select v-model="form.categoryId" required>
            <option v-for="category in catalog.categories" :key="category.id" :value="category.id">{{ category.name }}</option>
          </select>
        </label>
        <label><span>Precio</span><input v-model.number="form.price" type="number" min="0" step="0.01" required /></label>
        <label><span>Precio rebajado</span><input v-model.number="form.salePrice" type="number" min="0" step="0.01" /></label>
        <label class="full"><span>Descripción</span><textarea v-model="form.description" rows="3" /></label>
        <label><span>Imagen principal URL</span><input v-model="form.image" /></label>
        <label><span>Galería (coma separada)</span><input v-model="imagesInput" /></label>
        <label><span>Tags (coma separada)</span><input v-model="tagsInput" /></label>
        <label><span>Etiqueta promocional</span><input v-model="form.offerLabel" /></label>
        <label><span>Timer horas</span><input v-model.number="form.timerHours" type="number" min="0" /></label>
        <label class="toggle"><input v-model="form.active" type="checkbox" /><span>Activo</span></label>
        <label class="toggle"><input v-model="form.timerLinkSale" type="checkbox" /><span>Al terminar quitar rebaja</span></label>
        <label class="full">
          <span>Variantes rápidas</span>
          <textarea v-model="variantsInput" rows="4" placeholder="Tamaño|single|required|Chica:0,Mediana:20,Grande:35" />
        </label>
        <div class="full">
          <button class="solid-btn">Guardar producto</button>
        </div>
      </form>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { CatalogProduct, ProductVariantGroup } from '~/types/catalog'
import { money, summarizeVariantGroups } from '~/utils/catalog'

definePageMeta({ layout: 'admin' })

const catalogStore = useCatalogStore()
const catalog = computed(() => catalogStore.activeCatalog)
const products = computed(() => catalogStore.products)

const emptyProduct = (): CatalogProduct => ({
  id: '',
  categoryId: catalog.value?.categories[0]?.id || '',
  name: '',
  description: '',
  price: 0,
  salePrice: null,
  order: (catalog.value?.products.length || 0) + 1,
  image: '',
  images: [],
  active: true,
  offerLabel: '',
  offerPosition: 'image',
  timerHours: null,
  timerPosition: 'price-below',
  timerShowMinutes: true,
  timerShowSeconds: false,
  timerLinkSale: false,
  tags: [],
  variants: [],
  reviewsApprovedCount: 0,
  productRating: 0,
  productRatingCount: 0,
})

const form = ref<CatalogProduct>(emptyProduct())
const tagsInput = ref('')
const imagesInput = ref('')
const variantsInput = ref('')

const editProduct = (product: CatalogProduct) => {
  form.value = JSON.parse(JSON.stringify(product))
  tagsInput.value = product.tags.join(', ')
  imagesInput.value = product.images.join(', ')
  variantsInput.value = product.variants.map(group => {
    const options = group.options.map(option => `${option.name}:${option.price}`).join(',')
    return `${group.group}|${group.selection}|${group.required ? 'required' : 'optional'}|${options}`
  }).join('\n')
}

const resetForm = () => {
  form.value = emptyProduct()
  tagsInput.value = ''
  imagesInput.value = ''
  variantsInput.value = ''
}

const parseVariants = (value: string): ProductVariantGroup[] =>
  value
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [group, selection = 'single', required = 'optional', options = ''] = line.split('|')
      return {
        group,
        selection: selection === 'multiple' ? 'multiple' : 'single',
        required: required === 'required',
        options: options.split(',').map(entry => entry.trim()).filter(Boolean).map((entry) => {
          const [name, price] = entry.split(':')
          return { name, price: Number(price || 0) }
        }),
      }
    })

const save = async () => {
  const id = form.value.id || `${form.value.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`
  await catalogStore.upsertProduct({
    ...form.value,
    id,
    tags: tagsInput.value.split(',').map(item => item.trim()).filter(Boolean),
    images: imagesInput.value.split(',').map(item => item.trim()).filter(Boolean),
    variants: parseVariants(variantsInput.value),
  })
  resetForm()
}
</script>
