import { describe, expect, it } from 'vitest'
import { mapStorefrontRpcPayload } from '../app/utils/storefrontPayload'

describe('storefront payload mapper', () => {
  it('maps storefront rpc payload into storefront shape', () => {
    const payload = mapStorefrontRpcPayload({
      catalog: {
        id: 'catalog-1',
        slug: 'mi-tienda',
        settings: { businessName: 'Mi Tienda' },
        theme: { primary: '#000000' },
      },
      categories: [{ id: 'cat-1', name: 'Categoria', description: 'Desc', sort_order: 1 }],
      products: [{
        id: 'prod-1',
        category_id: 'cat-1',
        name: 'Producto',
        description: 'Demo',
        base_price: 10,
        is_active: true,
        has_promo: false,
        free_ship: true,
      }],
      reviews: [],
      coupons: [],
    })

    expect(payload?.slug).toBe('mi-tienda')
    expect(payload?.categories[0]?.name).toBe('Categoria')
    expect(payload?.products[0]?.freeShip).toBe(true)
  })
})
