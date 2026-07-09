/** Week loop: plan -> resolve -> Gazette (the heartbeat, P3). */
import type { GameState, EndingId, Headline } from './types'
import { setSeed, rngInt } from './rng'
import { generateResidents, alive, displayName, rival } from './residents'
import { initClock, mineWeek, bustWatch, depletion } from './clock'
import { feudTick, foreshadowResolution } from './events'
import './exemplars'

export function newGame(seed: number): GameState {
  setSeed(seed)
  const { residents, rivalId } = generateResidents()
  const s: GameState = {
    seed, week: 1, money: 250,
    goldTotal: 0, goldLeft: 0, goldRate: 0,
    residents, rivalId,
    flags: {}, scheduled: [], headlines: [], log: [],
    buildings: { saloon: 1, bank: 1 },
    waterRights: false, railFavor: 0, skim: 0,
    ending: null,
  }
  initClock(s)
  return s
}

/** Resolve the week after the player has answered their event cards. */
export function resolveWeek(s: GameState): void {
  s.log = []
  const mined = mineWeek(s)
  if (mined > 0) s.log.push(`The mine gave up ${mined} oz. ${bustWatch(s) ? 'The men count what is left out loud now.' : ''}`)
  else if (s.flags['mineClosed']) s.log.push('The mine stood dark all week, by your order.')
  else if (s.goldLeft <= 0) s.log.push('The mine gave nothing. There is nothing left to give.')
  // wages: $2 per living resident
  const pop = alive(s).length
  const wages = pop * 2
  s.money -= wages
  if (s.money < 0) s.log.push('Wages went unpaid. Men remember that longer than sermons.')
  feudTick(s)
  checkEnding(s)
  s.week += 1
}

export function checkEnding(s: GameState): void {
  if (s.ending) return
  if (s.flags['skiptown_now']) { s.ending = 'skiptown'; return }
  if (s.railFavor >= 4 && s.money >= 800 && (s.buildings['raildepot'] ?? 0) >= 1) { s.ending = 'railroad'; return }
  if ((s.buildings['ranch'] ?? 0) >= 3 && s.waterRights) { s.ending = 'cattle'; return }
  if (s.goldLeft <= 0 && s.week - (s.flags['goldOutWeek'] ?? setGoldOut(s)) >= 4) { s.ending = 'bust'; return }
}
function setGoldOut(s: GameState): number { s.flags['goldOutWeek'] = s.week; return s.week }

export function epilogue(s: GameState): string {
  const r = rival(s)
  const dead = s.residents.filter(x => !x.alive).map(x => x.name)
  const gone = s.residents.filter(x => x.left || x.outlaw).map(x => x.name)
  const stayed = alive(s).length
  const roll = (l: string[]) => (l.length ? l.join(', ') : 'no one')
  switch (s.ending) {
    case 'railroad': return `The train came up the valley on a Tuesday, and Deadwater Gulch did not die. ${stayed} souls stood at the platform. Buried on the hill: ${roll(dead)}. Gone before the whistle: ${roll(gone)}. ${r.alive && !r.outlaw ? displayName(r) + ' bought the first ticket out, which everyone agreed was best.' : ''}`
    case 'cattle': return `The gold went, and the town shrank to fit its new clothes: grass, water, and ${s.buildings['ranch']} ranches under one brand. ${stayed} stayed. The hill keeps ${roll(dead)}. The road took ${roll(gone)}.`
    case 'skiptown': return `You rode out at three in the morning with $${s.money + s.skim} in the saddlebags and the town's trust somewhere behind you on the road. They'll tell it differently in Deadwater — if there's still a Deadwater to tell it in. You betrayed: ${roll(gone.concat(dead))}.`
    case 'bust': return `The gold ran out and nothing was ready to catch the town when it fell. GHOST TOWN, the territorial paper wrote, one word, like a verdict. ${roll(dead)} under stones. ${roll(gone)} scattered to other men's booms. ${stayed} stayed to spite you, or because staying was all they had left.`
    default: return ''
  }
}

/** Build the weekly Gazette: last week's log + unresolved forecasts + threat lines. */
export interface Gazette { masthead: string; outcomes: string[]; forecasts: Headline[]; meter: string }
export function buildGazette(s: GameState): Gazette {
  const forecasts = s.headlines.filter(h => !h.resolved && h.dueWeek >= s.week).slice(-4)
  const pct = Math.round((1 - depletion(s)) * 100)
  return {
    masthead: bustWatch(s) ? 'THE GULCH GAZETTE — BUST WATCH EDITION' : 'THE GULCH GAZETTE',
    outcomes: s.log.length ? s.log : ['A quiet week, which in this country is its own headline.'],
    forecasts,
    meter: `Assay office estimates ${pct}% of the vein remains. Week ${s.week}.`,
  }
}

export { foreshadowResolution, alive, displayName, bustWatch, depletion }
