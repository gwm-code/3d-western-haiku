/**
 * Agent behavior: settlers working, idle, eating; cattle herds.
 * Core rule D: Nothing is static. Agents move, work, live daily lives.
 */

import { findPath, moveAlongPath } from './pathfind'
import { sampleHeight } from './terrain'
import type { TerrainMap } from './terrain'
import type { GameState, Settler, Building, Herd, Vec3 } from './types'
import { rng, rngBool, rngInt } from './rng'

/**
 * Update all settlers: assign work, move, eat, age.
 */
export function updateSettlers(
  state: GameState,
  terrain: TerrainMap,
  deltaTime: number = 1.0 // 1 day per tick
) {
  const dayFraction = deltaTime / 24 // Fraction of day
  
  for (const [settlerId, settler] of state.settlers) {
    // Age settler
    settler.age += deltaTime
    
    // Health drain from lack of food
    if (state.food < state.population * 0.5) {
      settler.health -= 0.01 * dayFraction
    } else {
      settler.health += 0.005 * dayFraction // Recover if fed
    }
    settler.health = Math.max(0, Math.min(1, settler.health))
    
    // If dead, remove
    if (settler.health <= 0) {
      state.settlers.delete(settlerId)
      state.population--
      continue
    }
    
    // Assignment logic
    if (!settler.assignedBuilding && state.buildings.size > 0) {
      // Randomly assign to a building
      const buildings = Array.from(state.buildings.values())
      const bldg = buildings[rngInt(0, buildings.length - 1)]
      if (bldg.workers < bldg.maxWorkers) {
        settler.assignedBuilding = bldg.id
        bldg.workers++
      }
    }
    
    // Movement
    if (settler.pathTarget && (!settler.pos || 
        Math.hypot(settler.pos.x - settler.pathTarget.x, settler.pos.z - settler.pathTarget.z) > 1)) {
      // Move toward target
      if (!settler.pathTarget) settler.pathTarget = null // Already at target
    } else if (settler.assignedBuilding) {
      // Return to assigned building
      const bldg = state.buildings.get(settler.assignedBuilding)
      if (bldg) {
        settler.pathTarget = { ...bldg.pos }
      }
    } else {
      // Idle wander
      settler.pathTarget = {
        x: settler.pos.x + rngInt(-20, 20),
        y: sampleHeight(terrain, settler.pos.x, settler.pos.z),
        z: settler.pos.z + rngInt(-20, 20),
      }
    }
  }
}

/**
 * Update cattle herds: movement, reproduction, consumption.
 */
export function updateHerds(
  state: GameState,
  terrain: TerrainMap,
  deltaTime: number = 1.0
) {
  for (const [herdId, herd] of state.herds) {
    // Movement: slow, random walk
    if (!herd.destination || rngBool(0.1)) {
      // Pick new destination
      herd.destination = {
        x: herd.leader.x + rngInt(-50, 50),
        y: 0,
        z: herd.leader.z + rngInt(-50, 50),
      }
    }
    
    // Move leader toward destination
    const dx = herd.destination.x - herd.leader.x
    const dz = herd.destination.z - herd.leader.z
    const dist = Math.hypot(dx, dz)
    
    if (dist > 1) {
      const speed = 0.5 * deltaTime // Slow movement
      const moveX = (dx / dist) * speed
      const moveZ = (dz / dist) * speed
      
      herd.leader.x += moveX
      herd.leader.z += moveZ
      herd.leader.y = sampleHeight(terrain, herd.leader.x, herd.leader.z)
    }
    
    // Reproduction (slow)
    if (herd.count < 100 && rngBool(0.02 * deltaTime)) {
      herd.count++
    }
    
    // Consumption: cattle eat from food supply
    const consumption = herd.count * 0.1 * deltaTime
    if (state.food >= consumption) {
      state.food -= consumption
    } else {
      // Starving herd loses animals
      herd.count -= Math.ceil(herd.count * 0.05)
    }
    
    // Remove extinct herds
    if (herd.count <= 0) {
      state.herds.delete(herdId)
    }
  }
}

/**
 * Spawn new settlers based on morale, food, population.
 */
export function spawnSettlers(state: GameState, terrain: TerrainMap) {
  const spawnRate = 0.02 // Per day
  
  // Reduce spawn if not enough food or morale low
  let adjustedRate = spawnRate
  if (state.morale < 50) adjustedRate *= 0.5
  if (state.food < state.population * 1.0) adjustedRate *= 0.1
  
  if (rngBool(adjustedRate)) {
    const settlerId = `settler_${state.nextId++}`
    
    // Spawn at town center (or random building)
    const buildings = Array.from(state.buildings.values())
    const spawnBldg = buildings[rngInt(0, Math.max(0, buildings.length - 1))]
    const spawnPos = spawnBldg ? { ...spawnBldg.pos } : { x: 256, y: 40, z: 256 }
    
    const settler: Settler = {
      id: settlerId,
      pos: spawnPos,
      assignedBuilding: null,
      job: 'idle',
      health: 1.0,
      age: 0,
      homeBuilding: null,
      pathTarget: null,
    }
    
    state.settlers.set(settlerId, settler)
    state.population++
  }
}

/**
 * Spawn cattle drives (major event).
 */
export function spawnCattleDrive(state: GameState, terrain: TerrainMap) {
  const herdId = `herd_${state.nextId++}`
  
  const herd: Herd = {
    id: herdId,
    type: 'cattle',
    leader: { x: 0, y: 40, z: 0 }, // Enter from valley mouth
    count: rngInt(20, 50),
    destination: { x: 256, y: 40, z: 256 }, // Head to town
  }
  
  state.herds.set(herdId, herd)
}

/**
 * Settler/cattle visual update (positions for rendering).
 */
export function updateAgentVisuals(state: GameState, terrain: TerrainMap) {
  // Position updates already done in updateSettlers/updateHerds
  // This is a placeholder for future animation/LOD logic
}
