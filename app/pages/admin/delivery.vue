<template>
  <AdminStatePanel
    v-if="!catalog"
    title="No hay un catálogo activo"
    description="Selecciona un catálogo para configurar la entrega a domicilio."
  />

  <div v-else class="admin-grid">
    <section class="panel-card span-2 min-w-0">
      <UiSectionHeader eyebrow="Operación" title="Entrega a domicilio" description="Configura el servicio, sus tarifas y las zonas de cobertura.">
        <template #actions>
          <button class="solid-btn" :disabled="saving" @click="save">
            {{ saving ? 'Guardando...' : 'Guardar entrega' }}
          </button>
        </template>
      </UiSectionHeader>

      <fieldset class="contents min-w-0">
        <div class="grid-form">
          <div class="toggle-row">
            <label class="toggle-3d"><input v-model="draft.deliveryEnabled" type="checkbox" class="toggle-checkbox" /><span class="slider-3d"></span></label>
            <span class="toggle-row-label text-[14px] font-semibold text-zinc-800 dark:text-zinc-200">Servicio de entrega activo</span>
          </div>
          <div class="toggle-row">
            <label class="toggle-3d"><input v-model="draft.deliveryPaused" type="checkbox" class="toggle-checkbox" /><span class="slider-3d"></span></label>
            <span class="toggle-row-label text-[14px] font-semibold text-zinc-800 dark:text-zinc-200">Pausa temporal de pedidos</span>
          </div>
          <label>
            <span>Tipo de tarifa</span>
            <select v-model="draft.deliveryFeeType">
              <option value="flat">Tarifa fija general</option>
              <option value="zones">Zonas con precios distintos</option>
            </select>
            <small>Define si toda la ciudad comparte un costo o si trabajarás con zonas.</small>
          </label>
          <label v-if="draft.deliveryFeeType === 'flat'">
            <span>Costo fijo de envío</span>
            <input v-model.number="draft.deliveryFlatFee" type="number" min="0" step="0.01" />
            <small>Se suma al total cuando el cliente elige entrega.</small>
          </label>
          <label v-if="draft.deliveryFeeType === 'flat'">
            <span>Pedido mínimo general</span>
            <input v-model.number="draft.deliveryMinimumOrder" type="number" min="0" step="0.01" />
            <small>Bloquea el pedido si el subtotal no alcanza este monto.</small>
          </label>
          <label class="full">
            <span>Instrucciones para reparto</span>
            <textarea v-model="draft.riderInstructions" rows="3" />
            <small>Notas internas para preparación y salida.</small>
          </label>
        </div>

        <div v-if="draft.deliveryFeeType === 'zones'" class="mt-6 space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <h4 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Zonas personalizadas</h4>
            <button class="ghost-btn small" type="button" @click="addDeliveryZone">Añadir zona</button>
          </div>

          <div v-if="!draft.deliveryZones.length" class="rounded-[18px] border border-dashed border-zinc-300 px-4 py-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            No hay zonas configuradas todavía.
          </div>

          <article
            v-for="(zone, zoneIndex) in draft.deliveryZones"
            :key="zone.id"
            class="min-w-0 rounded-[22px] border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/70"
          >
            <div class="grid gap-4 lg:grid-cols-4">
              <label><span>Nombre de la zona</span><input v-model="zone.name" /><small>Ej. Centro, Miramar o Roma Norte.</small></label>
              <label><span>Precio de envío</span><input v-model.number="zone.price" type="number" min="0" step="0.01" /><small>Costo extra de la zona.</small></label>
              <label><span>Pedido mínimo</span><input v-model.number="zone.minOrder" type="number" min="0" step="0.01" /><small>Configurable por zona.</small></label>
              <label><span>Tiempo estimado</span><input v-model.number="zone.estimatedMinutes" type="number" min="0" step="1" /><small>Minutos estimados para el cliente.</small></label>
            </div>
            <button class="ghost-btn small mt-4 !text-rose-500" type="button" @click="draft.deliveryZones.splice(zoneIndex, 1)">Eliminar zona</button>
          </article>
        </div>
      </fieldset>

      <p v-if="saveError" class="mt-4 text-sm text-rose-500">{{ saveError }}</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { createDeliveryZone, defaultSettings } from '~/data/defaults'
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

const addDeliveryZone = () => {
  draft.value.deliveryZones.push(createDeliveryZone())
}

const save = async () => {
  saving.value = true
  saveError.value = ''
  try {
    await catalogStore.updateSettings({
      ...draft.value,
      deliveryZones: draft.value.deliveryZones.map(zone => ({
        ...zone,
        name: zone.name.trim(),
        price: Number(zone.price || 0),
        minOrder: Number(zone.minOrder || 0),
        estimatedMinutes: Number(zone.estimatedMinutes || 0),
      })),
    })
  } catch (error) {
    saveError.value = error instanceof Error ? error.message : 'No se pudo guardar la configuración de entrega.'
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
