export const generatePublicEntityId = (prefix: 'order' | 'review') => {
  const timePart = Date.now().toString(36)
  let randomPart: string
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const arr = new Uint32Array(2)
    crypto.getRandomValues(arr)
    randomPart = Array.from(arr, n => n.toString(36)).join('')
  } else {
    randomPart = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10)
  }
  return `${prefix}-${timePart}-${randomPart}`
}
