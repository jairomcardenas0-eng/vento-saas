import { z } from 'zod'

export const createOrderSchema = z.object({
  catalogId: z.string().uuid(),
  customerName: z.string().min(1).max(100),
  customerPhone: z.string().min(5).max(20),
  customerEmail: z.string().email().max(100).optional(),
  deliveryAddress: z.string().max(500).optional(),
  deliveryZoneId: z.string().optional(),
  note: z.string().max(500).optional(),
  couponCode: z.string().max(20).optional(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    variantOptionId: z.string().optional(),
    quantity: z.number().int().min(1).max(99),
  })).min(1),
})
