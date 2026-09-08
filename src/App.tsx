import { useState } from 'react'
import { PropertyMap } from './PropertyMap'
import './App.css'

function App() {
  const [address, setAddress] = useState('')

  return (
    <main>
      <h1>YardQuote</h1>
      <p>Measure a property, price the work.</p>

      <input
        type="text"
        value={address}
        onChange={(event) => setAddress(event.target.value)}
        placeholder="123 Main St"
      />

      <p>You typed: {address}</p>

      <PropertyMap />
    </main>
  )
}

export default App

