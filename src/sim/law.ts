/**
 * Law & reputation system: settlers have respect, bad behavior triggers bounty.
 */

import type { GameState, Settler } from './types'
import { rng, rngBool } from './rng'

/**
 * Settler reputation metrics.
 */
export interface SettlerReputation {
  settlerId: string
  respect: number // [0, 100], how much town likes them
  crimes: number // Count of violations
  bounty: number // Gold reward for arrest
  fugitive: boolean // Wanted?
}

/**
 * Create reputation record for settler.
 */
export function initializeReputation(settler: Settler): SettlerReputation {
  return {
    settlerId: settler.id,
    respect: 50 + rng() * 30, // [50, 80] at start
    crimes: 0,
    bounty: 0,
    fugitive: false,
  }
}

/**
 * Update settler reputation over time.
 * Work and community service increase respect.
 * Idleness decreases it.
 */
export function updateReputation(
  rep: SettlerReputation,
  settler: Settler,
  deltaTime: number = 1.0
) {
  // Work increases respect
  if (settler.assignedBuilding) {
    rep.respect += 0.5 * deltaTime
  } else {
    // Idleness decreases respect
    rep.respect -= 0.1 * deltaTime
  }
  
  // Low health (starvation, sickness) decreases respect
  if (settler.health < 0.5) {
    rep.respect -= 0.2 * deltaTime
  }
  
  // Clamp respect [0, 100]
  rep.respect = Math.max(0, Math.min(100, rep.respect))
  
  // Check for crime (low respect + morale = potential crime)
  if (rep.respect < 30 && rngBool(0.05 * deltaTime)) {
    rep.crimes++
    
    // Apply bounty
    if (rep.crimes === 1) {
      rep.bounty = 50
    } else if (rep.crimes === 2) {
      rep.bounty = 150
    } else {
      rep.bounty = 300 // Wanted dead or alive
      rep.fugitive = true
    }
  }
}

/**
 * Sheriff arrests fugitive settler.
 * Settler is removed from population, gold added to town.
 */
export function arrestFugitive(
  state: GameState,
  rep: SettlerReputation
): boolean {
  // Check for sheriff
  let hasSheriff = false
  for (const [_, bldg] of state.buildings) {
    if (bldg.type === 'sheriff') {
      hasSheriff = true
      break
    }
  }
  
  if (!hasSheriff || !rep.fugitive) {
    return false // Can't arrest without sheriff or not fugitive
  }
  
  // Remove settler
  state.settlers.delete(rep.settlerId)
  state.population--
  
  // Award bounty
  state.gold += rep.bounty
  
  // Morale: slight boost (law & order)
  state.morale += 2
  
  return true
}

/**
 * Settler can apply for pardon (reduces crimes, clears bounty).
 * Requires respect > 60 and church/sheriff presence.
 */
export function grantPardon(state: GameState, rep: SettlerReputation): boolean {
  if (rep.respect < 60 || rep.crimes === 0) {
    return false
  }
  
  // Check for church or sheriff (forgiveness/mediation)
  let hasAuthority = false
  for (const [_, bldg] of state.buildings) {
    if (bldg.type === 'church' || bldg.type === 'sheriff') {
      hasAuthority = true
      break
    }
  }
  
  if (!hasAuthority) {
    return false
  }
  
  // Grant pardon
  rep.crimes = Math.max(0, rep.crimes - 1)
  if (rep.crimes === 0) {
    rep.bounty = 0
    rep.fugitive = false
  }
  
  return true
}

/**
 * Calculate settlement "lawfulness" (1 = all upstanding, 0 = chaos).
 */
export function calculateLawfulness(reputations: SettlerReputation[]): number {
  if (reputations.length === 0) return 1
  
  const avgRespect = reputations.reduce((sum, r) => sum + r.respect, 0) / reputations.length
  const fugitvieCount = reputations.filter(r => r.fugitive).length
  
  const respectedScore = avgRespect / 100
  const lawfulScore = 1 - (fugitvieCount / Math.max(1, reputations.length))
  
  return (respectedScore + lawfulScore) / 2
}

/**
 * Get bounty board (all fugitives).
 */
export function getBountyBoard(reputations: SettlerReputation[]): SettlerReputation[] {
  return reputations.filter((r: SettlerReputation) => r.fugitive)
}
