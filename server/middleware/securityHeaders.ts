const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https:",
  "style-src 'self' 'unsafe-inline' https:",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "connect-src 'self' https: wss:",
  "manifest-src 'self'",
  "form-action 'self' https://wa.me https://api.whatsapp.com",
].join('; ')

export default defineEventHandler((event) => {
  setHeader(event, 'Content-Security-Policy', CONTENT_SECURITY_POLICY)
  setHeader(event, 'X-Frame-Options', 'DENY')
  setHeader(event, 'X-Content-Type-Options', 'nosniff')
  setHeader(event, 'Referrer-Policy', 'strict-origin-when-cross-origin')
  setHeader(event, 'Permissions-Policy', 'camera=(), geolocation=(), microphone=()')
})
