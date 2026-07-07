/**
 * Weather simulation: drought, rain, duststorm, clear.
 * Affects food production, river level, visibility, settler health.
 */

import type { GameState } from './types'
import { rng, rngBool } from './rng'

/**
 * Weather state and effects tracker.
 */
export interface WeatherSystem {
  current: 'clear' | 'rain' | 'drought' | 'duststorm'
  daysElapsed: number
  intensity: number // 0–1, how severe
  riverLevel: number // 0–1, affected by drought/rain
}

/**
 * Calculate weather transition probability.
 * Weather tends to persist but can change.
 */
function weatherTransitionProbability(current: string): number {
  // Each weather has 10% chance per day to change
  return 0.1
}

/**
 * Advance weather one day.
 * Weather has inertia: unlikely to change rapidly.
 */
export function tickWeather(state: GameState): void {
  const weather = state.weather as string
  
  if (rngBool(weatherTransitionProbability(weather))) {
    // Change weather
    const options = ['clear', 'rain', 'drought', 'duststorm']
    const idx = Math.floor(rng() * options.length)
    state.weather = options[idx] as any
  }
  
  // Update drought counter
  if (state.weather === 'drought') {
    state.droughtTurns++
    // River level drops: 1% per day of drought
    state.riverLevel = Math.max(0, state.riverLevel - 0.01)
  } else if (state.weather === 'rain') {
    state.droughtTurns = 0
    // River rises: 2% per day of rain
    state.riverLevel = Math.min(1, state.riverLevel + 0.02)
  } else {
    // Clear/duststorm: gradual return to normal
    if (state.riverLevel < 1) {
      state.riverLevel = Math.min(1, state.riverLevel + 0.005)
    }
  }
}

/**
 * Apply weather effects to production and settlers.
 */
export function applyWeatherEffects(state: GameState): void {
  switch (state.weather) {
    case 'drought':
      // Reduce food production
      for (const [_, bldg] of state.buildings) {
        if (bldg.type === 'pasture') {
          bldg.output = (bldg.output ?? 0) * 0.5 // 50% reduction
        }
      }
      
      // Settler health penalty (dehydration)
      for (const [_, settler] of state.settlers) {
        settler.health -= 0.02 // 2% health loss per day
      }
      
      // Morale penalty (despair)
      state.morale -= 2
      break
      
    case 'rain':
      // Boost food production
      for (const [_, bldg] of state.buildings) {
        if (bldg.type === 'pasture') {
          bldg.output = (bldg.output ?? 0) * 1.3 // 30% boost
        }
      }
      
      // Slight morale boost (hope)
      state.morale = Math.min(100, state.morale + 1)
      break
      
    case 'duststorm':
      // Visibility reduction (no visibility mechanic yet, but affects morale)
      state.morale -= 3
      
      // Settler respiratory distress
      for (const [_, settler] of state.settlers) {
        settler.health -= 0.03 // 3% health loss per day
      }
      
      // Dust damages buildings (condition)
      for (const [_, bldg] of state.buildings) {
        bldg.condition -= 0.01 // 1% degradation
      }
      break
      
    case 'clear':
    default:
      // Normal conditions
      state.morale = Math.min(100, state.morale + 0.5) // Slight morale recovery
      break
  }
}

/**
 * Get weather description for gazette.
 */
export function getWeatherDescription(weather: string): string {
  switch (weather) {
    case 'drought':
      return "The town is parched. Water is scarce, crops wilt."
    case 'rain':
      return "Blessed rain falls. The land drinks deeply."
    case 'duststorm':
      return "A fierce duststorm blankets the settlement. Visibility near zero."
    case 'clear':
      return "Clear skies. A perfect day for work."
    default:
      return "The weather is unremarkable."
  }
}

/**
 * Check if drought is critical (river almost dry).
 */
export function isDroughtCritical(state: GameState): boolean {
  return state.riverLevel < 0.2 && state.weather === 'drought'
}

/**
 * Check if river is flooded (too much rain).
 */
export function isRiverFlooded(state: GameState): boolean {
  return state.riverLevel > 0.9 && state.weather === 'rain'
}
