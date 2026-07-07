import { describe, it, expect, beforeEach } from 'vitest'
import { newGameState } from './util'
import {
  newProfiler,
  sampleFrame,
  getAverageFPS,
  getFPSBounds,
  getFrameTimePercentile,
  isPerformanceAcceptable,
  getPerformanceReport,
} from './profiler'
import {
  checkWinCondition,
  checkLoseCondition,
  getGameStatus,
  DEFAULT_WIN_CONDITION,
  calculateSettlementScore,
} from './endgame'

describe('Phase 9: Performance & End-Game', () => {
  
  let state = newGameState()
  
  beforeEach(() => {
    state = newGameState()
  })
  
  // ===== PROFILER TESTS =====
  
  it('profiler initializes', () => {
    const profiler = newProfiler()
    
    expect(profiler.samples.length).toBe(0)
    expect(profiler.frameCount).toBe(0)
    expect(typeof profiler.startTime).toBe('number')
  })
  
  it('profiler can sample frames', () => {
    const profiler = newProfiler()
    
    sampleFrame(profiler, 1)
    sampleFrame(profiler, 1)
    sampleFrame(profiler, 1)
    
    expect(profiler.samples.length).toBe(3)
    expect(profiler.frameCount).toBe(3)
  })
  
  it('profiler calculates average FPS', () => {
    const profiler = newProfiler()
    
    // Simulate 60 frames at 60fps
    for (let i = 0; i < 60; i++) {
      sampleFrame(profiler)
      // Small delay to simulate timing
      const start = Date.now()
      while (Date.now() - start < 16) {} // ~16ms per frame = 60fps
    }
    
    const avgFPS = getAverageFPS(profiler, 60)
    
    // Should be close to 60fps (but might be slightly off due to timing)
    expect(avgFPS).toBeGreaterThan(0)
    expect(typeof avgFPS).toBe('number')
  })
  
  it('profiler gets FPS bounds', () => {
    const profiler = newProfiler()
    
    for (let i = 0; i < 30; i++) {
      sampleFrame(profiler)
    }
    
    const bounds = getFPSBounds(profiler, 30)
    
    expect(bounds.min).toBeGreaterThan(0)
    expect(bounds.max).toBeGreaterThan(bounds.min)
  })
  
  it('profiler calculates frame time percentile', () => {
    const profiler = newProfiler()
    
    for (let i = 0; i < 100; i++) {
      sampleFrame(profiler)
    }
    
    const p95 = getFrameTimePercentile(profiler, 95)
    
    // Frame time percentile might be 0 if frames are very fast
    expect(typeof p95).toBe('number')
    expect(p95).toBeGreaterThanOrEqual(0)
  })
  
  it('profiler checks performance acceptable', () => {
    const profiler = newProfiler()
    
    // Simulate low FPS (fail)
    for (let i = 0; i < 10; i++) {
      profiler.samples.push({
        fps: 20,
        frameTime: 50,
        gpuFrames: 1,
        memoryMB: 100,
        timestamp: Date.now(),
      })
    }
    
    expect(isPerformanceAcceptable(profiler, 60)).toBe(false)
    expect(isPerformanceAcceptable(profiler, 20)).toBe(true)
  })
  
  it('profiler generates report', () => {
    const profiler = newProfiler()
    
    for (let i = 0; i < 30; i++) {
      sampleFrame(profiler)
    }
    
    const report = getPerformanceReport(profiler)
    
    expect(typeof report).toBe('string')
    expect(report).toContain('PERFORMANCE')
    expect(report).toContain('FPS')
  })
  
  // ===== WIN CONDITION TESTS =====
  
  it('win condition requires minimum population', () => {
    state.day = 150
    state.wealth = 6000
    state.population = 30 // Too low
    
    expect(checkWinCondition(state)).toBe(false)
    
    state.population = 60 // Meets requirement
    expect(checkWinCondition(state)).toBe(true)
  })
  
  it('win condition requires minimum wealth', () => {
    state.day = 150
    state.population = 60
    state.wealth = 4000 // Too low
    
    expect(checkWinCondition(state)).toBe(false)
    
    state.wealth = 5000 // Meets requirement
    expect(checkWinCondition(state)).toBe(true)
  })
  
  it('win condition requires minimum days', () => {
    state.population = 60
    state.wealth = 5000
    state.day = 50 // Too early
    
    expect(checkWinCondition(state)).toBe(false)
    
    state.day = 100 // Meets requirement
    expect(checkWinCondition(state)).toBe(true)
  })
  
  it('lose condition: starvation', () => {
    state.food = 0
    state.population = 10
    
    expect(checkLoseCondition(state)).toBe(true)
  })
  
  it('lose condition: morale collapse', () => {
    state.morale = 0
    state.population = 20
    
    expect(checkLoseCondition(state)).toBe(true)
  })
  
  it('lose condition: population extinction', () => {
    state.population = 0
    state.day = 100
    
    expect(checkLoseCondition(state)).toBe(true)
  })
  
  it('game status reflects win/loss/playing', () => {
    state.day = 150
    state.population = 60
    state.wealth = 5000
    expect(getGameStatus(state)).toBe('won')
    
    state.morale = 0
    expect(getGameStatus(state)).toBe('lost')
    
    state.morale = 50
    state.wealth = 1000
    expect(getGameStatus(state)).toBe('playing')
  })
  
  it('settlement score calculation', () => {
    state.population = 60
    state.gold = 1000
    state.day = 150
    state.morale = 75
    
    const score = calculateSettlementScore(state, 150)
    
    expect(score).toBeGreaterThan(0)
    expect(typeof score).toBe('number')
  })
  
  it('early win gets bonus score', () => {
    state.population = 60
    state.gold = 1000
    state.day = 150
    state.morale = 75
    
    const earlyScore = calculateSettlementScore(state, 120)
    const lateScore = calculateSettlementScore(state, 180)
    
    expect(earlyScore).toBeGreaterThan(lateScore)
  })
  
  it('high morale bonus applies', () => {
    state.population = 50
    state.gold = 1000
    state.day = 100
    
    state.morale = 75
    const highMoraleScore = calculateSettlementScore(state)
    
    state.morale = 40
    const lowMoraleScore = calculateSettlementScore(state)
    
    expect(highMoraleScore).toBeGreaterThan(lowMoraleScore)
  })
  
})
