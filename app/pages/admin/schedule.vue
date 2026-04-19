<template>
  <div v-if="catalog" class="admin-grid">
    <section class="panel-card span-2">
      <UiSectionHeader eyebrow="Operación" title="Horarios" description="Configura los días y horarios de atención de tu negocio.">
        <template #actions>
          <button class="solid-btn" :disabled="saving" @click="save">
            {{ saving ? 'Guardando...' : 'Guardar horarios' }}
          </button>
        </template>
      </UiSectionHeader>

      <fieldset class="contents">
        <div class="space-y-6">
          <div class="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between px-2">
            <p class="text-sm text-zinc-500 dark:text-zinc-400">{{ scheduleStatusLabel }}</p>
            <div class="grid gap-3 sm:grid-cols-2">
              <label class="toggle"><input v-model="scheduleAlwaysOpen" type="radio" name="schedule-mode" :value="true" /><span>Modo 24/7</span></label>
              <label class="toggle"><input v-model="scheduleAlwaysOpen" type="radio" name="schedule-mode" :value="false" /><span>Rango por días</span></label>
            </div>
          </div>

          <div v-if="draft.scheduleMode === 'weekly'" class="space-y-4">
            <article v-for="(day, dayIndex) in draft.weeklySchedule" :key="day.dayKey" class="rounded-[28px] border border-zinc-200 bg-zinc-50/50 p-3 sm:p-5 dark:border-zinc-800/50 dark:bg-zinc-900/40">
              <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div class="flex flex-wrap items-center gap-3">
                  <label class="toggle !m-0">
                    <input v-model="day.enabled" type="checkbox" />
                    <span class="text-base font-bold">{{ day.label }}</span>
                  </label>
                  <span class="rounded-full bg-zinc-200/50 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                    {{ day.enabled ? 'Abierto' : 'Cerrado' }}
                  </span>
                </div>
                <button class="ghost-btn small !min-h-[34px] !rounded-full !px-3 !text-xs" type="button" @click="addScheduleRange(dayIndex)">
                  + Añadir horario
                </button>
              </div>

              <div v-if="day.enabled" class="space-y-3 pl-2">
                <div v-for="(range, rangeIndex) in day.ranges" :key="`${day.dayKey}-${rangeIndex}`" class="flex flex-wrap items-end gap-4 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-950 dark:ring-zinc-800">
                  <div class="flex-1 space-y-1.5">
                    <span class="block text-[10px] font-bold uppercase tracking-widest text-zinc-400">Apertura</span>
                    <input v-model="range.start" type="time" class="w-full bg-transparent text-lg font-medium outline-none dark:text-zinc-100" />
                  </div>
                  <div class="flex flex-1 items-center gap-3">
                    <div class="h-8 w-px bg-zinc-200 dark:bg-zinc-800"></div>
                    <div class="flex-1 space-y-1.5">
                      <span class="block text-[10px] font-bold uppercase tracking-widest text-zinc-400">Cierre</span>
                      <input v-model="range.end" type="time" class="w-full bg-transparent text-lg font-medium outline-none dark:text-zinc-100" />
                    </div>
                  </div>
                  <button v-if="day.ranges.length > 1" class="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-rose-50 text-rose-600 transition hover:bg-rose-100 dark:bg-rose-950/30 dark:text-rose-400" type="button" @click="removeScheduleRange(dayIndex, rangeIndex)">
                    <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>

              <div v-else class="pl-2 pt-2 text-sm text-zinc-400 italic">
                No se aceptarán pedidos este día.
              </div>
            </article>
          </div>
        </div>
      </fieldset>

      <p v-if="saveError" class="mt-4 text-sm text-rose-500">{{ saveError }}</p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { defaultSettings } from '~/data/defaults'
import type { BusinessDaySchedule, CatalogOperationalSettings } from '~/types/catalog'
import { getCurrentScheduleState } from '~/utils/catalog'

definePageMeta({ layout: 'admin' })

const catalogStore = useCatalogStore()
const catalog = computed(() => catalogStore.activeCatalog)
const draft = ref<CatalogOperationalSettings>(defaultSettings())
const saving = ref(false)
const saveError = ref('')

const scheduleAlwaysOpen = computed({
  get: () => draft.value.scheduleMode === 'always',
  set: (value: boolean) => { draft.value.scheduleMode = value ? 'always' : 'weekly' },
})

const scheduleStatusLabel = computed(() => getCurrentScheduleState(draft.value).label)

watch(catalog, (value) => {
  if (!value) return
  draft.value = {
    ...defaultSettings(value.settings.businessName, value.slug),
    ...JSON.parse(JSON.stringify(value.settings)),
  }
}, { immediate: true })

const addScheduleRange = (dayIndex: number) => {
  draft.value.weeklySchedule[dayIndex]?.ranges.push({ start: '18:00', end: '22:00' })
}

const removeScheduleRange = (dayIndex: number, rangeIndex: number) => {
  const day = draft.value.weeklySchedule[dayIndex]
  if (!day || day.ranges.length <= 1) return
  day.ranges.splice(rangeIndex, 1)
}

const sanitizeSchedule = () => draft.value.weeklySchedule.map(day => ({
  ...day,
  ranges: day.ranges
    .filter(range => range.start && range.end)
    .map(range => ({ start: range.start, end: range.end })),
}))

const save = async () => {
  saving.value = true
  saveError.value = ''
  try {
    await catalogStore.updateSettings({
      ...draft.value,
      weeklySchedule: sanitizeSchedule(),
    })
  } catch (error) {
    saveError.value = error instanceof Error ? error.message : 'No se pudieron guardar los horarios.'
  } finally {
    saving.value = false
  }
}
</script>
