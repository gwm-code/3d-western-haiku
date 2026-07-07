/**
 * Building placement validation.
 * Core rule A: Buildings grown into land, not placed on slopes.
 * Rule: no building on slope > maxSlope without visible terrace.
 */

import { sampleHeight, sampleSlope, isRiver, riverDistance } from './terrain'
import type { TerrainMap } from './terrain'
import type { Building, BuildingType, TERRAIN as TerrainConst } from './types'
import { TERRAIN } from './types'
import { failLoud } from './util'

export type PlacementRejection = 
  | 'slope-too-steep'
  | 'too-close-to-river'
  | 'out-of-bounds'
  | 'occupied'
  | 'insufficient-resources'

export interface PlacementResult {
  valid: boolean
  reason?: PlacementRejection
}

/**
 * Check if a building can be placed at (x, z).
 */
export function canPlace(
  terrain: TerrainMap,
  x: number,
  z: number,
  buildingType: BuildingType,
  existingBuildings: Map<string, Building>
): PlacementResult {
  
  // Bounds check
  if (x < 0 || x >= terrain.width * terrain.cellSize || 
      z < 0 || z >= terrain.height * terrain.cellSize) {
    return { valid: false, reason: 'out-of-bounds' }
  }
  
  // River check
  if (isRiver(terrain, x, z)) {
    return { valid: false, reason: 'too-close-to-river' }
  }
  
  // Minimum distance from river (except water-tower which needs proximity)
  const distToRiver = riverDistance(terrain, x, z)
  if (buildingType !== 'water-tower' && distToRiver < TERRAIN.minRiverDist) {
    return { valid: false, reason: 'too-close-to-river' }
  }
  
  // Slope check: steeper than maxSlope requires terrace
  const slope = sampleSlope(terrain, x, z)
  if (slope > TERRAIN.maxSlope) {
    return { valid: false, reason: 'slope-too-steep' }
  }
  
  // Collision check with existing buildings (1-unit radius)
  for (const [_, bldg] of existingBuildings) {
    const dx = bldg.pos.x - x
    const dz = bldg.pos.z - z
    const dist = Math.sqrt(dx * dx + dz * dz)
    if (dist < 3.0) {
      return { valid: false, reason: 'occupied' }
    }
  }
  
  return { valid: true }
}

/**
 * Compute terrace height for a building on sloped terrain.
 * Returns elevation offset to level the building platform.
 */
export function computeTerraceHeight(
  terrain: TerrainMap,
  x: number,
  z: number,
  buildingSize: number = 2.0
): number {
  // Sample elevation at corners of building footprint
  const half = buildingSize / 2
  const h1 = sampleHeight(terrain, x - half, z - half)
  const h2 = sampleHeight(terrain, x + half, z - half)
  const h3 = sampleHeight(terrain, x - half, z + half)
  const h4 = sampleHeight(terrain, x + half, z + half)
  
  // Use highest corner as level (builds up a terrace)
  return Math.max(h1, h2, h3, h4) - sampleHeight(terrain, x, z)
}

/**
 * Attempt to place a building.
 * Returns the building with computed position/terrace, or null if rejected.
 */
export function placeBuilding(
  id: string,
  type: BuildingType,
  x: number,
  z: number,
  terrain: TerrainMap,
  existingBuildings: Map<string, Building>
): Building | null {
  
  const check = canPlace(terrain, x, z, type, existingBuildings)
  if (!check.valid) {
    return null
  }
  
  const baseHeight = sampleHeight(terrain, x, z)
  const terraceHeight = computeTerraceHeight(terrain, x, z)
  
  const building: Building = {
    id,
    type,
    pos: { x, y: baseHeight, z },
    rotation: 0,
    terraceHeight,
    workers: 0,
    maxWorkers: 5, // Generic; tuned per building type in Phase 5
    status: 'active',
    age: 0,
    output: 0,
    condition: 1.0,
  }
  
  return building
}

/**
 * Get building footprint size by type.
 */
export function getBuildingSize(type: BuildingType): number {
  const sizes: Record<BuildingType, number> = {
    'cabin': 2.0,
    'saloon': 3.0,
    'general-store': 2.5,
    'church': 3.5,
    'bank': 2.5,
    'mine': 2.0,
    'pasture': 4.0,
    'lumber-mill': 3.0,
    'water-tower': 2.0,
    'doctor': 2.0,
    'firehouse': 2.5,
    'sheriff': 2.0,
    'telegraph': 1.5,
    'rail-depot': 5.0,
    'barracks': 3.0,
  }
  return sizes[type]
}
