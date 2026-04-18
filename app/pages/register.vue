<template>
  <section class="auth-shell">
    <form class="auth-card" @submit.prevent="submit">
      <p class="eyebrow">Registro</p>
      <h1>Crea tu cuenta</h1>

      <label>
        <span>Nombre</span>
        <input v-model="name" type="text" required />
      </label>
      <label>
        <span>Correo</span>
        <input v-model="email" type="email" required />
      </label>
      <label>
        <span>Contraseña</span>
        <input v-model="password" type="password" minlength="8" required />
      </label>

      <p v-if="error" class="form-error">{{ error }}</p>

      <button class="solid-btn wide" :disabled="authStore.loading">
        {{ authStore.loading ? 'Creando...' : 'Crear cuenta' }}
      </button>

      <NuxtLink to="/login" class="ghost-btn wide">Ya tengo cuenta</NuxtLink>
    </form>
  </section>
</template>

<script setup lang="ts">
const authStore = useAuthStore()
const name = ref('')
const email = ref('')
const password = ref('')
const error = ref('')

const submit = async () => {
  error.value = ''
  try {
    await authStore.register(name.value, email.value, password.value)
    await navigateTo('/onboarding/create-catalog')
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'No se pudo crear la cuenta'
  }
}
</script>
