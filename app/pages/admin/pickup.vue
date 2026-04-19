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
          <div class="toggle-row">
            <label class="toggle-3d"><input v-model="draft.pickupEnabled" type="checkbox" class="toggle-checkbox" /><span class="slider-3d"></span></label>
            <span class="toggle-row-label text-[14px] font-semibold text-zinc-800 dark:text-zinc-200">Servicio de recogida activo</span>
          </div>
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

<style scoped>
.toggle-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 32px;
}

.toggle-row-label {
  margin: 0;
  line-height: 1.2;
}

.grid-form .toggle-3d {
  display: inline-flex !important;
  margin-top: 0 !important;
  flex: 0 0 auto;
}

.toggle-3d {
  position: relative;
  display: inline-flex;
  align-items: center;
  width: 48px;
  height: 28px;
}

.toggle-checkbox {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  margin: 0;
}

.slider-3d {
  position: relative;
  width: 48px;
  height: 28px;
  border-radius: 999px;
  background: linear-gradient(180deg, #e4e4e7 0%, #d4d4d8 100%);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.12);
  transition: background-color 0.2s ease, background 0.2s ease;
}

.slider-3d::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  background: #ffffff;
  box-shadow: 0 4px 10px rgba(15, 23, 42, 0.2);
  transition: transform 0.2s ease;
}

.toggle-checkbox:checked + .slider-3d {
  background: linear-gradient(180deg, #22c55e 0%, #16a34a 100%);
}

.toggle-checkbox:checked + .slider-3d::after {
  transform: translateX(20px);
}

.toggle-checkbox:focus-visible + .slider-3d {
  outline: 2px solid #22c55e;
  outline-offset: 2px;
}

.dark .slider-3d {
  background: linear-gradient(180deg, #3f3f46 0%, #27272a 100%);
}

.dark .toggle-checkbox:checked + .slider-3d {
  background: linear-gradient(180deg, #22d3ee 0%, #0891b2 100%);
}
</style>
