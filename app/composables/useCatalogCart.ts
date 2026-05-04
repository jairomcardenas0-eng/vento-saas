import type { CatalogOrderItem, CatalogProduct } from '~/types/catalog'
import { effectivePrice } from '~/utils/catalog'

export interface CartEntry {
  id: string
  product: CatalogProduct
  qty: number
  variantSummary: string[]
  totalUnit: number
}

const CART_STORAGE_KEY = 'catalog-cart-items-v1'

const loadPersistedCart = (): CartEntry[] => {
  if (import.meta.server) return []
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as CartEntry[]) : []
  } catch {
    return []
  }
}

const persistCart = (entries: CartEntry[]) => {
  if (import.meta.server) return
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(entries))
  } catch {
    // Storage quota exceeded — cart lives only in memory for this session
  }
}

export const useCatalogCart = () => {
  const items = useState<CartEntry[]>('catalog-cart-items', loadPersistedCart)

  const addItem = (product: CatalogProduct, variantSummary: string[] = [], extra = 0) => {
    const id = `${product.id}::${variantSummary.join('|')}`
    const existing = items.value.find(item => item.id === id)

    if (existing) {
      existing.qty += 1
      persistCart(items.value)
      return
    }

    items.value.push({
      id,
      product,
      qty: 1,
      variantSummary,
      totalUnit: effectivePrice(product) + extra,
    })
    persistCart(items.value)
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
    persistCart(items.value)
  }

  const clear = () => {
    items.value = []
    persistCart(items.value)
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

