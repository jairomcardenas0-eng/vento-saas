import { defineStore } from 'pinia'
import type { CatalogAccessProfile, CatalogCategory, CatalogOrder, CatalogProduct, CatalogRecord, CatalogReview, TeamMemberPermissions, UserProfile } from '~/types/catalog'
import { createOwnerAccessProfile, hasAdminRouteAccess } from '~/utils/adminAccess'

const sortCategories = (items: CatalogCategory[]) => [...items].sort((a, b) => a.order - b.order)
const sortProducts = (items: CatalogProduct[]) => [...items].sort((a, b) => a.order - b.order)

export const useCatalogStore = defineStore('catalogs', {
  state: () => ({
    ownerCatalogs: [] as CatalogRecord[],
    activeCatalogId: null as string | null,
    publicCatalog: null as CatalogRecord | null,
    accessByCatalogId: {} as Record<string, CatalogAccessProfile>,
    loading: false,
    adminBootstrapKey: null as string | null,
  }),
  getters: {
    activeCatalog(state): CatalogRecord | null {
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
      const orders: CatalogOrder[] = this.activeCatalog?.orders || []
      return {
        total: orders.length,
        new: orders.filter((item: CatalogOrder) => item.status === 'new').length,
        closed: orders.filter((item: CatalogOrder) => ['closed', 'completed', 'delivered'].includes(item.status)).length,
      }
    },
    activeCatalogAccess(state): CatalogAccessProfile | null {
      return state.activeCatalogId ? state.accessByCatalogId[state.activeCatalogId] || null : null
    },
  },
  actions: {
    resetAdminState() {
      this.ownerCatalogs = []
      this.activeCatalogId = null
      this.accessByCatalogId = {}
      this.adminBootstrapKey = null
    },
    async loadAdminBootstrap(preferredCatalogId?: string | null, options?: { cacheKey?: string | null, force?: boolean }) {
      const cacheKey = options?.cacheKey || null

      if (!options?.force && cacheKey && this.adminBootstrapKey === cacheKey && this.ownerCatalogs.length && Object.keys(this.accessByCatalogId).length) {
        if (preferredCatalogId && this.ownerCatalogs.some(item => item.id === preferredCatalogId)) {
          this.activeCatalogId = preferredCatalogId
        } else if (!this.activeCatalogId && this.ownerCatalogs[0]?.id) {
          this.activeCatalogId = this.ownerCatalogs[0].id
        }
        return
      }

      this.loading = true
      try {
        const backend = useSupabaseBackend()
        const bootstrap = await backend.getAdminBootstrap()
        const preferredMatch = preferredCatalogId
          ? bootstrap.catalogs.find(item => item.id === preferredCatalogId)
          : null

        this.ownerCatalogs = bootstrap.catalogs
        this.accessByCatalogId = bootstrap.accessByCatalogId
        this.activeCatalogId = preferredMatch?.id || bootstrap.activeCatalogId || bootstrap.catalogs[0]?.id || null
        this.adminBootstrapKey = cacheKey
      } finally {
        this.loading = false
      }
    },
    async loadOwnerCatalogs(ownerUid: string, preferredCatalogId?: string | null, userEmail?: string | null) {
      void ownerUid
      void userEmail
      await this.loadAdminBootstrap(preferredCatalogId)
    },
    async ensureAccessForUser(user: UserProfile | null) {
      if (!user) {
        this.resetAdminState()
        return
      }

      const cacheKey = `${user.uid}:${user.email || ''}:${user.defaultCatalogId || ''}`
      await this.loadAdminBootstrap(user.defaultCatalogId, { cacheKey })
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
      this.accessByCatalogId[created.id] = createOwnerAccessProfile(created.id)
      this.activeCatalogId = created.id
      return created
    },
    async setActiveCatalog(catalogId: string) {
      this.activeCatalogId = catalogId
    },
    hasPermission(permission: keyof TeamMemberPermissions, catalogId?: string | null) {
      const targetCatalogId = catalogId || this.activeCatalogId
      if (!targetCatalogId) {
        return false
      }

      const access = this.accessByCatalogId[targetCatalogId]
      return Boolean(access?.isOwner || access?.permissions?.[permission])
    },
    hasRouteAccess(path: string, catalogId?: string | null) {
      const targetCatalogId = catalogId || this.activeCatalogId
      if (!targetCatalogId) {
        return false
      }

      return hasAdminRouteAccess(path, this.accessByCatalogId[targetCatalogId] || null)
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
      await backend.updateOrderStatus(this.activeCatalog.id, orderId, {
        status,
        assignedToUid: order.assignedToUid || null,
        assignedToName: order.assignedToName || null,
        internalNotes: order.internalNotes || '',
      })
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
