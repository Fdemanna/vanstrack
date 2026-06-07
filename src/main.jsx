import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient } from '@tanstack/react-query'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { createIndexedDBPersister } from './lib/persister'
import './index.css'
import App from './App.jsx'
import { registerSW } from 'virtual:pwa-register'

// Registrar el Service Worker para habilitar el funcionamiento offline de la PWA
registerSW({ immediate: true })

import { supabase } from './lib/supabase'

// Configurar el QueryClient con opciones por defecto para Offline-First
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24 * 7, // Mantener en caché durante 7 días
      staleTime: 1000 * 60 * 5, // Considerar frescos los datos durante 5 minutos
      networkMode: 'offlineFirst', // Leer caché si no hay conexión
      refetchOnWindowFocus: false,
    },
    mutations: {
      networkMode: 'offlineFirst', // Almacenar en cola de mutaciones si estamos sin conexión
    },
  },
})

// Los mutation defaults específicos de cada usuario se configuran dentro
// de los componentes (Deliveries.jsx, Expenses.jsx) con la clave [key, userId]
// para que incluyan todos los guards de negocio (van ocupada, una ruta por día, etc.)

// Exponer queryClient solo en entorno de desarrollo
if (import.meta.env.DEV && typeof window !== 'undefined') {
  window.__queryClient = queryClient;
}

const persister = createIndexedDBPersister('vantrack-query-cache')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 1000 * 60 * 60 * 24 * 7, // Tiempo máximo de persistencia en disco: 7 días
        dehydrateOptions: {
          shouldDehydrateMutation: (mutation) => true,
        },
      }}
    >
      <App />
    </PersistQueryClientProvider>
  </StrictMode>,
)
