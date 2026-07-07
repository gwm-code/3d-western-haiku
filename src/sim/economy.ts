/**
 * Economic simulation for frontier settlement.
 * Core rule E: Boom and bust. Gold finite, fortune must rise and threaten collapse.
 */

import type { GameState, Building } from './types'
import { ECONOMY } from './types'

/**
 * Run production tick for all buildings.
 * Returns production deltas (gold, wood, food).
 */
export function tickProduction(state: GameState): { gold: number; wood: number; food: number } {
  let deltaGold = 0
  let deltaWood = 0
  let deltaFood = 0
  
  for (const [_, building] of state.buildings) {
    if (building.status !== 'active') continue
    
    const workerEfficiency = Math.min(building.workers / building.maxWorkers, 1.0)
    
    switch (building.type) {
      case 'mine':
        building.output = ECONOMY.mineGold * building.workers
        deltaGold += building.output
        break
      case 'lumber-mill':
        building.output = ECONOMY.lumberWood * building.workers
        deltaWood += building.output
        break
      case 'pasture':
        building.output = ECONOMY.farmFood * building.workers
        deltaFood += building.output
        break
      case 'general-store':
        // Store: slight resource boost if supplied
        if (state.food > 0) {
          building.output = state.population * 0.1
        }
        break
      case 'church':
      case 'doctor':
      case 'sheriff':
      case 'firehouse':
      case 'telegraph':
        // Service buildings improve morale/health
        building.output = building.workers * 0.5
        break
    }
  }
  
  return { gold: deltaGold, wood: deltaWood, food: deltaFood }
}

/**
 * Run consumption tick.
 * Settlers eat, morale drains.
 */
export function tickConsumption(state: GameState): { foodConsumed: number; moodDrain: number } {
  const foodConsumed = state.population * ECONOMY.foodPerSettler
  const moodDrain = state.population * ECONOMY.moodDrainPerDay
  
  return { foodConsumed, moodDrain }
}

/**
 * Run full economic day.
 * Returns new resource levels.
 */
export function tickEconomy(state: GameState) {
  // Production
  const prod = tickProduction(state)
  state.gold += prod.gold
  state.wood += prod.wood
  state.food += prod.food
  
  // Consumption
  const cons = tickConsumption(state)
  state.food -= cons.foodConsumed
  state.morale -= cons.moodDrain
  
  // Clamp resources
  state.gold = Math.max(0, state.gold)
  state.wood = Math.max(0, state.wood)
  state.food = Math.max(0, state.food)
  state.morale = Math.max(0, Math.min(100, state.morale))
  
  // Starvation penalty
  if (state.food < 0) {
    state.morale -= 10
    state.food = 0
  }
  
  // Update wealth (sum of resources + buildings)
  state.wealth = state.gold + state.wood + state.food + state.buildings.size * 100
}

/**
 * Building degradation over time.
 */
export function tickBuildingMaintenance(state: GameState) {
  for (const [_, building] of state.buildings) {
    // Age increases
    building.age += 1
    
    // Condition decreases (0.1% per day base)
    building.condition -= 0.001
    
    // Fire/disease makes condition worse
    if (building.status === 'burned' || building.status === 'diseased') {
      building.condition -= 0.05
    }
    
    // Clamp condition
    building.condition = Math.max(0, Math.min(1, building.condition))
    
    // If condition reaches 0, building is condemned
    if (building.condition <= 0) {
      building.status = 'paused'
    }
  }
}

/**
 * Check for boom/bust conditions.
 */
export interface BoomBustStatus {
  isBoom: boolean
  isBust: boolean
  reason?: string
}

export function checkBoomBust(state: GameState): BoomBustStatus {
  // Boom: gold strike (gold rapidly increasing)
  if (state.gold > 1000 && state.day % 10 === 0) {
    return { isBoom: true, isBust: false, reason: 'gold-strike' }
  }
  
  // Bust: gold depletion (mines running dry)
  if (state.gold === 0 && state.buildings.size > 0) {
    return { isBoom: false, isBust: true, reason: 'ore-depletion' }
  }
  
  // Bust: starvation
  if (state.food === 0 && state.population > 10) {
    return { isBoom: false, isBust: true, reason: 'famine' }
  }
  
  return { isBoom: false, isBust: false }
}

/**
 * Calculate production multiplier based on weather (Phase 7).
 */
export function weatherMultiplier(weather: string): number {
  switch (weather) {
    case 'drought':
      return 0.5 // Farm output halved
    case 'rain':
      return 1.2 // Farm output boosted
    case 'duststorm':
      return 0.7 // Mixed effects
    case 'clear':
    default:
      return 1.0
  }
}

/**
 * Get resource production summary for day.
 */
export function getProductionSummary(state: GameState): {
  goldProduction: number
  woodProduction: number
  foodProduction: number
  foodConsumption: number
} {
  const prod = tickProduction(state)
  const cons = tickConsumption(state)
  
  return {
    goldProduction: prod.gold,
    woodProduction: prod.wood,
    foodProduction: prod.food,
    foodConsumption: cons.foodConsumed,
  }
}
