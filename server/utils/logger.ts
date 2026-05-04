import { randomUUID } from 'node:crypto'

const correlationIdMap = new WeakMap<object, string>()

export const setCorrelationId = (event: object, id: string) => {
  correlationIdMap.set(event, id)
}

export const getCorrelationId = (event: object): string => {
  return correlationIdMap.get(event) || randomUUID()
}

export const logError = (event: object, context: string, error: unknown, meta?: Record<string, unknown>) => {
  const cid = getCorrelationId(event)
  console.error(`[${context}] ${cid}`, error, meta)
}

export const logInfo = (event: object, context: string, message: string, meta?: Record<string, unknown>) => {
  const cid = getCorrelationId(event)
  console.log(`[${context}] ${cid}`, message, meta)
}
