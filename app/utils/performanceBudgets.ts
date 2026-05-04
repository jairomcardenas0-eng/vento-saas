export interface PerformanceBudget {
  name: string
  maxBytes: number
}

export const PERFORMANCE_BUDGETS: PerformanceBudget[] = [
  { name: 'storefront-js', maxBytes: 200 * 1024 },
  { name: 'storefront-css', maxBytes: 100 * 1024 },
  { name: 'admin-js', maxBytes: 400 * 1024 },
  { name: 'admin-css', maxBytes: 150 * 1024 },
  { name: 'onboarding-js', maxBytes: 300 * 1024 },
]

export const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`
}

export const checkBudget = (name: string, bytes: number) => {
  const budget = PERFORMANCE_BUDGETS.find(item => item.name === name)
  if (!budget) {
    return { ok: true, name, bytes, maxBytes: Number.POSITIVE_INFINITY }
  }

  return {
    ok: bytes <= budget.maxBytes,
    name,
    bytes,
    maxBytes: budget.maxBytes,
  }
}
