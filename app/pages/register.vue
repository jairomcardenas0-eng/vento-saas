<template>
  <section class="auth-shell">
    <form class="auth-card" @submit.prevent="submit">
      <div class="flex justify-end mb-2">
        <button type="button" class="ghost-btn small" @click="cancel">
          Cancelar
        </button>
      </div>
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

      <!-- Código de referido: opcional, se puede escribir manualmente -->
      <div>
        <button
          v-if="!showRefField"
          type="button"
          class="ghost-btn small w-full !justify-center !text-zinc-500"
          @click="showRefField = true"
        >
          <svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" stroke-width="2" stroke-linecap="round"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" stroke-width="2" stroke-linecap="round"/>
          </svg>
          Tengo un código de referido
        </button>

        <label v-else>
          <div class="flex items-center justify-between">
            <span>Código de referido <em class="font-normal text-zinc-400">(opcional)</em></span>
            <button
              v-if="!autoFilled"
              type="button"
              class="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
              @click="showRefField = false; manualRefCode = ''"
            >
              Quitar
            </button>
          </div>
          <input
            v-model="manualRefCode"
            type="text"
            placeholder="Ej: ABCDE1234"
            maxlength="20"
            :class="{ 'uppercase': true, 'opacity-70 cursor-not-allowed': autoFilled }"
            :readonly="autoFilled"
            @input="manualRefCode = manualRefCode.toUpperCase()"
          />
          <small v-if="autoFilled" class="text-emerald-600 dark:text-emerald-400">
            ✓ Código aplicado desde tu enlace de invitación
          </small>
          <small v-else class="text-zinc-400">
            Ingresa el código de quien te invitó.
          </small>
        </label>
      </div>

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
const route = useRoute()
const name = ref('')
const email = ref('')
const password = ref('')
const error = ref('')

const router = useRouter()

const cancel = () => {
  if (window.history.length > 1) {
    router.back()
  } else {
    navigateTo('/')
  }
}

// Cookie puesta por el middleware referral.global.ts cuando llega con ?ref=
const refCookie = useCookie<string | null>('_ref_code')

// Si hay código en cookie se muestra el campo pre-llenado automáticamente
const autoFilled = computed(() => !!refCookie.value)
const showRefField = ref(autoFilled.value)
const manualRefCode = ref(refCookie.value || '')

// El código final a usar: el manual o el de la cookie
const effectiveCode = computed(() => manualRefCode.value.trim().toUpperCase())

const submit = async () => {
  error.value = ''
  try {
    const user = await authStore.register(name.value, email.value, password.value)

    // Vincular referido si hay código (ya sea manual o automático de cookie)
    if (effectiveCode.value && user?.uid) {
      try {
        await backend.linkReferral(user.uid, effectiveCode.value)
      } catch {
        // No bloquea el registro si falla
      }
      refCookie.value = null
    }

    // Generar código de referido propio para el nuevo usuario
    if (user?.uid) {
      try {
        await backend.ensureReferralCode(user.uid)
      } catch {
        // No bloquear flujo si falla
      }
    }

    const redirectPath = typeof route.query.redirect === 'string' ? route.query.redirect : ''
    if (redirectPath && redirectPath.startsWith('/')) {
      await navigateTo(redirectPath)
      return
    }
    await navigateTo('/onboarding/create-catalog')
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'No se pudo crear la cuenta'
  }
}
</script>

