const supabaseUrl = process.env.NUXT_PUBLIC_SUPABASE_URL || ''
const supabaseOrigin = (() => {
  try {
    return supabaseUrl ? new URL(supabaseUrl).origin : ''
  } catch {
    return ''
  }
})()

const preconnectLinks = supabaseOrigin
  ? [
      { rel: 'preconnect', href: supabaseOrigin },
      { rel: 'dns-prefetch', href: supabaseOrigin },
    ]
  : []

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "img-src 'self' data: blob: https://*.supabase.co https:",
  "font-src 'self' data: https:",
  "style-src 'self' 'unsafe-inline' https:",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "connect-src 'self' https://*.supabase.co https://api.upstash.com https: wss:",
  "manifest-src 'self'",
  "form-action 'self' https://wa.me https://api.whatsapp.com",
].join('; ')

export default defineNuxtConfig({
  compatibilityDate: '2026-04-18',

  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
    '@nuxtjs/color-mode',
  ],

  ssr: true,
  css: ['~/assets/css/main.css'],
  devtools: { enabled: process.env.NUXT_DEVTOOLS === 'true' },

  runtimeConfig: {
    private: {
      supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
      upstashRedisRestUrl: process.env.UPSTASH_REDIS_REST_URL || '',
      upstashRedisRestToken: process.env.UPSTASH_REDIS_REST_TOKEN || '',
      sentryDsn: process.env.SENTRY_DSN || '',
      sentryEnvironment: process.env.SENTRY_ENVIRONMENT || 'dev',
      jobSecret: process.env.JOB_SECRET || '',
    },
    public: {
      supabaseUrl,
      supabaseAnonKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY || '',
      sentryDsn: process.env.NUXT_PUBLIC_SENTRY_DSN || '',
      sentryEnvironment: process.env.NUXT_PUBLIC_SENTRY_ENVIRONMENT || 'dev',
    },
  },

  app: {
    head: {
      charset: 'utf-8',
      title: 'Vento - Tu catálogo digital inteligente',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1' },
        { name: 'description', content: 'Vento es la plataforma líder para crear tu escaparate móvil en segundos y gestionar pedidos en tiempo real.' },
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: 'Vento - Tu catálogo digital inteligente' },
        { property: 'og:description', content: 'Crea tu tienda móvil hoy mismo. Gestión de pedidos, analíticas en tiempo real y sistema de referidos integrado.' },
        { property: 'og:image', content: 'https://vento.smartiadigital.com/og-image.png' },
        { property: 'og:url', content: 'https://vento.smartiadigital.com' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'Vento - Tu catálogo digital' },
        { name: 'twitter:description', content: 'La plataforma más potente para digitalizar tu negocio.' },
        { name: 'twitter:image', content: 'https://vento.smartiadigital.com/og-image.png' },
      ],
      link: preconnectLinks,
    },
  },

  nitro: {
    routeRules: {
      '/**': {
        headers: {
          'Content-Security-Policy': contentSecurityPolicy,
          'X-Frame-Options': 'DENY',
          'X-Content-Type-Options': 'nosniff',
          'Referrer-Policy': 'strict-origin-when-cross-origin',
        },
      },
      '/b/**': {
        isr: 60,
        headers: {
          'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
        },
      },
      '/api/storefront/**': {
        headers: {
          'Cache-Control': 'public, max-age=5, stale-while-revalidate=300',
        },
      },
    },
  },

  colorMode: {
    classSuffix: '',
    fallback: 'light',
    preference: 'system',
  },

  vite: {
    build: {
      sourcemap: true,
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            supabase: ['@supabase/supabase-js'],
          },
        },
      },
    },
    optimizeDeps: {
      include: ['@supabase/supabase-js'],
    },
  },
})
