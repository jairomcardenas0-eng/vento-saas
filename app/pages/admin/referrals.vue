<template>
  <AdminStatePanel
    v-if="!authStore.user"
    title="No hay una sesión activa"
    description="Inicia sesión para consultar tu programa de referidos."
  />

  <AdminStatePanel
    v-else-if="loading"
    tone="loading"
    title="Cargando referidos"
    description="Estamos consultando tu código y la actividad de tu red."
  />

  <AdminStatePanel
    v-else-if="loadError"
    tone="error"
    title="No se pudo cargar el programa de referidos"
    :description="loadError"
  >
    <template #actions>
      <button class="solid-btn" @click="loadReferrals()">Reintentar</button>
    </template>
  </AdminStatePanel>

  <div v-else class="admin-grid overflow-x-hidden">
    <section class="panel-card span-2 w-full max-w-full overflow-x-hidden">
      <UiSectionHeader
        eyebrow="Crecimiento"
        title="Programa de referidos"
        description="Comparte tu enlace único y haz crecer tu red. Cada persona que se registre con tu código queda vinculada a tu cuenta."
      />

      <div class="mt-6 min-w-0 rounded-[24px] border border-zinc-200 bg-gradient-to-br from-zinc-50 to-white p-4 sm:p-6 dark:border-zinc-800 dark:from-zinc-900 dark:to-zinc-950">
        <div class="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div class="min-w-0">
            <p class="text-[11px] font-bold uppercase tracking-widest text-zinc-400">Tu código de referido</p>
            <p class="mt-2 break-all text-2xl font-bold text-zinc-900 sm:text-4xl sm:tracking-widest dark:text-zinc-50">
              {{ referralCode }}
            </p>
            <p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Cualquier persona que use este código al registrarse quedará vinculada a tu cuenta.
            </p>
          </div>

          <div class="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
            <button class="solid-btn w-full sm:w-auto" :disabled="!referralCode" @click="copyLink">
              <svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="9" y="9" width="13" height="13" rx="2" stroke-width="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke-width="2" />
              </svg>
              {{ copied ? 'Copiado' : 'Copiar enlace' }}
            </button>

            <button class="ghost-btn small w-full sm:w-auto" :disabled="!referralCode" @click="shareNative">
              <svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="18" cy="5" r="3" stroke-width="2" />
                <circle cx="6" cy="12" r="3" stroke-width="2" />
                <circle cx="18" cy="19" r="3" stroke-width="2" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" stroke-width="2" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" stroke-width="2" />
              </svg>
              Compartir
            </button>
          </div>
        </div>

        <div class="mt-4 flex min-w-0 items-center gap-2 rounded-[14px] bg-zinc-100 px-4 py-3 dark:bg-zinc-800">
          <svg class="h-4 w-4 flex-shrink-0 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke-width="2" stroke-linecap="round" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke-width="2" stroke-linecap="round" />
          </svg>
          <span class="min-w-0 break-all text-sm font-mono text-zinc-600 dark:text-zinc-300">{{ referralLink }}</span>
        </div>
      </div>

      <div class="mt-6 grid w-full max-w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <article class="rounded-[20px] border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <p class="text-sm text-zinc-500 dark:text-zinc-400">Total de referidos</p>
          <p class="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-50">{{ referrals.length }}</p>
        </article>
        <article class="rounded-[20px] border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <p class="text-sm text-zinc-500 dark:text-zinc-400">Activos</p>
          <p class="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-50">{{ referrals.filter(r => r.status === 'active').length }}</p>
        </article>
        <article class="rounded-[20px] border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <p class="text-sm text-zinc-500 dark:text-zinc-400">Con recompensa</p>
          <p class="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-50">{{ referrals.filter(r => r.status === 'rewarded').length }}</p>
        </article>
      </div>

      <div class="mt-8">
        <h3 class="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-50">Personas que usaron tu código</h3>

        <div v-if="!referrals.length" class="flex flex-col items-center rounded-[20px] border border-dashed border-zinc-300 px-6 py-12 text-center dark:border-zinc-700">
          <svg class="mb-4 h-12 w-12 text-zinc-200 dark:text-zinc-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke-width="1.5" stroke-linecap="round" />
            <circle cx="9" cy="7" r="4" stroke-width="1.5" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke-width="1.5" stroke-linecap="round" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke-width="1.5" stroke-linecap="round" />
          </svg>
          <p class="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Aún no tienes referidos</p>
          <p class="mt-1 max-w-xs text-xs text-zinc-400 dark:text-zinc-500">Copia tu enlace y compártelo. Cada persona que se registre con él aparecerá aquí.</p>
          <button class="solid-btn mt-5 text-sm" :disabled="!referralCode" @click="copyLink">
            Copiar enlace ahora
          </button>
        </div>

        <div v-else class="rounded-[20px] border border-zinc-200 p-3 dark:border-zinc-800">
          <div class="space-y-3">
            <article
              v-for="referral in referrals"
              :key="referral.uid"
              class="rounded-[14px] border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="truncate font-semibold text-zinc-900 dark:text-zinc-100">{{ referral.displayName }}</p>
                  <p class="break-all text-xs text-zinc-500 dark:text-zinc-400">{{ referral.email }}</p>
                </div>
                <span
                  class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                  :class="{
                    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400': referral.status === 'active',
                    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400': referral.status === 'rewarded',
                    'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400': referral.status === 'pending',
                  }"
                >
                  {{ statusLabel(referral.status) }}
                </span>
              </div>
              <p class="mt-2 text-[11px] text-zinc-400 dark:text-zinc-500">
                {{ new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(referral.createdAt)) }}
              </p>
            </article>
          </div>
        </div>
      </div>

      <div class="mt-6 rounded-[16px] border border-blue-100 bg-blue-50 px-5 py-4 dark:border-blue-900/40 dark:bg-blue-950/20">
        <div class="flex items-start gap-3">
          <svg class="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke-width="2" />
            <path d="M12 16v-4M12 8h.01" stroke-width="2" stroke-linecap="round" />
          </svg>
          <div>
            <p class="text-sm font-semibold text-blue-800 dark:text-blue-300">Base lista para recompensas</p>
            <p class="mt-0.5 text-sm text-blue-600 dark:text-blue-400">
              La estructura actual ya registra cada referido y su estado para incorporar automatizaciones futuras sin rehacer el módulo.
            </p>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin' })

const authStore = useAuthStore()
const backend = useSupabaseBackend()

const loading = ref(true)
const copied = ref(false)
const loadError = ref('')
const referralCode = ref('')
const referrals = ref<Array<{ uid: string; displayName: string; email: string; createdAt: string; status: string }>>([])

const baseUrl = computed(() => {
  if (import.meta.client) {
    return window.location.origin
  }

  return ''
})

const referralLink = computed(() =>
  referralCode.value ? `${baseUrl.value}/register?ref=${referralCode.value}` : '',
)

const statusLabel = (status: string) => {
  if (status === 'active') {
    return 'Activo'
  }

  if (status === 'rewarded') {
    return 'Recompensado'
  }

  return 'Pendiente'
}

const loadReferrals = async () => {
  const uid = authStore.user?.uid
  if (!uid) {
    loading.value = false
    loadError.value = ''
    return
  }

  loading.value = true
  loadError.value = ''
  try {
    const data = await backend.getReferralData(uid)
    referralCode.value = data.code
    referrals.value = data.referrals
  } catch (error) {
    console.error('[referrals] Error cargando datos:', error)
    loadError.value = error instanceof Error ? error.message : 'No fue posible consultar tus referidos.'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadReferrals()
})

const copyLink = async () => {
  if (!referralLink.value) {
    return
  }

  try {
    await navigator.clipboard.writeText(referralLink.value)
    copied.value = true
    window.setTimeout(() => {
      copied.value = false
    }, 2500)
  } catch {
    const element = document.createElement('textarea')
    element.value = referralLink.value
    document.body.appendChild(element)
    element.select()
    document.execCommand('copy')
    document.body.removeChild(element)
    copied.value = true
    window.setTimeout(() => {
      copied.value = false
    }, 2500)
  }
}

const shareNative = async () => {
  if (!referralLink.value) {
    return
  }

  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Únete a mi tienda',
        text: `Regístrate usando mi código ${referralCode.value} y comienza a gestionar tu negocio digital.`,
        url: referralLink.value,
      })
    } catch {
      return
    }

    return
  }

  await copyLink()
}
</script>
