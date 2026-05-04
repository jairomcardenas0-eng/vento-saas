type CleanupFn = () => void

/**
 * Registro pequeno de limpieza para paginas con timers, ObjectURLs o suscripciones grandes.
 */
export const useMemoryManager = () => {
  const cleanups: CleanupFn[] = []
  const objectUrls = new Set<string>()

  const registerCleanup = (cleanup: CleanupFn) => {
    cleanups.push(cleanup)
    return cleanup
  }

  const trackObjectUrl = (url: string) => {
    objectUrls.add(url)
    return url
  }

  const cleanup = () => {
    while (cleanups.length) {
      const fn = cleanups.pop()
      try {
        fn?.()
      } catch {
        // Cleanup must never break navigation.
      }
    }

    objectUrls.forEach((url) => URL.revokeObjectURL(url))
    objectUrls.clear()
  }

  onUnmounted(cleanup)

  return {
    registerCleanup,
    trackObjectUrl,
    cleanup,
  }
}
