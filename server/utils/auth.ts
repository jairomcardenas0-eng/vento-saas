import type { H3Event } from 'h3'
import { createSupabaseServerClient } from './supabase'

export type TeamPermission =
  | 'viewOrders'
  | 'manageOrders'
  | 'viewProducts'
  | 'manageProducts'
  | 'viewInventory'
  | 'manageInventory'
  | 'viewReviews'
  | 'manageReviews'
  | 'viewCoupons'
  | 'manageCoupons'
  | 'viewStats'
  | 'viewSettings'

export interface CatalogAccessResult {
  userId: string
  email: string
  catalogId: string
  isOwner: boolean
  role: 'owner' | 'admin' | 'editor' | 'viewer'
  permissions: Record<TeamPermission, boolean>
}

const defaultPermissions = (): Record<TeamPermission, boolean> => ({
  viewOrders: false,
  manageOrders: false,
  viewProducts: false,
  manageProducts: false,
  viewInventory: false,
  manageInventory: false,
  viewReviews: false,
  manageReviews: false,
  viewCoupons: false,
  manageCoupons: false,
  viewStats: false,
  viewSettings: false,
})

export const requireAuth = async (event: H3Event) => {
  const token = getHeader(event, 'authorization')?.replace(/^Bearer\s+/i, '')
    || getCookie(event, 'sb-access-token')
    || getCookie(event, 'sb-refresh-token')

  if (!token) {
    throw createError({ statusCode: 401, statusMessage: 'Autenticacion requerida' })
  }

  const supabase = createSupabaseServerClient(event)
  const { data, error } = await supabase.auth.getUser(token)

  if (error || !data.user) {
    throw createError({ statusCode: 401, statusMessage: 'Sesion invalida o expirada' })
  }

  return { userId: data.user.id, email: data.user.email || '' }
}

export const requireCatalogAccess = async (
  event: H3Event,
  catalogId: string,
  requiredPermission?: TeamPermission,
): Promise<CatalogAccessResult> => {
  const { userId, email } = await requireAuth(event)

  const supabase = createSupabaseServerClient(event)

  // Verificar si es owner del catalogo
  const { data: catalog, error: catalogError } = await supabase
    .from('catalogs')
    .select('id, owner_uid')
    .eq('id', catalogId)
    .maybeSingle()

  if (catalogError || !catalog) {
    throw createError({ statusCode: 404, statusMessage: 'Catalogo no encontrado' })
  }

  if (catalog.owner_uid === userId) {
    return {
      userId,
      email,
      catalogId,
      isOwner: true,
      role: 'owner',
      permissions: defaultPermissions(),
    }
  }

  // Verificar si es miembro del equipo con permisos
  const { data: member, error: memberError } = await supabase
    .from('catalog_team_members')
    .select('role, permissions, status')
    .eq('catalog_id', catalogId)
    .eq('email', email)
    .maybeSingle()

  if (memberError) {
    throw createError({ statusCode: 500, statusMessage: 'Error al verificar permisos de equipo' })
  }

  if (!member || member.status !== 'active') {
    throw createError({ statusCode: 403, statusMessage: 'No tienes acceso a este catalogo' })
  }

  const permissions = { ...defaultPermissions(), ...(member.permissions || {}) }

  if (requiredPermission && !permissions[requiredPermission]) {
    throw createError({ statusCode: 403, statusMessage: `No tienes permiso para ${requiredPermission}` })
  }

  return {
    userId,
    email,
    catalogId,
    isOwner: false,
    role: member.role as CatalogAccessResult['role'],
    permissions,
  }
}

export const requireOwnerAccess = async (event: H3Event, catalogId: string): Promise<CatalogAccessResult> => {
  const access = await requireCatalogAccess(event, catalogId)

  if (!access.isOwner) {
    throw createError({ statusCode: 403, statusMessage: 'Solo el dueno puede realizar esta accion' })
  }

  return access
}
