/**
 * 2D Perlin noise for terrain generation.
 * Deterministic, uses game RNG for seed consistency.
 */

import { rng, rngInt, setSeed as setRngSeed } from './rng'

interface PerlinState {
  permutation: number[]
}

let perlinState: PerlinState | null = null

/**
 * Initialize Perlin noise with a seed (separate from game RNG).
 * Must call before noise2D().
 */
export function initPerlin(seed: number) {
  // Create permutation table from seed
  setRngSeed(seed)
  const p: number[] = Array.from({ length: 256 }, (_, i) => i)
  
  // Fisher-Yates shuffle with seeded RNG
  for (let i = 255; i > 0; i--) {
    const j = rngInt(0, i)
    ;[p[i], p[j]] = [p[j], p[i]]
  }
  
  // Duplicate for wrapping
  perlinState = {
    permutation: [...p, ...p],
  }
}

/**
 * Fade function for Perlin (smooth curve).
 */
function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10)
}

/**
 * Linear interpolation.
 */
function lerp(t: number, a: number, b: number): number {
  return a + t * (b - a)
}

/**
 * Gradient dot product.
 */
function grad(hash: number, x: number, y: number): number {
  const h = hash & 15
  const u = h < 8 ? x : y
  const v = h < 8 ? y : x
  return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v)
}

/**
 * 2D Perlin noise [-1, 1].
 */
export function noise2D(x: number, y: number): number {
  if (!perlinState) throw new Error('Call initPerlin() first')
  
  const p = perlinState.permutation
  const xi = Math.floor(x) & 255
  const yi = Math.floor(y) & 255
  const xf = x - Math.floor(x)
  const yf = y - Math.floor(y)
  
  const u = fade(xf)
  const v = fade(yf)
  
  const aa = p[p[xi] + yi]
  const ba = p[p[xi + 1] + yi]
  const ab = p[p[xi] + yi + 1]
  const bb = p[p[xi + 1] + yi + 1]
  
  const g1 = grad(aa, xf, yf)
  const g2 = grad(ba, xf - 1, yf)
  const g3 = grad(ab, xf, yf - 1)
  const g4 = grad(bb, xf - 1, yf - 1)
  
  const i1 = lerp(u, g1, g2)
  const i2 = lerp(u, g3, g4)
  
  return lerp(v, i1, i2)
}

/**
 * Fractional Brownian motion (multiple octaves).
 */
export function fbm(x: number, y: number, octaves: number, persistence: number, lacunarity: number): number {
  let value = 0
  let amplitude = 1
  let freq = 1
  let maxValue = 0
  
  for (let i = 0; i < octaves; i++) {
    value += amplitude * noise2D(x * freq, y * freq)
    maxValue += amplitude
    amplitude *= persistence
    freq *= lacunarity
  }
  
  return value / maxValue
}
