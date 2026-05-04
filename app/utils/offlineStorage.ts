export type OfflineStoreName = 'queue' | 'catalogs' | 'meta'

type StoredRecord = {
  id: string
}

const DB_NAME = 'vento-offline-v1'
const DB_VERSION = 1
const STORE_NAMES: OfflineStoreName[] = ['queue', 'catalogs', 'meta']

let dbPromise: Promise<IDBDatabase> | null = null

const isIndexedDbAvailable = () =>
  typeof indexedDB !== 'undefined' && typeof globalThis.indexedDB !== 'undefined'

const openDb = () => {
  if (!isIndexedDbAvailable()) {
    return Promise.reject(new Error('IndexedDB no esta disponible en este dispositivo.'))
  }

  if (dbPromise) {
    return dbPromise
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      STORE_NAMES.forEach((storeName) => {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: 'id' })
        }
      })
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('No se pudo abrir IndexedDB.'))
  })

  return dbPromise
}

const runStore = async <T>(
  storeName: OfflineStoreName,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T> | void,
) => {
  const db = await openDb()

  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(storeName, mode)
    const store = transaction.objectStore(storeName)
    const request = operation(store)
    let resolved = false

    if (request) {
      request.onsuccess = () => {
        resolved = true
        resolve(request.result)
      }
      request.onerror = () => reject(request.error || new Error('Operacion offline fallida.'))
    }

    transaction.oncomplete = () => {
      if (!request && !resolved) {
        resolve(undefined as T)
      }
    }
    transaction.onerror = () => reject(transaction.error || new Error('Transaccion offline fallida.'))
  })
}

/**
 * Guarda un registro serializable en IndexedDB usando una store compartida de Vento.
 */
export const offlinePut = async <T extends StoredRecord>(storeName: OfflineStoreName, value: T) =>
  runStore<IDBValidKey>(storeName, 'readwrite', store => store.put(value))

/**
 * Lee un registro por id desde IndexedDB. Devuelve null cuando no existe o el storage no esta disponible.
 */
export const offlineGet = async <T extends StoredRecord>(storeName: OfflineStoreName, id: string): Promise<T | null> => {
  try {
    return await runStore<T | undefined>(storeName, 'readonly', store => store.get(id)) || null
  } catch {
    return null
  }
}

/**
 * Lista todos los registros de una store. Mantiene una API pequena para composables offline.
 */
export const offlineAll = async <T extends StoredRecord>(storeName: OfflineStoreName): Promise<T[]> => {
  try {
    return await runStore<T[]>(storeName, 'readonly', store => store.getAll()) || []
  } catch {
    return []
  }
}

export const offlineDelete = async (storeName: OfflineStoreName, id: string) =>
  runStore<undefined>(storeName, 'readwrite', store => {
    store.delete(id)
  })

export const offlineClear = async (storeName: OfflineStoreName) =>
  runStore<undefined>(storeName, 'readwrite', store => {
    store.clear()
  })

export const estimateOfflineStorage = async () => {
  if (typeof navigator === 'undefined' || !navigator.storage?.estimate) {
    return { quota: 0, usage: 0 }
  }

  const estimate = await navigator.storage.estimate()
  return {
    quota: Number(estimate.quota || 0),
    usage: Number(estimate.usage || 0),
  }
}
