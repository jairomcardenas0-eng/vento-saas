import type { CatalogAccessProfile, TeamMemberPermissions } from '~/types/catalog'

export type AdminRoutePermission = keyof TeamMemberPermissions | 'ownerOnly'

const defaultPermissions = (): TeamMemberPermissions => ({
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

const routePermissionMatchers: Array<{ match: RegExp, requirement: AdminRoutePermission | null }> = [
  { match: /^\/admin$/, requirement: 'viewStats' },
  { match: /^\/admin\/orders(?:\/|$)/, requirement: 'viewOrders' },
  { match: /^\/admin\/reviews(?:\/|$)/, requirement: 'viewReviews' },
  { match: /^\/admin\/catalog(?:\/|$)/, requirement: 'viewProducts' },
  { match: /^\/admin\/products(?:\/|$)/, requirement: 'viewProducts' },
  { match: /^\/admin\/categories(?:\/|$)/, requirement: 'viewProducts' },
  { match: /^\/admin\/inventory(?:\/|$)/, requirement: 'viewInventory' },
  { match: /^\/admin\/coupons(?:\/|$)/, requirement: 'viewCoupons' },
  { match: /^\/admin\/team(?:\/|$)/, requirement: 'ownerOnly' },
  { match: /^\/admin\/(settings|schedule|delivery|pickup|checkout|appearance|share|referrals)(?:\/|$)/, requirement: 'viewSettings' },
]

export const createOwnerAccessProfile = (catalogId: string): CatalogAccessProfile => ({
  catalogId,
  isOwner: true,
  role: 'admin',
  permissions: {
    viewOrders: true,
    manageOrders: true,
    viewProducts: true,
    manageProducts: true,
    viewInventory: true,
    manageInventory: true,
    viewReviews: true,
    manageReviews: true,
    viewCoupons: true,
    manageCoupons: true,
    viewStats: true,
    viewSettings: true,
  },
})

export const normalizeTeamPermissions = (value?: Partial<TeamMemberPermissions> | null): TeamMemberPermissions => ({
  ...defaultPermissions(),
  ...(value || {}),
})

export const getAdminRouteRequirement = (path: string): AdminRoutePermission | null => {
  const matched = routePermissionMatchers.find(entry => entry.match.test(path))
  return matched?.requirement ?? null
}

export const hasAdminRouteAccess = (path: string, access?: CatalogAccessProfile | null): boolean => {
  if (!path.startsWith('/admin')) {
    return true
  }

  if (!access) {
    return false
  }

  const requirement = getAdminRouteRequirement(path)
  if (!requirement) {
    return access.isOwner || access.role === 'admin'
  }

  if (requirement === 'ownerOnly') {
    return access.isOwner
  }

  return access.isOwner || access.permissions[requirement] === true
}
