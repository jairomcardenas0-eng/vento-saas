<template>
  <div class="min-h-screen bg-gray-50 flex flex-col md:flex-row">
    <!-- Sidebar Core -->
    <aside class="w-full md:w-64 bg-white border-r border-gray-200 flex-shrink-0">
      <div class="p-6 border-b border-gray-200">
        <h2 class="text-xl font-bold text-gray-900 tracking-tight">SaaS Core Panel</h2>
      </div>
      <nav class="p-4 space-y-2">
        <NuxtLink to="/admin" class="block px-4 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors">Centro de Operaciones</NuxtLink>
        <NuxtLink to="/admin/appearance" class="block px-4 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors">Configuración Visual</NuxtLink>
        <NuxtLink to="/admin/settings" class="block px-4 py-3 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors">Ajustes Operativos</NuxtLink>
        <button @click="handleLogout" class="w-full text-left px-4 py-3 mt-4 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">Desconexión</button>
      </nav>
    </aside>

    <!-- Superficie de Interacción -->
    <main class="flex-1 p-8 overflow-y-auto">
      <slot />
    </main>
  </div>
</template>

<script setup lang="ts">
const authStore = useAuthStore()

const handleLogout = async () => {
  await authStore.logout()
  await navigateTo('/')
}
</script>
