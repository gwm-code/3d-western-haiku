/**
 * Duel system: settler conflict resolution through combat.
 * Grit determines outcome (measured by job experience, morale, health).
 */

import type { GameState, Settler } from './types'
import { rng, rngBool } from './rng'

/**
 * Duel outcome.
 */
export interface Duel {
  id: string
  day: number
  challenger: Settler
  defender: Settler
  challengerGrit: number
  defenderGrit: number
  outcome: 'challenger-win' | 'defender-win' | 'draw'
  result: string // Brief description
}

/**
 * Calculate settler grit (combat readiness).
 * Based on health, job experience, morale.
 */
export function calculateGrit(settler: Settler): number {
  // Base: health
  let grit = settler.health
  
  // Job experience bonus (years in job)
  const jobYears = settler.age / 365 // Rough estimate
  grit += Math.min(0.3, jobYears * 0.05)
  
  // Clamp [0, 1]
  return Math.max(0, Math.min(1, grit))
}

/**
 * Trigger duel between two settlers (dispute resolution).
 * Probability based on morale (low morale = more conflict).
 */
export function triggerDuel(state: GameState, day: number): Duel | null {
  if (state.settlers.size < 2) return null
  
  // Probability increases with low morale and high population
  const baseProbability = 0.01 // 1% per day
  const moodPenalty = Math.max(0, (100 - state.morale) / 500)
  const populationFactor = Math.min(0.05, state.population / 500)
  
  const duelProb = baseProbability + moodPenalty + populationFactor
  
  if (!rngBool(duelProb)) {
    return null // No duel today
  }
  
  // Pick two random settlers
  const settlers = Array.from(state.settlers.values())
  const idx1 = Math.floor(rng() * settlers.length)
  let idx2 = Math.floor(rng() * settlers.length)
  while (idx2 === idx1 && settlers.length > 1) {
    idx2 = Math.floor(rng() * settlers.length)
  }
  
  const challenger = settlers[idx1]
  const defender = settlers[idx2]
  
  const challengerGrit = calculateGrit(challenger)
  const defenderGrit = calculateGrit(defender)
  
  // Determine outcome
  const rand = rng()
  let outcome: 'challenger-win' | 'defender-win' | 'draw'
  
  if (Math.abs(challengerGrit - defenderGrit) < 0.1) {
    outcome = 'draw'
  } else if (challengerGrit > defenderGrit) {
    outcome = 'challenger-win'
  } else {
    outcome = 'defender-win'
  }
  
  // Apply consequences
  const loser = outcome === 'challenger-win' ? defender : challenger
  const winner = outcome === 'challenger-win' ? challenger : defender
  
  if (outcome !== 'draw') {
    // Loser takes health damage
    loser.health = Math.max(0, loser.health - 0.2)
    
    // Winner gains confidence
    winner.health = Math.min(1, winner.health + 0.1)
  }
  
  // Morale effect: duel reduces settlement morale
  state.morale -= 3
  
  const duel: Duel = {
    id: `duel_${day}`,
    day,
    challenger,
    defender,
    challengerGrit,
    defenderGrit,
    outcome,
    result: `${challenger.id} (grit ${challengerGrit.toFixed(2)}) ${outcome} vs ${defender.id} (${defenderGrit.toFixed(2)})`,
  }
  
  return duel
}

/**
 * Mediate duel (if town has sheriff or peace building).
 * Increases cost but reduces morale damage.
 */
export function mediateDuel(state: GameState, duel: Duel): boolean {
  // Check for sheriff or church
  let hasMediator = false
  
  for (const [_, bldg] of state.buildings) {
    if (bldg.type === 'sheriff' || bldg.type === 'church') {
      hasMediator = true
      break
    }
  }
  
  if (!hasMediator) {
    return false // Can't mediate without authority
  }
  
  // Mediation: reduce morale damage and heal duelists
  duel.challenger.health = Math.min(1, duel.challenger.health + 0.15)
  duel.defender.health = Math.min(1, duel.defender.health + 0.15)
  state.morale -= 1 // Much less morale damage
  
  return true
}

/**
 * Track all duels in session for Gazette reporting.
 */
export function recordDuel(state: GameState, duel: Duel) {
  if (!Array.isArray((state as any).duels)) {
    (state as any).duels = []
  }
  ;(state as any).duels.push(duel)
}
