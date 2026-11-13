import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App.tsx'
import './index.css'

const root = document.getElementById('root')
if (!root) {
  throw new Error('Manca l’elemento root della pagina.')
}

const basename = import.meta.env.BASE_URL.replace(/\/$/, '')

createRoot(root).render(
  <StrictMode>
    <BrowserRouter basename={basename === '' ? undefined : basename}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
