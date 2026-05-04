// Middleware: detecta ?ref=CODIGO en la URL y lo persiste en una cookie de 30 días
// Así si alguien comparte el link y el visitante navega antes de registrarse, igual queda registrado

export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.server) return

  const rawRef = to.query.ref
  if (!rawRef || typeof rawRef !== 'string') return

  const refCode = rawRef.trim()
  if (!refCode) return

  // Validar formato: alfanumérico, guiones, guiones bajos; máximo 20 caracteres
  if (!/^[A-Z0-9_-]{1,20}$/i.test(refCode)) return

  const refCookie = useCookie('_ref_code', {
    maxAge: 60 * 60 * 24 * 30, // 30 días
    sameSite: 'lax',
    path: '/',
  })

  // Solo lo guarda si todavía no había uno (el primer link gana)
  if (!refCookie.value) {
    refCookie.value = refCode.toUpperCase()
  }
})
