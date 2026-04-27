import { z } from 'zod'

export const createCouponSchema = z.object({
  code: z.string().min(1).max(20),
  type: z.enum(['percentage', 'fixed']),
  value: z.number().min(0),
  minAmount: z.number().min(0).optional(),
  maxUses: z.number().int().min(1).optional(),
  expiresAt: z.string().datetime().optional(),
  catalogId: z.string().uuid(),
})
