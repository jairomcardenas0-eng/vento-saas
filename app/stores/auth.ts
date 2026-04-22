import { defineStore } from 'pinia'
import type { UserProfile } from '~/types/catalog'

let authBootstrapPromise: Promise<void> | null = null
let stopSessionWatcher: (() => void) | null = null
let stopVisibilityRefresh: (() => void) | null = null
let revalidatePromise: Promise<void> | null = null

const bindSessionRefresh = (refresh: () => Promise<void>) => {
  if (import.meta.server || stopVisibilityRefresh) {
    return
  }

  const handleVisibility = () => {
    if (!document.hidden) {
      void refresh()
    }
  }

  const handleFocus = () => {
    void refresh()
  }

  document.addEventListener('visibilitychange', handleVisibility)
  window.addEventListener('focus', handleFocus)

  stopVisibilityRefresh = () => {
    document.removeEventListener('visibilitychange', handleVisibility)
    window.removeEventListener('focus', handleFocus)
    stopVisibilityRefresh = null
  }
}

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

      if (authBootstrapPromise) {
        return authBootstrapPromise
      }

      if (this.initialized && this.user) {
        return
      }

      const backend = useSupabaseBackend()
      this.initializing = true

      const revalidateSession = async (refresh = false) => {
        if (revalidatePromise) {
          return revalidatePromise
        }

        revalidatePromise = (async () => {
          try {
            const profile = await backend.getSessionProfile({ refresh })
            if (profile || !refresh || !this.user) {
              this.user = profile
            }
          } catch {
            if (!refresh) {
              this.user = null
            }
          }
        })()

        try {
          await revalidatePromise
        } finally {
          revalidatePromise = null
        }
      }

      authBootstrapPromise = (async () => {
        try {
          await backend.initPersistence()

          stopSessionWatcher?.()
          stopSessionWatcher = backend.watchSession(async (profile) => {
            this.user = profile
            this.initialized = true
            this.initializing = false
          })

          await revalidateSession()
          this.initialized = true
          this.initializing = false
          bindSessionRefresh(() => revalidateSession(true))
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
      stopSessionWatcher?.()
      stopSessionWatcher = null
      stopVisibilityRefresh?.()
    },
  },
})
