/** Day/night: four authored light states, lerped. Doctrine v2 item 2. */
import * as THREE from 'three'
import { MeshStandardNodeMaterial } from 'three/webgpu'
import { positionLocal, positionWorld, time, sin, vec3, float, attribute, mix, smoothstep } from 'three/tsl'
import { setSeed, rng } from '../sim/rng'
import type { Terrain } from './terrain'
import { WORLD } from './terrain'

interface LightState { sunDir: THREE.Vector3; sunColor: number; sunI: number; skyC: number; groundC: number; hemiI: number; exposure: number; fog: number }
const STATES: LightState[] = [
  { sunDir: new THREE.Vector3(0.9, 0.25, 0.2), sunColor: 0xffd9a8, sunI: 2.2, skyC: 0xcfe4f5, groundC: 0x7a5a3c, hemiI: 0.75, exposure: 1.0, fog: 0xd8c9ae },  // dawn
  { sunDir: new THREE.Vector3(0.1, 1.0, 0.05), sunColor: 0xfff3e0, sunI: 3.1, skyC: 0xbcd8f0, groundC: 0x8a6a45, hemiI: 0.9, exposure: 1.08, fog: 0xd9d2bf },   // harsh noon
  { sunDir: new THREE.Vector3(-0.9, 0.18, -0.1), sunColor: 0xff9a4d, sunI: 2.4, skyC: 0xe8b98a, groundC: 0x6b4a3a, hemiI: 0.7, exposure: 1.02, fog: 0xe3a875 }, // golden dusk
  { sunDir: new THREE.Vector3(-0.3, -0.4, 0.6), sunColor: 0x8899cc, sunI: 0.25, skyC: 0x2a3550, groundC: 0x1c1712, hemiI: 0.35, exposure: 0.9, fog: 0x141a28 }, // night
]

export interface DayNight { sun: THREE.DirectionalLight; hemi: THREE.HemisphereLight; set: (t: number) => void }

export function buildLights(scene: THREE.Scene, renderer: { toneMappingExposure: number }): DayNight {
  const sun = new THREE.DirectionalLight(0xffffff, 2)
  sun.castShadow = true
  sun.shadow.mapSize.set(2048, 2048)
  const d = 260
  sun.shadow.camera.left = -d; sun.shadow.camera.right = d
  sun.shadow.camera.top = d; sun.shadow.camera.bottom = -d
  sun.shadow.camera.far = 900
  scene.add(sun); scene.add(sun.target)
  const hemi = new THREE.HemisphereLight(0xbfd8ff, 0x8a6a45, 0.8)
  scene.add(hemi)
  scene.fog = new THREE.Fog(0xd8c9ae, WORLD * 0.55, WORLD * 1.5)

  const set = (t: number) => { // t 0..1 across the week -> dawn..night
    const seg = t * (STATES.length - 1)
    const i = Math.min(STATES.length - 2, Math.floor(seg))
    const f = seg - i
    const a = STATES[i], b = STATES[i + 1]
    const lerpC = (x: number, y: number, k: number) => new THREE.Color(x).lerp(new THREE.Color(y), k)
    sun.color.copy(lerpC(a.sunColor, b.sunColor, f))
    sun.intensity = a.sunI + (b.sunI - a.sunI) * f
    const dir = a.sunDir.clone().lerp(b.sunDir, f).normalize()
    sun.position.set(WORLD / 2 + dir.x * 400, Math.max(30, dir.y * 400), WORLD / 2 + dir.z * 400)
    sun.target.position.set(WORLD / 2, 0, WORLD / 2)
    hemi.color.copy(lerpC(a.skyC, b.skyC, f))
    hemi.groundColor.copy(lerpC(a.groundC, b.groundC, f))
    hemi.intensity = a.hemiI + (b.hemiI - a.hemiI) * f
    renderer.toneMappingExposure = a.exposure + (b.exposure - a.exposure) * f
    ;(scene.fog as THREE.Fog).color.copy(lerpC(a.fog, b.fog, f))
    ;(scene.background as THREE.Color | null)?.copy(lerpC(a.skyC, b.skyC, f))
  }
  scene.background = new THREE.Color(0xcfe4f5)
  set(0.35)
  return { sun, hemi, set }
}

/** Living ground cover: instanced sage/grass with TSL wind sway; tumbleweeds; buzzards. */
export interface Scatter { count: number; tumbleweeds: THREE.Mesh[]; buzzards: THREE.Group; update: (dt: number) => void }

export function buildScatter(seed: number, scene: THREE.Scene, terrain: Terrain): Scatter {
  setSeed(seed ^ 0xabcd)
  // wind-swayed instanced material: sway by instance world pos + time in vertex stage
  const makeSwayMat = (c: number) => {
    const m = new MeshStandardNodeMaterial({ color: c, roughness: 1 })
    const sway = sin(time.mul(1.6).add(positionWorld.x.mul(0.15)).add(positionWorld.z.mul(0.13)))
    const amp = positionLocal.y.mul(0.14) // only tops move
    m.positionNode = positionLocal.add(vec3(sway.mul(amp), float(0), sway.mul(amp).mul(0.6)))
    return m
  }
  const specs = [
    { geo: new THREE.ConeGeometry(0.5, 1.6, 5), mat: makeSwayMat(0x5a6e35), n: 90000, biome: [0.8, 2.1] },  // grass tufts (valley/steppe)
    { geo: new THREE.IcosahedronGeometry(0.8, 0), mat: makeSwayMat(0x6b7a44), n: 60000, biome: [0.3, 1.6] }, // sage
    { geo: new THREE.ConeGeometry(0.35, 2.2, 6), mat: new MeshStandardNodeMaterial({ color: 0x3f6b3a, roughness: 1 }), n: 50000, biome: [1.5, 2.1] }, // valley reeds/scrub
    { geo: new THREE.CylinderGeometry(0.22, 0.3, 1.8, 5), mat: new MeshStandardNodeMaterial({ color: 0x4d7040, roughness: 1 }), n: 30000, biome: [-0.1, 0.5] }, // cactus
    { geo: new THREE.SphereGeometry(0.5, 5, 4), mat: new MeshStandardNodeMaterial({ color: 0x84703f, roughness: 1 }), n: 20000, biome: [-0.1, 0.9] }, // desert scrub
  ]
  let total = 0
  const dummy = new THREE.Object3D()
  for (const sp of specs) {
    const im = new THREE.InstancedMesh(sp.geo, sp.mat, sp.n)
    let placed = 0
    let guard = 0
    while (placed < sp.n && guard < sp.n * 6) {
      guard++
      const x = rng() * WORLD, z = rng() * WORLD
      const b = terrain.biomeAt(x, z)
      if (b < sp.biome[0] || b > sp.biome[1]) continue
      const y = terrain.heightAt(x, z)
      if (y > 13 || y < 0.7) continue // not on butte walls or in the river
      dummy.position.set(x, y, z)
      dummy.rotation.y = rng() * Math.PI * 2
      const sc = 0.6 + rng() * 0.9
      dummy.scale.set(sc, sc, sc)
      dummy.updateMatrix()
      im.setMatrixAt(placed++, dummy.matrix)
    }
    im.count = placed
    im.instanceMatrix.needsUpdate = true
    scene.add(im)
    total += placed
  }

  // tumbleweeds (roll with wind vector)
  const tumbleweeds: THREE.Mesh[] = []
  const twMat = new MeshStandardNodeMaterial({ color: 0x9a8352, roughness: 1, wireframe: true })
  for (let i = 0; i < 6; i++) {
    const tw = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9, 1), twMat)
    tw.position.set(rng() * WORLD, 1, rng() * WORLD)
    scene.add(tw); tumbleweeds.push(tw)
  }
  // buzzards circling the tallest butte
  const buzzards = new THREE.Group()
  const bGeo = new THREE.ConeGeometry(0.25, 1.4, 3)
  bGeo.rotateZ(Math.PI / 2)
  for (let i = 0; i < 4; i++) {
    const b = new THREE.Mesh(bGeo, new MeshStandardNodeMaterial({ color: 0x201a14 }))
    b.userData.phase = (i / 4) * Math.PI * 2
    buzzards.add(b)
  }
  buzzards.position.set(WORLD * 0.18, 62, WORLD * 0.4)
  scene.add(buzzards)

  const wind = new THREE.Vector3(1, 0, 0.35).normalize()
  const update = (dt: number) => {
    for (const tw of tumbleweeds) {
      tw.position.addScaledVector(wind, dt * 6)
      tw.rotation.x += dt * 3; tw.rotation.z += dt * 2
      if (tw.position.x > WORLD) { tw.position.x = 0; tw.position.z = rng() * WORLD }
      tw.position.y = terrain.heightAt(tw.position.x, tw.position.z) + 0.8
    }
    const t = performance.now() / 1000
    buzzards.children.forEach((b, i) => {
      const ph = t * 0.25 + (b.userData.phase as number)
      b.position.set(Math.cos(ph) * (16 + i * 3), Math.sin(t * 0.5 + i) * 2, Math.sin(ph) * (16 + i * 3))
      b.rotation.y = -ph
    })
  }
  return { count: total, tumbleweeds, buzzards, update }
}
