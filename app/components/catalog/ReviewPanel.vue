<template>
  <section class="reviews-panel">
    <UiSectionHeader eyebrow="Prueba social" title="Reseñas del catálogo" description="Los comentarios aprobados refuerzan conversión y confianza.">
      <template #actions>
        <span class="ghost-btn small">{{ visibleReviews.length }} visibles</span>
      </template>
    </UiSectionHeader>

    <div class="review-composer">
      <input v-model="name" placeholder="Tu nombre" />
      <select v-model.number="rating">
        <option :value="5">5 estrellas</option>
        <option :value="4">4 estrellas</option>
        <option :value="3">3 estrellas</option>
        <option :value="2">2 estrellas</option>
        <option :value="1">1 estrella</option>
      </select>
      <textarea v-model="comment" rows="3" maxlength="300" placeholder="Cuéntale al negocio cómo te fue" />
      <p v-if="submitError" class="text-sm text-rose-600 dark:text-rose-400">{{ submitError }}</p>
      <button class="solid-btn" @click="submit">Enviar reseña</button>
    </div>

    <div class="review-listing">
      <article v-for="review in visibleReviews" :key="review.id" class="review-card">
        <div class="review-headline">
          <strong>{{ review.name }}</strong>
          <span>{{ '★'.repeat(review.rating) }}</span>
        </div>
        <p>{{ review.comment }}</p>
        <small>{{ review.approved ? 'Publicada' : 'Pendiente de moderación' }}</small>
        <div v-if="review.adminReply" class="review-reply">
          <strong>{{ review.adminReply.name }}</strong>
          <p>{{ review.adminReply.text }}</p>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { CatalogRecord } from '~/types/catalog'

const props = defineProps<{
  catalog: CatalogRecord
}>()

const emit = defineEmits<{
  submit: [{ name: string; comment: string; rating: number }]
}>()

const name = ref('')
const comment = ref('')
const rating = ref(5)

const visibleReviews = computed(() =>
  props.catalog.reviews
    .filter(item => item.approved || !props.catalog.settings.reviewModeration)
    .slice(0, 8),
)

const submitError = ref('')

const submit = () => {
  submitError.value = ''
  if (name.value.trim().length < 2 || comment.value.trim().length < 3) {
    submitError.value = 'Completa un nombre y un comentario válidos'
    return
  }
  emit('submit', {
    name: name.value.trim(),
    comment: comment.value.trim(),
    rating: rating.value,
  })
  name.value = ''
  comment.value = ''
  rating.value = 5
}
</script>

