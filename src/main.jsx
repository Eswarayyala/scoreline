import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { MediaArtProvider } from './hooks/useMediaLibrary.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
    <MediaArtProvider>
      <App />
    </MediaArtProvider>
    </BrowserRouter>
  </StrictMode>,
)
