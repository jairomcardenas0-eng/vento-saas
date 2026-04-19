// Middleware: detecta ?ref=CODIGO en la URL y lo persiste en una cookie de 30 días
// Así si alguien comparte el link y el visitante navega antes de registrarse, igual queda registrado

export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.server) return

  const refCode = to.query.ref as string | undefined
  if (!refCode || typeof refCode !== 'string' || !refCode.trim()) return

  const refCookie = useCookie('_ref_code', {
    maxAge: 60 * 60 * 24 * 30, // 30 días
    sameSite: 'lax',
    path: '/',
  })

  // Solo lo guarda si todavía no había uno (el primer link gana)
  if (!refCookie.value) {
    refCookie.value = refCode.trim().toUpperCase()
  }
})
