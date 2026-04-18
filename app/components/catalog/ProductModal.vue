<template>
  <div class="modal-screen" @click.self="$emit('close')">
    <div class="modal-card">
      <div class="modal-gallery">
        <img :src="activeImage" :alt="product.name" class="modal-image" />
        <div v-if="images.length > 1" class="gallery-strip">
          <button
            v-for="img in images"
            :key="img"
            class="gallery-thumb"
            :class="{ active: img === activeImage }"
            @click="activeImage = img"
          >
            <img :src="img" :alt="product.name" />
          </button>
        </div>
      </div>

      <div class="modal-copy">
        <p class="eyebrow">Producto</p>
        <h3>{{ product.name }}</h3>
        <p>{{ product.description }}</p>

        <div v-if="product.variants.length" class="variant-list">
          <article v-for="group in product.variants" :key="group.group">
            <strong>{{ group.group }}</strong>
            <small>{{ group.required ? 'Obligatorio' : 'Opcional' }} · {{ group.selection === 'multiple' ? 'Múltiple' : 'Único' }}</small>
            <div class="chip-row">
              <button
                v-for="option in group.options"
                :key="option.name"
                class="chip"
                :class="{ active: isSelected(group.group, option.name) }"
                @click="toggleOption(group.group, group.selection, option.name)"
              >
                {{ option.name }} <small v-if="option.price">+{{ money(option.price, currency) }}</small>
              </button>
            </div>
          </article>
        </div>

        <div class="price-row emphasis">
          <span class="price-current">{{ money(computedTotal, currency) }}</span>
          <span v-if="product.salePrice" class="price-old">{{ money(product.price, currency) }}</span>
        </div>

        <div class="card-actions">
          <button class="ghost-btn" @click="$emit('close')">Cerrar</button>
          <button class="solid-btn" @click="submit">Agregar al carrito</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CatalogProduct } from '~/types/catalog'
import { effectivePrice, getAllProductImages, money } from '~/utils/catalog'

const props = defineProps<{
  product: CatalogProduct
  currency: string
}>()

const emit = defineEmits<{
  close: []
  add: [{ product: CatalogProduct; variantSummary: string[]; extra: number }]
}>()

const images = computed(() => getAllProductImages(props.product))
const activeImage = ref(images.value[0] || '')
const selections = ref<Record<string, string[]>>({})

watch(images, (value) => {
  activeImage.value = value[0] || ''
}, { immediate: true })

const isSelected = (group: string, option: string) => (selections.value[group] || []).includes(option)

const toggleOption = (group: string, selection: 'single' | 'multiple', option: string) => {
  const current = selections.value[group] || []
  if (selection === 'single') {
    selections.value[group] = [option]
    return
  }

  selections.value[group] = current.includes(option)
    ? current.filter(item => item !== option)
    : [...current, option]
}

const computedExtra = computed(() => props.product.variants.reduce((sum, group) => {
  const chosen = selections.value[group.group] || []
  return sum + group.options.reduce((groupSum, option) => chosen.includes(option.name) ? groupSum + option.price : groupSum, 0)
}, 0))

const computedTotal = computed(() => effectivePrice(props.product) + computedExtra.value)

const submit = () => {
  const missing = props.product.variants.find(group => group.required && !(selections.value[group.group] || []).length)
  if (missing) {
    window.alert(`Selecciona una opción para ${missing.group}`)
    return
  }

  const summary = Object.entries(selections.value).flatMap(([group, values]) => values.map(value => `${group}: ${value}`))
  emit('add', {
    product: props.product,
    variantSummary: summary,
    extra: computedExtra.value,
  })
}
</script>

