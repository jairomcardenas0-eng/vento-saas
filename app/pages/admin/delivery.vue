<template>
  <div v-if="catalog" class="admin-grid">
    <section class="panel-card span-2">
      <UiSectionHeader eyebrow="Operación" title="Entrega a domicilio" description="Configura el servicio de entrega a domicilio, tarifas y zonas de cobertura.">
        <template #actions>
          <button class="solid-btn" :disabled="saving" @click="save">
            {{ saving ? 'Guardando...' : 'Guardar entrega' }}
          </button>
        </template>
      </UiSectionHeader>

      <fieldset class="contents">
        <div class="grid-form">
          <label class="toggle"><input v-model="draft.deliveryEnabled" type="checkbox" /><span>Servicio de entrega activo</span></label>
          <label class="toggle"><input v-model="draft.deliveryPaused" type="checkbox" /><span>Pausa temporal de pedidos</span></label>
          <label>
            <span>Tipo de tarifa</span>
            <select v-model="draft.deliveryFeeType">
              <option value="flat">Tarifa fija global</option>
              <option value="zones">Zonas con precios distintos</option>
            </select>
            <small>Define si toda la ciudad comparte un costo o si usarás zonas.</small>
          </label>
          <label v-if="draft.deliveryFeeType === 'flat'"><span>Costo fijo de envío</span><input v-model.number="draft.deliveryFlatFee" type="number" min="0" step="0.01" /><small>Se suma al total cuando el cliente elige entrega.</small></label>
          <label v-if="draft.deliveryFeeType === 'flat'"><span>Pedido mínimo global</span><input v-model.number="draft.deliveryMinimumOrder" type="number" min="0" step="0.01" /><small>Bloquea el pedido si el subtotal no llega a este monto.</small></label>
          <label class="full"><span>Instrucciones para el repartidor</span><textarea v-model="draft.riderInstructions" rows="3" /><small>Notas internas para reparto y preparación de salida.</small></label>
        </div>

        <div v-if="draft.deliveryFeeType === 'zones'" class="mt-6 space-y-4">
          <div class="flex items-center justify-between gap-3">
            <h4 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Zonas personalizadas</h4>
            <button class="ghost-btn small" type="button" @click="addDeliveryZone">Añadir zona</button>
          </div>

          <div v-if="!draft.deliveryZones.length" class="rounded-[18px] border border-dashed border-zinc-300 px-4 py-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            No hay zonas configuradas todavía.
          </div>

          <article v-for="(zone, zoneIndex) in draft.deliveryZones" :key="zone.id" class="rounded-[22px] border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/70">
            <div class="grid gap-4 lg:grid-cols-4">
              <label><span>Nombre de la zona</span><input v-model="zone.name" /><small>Ej: Centro, Miramar, Roma Norte.</small></label>
              <label><span>Precio de envío</span><input v-model.number="zone.price" type="number" min="0" step="0.01" /><small>Costo extra de la zona.</small></label>
              <label><span>Pedido mínimo</span><input v-model.number="zone.minOrder" type="number" min="0" step="0.01" /><small>Opcional por zona.</small></label>
              <label><span>ETA (minutos)</span><input v-model.number="zone.estimatedMinutes" type="number" min="0" step="1" /><small>Tiempo estimado al cliente.</small></label>
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
  if (!value) return
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
    saveError.value = error instanceof Error ? error.message : 'No se pudo guardar la entrega.'
  } finally {
    saving.value = false
  }
}
</script>
