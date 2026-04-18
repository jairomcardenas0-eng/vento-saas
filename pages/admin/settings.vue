<template>
  <div class="max-w-5xl mx-auto space-y-8">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 class="text-3xl font-bold text-gray-900 tracking-tight">Operaciones y Contacto</h1>
        <p class="text-gray-500 text-sm mt-1 font-medium">Control corporativo sobre rutinas de cierre, conexión externa y marketing QR.</p>
      </div>
      <button @click="commitSettingsChanges" :disabled="settingsStore.syncStatus === 'SYNCING'" class="bg-black text-white px-8 py-3 rounded-xl font-bold shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:bg-gray-800 transition active:scale-95 whitespace-nowrap min-w-[220px]">
        {{ settingsStore.syncStatus === 'SYNCING' ? 'Sincronizando...' : settingsStore.syncStatus === 'SUCCESS' ? '¡Actualizado!' : 'Guardar Sincronización' }}
      </button>
    </div>

    <!-- Contacto y Redes -->
    <section class="surface-premium rounded-xl overflow-hidden border border-gray-200">
      <h2 class="bg-gray-50 px-6 py-4 border-b border-gray-200 font-bold text-gray-800 uppercase text-xs">Conexión con Clientes</h2>
      <div class="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">Teléfono de Soporte</label>
          <input v-model="settingsStore.config.contactPhone" type="text" placeholder="Ej: 5512345678" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black outline-none" />
        </div>
        <div>
          <label class="block text-sm font-semibold text-gray-700 mb-2">Canal WhatsApp (Con código)</label>
          <input v-model="settingsStore.config.contactWhatsapp" type="text" placeholder="Ej: 5215512345678" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black outline-none" />
        </div>
      </div>
    </section>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      
      <!-- CREADOR QR -->
      <section class="surface-premium rounded-xl overflow-hidden border border-gray-200">
        <div class="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 class="font-bold text-gray-800 uppercase text-xs">Marketing QR Inteligente</h2>
        </div>
        <div class="p-6 space-y-4">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">Identificador de Punto (Puntos centrales)</label>
             <select v-model="settingsStore.config.qrDotType" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black outline-none mb-2">
                <option value="square">Matemático Cuadrado</option>
                <option value="rounded">Redondeado (Trendy)</option>
                <option value="dots">Círculos Concéntricos</option>
                <option value="classy">Modo Diamante/Classy</option>
                <option value="extra-rounded">Extra-Redondeados (Estrella)</option>
             </select>
          </div>
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">Marcadores de Esquina</label>
             <select v-model="settingsStore.config.qrCornerType" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black outline-none block">
                <option value="square">Base Cuadrada</option>
                <option value="extra-rounded">Cápsulas Redondas</option>
                <option value="dot">Ejes Circulares</option>
             </select>
          </div>
          <div class="flex gap-4">
             <div class="flex-1">
               <label class="block text-xs font-semibold text-gray-700 mb-1">Puntos de Escaneo</label>
               <input
                 :value="settingsStore.config.qrDotColor"
                 @input="settingsStore.config.qrDotColor = $event.target.value"
                 type="color"
                 class="h-10 w-full cursor-pointer border-none rounded"
               />
             </div>
             <div class="flex-1">
               <label class="block text-xs font-semibold text-gray-700 mb-1">Entorno (Fondo)</label>
               <input
                 :value="settingsStore.config.qrBgColor"
                 @input="settingsStore.config.qrBgColor = $event.target.value"
                 type="color"
                 class="h-10 w-full cursor-pointer border-none rounded"
               />
             </div>
          </div>
        </div>
      </section>

      <!-- MOTOR MENÚ CERRADO -->
      <section class="surface-premium rounded-xl overflow-hidden border border-gray-200 ring-2 ring-red-500/10 transition" :class="{'ring-red-500': settingsStore.config.closedIsActive}">
        <div class="bg-gray-50 px-6 py-4 border-b border-gray-200 flex items-center justify-between">
           <h2 class="font-bold text-gray-800 uppercase text-xs">Cierre de Operaciones (Restricción)</h2>
           <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" v-model="settingsStore.config.closedIsActive" class="sr-only peer">
              <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
           </label>
        </div>
        
        <div class="p-6 space-y-4" :class="{'opacity-50 pointer-events-none': !settingsStore.config.closedIsActive}">
          <div>
            <label class="block text-sm font-semibold text-gray-700 mb-2">Manifiesto de Ausencia (Saltos de Línea Permitidos)</label>
            <textarea v-model="settingsStore.config.closedMessage" rows="3" class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black outline-none text-sm"></textarea>
          </div>
          
          <div class="flex gap-3">
             <div class="flex-1">
                 <label class="block text-xs font-semibold text-gray-700 mb-1">Impacto (Título px)</label>
                 <input v-model.number="settingsStore.config.closedTextLarge" type="number" class="w-full px-2 py-1.5 border border-gray-300 rounded" />
             </div>
             <div class="flex-1">
                 <label class="block text-xs font-semibold text-gray-700 mb-1">Subtítulo (px)</label>
                 <input v-model.number="settingsStore.config.closedTextSmall" type="number" class="w-full px-2 py-1.5 border border-gray-300 rounded" />
             </div>
          </div>

          <div class="my-4 h-px border-b border-dashed border-gray-200"></div>
          
          <div class="flex items-center justify-between mb-2">
            <label class="text-sm font-semibold text-gray-700">Blindaje de Texto (Contenedor oscuro)</label>
            <input type="checkbox" v-model="settingsStore.config.closedBoxEnabled" class="rounded text-black focus:ring-black"/>
          </div>
          
          <div v-show="settingsStore.config.closedBoxEnabled" class="bg-gray-50 p-2 rounded flex gap-2">
             <div class="flex-1">
               <label class="block text-xs font-semibold text-gray-700 mb-1">Base</label>
               <input
                 :value="settingsStore.config.closedBoxColor"
                 @input="settingsStore.config.closedBoxColor = $event.target.value"
                 type="color"
                 class="h-10 w-full cursor-pointer border-none rounded"
               />
             </div>
             <div class="flex-1">
                <label class="block text-xs text-gray-500 mb-1">Opacidad (%)</label>
                <input v-model.number="settingsStore.config.closedBoxOpacity" type="number" min="0" max="100" class="w-full px-2 border border-gray-300 rounded" />
             </div>
          </div>

          <div class="flex items-center gap-2">
            <label class="text-sm font-semibold text-gray-700">Tonalidad del Texto Maestro</label>
            <input
              :value="settingsStore.config.closedTextColor"
              @input="settingsStore.config.closedTextColor = $event.target.value"
              type="color"
              class="h-10 w-20 cursor-pointer border-none rounded"
            />
          </div>
          
        </div>
      </section>

    </div>
  </div>
</template>

<script setup lang="ts">
import type { SettingsConfig } from '~/stores/settings'

definePageMeta({ layout: 'admin' })

const authStore = useAuthStore()
const settingsStore = useSettingsStore()

onMounted(async () => {
    if (authStore.storeId) await settingsStore.fetchSettingsConfig(authStore.storeId)
})

const commitSettingsChanges = async () => {
   if (!authStore.storeId) return
   await settingsStore.saveSettingsConfig(authStore.storeId)
}
</script>
