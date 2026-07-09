/** The town: parametric buildings (lit windows at night, smoke) + resident agents. */
import * as THREE from 'three'
import { MeshStandardNodeMaterial } from 'three/webgpu'
import { setSeed, rng } from '../sim/rng'
import type { Terrain } from './terrain'
import { WORLD } from './terrain'
import type { GameState } from '../sim/types'
import { alive } from '../sim/residents'

const WOODS = [0x7a5636, 0x6b4a2e, 0x8a6242, 0x5e442c, 0x93765a]
const ROOFS = [0x5a4030, 0x6e5240, 0x4f3a2b]
const TRIM = 0x9a815f

export interface Town {
  group: THREE.Group
  windowMats: THREE.MeshStandardMaterial[]
  smoke: THREE.Points
  agents: Map<string, THREE.Mesh>
  center: THREE.Vector3
  update: (dt: number, s: GameState, night: number) => void
}

function building(w: number, h: number, d: number, opts: { sign?: number; steeple?: boolean; windows?: number } = {}): { g: THREE.Group; winMats: THREE.MeshStandardMaterial[] } {
  const g = new THREE.Group()
  const winMats: THREE.MeshStandardMaterial[] = []
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new MeshStandardNodeMaterial({ color: WOODS[Math.floor(rng() * WOODS.length)], roughness: 0.95 }))
  body.position.y = h / 2; body.castShadow = true; body.receiveShadow = true
  g.add(body)
  const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.78, h * 0.5, 4), new MeshStandardNodeMaterial({ color: ROOFS[Math.floor(rng() * ROOFS.length)], roughness: 1 }))
  roof.position.y = h + h * 0.25; roof.rotation.y = Math.PI / 4; roof.castShadow = true
  g.add(roof)
  // false front / sign board
  if (opts.sign) {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(w * 1.05, h * 0.5, 0.15), new MeshStandardNodeMaterial({ color: TRIM }))
    sign.position.set(0, h + h * 0.22, d / 2 + 0.1)
    g.add(sign)
  }
  if (opts.steeple) {
    const st = new THREE.Mesh(new THREE.ConeGeometry(0.6, 2.8, 6), new MeshStandardNodeMaterial({ color: 0xd9d2bf }))
    st.position.y = h + h * 0.5 + 1.4
    g.add(st)
  }
  // lit windows (emissive at night)
  const nWin = opts.windows ?? 2
  for (let i = 0; i < nWin; i++) {
    const wm = new THREE.MeshStandardMaterial({ color: 0x54452f, emissive: 0xff9a3d, emissiveIntensity: 0 })
    const win = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.8), wm)
    win.position.set(-w / 3 + (i * w * 2) / (3 * Math.max(1, nWin - 1)), h * 0.45, d / 2 + 0.03)
    g.add(win); winMats.push(wm)
  }
  return { g, winMats }
}

export function buildTown(seed: number, scene: THREE.Scene, terrain: Terrain): Town {
  setSeed(seed ^ 0x7071)
  const group = new THREE.Group()
  const windowMats: THREE.MeshStandardMaterial[] = []
  // Main street in the steppe heartland, running north-south
  const cx = WORLD * 0.52
  const cz = WORLD * 0.5
  const center = new THREE.Vector3(cx, terrain.heightAt(cx, cz), cz)
  const lots: { name: string; w: number; h: number; d: number; opts: Parameters<typeof building>[3] }[] = [
    { name: 'saloon', w: 6, h: 6, d: 5, opts: { sign: 1, windows: 4 } },
    { name: 'bank', w: 4, h: 4.5, d: 4, opts: { windows: 2 } },
    { name: 'sheriff', w: 4, h: 3.6, d: 4, opts: { windows: 2 } },
    { name: 'church', w: 4, h: 5, d: 6, opts: { steeple: true, windows: 2 } },
    { name: 'doctor', w: 3.6, h: 3.6, d: 4, opts: { windows: 2 } },
    { name: 'mineoffice', w: 4.4, h: 4, d: 4, opts: { sign: 1, windows: 2 } },
    { name: 'store', w: 5, h: 4, d: 4.4, opts: { sign: 1, windows: 3 } },
    { name: 'stable', w: 6, h: 3.4, d: 5, opts: { windows: 1 } },
  ]
  lots.forEach((lot, i) => {
    const side = i % 2 === 0 ? -1 : 1
    const x = cx + side * 9
    const z = cz - 24 + Math.floor(i / 2) * 16
    const { g, winMats } = building(lot.w, lot.h, lot.d, lot.opts)
    g.position.set(x, terrain.heightAt(x, z), z)
    g.rotation.y = side > 0 ? Math.PI : 0
    group.add(g)
    windowMats.push(...winMats)
  })
  // wheel-rut street strip
  const rut = new THREE.Mesh(new THREE.PlaneGeometry(6, 78), new MeshStandardNodeMaterial({ color: 0x7a5836, roughness: 1 }))
  rut.rotation.x = -Math.PI / 2
  rut.position.set(cx, center.y + 0.06, cz)
  group.add(rut)
  scene.add(group)

  // chimney smoke: simple points drifting up
  const smokeGeo = new THREE.BufferGeometry()
  const N = 240
  const sp = new Float32Array(N * 3)
  for (let i = 0; i < N; i++) { sp[i * 3] = cx - 9 + rng() * 18; sp[i * 3 + 1] = center.y + 5 + rng() * 8; sp[i * 3 + 2] = cz - 24 + rng() * 48 }
  smokeGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3))
  const smoke = new THREE.Points(smokeGeo, new THREE.PointsMaterial({ color: 0xcfc6b8, size: 0.7, transparent: true, opacity: 0.35 }))
  scene.add(smoke)

  // resident agents: capsule-ish figures that mill about main street
  const agents = new Map<string, THREE.Mesh>()
  const agentGeo = new THREE.CapsuleGeometry ? new THREE.CapsuleGeometry(0.28, 0.8, 2, 6) : new THREE.CylinderGeometry(0.28, 0.28, 1.3, 6)

  const update = (dt: number, s: GameState, night: number) => {
    // lit windows at night (doctrine v2 item 6)
    for (const wm of windowMats) wm.emissiveIntensity = night * 1.6
    // smoke drift
    const arr = smoke.geometry.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < N; i++) {
      let y = arr.getY(i) + dt * 1.1
      if (y > center.y + 16) y = center.y + 5
      arr.setY(i, y)
      arr.setX(i, arr.getX(i) + dt * 0.4)
    }
    arr.needsUpdate = true
    // agents: one mesh per living resident, wandering the street
    for (const r of alive(s)) {
      let m = agents.get(r.id)
      if (!m) {
        // Dusty period clothing palette — the old `base + random` hex math overflowed
        // across channels and produced candy blues/purples (seen on device).
        const CLOTHES = [0x5a4632, 0x6e5a40, 0x4a3b2c, 0x7a6a50, 0x8a7355, 0x3e352a, 0x6b4a2e, 0x59544a]
        m = new THREE.Mesh(agentGeo, new MeshStandardNodeMaterial({ color: CLOTHES[Math.floor(rng() * CLOTHES.length)], roughness: 1 }))
        m.castShadow = true
        m.position.set(cx + (rng() - 0.5) * 14, center.y + 0.8, cz + (rng() - 0.5) * 60)
        m.userData.t = rng() * 100
        group.add(m); agents.set(r.id, m)
      }
      m.userData.t += dt * 0.5
      m.position.x = cx + Math.sin(m.userData.t + Number(r.id.slice(1))) * 7
      m.position.z += Math.cos(m.userData.t * 0.7) * dt * 2
      if (m.position.z < cz - 36) m.position.z = cz - 36
      if (m.position.z > cz + 36) m.position.z = cz + 36
      m.position.y = terrain.heightAt(m.position.x, m.position.z) + 0.8
    }
    // remove the dead/gone
    for (const [id, m] of agents) {
      const r = s.residents.find(x => x.id === id)
      if (!r || !r.alive || r.left || r.outlaw) { group.remove(m); agents.delete(id) }
    }
  }
  return { group, windowMats, smoke, agents, center, update }
}
