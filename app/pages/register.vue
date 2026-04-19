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

      <!-- Código de referido (opcional, visible si fue referido) -->
      <label v-if="refCode">
        <span>Código de referido</span>
        <input :value="refCode" readonly class="opacity-60 cursor-not-allowed" />
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
const backend = useSupabaseBackend()
const name = ref('')
const email = ref('')
const password = ref('')
const error = ref('')

// Leer código de referido de la cookie (guardado por el middleware referral.global.ts)
const refCookie = useCookie<string | null>('_ref_code')
const refCode = computed(() => refCookie.value || '')

const submit = async () => {
  error.value = ''
  try {
    const user = await authStore.register(name.value, email.value, password.value)

    // Vincular referido si había un código en la cookie
    if (refCookie.value && user?.uid) {
      try {
        await backend.linkReferral(user.uid, refCookie.value)
      } catch {
        // Error de referido no bloquea el registro
      }
      refCookie.value = null // Limpiar cookie después de usarla
    }

    // Generar código de referido propio para el nuevo usuario
    if (user?.uid) {
      try {
        await backend.ensureReferralCode(user.uid)
      } catch {
        // No bloquear flujo si falla
      }
    }

    await navigateTo('/onboarding/create-catalog')
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'No se pudo crear la cuenta'
  }
}
</script>
