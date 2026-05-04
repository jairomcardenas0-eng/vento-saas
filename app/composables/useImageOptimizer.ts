import { compressImage } from '~/utils/imageCompression'

const SUPABASE_OBJECT_MARKER = '/storage/v1/object/'

const appendParams = (url: string, params: Record<string, string | number | boolean>) => {
  try {
    const parsed = new URL(url)
    Object.entries(params).forEach(([key, value]) => parsed.searchParams.set(key, String(value)))
    return parsed.toString()
  } catch {
    return url
  }
}

/**
 * Utilidades de imagen responsiva: transforms de Supabase, srcset, blur placeholder y compresion.
 */
export const useImageOptimizer = () => {
  const optimizedUrl = (url: string | null | undefined, options: {
    width?: number
    quality?: number
    format?: 'webp' | 'origin'
  } = {}) => {
    if (!url) return ''

    const width = options.width || 400
    const quality = options.quality || 72
    if (!url.includes(SUPABASE_OBJECT_MARKER)) {
      return url
    }

    return appendParams(url, {
      width,
      quality,
      ...(options.format === 'origin' ? {} : { format: 'webp' }),
    })
  }

  const srcset = (url: string | null | undefined, widths = [200, 400, 600, 800]) =>
    widths
      .map(width => `${optimizedUrl(url, { width })} ${width}w`)
      .join(', ')

  const sizes = (context: 'thumb' | 'grid' | 'detail' | 'hero' = 'grid') => {
    if (context === 'thumb') return '96px'
    if (context === 'detail') return '(max-width: 768px) 100vw, 600px'
    if (context === 'hero') return '100vw'
    return '(max-width: 640px) 50vw, 280px'
  }

  const tinyPlaceholder = (seed = '#e5e7eb') =>
    `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="20" height="14"><rect width="20" height="14" fill="${seed}"/></svg>`)}`

  return {
    optimizedUrl,
    srcset,
    sizes,
    tinyPlaceholder,
    compressImage,
  }
}
