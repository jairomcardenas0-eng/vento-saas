import { createSupabaseServiceRoleClient } from '../utils/supabase'
import { isPlanExpiringSoon } from '../utils/plans'

type JobContext = {
  event?: Parameters<typeof createSupabaseServiceRoleClient>[0]
}

export const recalcDailyStats = async (context?: JobContext) => {
  if (!context?.event) {
    return { ok: true, skipped: true, reason: 'missing_event' }
  }

  const supabase = createSupabaseServiceRoleClient(context.event)
  const { error } = await supabase.rpc('refresh_catalog_analytics_daily')
  if (error) {
    return { ok: false, skipped: false, reason: error.message }
  }

  return { ok: true, skipped: false }
}

export const cleanupOldAnalytics = async (context?: JobContext) => {
  if (!context?.event) {
    return { ok: true, skipped: true, reason: 'missing_event' }
  }

  const supabase = createSupabaseServiceRoleClient(context.event)
  const threshold = new Date(Date.now() - (90 * 24 * 60 * 60 * 1000)).toISOString()

  const [eventsResult, sessionsResult, dailySessionsResult] = await Promise.all([
    supabase.from('catalog_analytics_events').delete().lt('created_at', threshold),
    supabase.from('catalog_analytics_sessions').delete().lt('last_seen_at', threshold),
    supabase.from('catalog_analytics_daily_sessions').delete().lt('created_at', threshold),
  ])

  return {
    ok: !eventsResult.error && !sessionsResult.error && !dailySessionsResult.error,
    skipped: false,
    errors: [eventsResult.error?.message, sessionsResult.error?.message, dailySessionsResult.error?.message].filter(Boolean),
  }
}

export const notifyExpiringPlans = async (context?: JobContext) => {
  if (!context?.event) {
    return { ok: true, skipped: true, reason: 'missing_event' }
  }

  const supabase = createSupabaseServiceRoleClient(context.event)
  const { data, error } = await supabase
    .from('catalog_plans')
    .select('id, catalog_id, plan_type, status, activated_at, expires_at, payment_reference, notes')

  if (error) {
    return { ok: false, skipped: false, reason: error.message }
  }

  const expiring = (data || []).filter(plan => isPlanExpiringSoon({
    id: String(plan.id),
    catalogId: String(plan.catalog_id),
    planType: plan.plan_type as 'free' | 'basic' | 'pro' | 'enterprise',
    status: plan.status as 'trial' | 'active' | 'paused' | 'blocked' | 'expired',
    activatedAt: String(plan.activated_at),
    expiresAt: plan.expires_at ? String(plan.expires_at) : null,
    paymentReference: String(plan.payment_reference || ''),
    notes: String(plan.notes || ''),
  }))

  return {
    ok: true,
    skipped: false,
    expiringCount: expiring.length,
    expiringCatalogIds: expiring.map(plan => String(plan.catalog_id)),
  }
}

export const runDailyJobs = async (context?: JobContext) => {
  const [stats, cleanup, plans] = await Promise.all([
    recalcDailyStats(context),
    cleanupOldAnalytics(context),
    notifyExpiringPlans(context),
  ])

  return {
    ok: [stats, cleanup, plans].every(result => result.ok),
    results: {
      recalcDailyStats: stats,
      cleanupOldAnalytics: cleanup,
      notifyExpiringPlans: plans,
    },
  }
}
