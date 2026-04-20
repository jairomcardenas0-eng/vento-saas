import { createCatalogRecord, demoCatalog, demoUser } from '~/data/defaults'
import type {
  CatalogOrder,
  CatalogRecord,
  CatalogReview,
  UserProfile,
} from '~/types/catalog'

interface PlatformState {
  users: UserProfile[]
  catalogs: CatalogRecord[]
  sessions: Record<string, string>
}

const STORAGE_KEY = 'saas-core-platform-v1'

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))

const getDefaultState = (): PlatformState => ({
  users: [demoUser()],
  catalogs: [demoCatalog()],
  sessions: {
    'demo@catalogo.com': 'demo12345',
  },
})

const readState = (): PlatformState => {
  if (!import.meta.client) {
    return getDefaultState()
  }

  const raw = localStorage.getItem(STORAGE_KEY)

  if (!raw) {
    const state = getDefaultState()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    return state
  }

  try {
    return JSON.parse(raw) as PlatformState
  } catch {
    const state = getDefaultState()
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
    return state
  }
}

const writeState = (state: PlatformState) => {
  if (import.meta.client) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }
}

export const useLocalPlatform = () => {
  const getUserByEmail = (email: string) => readState().users.find(item => item.email.toLowerCase() === email.toLowerCase()) || null

  const login = (email: string, password: string) => {
    const state = readState()
    const stored = state.sessions[email.toLowerCase()]

    if (!stored || stored !== password) {
      throw new Error('Credenciales inválidas')
    }

    const user = state.users.find(item => item.email.toLowerCase() === email.toLowerCase())
    if (!user) {
      throw new Error('Usuario no encontrado')
    }

    return clone(user)
  }

  const register = (displayName: string, email: string, password: string) => {
    const state = readState()
    const normalized = email.toLowerCase()

    if (state.users.some(item => item.email.toLowerCase() === normalized)) {
      throw new Error('Ese correo ya está registrado')
    }

    const user: UserProfile = {
      uid: `user-${Date.now()}`,
      email: normalized,
      displayName,
      defaultCatalogId: null,
      systemRole: 'merchant',
      createdAt: new Date().toISOString(),
    }

    state.users.push(user)
    state.sessions[normalized] = password
    writeState(state)
    return clone(user)
  }

  const ensureUniqueSlug = (slug: string) => {
    const exists = readState().catalogs.some(item => item.slug === slug)
    if (exists) {
      throw new Error('Ese slug ya está en uso')
    }
  }

  const createCatalog = (ownerUid: string, name: string, slug: string) => {
    const state = readState()
    if (state.catalogs.some(item => item.slug === slug)) {
      throw new Error('Ese slug ya está en uso')
    }

    const catalog = createCatalogRecord(ownerUid, slug, name)
    state.catalogs.push(catalog)

    const owner = state.users.find(item => item.uid === ownerUid)
    if (owner && !owner.defaultCatalogId) {
      owner.defaultCatalogId = catalog.id
    }

    writeState(state)
    return clone(catalog)
  }

  const saveCatalog = (catalog: CatalogRecord) => {
    const state = readState()
    const index = state.catalogs.findIndex(item => item.id === catalog.id)
    if (index === -1) {
      state.catalogs.push(clone(catalog))
    } else {
      state.catalogs[index] = clone(catalog)
    }
    writeState(state)
  }

  const saveUser = (user: UserProfile) => {
    const state = readState()
    const index = state.users.findIndex(item => item.uid === user.uid)
    if (index >= 0) {
      state.users[index] = clone(user)
      writeState(state)
    }
  }

  const getCatalogById = (id: string) => {
    const item = readState().catalogs.find(entry => entry.id === id)
    return item ? clone(item) : null
  }

  const getCatalogBySlug = (slug: string) => {
    const normalized = slug.trim().toLowerCase().replace(/\s+/g, '-')
    const item = readState().catalogs.find(entry => entry.slug.trim().toLowerCase() === normalized)
    return item ? clone(item) : null
  }

  const getCatalogsByOwner = (ownerUid: string) => clone(readState().catalogs.filter(item => item.ownerUid === ownerUid))

  const getMarketplaceCatalogs = () => clone(readState().catalogs.filter(item => item.status === 'published'))

  const appendOrder = (catalogId: string, order: CatalogOrder) => {
    const state = readState()
    const catalog = state.catalogs.find(item => item.id === catalogId)
    if (!catalog) {
      throw new Error('Catálogo no encontrado')
    }
    catalog.orders.unshift(clone(order))
    writeState(state)
  }

  const appendReview = (catalogId: string, review: CatalogReview) => {
    const state = readState()
    const catalog = state.catalogs.find(item => item.id === catalogId)
    if (!catalog) {
      throw new Error('Catálogo no encontrado')
    }
    catalog.reviews.unshift(clone(review))
    writeState(state)
  }

  return {
    login,
    register,
    getUserByEmail,
    ensureUniqueSlug,
    createCatalog,
    saveCatalog,
    getCatalogById,
    getCatalogBySlug,
    getCatalogsByOwner,
    getMarketplaceCatalogs,
    appendOrder,
    appendReview,
    saveUser,
  }
}
