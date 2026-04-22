import { defineStore } from 'pinia'
import type { CatalogCategory, CatalogOrder, CatalogProduct, CatalogRecord, CatalogReview } from '~/types/catalog'

const sortCategories = (items: CatalogCategory[]) => [...items].sort((a, b) => a.order - b.order)
const sortProducts = (items: CatalogProduct[]) => [...items].sort((a, b) => a.order - b.order)

export const useCatalogStore = defineStore('catalogs', {
  state: () => ({
    ownerCatalogs: [] as CatalogRecord[],
    activeCatalogId: null as string | null,
    publicCatalog: null as CatalogRecord | null,
    loading: false,
  }),
  getters: {
    activeCatalog(state) {
      return state.ownerCatalogs.find(item => item.id === state.activeCatalogId) || null
    },
    categories(): CatalogCategory[] {
      return this.activeCatalog ? sortCategories(this.activeCatalog.categories) : []
    },
    products(): CatalogProduct[] {
      return this.activeCatalog ? sortProducts(this.activeCatalog.products) : []
    },
    activeProducts(): CatalogProduct[] {
      return this.products.filter(item => item.active)
    },
    pendingReviews(): CatalogReview[] {
      return this.activeCatalog ? this.activeCatalog.reviews.filter(item => !item.approved) : []
    },
    orderStats() {
      const orders = this.activeCatalog?.orders || []
      return {
        total: orders.length,
        new: orders.filter(item => item.status === 'new').length,
        closed: orders.filter(item => item.status === 'closed').length,
      }
    },
  },
  actions: {
    async loadOwnerCatalogs(ownerUid: string, preferredCatalogId?: string | null) {
      this.loading = true
      try {
        const backend = useSupabaseBackend()
        this.ownerCatalogs = await backend.getCatalogsByOwner(ownerUid)
        const preferredMatch = preferredCatalogId
          ? this.ownerCatalogs.find(item => item.id === preferredCatalogId)
          : null
        this.activeCatalogId = preferredMatch?.id || this.ownerCatalogs[0]?.id || null
      } finally {
        this.loading = false
      }
    },
    async loadPublicCatalog(slug: string) {
      this.loading = true
      try {
        const backend = useSupabaseBackend()
        this.publicCatalog = await backend.getCatalogBySlug(slug)
      } finally {
        this.loading = false
      }
    },
    async loadMarketplace() {
      this.loading = true
      try {
        const backend = useSupabaseBackend()
        this.ownerCatalogs = await backend.getMarketplaceCatalogs()
      } finally {
        this.loading = false
      }
    },
    async createCatalog(ownerUid: string, name: string, slug: string) {
      const backend = useSupabaseBackend()
      const created = await backend.createCatalog(ownerUid, name, slug)
      this.ownerCatalogs.push(created)
      this.activeCatalogId = created.id
      return created
    },
    async setActiveCatalog(catalogId: string) {
      this.activeCatalogId = catalogId
      const backend = useSupabaseBackend()
      const refreshed = await backend.getCatalogById(catalogId)
      if (!refreshed) {
        return
      }

      const index = this.ownerCatalogs.findIndex(item => item.id === catalogId)
      if (index >= 0) {
        this.ownerCatalogs[index] = refreshed
      } else {
        this.ownerCatalogs.push(refreshed)
      }
    },
    async updateSettings(payload: Partial<CatalogRecord['settings']>) {
      if (!this.activeCatalog) {
        return
      }

      const previousSettings = JSON.parse(JSON.stringify(this.activeCatalog.settings)) as CatalogRecord['settings']
      this.activeCatalog.settings = { ...this.activeCatalog.settings, ...payload }
      const backend = useSupabaseBackend()

      try {
        await backend.updateSettings(this.activeCatalog.id, this.activeCatalog.settings)
      } catch (error) {
        this.activeCatalog.settings = previousSettings
        throw error
      }
    },
    async updateTheme(payload: Partial<CatalogRecord['theme']>) {
      if (!this.activeCatalog) {
        return
      }

      this.activeCatalog.theme = { ...this.activeCatalog.theme, ...payload }
      const backend = useSupabaseBackend()
      await backend.updateTheme(this.activeCatalog.id, this.activeCatalog.theme)
    },
    async updateStorefrontLayout(layout: CatalogRecord['settings']['storefrontLayout']) {
      if (!this.activeCatalog) {
        return
      }

      this.activeCatalog.settings.storefrontLayout = layout
      const backend = useSupabaseBackend()
      await backend.updateSettings(this.activeCatalog.id, this.activeCatalog.settings)
    },
    async upsertCategory(category: CatalogCategory) {
      if (!this.activeCatalog) {
        return
      }

      const index = this.activeCatalog.categories.findIndex(item => item.id === category.id)
      if (index >= 0) {
        this.activeCatalog.categories[index] = category
      } else {
        this.activeCatalog.categories.push(category)
      }
      const backend = useSupabaseBackend()
      await backend.upsertCategory(this.activeCatalog.id, category)
    },
    async upsertProduct(product: CatalogProduct) {
      if (!this.activeCatalog) {
        return
      }

      const index = this.activeCatalog.products.findIndex(item => item.id === product.id)
      if (index >= 0) {
        this.activeCatalog.products[index] = product
      } else {
        this.activeCatalog.products.push(product)
      }
      const backend = useSupabaseBackend()
      await backend.upsertProduct(this.activeCatalog.id, product)
    },
    async updateReview(reviewId: string, payload: Partial<CatalogReview>) {
      if (!this.activeCatalog) {
        return
      }

      const review = this.activeCatalog.reviews.find(item => item.id === reviewId)
      if (!review) {
        return
      }

      Object.assign(review, payload)
      const backend = useSupabaseBackend()
      await backend.updateReview(this.activeCatalog.id, reviewId, payload)
    },
    async updateOrderStatus(orderId: string, status: CatalogOrder['status']) {
      if (!this.activeCatalog) {
        return
      }

      const order = this.activeCatalog.orders.find(item => item.id === orderId)
      if (!order) {
        return
      }

      order.status = status
      const backend = useSupabaseBackend()
      await backend.updateOrderStatus(this.activeCatalog.id, orderId, status)
    },
    async addOrder(order: CatalogOrder) {
      const backend = useSupabaseBackend()
      await backend.appendOrder(order.catalogId, order)
      if (this.activeCatalog?.id === order.catalogId) {
        this.activeCatalog.orders.unshift(order)
      }
      if (this.publicCatalog?.id === order.catalogId) {
        this.publicCatalog.orders.unshift(order)
      }
    },
    async addReview(catalogId: string, review: CatalogReview) {
      const backend = useSupabaseBackend()
      await backend.appendReview(catalogId, review)
      if (this.publicCatalog?.id === catalogId) {
        this.publicCatalog.reviews.unshift(review)
      }
      if (this.activeCatalog?.id === catalogId) {
        this.activeCatalog.reviews.unshift(review)
      }
    },
  },
})
