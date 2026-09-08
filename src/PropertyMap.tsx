import { useEffect, useRef } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

// Pre-cut, cached tiles. Fast, but the cache stops at zoom 16 —
// good for finding the property, too coarse for tracing it.
const OVERVIEW_TILES =
  'https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}'

// Full-resolution NAIP, rendered on request. Slow (seconds per tile),
// so we only ask for it once the map is zoomed in on a property.
const DETAIL_TILES =
  'https://imagery.nationalmap.gov/arcgis/rest/services/USGSNAIPPlus/ImageServer/exportImage' +
  '?bbox={bbox-epsg-3857}&bboxSR=3857&imageSR=3857&size=512,512&format=jpg&f=image'

const IMAGERY_ATTRIBUTION = 'USDA/USGS The National Map: Orthoimagery'
const GEOCODER_ATTRIBUTION = '© OpenStreetMap contributors'

const PROPERTY_ZOOM = 18

type Props = {
  // Where to look. null until the user has searched for something.
  center: { lon: number; lat: number } | null
}

export function PropertyMap({ center }: Props) {
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const marker = useRef<maplibregl.Marker | null>(null)

  // Runs once: build the map.
  useEffect(() => {
    if (map.current || !container.current) return

    map.current = new maplibregl.Map({
      container: container.current,
      attributionControl: { customAttribution: GEOCODER_ATTRIBUTION },
      style: {
        version: 8,
        sources: {
          overview: {
            type: 'raster',
            tiles: [OVERVIEW_TILES],
            tileSize: 256,
            maxzoom: 16,
            attribution: IMAGERY_ATTRIBUTION,
          },
          detail: {
            type: 'raster',
            tiles: [DETAIL_TILES],
            tileSize: 512,
            minzoom: 16,
            maxzoom: 19,
            attribution: IMAGERY_ATTRIBUTION,
          },
        },
        layers: [
          // Always drawn. Above zoom 16 it stretches the last cached level,
          // so there's something to look at while detail tiles load.
          { id: 'overview', type: 'raster', source: 'overview' },
          // Drawn on top only when zoomed in enough to be worth the wait.
          { id: 'detail', type: 'raster', source: 'detail', minzoom: 16.5 },
        ],
      },
      center: [-98.5, 39.8], // middle of the US, until there's a search
      zoom: 4,
    })

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right')

    return () => {
      map.current?.remove()
      map.current = null
    }
  }, [])

  // Runs every time `center` changes: fly there and drop a pin.
  useEffect(() => {
    if (!map.current || !center) return

    const target: [number, number] = [center.lon, center.lat]
    map.current.flyTo({ center: target, zoom: PROPERTY_ZOOM })

    // A marker needs a position before it goes on the map.
    if (!marker.current) {
      marker.current = new maplibregl.Marker({ color: '#b42318' }).setLngLat(target).addTo(map.current)
    } else {
      marker.current.setLngLat(target)
    }
  }, [center])

  return <div ref={container} style={{ width: '100%', height: '70vh' }} />
}
