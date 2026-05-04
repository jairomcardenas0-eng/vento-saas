<template>
  <div class="space-y-4">
    <div v-if="loading" class="rounded-[18px] border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300">
      Cargando timeline del pedido...
    </div>

    <div v-else-if="errorMessage" class="rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
      {{ errorMessage }}
    </div>

    <div v-else-if="!entries.length" class="rounded-[18px] border border-dashed border-zinc-300 px-4 py-6 text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
      Aún no hay actividad registrada para este pedido.
    </div>

    <div v-else class="timeline-list">
      <article
        v-for="entry in entries"
        :key="entry.id"
        class="timeline-entry"
      >
        <div class="timeline-marker">
          <span class="timeline-dot" :class="`timeline-dot-${entry.color}`">
            <component :is="entry.icon" class="h-3.5 w-3.5" />
          </span>
          <span class="timeline-line" />
        </div>

        <div class="min-w-0 rounded-[20px] border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{{ entry.title }}</p>
              <p class="mt-1 text-xs uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500">
                {{ entry.kind === 'history' ? 'Estado' : 'Evento interno' }}
              </p>
            </div>
            <span class="text-xs uppercase tracking-[0.14em] text-zinc-400 dark:text-zinc-500">
              {{ formatDate(entry.createdAt) }}
            </span>
          </div>

          <p v-if="entry.actor" class="mt-3 text-sm text-zinc-600 dark:text-zinc-300">
            {{ entry.actor }}
          </p>
          <p v-if="entry.note" class="mt-2 break-words text-sm text-zinc-500 dark:text-zinc-400">
            {{ entry.note }}
          </p>
        </div>
      </article>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  AlertCircle,
  CheckCheck,
  ClipboardList,
  Eye,
  PackageCheck,
  PackageOpen,
  StickyNote,
  Truck,
  UserRound,
  XCircle,
} from 'lucide-vue-next'
import type { CatalogOrderEvent, CatalogOrderStatusHistory, OrderEventType, OrderStatus } from '~/types/catalog'

const props = defineProps<{
  orderId: string
  catalogId: string
}>()

type TimelineEntry = {
  id: string
  kind: 'history' | 'event'
  title: string
  actor: string
  note: string
  createdAt: string
  color: 'blue' | 'gray' | 'yellow' | 'green-light' | 'green-dark' | 'red'
  icon: Component
}

const { $supabase } = useNuxtApp()
const entries = ref<TimelineEntry[]>([])
const loading = ref(false)
const errorMessage = ref('')
let channelCleanup: (() => void) | null = null

const statusLabel = (status: OrderStatus) => {
  if (status === 'new') return 'Pedido nuevo'
  if (status === 'viewed') return 'Pedido visto'
  if (status === 'preparing') return 'En preparación'
  if (status === 'ready') return 'Pedido listo'
  if (status === 'delivered' || status === 'completed' || status === 'closed') return 'Pedido entregado'
  if (status === 'cancelled') return 'Pedido cancelado'
  return status
}

const statusMeta = (status: OrderStatus) => {
  if (status === 'new') return { color: 'blue' as const, icon: ClipboardList }
  if (status === 'viewed') return { color: 'gray' as const, icon: Eye }
  if (status === 'preparing') return { color: 'yellow' as const, icon: PackageOpen }
  if (status === 'ready') return { color: 'green-light' as const, icon: PackageCheck }
  if (status === 'delivered' || status === 'completed' || status === 'closed') return { color: 'green-dark' as const, icon: CheckCheck }
  return { color: 'red' as const, icon: XCircle }
}

const eventLabel = (eventType: OrderEventType) => {
  if (eventType === 'assigned') return 'Pedido asignado'
  if (eventType === 'note_added') return 'Nota interna agregada'
  if (eventType === 'payment_received') return 'Pago recibido'
  if (eventType === 'viewed') return 'Pedido visto'
  if (eventType === 'preparing') return 'Preparación iniciada'
  if (eventType === 'ready') return 'Pedido listo'
  if (eventType === 'delivered') return 'Pedido entregado'
  if (eventType === 'cancelled') return 'Pedido cancelado'
  return eventType
}

const eventMeta = (eventType: OrderEventType) => {
  if (eventType === 'assigned') return { color: 'gray' as const, icon: UserRound }
  if (eventType === 'note_added') return { color: 'yellow' as const, icon: StickyNote }
  if (eventType === 'payment_received') return { color: 'green-light' as const, icon: CheckCheck }
  if (eventType === 'delivered') return { color: 'green-dark' as const, icon: Truck }
  if (eventType === 'cancelled') return { color: 'red' as const, icon: AlertCircle }
  return { color: 'blue' as const, icon: ClipboardList }
}

const buildHistoryEntry = (entry: CatalogOrderStatusHistory): TimelineEntry => {
  const meta = statusMeta(entry.status)
  return {
    id: `history-${entry.id}`,
    kind: 'history',
    title: statusLabel(entry.status),
    actor: entry.changedByName ? `Actualizado por ${entry.changedByName}` : 'Actualizado por sistema',
    note: entry.note || '',
    createdAt: entry.createdAt,
    color: meta.color,
    icon: meta.icon,
  }
}

const buildEventEntry = (entry: CatalogOrderEvent): TimelineEntry => {
  const meta = eventMeta(entry.eventType)
  const payloadNote = typeof entry.payload?.note === 'string' ? entry.payload.note : ''
  const payloadAssignee = typeof entry.payload?.assignedToName === 'string' ? entry.payload.assignedToName : ''
  const actor = payloadAssignee
    ? `Asignado a ${payloadAssignee}`
    : entry.createdBy
      ? `Registrado por ${entry.createdBy}`
      : 'Evento del sistema'

  return {
    id: `event-${entry.id}`,
    kind: 'event',
    title: eventLabel(entry.eventType),
    actor,
    note: payloadNote,
    createdAt: entry.createdAt,
    color: meta.color,
    icon: meta.icon,
  }
}

const formatDate = (value: string) =>
  new Date(value).toLocaleString('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

const fetchTimeline = async () => {
  const client = $supabase as any
  if (!props.catalogId || !props.orderId || !client) {
    entries.value = []
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    const [historyRes, eventsRes] = await Promise.all([
      client
        .from('order_status_history')
        .select('id, order_id, status, previous_status, changed_by, changed_by_name, note, created_at')
        .eq('catalog_id', props.catalogId)
        .eq('order_id', props.orderId)
        .order('created_at', { ascending: false }),
      client
        .from('order_events')
        .select('id, order_id, event_type, payload, created_by, created_at')
        .eq('catalog_id', props.catalogId)
        .eq('order_id', props.orderId)
        .order('created_at', { ascending: false }),
    ])

    if (historyRes.error) {
      throw historyRes.error
    }

    if (eventsRes.error) {
      throw eventsRes.error
    }

    const historyEntries = ((historyRes.data || []) as Array<Record<string, unknown>>).map((row) => buildHistoryEntry({
      id: String(row.id || ''),
      orderId: String(row.order_id || ''),
      status: row.status as OrderStatus,
      previousStatus: (row.previous_status as OrderStatus | null) || null,
      changedBy: typeof row.changed_by === 'string' ? row.changed_by : null,
      changedByName: typeof row.changed_by_name === 'string' ? row.changed_by_name : '',
      note: typeof row.note === 'string' ? row.note : '',
      createdAt: String(row.created_at || ''),
    }))

    const eventEntries = ((eventsRes.data || []) as Array<Record<string, unknown>>).map((row) => buildEventEntry({
      id: String(row.id || ''),
      orderId: String(row.order_id || ''),
      eventType: row.event_type as OrderEventType,
      payload: (row.payload as Record<string, unknown> | null) || null,
      createdBy: typeof row.created_by === 'string' ? row.created_by : null,
      createdAt: String(row.created_at || ''),
    }))

    entries.value = [...historyEntries, ...eventEntries]
      .sort((left, right) => {
        const a = new Date(left.createdAt).getTime() || 0
        const b = new Date(right.createdAt).getTime() || 0
        return b - a
      })
  } catch (error) {
    console.error('OrderTimeline Error:', error)
    errorMessage.value = 'No fue posible cargar el timeline de este pedido.'
  } finally {
    loading.value = false
  }
}

const bindRealtime = () => {
  channelCleanup?.()
  const client = $supabase as any
  if (!props.catalogId || !props.orderId || !client) {
    return
  }

  const channel = client
    .channel(`order-timeline:${props.catalogId}:${props.orderId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'order_status_history', filter: `order_id=eq.${props.orderId}` }, () => {
      void fetchTimeline()
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'order_events', filter: `order_id=eq.${props.orderId}` }, () => {
      void fetchTimeline()
    })
    .subscribe()

  channelCleanup = () => {
    void client.removeChannel(channel)
  }
}

watch(() => [props.catalogId, props.orderId], async () => {
  await fetchTimeline()
  bindRealtime()
}, { immediate: true })

onBeforeUnmount(() => {
  channelCleanup?.()
  channelCleanup = null
})
</script>

<style scoped>
.timeline-list {
  display: grid;
  gap: 0.9rem;
}

.timeline-entry {
  display: grid;
  grid-template-columns: 34px minmax(0, 1fr);
  gap: 0.9rem;
}

.timeline-marker {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.timeline-dot {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  border: 1px solid transparent;
}

.timeline-line {
  flex: 1;
  width: 2px;
  margin-top: 0.4rem;
  background: rgba(161, 161, 170, 0.3);
}

.timeline-entry:last-child .timeline-line {
  opacity: 0;
}

.timeline-dot-blue {
  background: rgba(59, 130, 246, 0.14);
  color: #2563eb;
  border-color: rgba(59, 130, 246, 0.24);
}

.timeline-dot-gray {
  background: rgba(113, 113, 122, 0.14);
  color: #52525b;
  border-color: rgba(113, 113, 122, 0.22);
}

.timeline-dot-yellow {
  background: rgba(245, 158, 11, 0.16);
  color: #b45309;
  border-color: rgba(245, 158, 11, 0.24);
}

.timeline-dot-green-light {
  background: rgba(74, 222, 128, 0.16);
  color: #15803d;
  border-color: rgba(74, 222, 128, 0.22);
}

.timeline-dot-green-dark {
  background: rgba(21, 128, 61, 0.14);
  color: #166534;
  border-color: rgba(21, 128, 61, 0.2);
}

.timeline-dot-red {
  background: rgba(239, 68, 68, 0.14);
  color: #b91c1c;
  border-color: rgba(239, 68, 68, 0.22);
}

.dark .timeline-line {
  background: rgba(113, 113, 122, 0.45);
}

.dark .timeline-dot-gray {
  background: rgba(113, 113, 122, 0.2);
  color: #d4d4d8;
}
</style>
