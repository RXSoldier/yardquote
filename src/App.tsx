import { useState, type FormEvent } from 'react'
import { PropertyMap } from './PropertyMap'
import { geocode, type Location } from './geocode'
import './App.css'

type Status = 'idle' | 'searching' | 'error'

function App() {
  const [address, setAddress] = useState('')
  const [location, setLocation] = useState<Location | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')

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

      <PropertyMap center={location} />
    </main>
  )
}

export default App
