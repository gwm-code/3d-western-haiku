/**
 * Core data shapes. Do NOT rename fields or reorder—backward compat for save/load.
 */

export type Weather = 'clear' | 'drought' | 'duststorm' | 'rain'

export interface Vec3 {
  x: number
  y: number
  z: number
}

export interface Building {
  id: string
  type: BuildingType
  pos: Vec3
  rotation: number
  terraceHeight: number
  workers: number
  maxWorkers: number
  status: 'active' | 'paused' | 'burned' | 'diseased'
  age: number
  output?: number
  condition: number // 0–1, degrades with age/fire/disease
}

export type BuildingType = 
  | 'cabin' | 'saloon' | 'general-store' | 'church' | 'bank'
  | 'mine' | 'pasture' | 'lumber-mill' | 'water-tower'
  | 'doctor' | 'firehouse' | 'sheriff' | 'telegraph'
  | 'rail-depot' | 'barracks'

export interface Settler {
  id: string
  pos: Vec3
  assignedBuilding: string | null
  job: 'idle' | 'worker' | 'outlaw'
  health: number // 0–1
  age: number // days
  homeBuilding: string | null
  pathTarget: Vec3 | null
}

export interface Herd {
  id: string
  type: 'cattle' | 'horse'
  leader: Vec3
  count: number
  destination: Vec3 | null
}

export interface Train {
  id: string
  pos: Vec3
  progress: number // 0–1 along track
  depot1: string
  depot2: string
}

export interface GameState {
  day: number
  gold: number
  wood: number
  food: number
  population: number
  law: number // 0–100; outlaw pressure
  reputation: number // 0–100; buyer of deputies/buildings
  wealth: number // sum of buildings + resources (for outlaw/event scaling)
  morale: number // 0–100
  weather: Weather
  droughtTurns: number
  riverLevel: number // 0–1, scales down in drought
  buildings: Map<string, Building>
  settlers: Map<string, Settler>
  herds: Map<string, Herd>
  train: Train | null
  railUnlocked: boolean
  eventLog: GameEvent[]
  saveVersion: number
}

export interface GameEvent {
  turn: number
  type: EventType
  headline: string
  resolved: boolean
}

export type EventType = 
  | 'raid' | 'fire' | 'duel' | 'railroad' | 'outbreak' | 'drought' 
  | 'gold-over' | 'growth' | 'migration'

/**
 * BDEF economy constants (hard-coded from plan; mark BALANCE? if tuning).
 */
export const ECONOMY = {
  // Production & consumption (per worker per day)
  mineGold: 0.8,
  lumberWood: 1.2,
  farmFood: 0.6,
  
  // Daily costs (per settler)
  foodPerSettler: 0.4,
  moodDrainPerDay: 1,
  
  // Building costs
  buildingCosts: {
    'cabin': { gold: 50, wood: 100 },
    'saloon': { gold: 100, wood: 200 },
    'general-store': { gold: 150, wood: 150 },
    'church': { gold: 200, wood: 300 },
    'bank': { gold: 300, wood: 400 },
    'mine': { gold: 100, wood: 50 },
    'pasture': { gold: 50, wood: 100 },
    'lumber-mill': { gold: 80, wood: 120 },
    'water-tower': { gold: 100, wood: 100 },
    'doctor': { gold: 150, wood: 200 },
    'firehouse': { gold: 150, wood: 250 },
    'sheriff': { gold: 100, wood: 150 },
    'telegraph': { gold: 120, wood: 100 },
    'rail-depot': { gold: 500, wood: 600 },
    'barracks': { gold: 200, wood: 300 }
  } as Record<BuildingType, { gold: number; wood: number }>,
  
  // Settler generation
  settlersPerDay: 0.02,
  
  // Outlaw pressure (lawTick)
  outlawWealth: 0.003,
  outlawVice: 0.001,
} as const

/**
 * Terrain rules for placement.
 */
export const TERRAIN = {
  maxSlope: 0.15, // radians; steeper requires terrace
  minRiverDist: 2.5,
  maxElevation: 80,
  minElevation: 0,
} as const
