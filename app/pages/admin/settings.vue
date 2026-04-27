<template>
  <div v-if="catalog" class="admin-grid">
    <section class="panel-card span-2 relative overflow-hidden">
      <UiSectionHeader eyebrow="General" title="Ajustes del negocio" description="Identidad, contacto, redes sociales y moneda del catálogo.">
        <template #actions>
          <button class="solid-btn" :disabled="saving || uploadingLogo" @click="save">
            {{ saving ? 'Guardando...' : 'Guardar ajustes' }}
          </button>
        </template>
      </UiSectionHeader>

      <fieldset class="contents">
        <div class="space-y-8 transition duration-200">
          <section class="px-2 py-3">
            <div class="mb-4">
              <p class="eyebrow">Identidad</p>
              <h3 class="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Información comercial</h3>
            </div>
            <div class="grid-form">
              <label><span>Nombre del negocio</span><input v-model="draft.businessName" /><small>Nombre visible en el storefront público.</small></label>
              <label class="full">
                <span>Logo del negocio</span>
                <p class="mb-2 text-xs" :class="imageUsageClass">
                  {{ imageUsageText }}
                </p>
                <div v-if="uploadingLogo" class="mt-2 mb-3">
                  <div class="flex items-center justify-between mb-1">
                    <span class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Comprimiendo y subiendo...</span>
                    <span class="text-xs font-mono font-bold text-zinc-500">{{ uploadLogoProgress }}%</span>
                  </div>
                  <div class="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
                    <div class="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300 ease-out" :style="{ width: `${uploadLogoProgress}%` }" />
                  </div>
                </div>
                <div v-if="draft.logoUrl" class="mb-3 flex items-center gap-3">
                  <img :src="draft.logoUrl" alt="Logo" class="h-16 w-16 rounded-xl object-cover border border-zinc-200 dark:border-zinc-800" />
                  <button class="ghost-btn small !text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30" type="button" @click="clearLogo">Quitar logo</button>
                </div>
                <input id="logo-file" type="file" accept="image/*" class="hidden" @change="onLogoSelected" />
                <label for="logo-file" class="ghost-btn small !w-full !cursor-pointer !justify-center">
                  {{ uploadingLogo ? 'Subiendo...' : draft.logoUrl ? 'Cambiar logo' : 'Subir logo' }}
                </label>
                <small class="mt-2 block">Este logo aparece en la tienda y en el panel de administración.</small>
              </label>

              <div class="full relative">
                <span class="mb-2 block text-sm font-semibold text-zinc-900 dark:text-zinc-100">Tipo de negocio</span>
                <div
                  class="relative z-10 flex min-h-[48px] w-full cursor-pointer flex-wrap items-center gap-2 rounded-[16px] border border-zinc-200 bg-white px-3 py-2 transition hover:border-zinc-300 focus-within:ring-2 focus-within:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
                  @click="showBusinessTypeDropdown = !showBusinessTypeDropdown"
                >
                  <span v-for="t in draft.businessType" :key="t" class="flex items-center gap-1.5 rounded-full bg-zinc-100 pl-3 pr-2 py-1.5 text-[13px] font-semibold text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                    {{ t }}
                    <button type="button" class="flex h-5 w-5 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900 dark:hover:bg-zinc-700 dark:hover:text-zinc-100" @click.stop="toggleBusinessType(t)">&times;</button>
                  </span>
                  <span v-if="!draft.businessType.length" class="pl-2 text-[15px] text-zinc-500">Selecciona hasta 3 categorías...</span>
                  <div class="ml-auto pointer-events-none pr-1">
                    <svg class="h-4 w-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" /></svg>
                  </div>
                </div>
                <div v-if="showBusinessTypeDropdown" class="fixed inset-0 z-40 bg-transparent" @click.stop="showBusinessTypeDropdown = false"></div>
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
                  </button>
                </div>
                <small class="mt-2 block text-[13px] text-zinc-500">Hasta 3 categorías que se ajusten a tu tipo de negocio.</small>
              </div>

              <label class="full"><span>Descripción corta</span><input v-model="draft.tagline" /><small>Se usa en cabecera, SEO y tarjetas del marketplace.</small></label>
              <label><span>WhatsApp</span><UiPhoneInput v-model="draft.whatsapp" placeholder="55 7330 5185" /><small>Número para recibir pedidos vía WhatsApp.</small></label>
              <label><span>Teléfono</span><UiPhoneInput v-model="draft.phone" placeholder="55 7330 5185" /><small>Canal alterno para contacto directo.</small></label>
              <label><span>Instagram</span><input v-model="draft.instagram" placeholder="@negocio" /><small>Usuario o URL completa.</small></label>
              <label><span>Facebook</span><input v-model="draft.facebook" placeholder="https://facebook.com/..." /><small>Página o perfil oficial.</small></label>
              <label><span>Sitio web</span><input v-model="draft.website" placeholder="https://..." /><small>Landing externa o dominio principal.</small></label>
              <label><span>Zona horaria</span>
                <select v-model="draft.timezone">
                  <option v-for="zone in timezones" :key="zone" :value="zone">{{ zone }}</option>
                </select>
                <small>Base para horarios dinámicos y sellos de tiempo.</small>
              </label>

              <!-- Currency Selector -->
              <div class="full relative">
                <span class="mb-2 block text-sm font-semibold text-zinc-900 dark:text-zinc-100">💰 Moneda principal</span>
                <div
                  class="relative z-10 flex min-h-[48px] w-full cursor-pointer items-center gap-3 rounded-[16px] border border-zinc-200 bg-white px-4 py-2.5 transition hover:border-zinc-300 focus-within:ring-2 focus-within:ring-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
                  @click="showCurrencyDropdown = !showCurrencyDropdown"
                >
                  <span v-if="selectedCurrencyObj" class="flex items-center gap-2.5 flex-1">
                    <img
                      class="h-5 w-7 rounded-sm object-cover border border-zinc-200 dark:border-zinc-700"
                      :src="`https://flagcdn.com/w40/${selectedCurrencyObj.countryCode}.png`"
                      :alt="`Bandera ${selectedCurrencyObj.code}`"
                      loading="lazy"
                    />
                    <span class="font-bold text-zinc-900 dark:text-zinc-100">{{ selectedCurrencyObj.code }}</span>
                    <span class="text-zinc-500 dark:text-zinc-400 text-sm">{{ selectedCurrencyObj.name }}</span>
                  </span>
                  <span v-else class="flex-1 text-zinc-400">Selecciona una moneda...</span>
                  <svg class="h-4 w-4 text-zinc-400 flex-shrink-0 transition-transform" :class="{ 'rotate-180': showCurrencyDropdown }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
                <div v-if="showCurrencyDropdown" class="fixed inset-0 z-40 bg-transparent" @click.stop="showCurrencyDropdown = false" />
                <div v-if="showCurrencyDropdown" class="absolute left-0 right-0 top-[100%] z-50 mt-2 rounded-[20px] border border-zinc-200 bg-white/98 shadow-2xl backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/98" style="max-height: 380px; display: flex; flex-direction: column;">
                  <div class="p-3 border-b border-zinc-100 dark:border-zinc-800">
                    <div class="flex items-center gap-2 rounded-xl bg-zinc-100 px-3 py-2 dark:bg-zinc-800">
                      <svg class="h-4 w-4 text-zinc-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" stroke-width="2" /><line x1="21" y1="21" x2="16.65" y2="16.65" stroke-width="2" /></svg>
                      <input v-model="currencySearch" type="text" placeholder="Buscar moneda..." class="flex-1 bg-transparent text-sm outline-none text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400" @click.stop />
                      <button v-if="currencySearch" class="text-zinc-400 hover:text-zinc-700" @click.stop="currencySearch = ''" type="button">✕</button>
                    </div>
                  </div>
                  <div class="overflow-y-auto flex-1 p-2">
                    <div
                      v-for="cur in filteredCurrencies"
                      :key="cur.code"
                      class="flex items-center gap-3 rounded-[14px] px-3 py-2.5 cursor-pointer transition-colors"
                      :class="draft.currency === cur.code ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'"
                      @click.stop="selectCurrency(cur.code)"
                    >
                      <img
                        class="h-5 w-7 rounded-sm object-cover border border-zinc-200 dark:border-zinc-700 flex-shrink-0"
                        :src="`https://flagcdn.com/w40/${cur.countryCode}.png`"
                        :alt="`Bandera ${cur.code}`"
                        loading="lazy"
                      />
                      <span class="font-bold text-[13px] w-12 flex-shrink-0">{{ cur.code }}</span>
                      <span class="text-[13px] flex-1">{{ cur.name }}</span>
                      <span class="text-[11px] opacity-50">{{ cur.symbol }}</span>
                      <svg v-if="draft.currency === cur.code" class="h-4 w-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <div v-if="!filteredCurrencies.length" class="py-6 text-center text-sm text-zinc-400">
                      No se encontró ninguna moneda con "{{ currencySearch }}"
                    </div>
                  </div>
                </div>
                <small class="mt-2 block text-[13px] text-zinc-500">Moneda en la que se expresan todos los precios del catálogo.</small>
              </div>

              <label><span>OG Title</span><input v-model="draft.ogTitle" /><small>Título social para compartir.</small></label>
              <label class="full"><span>OG Description</span><textarea v-model="draft.ogDescription" rows="3" /><small>Descripción de vista previa en buscadores y redes.</small></label>
            </div>
          </section>
        </div>
      </fieldset>

      <p v-if="draftRecoveredNotice" class="mt-4 rounded-[16px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
        {{ draftRecoveredNotice }}
      </p>
      <p v-if="saveSuccess" class="mt-4 rounded-[16px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
        {{ saveSuccess }}
      </p>
      <p v-if="saveError" class="mt-4 text-sm text-rose-500">{{ saveError }}</p>
    </section>

    <section class="panel-card span-2">
      <UiSectionHeader eyebrow="Plan" title="Suscripción activa" description="Estado del plan, vencimiento y capacidades disponibles." />

      <div class="grid gap-4 md:grid-cols-[1.15fr,0.85fr]">
        <div class="rounded-[24px] border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">Plan actual</p>
              <h3 class="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">{{ planDisplayName }}</h3>
              <p class="mt-2 text-sm text-zinc-600 dark:text-zinc-300">Estado: {{ planStatusLabel }}</p>
            </div>
            <span class="rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]" :class="planStatusClass">
              {{ currentPlan?.status || 'sin_plan' }}
            </span>
          </div>

          <p class="mt-4 text-sm text-zinc-600 dark:text-zinc-300">{{ planExpiryText }}</p>
          <p v-if="planWarningText" class="mt-3 rounded-[16px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
            {{ planWarningText }}
          </p>
        </div>

        <div class="rounded-[24px] border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">Features activas</p>
          <ul class="mt-4 space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
            <li v-for="feature in planFeatureLabels" :key="feature" class="rounded-[14px] bg-zinc-50 px-3 py-2 dark:bg-zinc-900">
              {{ feature }}
            </li>
          </ul>

          <a href="/master" class="solid-btn mt-5 inline-flex !w-full !justify-center">
            Upgrade plan
          </a>
        </div>
      </div>
    </section>

    <!-- Credenciales / Cambiar contraseña -->
    <section class="panel-card span-2">
      <UiSectionHeader eyebrow="Seguridad" title="Credenciales" description="Cambia tu contraseña de acceso al panel de administración." />

      <form class="grid-form max-w-lg" @submit.prevent="changePassword">
        <label><span>Contraseña actual</span><input v-model="credForm.currentPassword" type="password" required autocomplete="current-password" /></label>
        <label><span>Nueva contraseña</span><input v-model="credForm.newPassword" type="password" required minlength="8" autocomplete="new-password" /></label>
        <label><span>Confirmar nueva contraseña</span><input v-model="credForm.confirmPassword" type="password" required minlength="8" autocomplete="new-password" /></label>
        <div>
          <button class="solid-btn" type="submit" :disabled="credSaving">
            {{ credSaving ? 'Cambiando...' : 'Cambiar contraseña' }}
          </button>
        </div>
      </form>

      <p v-if="credError" class="mt-4 text-sm text-rose-500">{{ credError }}</p>
      <p v-if="credSuccess" class="mt-4 rounded-[16px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">{{ credSuccess }}</p>
    </section>
  </div>
</template>


<script setup lang="ts">
import { createDeliveryZone, defaultSettings } from '~/data/defaults'
import type { BusinessDaySchedule, CatalogOperationalSettings, CatalogPlan } from '~/types/catalog'
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
const previewStore = usePreviewStore()
const backend = useSupabaseBackend()
const catalog = computed(() => catalogStore.activeCatalog)
const isPaywalled = computed(() => false)
const draft = ref<CatalogOperationalSettings>(defaultSettings())
const saving = ref(false)
const saveError = ref('')
const saveSuccess = ref('')
const draftRecoveredNotice = ref('')
const currentPlan = ref<CatalogPlan | null>(null)

const SETTINGS_SAVE_TIMEOUT_MS = 15000
const SETTINGS_DRAFT_STORAGE_PREFIX = 'mi-tienda:settings-draft:'

const settingsDraftStorageKey = computed(() =>
  catalog.value ? `${SETTINGS_DRAFT_STORAGE_PREFIX}${catalog.value.id}` : '',
)

const persistDraftLocally = (value: CatalogOperationalSettings) => {
  if (import.meta.server || !settingsDraftStorageKey.value) {
    return
  }

  localStorage.setItem(settingsDraftStorageKey.value, JSON.stringify(value))
}

const clearPersistedDraft = () => {
  if (import.meta.server || !settingsDraftStorageKey.value) {
    return
  }

  localStorage.removeItem(settingsDraftStorageKey.value)
}

const getPersistedDraft = (): CatalogOperationalSettings | null => {
  if (import.meta.server || !settingsDraftStorageKey.value) {
    return null
  }

  const raw = localStorage.getItem(settingsDraftStorageKey.value)
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as CatalogOperationalSettings
  } catch {
    localStorage.removeItem(settingsDraftStorageKey.value)
    return null
  }
}

// Sync draft settings to preview store in real-time
watch(draft, (value) => {
  previewStore.setSettings(JSON.parse(JSON.stringify(value)))
  saveSuccess.value = ''
  saveError.value = ''
  persistDraftLocally(value)
}, { deep: true })

onUnmounted(() => {
  previewStore.setSettings(null)
})

const scheduleAlwaysOpen = computed({
  get: () => draft.value.scheduleMode === 'always',
  set: (value: boolean) => {
    draft.value.scheduleMode = value ? 'always' : 'weekly'
  },
})

const scheduleStatusLabel = computed(() => getCurrentScheduleState(draft.value).label)
const PLAN_FEATURES: Record<string, string[]> = {
  free: ['Analíticas básicas'],
  basic: ['Analíticas básicas', 'Multi-catálogos'],
  pro: ['Analíticas avanzadas', 'Multi-catálogos', 'Webhooks', 'Dominio personalizado'],
  enterprise: ['Analíticas avanzadas', 'Multi-catálogos', 'Webhooks', 'Dominio personalizado', 'Acceso API'],
}

const planDisplayName = computed(() => {
  const planType = currentPlan.value?.planType || catalog.value?.planTier || 'free'
  return String(planType).charAt(0).toUpperCase() + String(planType).slice(1)
})

const planStatusLabel = computed(() => {
  const status = currentPlan.value?.status || 'active'
  const map: Record<string, string> = {
    trial: 'Prueba',
    active: 'Activo',
    paused: 'Pausado',
    blocked: 'Bloqueado',
    expired: 'Expirado',
  }
  return map[status] || status
})

const planStatusClass = computed(() => {
  const status = currentPlan.value?.status || 'active'
  if (status === 'expired' || status === 'blocked') {
    return 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300'
  }
  if (status === 'trial' || status === 'paused') {
    return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300'
  }
  return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300'
})

const planFeatureLabels = computed(() => PLAN_FEATURES[currentPlan.value?.planType || catalog.value?.planTier || 'free'] || PLAN_FEATURES.free)

const planExpiryText = computed(() => {
  if (!currentPlan.value?.expiresAt) {
    return 'Sin fecha de vencimiento definida todavía.'
  }

  return `Vence el ${new Intl.DateTimeFormat('es-MX', { dateStyle: 'long' }).format(new Date(currentPlan.value.expiresAt))}.`
})

const planWarningText = computed(() => {
  if (!currentPlan.value?.expiresAt) {
    return ''
  }

  const expiresAt = Date.parse(currentPlan.value.expiresAt)
  if (Number.isNaN(expiresAt)) {
    return ''
  }

  const daysRemaining = Math.ceil((expiresAt - Date.now()) / (24 * 60 * 60 * 1000))
  if (daysRemaining <= 7) {
    return daysRemaining > 0
      ? `Tu plan vence en ${daysRemaining} día${daysRemaining === 1 ? '' : 's'}. Revisa renovación o upgrade cuanto antes.`
      : 'Tu plan ya venció o está por vencer hoy. Revisa renovación inmediata.'
  }

  return ''
})

const imageLimit = computed(() => {
  const limits = {
    free: 5,
    basic: 10,
    pro: Number.POSITIVE_INFINITY,
    enterprise: Number.POSITIVE_INFINITY,
  } as const

  const planTier = currentPlan.value?.planType === 'basic' || currentPlan.value?.planType === 'pro' || currentPlan.value?.planType === 'enterprise'
    ? currentPlan.value.planType
    : catalog.value?.planTier === 'basic' || catalog.value?.planTier === 'pro' || catalog.value?.planTier === 'enterprise'
      ? catalog.value.planTier
      : 'free'

  return limits[planTier]
})

const currentImageCount = computed(() => {
  if (!catalog.value) {
    return 0
  }

  return catalog.value.products.reduce((sum, product) => {
    const main = product.image ? 1 : 0
    const gallery = product.images.filter(Boolean).length
    return sum + main + gallery
  }, 0) + (draft.value.logoUrl ? 1 : 0) + (draft.value.storeHeroBackgroundImage ? 1 : 0)
})

const imageUsageRatio = computed(() =>
  Number.isFinite(imageLimit.value) && imageLimit.value > 0 ? currentImageCount.value / imageLimit.value : 0,
)

const imageUsageText = computed(() =>
  Number.isFinite(imageLimit.value)
    ? `${currentImageCount.value}/${imageLimit.value} imágenes usadas en este catálogo.`
    : `${currentImageCount.value} imágenes usadas en este catálogo.`
)

const imageUsageClass = computed(() => {
  if (imageUsageRatio.value >= 1) {
    return 'text-rose-600 dark:text-rose-400'
  }

  if (imageUsageRatio.value >= 0.8) {
    return 'text-amber-600 dark:text-amber-400'
  }

  return 'text-zinc-500 dark:text-zinc-400'
})

watch(catalog, (value) => {
  if (!value) {
    return
  }

  const baseDraft: CatalogOperationalSettings = {
    ...defaultSettings(value.settings.businessName, value.slug),
    ...JSON.parse(JSON.stringify(value.settings)),
  }

  const persistedDraft = getPersistedDraft()
  draftRecoveredNotice.value = ''

  draft.value = persistedDraft
    ? {
        ...baseDraft,
        ...persistedDraft,
      }
    : baseDraft

  if (persistedDraft) {
    draftRecoveredNotice.value = 'Restauramos un borrador local pendiente de guardar. Revísalo y vuelve a guardar cuando estés listo.'
  }

  // Backwards compatibility
  if (typeof draft.value.businessType === 'string') {
    draft.value.businessType = [draft.value.businessType]
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

watch(catalog, async (value) => {
  if (!value) {
    currentPlan.value = null
    return
  }

  currentPlan.value = await backend.getCatalogPlan(value.id).catch(() => null)
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

// ─── Currency selector ────────────────────────────────────────────────────────
const allCurrencies = [
  // LATAM & Cuba
  { code: 'CUP', name: 'Peso cubano', symbol: '$', countryCode: 'cu' },
  { code: 'MLC', name: 'MLC (Cuba)', symbol: 'MLC', countryCode: 'cu' },
  { code: 'USD', name: 'Dólar estadounidense', symbol: '$', countryCode: 'us' },
  { code: 'MXN', name: 'Peso mexicano', symbol: '$', countryCode: 'mx' },
  { code: 'ARS', name: 'Peso argentino', symbol: '$', countryCode: 'ar' },
  { code: 'COP', name: 'Peso colombiano', symbol: '$', countryCode: 'co' },
  { code: 'CLP', name: 'Peso chileno', symbol: '$', countryCode: 'cl' },
  { code: 'PEN', name: 'Sol peruano', symbol: 'S/', countryCode: 'pe' },
  { code: 'VES', name: 'Bolívar venezolano', symbol: 'Bs.', countryCode: 've' },
  { code: 'BRL', name: 'Real brasileño', symbol: 'R$', countryCode: 'br' },
  { code: 'BOB', name: 'Boliviano', symbol: 'Bs', countryCode: 'bo' },
  { code: 'PYG', name: 'Guaraní paraguayo', symbol: '₲', countryCode: 'py' },
  { code: 'UYU', name: 'Peso uruguayo', symbol: '$', countryCode: 'uy' },
  { code: 'GTQ', name: 'Quetzal guatemalteco', symbol: 'Q', countryCode: 'gt' },
  { code: 'HNL', name: 'Lempira hondureño', symbol: 'L', countryCode: 'hn' },
  { code: 'CRC', name: 'Colón costarricense', symbol: '₡', countryCode: 'cr' },
  { code: 'DOP', name: 'Peso dominicano', symbol: 'RD$', countryCode: 'do' },
  { code: 'HTG', name: 'Gourde haitiano', symbol: 'G', countryCode: 'ht' },
  { code: 'JMD', name: 'Dólar jamaicano', symbol: 'J$', countryCode: 'jm' },
  { code: 'NIO', name: 'Córdoba nicaragüense', symbol: 'C$', countryCode: 'ni' },
  { code: 'PAB', name: 'Balboa panameño', symbol: 'B/.', countryCode: 'pa' },
  // Europa
  { code: 'EUR', name: 'Euro', symbol: '€', countryCode: 'eu' },
  { code: 'GBP', name: 'Libra esterlina', symbol: '£', countryCode: 'gb' },
  { code: 'CHF', name: 'Franco suizo', symbol: 'Fr', countryCode: 'ch' },
  { code: 'SEK', name: 'Corona sueca', symbol: 'kr', countryCode: 'se' },
  { code: 'NOK', name: 'Corona noruega', symbol: 'kr', countryCode: 'no' },
  { code: 'DKK', name: 'Corona danesa', symbol: 'kr', countryCode: 'dk' },
  { code: 'PLN', name: 'Złoty polaco', symbol: 'zł', countryCode: 'pl' },
  { code: 'CZK', name: 'Corona checa', symbol: 'Kč', countryCode: 'cz' },
  { code: 'HUF', name: 'Forinto húngaro', symbol: 'Ft', countryCode: 'hu' },
  { code: 'RUB', name: 'Rublo ruso', symbol: '₽', countryCode: 'ru' },
  // Norteamérica
  { code: 'CAD', name: 'Dólar canadiense', symbol: 'CA$', countryCode: 'ca' },
  // Asia & Oceanía
  { code: 'CNY', name: 'Yuan chino', symbol: '¥', countryCode: 'cn' },
  { code: 'JPY', name: 'Yen japonés', symbol: '¥', countryCode: 'jp' },
  { code: 'KRW', name: 'Won surcoreano', symbol: '₩', countryCode: 'kr' },
  { code: 'INR', name: 'Rupia india', symbol: '₹', countryCode: 'in' },
  { code: 'THB', name: 'Baht tailandés', symbol: '฿', countryCode: 'th' },
  { code: 'VND', name: 'Dong vietnamita', symbol: '₫', countryCode: 'vn' },
  { code: 'AUD', name: 'Dólar australiano', symbol: 'A$', countryCode: 'au' },
  { code: 'NZD', name: 'Dólar neozelandés', symbol: 'NZ$', countryCode: 'nz' },
  // Oriente Medio & África
  { code: 'AED', name: 'Dírham emiratí', symbol: 'د.إ', countryCode: 'ae' },
  { code: 'SAR', name: 'Riyal saudí', symbol: '﷼', countryCode: 'sa' },
  { code: 'TRY', name: 'Lira turca', symbol: '₺', countryCode: 'tr' },
  { code: 'ZAR', name: 'Rand sudafricano', symbol: 'R', countryCode: 'za' },
  { code: 'EGP', name: 'Libra egipcia', symbol: 'E£', countryCode: 'eg' },
  { code: 'MAD', name: 'Dírham marroquí', symbol: 'د.م.', countryCode: 'ma' },
  // Cripto & Digital
  { code: 'USDT', name: 'Tether (USDT)', symbol: '₮', countryCode: 'us' },
  { code: 'ZELLE', name: 'Zelle (USD)', symbol: '$', countryCode: 'us' },
]

const showCurrencyDropdown = ref(false)
const currencySearch = ref('')

const filteredCurrencies = computed(() => {
  const q = currencySearch.value.toLowerCase().trim()
  if (!q) return allCurrencies
  return allCurrencies.filter(c =>
    c.code.toLowerCase().includes(q) ||
    c.name.toLowerCase().includes(q) ||
    c.symbol.toLowerCase().includes(q)
  )
})

const selectedCurrencyObj = computed(() =>
  allCurrencies.find(c => c.code === draft.value.currency) ?? null
)

const selectCurrency = (code: string) => {
  draft.value.currency = code
  showCurrencyDropdown.value = false
  currencySearch.value = ''
}
// ─────────────────────────────────────────────────────────────────────────────

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
const uploadLogoProgress = ref(0)

// Compress image before upload using canvas
function compressImage(file: File, maxWidth = 512, maxHeight = 512, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      let { width, height } = img
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob((blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Compression failed'))
      }, file.type || 'image/jpeg', quality)
    }
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = URL.createObjectURL(file)
  })
}

const onLogoSelected = async (event: Event) => {
  if (!catalog.value) return

  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  uploadingLogo.value = true
  uploadLogoProgress.value = 30
  try {
    const compressed = await compressImage(file)
    uploadLogoProgress.value = 70
    draft.value.logoUrl = await storageEngine.uploadProductImage(catalog.value.id, new File([compressed], file.name, { type: compressed.type }))
    uploadLogoProgress.value = 100
  } catch (error) {
    console.error('Error al subir logo:', error)
  } finally {
    setTimeout(() => {
      uploadingLogo.value = false
      uploadLogoProgress.value = 0
    }, 500)
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

  const whatsappDigits = draft.value.whatsapp.replace(/\D/g, '')
  const phoneDigits = draft.value.phone.replace(/\D/g, '')

  if (whatsappDigits && whatsappDigits.length < 10) {
    saveError.value = 'El WhatsApp debe tener al menos 10 digitos.'
    return
  }

  if (phoneDigits && phoneDigits.length < 10) {
    saveError.value = 'El telefono debe tener al menos 10 digitos.'
    return
  }

  saving.value = true
  saveError.value = ''
  saveSuccess.value = ''
  try {
    draft.value.whatsapp = whatsappDigits
    draft.value.phone = phoneDigits

    const payload = {
      ...draft.value,
      weeklySchedule: sanitizeSchedule(),
      deliveryZones: draft.value.deliveryZones.map(zone => ({
        ...zone,
        name: zone.name.trim(),
        price: Number(zone.price || 0),
        minOrder: Number(zone.minOrder || 0),
        estimatedMinutes: Number(zone.estimatedMinutes || 0),
      })),
    }

    await Promise.race([
      catalogStore.updateSettings(payload),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('La actualización tardó demasiado. Conservamos tu borrador para que no pierdas cambios.')), SETTINGS_SAVE_TIMEOUT_MS)
      }),
    ])

    clearPersistedDraft()
    draftRecoveredNotice.value = ''
    saveSuccess.value = 'Ajustes guardados correctamente.'
  } catch (error) {
    saveError.value = error instanceof Error ? error.message : 'No se pudieron guardar los ajustes.'
  } finally {
    saving.value = false
  }
}

// ─── Credentials change ─────────────────────────────────────────────────────
const credForm = reactive({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
})
const credSaving = ref(false)
const credError = ref('')
const credSuccess = ref('')

const changePassword = async () => {
  credError.value = ''
  credSuccess.value = ''

  if (credForm.newPassword.length < 8) {
    credError.value = 'La nueva contraseña debe tener al menos 8 caracteres.'
    return
  }
  if (credForm.newPassword !== credForm.confirmPassword) {
    credError.value = 'Las contraseñas no coinciden.'
    return
  }

  credSaving.value = true
  try {
    const { $supabase: supabase } = useNuxtApp()
    const { error } = await supabase.auth.updateUser({ password: credForm.newPassword })
    if (error) {
      credError.value = error.message
      return
    }
    credSuccess.value = 'Contraseña actualizada correctamente.'
    credForm.currentPassword = ''
    credForm.newPassword = ''
    credForm.confirmPassword = ''
  } catch (err) {
    credError.value = 'Error al cambiar la contraseña.'
  } finally {
    credSaving.value = false
  }
}
</script>
