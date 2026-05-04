import { describe, expect, it } from 'vitest'
import { useImageOptimizer } from '../../../app/composables/useImageOptimizer'

const SUPABASE_IMAGE = 'https://demo.supabase.co/storage/v1/object/public/catalogs/product.jpg'

describe('useImageOptimizer', () => {
  it('adds Supabase transform params for compressed WebP variants', () => {
    const { optimizedUrl } = useImageOptimizer()
    const url = optimizedUrl(SUPABASE_IMAGE, { width: 200, quality: 70 })

    expect(url).toContain('width=200')
    expect(url).toContain('quality=70')
    expect(url).toContain('format=webp')
  })

  it('leaves non-storage URLs untouched to avoid breaking external assets', () => {
    const { optimizedUrl } = useImageOptimizer()
    const url = 'https://example.com/image.jpg'

    expect(optimizedUrl(url, { width: 200 })).toBe(url)
  })

  it('builds stable srcset and sizes for storefront contexts', () => {
    const { srcset, sizes } = useImageOptimizer()

    expect(srcset(SUPABASE_IMAGE, [200, 400])).toContain('200w')
    expect(srcset(SUPABASE_IMAGE, [200, 400])).toContain('400w')
    expect(sizes('thumb')).toBe('96px')
    expect(sizes('detail')).toContain('600px')
  })

  it('returns a tiny inline placeholder with the requested color seed', () => {
    const { tinyPlaceholder } = useImageOptimizer()

    expect(decodeURIComponent(tinyPlaceholder('#ffffff'))).toContain('fill="#ffffff"')
  })
})
