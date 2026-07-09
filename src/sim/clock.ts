/** THE CLOCK — gold depletion is the spine (P1). */
import type { GameState } from "./types"
import { alive } from "./residents"
import { rngInt } from "./rng"

export function initClock(s: GameState): void {
  s.goldTotal = rngInt(2400, 3600)
  s.goldLeft = s.goldTotal
  s.goldRate = 14 // units per miner-week
}

/** Mine for a week. Returns gold units extracted (also paid as money 1:1 for v1). */
export function mineWeek(s: GameState): number {
  const miners = alive(s).filter(r => r.role === "miner").length
  const want = Math.round(miners * s.goldRate * (s.flags["mineClosed"] ? 0 : 1))
  const got = Math.min(want, s.goldLeft)
  s.goldLeft -= got
  s.money += got
  return got
}

export function depletion(s: GameState): number { return 1 - s.goldLeft / s.goldTotal }
export function bustWatch(s: GameState): boolean { return s.goldLeft / s.goldTotal <= 0.25 }
