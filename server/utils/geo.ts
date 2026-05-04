import type { H3Event } from 'h3'

interface IpApiResponse {
  city?: string
  region?: string
  country_name?: string
  latitude?: number
  longitude?: number
  error?: boolean
  reason?: string
}

const geoCache = new Map<string, { city: string; region: string; timestamp: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutos

export const getCityFromIp = async (event: H3Event): Promise<string | null> => {
  const clientIp = getRequestIP(event, { xForwardedFor: true })
  if (!clientIp || clientIp === 'unknown') {
    return null
  }

  // Usar cache para evitar rate limits de ipapi.co (45 req/min gratis)
  const cached = geoCache.get(clientIp)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.city
  }

  try {
    const res = await fetch(`https://ipapi.co/${clientIp}/json/`, {
      headers: { 'User-Agent': 'VentoMarketplace/1.0' },
    })

    if (!res.ok) {
      return null
    }

    const data = await res.json() as IpApiResponse

    if (data.error || !data.city) {
      return null
    }

    geoCache.set(clientIp, {
      city: data.city,
      region: data.region || '',
      timestamp: Date.now(),
    })

    return data.city
  } catch {
    return null
  }
}

export const prioritizeByCity = <T extends { city?: string; regionLabel?: string }>(
  items: T[],
  detectedCity: string | null,
): T[] => {
  if (!detectedCity || !items.length) {
    return items
  }

  const cityLower = detectedCity.toLowerCase()

  return [...items].sort((a, b) => {
    const aCity = (a.city || a.regionLabel || '').toLowerCase()
    const bCity = (b.city || b.regionLabel || '').toLowerCase()

    const aMatch = aCity.includes(cityLower) || cityLower.includes(aCity)
    const bMatch = bCity.includes(cityLower) || cityLower.includes(bCity)

    if (aMatch && !bMatch) return -1
    if (!aMatch && bMatch) return 1
    return 0
  })
}
