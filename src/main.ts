/** Boomtown boot: WebGPU renderer, QA hooks, camera, week loop wiring. */
import * as THREE from 'three'
import { WebGPURenderer } from 'three/webgpu'
import { buildTerrain, WORLD } from './engine/terrain'
import { buildLights, buildScatter } from './engine/daynight'
import { buildTown } from './engine/town'
import { newGame, resolveWeek } from './sim/week'
import { drawEvents } from './sim/events'
import { renderHUD, presentEvents, presentGazette, presentEnding } from './ui/ui'

// ---- QA hooks (harness contract) ----
interface QaHooks {
  ready: boolean; error: string | null; frame: number
  stats: { fps: number; counters: Record<string, number> } | null
  settle: (frames?: number) => Promise<void>
}
declare global { interface Window { qa: QaHooks } }
const qa: QaHooks = {
  ready: false, error: null, frame: 0, stats: null,
  settle: (frames = 1) => new Promise<void>(res => {
    const target = qa.frame + frames
    const tick = () => (qa.frame >= target ? res() : requestAnimationFrame(tick))
    tick()
  }),
}
window.qa = qa
function failLoud(msg: string): never {
  qa.error = msg
  const el = document.createElement('div')
  el.style.cssText = 'position:fixed;inset:0;background:#200;color:#f88;font:14px monospace;padding:24px;z-index:99;white-space:pre-wrap'
  el.textContent = 'BOOMTOWN FAILED LOUD:\n' + msg
  document.body.appendChild(el)
  throw new Error(msg)
}

const seed = Number(new URLSearchParams(location.search).get('seed') ?? 1874)

async function boot(): Promise<void> {
  const canvas = document.getElementById('cv') as HTMLCanvasElement
  if (!('gpu' in navigator)) failLoud('WebGPU not available in this browser.')
  const renderer = new WebGPURenderer({ canvas, antialias: true })
  await renderer.init()
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.0
  renderer.shadowMap.enabled = true
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
  const resize = () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix() }

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.5, WORLD * 2.2)

  const terrain = buildTerrain(seed, scene)
  const lights = buildLights(scene, renderer)
  const scatter = buildScatter(seed, scene, terrain)
  const town = buildTown(seed, scene, terrain)

  // ---- game state + week machine ----
  const s = newGame(seed)
  let phase: 'plan' | 'resolving' | 'gazette' = 'plan'
  let weekT = 0.35 // time-of-week 0..1 drives day/night
  renderHUD(s)

  const endweekBtn = document.getElementById('endweek') as HTMLButtonElement
  endweekBtn.onclick = () => {
    if (phase !== 'plan' || s.ending) return
    phase = 'resolving'
    endweekBtn.style.opacity = '0.4'
    const events = drawEvents(s, 3)
    presentEvents(s, events, () => {
      resolveWeek(s)
      renderHUD(s)
      if (s.ending) { presentEnding(s); return }
      phase = 'gazette'
      presentGazette(s, () => { phase = 'plan'; weekT = 0.1; endweekBtn.style.opacity = '1' })
    })
  }

  // ---- camera: orbit + pinch/wheel (PointerEvents) ----
  const orbit = { target: town.center.clone().add(new THREE.Vector3(0, 4, 0)), radius: 95, theta: Math.PI * 0.75, phi: Math.PI / 3.4 }
  const applyOrbit = () => {
    camera.position.set(
      orbit.target.x + orbit.radius * Math.sin(orbit.phi) * Math.cos(orbit.theta),
      orbit.target.y + orbit.radius * Math.cos(orbit.phi),
      orbit.target.z + orbit.radius * Math.sin(orbit.phi) * Math.sin(orbit.theta),
    )
    camera.lookAt(orbit.target)
  }
  applyOrbit()
  const pointers = new Map<number, { x: number; y: number }>()
  let pinch = 0
  canvas.addEventListener('pointerdown', e => { canvas.setPointerCapture(e.pointerId); pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (pointers.size === 2) pinch = pd() })
  canvas.addEventListener('pointermove', e => {
    const p = pointers.get(e.pointerId); if (!p) return
    const dx = e.clientX - p.x, dy = e.clientY - p.y
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.size === 1) {
      orbit.theta -= dx * 0.005
      orbit.phi = Math.max(0.35, Math.min(Math.PI / 2.05, orbit.phi - dy * 0.005))
      applyOrbit()
    } else if (pointers.size === 2) {
      const d = pd(); if (pinch > 0) { orbit.radius = Math.max(18, Math.min(WORLD * 0.9, orbit.radius * (pinch / d))) }; pinch = d; applyOrbit()
    }
  })
  const clearP = (e: PointerEvent) => { pointers.delete(e.pointerId); if (pointers.size < 2) pinch = 0 }
  canvas.addEventListener('pointerup', clearP)
  canvas.addEventListener('pointercancel', clearP)
  canvas.addEventListener('wheel', e => { e.preventDefault(); orbit.radius = Math.max(18, Math.min(WORLD * 0.9, orbit.radius * (1 + Math.sign(e.deltaY) * 0.1))); applyOrbit() }, { passive: false })
  function pd(): number { const a = [...pointers.values()]; return a.length < 2 ? 0 : Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) }

  addEventListener('resize', resize); resize()

  // ---- loop ----
  let last = performance.now()
  let fpsAcc = 0, fpsN = 0
  const loop = (): void => {
    const now = performance.now()
    const dt = Math.min(0.05, (now - last) / 1000)
    last = now
    // time-of-week advances slowly during plan phase (full cycle over ~100s idle)
    weekT = Math.min(0.98, weekT + dt / 100)
    lights.set(weekT)
    const night = Math.max(0, (weekT - 0.72) / 0.28)
    scatter.update(dt)
    town.update(dt, s, night)
    renderer.render(scene, camera)
    qa.frame++
    fpsAcc += 1 / Math.max(dt, 1e-3); fpsN++
    if (fpsN >= 30) { qa.stats = { fps: Math.round(fpsAcc / fpsN), counters: { scatter: scatter.count } }; fpsAcc = 0; fpsN = 0 }
    if (qa.frame === 6) qa.ready = true
    requestAnimationFrame(loop)
  }
  loop()
}

boot().catch(e => failLoud(String(e?.stack ?? e)))
