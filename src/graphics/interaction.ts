/**
 * Interaction layer — camera control (touch + mouse) and tap-to-place building.
 * Added by frontier reviewer: the build had no input system at all, so the game
 * was unplayable on every device. Uses PointerEvents so touch and mouse share one path.
 */
import * as THREE from 'three'
import type { GameState } from '../sim/types'
import type { BuildingType, Building } from '../sim/types'
import type { TerrainMap } from '../sim/terrain'
import { placeBuilding } from '../sim/placement'
import { createBuildingMesh } from './buildings'

export interface InteractionDeps {
  canvas: HTMLCanvasElement
  camera: THREE.PerspectiveCamera
  scene: THREE.Scene
  terrainMesh: THREE.Mesh
  terrainSim: TerrainMap
  state: GameState
  getBuildings: () => Map<string, Building>
  onPlace: (b: Building) => void
}

// Orbit state around a focus point on the valley floor.
interface OrbitCam {
  target: THREE.Vector3
  radius: number
  theta: number   // azimuth
  phi: number     // polar (clamped away from poles)
}

export function setupInteraction(deps: InteractionDeps): { selected: () => BuildingType } {
  const { canvas, camera, scene, terrainMesh, terrainSim, state, getBuildings, onPlace } = deps

  const orbit: OrbitCam = {
    target: new THREE.Vector3(256, 40, 256),
    radius: camera.position.distanceTo(new THREE.Vector3(256, 40, 256)) || 220,
    theta: Math.PI / 4,
    phi: Math.PI / 3.2,
  }
  applyOrbit(camera, orbit)

  let selectedType: BuildingType = 'cabin'
  const raycaster = new THREE.Raycaster()
  const ndc = new THREE.Vector2()
  let nextId = 1

  // --- pointer tracking (touch + mouse unified) ---
  const pointers = new Map<number, { x: number; y: number }>()
  let lastPinchDist = 0
  let dragged = false
  let downX = 0, downY = 0

  const onDown = (e: PointerEvent) => {
    canvas.setPointerCapture(e.pointerId)
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
    dragged = false
    downX = e.clientX; downY = e.clientY
    if (pointers.size === 2) lastPinchDist = pinchDistance()
  }

  const onMove = (e: PointerEvent) => {
    const prev = pointers.get(e.pointerId)
    if (!prev) return
    const dx = e.clientX - prev.x
    const dy = e.clientY - prev.y
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (Math.abs(e.clientX - downX) + Math.abs(e.clientY - downY) > 8) dragged = true

    if (pointers.size === 1) {
      // orbit
      orbit.theta -= dx * 0.005
      orbit.phi = clamp(orbit.phi - dy * 0.005, 0.25, Math.PI / 2.1)
      applyOrbit(camera, orbit)
    } else if (pointers.size === 2) {
      // pinch-zoom
      const d = pinchDistance()
      if (lastPinchDist > 0) {
        orbit.radius = clamp(orbit.radius * (lastPinchDist / d), 15, 500)
        applyOrbit(camera, orbit)
      }
      lastPinchDist = d
    }
  }

  const onUp = (e: PointerEvent) => {
    // a tap (no drag) with one finger = place a building
    if (!dragged && pointers.size === 1) tryPlaceAt(e.clientX, e.clientY)
    pointers.delete(e.pointerId)
    if (pointers.size < 2) lastPinchDist = 0
  }

  const onWheel = (e: WheelEvent) => {
    e.preventDefault()
    orbit.radius = clamp(orbit.radius * (1 + Math.sign(e.deltaY) * 0.1), 15, 500)
    applyOrbit(camera, orbit)
  }

  canvas.style.touchAction = 'none' // stop the browser eating touch as scroll/zoom
  canvas.addEventListener('pointerdown', onDown)
  canvas.addEventListener('pointermove', onMove)
  canvas.addEventListener('pointerup', onUp)
  canvas.addEventListener('pointercancel', onUp)
  canvas.addEventListener('wheel', onWheel, { passive: false })

  function pinchDistance(): number {
    const pts = [...pointers.values()]
    if (pts.length < 2) return 0
    return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
  }

  function tryPlaceAt(clientX: number, clientY: number) {
    if ((state as unknown as { status?: string }).status === 'lost' ||
        (state as unknown as { status?: string }).status === 'LOST') return
    const rect = canvas.getBoundingClientRect()
    ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1
    ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1
    raycaster.setFromCamera(ndc, camera)
    const hit = raycaster.intersectObject(terrainMesh, false)[0]
    if (!hit) return
    const gx = Math.round(hit.point.x)
    const gz = Math.round(hit.point.z)
    const b = placeBuilding(`b_${nextId++}`, selectedType, gx, gz, terrainSim, getBuildings())
    if (!b) { flash('Cannot build there'); return }
    const mesh = createBuildingMesh(b)
    mesh.position.set(b.pos.x, b.pos.y, b.pos.z)
    scene.add(mesh)
    onPlace(b)
    flash(`Built ${selectedType}`)
  }

  buildPalette((t) => { selectedType = t })

  return { selected: () => selectedType }
}

function applyOrbit(cam: THREE.PerspectiveCamera, o: OrbitCam) {
  cam.position.set(
    o.target.x + o.radius * Math.sin(o.phi) * Math.cos(o.theta),
    o.target.y + o.radius * Math.cos(o.phi),
    o.target.z + o.radius * Math.sin(o.phi) * Math.sin(o.theta),
  )
  cam.lookAt(o.target)
}

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)) }

// --- minimal DOM palette + toast, self-contained so no index.html change is required ---
const PALETTE: BuildingType[] = ['cabin', 'farm', 'well', 'sawmill', 'mine', 'saloon']

function buildPalette(onSelect: (t: BuildingType) => void) {
  const bar = document.createElement('div')
  bar.style.cssText =
    'position:fixed;left:8px;top:8px;display:flex;gap:6px;flex-wrap:wrap;z-index:10000;max-width:70vw'
  let current: HTMLButtonElement | null = null
  PALETTE.forEach((t, i) => {
    const b = document.createElement('button')
    b.textContent = t
    b.style.cssText =
      'font:12px monospace;padding:8px 10px;border:1px solid #654321;border-radius:4px;' +
      'background:#2b2016;color:#e8dcc0;touch-action:manipulation'
    b.onclick = () => {
      onSelect(t)
      if (current) current.style.background = '#2b2016'
      b.style.background = '#6b4a2e'
      current = b
    }
    if (i === 0) { b.style.background = '#6b4a2e'; current = b }
    bar.appendChild(b)
  })
  document.body.appendChild(bar)
}

let toastEl: HTMLDivElement | null = null
function flash(msg: string) {
  if (!toastEl) {
    toastEl = document.createElement('div')
    toastEl.style.cssText =
      'position:fixed;left:50%;top:60px;transform:translateX(-50%);z-index:10001;' +
      'font:13px monospace;padding:6px 12px;background:rgba(0,0,0,.75);color:#fff;border-radius:4px'
    document.body.appendChild(toastEl)
  }
  toastEl.textContent = msg
  toastEl.style.opacity = '1'
  window.setTimeout(() => { if (toastEl) toastEl.style.opacity = '0' }, 1600)
}
