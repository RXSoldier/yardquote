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

const ATTRIBUTION = 'USDA/USGS The National Map: Orthoimagery'

export function PropertyMap() {
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)

  useEffect(() => {
    if (map.current || !container.current) return

    map.current = new maplibregl.Map({
      container: container.current,
      style: {
        version: 8,
        sources: {
          overview: {
            type: 'raster',
            tiles: [OVERVIEW_TILES],
            tileSize: 256,
            maxzoom: 16,
            attribution: ATTRIBUTION,
          },
          detail: {
            type: 'raster',
            tiles: [DETAIL_TILES],
            tileSize: 512,
            minzoom: 16,
            maxzoom: 19,
            attribution: ATTRIBUTION,
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
      center: [-84.512, 39.103],
      zoom: 18,
    })

    map.current.addControl(new maplibregl.NavigationControl(), 'top-right')

    return () => {
      map.current?.remove()
      map.current = null
    }
  }, [])

  return <div ref={container} style={{ width: '100%', height: '70vh' }} />
}
