/**
 * Fire system: building fires, spread, damage control.
 * Fires are attracted to low-condition buildings, spread to neighbors.
 */

import type { GameState, Building } from './types'
import { rng, rngBool } from './rng'

/**
 * Fire event.
 */
export interface Fire {
  id: string
  day: number
  buildingId: string
  intensity: number // 0–1, how severe (spreads when > 0.5)
  spread: number // Fire spread distance in cells
}

/**
 * Check if building can catch fire (low condition + materials).
 */
function fireProbability(bldg: Building): number {
  // Base: 0.1% per day
  let prob = 0.001
  
  // Low condition increases fire risk exponentially
  if (bldg.condition < 0.5) {
    prob += (0.5 - bldg.condition) * 0.01 // Up to 0.5% additional
  }
  
  // Wood buildings (lumber-mill, cabin) more flammable
  if (bldg.type === 'lumber-mill' || bldg.type === 'cabin') {
    prob *= 2
  }
  
  return Math.min(0.05, prob) // Cap at 5% per day
}

/**
 * Attempt to start fire at building.
 */
export function startFire(state: GameState, buildingId: string, day: number): Fire | null {
  const bldg = state.buildings.get(buildingId)
  if (!bldg) return null
  
  const prob = fireProbability(bldg)
  if (!rngBool(prob)) return null
  
  const fire: Fire = {
    id: `fire_${day}_${buildingId}`,
    day,
    buildingId,
    intensity: 0.2 + rng() * 0.6, // [0.2, 0.8]
    spread: 0,
  }
  
  // Mark building as burning
  bldg.status = 'burned'
  bldg.condition *= 0.8 // Immediate damage
  
  state.morale -= 10 // Terror
  
  return fire
}

/**
 * Advance fire spread to neighboring buildings.
 */
export function spreadFire(state: GameState, fire: Fire): Fire[] {
  const fires: Fire[] = []
  const sourceBldg = state.buildings.get(fire.buildingId)
  if (!sourceBldg) return fires
  
  // Only spread if fire is intense
  if (fire.intensity < 0.5) return fires
  
  // Spread to nearby buildings (distance threshold)
  const SPREAD_DISTANCE = 10 // World units
  
  for (const [id, bldg] of state.buildings) {
    if (bldg.status === 'burned') continue // Already burning
    
    const dx = bldg.pos.x - sourceBldg.pos.x
    const dz = bldg.pos.z - sourceBldg.pos.z
    const dist = Math.sqrt(dx * dx + dz * dz)
    
    if (dist < SPREAD_DISTANCE) {
      // Chance to catch fire (distance-based)
      const spreadProb = 0.3 * (1 - dist / SPREAD_DISTANCE)
      
      if (rngBool(spreadProb)) {
        const newFire = startFire(state, id, fire.day)
        if (newFire) {
          fires.push(newFire)
        }
      }
    }
  }
  
  return fires
}

/**
 * Firefighter response (if sheriff/firehouse present).
 */
export function fightFire(state: GameState, fire: Fire): boolean {
  // Check for firehouse
  let hasFirehouse = false
  let firefighterSkill = 0
  
  for (const [_, bldg] of state.buildings) {
    if (bldg.type === 'firehouse') {
      hasFirehouse = true
      firefighterSkill = 0.5 + bldg.workers * 0.1 // Skills scale with workers
      break
    }
  }
  
  if (!hasFirehouse) return false
  
  // Combat: firefighter skill vs fire intensity
  const extinguished = firefighterSkill > fire.intensity
  
  if (extinguished) {
    fire.intensity = 0
    const bldg = state.buildings.get(fire.buildingId)
    if (bldg) {
      bldg.status = 'active' // Restore
      bldg.condition = Math.max(0.2, bldg.condition) // Damage remains
    }
    state.morale += 5 // Relief
    return true
  }
  
  return false
}

/**
 * Update fire progression (spread, damage).
 */
export function updateFires(state: GameState, fires: Fire[]): Fire[] {
  const activeFires: Fire[] = []
  
  for (const fire of fires) {
    // Spread fire
    const newFires = spreadFire(state, fire)
    activeFires.push(...newFires)
    
    // Try to fight
    const extinguished = fightFire(state, fire)
    
    if (!extinguished) {
      // Continue burning
      fire.intensity = Math.max(0, fire.intensity - 0.05) // Gradual burn-down
      fire.spread++
      activeFires.push(fire)
      
      // Damage building
      const bldg = state.buildings.get(fire.buildingId)
      if (bldg) {
        bldg.condition -= 0.1 // 10% degradation per day
        if (bldg.condition <= 0) {
          state.buildings.delete(fire.buildingId)
          state.morale -= 20 // Building destroyed
        }
      }
    }
  }
  
  return activeFires
}

/**
 * Get fire description for gazette.
 */
export function getFireDescription(fire: Fire, bldgName: string): string {
  if (fire.intensity < 0.3) {
    return `A small fire breaks out at the ${bldgName}. Firefighters contain it.`
  } else if (fire.intensity < 0.7) {
    return `The ${bldgName} is ablaze! Fire spreads to nearby buildings!`
  } else {
    return `INFERNO! The ${bldgName} burns out of control. The town holds its breath.`
  }
}
