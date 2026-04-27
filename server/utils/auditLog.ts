import type { H3Event } from 'h3'
import { createSupabaseServiceRoleClient } from './supabase'

type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'login'
  | 'logout'
  | 'export'
  | 'setting_change'
  | 'plan_change'
  | 'status_change'

type AuditLogInput = {
  actorId?: string | null
  actorName?: string | null
  actorEmail?: string | null
  catalogId?: string | null
  action: AuditAction
  entityType: string
  entityId?: string | null
  payloadBefore?: Record<string, unknown> | null
  payloadAfter?: Record<string, unknown> | null
}

export const insertAuditLog = async (event: H3Event, input: AuditLogInput) => {
  try {
    const supabase = createSupabaseServiceRoleClient(event)
    await supabase.from('audit_log').insert({
      actor_id: input.actorId || null,
      actor_name: input.actorName || null,
      actor_email: input.actorEmail || null,
      catalog_id: input.catalogId || null,
      action: input.action,
      entity_type: input.entityType,
      entity_id: input.entityId || null,
      payload_before: input.payloadBefore || null,
      payload_after: input.payloadAfter || null,
      ip_address: getRequestIP(event, { xForwardedFor: true }) || null,
      user_agent: getHeader(event, 'user-agent') || null,
    })
  } catch (error) {
    console.error('[audit_log] failed to insert', error)
  }
}
