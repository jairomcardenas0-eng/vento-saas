import { defineStore } from 'pinia'
import type { CatalogReview } from '~/types/catalog'

let reviewsUnsubscribe: null | (() => void) = null
let reviewsVisibilityHandler: null | (() => void) = null
let reviewsReconnectTimer: ReturnType<typeof setTimeout> | null = null
let reviewsReconnectAttempts = 0
let reviewsCatalogId: string | null = null

const PAGE_SIZE = 25

export type ReviewsFilterKey = 'all' | 'pending' | 'approved'

const sortReviews = (items: CatalogReview[]) =>
  [...items].sort((left, right) => {
    const a = new Date(left.createdAt || '').getTime() || 0
    const b = new Date(right.createdAt || '').getTime() || 0
    return b - a
  })

const reviewMatchesFilter = (review: CatalogReview, filter: ReviewsFilterKey) => {
  if (filter === 'all') {
    return true
  }

  return filter === 'approved' ? review.approved : !review.approved
}

const filterToApproved = (filter: ReviewsFilterKey): boolean | null => {
  if (filter === 'approved') {
    return true
  }

  if (filter === 'pending') {
    return false
  }

  return null
}

const emptyStats = () => ({
  pending: 0,
  approved: 0,
  averageApprovedRating: 0,
  positivityPercent: 0,
})

export const useReviewsStore = defineStore('reviews-live', {
  state: () => ({
    items: [] as CatalogReview[],
    loading: false,
    loadingMore: false,
    listening: false,
    realtimeError: '',
    nextCursor: null as string | null,
    hasMore: false,
    currentFilter: 'all' as ReviewsFilterKey,
    stats: emptyStats(),
  }),
  getters: {
    pending: state => state.items.filter(review => !review.approved),
    approved: state => state.items.filter(review => review.approved),
    averageApprovedRating: state => state.stats.averageApprovedRating,
    positivityPercent: state => state.stats.positivityPercent,
    filteredTotal(state) {
      if (state.currentFilter === 'all') {
        return state.stats.pending + state.stats.approved
      }

      if (state.currentFilter === 'approved') {
        return state.stats.approved
      }

      return state.stats.pending
    },
    remainingCount(): number {
      return Math.max(this.filteredTotal - this.items.length, 0)
    },
  },
  actions: {
    async refreshStats() {
      if (!reviewsCatalogId) {
        return
      }

      const backend = useSupabaseBackend()
      this.stats = await backend.getReviewsStats(reviewsCatalogId)
    },
    async hydrate(catalogId: string, options?: { filter?: ReviewsFilterKey }) {
      const backend = useSupabaseBackend()
      const nextFilter = options?.filter || this.currentFilter
      this.loading = true
      this.realtimeError = ''

      try {
        const [page, stats] = await Promise.all([
          backend.getReviewsPage(catalogId, {
            limit: PAGE_SIZE,
            approved: filterToApproved(nextFilter),
          }),
          backend.getReviewsStats(catalogId),
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
      if (!reviewsCatalogId || !this.hasMore || !this.nextCursor || this.loadingMore) {
        return
      }

      const backend = useSupabaseBackend()
      this.loadingMore = true

      try {
        const page = await backend.getReviewsPage(reviewsCatalogId, {
          beforeCreatedAt: this.nextCursor,
          limit: PAGE_SIZE,
          approved: filterToApproved(this.currentFilter),
        })

        const knownIds = new Set(this.items.map((item: CatalogReview) => item.id))
        const newItems = page.items.filter((item: CatalogReview) => !knownIds.has(item.id))
        this.items = [...this.items, ...newItems]
        this.nextCursor = page.nextCursor
        this.hasMore = page.hasMore
      } finally {
        this.loadingMore = false
      }
    },
    async setFilter(filter: ReviewsFilterKey) {
      if (!reviewsCatalogId) {
        this.currentFilter = filter
        return
      }

      if (this.currentFilter === filter && this.items.length) {
        return
      }

      await this.hydrate(reviewsCatalogId, { filter })
    },
    applyRealtimeChange(change: { type: 'added' | 'modified' | 'removed', doc: { id: string, data: () => CatalogReview } }) {
      const review = change.doc.data()
      const matchesFilter = reviewMatchesFilter(review, this.currentFilter)

      if (change.type === 'added') {
        if (matchesFilter) {
          this.items = sortReviews([review, ...this.items.filter(item => item.id !== review.id)])
        }
      } else if (change.type === 'modified') {
        const exists = this.items.some(item => item.id === review.id)

        if (matchesFilter) {
          this.items = exists
            ? sortReviews(this.items.map(item => item.id === review.id ? review : item))
            : sortReviews([review, ...this.items])
        } else if (exists) {
          this.items = this.items.filter(item => item.id !== review.id)
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
      reviewsCatalogId = catalogId
      const backend = useSupabaseBackend()

      const clearReconnectTimer = () => {
        if (reviewsReconnectTimer) {
          clearTimeout(reviewsReconnectTimer)
          reviewsReconnectTimer = null
        }
      }

      const scheduleReconnect = () => {
        if (!reviewsCatalogId || document.hidden) {
          return
        }

        clearReconnectTimer()
        reviewsReconnectAttempts += 1
        const delay = Math.min(1000 * (2 ** Math.min(reviewsReconnectAttempts, 5)), 15000)

        reviewsReconnectTimer = setTimeout(() => {
          reviewsReconnectTimer = null
          subscribe()
        }, delay)
      }

      const subscribe = () => {
        if (!reviewsCatalogId || document.hidden) {
          return
        }

        void this.hydrate(reviewsCatalogId, { filter: this.currentFilter }).catch((error) => {
          console.error('ReviewsHydrate Error:', error)
          this.realtimeError = 'No se pudo cargar la bandeja de reseñas.'
          scheduleReconnect()
        })

        reviewsUnsubscribe?.()
        reviewsUnsubscribe = backend.subscribeToReviews(
          reviewsCatalogId,
          (change) => {
            this.listening = true
            this.realtimeError = ''
            reviewsReconnectAttempts = 0
            clearReconnectTimer()
            this.applyRealtimeChange(change)
          },
          (error) => {
            console.error('ReviewsRealtime Error:', error)
            this.listening = false
            this.realtimeError = 'Conexion inestable. Reintentando sincronizacion...'
            reviewsUnsubscribe?.()
            reviewsUnsubscribe = null
            scheduleReconnect()
          },
        )
      }

      subscribe()

      reviewsVisibilityHandler = () => {
        if (document.hidden) {
          reviewsUnsubscribe?.()
          reviewsUnsubscribe = null
          clearReconnectTimer()
          this.listening = false
          return
        }

        if (!reviewsUnsubscribe && reviewsCatalogId) {
          subscribe()
        }
      }

      document.addEventListener('visibilitychange', reviewsVisibilityHandler)
    },
    stopRealtime() {
      reviewsUnsubscribe?.()
      reviewsUnsubscribe = null
      if (reviewsReconnectTimer) {
        clearTimeout(reviewsReconnectTimer)
        reviewsReconnectTimer = null
      }
      reviewsReconnectAttempts = 0
      if (reviewsVisibilityHandler && import.meta.client) {
        document.removeEventListener('visibilitychange', reviewsVisibilityHandler)
      }
      reviewsVisibilityHandler = null
      reviewsCatalogId = null
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
    async approve(catalogId: string, reviewId: string, adminReply?: { name: string, text: string }) {
      const backend = useSupabaseBackend()
      await backend.updateReview(catalogId, reviewId, {
        approved: true,
        ...(adminReply ? { adminReply } : {}),
      })

      const review = this.items.find(item => item.id === reviewId)
      if (review) {
        review.approved = true
        if (adminReply) {
          review.adminReply = adminReply
        }

        if (!reviewMatchesFilter(review, this.currentFilter)) {
          this.items = this.items.filter(item => item.id !== reviewId)
        }
      }

      await this.refreshStats()
    },
    async reply(catalogId: string, reviewId: string, adminReply: { name: string, text: string }) {
      const backend = useSupabaseBackend()
      await backend.updateReview(catalogId, reviewId, {
        approved: true,
        adminReply,
      })

      const review = this.items.find(item => item.id === reviewId)
      if (review) {
        review.approved = true
        review.adminReply = adminReply

        if (!reviewMatchesFilter(review, this.currentFilter)) {
          this.items = this.items.filter(item => item.id !== reviewId)
        }
      }

      await this.refreshStats()
    },
    async remove(catalogId: string, reviewId: string) {
      const backend = useSupabaseBackend()
      await backend.deleteReview(catalogId, reviewId)
      this.items = this.items.filter(review => review.id !== reviewId)
      await this.refreshStats()
    },
  },
})
