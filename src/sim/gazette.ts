/**
 * Gazette system: in-game newspaper tracking settlement history.
 * Major events (raids, fires, duels, deaths) are logged and retrievable.
 */

import type { GameState } from './types'

/**
 * Gazette entry (news story).
 */
export interface GazetteEntry {
  day: number
  headline: string
  body: string
  category: 'raid' | 'fire' | 'duel' | 'disease' | 'weather' | 'population' | 'economy' | 'other'
  impact: number // 1–10, how significant
}

/**
 * Gazette tracking all historic events.
 */
export interface Gazette {
  entries: GazetteEntry[]
  motto: string // Settlement slogan
  publisher: string // Name of gazette
}

/**
 * Initialize Gazette.
 */
export function newGazette(): Gazette {
  return {
    entries: [],
    motto: "Truth in the Dust",
    publisher: "Deadwater Gulch Gazette",
  }
}

/**
 * Add entry to Gazette.
 */
export function addGazetteEntry(
  gazette: Gazette,
  day: number,
  headline: string,
  body: string,
  category: GazetteEntry['category'],
  impact: number = 5
): void {
  const entry: GazetteEntry = {
    day,
    headline,
    body,
    category,
    impact: Math.max(1, Math.min(10, impact)),
  }
  
  gazette.entries.push(entry)
  
  // Keep latest 50 entries
  if (gazette.entries.length > 50) {
    gazette.entries = gazette.entries.slice(-50)
  }
}

/**
 * Get all entries from a specific day.
 */
export function getEntriesByDay(gazette: Gazette, day: number): GazetteEntry[] {
  return gazette.entries.filter(e => e.day === day)
}

/**
 * Get entries by category.
 */
export function getEntriesByCategory(
  gazette: Gazette,
  category: GazetteEntry['category']
): GazetteEntry[] {
  return gazette.entries.filter(e => e.category === category)
}

/**
 * Get most impactful entries (for featured section).
 */
export function getMostImpactfulEntries(gazette: Gazette, count: number = 5): GazetteEntry[] {
  return [...gazette.entries]
    .sort((a, b) => b.impact - a.impact)
    .slice(0, count)
}

/**
 * Get entries from a date range.
 */
export function getEntriesByRange(
  gazette: Gazette,
  fromDay: number,
  toDay: number
): GazetteEntry[] {
  return gazette.entries.filter(e => e.day >= fromDay && e.day <= toDay)
}

/**
 * Format Gazette as readable text (like a newspaper front page).
 */
export function formatGazetteFrontPage(gazette: Gazette, currentDay: number): string {
  const lines: string[] = []
  
  // Header
  lines.push("=" .repeat(60))
  lines.push(`  ${gazette.publisher}`)
  lines.push(`  Day ${currentDay}`)
  lines.push(`  "${gazette.motto}"`)
  lines.push("=" .repeat(60))
  lines.push("")
  
  // Most impactful stories this week
  const weekStart = Math.max(0, currentDay - 7)
  const weekEntries = getEntriesByRange(gazette, weekStart, currentDay)
    .sort((a, b) => b.impact - a.impact)
    .slice(0, 3)
  
  if (weekEntries.length > 0) {
    lines.push("HEADLINES")
    lines.push("-".repeat(60))
    for (const entry of weekEntries) {
      lines.push(`[Day ${entry.day}] ${entry.headline}`)
      lines.push(`${entry.body.substring(0, 80)}...`)
      lines.push("")
    }
  }
  
  // Weather summary
  lines.push("WEATHER")
  lines.push("-".repeat(60))
  const weatherEntries = getEntriesByCategory(gazette, 'weather')
    .slice(-1)
  if (weatherEntries.length > 0) {
    lines.push(weatherEntries[0].body)
  } else {
    lines.push("No weather reports.")
  }
  lines.push("")
  
  // Population update
  lines.push("POPULATION")
  lines.push("-".repeat(60))
  const popEntries = getEntriesByCategory(gazette, 'population')
    .slice(-1)
  if (popEntries.length > 0) {
    lines.push(popEntries[0].body)
  } else {
    lines.push("Population steady.")
  }
  lines.push("")
  
  return lines.join("\n")
}

/**
 * Generate a daily summary for Gazette.
 */
export function generateDailySummary(state: GameState, day: number, gazette: Gazette): void {
  // This is called at end of day; entries have already been added by event systems
  // This just ensures we have a summary entry
  
  const dayEntries = getEntriesByDay(gazette, day)
  
  if (dayEntries.length === 0) {
    // Quiet day
    addGazetteEntry(
      gazette,
      day,
      "Quiet Day in Town",
      "The town went about its business without incident.",
      'other',
      1
    )
  }
}
