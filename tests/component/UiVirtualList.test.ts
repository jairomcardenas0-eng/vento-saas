// @vitest-environment jsdom
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import UiVirtualList from '~/components/ui/UiVirtualList.vue'

describe('UiVirtualList', () => {
  beforeAll(() => {
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      disconnect() {}
    })
  })

  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', {
      configurable: true,
      get: () => 120,
    })
  })

  it('renderiza solo una ventana de elementos visibles', async () => {
    const items = Array.from({ length: 100 }, (_, index) => ({
      id: `item-${index}`,
      label: `Item ${index}`,
    }))

    const wrapper = mount(UiVirtualList, {
      props: {
        items,
        itemHeight: 40,
        maxHeight: 120,
        overscan: 1,
      },
      slots: {
        default: ({ item }: { item: { label: string } }) => item.label,
      },
      attachTo: document.body,
    })

    expect(wrapper.text()).toContain('Item 0')
    expect(wrapper.text()).not.toContain('Item 20')
    expect(wrapper.findAll('.virtual-list-item').length).toBeLessThan(items.length)
  })

  it('actualiza la ventana cuando cambia el scroll', async () => {
    const items = Array.from({ length: 60 }, (_, index) => ({
      id: `row-${index}`,
      label: `Fila ${index}`,
    }))

    const wrapper = mount(UiVirtualList, {
      props: {
        items,
        itemHeight: 30,
        maxHeight: 120,
        overscan: 1,
      },
      slots: {
        default: ({ item }: { item: { label: string } }) => item.label,
      },
      attachTo: document.body,
    })

    const element = wrapper.element as HTMLElement
    element.scrollTop = 300
    await wrapper.trigger('scroll')

    expect(wrapper.text()).toContain('Fila 10')
    expect(wrapper.text()).not.toContain('Fila 0')
  })
})
