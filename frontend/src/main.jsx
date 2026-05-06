import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { MonthFilterProvider } from './context/MonthFilterContext.jsx'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MonthFilterProvider>
      <App />
    </MonthFilterProvider>
  </StrictMode>,
)
