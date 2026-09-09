// Turns a typed address into coordinates.
//
// Two geocoders, tried in order:
//   1. US Census Bureau — free, no key, and it can place nearly any US street
//      address because it works from address ranges, not individual houses.
//      Browsers can't call it directly, so requests go via /census/ which
//      the dev server (vite.config.ts) and Vercel (vercel.json) forward for us.
//   2. Nominatim (OpenStreetMap) — the fallback if Census has nothing.
//      Policy: max 1 request/second, no search-as-you-type, attribution shown.

export type Location = {
  lon: number
  lat: number
  label: string
  source: 'census' | 'openstreetmap'
}

type CensusResponse = {
  result?: {
    addressMatches?: {
      coordinates: { x: number; y: number }
      matchedAddress: string
    }[]
  }
}

type NominatimResult = {
  lon: string
  lat: string
  display_name: string
}

async function geocodeCensus(address: string): Promise<Location | null> {
  const url = new URL('/census/geocoder/locations/onelineaddress', window.location.origin)
  url.searchParams.set('address', address)
  url.searchParams.set('benchmark', 'Public_AR_Current')
  url.searchParams.set('format', 'json')

  try {
    const response = await fetch(url)
    if (!response.ok) return null

    const data: CensusResponse = await response.json()
    const match = data.result?.addressMatches?.[0]
    if (!match) return null

    return {
      lon: match.coordinates.x,
      lat: match.coordinates.y,
      label: match.matchedAddress,
      source: 'census',
    }
  } catch {
    return null // network trouble — let the fallback have a go
  }
}

async function geocodeNominatim(address: string): Promise<Location | null> {
  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('q', address)
  url.searchParams.set('format', 'json')
  url.searchParams.set('limit', '1')
  url.searchParams.set('countrycodes', 'us')

  try {
    const response = await fetch(url)
    if (!response.ok) return null

    const results: NominatimResult[] = await response.json()
    const [best] = results
    if (!best) return null

    return {
      lon: Number(best.lon),
      lat: Number(best.lat),
      label: best.display_name,
      source: 'openstreetmap',
    }
  } catch {
    return null
  }
}

export async function geocode(address: string): Promise<Location> {
  const found = (await geocodeCensus(address)) ?? (await geocodeNominatim(address))

  if (!found) {
    throw new Error('No property found for that address. Include the city, state and ZIP.')
  }
  return found
}
