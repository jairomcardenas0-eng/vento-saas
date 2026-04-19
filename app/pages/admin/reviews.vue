<template>
  <AdminStatePanel
    v-if="!catalog"
    title="No hay un catálogo activo"
    description="Selecciona un catálogo para revisar las reseñas."
  />

  <AdminStatePanel
    v-else-if="reviewsStore.loading && !reviewsStore.items.length"
    tone="loading"
    title="Cargando reseñas"
    description="Estamos sincronizando la moderación en tiempo real."
  />

  <div v-else class="admin-grid">
    <section class="panel-card span-2 min-w-0">
      <UiSectionHeader eyebrow="Moderación" title="Bandeja de reseñas" description="Aprueba, responde y limpia las reseñas del catálogo." />

      <div class="review-metrics">
        <article class="metric-card">
          <p class="metric-label">Pendientes</p>
          <p class="metric-value">{{ reviewsStore.pending.length }}</p>
        </article>
        <article class="metric-card">
          <p class="metric-label">Aprobadas</p>
          <p class="metric-value">{{ reviewsStore.approved.length }}</p>
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

      <div class="admin-grid">
        <section class="panel-card min-w-0">
          <UiSectionHeader eyebrow="Pendientes" title="Por revisar" />
          <div v-if="!reviewsStore.pending.length" class="rounded-[20px] border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            No hay reseñas pendientes.
          </div>
          <div v-else class="table-list">
            <article v-for="review in reviewsStore.pending" :key="review.id" class="list-row min-w-0">
              <div class="min-w-0">
                <strong class="block break-words">{{ review.name }} · {{ review.productName }}</strong>
                <p class="break-words">{{ review.comment }}</p>
                <small class="inline-muted">{{ '★'.repeat(review.rating) }}</small>
              </div>
              <div class="row-meta wrap">
                <button class="solid-btn small" @click="approve(review.id)">Aprobar</button>
                <button class="ghost-btn small" @click="reply(review.id)">Responder</button>
                <button class="ghost-btn small" @click="remove(review.id)">Borrar</button>
              </div>
            </article>
          </div>
        </section>

        <section class="panel-card min-w-0">
          <UiSectionHeader eyebrow="Publicadas" title="Reseñas visibles" />
          <div v-if="!reviewsStore.approved.length" class="rounded-[20px] border border-dashed border-zinc-300 px-4 py-8 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
            Aún no hay reseñas aprobadas.
          </div>
          <div v-else class="table-list">
            <article v-for="review in reviewsStore.approved" :key="review.id" class="list-row min-w-0">
              <div class="min-w-0">
                <strong class="block break-words">{{ review.name }} · {{ review.productName }}</strong>
                <p class="break-words">{{ review.comment }}</p>
                <small class="inline-muted">{{ '★'.repeat(review.rating) }}</small>
                <div v-if="review.adminReply" class="review-reply">
                  <strong>{{ review.adminReply.name }}</strong>
                  <p class="break-words">{{ review.adminReply.text }}</p>
                </div>
              </div>
              <div class="row-meta wrap">
                <button class="ghost-btn small" @click="reply(review.id)">Responder</button>
                <button class="ghost-btn small" @click="remove(review.id)">Eliminar</button>
              </div>
            </article>
          </div>
        </section>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin' })

const catalogStore = useCatalogStore()
const reviewsStore = useReviewsStore()
const catalog = computed(() => catalogStore.activeCatalog)

watch(catalog, (value) => {
  if (!value) {
    reviewsStore.stopRealtime()
    return
  }

  reviewsStore.startRealtime(value.id)
}, { immediate: true })

onBeforeUnmount(() => {
  reviewsStore.stopRealtime()
})

const approve = async (reviewId: string) => {
  if (!catalog.value) {
    return
  }

  await reviewsStore.approve(catalog.value.id, reviewId)
}

const reply = async (reviewId: string) => {
  if (!catalog.value) {
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
  if (!catalog.value) {
    return
  }

  if (!window.confirm('¿Eliminar esta reseña de la vista pública?')) {
    return
  }

  await reviewsStore.remove(catalog.value.id, reviewId)
}
</script>

<style scoped>
.review-metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.8rem;
  margin-bottom: 1rem;
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
  font-size: 1.4rem;
  line-height: 1.1;
  font-weight: 800;
  color: #0f172a;
}

.dark .metric-card {
  border-color: rgba(100, 116, 139, 0.35);
  background: linear-gradient(160deg, rgba(15, 23, 42, 0.6), rgba(15, 23, 42, 0.3));
}

.dark .metric-label {
  color: #94a3b8;
}

.dark .metric-value {
  color: #f8fafc;
}
</style>
