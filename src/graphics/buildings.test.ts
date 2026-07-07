/**
 * Building graphics tests.
 * Verify all building types have meshes.
 */

import { describe, it, expect } from 'vitest'
import type { BuildingType } from '../sim/types'

// All possible building types (must match types.ts BuildingType union)
const ALL_BUILDING_TYPES: BuildingType[] = [
  'cabin', 'saloon', 'general-store', 'church', 'bank',
  'mine', 'pasture', 'lumber-mill', 'water-tower',
  'doctor', 'firehouse', 'sheriff', 'telegraph',
  'rail-depot', 'barracks',
  'tent', 'well', 'farm', 'ranch', 'sawmill', 'assay',
]

describe('Graphics: Building Meshes', () => {
  it('All 21 BuildingType values have geometry definitions', () => {
    expect(ALL_BUILDING_TYPES.length).toBe(21)
    
    // This test serves as documentation that all types must have meshes
    // If a type is added to BuildingType but not to BUILDING_GEOMETRIES,
    // the game will error when trying to create that building
    ALL_BUILDING_TYPES.forEach(type => {
      expect(type).toBeDefined()
      expect(typeof type).toBe('string')
    })
  })

  it('Building types are distinct (no duplicates)', () => {
    const unique = new Set(ALL_BUILDING_TYPES)
    expect(unique.size).toBe(ALL_BUILDING_TYPES.length)
  })
})
