<template>
  <div v-if="catalog" class="admin-grid">
    <section class="panel-card span-2">
      <UiSectionHeader eyebrow="Operación" title="Checkout y visibilidad" description="Controla qué datos se requieren al hacer un pedido y opciones del negocio.">
        <template #actions>
          <button class="solid-btn" :disabled="saving" @click="save">
            {{ saving ? 'Guardando...' : 'Guardar checkout' }}
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
                <small>Define si el nombre se exige antes de enviar a WhatsApp.</small>
              </label>
              <label>
                <span>Dirección de entrega</span>
                <select v-model="draft.checkoutAddressReq">
                  <option value="obligatorio">Obligatorio</option>
                  <option value="opcional">Opcional</option>
                </select>
                <small>Solo aplica a pedidos de delivery.</small>
              </label>
              <label>
                <span>Método de pago</span>
                <select v-model="draft.checkoutPaymentReq">
                  <option value="obligatorio">Obligatorio</option>
                  <option value="opcional">Opcional</option>
                </select>
                <small>Captura del método de pago antes de enviar a WhatsApp.</small>
              </label>
            </div>
          </section>

          <section class="px-2 py-3">
            <div class="mb-4">
              <p class="eyebrow">Visibilidad</p>
              <h3 class="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Funciones activas del negocio</h3>
            </div>
            <div class="grid-form">
              <label class="toggle"><input v-model="draft.closed" type="checkbox" /><span>Forzar cierre total</span></label>
              <label class="toggle"><input v-model="draft.reviewsEnabled" type="checkbox" /><span>Reseñas activas</span></label>
              <label class="toggle"><input v-model="draft.reviewModeration" type="checkbox" /><span>Moderación de reseñas</span></label>
              <label class="toggle"><input v-model="draft.cartEnabled" type="checkbox" /><span>Carrito habilitado</span></label>
              <label class="toggle"><input v-model="draft.whatsappEnabled" type="checkbox" /><span>WhatsApp directo habilitado</span></label>
              <label class="toggle"><input v-model="draft.productCarouselEnabled" type="checkbox" /><span>Carrusel de producto</span></label>
              <label class="full"><span>Mensaje de cierre</span><textarea v-model="draft.closedMessage" rows="3" /><small>Mensaje principal cuando el negocio queda fuera de servicio.</small></label>
            </div>
          </section>

          <section class="px-2 py-3">
            <div class="mb-4">
              <p class="eyebrow">Pantalla de cierre</p>
              <h3 class="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Botones y estilo del cierre</h3>
            </div>
            <div class="grid-form">
              <label class="toggle"><input v-model="draft.closedShowMenuBtn" type="checkbox" /><span>Mostrar botón Ver menú</span></label>
              <label class="toggle"><input v-model="draft.closedShowWhatsapp" type="checkbox" /><span>Mostrar botón WhatsApp</span></label>
              <label class="toggle"><input v-model="draft.closedShowCall" type="checkbox" /><span>Mostrar botón Llamar</span></label>
              <label class="toggle"><input v-model="draft.closedTextBox" type="checkbox" /><span>Usar caja de texto</span></label>
              <label><span>Color del texto</span><input v-model="draft.closedTextColor" type="color" /></label>
              <label><span>Fondo botón Ver menú</span><input v-model="draft.closedMenuBtnBg" type="color" /></label>
              <label><span>Texto botón Ver menú</span><input v-model="draft.closedMenuBtnText" type="color" /></label>
              <label><span>Fondo caja de texto</span><input v-model="draft.closedTextBoxColor" type="color" /></label>
              <label><span>Opacidad caja (%)</span><input v-model.number="draft.closedTextBoxOpacity" type="number" min="0" max="100" step="1" /></label>
              <label><span>Tamaño texto principal</span><input v-model.number="draft.closedTextSizeLarge" type="number" min="12" step="1" /></label>
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
  if (!value) return
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
    saveError.value = error instanceof Error ? error.message : 'No se pudo guardar el checkout.'
  } finally {
    saving.value = false
  }
}
</script>
