import type { BackendSupabaseClient, EnsureSuccess } from './types'

export interface AdminNotificationSnapshot {
  ordersNew: number
  reviewsAttention: number
  reviewsPending: number
  reviewsToday: number
  deliveryOpen: number
  pickupOpen: number
  couponUses: number
  referrals: number
  teamPending: number
}

interface CreateSupabaseNotificationsBackendOptions {
  supabase: BackendSupabaseClient
  ensureSuccess: EnsureSuccess
}

const emptySnapshot = (): AdminNotificationSnapshot => ({
  ordersNew: 0,
  reviewsAttention: 0,
  reviewsPending: 0,
  reviewsToday: 0,
  deliveryOpen: 0,
  pickupOpen: 0,
  couponUses: 0,
  referrals: 0,
  teamPending: 0,
})

export const createSupabaseNotificationsBackend = ({
  supabase,
  ensureSuccess,
}: CreateSupabaseNotificationsBackendOptions) => {
  const countOrders = async (catalogId: string, options?: {
    status?: string | string[]
    deliveryMode?: 'delivery' | 'pickup'
  }) => {
    let query = supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('catalog_id', catalogId)

    if (Array.isArray(options?.status)) {
      query = query.in('status', options.status)
    } else if (options?.status) {
      query = query.eq('status', options.status)
    }

    if (options?.deliveryMode) {
      query = query.eq('delivery_mode', options.deliveryMode)
    }

    const { count, error } = await query
    ensureSuccess(error, 'No se pudieron cargar las notificaciones de pedidos')
    return Number(count || 0)
  }

  return {
    async getAdminNotificationSnapshot(catalogId: string, userUid?: string | null): Promise<AdminNotificationSnapshot> {
      if (!catalogId) {
        return emptySnapshot()
      }

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const todayIso = today.toISOString()
      const openOrderStatuses = ['new', 'viewed', 'preparing', 'ready']

      const [
        ordersNew,
        deliveryOpen,
        pickupOpen,
        reviewsPendingRes,
        reviewsTodayRes,
        couponsRes,
        referralsRes,
        teamPendingRes,
      ] = await Promise.all([
        countOrders(catalogId, { status: 'new' }),
        countOrders(catalogId, { status: openOrderStatuses, deliveryMode: 'delivery' }),
        countOrders(catalogId, { status: openOrderStatuses, deliveryMode: 'pickup' }),
        supabase.from('reviews').select('id', { count: 'exact', head: true }).eq('catalog_id', catalogId).eq('approved', false),
        supabase.from('reviews').select('id', { count: 'exact', head: true }).eq('catalog_id', catalogId).gte('created_at', todayIso),
        supabase.from('coupons').select('used_count').eq('catalog_id', catalogId),
        supabase.from('referrals').select('referred_uid', { count: 'exact', head: true }).eq('referrer_uid', userUid || ''),
        supabase.from('catalog_team_members').select('id', { count: 'exact', head: true }).eq('catalog_id', catalogId).eq('status', 'pending'),
      ])

      ensureSuccess(reviewsPendingRes.error, 'No se pudieron cargar las notificaciones de resenas')
      ensureSuccess(reviewsTodayRes.error, 'No se pudieron cargar las notificaciones de resenas')
      ensureSuccess(couponsRes.error, 'No se pudieron cargar las notificaciones de cupones')
      ensureSuccess(referralsRes.error, 'No se pudieron cargar las notificaciones de referidos')
      ensureSuccess(teamPendingRes.error, 'No se pudieron cargar las notificaciones del equipo')

      const reviewsPending = Number(reviewsPendingRes.count || 0)
      const reviewsToday = Number(reviewsTodayRes.count || 0)
      const couponUses = (couponsRes.data || []).reduce(
        (sum: number, row: { used_count?: number | null }) => sum + Number(row.used_count || 0),
        0,
      )

      return {
        ordersNew,
        deliveryOpen,
        pickupOpen,
        reviewsPending,
        reviewsToday,
        reviewsAttention: Math.max(reviewsPending, reviewsToday),
        couponUses,
        referrals: Number(referralsRes.count || 0),
        teamPending: Number(teamPendingRes.count || 0),
      }
    },
    watchAdminNotificationInvalidations(
      catalogId: string,
      userUid: string | null | undefined,
      onChange: () => void,
      onError?: (error: Error) => void,
    ) {
      if (!catalogId) {
        return () => {}
      }

      const watchedTables = [
        'orders',
        'reviews',
        'coupons',
        'catalog_team_members',
        ...(userUid ? ['referrals'] : []),
      ]

      const channel = watchedTables.reduce((currentChannel, table) => {
        const filter = table === 'referrals'
          ? userUid ? `referrer_uid=eq.${userUid}` : undefined
          : `catalog_id=eq.${catalogId}`
        return currentChannel.on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table,
            ...(filter ? { filter } : {}),
          },
          () => onChange(),
        )
      }, supabase.channel(`admin-notifications:${catalogId}`))

      channel.subscribe((status: string) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          onError?.(new Error(`Realtime notifications channel error: ${status}`))
        }
      })

      return () => {
        void supabase.removeChannel(channel)
      }
    },
  }
}
