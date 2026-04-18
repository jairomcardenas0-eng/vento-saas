<template>
  <div v-if="catalog" class="admin-grid">
    <section class="panel-card span-2">
      <UiSectionHeader eyebrow="Promociones" title="Cupones y descuentos" description="Crea campañas con vigencia, limite de usos y monto minimo.">
        <template #actions>
          <button class="solid-btn" @click="openEditor()">
            Nuevo cupon
          </button>
        </template>
      </UiSectionHeader>

      <div v-if="loading" class="form-hint">Sincronizando cupones...</div>

      <div v-else-if="!coupons.length" class="rounded-[22px] border border-dashed border-zinc-300 bg-zinc-50 px-5 py-10 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-400">
        Todavia no hay cupones activos en este catalogo.
      </div>

      <div v-else class="grid gap-4 lg:grid-cols-2">
        <article v-for="coupon in coupons" :key="coupon.id" class="rounded-[26px] border border-zinc-200 bg-zinc-50 p-5 shadow-sm ring-1 ring-black/5 dark:border-zinc-800 dark:bg-zinc-950">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.24em] text-zinc-500 dark:text-zinc-400">{{ coupon.name || 'Cupon sin nombre' }}</p>
              <h3 class="mt-2 text-3xl font-semibold text-zinc-900 dark:text-zinc-100">{{ coupon.code }}</h3>
            </div>
            <span class="rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]" :class="coupon.active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-100' : 'bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'">
              {{ coupon.active ? 'Activo' : 'Pausado' }}
            </span>
          </div>

          <div class="mt-5 grid gap-3 sm:grid-cols-2">
            <div class="rounded-[20px] border border-zinc-200 bg-white/70 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/80">
              <small class="block text-zinc-500 dark:text-zinc-400">Descuento</small>
              <strong class="text-lg text-zinc-900 dark:text-zinc-100">{{ coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : money(coupon.discountValue, catalog.settings.currency) }}</strong>
            </div>
            <div class="rounded-[20px] border border-zinc-200 bg-white/70 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/80">
              <small class="block text-zinc-500 dark:text-zinc-400">Usos</small>
              <strong class="text-lg text-zinc-900 dark:text-zinc-100">{{ coupon.usedCount }} / {{ coupon.usageLimit ?? '∞' }}</strong>
            </div>
            <div class="rounded-[20px] border border-zinc-200 bg-white/70 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/80">
              <small class="block text-zinc-500 dark:text-zinc-400">Minimo</small>
              <strong class="text-lg text-zinc-900 dark:text-zinc-100">{{ money(coupon.minimumOrder, catalog.settings.currency) }}</strong>
            </div>
            <div class="rounded-[20px] border border-zinc-200 bg-white/70 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900/80">
              <small class="block text-zinc-500 dark:text-zinc-400">Vigencia</small>
              <strong class="text-sm text-zinc-900 dark:text-zinc-100">{{ formatWindow(coupon.startsAt, coupon.expiresAt) }}</strong>
            </div>
          </div>

          <div class="mt-5 flex flex-wrap gap-2">
            <button class="ghost-btn small" @click="toggleActive(coupon)">
              {{ coupon.active ? 'Pausar' : 'Activar' }}
            </button>
            <button class="ghost-btn small" @click="openEditor(coupon)">Editar</button>
            <button class="ghost-btn small" @click="removeCoupon(coupon)">Eliminar</button>
          </div>
        </article>
      </div>
    </section>

    <Transition
      enter-active-class="transition duration-200 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="drawerOpen" class="fixed inset-0 z-50 bg-black/45 backdrop-blur-sm" @click.self="drawerOpen = false">
        <div class="absolute inset-y-0 right-0 w-full max-w-xl overflow-y-auto border-l border-zinc-200 bg-white/95 p-5 shadow-[0_30px_90px_rgba(16,12,10,0.28)] dark:border-zinc-800 dark:bg-zinc-950/95">
          <div class="mb-6 flex items-start justify-between gap-4">
            <div>
              <p class="eyebrow">Cupon</p>
              <h3 class="m-0 text-2xl text-zinc-900 dark:text-zinc-100">{{ draft.id ? 'Editar campaña' : 'Nuevo cupon' }}</h3>
              <p class="section-copy mt-2 text-sm">Se valida directamente en el checkout publico antes de enviar el pedido.</p>
            </div>
            <button class="ghost-btn small !min-h-[40px]" @click="drawerOpen = false">Cerrar</button>
          </div>

          <form class="space-y-5" @submit.prevent="saveCoupon">
            <label class="block">
              <span class="mb-2 block text-sm text-zinc-500 dark:text-zinc-400">Nombre interno</span>
              <input v-model="draft.name" class="w-full rounded-[18px] border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950" required />
            </label>
            <label class="block">
              <span class="mb-2 block text-sm text-zinc-500 dark:text-zinc-400">Codigo</span>
              <input v-model="draft.code" class="w-full rounded-[18px] border border-zinc-200 bg-white px-4 py-3 uppercase dark:border-zinc-800 dark:bg-zinc-950" required />
            </label>

            <div class="grid gap-4 sm:grid-cols-2">
              <label class="block">
                <span class="mb-2 block text-sm text-zinc-500 dark:text-zinc-400">Tipo de descuento</span>
                <select v-model="draft.discountType" class="w-full rounded-[18px] border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
                  <option value="percentage">Porcentaje</option>
                  <option value="fixed">Monto fijo</option>
                </select>
              </label>
              <label class="block">
                <span class="mb-2 block text-sm text-zinc-500 dark:text-zinc-400">Valor</span>
                <input v-model.number="draft.discountValue" type="number" min="0" step="0.01" class="w-full rounded-[18px] border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950" />
              </label>
              <label class="block">
                <span class="mb-2 block text-sm text-zinc-500 dark:text-zinc-400">Monto minimo</span>
                <input v-model.number="draft.minimumOrder" type="number" min="0" step="0.01" class="w-full rounded-[18px] border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950" />
              </label>
              <label class="block">
                <span class="mb-2 block text-sm text-zinc-500 dark:text-zinc-400">Limite de usos</span>
                <input v-model.number="usageLimitProxy" type="number" min="1" step="1" class="w-full rounded-[18px] border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950" placeholder="Vacío = ilimitado" />
              </label>
              <label class="block">
                <span class="mb-2 block text-sm text-zinc-500 dark:text-zinc-400">Inicio</span>
                <input v-model="startsAtProxy" type="datetime-local" class="w-full rounded-[18px] border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950" />
              </label>
              <label class="block">
                <span class="mb-2 block text-sm text-zinc-500 dark:text-zinc-400">Expira</span>
                <input v-model="expiresAtProxy" type="datetime-local" class="w-full rounded-[18px] border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950" />
              </label>
            </div>

            <div class="grid gap-3 sm:grid-cols-2">
              <label class="toggle"><input v-model="draft.active" type="checkbox" /><span>Cupon activo</span></label>
              <label class="toggle"><input v-model="draft.visiblePublicly" type="checkbox" /><span>Mostrar en el catalogo</span></label>
            </div>

            <p v-if="errorMessage" class="text-sm text-rose-500">{{ errorMessage }}</p>

            <button class="solid-btn w-full" :disabled="saving">
              {{ saving ? 'Guardando...' : 'Guardar cupon' }}
            </button>
          </form>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { createCouponDraft } from '~/data/defaults'
import type { CatalogCoupon } from '~/types/catalog'
import { money } from '~/utils/catalog'

definePageMeta({ layout: 'admin' })

const backend = useSupabaseBackend()
const catalogStore = useCatalogStore()
const catalog = computed(() => catalogStore.activeCatalog)

const coupons = ref<CatalogCoupon[]>([])
const loading = ref(false)
const drawerOpen = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const draft = ref<CatalogCoupon>(createCouponDraft())
const startsAtProxy = ref('')
const expiresAtProxy = ref('')
const usageLimitProxy = ref<number | null>(null)

let stopCouponsWatcher: null | (() => void) = null

const syncDraftProxies = () => {
  startsAtProxy.value = draft.value.startsAt ? draft.value.startsAt.slice(0, 16) : ''
  expiresAtProxy.value = draft.value.expiresAt ? draft.value.expiresAt.slice(0, 16) : ''
  usageLimitProxy.value = draft.value.usageLimit
}

const loadCoupons = async (catalogId: string) => {
  loading.value = true
  try {
    coupons.value = await backend.getCoupons(catalogId)
  } finally {
    loading.value = false
  }

  stopCouponsWatcher?.()
  stopCouponsWatcher = backend.watchCoupons(catalogId, (items) => {
    coupons.value = items
  })
}

watch(catalog, async (value) => {
  if (!value) {
    return
  }

  await loadCoupons(value.id)
}, { immediate: true })

onBeforeUnmount(() => {
  stopCouponsWatcher?.()
})

const openEditor = (coupon?: CatalogCoupon) => {
  draft.value = coupon ? JSON.parse(JSON.stringify(coupon)) : createCouponDraft()
  syncDraftProxies()
  errorMessage.value = ''
  drawerOpen.value = true
}

const saveCoupon = async () => {
  if (!catalog.value) {
    return
  }

  saving.value = true
  errorMessage.value = ''
  try {
    draft.value.code = draft.value.code.trim().toUpperCase()
    draft.value.name = draft.value.name.trim()
    draft.value.startsAt = startsAtProxy.value ? new Date(startsAtProxy.value).toISOString() : null
    draft.value.expiresAt = expiresAtProxy.value ? new Date(expiresAtProxy.value).toISOString() : null
    draft.value.usageLimit = usageLimitProxy.value || null
    draft.value.updatedAt = new Date().toISOString()
    if (!draft.value.createdAt) {
      draft.value.createdAt = draft.value.updatedAt
    }

    await backend.upsertCoupon(catalog.value.id, draft.value)
    drawerOpen.value = false
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'No se pudo guardar el cupon.'
  } finally {
    saving.value = false
  }
}

const toggleActive = async (coupon: CatalogCoupon) => {
  if (!catalog.value) {
    return
  }

  await backend.upsertCoupon(catalog.value.id, {
    ...coupon,
    active: !coupon.active,
    updatedAt: new Date().toISOString(),
  })
}

const removeCoupon = async (coupon: CatalogCoupon) => {
  if (!catalog.value || !window.confirm(`Eliminar el cupon ${coupon.code}?`)) {
    return
  }

  await backend.deleteCoupon(catalog.value.id, coupon.id)
}

const formatWindow = (startsAt: string | null, expiresAt: string | null) => {
  if (!startsAt && !expiresAt) {
    return 'Siempre disponible'
  }

  const formatter = new Intl.DateTimeFormat('es-MX', { dateStyle: 'short', timeStyle: 'short' })
  return `${startsAt ? formatter.format(new Date(startsAt)) : 'Ahora'} - ${expiresAt ? formatter.format(new Date(expiresAt)) : 'Sin fin'}`
}
</script>
