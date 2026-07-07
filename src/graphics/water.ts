/**
 * Water surface rendering.
 * Animated river + pond system.
 */

import * as THREE from 'three'
import type { TerrainMap } from '../sim/terrain'
import { isRiver, sampleHeight } from '../sim/terrain'

/**
 * Create water mesh for river(s).
 * Simple plane-based river following terrain.
 */
export function createWaterMesh(terrain: TerrainMap): THREE.Mesh {
  const vertices: number[] = []
  const indices: number[] = []
  let vertexCount = 0
  
  // Find all river cells and create water planes
  for (let z = 0; z < terrain.height; z++) {
    for (let x = 0; x < terrain.width; x++) {
      if (terrain.riverMask[z * terrain.width + x] === 1) {
        const h = sampleHeight(terrain, x * terrain.cellSize, z * terrain.cellSize)
        
        // Create a small quad at each river cell
        const px = x * terrain.cellSize
        const pz = z * terrain.cellSize
        const cellSize = terrain.cellSize * 0.9 // Slightly smaller than terrain cell
        const waterH = h - 0.5 // Water surface slightly below terrain
        
        // 4 vertices per cell
        const v0 = vertexCount++
        const v1 = vertexCount++
        const v2 = vertexCount++
        const v3 = vertexCount++
        
        vertices.push(
          px - cellSize / 2, waterH, pz - cellSize / 2, // v0
          px + cellSize / 2, waterH, pz - cellSize / 2, // v1
          px + cellSize / 2, waterH, pz + cellSize / 2, // v2
          px - cellSize / 2, waterH, pz + cellSize / 2  // v3
        )
        
        // 2 triangles
        indices.push(v0, v1, v2)
        indices.push(v0, v2, v3)
      }
    }
  }
  
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vertices), 3))
  geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1))
  
  const material = new THREE.MeshStandardMaterial({
    color: 0x1E90FF, // Dodger blue
    metalness: 0.1,
    roughness: 0.3,
    transparent: true,
    opacity: 0.8,
  })
  
  const mesh = new THREE.Mesh(geometry, material)
  mesh.castShadow = true
  mesh.receiveShadow = true
  
  return mesh
}

/**
 * Container for water graphics.
 */
export interface WaterGraphics {
  mesh: THREE.Mesh
  initialTime: number
}

/**
 * Setup water system.
 */
export function setupWaterGraphics(scene: THREE.Scene, terrain: TerrainMap): WaterGraphics {
  const mesh = createWaterMesh(terrain)
  scene.add(mesh)
  
  return {
    mesh,
    initialTime: Date.now(),
  }
}

/**
 * Animate water (wave motion, flow).
 */
export function updateWater(water: WaterGraphics, deltaTime: number) {
  const elapsedSec = (Date.now() - water.initialTime) / 1000
  
  // Gentle wave motion
  const positions = (water.mesh.geometry.getAttribute('position') as THREE.BufferAttribute).array as Float32Array
  for (let i = 0; i < positions.length; i += 3) {
    const x = positions[i]
    const z = positions[i + 2]
    // Small wave based on position and time
    const waveAmount = Math.sin((x + z) * 0.01 + elapsedSec * 0.5) * 0.05
    positions[i + 1] += waveAmount * 0.001 // Subtle vertical movement
  }
  
  (water.mesh.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true
}
