export interface ImageCompressionResult {
  blob: Blob
  width: number
  height: number
  mimeType: string
}

const readImage = (file: Blob) => new Promise<HTMLImageElement>((resolve, reject) => {
  const url = URL.createObjectURL(file)
  const image = new Image()
  image.decoding = 'async'
  image.onload = () => {
    URL.revokeObjectURL(url)
    resolve(image)
  }
  image.onerror = () => {
    URL.revokeObjectURL(url)
    reject(new Error('No se pudo procesar la imagen.'))
  }
  image.src = url
})

/**
 * Comprime imagenes en cliente usando canvas nativo. El canvas elimina metadatos EXIF.
 */
export const compressImage = async (
  file: Blob,
  options: { maxWidth?: number; quality?: number; mimeType?: 'image/webp' | 'image/jpeg' } = {},
): Promise<ImageCompressionResult> => {
  const image = await readImage(file)
  const maxWidth = options.maxWidth || 1200
  const ratio = Math.min(1, maxWidth / image.naturalWidth)
  const width = Math.max(1, Math.round(image.naturalWidth * ratio))
  const height = Math.max(1, Math.round(image.naturalHeight * ratio))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext('2d', {
    alpha: false,
    desynchronized: true,
  })

  if (!context) {
    throw new Error('Canvas no disponible para optimizar imagenes.')
  }

  context.drawImage(image, 0, 0, width, height)
  const mimeType = options.mimeType || 'image/webp'
  const quality = options.quality ?? 0.72
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => {
      if (!value) {
        reject(new Error('No se pudo comprimir la imagen.'))
        return
      }
      resolve(value)
    }, mimeType, quality)
  })

  return { blob, width, height, mimeType }
}
