/**
 * Terrain generation: heightmap, river carving, slope analysis.
 * Core rule A: A valley, not a grid. Water flows to lowest carved channel.
 */

import { initPerlin, fbm, noise2D } from './noise'
import { Vec3, TERRAIN } from './types'

export type Biome = 0 | 1 | 2 // 0 = red desert (west), 1 = sage steppe (mid), 2 = green river valley (east)

export interface TerrainMap {
  width: number
  height: number
  cellSize: number
  heightmap: Float32Array // [y][x]
  slopeMap: Float32Array // steepest adjacent slope per cell
  riverMask: Uint8Array // 1 if carving river, 0 else
  biomeMap: Uint8Array // Biome per cell (west->east gradient)
}

/**
 * Generate a Monument-Valley-to-green-valley hybrid on a west->east gradient.
 * - West third: flat red-dirt PLAIN punctuated by rare BOLD flat-topped buttes/mesas
 *   (steep vertical walls, level tops) — the iconic Western look.
 * - Middle third: sage steppe, gently undulating, very buildable (the town heartland).
 * - East third: a lower green river valley with a carved channel and fertile banks.
 * This replaces the old uniform-FBM "rolling hills everywhere" that read as generic.
 */
function generateHeightmap(
  width: number,
  height: number,
  seed: number,
  scale: number
): Float32Array {
  initPerlin(seed)
  const heightmap = new Float32Array(width * height)

  // Pick a handful of bold butte centres in the WEST third only.
  const rand = mulberry(seed ^ 0x9e3779b9)
  const nButtes = 5 + Math.floor(rand() * 3) // 5-7 hero landmarks
  const buttes: { cx: number; cz: number; r: number; h: number }[] = []
  for (let i = 0; i < nButtes; i++) {
    buttes.push({
      cx: rand() * width * 0.33,               // west third
      cz: 10 + rand() * (height - 20),
      r: 8 + rand() * 10,                       // footprint radius (cells)
      h: TERRAIN.maxElevation * (0.55 + rand() * 0.4), // tall, dramatic, but <= maxElevation
    })
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const u = x / (width - 1) // 0 (west) .. 1 (east)

      // Base plain: nearly flat, with faint large-scale undulation that grows eastward.
      const undulation = fbm(x / (scale * 1.5), y / (scale * 1.5), 2, 0.5, 2.0)
      let elevation = TERRAIN.maxElevation * (0.14 + undulation * 0.03 * (0.3 + u))

      // East valley: the ground dips into a river valley toward the east.
      const valley = Math.max(0, (u - 0.6) / 0.4)         // 0 until 60% east, ramps to 1
      elevation -= valley * TERRAIN.maxElevation * 0.10

      // Bold buttes in the west: flat-topped mesas with steep walls.
      for (const b of buttes) {
        const dx = x - b.cx, dz = y - b.cz
        const d = Math.sqrt(dx * dx + dz * dz)
        if (d < b.r) {
          // Flat top with a steep smoothstep wall near the rim.
          const t = d / b.r
          const wall = t < 0.75 ? 1 : 1 - smoothstep(0.75, 1.0, t)
          // Slight noisy top so it isn't a perfect cylinder.
          const topNoise = fbm(x / 6, y / 6, 2, 0.5, 2.0) * 0.04
          elevation = Math.max(elevation, b.h * (wall + topNoise * wall))
        }
      }

      heightmap[y * width + x] = Math.min(elevation, TERRAIN.maxElevation)
    }
  }

  return heightmap
}

function smoothstep(a: number, b: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

// Small local PRNG so butte placement is seeded/deterministic without touching global rng.
function mulberry(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * Classify each cell into a biome by its west->east position (with a little jitter
 * so the boundaries aren't ruler-straight).
 */
function computeBiomeMap(width: number, height: number, seed: number): Uint8Array {
  initPerlin(seed ^ 0x1234)
  const biome = new Uint8Array(width * height)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const jitter = noise2D(x / 30, y / 30) * 0.08
      const u = x / (width - 1) + jitter
      biome[y * width + x] = u < 0.38 ? 0 : u < 0.66 ? 1 : 2
    }
  }
  return biome
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

  // A single meandering channel down the EAST green valley (not a flood).
  // Walk south-to-north near the east side, meandering with noise; carve a
  // narrow trench into the heightmap so water sits below the banks.
  initPerlin(seed ^ 0x51ed)
  let cx = Math.floor(width * 0.82)
  for (let y = 0; y < height; y++) {
    cx += Math.round(noise2D(y / 22, seed * 0.01) * 2)
    cx = Math.max(Math.floor(width * 0.70), Math.min(width - 3, cx))
    const halfW = 1 // channel half-width in cells
    for (let dx = -halfW; dx <= halfW; dx++) {
      const nx = cx + dx
      if (nx < 0 || nx >= width) continue
      const idx = y * width + nx
      riverMask[idx] = 1
      heightmap[idx] = Math.min(heightmap[idx], TERRAIN.maxElevation * 0.04) // carve trench
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
  const biomeMap = computeBiomeMap(width, height, seed)
  
  return {
    width,
    height,
    cellSize,
    heightmap,
    slopeMap,
    riverMask,
    biomeMap,
  }
}

/** Sample biome at continuous world (x, z). */
export function sampleBiome(terrain: TerrainMap, x: number, z: number): Biome {
  const xi = Math.floor(x / terrain.cellSize)
  const zi = Math.floor(z / terrain.cellSize)
  if (xi < 0 || xi >= terrain.width || zi < 0 || zi >= terrain.height) return 1
  return terrain.biomeMap[zi * terrain.width + xi] as Biome
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
