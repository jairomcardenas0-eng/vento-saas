<template>
  <section class="auth-shell">
    <form class="auth-card" @submit.prevent="submit">
      <div class="flex justify-end mb-2">
        <button type="button" class="ghost-btn small" @click="cancel">
          Cancelar
        </button>
      </div>
      <p class="eyebrow">Centro de control</p>
      <h1>Inicia sesión</h1>
      <p>Entra a tu panel para gestionar pedidos, catálogo, horarios y operación diaria desde una experiencia clara y profesional.</p>

      <label>
        <span>Correo electrónico</span>
        <input v-model="email" type="email" autocomplete="email" required />
      </label>
      <label class="password-field">
        <span>Contraseña</span>
        <div class="password-input-wrapper">
          <input v-model="password" :type="showPassword ? 'text' : 'password'" autocomplete="current-password" required />
          <button type="button" class="password-toggle" @click="showPassword = !showPassword" :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'">
            <svg v-if="showPassword" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 0 5.06 5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
              <line x1="1" y1="1" x2="23" y2="23"></line>
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M1 12C1 12 5 5 12 5C19 5 23 12 23 12C23 12 19 19 12 19C5 19 1 12 1 12Z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
          </button>
        </div>
      </label>

      <p v-if="error" class="form-error">{{ error }}</p>

      <button class="solid-btn wide" :disabled="authStore.loading">
        {{ authStore.loading ? 'Validando acceso...' : 'Acceder al panel' }}
      </button>

      <NuxtLink to="/register" class="ghost-btn wide">Solicitar una cuenta</NuxtLink>
    </form>
  </section>
</template>

<style scoped>
.password-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.password-input-wrapper input {
  width: 100%;
  padding-right: 2.75rem;
}

.password-toggle {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 1.1rem;
  padding: 0.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #71717a;
  transition: color 0.2s;
}

.password-toggle:hover {
  color: #18181b;
}

.dark .password-toggle {
  color: #a1a1aa;
}

.dark .password-toggle:hover {
  color: #e4e4e7;
}
</style>

<script setup lang="ts">
const authStore = useAuthStore()
const route = useRoute()
const email = ref('')
const password = ref('')
const showPassword = ref(false)
const error = ref('')

const router = useRouter()

const cancel = () => {
  if (window.history.length > 1) {
    router.back()
  } else {
    navigateTo('/')
  }
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const submit = async () => {
  error.value = ''

  if (!emailRegex.test(email.value.trim())) {
    error.value = 'Ingresa un correo válido.'
    return
  }

  if (password.value.length < 6) {
    error.value = 'La contraseña debe tener al menos 6 caracteres.'
    return
  }

  try {
    const user = await authStore.login(email.value, password.value)
    const redirectPath = typeof route.query.redirect === 'string' ? route.query.redirect : ''
    if (redirectPath && redirectPath.startsWith('/')) {
      await navigateTo(redirectPath)
      return
    }
    await navigateTo(user.systemRole === 'owner' ? '/master' : (user.defaultCatalogId ? '/admin' : '/onboarding/create-catalog'))
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'No se pudo iniciar sesión'
  }
}
</script>
