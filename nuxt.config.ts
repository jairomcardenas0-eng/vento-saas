export default defineNuxtConfig({
  compatibilityDate: '2026-04-18',

  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
    '@nuxtjs/color-mode',
  ],

  ssr: true,
  css: ['~/assets/css/main.css'],
  devtools: { enabled: true },

  runtimeConfig: {
    public: {
      supabaseUrl: process.env.NUXT_PUBLIC_SUPABASE_URL || 'https://eydolnzvwkqwoubbgvjc.supabase.co',
      supabaseAnonKey: process.env.NUXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV5ZG9sbnp2d2txd291YmJndmpjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0OTk5NzgsImV4cCI6MjA5MjA3NTk3OH0.FpFCbPNyLs4KWKpvPAlPE1--X8WCA1_0ifrVJrM0icQ',
    },
  },

  app: {
    head: {
      charset: 'utf-8',
      title: 'Vento — Tu catálogo digital inteligente',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1' },
        { name: 'description', content: 'Vento es la plataforma líder para crear tu escaparate móvil en segundos y gestionar pedidos en tiempo real.' },
        
        // Open Graph / WhatsApp
        { property: 'og:type', content: 'website' },
        { property: 'og:title', content: 'Vento — Tu catálogo digital inteligente' },
        { property: 'og:description', content: 'Crea tu tienda móvil hoy mismo. Gestión de pedidos, analíticas en tiempo real y sistema de referidos integrado.' },
        { property: 'og:image', content: 'https://vento.smartiadigital.com/og-image.png' },
        { property: 'og:url', content: 'https://vento.smartiadigital.com' },
        
        // Twitter
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'twitter:title', content: 'Vento — Tu catálogo digital' },
        { name: 'twitter:description', content: 'La plataforma más potente para digitalizar tu negocio.' },
        { name: 'twitter:image', content: 'https://vento.smartiadigital.com/og-image.png' },

        { 'http-equiv': 'Connection', content: 'keep-alive' },
      ],
      // Preconnect to Supabase so DNS + TLS are resolved before any JS runs
      link: [
        { rel: 'preconnect', href: 'https://eydolnzvwkqwoubbgvjc.supabase.co' },
        { rel: 'dns-prefetch', href: 'https://eydolnzvwkqwoubbgvjc.supabase.co' },
      ],
    },
  },

  colorMode: {
    classSuffix: '',
    fallback: 'light',
    preference: 'system',
  },

  // Vite build optimizations
  vite: {
    build: {
      // Split vendor chunks so the browser can cache them separately
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks: {
            'supabase': ['@supabase/supabase-js'],
          },
        },
      },
    },
    // Optimize dependency pre-bundling in dev
    optimizeDeps: {
      include: ['@supabase/supabase-js'],
    },
  },
})
