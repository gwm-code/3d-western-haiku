/**
 * Disease system: plague outbreaks, transmission, settler isolation.
 * Diseases spread based on density and settler health.
 */

import type { GameState, Settler } from './types'
import { rng, rngBool } from './rng'

/**
 * Disease state.
 */
export interface Disease {
  id: string
  day: number
  infected: Set<string> // Settler IDs
  mortality: number // 0–1, death rate
  contagion: number // 0–1, transmission rate
  active: boolean
}

/**
 * Check if outbreak can occur.
 * Higher population density + low health = outbreak risk.
 */
function outbreakProbability(state: GameState): number {
  // Base: 0.5% per day
  let prob = 0.005
  
  // Population density (more people = more spread)
  const densityFactor = state.population / 100 // Scales with population
  prob += densityFactor * 0.002
  
  // Low food or morale = weakened immunity
  if (state.food < state.population * 0.5) {
    prob *= 2
  }
  if (state.morale < 40) {
    prob *= 1.5
  }
  
  return Math.min(0.05, prob) // Cap at 5%
}

/**
 * Start disease outbreak.
 */
export function startOutbreak(state: GameState, day: number): Disease | null {
  const prob = outbreakProbability(state)
  if (!rngBool(prob)) return null
  
  // Find a random settler to infect (patient zero)
  const settlers = Array.from(state.settlers.values())
  if (settlers.length === 0) return null
  
  const patientZero = settlers[Math.floor(rng() * settlers.length)]
  
  const disease: Disease = {
    id: `disease_${day}`,
    day,
    infected: new Set([patientZero.id]),
    mortality: 0.05 + rng() * 0.15, // [5%, 20%]
    contagion: 0.2 + rng() * 0.4, // [20%, 60%]
    active: true,
  }
  
  patientZero.health *= 0.7 // Infected settlers weakened
  state.morale -= 5 // Worry
  
  return disease
}

/**
 * Disease transmission between settlers.
 * Spreads based on proximity and building assignment.
 */
export function transmitDisease(state: GameState, disease: Disease): void {
  const infected = Array.from(disease.infected)
  
  for (const infectId of infected) {
    const infector = state.settlers.get(infectId)
    if (!infector) continue
    
    for (const [settlerId, settler] of state.settlers) {
      if (disease.infected.has(settlerId)) continue // Already infected
      if (settler.health < 0.3) continue // Too weak to transmit to
      
      // Transmission chance based on:
      // - Proximity (same building assignment)
      // - Contagion rate
      // - Settler health (healthier = more resistant)
      
      let transmissionChance = disease.contagion
      
      if (settler.assignedBuilding === infector.assignedBuilding && infector.assignedBuilding) {
        transmissionChance *= 1.5 // Close proximity in workplace
      }
      
      // Health resistance
      transmissionChance *= settler.health
      
      if (rngBool(transmissionChance)) {
        disease.infected.add(settlerId)
        settler.health *= 0.8 // Infected settlers weaken
      }
    }
  }
}

/**
 * Treat disease (if doctor present).
 */
export function treatDisease(state: GameState, disease: Disease): void {
  // Check for doctor
  let hasDoctor = false
  let treatmentSkill = 0
  
  for (const [_, bldg] of state.buildings) {
    if (bldg.type === 'doctor') {
      hasDoctor = true
      treatmentSkill = 0.5 + bldg.workers * 0.15 // More workers = better treatment
      break
    }
  }
  
  if (!hasDoctor) return
  
  // Reduce mortality and contagion with treatment
  disease.mortality *= (1 - treatmentSkill * 0.5)
  disease.contagion *= (1 - treatmentSkill * 0.4)
}

/**
 * Update disease progression (death, recovery).
 */
export function updateDisease(state: GameState, disease: Disease): Disease {
  if (!disease.active) return disease
  
  const infected = Array.from(disease.infected)
  const died: string[] = []
  const recovered: string[] = []
  
  for (const settlerId of infected) {
    const settler = state.settlers.get(settlerId)
    if (!settler) {
      recovered.push(settlerId) // Already dead/gone
      continue
    }
    
    // Death roll (disease mortality)
    if (rngBool(disease.mortality)) {
      died.push(settlerId)
      state.settlers.delete(settlerId)
      state.population--
      state.morale -= 5 // Grief
      continue
    }
    
    // Recovery (health improves slowly, loses disease immunity)
    settler.health = Math.min(1, settler.health + 0.05)
    
    // Chance to recover (becomes immune)
    if (rngBool(0.1)) {
      recovered.push(settlerId)
    }
  }
  
  // Update infected list
  for (const id of died) {
    disease.infected.delete(id)
  }
  for (const id of recovered) {
    disease.infected.delete(id)
  }
  
  // End outbreak if no more infected
  if (disease.infected.size === 0) {
    disease.active = false
  }
  
  return disease
}

/**
 * Quarantine infected settlers (if firehouse/doctor can enforce).
 * Reduces transmission significantly.
 */
export function quarantine(state: GameState, disease: Disease): void {
  // Check for authority (sheriff can enforce quarantine)
  let hasAuthority = false
  
  for (const [_, bldg] of state.buildings) {
    if (bldg.type === 'sheriff' || bldg.type === 'doctor') {
      hasAuthority = true
      break
    }
  }
  
  if (!hasAuthority) return
  
  // Reduce contagion due to isolation
  disease.contagion *= 0.5
}

/**
 * Get disease description for gazette.
 */
export function getDiseaseDescription(disease: Disease, infectedCount: number): string {
  if (infectedCount === 1) {
    return "A settler falls ill with a mysterious sickness."
  } else if (infectedCount < 10) {
    return `A plague spreads through the town. ${infectedCount} settlers afflicted.`
  } else {
    return `EPIDEMIC! Over ${infectedCount} settlers are sick. The town reels from pestilence.`
  }
}
