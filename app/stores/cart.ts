import { defineStore } from 'pinia'
import type { ProductItem } from './catalog'

export interface CartModifier {
  groupId: string
  groupName: string
  optionId: string
  optionName: string
  priceDelta: number
}

export interface CartItem {
  cartItemId: string
  productId: string
  productName: string
  basePrice: number
  finalUnitPrice: number
  quantity: number
  modifiers: CartModifier[]
  instructions: string
}

export const useCartStore = defineStore('cart', {
  state: () => ({
    items: [] as CartItem[],
    isOpen: false,
    isHydrated: false,
  }),
  getters: {
    totalItems: state => state.items.reduce((acc, current) => acc + current.quantity, 0),
    totalPrice: state => state.items.reduce((acc, current) => acc + (current.finalUnitPrice * current.quantity), 0),
  },
  actions: {
    hydrateCart(storeSlug: string) {
      if (import.meta.server) {
        return
      }

      const saved = localStorage.getItem(`saas_cart_${storeSlug}`)
      if (saved) {
        try {
          this.items = JSON.parse(saved) as CartItem[]
        } catch {
          this.items = []
        }
      }

      this.isHydrated = true
    },
    persistCart(storeSlug: string) {
      if (import.meta.server) {
        return
      }

      localStorage.setItem(`saas_cart_${storeSlug}`, JSON.stringify(this.items))
    },
    generateCartHash(productId: string, modifiers: CartModifier[]) {
      const sortedModifiers = [...modifiers].sort((left, right) => left.optionId.localeCompare(right.optionId))
      return `${productId}_${sortedModifiers.map(modifier => modifier.optionId).join('|')}`
    },
    addToCart(
      storeSlug: string,
      product: ProductItem,
      modifiers: CartModifier[],
      quantity: number,
      instructions = '',
    ) {
      const basePrice = product.hasPromo && product.promoPrice ? product.promoPrice : product.basePrice
      const modifiersTotal = modifiers.reduce((acc, modifier) => acc + modifier.priceDelta, 0)
      const unitPrice = basePrice + modifiersTotal
      const hash = this.generateCartHash(product.id, modifiers)
      const existingLine = this.items.find(item => item.cartItemId === hash)

      if (existingLine) {
        existingLine.quantity += quantity
      } else {
        this.items.push({
          cartItemId: hash,
          productId: product.id,
          productName: product.name,
          basePrice,
          finalUnitPrice: unitPrice,
          quantity,
          modifiers,
          instructions,
        })
      }

      this.persistCart(storeSlug)
      this.isOpen = true
    },
    removeFromCart(storeSlug: string, hash: string) {
      this.items = this.items.filter(item => item.cartItemId !== hash)
      this.persistCart(storeSlug)
    },
    updateQuantity(storeSlug: string, hash: string, delta: number) {
      const line = this.items.find(item => item.cartItemId === hash)
      if (!line) {
        return
      }

      line.quantity += delta
      if (line.quantity <= 0) {
        this.removeFromCart(storeSlug, hash)
        return
      }

      this.persistCart(storeSlug)
    },
    clearCart(storeSlug: string) {
      this.items = []
      this.persistCart(storeSlug)
    },
  },
})
