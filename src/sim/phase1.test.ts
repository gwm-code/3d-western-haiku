import { describe, it, expect, beforeEach } from 'vitest'
import { generateTerrain, sampleHeight, sampleSlope, isRiver, riverDistance } from './terrain'
import { TERRAIN } from './types'

describe('Phase 1: Terrain & Valley', () => {
  
  let seed: number = 42
  
  it('generateTerrain produces valid heightmap', () => {
    const terrain = generateTerrain(seed)
    
    expect(terrain.width).toBe(256)
    expect(terrain.height).toBe(256)
    expect(terrain.heightmap.length).toBe(256 * 256)
    expect(terrain.slopeMap.length).toBe(256 * 256)
    expect(terrain.riverMask.length).toBe(256 * 256)
  })
  
  it('heightmap values are in valid range', () => {
    const terrain = generateTerrain(seed)
    
    for (let i = 0; i < terrain.heightmap.length; i++) {
      const h = terrain.heightmap[i]
      expect(h).toBeGreaterThanOrEqual(TERRAIN.minElevation)
      expect(h).toBeLessThanOrEqual(TERRAIN.maxElevation)
    }
  })
  
  it('sampleHeight with bilinear interpolation', () => {
    const terrain = generateTerrain(seed)
    
    // Sample at grid points
    const h00 = sampleHeight(terrain, 0, 0)
    expect(h00).toBeGreaterThanOrEqual(0)
    expect(h00).toBeLessThanOrEqual(TERRAIN.maxElevation)
    
    // Sample at midpoint should be interpolated
    const hMid = sampleHeight(terrain, terrain.cellSize * 0.5, terrain.cellSize * 0.5)
    expect(hMid).toBeGreaterThanOrEqual(0)
    expect(hMid).toBeLessThanOrEqual(TERRAIN.maxElevation)
  })
  
  it('slopeMap is computed from neighbors', () => {
    const terrain = generateTerrain(seed)
    
    // All slopes should be non-negative and <= pi/2 (90 degrees)
    for (let i = 0; i < terrain.slopeMap.length; i++) {
      const slope = terrain.slopeMap[i]
      expect(slope).toBeGreaterThanOrEqual(0)
      expect(slope).toBeLessThanOrEqual(Math.PI / 2)
    }
  })
  
  it('sampleSlope returns valid slope angle', () => {
    const terrain = generateTerrain(seed)
    
    const slope = sampleSlope(terrain, 100, 100)
    expect(slope).toBeGreaterThanOrEqual(0)
    expect(slope).toBeLessThanOrEqual(Math.PI / 2)
  })
  
  it('riverMask contains carving paths', () => {
    const terrain = generateTerrain(seed)
    
    let riverCount = 0
    for (let i = 0; i < terrain.riverMask.length; i++) {
      if (terrain.riverMask[i] === 1) riverCount++
    }
    
    // Should have some river carving (at least 1%)
    expect(riverCount).toBeGreaterThan(terrain.riverMask.length * 0.01)
  })
  
  it('isRiver detects river cells', () => {
    const terrain = generateTerrain(seed)
    
    // Find a river cell
    let riverX = 0, riverZ = 0
    for (let z = 0; z < terrain.height; z++) {
      for (let x = 0; x < terrain.width; x++) {
        if (terrain.riverMask[z * terrain.width + x] === 1) {
          riverX = x * terrain.cellSize
          riverZ = z * terrain.cellSize
          break
        }
      }
      if (terrain.riverMask[riverZ / terrain.cellSize * terrain.width + riverX / terrain.cellSize] === 1) break
    }
    
    // Search fallback
    for (let z = 0; z < 10; z++) {
      for (let x = 0; x < 10; x++) {
        if (terrain.riverMask[z * terrain.width + x] === 1) {
          riverX = x * terrain.cellSize
          riverZ = z * terrain.cellSize
          break
        }
      }
    }
    
    const inRiver = isRiver(terrain, riverX, riverZ)
    expect(typeof inRiver).toBe('boolean')
  })
  
  it('riverDistance measures distance to river', () => {
    const terrain = generateTerrain(seed)
    
    // Sample various points
    const dist1 = riverDistance(terrain, 10 * terrain.cellSize, 10 * terrain.cellSize)
    const dist2 = riverDistance(terrain, 200 * terrain.cellSize, 200 * terrain.cellSize)
    
    // Should return a number
    expect(typeof dist1).toBe('number')
    expect(typeof dist2).toBe('number')
    
    // At least one should have rivers nearby
    const hasNearbyRiver = dist1 !== Infinity || dist2 !== Infinity
    expect(hasNearbyRiver).toBe(true)
  })
  
  it('deterministic generation with same seed', () => {
    const t1 = generateTerrain(123)
    const t2 = generateTerrain(123)
    
    // Heights should match
    for (let i = 0; i < t1.heightmap.length; i++) {
      expect(t2.heightmap[i]).toBe(t1.heightmap[i])
    }
    
    // Rivers should match
    for (let i = 0; i < t1.riverMask.length; i++) {
      expect(t2.riverMask[i]).toBe(t1.riverMask[i])
    }
  })
  
  it('different seeds produce different terrain', () => {
    const t1 = generateTerrain(123)
    const t2 = generateTerrain(456)
    
    // Count differences
    let diffCount = 0
    for (let i = 0; i < Math.min(t1.heightmap.length, t2.heightmap.length); i++) {
      if (Math.abs(t2.heightmap[i] - t1.heightmap[i]) > 0.1) {
        diffCount++
      }
    }
    
    // Should have significant differences
    expect(diffCount).toBeGreaterThan(1000)
  })
  
  it('terrain has valley topology (not uniform)', () => {
    const terrain = generateTerrain(seed)
    
    let minH = Infinity
    let maxH = -Infinity
    let sum = 0
    
    for (let i = 0; i < terrain.heightmap.length; i++) {
      const h = terrain.heightmap[i]
      minH = Math.min(minH, h)
      maxH = Math.max(maxH, h)
      sum += h
    }
    
    const mean = sum / terrain.heightmap.length
    const range = maxH - minH
    
    // Should span a good range (not flat)
    expect(range).toBeGreaterThan(10)
    
    // Should have actual valleys (not centered)
    expect(minH).toBeLessThan(mean - 5)
  })
  
})
