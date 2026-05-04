import { defineStore } from 'pinia'
import type { AdminNotificationSnapshot } from '~/composables/backend/notifications'

type NotificationSeverity = 'neutral' | 'attention' | 'success'

export interface AdminNotificationBadge {
  count: number
  label: string
  severity: NotificationSeverity
}

let stopRealtime: (() => void) | null = null
let visibilityHandler: (() => void) | null = null
let refreshTimer: ReturnType<typeof setTimeout> | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let reconnectAttempts = 0

const emptySnapshot = (): AdminNotificationSnapshot => ({
  ordersNew: 0,
  reviewsAttention: 0,
  reviewsPending: 0,
  reviewsToday: 0,
  deliveryOpen: 0,
  pickupOpen: 0,
  couponUses: 0,
  referrals: 0,
  teamPending: 0,
})

const clearRefreshTimer = () => {
  if (refreshTimer) {
    clearTimeout(refreshTimer)
    refreshTimer = null
  }
}

const clearReconnectTimer = () => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
}

const badge = (count: number, label: string, severity: NotificationSeverity = 'neutral'): AdminNotificationBadge | null => {
  const normalized = Math.max(0, Math.floor(Number(count || 0)))
  return normalized > 0 ? { count: normalized, label, severity } : null
}

export const useAdminNotificationsStore = defineStore('admin-notifications', {
  state: () => ({
    catalogId: null as string | null,
    userUid: null as string | null,
    snapshot: emptySnapshot(),
    loading: false,
    listening: false,
    error: '',
    lastUpdatedAt: null as string | null,
  }),
  getters: {
    total(state) {
      return Object.values(state.snapshot).reduce((sum, value) => sum + Number(value || 0), 0)
    },
    routeBadges(state): Record<string, AdminNotificationBadge | null> {
      return {
        '/admin/orders': badge(state.snapshot.ordersNew, 'Pedidos nuevos', 'attention'),
        '/admin/reviews': badge(
          state.snapshot.reviewsAttention,
          state.snapshot.reviewsPending > 0
            ? 'Resenas pendientes'
            : 'Resenas de hoy',
          'attention',
        ),
        '/admin/delivery': badge(state.snapshot.deliveryOpen, 'Entregas abiertas', 'attention'),
        '/admin/pickup': badge(state.snapshot.pickupOpen, 'Recogidas abiertas', 'attention'),
        '/admin/coupons': badge(state.snapshot.couponUses, 'Usos de cupones', 'success'),
        '/admin/referrals': badge(state.snapshot.referrals, 'Referidos registrados', 'success'),
        '/admin/team': badge(state.snapshot.teamPending, 'Invitaciones pendientes', 'attention'),
      }
    },
    badgeForRoute(): (path: string) => AdminNotificationBadge | null {
      const badges = this.routeBadges
      return (path: string) => badges[path] || null
    },
  },
  actions: {
    scheduleRefresh(delayMs = 1200) {
      if (import.meta.server || !this.catalogId) {
        return
      }

      clearRefreshTimer()
      refreshTimer = setTimeout(() => {
        refreshTimer = null
        void this.refresh()
      }, delayMs)
    },
    scheduleReconnect() {
      if (import.meta.server || !this.catalogId || document.hidden) {
        return
      }

      clearReconnectTimer()
      reconnectAttempts += 1
      const delay = Math.min(1000 * (2 ** Math.min(reconnectAttempts, 5)), 15000)

      reconnectTimer = setTimeout(() => {
        reconnectTimer = null
        this.subscribe()
      }, delay)
    },
    async refresh() {
      if (!this.catalogId) {
        this.snapshot = emptySnapshot()
        return
      }

      const backend = useSupabaseBackend()
      this.loading = true
      this.error = ''

      try {
        this.snapshot = await backend.getAdminNotificationSnapshot(this.catalogId, this.userUid)
        this.lastUpdatedAt = new Date().toISOString()
        reconnectAttempts = 0
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'No se pudieron cargar las notificaciones.'
        throw error
      } finally {
        this.loading = false
      }
    },
    subscribe() {
      if (import.meta.server || !this.catalogId || document.hidden) {
        return
      }

      const backend = useSupabaseBackend()

      stopRealtime?.()
      stopRealtime = backend.watchAdminNotificationInvalidations(
        this.catalogId,
        this.userUid,
        () => {
          this.listening = true
          this.error = ''
          clearReconnectTimer()
          this.scheduleRefresh()
        },
        (error) => {
          this.listening = false
          this.error = error.message
          stopRealtime?.()
          stopRealtime = null
          this.scheduleReconnect()
        },
      )
    },
    start(catalogId: string | null, userUid?: string | null) {
      if (import.meta.server) {
        return
      }

      if (!catalogId) {
        this.stop()
        return
      }

      if (this.catalogId === catalogId && this.userUid === (userUid || null) && (this.listening || this.loading)) {
        return
      }

      this.stop()
      this.catalogId = catalogId
      this.userUid = userUid || null

      void this.refresh().catch(() => {
        this.scheduleReconnect()
      })
      this.subscribe()

      visibilityHandler = () => {
        if (document.hidden) {
          stopRealtime?.()
          stopRealtime = null
          clearRefreshTimer()
          clearReconnectTimer()
          this.listening = false
          return
        }

        void this.refresh().catch(() => {
          this.scheduleReconnect()
        })
        this.subscribe()
      }

      document.addEventListener('visibilitychange', visibilityHandler)
      window.addEventListener('focus', visibilityHandler)
    },
    stop() {
      stopRealtime?.()
      stopRealtime = null
      clearRefreshTimer()
      clearReconnectTimer()
      reconnectAttempts = 0

      if (visibilityHandler && import.meta.client) {
        document.removeEventListener('visibilitychange', visibilityHandler)
        window.removeEventListener('focus', visibilityHandler)
      }

      visibilityHandler = null
      this.catalogId = null
      this.userUid = null
      this.snapshot = emptySnapshot()
      this.loading = false
      this.listening = false
      this.error = ''
      this.lastUpdatedAt = null
    },
  },
})
