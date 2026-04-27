<template>
  <section class="space-y-6">
    <header class="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <p class="text-sm font-semibold uppercase tracking-[0.2em] text-rose-600">Moderacion</p>
      <h1 class="mt-3 text-3xl font-semibold tracking-tight text-slate-950 dark:text-slate-50">Control operativo de catalogos</h1>
      <p class="mt-2 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
        Supervisa catálogos, detecta actividad sospechosa y deja lista una bandeja para incidencias operativas.
      </p>
    </header>

    <div class="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <article class="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
        <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="text-lg font-semibold text-slate-950 dark:text-slate-100">Catalogos</h2>
            <p class="text-sm text-slate-500 dark:text-slate-400">Filtra por estado para revisar rapidamente.</p>
          </div>
          <select v-model="statusFilter" class="rounded-2xl border border-slate-200 px-4 py-2 text-sm dark:border-slate-800 dark:bg-slate-900">
            <option value="all">Todos</option>
            <option value="published">Activos</option>
            <option value="draft">Draft</option>
            <option value="suspended">Suspendidos</option>
          </select>
        </div>

        <div class="space-y-3">
          <div v-for="catalog in filteredCatalogs" :key="catalog.id" class="rounded-2xl border border-slate-200 px-4 py-4 dark:border-slate-800">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p class="font-medium text-slate-900 dark:text-slate-100">{{ catalog.settings.businessName || catalog.slug }}</p>
                <p class="text-sm text-slate-500 dark:text-slate-400">/b/{{ catalog.slug }}</p>
              </div>
              <div class="flex items-center gap-2">
                <span class="rounded-full px-3 py-1 text-xs font-semibold" :class="statusPill(catalog.status)">
                  {{ catalog.status }}
                </span>
                <button class="rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-600 dark:border-rose-500/20 dark:text-rose-300" @click="suspendDraft = catalog.id">
                  Suspender
                </button>
              </div>
            </div>
          </div>
        </div>
      </article>

      <aside class="space-y-6">
        <article class="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <h2 class="text-lg font-semibold text-slate-950 dark:text-slate-100">Panel de fraude</h2>
          <ul class="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-400">
            <li class="rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-800">Pedidos desde misma IP en ventana corta</li>
            <li class="rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-800">Reseñas con contenido repetido</li>
            <li class="rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-800">Picos de cancelaciones por catalogo</li>
          </ul>
        </article>

        <article class="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <h2 class="text-lg font-semibold text-slate-950 dark:text-slate-100">Incidencias</h2>
          <div class="mt-4 space-y-3">
            <div v-for="incident in incidents" :key="incident.title" class="rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-800">
              <div class="flex items-center justify-between gap-3">
                <p class="font-medium text-slate-900 dark:text-slate-100">{{ incident.title }}</p>
                <span class="rounded-full px-3 py-1 text-[11px] font-semibold" :class="incident.priority === 'alta' ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'">
                  {{ incident.priority }}
                </span>
              </div>
              <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">{{ incident.status }} · {{ incident.assignedTo }}</p>
            </div>
          </div>
        </article>
      </aside>
    </div>
  </section>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin' })

const catalogStore = useCatalogStore()
const statusFilter = ref<'all' | 'published' | 'draft' | 'suspended'>('all')
const suspendDraft = ref<string | null>(null)

const incidents = [
  { title: 'Reseñas duplicadas detectadas', priority: 'alta', status: 'abierta', assignedTo: 'Moderacion' },
  { title: 'Pico de cancelaciones', priority: 'media', status: 'en revision', assignedTo: 'Operaciones' },
]

const filteredCatalogs = computed(() => {
  const catalogs = catalogStore.ownerCatalogs
  if (statusFilter.value === 'all') {
    return catalogs
  }

  if (statusFilter.value === 'suspended') {
    return catalogs.filter(catalog => catalog.isBanned)
  }

  return catalogs.filter(catalog => catalog.status === statusFilter.value)
})

const statusPill = (status: string) => {
  if (status === 'draft') {
    return 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
  }

  return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
}
</script>
