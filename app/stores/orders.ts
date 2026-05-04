import { defineStore } from 'pinia'
import type { CatalogOrder, OrderStatus } from '~/types/catalog'

let ordersUnsubscribe: null | (() => void) = null
let ordersVisibilityHandler: null | (() => void) = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let reconnectAttempts = 0
let activeCatalogId: string | null = null

const PAGE_SIZE = 25

export type OrdersFilterKey = 'all' | 'new' | 'preparing' | 'completed' | 'cancelled'

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

const sortOrders = (items: CatalogOrder[]) =>
  [...items].sort((left, right) => {
    const a = new Date(left.createdAt || '').getTime() || 0
    const b = new Date(right.createdAt || '').getTime() || 0
    return b - a
  })

const normalizeStatus = (status: OrderStatus): OrdersFilterKey => {
  if (status === 'viewed' || status === 'ready') {
    return 'preparing'
  }

  if (status === 'closed' || status === 'delivered') {
    return 'completed'
  }

  return status as OrdersFilterKey
}

const filterToBackendStatus = (filter: OrdersFilterKey): string | null =>
  filter === 'all' ? null : filter

const orderMatchesFilter = (order: CatalogOrder, filter: OrdersFilterKey) =>
  filter === 'all' || normalizeStatus(order.status) === filter

const emptyStats = () => ({
  total: 0,
  new: 0,
  preparing: 0,
  completed: 0,
  cancelled: 0,
  monthSales: 0,
})

export const useOrdersStore = defineStore('orders-live', {
  state: () => ({
    items: [] as CatalogOrder[],
    loading: false,
    loadingMore: false,
    listening: false,
    realtimeError: '',
    nextCursor: null as string | null,
    hasMore: false,
    currentFilter: 'all' as OrdersFilterKey,
    stats: emptyStats(),
  }),
  getters: {
    monthSales: state => state.stats.monthSales,
    filteredTotal(state) {
      if (state.currentFilter === 'all') {
        return state.stats.total
      }

      if (state.currentFilter === 'new') {
        return state.stats.new
      }

      if (state.currentFilter === 'preparing') {
        return state.stats.preparing
      }

      if (state.currentFilter === 'completed') {
        return state.stats.completed
      }

      return state.stats.cancelled
    },
    remainingCount(): number {
      return Math.max(this.filteredTotal - this.items.length, 0)
    },
    byStatus: state => (status: OrderStatus) => {
      const normalized = normalizeStatus(status)
      return state.items.filter(order => normalizeStatus(order.status) === normalized)
    },
  },
  actions: {
    async refreshStats() {
      if (!activeCatalogId) {
        return
      }

      const backend = useSupabaseBackend()
      this.stats = await backend.getOrdersStats(activeCatalogId)
    },
    async hydrate(catalogId: string, options?: { filter?: OrdersFilterKey }) {
      const backend = useSupabaseBackend()
      const nextFilter = options?.filter || this.currentFilter
      this.loading = true
      this.realtimeError = ''

      try {
        const [page, stats] = await Promise.all([
          backend.getOrdersPage(catalogId, {
            limit: PAGE_SIZE,
            status: filterToBackendStatus(nextFilter),
          }),
          backend.getOrdersStats(catalogId),
        ])

        this.currentFilter = nextFilter
        this.items = page.items
        this.nextCursor = page.nextCursor
        this.hasMore = page.hasMore
        this.stats = stats
      } finally {
        this.loading = false
      }
    },
    async loadMore() {
      if (!activeCatalogId || !this.hasMore || !this.nextCursor || this.loadingMore) {
        return
      }

      const backend = useSupabaseBackend()
      this.loadingMore = true

      try {
        const page = await backend.getOrdersPage(activeCatalogId, {
          beforeCreatedAt: this.nextCursor,
          limit: PAGE_SIZE,
          status: filterToBackendStatus(this.currentFilter),
        })

        const knownIds = new Set(this.items.map((item: CatalogOrder) => item.id))
        const newItems = page.items.filter((item: CatalogOrder) => !knownIds.has(item.id))
        this.items = [...this.items, ...newItems]
        this.nextCursor = page.nextCursor
        this.hasMore = page.hasMore
      } finally {
        this.loadingMore = false
      }
    },
    async setFilter(filter: OrdersFilterKey) {
      if (!activeCatalogId) {
        this.currentFilter = filter
        return
      }

      if (this.currentFilter === filter && this.items.length) {
        return
      }

      await this.hydrate(activeCatalogId, { filter })
    },
    applyRealtimeChange(change: { type: 'added' | 'modified' | 'removed', doc: { id: string, data: () => CatalogOrder } }) {
      const order = change.doc.data()
      const matchesFilter = orderMatchesFilter(order, this.currentFilter)

      if (change.type === 'added') {
        if (matchesFilter) {
          this.items = sortOrders([order, ...this.items.filter(item => item.id !== order.id)])
        }

        playOrderDing()
        void maybeNotify(
          'Nuevo pedido en caja',
          `${order.customerName || 'Cliente'} · ${order.items.length} items`,
        )
      } else if (change.type === 'modified') {
        const exists = this.items.some(item => item.id === order.id)

        if (matchesFilter) {
          this.items = exists
            ? sortOrders(this.items.map(item => item.id === order.id ? order : item))
            : sortOrders([order, ...this.items])
        } else if (exists) {
          this.items = this.items.filter(item => item.id !== order.id)
        }
      } else {
        this.items = this.items.filter(item => item.id !== change.doc.id)
      }

      void this.refreshStats()
    },
    startRealtime(catalogId: string) {
      if (import.meta.server) {
        return
      }

      this.stopRealtime()
      activeCatalogId = catalogId
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

        void this.hydrate(activeCatalogId, { filter: this.currentFilter }).catch((error) => {
          console.error('OrdersHydrate Error:', error)
          this.realtimeError = 'No se pudo cargar la bandeja de pedidos.'
          scheduleReconnect()
        })

        ordersUnsubscribe?.()
        ordersUnsubscribe = backend.subscribeToOrders(
          activeCatalogId,
          (change) => {
            this.listening = true
            this.realtimeError = ''
            reconnectAttempts = 0
            clearReconnectTimer()
            this.applyRealtimeChange(change)
          },
          (error) => {
            console.error('OrdersRealtime Error:', error)
            this.listening = false
            this.realtimeError = 'Conexion inestable. Reintentando sincronizacion...'
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
      this.listening = false
      this.loading = false
      this.loadingMore = false
      this.realtimeError = ''
      this.nextCursor = null
      this.hasMore = false
      this.currentFilter = 'all'
      this.items = []
      this.stats = emptyStats()
    },
    async updateStatus(catalogId: string, orderId: string, status: OrderStatus) {
      const backend = useSupabaseBackend()
      const match = this.items.find(order => order.id === orderId)
      await backend.updateOrderStatus(catalogId, orderId, {
        status,
        assignedToUid: match?.assignedToUid || null,
        assignedToName: match?.assignedToName || null,
        internalNotes: match?.internalNotes || '',
      })
      if (match) {
        match.status = status
        if (!orderMatchesFilter(match, this.currentFilter)) {
          this.items = this.items.filter(order => order.id !== orderId)
        }
      }
      await this.refreshStats()
    },
  },
})
