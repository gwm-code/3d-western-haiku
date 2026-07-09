/** Event engine — events are the game content (P2/P3). */
import type { GameState, GameEvent, Choice, Effect, Headline } from './types'
import { byId, rival, randomOf, alive } from './residents'
import { rng } from './rng'

const REGISTRY = new Map<string, GameEvent>()
export function register(ev: GameEvent): void { REGISTRY.set(ev.id, ev) }
export function getEvent(id: string): GameEvent | undefined { return REGISTRY.get(id) }
export function allEvents(): GameEvent[] { return [...REGISTRY.values()] }

/** Pick this week's event cards: scheduled ones first, then 1-2 weighted draws. */
export function drawEvents(s: GameState, max = 3): GameEvent[] {
  const out: GameEvent[] = []
  // Due scheduled events fire first (this is what makes foreshadowing honest).
  const due = s.scheduled.filter(e => e.week <= s.week)
  s.scheduled = s.scheduled.filter(e => e.week > s.week)
  for (const d of due) {
    const ev = REGISTRY.get(d.eventId)
    if (ev && ev.weight(s) >= 0) out.push(ev) // scheduled events fire even at weight 0
    markResolved(s, d.eventId)
  }
  // Weighted random draws to fill.
  const pool = allEvents().filter(e => !out.includes(e) && e.weight(s) > 0 && !s.flags[`done:${e.id}`])
  while (out.length < Math.min(max, out.length + 2) && pool.length) {
    const total = pool.reduce((a, e) => a + e.weight(s), 0)
    let roll = rng() * total
    let idx = 0
    for (; idx < pool.length; idx++) { roll -= pool[idx].weight(s); if (roll <= 0) break }
    const ev = pool.splice(Math.min(idx, pool.length - 1), 1)[0]
    out.push(ev)
    if (out.length >= max) break
  }
  return out
}

export function applyChoice(s: GameState, ev: GameEvent, choice: Choice): void {
  s.flags[`done:${ev.id}`] = 1
  for (const fx of choice.effects) applyEffect(s, fx)
  if (choice.foreshadow) {
    // find the scheduled effect's week for the tag
    const sched = choice.effects.find(e => e.kind === 'schedule')
    const due = s.week + (sched?.inWeeks ?? 2)
    s.headlines.push({ text: choice.foreshadow, tag: sched?.eventId ?? ev.id, dueWeek: due, resolved: false })
  }
}

function resolveWho(s: GameState, who?: string): string | undefined {
  if (!who) return undefined
  if (who === 'rival') return s.rivalId
  if (who.startsWith('random:')) return randomOf(s, who.slice(7)).id
  return who
}

export function applyEffect(s: GameState, fx: Effect): void {
  const whoId = resolveWho(s, fx.who)
  const r = whoId ? byId(s, whoId) : undefined
  switch (fx.kind) {
    case 'money': s.money += fx.amount ?? 0; break
    case 'loyalty': if (r) r.loyalty = Math.max(-5, Math.min(5, r.loyalty + (fx.amount ?? 0))); break
    case 'grudge': if (r && fx.vs) { const v = resolveWho(s, fx.vs); if (v && !r.grudges.includes(v)) r.grudges.push(v) } break
    case 'outlaw': if (r) { r.outlaw = true; s.log.push(`${r.name} rode out to join the outlaws.`) } break
    case 'leaves': if (r) { r.left = true; s.log.push(`${r.name} packed up and left Deadwater.`) } break
    case 'dies': if (r) { r.alive = false; s.log.push(`${r.name} was buried on the hill.`) } break
    case 'schedule': if (fx.eventId) s.scheduled.push({ eventId: fx.eventId, week: s.week + (fx.inWeeks ?? 2) }); break
    case 'flag': if (fx.flag) s.flags[fx.flag] = fx.amount ?? 1; break
    case 'goldRate': s.goldRate = Math.max(2, s.goldRate + (fx.amount ?? 0)); break
    case 'waterRights': s.waterRights = true; break
    case 'ranch': s.buildings['ranch'] = (s.buildings['ranch'] ?? 0) + (fx.amount ?? 1); break
    case 'railFavor': s.railFavor += fx.amount ?? 1; break
    case 'skim': s.skim += fx.amount ?? 0; s.money += fx.amount ?? 0; break
  }
}

function markResolved(s: GameState, tag: string): void {
  for (const h of s.headlines) if (h.tag === tag && !h.resolved) h.resolved = true
}

/** Weekly feud tick: grudges between hotheads escalate toward duels. */
export function feudTick(s: GameState): void {
  for (const r of alive(s)) {
    if (!r.grudges.length) continue
    const target = byId(s, r.grudges[0])
    if (!target || !target.alive || target.left) { r.grudges.shift(); continue }
    if (r.traits.includes('hotheaded') && rng() < 0.3) {
      // schedule a duel unless one is already pending
      if (!s.scheduled.some(e => e.eventId === 'duel')) {
        s.flags['duel_a'] = Number(r.id.slice(1)); s.flags['duel_b'] = Number(target.id.slice(1))
        s.scheduled.push({ eventId: 'duel', week: s.week + 1 })
        s.headlines.push({ text: `TALK OF PISTOLS: ${r.name.toUpperCase()} AND ${target.name.toUpperCase()} PAST WORDS NOW`, tag: 'duel', dueWeek: s.week + 1, resolved: false })
      }
    }
  }
}

/** P3 contract measurement: fraction of due headlines that resolved on time. */
export function foreshadowResolution(s: GameState): number {
  const due = s.headlines.filter(h => h.dueWeek <= s.week)
  if (!due.length) return 1
  return due.filter(h => h.resolved).length / due.length
}

export { rival }
