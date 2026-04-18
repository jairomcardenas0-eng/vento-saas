import { defineStore } from 'pinia'
import type { UserProfile } from '~/types/catalog'

let authBootstrapPromise: Promise<void> | null = null
let stopSessionWatcher: (() => void) | null = null
const AUTH_INIT_TIMEOUT_MS = 4000
const AUTH_REQUEST_TIMEOUT_MS = 8000

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as UserProfile | null,
    loading: false,
    initializing: false,
    initialized: false,
  }),
  getters: {
    isAuthenticated: state => Boolean(state.user),
    isOwner: state => state.user?.systemRole === 'owner',
    displayName: state => state.user?.displayName || 'Invitado',
  },
  actions: {
    async initAuth() {
      if (import.meta.server) {
        this.initialized = true
        return
      }

      if (this.initialized && authBootstrapPromise) {
        return authBootstrapPromise
      }

      if (authBootstrapPromise) {
        return authBootstrapPromise
      }

      const backend = useSupabaseBackend()
      this.initializing = true

      authBootstrapPromise = (async () => {
        try {
          await backend.initPersistence()

          await Promise.race([
            new Promise<void>((resolve) => {
              let resolved = false

              stopSessionWatcher?.()
              stopSessionWatcher = backend.watchSession(async (profile) => {
                this.user = profile
                this.initialized = true
                this.initializing = false

                if (!resolved) {
                  resolved = true
                  resolve()
                }
              })
            }),
            new Promise<void>((resolve) => {
              setTimeout(() => {
                this.initialized = true
                this.initializing = false
                resolve()
              }, AUTH_INIT_TIMEOUT_MS)
            }),
          ])
        } catch {
          this.user = null
          this.initialized = true
          this.initializing = false
        }
      })()

      return authBootstrapPromise
    },
    async login(email: string, password: string) {
      this.loading = true
      try {
        const backend = useSupabaseBackend()
        const user = await backend.login(email, password)
        this.user = user
        return user
      } finally {
        this.loading = false
      }
    },
    async register(displayName: string, email: string, password: string) {
      this.loading = true
      try {
        const backend = useSupabaseBackend()
        const user = await backend.register(displayName, email, password)
        this.user = user
        return user
      } finally {
        this.loading = false
      }
    },
    async setDefaultCatalog(catalogId: string) {
      if (!this.user) {
        return
      }

      this.user.defaultCatalogId = catalogId
      const backend = useSupabaseBackend()
      await backend.saveUser(this.user)
    },
    async logout() {
      const backend = useSupabaseBackend()
      await backend.logout()
      this.user = null
      authBootstrapPromise = null
    },
  },
})
