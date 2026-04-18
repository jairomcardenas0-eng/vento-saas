<template>
  <article class="catalog-card">
    <img :src="image" :alt="product.name" class="card-image" />
    <div class="card-body">
      <div class="card-topline">
        <div class="tag-stack">
          <span v-if="product.offerLabel" class="offer-badge">{{ product.offerLabel }}</span>
          <span v-for="tag in product.tags" :key="tag" class="tag-badge">{{ tag }}</span>
        </div>
        <strong>{{ product.name }}</strong>
      </div>
      <p>{{ product.description }}</p>
      <div class="price-row">
        <span class="price-current">{{ money(effectivePrice(product), currency) }}</span>
        <span v-if="product.salePrice" class="price-old">{{ money(product.price, currency) }}</span>
      </div>
      <p v-if="timerText" class="timer-caption">{{ timerText }}</p>
      <div class="card-actions">
        <button class="ghost-btn small" @click="$emit('open', product)">Detalles</button>
        <button class="solid-btn small" @click="$emit('add', product)">Agregar</button>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { CatalogProduct } from '~/types/catalog'
import { createTimerText, effectivePrice, getAllProductImages, money } from '~/utils/catalog'

const props = defineProps<{
  product: CatalogProduct
  currency: string
}>()

defineEmits<{
  open: [CatalogProduct]
  add: [CatalogProduct]
}>()

const image = computed(() => getAllProductImages(props.product)[0] || '')
const timerText = computed(() => createTimerText(props.product.timerHours))
</script>

