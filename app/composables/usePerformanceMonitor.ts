export interface WebVitalMetric {
  name: 'FCP' | 'LCP' | 'CLS' | 'INP' | 'TTFB'
  value: number
  rating: 'good' | 'needs-improvement' | 'poor'
}

type LayoutShiftEntry = PerformanceEntry & {
  hadRecentInput?: boolean
  value?: number
}

const rateMetric = (name: WebVitalMetric['name'], value: number): WebVitalMetric['rating'] => {
  if (name === 'CLS') return value <= 0.1 ? 'good' : value <= 0.25 ? 'needs-improvement' : 'poor'
  if (name === 'LCP') return value <= 2500 ? 'good' : value <= 4000 ? 'needs-improvement' : 'poor'
  if (name === 'INP') return value <= 200 ? 'good' : value <= 500 ? 'needs-improvement' : 'poor'
  if (name === 'TTFB') return value <= 800 ? 'good' : value <= 1800 ? 'needs-improvement' : 'poor'
  return value <= 1800 ? 'good' : value <= 3000 ? 'needs-improvement' : 'poor'
}

/**
 * Monitor liviano de Web Vitals sin dependencias externas.
 */
export const usePerformanceMonitor = () => {
  const metrics = useState<WebVitalMetric[]>('vento-web-vitals', () => [])

  const record = (name: WebVitalMetric['name'], value: number) => {
    const metric = { name, value, rating: rateMetric(name, value) }
    metrics.value = [...metrics.value.filter(item => item.name !== name), metric]
    return metric
  }

  const bind = () => {
    if (!import.meta.client || !('PerformanceObserver' in window)) {
      return () => {}
    }

    const observers: PerformanceObserver[] = []
    const observe = (type: string, callback: (entries: PerformanceEntryList) => void) => {
      try {
        const observer = new PerformanceObserver(list => callback(list.getEntries()))
        observer.observe({ type, buffered: true })
        observers.push(observer)
      } catch {
        // Unsupported metric on older Android browsers.
      }
    }

    observe('paint', entries => {
      const fcp = entries.find(entry => entry.name === 'first-contentful-paint')
      if (fcp) record('FCP', fcp.startTime)
    })
    observe('largest-contentful-paint', entries => {
      const last = entries[entries.length - 1]
      if (last) record('LCP', last.startTime)
    })
    observe('layout-shift', entries => {
      const cls = entries
        .filter(entry => !(entry as LayoutShiftEntry).hadRecentInput)
        .reduce((sum, entry) => sum + Number((entry as LayoutShiftEntry).value || 0), 0)
      record('CLS', cls)
    })
    observe('event', entries => {
      const longest = entries.reduce((max, entry) => Math.max(max, Number((entry as PerformanceEventTiming).duration || 0)), 0)
      if (longest) record('INP', longest)
    })

    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
    if (navigation) {
      record('TTFB', navigation.responseStart)
    }

    return () => observers.forEach(observer => observer.disconnect())
  }

  return {
    metrics: readonly(metrics),
    bind,
    record,
  }
}
