import type { CatalogOrderItem, CatalogProduct } from '~/types/catalog'
import { effectivePrice } from '~/utils/catalog'

export interface CartEntry {
  id: string
  product: CatalogProduct
  qty: number
  variantSummary: string[]
  totalUnit: number
}

export const useCatalogCart = () => {
  const items = useState<CartEntry[]>('catalog-cart-items', () => [])

  const addItem = (product: CatalogProduct, variantSummary: string[] = [], extra = 0) => {
    const id = `${product.id}::${variantSummary.join('|')}`
    const existing = items.value.find(item => item.id === id)

    if (existing) {
      existing.qty += 1
      return
    }

    items.value.push({
      id,
      product,
      qty: 1,
      variantSummary,
      totalUnit: effectivePrice(product) + extra,
    })
  }

  const updateQty = (id: string, delta: number) => {
    const target = items.value.find(item => item.id === id)
    if (!target) {
      return
    }
    target.qty += delta
    if (target.qty <= 0) {
      items.value = items.value.filter(item => item.id !== id)
    }
  }

  const clear = () => {
    items.value = []
  }

  const count = computed(() => items.value.reduce((sum, item) => sum + item.qty, 0))
  const subtotal = computed(() => items.value.reduce((sum, item) => sum + item.totalUnit * item.qty, 0))
  const asOrderItems = computed<CatalogOrderItem[]>(() => items.value.map(item => ({
    productId: item.product.id,
    productName: item.product.name,
    qty: item.qty,
    unitPrice: item.totalUnit,
    totalPrice: item.totalUnit * item.qty,
    variantSummary: item.variantSummary,
  })))

  return {
    items,
    addItem,
    updateQty,
    clear,
    count,
    subtotal,
    asOrderItems,
  }
}

