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

          <section v-if="showClosureSettings" class="px-2 py-3">
            <div class="mb-4">
              <p class="eyebrow">Cierre del negocio</p>
              <h3 class="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Control de cierre y pantalla informativa</h3>
              <p class="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
                Si activas el cierre forzado, tu tienda quedará cerrada y se mostrará el mensaje de cierre a tus clientes.
              </p>
            </div>
            <div class="grid-form">
              <div class="toggle-row">
                <label class="toggle-3d"><input v-model="draft.closed" type="checkbox" class="toggle-checkbox" /><span class="slider-3d"></span></label>
                <div>
                  <p class="toggle-row-label text-[14px] font-semibold text-zinc-800 dark:text-zinc-200">Forzar cierre total</p>
                  <p class="text-xs text-zinc-500 dark:text-zinc-400">Actívalo para cerrar inmediatamente el menú digital.</p>
                </div>
              </div>

              <label class="full mt-2">
                <span>Mensaje de cierre</span>
                <textarea v-model="draft.closedMessage" rows="3" />
                <small>Texto principal cuando el negocio no está disponible.</small>
              </label>

              <div class="toggle-row">
                <label class="toggle-3d"><input v-model="draft.closedShowMenuBtn" type="checkbox" class="toggle-checkbox" /><span class="slider-3d"></span></label>
                <span class="toggle-row-label text-[14px] font-semibold text-zinc-800 dark:text-zinc-200">Mostrar botón "Ver menú"</span>
              </div>
              <div class="toggle-row">
                <label class="toggle-3d"><input v-model="draft.closedShowWhatsapp" type="checkbox" class="toggle-checkbox" /><span class="slider-3d"></span></label>
                <span class="toggle-row-label text-[14px] font-semibold text-zinc-800 dark:text-zinc-200">Mostrar botón de WhatsApp</span>
              </div>
              <div class="toggle-row">
                <label class="toggle-3d"><input v-model="draft.closedShowCall" type="checkbox" class="toggle-checkbox" /><span class="slider-3d"></span></label>
                <span class="toggle-row-label text-[14px] font-semibold text-zinc-800 dark:text-zinc-200">Mostrar botón de llamada</span>
              </div>
              <div class="toggle-row">
                <label class="toggle-3d"><input v-model="draft.closedTextBox" type="checkbox" class="toggle-checkbox" /><span class="slider-3d"></span></label>
                <span class="toggle-row-label text-[14px] font-semibold text-zinc-800 dark:text-zinc-200">Usar caja de texto</span>
              </div>

              <div class="theme-color-grid full">
                <label class="theme-swatch">
                  <span class="theme-swatch-chip" :style="{ backgroundColor: draft.closedTextColor }" />
                  <span class="theme-swatch-body">
                    <span class="theme-swatch-label">Color del texto</span>
                    <span class="theme-swatch-hex">{{ String(draft.closedTextColor).toUpperCase() }}</span>
                  </span>
                  <input v-model="draft.closedTextColor" type="color" class="theme-swatch-input" />
                </label>
                <label class="theme-swatch">
                  <span class="theme-swatch-chip" :style="{ backgroundColor: draft.closedMenuBtnBg }" />
                  <span class="theme-swatch-body">
                    <span class="theme-swatch-label">Fondo botón menú</span>
                    <span class="theme-swatch-hex">{{ String(draft.closedMenuBtnBg).toUpperCase() }}</span>
                  </span>
                  <input v-model="draft.closedMenuBtnBg" type="color" class="theme-swatch-input" />
                </label>
                <label class="theme-swatch">
                  <span class="theme-swatch-chip" :style="{ backgroundColor: draft.closedMenuBtnText }" />
                  <span class="theme-swatch-body">
                    <span class="theme-swatch-label">Texto botón menú</span>
                    <span class="theme-swatch-hex">{{ String(draft.closedMenuBtnText).toUpperCase() }}</span>
                  </span>
                  <input v-model="draft.closedMenuBtnText" type="color" class="theme-swatch-input" />
                </label>
                <label class="theme-swatch">
                  <span class="theme-swatch-chip" :style="{ backgroundColor: draft.closedTextBoxColor }" />
                  <span class="theme-swatch-body">
                    <span class="theme-swatch-label">Fondo cajón texto</span>
                    <span class="theme-swatch-hex">{{ String(draft.closedTextBoxColor).toUpperCase() }}</span>
                  </span>
                  <input v-model="draft.closedTextBoxColor" type="color" class="theme-swatch-input" />
                </label>
              </div>

              <label class="flex flex-col justify-center">
                <div class="mb-3 flex items-center justify-between">
                  <span>Opacidad de la caja</span>
                  <span class="rounded-[10px] bg-blue-50 px-2 py-1 text-xs font-bold text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">{{ draft.closedTextBoxOpacity }}%</span>
                </div>
                <input v-model.number="draft.closedTextBoxOpacity" type="range" min="0" max="100" step="1" class="w-full cursor-pointer accent-blue-600 dark:accent-blue-500" />
              </label>
              <label><span>Tamaño del texto principal</span><input v-model.number="draft.closedTextSizeLarge" type="number" min="12" step="1" /></label>
            </div>
          </section>

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
const showClosureSettings = computed(() => draft.value.closed || draft.value.scheduleMode === 'weekly')

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

<style scoped>
.toggle-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-height: 32px;
}

.toggle-row-label {
  margin: 0;
  line-height: 1.2;
}

.grid-form .toggle-3d {
  display: inline-flex !important;
  margin-top: 0 !important;
  flex: 0 0 auto;
}

.toggle-3d {
  position: relative;
  display: inline-flex;
  align-items: center;
  width: 48px;
  height: 28px;
}

.toggle-checkbox {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
  margin: 0;
}

.slider-3d {
  position: relative;
  width: 48px;
  height: 28px;
  border-radius: 999px;
  background: linear-gradient(180deg, #e4e4e7 0%, #d4d4d8 100%);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.12);
  transition: background-color 0.2s ease, background 0.2s ease;
}

.slider-3d::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 22px;
  height: 22px;
  border-radius: 999px;
  background: #ffffff;
  box-shadow: 0 4px 10px rgba(15, 23, 42, 0.2);
  transition: transform 0.2s ease;
}

.toggle-checkbox:checked + .slider-3d {
  background: linear-gradient(180deg, #22c55e 0%, #16a34a 100%);
}

.toggle-checkbox:checked + .slider-3d::after {
  transform: translateX(20px);
}

.toggle-checkbox:focus-visible + .slider-3d {
  outline: 2px solid #22c55e;
  outline-offset: 2px;
}

.dark .slider-3d {
  background: linear-gradient(180deg, #3f3f46 0%, #27272a 100%);
}

.dark .toggle-checkbox:checked + .slider-3d {
  background: linear-gradient(180deg, #22d3ee 0%, #0891b2 100%);
}

.theme-color-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 0.75rem;
  margin-top: 1rem;
  margin-bottom: 0.5rem;
}

.theme-swatch {
  position: relative;
  display: flex !important;
  align-items: center;
  gap: 0.75rem;
  padding: 0.7rem 0.85rem !important;
  border-radius: 16px;
  border: 1px solid rgba(148, 163, 184, 0.25) !important;
  background: linear-gradient(160deg, rgba(255, 255, 255, 0.95), rgba(248, 250, 252, 0.85)) !important;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  margin-top: 0 !important;
}

.theme-swatch:hover {
  border-color: rgba(59, 130, 246, 0.5) !important;
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
  width: 100% !important;
  height: 100% !important;
  opacity: 0;
  cursor: pointer;
  border: 0 !important;
  padding: 0 !important;
  margin: 0 !important;
}

.dark .theme-swatch {
  border-color: rgba(100, 116, 139, 0.35) !important;
  background: linear-gradient(160deg, rgba(15, 23, 42, 0.8), rgba(30, 41, 59, 0.7)) !important;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

.dark .theme-swatch:hover {
  border-color: rgba(59, 130, 246, 0.6) !important;
  background: linear-gradient(160deg, rgba(30, 41, 59, 0.95), rgba(51, 65, 85, 0.85)) !important;
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
