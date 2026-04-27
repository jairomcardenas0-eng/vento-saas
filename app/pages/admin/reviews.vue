<template>
  <AdminStatePanel
    v-if="!catalog"
    title="No hay un catálogo activo"
    description="Selecciona un catálogo para revisar las reseñas."
  />

  <div v-else class="admin-grid">
    <section class="panel-card span-2 min-w-0">
      <UiSectionHeader eyebrow="Moderación" title="Bandeja de reseñas" description="Moderación con filtros server-side, respuesta rápida y carga incremental." />

      <div
        v-if="reviewsStore.loading"
        class="mb-4 rounded-[18px] border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300"
      >
        Actualizando moderación y reseñas del catálogo...
      </div>

      <div
        v-if="reviewsStore.realtimeError"
        class="mb-4 rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300"
      >
        {{ reviewsStore.realtimeError }}
      </div>

      <div class="review-settings">
        <article class="setting-card">
          <div class="setting-head">
            <div>
              <p class="setting-title">Reseñas activas</p>
              <p class="setting-desc">
                Si desactivas las reseñas, ningún usuario podrá comentar en tus platos.
              </p>
            </div>
            <label class="toggle-3d">
              <input v-model="reviewsEnabled" type="checkbox" class="toggle-checkbox" @change="saveReviewSettings" />
              <span class="slider-3d"></span>
            </label>
          </div>
        </article>

        <article class="setting-card">
          <div class="setting-head">
            <div>
              <p class="setting-title">Moderación de reseñas</p>
              <p class="setting-desc">
                Si la moderación está activa, las nuevas reseñas entran primero en pendientes.
              </p>
            </div>
            <label class="toggle-3d">
              <input v-model="reviewModeration" type="checkbox" class="toggle-checkbox" @change="saveReviewSettings" />
              <span class="slider-3d"></span>
            </label>
          </div>
        </article>
      </div>

      <div class="mb-4 grid gap-3 lg:grid-cols-[1.2fr,0.8fr]">
        <div class="rounded-[22px] border border-zinc-200 bg-zinc-50/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
          <label class="text-[11px] font-bold uppercase tracking-[0.18em] text-zinc-500 dark:text-zinc-400">Buscar en la bandeja cargada</label>
          <div class="mt-2 flex items-center gap-2 rounded-[18px] border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-950">
            <span class="text-zinc-400">⌕</span>
            <input
              v-model.trim="searchTerm"
              type="search"
              inputmode="search"
              placeholder="Cliente, producto o comentario"
              class="w-full bg-transparent text-sm outline-none placeholder:text-zinc-400"
            >
          </div>
        </div>

        <div class="review-metrics">
          <article class="metric-card">
            <p class="metric-label">Pendientes</p>
            <p class="metric-value">{{ reviewsStore.stats.pending }}</p>
          </article>
          <article class="metric-card">
            <p class="metric-label">Aprobadas</p>
            <p class="metric-value">{{ reviewsStore.stats.approved }}</p>
          </article>
          <article class="metric-card">
            <p class="metric-label">Promedio</p>
            <p class="metric-value">{{ reviewsStore.averageApprovedRating.toFixed(1) }}</p>
          </article>
          <article class="metric-card">
            <p class="metric-label">Positividad</p>
            <p class="metric-value">{{ reviewsStore.positivityPercent }}%</p>
          </article>
        </div>
      </div>

      <div class="review-tabs" role="tablist" aria-label="Filtros de reseñas">
        <button
          v-for="tab in tabs"
          :key="tab.key"
          class="review-tab"
          :class="{ 'is-active': reviewsStore.currentFilter === tab.key }"
          @click="setActiveTab(tab.key)"
        >
          <span>{{ tab.label }}</span>
          <span class="text-xs opacity-70">{{ tab.count }}</span>
        </button>
      </div>

      <div class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-zinc-200 bg-zinc-50/70 px-4 py-3 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-300">
        <span>
          Mostrando <strong>{{ visibleReviews.length }}</strong> de <strong>{{ reviewsStore.filteredTotal }}</strong> reseñas en <strong>{{ activeTabLabel }}</strong>.
        </span>
        <span v-if="reviewsStore.remainingCount > 0" class="text-xs uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500">
          Restan {{ reviewsStore.remainingCount }}
        </span>
      </div>

      <div v-if="!visibleReviews.length" class="rounded-[20px] border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
        {{ emptyStateMessage }}
      </div>

      <div v-else class="table-list">
        <article v-for="review in visibleReviews" :key="review.id" class="list-row min-w-0">
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <strong class="block break-words">{{ review.name || 'Cliente' }}</strong>
              <span class="status-pill" :class="review.approved ? 'status-approved' : 'status-pending'">
                {{ review.approved ? 'Aprobada' : 'Pendiente' }}
              </span>
            </div>
            <p class="mt-1 break-words text-sm font-medium text-zinc-800 dark:text-zinc-100">{{ review.productName || 'Producto sin nombre' }}</p>
            <p class="break-words">{{ review.comment || 'Sin comentario' }}</p>
            <div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
              <span>{{ '★'.repeat(review.rating) }}</span>
              <span>{{ new Date(review.createdAt).toLocaleString('es-MX') }}</span>
            </div>
            <div v-if="review.adminReply" class="review-reply">
              <strong>{{ review.adminReply.name }}</strong>
              <p class="break-words">{{ review.adminReply.text }}</p>
            </div>
          </div>
          <div class="row-meta wrap">
            <button v-if="!review.approved" class="solid-btn small" @click="approve(review.id)">Aprobar</button>
            <button class="ghost-btn small" @click="reply(review.id)">{{ review.adminReply ? 'Editar respuesta' : 'Responder' }}</button>
            <button class="ghost-btn small" @click="remove(review.id)">{{ review.approved ? 'Eliminar' : 'Borrar' }}</button>
          </div>
        </article>
      </div>

      <div class="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p class="text-xs uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500">
          {{ reviewsStore.listening ? 'Realtime activo' : 'Realtime en espera' }}
        </p>
        <button v-if="reviewsStore.hasMore" class="ghost-btn" :disabled="reviewsStore.loadingMore" @click="reviewsStore.loadMore()">
          {{ reviewsStore.loadingMore ? 'Cargando más reseñas...' : `Cargar ${Math.min(reviewsStore.remainingCount || 25, 25)} más` }}
        </button>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { ReviewsFilterKey } from '~/stores/reviews'

definePageMeta({ layout: 'admin' })

const catalogStore = useCatalogStore()
const reviewsStore = useReviewsStore()
const catalog = computed(() => catalogStore.activeCatalog)
const reviewsEnabled = ref(true)
const reviewModeration = ref(true)
const searchTerm = ref('')

const tabs = computed(() => [
  {
    key: 'all' as const,
    label: 'Todas',
    count: reviewsStore.stats.pending + reviewsStore.stats.approved,
  },
  { key: 'pending' as const, label: 'Pendientes', count: reviewsStore.stats.pending },
  { key: 'approved' as const, label: 'Aprobadas', count: reviewsStore.stats.approved },
])

const activeTabLabel = computed(() =>
  tabs.value.find(tab => tab.key === reviewsStore.currentFilter)?.label || 'Todas',
)

const visibleReviews = computed(() => {
  const needle = searchTerm.value.trim().toLowerCase()
  if (!needle) {
    return reviewsStore.items
  }

  return reviewsStore.items.filter((review) => {
    const haystack = [
      review.name,
      review.productName,
      review.comment,
      review.adminReply?.text,
      review.adminReply?.name,
    ]

    return haystack.some(value => String(value || '').toLowerCase().includes(needle))
  })
})

const emptyStateMessage = computed(() => {
  if (searchTerm.value.trim()) {
    return `No hubo coincidencias dentro de la bandeja cargada para "${searchTerm.value.trim()}".`
  }

  return `No hay reseñas en ${activeTabLabel.value.toLowerCase()}.`
})

watch(catalog, (value) => {
  if (!value) {
    reviewsStore.stopRealtime()
    return
  }

  reviewsStore.startRealtime(value.id)
}, { immediate: true })

watch(catalog, (value) => {
  if (!value) {
    return
  }

  reviewsEnabled.value = value.settings.reviewsEnabled
  reviewModeration.value = value.settings.reviewModeration
}, { immediate: true })

onBeforeUnmount(() => {
  reviewsStore.stopRealtime()
})

const saveReviewSettings = async () => {
  if (!catalog.value) {
    return
  }

  await catalogStore.updateSettings({
    reviewsEnabled: reviewsEnabled.value,
    reviewModeration: reviewModeration.value,
  })
}

const setActiveTab = async (filter: ReviewsFilterKey) => {
  searchTerm.value = ''
  await reviewsStore.setFilter(filter)
}

const approve = async (reviewId: string) => {
  if (!catalog.value) {
    return
  }

  await reviewsStore.approve(catalog.value.id, reviewId)
}

const reply = async (reviewId: string) => {
  if (!catalog.value || import.meta.server) {
    return
  }

  const text = window.prompt('Respuesta del negocio')
  if (!text) {
    return
  }

  const replyName = catalog.value.settings.adminReplyName || catalog.value.settings.businessName || 'Negocio'
  await reviewsStore.reply(catalog.value.id, reviewId, {
    name: replyName,
    text,
  })
}

const remove = async (reviewId: string) => {
  if (!catalog.value || import.meta.server) {
    return
  }

  if (!window.confirm('¿Eliminar esta reseña de la vista pública?')) {
    return
  }

  await reviewsStore.remove(catalog.value.id, reviewId)
}
</script>

<style scoped>
.review-settings {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.8rem;
  margin-bottom: 1rem;
}

.setting-card {
  border-radius: 16px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.95), rgba(248, 250, 252, 0.86));
  padding: 0.85rem 1rem;
}

.setting-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.9rem;
}

.setting-title {
  margin: 0;
  font-size: 0.92rem;
  font-weight: 800;
  color: #0f172a;
}

.setting-desc {
  margin: 0.35rem 0 0;
  font-size: 0.78rem;
  line-height: 1.35;
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

.review-metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.8rem;
}

.metric-card {
  border-radius: 18px;
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: linear-gradient(160deg, rgba(15, 23, 42, 0.06), rgba(15, 23, 42, 0.02));
  padding: 0.95rem 0.9rem;
  text-align: center;
}

.metric-label {
  margin: 0;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #64748b;
  font-weight: 700;
}

.metric-value {
  margin: 0.35rem 0 0;
  font-size: 1.3rem;
  line-height: 1.1;
  font-weight: 800;
  color: #0f172a;
}

.review-tabs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.7rem;
  margin-bottom: 1rem;
}

.review-tab {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border-radius: 18px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.95), rgba(248, 250, 252, 0.9));
  padding: 0.85rem 0.7rem;
  font-size: 0.82rem;
  font-weight: 800;
  color: #1f2937;
  transition: all 0.2s ease;
}

.review-tab.is-active {
  border-color: rgba(14, 165, 233, 0.75);
  background: linear-gradient(135deg, #0ea5e9, #0284c7);
  color: white;
  box-shadow: 0 10px 24px rgba(2, 132, 199, 0.25);
}

.status-pill {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 0.25rem 0.65rem;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.status-pending {
  background: rgba(245, 158, 11, 0.14);
  color: #b45309;
}

.status-approved {
  background: rgba(34, 197, 94, 0.14);
  color: #15803d;
}

.review-reply {
  margin-top: 0.75rem;
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.05);
  padding: 0.75rem 0.9rem;
  font-size: 0.88rem;
}

.review-reply strong {
  display: block;
  margin-bottom: 0.25rem;
}

.dark .setting-card {
  border-color: rgba(100, 116, 139, 0.35);
  background: linear-gradient(160deg, rgba(15, 23, 42, 0.62), rgba(15, 23, 42, 0.38));
}

.dark .setting-title,
.dark .metric-value {
  color: #f8fafc;
}

.dark .setting-desc,
.dark .metric-label {
  color: #94a3b8;
}

.dark .slider-3d {
  background: linear-gradient(180deg, #3f3f46 0%, #27272a 100%);
}

.dark .toggle-checkbox:checked + .slider-3d {
  background: linear-gradient(180deg, #22d3ee 0%, #0891b2 100%);
}

.dark .metric-card {
  border-color: rgba(100, 116, 139, 0.35);
  background: linear-gradient(160deg, rgba(15, 23, 42, 0.6), rgba(15, 23, 42, 0.3));
}

.dark .review-tab {
  border-color: rgba(100, 116, 139, 0.35);
  background: linear-gradient(160deg, rgba(15, 23, 42, 0.85), rgba(30, 41, 59, 0.8));
  color: #e2e8f0;
}

.dark .review-tab.is-active {
  border-color: rgba(34, 211, 238, 0.85);
  background: linear-gradient(135deg, #06b6d4, #0891b2);
}

.dark .review-reply {
  background: rgba(148, 163, 184, 0.08);
}
</style>
