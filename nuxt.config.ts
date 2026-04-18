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
      title: 'Plataforma SaaS Central',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1' },
      ],
    },
  },

  colorMode: {
    classSuffix: '',
    fallback: 'light',
    preference: 'system',
  },
})
