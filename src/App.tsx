import { useCallback, useRef, useState, type FormEvent } from 'react'
import type { TerraDraw, GeoJSONStoreFeatures } from 'terra-draw'
import type { Polygon } from 'geojson'
import { PropertyMap } from './PropertyMap'
import { geocode, type Location } from './geocode'
import { measurePolygon, formatFeet, type Measurement } from './measure'
import './App.css'

type Status = 'idle' | 'searching' | 'error'

// Terra Draw's built-in mode names. 'static' = the map just pans and zooms.
type Tool = 'static' | 'polygon' | 'select'

function App() {
  const [address, setAddress] = useState('')
  const [location, setLocation] = useState<Location | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')

  const [tool, setTool] = useState<Tool>('static')
  const [shapes, setShapes] = useState<Measurement[]>([])

  // The drawing tool lives inside the map; we keep a handle so buttons can drive it.
  const draw = useRef<TerraDraw | null>(null)

  const handleDrawReady = useCallback((instance: TerraDraw) => {
    draw.current = instance
  }, [])

  const handleShapesChange = useCallback((features: GeoJSONStoreFeatures<Polygon>[]) => {
    setShapes(features.map(measurePolygon))
  }, [])

  function chooseTool(next: Tool) {
    draw.current?.setMode(next)
    setTool(next)
  }

  function clearShapes() {
    draw.current?.clear()
    setShapes([])
    chooseTool('static')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault() // stop the browser reloading the page
    if (!address.trim()) return

    setStatus('searching')
    setMessage('')
    try {
      const found = await geocode(address)
      setLocation(found)
      setMessage(found.label)
      setStatus('idle')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Something went wrong.')
      setStatus('error')
    }
  }

  const totalArea = shapes.reduce((sum, shape) => sum + shape.areaSqFt, 0)
  const totalPerimeter = shapes.reduce((sum, shape) => sum + shape.perimeterFt, 0)

  return (
    <main>
      <h1>YardQuote</h1>
      <p>Measure a property, price the work.</p>

      <form onSubmit={handleSubmit} className="search">
        <input
          type="text"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
          placeholder="123 Main St, City, ST 12345"
          aria-label="Property address"
        />
        <button type="submit" disabled={status === 'searching'}>
          {status === 'searching' ? 'Finding…' : 'Find property'}
        </button>
      </form>

      <p className={status === 'error' ? 'message error' : 'message'}>{message}</p>

      <div className="toolbar" role="toolbar" aria-label="Drawing tools">
        <button type="button" className={tool === 'static' ? 'active' : ''} onClick={() => chooseTool('static')}>
          Pan
        </button>
        <button type="button" className={tool === 'polygon' ? 'active' : ''} onClick={() => chooseTool('polygon')}>
          Draw area
        </button>
        <button type="button" className={tool === 'select' ? 'active' : ''} onClick={() => chooseTool('select')}>
          Edit
        </button>
        <button type="button" onClick={clearShapes} disabled={shapes.length === 0}>
          Clear all
        </button>
        <span className="hint">
          {tool === 'polygon' && 'Click each corner. Click the first corner again to finish. Esc cancels.'}
          {tool === 'select' && 'Click a shape to select it. Drag corners to adjust, drag midpoints to add corners. Delete key removes it.'}
        </span>
      </div>

      <PropertyMap center={location} onDrawReady={handleDrawReady} onShapesChange={handleShapesChange} />

      {shapes.length > 0 && (
        <table className="shapes">
          <thead>
            <tr>
              <th>Area</th>
              <th>Square feet</th>
              <th>Edge (feet)</th>
            </tr>
          </thead>
          <tbody>
            {shapes.map((shape, index) => (
              <tr key={shape.id}>
                <td>Area {index + 1}</td>
                <td>{formatFeet(shape.areaSqFt)}</td>
                <td>{formatFeet(shape.perimeterFt)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td>Total</td>
              <td>{formatFeet(totalArea)}</td>
              <td>{formatFeet(totalPerimeter)}</td>
            </tr>
          </tfoot>
        </table>
      )}
    </main>
  )
}

export default App
