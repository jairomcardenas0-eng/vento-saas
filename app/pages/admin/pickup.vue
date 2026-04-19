<template>
  <AdminStatePanel
    v-if="!catalog"
    title="No hay un catálogo activo"
    description="Selecciona un catálogo para configurar la recogida."
  />

  <div v-else class="admin-grid">
    <section class="panel-card span-2 min-w-0">
      <UiSectionHeader eyebrow="Operación" title="Recogida en tienda" description="Configura cómo retiran sus pedidos los clientes.">
        <template #actions>
          <button class="solid-btn" :disabled="saving" @click="save">
            {{ saving ? 'Guardando...' : 'Guardar recogida' }}
          </button>
        </template>
      </UiSectionHeader>

      <fieldset class="contents">
        <div class="grid-form">
          <label class="toggle"><input v-model="draft.pickupEnabled" type="checkbox" /><span>Servicio de recogida activo</span></label>
          <label><span>Punto de recogida</span><input v-model="draft.pickupPoint" /><small>Ej. mostrador principal, ventanilla o barra.</small></label>
          <label><span>Tiempo estimado</span><input v-model.number="draft.pickupEtaMinutes" type="number" min="0" step="1" /><small>Minutos aproximados para tener el pedido listo.</small></label>
          <label class="full"><span>Instrucciones para el cliente</span><textarea v-model="draft.pickupInstructions" rows="3" /><small>Ej. presenta tu nombre en caja y espera confirmación.</small></label>
        </div>
      </fieldset>

      <p v-if="saveError" class="mt-4 text-sm text-rose-500">{{ saveError }}</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { defaultSettings } from '~/data/defaults'
import type { CatalogOperationalSettings } from '~/types/catalog'

definePageMeta({ layout: 'admin' })

const catalogStore = useCatalogStore()
const catalog = computed(() => catalogStore.activeCatalog)
const draft = ref<CatalogOperationalSettings>(defaultSettings())
const saving = ref(false)
const saveError = ref('')

watch(catalog, (value) => {
  if (!value) {
    return
  }

  draft.value = {
    ...defaultSettings(value.settings.businessName, value.slug),
    ...JSON.parse(JSON.stringify(value.settings)),
  }
}, { immediate: true })

const save = async () => {
  saving.value = true
  saveError.value = ''
  try {
    await catalogStore.updateSettings({ ...draft.value })
  } catch (error) {
    saveError.value = error instanceof Error ? error.message : 'No se pudo guardar la configuración de recogida.'
  } finally {
    saving.value = false
  }
}
</script>
