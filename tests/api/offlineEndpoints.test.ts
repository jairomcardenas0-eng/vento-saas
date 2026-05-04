import { beforeEach, describe, expect, it, vi } from 'vitest'

const setResponseStatus = vi.fn()
const setHeader = vi.fn()

vi.mock('../../server/utils/cache', () => ({
  getCacheHealthSnapshot: vi.fn(async () => ({ configured: true, redisAvailable: true })),
  getCacheMetricsSnapshot: vi.fn(() => ({ hits: 1, misses: 0 })),
}))

vi.mock('../../server/utils/supabase', () => ({
  createSupabaseServiceRoleClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        limit: vi.fn(async () => ({ error: null })),
      })),
    })),
  })),
  createSupabaseServerClient: vi.fn(() => ({
    rpc: vi.fn(async () => ({
      data: {
        catalog: {
          settings: { businessName: 'Cafe Vento', storeHeaderName: 'Cafe', tagline: 'Listo para pedir' },
          theme: { bg: '#111111', primary: '#ff5e00' },
        },
      },
      error: null,
    })),
  })),
}))

vi.mock('../../server/utils/security', () => ({
  getRequestMeta: vi.fn(() => ({ requestId: 'req-1' })),
  sanitizeText: vi.fn((value: string) => value),
}))

describe('API handlers', () => {
  beforeEach(() => {
    vi.resetModules()
    setResponseStatus.mockReset()
    setHeader.mockReset()
    vi.stubGlobal('defineEventHandler', (handler: unknown) => handler)
    vi.stubGlobal('setResponseStatus', setResponseStatus)
    vi.stubGlobal('setHeader', setHeader)
    vi.stubGlobal('getRouterParam', () => 'cafeteria-demo')
    vi.stubGlobal('createError', (payload: unknown) => payload)
  })

  it('reports healthy status when the Supabase probe succeeds', async () => {
    const handler = (await import('../../server/api/health.get')).default as (event: unknown) => Promise<any>
    const result = await handler({})

    expect(setResponseStatus).toHaveBeenCalledWith({}, 200)
    expect(result.status).toBe('healthy')
    expect(result.checks.supabase).toBe(true)
  })

  it('builds a dynamic manifest with storefront branding', async () => {
    const handler = (await import('../../server/api/manifest/[slug].get')).default as (event: unknown) => Promise<any>
    const result = await handler({})

    expect(setHeader).toHaveBeenCalledWith({}, 'Content-Type', 'application/manifest+json')
    expect(result.name).toBe('Cafe Vento')
    expect(result.start_url).toBe('/cafeteria-demo')
    expect(result.display).toBe('standalone')
  })
})
