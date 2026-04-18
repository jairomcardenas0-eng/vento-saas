<template>
  <div v-if="catalog" class="admin-grid">
    <section class="panel-card span-2">
      <UiSectionHeader eyebrow="Navegación pública" title="Categorías" description="Orden, nota y visibilidad de cada bloque del catálogo." />

      <div class="table-list">
        <article v-for="category in categories" :key="category.id" class="list-row">
          <div>
            <strong>{{ category.name }}</strong>
            <p>{{ category.note || 'Sin nota' }}</p>
          </div>
          <div class="row-meta">
            <span>#{{ category.order }}</span>
            <span>{{ category.active ? 'Visible' : 'Oculta' }}</span>
            <button class="ghost-btn small" @click="editCategory(category)">Editar</button>
          </div>
        </article>
      </div>
    </section>

    <section class="panel-card">
      <UiSectionHeader eyebrow="Editor" :title="form.id ? 'Editar categoría' : 'Nueva categoría'" />
      <form class="grid-form" @submit.prevent="save">
        <label><span>Nombre</span><input v-model="form.name" required /></label>
        <label><span>Orden</span><input v-model.number="form.order" type="number" min="1" required /></label>
        <label class="full"><span>Nota</span><textarea v-model="form.note" rows="3" /></label>
        <label class="toggle"><input v-model="form.active" type="checkbox" /><span>Activa</span></label>
        <div class="full">
          <button class="solid-btn" :disabled="saving">
            {{ saving ? 'Guardando...' : 'Guardar categoría' }}
          </button>
          <p v-if="saveError" class="mt-2 text-sm text-rose-500">{{ saveError }}</p>
        </div>
      </form>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { CatalogCategory } from '~/types/catalog'

definePageMeta({ layout: 'admin' })

const catalogStore = useCatalogStore()
const catalog = computed(() => catalogStore.activeCatalog)
const categories = computed(() => catalogStore.categories)

const form = ref<CatalogCategory>({
  id: '',
  name: '',
  note: '',
  order: 1,
  active: true,
})

const editCategory = (category: CatalogCategory) => {
  form.value = { ...category }
}

const saving = ref(false)
const saveError = ref('')

const save = async () => {
  if (!catalog.value) return

  saving.value = true
  saveError.value = ''

  try {
    await catalogStore.upsertCategory({
      ...form.value,
      id: form.value.id || `${form.value.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
    })
    form.value = { id: '', name: '', note: '', order: categories.value.length + 1, active: true }
  } catch (error) {
    console.error('Error al guardar categoría:', error)
    saveError.value = 'Error al guardar. Intenta nuevamente.'
  } finally {
    saving.value = false
  }
}
</script>
