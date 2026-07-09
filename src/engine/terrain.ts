/**
 * Graphics doctrine v2 terrain — TSL node material (NOT flat vertex colors).
 * Biome blend from a per-vertex attribute, banded sandstone strata on high walls,
 * mx_noise ground detail so close terrain isn't flat color.
 * Verified against installed three@0.184 exports before writing (see docs/THREE-NOTES.md).
 */
import * as THREE from 'three'
import { MeshStandardNodeMaterial } from 'three/webgpu'
import {
  attribute, positionWorld, normalWorld, mix, smoothstep, float, vec3,
  mx_noise_float, fract, clamp,
} from 'three/tsl'
import { setSeed, rng, rngInt } from '../sim/rng'

export interface Terrain {
  mesh: THREE.Mesh
  size: number            // world units per side
  heightAt: (x: number, z: number) => number
  biomeAt: (x: number, z: number) => number  // 0 desert, 1 steppe, 2 valley (continuous)
}

const GRID = 220
const CELL = 3.2
export const WORLD = GRID * CELL // ~704

// value noise (CPU, for the heightfield)
function makeNoise(seed: number) {
  const perm = new Uint8Array(512)
  setSeed(seed)
  const p = [...Array(256).keys()]
  for (let i = 255; i > 0; i--) { const j = rngInt(0, i); [p[i], p[j]] = [p[j], p[i]] }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255]
  const fade = (t: number) => t * t * (3 - 2 * t)
  return (x: number, y: number): number => {
    const xi = Math.floor(x) & 255, yi = Math.floor(y) & 255
    const xf = x - Math.floor(x), yf = y - Math.floor(y)
    const h = (a: number, b: number) => perm[(perm[a & 511] + b) & 511] / 255
    const u = fade(xf), v = fade(yf)
    const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1)
    return (a + (b - a) * u) * (1 - v) + (c + (d - c) * u) * v
  }
}

export function buildTerrain(seed: number, scene: THREE.Scene): Terrain {
  const noise = makeNoise(seed)
  setSeed(seed ^ 0x5151)
  // Bold buttes in the WEST third
  const buttes: { cx: number; cz: number; r: number; h: number }[] = []
  const nB = rngInt(5, 7)
  for (let i = 0; i < nB; i++) buttes.push({
    cx: rng() * WORLD * 0.32,
    cz: WORLD * 0.08 + rng() * WORLD * 0.84,
    r: 26 + rng() * 34,
    h: 46 + rng() * 26,
  })
  const smooth = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t) }

  const heightAt = (x: number, z: number): number => {
    const u = x / WORLD
    let h = 3.5 + noise(x / 260, z / 260) * 4 * (0.3 + u)          // near-flat plain
    h -= Math.max(0, (u - 0.62) / 0.38) * 6                          // east valley dip
    for (const b of buttes) {
      const d = Math.hypot(x - b.cx, z - b.cz)
      if (d < b.r) {
        const t = d / b.r
        const wall = t < 0.72 ? 1 : 1 - smooth(0.72, 1, t)
        const top = 1 + noise(x / 18, z / 18) * 0.05
        h = Math.max(h, b.h * wall * top)
      }
    }
    // carve the river channel (meanders near x = 0.82 * WORLD)
    const rx = WORLD * 0.82 + Math.sin(z / 55) * 16 + noise(0.7, z / 90) * 22 - 11
    const rd = Math.abs(x - rx)
    if (rd < 7) h = Math.min(h, 0.6 + rd * 0.18)
    return h
  }
  const biomeAt = (x: number, z: number): number => {
    const u = x / WORLD + (noise(x / 120, z / 120) - 0.5) * 0.12
    return u < 0.38 ? 0 : u < 0.66 ? 0.5 + (u - 0.38) / 0.56 : 2 - Math.max(0, (0.95 - u)) * 0 // 0 desert -> ~1 steppe -> 2 valley
  }

  // geometry
  const geo = new THREE.PlaneGeometry(WORLD, WORLD, GRID, GRID)
  geo.rotateX(-Math.PI / 2)
  const pos = geo.attributes.position as THREE.BufferAttribute
  const biomeArr = new Float32Array(pos.count)
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + WORLD / 2, z = pos.getZ(i) + WORLD / 2
    pos.setY(i, heightAt(x, z))
    biomeArr[i] = biomeAt(x, z)
  }
  geo.translate(WORLD / 2, 0, WORLD / 2)
  geo.setAttribute('biome', new THREE.BufferAttribute(biomeArr, 1))
  geo.computeVertexNormals()

  // ---- TSL material: doctrine v2 ----
  const mat = new MeshStandardNodeMaterial({ roughness: 0.94, metalness: 0 })
  // @types/three omits toFloat() on AttributeNode though the impl has it (verified via
  // node require). Cast once; see THREE-NOTES impl-vs-decl rule.
  const biomeAttr = attribute('biome', 'float') as unknown as ReturnType<typeof float>
  const biome = biomeAttr
  const wy = positionWorld.y
  const wx = positionWorld.x
  const wz = positionWorld.z

  const desert = vec3(0.66, 0.30, 0.16)   // red dirt
  const steppe = vec3(0.72, 0.61, 0.38)   // sage tan
  const valley = vec3(0.36, 0.50, 0.24)   // green
  let base = mix(desert, steppe, smoothstep(float(0.15), float(1.0), biome))
  base = mix(base, valley, smoothstep(float(1.0), float(2.0), biome))

  // banded sandstone strata on high ground: >=3 visible bands via fract(worldY)
  const bandT = fract(wy.mul(0.16))
  const bandTint = mix(vec3(0.62, 0.36, 0.22), vec3(0.78, 0.52, 0.30), smoothstep(float(0.2), float(0.8), bandT))
  const rockiness = smoothstep(float(14.0), float(30.0), wy)
  base = mix(base, bandTint, rockiness)

  // ground detail: 2 octaves of mx_noise so close terrain isn't flat color
  const n1 = mx_noise_float(vec3(wx.mul(0.15), wy.mul(0.15), wz.mul(0.15)))
  const n2 = mx_noise_float(vec3(wx.mul(0.55), wy.mul(0.55), wz.mul(0.55)))
  const detail = n1.mul(0.10).add(n2.mul(0.05))
  base = base.add(vec3(detail, detail, detail))

  // slope darkening (crevices read deeper)
  const flatness = clamp(normalWorld.y, 0.0, 1.0)
  base = base.mul(mix(float(0.72), float(1.0), flatness))

  mat.colorNode = base

  const mesh = new THREE.Mesh(geo, mat)
  mesh.receiveShadow = true
  scene.add(mesh)
  return { mesh, size: WORLD, heightAt, biomeAt }
}
