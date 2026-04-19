<template>
  <div class="admin-grid overflow-x-hidden">
    <section class="panel-card span-2 w-full max-w-full overflow-x-hidden">
      <UiSectionHeader
        eyebrow="Crecimiento"
        title="Programa de referidos"
        description="Comparte tu enlace único y crece junto a tu red. Cada persona que se registre con tu código queda vinculada a ti."
      />

      <!-- Código y enlace -->
      <div class="mt-6 min-w-0 rounded-[24px] border border-zinc-200 bg-gradient-to-br from-zinc-50 to-white p-4 sm:p-6 dark:border-zinc-800 dark:from-zinc-900 dark:to-zinc-950">
        <div class="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div class="min-w-0">
            <p class="text-[11px] font-bold uppercase tracking-widest text-zinc-400">Tu código de referido</p>
            <p class="mt-2 break-all text-2xl font-bold tracking-normal text-zinc-900 sm:text-4xl sm:tracking-widest dark:text-zinc-50">
              {{ loading ? '...' : referralCode }}
            </p>
            <p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Cualquiera que use este código al registrarse quedará vinculado a tu cuenta.
            </p>
          </div>

          <div class="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
            <button
              class="solid-btn w-full sm:w-auto"
              :disabled="loading || !referralCode"
              @click="copyLink"
            >
              <svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="9" y="9" width="13" height="13" rx="2" stroke-width="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke-width="2" />
              </svg>
              {{ copied ? '¡Copiado!' : 'Copiar enlace' }}
            </button>

            <button
              class="ghost-btn small w-full sm:w-auto"
              :disabled="loading || !referralCode"
              @click="shareNative"
            >
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

        <!-- Vista previa del enlace -->
        <div class="mt-4 flex min-w-0 items-center gap-2 rounded-[14px] bg-zinc-100 px-4 py-3 dark:bg-zinc-800">
          <svg class="h-4 w-4 flex-shrink-0 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke-width="2" stroke-linecap="round" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke-width="2" stroke-linecap="round" />
          </svg>
          <span class="truncate text-sm font-mono text-zinc-600 dark:text-zinc-300">{{ referralLink }}</span>
        </div>
      </div>

      <!-- Stats rápidas -->
      <div class="mt-6 grid w-full max-w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <article class="rounded-[20px] border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <p class="text-sm text-zinc-500 dark:text-zinc-400">Total referidos</p>
          <p class="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-50">{{ loading ? '–' : referrals.length }}</p>
        </article>
        <article class="rounded-[20px] border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <p class="text-sm text-zinc-500 dark:text-zinc-400">Activos</p>
          <p class="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            {{ loading ? '–' : referrals.filter(r => r.status === 'active').length }}
          </p>
        </article>
        <article class="rounded-[20px] border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <p class="text-sm text-zinc-500 dark:text-zinc-400">Con recompensa</p>
          <p class="mt-2 text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            {{ loading ? '–' : referrals.filter(r => r.status === 'rewarded').length }}
          </p>
        </article>
      </div>

      <!-- Lista de referidos -->
      <div class="mt-8">
        <h3 class="mb-4 text-base font-semibold text-zinc-900 dark:text-zinc-50">
          Personas que usaron tu código
        </h3>

        <div v-if="loading" class="space-y-3">
          <div v-for="i in 3" :key="i" class="h-14 animate-pulse rounded-[16px] bg-zinc-100 dark:bg-zinc-800" />
        </div>

        <div v-else-if="!referrals.length" class="rounded-[20px] border border-dashed border-zinc-300 px-6 py-10 text-center dark:border-zinc-700">
          <svg class="mx-auto mb-3 h-10 w-10 text-zinc-300 dark:text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke-width="1.5" stroke-linecap="round" />
            <circle cx="9" cy="7" r="4" stroke-width="1.5" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke-width="1.5" stroke-linecap="round" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke-width="1.5" stroke-linecap="round" />
          </svg>
          <p class="text-sm font-medium text-zinc-500 dark:text-zinc-400">Todavía nadie ha usado tu enlace</p>
          <p class="mt-1 text-xs text-zinc-400 dark:text-zinc-500">Comparte tu código y aquí verás a tu red crecer.</p>
        </div>

        <div v-else class="rounded-[20px] border border-zinc-200 p-3 dark:border-zinc-800">
          <div class="space-y-3">
            <article
              v-for="ref in referrals"
              :key="ref.uid"
              class="rounded-[14px] border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class="truncate font-semibold text-zinc-900 dark:text-zinc-100">{{ ref.displayName }}</p>
                  <p class="truncate text-xs text-zinc-500 dark:text-zinc-400">{{ ref.email }}</p>
                </div>
                <span
                  class="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                  :class="{
                    'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400': ref.status === 'active',
                    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400': ref.status === 'rewarded',
                    'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400': ref.status === 'pending',
                  }"
                >
                  {{ ref.status === 'active' ? 'Activo' : ref.status === 'rewarded' ? 'Recompensado' : 'Pendiente' }}
                </span>
              </div>
              <div class="mt-2 flex items-center justify-between gap-2">
                <p class="text-[11px] text-zinc-400 dark:text-zinc-500">
                  {{ new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(ref.createdAt)) }}
                </p>
                <p class="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">
                  {{ ref.status === 'active' ? 'Activo' : ref.status === 'rewarded' ? 'Recompensado' : 'Pendiente' }}
                </p>
              </div>
            </article>
          </div>
        </div>
      </div>

      <!-- Nota de futuros beneficios -->
      <div class="mt-6 rounded-[16px] border border-blue-100 bg-blue-50 px-5 py-4 dark:border-blue-900/40 dark:bg-blue-950/20">
        <div class="flex items-start gap-3">
          <svg class="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke-width="2" />
            <path d="M12 16v-4M12 8h.01" stroke-width="2" stroke-linecap="round" />
          </svg>
          <div>
            <p class="text-sm font-semibold text-blue-800 dark:text-blue-300">Sistema de recompensas próximamente</p>
            <p class="mt-0.5 text-sm text-blue-600 dark:text-blue-400">
              La estructura está lista para agregar recompensas automáticas por referidos en el futuro. Cada referido ya queda registrado con su estado.
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

onMounted(async () => {
  const uid = authStore.user?.uid
  if (!uid) return

  try {
    const data = await backend.getReferralData(uid)
    referralCode.value = data.code
    referrals.value = data.referrals
  } catch (err) {
    console.error('[referrals] Error cargando datos:', err)
  } finally {
    loading.value = false
  }
})

const copyLink = async () => {
  if (!referralLink.value) return
  try {
    await navigator.clipboard.writeText(referralLink.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2500)
  } catch {
    // Fallback para navegadores sin clipboard API
    const el = document.createElement('textarea')
    el.value = referralLink.value
    document.body.appendChild(el)
    el.select()
    document.execCommand('copy')
    document.body.removeChild(el)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2500)
  }
}

const shareNative = async () => {
  if (!referralLink.value) return
  if (navigator.share) {
    try {
      await navigator.share({
        title: '¡Únete a mi tienda!',
        text: `Regístrate usando mi código ${referralCode.value} y empieza a gestionar tu negocio digital.`,
        url: referralLink.value,
      })
    } catch {
      // Usuario canceló el share
    }
  } else {
    await copyLink()
  }
}
</script>
