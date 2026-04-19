<template>
  <div v-if="catalog" class="admin-grid">
    <section class="panel-card span-2 space-y-6">
    <!-- Header -->
    <UiSectionHeader
      eyebrow="Equipo"
      title="Gestión de equipo"
      description="Invita colaboradores y define exactamente a qué secciones tienen acceso."
    >
      <template #actions>
        <button class="solid-btn flex items-center gap-2" @click="openInvite">
          <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14m-7-7h14" />
          </svg>
          Invitar miembro
        </button>
      </template>
    </UiSectionHeader>

    <!-- Role legend -->
    <div class="flex flex-wrap gap-3">
      <div v-for="role in roles" :key="role.key" class="flex items-center gap-2 rounded-full border border-zinc-200 dark:border-zinc-800 px-3 py-1.5">
        <span class="inline-block h-2.5 w-2.5 rounded-full" :class="role.dot" />
        <span class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">{{ role.label }}</span>
        <span class="text-xs text-zinc-400">{{ role.desc }}</span>
      </div>
    </div>

    <!-- Search bar -->
    <div class="relative max-w-sm">
      <svg class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <circle cx="11" cy="11" r="8" stroke-width="2" /><line x1="21" y1="21" x2="16.65" y2="16.65" stroke-width="2" />
      </svg>
      <input
        v-model="search"
        type="search"
        placeholder="Buscar por nombre o email..."
        class="w-full rounded-[14px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 pl-9 pr-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
      />
    </div>

    <!-- Loading -->
    <div v-if="loading" class="flex items-center gap-3 py-10 text-zinc-400">
      <svg class="h-5 w-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      Cargando equipo...
    </div>

    <!-- Empty state -->
    <div v-else-if="!filteredMembers.length && !search" class="flex flex-col items-center justify-center rounded-[28px] border-2 border-dashed border-zinc-200 dark:border-zinc-800 py-16 text-center">
      <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800 mb-4">
        <svg class="h-8 w-8 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </div>
      <h3 class="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-1">Sin miembros de equipo</h3>
      <p class="text-sm text-zinc-400 mb-5 max-w-xs">Invita colaboradores para que puedan gestionar el catálogo con los permisos que elijas.</p>
      <button class="solid-btn flex items-center gap-2" @click="openInvite">
        <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14m-7-7h14" />
        </svg>
        Invitar primer miembro
      </button>
    </div>

    <!-- No search results -->
    <div v-else-if="!filteredMembers.length && search" class="py-10 text-center text-sm text-zinc-400">
      No se encontró ningún miembro con "{{ search }}"
    </div>

    <!-- Member list -->
    <div v-else class="space-y-3">
      <article
        v-for="member in filteredMembers"
        :key="member.id"
        class="group rounded-[22px] border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 shadow-sm transition hover:shadow-md"
      >
        <div class="flex items-start gap-4">
          <!-- Avatar -->
          <div class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl text-lg font-bold shadow-sm" :class="roleConfig(member.role).avatarBg">
            {{ initials(member.name) }}
          </div>

          <!-- Info -->
          <div class="flex-1 min-w-0">
            <div class="flex flex-wrap items-center gap-2 mb-0.5">
              <span class="font-bold text-zinc-900 dark:text-zinc-100 text-[15px]">{{ member.name }}</span>
              <span class="rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide" :class="roleConfig(member.role).badge">
                {{ roleConfig(member.role).label }}
              </span>
              <span class="rounded-full px-2.5 py-0.5 text-[11px] font-medium" :class="statusConfig(member.status).cls">
                {{ statusConfig(member.status).label }}
              </span>
            </div>
            <p class="text-sm text-zinc-400 truncate">{{ member.email }}</p>
            <p class="text-[11px] text-zinc-300 dark:text-zinc-600 mt-0.5">
              Desde {{ formatDate(member.createdAt) }}
            </p>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              class="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 transition hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/40 dark:hover:text-blue-400"
              title="Editar"
              @click="openEdit(member)"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              class="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-500 transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
              title="Eliminar"
              @click="confirmDelete(member)"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Permission chips (collapsed) -->
        <div class="mt-3 flex flex-wrap gap-1.5">
          <span
            v-for="perm in activePermissions(member.permissions)"
            :key="perm"
            class="rounded-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-2.5 py-0.5 text-[11px] font-medium text-zinc-600 dark:text-zinc-400"
          >
            {{ perm }}
          </span>
        </div>
      </article>
    </div>

    <!-- ──────────────── MODAL (Invite / Edit) ──────────────── -->
    <Teleport to="body">
      <Transition
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="opacity-0 scale-95"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition duration-150 ease-in"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-95"
      >
        <div v-if="showModal" class="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4">
          <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="closeModal" />

          <form
            class="relative z-10 w-full max-w-lg rounded-[28px] bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden"
            @submit.prevent="saveMember"
          >
            <!-- Modal header -->
            <div class="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 px-6 py-4">
              <h2 class="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                {{ editingMember ? 'Editar miembro' : 'Invitar al equipo' }}
              </h2>
              <button type="button" class="flex h-8 w-8 items-center justify-center rounded-xl text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition" @click="closeModal">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Modal body -->
            <div class="overflow-y-auto max-h-[70vh] px-6 py-5 space-y-5">
              <!-- Basic info -->
              <div class="grid gap-4 sm:grid-cols-2">
                <label class="flex flex-col gap-1.5">
                  <span class="text-xs font-bold uppercase tracking-wide text-zinc-500">Nombre completo</span>
                  <input v-model="form.name" required placeholder="Ej: María García" class="rounded-[12px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20" />
                </label>
                <label class="flex flex-col gap-1.5">
                  <span class="text-xs font-bold uppercase tracking-wide text-zinc-500">Email</span>
                  <input v-model="form.email" type="email" required :disabled="!!editingMember" placeholder="correo@ejemplo.com" class="rounded-[12px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50" />
                </label>
              </div>

              <!-- Role selector -->
              <div>
                <span class="mb-2 block text-xs font-bold uppercase tracking-wide text-zinc-500">Rol del usuario</span>
                <div class="grid grid-cols-3 gap-2">
                  <button
                    v-for="role in roles"
                    :key="role.key"
                    type="button"
                    class="flex flex-col items-center gap-1.5 rounded-[14px] border-2 px-3 py-3 text-center transition-all"
                    :class="form.role === role.key
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                      : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'"
                    @click="applyRole(role.key)"
                  >
                    <span class="inline-block h-3 w-3 rounded-full" :class="role.dot" />
                    <span class="text-[13px] font-bold text-zinc-800 dark:text-zinc-200">{{ role.label }}</span>
                    <span class="text-[10px] text-zinc-400 leading-tight">{{ role.desc }}</span>
                  </button>
                </div>
              </div>

              <!-- Status (edit only) -->
              <div v-if="editingMember">
                <span class="mb-2 block text-xs font-bold uppercase tracking-wide text-zinc-500">Estado</span>
                <select v-model="form.status" class="w-full rounded-[12px] border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2.5 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20">
                  <option value="active">Activo</option>
                  <option value="pending">Pendiente</option>
                  <option value="suspended">Suspendido</option>
                </select>
              </div>

              <!-- Permissions -->
              <div>
                <div class="mb-3 flex items-center justify-between">
                  <span class="text-xs font-bold uppercase tracking-wide text-zinc-500">Permisos personalizados</span>
                  <button type="button" class="text-[11px] text-blue-500 hover:underline" @click="toggleAllPerms">
                    {{ allPermsEnabled ? 'Quitar todos' : 'Activar todos' }}
                  </button>
                </div>
                <div class="grid gap-2 sm:grid-cols-2">
                  <label
                    v-for="perm in permDefs"
                    :key="perm.key"
                    class="flex cursor-pointer items-center gap-3 rounded-[12px] border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50 dark:bg-zinc-900/60 px-3 py-2.5 transition hover:border-zinc-200 dark:hover:border-zinc-700"
                  >
                    <div class="relative flex-shrink-0">
                      <input
                        type="checkbox"
                        :checked="form.permissions[perm.key as keyof TeamMemberPermissions]"
                        class="peer sr-only"
                        @change="togglePerm(perm.key)"
                      />
                      <div class="h-5 w-5 rounded-full border-2 border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 peer-checked:border-blue-500 peer-checked:bg-blue-500 transition-all flex items-center justify-center">
                        <svg class="h-3 w-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" stroke="currentColor" stroke-width="3" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                    <div class="flex-1 min-w-0">
                      <p class="text-[12px] font-semibold text-zinc-800 dark:text-zinc-200 leading-tight">{{ perm.label }}</p>
                      <p class="text-[10px] text-zinc-400 leading-tight">{{ perm.desc }}</p>
                    </div>
                  </label>
                </div>
              </div>

              <p v-if="formError" class="rounded-[10px] bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 px-3 py-2 text-sm text-rose-600 dark:text-rose-400">
                {{ formError }}
              </p>
            </div>

            <!-- Modal footer -->
            <div class="flex items-center justify-between gap-3 border-t border-zinc-100 dark:border-zinc-800 px-6 py-4">
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

    <!-- Delete confirm modal -->
    <Teleport to="body">
      <Transition enter-active-class="transition duration-150" enter-from-class="opacity-0" enter-to-class="opacity-100" leave-active-class="transition duration-100" leave-from-class="opacity-100" leave-to-class="opacity-0">
        <div v-if="deletingMember" class="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="deletingMember = null" />
          <div class="relative z-10 w-full max-w-sm rounded-[22px] bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-6 shadow-2xl">
            <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 dark:bg-rose-950/40 mb-4">
              <svg class="h-6 w-6 text-rose-600 dark:text-rose-400" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 class="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-1">Eliminar miembro</h3>
            <p class="text-sm text-zinc-500 mb-5">
              ¿Eliminar a <strong class="text-zinc-800 dark:text-zinc-200">{{ deletingMember.name }}</strong>? Esta acción no se puede deshacer y perderá acceso inmediatamente.
            </p>
            <div class="flex gap-3">
              <button class="flex-1 ghost-btn" @click="deletingMember = null">Cancelar</button>
              <button class="flex-1 rounded-[14px] bg-rose-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-rose-700 transition" :disabled="saving" @click="deleteMember">
                {{ saving ? 'Eliminando...' : 'Sí, eliminar' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
    </section>
  </div>

  <div v-else class="admin-grid">
    <section class="panel-card span-2">
      <div class="rounded-[20px] border border-dashed border-zinc-300 px-6 py-10 text-center dark:border-zinc-700">
        <h3 class="text-lg font-semibold text-zinc-900 dark:text-zinc-100">No hay un catálogo activo</h3>
        <p class="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Selecciona un catálogo para gestionar tu equipo.
        </p>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { CatalogTeamMember, TeamMemberRole, TeamMemberStatus, TeamMemberPermissions } from '~/types/catalog'

definePageMeta({ layout: 'admin' })

// ─── Supabase ─────────────────────────────────────────────────────────────────
const supabase = useSupabaseClient()
const catalogStore = useCatalogStore()
const authStore = useAuthStore()
const catalog = computed(() => catalogStore.activeCatalog)
const catalogId = computed(() => catalogStore.activeCatalog?.id ?? '')

// ─── State ────────────────────────────────────────────────────────────────────
const members = ref<CatalogTeamMember[]>([])
const loading = ref(true)
const search = ref('')
const showModal = ref(false)
const saving = ref(false)
const formError = ref('')
const editingMember = ref<CatalogTeamMember | null>(null)
const deletingMember = ref<CatalogTeamMember | null>(null)

// ─── Role definitions ─────────────────────────────────────────────────────────
const roles = [
  { key: 'admin' as TeamMemberRole,  label: 'Administrador', desc: 'Acceso casi total', dot: 'bg-violet-500' },
  { key: 'editor' as TeamMemberRole, label: 'Editor',        desc: 'Edita productos y pedidos', dot: 'bg-blue-500' },
  { key: 'viewer' as TeamMemberRole, label: 'Lector',        desc: 'Solo lectura', dot: 'bg-zinc-400' },
]

const rolePermMap: Record<TeamMemberRole, Partial<TeamMemberPermissions>> = {
  admin:  { viewOrders: true, manageOrders: true, viewProducts: true, manageProducts: true, viewReviews: true, manageReviews: true, viewCoupons: true, manageCoupons: true, viewStats: true, viewSettings: true },
  editor: { viewOrders: true, manageOrders: true, viewProducts: true, manageProducts: true, viewReviews: true, manageReviews: false, viewCoupons: true, manageCoupons: false, viewStats: true, viewSettings: false },
  viewer: { viewOrders: true, manageOrders: false, viewProducts: true, manageProducts: false, viewReviews: true, manageReviews: false, viewCoupons: false, manageCoupons: false, viewStats: true, viewSettings: false },
}

const roleConfig = (role: TeamMemberRole) => ({
  admin:  { label: 'Administrador', badge: 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300', avatarBg: 'bg-gradient-to-br from-violet-400 to-purple-600 text-white' },
  editor: { label: 'Editor', badge: 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300', avatarBg: 'bg-gradient-to-br from-blue-400 to-indigo-500 text-white' },
  viewer: { label: 'Lector', badge: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400', avatarBg: 'bg-gradient-to-br from-zinc-300 to-zinc-500 text-white' },
}[role])

const statusConfig = (status: TeamMemberStatus) => ({
  active:    { label: 'Activo',     cls: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' },
  pending:   { label: 'Pendiente',  cls: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800' },
  suspended: { label: 'Suspendido', cls: 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800' },
}[status])

// ─── Permission definitions ───────────────────────────────────────────────────
const permDefs = [
  { key: 'viewOrders',      label: 'Ver pedidos',         desc: 'Consulta el historial de órdenes' },
  { key: 'manageOrders',    label: 'Gestionar pedidos',   desc: 'Cambia estados y detalles' },
  { key: 'viewProducts',    label: 'Ver productos',       desc: 'Consulta el catálogo' },
  { key: 'manageProducts',  label: 'Gestionar productos', desc: 'Crear, editar y eliminar' },
  { key: 'viewReviews',     label: 'Ver reseñas',         desc: 'Consulta valoraciones' },
  { key: 'manageReviews',   label: 'Moderar reseñas',     desc: 'Aprobar y responder' },
  { key: 'viewCoupons',     label: 'Ver cupones',         desc: 'Consulta descuentos' },
  { key: 'manageCoupons',   label: 'Gestionar cupones',   desc: 'Crear y editar descuentos' },
  { key: 'viewStats',       label: 'Ver estadísticas',    desc: 'Dashboard de métricas' },
  { key: 'viewSettings',    label: 'Ver ajustes',         desc: 'Consulta configuración general' },
]

// ─── Form state ───────────────────────────────────────────────────────────────
const defaultPerms = (): TeamMemberPermissions => ({
  viewOrders: false, manageOrders: false,
  viewProducts: true, manageProducts: false,
  viewReviews: false, manageReviews: false,
  viewCoupons: false, manageCoupons: false,
  viewStats: true, viewSettings: false,
})

const form = ref({
  name: '',
  email: '',
  role: 'viewer' as TeamMemberRole,
  status: 'pending' as TeamMemberStatus,
  permissions: defaultPerms(),
})

// ─── Computed ─────────────────────────────────────────────────────────────────
const filteredMembers = computed(() => {
  const q = search.value.toLowerCase().trim()
  if (!q) return members.value
  return members.value.filter(m =>
    m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
  )
})

const allPermsEnabled = computed(() =>
  Object.values(form.value.permissions).every(Boolean)
)

// ─── Helpers ──────────────────────────────────────────────────────────────────
const initials = (name: string) =>
  name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })

const activePermissions = (perms: TeamMemberPermissions) =>
  permDefs.filter(p => perms[p.key as keyof TeamMemberPermissions]).map(p => p.label)

// ─── Load members ─────────────────────────────────────────────────────────────
const loadMembers = async () => {
  if (!catalogId.value) {
    members.value = []
    loading.value = false
    return
  }
  loading.value = true
  try {
    const { data, error } = await supabase
      .from('catalog_team_members')
      .select('*')
      .eq('catalog_id', catalogId.value)
      .order('created_at', { ascending: false })

    if (error) throw error
    members.value = (data ?? []).map(r => ({
      id: r.id,
      catalogId: r.catalog_id,
      email: r.email,
      name: r.name,
      role: r.role,
      permissions: r.permissions,
      status: r.status,
      invitedBy: r.invited_by,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }))
  } catch (e) {
    console.error('Error loading team:', e)
  } finally {
    loading.value = false
  }
}

// ─── Modal actions ────────────────────────────────────────────────────────────
const openInvite = () => {
  editingMember.value = null
  form.value = { name: '', email: '', role: 'viewer', status: 'pending', permissions: defaultPerms() }
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

const togglePerm = (key: string) => {
  const k = key as keyof TeamMemberPermissions
  form.value.permissions[k] = !form.value.permissions[k]
}

const toggleAllPerms = () => {
  const all = !allPermsEnabled.value
  Object.keys(form.value.permissions).forEach(k => {
    form.value.permissions[k as keyof TeamMemberPermissions] = all
  })
}

// ─── Save / Delete ────────────────────────────────────────────────────────────
const saveMember = async () => {
  if (!catalogId.value) return
  formError.value = ''
  saving.value = true

  try {
    if (editingMember.value) {
      // Update
      const { error } = await supabase
        .from('catalog_team_members')
        .update({
          name: form.value.name.trim(),
          role: form.value.role,
          status: form.value.status,
          permissions: form.value.permissions,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingMember.value.id)

      if (error) throw error

      const idx = members.value.findIndex(m => m.id === editingMember.value!.id)
      if (idx !== -1) {
        members.value[idx] = {
          ...members.value[idx],
          name: form.value.name.trim(),
          role: form.value.role,
          status: form.value.status,
          permissions: { ...form.value.permissions },
          updatedAt: new Date().toISOString(),
        }
      }
    } else {
      // Insert
      const { data, error } = await supabase
        .from('catalog_team_members')
        .insert({
          catalog_id: catalogId.value,
          email: form.value.email.trim().toLowerCase(),
          name: form.value.name.trim(),
          role: form.value.role,
          status: 'pending',
          permissions: form.value.permissions,
          invited_by: authStore.user?.uid ?? null,
        })
        .select()
        .single()

      if (error) {
        if (error.code === '23505') throw new Error('Este email ya es miembro del equipo.')
        throw error
      }

      members.value.unshift({
        id: data.id,
        catalogId: data.catalog_id,
        email: data.email,
        name: data.name,
        role: data.role,
        permissions: data.permissions,
        status: data.status,
        invitedBy: data.invited_by,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      })
    }

    closeModal()
  } catch (e: any) {
    formError.value = e.message ?? 'Ocurrió un error. Inténtalo de nuevo.'
  } finally {
    saving.value = false
  }
}

const confirmDelete = (member: CatalogTeamMember) => {
  deletingMember.value = member
}

const deleteMember = async () => {
  if (!deletingMember.value) return
  saving.value = true
  try {
    const { error } = await supabase
      .from('catalog_team_members')
      .delete()
      .eq('id', deletingMember.value.id)

    if (error) throw error
    members.value = members.value.filter(m => m.id !== deletingMember.value!.id)
    deletingMember.value = null
  } catch (e) {
    console.error('Error deleting member:', e)
  } finally {
    saving.value = false
  }
}

// ─── Init ─────────────────────────────────────────────────────────────────────
watch(catalogId, loadMembers, { immediate: true })
</script>
