type NetworkInformationLike = EventTarget & {
  effectiveType?: string
  saveData?: boolean
  downlink?: number
  addEventListener?: (type: string, listener: () => void) => void
  removeEventListener?: (type: string, listener: () => void) => void
}

const getConnection = () => {
  if (!import.meta.client) return null
  return (navigator as Navigator & { connection?: NetworkInformationLike }).connection || null
}

const STORAGE_KEY = 'vento-data-saver-v1'

/**
 * Modo ahorro de datos para redes 2G/3G: reduce animaciones, imagenes y frecuencia de sync.
 */
export const useDataSaver = () => {
  // Must be created inside a Vue/Nuxt context (setup, plugin, etc.)
  const enabled = useState<boolean>('data-saver-enabled', () => false)
  const autoEnabled = useState<boolean>('data-saver-auto-enabled', () => false)
  const bytesSaved = useState<number>('data-saver-bytes-saved', () => 0)

  const persist = (value: boolean) => {
    if (!import.meta.client) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ enabled: value, bytesSaved: bytesSaved.value }))
    } catch {
      // Preference is best effort.
    }
  }

  const applyDocumentState = () => {
    if (!import.meta.client) return
    document.documentElement.classList.toggle('data-saver', enabled.value)
  }

  const detectSlowConnection = () => {
    const connection = getConnection()
    if (!connection) return false

    return connection.saveData === true
      || connection.effectiveType === 'slow-2g'
      || connection.effectiveType === '2g'
      || Number(connection.downlink || 10) < 0.45
  }

  const loadPreference = () => {
    if (!import.meta.client) return

    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as { enabled?: boolean; bytesSaved?: number }
      if (typeof parsed.enabled === 'boolean') {
        enabled.value = parsed.enabled
      }
      bytesSaved.value = Number(parsed.bytesSaved || 0)
    } catch {
      enabled.value = false
    }

    autoEnabled.value = detectSlowConnection()
    if (autoEnabled.value) {
      enabled.value = true
    }
    applyDocumentState()
  }

  const markBytesSaved = (bytes: number) => {
    bytesSaved.value += Math.max(0, Math.floor(bytes || 0))
    persist(enabled.value)
  }

  const setEnabled = (value: boolean) => {
    enabled.value = value
    persist(value)
    applyDocumentState()
  }

  const bind = () => {
    if (!import.meta.client) return () => {}

    loadPreference()
    const startedAt = performance.now()
    const loadHandler = () => {
      const elapsed = performance.now() - startedAt
      if (elapsed > 3000) {
        autoEnabled.value = true
        setEnabled(true)
      }
    }
    const connection = getConnection()
    const connectionHandler = () => {
      autoEnabled.value = detectSlowConnection()
      if (autoEnabled.value) {
        setEnabled(true)
      }
    }

    window.addEventListener('load', loadHandler, { once: true })
    connection?.addEventListener?.('change', connectionHandler)

    return () => {
      window.removeEventListener('load', loadHandler)
      connection?.removeEventListener?.('change', connectionHandler)
    }
  }

  const imageWidthForContext = (context: 'thumb' | 'detail' | 'lightbox' = 'thumb') => {
    if (enabled.value) return 200
    if (context === 'lightbox') return 1200
    if (context === 'detail') return 600
    return 400
  }

  const realtimeIntervalMs = computed(() => enabled.value ? 30000 : 5000)

  return {
    enabled: readonly(enabled),
    autoEnabled: readonly(autoEnabled),
    bytesSaved: readonly(bytesSaved),
    realtimeIntervalMs,
    bind,
    setEnabled,
    markBytesSaved,
    imageWidthForContext,
  }
}
