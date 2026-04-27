import { inviteTeamMemberSchema } from '../../schemas/catalog.schema'
import { insertAuditLog } from '../../utils/auditLog'
import { invalidateByCatalog } from '../../utils/cache'
import { checkPlanLimit } from '../../utils/plans'
import { sanitizePlainText } from '../../utils/sanitize'
import { createSupabaseServiceRoleClient } from '../../utils/supabase'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  const parsed = inviteTeamMemberSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: JSON.stringify(parsed.error.flatten()) })
  }

  const supabase = createSupabaseServiceRoleClient(event)
  const payload = parsed.data

  const [{ data: catalog, error: catalogError }, { count: memberCount, error: memberError }] = await Promise.all([
    supabase.from('catalogs').select('plan_tier').eq('id', payload.catalogId).maybeSingle(),
    supabase.from('catalog_team_members').select('id', { count: 'exact', head: true }).eq('catalog_id', payload.catalogId),
  ])

  if (catalogError || !catalog) {
    throw createError({ statusCode: 404, statusMessage: 'Catalogo no encontrado' })
  }

  if (memberError) {
    throw createError({ statusCode: 500, statusMessage: 'No se pudo validar el limite del equipo' })
  }

  const limitCheck = checkPlanLimit(catalog.plan_tier, 'maxTeamMembers', Number(memberCount || 0) + 1)
  if (!limitCheck.allowed) {
    throw createError({ statusCode: 403, statusMessage: 'Has alcanzado el limite de miembros de tu plan. Actualiza para invitar mas.' })
  }

  const { data, error } = await supabase
    .from('catalog_team_members')
    .insert({
      catalog_id: payload.catalogId,
      email: payload.email.trim().toLowerCase(),
      name: sanitizePlainText(payload.name, 100),
      role: payload.role,
      status: 'pending',
      permissions: payload.permissions || {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) {
    throw createError({ statusCode: 500, statusMessage: error.message || 'No se pudo invitar al miembro' })
  }

  await insertAuditLog(event, {
    catalogId: payload.catalogId,
    action: 'create',
    entityType: 'team_member',
    entityId: data?.id ? String(data.id) : null,
    payloadAfter: {
      email: payload.email,
      role: payload.role,
    },
  })

  await invalidateByCatalog(payload.catalogId)

  return { ok: true, id: data?.id || null }
})
