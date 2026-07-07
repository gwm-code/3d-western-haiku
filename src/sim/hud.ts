/**
 * HUD system: on-screen overlay UI for real-time state display.
 * Renders settlement stats, alerts, and controls.
 */

import type { GameState } from './types'

/**
 * HUD panel definition.
 */
export interface HUDPanel {
  id: string
  title: string
  visible: boolean
  x: number // Position in normalized coords [0, 1]
  y: number
  width: number
  height: number
}

/**
 * HUD state.
 */
export interface HUDState {
  panels: Map<string, HUDPanel>
  showFPS: boolean
  showDebug: boolean
  selectedBuilding: string | null
}

/**
 * Initialize HUD.
 */
export function newHUD(): HUDState {
  const panels = new Map<string, HUDPanel>()
  
  // Default panels
  const defaultPanels = [
    { id: 'resources', title: 'Resources', x: 0, y: 0, w: 0.2, h: 0.25 },
    { id: 'population', title: 'Population', x: 0, y: 0.25, w: 0.2, h: 0.2 },
    { id: 'morale', title: 'Morale', x: 0, y: 0.45, w: 0.2, h: 0.15 },
    { id: 'weather', title: 'Weather', x: 0.8, y: 0, w: 0.2, h: 0.15 },
    { id: 'alerts', title: 'Alerts', x: 0.8, y: 0.15, w: 0.2, h: 0.35 },
  ]
  
  for (const p of defaultPanels) {
    panels.set(p.id, {
      id: p.id,
      title: p.title,
      visible: true,
      x: p.x,
      y: p.y,
      width: p.w,
      height: p.h,
    })
  }
  
  return {
    panels,
    showFPS: false,
    showDebug: false,
    selectedBuilding: null,
  }
}

/**
 * Toggle panel visibility.
 */
export function togglePanel(hud: HUDState, panelId: string): void {
  const panel = hud.panels.get(panelId)
  if (panel) {
    panel.visible = !panel.visible
  }
}

/**
 * Format resource display text.
 */
export function formatResourcesPanel(state: GameState): string {
  return `Gold: ${Math.floor(state.gold)}
Wood: ${Math.floor(state.wood)}
Food: ${Math.floor(state.food)}
Wealth: ${Math.floor(state.wealth)}`
}

/**
 * Format population display text.
 */
export function formatPopulationPanel(state: GameState): string {
  return `Population: ${state.population}
Active: ${state.settlers.size}
Herds: ${state.herds.size}`
}

/**
 * Format morale display text.
 */
export function formatMoralePanel(state: GameState): string {
  let status = 'Hopeful'
  if (state.morale < 30) status = 'Desperate'
  else if (state.morale < 50) status = 'Troubled'
  else if (state.morale < 70) status = 'Content'
  
  const bar = '█'.repeat(Math.floor(state.morale / 10)) +
              '░'.repeat(10 - Math.floor(state.morale / 10))
  
  return `${status}
[${bar}] ${Math.floor(state.morale)}%`
}

/**
 * Format weather display text.
 */
export function formatWeatherPanel(state: GameState): string {
  let desc = 'Clear skies'
  
  switch (state.weather) {
    case 'rain':
      desc = 'Raining'
      break
    case 'drought':
      desc = 'Drought (Day ${state.droughtTurns})'
      break
    case 'duststorm':
      desc = 'Dust storm'
      break
  }
  
  const riverBar = '▓'.repeat(Math.floor(state.riverLevel * 10))
  
  return `${desc}
River: ${riverBar} ${Math.floor(state.riverLevel * 100)}%`
}

/**
 * Format alerts panel (active dangers).
 */
export function formatAlertsPanel(state: GameState): string {
  const alerts: string[] = []
  
  if (state.morale < 30) alerts.push("⚠ Morale Critical")
  if (state.food < state.population * 0.5) alerts.push("⚠ Food Shortage")
  if (state.gold < 100) alerts.push("⚠ Low Gold")
  if (state.weather === 'drought' && state.riverLevel < 0.3) {
    alerts.push("⚠ Severe Drought")
  }
  
  if (alerts.length === 0) {
    return "No alerts."
  }
  
  return alerts.join("\n")
}

/**
 * Get HUD panel content by ID.
 */
export function getPanelContent(state: GameState, panelId: string): string {
  switch (panelId) {
    case 'resources':
      return formatResourcesPanel(state)
    case 'population':
      return formatPopulationPanel(state)
    case 'morale':
      return formatMoralePanel(state)
    case 'weather':
      return formatWeatherPanel(state)
    case 'alerts':
      return formatAlertsPanel(state)
    default:
      return ""
  }
}

/**
 * Render HUD to text (for debugging/logging).
 */
export function renderHUDAsText(state: GameState, hud: HUDState): string[] {
  const lines: string[] = []
  
  for (const [id, panel] of hud.panels) {
    if (!panel.visible) continue
    
    lines.push(`--- ${panel.title} ---`)
    lines.push(getPanelContent(state, id))
    lines.push("")
  }
  
  return lines
}

/**
 * Check if a screen coordinate is within a HUD panel.
 */
export function getPanelAtCoord(
  hud: HUDState,
  screenX: number,
  screenY: number
): HUDPanel | null {
  // Normalize to [0, 1]
  const normX = screenX
  const normY = screenY
  
  for (const panel of hud.panels.values()) {
    if (!panel.visible) continue
    
    if (
      normX >= panel.x &&
      normX < panel.x + panel.width &&
      normY >= panel.y &&
      normY < panel.y + panel.height
    ) {
      return panel
    }
  }
  
  return null
}
