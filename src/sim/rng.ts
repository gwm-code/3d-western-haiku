/** Seeded mulberry32. ALL gameplay randomness goes through this. */
let state = 12345
export function setSeed(s: number): void { state = s >>> 0 }
export function rng(): number {
  state |= 0; state = (state + 0x6d2b79f5) | 0
  let t = Math.imul(state ^ (state >>> 15), 1 | state)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
export function rngInt(a: number, b: number): number { return a + Math.floor(rng() * (b - a + 1)) }
export function pick<T>(arr: readonly T[]): T { return arr[Math.floor(rng() * arr.length)] }
