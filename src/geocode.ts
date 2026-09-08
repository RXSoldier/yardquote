// Turns a typed address into coordinates using Nominatim (OpenStreetMap).
//
// Nominatim's usage policy: max 1 request/second, no search-as-you-type,
// and the app must identify itself (the browser's Referer header does that).
// Attribution "© OpenStreetMap contributors" is shown on the map.

export type Location = {
  lon: number
  lat: number
  label: string
}

type NominatimResult = {
  lon: string
  lat: string
  display_name: string
}

export async function geocode(address: string): Promise<Location> {
  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('q', address)
  url.searchParams.set('format', 'json')
  url.searchParams.set('limit', '1')
  url.searchParams.set('countrycodes', 'us')

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`The address lookup failed (${response.status}). Try again in a moment.`)
  }

  const results: NominatimResult[] = await response.json()
  if (results.length === 0) {
    throw new Error('No property found for that address. Try adding the city and state.')
  }

  const [best] = results
  return {
    lon: Number(best.lon),
    lat: Number(best.lat),
    label: best.display_name,
  }
}
