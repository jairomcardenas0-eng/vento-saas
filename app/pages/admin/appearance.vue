<template>
  <div v-if="!catalog" class="admin-grid">
    <AdminStatePanel
      class="span-2"
      title="No hay catálogo activo"
      description="Selecciona o crea un catálogo para personalizar la apariencia del menú público."
    />
  </div>

  <div v-else class="admin-grid">
    <section class="panel-card span-2 relative overflow-hidden">
      <UiSectionHeader
        eyebrow="Apariencia"
        title="Diseño del catálogo"
        description="Selecciona la experiencia visual que verán tus clientes en el menú público."
      >
        <template #actions>
          <button class="solid-btn" :disabled="saving" @click="save">
            {{ saving ? 'Guardando...' : 'Guardar apariencia' }}
          </button>
        </template>
      </UiSectionHeader>

      <div class="grid gap-4 md:grid-cols-3">
        <button
          v-for="option in layoutOptions"
          :key="option.value"
          type="button"
          class="rounded-[26px] border p-5 text-left transition"
          :class="layoutDraft === option.value
            ? 'border-zinc-900 bg-zinc-900 text-zinc-50 shadow-lg dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900'
            : 'border-zinc-200 bg-zinc-50 hover:border-zinc-300 hover:bg-white dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700 dark:hover:bg-zinc-900'"
          @click="layoutDraft = option.value"
        >
          <div class="layout-preview mb-4 flex h-32 items-center justify-center rounded-[20px] border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-900">
            <div v-if="option.value === 'classic'" class="w-full max-w-[160px] space-y-2">
              <div class="h-6 rounded-lg bg-gradient-to-r from-blue-400 to-indigo-500" />
              <div class="flex gap-1.5">
                <span class="h-5 flex-1 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                <span class="h-5 w-6 rounded-full bg-blue-500" />
              </div>
              <div class="grid grid-cols-2 gap-1.5">
                <span class="h-9 rounded-lg bg-zinc-200 dark:bg-zinc-700" />
                <span class="h-9 rounded-lg bg-zinc-200 dark:bg-zinc-700" />
                <span class="h-9 rounded-lg bg-zinc-200 dark:bg-zinc-700" />
                <span class="h-9 rounded-lg bg-zinc-200 dark:bg-zinc-700" />
              </div>
            </div>
            <div v-else-if="option.value === 'list'" class="w-full max-w-[160px] space-y-2">
              <div class="h-5 rounded-lg bg-gradient-to-r from-emerald-400 to-teal-500" />
              <div class="space-y-1.5">
                <div class="flex items-center gap-1.5 rounded-lg bg-zinc-100 p-1.5 dark:bg-zinc-800">
                  <span class="h-6 w-6 rounded bg-zinc-300 dark:bg-zinc-600" />
                  <span class="h-2 flex-1 rounded bg-zinc-300 dark:bg-zinc-600" />
                  <span class="h-5 w-5 rounded-full bg-emerald-500" />
                </div>
                <div class="flex items-center gap-1.5 rounded-lg bg-zinc-100 p-1.5 dark:bg-zinc-800">
                  <span class="h-6 w-6 rounded bg-zinc-300 dark:bg-zinc-600" />
                  <span class="h-2 flex-1 rounded bg-zinc-300 dark:bg-zinc-600" />
                  <span class="h-5 w-5 rounded-full bg-emerald-500" />
                </div>
                <div class="flex items-center gap-1.5 rounded-lg bg-zinc-100 p-1.5 dark:bg-zinc-800">
                  <span class="h-6 w-6 rounded bg-zinc-300 dark:bg-zinc-600" />
                  <span class="h-2 flex-1 rounded bg-zinc-300 dark:bg-zinc-600" />
                  <span class="h-5 w-5 rounded-full bg-emerald-500" />
                </div>
              </div>
            </div>
            <div v-else class="w-full max-w-[160px] space-y-2">
              <div class="h-7 rounded-xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 shadow-md" />
              <div class="grid grid-cols-2 gap-1.5">
                <span class="col-span-2 h-6 rounded-lg bg-zinc-200 dark:bg-zinc-700" />
                <span class="h-10 rounded-xl bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800 shadow-sm" />
                <span class="h-10 rounded-xl bg-gradient-to-br from-zinc-200 to-zinc-300 dark:from-zinc-700 dark:to-zinc-800 shadow-sm" />
              </div>
            </div>
          </div>
          <strong class="block text-lg">{{ option.label }}</strong>
          <p class="mt-2 text-sm opacity-75">{{ option.description }}</p>
        </button>
      </div>

      <p class="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
        El diseño se aplica al instante en tu catálogo público.
      </p>

      <div class="relative mt-8 border-t border-zinc-200 pt-8 dark:border-zinc-800">
        <UiSectionHeader
          eyebrow="Tema visual"
          title="Variables del tema"
          description="Colores, banner y superficies del catálogo público."
        />

        <div v-if="layoutDraft === 'store'" class="grid-form mb-6">
          <label><span>Texto superior</span><input v-model="settingsDraft.storeTopBarHtml" placeholder="Envíos rápidos y ofertas activas" /></label>
          <label><span>Nombre en header</span><input v-model="settingsDraft.storeHeaderName" placeholder="Nombre visible en header" /></label>
          <label class="toggle"><input v-model="settingsDraft.storeShowPremiumBadge" type="checkbox" /><span>Mostrar badge premium</span></label>
          <label><span>Etiqueta hero</span><input v-model="settingsDraft.storeHeroTag" placeholder="Tienda destacada" /></label>
          <label><span>Título hero</span><input v-model="settingsDraft.storeHeroTitle" placeholder="Compra en tu tienda" /></label>
          <label><span>Descripción hero</span><textarea v-model="settingsDraft.storeHeroDescription" rows="3" placeholder="Mensaje principal de portada" /></label>
          <label><span>Texto botón hero</span><input v-model="settingsDraft.storeHeroButtonText" placeholder="Ver productos" /></label>
          <label><span>Imagen hero</span><input v-model="settingsDraft.storeHeroBackgroundImage" placeholder="https://..." /></label>
          <label class="space-y-1">
            <span>Logo de la tienda</span>
            <div class="flex items-center gap-2">
              <input v-model="settingsDraft.logoUrl" placeholder="https://..." class="flex-1" />
              <input type="file" accept="image/*" class="hidden" ref="logoFileInput" @change="onLogoFileSelected" />
              <button type="button" class="ghost-btn small !min-h-[36px]" @click="logoFileInput?.click()">Subir</button>
            </div>
            <div v-if="settingsDraft.logoUrl" class="mt-1 flex items-center gap-2">
              <img :src="settingsDraft.logoUrl" class="h-10 w-10 rounded-lg object-cover" />
              <button type="button" class="text-xs text-rose-500" @click="settingsDraft.logoUrl = ''">Quitar</button>
            </div>
          </label>
          <label class="space-y-1">
            <span>Ícono de app (512×512)</span>
            <div class="flex items-center gap-2">
              <input v-model="settingsDraft.appIconUrl" placeholder="https://..." class="flex-1" />
              <input type="file" accept="image/*" class="hidden" ref="appIconFileInput" @change="onAppIconFileSelected" />
              <button type="button" class="ghost-btn small !min-h-[36px]" @click="appIconFileInput?.click()">Subir</button>
            </div>
            <div v-if="settingsDraft.appIconUrl" class="mt-1 flex items-center gap-2">
              <img :src="settingsDraft.appIconUrl" class="h-10 w-10 rounded-lg object-cover" />
              <button type="button" class="text-xs text-rose-500" @click="settingsDraft.appIconUrl = ''">Quitar</button>
            </div>
          </label>
          <label><span>Texto footer</span><input v-model="settingsDraft.storeFooterText" placeholder="Gracias por comprar con nosotros" /></label>
          <!-- Icon picker visual -->
          <div class="space-y-2">
            <span class="text-sm font-medium text-zinc-600 dark:text-zinc-400">Ícono de la tienda</span>
            <div class="grid grid-cols-5 gap-2">
              <button
                v-for="icon in storeIconOptions"
                :key="icon"
                type="button"
                class="flex items-center justify-center rounded-xl border-2 p-3 transition-all hover:scale-110"
                :class="settingsDraft.storeIcon === icon ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-900/30' : 'border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800'"
                :title="icon"
                @click="settingsDraft.storeIcon = icon"
              >
                <component :is="storeIconComponents[icon]" class="h-6 w-6" :class="settingsDraft.storeIcon === icon ? 'text-blue-600 dark:text-blue-400' : 'text-zinc-500 dark:text-zinc-400'" />
              </button>
            </div>
            <p class="text-xs text-zinc-400">Icono actual: <code class="rounded bg-zinc-100 px-1 dark:bg-zinc-800">{{ settingsDraft.storeIcon }}</code></p>
          </div>
        </div>

        <div v-if="layoutDraft === 'store'" class="relative mt-4 border-t border-zinc-200 pt-6 dark:border-zinc-800">
          <UiSectionHeader
            eyebrow="Colores de tienda"
            title="Interfaz de tienda"
            description="Colores de fondo, tarjetas, carrito y texto para el modo tienda. Independientes del tema del catálogo."
          />

          <!-- Paleta de 30 colores predefinidos -->
          <div class="mt-4 space-y-3">
            <span class="text-sm font-medium text-zinc-600 dark:text-zinc-400">Paleta rápida</span>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="swatch in storeColorPalette"
                :key="swatch.hex"
                type="button"
                class="color-swatch-btn h-10 w-10 rounded-xl border-2 transition-all hover:scale-115"
                :class="storeActivePalette === swatch.hex ? 'border-white shadow-[0_0_0_2px_rgba(0,0,0,0.3)] scale-110 dark:shadow-[0_0_0_2px_rgba(255,255,255,0.4)]' : 'border-transparent'"
                :style="{ backgroundColor: swatch.hex }"
                :title="swatch.name"
                @click="applyStorePalette(swatch)"
              />
            </div>
            <div class="flex items-center gap-2">
              <input
                type="color"
                :value="storeActivePalette"
                @input="applyCustomStoreColor(($event.target as HTMLInputElement).value)"
                class="h-10 w-10 cursor-pointer rounded-lg border-0 bg-transparent"
              />
              <span class="text-xs text-zinc-400">Color personalizado: <code class="rounded bg-zinc-100 px-1 dark:bg-zinc-800">{{ storeActivePalette }}</code></span>
              <button type="button" class="ghost-btn small ml-auto !text-xs" @click="resetStoreColors">Restablecer colores</button>
            </div>
          </div>

          <div class="theme-color-grid mt-4">
            <label v-for="field in storeColorFields" :key="field.key" class="theme-swatch">
              <span class="theme-swatch-chip" :style="{ backgroundColor: String(settingsDraft[field.key] || '') }" />
              <span class="theme-swatch-body">
                <span class="theme-swatch-label">{{ field.label }}</span>
                <span class="theme-swatch-hex">{{ String(settingsDraft[field.key] || '').toUpperCase() }}</span>
              </span>
              <input
                :value="String(settingsDraft[field.key] || '')"
                @input="setStoreColor(field.key, ($event.target as HTMLInputElement).value)"
                type="color"
                class="theme-swatch-input"
              />
            </label>
          </div>
        </div>

        <fieldset class="contents">
          <div class="transition duration-200">
            <div class="theme-color-grid">
              <label
                v-for="field in themeFields"
                :key="field.key"
                class="theme-swatch"
              >
                <span
                  class="theme-swatch-chip"
                  :style="{ backgroundColor: String(draft[field.key] || '') }"
                />
                <span class="theme-swatch-body">
                  <span class="theme-swatch-label">{{ field.label }}</span>
                  <span class="theme-swatch-hex">{{ String(draft[field.key]).toUpperCase() }}</span>
                </span>
                <input
                  :value="String(draft[field.key] || '')"
                  @input="setThemeColor(field.key, ($event.target as HTMLInputElement).value)"
                  type="color"
                  class="theme-swatch-input"
                />
              </label>
            </div>

            <div class="grid-form">
              <label class="toggle"><input v-model="draft.bannerEnabled" type="checkbox" /><span>Banner activo</span></label>
              <label><span>Texto de banner</span><input v-model="draft.bannerText" /></label>
              <label><span>Estilo de tarjeta</span>
                <select v-model="draft.cardStyle">
                  <option value="flat">Plano</option>
                  <option value="shadow">Sombra</option>
                  <option value="glass-premium">Vidrio</option>
                  <option value="holographic">Holográfico</option>
                </select>
              </label>
              <label><span>Modo del banner</span>
                <select v-model="draft.bannerMode">
                  <option value="static">Estático</option>
                  <option value="loop">Loop</option>
                </select>
              </label>
              <label class="toggle"><input v-model="draft.bannerSticky" type="checkbox" /><span>Banner fijo</span></label>
            </div>
          </div>
        </fieldset>
      </div>

      <p v-if="saveError" class="mt-4 text-sm text-rose-500">{{ saveError }}</p>
    </section>

    <CropModal :open="cropOpen" :file="cropFile" @close="cropOpen = false" @cropped="onCropped" />

    <!-- Upload Progress Bar -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="opacity-0 translate-y-4"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition-all duration-200 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 translate-y-4"
      >
        <div v-if="uploading" class="fixed bottom-6 right-6 z-[300] w-80 rounded-2xl border border-zinc-200 bg-white p-4 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
          <div class="mb-2 flex items-center justify-between">
            <span class="text-sm font-semibold text-zinc-900 dark:text-white">Subiendo {{ uploadFileName }}</span>
            <span class="text-xs font-mono font-bold text-zinc-500">{{ uploadProgress }}%</span>
          </div>
          <div class="h-2 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div
              class="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300 ease-out"
              :style="{ width: `${uploadProgress}%` }"
            />
          </div>
          <p v-if="uploadProgress === 100" class="mt-2 text-xs text-emerald-600 font-semibold">Completado</p>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import {
  ShoppingBag, ShoppingCart, Store, Package, Gem, Shirt, Watch, House,
  UtensilsCrossed, Coffee, Smartphone, Laptop, Truck, Sparkles, GlassWater,
} from 'lucide-vue-next'
import type { Component } from 'vue'
import AdminStatePanel from '~/components/admin/AdminStatePanel.vue'
import CropModal from '~/components/admin/CropModal.vue'
import { defaultTheme } from '~/data/defaults'
import type { CatalogOperationalSettings, CatalogThemeSettings } from '~/types/catalog'

const storeIconOptions = [
  'shopping-bag', 'shopping-cart', 'store', 'package', 'gem',
  'shirt', 'watch', 'house', 'utensils-crossed', 'coffee',
  'smartphone', 'laptop', 'truck', 'sparkles', 'glass-water',
] as const

const storeIconComponents: Record<string, Component> = {
  'shopping-bag': ShoppingBag,
  'shopping-cart': ShoppingCart,
  'store': Store,
  'package': Package,
  'gem': Gem,
  'shirt': Shirt,
  'watch': Watch,
  'house': House,
  'utensils-crossed': UtensilsCrossed,
  'coffee': Coffee,
  'smartphone': Smartphone,
  'laptop': Laptop,
  'truck': Truck,
  'sparkles': Sparkles,
  'glass-water': GlassWater,
}

definePageMeta({ layout: 'admin' })

const catalogStore = useCatalogStore()
const previewStore = usePreviewStore()
const storageEngine = useStorageEngine()
const catalog = computed(() => catalogStore.activeCatalog)
const isPaywalled = computed(() => false)
const draft = ref<CatalogThemeSettings>(defaultTheme())
const layoutDraft = ref<CatalogOperationalSettings['storefrontLayout']>('classic')
const settingsDraft = ref<Pick<CatalogOperationalSettings,
  'storeTopBarHtml'
  | 'storeHeaderName'
  | 'storeShowPremiumBadge'
  | 'storeHeroTag'
  | 'storeHeroTitle'
  | 'storeHeroDescription'
  | 'storeHeroButtonText'
  | 'storeHeroBackgroundImage'
  | 'storeFooterText'
  | 'storeIcon'
  | 'logoUrl'
  | 'appIconUrl'
  | 'storeBgColor'
  | 'storeCardBgColor'
  | 'storeCartBgColor'
  | 'storeTextPrimaryColor'
  | 'storeTextSecondaryColor'
  | 'storeCartTextColor'
  | 'storeToastFrom'
  | 'storeToastTo'
>>({
  storeTopBarHtml: '',
  storeHeaderName: '',
  storeShowPremiumBadge: true,
  storeHeroTag: '',
  storeHeroTitle: '',
  storeHeroDescription: '',
  storeHeroButtonText: '',
  storeHeroBackgroundImage: '',
  storeFooterText: '',
  storeIcon: 'shopping-bag',
  logoUrl: '',
  appIconUrl: '',
  storeBgColor: '#f8fafc',
  storeCardBgColor: '#ffffff',
  storeCartBgColor: '#0f172a',
  storeTextPrimaryColor: '#0f172a',
  storeTextSecondaryColor: '#64748b',
  storeCartTextColor: '#ffffff',
  storeToastFrom: '#3b82f6',
  storeToastTo: '#2563eb',
})
const saving = ref(false)
const saveError = ref('')

// Crop & Upload
const logoFileInput = ref<HTMLInputElement | null>(null)
const appIconFileInput = ref<HTMLInputElement | null>(null)
const cropOpen = ref(false)
const cropFile = ref<File | null>(null)
const cropTarget = ref<'logo' | 'appIcon'>('logo')
const uploading = ref(false)
const uploadProgress = ref(0)
const uploadFileName = ref('')

function onLogoFileSelected(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  cropFile.value = file
  cropTarget.value = 'logo'
  cropOpen.value = true
}

function onAppIconFileSelected(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  cropFile.value = file
  cropTarget.value = 'appIcon'
  cropOpen.value = true
}

async function onCropped(blob: Blob) {
  if (!catalog.value) {
    return
  }

  cropOpen.value = false
  uploading.value = true
  uploadProgress.value = 0
  uploadFileName.value = `${cropTarget.value === 'logo' ? 'Logo' : 'App Icon'}`

  const file = new File([blob], `${cropTarget.value}-cropped.png`, { type: 'image/png' })

  try {
    const uploadedUrl = await storageEngine.uploadProductImage(catalog.value.id, file, (progress) => {
      uploadProgress.value = progress
    })
    if (cropTarget.value === 'logo') {
      settingsDraft.value.logoUrl = uploadedUrl
    } else {
      settingsDraft.value.appIconUrl = uploadedUrl
    }
  } catch (err) {
    console.error('Upload failed:', err)
  } finally {
    setTimeout(() => {
      uploading.value = false
      uploadProgress.value = 0
    }, 600)
  }

  if (logoFileInput.value) logoFileInput.value.value = ''
  if (appIconFileInput.value) appIconFileInput.value.value = ''
}

watch([draft, layoutDraft, settingsDraft], ([themeValue, layoutValue, settingsValue]) => {
  previewStore.setTheme(JSON.parse(JSON.stringify(themeValue)) as Partial<CatalogThemeSettings>)
  previewStore.setSettings({
    storefrontLayout: layoutValue,
    ...JSON.parse(JSON.stringify(settingsValue)),
  })
}, { deep: true })

onUnmounted(() => {
  previewStore.setTheme(null)
  previewStore.setSettings(null)
})

const layoutOptions: Array<{ value: CatalogOperationalSettings['storefrontLayout'], label: string, description: string }> = [
  { value: 'classic', label: 'Clásico', description: 'Diseño tradicional con categorías en la parte superior, productos en cuadrícula de dos columnas y botón del carrito fijo abajo. Ideal para negocios con fotos de productos grandes.' },
  { value: 'list', label: 'Lista veloz', description: 'Lista compacta de productos uno debajo del otro. Muestra más productos por pantalla y permite un desplazamiento más rápido. Perfecto para menús largos con muchos productos.' },
  { value: 'store', label: 'Tienda Pro', description: 'Experiencia ecommerce con hero, favoritos, navegación más comercial y una presentación más cercana al generador de tiendas original.' },
  { value: 'saas', label: 'SaaS Pro', description: 'Diseño moderno con gradientes, tarjetas con sombras y animaciones premium. Ideal para negocios que quieren una imagen más profesional y elegante.' },
]

type ThemeColorKey =
  | 'primary'
  | 'bg'
  | 'headerBg'
  | 'headerText'
  | 'cardBg'
  | 'catNoteColor'
  | 'priceColor'
  | 'priceOldColor'
  | 'descColor'
  | 'productTitleColor'
  | 'offerBadgeBg'
  | 'offerBadgeText'
  | 'timerBadgeBg'
  | 'timerBadgeText'
  | 'tagBg'
  | 'tagText'
  | 'searchInputBg'
  | 'searchInputBorder'
  | 'detailBg'
  | 'detailNameColor'
  | 'detailDescColor'
  | 'detailPriceColor'
  | 'btnCartBg'
  | 'btnCartText'
  | 'btnWaBg'
  | 'btnWaText'
  | 'bannerBg'
  | 'bannerTextColor'

const themeFields: Array<{ key: ThemeColorKey, label: string }> = [
  { key: 'primary', label: 'Primario' },
  { key: 'bg', label: 'Fondo' },
  { key: 'headerBg', label: 'Encabezado' },
  { key: 'headerText', label: 'Texto encabezado' },
  { key: 'cardBg', label: 'Tarjetas' },
  { key: 'catNoteColor', label: 'Nota categoría' },
  { key: 'priceColor', label: 'Precio' },
  { key: 'priceOldColor', label: 'Precio tachado' },
  { key: 'descColor', label: 'Descripción' },
  { key: 'productTitleColor', label: 'Título producto' },
  { key: 'offerBadgeBg', label: 'Insignia oferta' },
  { key: 'offerBadgeText', label: 'Texto insignia oferta' },
  { key: 'timerBadgeBg', label: 'Insignia temporizador' },
  { key: 'timerBadgeText', label: 'Texto insignia temporizador' },
  { key: 'tagBg', label: 'Etiquetas fondo' },
  { key: 'tagText', label: 'Etiquetas texto' },
  { key: 'searchInputBg', label: 'Búsqueda fondo' },
  { key: 'searchInputBorder', label: 'Búsqueda borde' },
  { key: 'detailBg', label: 'Modal fondo' },
  { key: 'detailNameColor', label: 'Modal nombre' },
  { key: 'detailDescColor', label: 'Modal descripción' },
  { key: 'detailPriceColor', label: 'Modal precio' },
  { key: 'btnCartBg', label: 'Botón carrito' },
  { key: 'btnCartText', label: 'Texto carrito' },
  { key: 'btnWaBg', label: 'Botón WhatsApp' },
  { key: 'btnWaText', label: 'Texto WhatsApp' },
  { key: 'bannerBg', label: 'Banner fondo' },
  { key: 'bannerTextColor', label: 'Banner texto' },
]

const setThemeColor = (key: ThemeColorKey, value: string) => {
  draft.value[key] = value
}

type StoreColorKey =
  | 'storeBgColor'
  | 'storeCardBgColor'
  | 'storeCartBgColor'
  | 'storeTextPrimaryColor'
  | 'storeTextSecondaryColor'
  | 'storeCartTextColor'
  | 'storeToastFrom'
  | 'storeToastTo'

const storeColorFields: Array<{ key: StoreColorKey, label: string }> = [
  { key: 'storeBgColor', label: 'Fondo tienda' },
  { key: 'storeCardBgColor', label: 'Tarjetas tienda' },
  { key: 'storeCartBgColor', label: 'Fondo carrito' },
  { key: 'storeTextPrimaryColor', label: 'Texto principal' },
  { key: 'storeTextSecondaryColor', label: 'Texto secundario' },
  { key: 'storeCartTextColor', label: 'Texto carrito' },
  { key: 'storeToastFrom', label: 'Toast inicio' },
  { key: 'storeToastTo', label: 'Toast final' },
]

const setStoreColor = (key: StoreColorKey, value: string) => {
  settingsDraft.value[key] = value
}

// Paleta de 30 colores predefinidos con shades automáticos
const STORE_COLOR_PALETTE: Array<{ name: string; hex: string; shades: string[] }> = [
  { name: 'Azul Clásico', hex: '#3b82f6', shades: ['#eff6ff', '#dbeafe', '#3b82f6', '#2563eb', '#1d4ed8', '#1e3a8a'] },
  { name: 'Azul Marino', hex: '#1e40af', shades: ['#eff6ff', '#dbeafe', '#1e40af', '#1e3a8a', '#172554', '#0c1a40'] },
  { name: 'Cielo', hex: '#0ea5e9', shades: ['#f0f9ff', '#e0f2fe', '#0ea5e9', '#0284c7', '#0369a1', '#0c4a6e'] },
  { name: 'Violeta', hex: '#8b5cf6', shades: ['#faf5ff', '#ede9fe', '#8b5cf6', '#7c3aed', '#6d28d9', '#4c1d95'] },
  { name: 'Índigo', hex: '#6366f1', shades: ['#eef2ff', '#e0e7ff', '#6366f1', '#4f46e5', '#4338ca', '#312e81'] },
  { name: 'Fucsia', hex: '#d946ef', shades: ['#fdf4ff', '#fae8ff', '#d946ef', '#c026d3', '#a21caf', '#701a75'] },
  { name: 'Rosa', hex: '#ec4899', shades: ['#fdf2f8', '#fce7f3', '#ec4899', '#db2777', '#be185d', '#831843'] },
  { name: 'Rosa Caliente', hex: '#f43f5e', shades: ['#fff1f2', '#ffe4e6', '#f43f5e', '#e11d48', '#be123c', '#881337'] },
  { name: 'Rojo', hex: '#ef4444', shades: ['#fef2f2', '#fee2e2', '#ef4444', '#dc2626', '#b91c1c', '#7f1d1d'] },
  { name: 'Naranja Rojo', hex: '#f97316', shades: ['#fff7ed', '#ffedd5', '#f97316', '#ea580c', '#c2410c', '#7c2d12'] },
  { name: 'Naranja', hex: '#fb923c', shades: ['#fff7ed', '#ffedd5', '#fb923c', '#f97316', '#ea580c', '#9a3412'] },
  { name: 'Ámbar', hex: '#f59e0b', shades: ['#fffbeb', '#fef3c7', '#f59e0b', '#d97706', '#b45309', '#78350f'] },
  { name: 'Amarillo', hex: '#eab308', shades: ['#fefce8', '#fef9c3', '#eab308', '#ca8a04', '#a16207', '#713f12'] },
  { name: 'Lima', hex: '#84cc16', shades: ['#f7fee7', '#ecfccb', '#84cc16', '#65a30d', '#4d7c0f', '#365314'] },
  { name: 'Verde', hex: '#22c55e', shades: ['#f0fdf4', '#dcfce7', '#22c55e', '#16a34a', '#15803d', '#14532d'] },
  { name: 'Esmeralda', hex: '#10b981', shades: ['#ecfdf5', '#d1fae5', '#10b981', '#059669', '#047857', '#064e3b'] },
  { name: 'Verde Azulado', hex: '#14b8a6', shades: ['#f0fdfa', '#ccfbf1', '#14b8a6', '#0d9488', '#0f766e', '#134e4a'] },
  { name: 'Cian', hex: '#06b6d4', shades: ['#ecfeff', '#cffafe', '#06b6d4', '#0891b2', '#0e7490', '#164e63'] },
  { name: 'Pizarra', hex: '#475569', shades: ['#f8fafc', '#f1f5f9', '#475569', '#334155', '#1e293b', '#0f172a'] },
  { name: 'Grafito', hex: '#374151', shades: ['#f9fafb', '#f3f4f6', '#374151', '#1f2937', '#111827', '#030712'] },
  { name: 'Zinc', hex: '#71717a', shades: ['#fafafa', '#f4f4f5', '#71717a', '#52525b', '#3f3f46', '#18181b'] },
  { name: 'Cobre', hex: '#b45309', shades: ['#fffbeb', '#fef3c7', '#b45309', '#92400e', '#78350f', '#451a03'] },
  { name: 'Bronce', hex: '#a16207', shades: ['#fefce8', '#fef9c3', '#a16207', '#854d0e', '#713f12', '#422006'] },
  { name: 'Chocolate', hex: '#7c2d12', shades: ['#fff7ed', '#ffedd5', '#7c2d12', '#6c2407', '#5c1e04', '#3a0d00'] },
  { name: 'Magenta', hex: '#a21caf', shades: ['#fdf4ff', '#fae8ff', '#a21caf', '#86198f', '#701a75', '#4a044e'] },
  { name: 'Cereza', hex: '#be123c', shades: ['#fff1f2', '#ffe4e6', '#be123c', '#9f1239', '#881337', '#4c0519'] },
  { name: 'Petróleo', hex: '#0f766e', shades: ['#f0fdfa', '#ccfbf1', '#0f766e', '#0d6b63', '#115e59', '#042f2e'] },
  { name: 'Musgo', hex: '#4d7c0f', shades: ['#f7fee7', '#ecfccb', '#4d7c0f', '#3f6212', '#365314', '#1a2e05'] },
  { name: 'Marino Profundo', hex: '#1e3a8a', shades: ['#eff6ff', '#dbeafe', '#1e3a8a', '#172554', '#0c1a40', '#060d1e'] },
  { name: 'Coral', hex: '#fb7185', shades: ['#fff1f2', '#ffe4e6', '#fb7185', '#f43f5e', '#e11d48', '#881337'] },
]

const storeActivePalette = ref('#3b82f6')
const storeColorPalette = STORE_COLOR_PALETTE

function generateStoreShades(hex: string): string[] {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  h = Math.round(h * 360)
  s = Math.round(s * 100)
  const toHex = (hl: number, sl: number, ll: number) => {
    ll /= 100; sl /= 100
    const a = sl * Math.min(ll, 1 - ll)
    const f = (n: number) => {
      const k = (n + hl / 30) % 12
      const color = ll - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
      return Math.round(255 * color).toString(16).padStart(2, '0')
    }
    return `#${f(0)}${f(8)}${f(4)}`
  }
  return [
    toHex(h, s, 95),
    toHex(h, s, 88),
    hex,
    toHex(h, s, 45),
    toHex(h, s, 35),
    toHex(h, s, 20),
  ]
}

function applyStorePalette(swatch: { hex: string; shades: string[] }) {
  storeActivePalette.value = swatch.hex
  const [c50 = '#f8fafc', _c100 = '#dbeafe', c500 = swatch.hex, c600 = swatch.hex, c700 = '#334155', c900 = '#0f172a'] = swatch.shades
  settingsDraft.value.storeBgColor = c50
  settingsDraft.value.storeCardBgColor = '#ffffff'
  settingsDraft.value.storeCartBgColor = c900
  settingsDraft.value.storeTextPrimaryColor = c900
  settingsDraft.value.storeTextSecondaryColor = c700
  settingsDraft.value.storeCartTextColor = '#ffffff'
  settingsDraft.value.storeToastFrom = c500
  settingsDraft.value.storeToastTo = c600
}

function applyCustomStoreColor(hex: string) {
  storeActivePalette.value = hex
  const shades = generateStoreShades(hex)
  const [c50 = '#f8fafc', _c100 = '#dbeafe', c500 = hex, c600 = hex, c700 = '#334155', c900 = '#0f172a'] = shades
  settingsDraft.value.storeBgColor = c50
  settingsDraft.value.storeCardBgColor = '#ffffff'
  settingsDraft.value.storeCartBgColor = c900
  settingsDraft.value.storeTextPrimaryColor = c900
  settingsDraft.value.storeTextSecondaryColor = c700
  settingsDraft.value.storeCartTextColor = '#ffffff'
  settingsDraft.value.storeToastFrom = c500
  settingsDraft.value.storeToastTo = c600
}

const DEFAULT_STORE_COLORS: Record<StoreColorKey, string> = {
  storeBgColor: '#f8fafc',
  storeCardBgColor: '#ffffff',
  storeCartBgColor: '#0f172a',
  storeTextPrimaryColor: '#0f172a',
  storeTextSecondaryColor: '#64748b',
  storeCartTextColor: '#ffffff',
  storeToastFrom: '#3b82f6',
  storeToastTo: '#2563eb',
}

function resetStoreColors() {
  for (const key of Object.keys(DEFAULT_STORE_COLORS) as StoreColorKey[]) {
    settingsDraft.value[key] = DEFAULT_STORE_COLORS[key]
  }
  storeActivePalette.value = '#3b82f6'
}

watch(catalog, (value) => {
  if (!value) {
    return
  }

  draft.value = {
    ...defaultTheme(),
    ...JSON.parse(JSON.stringify(value.theme || {})),
  }
  layoutDraft.value = value.settings.storefrontLayout || 'classic'
  settingsDraft.value = {
    storeTopBarHtml: value.settings.storeTopBarHtml || '',
    storeHeaderName: value.settings.storeHeaderName || value.settings.businessName || '',
    storeShowPremiumBadge: value.settings.storeShowPremiumBadge ?? true,
    storeHeroTag: value.settings.storeHeroTag || '',
    storeHeroTitle: value.settings.storeHeroTitle || '',
    storeHeroDescription: value.settings.storeHeroDescription || '',
    storeHeroButtonText: value.settings.storeHeroButtonText || '',
    storeHeroBackgroundImage: value.settings.storeHeroBackgroundImage || '',
    storeFooterText: value.settings.storeFooterText || '',
    storeIcon: value.settings.storeIcon || 'shopping-bag',
    logoUrl: value.settings.logoUrl || '',
    appIconUrl: value.settings.appIconUrl || '',
    storeBgColor: value.settings.storeBgColor || '#f8fafc',
    storeCardBgColor: value.settings.storeCardBgColor || '#ffffff',
    storeCartBgColor: value.settings.storeCartBgColor || '#0f172a',
    storeTextPrimaryColor: value.settings.storeTextPrimaryColor || '#0f172a',
    storeTextSecondaryColor: value.settings.storeTextSecondaryColor || '#64748b',
    storeCartTextColor: value.settings.storeCartTextColor || '#ffffff',
    storeToastFrom: value.settings.storeToastFrom || '#3b82f6',
    storeToastTo: value.settings.storeToastTo || '#2563eb',
  }
}, { immediate: true })

const save = async () => {
  if (!catalog.value) {
    return
  }

  saving.value = true
  saveError.value = ''

  try {
    await catalogStore.updateSettings({
      storefrontLayout: layoutDraft.value,
      ...JSON.parse(JSON.stringify(settingsDraft.value)),
    })

    if (!isPaywalled.value) {
      await catalogStore.updateTheme(draft.value)
    }
  } catch (error) {
    saveError.value = error instanceof Error ? error.message : 'No se pudo guardar la apariencia.'
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.theme-color-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 0.75rem;
  margin-top: 0.5rem;
  margin-bottom: 1.5rem;
}

.theme-swatch {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.7rem 0.85rem;
  border-radius: 16px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.95), rgba(248, 250, 252, 0.85));
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.theme-swatch:hover {
  border-color: rgba(59, 130, 246, 0.5);
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(15, 23, 42, 0.08);
}

.theme-swatch-chip {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  border: 2px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12), inset 0 0 0 1px rgba(15, 23, 42, 0.08);
}

.theme-swatch-body {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
  flex: 1;
}

.theme-swatch-label {
  font-size: 0.78rem;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.theme-swatch-hex {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.7rem;
  font-weight: 600;
  color: #64748b;
  letter-spacing: 0.02em;
}

.theme-swatch-input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  border: 0;
  padding: 0;
}

.dark .theme-swatch {
  border-color: rgba(100, 116, 139, 0.35);
  background: linear-gradient(160deg, rgba(15, 23, 42, 0.8), rgba(30, 41, 59, 0.7));
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.dark .theme-swatch:hover {
  border-color: rgba(59, 130, 246, 0.6);
  background: linear-gradient(160deg, rgba(30, 41, 59, 0.95), rgba(51, 65, 85, 0.85));
}

.dark .theme-swatch-chip {
  border-color: rgba(15, 23, 42, 0.8);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4), inset 0 0 0 1px rgba(148, 163, 184, 0.2);
}

.dark .theme-swatch-label {
  color: #f1f5f9;
}

.dark .theme-swatch-hex {
  color: #94a3b8;
}
</style>
