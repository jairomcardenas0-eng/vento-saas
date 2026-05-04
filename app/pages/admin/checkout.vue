<template>
  <AdminStatePanel
    v-if="!catalog"
    title="No hay un catálogo activo"
    description="Selecciona un catálogo para definir cómo se capturan los pedidos."
  />

  <div v-else class="admin-grid">
    <section class="panel-card span-2 min-w-0">
      <UiSectionHeader eyebrow="Operación" title="Pedido y visibilidad" description="Controla qué funciones del negocio están activas y qué datos se piden al cliente.">
        <template #actions>
          <button class="solid-btn" :disabled="saving" @click="save">
            {{ saving ? 'Guardando...' : 'Guardar ajustes' }}
          </button>
        </template>
      </UiSectionHeader>

      <fieldset class="contents">
        <div class="space-y-8">
          <section class="px-2 py-3 space-y-4">
            <div>
              <p class="eyebrow">Funciones del negocio</p>
              <h3 class="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Funciones activas del negocio</h3>
              <p class="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Estas opciones controlan qué puede hacer el cliente dentro de tu tienda pública.</p>
            </div>

            <div class="space-y-3">
              <div class="toggle-card">
                <div>
                  <p class="toggle-card-title">Carrito habilitado</p>
                  <p class="toggle-card-copy">Permite agregar productos, abrir el carrito y completar pedidos desde la tienda.</p>
                </div>
                <label class="toggle-3d">
                  <input v-model="draft.cartEnabled" type="checkbox" class="toggle-checkbox" />
                  <span class="slider-3d"></span>
                </label>
              </div>

              <Transition name="fade-slide">
                <div v-if="!draft.cartEnabled" class="rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200">
                  Si desactivas el carrito, los clientes no podrán realizar pedidos desde tu tienda. Solo podrán ver el catálogo. Útil si quieres usar la app como menú digital de solo lectura.
                </div>
              </Transition>

              <Transition name="fade-slide">
                <div v-if="draft.cartEnabled" class="grid-form">
                  <div class="toggle-card">
                    <div>
                      <p class="toggle-card-title">WhatsApp directo</p>
                      <p class="toggle-card-copy">Muestra el botón para pedir de inmediato desde la ficha del producto.</p>
                    </div>
                    <label class="toggle-3d">
                      <input v-model="draft.whatsappEnabled" type="checkbox" class="toggle-checkbox" />
                      <span class="slider-3d"></span>
                    </label>
                  </div>

                  <div class="toggle-card">
                    <div>
                      <p class="toggle-card-title">Llamadas habilitadas</p>
                      <p class="toggle-card-copy">Muestra accesos para llamar al negocio desde la tienda pública.</p>
                    </div>
                    <label class="toggle-3d">
                      <input v-model="draft.callEnabled" type="checkbox" class="toggle-checkbox" />
                      <span class="slider-3d"></span>
                    </label>
                  </div>
                </div>
              </Transition>
            </div>
          </section>

          <Transition name="fade-slide">
            <section v-if="draft.cartEnabled" class="px-2 py-3 space-y-4">
              <div>
                <p class="eyebrow">Checkout</p>
                <h3 class="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Datos que se capturan</h3>
                <p class="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Activa cada campo por separado y define si será obligatorio u opcional.</p>
              </div>

              <div class="space-y-4">
                <article class="capture-card">
                  <div class="capture-head">
                    <div>
                      <p class="toggle-card-title">Nombre del cliente</p>
                      <p class="toggle-card-copy">Sirve para identificar el pedido y personalizar la atención.</p>
                    </div>
                    <label class="toggle-3d">
                      <input v-model="draft.checkoutNameEnabled" type="checkbox" class="toggle-checkbox" />
                      <span class="slider-3d"></span>
                    </label>
                  </div>

                  <Transition name="fade-slide">
                    <div v-if="draft.checkoutNameEnabled" class="capture-body">
                      <label class="block">
                        <span>Requisito</span>
                        <select v-model="draft.checkoutNameReq">
                          <option value="required">Obligatorio</option>
                          <option value="optional">Opcional</option>
                        </select>
                      </label>
                    </div>
                  </Transition>
                </article>

                <article class="capture-card">
                  <div class="capture-head">
                    <div>
                      <p class="toggle-card-title">Dirección de entrega</p>
                      <p class="toggle-card-copy">Solo aparece cuando el cliente elige entrega a domicilio.</p>
                    </div>
                    <label class="toggle-3d">
                      <input v-model="draft.checkoutAddressEnabled" type="checkbox" class="toggle-checkbox" />
                      <span class="slider-3d"></span>
                    </label>
                  </div>

                  <Transition name="fade-slide">
                    <div v-if="draft.checkoutAddressEnabled" class="capture-body">
                      <label class="block">
                        <span>Requisito</span>
                        <select v-model="draft.checkoutAddressReq">
                          <option value="required">Obligatorio</option>
                          <option value="optional">Opcional</option>
                        </select>
                      </label>
                    </div>
                  </Transition>
                </article>

                <article class="capture-card">
                  <div class="capture-head">
                    <div>
                      <p class="toggle-card-title">Método de pago</p>
                      <p class="toggle-card-copy">Permite que el cliente anticipe cómo piensa pagar su pedido.</p>
                    </div>
                    <label class="toggle-3d">
                      <input v-model="draft.checkoutPaymentEnabled" type="checkbox" class="toggle-checkbox" />
                      <span class="slider-3d"></span>
                    </label>
                  </div>

                  <Transition name="fade-slide">
                    <div v-if="draft.checkoutPaymentEnabled" class="capture-body">
                      <label class="block">
                        <span>Requisito</span>
                        <select v-model="draft.checkoutPaymentReq">
                          <option value="required">Obligatorio</option>
                          <option value="optional">Opcional</option>
                        </select>
                      </label>
                    </div>
                  </Transition>
                </article>
              </div>
            </section>
          </Transition>
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
.toggle-card,
.capture-card {
  border: 1px solid rgba(148, 163, 184, 0.22);
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.95), rgba(248, 250, 252, 0.86));
  border-radius: 20px;
  padding: 1rem 1.1rem;
}

.toggle-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.capture-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.capture-body {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(148, 163, 184, 0.18);
}

.toggle-card-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 800;
  color: #0f172a;
}

.toggle-card-copy {
  margin: 0.35rem 0 0;
  font-size: 0.8rem;
  line-height: 1.45;
  color: #64748b;
}

.toggle-3d {
  position: relative;
  display: inline-flex;
  align-items: center;
  width: 48px;
  height: 28px;
  flex: 0 0 auto;
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

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.2s ease;
}

.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.dark .toggle-card,
.dark .capture-card {
  border-color: rgba(100, 116, 139, 0.35);
  background: linear-gradient(160deg, rgba(15, 23, 42, 0.62), rgba(15, 23, 42, 0.38));
}

.dark .toggle-card-title {
  color: #f8fafc;
}

.dark .toggle-card-copy {
  color: #94a3b8;
}

.dark .capture-body {
  border-top-color: rgba(100, 116, 139, 0.22);
}

.dark .slider-3d {
  background: linear-gradient(180deg, #3f3f46 0%, #27272a 100%);
}

.dark .toggle-checkbox:checked + .slider-3d {
  background: linear-gradient(180deg, #22d3ee 0%, #0891b2 100%);
}
</style>
