import type { CatalogAccessProfile, CatalogRecord, UserProfile } from '~/types/catalog'
import type { AdminBootstrapPayload } from './types'
import type {
  BackendAuthChangeEvent,
  BackendAuthUser,
  BackendSession,
  BackendSupabaseClient,
  CatalogAccessRow,
  CatalogHeaderRow,
  EnsureSuccess,
} from './types'
import { createOwnerAccessProfile, normalizeTeamPermissions } from '~/utils/adminAccess'

interface CreateSupabaseAuthBackendOptions {
  supabase: BackendSupabaseClient
  ensureSuccess: EnsureSuccess
  ensureUserProfile: (authUser: BackendAuthUser) => Promise<UserProfile>
  catalogSelect: string
  mapRowToCatalogRecord: (
    row: CatalogHeaderRow,
    categories: CatalogRecord['categories'],
    products: CatalogRecord['products'],
    reviews: CatalogRecord['reviews'],
    orders: CatalogRecord['orders'],
  ) => CatalogRecord
  mapAccessRowToProfile: (row: CatalogAccessRow) => CatalogAccessProfile
}

export const createSupabaseAuthBackend = ({
  supabase,
  ensureSuccess,
  ensureUserProfile,
  catalogSelect,
  mapRowToCatalogRecord,
  mapAccessRowToProfile,
}: CreateSupabaseAuthBackendOptions) => ({
  async initPersistence() {},
  async getSessionProfile(options?: { refresh?: boolean }) {
    const shouldRefresh = options?.refresh === true
    const {
      data: { session: cachedSession },
      error: cachedSessionError,
    } = await supabase.auth.getSession()

    ensureSuccess(cachedSessionError, 'No se pudo restaurar la sesion')

    if (!cachedSession?.user) {
      return null
    }

    if (!shouldRefresh) {
      return ensureUserProfile(cachedSession.user)
    }

    try {
      const {
        data: { session: refreshedSession },
        error: refreshError,
      } = await supabase.auth.refreshSession()

      ensureSuccess(refreshError, 'No se pudo refrescar la sesion')
      return ensureUserProfile(refreshedSession?.user || cachedSession.user)
    } catch {
      return ensureUserProfile(cachedSession.user)
    }
  },
  watchSession(callback: (profile: UserProfile | null) => Promise<void> | void) {
    supabase.auth.getSession()
      .then(async ({ data }: { data: { session: BackendSession } }) => {
        const session = data.session
        if (!session?.user) {
          await callback(null)
          return
        }

        await callback(await ensureUserProfile(session.user))
      })
      .catch(async () => {
        await callback(null)
      })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: BackendAuthChangeEvent, session: BackendSession) => {
      try {
        if (event === 'SIGNED_OUT') {
          await callback(null)
          return
        }

        if (!session?.user) {
          const { data } = await supabase.auth.getSession()
          if (!data.session?.user) {
            await callback(null)
            return
          }

          await callback(await ensureUserProfile(data.session.user))
          return
        }

        await callback(await ensureUserProfile(session.user))
      } catch {
        await callback(null)
      }
    })

    return () => subscription.unsubscribe()
  },
  async login(email: string, password: string) {
    console.log('[auth] login: signInWithPassword start')
    const signInPromise = supabase.auth.signInWithPassword({ email, password })
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Tiempo de espera agotado. Revisa tu conexion a internet.')), 10000),
    )
    const signInResult = await Promise.race([signInPromise, timeoutPromise]) as Awaited<ReturnType<BackendSupabaseClient['auth']['signInWithPassword']>>
    const { data, error } = signInResult
    console.log('[auth] login: signInWithPassword done', { hasUser: !!data?.user, error })
    ensureSuccess(error, 'Correo o contrasena incorrectos')
    if (!data?.user) {
      throw new Error('No se recibio informacion del usuario')
    }
    console.log('[auth] login: ensureUserProfile start')
    const profile = await ensureUserProfile(data.user)
    console.log('[auth] login: ensureUserProfile done', profile)
    return profile
  },
  async register(displayName: string, email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName.trim(),
        },
      },
    })

    ensureSuccess(error, 'No se pudo crear la cuenta')
    if (!data.user) {
      throw new Error('Supabase no devolvio el usuario recien creado')
    }
    return ensureUserProfile(data.user)
  },
  async logout() {
    const { error } = await supabase.auth.signOut()
    ensureSuccess(error, 'No se pudo cerrar sesion')
  },
  async saveUser(profile: UserProfile) {
    const { error } = await supabase.from('user_profiles').upsert({
      uid: profile.uid,
      email: profile.email,
      display_name: profile.displayName,
      default_catalog_id: profile.defaultCatalogId,
      system_role: profile.systemRole,
      created_at: profile.createdAt,
    })

    ensureSuccess(error, 'No se pudo guardar el usuario')
  },
  async getCatalogsByOwner(ownerUid: string) {
    const { data, error } = await supabase
      .from('catalogs')
      .select(catalogSelect)
      .eq('owner_uid', ownerUid)
      .order('created_at', { ascending: false })

    ensureSuccess(error, 'No se pudieron cargar los catalogos del propietario')
    return ((data || []) as unknown as CatalogHeaderRow[]).map((row) => mapRowToCatalogRecord(row, [], [], [], []))
  },
  async getAdminBootstrap(): Promise<AdminBootstrapPayload> {
    const { data, error } = await supabase.rpc('get_admin_bootstrap')
    ensureSuccess(error, 'No se pudo cargar el arranque del panel')

    const catalogs = Array.isArray(data?.catalogs)
      ? (data.catalogs as unknown as CatalogHeaderRow[]).map((row) => mapRowToCatalogRecord(row, [], [], [], []))
      : []

    const accessByCatalogId = Array.isArray(data?.access)
      ? (data.access as unknown as CatalogAccessRow[]).reduce((acc: Record<string, CatalogAccessProfile>, row) => {
        const access = mapAccessRowToProfile(row)
        if (access.catalogId) {
          acc[access.catalogId] = access
        }
        return acc
      }, {})
      : {}

    return {
      catalogs,
      accessByCatalogId,
      activeCatalogId: typeof data?.activeCatalogId === 'string' ? data.activeCatalogId : null,
    }
  },
  async getTeamMemberships(email: string): Promise<CatalogAccessProfile[]> {
    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) {
      return []
    }

    const { data, error } = await supabase
      .from('catalog_team_members')
      .select('catalog_id, role, permissions, status')
      .eq('email', normalizedEmail)
      .eq('status', 'active')

    ensureSuccess(error, 'No se pudo cargar el acceso de equipo')

    return (data || []).map((row: { catalog_id: string, role?: CatalogAccessProfile['role'], permissions?: CatalogAccessProfile['permissions'] | null }) => ({
      catalogId: row.catalog_id,
      isOwner: false,
      role: row.role || null,
      permissions: normalizeTeamPermissions(row.permissions || {}),
    }))
  },
  async getCatalogAccess(catalogId: string, user?: { uid?: string | null, email?: string | null }): Promise<CatalogAccessProfile | null> {
    if (!catalogId) {
      return null
    }

    if (user?.uid) {
      const { data: ownedCatalog, error } = await supabase
        .from('catalogs')
        .select('id')
        .eq('id', catalogId)
        .eq('owner_uid', user.uid)
        .maybeSingle()

      ensureSuccess(error, 'No se pudo validar el acceso al catalogo')
      if (ownedCatalog?.id) {
        return createOwnerAccessProfile(catalogId)
      }
    }

    const normalizedEmail = String(user?.email || '').trim().toLowerCase()
    if (!normalizedEmail) {
      return null
    }

    const { data, error } = await supabase
      .from('catalog_team_members')
      .select('catalog_id, role, permissions, status')
      .eq('catalog_id', catalogId)
      .eq('email', normalizedEmail)
      .eq('status', 'active')
      .maybeSingle()

    ensureSuccess(error, 'No se pudo validar el acceso del equipo')
    if (!data?.catalog_id) {
      return null
    }

    return {
      catalogId: data.catalog_id,
      isOwner: false,
      role: data.role || null,
      permissions: normalizeTeamPermissions(data.permissions || {}),
    }
  },
})
