import type { GameState, Building, Settler, Herd, Train } from './types'

/**
 * Fail-loud error handling: never swallow.
 */
export function failLoud(msg: string): never {
  console.error('[FATAL]', msg)
  if (typeof window !== 'undefined') {
    (window as any).qa = { error: msg }
  }
  throw new Error(msg)
}

/**
 * Serialize GameState to JSON (no functions, no cycles).
 * Map<> becomes Object for JSON compat.
 */
export function serializeState(state: GameState): string {
  const data = {
    saveVersion: state.saveVersion,
    day: state.day,
    gold: state.gold,
    wood: state.wood,
    food: state.food,
    population: state.population,
    law: state.law,
    reputation: state.reputation,
    wealth: state.wealth,
    morale: state.morale,
    weather: state.weather,
    droughtTurns: state.droughtTurns,
    riverLevel: state.riverLevel,
    buildings: Array.from(state.buildings.values()),
    settlers: Array.from(state.settlers.values()),
    herds: Array.from(state.herds.values()),
    train: state.train,
    railUnlocked: state.railUnlocked,
    eventLog: state.eventLog,
  }
  return JSON.stringify(data)
}

/**
 * Deserialize JSON back to GameState.
 * Restores Maps, validates save version.
 */
export function deserializeState(json: string): GameState {
  let data
  try {
    data = JSON.parse(json)
  } catch (e) {
    failLoud(`Save parse error: ${e}`)
  }

  if (typeof data !== 'object' || !data) {
    failLoud('Save is not an object')
  }

  if (data.saveVersion !== 1) {
    failLoud(`Unsupported save version ${data.saveVersion}`)
  }

  const buildings = new Map<string, Building>()
  if (Array.isArray(data.buildings)) {
    for (const item of data.buildings) {
      const { id, ...b } = item as any
      if (typeof id !== 'string') failLoud('Building id not string')
      buildings.set(id, b)
    }
  }

  const settlers = new Map<string, Settler>()
  if (Array.isArray(data.settlers)) {
    for (const item of data.settlers) {
      const { id, ...s } = item as any
      if (typeof id !== 'string') failLoud('Settler id not string')
      settlers.set(id, s)
    }
  }

  const herds = new Map<string, Herd>()
  if (Array.isArray(data.herds)) {
    for (const item of data.herds) {
      const { id, ...h } = item as any
      if (typeof id !== 'string') failLoud('Herd id not string')
      herds.set(id, h)
    }
  }

  const state: GameState = {
    saveVersion: data.saveVersion ?? 1,
    day: data.day ?? 0,
    gold: data.gold ?? 1000,
    wood: data.wood ?? 500,
    food: data.food ?? 200,
    population: data.population ?? 5,
    law: data.law ?? 50,
    reputation: data.reputation ?? 50,
    wealth: data.wealth ?? 1700,
    morale: data.morale ?? 75,
    weather: data.weather ?? 'clear',
    droughtTurns: data.droughtTurns ?? 0,
    riverLevel: data.riverLevel ?? 1,
    buildings,
    settlers,
    herds,
    train: data.train ?? null,
    railUnlocked: data.railUnlocked ?? false,
    eventLog: data.eventLog ?? [],
  }

  return state
}

/**
 * Create a fresh game state.
 */
export function newGameState(): GameState {
  return {
    saveVersion: 1,
    day: 0,
    gold: 1000,
    wood: 500,
    food: 200,
    population: 5,
    law: 50,
    reputation: 50,
    wealth: 1700,
    morale: 75,
    weather: 'clear',
    droughtTurns: 0,
    riverLevel: 1,
    buildings: new Map(),
    settlers: new Map(),
    herds: new Map(),
    train: null,
    railUnlocked: false,
    eventLog: [],
  }
}

/**
 * Deep clone state (for save round-trip tests).
 */
export function cloneState(state: GameState): GameState {
  return deserializeState(serializeState(state))
}
