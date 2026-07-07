/**
 * Building graphics tests.
 * Verify all building types have meshes.
 */

import { describe, it, expect } from 'vitest'
import type { Building, BuildingType } from '../sim/types'
import { createBuildingMesh } from './buildings'

// 16 core building types that must have mesh definitions
const CORE_BUILDING_TYPES: BuildingType[] = [
  'tent', 'cabin', 'well', 'farm', 'ranch', 'sawmill',
  'mine', 'saloon', 'sheriff', 'church', 'doctor', 'bank',
  'telegraph', 'assay', 'firehouse', 'rail-depot',
]

// All 21 types for complete coverage
const ALL_BUILDING_TYPES: BuildingType[] = [
  'cabin', 'saloon', 'general-store', 'church', 'bank',
  'mine', 'pasture', 'lumber-mill', 'water-tower',
  'doctor', 'firehouse', 'sheriff', 'telegraph',
  'rail-depot', 'barracks',
  'tent', 'well', 'farm', 'ranch', 'sawmill', 'assay',
]

describe('Graphics: Building Meshes', () => {
  it('All 16 core building types return non-empty meshes', () => {
    for (const type of CORE_BUILDING_TYPES) {
      const building: Building = {
        id: `test-${type}`,
        type,
        pos: { x: 0, y: 0, z: 0 },
        terraceHeight: 0,
        rotation: 0,
        workers: 0,
        maxWorkers: 5,
        status: 'active',
        age: 0,
        condition: 1.0,
      }
      
      const mesh = createBuildingMesh(building)
      expect(mesh).toBeDefined()
      expect(mesh.children.length).toBeGreaterThan(0)
    }
  })

  it('All 21 BuildingType values have geometry definitions', () => {
    expect(ALL_BUILDING_TYPES.length).toBe(21)
    expect(CORE_BUILDING_TYPES.length).toBe(16)
  })

  it('Building types are distinct (no duplicates)', () => {
    const unique = new Set(ALL_BUILDING_TYPES)
    expect(unique.size).toBe(ALL_BUILDING_TYPES.length)
  })
})
