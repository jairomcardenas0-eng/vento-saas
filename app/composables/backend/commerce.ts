import type { CatalogOrder, CatalogReview } from '~/types/catalog'
import { useOfflineQueue } from '~/composables/useOfflineQueue'
import type { OrdersStatsSnapshot, ReviewsStatsSnapshot } from './types'
import type {
  BackendRealtimePayload,
  BackendSupabaseClient,
  CouponRow,
  EnsureSuccess,
  OrderRow,
  OrdersStatsRow,
  ReviewRow,
  ReviewsStatsRow,
} from './types'

type RealtimeDocChange<T> = {
  type: 'added' | 'modified' | 'removed'
  doc: {
    id: string
    data: () => T
  }
}

let ordersChannelCounter = 0
let reviewsChannelCounter = 0

interface CreateSupabaseCommerceBackendOptions {
  supabase: BackendSupabaseClient
  ensureSuccess: EnsureSuccess
  orderSelect: string
  reviewSelect: string
  couponSelect: string
  defaultLivePageSize: number
  mapRowToOrder: (row: OrderRow) => CatalogOrder
  mapOrderToRow: (catalogId: string, order: CatalogOrder) => Record<string, unknown>
  mapRowToReview: (row: ReviewRow) => CatalogReview
  mapReviewToRow: (catalogId: string, review: CatalogReview) => Record<string, unknown>
  recalculateReviewStats: (catalogId: string) => Promise<void>
}

export const createSupabaseCommerceBackend = ({
  supabase,
  ensureSuccess,
  orderSelect,
  reviewSelect,
  couponSelect,
  defaultLivePageSize,
  mapRowToOrder,
  mapOrderToRow,
  mapRowToReview,
  mapReviewToRow,
  recalculateReviewStats,
}: CreateSupabaseCommerceBackendOptions) => {
  const normalizeOrderStatusForFilter = (status: string | null | undefined) => {
    if (status === 'viewed' || status === 'preparing' || status === 'ready') {
      return 'preparing'
    }

    if (status === 'delivered' || status === 'completed' || status === 'closed') {
      return 'completed'
    }

    return status || 'new'
  }

  const buildRealtimeDocChange = <T>(type: RealtimeDocChange<T>['type'], id: string, data: T): RealtimeDocChange<T> => ({
    type,
    doc: {
      id,
      data: () => data,
    },
  })

  const isRetryableClientError = (error: unknown) => {
    if (!import.meta.client) {
      return false
    }

    if (navigator.onLine === false) {
      return true
    }

    const status = Number((error as { statusCode?: number, status?: number })?.statusCode || (error as { status?: number })?.status || 0)
    return !status || status >= 500
  }

  const queueOfflineOperation = async (payload: {
    type: 'order:create' | 'review:create'
    url: string
    body: unknown
    priority: 1 | 2
  }) => {
    const offlineQueue = useOfflineQueue()
    await offlineQueue.enqueue({
      type: payload.type,
      url: payload.url,
      method: 'POST',
      body: payload.body,
      priority: payload.priority,
    })
  }

  return {
    async getOrdersPage(catalogId: string, options?: {
      beforeCreatedAt?: string | null
      limit?: number
      status?: string | null
    }) {
      const beforeCreatedAt = options?.beforeCreatedAt || null
      const limit = Math.max(1, Math.min(options?.limit ?? 25, 100))
      const status = options?.status && options.status !== 'all' ? options.status : null

      const { data, error } = await supabase.rpc('get_orders_page', {
        target_catalog_id: catalogId,
        status_filter: status,
        before_created_at: beforeCreatedAt,
        limit_count: limit,
      })

      if (error) {
        console.warn('[orders] RPC get_orders_page fallback:', error.message || error)
        let query = supabase
          .from('orders')
          .select(orderSelect)
          .eq('catalog_id', catalogId)
          .order('created_at', { ascending: false })
          .limit(limit)

        if (status) {
          if (status === 'preparing') {
            query = query.in('status', ['viewed', 'preparing', 'ready'])
          } else if (status === 'completed') {
            query = query.in('status', ['delivered', 'completed', 'closed'])
          } else {
            query = query.eq('status', status)
          }
        }

        if (beforeCreatedAt) {
          query = query.lt('created_at', beforeCreatedAt)
        }

        const fallback = await query
        ensureSuccess(fallback.error, 'No se pudieron cargar los pedidos')

        const items = ((fallback.data || []) as unknown as OrderRow[]).map(mapRowToOrder)
        const nextCursor = items.length === limit ? items[items.length - 1]?.createdAt || null : null
        return { items, nextCursor, hasMore: items.length === limit }
      }

      const items = ((data || []) as unknown as OrderRow[]).map(mapRowToOrder)
      const nextCursor = items.length === limit ? items[items.length - 1]?.createdAt || null : null
      return { items, nextCursor, hasMore: items.length === limit }
    },
    async getOrdersStats(catalogId: string): Promise<OrdersStatsSnapshot> {
      const { data, error } = await supabase.rpc('get_orders_stats', {
        target_catalog_id: catalogId,
      })

      if (!error && data?.[0]) {
        const row = data[0] as OrdersStatsRow
        return {
          total: Number(row.total_count || 0),
          new: Number(row.new_count || 0),
          preparing: Number(row.preparing_count || 0),
          completed: Number(row.completed_count || 0),
          cancelled: Number(row.cancelled_count || 0),
          monthSales: Number(row.month_sales || 0),
        }
      }

      if (error) {
        console.warn('[orders] RPC get_orders_stats fallback:', error.message || error)
      }

      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const [allRes, newRes, preparingRes, completedRes, cancelledRes, monthSalesRes] = await Promise.all([
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('catalog_id', catalogId),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('catalog_id', catalogId).eq('status', 'new'),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('catalog_id', catalogId).in('status', ['viewed', 'preparing', 'ready']),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('catalog_id', catalogId).in('status', ['delivered', 'completed', 'closed']),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('catalog_id', catalogId).eq('status', 'cancelled'),
        supabase.from('orders').select('total,status').eq('catalog_id', catalogId).gte('created_at', startOfMonth.toISOString()),
      ])

      ensureSuccess(allRes.error, 'No se pudieron cargar las metricas de pedidos')
      ensureSuccess(newRes.error, 'No se pudieron cargar las metricas de pedidos')
      ensureSuccess(preparingRes.error, 'No se pudieron cargar las metricas de pedidos')
      ensureSuccess(completedRes.error, 'No se pudieron cargar las metricas de pedidos')
      ensureSuccess(cancelledRes.error, 'No se pudieron cargar las metricas de pedidos')
      ensureSuccess(monthSalesRes.error, 'No se pudieron cargar las metricas de pedidos')

      const monthSales = (monthSalesRes.data || []).reduce((sum: number, row: Pick<OrderRow, 'status' | 'total'>) => {
        const status = normalizeOrderStatusForFilter(String(row.status || ''))
        if (status === 'cancelled') {
          return sum
        }

        return sum + Number(row.total || 0)
      }, 0)

      return {
        total: Number(allRes.count || 0),
        new: Number(newRes.count || 0),
        preparing: Number(preparingRes.count || 0),
        completed: Number(completedRes.count || 0),
        cancelled: Number(cancelledRes.count || 0),
        monthSales,
      }
    },
    async getReviewsPage(catalogId: string, options?: {
      beforeCreatedAt?: string | null
      limit?: number
      approved?: boolean | null
    }) {
      const beforeCreatedAt = options?.beforeCreatedAt || null
      const limit = Math.max(1, Math.min(options?.limit ?? 25, 100))
      const approved = typeof options?.approved === 'boolean' ? options.approved : null

      const { data, error } = await supabase.rpc('get_reviews_page', {
        target_catalog_id: catalogId,
        approved_filter: approved,
        before_created_at: beforeCreatedAt,
        limit_count: limit,
      })

      if (error) {
        console.warn('[reviews] RPC get_reviews_page fallback:', error.message || error)
        let query = supabase
          .from('reviews')
          .select(reviewSelect)
          .eq('catalog_id', catalogId)
          .order('created_at', { ascending: false })
          .limit(limit)

        if (typeof approved === 'boolean') {
          query = query.eq('approved', approved)
        }

        if (beforeCreatedAt) {
          query = query.lt('created_at', beforeCreatedAt)
        }

        const fallback = await query
        ensureSuccess(fallback.error, 'No se pudieron cargar las resenas')

        const items = ((fallback.data || []) as unknown as ReviewRow[]).map(mapRowToReview)
        const nextCursor = items.length === limit ? items[items.length - 1]?.createdAt || null : null
        return { items, nextCursor, hasMore: items.length === limit }
      }

      const items = ((data || []) as unknown as ReviewRow[]).map(mapRowToReview)
      const nextCursor = items.length === limit ? items[items.length - 1]?.createdAt || null : null
      return { items, nextCursor, hasMore: items.length === limit }
    },
    async getReviewsStats(catalogId: string): Promise<ReviewsStatsSnapshot> {
      const { data, error } = await supabase.rpc('get_reviews_stats', {
        target_catalog_id: catalogId,
      })

      if (!error && data?.[0]) {
        const row = data[0] as ReviewsStatsRow
        const averageApprovedRating = Number(row.average_rating || 0)
        return {
          pending: Number(row.pending_count || 0),
          approved: Number(row.approved_count || 0),
          averageApprovedRating,
          positivityPercent: Math.round((averageApprovedRating / 5) * 100),
        }
      }

      if (error) {
        console.warn('[reviews] RPC get_reviews_stats fallback:', error.message || error)
      }

      const [pendingRes, approvedRes] = await Promise.all([
        supabase.from('reviews').select('id', { count: 'exact', head: true }).eq('catalog_id', catalogId).eq('approved', false),
        supabase.from('reviews').select('rating', { count: 'exact' }).eq('catalog_id', catalogId).eq('approved', true),
      ])

      ensureSuccess(pendingRes.error, 'No se pudieron cargar las metricas de resenas')
      ensureSuccess(approvedRes.error, 'No se pudieron cargar las metricas de resenas')

      const approvedRatings = (approvedRes.data || []) as Array<Pick<ReviewRow, 'rating'>>
      const averageApprovedRating = approvedRatings.length
        ? approvedRatings.reduce((sum: number, row) => sum + Number(row.rating || 0), 0) / approvedRatings.length
        : 0

      return {
        pending: Number(pendingRes.count || 0),
        approved: Number(approvedRes.count || 0),
        averageApprovedRating,
        positivityPercent: approvedRatings.length ? Math.round((averageApprovedRating / 5) * 100) : 0,
      }
    },
    subscribeToOrders(
      catalogId: string,
      callback: (change: RealtimeDocChange<CatalogOrder>) => void,
      onError?: (error: Error) => void,
    ) {
      const channelName = `orders-live:${catalogId}:${++ordersChannelCounter}`
      const channel = supabase
        .channel(channelName)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `catalog_id=eq.${catalogId}` }, (payload: BackendRealtimePayload<OrderRow>) => {
          try {
            if (payload.eventType === 'INSERT' && payload.new) {
              callback(buildRealtimeDocChange('added', String(payload.new.id), mapRowToOrder(payload.new as OrderRow)))
            } else if (payload.eventType === 'UPDATE' && payload.new) {
              callback(buildRealtimeDocChange('modified', String(payload.new.id), mapRowToOrder(payload.new as OrderRow)))
            } else if (payload.eventType === 'DELETE' && payload.old) {
              callback(buildRealtimeDocChange('removed', String(payload.old.id), mapRowToOrder(payload.old as OrderRow)))
            }
          } catch (error) {
            onError?.(error as Error)
          }
        })
        .subscribe()

      return () => {
        void supabase.removeChannel(channel)
      }
    },
    subscribeToReviews(
      catalogId: string,
      callback: (change: RealtimeDocChange<CatalogReview>) => void,
      onError?: (error: Error) => void,
    ) {
      const channelName = `reviews-live:${catalogId}:${++reviewsChannelCounter}`
      const channel = supabase
        .channel(channelName)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews', filter: `catalog_id=eq.${catalogId}` }, (payload: BackendRealtimePayload<ReviewRow>) => {
          try {
            if (payload.eventType === 'INSERT' && payload.new) {
              callback(buildRealtimeDocChange('added', String(payload.new.id), mapRowToReview(payload.new as ReviewRow)))
            } else if (payload.eventType === 'UPDATE' && payload.new) {
              callback(buildRealtimeDocChange('modified', String(payload.new.id), mapRowToReview(payload.new as ReviewRow)))
            } else if (payload.eventType === 'DELETE' && payload.old) {
              callback(buildRealtimeDocChange('removed', String(payload.old.id), mapRowToReview(payload.old as ReviewRow)))
            }
          } catch (error) {
            onError?.(error as Error)
          }
        })
        .subscribe()

      return () => {
        void supabase.removeChannel(channel)
      }
    },
    async updateReview(catalogId: string, reviewId: string, payload: Partial<CatalogReview>) {
      const { error } = await supabase
        .from('reviews')
        .update({
          approved: payload.approved,
          admin_reply: payload.adminReply,
        })
        .eq('catalog_id', catalogId)
        .eq('id', reviewId)

      ensureSuccess(error, 'No se pudo actualizar la resena')
      await recalculateReviewStats(catalogId)
    },
    async deleteReview(catalogId: string, reviewId: string) {
      const { error } = await supabase.from('reviews').delete().eq('catalog_id', catalogId).eq('id', reviewId)
      ensureSuccess(error, 'No se pudo eliminar la resena')
      await recalculateReviewStats(catalogId)
    },
    async appendReview(catalogId: string, review: CatalogReview) {
      if (import.meta.client) {
        const body = {
          catalogId,
          review,
        }

        if (navigator.onLine === false) {
          await queueOfflineOperation({
            type: 'review:create',
            url: '/api/reviews/create',
            body,
            priority: 2,
          })
          return
        }

        try {
          await $fetch('/api/reviews/create', {
            method: 'POST',
            body,
          })
        } catch (error) {
          if (isRetryableClientError(error)) {
            await queueOfflineOperation({
              type: 'review:create',
              url: '/api/reviews/create',
              body,
              priority: 2,
            })
            return
          }

          throw new Error(`No se pudo enviar la reseña: ${error instanceof Error ? error.message : String(error)}`)
        }
        return
      }

      const { error } = await supabase.from('reviews').insert(mapReviewToRow(catalogId, review))
      ensureSuccess(error, 'No se pudo guardar la resena')
      if (review.approved) {
        await recalculateReviewStats(catalogId)
      }
    },
    watchReviews(catalogId: string, callback: (reviews: CatalogReview[]) => void, onError?: (error: Error) => void) {
      let currentReviews: CatalogReview[] = []

      const fetchReviews = async () => {
        const { data, error } = await supabase
          .from('reviews')
          .select(reviewSelect)
          .eq('catalog_id', catalogId)
          .order('created_at', { ascending: false })
          .limit(defaultLivePageSize)

        if (error) {
          throw error
        }

        currentReviews = ((data || []) as unknown as ReviewRow[]).map(mapRowToReview)
        callback(currentReviews)
      }

      fetchReviews().catch((error) => onError?.(error as Error))

      const channel = supabase
        .channel(`reviews:${catalogId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'reviews', filter: `catalog_id=eq.${catalogId}` }, (payload: BackendRealtimePayload<ReviewRow>) => {
          try {
            if (payload.eventType === 'INSERT' && payload.new) {
              const review = mapRowToReview(payload.new as ReviewRow)
              currentReviews = [review, ...currentReviews.filter(item => item.id !== review.id)].slice(0, defaultLivePageSize)
            } else if (payload.eventType === 'UPDATE' && payload.new) {
              const review = mapRowToReview(payload.new as ReviewRow)
              currentReviews = currentReviews.map(item => item.id === review.id ? review : item)
            } else if (payload.eventType === 'DELETE' && payload.old?.id) {
              currentReviews = currentReviews.filter(item => item.id !== String(payload.old.id))
            }

            callback(currentReviews)
          } catch (error) {
            onError?.(error as Error)
          }
        })
        .subscribe((status: string) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            onError?.(new Error(`Realtime reviews channel error: ${status}`))
          } else if (status === 'CLOSED') {
            // Re-sync on reconnect after unexpected close
            fetchReviews().catch((error) => onError?.(error as Error))
          }
        })

      return () => {
        void supabase.removeChannel(channel)
      }
    },
    async updateOrderStatus(catalogId: string, orderId: string, payload: {
      status: CatalogOrder['status']
      note?: string
      assignedToUid?: string | null
      assignedToName?: string | null
      internalNotes?: string
    }) {
      const { data: currentOrder, error: currentOrderError } = await supabase
        .from('orders')
        .select('status')
        .eq('catalog_id', catalogId)
        .eq('id', orderId)
        .maybeSingle()

      ensureSuccess(currentOrderError, 'No se pudo leer el pedido actual')

      const { error } = await supabase
        .from('orders')
        .update({
          status: payload.status,
          assigned_to_uid: payload.assignedToUid || null,
          assigned_to_name: payload.assignedToName || null,
          internal_notes: payload.internalNotes || '',
        })
        .eq('catalog_id', catalogId)
        .eq('id', orderId)

      ensureSuccess(error, 'No se pudo actualizar el pedido')

      if (payload.note?.trim() || payload.status !== currentOrder?.status) {
        const { error: historyError } = await supabase.from('order_status_history').insert({
          catalog_id: catalogId,
          order_id: orderId,
          status: payload.status,
          previous_status: currentOrder?.status || null,
          changed_by: null,
          changed_by_name: payload.assignedToName || 'Equipo',
          note: payload.note?.trim() || '',
        })

        ensureSuccess(historyError, 'No se pudo guardar el historial del pedido')
      }

      if (payload.note?.trim()) {
        const { error: eventError } = await supabase.from('order_events').insert({
          catalog_id: catalogId,
          order_id: orderId,
          event_type: 'note_added',
          payload: {
            note: payload.note.trim(),
            assignedToUid: payload.assignedToUid || null,
            assignedToName: payload.assignedToName || null,
          },
          created_by: null,
        })

        ensureSuccess(eventError, 'No se pudo registrar el evento del pedido')
      }
    },
    async appendOrder(catalogId: string, order: CatalogOrder) {
      if (import.meta.client) {
        const body = {
          catalogId,
          order,
        }

        if (navigator.onLine === false) {
          await queueOfflineOperation({
            type: 'order:create',
            url: '/api/orders/create',
            body,
            priority: 1,
          })
          return
        }

        try {
          await $fetch('/api/orders/create', {
            method: 'POST',
            body,
          })
        } catch (error) {
          if (isRetryableClientError(error)) {
            await queueOfflineOperation({
              type: 'order:create',
              url: '/api/orders/create',
              body,
              priority: 1,
            })
            return
          }

          throw new Error(`No se pudo enviar el pedido: ${error instanceof Error ? error.message : String(error)}`)
        }
        return
      }

      const { error } = await supabase.from('orders').insert(mapOrderToRow(catalogId, order))
      ensureSuccess(error, 'No se pudo guardar el pedido')

      if (order.appliedCoupon?.id) {
        const { data: coupon, error: couponError } = await supabase
          .from('coupons')
          .select('used_count')
          .eq('id', order.appliedCoupon.id)
          .eq('catalog_id', catalogId)
          .maybeSingle()

        ensureSuccess(couponError, 'No se pudo leer el cupon aplicado')
        if (coupon) {
          const { error: updateError } = await supabase
            .from('coupons')
            .update({
              used_count: Number(coupon.used_count || 0) + 1,
              updated_at: new Date().toISOString(),
            })
            .eq('catalog_id', catalogId)
            .eq('id', order.appliedCoupon.id)

          ensureSuccess(updateError, 'No se pudo actualizar el uso del cupon')
        }
      }
    },
    watchOrders(
      catalogId: string,
      callback: (payload: { orders: CatalogOrder[], changes: RealtimeDocChange<CatalogOrder>[] }) => void,
      onError?: (error: Error) => void,
    ) {
      let currentOrders: CatalogOrder[] = []

      const fetchOrders = async (changes: RealtimeDocChange<CatalogOrder>[] = []) => {
        try {
          const { data, error } = await supabase
            .from('orders')
            .select(orderSelect)
            .eq('catalog_id', catalogId)
            .order('created_at', { ascending: false })
            .limit(defaultLivePageSize)

          if (error) {
            throw error
          }

          currentOrders = ((data || []) as unknown as OrderRow[]).map(mapRowToOrder)
          callback({
            orders: currentOrders,
            changes,
          })
        } catch (error) {
          onError?.(error as Error)
        }
      }

      fetchOrders()

      const channel = supabase
        .channel(`orders:${catalogId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `catalog_id=eq.${catalogId}` }, async (payload: BackendRealtimePayload<OrderRow>) => {
          try {
            const changes: RealtimeDocChange<CatalogOrder>[] = []

            if (payload.eventType === 'INSERT' && payload.new) {
              const order = mapRowToOrder(payload.new as OrderRow)
              currentOrders = [order, ...currentOrders.filter(item => item.id !== order.id)].slice(0, defaultLivePageSize)
              changes.push(buildRealtimeDocChange('added', String(payload.new.id), order))
            } else if (payload.eventType === 'UPDATE' && payload.new) {
              const order = mapRowToOrder(payload.new as OrderRow)
              currentOrders = currentOrders.map(item => item.id === order.id ? order : item)
              changes.push(buildRealtimeDocChange('modified', String(payload.new.id), order))
            } else if (payload.eventType === 'DELETE' && payload.old?.id) {
              const deletedId = String(payload.old.id)
              const removed = currentOrders.find(item => item.id === deletedId)
              currentOrders = currentOrders.filter(item => item.id !== deletedId)
              if (removed) {
                changes.push(buildRealtimeDocChange('removed', deletedId, removed))
              }
            }

            callback({
              orders: currentOrders,
              changes,
            })
          } catch (error) {
            onError?.(error as Error)
          }
        })
        .subscribe((status: string) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            onError?.(new Error(`Realtime orders channel error: ${status}`))
          } else if (status === 'CLOSED') {
            fetchOrders().catch((error) => onError?.(error as Error))
          }
        })

      return () => {
        void supabase.removeChannel(channel)
      }
    },
  }
}
