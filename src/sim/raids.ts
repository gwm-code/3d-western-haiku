/**
 * Raid system: outlaw pressure from settlement wealth.
 * Core rule C: Lawless-by-structure. Raiders are attracted to gold, not random.
 */

import type { GameState, Building } from './types'
import { rng, rngInt, rngBool } from './rng'

/**
 * Outlaw/raider type.
 */
export interface Raider {
  id: string
  x: number
  z: number
  grit: number // Combat skill [0, 1]
  health: number // [0, 1]
  role: 'scout' | 'shooter' | 'leader'
}

/**
 * Raid event.
 */
export interface Raid {
  id: string
  day: number
  status: 'incoming' | 'attacking' | 'defeated' | 'succeeded'
  raiders: Raider[]
  target: Building | null
  preyGold: number
}

/**
 * Calculate raid probability based on settlement wealth.
 * More gold = higher chance of attracting outlaws.
 */
export function calculateRaidProbability(state: GameState): number {
  // Base probability
  let prob = 0.02 // 2% per day
  
  // Wealth bonus: every 500 gold adds 1% chance
  prob += state.gold / 500 * 0.01
  
  // Morale penalty: low morale = more raiding (desperation)
  if (state.morale < 50) {
    prob *= 1.5
  }
  
  // Max out at 15% per day
  return Math.min(0.15, prob)
}

/**
 * Attempt to spawn raid.
 * Modifies state directly (adds raid to incoming list).
 */
export function triggerRaid(state: GameState, day: number) {
  const prob = calculateRaidProbability(state)
  
  if (!rngBool(prob)) {
    return // No raid today
  }
  
  // Determine raid size based on wealth
  const raidSize = Math.min(15, Math.ceil(state.gold / 100))
  const raiders: Raider[] = []
  
  for (let i = 0; i < raidSize; i++) {
    const isLeader = i === 0
    const role: 'scout' | 'shooter' | 'leader' = 
      isLeader ? 'leader' : (i < 3 ? 'shooter' : 'scout')
    
    const raider: Raider = {
      id: `raider_${day}_${i}`,
      x: rng() * 256 * 2, // Random entry point (world space)
      z: rng() * 256 * 2,
      grit: 0.3 + rng() * 0.7, // [0.3, 1.0]
      health: 1.0,
      role,
    }
    
    raiders.push(raider)
  }
  
  // Pick target: richest building (mine)
  let targetBldg: Building | null = null
  for (const [_, bldg] of state.buildings) {
    if (bldg.type === 'mine') {
      const output = bldg.output ?? 0
      const targetOutput = targetBldg?.output ?? 0
      if (targetBldg === null || output > targetOutput) {
        targetBldg = bldg
      }
    }
  }
  
  const raid: Raid = {
    id: `raid_${day}`,
    day,
    status: 'incoming',
    raiders,
    target: targetBldg,
    preyGold: state.gold,
  }
  
  const raids = (state as any).raids ?? []
  raids.push(raid)
  (state as any).raids = raids
  state.morale -= 5 // Settlement fear
}

/**
 * Update raid progress (movement, engagement).
 */
export function updateRaids(state: GameState, deltaTime: number = 1.0): void {
  const raids = (state as any).raids ?? []
  for (const raid of raids) {
    if (raid.status === 'incoming') {
      // Move raiders toward target (if exists)
      const targetX = raid.target?.pos.x ?? 256
      const targetZ = raid.target?.pos.z ?? 256
      
      for (const raider of raid.raiders) {
        const dx = targetX - raider.x
        const dz = targetZ - raider.z
        const dist = Math.sqrt(dx * dx + dz * dz)
        
        if (dist > 0.1) {
          const speed = 2.0 * deltaTime // Units per day
          raider.x += (dx / dist) * speed
          raider.z += (dz / dist) * speed
        }
      }
      
      // Check if raiders reached target
      const minDist = Math.min(...raid.raiders.map((r: Raider) => 
        Math.hypot(r.x - targetX, r.z - targetZ)
      ))
      
      if (minDist < 5.0) {
        raid.status = 'attacking'
      }
    }
    
    if (raid.status === 'attacking') {
      // Combat: raiders steal gold
      // Simplified: raiders succeed in taking some gold
      const stolen = raid.preyGold * 0.3 // Raiders take 30%
      state.gold -= stolen
      raid.status = 'succeeded'
      state.morale -= 15
    }
  }
}

/**
 * Sheriff defends against raid.
 * Check if settlement has sheriff; if so, improve defense.
 */
export function defendAgainstRaid(state: GameState, raid: Raid): boolean {
  // Look for sheriff
  let hasSheriff = false
  let sheriffGrit = 0
  
  for (const [_, bldg] of state.buildings) {
    if (bldg.type === 'sheriff') {
      hasSheriff = true
      sheriffGrit = 0.5 + bldg.workers * 0.1 // Grit scales with deputies
      break
    }
  }
  
  if (!hasSheriff) {
    return false // No defense
  }
  
  // Combat outcome: sheriff vs leader raider
  const leader = raid.raiders[0]
  const defenseWin = sheriffGrit > leader.grit
  
  if (defenseWin) {
    raid.status = 'defeated'
    // Remove some raiders
    raid.raiders = raid.raiders.filter((_: Raider) => rngBool(0.3)) // 30% escape
    state.morale += 10
    return true
  }
  
  return false
}

/**
 * Count active raids.
 */
export function activeRaidCount(state: GameState): number {
  const raids = (state as any).raids as Raid[] ?? []
  return raids.filter((r: Raid) => r.status === 'incoming' || r.status === 'attacking').length
}

/**
 * Remove old raids from history (keep last 10).
 */
export function pruneRaidHistory(state: GameState) {
  const raids = (state as any).raids ?? []
  if (raids.length > 10) {
    (state as any).raids = raids.slice(-10)
  }
}
