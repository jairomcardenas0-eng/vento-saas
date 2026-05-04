const CACHE_VERSION = 'vento-v1.3.0-offline-1'
const APP_SHELL_CACHE = `${CACHE_VERSION}-shell`
const DATA_CACHE = `${CACHE_VERSION}-data`
const IMAGE_CACHE = `${CACHE_VERSION}-images`
const API_CACHE = `${CACHE_VERSION}-api`
const CRITICAL_ASSETS = ['/', '/manifest.webmanifest']
const PLACEHOLDER_SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="320" height="220"><rect width="320" height="220" fill="#e5e7eb"/><text x="50%" y="50%" text-anchor="middle" fill="#64748b" font-family="Arial" font-size="16">Imagen offline</text></svg>'

const isNavigation = request => request.mode === 'navigate'
const isImage = request => request.destination === 'image'
const isAnalytics = url => url.pathname.includes('/api/analytics') || url.pathname.includes('/collect')
const isCatalogData = url => url.pathname.startsWith('/api/storefront') || url.pathname.startsWith('/b/')
const isUserApi = url => url.pathname.startsWith('/api/orders') || url.pathname.startsWith('/api/reviews')
const isStaticAsset = request => ['script', 'style', 'font', 'worker'].includes(request.destination)

const putSafe = async (cacheName, request, response) => {
  if (!response || !response.ok) return response
  const cache = await caches.open(cacheName)
  await cache.put(request, response.clone())
  return response
}

const cacheFirst = async (request, cacheName, fallback) => {
  const cached = await caches.match(request)
  if (cached) return cached
  try {
    return await putSafe(cacheName, request, await fetch(request))
  } catch {
    return fallback ? fallback() : Response.error()
  }
}

const staleWhileRevalidate = async (request, cacheName) => {
  const cached = await caches.match(request)
  const update = fetch(request)
    .then(response => putSafe(cacheName, request, response))
    .catch(() => null)
  return cached || await update || Response.error()
}

const networkFirst = async (request, cacheName) => {
  try {
    return await putSafe(cacheName, request, await fetch(request))
  } catch {
    return await caches.match(request) || Response.error()
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_SHELL_CACHE)
      .then(cache => cache.addAll(CRITICAL_ASSETS).catch(() => undefined))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(key => key.startsWith('vento-') && !key.startsWith(CACHE_VERSION))
        .map(key => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') {
    return
  }

  const url = new URL(request.url)
  if (url.origin !== self.location.origin && !url.hostname.endsWith('supabase.co')) {
    return
  }

  if (isAnalytics(url)) {
    event.respondWith(fetch(request))
    return
  }

  if (isImage(request)) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE, () => new Response(PLACEHOLDER_SVG, {
      headers: { 'content-type': 'image/svg+xml; charset=utf-8', 'cache-control': 'public, max-age=86400' },
    })))
    return
  }

  if (isUserApi(url)) {
    event.respondWith(networkFirst(request, API_CACHE))
    return
  }

  if (isCatalogData(url)) {
    event.respondWith(staleWhileRevalidate(request, DATA_CACHE))
    return
  }

  if (isNavigation(request) || isStaticAsset(request)) {
    event.respondWith(staleWhileRevalidate(request, APP_SHELL_CACHE))
  }
})

self.addEventListener('sync', (event) => {
  if (event.tag !== 'vento-offline-sync') {
    return
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then(clients => {
      clients.forEach(client => client.postMessage({ type: 'VENTO_SYNC_REQUEST' }))
    }),
  )
})
