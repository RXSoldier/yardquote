// Geometry → numbers. No React, no map — just maths on GeoJSON shapes.
import * as turf from '@turf/turf'
import type { Feature, Polygon } from 'geojson'

const SQ_METRES_TO_SQ_FEET = 10.7639

export type Measurement = {
  id: string
  areaSqFt: number
  perimeterFt: number
}

export function measurePolygon(feature: Feature<Polygon>): Measurement {
  return {
    id: String(feature.id),
    areaSqFt: turf.area(feature) * SQ_METRES_TO_SQ_FEET,
    perimeterFt: turf.length(feature, { units: 'feet' }),
  }
}

export function formatFeet(value: number): string {
  return Math.round(value).toLocaleString()
}
