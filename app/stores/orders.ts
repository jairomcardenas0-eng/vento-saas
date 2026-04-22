import { defineStore } from 'pinia'
import type { CatalogOrder, OrderStatus } from '~/types/catalog'

let ordersUnsubscribe: null | (() => void) = null
let ordersVisibilityHandler: null | (() => void) = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let reconnectAttempts = 0
let activeCatalogId: string | null = null
let hasPrimedRealtime = false
let latestSeenCreatedAt = 0

const playOrderDing = () => {
  if (import.meta.server) {
    return
  }

  try {
    const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AudioContextCtor) {
      return
    }

    const audioContext = new AudioContextCtor()
    const oscillator = audioContext.createOscillator()
    const gain = audioContext.createGain()

    oscillator.type = 'triangle'
    oscillator.frequency.setValueAtTime(880, audioContext.currentTime)
    gain.gain.setValueAtTime(0.0001, audioContext.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.13, audioContext.currentTime + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.4)

    oscillator.connect(gain)
    gain.connect(audioContext.destination)
    oscillator.start()
    oscillator.stop(audioContext.currentTime + 0.42)
    oscillator.onended = () => void audioContext.close()
  } catch (error) {
    console.error('POSAudio Error:', error)
  }
}

const maybeNotify = async (title: string, body: string) => {
  if (import.meta.server || !('Notification' in window)) {
    return
  }

  if (Notification.permission === 'default') {
    try {
      await Notification.requestPermission()
    } catch {
      return
    }
  }

  if (Notification.permission === 'granted') {
    new Notification(title, { body })
  }
}

export const useOrdersStore = defineStore('orders-live', {
  state: () => ({
    items: [] as CatalogOrder[],
    loading: false,
    listening: false,
    realtimeError: '',
  }),
  getters: {
    monthSales: state => {
      const now = new Date()
      return state.items
        .filter(order => {
          const created = new Date(order.createdAt)
          return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear()
        })
        .reduce((acc, order) => acc + order.total, 0)
    },
    byStatus: state => (status: OrderStatus) => state.items.filter(order => order.status === status),
  },
  actions: {
    startRealtime(catalogId: string) {
      if (import.meta.server) {
        return
      }

      this.stopRealtime()
      activeCatalogId = catalogId
      hasPrimedRealtime = false
      latestSeenCreatedAt = 0
      const backend = useSupabaseBackend()

      const clearReconnectTimer = () => {
        if (reconnectTimer) {
          clearTimeout(reconnectTimer)
          reconnectTimer = null
        }
      }

      const scheduleReconnect = () => {
        if (!activeCatalogId || document.hidden) {
          return
        }

        clearReconnectTimer()
        reconnectAttempts += 1
        const delay = Math.min(1000 * (2 ** Math.min(reconnectAttempts, 5)), 15000)

        reconnectTimer = setTimeout(() => {
          reconnectTimer = null
          subscribe()
        }, delay)
      }

      const subscribe = () => {
        if (!activeCatalogId || document.hidden) {
          return
        }

        let loadingGuard: ReturnType<typeof setTimeout> | null = null
        this.loading = !this.items.length
        if (this.loading) {
          // Seguridad: si en 12s el fetch inicial no respondió, apagar el spinner
          // silenciosamente y reintentar la suscripción (Supabase siempre responde)
          loadingGuard = setTimeout(() => {
            if (this.loading) {
              this.loading = false
              scheduleReconnect()
            }
          }, 12000)
        }
        this.realtimeError = ''
        ordersUnsubscribe?.()
        ordersUnsubscribe = backend.watchOrders(
          activeCatalogId,
          async ({ orders, changes }) => {
            if (loadingGuard) {
              clearTimeout(loadingGuard)
              loadingGuard = null
            }
            this.items = orders
            this.loading = false
            this.listening = true
            this.realtimeError = ''
            reconnectAttempts = 0
            clearReconnectTimer()

            const mostRecentTimestamp = orders.reduce((acc, order) => {
              const stamp = Date.parse(order.createdAt || '')
              return Number.isNaN(stamp) ? acc : Math.max(acc, stamp)
            }, latestSeenCreatedAt)

            if (!hasPrimedRealtime) {
              latestSeenCreatedAt = mostRecentTimestamp
              hasPrimedRealtime = true
              return
            }

            const incomingOrders = changes
              .filter(change => change.type === 'added')
              .map(change => ({ ...change.doc.data() } as CatalogOrder))
              .filter(order => order.status === 'new' && Date.parse(order.createdAt || '') > latestSeenCreatedAt)

            if (incomingOrders.length > 0) {
              playOrderDing()
              const newest = incomingOrders[0]!
              await maybeNotify(
                'Nuevo pedido en caja',
                `${newest.customerName || 'Cliente'} · ${newest.items.length} items`,
              )
            }

            latestSeenCreatedAt = mostRecentTimestamp
          },
          (error) => {
            console.error('OrdersRealtime Error:', error)
            this.loading = false
            this.listening = false
            this.realtimeError = 'Conexión inestable. Reintentando sincronización...'
            ordersUnsubscribe?.()
            ordersUnsubscribe = null
            scheduleReconnect()
          },
        )
      }

      subscribe()

      ordersVisibilityHandler = () => {
        if (document.hidden) {
          ordersUnsubscribe?.()
          ordersUnsubscribe = null
          clearReconnectTimer()
          this.listening = false
          return
        }

        if (!ordersUnsubscribe && activeCatalogId) {
          subscribe()
        }
      }

      document.addEventListener('visibilitychange', ordersVisibilityHandler)
    },
    stopRealtime() {
      ordersUnsubscribe?.()
      ordersUnsubscribe = null
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
        reconnectTimer = null
      }
      reconnectAttempts = 0
      if (ordersVisibilityHandler && import.meta.client) {
        document.removeEventListener('visibilitychange', ordersVisibilityHandler)
      }
      ordersVisibilityHandler = null
      activeCatalogId = null
      hasPrimedRealtime = false
      latestSeenCreatedAt = 0
      this.listening = false
      this.loading = false
      this.realtimeError = ''
    },
    async updateStatus(catalogId: string, orderId: string, status: OrderStatus) {
      const backend = useSupabaseBackend()
      await backend.updateOrderStatus(catalogId, orderId, status)
      const match = this.items.find(order => order.id === orderId)
      if (match) {
        match.status = status
      }
    },
  },
})
