export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) {
    return
  }

  const authStore = useAuthStore()
  await authStore.initAuth()

  const protectedPrefixes = ['/admin', '/onboarding']
  const ownerOnlyPrefixes = ['/master']
  const needsAuth = protectedPrefixes.some(prefix => to.path.startsWith(prefix))
  const needsOwner = ownerOnlyPrefixes.some(prefix => to.path.startsWith(prefix))

  if (needsAuth && !authStore.isAuthenticated) {
    return navigateTo('/login')
  }

  if (needsOwner && !authStore.isAuthenticated) {
    return navigateTo('/login')
  }

  if (needsOwner && !authStore.isOwner) {
    await authStore.logout()
    return navigateTo('/login')
  }

  if (authStore.isOwner && (to.path.startsWith('/admin') || to.path.startsWith('/onboarding'))) {
    return navigateTo('/master')
  }

  if ((to.path === '/login' || to.path === '/register') && authStore.isAuthenticated) {
    if (authStore.isOwner) {
      return navigateTo('/master')
    }

    return navigateTo(authStore.user?.defaultCatalogId ? '/admin' : '/onboarding/create-catalog')
  }
})
