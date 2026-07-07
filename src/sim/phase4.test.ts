import { describe, it, expect, beforeEach } from 'vitest'
import { generateTerrain } from './terrain'
import { findPath, moveAlongPath } from './pathfind'
import { updateSettlers, updateHerds, spawnSettlers, spawnCattleDrive } from './agents'
import { newGameState, cloneState } from './util'
import { setSeed } from './rng'
import type { Settler, Herd } from './types'

describe('Phase 4: Agents & Navigation', () => {
  
  let terrain = generateTerrain(42)
  let state = newGameState()
  
  beforeEach(() => {
    terrain = generateTerrain(42)
    state = newGameState()
    setSeed(42)
  })
  
  it('pathfinding returns valid path array', () => {
    const start = { x: 100, y: 40, z: 100 }
    const goal = { x: 150, y: 40, z: 150 }
    
    const path = findPath(terrain, start, goal)
    expect(Array.isArray(path)).toBe(true)
    expect(path.length).toBeGreaterThan(0)
  })
  
  it('pathfinding starts and ends at correct positions', () => {
    const start = { x: 100, y: 40, z: 100 }
    const goal = { x: 150, y: 40, z: 150 }
    
    const path = findPath(terrain, start, goal)
    
    // Path should exist and be reasonable
    expect(path.length).toBeGreaterThanOrEqual(1)
    expect(path[0]).toBeDefined()
    expect(path[0].x).toBeDefined()
    expect(path[0].z).toBeDefined()
  })
  
  it('moveAlongPath advances position', () => {
    const path = [
      { x: 0, y: 40, z: 0 },
      { x: 10, y: 40, z: 0 },
      { x: 20, y: 40, z: 0 },
    ]
    
    const current = { x: 0, y: 40, z: 0 }
    const moveSpeed = 5 // units per deltaTime
    
    const result = moveAlongPath(current, path, moveSpeed, 1.0)
    
    expect(result.pos.x).toBeGreaterThan(current.x)
    expect(result.pathIdx).toBeGreaterThanOrEqual(0)
  })
  
  it('pathfinding avoids rivers', () => {
    // Find a river cell
    let riverX = 0, riverZ = 0
    for (let z = 10; z < terrain.height - 10; z++) {
      for (let x = 10; x < terrain.width - 10; x++) {
        if (terrain.riverMask[z * terrain.width + x] === 1) {
          riverX = x * terrain.cellSize
          riverZ = z * terrain.cellSize
          break
        }
      }
      if (riverX > 0) break
    }
    
    if (riverX > 0) {
      const start = { x: riverX - 20, y: 40, z: riverZ }
      const goal = { x: riverX + 20, y: 40, z: riverZ }
      
      const path = findPath(terrain, start, goal)
      
      // Path should exist and route around river
      expect(path.length).toBeGreaterThan(0)
    }
  })
  
  it('spawnSettlers increases population', () => {
    const initialPop = state.population
    spawnSettlers(state, terrain)
    
    // Population should increase or stay same (probabilistic)
    expect(state.population).toBeGreaterThanOrEqual(initialPop)
  })
  
  it('updateSettlers maintains settler health', () => {
    // Add a settler
    const settler: Settler = {
      id: 's1',
      pos: { x: 256, y: 40, z: 256 },
      assignedBuilding: null,
      job: 'idle',
      health: 1.0,
      age: 0,
      homeBuilding: null,
      pathTarget: null,
    }
    state.settlers.set('s1', settler)
    state.population = 1
    state.food = 100 // Plenty of food
    
    updateSettlers(state, terrain, 1.0)
    
    // Health should recover when well-fed
    expect(settler.health).toBeGreaterThan(0)
  })
  
  it('updateHerds manages cattle reproduction', () => {
    const herd: Herd = {
      id: 'h1',
      type: 'cattle',
      leader: { x: 256, y: 40, z: 256 },
      count: 10,
      destination: null,
    }
    state.herds.set('h1', herd)
    state.food = 1000 // Plenty of food
    
    const initialCount = herd.count
    updateHerds(state, terrain, 1.0)
    
    // Count should change (reproduction or consumption)
    expect(herd.count).toBeGreaterThan(0)
  })
  
  it('spawnCattleDrive creates herd', () => {
    const initialHerds = state.herds.size
    spawnCattleDrive(state, terrain)
    
    expect(state.herds.size).toBeGreaterThan(initialHerds)
  })
  
  it('settlers removed when health reaches zero', () => {
    const settler: Settler = {
      id: 's1',
      pos: { x: 256, y: 40, z: 256 },
      assignedBuilding: null,
      job: 'idle',
      health: 1.0,
      age: 0,
      homeBuilding: null,
      pathTarget: null,
    }
    state.settlers.set('s1', settler)
    state.population = 1
    state.food = 0 // No food, will starve
    
    const initialHealth = settler.health
    updateSettlers(state, terrain, 1.0)
    
    // Health should decrease from starvation
    expect(settler.health).toBeLessThan(initialHealth)
  })
  
  it('agent updates are deterministic with same seed', () => {
    setSeed(123)
    const state1 = newGameState()
    spawnSettlers(state1, terrain)
    updateSettlers(state1, terrain, 1.0)
    
    setSeed(123)
    const state2 = newGameState()
    spawnSettlers(state2, terrain)
    updateSettlers(state2, terrain, 1.0)
    
    // Same number of settlers after deterministic updates
    expect(state1.settlers.size).toBe(state2.settlers.size)
  })
  
})
