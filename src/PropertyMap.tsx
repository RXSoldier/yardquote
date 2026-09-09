import { useEffect, useRef } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import {
  TerraDraw,
  TerraDrawPolygonMode,
  TerraDrawSelectMode,
  type GeoJSONStoreFeatures,
} from 'terra-draw'
import { TerraDrawMapLibreGLAdapter } from 'terra-draw-maplibre-gl-adapter'
import type { Polygon } from 'geojson'

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

// Shapes are drawn over aerial imagery, so they need a bright outline to be visible.
const SHAPE_STYLE = {
  fillColor: '#2e5a3b',
  fillOpacity: 0.25,
  outlineColor: '#ffd166',
  outlineWidth: 2,
  closingPointColor: '#ffd166',
  closingPointWidth: 6,
  closingPointOutlineColor: '#171e17',
  closingPointOutlineWidth: 2,
} as const

const SELECTED_STYLE = {
  selectedPolygonColor: '#2e5a3b',
  selectedPolygonFillOpacity: 0.35,
  selectedPolygonOutlineColor: '#b42318',
  selectedPolygonOutlineWidth: 3,
  selectionPointColor: '#ffffff',
  selectionPointOutlineColor: '#b42318',
  selectionPointWidth: 6,
  selectionPointOutlineWidth: 2,
  midPointColor: '#ffd166',
  midPointOutlineColor: '#171e17',
  midPointWidth: 4,
  midPointOutlineWidth: 1,
} as const

type Props = {
  // Where to look. null until the user has searched for something.
  center: { lon: number; lat: number } | null
  // Hands the drawing tool up to the parent so it can switch modes / clear.
  onDrawReady: (draw: TerraDraw) => void
  // Called with every finished polygon whenever anything is drawn, edited or deleted.
  onShapesChange: (shapes: GeoJSONStoreFeatures<Polygon>[]) => void
}

export function PropertyMap({ center, onDrawReady, onShapesChange }: Props) {
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const marker = useRef<maplibregl.Marker | null>(null)
  const draw = useRef<TerraDraw | null>(null)

  // The map is built once, but the parent may hand us new callback functions on
  // every render. Keeping the latest ones in a ref lets the one-time setup below
  // always call the current version without being rebuilt. (Refs are updated in
  // an effect, never during render — React's linter insists, for good reason.)
  const callbacks = useRef({ onDrawReady, onShapesChange })
  useEffect(() => {
    callbacks.current = { onDrawReady, onShapesChange }
  }, [onDrawReady, onShapesChange])

  // Runs once: build the map, then the drawing tool on top of it.
  useEffect(() => {
    if (map.current || !container.current) return

    const mapInstance = new maplibregl.Map({
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
    map.current = mapInstance

    mapInstance.addControl(new maplibregl.NavigationControl(), 'top-right')

    // The drawing tool adds its own layers, so it has to wait for the map's style to load.
    mapInstance.once('load', () => {
      const drawInstance = new TerraDraw({
        adapter: new TerraDrawMapLibreGLAdapter({ map: mapInstance }),
        modes: [
          new TerraDrawPolygonMode({ styles: SHAPE_STYLE }),
          new TerraDrawSelectMode({
            styles: SELECTED_STYLE,
            flags: {
              polygon: {
                feature: {
                  draggable: true,
                  coordinates: { draggable: true, midpoints: true, deletable: true },
                },
              },
            },
          }),
        ],
      })

      drawInstance.start()

      // Fires on every create / edit / delete. The polygon currently being drawn
      // is in the snapshot too, so we leave it out until it's finished.
      drawInstance.on('change', () => {
        const finished = drawInstance
          .getSnapshot()
          .filter(
            (feature): feature is GeoJSONStoreFeatures<Polygon> =>
              feature.geometry.type === 'Polygon' && !feature.properties.currentlyDrawing,
          )
        callbacks.current.onShapesChange(finished)
      })

      draw.current = drawInstance
      callbacks.current.onDrawReady(drawInstance)
    })

    return () => {
      draw.current?.stop()
      draw.current = null
      mapInstance.remove()
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
