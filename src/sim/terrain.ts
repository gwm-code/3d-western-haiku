/**
 * Terrain generation: heightmap, river carving, slope analysis.
 * Core rule A: A valley, not a grid. Water flows to lowest carved channel.
 */

import { initPerlin, fbm, noise2D } from './noise'
import { Vec3, TERRAIN } from './types'

export interface TerrainMap {
  width: number
  height: number
  cellSize: number
  heightmap: Float32Array // [y][x]
  slopeMap: Float32Array // steepest adjacent slope per cell
  riverMask: Uint8Array // 1 if carving river, 0 else
}

/**
 * Generate heightmap using FBM with multiple octaves.
 * Creates rolling mesas, not flat desert.
 */
function generateHeightmap(
  width: number,
  height: number,
  seed: number,
  scale: number
): Float32Array {
  initPerlin(seed)
  
  const heightmap = new Float32Array(width * height)
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // Mesa/valley topology: 2 octaves for broad shapes
      const mesa = fbm(x / scale, y / scale, 2, 0.6, 2.0)
      
      // Detail variation: 3 octaves for texture
      const detail = fbm(x / (scale * 0.3), y / (scale * 0.3), 3, 0.5, 2.0)
      
      // Combine: mesa is foundation, detail adds character
      const raw = mesa * 0.7 + detail * 0.3
      
      // Remap to [0, 80] elevation
      const normalized = (raw + 1) * 0.5 // [0, 1] from [-1, 1]
      const elevation = normalized * TERRAIN.maxElevation
      
      heightmap[y * width + x] = elevation
    }
  }
  
  return heightmap
}

/**
 * Compute slope (steepest adjacent neighbor) per cell.
 * Used for placement validation and terrace detection.
 */
function computeSlopeMap(heightmap: Float32Array, width: number, height: number, cellSize: number): Float32Array {
  const slopeMap = new Float32Array(width * height)
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x
      const h = heightmap[idx]
      let slopeSum = 0
      let slopeCount = 0
      
      // Average slope over neighbors. Using max() made a single noisy neighbor
      // spike the slope of nearly every cell, so placement rejected the whole map
      // as "too steep". Average reflects actual buildable ground. Reviewer fix.
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue
          
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue
          
          const nh = heightmap[ny * width + nx]
          const dh = Math.abs(h - nh)
          const dist = Math.sqrt(dx * dx + dy * dy) * cellSize
          const slope = Math.atan(dh / dist)
          
          slopeSum += slope
          slopeCount++
        }
      }
      
      slopeMap[idx] = slopeCount > 0 ? slopeSum / slopeCount : 0
    }
  }
  
  return slopeMap
}

/**
 * Seeded pseudo-random for river carving determinism.
 */
function seededRandom(seed: number, index: number): number {
  const x = Math.sin(seed * 12.9898 + index * 78.233) * 43758.5453
  return x - Math.floor(x)
}

/**
 * Simple flow-field river carving.
 * Find local minima, flow downhill, accumulate water.
 */
function carveRiver(
  heightmap: Float32Array,
  width: number,
  height: number,
  cellSize: number,
  seed: number
): Uint8Array {
  const riverMask = new Uint8Array(width * height)
  
  // Find lowest point (valley seed)
  let minH = Infinity
  let minIdx = 0
  for (let i = 0; i < heightmap.length; i++) {
    if (heightmap[i] < minH) {
      minH = heightmap[i]
      minIdx = i
    }
  }
  
  // Flow downhill from deterministic points toward minimum
  const numFlows = Math.floor(width * height * 0.05) // 5% of cells start flows
  for (let i = 0; i < numFlows; i++) {
    const startIdx = Math.floor(seededRandom(seed, i) * heightmap.length)
    let idx = startIdx
    let steps = 0
    
    while (idx !== minIdx && steps < width + height) {
      const x = idx % width
      const y = Math.floor(idx / width)
      riverMask[idx] = 1
      
      // Find lowest neighbor
      let lowestH = heightmap[idx]
      let lowestIdx = idx
      
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue
          
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue
          
          const nidx = ny * width + nx
          if (heightmap[nidx] < lowestH) {
            lowestH = heightmap[nidx]
            lowestIdx = nidx
          }
        }
      }
      
      if (lowestIdx === idx) break // Stuck at local minimum
      idx = lowestIdx
      steps++
    }
  }
  
  return riverMask
}

/**
 * Generate complete terrain map.
 */
export function generateTerrain(seed: number, width: number = 256, height: number = 256, cellSize: number = 2.0): TerrainMap {
  const heightmap = generateHeightmap(width, height, seed, 40)
  const slopeMap = computeSlopeMap(heightmap, width, height, cellSize)
  const riverMask = carveRiver(heightmap, width, height, cellSize, seed)
  
  return {
    width,
    height,
    cellSize,
    heightmap,
    slopeMap,
    riverMask,
  }
}

/**
 * Sample height at continuous (x, z) position.
 * Bilinear interpolation.
 */
export function sampleHeight(terrain: TerrainMap, x: number, z: number): number {
  const xi = x / terrain.cellSize
  const zi = z / terrain.cellSize
  
  const x0 = Math.floor(xi)
  const z0 = Math.floor(zi)
  const x1 = Math.min(x0 + 1, terrain.width - 1)
  const z1 = Math.min(z0 + 1, terrain.height - 1)
  
  const fx = xi - x0
  const fz = zi - z0
  
  const h00 = terrain.heightmap[z0 * terrain.width + x0]
  const h10 = terrain.heightmap[z0 * terrain.width + x1]
  const h01 = terrain.heightmap[z1 * terrain.width + x0]
  const h11 = terrain.heightmap[z1 * terrain.width + x1]
  
  const h0 = h00 * (1 - fx) + h10 * fx
  const h1 = h01 * (1 - fx) + h11 * fx
  
  return h0 * (1 - fz) + h1 * fz
}

/**
 * Sample slope at continuous position.
 * (Simplified: use nearest cell.)
 */
export function sampleSlope(terrain: TerrainMap, x: number, z: number): number {
  const xi = Math.floor(x / terrain.cellSize)
  const zi = Math.floor(z / terrain.cellSize)
  
  if (xi < 0 || xi >= terrain.width || zi < 0 || zi >= terrain.height) {
    return 0
  }
  
  return terrain.slopeMap[zi * terrain.width + xi]
}

/**
 * Check if position is in river.
 */
export function isRiver(terrain: TerrainMap, x: number, z: number): boolean {
  const xi = Math.floor(x / terrain.cellSize)
  const zi = Math.floor(z / terrain.cellSize)
  
  if (xi < 0 || xi >= terrain.width || zi < 0 || zi >= terrain.height) {
    return false
  }
  
  return terrain.riverMask[zi * terrain.width + xi] === 1
}

/**
 * Get distance to nearest river.
 */
export function riverDistance(terrain: TerrainMap, x: number, z: number): number {
  if (isRiver(terrain, x, z)) return 0
  
  let minDist = Infinity
  const checkRadius = Math.ceil(TERRAIN.minRiverDist / terrain.cellSize)
  
  const xi = Math.floor(x / terrain.cellSize)
  const zi = Math.floor(z / terrain.cellSize)
  
  for (let dy = -checkRadius; dy <= checkRadius; dy++) {
    for (let dx = -checkRadius; dx <= checkRadius; dx++) {
      const nx = xi + dx
      const nz = zi + dy
      
      if (nx >= 0 && nx < terrain.width && nz >= 0 && nz < terrain.height) {
        if (terrain.riverMask[nz * terrain.width + nx] === 1) {
          const dist = Math.sqrt(dx * dx + dy * dy) * terrain.cellSize
          minDist = Math.min(minDist, dist)
        }
      }
    }
  }
  
  return minDist
}
