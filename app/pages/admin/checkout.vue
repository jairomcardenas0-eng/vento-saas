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
              <div class="flex items-center gap-3">
                <label class="toggle-3d"><input v-model="draft.closed" type="checkbox" class="toggle-checkbox" /><span class="slider-3d"></span></label>
                <span class="text-[14px] font-semibold text-zinc-800 dark:text-zinc-200">Forzar cierre total</span>
              </div>
              <div class="flex items-center gap-3">
                <label class="toggle-3d"><input v-model="draft.reviewsEnabled" type="checkbox" class="toggle-checkbox" /><span class="slider-3d"></span></label>
                <span class="text-[14px] font-semibold text-zinc-800 dark:text-zinc-200">Reseñas activas</span>
              </div>
              <div class="flex items-center gap-3">
                <label class="toggle-3d"><input v-model="draft.reviewModeration" type="checkbox" class="toggle-checkbox" /><span class="slider-3d"></span></label>
                <span class="text-[14px] font-semibold text-zinc-800 dark:text-zinc-200">Moderación de reseñas</span>
              </div>
              <div class="flex items-center gap-3">
                <label class="toggle-3d"><input v-model="draft.cartEnabled" type="checkbox" class="toggle-checkbox" /><span class="slider-3d"></span></label>
                <span class="text-[14px] font-semibold text-zinc-800 dark:text-zinc-200">Carrito habilitado</span>
              </div>
              <div class="flex items-center gap-3">
                <label class="toggle-3d"><input v-model="draft.whatsappEnabled" type="checkbox" class="toggle-checkbox" /><span class="slider-3d"></span></label>
                <span class="text-[14px] font-semibold text-zinc-800 dark:text-zinc-200">WhatsApp directo habilitado</span>
              </div>
              <div class="flex items-center gap-3">
                <label class="toggle-3d"><input v-model="draft.productCarouselEnabled" type="checkbox" class="toggle-checkbox" /><span class="slider-3d"></span></label>
                <span class="text-[14px] font-semibold text-zinc-800 dark:text-zinc-200">Carrusel de productos</span>
              </div>
              <label class="full mt-4"><span>Mensaje de cierre</span><textarea v-model="draft.closedMessage" rows="3" /><small>Texto principal cuando el negocio no está disponible.</small></label>
            </div>
          </section>

          <section class="px-2 py-3">
            <div class="mb-4">
              <p class="eyebrow">Pantalla de cierre</p>
              <h3 class="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Botones y estilo del cierre</h3>
            </div>
            <div class="grid-form">
              <div class="flex items-center gap-3">
                <label class="toggle-3d"><input v-model="draft.closedShowMenuBtn" type="checkbox" class="toggle-checkbox" /><span class="slider-3d"></span></label>
                <span class="text-[14px] font-semibold text-zinc-800 dark:text-zinc-200">Mostrar botón "Ver menú"</span>
              </div>
              <div class="flex items-center gap-3">
                <label class="toggle-3d"><input v-model="draft.closedShowWhatsapp" type="checkbox" class="toggle-checkbox" /><span class="slider-3d"></span></label>
                <span class="text-[14px] font-semibold text-zinc-800 dark:text-zinc-200">Mostrar botón de WhatsApp</span>
              </div>
              <div class="flex items-center gap-3">
                <label class="toggle-3d"><input v-model="draft.closedShowCall" type="checkbox" class="toggle-checkbox" /><span class="slider-3d"></span></label>
                <span class="text-[14px] font-semibold text-zinc-800 dark:text-zinc-200">Mostrar botón de llamada</span>
              </div>
              <div class="flex items-center gap-3">
                <label class="toggle-3d"><input v-model="draft.closedTextBox" type="checkbox" class="toggle-checkbox" /><span class="slider-3d"></span></label>
                <span class="text-[14px] font-semibold text-zinc-800 dark:text-zinc-200">Usar caja de texto</span>
              </div>
              <label><span>Color del texto</span><input v-model="draft.closedTextColor" type="color" /></label>
              <label><span>Fondo del botón “Ver menú”</span><input v-model="draft.closedMenuBtnBg" type="color" /></label>
              <label><span>Texto del botón “Ver menú”</span><input v-model="draft.closedMenuBtnText" type="color" /></label>
              <label><span>Fondo de la caja de texto</span><input v-model="draft.closedTextBoxColor" type="color" /></label>
              <label><span>Opacidad de la caja (%)</span><input v-model.number="draft.closedTextBoxOpacity" type="number" min="0" max="100" step="1" /></label>
              <label><span>Tamaño del texto principal</span><input v-model.number="draft.closedTextSizeLarge" type="number" min="12" step="1" /></label>
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
