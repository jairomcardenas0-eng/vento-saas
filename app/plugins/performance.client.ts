export default defineNuxtPlugin(() => {
  const dataSaver = useDataSaver()
  const performanceMonitor = usePerformanceMonitor()
  const offlineQueue = useOfflineQueue()

  const cleanupDataSaver = dataSaver.bind()
  const cleanupPerformance = performanceMonitor.bind()
  const handleServiceWorkerMessage = (event: MessageEvent) => {
    if (event.data?.type === 'VENTO_SYNC_REQUEST') {
      void offlineQueue.sync()
    }
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage)
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {
        // La app sigue funcionando sin SW en navegadores antiguos o entornos bloqueados.
      })
    }, { once: true })
  }

  window.addEventListener('beforeunload', () => {
    cleanupDataSaver()
    cleanupPerformance()
    navigator.serviceWorker?.removeEventListener('message', handleServiceWorkerMessage)
  }, { once: true })
})
