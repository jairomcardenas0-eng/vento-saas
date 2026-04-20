<template>
  <AdminStatePanel
    v-if="!catalog"
    title="No hay un catálogo activo"
    description="Selecciona un catálogo para definir cómo se capturan los pedidos."
  />

  <div v-else class="admin-grid">
    <section class="panel-card span-2 min-w-0">
      <UiSectionHeader eyebrow="Operación" title="Pedido y visibilidad" description="Controla qué datos se requieren al crear un pedido y qué funciones están visibles.">
        <template #actions>
          <button class="solid-btn" :disabled="saving" @click="save">
            {{ saving ? 'Guardando...' : 'Guardar ajustes' }}
          </button>
        </template>
      </UiSectionHeader>

      <fieldset class="contents">
        <div class="space-y-8">
          <section class="px-2 py-3">
            <div class="mb-4">
              <p class="eyebrow">Campos del pedido</p>
              <h3 class="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Datos que se capturan</h3>
            </div>
            <div class="grid-form">
              <label>
                <span>Nombre del cliente</span>
                <select v-model="draft.checkoutNameReq">
                  <option value="obligatorio">Obligatorio</option>
                  <option value="opcional">Opcional</option>
                </select>
                <small>Define si se exige antes de enviar el pedido.</small>
              </label>
              <label>
                <span>Dirección de entrega</span>
                <select v-model="draft.checkoutAddressReq">
                  <option value="obligatorio">Obligatorio</option>
                  <option value="opcional">Opcional</option>
                </select>
                <small>Solo aplica a pedidos con entrega a domicilio.</small>
              </label>
              <label>
                <span>Método de pago</span>
                <select v-model="draft.checkoutPaymentReq">
                  <option value="obligatorio">Obligatorio</option>
                  <option value="opcional">Opcional</option>
                </select>
                <small>Se captura antes de enviar a WhatsApp.</small>
              </label>
            </div>
          </section>

          <section class="px-2 py-3">
            <div class="mb-4">
              <p class="eyebrow">Visibilidad</p>
              <h3 class="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Funciones activas del negocio</h3>
            </div>
            <div class="grid-form">
              <div class="toggle-row">
                <label class="toggle-3d"><input v-model="draft.cartEnabled" type="checkbox" class="toggle-checkbox" /><span class="slider-3d"></span></label>
                <span class="toggle-row-label text-[14px] font-semibold text-zinc-800 dark:text-zinc-200">Carrito habilitado</span>
              </div>
              <div v-if="draft.cartEnabled" class="toggle-row">
                <label class="toggle-3d"><input v-model="draft.whatsappEnabled" type="checkbox" class="toggle-checkbox" /><span class="slider-3d"></span></label>
                <span class="toggle-row-label text-[14px] font-semibold text-zinc-800 dark:text-zinc-200">WhatsApp directo habilitado</span>
              </div>
              <div v-if="draft.cartEnabled" class="toggle-row">
                <label class="toggle-3d"><input v-model="draft.callEnabled" type="checkbox" class="toggle-checkbox" /><span class="slider-3d"></span></label>
                <span class="toggle-row-label text-[14px] font-semibold text-zinc-800 dark:text-zinc-200">Llamadas habilitadas</span>
              </div>
            </div>
          </section>
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

watch(() => draft.value.cartEnabled, (enabled) => {
  if (!enabled) {
    draft.value.whatsappEnabled = false
    draft.value.callEnabled = false
  }
})

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
    saveError.value = error instanceof Error ? error.message : 'No se pudieron guardar los ajustes de pedido.'
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

.theme-color-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 0.75rem;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
}

.theme-swatch {
  position: relative;
  display: flex !important;
  align-items: center;
  gap: 0.75rem;
  padding: 0.7rem 0.85rem !important;
  border-radius: 16px;
  border: 1px solid rgba(148, 163, 184, 0.25) !important;
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.95), rgba(248, 250, 252, 0.85)) !important;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  margin-top: 0 !important;
}

.theme-swatch:hover {
  border-color: rgba(59, 130, 246, 0.5) !important;
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.08);
}

.theme-swatch-chip {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  border: 2px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12), inset 0 0 0 1px rgba(15, 23, 42, 0.08);
}

.theme-swatch-body {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
  flex: 1;
}

.theme-swatch-label {
  font-size: 0.78rem;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.theme-swatch-hex {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.7rem;
  font-weight: 600;
  color: #64748b;
  letter-spacing: 0.02em;
}

.theme-swatch-input {
  position: absolute;
  inset: 0;
  width: 100% !important;
  height: 100% !important;
  opacity: 0;
  cursor: pointer;
  border: 0 !important;
  padding: 0 !important;
  margin: 0 !important;
}

.dark .theme-swatch {
  border-color: rgba(100, 116, 139, 0.35) !important;
  background: linear-gradient(160deg, rgba(15, 23, 42, 0.8), rgba(30, 41, 59, 0.7)) !important;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.dark .theme-swatch:hover {
  border-color: rgba(59, 130, 246, 0.6) !important;
  background: linear-gradient(160deg, rgba(30, 41, 59, 0.95), rgba(51, 65, 85, 0.85)) !important;
}

.dark .theme-swatch-chip {
  border-color: rgba(15, 23, 42, 0.8);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4), inset 0 0 0 1px rgba(148, 163, 184, 0.2);
}

.dark .theme-swatch-label {
  color: #f1f5f9;
}

.dark .theme-swatch-hex {
  color: #94a3b8;
}
</style>
