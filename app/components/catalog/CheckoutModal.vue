<template>
  <div class="modal-screen" @click.self="$emit('close')">
    <form class="modal-card checkout-card" @submit.prevent="emitSubmit">
      <div class="modal-copy">
        <p class="eyebrow">Checkout</p>
        <h3>Enviar pedido a WhatsApp</h3>

        <div class="checkout-summary">
          <article v-for="item in items" :key="item.productId + item.variantSummary.join('|')">
            <strong>{{ item.qty }}x {{ item.productName }}</strong>
            <p>{{ item.variantSummary.join(', ') || 'Sin variantes' }}</p>
            <span>{{ money(item.totalPrice, currency) }}</span>
          </article>
        </div>

        <label><span>Nombre</span><input v-model="model.name" :required="nameRequired" /></label>
        <label><span>Dirección</span><input v-model="model.address" :required="addressRequired" /></label>
        <label><span>Forma de pago</span><input v-model="model.payment" :required="paymentRequired" /></label>
        <label><span>Notas</span><textarea v-model="model.notes" rows="3" /></label>

        <div class="price-row emphasis">
          <span class="price-current">{{ money(total, currency) }}</span>
        </div>

        <div class="card-actions">
          <button type="button" class="ghost-btn" @click="$emit('close')">Cancelar</button>
          <button class="solid-btn">Enviar</button>
        </div>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import type { CatalogOrderItem } from '~/types/catalog'
import { money } from '~/utils/catalog'

defineProps<{
  items: CatalogOrderItem[]
  total: number
  currency: string
  nameRequired: boolean
  addressRequired: boolean
  paymentRequired: boolean
}>()

const emit = defineEmits<{
  close: []
  submit: [{ name: string; address: string; payment: string; notes: string }]
}>()

const model = ref({
  name: '',
  address: '',
  payment: '',
  notes: '',
})

const emitSubmit = () => emit('submit', { ...model.value })
</script>

