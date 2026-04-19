<template>
  <section v-if="catalog" class="panel-card span-2 !p-0 overflow-hidden">
    <div class="border-b border-zinc-100 p-6 dark:border-zinc-800">
      <UiSectionHeader eyebrow="Distribución" title="Tu catálogo al mundo" description="Copia tu link, descarga tu QR y personaliza cómo te ves en redes sociales." />
    </div>

    <div class="grid gap-0 lg:grid-cols-[1fr_360px]">
      <div class="space-y-8 p-6 lg:border-r lg:border-zinc-100 lg:dark:border-zinc-800">
        <div class="space-y-4">
          <h4 class="text-sm font-bold uppercase tracking-widest text-zinc-400">Acceso Público</h4>

          <div class="space-y-6">
            <div class="flex flex-col gap-2">
              <span class="text-sm font-semibold text-zinc-600 dark:text-zinc-400">URL del catálogo</span>
              <div class="flex min-w-0 items-center gap-2 overflow-hidden rounded-2xl bg-zinc-100 p-2 pl-4 dark:bg-zinc-900">
                <span class="min-w-0 flex-1 truncate text-sm font-medium text-zinc-900 dark:text-zinc-100">{{ publicUrl }}</span>
                <button @click="copyToClipboard(publicUrl)" class="solid-btn small !min-h-[38px] !shrink-0 !rounded-xl">
                  Copiar
                </button>
              </div>
            </div>

            <div class="grid gap-6 sm:grid-cols-2">
              <div class="flex flex-col gap-2">
                <span class="text-sm font-semibold text-zinc-600 dark:text-zinc-400">Identificador (Slug)</span>
                <div class="break-all rounded-2xl border border-zinc-200 bg-white px-4 py-3 font-mono text-xs dark:border-zinc-800 dark:bg-zinc-950">
                  {{ catalog.slug }}
                </div>
              </div>
              <div class="flex flex-col gap-2">
                <span class="text-sm font-semibold text-zinc-600 dark:text-zinc-400">Estado de Salida</span>
                <div class="flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-700 dark:border-emerald-900/30 dark:bg-emerald-950/30 dark:text-emerald-400">
                  <span class="h-2 w-2 animate-pulse rounded-full bg-emerald-500"></span>
                  Link Operativo
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="space-y-4 pt-4">
          <h4 class="text-sm font-bold uppercase tracking-widest text-zinc-400">Presencia en Redes (SEO)</h4>
          <div class="rounded-3xl border border-zinc-200 bg-zinc-50/50 p-5 dark:border-zinc-800 dark:bg-zinc-900/50">
            <div class="mb-4">
              <span class="text-[11px] font-bold uppercase tracking-wider text-blue-500">Vista previa social</span>
            </div>
            <div class="space-y-2">
              <strong class="text-lg text-zinc-900 dark:text-zinc-100">{{ catalog.settings.ogTitle }}</strong>
              <p class="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{{ catalog.settings.ogDescription }}</p>
              <div class="mt-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                <span>{{ catalog.slug }}.catalogo.app</span>
                <span>•</span>
                <span>Ver en WhatsApp</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-zinc-50/30 p-6 dark:bg-zinc-950/30">
        <div class="flex flex-col items-center gap-5 text-center">
          <h4 class="text-sm font-bold uppercase tracking-widest text-zinc-400">Código QR</h4>
          <div class="overflow-hidden rounded-[32px] border-4 border-white bg-white p-4 shadow-xl shadow-zinc-200/50 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-none">
            <img v-if="qrPreviewUrl" :src="qrPreviewUrl" alt="QR" class="h-48 w-48" />
            <div v-else class="flex h-48 w-48 items-center justify-center text-xs text-zinc-400">Generando QR...</div>
          </div>
          <div class="space-y-1">
            <strong class="text-zinc-900 dark:text-zinc-100">{{ catalog.settings.businessName }}</strong>
            <p class="text-xs leading-relaxed text-zinc-400">Personaliza tu QR y descárgalo listo para imprimir.</p>
          </div>

          <div class="w-full space-y-3 text-left">
            <div class="grid grid-cols-2 gap-3">
              <label class="flex items-center justify-between gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900">
                <span class="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Puntos</span>
                <input :value="qrDraft.qrDotColor" type="color" class="h-7 w-10 cursor-pointer rounded border-0 bg-transparent p-0" @input="updateField('qrDotColor', ($event.target as HTMLInputElement).value)" />
              </label>
              <label class="flex items-center justify-between gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900">
                <span class="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Fondo</span>
                <input :value="qrDraft.qrBgColor" type="color" class="h-7 w-10 cursor-pointer rounded border-0 bg-transparent p-0" @input="updateField('qrBgColor', ($event.target as HTMLInputElement).value)" />
              </label>
            </div>

            <label class="block">
              <span class="mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Forma de puntos</span>
              <select v-model="qrDraft.qrDotType" class="w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
                <option value="square">Cuadrado</option>
                <option value="rounded">Redondeado</option>
                <option value="dots">Círculo</option>
                <option value="classy">Diamante</option>
                <option value="extra-rounded">Estrella</option>
              </select>
            </label>

            <label class="block">
              <span class="mb-1 block text-xs font-semibold text-zinc-600 dark:text-zinc-400">Forma de esquinas</span>
              <select v-model="qrDraft.qrCornerType" class="w-full rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
                <option value="square">Cuadrado</option>
                <option value="extra-rounded">Redondeado</option>
                <option value="dot">Círculo</option>
              </select>
            </label>

            <div class="rounded-2xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900">
              <p class="mb-2 text-xs font-semibold text-zinc-600 dark:text-zinc-400">Logo central (opcional)</p>
              <div v-if="qrDraft.qrLogoUrl" class="mb-2 flex items-center gap-2">
                <img :src="qrDraft.qrLogoUrl" alt="Logo" class="h-10 w-10 rounded-lg object-cover" />
                <button class="ghost-btn small !flex-1 !rounded-xl !text-red-500" @click="clearLogo">Quitar</button>
              </div>
              <input id="qr-logo-file" type="file" accept="image/*" class="hidden" @change="onLogoSelected" />
              <label for="qr-logo-file" class="ghost-btn small !w-full !cursor-pointer !rounded-xl !justify-center">
                {{ qrDraft.qrLogoUrl ? 'Cambiar imagen' : 'Subir imagen' }}
              </label>
            </div>

            <button v-if="isDirty" class="solid-btn small !w-full !rounded-2xl" :disabled="saving" @click="saveQrSettings">
              {{ saving ? 'Guardando...' : 'Guardar cambios' }}
            </button>
          </div>

          <div class="flex w-full gap-2">
            <button @click="downloadQR('png')" class="solid-btn small !flex-1 !rounded-2xl">
              PNG
            </button>
            <button @click="downloadQR('svg')" class="ghost-btn small !flex-1 !rounded-2xl">
              SVG
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { CatalogOperationalSettings } from '~/types/catalog'

definePageMeta({ layout: 'admin' })

const catalogStore = useCatalogStore()
const catalog = computed(() => catalogStore.activeCatalog)

const qrPreviewUrl = ref('')
const saving = ref(false)

type QrDraft = Pick<CatalogOperationalSettings, 'qrDotColor' | 'qrBgColor' | 'qrDotType' | 'qrCornerType' | 'qrLogoUrl'>

const qrDraft = reactive<QrDraft>({
  qrDotColor: '#20130f',
  qrBgColor: '#fff7f2',
  qrDotType: 'rounded',
  qrCornerType: 'extra-rounded',
  qrLogoUrl: '',
})

const syncDraft = () => {
  if (!catalog.value) return
  const s = catalog.value.settings
  qrDraft.qrDotColor = s.qrDotColor || '#20130f'
  qrDraft.qrBgColor = s.qrBgColor || '#fff7f2'
  qrDraft.qrDotType = s.qrDotType || 'rounded'
  qrDraft.qrCornerType = s.qrCornerType || 'extra-rounded'
  qrDraft.qrLogoUrl = s.qrLogoUrl || ''
}

const isDirty = computed(() => {
  if (!catalog.value) return false
  const s = catalog.value.settings
  return qrDraft.qrDotColor !== (s.qrDotColor || '#20130f')
    || qrDraft.qrBgColor !== (s.qrBgColor || '#fff7f2')
    || qrDraft.qrDotType !== (s.qrDotType || 'rounded')
    || qrDraft.qrCornerType !== (s.qrCornerType || 'extra-rounded')
    || qrDraft.qrLogoUrl !== (s.qrLogoUrl || '')
})

const updateField = <K extends keyof QrDraft>(key: K, value: QrDraft[K]) => {
  qrDraft[key] = value
}

const saveQrSettings = async () => {
  if (!catalog.value) return
  saving.value = true
  try {
    await catalogStore.updateSettings({
      ...catalog.value.settings,
      ...qrDraft,
    })
  } catch (err) {
    console.error('Error guardando ajustes QR:', err)
  } finally {
    saving.value = false
  }
}

const onLogoSelected = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => {
    qrDraft.qrLogoUrl = String(e.target?.result || '')
  }
  reader.readAsDataURL(file)
}

const clearLogo = () => {
  qrDraft.qrLogoUrl = ''
  const input = document.getElementById('qr-logo-file') as HTMLInputElement | null
  if (input) input.value = ''
}

const publicUrl = computed(() => {
  if (!catalog.value) return ''
  if (import.meta.client) {
    return `${window.location.origin}/b/${catalog.value.slug}`
  }
  return `/b/${catalog.value.slug}`
})

const buildQrOptions = (settings: CatalogOperationalSettings, url: string, size: number) => ({
  width: size,
  height: size,
  type: 'canvas' as const,
  data: url,
  image: settings.qrLogoUrl || undefined,
  imageOptions: {
    crossOrigin: 'anonymous' as const,
    margin: 4,
    imageSize: 0.35,
  },
  dotsOptions: {
    color: settings.qrDotColor,
    type: settings.qrDotType,
  },
  backgroundOptions: {
    color: settings.qrBgColor,
  },
  cornersSquareOptions: {
    type: settings.qrCornerType,
    color: settings.qrDotColor,
  },
  cornersDotOptions: {
    type: (settings.qrCornerType === 'square' ? 'square' : 'dot') as 'square' | 'dot',
    color: settings.qrDotColor,
  },
})

const currentQrSettings = (): CatalogOperationalSettings => ({
  ...(catalog.value?.settings as CatalogOperationalSettings),
  qrDotColor: qrDraft.qrDotColor,
  qrBgColor: qrDraft.qrBgColor,
  qrDotType: qrDraft.qrDotType,
  qrCornerType: qrDraft.qrCornerType,
  qrLogoUrl: qrDraft.qrLogoUrl,
})

const renderQR = async () => {
  if (!import.meta.client) return
  if (!catalog.value || !publicUrl.value) return

  try {
    const mod = await import('qr-code-styling')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const QRCodeStyling = (mod as any).default ?? (mod as any).QRCodeStyling ?? mod
    const qr = new QRCodeStyling(buildQrOptions(currentQrSettings(), publicUrl.value, 400))
    const blob = await qr.getRawData('png')
    if (blob instanceof Blob) {
      if (qrPreviewUrl.value) URL.revokeObjectURL(qrPreviewUrl.value)
      qrPreviewUrl.value = URL.createObjectURL(blob)
    }
  } catch (err) {
    console.error('Error generando QR:', err)
  }
}

const downloadQR = async (extension: 'png' | 'svg') => {
  if (!catalog.value || !publicUrl.value) return
  try {
    const mod = await import('qr-code-styling')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const QRCodeStyling = (mod as any).default ?? (mod as any).QRCodeStyling ?? mod
    const exporter = new QRCodeStyling(buildQrOptions(currentQrSettings(), publicUrl.value, 1024))
    exporter.download({ name: `QR-${catalog.value.slug}`, extension })
  } catch (err) {
    console.error('Error descargando QR:', err)
  }
}

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    alert('¡Enlace copiado al portapapeles!')
  } catch (err) {
    console.error('Error al copiar:', err)
  }
}

onMounted(() => {
  syncDraft()
  renderQR()
})

watch(
  () => catalog.value?.id,
  () => {
    syncDraft()
  },
)

watch(
  () => [
    qrDraft.qrDotColor,
    qrDraft.qrBgColor,
    qrDraft.qrDotType,
    qrDraft.qrCornerType,
    qrDraft.qrLogoUrl,
    publicUrl.value,
  ],
  () => {
    renderQR()
  },
)

onBeforeUnmount(() => {
  if (qrPreviewUrl.value) URL.revokeObjectURL(qrPreviewUrl.value)
})
</script>
