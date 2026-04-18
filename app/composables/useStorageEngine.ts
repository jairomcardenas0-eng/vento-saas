const BUCKET = 'catalog-images'

const extractSupabasePath = (url: string) => {
  try {
    const match = url.match(/\/object\/public\/catalog-images\/(.+)/)
    return match ? match[1] : null
  } catch {
    return null
  }
}

export const useStorageEngine = () => {
  const { $supabase } = useNuxtApp()

  const uploadProductImage = async (
    storeId: string,
    file: File,
    onProgress?: (progress: number) => void,
  ): Promise<string> => {
    if (!file) {
      throw new Error('No file binary detected.')
    }

    const extension = file.name.split('.').pop() || 'bin'
    const secureFileName = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}.${extension}`
    const filePath = `tenants/${storeId}/products/${secureFileName}`

    onProgress?.(30)

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
