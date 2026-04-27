<template>
  <AdminStatePanel
    v-if="!catalog"
    title="No hay un catálogo activo"
    description="Selecciona un catálogo para gestionar a tu equipo."
  />

  <AdminStatePanel
    v-else-if="loadError && !members.length"
    tone="error"
    title="No se pudo cargar el equipo"
    :description="loadError"
  >
    <template #actions>
      <button class="solid-btn" @click="loadMembers()">Reintentar</button>
    </template>
  </AdminStatePanel>

  <div v-else class="admin-grid">
    <section class="panel-card span-2 min-w-0 space-y-6">
      <UiSectionHeader
        eyebrow="Equipo"
        title="Gestión de equipo"
        description="Invita colaboradores y define exactamente a qué secciones tienen acceso."
      >
        <template #actions>
          <button class="solid-btn flex items-center gap-2" :disabled="teamLimitReached" :title="teamLimitReached ? teamLimitMessage : ''" @click="openInvite">
            <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14m-7-7h14" />
            </svg>
            Invitar miembro
          </button>
        </template>
      </UiSectionHeader>

      <div class="rounded-[18px] border px-4 py-3 text-sm" :class="usageClass(teamUsageRatio)">
        <strong>{{ teamUsageText }}</strong>
        <span class="ml-2">{{ teamLimitMessage }}</span>
      </div>

      <div class="flex flex-wrap gap-3">
        <div v-for="role in roles" :key="role.key" class="flex min-w-0 items-center gap-2 rounded-full border border-zinc-200 px-3 py-1.5 dark:border-zinc-800">
          <span class="inline-block h-2.5 w-2.5 rounded-full" :class="role.dot" />
          <span class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">{{ role.label }}</span>
          <span class="truncate text-xs text-zinc-400">{{ role.desc }}</span>
        </div>
      </div>

      <div class="relative max-w-sm">
        <svg class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="8" stroke-width="2" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" stroke-width="2" />
        </svg>
        <input
          v-model="search"
          type="search"
          placeholder="Buscar por nombre o correo..."
          class="w-full rounded-[14px] border border-zinc-200 bg-white py-3 pl-9 pr-4 text-sm text-zinc-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
        />
      </div>

      <div
        v-if="loading || loadError"
        class="flex flex-wrap items-center justify-between gap-3 rounded-[18px] border px-4 py-3 text-sm"
        :class="loadError ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300' : 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300'"
      >
        <span>{{ loadError || 'Actualizando miembros y permisos del catálogo...' }}</span>
        <button v-if="loadError" class="solid-btn" @click="loadMembers()">Reintentar</button>
      </div>

      <div v-if="!filteredMembers.length && !search" class="flex flex-col items-center justify-center rounded-[28px] border-2 border-dashed border-zinc-200 py-16 text-center dark:border-zinc-800">
        <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
          <svg class="h-8 w-8 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 0 0-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 0 1 5.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 0 1 9.288 0M15 7a3 3 0 11-6 0 3 3 0 0 1 6 0z" />
          </svg>
        </div>
        <h3 class="mb-1 text-lg font-bold text-zinc-900 dark:text-zinc-100">Sin miembros de equipo</h3>
        <p class="mb-5 max-w-xs text-sm text-zinc-400">Invita colaboradores para que gestionen el catálogo con los permisos que elijas.</p>
        <button class="solid-btn flex items-center gap-2" @click="openInvite">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14m-7-7h14" />
          </svg>
          Invitar primer miembro
        </button>
      </div>

      <div v-else-if="!filteredMembers.length" class="py-10 text-center text-sm text-zinc-400">
        No se encontró ningún miembro con “{{ search }}”.
      </div>

      <div v-else class="space-y-3">
        <article
          v-for="member in filteredMembers"
          :key="member.id"
          class="group rounded-[22px] border border-zinc-200/80 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950"
        >
          <div class="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl text-lg font-bold shadow-sm" :class="roleConfig(member.role).avatarBg">
              {{ initials(member.name) }}
            </div>

            <div class="min-w-0 flex-1">
              <div class="mb-0.5 flex flex-wrap items-center gap-2">
                <span class="break-words text-[15px] font-bold text-zinc-900 dark:text-zinc-100">{{ member.name }}</span>
                <span class="rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide" :class="roleConfig(member.role).badge">
                  {{ roleConfig(member.role).label }}
                </span>
                <span class="rounded-full px-2.5 py-0.5 text-[11px] font-medium" :class="statusConfig(member.status).cls">
                  {{ statusConfig(member.status).label }}
                </span>
              </div>
              <p class="break-all text-sm text-zinc-400">{{ member.email }}</p>
              <p class="mt-0.5 text-[11px] text-zinc-300 dark:text-zinc-600">
                Desde {{ formatDate(member.createdAt) }}
              </p>
            </div>

            <div class="flex items-center gap-2 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
              <button
                class="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500 transition hover:bg-blue-50 hover:text-blue-600 dark:bg-zinc-800 dark:hover:bg-blue-950/40 dark:hover:text-blue-400"
                title="Editar miembro"
                aria-label="Editar miembro"
                @click="openEdit(member)"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5m-1.414-9.414a2 2 0 1 1 2.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                class="flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500 transition hover:bg-rose-50 hover:text-rose-600 dark:bg-zinc-800 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                title="Eliminar miembro"
                aria-label="Eliminar miembro"
                @click="confirmDelete(member)"
              >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>

          <div class="mt-3 flex flex-wrap gap-1.5">
            <span
              v-for="permission in activePermissions(member.permissions)"
              :key="permission"
              class="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-[11px] font-medium text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-400"
            >
              {{ permission }}
            </span>
          </div>
        </article>
      </div>

      <Teleport to="body">
        <Transition
          enter-active-class="transition duration-200 ease-out"
          enter-from-class="opacity-0 scale-95"
          enter-to-class="opacity-100 scale-100"
          leave-active-class="transition duration-150 ease-in"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-95"
        >
          <div v-if="showModal" class="fixed inset-0 z-[200] flex items-end justify-center p-4 sm:items-center">
            <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="closeModal" />

            <form
              class="relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-[28px] border border-zinc-200 bg-white shadow-2xl dark:border-zinc-800 dark:bg-zinc-950"
              @submit.prevent="saveMember"
            >
              <div class="flex items-center justify-between border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
                <h2 class="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  {{ editingMember ? 'Editar miembro' : 'Invitar al equipo' }}
                </h2>
                <button type="button" class="flex h-8 w-8 items-center justify-center rounded-xl text-zinc-400 transition hover:bg-zinc-100 dark:hover:bg-zinc-800" @click="closeModal">
                  <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div class="max-h-[70vh] space-y-5 overflow-y-auto px-6 py-5">
                <div class="grid gap-4 sm:grid-cols-2">
                  <label class="flex flex-col gap-1.5">
                    <span class="text-xs font-bold uppercase tracking-wide text-zinc-500">Nombre completo</span>
                    <input v-model="form.name" required placeholder="Ej. María García" class="rounded-[12px] border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white" />
                  </label>
                  <label class="flex flex-col gap-1.5">
                    <span class="text-xs font-bold uppercase tracking-wide text-zinc-500">Correo</span>
                    <input v-model="form.email" type="email" required :disabled="Boolean(editingMember)" placeholder="correo@ejemplo.com" class="rounded-[12px] border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white" />
                  </label>
                </div>

                <div>
                  <span class="mb-2 block text-xs font-bold uppercase tracking-wide text-zinc-500">Rol del usuario</span>
                  <div class="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <button
                      v-for="role in roles"
                      :key="role.key"
                      type="button"
                      class="flex flex-col items-center gap-1.5 rounded-[14px] border-2 px-3 py-3 text-center transition-all"
                      :class="form.role === role.key ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30' : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700'"
                      @click="applyRole(role.key)"
                    >
                      <span class="inline-block h-3 w-3 rounded-full" :class="role.dot" />
                      <span class="text-[13px] font-bold text-zinc-800 dark:text-zinc-200">{{ role.label }}</span>
                      <span class="text-[10px] leading-tight text-zinc-400">{{ role.desc }}</span>
                    </button>
                  </div>
                </div>

                <div v-if="editingMember">
                  <span class="mb-2 block text-xs font-bold uppercase tracking-wide text-zinc-500">Estado</span>
                  <select v-model="form.status" class="w-full rounded-[12px] border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:border-zinc-800 dark:bg-zinc-900 dark:text-white">
                    <option value="active">Activo</option>
                    <option value="pending">Pendiente</option>
                    <option value="suspended">Suspendido</option>
                  </select>
                </div>

                <div>
                  <div class="mb-3 flex items-center justify-between gap-2">
                    <span class="text-xs font-bold uppercase tracking-wide text-zinc-500">Permisos personalizados</span>
                    <button type="button" class="text-[11px] text-blue-500 hover:underline" @click="toggleAllPerms">
                      {{ allPermsEnabled ? 'Quitar todos' : 'Activar todos' }}
                    </button>
                  </div>
                  <div class="grid gap-2 sm:grid-cols-2">
                    <label
                      v-for="permission in permDefs"
                      :key="permission.key"
                      class="flex cursor-pointer items-center gap-3 rounded-[12px] border border-zinc-100 bg-zinc-50 px-3 py-2.5 transition hover:border-zinc-200 dark:border-zinc-800/80 dark:bg-zinc-900/60 dark:hover:border-zinc-700"
                    >
                      <div class="relative flex-shrink-0">
                        <input
                          type="checkbox"
                          :checked="form.permissions[permission.key]"
                          class="peer sr-only"
                          @change="togglePerm(permission.key)"
                        />
                        <div class="flex h-5 w-5 items-center justify-center rounded-full border-2 border-zinc-300 bg-white transition-all peer-checked:border-blue-500 peer-checked:bg-blue-500 dark:border-zinc-700 dark:bg-zinc-900">
                          <svg class="h-3 w-3 text-white opacity-0 transition-opacity peer-checked:opacity-100" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </div>
                      <div class="min-w-0 flex-1">
                        <p class="text-[12px] font-semibold leading-tight text-zinc-800 dark:text-zinc-200">{{ permission.label }}</p>
                        <p class="text-[10px] leading-tight text-zinc-400">{{ permission.desc }}</p>
                      </div>
                    </label>
                  </div>
                </div>

                <p v-if="formError" class="rounded-[10px] border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-400">
                  {{ formError }}
                </p>
              </div>

              <div class="flex items-center justify-between gap-3 border-t border-zinc-100 px-6 py-4 dark:border-zinc-800">
                <button type="button" class="ghost-btn" @click="closeModal">Cancelar</button>
                <button type="submit" class="solid-btn flex items-center gap-2" :disabled="saving">
                  <svg v-if="saving" class="h-4 w-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {{ saving ? 'Guardando...' : editingMember ? 'Guardar cambios' : 'Enviar invitación' }}
                </button>
              </div>
            </form>
          </div>
        </Transition>
      </Teleport>

      <Teleport to="body">
        <Transition enter-active-class="transition duration-150" enter-from-class="opacity-0" enter-to-class="opacity-100" leave-active-class="transition duration-100" leave-from-class="opacity-100" leave-to-class="opacity-0">
          <div v-if="deletingMember" class="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="deletingMember = null" />
            <div class="relative z-10 w-full max-w-sm rounded-[22px] border border-zinc-200 bg-white p-6 shadow-2xl dark:border-zinc-800 dark:bg-zinc-950">
              <div class="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 dark:bg-rose-950/40">
                <svg class="h-6 w-6 text-rose-600 dark:text-rose-400" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 class="mb-1 text-lg font-bold text-zinc-900 dark:text-zinc-100">Eliminar miembro</h3>
              <p class="mb-5 text-sm text-zinc-500">
                ¿Eliminar a <strong class="text-zinc-800 dark:text-zinc-200">{{ deletingMember.name }}</strong>? Esta acción no se puede deshacer.
              </p>
              <div class="flex gap-3">
                <button class="ghost-btn flex-1" @click="deletingMember = null">Cancelar</button>
                <button class="flex-1 rounded-[14px] bg-rose-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-rose-700" :disabled="saving" @click="deleteMember">
                  {{ saving ? 'Eliminando...' : 'Sí, eliminar' }}
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { CatalogTeamMember, TeamMemberPermissions, TeamMemberRole, TeamMemberStatus } from '~/types/catalog'

definePageMeta({ layout: 'admin' })

const catalogStore = useCatalogStore()
const authStore = useAuthStore()
const backend = useSupabaseBackend()
const catalog = computed(() => catalogStore.activeCatalog)
const catalogId = computed(() => catalog.value?.id ?? '')

const members = ref<CatalogTeamMember[]>([])
const loading = ref(true)
const loadError = ref('')
const search = ref('')
const showModal = ref(false)
const saving = ref(false)
const formError = ref('')
const editingMember = ref<CatalogTeamMember | null>(null)
const deletingMember = ref<CatalogTeamMember | null>(null)
const planLimits = {
  free: { maxTeamMembers: 2 },
  basic: { maxTeamMembers: 5 },
  pro: { maxTeamMembers: 15 },
  enterprise: { maxTeamMembers: Number.POSITIVE_INFINITY },
} as const

const roles = [
  { key: 'admin' as TeamMemberRole, label: 'Administrador', desc: 'Acceso casi total', dot: 'bg-violet-500' },
  { key: 'editor' as TeamMemberRole, label: 'Editor', desc: 'Edita productos y pedidos', dot: 'bg-blue-500' },
  { key: 'viewer' as TeamMemberRole, label: 'Lector', desc: 'Solo lectura', dot: 'bg-zinc-400' },
]

const rolePermMap: Record<TeamMemberRole, Partial<TeamMemberPermissions>> = {
  admin: { viewOrders: true, manageOrders: true, viewProducts: true, manageProducts: true, viewInventory: true, manageInventory: true, viewReviews: true, manageReviews: true, viewCoupons: true, manageCoupons: true, viewStats: true, viewSettings: true },
  editor: { viewOrders: true, manageOrders: true, viewProducts: true, manageProducts: true, viewInventory: true, manageInventory: true, viewReviews: true, manageReviews: false, viewCoupons: true, manageCoupons: false, viewStats: true, viewSettings: false },
  viewer: { viewOrders: true, manageOrders: false, viewProducts: true, manageProducts: false, viewInventory: true, manageInventory: false, viewReviews: true, manageReviews: false, viewCoupons: false, manageCoupons: false, viewStats: true, viewSettings: false },
}

const roleConfig = (role: TeamMemberRole) => ({
  admin: { label: 'Administrador', badge: 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300', avatarBg: 'bg-gradient-to-br from-violet-400 to-purple-600 text-white' },
  editor: { label: 'Editor', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300', avatarBg: 'bg-gradient-to-br from-blue-400 to-indigo-500 text-white' },
  viewer: { label: 'Lector', badge: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400', avatarBg: 'bg-gradient-to-br from-zinc-300 to-zinc-500 text-white' },
}[role])

const statusConfig = (status: TeamMemberStatus) => ({
  active: { label: 'Activo', cls: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' },
  pending: { label: 'Pendiente', cls: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800' },
  suspended: { label: 'Suspendido', cls: 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800' },
}[status])

const permDefs: Array<{ key: keyof TeamMemberPermissions, label: string, desc: string }> = [
  { key: 'viewOrders', label: 'Ver pedidos', desc: 'Consulta el historial de órdenes' },
  { key: 'manageOrders', label: 'Gestionar pedidos', desc: 'Cambia estados y detalles' },
  { key: 'viewProducts', label: 'Ver productos', desc: 'Consulta el catálogo' },
  { key: 'manageProducts', label: 'Gestionar productos', desc: 'Crear, editar y eliminar' },
  { key: 'viewInventory', label: 'Ver inventario', desc: 'Consulta stock y alertas' },
  { key: 'manageInventory', label: 'Gestionar inventario', desc: 'Ajusta stock y reservas' },
  { key: 'viewReviews', label: 'Ver reseñas', desc: 'Consulta valoraciones' },
  { key: 'manageReviews', label: 'Moderar reseñas', desc: 'Aprobar y responder' },
  { key: 'viewCoupons', label: 'Ver cupones', desc: 'Consulta descuentos' },
  { key: 'manageCoupons', label: 'Gestionar cupones', desc: 'Crear y editar descuentos' },
  { key: 'viewStats', label: 'Ver estadísticas', desc: 'Accede al panel de métricas' },
  { key: 'viewSettings', label: 'Ver ajustes', desc: 'Consulta configuración general' },
]

const defaultPerms = (): TeamMemberPermissions => ({
  viewOrders: false,
  manageOrders: false,
  viewProducts: true,
  manageProducts: false,
  viewInventory: true,
  manageInventory: false,
  viewReviews: false,
  manageReviews: false,
  viewCoupons: false,
  manageCoupons: false,
  viewStats: true,
  viewSettings: false,
})

const form = ref<{
  name: string
  email: string
  role: TeamMemberRole
  status: TeamMemberStatus
  permissions: TeamMemberPermissions
}>({
  name: '',
  email: '',
  role: 'viewer',
  status: 'pending',
  permissions: defaultPerms(),
})

const filteredMembers = computed(() => {
  const query = search.value.toLowerCase().trim()
  if (!query) {
    return members.value
  }

  return members.value.filter((member) =>
    member.name.toLowerCase().includes(query) || member.email.toLowerCase().includes(query),
  )
})

const teamLimit = computed(() =>
  planLimits[catalog.value?.planTier === 'basic' || catalog.value?.planTier === 'pro' || catalog.value?.planTier === 'enterprise' ? catalog.value.planTier : 'free'].maxTeamMembers,
)

const teamUsageRatio = computed(() =>
  Number.isFinite(teamLimit.value) && teamLimit.value > 0 ? members.value.length / teamLimit.value : 0,
)

const teamLimitReached = computed(() =>
  Number.isFinite(teamLimit.value) && members.value.length >= teamLimit.value,
)

const teamUsageText = computed(() =>
  Number.isFinite(teamLimit.value)
    ? `${members.value.length}/${teamLimit.value} miembros`
    : `${members.value.length} miembros activos`,
)

const teamLimitMessage = computed(() => {
  if (!Number.isFinite(teamLimit.value)) {
    return 'Tu plan actual no tiene tope de miembros.'
  }

  if (teamLimitReached.value && !editingMember.value) {
    return 'Has alcanzado el límite de tu plan. Actualiza para invitar más personas.'
  }

  if (teamUsageRatio.value >= 0.8) {
    return 'Estás cerca del límite de miembros de tu plan.'
  }

  return 'Aún tienes margen para ampliar el equipo.'
})

const usageClass = (ratio: number) => {
  if (ratio >= 1) {
    return 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300'
  }

  if (ratio >= 0.8) {
    return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300'
  }

  return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300'
}

const allPermsEnabled = computed(() => Object.values(form.value.permissions).every(Boolean))

const initials = (name: string) =>
  name.split(' ').slice(0, 2).map(part => part[0]).join('').toUpperCase()

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })

const activePermissions = (permissions: TeamMemberPermissions) =>
  permDefs.filter(permission => permissions[permission.key]).map(permission => permission.label)

const loadMembers = async () => {
  if (!catalogId.value) {
    members.value = []
    loading.value = false
    loadError.value = ''
    return
  }

  loading.value = true
  loadError.value = ''
  try {
    members.value = await backend.getTeamMembers(catalogId.value)
  } catch (error) {
    console.error('Error loading team:', error)
    loadError.value = error instanceof Error ? error.message : 'No fue posible cargar el equipo.'
  } finally {
    loading.value = false
  }
}

const openInvite = () => {
  if (teamLimitReached.value) {
    return
  }

  editingMember.value = null
  form.value = {
    name: '',
    email: '',
    role: 'viewer',
    status: 'pending',
    permissions: defaultPerms(),
  }
  formError.value = ''
  showModal.value = true
}

const openEdit = (member: CatalogTeamMember) => {
  editingMember.value = member
  form.value = {
    name: member.name,
    email: member.email,
    role: member.role,
    status: member.status,
    permissions: { ...member.permissions },
  }
  formError.value = ''
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  editingMember.value = null
}

const applyRole = (role: TeamMemberRole) => {
  form.value.role = role
  form.value.permissions = { ...defaultPerms(), ...rolePermMap[role] }
}

const togglePerm = (key: keyof TeamMemberPermissions) => {
  form.value.permissions[key] = !form.value.permissions[key]
}

const toggleAllPerms = () => {
  const nextValue = !allPermsEnabled.value
  for (const key of Object.keys(form.value.permissions) as Array<keyof TeamMemberPermissions>) {
    form.value.permissions[key] = nextValue
  }
}

const saveMember = async () => {
  if (!catalogId.value) {
    return
  }

  formError.value = ''
  saving.value = true

  try {
    if (editingMember.value) {
      const saved = await backend.saveTeamMember({
        id: editingMember.value.id,
        catalogId: catalogId.value,
        email: form.value.email,
        name: form.value.name,
        role: form.value.role,
        status: form.value.status,
        permissions: form.value.permissions,
      })

      const index = members.value.findIndex(member => member.id === saved.id)
      if (index !== -1) {
        members.value[index] = saved
      }
    } else {
      if (teamLimitReached.value) {
        throw new Error('Has alcanzado el limite de miembros de tu plan. Actualiza para invitar mas.')
      }

      const saved = await backend.saveTeamMember({
        catalogId: catalogId.value,
        email: form.value.email,
        name: form.value.name,
        role: form.value.role,
        status: 'pending',
        permissions: form.value.permissions,
        invitedBy: authStore.user?.uid ?? null,
      })

      members.value.unshift(saved)
    }

    closeModal()
  } catch (error) {
    formError.value = error instanceof Error ? error.message : 'Ocurrió un error. Inténtalo nuevamente.'
  } finally {
    saving.value = false
  }
}

const confirmDelete = (member: CatalogTeamMember) => {
  deletingMember.value = member
}

const deleteMember = async () => {
  if (!deletingMember.value) {
    return
  }

  saving.value = true
  try {
    await backend.deleteTeamMember(deletingMember.value.id)
    members.value = members.value.filter(member => member.id !== deletingMember.value?.id)
    deletingMember.value = null
  } catch (error) {
    console.error('Error deleting member:', error)
    formError.value = error instanceof Error ? error.message : 'No se pudo eliminar el miembro.'
  } finally {
    saving.value = false
  }
}

watch(catalogId, async () => {
  await loadMembers()
}, { immediate: true })
</script>
