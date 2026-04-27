import { z } from 'zod'

export const updateCatalogSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50).regex(/^[a-z0-9-]+$/),
  whatsapp: z.string().min(5).max(20),
  description: z.string().max(500).optional(),
})

export const updateSettingsSchema = z.object({
  catalogId: z.string().uuid(),
  settings: z.record(z.string(), z.unknown()),
})

export const updateAppearanceSchema = z.object({
  catalogId: z.string().uuid(),
  theme: z.record(z.string(), z.unknown()),
})

export const inviteTeamMemberSchema = z.object({
  catalogId: z.string().uuid(),
  email: z.string().email().max(120),
  name: z.string().min(1).max(100),
  role: z.enum(['admin', 'editor', 'viewer']),
  permissions: z.record(z.string(), z.boolean()).optional(),
})
