<template>
  <div class="max-w-4xl mx-auto">
    <!-- Cortafuegos: Onboarding Mandatorio -->
    <div v-if="!authStore.storeId && !businessStore.currentStore" class="surface-premium p-8">
      <h1 class="text-2xl font-bold text-gray-900 mb-2">Despliegue de Entidad Comercial</h1>
      <p class="text-gray-500 mb-6 text-sm">El protocolo exige el registro de la instancia matriz para iniciar operaciones del catálogo.</p>
      
      <form @submit.prevent="createBusiness" class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Nombre Comercial de la Matriz</label>
          <input v-model="form.name" type="text" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black outline-none" required />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Carga Identificativa Global (Slug URL)</label>
          <input v-model="form.slug" type="text" placeholder="ej: la-pizza-loca" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black outline-none" required />
        </div>
        <button type="submit" :disabled="loading" class="w-full bg-black text-white font-semibold py-3 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 inline-flex items-center justify-center gap-2">
          <svg v-if="loading" class="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
          {{ loading ? 'Sincronizando Nodos...' : 'Proceder con Despliegue Core' }}
        </button>
      </form>
    </div>

    <!-- Panel Analítico Base Tras Aprobación -->
    <div v-else class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-3xl font-bold tracking-tight text-gray-900">{{ businessStore.currentStore?.businessName }}</h1>
          <p class="text-gray-500 text-sm">Dashboard de Operaciones Primario</p>
        </div>
        <div class="flex items-center gap-3">
          <span class="relative flex h-3 w-3">
            <span :class="businessStore.currentStore?.isOpen ? 'bg-green-500' : 'bg-red-500'" class="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"></span>
            <span :class="businessStore.currentStore?.isOpen ? 'bg-green-500' : 'bg-red-500'" class="relative inline-flex rounded-full h-3 w-3"></span>
          </span>
          <span class="text-sm font-medium">{{ businessStore.currentStore?.isOpen ? 'En Lïnea / Operando' : 'Mantenimiento / Cierre de Servidor' }}</span>
        </div>
      </div>
      <div class="surface-premium p-6 mt-6">
         <p class="text-gray-600">Telemetría operativa pendiente. Arquitectura lista para integración de Base de Datos Sub-dimensional.</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({ layout: 'admin' })

const authStore = useAuthStore()
const businessStore = useBusinessStore()

const loading = ref(false)
const form = ref({ name: '', slug: '' })

onMounted(async () => {
    // Escaneo de rehidratación para instanciar la data base si un login persiste
    if (authStore.storeId && !businessStore.currentStore) {
        await businessStore.fetchStoreData(authStore.storeId)
    }
})

const createBusiness = async () => {
  if (!authStore.user) return
  loading.value = true
  try {
    const safeSlug = form.value.slug.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    // Procedimiento de instanciación
    await businessStore.initializeStore(authStore.user.uid, form.value.name, safeSlug)
    authStore.storeId = safeSlug // Bypass reactivo para transición gráfica de vista
  } catch (error) {
    console.error('Core Exception in DB Payload:', error)
  } finally {
    loading.value = false
  }
}
</script>
