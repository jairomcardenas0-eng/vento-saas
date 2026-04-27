<template>
  <section class="mx-auto max-w-5xl px-4 py-8 sm:px-6">
    <div class="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <article class="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <p class="text-sm font-semibold uppercase tracking-[0.22em] text-blue-600">Onboarding</p>
        <h1 class="mt-3 text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">Configura tu catalogo paso a paso</h1>
        <p class="mt-3 text-sm text-slate-600 dark:text-slate-400">
          Este asistente guarda tu progreso localmente para que puedas terminar despues sin perder el avance.
        </p>

        <div class="mt-8 flex flex-wrap gap-2">
          <button
            v-for="(stepLabel, index) in steps"
            :key="stepLabel"
            type="button"
            class="rounded-full px-4 py-2 text-sm font-medium transition"
            :class="currentStep === index + 1
              ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
              : completedSteps.has(index + 1)
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                : 'bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400'"
            @click="currentStep = index + 1"
          >
            {{ index + 1 }}. {{ stepLabel }}
          </button>
        </div>

        <div class="mt-8 space-y-6">
          <div v-if="currentStep === 1" class="space-y-4">
            <h2 class="text-xl font-semibold text-slate-950 dark:text-slate-100">Selecciona tu tipo de negocio</h2>
            <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <button
                v-for="option in businessTypes"
                :key="option.value"
                type="button"
                class="rounded-[20px] border px-4 py-4 text-left transition"
                :class="draft.businessType === option.value
                  ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-500/10'
                  : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700'"
                @click="draft.businessType = option.value"
              >
                <p class="font-semibold text-slate-900 dark:text-slate-100">{{ option.label }}</p>
                <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ option.description }}</p>
              </button>
            </div>
          </div>

          <div v-else-if="currentStep === 2" class="grid gap-4 md:grid-cols-2">
            <label class="space-y-2">
              <span class="text-sm font-medium text-slate-700 dark:text-slate-300">Nombre del negocio</span>
              <input v-model="draft.businessName" class="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900" />
            </label>
            <label class="space-y-2">
              <span class="text-sm font-medium text-slate-700 dark:text-slate-300">WhatsApp</span>
              <input v-model="draft.whatsapp" class="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900" />
            </label>
            <label class="space-y-2 md:col-span-2">
              <span class="text-sm font-medium text-slate-700 dark:text-slate-300">Slug publico</span>
              <input v-model="draft.slug" class="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900" />
              <p class="text-xs" :class="slugStateClass">{{ slugStateMessage }}</p>
            </label>
          </div>

          <div v-else-if="currentStep === 3" class="space-y-4">
            <h2 class="text-xl font-semibold text-slate-950 dark:text-slate-100">Categorias sugeridas</h2>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="category in suggestedCategories"
                :key="category"
                type="button"
                class="rounded-full border px-3 py-2 text-sm transition"
                :class="selectedCategories.has(category)
                  ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-500/10 dark:text-blue-300'
                  : 'border-slate-200 text-slate-600 dark:border-slate-800 dark:text-slate-300'"
                @click="toggleCategory(category)"
              >
                {{ category }}
              </button>
            </div>
          </div>

          <div v-else class="space-y-4">
            <h2 class="text-xl font-semibold text-slate-950 dark:text-slate-100">Checklist de publicacion</h2>
            <div class="space-y-3">
              <div v-for="item in checklist" :key="item.label" class="flex items-start gap-3 rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-800">
                <span class="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold" :class="item.done ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'">
                  {{ item.done ? 'OK' : '!' }}
                </span>
                <div>
                  <p class="font-medium text-slate-900 dark:text-slate-100">{{ item.label }}</p>
                  <p class="text-sm text-slate-500 dark:text-slate-400">{{ item.description }}</p>
                </div>
              </div>
            </div>
            <p class="rounded-2xl border px-4 py-3 text-sm" :class="canPublish ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300' : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300'">
              {{ canPublish ? 'Checklist completo. Ya puedes publicar tu catalogo.' : 'La publicacion queda bloqueada hasta completar todos los puntos.' }}
            </p>
          </div>
        </div>

        <div class="mt-8 flex items-center justify-between gap-3">
          <button type="button" class="rounded-full border border-slate-200 px-4 py-2 text-sm dark:border-slate-800" :disabled="currentStep === 1" @click="currentStep -= 1">Anterior</button>
          <button type="button" class="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-slate-100 dark:text-slate-900" :disabled="currentStep === 4 && !canPublish" @click="handleNext">
            {{ currentStep === 4 ? 'Finalizar' : 'Siguiente' }}
          </button>
        </div>
      </article>

      <aside class="rounded-[32px] border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900/60">
        <h2 class="text-lg font-semibold text-slate-950 dark:text-slate-100">Resumen actual</h2>
        <dl class="mt-5 space-y-4 text-sm">
          <div>
            <dt class="text-slate-500 dark:text-slate-400">Tipo</dt>
            <dd class="font-medium text-slate-900 dark:text-slate-100">{{ selectedBusinessTypeLabel }}</dd>
          </div>
          <div>
            <dt class="text-slate-500 dark:text-slate-400">Nombre</dt>
            <dd class="font-medium text-slate-900 dark:text-slate-100">{{ draft.businessName || 'Pendiente' }}</dd>
          </div>
          <div>
            <dt class="text-slate-500 dark:text-slate-400">Slug</dt>
            <dd class="font-medium text-slate-900 dark:text-slate-100">/b/{{ normalizedSlug || 'pendiente' }}</dd>
          </div>
          <div>
            <dt class="text-slate-500 dark:text-slate-400">Categorias</dt>
            <dd class="font-medium text-slate-900 dark:text-slate-100">{{ Array.from(selectedCategories).join(', ') || 'Sin seleccionar' }}</dd>
          </div>
        </dl>
      </aside>
    </div>
  </section>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin' })

type BusinessType = 'restaurante' | 'tienda' | 'ferreteria' | 'ropa' | 'farmacia' | 'servicios' | 'belleza' | 'tecnologia'

const steps = ['Tipo', 'Datos', 'Categorias', 'Checklist']
const businessTypes: Array<{ value: BusinessType, label: string, description: string }> = [
  { value: 'restaurante', label: 'Restaurante', description: 'Menus, combos y horarios' },
  { value: 'tienda', label: 'Tienda', description: 'Catalogo general y promos' },
  { value: 'ferreteria', label: 'Ferreteria', description: 'Inventario y entregas' },
  { value: 'ropa', label: 'Ropa', description: 'Variantes y colecciones' },
  { value: 'farmacia', label: 'Farmacia', description: 'Rapidez y confianza' },
  { value: 'servicios', label: 'Servicios', description: 'Reservas y contacto' },
  { value: 'belleza', label: 'Belleza', description: 'Turnos y paquetes' },
  { value: 'tecnologia', label: 'Tecnologia', description: 'Accesorios y soporte' },
]

const slugify = (value: string) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const categorySuggestions: Record<BusinessType, string[]> = {
  restaurante: ['Entradas', 'Platos fuertes', 'Bebidas', 'Postres'],
  tienda: ['Destacados', 'Nuevos', 'Promociones', 'Accesorios'],
  ferreteria: ['Herramientas', 'Electricidad', 'Plomeria', 'Pintura'],
  ropa: ['Novedades', 'Mujer', 'Hombre', 'Accesorios'],
  farmacia: ['Vitaminas', 'Higiene', 'Dermocosmetica', 'Bebes'],
  servicios: ['Paquetes', 'Mantenimiento', 'Consultoria', 'Urgencias'],
  belleza: ['Cabello', 'Piel', 'Maquillaje', 'Promociones'],
  tecnologia: ['Celulares', 'Laptops', 'Accesorios', 'Gaming'],
}

const storageKey = 'vento:onboarding:draft'
const currentStep = ref(1)
const completedSteps = ref(new Set<number>())
const draft = ref({
  businessType: 'tienda' as BusinessType,
  businessName: '',
  slug: '',
  whatsapp: '',
})
const slugState = ref<'idle' | 'checking' | 'available' | 'taken'>('idle')
const selectedCategories = ref(new Set<string>())
let slugTimer: ReturnType<typeof setTimeout> | null = null

const normalizedSlug = computed(() => slugify(draft.value.slug))
const selectedBusinessTypeLabel = computed(() =>
  businessTypes.find(option => option.value === draft.value.businessType)?.label || 'Sin seleccionar',
)
const suggestedCategories = computed(() => categorySuggestions[draft.value.businessType] || [])
const slugStateMessage = computed(() => {
  if (slugState.value === 'checking') return 'Verificando disponibilidad...'
  if (slugState.value === 'available') return 'Slug disponible'
  if (slugState.value === 'taken') return 'Ese slug ya esta en uso'
  return 'La disponibilidad se valida en tiempo real'
})
const slugStateClass = computed(() => ({
  'text-slate-500 dark:text-slate-400': slugState.value === 'idle' || slugState.value === 'checking',
  'text-emerald-600 dark:text-emerald-300': slugState.value === 'available',
  'text-rose-600 dark:text-rose-300': slugState.value === 'taken',
}))
const checklist = computed(() => [
  { label: 'Logo subido', description: 'Sube un logo cuadrado desde Apariencia.', done: false },
  { label: 'Minimo 3 productos', description: 'Agrega al menos tres productos para publicar.', done: false },
  { label: 'Horarios configurados', description: 'Define dias y horas de apertura.', done: false },
])
const canPublish = computed(() => checklist.value.every(item => item.done))

const persistDraft = () => {
  if (!import.meta.client) {
    return
  }

  localStorage.setItem(storageKey, JSON.stringify({
    currentStep: currentStep.value,
    completedSteps: Array.from(completedSteps.value),
    draft: draft.value,
    selectedCategories: Array.from(selectedCategories.value),
  }))
}

const loadDraft = () => {
  if (!import.meta.client) {
    return
  }

  const raw = localStorage.getItem(storageKey)
  if (!raw) {
    return
  }

  try {
    const parsed = JSON.parse(raw) as {
      currentStep?: number
      completedSteps?: number[]
      draft?: Partial<typeof draft.value>
      selectedCategories?: string[]
    }
    currentStep.value = parsed.currentStep || 1
    completedSteps.value = new Set(parsed.completedSteps || [])
    draft.value = { ...draft.value, ...(parsed.draft || {}) }
    selectedCategories.value = new Set(parsed.selectedCategories || [])
  } catch {
    localStorage.removeItem(storageKey)
  }
}

const toggleCategory = (category: string) => {
  if (selectedCategories.value.has(category)) {
    selectedCategories.value.delete(category)
  } else {
    selectedCategories.value.add(category)
  }
}

const handleNext = () => {
  completedSteps.value.add(currentStep.value)
  if (currentStep.value < 4) {
    currentStep.value += 1
    return
  }

  persistDraft()
}

watch([draft, currentStep, selectedCategories], persistDraft, { deep: true })

watch(normalizedSlug, (value) => {
  slugState.value = value ? 'checking' : 'idle'
  if (slugTimer) {
    clearTimeout(slugTimer)
  }
  if (!value) {
    return
  }

  slugTimer = setTimeout(async () => {
    try {
      const response = await $fetch<{ available?: boolean }>('/api/check-slug', {
        method: 'POST',
        body: { slug: value },
      })
      slugState.value = response.available ? 'available' : 'taken'
    } catch {
      slugState.value = 'idle'
    }
  }, 350)
}, { immediate: true })

onMounted(loadDraft)
</script>
