/**
 * Building geometry generation and rendering.
 * Simple box-based silhouettes (14 distinct types).
 */

import * as THREE from 'three'
import type { Building, BuildingType } from '../sim/types'

interface BuildingGeometry {
  width: number
  height: number
  depth: number
  roofColor: number
  wallColor: number
}

const BUILDING_GEOMETRIES: Record<BuildingType, BuildingGeometry> = {
  'cabin': { width: 1.5, height: 1.5, depth: 1.5, wallColor: 0x8B4513, roofColor: 0x654321 },
  'saloon': { width: 2.5, height: 2.0, depth: 2.0, wallColor: 0xA0522D, roofColor: 0x8B0000 },
  'general-store': { width: 2.0, height: 1.8, depth: 2.0, wallColor: 0x696969, roofColor: 0x2F4F4F },
  'church': { width: 1.5, height: 3.5, depth: 3.0, wallColor: 0x8B7355, roofColor: 0x654321 },
  'bank': { width: 2.0, height: 2.0, depth: 2.0, wallColor: 0x696969, roofColor: 0x2F4F4F },
  'mine': { width: 2.0, height: 1.5, depth: 2.0, wallColor: 0x36454F, roofColor: 0x1C1C1C },
  'pasture': { width: 3.0, height: 0.5, depth: 3.0, wallColor: 0x8FBC8F, roofColor: 0x228B22 },
  'lumber-mill': { width: 2.5, height: 2.0, depth: 2.5, wallColor: 0x8B4513, roofColor: 0x654321 },
  'water-tower': { width: 1.0, height: 3.0, depth: 1.0, wallColor: 0x696969, roofColor: 0x36454F },
  'doctor': { width: 1.5, height: 1.8, depth: 1.5, wallColor: 0xF5F5F5, roofColor: 0xFF0000 },
  'firehouse': { width: 2.5, height: 2.0, depth: 2.5, wallColor: 0xFF0000, roofColor: 0x8B0000 },
  'sheriff': { width: 1.5, height: 1.8, depth: 1.5, wallColor: 0x696969, roofColor: 0x36454F },
  'telegraph': { width: 0.8, height: 2.5, depth: 0.8, wallColor: 0x8B4513, roofColor: 0x654321 },
  'rail-depot': { width: 4.0, height: 1.5, depth: 3.0, wallColor: 0x8B4513, roofColor: 0x654321 },
  'barracks': { width: 3.0, height: 1.8, depth: 2.5, wallColor: 0x696969, roofColor: 0x36454F },
  // New distinct building types
  'tent': { width: 2.0, height: 2.2, depth: 2.0, wallColor: 0xD3D3D3, roofColor: 0xA9A9A9 },  // Canvas A-frame
  'well': { width: 1.2, height: 2.0, depth: 1.2, wallColor: 0x8B7355, roofColor: 0x654321 },   // Roofed stone ring
  'farm': { width: 3.5, height: 0.8, depth: 3.5, wallColor: 0x8FBC8F, roofColor: 0x228B22 },   // Low fenced field + barn
  'ranch': { width: 4.5, height: 1.2, depth: 2.0, wallColor: 0xA0522D, roofColor: 0x8B4513 }, // Long low barn + corral
  'sawmill': { width: 3.0, height: 2.5, depth: 2.5, wallColor: 0x8B4513, roofColor: 0x654321 },// Open shed + saw blade
  'assay': { width: 1.8, height: 1.8, depth: 1.8, wallColor: 0x696969, roofColor: 0x36454F },  // Small office + chimney
}

/**
 * Create 3D mesh for a building.
 */
export function createBuildingMesh(building: Building): THREE.Group {
  const group = new THREE.Group()
  group.position.set(building.pos.x, building.pos.y + building.terraceHeight, building.pos.z)
  group.rotation.y = building.rotation
  
  const geom = BUILDING_GEOMETRIES[building.type]
  
  // Main structure (box)
  const wallGeometry = new THREE.BoxGeometry(geom.width, geom.height, geom.depth)
  const wallMaterial = new THREE.MeshStandardMaterial({
    color: geom.wallColor,
    roughness: 0.8,
    metalness: 0,
  })
  const walls = new THREE.Mesh(wallGeometry, wallMaterial)
  walls.castShadow = true
  walls.receiveShadow = true
  walls.position.y = geom.height * 0.5
  group.add(walls)
  
  // Roof (scaled box slightly larger)
  const roofGeometry = new THREE.BoxGeometry(geom.width + 0.1, 0.4, geom.depth + 0.1)
  const roofMaterial = new THREE.MeshStandardMaterial({
    color: geom.roofColor,
    roughness: 0.7,
    metalness: 0.1,
  })
  const roof = new THREE.Mesh(roofGeometry, roofMaterial)
  roof.castShadow = true
  roof.receiveShadow = true
  roof.position.y = geom.height + 0.2
  group.add(roof)
  
  return group
}

/**
 * Container for all building graphics.
 */
export interface BuildingGraphics {
  meshes: Map<string, THREE.Group>
  count: number
}

/**
 * Setup buildings in scene.
 */
export function setupBuildingGraphics(
  scene: THREE.Scene,
  buildings: Map<string, Building>
): BuildingGraphics {
  const meshes = new Map<string, THREE.Group>()
  
  for (const [id, building] of buildings) {
    const mesh = createBuildingMesh(building)
    meshes.set(id, mesh)
    scene.add(mesh)
  }
  
  console.log(`[Buildings] Placed ${buildings.size} buildings`)
  
  return {
    meshes,
    count: buildings.size,
  }
}

/**
 * Update building mesh position (for movement/animation).
 */
export function updateBuildingMesh(mesh: THREE.Group, building: Building) {
  mesh.position.set(building.pos.x, building.pos.y + building.terraceHeight, building.pos.z)
  mesh.rotation.y = building.rotation
}
