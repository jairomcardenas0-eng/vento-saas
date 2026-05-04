import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { checkBudget, PERFORMANCE_BUDGETS } from '../../app/utils/performanceBudgets'

const serviceWorkerPath = fileURLToPath(new URL('../../public/sw.js', import.meta.url))
const cssPath = fileURLToPath(new URL('../../app/assets/css/main.css', import.meta.url))
const nuxtConfigPath = fileURLToPath(new URL('../../nuxt.config.ts', import.meta.url))

describe('offline and low-bandwidth performance guardrails', () => {
  it('defines cache strategies for shell, catalog data, images, API, and analytics', () => {
    const source = readFileSync(serviceWorkerPath, 'utf8')

    expect(source).toContain('staleWhileRevalidate')
    expect(source).toContain('cacheFirst')
    expect(source).toContain('PLACEHOLDER_SVG')
    expect(source).toContain('networkFirst')
    expect(source).toContain('fetch(request)')
    expect(source).toContain('vento-offline-sync')
  })

  it('disables costly animation and media surfaces in data saver mode', () => {
    const source = readFileSync(cssPath, 'utf8')

    expect(source).toContain('html.data-saver')
    expect(source).toContain('animation: none')
    expect(source).toContain('display: none !important')
  })

  it('compresses public assets and exposes explicit byte budgets', () => {
    const config = readFileSync(nuxtConfigPath, 'utf8')

    expect(config).toContain('compressPublicAssets')
    expect(PERFORMANCE_BUDGETS.every(budget => checkBudget(budget.name, budget.maxBytes).ok)).toBe(true)
  })
})
