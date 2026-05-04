<template>
  <section class="auth-shell">
    <form class="auth-card wide-card" @submit.prevent="submit">
      <div class="catalog-top-actions">
        <button type="button" class="ghost-btn small" @click="goBack">
          {{ authStore.user?.defaultCatalogId ? 'Volver al panel' : 'Cancelar' }}
        </button>
      </div>

      <p class="eyebrow">Configuración inicial</p>
      <h1>Crea tu primer catálogo</h1>
      <p>Crea tu tienda principal para comenzar a gestionar productos, pedidos y operaciones.</p>

      <label>
        <span>Nombre del catálogo</span>
        <input v-model="name" type="text" required />
      </label>
      <label>
        <span>Slug público</span>
        <input v-model="slug" type="text" required />
      </label>
      <p v-if="slugCheckStatus === 'checking'" class="form-hint">Verificando disponibilidad...</p>
      <p v-else-if="slugCheckStatus === 'available'" class="form-success">Disponible</p>
      <p v-else-if="slugCheckStatus === 'taken'" class="form-error">Ese slug ya está en uso.</p>

      <p class="form-hint">Vista previa: <code>/b/{{ normalizedSlug }}</code></p>
      <p class="catalog-name-warning">⚠️ La URL del catálogo (slug) no se puede cambiar después de crearlo. Asegúrate de elegir la URL correcta.</p>
      <p v-if="error" class="form-error">{{ error }}</p>

      <button class="solid-btn wide">Crear catálogo</button>
    </form>

    <div v-if="showConfirm" class="catalog-confirm-overlay">
      <div class="catalog-confirm-modal">
        <div class="catalog-confirm-icon">⚠️</div>
        <h2>¿Confirmar datos del catálogo?</h2>
        <p>Estás a punto de crear el catálogo con los siguientes datos:</p>
        <div class="catalog-confirm-detail">
          <span class="catalog-confirm-label">Nombre</span>
          <strong>{{ name }}</strong>
        </div>
        <div class="catalog-confirm-detail">
          <span class="catalog-confirm-label">URL pública</span>
          <strong>/b/{{ normalizedSlug }}</strong>
        </div>
        <p class="catalog-confirm-warning">⚠️ La URL del catálogo (slug) no se puede cambiar después de crearlo. El nombre sí se puede modificar más tarde.</p>
        <p v-if="confirmError" class="catalog-confirm-error">{{ confirmError }}</p>
        <div class="catalog-confirm-actions">
          <button type="button" class="ghost-btn" @click="showConfirm = false">Seguir editando</button>
          <button type="button" class="solid-btn" :disabled="catalogStore.loading" @click="confirm">
            {{ catalogStore.loading ? 'Creando...' : 'Sí, crear catálogo' }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
const authStore = useAuthStore()
const catalogStore = useCatalogStore()
const name = ref('')
const slug = ref('')
const error = ref('')
const showConfirm = ref(false)
const confirmError = ref('')
const slugCheckStatus = ref<'checking' | 'available' | 'taken' | null>(null)
let slugCheckTimer: ReturnType<typeof setTimeout> | null = null

const slugify = (value: string) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const normalizedSlug = computed(() => slugify(slug.value))

watch(normalizedSlug, (value) => {
  error.value = ''

  if (slugCheckTimer) {
    clearTimeout(slugCheckTimer)
    slugCheckTimer = null
  }

  if (!value) {
    slugCheckStatus.value = null
    return
  }

  slugCheckStatus.value = 'checking'
  slugCheckTimer = setTimeout(async () => {
    try {
      const data = await $fetch<{ available?: boolean }>('/api/check-slug', {
        method: 'POST',
        body: { slug: value },
      })
      slugCheckStatus.value = data?.available ? 'available' : 'taken'
    } catch {
      slugCheckStatus.value = null
    }
  }, 300)
}, { immediate: true })

const submit = () => {
  error.value = ''
  confirmError.value = ''
  if (!authStore.user) {
    return navigateTo('/login')
  }
  if (!normalizedSlug.value) {
    error.value = 'Ingresa un slug válido.'
    return
  }
  if (slugCheckStatus.value === 'taken') {
    error.value = 'Ese slug ya está en uso.'
    return
  }
  showConfirm.value = true
}

const confirm = async () => {
  confirmError.value = ''
  if (!authStore.user?.uid) {
    confirmError.value = 'Sesión no válida. Vuelve a iniciar sesión.'
    return
  }
  try {
    const created = await catalogStore.createCatalog(authStore.user.uid, name.value, normalizedSlug.value)
    await authStore.setDefaultCatalog(created.id)
    await navigateTo('/admin')
  } catch (err) {
    confirmError.value = err instanceof Error ? err.message : 'No se pudo crear el catálogo'
  }
}

const goBack = async () => {
  if (authStore.user?.defaultCatalogId) {
    await navigateTo('/admin')
    return
  }
  await navigateTo('/login')
}
</script>

<style scoped>
.catalog-top-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 0.5rem;
}

.catalog-name-warning {
  margin-top: 0.75rem;
  padding: 0.65rem 0.9rem;
  border-radius: 10px;
  font-size: 0.88rem;
  line-height: 1.5;
  background: #fef2f2;
  color: #b91c1c;
  border: 1px solid #fecaca;
}

.catalog-confirm-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: grid;
  place-items: center;
  z-index: 999;
  padding: 1rem;
}

.catalog-confirm-modal {
  background: #fff;
  border-radius: 20px;
  padding: 2rem;
  max-width: 420px;
  width: 100%;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.18);
  display: grid;
  gap: 0.85rem;
}

.catalog-confirm-icon {
  font-size: 2rem;
  text-align: center;
}

.catalog-confirm-modal h2 {
  margin: 0;
  font-size: 1.3rem;
  text-align: center;
  color: #111827;
}

.catalog-confirm-modal > p {
  margin: 0;
  font-size: 0.93rem;
  color: #52525b;
  text-align: center;
}

.catalog-confirm-detail {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  border-radius: 12px;
  background: #ffffff;
  border: 1px solid #e4e4e7;
}

.catalog-confirm-label {
  font-size: 0.82rem;
  color: #71717a;
}

.catalog-confirm-detail strong {
  font-size: 0.95rem;
  color: #18181b;
}

.catalog-confirm-warning {
  padding: 0.65rem 0.9rem;
  border-radius: 10px;
  font-size: 0.85rem;
  line-height: 1.5;
  background: #fef2f2;
  color: #b91c1c;
  border: 1px solid #fecaca;
  text-align: center;
}

.catalog-confirm-error {
  margin: 0;
  padding: 0.65rem 0.9rem;
  border-radius: 10px;
  font-size: 0.88rem;
  line-height: 1.5;
  background: #fef2f2;
  color: #b91c1c;
  border: 1px solid #fecaca;
  text-align: center;
}

.catalog-confirm-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  margin-top: 0.25rem;
}

.form-success {
  margin: 0;
  color: #047857;
  font-size: 0.88rem;
}
</style>
