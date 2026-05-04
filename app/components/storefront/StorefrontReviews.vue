<template>
  <section v-if="enabled" class="storefront-reviews panel-card mt-8">
    <UiSectionHeader eyebrow="Prueba social" title="Reseñas visibles" description="Reseñas publicadas moderadas desde el admin." />
    <div class="review-list mt-4 grid gap-3">
      <article v-for="review in reviews.slice(0, 8)" :key="review.id" class="review-card rounded-[20px] border border-black/10 bg-white/80 p-4">
        <div class="review-head flex items-center justify-between gap-3">
          <strong>{{ review.name }}</strong>
          <span>{{ '★'.repeat(review.rating) }}</span>
        </div>
        <p class="review-comment mt-2 text-sm text-[#7f5a49]">{{ review.comment }}</p>
      </article>
    </div>

    <form class="review-form mt-6 space-y-4 rounded-[24px] border border-black/10 bg-white/70 p-4" @submit.prevent="$emit('submit')">
      <div>
        <strong class="block text-[#24140f]">Deja tu opinión</strong>
        <p class="section-copy mt-2 text-sm">La reseña entra al cluster de auditoría antes de publicarse.</p>
      </div>
      <label class="block">
        <span class="mb-2 block text-sm text-[#7f5a49]">Nombre</span>
        <input v-model="reviewForm.name" class="w-full rounded-[18px] border border-black/10 bg-white px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#24140f]" />
      </label>
      <label class="block">
        <span class="mb-2 block text-sm text-[#7f5a49]">Calificación</span>
        <select v-model.number="reviewForm.rating" class="w-full rounded-[18px] border border-black/10 bg-white px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#24140f]">
          <option :value="5">5 estrellas</option>
          <option :value="4">4 estrellas</option>
          <option :value="3">3 estrellas</option>
          <option :value="2">2 estrellas</option>
          <option :value="1">1 estrella</option>
        </select>
      </label>
      <label class="block">
        <span class="mb-2 block text-sm text-[#7f5a49]">Comentario</span>
        <textarea v-model="reviewForm.comment" maxlength="400" class="min-h-[110px] w-full rounded-[18px] border border-black/10 bg-white px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#24140f]" />
      </label>
      <button class="solid-btn !min-h-[48px]" type="submit">Enviar reseña</button>
    </form>
  </section>
</template>

<script setup lang="ts">
import type { CatalogReview } from '~/types/catalog'

defineProps<{
  enabled: boolean
  reviews: CatalogReview[]
  reviewForm: {
    name: string
    rating: number
    comment: string
  }
}>()

defineEmits<{ submit: [] }>()
</script>

<style scoped>
.storefront-reviews {
  max-width: 100%;
  overflow: hidden;
  border-radius: 28px;
  background: color-mix(in srgb, var(--catalog-card, white) 88%, white);
}

.review-card,
.review-form {
  max-width: 100%;
}

.review-head {
  min-width: 0;
}

.review-head strong,
.review-comment,
.section-copy {
  overflow-wrap: anywhere;
}

.review-form input,
.review-form select,
.review-form textarea {
  max-width: 100%;
}

@container (max-width: 420px) {
  .storefront-reviews {
    margin-top: 1.25rem;
    padding: 1rem;
    border-radius: 24px;
  }

  .review-head {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
