// @vitest-environment jsdom
import { mount } from '@vue/test-utils'
import { computed, defineComponent, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ConnectionStatus from '../../app/components/ConnectionStatus.vue'

const onlineHandlers = new Set<() => void>()
const offlineHandlers = new Set<() => void>()

const pendingCount = ref(0)
const syncing = ref(false)
const lastSyncedAt = ref<string | null>(null)
const bindAutoSync = vi.fn(() => () => {})
const passthroughStub = defineComponent({
  setup(_, { slots }) {
    return () => slots.default?.()
  },
})

vi.stubGlobal('useOfflineQueue', () => ({
  pendingCount: computed(() => pendingCount.value),
  syncing: computed(() => syncing.value),
  lastSyncedAt: computed(() => lastSyncedAt.value),
  bindAutoSync,
}))

describe('ConnectionStatus', () => {
  beforeEach(() => {
    pendingCount.value = 0
    syncing.value = false
    lastSyncedAt.value = null
    bindAutoSync.mockClear()
    onlineHandlers.clear()
    offlineHandlers.clear()

    vi.stubGlobal('navigator', { onLine: true })
    vi.stubGlobal('ref', ref)
    vi.stubGlobal('computed', computed)
    vi.stubGlobal('watch', watch)
    vi.stubGlobal('onMounted', onMounted)
    vi.stubGlobal('onBeforeUnmount', onBeforeUnmount)
    vi.stubGlobal('window', {
      addEventListener: vi.fn((event: string, handler: () => void) => {
        if (event === 'online') onlineHandlers.add(handler)
        if (event === 'offline') offlineHandlers.add(handler)
      }),
      getComputedStyle: vi.fn(() => ({
        transitionDelay: '0s',
        transitionDuration: '0s',
        animationDelay: '0s',
        animationDuration: '0s',
      })),
      removeEventListener: vi.fn((event: string, handler: () => void) => {
        if (event === 'online') onlineHandlers.delete(handler)
        if (event === 'offline') offlineHandlers.delete(handler)
      }),
    })
  })

  it('shows pending sync state and binds the shared queue on mount', async () => {
    pendingCount.value = 3
    const wrapper = mount(ConnectionStatus, {
      global: {
        stubs: {
          Transition: passthroughStub,
          ClientOnly: passthroughStub,
        },
      },
    })
    await nextTick()

    expect(bindAutoSync).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('3 cambios pendientes')
    expect(wrapper.get('[role="status"]').attributes('role')).toBe('status')
  })

  it('reacts to offline mode with the expected subtle message', async () => {
    const wrapper = mount(ConnectionStatus, {
      global: {
        stubs: {
          Transition: passthroughStub,
          ClientOnly: passthroughStub,
        },
      },
    })
    ;(navigator as { onLine: boolean }).onLine = false
    offlineHandlers.forEach(handler => handler())
    await nextTick()

    expect(wrapper.text()).toContain('Sin conexion - modo offline')
    expect(wrapper.text()).toContain('Puedes seguir usando Vento.')
  })

  it('shows synced confirmation after the queue finishes', async () => {
    vi.useFakeTimers()
    syncing.value = true
    const wrapper = mount(ConnectionStatus, {
      global: {
        stubs: {
          Transition: passthroughStub,
          ClientOnly: passthroughStub,
        },
      },
    })
    await nextTick()

    syncing.value = false
    lastSyncedAt.value = new Date().toISOString()
    await nextTick()

    expect(wrapper.text()).toContain('Datos sincronizados')

    vi.advanceTimersByTime(2300)
    await nextTick()
    vi.useRealTimers()
  })
})
