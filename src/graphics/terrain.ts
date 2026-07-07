/**
 * Three.js terrain rendering using WebGPU.
 * Geometry generation from heightmap + terrain-aware material.
 */

import * as THREE from 'three'
import type { TerrainMap } from '../sim/terrain'

/**
 * Generate Three.js BufferGeometry from terrain heightmap.
 * Creates a quad mesh with proper UV mapping.
 */
export function createTerrainGeometry(terrain: TerrainMap): THREE.BufferGeometry {
  const { width, height, cellSize, heightmap } = terrain
  
  // Vertices: (width) x (height) grid
  const vertices: number[] = []
  const indices: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  
  // Build vertex data
  for (let z = 0; z < height; z++) {
    for (let x = 0; x < width; x++) {
      const h = heightmap[z * width + x]
      vertices.push(
        x * cellSize,
        h,
        z * cellSize
      )
      
      // UV: normalize to [0,1]
      uvs.push(x / (width - 1), z / (height - 1))
    }
  }
  
  // Build faces (quad → 2 triangles per quad)
  for (let z = 0; z < height - 1; z++) {
    for (let x = 0; x < width - 1; x++) {
      const a = z * width + x
      const b = z * width + (x + 1)
      const c = (z + 1) * width + x
      const d = (z + 1) * width + (x + 1)
      
      // Triangle 1
      indices.push(a, c, b)
      // Triangle 2
      indices.push(b, c, d)
    }
  }
  
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3))
  geometry.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2))
  geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1))
  
  // Compute normals
  geometry.computeVertexNormals()
  
  return geometry
}

/**
 * Create a material for terrain rendering.
 * Desert sand color with light adaptation.
 */
export function createTerrainMaterial(): THREE.Material {
  return new THREE.MeshStandardMaterial({
    color: 0xC4A86B, // Desert sand
    metalness: 0,
    roughness: 0.85,
    wireframe: false,
  })
}

/**
 * Create sky dome (simple sphere for now).
 * Will expand to Rayleigh scattering in Phase 1 detailed pass.
 */
export function createSkyDome(scene: THREE.Scene): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(500, 32, 32)
  
  // Sky material (facing inward)
  const material = new THREE.MeshBasicMaterial({
    color: 0x87CEEB, // Sky blue placeholder
    side: THREE.BackSide,
  })
  
  const sky = new THREE.Mesh(geometry, material)
  scene.add(sky)
  
  return sky
}

/**
 * Create directional light simulating sun.
 * Position will be controlled by time-of-day in later phase.
 */
export function createSunlight(scene: THREE.Scene, elevation: number = 45): THREE.DirectionalLight {
  const light = new THREE.DirectionalLight(0xFFFFFF, 1.0)
  
  // Position sun at given elevation
  const rad = THREE.MathUtils.degToRad(elevation)
  const azimuth = THREE.MathUtils.degToRad(45) // NE
  
  light.position.set(
    Math.cos(azimuth) * Math.cos(rad) * 100,
    Math.sin(rad) * 100,
    Math.sin(azimuth) * Math.cos(rad) * 100
  )
  
  // Shadows for better lighting
  light.castShadow = true
  light.shadow.mapSize.width = 2048
  light.shadow.mapSize.height = 2048
  light.shadow.camera.near = 0.1
  light.shadow.camera.far = 500
  light.shadow.camera.left = -100
  light.shadow.camera.right = 100
  light.shadow.camera.top = 100
  light.shadow.camera.bottom = -100
  
  scene.add(light)
  
  return light
}

/**
 * Create ambient light for fill.
 */
export function createAmbientLight(scene: THREE.Scene, intensity: number = 0.3): THREE.AmbientLight {
  const light = new THREE.AmbientLight(0xFFFFFF, intensity)
  scene.add(light)
  return light
}

/**
 * Container for all terrain graphics.
 */
export interface TerrainGraphics {
  geometry: THREE.BufferGeometry
  material: THREE.Material
  mesh: THREE.Mesh
  sky: THREE.Mesh
  sun: THREE.DirectionalLight
  ambient: THREE.AmbientLight
}

/**
 * Setup complete terrain scene.
 */
export function setupTerrainGraphics(scene: THREE.Scene, terrain: TerrainMap): TerrainGraphics {
  const geometry = createTerrainGeometry(terrain)
  const material = createTerrainMaterial()
  const mesh = new THREE.Mesh(geometry, material)
  mesh.castShadow = true
  mesh.receiveShadow = true
  scene.add(mesh)
  
  const sky = createSkyDome(scene)
  const sun = createSunlight(scene, 45) // 45° elevation (morning)
  const ambient = createAmbientLight(scene, 0.3)
  
  return {
    geometry,
    material,
    mesh,
    sky,
    sun,
    ambient,
  }
}
