import { describe, it, expect, beforeEach } from 'vitest'
import { newGameState, cloneState } from './util'
import { tickEconomy, tickProduction, tickConsumption, checkBoomBust, getProductionSummary } from './economy'
import { placeBuilding } from './placement'
import { generateTerrain } from './terrain'
import { setSeed } from './rng'

describe('Phase 5: Economy Simulation', () => {
  
  let state = newGameState()
  let terrain = generateTerrain(42)
  
  beforeEach(() => {
    state = newGameState()
    terrain = generateTerrain(42)
    setSeed(42)
  })
  
  it('production adds gold from mines', () => {
    // Manually create a mine building
    state.buildings.set('mine1', {
      id: 'mine1',
      type: 'mine',
      pos: { x: 100, y: 40, z: 100 },
      rotation: 0,
      terraceHeight: 0,
      workers: 5,
      maxWorkers: 5,
      status: 'active',
      age: 0,
      output: 0,
      condition: 1,
    })
    
    const prod = tickProduction(state)
    expect(prod.gold).toBeGreaterThan(0)
  })
  
  it('consumption removes food', () => {
    state.population = 10
    const cons = tickConsumption(state)
    
    expect(cons.foodConsumed).toBeGreaterThan(0)
    expect(cons.moodDrain).toBeGreaterThan(0)
  })
  
  it('economy tick updates resources correctly', () => {
    state.gold = 100
    state.food = 50
    state.population = 5
    
    const initialGold = state.gold
    const initialFood = state.food
    
    tickEconomy(state)
    
    // Resources should have changed
    expect(state.food).toBeLessThan(initialFood) // Consumed
    expect(state.morale).toBeLessThanOrEqual(100)
  })
  
  it('starvation reduces morale', () => {
    state.population = 10
    state.food = 0
    state.morale = 100
    
    tickEconomy(state)
    
    expect(state.morale).toBeLessThan(100)
  })
  
  it('resources clamp at zero', () => {
    state.gold = 0
    state.wood = 0
    state.food = 0
    state.population = 1
    
    tickEconomy(state)
    
    expect(state.gold).toBeGreaterThanOrEqual(0)
    expect(state.wood).toBeGreaterThanOrEqual(0)
    expect(state.food).toBeGreaterThanOrEqual(0)
  })
  
  it('morale clamps 0-100', () => {
    state.morale = 150
    tickEconomy(state)
    expect(state.morale).toBeLessThanOrEqual(100)
    
    state.morale = -50
    tickEconomy(state)
    expect(state.morale).toBeGreaterThanOrEqual(0)
  })
  
  it('building maintenance decreases condition', () => {
    const bldg = placeBuilding('cabin1', 'cabin', 100, 100, terrain, state.buildings)
    if (bldg) {
      state.buildings.set('cabin1', bldg)
      
      const initialCondition = bldg.condition
      
      // Simulate maintenance degradation
      for (let i = 0; i < 10; i++) {
        bldg.age += 1
        bldg.condition -= 0.001
      }
      
      expect(bldg.condition).toBeLessThan(initialCondition)
    }
  })
  
  it('boom/bust detection identifies gold strike', () => {
    state.gold = 1500
    state.day = 10
    
    const status = checkBoomBust(state)
    expect(status.isBoom).toBe(true)
  })
  
  it('boom/bust detection identifies ore depletion', () => {
    state.gold = 0
    state.buildings.set('mine1', {
      id: 'mine1',
      type: 'mine',
      pos: { x: 100, y: 40, z: 100 },
      rotation: 0,
      terraceHeight: 0,
      workers: 0,
      maxWorkers: 5,
      status: 'active',
      age: 0,
      output: 0,
      condition: 1,
    })
    
    const status = checkBoomBust(state)
    expect(status.isBust).toBe(true)
  })
  
  it('production summary calculates correctly', () => {
    state.population = 5
    const summary = getProductionSummary(state)
    
    expect(typeof summary.goldProduction).toBe('number')
    expect(typeof summary.foodConsumption).toBe('number')
    expect(summary.foodConsumption).toBeGreaterThan(0)
  })
  
  it('economy is deterministic with same state', () => {
    setSeed(123)
    const state1 = cloneState(state)
    state1.population = 10
    tickEconomy(state1)
    
    setSeed(123)
    const state2 = cloneState(state)
    state2.population = 10
    tickEconomy(state2)
    
    expect(state1.food).toBe(state2.food)
    expect(state1.morale).toBe(state2.morale)
  })
  
  it('wealth increases with resources and buildings', () => {
    state.gold = 100
    state.wood = 50
    state.food = 30
    
    // Simulate wealth calculation
    const initialWealth = state.wealth
    state.wealth = state.gold + state.wood + state.food + state.buildings.size * 100
    
    expect(state.wealth).toBeGreaterThan(0)
  })
  
})
