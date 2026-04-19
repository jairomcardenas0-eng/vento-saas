<template>
  <div v-if="catalog" class="admin-grid">
    <section class="panel-card span-2 relative overflow-hidden">
      <UiSectionHeader eyebrow="Operacion" title="Ajustes del negocio" description="Identidad, horarios, delivery, pickup y checkout comercial del catalogo.">
        <template #actions>
          <button class="solid-btn" :disabled="saving" @click="save">
            {{ saving ? 'Guardando...' : 'Guardar ajustes' }}
          </button>
        </template>
      </UiSectionHeader>

      <fieldset class="contents">
        <div class="space-y-8 transition duration-200">
          <section class="p-4">
            <div class="mb-4">
              <p class="eyebrow">General</p>
              <h3 class="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Identidad comercial</h3>
            </div>
            <div class="grid-form">
              <label><span>Nombre del negocio</span><input v-model="draft.businessName" /><small>Nombre visible en el storefront publico.</small></label>
              <label class="full">
                <span>Logo del negocio</span>
                <div v-if="draft.logoUrl" class="mb-3 flex items-center gap-3">
                  <img :src="draft.logoUrl" alt="Logo" class="h-16 w-16 rounded-xl object-cover border border-zinc-200 dark:border-zinc-800" />
                  <button class="ghost-btn small !text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30" type="button" @click="clearLogo">Quitar logo</button>
                </div>
                <input id="logo-file" type="file" accept="image/*" class="hidden" @change="onLogoSelected" />
                <label for="logo-file" class="ghost-btn small !w-full !cursor-pointer !justify-center">
                  {{ draft.logoUrl ? 'Cambiar logo' : 'Subir logo' }}
                </label>
                <small class="mt-2 block">Este logo aparece en la tienda y en el panel de administración.</small>
              </label>
              
              <div class="full relative">
                 <span class="mb-2 block text-sm font-semibold text-zinc-900 dark:text-zinc-100">Tipo de negocio</span>
                 
                 <!-- Tags view -->
                 <div
                   class="relative z-10 flex min-h-[48px] w-full cursor-pointer flex-wrap items-center gap-2 rounded-[16px] border border-zinc-200 bg-white px-3 py-2 transition hover:border-zinc-300 focus-within:ring-2 focus-within:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
                   @click="showBusinessTypeDropdown = !showBusinessTypeDropdown"
                 >
                   <span v-for="t in draft.businessType" :key="t" class="flex items-center gap-1.5 rounded-full bg-zinc-100 pl-3 pr-2 py-1.5 text-[13px] font-semibold text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                     {{ t }}
                     <button type="button" class="flex h-5 w-5 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 dark:hover:bg-zinc-700 dark:hover:text-zinc-100" @click.stop="toggleBusinessType(t)">
                       &times;
                     </button>
                   </span>
                   <span v-if="!draft.businessType.length" class="pl-2 text-[15px] text-zinc-500">Selecciona hasta 3 categorías...</span>
                   
                   <div class="ml-auto pointer-events-none pr-1">
                     <svg class="h-4 w-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
                   </div>
                 </div>
                 
                 <!-- Overlay to close -->
                 <div v-if="showBusinessTypeDropdown" class="fixed inset-0 z-40 bg-transparent" @click.stop="showBusinessTypeDropdown = false"></div>

                 <!-- Dropdown Menu -->
                 <div v-if="showBusinessTypeDropdown" class="absolute left-0 right-0 top-[100%] z-50 mt-2 max-h-72 overflow-y-auto rounded-[20px] border border-zinc-200 bg-white/95 p-2 shadow-2xl backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/95">
                   <button
                     v-for="opt in businessTypeOptions"
                     :key="opt"
                     type="button"
                     class="flex w-full items-center justify-between rounded-[14px] px-4 py-3 text-left text-[14px] transition-colors"
                     :class="draft.businessType.includes(opt) ? 'bg-zinc-100 font-bold text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100' : 'text-zinc-700 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/50'"
                     :disabled="!draft.businessType.includes(opt) && draft.businessType.length >= 3"
                     @click.stop="toggleBusinessType(opt)"
                   >
                     <span>{{ opt }}</span>
                     <svg v-if="draft.businessType.includes(opt)" class="h-4 w-4 text-zinc-900 dark:text-zinc-100" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" /></svg>
                     <!-- Optional lock icon if disabled capacity -->
                     <svg v-if="!draft.businessType.includes(opt) && draft.businessType.length >= 3" class="h-4 w-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                   </button>
                 </div>

                 <small class="mt-2 block text-[13px] text-zinc-500">Hasta 3 categorías que se ajusten a tu tipo de negocio.</small>
              </div>
              <label class="full"><span>Descripcion corta</span><input v-model="draft.tagline" /><small>Se usa en cabecera, SEO y tarjetas del marketplace.</small></label>
              <label><span>WhatsApp</span><UiPhoneInput v-model="draft.whatsapp" placeholder="55 7330 5185" /><small>Número para recibir pedidos vía WhatsApp.</small></label>
              <label><span>Teléfono</span><UiPhoneInput v-model="draft.phone" placeholder="55 7330 5185" /><small>Canal alterno para contacto directo.</small></label>
              <label><span>Instagram</span><input v-model="draft.instagram" placeholder="@negocio" /><small>Usuario o URL completa.</small></label>
              <label><span>Facebook</span><input v-model="draft.facebook" placeholder="https://facebook.com/..." /><small>Pagina o perfil oficial.</small></label>
              <label><span>Sitio web</span><input v-model="draft.website" placeholder="https://..." /><small>Landing externa o dominio principal.</small></label>
              <label><span>Zona horaria</span>
                <select v-model="draft.timezone">
                  <option v-for="zone in timezones" :key="zone" :value="zone">{{ zone }}</option>
                </select>
                <small>Base para horarios dinamicos y sellos de tiempo.</small>
              </label>
              <label><span>Moneda</span><input v-model="draft.currency" /><small>Moneda principal del catalogo.</small></label>
              <label><span>OG Title</span><input v-model="draft.ogTitle" /><small>Titulo social para compartir.</small></label>
              <label class="full"><span>OG Description</span><textarea v-model="draft.ogDescription" rows="3" /><small>Descripcion de vista previa en buscadores y redes.</small></label>
            </div>
          </section>
          <AdminAddressMapEditor v-model="draft.address" />

          <section class="p-3 sm:p-4">
            <div class="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p class="eyebrow">Horarios</p>
                <h3 class="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Motor semanal del negocio</h3>
              </div>
              <div class="grid gap-3 sm:grid-cols-2">
                <label class="toggle"><input v-model="scheduleAlwaysOpen" type="radio" name="schedule-mode" :value="true" /><span>Modo 24/7</span></label>
                <label class="toggle"><input v-model="scheduleAlwaysOpen" type="radio" name="schedule-mode" :value="false" /><span>Rango por dias</span></label>
              </div>
            </div>
            <p class="mb-4 text-sm text-zinc-500 dark:text-zinc-400">{{ scheduleStatusLabel }}</p>

            <div v-if="draft.scheduleMode === 'weekly'" class="space-y-4">
              <article v-for="(day, dayIndex) in draft.weeklySchedule" :key="day.dayKey" class="rounded-[28px] border border-zinc-200 bg-zinc-50/50 p-3 sm:p-5 dark:border-zinc-800/50 dark:bg-zinc-900/40">
                <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div class="flex flex-wrap items-center gap-3">
                    <label class="toggle !m-0">
                      <input v-model="day.enabled" type="checkbox" />
                      <span class="text-base font-bold">{{ day.label }}</span>
                    </label>
                    <span class="rounded-full bg-zinc-200/50 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      {{ day.enabled ? 'Abierto' : 'Cerrado' }}
                    </span>
                  </div>
                  <button class="ghost-btn small !min-h-[34px] !rounded-full !px-3 !text-xs" type="button" @click="addScheduleRange(dayIndex)">
                    + Añadir horario
                  </button>
                </div>
                
                <div v-if="day.enabled" class="space-y-3 pl-2">
                  <div v-for="(range, rangeIndex) in day.ranges" :key="`${day.dayKey}-${rangeIndex}`" class="flex flex-wrap items-end gap-4 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-950 dark:ring-zinc-800">
                    <div class="flex-1 space-y-1.5">
                      <span class="block text-[10px] font-bold uppercase tracking-widest text-zinc-400">Apertura</span>
                      <input v-model="range.start" type="time" class="w-full bg-transparent text-lg font-medium outline-none dark:text-zinc-100" />
                    </div>
                    <div class="flex flex-1 items-center gap-3">
                      <div class="h-8 w-px bg-zinc-200 dark:bg-zinc-800"></div>
                      <div class="flex-1 space-y-1.5">
                        <span class="block text-[10px] font-bold uppercase tracking-widest text-zinc-400">Cierre</span>
                        <input v-model="range.end" type="time" class="w-full bg-transparent text-lg font-medium outline-none dark:text-zinc-100" />
                      </div>
                    </div>
                    <button v-if="day.ranges.length > 1" class="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-rose-50 text-rose-600 transition hover:bg-rose-100 dark:bg-rose-950/30 dark:text-rose-400" type="button" @click="removeScheduleRange(dayIndex, rangeIndex)">
                      <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                </div>
                
                <div v-else class="pl-2 pt-2 text-sm text-zinc-400 italic">
                  No se aceptarán pedidos este día.
                </div>
              </article>
            </div>
          </section>

          <section class="p-4">
            <div class="mb-4">
              <p class="eyebrow">Delivery</p>
              <h3 class="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Zonas, tarifa y pedido minimo</h3>
            </div>
            <div class="grid-form">
              <label class="toggle"><input v-model="draft.deliveryEnabled" type="checkbox" /><span>Servicio de delivery activo</span></label>
              <label class="toggle"><input v-model="draft.deliveryPaused" type="checkbox" /><span>Pausa temporal de pedidos</span></label>
              <label><span>Tipo de tarifa</span>
                <select v-model="draft.deliveryFeeType">
                  <option value="flat">Tarifa fija global</option>
                  <option value="zones">Zonas con precios distintos</option>
                </select>
                <small>Define si toda la ciudad comparte un costo o si usaras zonas.</small>
              </label>
              <label v-if="draft.deliveryFeeType === 'flat'"><span>Costo fijo de envio</span><input v-model.number="draft.deliveryFlatFee" type="number" min="0" step="0.01" /><small>Se suma al total cuando el cliente elige delivery.</small></label>
              <label v-if="draft.deliveryFeeType === 'flat'"><span>Pedido minimo global</span><input v-model.number="draft.deliveryMinimumOrder" type="number" min="0" step="0.01" /><small>Bloquea checkout si el subtotal no llega a este monto.</small></label>
              <label class="full"><span>Instrucciones para rider</span><textarea v-model="draft.riderInstructions" rows="3" /><small>Notas internas para reparto y preparación de salida.</small></label>
            </div>

            <div v-if="draft.deliveryFeeType === 'zones'" class="mt-5 space-y-4">
              <div class="flex items-center justify-between gap-3">
                <h4 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Zonas personalizadas</h4>
                <button class="ghost-btn small" type="button" @click="addDeliveryZone">Añadir zona</button>
              </div>

              <div v-if="!draft.deliveryZones.length" class="rounded-[18px] border border-dashed border-zinc-300 px-4 py-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                No hay zonas configuradas todavia.
              </div>

              <article v-for="(zone, zoneIndex) in draft.deliveryZones" :key="zone.id" class="rounded-[22px] border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/70">
                <div class="grid gap-4 lg:grid-cols-4">
                  <label><span>Nombre de la zona</span><input v-model="zone.name" /><small>Ej: Centro, Miramar, Roma Norte.</small></label>
                  <label><span>Precio de envio</span><input v-model.number="zone.price" type="number" min="0" step="0.01" /><small>Costo extra de la zona.</small></label>
                  <label><span>Pedido minimo</span><input v-model.number="zone.minOrder" type="number" min="0" step="0.01" /><small>Opcional por zona.</small></label>
                  <label><span>ETA minutos</span><input v-model.number="zone.estimatedMinutes" type="number" min="0" step="1" /><small>Tiempo estimado al cliente.</small></label>
                </div>
                <button class="ghost-btn small mt-4" type="button" @click="draft.deliveryZones.splice(zoneIndex, 1)">Eliminar zona</button>
              </article>
            </div>
          </section>

          <section class="p-4">
            <div class="mb-4">
              <p class="eyebrow">Pickup</p>
              <h3 class="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Recogida en tienda</h3>
            </div>
            <div class="grid-form">
              <label class="toggle"><input v-model="draft.pickupEnabled" type="checkbox" /><span>Servicio de recogida activo</span></label>
              <label><span>Punto de recogida</span><input v-model="draft.pickupPoint" /><small>Mostrador principal, ventanilla, barra, etc.</small></label>
              <label><span>Tiempo estimado</span><input v-model.number="draft.pickupEtaMinutes" type="number" min="0" step="1" /><small>Minutos para tener el pedido listo.</small></label>
              <label class="full"><span>Instrucciones para el cliente</span><textarea v-model="draft.pickupInstructions" rows="3" /><small>Ej: presenta tu nombre en caja y espera confirmacion.</small></label>
            </div>
          </section>

          <section class="p-4">
            <div class="mb-4">
              <p class="eyebrow">Checkout</p>
              <h3 class="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Politicas de captura y visibilidad</h3>
            </div>
            <div class="grid-form">
              <label><span>Checkout nombre</span>
                <select v-model="draft.checkoutNameReq">
                  <option value="obligatorio">Obligatorio</option>
                  <option value="opcional">Opcional</option>
                </select>
                <small>Define si el nombre se exige antes de enviar a WhatsApp.</small>
              </label>
              <label><span>Checkout direccion</span>
                <select v-model="draft.checkoutAddressReq">
                  <option value="obligatorio">Obligatorio</option>
                  <option value="opcional">Opcional</option>
                </select>
                <small>Solo aplica a delivery.</small>
              </label>
              <label><span>Checkout pago</span>
                <select v-model="draft.checkoutPaymentReq">
                  <option value="obligatorio">Obligatorio</option>
                  <option value="opcional">Opcional</option>
                </select>
                <small>Captura del metodo de pago antes de WhatsApp.</small>
              </label>
              <label class="toggle"><input v-model="draft.closed" type="checkbox" /><span>Forzar cierre total</span></label>
              <label class="toggle"><input v-model="draft.reviewsEnabled" type="checkbox" /><span>Reseñas activas</span></label>
              <label class="toggle"><input v-model="draft.reviewModeration" type="checkbox" /><span>Moderacion de reseñas</span></label>
              <label class="toggle"><input v-model="draft.cartEnabled" type="checkbox" /><span>Carrito habilitado</span></label>
              <label class="toggle"><input v-model="draft.productCarouselEnabled" type="checkbox" /><span>Carrusel de producto</span></label>
              <label class="full"><span>Mensaje de cierre</span><textarea v-model="draft.closedMessage" rows="3" /><small>Mensaje principal cuando el negocio queda fuera de servicio.</small></label>
            </div>
          </section>

        </div>
      </fieldset>

      <p v-if="saveError" class="mt-4 text-sm text-rose-500">{{ saveError }}</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { createDeliveryZone, defaultSettings } from '~/data/defaults'
import type { BusinessDaySchedule, CatalogOperationalSettings } from '~/types/catalog'
import { getCurrentScheduleState } from '~/utils/catalog'

definePageMeta({ layout: 'admin' })

const timezones = [
  'America/Mexico_City',
  'America/Havana',
  'America/Bogota',
  'America/New_York',
  'Europe/Madrid',
]

const catalogStore = useCatalogStore()
const catalog = computed(() => catalogStore.activeCatalog)
const isPaywalled = computed(() => false)
const draft = ref<CatalogOperationalSettings>(defaultSettings())
const saving = ref(false)
const saveError = ref('')

const scheduleAlwaysOpen = computed({
  get: () => draft.value.scheduleMode === 'always',
  set: (value: boolean) => {
    draft.value.scheduleMode = value ? 'always' : 'weekly'
  },
})

const scheduleStatusLabel = computed(() => getCurrentScheduleState(draft.value).label)

watch(catalog, (value) => {
  if (!value) {
    return
  }

  draft.value = {
    ...defaultSettings(value.settings.businessName, value.slug),
    ...JSON.parse(JSON.stringify(value.settings)),
  }

  // Backwards compatibility
  if (typeof draft.value.businessType === 'string') {
    draft.value.businessType = [(draft.value as any).businessType]
  } else if (!Array.isArray(draft.value.businessType)) {
    draft.value.businessType = []
  }
  
  // Backwards compatibility for address
  if (typeof draft.value.address === 'string') {
    draft.value.address = {
      countryCode: '',
      stateCode: '',
      city: '',
      details: draft.value.address,
      lat: 23.6345,
      lng: -102.5528,
    }
  } else if (!draft.value.address || !draft.value.address.lat) {
    draft.value.address = {
      countryCode: '',
      stateCode: '',
      city: '',
      details: '',
      lat: 23.6345,
      lng: -102.5528,
    }
  }
}, { immediate: true })

const businessTypeOptions = [
  'Academia', 'Arte / Artesanías', 'Artículos de aseo', 'Artículos para bebés', 'Automotriz',
  'Bar', 'Belleza', 'Café', 'Cafetería y Comida rápida', 'Carnicería', 'Catálogo', 'Combos',
  'Computadoras y accesorios', 'Consultoría', 'Cosmética natural', 'Dulcería', 'Enoteca',
  'Ferretería', 'Floristería', 'Grocery o Bodegón', 'Gym', 'Hamburguesería', 'Heladería',
  'Hogar y decoración', 'Imprenta', 'Impresión y personalización', 'Joyería y relojería',
  'Juguetería', 'Marketing y publicidad', 'Móviles y accesorios', 'Organización de eventos',
  'Panadería', 'Perfumería', 'Pescadería', 'Pizzería', 'Productos naturales', 'Restaurante',
  'Ropa', 'Ropa deportiva', 'Salud / Farmacia', 'Servicio de fotografía', 'Servicio informático',
  'Sex Shop', 'Tienda de mascotas', 'Tienda de regalos', 'Tienda general', 'Tiendas de videojuegos'
]

const showBusinessTypeDropdown = ref(false)
const toggleBusinessType = (type: string) => {
  if (draft.value.businessType.includes(type)) {
    draft.value.businessType = draft.value.businessType.filter(t => t !== type)
  } else if (draft.value.businessType.length < 3) {
    draft.value.businessType.push(type)
  }
}

const storageEngine = useStorageEngine()
const uploadingLogo = ref(false)

const onLogoSelected = async (event: Event) => {
  if (!catalog.value) return

  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  uploadingLogo.value = true
  try {
    draft.value.logoUrl = await storageEngine.uploadProductImage(catalog.value.id, file)
  } catch (error) {
    console.error('Error al subir logo:', error)
  } finally {
    uploadingLogo.value = false
    target.value = ''
  }
}

const clearLogo = () => {
  draft.value.logoUrl = ''
}

const describeDay = (day: BusinessDaySchedule) => {
  if (!day.enabled) {
    return 'Cerrado'
  }

  return day.ranges.map(range => `${range.start} - ${range.end}`).join(' | ')
}

const addScheduleRange = (dayIndex: number) => {
  draft.value.weeklySchedule[dayIndex]?.ranges.push({ start: '18:00', end: '22:00' })
}

const removeScheduleRange = (dayIndex: number, rangeIndex: number) => {
  const day = draft.value.weeklySchedule[dayIndex]
  if (!day || day.ranges.length <= 1) {
    return
  }

  day.ranges.splice(rangeIndex, 1)
}

const addDeliveryZone = () => {
  draft.value.deliveryZones.push(createDeliveryZone())
}

const sanitizeSchedule = () => draft.value.weeklySchedule.map(day => ({
  ...day,
  ranges: day.ranges
    .filter(range => range.start && range.end)
    .map(range => ({ start: range.start, end: range.end })),
}))

const save = async () => {
  if (isPaywalled.value) {
    saveError.value = 'Esta configuracion premium requiere un plan PRO o GOLD.'
    return
  }

  saving.value = true
  saveError.value = ''
  try {
    await catalogStore.updateSettings({
      ...draft.value,
      weeklySchedule: sanitizeSchedule(),
      deliveryZones: draft.value.deliveryZones.map(zone => ({
        ...zone,
        name: zone.name.trim(),
        price: Number(zone.price || 0),
        minOrder: Number(zone.minOrder || 0),
        estimatedMinutes: Number(zone.estimatedMinutes || 0),
      })),
    })
  } catch (error) {
    saveError.value = error instanceof Error ? error.message : 'No se pudieron guardar los ajustes.'
  } finally {
    saving.value = false
  }
}
</script>
