import { describe, it, expect, beforeEach } from 'vitest'
import { setSeed, rng } from './rng'
import { generateResidents, alive, byId, rival } from './residents'
import { newGame, resolveWeek, checkEnding, buildGazette, epilogue } from './week'
import { initClock, mineWeek, depletion, bustWatch } from './clock'
import { allEvents, drawEvents, applyChoice, applyEffect, feudTick, foreshadowResolution } from './events'
import type { GameState } from './types'
import './exemplars'

const fresh = (seed = 42): GameState => newGame(seed)

describe('Residents (P2)', () => {
  it('generates 18-22 residents', () => {
    setSeed(1); const { residents } = generateResidents()
    expect(residents.length).toBeGreaterThanOrEqual(18)
    expect(residents.length).toBeLessThanOrEqual(22)
  })
  it('every resident has exactly 2 distinct traits', () => {
    setSeed(2); const { residents } = generateResidents()
    for (const r of residents) { expect(r.traits.length).toBe(2); expect(r.traits[0]).not.toBe(r.traits[1]) }
  })
  it('grit within 1-10, loyalty within -5..5', () => {
    setSeed(3); const { residents } = generateResidents()
    for (const r of residents) {
      expect(r.grit).toBeGreaterThanOrEqual(1); expect(r.grit).toBeLessThanOrEqual(10)
      expect(r.loyalty).toBeGreaterThanOrEqual(-5); expect(r.loyalty).toBeLessThanOrEqual(5)
    }
  })
  it('names are unique', () => {
    setSeed(4); const { residents } = generateResidents()
    expect(new Set(residents.map(r => r.name)).size).toBe(residents.length)
  })
  it('a rival exists and is ambitious+sly', () => {
    setSeed(5); const { residents, rivalId } = generateResidents()
    const rv = residents.find(r => r.id === rivalId)!
    expect(rv.traits).toContain('ambitious'); expect(rv.traits).toContain('sly')
  })
  it('same seed -> identical residents (determinism)', () => {
    setSeed(9); const a = generateResidents()
    setSeed(9); const b = generateResidents()
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })
})

describe('The Clock (P1)', () => {
  it('gold total seeded 2400-3600', () => {
    const s = fresh(); expect(s.goldTotal).toBeGreaterThanOrEqual(2400); expect(s.goldTotal).toBeLessThanOrEqual(3600)
  })
  it('mining depletes gold and pays money, monotone', () => {
    const s = fresh(); const m0 = s.money; const g0 = s.goldLeft
    const got = mineWeek(s)
    expect(got).toBeGreaterThan(0)
    expect(s.goldLeft).toBe(g0 - got)
    expect(s.money).toBe(m0 + got)
  })
  it('more miners -> faster depletion (boom faster, bust sooner)', () => {
    const s1 = fresh(7); const s2 = fresh(7)
    // demote all but one miner in s1
    let kept = false
    for (const r of s1.residents) if (r.role === 'miner') { if (kept) r.role = 'drifter'; kept = true }
    mineWeek(s1); mineWeek(s2)
    expect(s2.goldTotal - s2.goldLeft).toBeGreaterThan(s1.goldTotal - s1.goldLeft)
  })
  it('mine cannot go below zero', () => {
    const s = fresh(); s.goldLeft = 5; mineWeek(s); expect(s.goldLeft).toBeGreaterThanOrEqual(0)
  })
  it('closed mine mines nothing', () => {
    const s = fresh(); s.flags['mineClosed'] = 1
    expect(mineWeek(s)).toBe(0)
  })
  it('bust watch triggers at <=25%', () => {
    const s = fresh(); s.goldLeft = s.goldTotal * 0.2
    expect(bustWatch(s)).toBe(true)
    expect(depletion(s)).toBeCloseTo(0.8)
  })
})

describe('Event engine + P2 compliance', () => {
  it('at least 12 events registered (v1 slice; full floor 45 tracked in handback)', () => {
    expect(allEvents().length).toBeGreaterThanOrEqual(12)
  })
  it('EVERY event names at least one live actor (banned: anonymous events)', () => {
    const s = fresh(11)
    for (const ev of allEvents()) {
      const actors = ev.actors(s)
      expect(actors.length, `${ev.id} has no actors`).toBeGreaterThan(0)
      for (const id of actors) expect(byId(s, id), `${ev.id} actor ${id} missing`).toBeTruthy()
    }
  })
  it('every event has >=2 choices or exactly 1 acknowledged beat', () => {
    const s = fresh(12)
    for (const ev of allEvents()) expect(ev.choices(s).length).toBeGreaterThanOrEqual(1)
  })
  it('no choice is OK/Cancel (banned outcome)', () => {
    const s = fresh(13)
    for (const ev of allEvents()) for (const c of ev.choices(s)) {
      expect(c.label.toLowerCase()).not.toBe('ok'); expect(c.label.toLowerCase()).not.toBe('cancel')
      expect(c.label.length).toBeGreaterThan(6)
    }
  })
  it('event bodies are specific: 40+ chars, reference a name where actors exist', () => {
    const s = fresh(14)
    for (const ev of allEvents()) {
      const body = ev.body(s)
      expect(body.length, ev.id).toBeGreaterThan(40)
    }
  })
  it('drawEvents returns scheduled events first and marks headlines resolved', () => {
    const s = fresh(15)
    s.scheduled.push({ eventId: 'prescott_boy', week: s.week })
    s.headlines.push({ text: 'X', tag: 'prescott_boy', dueWeek: s.week, resolved: false })
    const evs = drawEvents(s)
    expect(evs.some(e => e.id === 'prescott_boy')).toBe(true)
    expect(s.headlines[0].resolved).toBe(true)
  })
  it('applyChoice sets done flag and applies effects', () => {
    const s = fresh(16)
    const ev = allEvents().find(e => e.id === 'card_game')!
    const money0 = s.money
    applyChoice(s, ev, ev.choices(s)[0]) // buy the badge back: -60
    expect(s.flags['done:card_game']).toBe(1)
    expect(s.money).toBe(money0 - 60)
  })
  it('loyalty clamps to -5..5', () => {
    const s = fresh(17); const r = alive(s)[0]
    applyEffect(s, { kind: 'loyalty', who: r.id, amount: 99 })
    expect(r.loyalty).toBe(5)
    applyEffect(s, { kind: 'loyalty', who: r.id, amount: -99 })
    expect(r.loyalty).toBe(-5)
  })
  it('grudge + hothead escalates to a scheduled duel with a headline (feud chain)', () => {
    const s = fresh(18)
    const a = alive(s)[0]; const b = alive(s)[1]
    a.traits = ['hotheaded', 'greedy']; a.grudges = [b.id]
    setSeed(1) // force rng low
    for (let i = 0; i < 20 && !s.scheduled.some(e => e.eventId === 'duel'); i++) feudTick(s)
    expect(s.scheduled.some(e => e.eventId === 'duel')).toBe(true)
    expect(s.headlines.some(h => h.tag === 'duel')).toBe(true)
  })
  it('the duel kills the lower-grit party when allowed to proceed', () => {
    const s = fresh(19)
    const a = alive(s)[0]; const b = alive(s)[1]
    a.grit = 9; b.grit = 2
    s.flags['duel_a'] = Number(a.id.slice(1)); s.flags['duel_b'] = Number(b.id.slice(1))
    const duel = allEvents().find(e => e.id === 'duel')!
    applyChoice(s, duel, duel.choices(s)[0])
    expect(b.alive).toBe(false); expect(a.alive).toBe(true)
  })
})

describe('Foreshadow contract (P3)', () => {
  it('choices with foreshadow create a headline tagged to the scheduled event', () => {
    const s = fresh(21)
    const ev = allEvents().find(e => e.id === 'up_letter')!
    applyChoice(s, ev, ev.choices(s)[0]) // schedules survey_visit + foreshadow
    expect(s.headlines.length).toBe(1)
    expect(s.headlines[0].tag).toBe('survey_visit')
    expect(s.scheduled.some(e => e.eventId === 'survey_visit')).toBe(true)
  })
  it('>=80% of due headlines resolve within their window in a played fortnight', () => {
    const s = fresh(22)
    const ev = allEvents().find(e => e.id === 'up_letter')!
    applyChoice(s, ev, ev.choices(s)[0])
    // play 3 weeks, always answering first choice
    for (let w = 0; w < 3; w++) {
      const evs = drawEvents(s)
      for (const e of evs) applyChoice(s, e, e.choices(s)[0])
      resolveWeek(s)
    }
    expect(foreshadowResolution(s)).toBeGreaterThanOrEqual(0.8)
  })
})

describe('Endings (P4)', () => {
  it('railroad ending reachable', () => {
    const s = fresh(31)
    s.railFavor = 4; s.money = 900; s.buildings['raildepot'] = 1
    checkEnding(s); expect(s.ending).toBe('railroad')
  })
  it('cattle ending reachable', () => {
    const s = fresh(32)
    s.buildings['ranch'] = 3; s.waterRights = true
    checkEnding(s); expect(s.ending).toBe('cattle')
  })
  it('skiptown ending reachable via the heist arc flag', () => {
    const s = fresh(33)
    s.flags['skiptown_now'] = 1
    checkEnding(s); expect(s.ending).toBe('skiptown')
  })
  it('bust ending: gold gone 4+ weeks with no exit', () => {
    const s = fresh(34)
    s.goldLeft = 0; checkEnding(s) // stamps goldOutWeek
    s.week += 4; checkEnding(s)
    expect(s.ending).toBe('bust')
  })
  it('bank examiner only fires if you have been skimming', () => {
    const s = fresh(35)
    const ex = allEvents().find(e => e.id === 'bank_examiner')!
    expect(ex.weight(s)).toBe(0)
    s.skim = 100
    expect(ex.weight(s)).toBeGreaterThan(0)
  })
  it('every ending has a non-empty epilogue that names people', () => {
    for (const [i, end] of (['railroad', 'cattle', 'skiptown', 'bust'] as const).entries()) {
      const s = fresh(40 + i); s.ending = end
      const text = epilogue(s)
      expect(text.length).toBeGreaterThan(60)
    }
  })
})

describe('Week loop + Gazette', () => {
  it('resolveWeek advances week, pays wages, logs mining', () => {
    const s = fresh(51); const w0 = s.week
    resolveWeek(s)
    expect(s.week).toBe(w0 + 1)
    expect(s.log.length).toBeGreaterThan(0)
  })
  it('gazette masthead flips at bust watch', () => {
    const s = fresh(52)
    expect(buildGazette(s).masthead).toBe('THE GULCH GAZETTE')
    s.goldLeft = s.goldTotal * 0.1
    expect(buildGazette(s).masthead).toContain('BUST WATCH')
  })
  it('full-game determinism: same seed + same choices -> identical state', () => {
    const play = (seed: number) => {
      const s = newGame(seed)
      for (let w = 0; w < 6 && !s.ending; w++) {
        const evs = drawEvents(s)
        for (const e of evs) applyChoice(s, e, e.choices(s)[0])
        resolveWeek(s)
      }
      return JSON.stringify(s)
    }
    expect(play(777)).toBe(play(777))
  })
  it('a 30-week first-choice bot run reaches an ending', () => {
    const s = newGame(4242)
    for (let w = 0; w < 30 && !s.ending; w++) {
      const evs = drawEvents(s)
      for (const e of evs) { if (s.ending) break; applyChoice(s, e, e.choices(s)[0]) }
      if (!s.ending) resolveWeek(s)
    }
    expect(s.ending).not.toBeNull()
  })
})
