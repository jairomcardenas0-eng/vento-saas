import { z } from 'zod'

export const createProductSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(2000).optional(),
  price: z.number().min(0).max(999999),
  offerPrice: z.number().min(0).optional(),
  sku: z.string().max(50).optional(),
  categoryId: z.string().uuid(),
  catalogId: z.string().uuid(),
  freeShip: z.boolean().optional(),
  featured: z.boolean().optional(),
  onSale: z.boolean().optional(),
})

export const updateProductSchema = createProductSchema.extend({
  id: z.string().uuid(),
})
