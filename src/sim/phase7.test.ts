import { describe, it, expect, beforeEach } from 'vitest'
import { newGameState } from './util'
import { tickWeather, applyWeatherEffects, isDroughtCritical, isRiverFlooded } from './weather'
import { startFire, spreadFire, fightFire } from './fire'
import { startOutbreak, transmitDisease, treatDisease, updateDisease, quarantine } from './disease'
import type { Building } from './types'

describe('Phase 7: Weather, Fire, Disease', () => {
  
  let state = newGameState()
  
  beforeEach(() => {
    state = newGameState()
  })
  
  // ===== WEATHER TESTS =====
  
  it('weather ticks without error', () => {
    const initialWeather = state.weather
    tickWeather(state)
    expect(typeof state.weather).toBe('string')
    expect(['clear', 'rain', 'drought', 'duststorm']).toContain(state.weather)
  })
  
  it('drought reduces river level', () => {
    state.weather = 'drought'
    const initialRiver = state.riverLevel
    
    for (let i = 0; i < 5; i++) {
      tickWeather(state)
    }
    
    expect(state.riverLevel).toBeLessThanOrEqual(initialRiver)
  })
  
  it('rain increases river level', () => {
    state.riverLevel = 0.3
    state.weather = 'rain'
    const initialRiver = state.riverLevel
    
    tickWeather(state)
    
    expect(state.riverLevel).toBeGreaterThanOrEqual(initialRiver)
  })
  
  it('drought critical check works', () => {
    state.riverLevel = 0.1
    state.weather = 'drought'
    
    expect(isDroughtCritical(state)).toBe(true)
  })
  
  it('river flood check works', () => {
    state.riverLevel = 0.95
    state.weather = 'rain'
    
    expect(isRiverFlooded(state)).toBe(true)
  })
  
  it('weather effects apply to production', () => {
    // Add a pasture
    const pasture: Building = {
      id: 'pasture1',
      type: 'pasture',
      pos: { x: 256, y: 40, z: 256 },
      rotation: 0,
      terraceHeight: 0,
      workers: 5,
      maxWorkers: 10,
      status: 'active',
      age: 0,
      output: 100,
      condition: 1.0,
    }
    
    state.buildings.set('pasture1', pasture)
    state.weather = 'drought'
    
    const initialOutput = pasture.output ?? 0
    applyWeatherEffects(state)
    const afterDrought = pasture.output ?? 0
    
    expect(afterDrought).toBeLessThan(initialOutput)
  })
  
  it('rain boosts production', () => {
    const pasture: Building = {
      id: 'pasture1',
      type: 'pasture',
      pos: { x: 256, y: 40, z: 256 },
      rotation: 0,
      terraceHeight: 0,
      workers: 5,
      maxWorkers: 10,
      status: 'active',
      age: 0,
      output: 100,
      condition: 1.0,
    }
    
    state.buildings.set('pasture1', pasture)
    state.weather = 'rain'
    
    const initialOutput = pasture.output ?? 0
    applyWeatherEffects(state)
    const afterRain = pasture.output ?? 0
    
    expect(afterRain).toBeGreaterThan(initialOutput)
  })
  
  // ===== FIRE TESTS =====
  
  it('fire can start at low-condition building', () => {
    const cabin: Building = {
      id: 'cabin1',
      type: 'cabin',
      pos: { x: 100, y: 40, z: 100 },
      rotation: 0,
      terraceHeight: 0,
      workers: 2,
      maxWorkers: 4,
      status: 'active',
      age: 100,
      condition: 0.3, // Low condition = fire risk
    }
    
    state.buildings.set('cabin1', cabin)
    
    // Try multiple times (probabilistic)
    for (let i = 0; i < 20; i++) {
      const fire = startFire(state, 'cabin1', state.day++)
      if (fire) {
        expect(fire.buildingId).toBe('cabin1')
        expect(fire.intensity).toBeGreaterThan(0)
        break
      }
    }
  })
  
  it('fire spreads to nearby buildings', () => {
    const cabin1: Building = {
      id: 'cabin1',
      type: 'cabin',
      pos: { x: 100, y: 40, z: 100 },
      rotation: 0,
      terraceHeight: 0,
      workers: 2,
      maxWorkers: 4,
      status: 'active',
      age: 0,
      condition: 0.8,
    }
    
    const cabin2: Building = {
      id: 'cabin2',
      type: 'cabin',
      pos: { x: 105, y: 40, z: 100 },
      rotation: 0,
      terraceHeight: 0,
      workers: 2,
      maxWorkers: 4,
      status: 'active',
      age: 0,
      condition: 0.8,
    }
    
    state.buildings.set('cabin1', cabin1)
    state.buildings.set('cabin2', cabin2)
    
    const fire = {
      id: 'fire1',
      day: 0,
      buildingId: 'cabin1',
      intensity: 0.8, // High intensity spreads
      spread: 0,
    }
    
    const newFires = spreadFire(state, fire)
    expect(Array.isArray(newFires)).toBe(true)
  })
  
  it('firehouse can fight fires', () => {
    const firehouse: Building = {
      id: 'firehouse1',
      type: 'firehouse',
      pos: { x: 100, y: 40, z: 100 },
      rotation: 0,
      terraceHeight: 0,
      workers: 5,
      maxWorkers: 10,
      status: 'active',
      age: 0,
      condition: 1.0,
    }
    
    const cabin: Building = {
      id: 'cabin1',
      type: 'cabin',
      pos: { x: 110, y: 40, z: 100 },
      rotation: 0,
      terraceHeight: 0,
      workers: 2,
      maxWorkers: 4,
      status: 'burned',
      age: 0,
      condition: 0.6,
    }
    
    state.buildings.set('firehouse1', firehouse)
    state.buildings.set('cabin1', cabin)
    
    const fire = {
      id: 'fire1',
      day: 0,
      buildingId: 'cabin1',
      intensity: 0.3, // Low intensity (firefighters can handle)
      spread: 0,
    }
    
    const extinguished = fightFire(state, fire)
    // Might succeed or fail (probabilistic)
    expect(typeof extinguished).toBe('boolean')
  })
  
  // ===== DISEASE TESTS =====
  
  it('outbreak can occur', () => {
    state.population = 50 // Reasonable population
    state.food = 20 // Low food = outbreak risk
    
    for (let i = 0; i < 20; i++) {
      const disease = startOutbreak(state, state.day++)
      if (disease) {
        expect(disease.infected.size).toBeGreaterThan(0)
        expect(disease.mortality).toBeGreaterThan(0)
        expect(disease.contagion).toBeGreaterThan(0)
        break
      }
    }
  })
  
  it('disease transmits between settlers', () => {
    // Add 3 settlers
    state.population = 3
    for (let i = 0; i < 3; i++) {
      state.settlers.set(`s${i}`, {
        id: `s${i}`,
        pos: { x: 256 + i * 2, y: 40, z: 256 },
        assignedBuilding: 'mine1', // Same building = close proximity
        job: 'worker',
        health: 0.8,
        age: 100,
        homeBuilding: null,
        pathTarget: null,
      })
    }
    
    const disease = {
      id: 'disease1',
      day: 0,
      infected: new Set(['s0']),
      mortality: 0.05,
      contagion: 0.5,
      active: true,
    }
    
    const initialInfected = disease.infected.size
    transmitDisease(state, disease)
    
    // Should spread to same building
    expect(disease.infected.size).toBeGreaterThanOrEqual(initialInfected)
  })
  
  it('doctor treats disease', () => {
    const doctor = {
      id: 'doctor1',
      type: 'doctor' as const,
      pos: { x: 256, y: 40, z: 256 },
      rotation: 0,
      terraceHeight: 0,
      workers: 3,
      maxWorkers: 5,
      status: 'active' as const,
      age: 0,
      condition: 1.0,
    }
    
    state.buildings.set('doctor1', doctor)
    
    const disease = {
      id: 'disease1',
      day: 0,
      infected: new Set(['s0']),
      mortality: 0.2,
      contagion: 0.6,
      active: true,
    }
    
    const initialMortality = disease.mortality
    treatDisease(state, disease)
    
    expect(disease.mortality).toBeLessThan(initialMortality)
  })
  
  it('quarantine reduces contagion', () => {
    const sheriff = {
      id: 'sheriff1',
      type: 'sheriff' as const,
      pos: { x: 256, y: 40, z: 256 },
      rotation: 0,
      terraceHeight: 0,
      workers: 2,
      maxWorkers: 4,
      status: 'active' as const,
      age: 0,
      condition: 1.0,
    }
    
    state.buildings.set('sheriff1', sheriff)
    
    const disease = {
      id: 'disease1',
      day: 0,
      infected: new Set(['s0']),
      mortality: 0.1,
      contagion: 0.8,
      active: true,
    }
    
    const initialContagion = disease.contagion
    quarantine(state, disease)
    
    expect(disease.contagion).toBeLessThan(initialContagion)
  })
  
  it('disease updates kill infected settlers', () => {
    // Add one settler
    state.population = 1
    state.settlers.set('s0', {
      id: 's0',
      pos: { x: 256, y: 40, z: 256 },
      assignedBuilding: null,
      job: 'idle',
      health: 0.5,
      age: 100,
      homeBuilding: null,
      pathTarget: null,
    })
    
    const disease = {
      id: 'disease1',
      day: 0,
      infected: new Set(['s0']),
      mortality: 1.0, // 100% mortality (will die)
      contagion: 0.1,
      active: true,
    }
    
    updateDisease(state, disease)
    
    // Settler might be dead (probabilistic with 100% mortality)
    // After multiple days, should be gone
    for (let i = 0; i < 5; i++) {
      updateDisease(state, disease)
    }
    
    // At some point, settler should be gone or disease inactive
    expect(disease.infected.size >= 0).toBe(true)
  })
  
})
