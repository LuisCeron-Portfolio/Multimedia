import { useEffect, useRef, useState, useMemo } from 'react'
import * as THREE from 'three'

type GeometryItem = {
  name: string
  category: string
  description: string
  create: () => THREE.BufferGeometry
  color: string
}

export default function GeometryExplorer() {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const currentMeshRef = useRef<THREE.Mesh | null>(null)
  const animRef = useRef<number | null>(null)

  // Estados persistentes
  const [wireframe, setWireframe] = useState<boolean>(() => {
    return localStorage.getItem('wireframe') === 'true'
  })
  const [autoRotate, setAutoRotate] = useState<boolean>(() => {
    return localStorage.getItem('autoRotate') !== 'false'
  })

  // Geometrías memoizadas y categorizadas
  const geometries = useMemo<GeometryItem[]>(() => [
    {
      name: 'Sphere',
      category: 'Primitivas',
      description: 'Esfera',
      create: () => new THREE.SphereGeometry(1, 32, 16),
      color: '#FF6B6B',
    },
    {
      name: 'Box',
      category: 'Primitivas',
      description: 'Caja',
      create: () => new THREE.BoxGeometry(1.5, 1.5, 1.5),
      color: '#44aa88',
    },
    {
      name: 'Cone',
      category: 'Primitivas',
      description: 'Cono',
      create: () => new THREE.ConeGeometry(1, 2, 32),
      color: '#556270',
    },
    {
      name: 'Cylinder',
      category: 'Primitivas',
      description: 'Cilindro',
      create: () => new THREE.CylinderGeometry(1, 1, 2, 32),
      color: '#C7F464',
    },
    {
      name: 'Torus',
      category: 'Primitivas',
      description: 'Toro',
      create: () => new THREE.TorusGeometry(1, 0.4, 16, 100),
      color: '#FFA500',
    },
    {
      name: 'TorusKnot',
      category: 'Primitivas',
      description: 'Nudo Toroidal',
      create: () => new THREE.TorusKnotGeometry(1, 0.3, 100, 16),
      color: '#6A0572',
    },
    {
      name: 'Dodecahedron',
      category: 'Platónicos',
      description: 'Dodecaedro',
      create: () => new THREE.DodecahedronGeometry(1),
      color: '#FF6F91',
    },
    {
      name: 'Icosahedron',
      category: 'Platónicos',
      description: 'Icosaedro',
      create: () => new THREE.IcosahedronGeometry(1),
      color: '#00BFFF',
    },
  ], [])

  // Categorizar
  const categorizedGeometries = useMemo(() => {
    return geometries.reduce<Record<string, GeometryItem[]>>((acc, geom) => {
      if (!acc[geom.category]) acc[geom.category] = []
      acc[geom.category].push(geom)
      return acc
    }, {})
  }, [geometries])

  // Geometría seleccionada
  const [selectedGeometry, setSelectedGeometry] = useState<GeometryItem>(geometries[0])

  // Refs espejo para estados
  const wireframeRef = useRef(wireframe)
  const autoRotateRef = useRef(autoRotate)

  // Sincronizar refs con estados y localStorage
  useEffect(() => {
    wireframeRef.current = wireframe
    localStorage.setItem('wireframe', String(wireframe))
  }, [wireframe])

  useEffect(() => {
    autoRotateRef.current = autoRotate
    localStorage.setItem('autoRotate', String(autoRotate))
  }, [autoRotate])

  // Setup escena, cámara, renderer y mesh base
  useEffect(() => {
    if (!mountRef.current) return

    // Limpiar renderer anterior
    if (rendererRef.current) {
      rendererRef.current.dispose()
      if (mountRef.current.contains(rendererRef.current.domElement)) {
        mountRef.current.removeChild(rendererRef.current.domElement)
      }
    }

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0a0a0a)
    sceneRef.current = scene

    const { width, height } = mountRef.current.getBoundingClientRect()
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000)
    camera.position.set(3, 2, 4)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(width, height)
    renderer.setPixelRatio(window.devicePixelRatio)
    rendererRef.current = renderer
    mountRef.current.appendChild(renderer.domElement)

    // Luces
    const ambient = new THREE.AmbientLight(0xffffff, 0.35)
    const dir = new THREE.DirectionalLight(0xffffff, 0.9)
    dir.position.set(5, 5, 5)
    scene.add(ambient, dir)

    // Helpers
    const axes = new THREE.AxesHelper(2)
    const grid = new THREE.GridHelper(10, 10, 0x444444, 0x222222)
    scene.add(axes, grid)

    // Crear mesh inicial
    const geometry = selectedGeometry.create()
    const material = new THREE.MeshPhongMaterial({ color: selectedGeometry.color, wireframe })
    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)
    currentMeshRef.current = mesh

    // Animación
    const animate = () => {
      animRef.current = requestAnimationFrame(animate)
      if (autoRotateRef.current && currentMeshRef.current) {
        currentMeshRef.current.rotation.x += 0.01
        currentMeshRef.current.rotation.y += 0.015
      }
      renderer.render(scene, camera)
    }
    animate()

    // Resize
    const handleResize = () => {
      if (!mountRef.current || !cameraRef.current || !rendererRef.current) return
      const rect = mountRef.current.getBoundingClientRect()
      const w = rect.width || 800
      const h = rect.height || 600
      cameraRef.current.aspect = w / h
      cameraRef.current.updateProjectionMatrix()
      rendererRef.current.setSize(w, h)
    }
    window.addEventListener('resize', handleResize)

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize)
      if (animRef.current) cancelAnimationFrame(animRef.current)
      geometry.dispose()
      material.dispose()
      scene.clear()
      renderer.dispose()
    }
  }, []) // Solo corre una vez

  // Actualizar geometría cuando cambia la selección
  useEffect(() => {
    if (!currentMeshRef.current) return

    const oldGeometry = currentMeshRef.current.geometry
    oldGeometry.dispose()

    // Crear nueva geometría y aplicarla
    const newGeometry = selectedGeometry.create()
    currentMeshRef.current.geometry = newGeometry

    // Actualizar color y wireframe
    const material = currentMeshRef.current.material as THREE.MeshPhongMaterial
    material.color.set(selectedGeometry.color)
    material.wireframe = wireframeRef.current
    material.needsUpdate = true
  }, [selectedGeometry])

  // Actualizar wireframe cuando cambia
  useEffect(() => {
    if (!currentMeshRef.current) return
    const material = currentMeshRef.current.material as THREE.MeshPhongMaterial
    material.wireframe = wireframe
    material.needsUpdate = true
  }, [wireframe])

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: 'Arial, sans-serif' }}>
      {/* Panel lateral */}
      <aside
        style={{
          width: 260,
          backgroundColor: '#222',
          color: '#eee',
          padding: '1rem',
          overflowY: 'auto',
          userSelect: 'none',
        }}
      >
        <h2 style={{ borderBottom: '1px solid #555', paddingBottom: 8 }}>Geometrías</h2>
        {Object.entries(categorizedGeometries).map(([category, geoms]) => (
          <div key={category} style={{ marginBottom: '1rem' }}>
            <h3 style={{ borderBottom: '1px solid #555' }}>{category}</h3>
            <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
              {geoms.map((geom) => (
                <li key={geom.name} style={{ margin: '6px 0' }}>
                  <button
                    onClick={() => setSelectedGeometry(geom)}
                    style={{
                      width: '100%',
                      padding: '6px 8px',
                      backgroundColor: selectedGeometry.name === geom.name ? '#555' : 'transparent',
                      border: 'none',
                      color: geom.color,
                      cursor: 'pointer',
                      textAlign: 'left',
                      borderRadius: 4,
                      fontWeight: selectedGeometry.name === geom.name ? 'bold' : 'normal',
                      transition: 'background-color 0.3s',
                    }}
                    title={geom.description}
                  >
                    {geom.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}

        {/* Botones */}
        <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid #555' }}>
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            style={{
              width: '100%',
              padding: '8px',
              marginBottom: '8px',
              backgroundColor: autoRotate ? '#4CAF50' : '#888',
              border: 'none',
              color: 'white',
              fontWeight: 'bold',
              borderRadius: 4,
              cursor: 'pointer',
              userSelect: 'none',
            }}
            title="Pausar/Rotar"
          >
            {autoRotate ? '⏸️ Pausar Rotación' : '▶️ Reanudar Rotación'}
          </button>
          <button
            onClick={() => setWireframe(!wireframe)}
            style={{
              width: '100%',
              padding: '8px',
              backgroundColor: wireframe ? '#2196F3' : '#888',
              border: 'none',
              color: 'white',
              fontWeight: 'bold',
              borderRadius: 4,
              cursor: 'pointer',
              userSelect: 'none',
            }}
            title="Wireframe"
          >
            {wireframe ? '🔲 Sólido' : '🔳 Wireframe'}
          </button>
        </div>
      </aside>

      {/* Contenedor para la escena */}
      <main
        ref={mountRef}
        style={{
          flexGrow: 1,
          backgroundColor: '#0a0a0a',
          position: 'relative',
          overflow: 'hidden',
        }}
      />
    </div>
  )
}
