import { defineStore } from 'pinia'
import type { CatalogReview } from '~/types/catalog'

let reviewsUnsubscribe: null | (() => void) = null
let reviewsVisibilityHandler: null | (() => void) = null
let reviewsCatalogId: string | null = null

export const useReviewsStore = defineStore('reviews-live', {
  state: () => ({
    items: [] as CatalogReview[],
    loading: false,
    listening: false,
  }),
  getters: {
    pending: state => state.items.filter(review => !review.approved),
    approved: state => state.items.filter(review => review.approved),
    averageApprovedRating(): number {
      if (!this.approved.length) {
        return 0
      }

      return this.approved.reduce((acc, review) => acc + review.rating, 0) / this.approved.length
    },
    positivityPercent(): number {
      return this.approved.length ? Math.round((this.averageApprovedRating / 5) * 100) : 0
    },
  },
  actions: {
    startRealtime(catalogId: string) {
      if (import.meta.server) {
        return
      }

      this.stopRealtime()
      reviewsCatalogId = catalogId
      const backend = useSupabaseBackend()

      const subscribe = () => {
        if (!reviewsCatalogId || document.hidden) {
          return
        }

        this.loading = true
        reviewsUnsubscribe = backend.watchReviews(
          reviewsCatalogId,
          (reviews) => {
            this.items = reviews
            this.loading = false
            this.listening = true
          },
          (error) => {
            console.error('ReviewsRealtime Error:', error)
            this.loading = false
          },
        )
      }

      subscribe()

      reviewsVisibilityHandler = () => {
        if (document.hidden) {
          reviewsUnsubscribe?.()
          reviewsUnsubscribe = null
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
      if (reviewsVisibilityHandler && import.meta.client) {
        document.removeEventListener('visibilitychange', reviewsVisibilityHandler)
      }
      reviewsVisibilityHandler = null
      reviewsCatalogId = null
      this.listening = false
    },
    async approve(catalogId: string, reviewId: string, adminReply?: { name: string, text: string }) {
      const backend = useSupabaseBackend()
      await backend.updateReview(catalogId, reviewId, {
        approved: true,
        ...(adminReply ? { adminReply } : {}),
      })
    },
    async reply(catalogId: string, reviewId: string, adminReply: { name: string, text: string }) {
      const backend = useSupabaseBackend()
      await backend.updateReview(catalogId, reviewId, {
        approved: true,
        adminReply,
      })
    },
    async remove(catalogId: string, reviewId: string) {
      const backend = useSupabaseBackend()
      await backend.deleteReview(catalogId, reviewId)
      this.items = this.items.filter(review => review.id !== reviewId)
    },
  },
})
