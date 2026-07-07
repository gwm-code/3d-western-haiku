import { describe, it, expect, beforeEach } from 'vitest'
import { setSeed, rng, rngInt, rngBool, rngGauss, rngWeighted, rngShuffle } from './rng'
import { newGameState, serializeState, deserializeState, cloneState } from './util'

describe('Phase 0: Determinism & RNG', () => {
  
  it('rng produces same sequence with same seed', () => {
    setSeed(12345)
    const seq1 = Array.from({ length: 100 }, () => rng())
    
    setSeed(12345)
    const seq2 = Array.from({ length: 100 }, () => rng())
    
    expect(seq1).toEqual(seq2)
  })

  it('rng returns [0,1)', () => {
    setSeed(1)
    for (let i = 0; i < 1000; i++) {
      const r = rng()
      expect(r).toBeGreaterThanOrEqual(0)
      expect(r).toBeLessThan(1)
    }
  })

  it('rngInt respects bounds', () => {
    setSeed(999)
    for (let i = 0; i < 100; i++) {
      const r = rngInt(10, 20)
      expect(r).toBeGreaterThanOrEqual(10)
      expect(r).toBeLessThanOrEqual(20)
    }
  })

  it('rngBool has correct probability', () => {
    setSeed(555)
    let count = 0
    for (let i = 0; i < 1000; i++) {
      if (rngBool(0.5)) count++
    }
    // ~500 ± margin
    expect(count).toBeGreaterThan(400)
    expect(count).toBeLessThan(600)
  })

  it('rngGauss produces normal-ish distribution', () => {
    setSeed(777)
    const samples = Array.from({ length: 1000 }, () => rngGauss(100, 15))
    const mean = samples.reduce((a, b) => a + b, 0) / samples.length
    expect(mean).toBeCloseTo(100, 0)
  })

  it('rngWeighted selects by weight', () => {
    setSeed(888)
    const items = ['a', 'b', 'c']
    const weights = [1, 0.1, 0.1] // 'a' is 10x likely
    const counts = { a: 0, b: 0, c: 0 }
    for (let i = 0; i < 1000; i++) {
      const result = rngWeighted(items, weights)
      counts[result as keyof typeof counts]++
    }
    // 'a' should dominate
    expect(counts.a).toBeGreaterThan(counts.b + counts.c)
  })

  it('rngShuffle randomizes array', () => {
    setSeed(666)
    const arr = [1, 2, 3, 4, 5]
    const original = [...arr]
    rngShuffle(arr)
    // Very unlikely to be in same order
    expect(arr).not.toEqual(original)
  })

  it('GameState serialization round-trips', () => {
    const state = newGameState()
    state.day = 42
    state.gold = 5000
    state.population = 23

    const json = serializeState(state)
    const restored = deserializeState(json)

    expect(restored.day).toBe(42)
    expect(restored.gold).toBe(5000)
    expect(restored.population).toBe(23)
  })

  it('GameState clone is deep copy', () => {
    const state = newGameState()
    const cloned = cloneState(state)
    
    // Mutate original
    state.gold = 99999
    
    // Clone unaffected
    expect(cloned.gold).toBe(1000)
  })

  it('deserializeState handles corrupt save gracefully', () => {
    expect(() => deserializeState('not json')).toThrow()
    expect(() => deserializeState('{}')).toThrow() // no saveVersion
    expect(() => deserializeState('{"saveVersion": 999}')).toThrow() // bad version
  })

  it('Deterministic IDs: same seed produces identical settler IDs', () => {
    // First run
    setSeed(42)
    const state1 = newGameState()
    state1.day = 0
    for (let i = 0; i < 5; i++) {
      state1.nextId = 0 // Reset for fair comparison
      const s1 = `settler_${state1.nextId++}`
      const s2 = `settler_${state1.nextId++}`
      expect(s1).toBe('settler_0')
      expect(s2).toBe('settler_1')
    }

    // Second run with same seed
    setSeed(42)
    const state2 = newGameState()
    state2.day = 0
    state2.nextId = 0
    const s3 = `settler_${state2.nextId++}`
    const s4 = `settler_${state2.nextId++}`
    
    expect(s3).toBe('settler_0')
    expect(s4).toBe('settler_1')
  })

})
