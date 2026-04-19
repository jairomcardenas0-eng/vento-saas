import { defineStore } from 'pinia'
import type { CatalogCategory, CatalogProduct } from '~/types/catalog'

export type VariantOption = {
  id: string
  name: string
  priceDelta: number
  isRequired: boolean
}

export interface VariantGroup {
  id: string
  groupName: string
  type: 'single' | 'multiple'
  options: VariantOption[]
}

export interface ProductItem {
  id: string
  categoryId: string
  name: string
  description: string
  basePrice: number
  imageUrl: string | null
  imageUrls: (string | null)[]
  isActive: boolean
  variants: VariantGroup[]
  hasPromo: boolean
  promoPrice: number | null
  sortOrder: number
  offerLabel: string
  offerLabelPosition: 'image' | 'price'
  timerHours: number | null
  timerPosition: 'image-right' | 'price-below'
  timerShowMinutes: boolean
  timerShowSeconds: boolean
  timerLinkSale: boolean
  tags: string[]
  productRating: number
  productRatingCount: number
  createdAt: string | null
  updatedAt: string | null
}

export interface CategoryItem {
  id: string
  name: string
  description: string
  sortOrder: number
}

const nowIso = () => new Date().toISOString()
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))

const mapCatalogCategoryToItem = (category: CatalogCategory): CategoryItem => ({
  id: category.id,
  name: category.name,
  description: category.note || '',
  sortOrder: category.order,
})

const mapCatalogProductToItem = (product: CatalogProduct): ProductItem => ({
  id: product.id,
  categoryId: product.categoryId,
  name: product.name,
  description: product.description,
  basePrice: product.price,
  imageUrl: product.image || null,
  imageUrls: product.images?.length
    ? [...product.images.slice(0, 3), ...Array.from({ length: Math.max(0, 3 - product.images.length) }, () => null)]
    : [null, null, null],
  isActive: product.active,
  variants: product.variants.map((group, groupIndex) => ({
    id: `${product.id}-group-${groupIndex}`,
    groupName: group.group,
    type: group.selection,
    options: group.options.map((option, optionIndex) => ({
      id: `${product.id}-group-${groupIndex}-option-${optionIndex}`,
      name: option.name,
      priceDelta: option.price,
      isRequired: group.required,
    })),
  })),
  hasPromo: product.salePrice !== null && product.salePrice !== undefined,
  promoPrice: product.salePrice,
  sortOrder: product.order,
  offerLabel: product.offerLabel || '',
  offerLabelPosition: product.offerPosition || 'image',
  timerHours: product.timerHours ?? null,
  timerPosition: product.timerPosition || 'image-right',
  timerShowMinutes: product.timerShowMinutes ?? true,
  timerShowSeconds: product.timerShowSeconds ?? true,
  timerLinkSale: product.timerLinkSale ?? false,
  tags: product.tags || [],
  productRating: Number(product.productRating || 0),
  productRatingCount: Number(product.productRatingCount || 0),
  createdAt: null,
  updatedAt: null,
})

const mapItemCategoryToCatalog = (category: CategoryItem): CatalogCategory => ({
  id: category.id,
  name: category.name,
  note: category.description || '',
  order: category.sortOrder,
  active: true,
})

const mapItemProductToCatalog = (product: ProductItem): CatalogProduct => ({
  id: product.id,
  categoryId: product.categoryId,
  name: product.name,
  description: product.description,
  price: Number(product.basePrice || 0),
  salePrice: product.hasPromo ? Number(product.promoPrice || 0) : null,
  order: Number(product.sortOrder || 0),
  image: product.imageUrl || '',
  images: (product.imageUrls || []).filter(Boolean) as string[],
  active: product.isActive,
  offerLabel: product.offerLabel || '',
  offerPosition: product.offerLabelPosition || 'image',
  timerHours: product.timerHours ?? null,
  timerPosition: product.timerPosition || 'image-right',
  timerShowMinutes: product.timerShowMinutes ?? true,
  timerShowSeconds: product.timerShowSeconds ?? true,
  timerLinkSale: product.timerLinkSale ?? false,
  tags: product.tags || [],
  variants: (product.variants || []).map((group) => ({
    group: group.groupName,
    required: group.options.some((option) => option.isRequired),
    selection: group.type,
    options: group.options
      .filter((option) => option.name.trim())
      .map((option) => ({
        name: option.name.trim(),
        price: Number(option.priceDelta || 0),
      })),
  })),
  reviewsApprovedCount: Number(product.productRatingCount || 0),
  productRating: Number(product.productRating || 0),
  productRatingCount: Number(product.productRatingCount || 0),
})

export const createEmptyVariantOption = (): VariantOption => ({
  id: crypto.randomUUID(),
  name: '',
  priceDelta: 0,
  isRequired: false,
})

export const createEmptyVariantGroup = (): VariantGroup => ({
  id: crypto.randomUUID(),
  groupName: '',
  type: 'single',
  options: [createEmptyVariantOption()],
})

export const createEmptyProduct = (categoryId = ''): ProductItem => ({
  id: '',
  categoryId,
  name: '',
  description: '',
  basePrice: 0,
  imageUrl: null,
  imageUrls: [null, null, null],
  isActive: true,
  variants: [],
  hasPromo: false,
  promoPrice: null,
  sortOrder: 10,
  offerLabel: '',
  offerLabelPosition: 'image',
  timerHours: null,
  timerPosition: 'image-right',
  timerShowMinutes: true,
  timerShowSeconds: true,
  timerLinkSale: false,
  tags: [],
  productRating: 0,
  productRatingCount: 0,
  createdAt: null,
  updatedAt: null,
})

export const createEmptyCategory = (sortOrder = 1): CategoryItem => ({
  id: '',
  name: '',
  description: '',
  sortOrder,
})

export const useCatalogEngineStore = defineStore('catalog-engine', {
  state: () => ({
    categories: [] as CategoryItem[],
    products: [] as ProductItem[],
    loadingEngine: false,
  }),
  getters: {
    mappedCatalog: state =>
      [...state.categories]
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map((category) => ({
          ...category,
          items: state.products
            .filter((product) => product.categoryId === category.id)
            .sort((left, right) => left.sortOrder - right.sortOrder),
        })),
  },
  actions: {
    async hydrateCatalog(storeId: string) {
      const backend = useSupabaseBackend()
      this.loadingEngine = true

      try {
        const catalog = await backend.getCatalogById(storeId)
        this.categories = (catalog?.categories || []).map(mapCatalogCategoryToItem)
        this.products = (catalog?.products || []).map(mapCatalogProductToItem)
      } catch (error) {
        console.error('DataHydration Error:', error)
      } finally {
        this.loadingEngine = false
      }
    },
    async upsertProduct(storeId: string, payload: Partial<ProductItem>, id?: string) {
      const backend = useSupabaseBackend()
      const targetId = id || crypto.randomUUID()
      const normalizedVariants = (payload.variants || []).map((group) => ({
        ...group,
        options: group.options.map((option) => ({ ...option })),
      }))

      const optimistic: ProductItem = {
        id: targetId,
        categoryId: payload.categoryId || '',
        name: payload.name || '',
        description: payload.description || '',
        basePrice: Number(payload.basePrice || 0),
        imageUrl: payload.imageUrl ?? null,
        imageUrls: payload.imageUrls ?? [null, null, null],
        isActive: payload.isActive ?? true,
        variants: clone(normalizedVariants),
        hasPromo: payload.hasPromo ?? false,
        promoPrice: payload.promoPrice ?? null,
        sortOrder: payload.sortOrder ?? 10,
        offerLabel: payload.offerLabel || '',
        offerLabelPosition: payload.offerLabelPosition || 'image',
        timerHours: payload.timerHours ?? null,
        timerPosition: payload.timerPosition || 'image-right',
        timerShowMinutes: payload.timerShowMinutes ?? true,
        timerShowSeconds: payload.timerShowSeconds ?? true,
        timerLinkSale: payload.timerLinkSale ?? false,
        tags: payload.tags ?? [],
        productRating: Number(payload.productRating || 0),
        productRatingCount: Number(payload.productRatingCount || 0),
        createdAt: payload.createdAt || nowIso(),
        updatedAt: nowIso(),
      }

      await backend.upsertProduct(storeId, mapItemProductToCatalog(optimistic))

      const index = this.products.findIndex((product) => product.id === targetId)
      if (index >= 0) {
        this.products[index] = { ...this.products[index], ...optimistic }
      } else {
        this.products.unshift(optimistic)
      }

      return targetId
    },
    async deleteProduct(storeId: string, productId: string) {
      const backend = useSupabaseBackend()
      await backend.deleteProduct(storeId, productId)
      this.products = this.products.filter((product) => product.id !== productId)
    },
    async upsertCategory(storeId: string, payload: Partial<CategoryItem>, id?: string) {
      const backend = useSupabaseBackend()
      const targetId = id || crypto.randomUUID()

      const optimistic: CategoryItem = {
        id: targetId,
        name: payload.name || 'Sin nombre',
        description: payload.description || '',
        sortOrder: payload.sortOrder || 1,
      }

      await backend.upsertCategory(storeId, mapItemCategoryToCatalog(optimistic))

      const index = this.categories.findIndex((category) => category.id === targetId)
      if (index >= 0) {
        this.categories[index] = optimistic
      } else {
        this.categories.push(optimistic)
      }

      this.categories.sort((left, right) => left.sortOrder - right.sortOrder)
      return targetId
    },
    async deleteCategory(storeId: string, categoryId: string) {
      const backend = useSupabaseBackend()
      await backend.deleteCategory(storeId, categoryId)
      this.categories = this.categories.filter((category) => category.id !== categoryId)
      this.products = this.products.map((product) =>
        product.categoryId === categoryId
          ? { ...product, categoryId: '' }
          : product,
      )
    },
  },
})
