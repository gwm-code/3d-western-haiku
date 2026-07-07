/**
 * Game manager: orchestrates all simulation, rendering, and UI systems.
 * Bridges sim layer to graphics/audio/HUD.
 */

import type { GameState } from './types'
import { setSeed } from './rng'
import { tickWeather, applyWeatherEffects } from './weather'
import { triggerRaid, updateRaids, pruneRaidHistory } from './raids'
import { triggerDuel } from './duels'
import { startOutbreak, transmitDisease, updateDisease, treatDisease, quarantine } from './disease'
import { startFire, updateFires } from './fire'
import { tickProduction, tickConsumption, checkBoomBust } from './economy'
import { newGazette, addGazetteEntry, type Gazette } from './gazette'
import { AudioManager, initAudioManager, playSoundEffect, startAmbientMusic } from './audio'
import { HUDState, newHUD } from './hud'
import { Profiler, newProfiler, sampleFrame } from './profiler'
import { getGameStatus, calculateSettlementScore } from './endgame'

/**
 * Game manager state.
 */
export interface GameManager {
  state: GameState
  gazette: Gazette
  audio: AudioManager
  hud: HUDState
  profiler: Profiler
  isPaused: boolean
  isGameOver: boolean
  gameStatus: 'playing' | 'won' | 'lost'
  lastTickTime: number
  dayStartTime: number
  fires: any[] // Fire[]
  diseases: any[] // Disease[]
}

/**
 * Create new game manager.
 */
export function newGameManager(state: GameState): GameManager {
  return {
    state,
    gazette: newGazette(),
    audio: initAudioManager(),
    hud: newHUD(),
    profiler: newProfiler(),
    isPaused: false,
    isGameOver: false,
    gameStatus: 'playing',
    lastTickTime: Date.now(),
    dayStartTime: Date.now(),
    fires: [],
    diseases: [],
  }
}

/**
 * Main game loop tick (called once per frame).
 * Updates simulation, checks events, updates audio/HUD.
 */
export function tickGame(manager: GameManager, deltaTime: number = 0.016): void {
  if (manager.isPaused || manager.isGameOver) return
  
  const state = manager.state
  
  // Advance day every ~3 seconds (or based on game speed)
  const elapsed = Date.now() - manager.dayStartTime
  const dayDurationMs = 3000 // 3 seconds per game day
  const daysElapsed = Math.floor(elapsed / dayDurationMs)
  
  if (daysElapsed > 0) {
    // Advance day
    state.day += daysElapsed
    manager.dayStartTime = Date.now()
    
    // Reset RNG seed for determinism
    setSeed(state.day)
    
    // ===== DAILY TICK SEQUENCE =====
    
    // 1. Weather
    tickWeather(state)
    applyWeatherEffects(state)
    
    // 2. Economy (Note: agents update happens in graphics layer)
    tickProduction(state)
    tickConsumption(state)
    checkBoomBust(state)
    
    // 3. Events (raids, duels, disease, fire)
    triggerRaid(state, state.day)
    const duel = triggerDuel(state, state.day)
    if (duel) {
      addGazetteEntry(
        manager.gazette,
        state.day,
        `Duel: ${duel.challenger.id} vs ${duel.defender.id}`,
        duel.result,
        'duel',
        6
      )
      playSoundEffect(manager.audio, 'duel')
    }
    
    // Try to start fire (on buildings)
    for (const [buildingId, bldg] of state.buildings) {
      const fire = startFire(state, buildingId, state.day)
      if (fire) {
        manager.fires.push(fire)
        addGazetteEntry(
          manager.gazette,
          state.day,
          `Fire at ${bldg.type}`,
          `A building burns dangerously.`,
          'fire',
          7
        )
        playSoundEffect(manager.audio, 'fire')
      }
    }
    
    // Try to start disease
    const disease = startOutbreak(state, state.day)
    if (disease) {
      manager.diseases.push(disease)
      addGazetteEntry(
        manager.gazette,
        state.day,
        `Plague Outbreak`,
        `A mysterious illness spreads through the settlement.`,
        'disease',
        8
      )
      playSoundEffect(manager.audio, 'disease')
    }
    
    // 5. Update ongoing events
    updateRaids(state, 1.0)
    manager.fires = updateFires(state, manager.fires)
    
    for (const disease of manager.diseases) {
      transmitDisease(state, disease)
      treatDisease(state, disease)
      updateDisease(state, disease)
      quarantine(state, disease)
    }
    
    // Remove inactive fires/diseases
    manager.fires = manager.fires.filter(f => f.status !== 'defeated')
    manager.diseases = manager.diseases.filter(d => d.active)
    
    pruneRaidHistory(state)
    
    // 4. Check game status
    manager.gameStatus = getGameStatus(state)
    if (manager.gameStatus !== 'playing') {
      manager.isGameOver = true
    }
    
    // 5. Add to Gazette (daily summary)
    if (state.morale < 30) {
      addGazetteEntry(manager.gazette, state.day, 'Morale Concern', 'Settlers despair.', 'other', 4)
    }
    if (state.gold > 1000) {
      addGazetteEntry(manager.gazette, state.day, 'Prosperity', 'The town flourishes!', 'economy', 5)
      playSoundEffect(manager.audio, 'gold-found')
    }
    
    // Audio: update ambient based on morale
    const morale = state.morale
    if (morale < 30) {
      startAmbientMusic(manager.audio, 'slow')
    } else if (morale < 60) {
      startAmbientMusic(manager.audio, 'normal')
    } else {
      startAmbientMusic(manager.audio, 'fast')
    }
  }
  
  // Sample performance every frame
  sampleFrame(manager.profiler)
}

/**
 * Render HUD to canvas.
 * Called after game tick, before WebGL render.
 */
export function renderHUDOverlay(
  manager: GameManager,
  canvas: HTMLCanvasElement
): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  
  const state = manager.state
  
  // Simple text overlays (production-ready HUD would use Canvas 2D or WebGL text)
  // Top-left: Resources
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
  ctx.fillRect(10, 10, 180, 120)
  ctx.fillStyle = '#fff'
  ctx.font = '12px monospace'
  ctx.fillText(`Gold: ${Math.floor(state.gold)}`, 20, 30)
  ctx.fillText(`Wood: ${Math.floor(state.wood)}`, 20, 50)
  ctx.fillText(`Food: ${Math.floor(state.food)}`, 20, 70)
  ctx.fillText(`Pop: ${state.population}`, 20, 90)
  ctx.fillText(`Day: ${state.day}`, 20, 110)
  
  // Top-right: Morale
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
  ctx.fillRect(canvas.width - 190, 10, 180, 80)
  ctx.fillStyle = '#fff'
  
  let moraleColor = '#00ff00'
  if (state.morale < 30) moraleColor = '#ff0000'
  else if (state.morale < 60) moraleColor = '#ffaa00'
  
  ctx.fillText(`Morale: ${Math.floor(state.morale)}%`, canvas.width - 180, 30)
  ctx.fillStyle = moraleColor
  ctx.fillRect(canvas.width - 180, 40, (state.morale / 100) * 160, 20)
  
  ctx.fillStyle = '#fff'
  ctx.fillText(`Weather: ${state.weather}`, canvas.width - 180, 75)
  
  // Bottom-left: Alerts
  if (state.food < state.population * 0.5) {
    ctx.fillStyle = 'rgba(200, 0, 0, 0.9)'
    ctx.fillRect(10, canvas.height - 50, 160, 40)
    ctx.fillStyle = '#fff'
    ctx.fillText('⚠ FOOD SHORTAGE', 20, canvas.height - 30)
  }
  
  if (state.morale < 20) {
    ctx.fillStyle = 'rgba(200, 0, 0, 0.9)'
    ctx.fillRect(10, canvas.height - 100, 160, 40)
    ctx.fillStyle = '#fff'
    ctx.fillText('⚠ MORALE CRITICAL', 20, canvas.height - 80)
  }
  
  // Center: Game over screens
  if (manager.gameStatus === 'won') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.95)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#ffd700'
    ctx.font = 'bold 48px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('VICTORY!', canvas.width / 2, canvas.height / 2 - 60)
    ctx.fillStyle = '#fff'
    ctx.font = '18px Arial'
    ctx.fillText(`Settlement population: ${state.population}`, canvas.width / 2, canvas.height / 2)
    ctx.fillText(`Wealth: ${Math.floor(state.wealth)}`, canvas.width / 2, canvas.height / 2 + 40)
    ctx.fillText(`Score: ${calculateSettlementScore(state)}`, canvas.width / 2, canvas.height / 2 + 80)
  } else if (manager.gameStatus === 'lost') {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.95)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = '#ff4444'
    ctx.font = 'bold 48px Arial'
    ctx.textAlign = 'center'
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2 - 60)
    ctx.fillStyle = '#fff'
    ctx.font = '18px Arial'
    let reason = 'Unknown'
    if (state.food <= 0) reason = 'Starvation'
    else if (state.morale <= 0) reason = 'Despair'
    else if (state.population <= 0) reason = 'Extinction'
    ctx.fillText(`Reason: ${reason}`, canvas.width / 2, canvas.height / 2)
    ctx.fillText(`Final day: ${state.day}`, canvas.width / 2, canvas.height / 2 + 40)
  }
}

/**
 * Pause the game.
 */
export function pauseGame(manager: GameManager): void {
  manager.isPaused = true
}

/**
 * Resume the game.
 */
export function resumeGame(manager: GameManager): void {
  manager.isPaused = false
}

/**
 * Restart the game.
 */
export function restartGame(manager: GameManager, newState: GameState): GameManager {
  return newGameManager(newState)
}
