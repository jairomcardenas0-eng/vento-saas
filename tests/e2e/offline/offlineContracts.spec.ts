import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const appPath = fileURLToPath(new URL('../../../app/app.vue', import.meta.url))
const commercePath = fileURLToPath(new URL('../../../app/composables/backend/commerce.ts', import.meta.url))

describe('offline checkout flow contract', () => {
  it('mounts the connection status globally so every route exposes pending sync feedback', () => {
    const source = readFileSync(appPath, 'utf8')

    expect(source).toContain('<ConnectionStatus />')
  })

  it('queues public order and review submissions for automatic retry', () => {
    const source = readFileSync(commercePath, 'utf8')

    expect(source).toContain("type: 'order:create'")
    expect(source).toContain("url: '/api/orders/create'")
    expect(source).toContain("type: 'review:create'")
    expect(source).toContain("url: '/api/reviews/create'")
  })
})
