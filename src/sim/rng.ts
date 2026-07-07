/**
 * Seeded PRNG for deterministic simulation.
 * Uses a 32-bit Lehmer multiplier (Fast & simple).
 * All sim randomness must go through this.
 */

let seed: number = 1

export function setSeed(s: number | bigint) {
  if (typeof s === 'bigint') {
    seed = Number(s & 0xFFFFFFFFn) || 1
  } else {
    seed = (s >>> 0) || 1
  }
}

function next32(): number {
  seed = (seed * 1103515245 + 12345) & 0xFFFFFFFF
  return seed
}

/**
 * Returns [0, 1) uniform random.
 */
export function rng(): number {
  return (next32() >>> 8) / 16777216.0 // Use top 24 bits
}

/**
 * Integer [min, max] inclusive.
 */
export function rngInt(min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1))
}

/**
 * Chance [0,1].
 */
export function rngBool(chance: number = 0.5): boolean {
  return rng() < chance
}

/**
 * Gaussian (Box-Muller).
 */
export function rngGauss(mean: number = 0, std: number = 1): number {
  const u1 = rng()
  const u2 = rng()
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
  return mean + z * std
}

/**
 * Weighted choice. `weights` can be any positive numbers; they'll be normalized.
 */
export function rngWeighted<T>(items: T[], weights: number[]): T {
  if (items.length !== weights.length) throw new Error('items/weights length mismatch')
  const sum = weights.reduce((a, b) => a + b, 0)
  let r = rng() * sum
  for (let i = 0; i < items.length; i++) {
    r -= weights[i]
    if (r <= 0) return items[i]
  }
  return items[items.length - 1]
}

/**
 * Shuffle array in-place (Fisher-Yates).
 */
export function rngShuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}
