/**
 * Win/loss condition system.
 * Player wins when settlement thrives; loses to catastrophic collapse.
 */

import type { GameState } from './types'

/**
 * Game status.
 */
export type GameStatus = 'playing' | 'won' | 'lost'

/**
 * Win condition details.
 */
export interface WinCondition {
  minPopulation: number // Must reach this many settlers
  minWealth: number // Total accumulated wealth
  minDays: number // Minimum game length (don't win too early)
  maxDeaths: number // Can't have too many deaths
}

/**
 * Default win condition (can be customized by difficulty).
 */
export const DEFAULT_WIN_CONDITION: WinCondition = {
  minPopulation: 60,
  minWealth: 5000,
  minDays: 100,
  maxDeaths: 20,
}

/**
 * Check if player has won.
 */
export function checkWinCondition(state: GameState, condition: WinCondition = DEFAULT_WIN_CONDITION): boolean {
  if (state.day < condition.minDays) return false // Too early
  if (state.population < condition.minPopulation) return false // Not enough settlers
  if (state.wealth < condition.minWealth) return false // Not wealthy enough
  
  // All conditions met!
  return true
}

/**
 * Check if player has lost (catastrophic failure).
 */
export function checkLoseCondition(state: GameState): boolean {
  // Instant loss: no food and population > 0 (starvation)
  if (state.food <= 0 && state.population > 0) return true
  
  // Instant loss: morale collapses (settlement abandonment)
  if (state.morale <= 0) return true
  
  // Instant loss: population extinct
  if (state.population <= 0 && state.day > 50) return true
  
  return false
}

/**
 * Get game status.
 */
export function getGameStatus(state: GameState, condition: WinCondition = DEFAULT_WIN_CONDITION): GameStatus {
  if (checkLoseCondition(state)) return 'lost'
  if (checkWinCondition(state, condition)) return 'won'
  return 'playing'
}

/**
 * Get win description (flavor text).
 */
export function getWinDescription(state: GameState): string {
  const lines = [
    "╔════════════════════════════════════════════════════════════╗",
    "║                      VICTORY!                               ║",
    "║                                                             ║",
    `║  The settlement of Deadwater Gulch has flourished!          ║`,
    `║  Population: ${String(state.population).padEnd(5)} | Wealth: ${String(Math.floor(state.wealth)).padEnd(6)} | Day: ${String(state.day).padEnd(3)}   ║`,
    "║                                                             ║",
    "║  Once a lawless frontier outpost, the town now stands as    ║",
    "║  a beacon of civilization in the desert. Trade flows,       ║",
    "║  families settle, and the future is bright.                 ║",
    "║                                                             ║",
    "║  [Press SPACE to restart or close to exit]                  ║",
    "╚════════════════════════════════════════════════════════════╝",
  ]
  
  return lines.join("\n")
}

/**
 * Get loss description (flavor text).
 */
export function getLossDescription(state: GameState): string {
  let reason = "Unknown"
  
  if (state.food <= 0 && state.population > 0) {
    reason = "Starvation ended the settlement."
  } else if (state.morale <= 0) {
    reason = "Despair broke the settlers' will. The town was abandoned."
  } else if (state.population <= 0) {
    reason = "The last settler rode out of town. Deadwater Gulch is no more."
  }
  
  const lines = [
    "╔════════════════════════════════════════════════════════════╗",
    "║                     GAME OVER                               ║",
    "║                                                             ║",
    `║  ${reason.padEnd(58)} ║`,
    `║  Final Population: ${String(state.population).padEnd(38)} ║`,
    `║  Final Day: ${String(state.day).padEnd(51)} ║`,
    "║                                                             ║",
    "║  The frontier remains untamed, and Deadwater Gulch fades    ║",
    "║  into legend—a cautionary tale whispered in saloons.        ║",
    "║                                                             ║",
    "║  [Press SPACE to restart or close to exit]                  ║",
    "╚════════════════════════════════════════════════════════════╝",
  ]
  
  return lines.join("\n")
}

/**
 * Calculate settlement score (for leaderboards).
 */
export function calculateSettlementScore(state: GameState, daysToWin: number | null = null): number {
  let score = 0
  
  // Population: 100 points per settler
  score += state.population * 100
  
  // Wealth: 1 point per gold
  score += state.gold
  
  // Longevity: 10 points per day (up to day 200)
  score += Math.min(state.day, 200) * 10
  
  // Bonus for early win
  if (daysToWin && daysToWin < 200) {
    score += (200 - daysToWin) * 20
  }
  
  // Morale bonus (at end)
  if (state.morale > 70) {
    score += 500
  }
  
  return Math.floor(score)
}
