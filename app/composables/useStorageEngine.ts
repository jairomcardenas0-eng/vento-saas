const BUCKET = 'catalog-images'

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

    onProgress?.(10) // Empezando compresión

    // Compresión Mágica usando Canvas (Máximo 1080px y WebP)
    const file = await compressImageLocally(rawFile)

    const extension = file.name.split('.').pop() || 'bin'
    const secureFileName = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}.${extension}`
    const filePath = `tenants/${storeId}/products/${secureFileName}`

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
