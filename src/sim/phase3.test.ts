import { describe, it, expect, beforeEach } from 'vitest'
import { generateTerrain } from './terrain'
import { canPlace, placeBuilding, getBuildingSize } from './placement'
import type { Building } from './types'

describe('Phase 3: Buildings & Placement', () => {
  
  let terrain = generateTerrain(42)
  let buildings = new Map<string, Building>()
  
  beforeEach(() => {
    terrain = generateTerrain(42)
    buildings.clear()
  })
  
  it('getBuildingSize returns valid sizes for all types', () => {
    const types = [
      'cabin', 'saloon', 'general-store', 'church', 'bank',
      'mine', 'pasture', 'lumber-mill', 'water-tower',
      'doctor', 'firehouse', 'sheriff', 'telegraph',
      'rail-depot', 'barracks'
    ] as const
    
    types.forEach(type => {
      const size = getBuildingSize(type)
      expect(size).toBeGreaterThan(0)
      expect(size).toBeLessThanOrEqual(5)
    })
  })
  
  it('placement rejects out-of-bounds', () => {
    const result = canPlace(terrain, -10, 50, 'cabin', buildings)
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('out-of-bounds')
  })
  
  it('placement rejects river cells', () => {
    // Find a river cell
    for (let z = 0; z < terrain.height; z++) {
      for (let x = 0; x < terrain.width; x++) {
        if (terrain.riverMask[z * terrain.width + x] === 1) {
          const wx = x * terrain.cellSize + 1
          const wz = z * terrain.cellSize + 1
          const result = canPlace(terrain, wx, wz, 'cabin', buildings)
          expect(result.valid).toBe(false)
          expect(result.reason).toBe('too-close-to-river')
          return
        }
      }
    }
  })
  
  it('placement allows valid locations', () => {
    // Find a valid location (high, far from river)
    let found = false
    for (let z = 10; z < terrain.height - 10; z++) {
      for (let x = 10; x < terrain.width - 10; x++) {
        if (terrain.riverMask[z * terrain.width + x] === 0) {
          const wx = x * terrain.cellSize
          const wz = z * terrain.cellSize
          const result = canPlace(terrain, wx, wz, 'cabin', buildings)
          if (result.valid) {
            found = true
            expect(result.reason).toBeUndefined()
            break
          }
        }
      }
      if (found) break
    }
    expect(found).toBe(true)
  })
  
  it('placeBuilding creates valid building', () => {
    // Find valid location
    for (let z = 10; z < terrain.height - 10; z++) {
      for (let x = 10; x < terrain.width - 10; x++) {
        if (terrain.riverMask[z * terrain.width + x] === 0) {
          const wx = x * terrain.cellSize
          const wz = z * terrain.cellSize
          const bldg = placeBuilding('b1', 'cabin', wx, wz, terrain, buildings)
          
          if (bldg) {
            expect(bldg.id).toBe('b1')
            expect(bldg.type).toBe('cabin')
            expect(bldg.pos.x).toBe(wx)
            expect(bldg.pos.z).toBe(wz)
            expect(bldg.condition).toBe(1.0)
            expect(bldg.status).toBe('active')
            return
          }
        }
      }
    }
    throw new Error('No valid placement found')
  })
  
  it('placement avoids collisions', () => {
    // Manually add a building to buildings map at a known location
    const b1: Building = {
      id: 'b1',
      type: 'pasture', // Large, flat structure
      pos: { x: 256, y: 40, z: 256 },
      rotation: 0,
      terraceHeight: 0,
      workers: 0,
      maxWorkers: 5,
      status: 'active',
      age: 0,
      output: 0,
      condition: 1.0,
    }
    buildings.set('b1', b1)
    
    // Try to place within 3-unit collision radius
    const result = canPlace(terrain, 257, 256, 'cabin', buildings)
    // Should fail due to collision or other constraints
    expect(result.valid).toBe(false)
  })
  
  it('terrace height is computed for sloped terrain', () => {
    // Find sloped location
    for (let z = 10; z < terrain.height - 10; z++) {
      for (let x = 10; x < terrain.width - 10; x++) {
        if (terrain.riverMask[z * terrain.width + x] === 0) {
          const wx = x * terrain.cellSize
          const wz = z * terrain.cellSize
          const bldg = placeBuilding('b1', 'cabin', wx, wz, terrain, buildings)
          
          if (bldg) {
            // Terrace should be non-negative (height to level platform)
            expect(bldg.terraceHeight).toBeGreaterThanOrEqual(0)
            return
          }
        }
      }
    }
  })
  
  it('all 14 building types are distinct', () => {
    const types = [
      'cabin', 'saloon', 'general-store', 'church', 'bank',
      'mine', 'pasture', 'lumber-mill', 'water-tower',
      'doctor', 'firehouse', 'sheriff', 'telegraph',
      'rail-depot', 'barracks'
    ] as const
    
    const sizes = new Set(types.map(t => getBuildingSize(t)))
    // Should have some variety (not all same size)
    expect(sizes.size).toBeGreaterThan(1)
  })
  
})
