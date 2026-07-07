import { describe, it, expect, beforeEach, vi } from 'vitest'
import { newGameState } from './util'
import { 
  newGazette, 
  addGazetteEntry, 
  getEntriesByDay,
  getEntriesByCategory,
  getMostImpactfulEntries,
  formatGazetteFrontPage,
} from './gazette'
import { 
  initAudioManager, 
  playSoundEffect, 
  startAmbientMusic,
  stopAmbientMusic,
  setAudioVolume,
  toggleAudio,
} from './audio'
import { 
  newHUD,
  togglePanel,
  formatResourcesPanel,
  formatPopulationPanel,
  formatMoralePanel,
  formatWeatherPanel,
  getPanelContent,
  getPanelAtCoord,
} from './hud'

describe('Phase 8: UI, Audio, Gazette', () => {
  
  let state = newGameState()
  
  beforeEach(() => {
    state = newGameState()
  })
  
  // ===== GAZETTE TESTS =====
  
  it('gazette initializes with motto and publisher', () => {
    const gazette = newGazette()
    
    expect(gazette.motto).toBeDefined()
    expect(gazette.publisher).toBeDefined()
    expect(typeof gazette.publisher).toBe('string')
  })
  
  it('gazette entries can be added', () => {
    const gazette = newGazette()
    
    addGazetteEntry(
      gazette,
      1,
      "Gold Found",
      "Miners strike a rich vein.",
      'economy',
      8
    )
    
    expect(gazette.entries.length).toBe(1)
    expect(gazette.entries[0].headline).toBe("Gold Found")
  })
  
  it('gazette entries can be retrieved by day', () => {
    const gazette = newGazette()
    
    addGazetteEntry(gazette, 1, "Event 1", "Body 1", 'other', 5)
    addGazetteEntry(gazette, 1, "Event 2", "Body 2", 'other', 5)
    addGazetteEntry(gazette, 2, "Event 3", "Body 3", 'other', 5)
    
    const day1Entries = getEntriesByDay(gazette, 1)
    expect(day1Entries.length).toBe(2)
    
    const day2Entries = getEntriesByDay(gazette, 2)
    expect(day2Entries.length).toBe(1)
  })
  
  it('gazette entries can be filtered by category', () => {
    const gazette = newGazette()
    
    addGazetteEntry(gazette, 1, "Fire!", "A building burns.", 'fire', 9)
    addGazetteEntry(gazette, 1, "Rain", "Blessed rain.", 'weather', 6)
    addGazetteEntry(gazette, 2, "Another Fire", "More burns.", 'fire', 8)
    
    const fireEntries = getEntriesByCategory(gazette, 'fire')
    expect(fireEntries.length).toBe(2)
    
    const weatherEntries = getEntriesByCategory(gazette, 'weather')
    expect(weatherEntries.length).toBe(1)
  })
  
  it('most impactful entries can be retrieved', () => {
    const gazette = newGazette()
    
    addGazetteEntry(gazette, 1, "Minor Event", "Low impact.", 'other', 2)
    addGazetteEntry(gazette, 1, "Major Event", "High impact.", 'other', 9)
    addGazetteEntry(gazette, 2, "Moderate Event", "Medium impact.", 'other', 5)
    
    const top = getMostImpactfulEntries(gazette, 2)
    expect(top.length).toBe(2)
    expect(top[0].impact).toBeGreaterThanOrEqual(top[1].impact)
  })
  
  it('gazette can be formatted as front page', () => {
    const gazette = newGazette()
    
    addGazetteEntry(gazette, 1, "Breaking News", "Something happened.", 'raid', 8)
    addGazetteEntry(gazette, 1, "Weather Report", "Clear skies.", 'weather', 3)
    
    const frontPage = formatGazetteFrontPage(gazette, 1)
    
    expect(typeof frontPage).toBe('string')
    expect(frontPage.length).toBeGreaterThan(0)
    expect(frontPage).toContain(gazette.publisher)
  })
  
  // ===== AUDIO TESTS =====
  
  it('audio manager initializes with enabled state', () => {
    // Skip if AudioContext not available (headless environment)
    if (typeof AudioContext === 'undefined') {
      expect(true).toBe(true)
      return
    }
    
    const audio = initAudioManager()
    expect(audio).toBeDefined()
    expect(audio.enabled).toBe(true)
    expect(audio.volume).toBe(0.5)
  })
  
  it('audio volume can be set', () => {
    if (typeof AudioContext === 'undefined') {
      expect(true).toBe(true)
      return
    }
    
    const audio = initAudioManager()
    
    setAudioVolume(audio, 0.8)
    expect(audio.volume).toBe(0.8)
    
    setAudioVolume(audio, 1.5) // Clamp to 1
    expect(audio.volume).toBe(1)
    
    setAudioVolume(audio, -0.5) // Clamp to 0
    expect(audio.volume).toBe(0)
  })
  
  it('audio can be toggled', () => {
    if (typeof AudioContext === 'undefined') {
      expect(true).toBe(true)
      return
    }
    
    const audio = initAudioManager()
    expect(audio.enabled).toBe(true)
    
    toggleAudio(audio)
    expect(audio.enabled).toBe(false)
    
    toggleAudio(audio)
    expect(audio.enabled).toBe(true)
  })
  
  it('sound effects can be played', () => {
    if (typeof AudioContext === 'undefined') {
      expect(true).toBe(true)
      return
    }
    
    const audio = initAudioManager()
    
    // These should not throw
    playSoundEffect(audio, 'raid')
    playSoundEffect(audio, 'fire')
    playSoundEffect(audio, 'duel')
    playSoundEffect(audio, 'disease')
    playSoundEffect(audio, 'population-increase')
    playSoundEffect(audio, 'gold-found')
    
    expect(true).toBe(true)
  })
  
  // ===== HUD TESTS =====
  
  it('HUD initializes with default panels', () => {
    const hud = newHUD()
    
    expect(hud.panels.size).toBeGreaterThan(0)
    expect(hud.panels.has('resources')).toBe(true)
    expect(hud.panels.has('population')).toBe(true)
    expect(hud.panels.has('weather')).toBe(true)
  })
  
  it('HUD panels can be toggled', () => {
    const hud = newHUD()
    
    const resourcesPanel = hud.panels.get('resources')
    expect(resourcesPanel?.visible).toBe(true)
    
    togglePanel(hud, 'resources')
    expect(resourcesPanel?.visible).toBe(false)
    
    togglePanel(hud, 'resources')
    expect(resourcesPanel?.visible).toBe(true)
  })
  
  it('resources panel formats correctly', () => {
    state.gold = 500
    state.wood = 200
    state.food = 150
    state.wealth = 850
    
    const content = formatResourcesPanel(state)
    
    expect(content).toContain('Gold')
    expect(content).toContain('Wood')
    expect(content).toContain('Food')
  })
  
  it('population panel formats correctly', () => {
    state.population = 25
    
    const content = formatPopulationPanel(state)
    
    expect(content).toContain('Population')
    expect(content).toContain('25')
  })
  
  it('morale panel shows correct status', () => {
    state.morale = 85
    const contentHigh = formatMoralePanel(state)
    expect(contentHigh).toContain('Hopeful')
    
    state.morale = 40
    const contentLow = formatMoralePanel(state)
    expect(contentLow).toContain('Troubled')
    
    state.morale = 15
    const contentVeryLow = formatMoralePanel(state)
    expect(contentVeryLow).toContain('Desperate')
  })
  
  it('weather panel formats correctly', () => {
    state.weather = 'rain'
    state.riverLevel = 0.7
    
    const content = formatWeatherPanel(state)
    
    expect(content).toContain('Rain')
    expect(typeof content).toBe('string')
  })
  
  it('panel content can be retrieved by ID', () => {
    const hud = newHUD()
    
    const resourceContent = getPanelContent(state, 'resources')
    expect(resourceContent.length).toBeGreaterThan(0)
    
    const populationContent = getPanelContent(state, 'population')
    expect(populationContent.length).toBeGreaterThan(0)
  })
  
  it('HUD hit detection works', () => {
    const hud = newHUD()
    
    // Panel at (0, 0) with size (0.2, 0.25)
    const panel = getPanelAtCoord(hud, 0.1, 0.1)
    expect(panel).toBeDefined()
    
    // Outside all panels
    const noPanel = getPanelAtCoord(hud, 0.5, 0.5)
    expect(noPanel).toBeNull()
  })
  
})
