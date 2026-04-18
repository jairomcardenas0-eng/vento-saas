<template>
  <Transition
    enter-active-class="transition-transform duration-300 ease-out"
    enter-from-class="translate-y-full"
    enter-to-class="translate-y-0"
    leave-active-class="transition-transform duration-300 ease-in"
    leave-from-class="translate-y-0"
    leave-to-class="translate-y-full"
  >
    <div v-if="product" class="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" @click.self="$emit('close')">
      <div class="absolute inset-x-0 bottom-0 max-h-[90vh] overflow-y-auto rounded-t-[32px] border border-white/10 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]" :style="{ background: 'var(--catalog-detail-bg, var(--catalog-card))' }">
        <div class="mx-auto mb-4 h-1.5 w-14 rounded-full bg-white/20" />
        <div class="overflow-hidden rounded-[24px] bg-black/10">
          <img v-if="product.imageUrl" :src="product.imageUrl" :alt="product.name" loading="lazy" class="aspect-video w-full object-cover" />
          <div v-else class="flex aspect-video items-center justify-center text-sm text-white/60">Sin imagen</div>
        </div>

        <div class="mt-5 space-y-5">
          <div class="flex items-start justify-between gap-4">
            <div>
              <div class="mb-2 inline-flex items-center gap-2 rounded-full bg-black/20 px-3 py-1 text-xs text-yellow-300" v-if="product.productRatingCount">
                <span>★ {{ product.productRating.toFixed(1) }}</span>
                <span class="text-white/70">({{ product.productRatingCount }})</span>
              </div>
              <h3 class="text-2xl font-semibold text-[color:var(--catalog-text)]">{{ product.name }}</h3>
              <p class="mt-2 text-sm leading-6 text-[color:var(--catalog-muted)]">{{ product.description }}</p>
            </div>
            <button class="ghost-btn small !min-h-[44px]" @click="$emit('close')">Cerrar</button>
          </div>

          <section v-for="group in product.variants" :key="group.id" class="rounded-[24px] border border-white/10 bg-black/10 p-4">
            <div class="mb-3 flex items-center justify-between gap-3">
              <strong class="text-[color:var(--catalog-text)]">{{ group.groupName }}</strong>
              <small class="text-[color:var(--catalog-muted)]">{{ group.type === 'single' ? 'Seleccion unica' : 'Seleccion multiple' }}</small>
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="option in group.options"
                :key="option.id"
                type="button"
                class="min-h-[44px] min-w-[140px] flex-1 rounded-[14px] border px-4 py-3 text-left text-sm transition"
                :class="isSelected(group, option.id) ? 'border-[color:var(--catalog-primary)] bg-[color:var(--catalog-primary)] text-white' : 'border-white/10 bg-white/5 text-[color:var(--catalog-text)]'"
                @click="group.type === 'single' ? $emit('select-single', group.id, option.id) : $emit('toggle-multi', group.id, option.id)"
              >
                <span class="block font-medium">{{ option.name }}</span>
                <small class="mt-1 block opacity-75">{{ option.priceDelta > 0 ? `+${money(option.priceDelta, currency)}` : 'Incluido' }}</small>
              </button>
            </div>
          </section>

          <label class="block">
            <span class="mb-2 block text-sm text-[color:var(--catalog-muted)]">Instrucciones</span>
            <textarea :value="instructions" maxlength="180" class="min-h-[110px] w-full rounded-[18px] border border-white/10 bg-white/5 px-4 py-3 text-[color:var(--catalog-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--catalog-primary)]" placeholder="Ej: sin cebolla, salsa aparte" @input="$emit('update:instructions', ($event.target as HTMLTextAreaElement).value)" />
          </label>

          <div class="flex items-center justify-between gap-4 rounded-[22px] border border-white/10 bg-black/10 p-4">
            <div class="flex items-center gap-2">
              <button class="ghost-btn small !min-h-[44px] !w-[44px] !rounded-full !p-0" @click="$emit('update:quantity', Math.max(1, quantity - 1))">-</button>
              <span class="min-w-8 text-center text-lg font-semibold text-[color:var(--catalog-text)]">{{ quantity }}</span>
              <button class="ghost-btn small !min-h-[44px] !w-[44px] !rounded-full !p-0" @click="$emit('update:quantity', quantity + 1)">+</button>
            </div>
            <div class="text-right">
              <small class="block text-[color:var(--catalog-muted)]">Subtotal del producto</small>
              <strong class="text-2xl text-[color:var(--catalog-price)]">{{ money(subtotal, currency) }}</strong>
            </div>
          </div>

          <button class="solid-btn w-full !min-h-[52px]" @click="$emit('commit')">Agregar al carrito</button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import type { ProductItem, VariantGroup } from '~/stores/catalog'
import { money } from '~/utils/catalog'

const props = defineProps<{
  product: ProductItem | null
  currency: string
  singleSelections: Record<string, string>
  multiSelections: Record<string, string[]>
  quantity: number
  instructions: string
  subtotal: number
}>()

defineEmits<{
  close: []
  commit: []
  'select-single': [groupId: string, optionId: string]
  'toggle-multi': [groupId: string, optionId: string]
  'update:quantity': [value: number]
  'update:instructions': [value: string]
}>()

const isSelected = (group: VariantGroup, optionId: string) => group.type === 'single'
  ? props.singleSelections[group.id] === optionId
  : props.multiSelections[group.id]?.includes(optionId) || false
</script>
