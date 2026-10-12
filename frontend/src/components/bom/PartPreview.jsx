import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTheme } from '../../hooks/use-theme'
import { Canvas, useThree } from '@react-three/fiber'
import { Grid, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

let occtPromise

function loadOcct() {
  if (!occtPromise) {
    occtPromise = new Promise((resolve, reject) => {
      const start = () => {
        const factory = window.occtimportjs
        if (typeof factory !== 'function') {
          reject(new Error('OpenCascade loader did not start'))
          return
        }
        factory({
          locateFile: (file) => `/occt/${file}`,
        }).then(resolve, reject)
      }
      if (typeof window.occtimportjs === 'function') {
        start()
        return
      }
      const script = document.createElement('script')
      script.src = '/occt/occt-import-js.js'
      script.async = true
      script.onload = start
      script.onerror = () => reject(new Error('OpenCascade failed to load'))
      document.head.appendChild(script)
    })
  }
  return occtPromise
}

function copyArray(values, Type) {
  if (!values || !values.length) return null
  const copy = new Type(values.length)
  copy.set(values)
  return copy
}

function meshFromStep(mesh) {
  const positions = copyArray(mesh.attributes?.position?.array, Float32Array)
  if (!positions || positions.length < 9 || positions.length % 3 !== 0) return null
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const normals = copyArray(mesh.attributes?.normal?.array, Float32Array)
  if (normals && normals.length === positions.length) {
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3))
  }
  const indices = copyArray(mesh.index?.array, Uint32Array)
  if (indices?.length) geometry.setIndex(new THREE.BufferAttribute(indices, 1))
  geometry.computeVertexNormals()
  return geometry
}

function placeInView(geometries) {
  const box = new THREE.Box3()
  geometries.forEach((geometry) => {
    geometry.computeBoundingBox()
    if (geometry.boundingBox && !geometry.boundingBox.isEmpty()) box.union(geometry.boundingBox)
  })
  if (box.isEmpty()) return geometries
  const center = box.getCenter(new THREE.Vector3())
  const size = box.getSize(new THREE.Vector3())
  const maxDim = Math.max(size.x, size.y, size.z)
  if (!Number.isFinite(maxDim) || maxDim <= 0) return geometries
  const scale = 2 / maxDim
  geometries.forEach((geometry) => {
    geometry.translate(-center.x, -center.y, -center.z)
    geometry.scale(scale, scale, scale)
    geometry.computeBoundingSphere()
  })
  return geometries
}

function FittedModel({ geometries, theme }) {
  const group = useRef(null)
  const camera = useThree((state) => state.camera)
  const controls = useThree((state) => state.controls)
  const view = useThree((state) => state.size)

  useLayoutEffect(() => {
    const object = group.current
    if (!object) return
    object.position.set(0, 0, 0)
    object.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(object)
    if (box.isEmpty()) return
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    object.position.sub(center)
    const aspect = Math.max(view.width, 1) / Math.max(view.height, 1)
    const vFov = (camera.fov * Math.PI) / 180
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect)
    const distV = (Math.max(size.y, 0.001) / 2) / Math.tan(vFov / 2)
    const distH = (Math.max(size.x, size.z, 0.001) / 2) / Math.tan(hFov / 2)
    const distance = Math.max(distV, distH) * 1.25
    camera.aspect = aspect
    camera.position.set(distance * 0.85, distance * 0.55, distance)
    camera.near = Math.max(distance / 200, 0.01)
    camera.far = distance * 40
    camera.updateProjectionMatrix()
    camera.lookAt(0, 0, 0)
    if (controls) {
      controls.target.set(0, 0, 0)
      controls.update()
    }
  }, [geometries, camera, controls, view.width, view.height])

  const floor = useMemo(() => {
    const box = new THREE.Box3()
    geometries.forEach((geometry) => {
      geometry.computeBoundingBox()
      if (geometry.boundingBox) box.union(geometry.boundingBox)
    })
    const size = box.getSize(new THREE.Vector3())
    return {
      span: Math.max(size.x, size.z, 4),
      drop: Math.max(size.y / 2, 0.01),
    }
  }, [geometries])

  return (
    <>
      <group ref={group}>
        {geometries.map((geometry, index) => (
          <mesh key={index} geometry={geometry} castShadow>
            <meshStandardMaterial color="#d4d4d4" metalness={0.2} roughness={0.45} side={THREE.DoubleSide} />
          </mesh>
        ))}
      </group>
      <Grid
        position={[0, -floor.drop, 0]}
        args={[floor.span * 4, floor.span * 4]}
        cellSize={floor.span / 10}
        cellThickness={0.6}
        cellColor={theme === 'dark' ? '#525252' : '#d4d4d4'}
        sectionSize={floor.span / 2}
        sectionThickness={1.1}
        sectionColor="#a3a3a3"
        fadeDistance={floor.span * 8}
        infiniteGrid
      />
    </>
  )
}

function ModelCanvas({ geometries, theme }) {
  const dark = theme === 'dark'
  return (
    <Canvas
      className="!absolute !inset-0"
      camera={{ position: [3, 2, 4], fov: 35, near: 0.01, far: 100 }}
      onCreated={({ size }) => console.log('[3D preview] canvas on screen', { width: size.width, height: size.height, meshes: geometries.length })}
    >
      <color attach="background" args={[dark ? '#000000' : '#fafafa']} />
      <ambientLight intensity={0.85} />
      <directionalLight position={[6, 8, 4]} intensity={1.4} />
      <FittedModel geometries={geometries} theme={theme} />
      <OrbitControls makeDefault />
    </Canvas>
  )
}

function previewSurface(theme) {
  const shared = 'relative h-full min-h-[280px] w-full overflow-hidden bg-[size:24px_24px]'
  if (theme === 'dark') {
    return `${shared} bg-black bg-[linear-gradient(to_right,#262626_1px,transparent_1px),linear-gradient(to_bottom,#262626_1px,transparent_1px)] text-neutral-300`
  }
  return `${shared} bg-neutral-50 bg-[linear-gradient(to_right,#e5e5e5_1px,transparent_1px),linear-gradient(to_bottom,#e5e5e5_1px,transparent_1px)] text-neutral-700`
}

export function PartPreview({ fileType, fileName, data }) {
  const { theme } = useTheme()
  const surface = previewSurface(theme)
  const canvasRef = useRef(null)
  const frameRef = useRef(null)
  const [page, setPage] = useState(1)
  const [pageCount, setPageCount] = useState(0)
  const [geometries, setGeometries] = useState([])
  const [imageUrl, setImageUrl] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const pdfRef = useRef(null)
  const dragRef = useRef(null)

  const kind = (fileType || fileName?.split('.').pop() || '').toLowerCase()
  const bytes = useMemo(() => (data ? data.slice(0) : null), [data])
  const pdfUrl = useMemo(() => {
    if (!bytes || kind !== 'pdf') return ''
    return URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }))
  }, [bytes, kind])

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl)
    }
  }, [pdfUrl])

  useEffect(() => {
    let cancelled = false
    setError('')
    setGeometries([])
    setImageUrl('')
    setPage(1)
    setPageCount(0)
    setZoom(1)
    setPan({ x: 0, y: 0 })
    pdfRef.current = null
    if (!bytes) return undefined

    const load = async () => {
      setLoading(true)
      const copy = bytes.slice(0)
      console.log('[3D preview] start', { fileName, kind, bytes: copy.byteLength })
      try {
        if (kind === 'pdf') {
          if (!cancelled) setLoading(false)
          return
        } else if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(kind)) {
          const blob = new Blob([copy])
          const url = URL.createObjectURL(blob)
          if (cancelled) URL.revokeObjectURL(url)
          else setImageUrl(url)
        } else if (kind === 'stl') {
          const geometry = new STLLoader().parse(copy.buffer)
          geometry.computeVertexNormals()
          console.log('[3D preview] STL triangles', geometry.attributes.position?.count)
          if (!cancelled) setGeometries(placeInView([geometry]))
        } else if (kind === 'step' || kind === 'stp') {
          const header = new TextDecoder().decode(copy.slice(0, 24))
          if (!header.includes('ISO-10303-21')) {
            throw new Error('This file is not a STEP model')
          }
          const occt = await loadOcct()
          console.log('[3D preview] OpenCascade ready', typeof occt?.ReadStepFile)
          const result = occt.ReadStepFile(new Uint8Array(copy), null)
          const meshes = Array.isArray(result?.meshes) ? result.meshes : Array.from(result?.meshes || [])
          console.log('[3D preview] STEP converted', {
            success: result?.success,
            meshCount: meshes.length,
            firstPositions: meshes[0]?.attributes?.position?.array?.length || 0,
          })
          if (!result?.success) throw new Error('STEP file could not be read')
          const nextGeometries = placeInView(meshes.map(meshFromStep).filter(Boolean))
          const vertexCount = nextGeometries.reduce((sum, geometry) => sum + (geometry.attributes.position?.count || 0), 0)
          console.log('[3D preview] meshes ready', { geometries: nextGeometries.length, vertices: vertexCount, shown: !cancelled })
          if (!nextGeometries.length) throw new Error('STEP file has no displayable geometry')
          if (!cancelled) setGeometries(nextGeometries)
        } else {
          throw new Error(`No preview for .${kind || 'file'}`)
        }
      } catch (loadError) {
        console.error('[3D preview] failed', loadError)
        if (!cancelled) setError(loadError.message || 'Preview failed')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
      pdfRef.current?.destroy?.()
      pdfRef.current = null
    }
  }, [bytes, kind])

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl)
    }
  }, [imageUrl])

  useEffect(() => {
    const pdf = pdfRef.current
    const canvas = canvasRef.current
    const frame = frameRef.current
    if (!pdf || !canvas || !frame || kind !== 'pdf') return undefined
    let cancelled = false
    let task = null
    const render = () => {
      pdf.getPage(page).then((pdfPage) => {
        if (cancelled) return
        const rotation = pdfPage.rotate || 0
        const base = pdfPage.getViewport({ scale: 1, rotation })
        const width = frame.clientWidth
        const height = frame.clientHeight
        if (width < 8 || height < 8) return
        const scale = Math.min(width / base.width, height / base.height)
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
        const viewport = pdfPage.getViewport({ scale: scale * pixelRatio, rotation })
        const context = canvas.getContext('2d')
        canvas.width = Math.floor(viewport.width)
        canvas.height = Math.floor(viewport.height)
        canvas.style.width = `${Math.floor(base.width * scale)}px`
        canvas.style.height = `${Math.floor(base.height * scale)}px`
        task = pdfPage.render({ canvasContext: context, viewport })
      })
    }
    render()
    const observer = new ResizeObserver(render)
    observer.observe(frame)
    return () => {
      cancelled = true
      task?.cancel?.()
      observer.disconnect()
    }
  }, [page, pageCount, kind])

  useEffect(() => {
    const frame = frameRef.current
    if (!frame || kind !== 'pdf' || loading) return undefined
    const onWheel = (event) => {
      event.preventDefault()
      const factor = event.deltaY < 0 ? 1.15 : 1 / 1.15
      setZoom((current) => Math.min(6, Math.max(1, current * factor)))
    }
    frame.addEventListener('wheel', onWheel, { passive: false })
    return () => frame.removeEventListener('wheel', onWheel)
  }, [kind, loading, pageCount])

  if (!data) {
    return <div className="flex h-full min-h-[280px] items-center justify-center bg-background text-sm text-muted-foreground">Select a drawing</div>
  }
  if (loading) {
    return <div className="flex h-full min-h-[280px] items-center justify-center bg-background text-sm text-muted-foreground">Loading preview...</div>
  }
  if (error) {
    return <div className="flex h-full min-h-[280px] items-center justify-center bg-background px-4 text-center text-sm text-foreground">{error}</div>
  }
  if (kind === 'pdf') {
    return (
      <iframe
        title={fileName || 'Drawing'}
        src={pdfUrl ? `${pdfUrl}#toolbar=1&navpanes=0&zoom=page-fit` : undefined}
        className="h-full w-full border-0 bg-background"
      />
    )
  }
  if (imageUrl) {
    return (
      <div className={`${surface} flex items-center justify-center p-4`}>
        <img src={imageUrl} alt={fileName || 'Drawing'} className="max-h-full max-w-full object-contain" />
      </div>
    )
  }

  if (kind === 'stl' || kind === 'step' || kind === 'stp') {
    return (
      <div className="relative h-full w-full">
        {geometries.length > 0 ? <ModelCanvas geometries={geometries} theme={theme} /> : (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No 3D geometry in this file</div>
        )}
      </div>
    )
  }
  return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No preview for this file</div>
}
