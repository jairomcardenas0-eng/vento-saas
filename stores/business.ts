import { defineStore } from 'pinia'

interface StoreProfile {
  storeId: string
  slug: string
  businessName: string
  isOpen: boolean
}

export const useBusinessStore = defineStore('business', {
  state: () => ({
    currentStore: null as StoreProfile | null,
    loading: false,
  }),
  actions: {
    async fetchStoreData(storeId: string) {
      const backend = useSupabaseBackend()
      this.loading = true
      try {
        const catalog = await backend.getCatalogById(storeId)
        if (catalog) {
          this.currentStore = {
            storeId: catalog.id,
            slug: catalog.slug,
            businessName: catalog.settings.businessName,
            isOpen: !catalog.settings.closed,
          }
        }
      } finally {
        this.loading = false
      }
    },
    async initializeStore(ownerUid: string, businessName: string, slug: string) {
      const backend = useSupabaseBackend()
      const catalog = await backend.createCatalog(ownerUid, businessName, slug)
      this.currentStore = {
        storeId: catalog.id,
        slug: catalog.slug,
        businessName: catalog.settings.businessName,
        isOpen: !catalog.settings.closed,
      }
      return catalog.id
    },
  },
})
