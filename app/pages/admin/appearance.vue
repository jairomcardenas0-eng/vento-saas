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
                  :style="{ backgroundColor: draft[field.key] }"
                />
                <span class="theme-swatch-body">
                  <span class="theme-swatch-label">{{ field.label }}</span>
                  <span class="theme-swatch-hex">{{ String(draft[field.key]).toUpperCase() }}</span>
                </span>
                <input
                  v-model="draft[field.key]"
                  type="color"
                  class="theme-swatch-input"
                />
              </label>
            </div>

            <div class="grid-form">
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
  </div>
</template>

<script setup lang="ts">
import AdminStatePanel from '~/components/admin/AdminStatePanel.vue'
import { defaultTheme } from '~/data/defaults'
import type { CatalogOperationalSettings, CatalogThemeSettings } from '~/types/catalog'

definePageMeta({ layout: 'admin' })

const catalogStore = useCatalogStore()
const previewStore = usePreviewStore()
const catalog = computed(() => catalogStore.activeCatalog)
const isPaywalled = computed(() => false)
const draft = ref<CatalogThemeSettings>(defaultTheme())
const layoutDraft = ref<CatalogOperationalSettings['storefrontLayout']>('classic')
const saving = ref(false)
const saveError = ref('')

watch([draft, layoutDraft], ([themeValue, layoutValue]) => {
  previewStore.setTheme(JSON.parse(JSON.stringify(themeValue)) as Partial<CatalogThemeSettings>)
  previewStore.setSettings({ storefrontLayout: layoutValue })
}, { deep: true })

onUnmounted(() => {
  previewStore.setTheme(null)
  previewStore.setSettings(null)
})

const layoutOptions: Array<{ value: CatalogOperationalSettings['storefrontLayout'], label: string, description: string }> = [
  { value: 'classic', label: 'Clásico', description: 'Diseño tradicional con categorías en la parte superior, productos en cuadrícula de dos columnas y botón del carrito fijo abajo. Ideal para negocios con fotos de productos grandes.' },
  { value: 'list', label: 'Lista veloz', description: 'Lista compacta de productos uno debajo del otro. Muestra más productos por pantalla y permite un desplazamiento más rápido. Perfecto para menús largos con muchos productos.' },
  { value: 'saas', label: 'SaaS Pro', description: 'Diseño moderno con gradientes, tarjetas con sombras y animaciones premium. Ideal para negocios que quieren una imagen más profesional y elegante.' },
]

const themeFields: Array<{ key: keyof CatalogThemeSettings, label: string }> = [
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

watch(catalog, (value) => {
  if (!value) {
    return
  }

  draft.value = JSON.parse(JSON.stringify(value.theme))
  layoutDraft.value = value.settings.storefrontLayout || 'classic'
}, { immediate: true })

const save = async () => {
  if (!catalog.value) {
    return
  }

  saving.value = true
  saveError.value = ''

  try {
    await catalogStore.updateStorefrontLayout(layoutDraft.value)

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
