const BUCKET = 'catalog-images'
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const IMAGE_LIMITS = {
  free: 5,
  basic: 10,
  pro: Number.POSITIVE_INFINITY,
  enterprise: Number.POSITIVE_INFINITY,
} as const

const extractSupabasePath = (url: string) => {
  try {
    const match = url.match(/\/object\/public\/catalog-images\/(.+)/)
    return match ? match[1] : null
  } catch {
    return null
  }
}

const compressImageLocally = async (file: File, maxDim = 1080, quality = 0.85): Promise<File> => {
  return new Promise((resolve, reject) => {
    // Si no es una imagen o es svg/gif, no la tocamos
    if (!file.type.startsWith('image/') || file.type.includes('svg') || file.type.includes('gif')) {
      return resolve(file)
    }

    const img = new Image()
    const objectUrl = URL.createObjectURL(file)

    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      
      let { width, height } = img
      // Calculate new dimensions preserving aspect ratio
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width)
          width = maxDim
        } else {
          width = Math.round((width * maxDim) / height)
          height = maxDim
        }
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      
      const ctx = canvas.getContext('2d')
      if (!ctx) return resolve(file)

      // Draw the image onto the canvas
      ctx.drawImage(img, 0, 0, width, height)

      // Convert to WebP buffer
      canvas.toBlob(
        (blob) => {
          if (!blob) return resolve(file)
          
          // Create new compressed File object
          const newName = file.name.replace(/\.[^/.]+$/, "") + ".webp"
          const compressedFile = new File([blob], newName, {
            type: 'image/webp',
            lastModified: Date.now()
          })
          
          // Fallback en caso de que la compresión haga al archivo más grande (raro)
          resolve(compressedFile.size < file.size ? compressedFile : file)
        },
        'image/webp',
        quality
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(file) // Si falla la lectura, devolvemos el original
    }

    img.src = objectUrl
  })
}

export const useStorageEngine = () => {
  const { $supabase } = useNuxtApp()

  const uploadProductImage = async (
    storeId: string,
    rawFile: File,
    onProgress?: (progress: number) => void,
  ): Promise<string> => {
    if (!rawFile) {
      throw new Error('No file binary detected.')
    }

    if (!ALLOWED_MIME_TYPES.has(rawFile.type)) {
      throw new Error('Tipo de archivo no permitido. Usa JPEG, PNG o WebP.')
    }

    const [{ data: catalogRowRaw, error: catalogError }, { data: products, error: productsError }] = await Promise.all([
      $supabase.from('catalogs').select('plan_tier, settings').eq('id', storeId).maybeSingle(),
      $supabase.from('products').select('image_url, image_urls').eq('catalog_id', storeId),
    ])

    if (catalogError) {
      throw catalogError
    }

    if (productsError) {
      throw productsError
    }

    const catalogRow = (catalogRowRaw || null) as null | {
      plan_tier?: string | null
      settings?: {
        logoUrl?: string | null
        storeHeroBackgroundImage?: string | null
      } | null
    }

    const planTier = catalogRow?.plan_tier === 'basic' || catalogRow?.plan_tier === 'pro' || catalogRow?.plan_tier === 'enterprise'
      ? catalogRow.plan_tier
      : 'free'

    const imageCap = IMAGE_LIMITS[planTier]

    const currentImages = ((products || []) as Array<{ image_url?: string | null, image_urls?: string[] | null }>).reduce((sum, row) => {
      const main = row.image_url ? 1 : 0
      const gallery = Array.isArray(row.image_urls) ? row.image_urls.filter(Boolean).length : 0
      return sum + main + gallery
    }, 0) + (catalogRow?.settings?.logoUrl ? 1 : 0) + (catalogRow?.settings?.storeHeroBackgroundImage ? 1 : 0)

    if (Number.isFinite(imageCap) && currentImages + 1 > imageCap) {
      throw new Error('Has alcanzado el limite de imagenes de tu plan. Actualiza para agregar mas.')
    }

    onProgress?.(10) // Empezando compresión

    // Compresión Mágica usando Canvas (Máximo 1080px y WebP)
    const file = await compressImageLocally(rawFile)

    if (!ALLOWED_MIME_TYPES.has(file.type)) {
      throw new Error('El archivo procesado no tiene un formato permitido.')
    }

    const extension = file.name.split('.').pop() || 'bin'
    const now = new Date()
    const year = String(now.getFullYear())
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const secureFileName = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}.${extension}`
    const filePath = `tenants/${storeId}/products/${year}/${month}/${secureFileName}`

    onProgress?.(40) // Subiendo a Supabase

    const { data, error } = await $supabase.storage
      .from(BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      })

    if (error) {
      throw error
    }

    onProgress?.(100)

    const { data: urlData } = $supabase.storage.from(BUCKET).getPublicUrl(data.path)
    return urlData.publicUrl
  }

  const deleteProductImage = async (supabaseUrl: string) => {
    try {
      const path = extractSupabasePath(supabaseUrl)
      if (!path) {
        return
      }

      await $supabase.storage.from(BUCKET).remove([path])
    } catch (error) {
      console.warn('Storage GC Cleanup failed', error)
    }
  }

  return { uploadProductImage, deleteProductImage }
}
