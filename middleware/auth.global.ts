export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) {
    return
  }

  const authStore = useAuthStore()
  const catalogStore = useCatalogStore()

  const isAdminRoute = to.path.startsWith('/admin')
  const isMasterRoute = to.path.startsWith('/master')
  const isAuthRoute = to.path === '/login' || to.path === '/register'

  if (!isAdminRoute && !isMasterRoute && !isAuthRoute) {
    return
  }

  await authStore.initAuth()

  if (!authStore.user) {
    if (isAdminRoute || isMasterRoute) {
      return navigateTo('/login')
    }
    return
  }

  if (isAuthRoute) {
    return navigateTo(authStore.user.systemRole === 'owner'
      ? '/master'
      : (authStore.user.defaultCatalogId ? '/admin' : '/onboarding/create-catalog'))
  }

  if (isMasterRoute && authStore.user.systemRole !== 'owner') {
    return navigateTo(authStore.user.defaultCatalogId ? '/admin' : '/onboarding/create-catalog')
  }

  if (!isAdminRoute) {
    return
  }

  await catalogStore.ensureAccessForUser(authStore.user)

  const targetCatalogId = catalogStore.activeCatalogId || authStore.user.defaultCatalogId
  if (!targetCatalogId) {
    return navigateTo('/onboarding/create-catalog')
  }

  if (!catalogStore.activeCatalogId) {
    await catalogStore.setActiveCatalog(targetCatalogId)
  }

  if (!catalogStore.hasRouteAccess(to.path, targetCatalogId)) {
    const fallbackPath = [
      '/admin',
      '/admin/orders',
      '/admin/reviews',
      '/admin/catalog',
      '/admin/coupons',
      '/admin/settings',
    ].find(path => catalogStore.hasRouteAccess(path, targetCatalogId))

    return navigateTo(fallbackPath || '/login')
  }
})
