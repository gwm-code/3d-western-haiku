/**
 * Vegetation rendering: procedural grass placement + instancing.
 * Target: >= 400,000 grass instances @ 60 fps.
 */

import * as THREE from 'three'
import type { TerrainMap } from '../sim/terrain'
import { sampleHeight, sampleSlope, isRiver } from '../sim/terrain'
import { rng, rngInt } from '../sim/rng'

/**
 * Vegetation species with visual parameters.
 */
interface VegetationSpecies {
  name: string
  density: number // 0–1, chance per cell
  height: { min: number; max: number }
  color: number
  roughness: number
}

const SPECIES: VegetationSpecies[] = [
  {
    name: 'sage',
    density: 0.6,
    height: { min: 0.3, max: 0.6 },
    color: 0x8B8B6F,
  roughness: 0.9
  },
  {
    name: 'grass',
    density: 0.8,
    height: { min: 0.1, max: 0.3 },
    color: 0x9ACD32,
    roughness: 0.8
  },
  {
    name: 'creosote',
    density: 0.3,
    height: { min: 0.5, max: 1.0 },
    color: 0x556B2F,
    roughness: 0.85
  },
  {
    name: 'desert-willow',
    density: 0.1,
    height: { min: 1.5, max: 2.5 },
    color: 0x6B4423,
    roughness: 0.7
  },
  {
    name: 'yucca',
    density: 0.15,
    height: { min: 0.8, max: 1.5 },
    color: 0x8FBC8F,
    roughness: 0.75
  },
  {
    name: 'cholla',
    density: 0.2,
    height: { min: 0.6, max: 1.2 },
    color: 0x696969,
    roughness: 0.9
  }
]

/**
 * Create instanced mesh for a vegetation species.
 */
function createVegetationMesh(
  terrain: TerrainMap,
  species: VegetationSpecies,
  seed: number
): THREE.InstancedMesh {
  // Simple box geometry for vegetation (will improve visual quality later)
  const geometry = new THREE.BoxGeometry(0.3, 0.7, 0.3)
  const material = new THREE.MeshStandardMaterial({
    color: species.color,
    roughness: species.roughness,
    metalness: 0,
  })
  
  // Count instances
  let instanceCount = 0
  for (let z = 0; z < terrain.height; z++) {
    for (let x = 0; x < terrain.width; x++) {
      if (isRiver(terrain, x * terrain.cellSize, z * terrain.cellSize)) continue
      
      // Seeded random for density
      const cellSeed = seed + z * terrain.width + x
      const rand = Math.sin(cellSeed * 12.9898) * 43758.5453
      const r = rand - Math.floor(rand)
      
      if (r < species.density) {
        instanceCount++
      }
    }
  }
  
  const mesh = new THREE.InstancedMesh(geometry, material, instanceCount)
  mesh.castShadow = true
  mesh.receiveShadow = true
  
  // Place instances
  const matrix = new THREE.Matrix4()
  let idx = 0
  
  for (let z = 0; z < terrain.height; z++) {
    for (let x = 0; x < terrain.width; x++) {
      if (isRiver(terrain, x * terrain.cellSize, z * terrain.cellSize)) continue
      
      const cellSeed = seed + z * terrain.width + x
      const rand = Math.sin(cellSeed * 12.9898) * 43758.5453
      const r = rand - Math.floor(rand)
      
      if (r < species.density) {
        const px = x * terrain.cellSize
        const pz = z * terrain.cellSize
        const h = sampleHeight(terrain, px, pz)
        
        // Random height variation
        const heightSeed = cellSeed * 78.233
        const heightRand = Math.sin(heightSeed) * 43758.5453 - Math.floor(Math.sin(heightSeed) * 43758.5453)
        const height = species.height.min + (species.height.max - species.height.min) * heightRand
        
        // Position: plant on ground
        matrix.setPosition(px, h, pz)
        mesh.setMatrixAt(idx, matrix)
        idx++
      }
    }
  }
  
  return mesh
}

/**
 * Container for all vegetation.
 */
export interface VegetationGraphics {
  meshes: Map<string, THREE.InstancedMesh>
  totalCount: number
}

/**
 * Setup complete vegetation system.
 */
export function setupVegetationGraphics(
  scene: THREE.Scene,
  terrain: TerrainMap,
  seed: number
): VegetationGraphics {
  const meshes = new Map<string, THREE.InstancedMesh>()
  let totalCount = 0
  
  for (const species of SPECIES) {
    const mesh = createVegetationMesh(terrain, species, seed + species.name.charCodeAt(0))
    meshes.set(species.name, mesh)
    scene.add(mesh)
    totalCount += mesh.count
  }
  
  console.log(`[Vegetation] Placed ${totalCount} instances (${SPECIES.length} species)`)
  
  return {
    meshes,
    totalCount,
  }
}
