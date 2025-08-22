// src/App.tsx
import GeometryExplorer from './components/GeometryExplorer/GeometryExplorer'

export default function App() {
  // El contenedor ocupa todo el viewport para que la escena use 100% del espacio
  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <GeometryExplorer />
    </div>
  )
}