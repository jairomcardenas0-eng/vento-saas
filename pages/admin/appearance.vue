<template>
  <div class="max-w-5xl mx-auto space-y-8">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 tracking-tight">Personalización Total (Mega Panel)</h1>
        <p class="text-gray-500 text-sm mt-1 font-medium">Control corporativo sobre la totalidad de los vectores CSS de la aplicación pública.</p>
      </div>
      <button @click="commitThemeChanges" :disabled="appearanceStore.syncStatus === 'SYNCING'" class="bg-black text-white px-8 py-3 rounded-xl font-bold shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:bg-gray-800 transition active:scale-95 whitespace-nowrap min-w-[220px]">
        {{ appearanceStore.syncStatus === 'SYNCING' ? 'Transaccionando Nodos...' : appearanceStore.syncStatus === 'SUCCESS' ? '¡Actualización Activa!' : 'Guardar Sincronización' }}
      </button>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <section v-for="cluster in clusters" :key="cluster.title" class="surface-premium rounded-xl overflow-hidden border border-gray-200">
        <h2 class="bg-gray-50 px-6 py-4 border-b border-gray-200 font-bold text-gray-800 uppercase tracking-wider text-xs">{{ cluster.title }}</h2>
        <div class="p-6 space-y-2">
          <div v-if="cluster.withCardStyle" class="mb-4 pb-4 border-b border-gray-100">
            <label class="block text-xs font-bold text-gray-700 mb-2 uppercase tracking-wide">Motor de Tarjeta</label>
            <select v-model="appearanceStore.theme.cardStyle" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black outline-none font-medium">
              <option value="flat">Plano Base (High-Speed)</option>
              <option value="shadow">Classic Shadow Drop</option>
              <option value="glass-premium">Premium Traslúcido</option>
              <option value="holographic">Reflexión Holográfica</option>
            </select>
          </div>

          <div v-for="field in cluster.fields" :key="field.key" class="flex items-center justify-between p-2.5 hover:bg-gray-50 rounded-lg group transition-colors">
            <span class="text-sm font-semibold text-gray-700 group-hover:text-black transition-colors">{{ field.label }}</span>
            <input
              :value="appearanceStore.theme[field.key]"
              @input="onThemeInput(field.key, $event)"
              type="color"
              class="h-10 w-20 p-0 shadow-sm border border-gray-200 rounded cursor-pointer ring-1 ring-inset ring-black/5"
            />
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ThemeConfig } from '~/stores/appearance'

definePageMeta({ layout: 'admin' })

const authStore = useAuthStore()
const appearanceStore = useAppearanceStore()

type ThemeKey = keyof ThemeConfig

const clusters: Array<{ title: string; withCardStyle?: boolean; fields: Array<{ key: ThemeKey; label: string }> }> = [
  {
    title: 'Estructura Global y Headers',
    fields: [
      { key: 'primary', label: 'Color Primario (Marca)' },
      { key: 'bg', label: 'Fondo Base del Body' },
      { key: 'headerBg', label: 'Tope de Navegación (Header)' },
      { key: 'text', label: 'Color de Texto General' },
      { key: 'textMuted', label: 'Texto Muted (Opaco secundario)' }
    ]
  },
  {
    title: 'Catálogo y Títulos',
    withCardStyle: true,
    fields: [
      { key: 'cardBg', label: 'Fondo Base de Tarjetas' },
      { key: 'productTitleColor', label: 'Títulos de Productos' },
      { key: 'catNoteColor', label: 'Información de Categoría' }
    ]
  },
  {
    title: 'Vistas Internas (Modales de Producto)',
    fields: [
      { key: 'detailBg', label: 'Fondo del Detalle (Modal)' },
      { key: 'detailNameColor', label: 'Nombre interno del Platillo' },
      { key: 'detailPriceColor', label: 'Etiqueta de Precio' },
      { key: 'detailDescColor', label: 'Descripción Descriptiva' }
    ]
  },
  {
    title: 'Acción y Marketing (CTA)',
    fields: [
      { key: 'btnCartBg', label: 'Fondo Botón: Carrito' },
      { key: 'btnCartText', label: 'Texto Botón: Carrito' },
      { key: 'btnWaBg', label: 'Fondo Botón: WhatsApp' },
      { key: 'btnWaText', label: 'Texto Botón: WhatsApp' },
      { key: 'offerBadgeBg', label: 'Badge de Oferta Libre (Fondo)' },
      { key: 'offerBadgeText', label: 'Badge de Oferta Libre (Texto)' },
      { key: 'timerBadgeBg', label: 'Badge de Temporizador Urgente (Fondo)' },
      { key: 'timerBadgeText', label: 'Badge de Temporizador Urgente (Texto)' },
      { key: 'bannerBg', label: 'Banner Promocional (Fondo)' },
      { key: 'bannerText', label: 'Banner Promocional (Texto)' }
    ]
  }
]

const onThemeInput = (key: ThemeKey, event: Event) => {
  appearanceStore.theme[key] = (event.target as HTMLInputElement).value as ThemeConfig[ThemeKey]
}

onMounted(async () => {
    if (authStore.storeId) await appearanceStore.fetchAppearanceConfig(authStore.storeId)
})

const commitThemeChanges = async () => {
   if (!authStore.storeId) return
   await appearanceStore.saveAppearanceConfig(authStore.storeId)
}
</script>
