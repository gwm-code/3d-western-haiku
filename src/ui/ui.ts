/** DOM UI: HUD (with THE CLOCK), event cards, the Gazette, endings. */
import type { GameState, GameEvent, Choice } from '../sim/types'
import { buildGazette, epilogue, alive, depletion, bustWatch } from '../sim/week'
import { displayName, byId } from '../sim/residents'
import { applyChoice } from '../sim/events'

const $ = (id: string) => document.getElementById(id)!

export function renderHUD(s: GameState): void {
  const pct = Math.max(0, Math.round((1 - depletion(s)) * 100))
  $('hud').innerHTML =
    `<b>DEADWATER GULCH</b> — Week ${s.week}${bustWatch(s) ? ' · <span style="color:#e8c447">BUST WATCH</span>' : ''}<br>` +
    `$${s.money} · ${alive(s).length} souls<br>` +
    `Gold remaining <div id="goldbar"><div id="goldfill" style="width:${pct}%"></div></div>`
}

function modal(html: string, onDone?: () => void): void {
  const m = $('modal')
  m.style.display = 'flex'
  m.innerHTML = `<div class="card">${html}</div>`
  if (onDone) {
    const btn = document.createElement('button')
    btn.textContent = 'Continue ▸'
    btn.onclick = () => { m.style.display = 'none'; onDone() }
    m.querySelector('.card')!.appendChild(btn)
  }
}

/** Present event cards one at a time; call done() after the last choice. */
export function presentEvents(s: GameState, events: GameEvent[], done: () => void): void {
  const next = (i: number): void => {
    if (i >= events.length || s.ending) { $('modal').style.display = 'none'; done(); return }
    const ev = events[i]
    const actors = ev.actors(s).map(id => byId(s, id)).filter(Boolean)
    const actorLine = actors.length ? `<div class="small">Concerning: ${actors.map(a => displayName(a!)).join(' · ')}</div>` : ''
    const choices = ev.choices(s)
    const m = $('modal')
    m.style.display = 'flex'
    m.innerHTML = `<div class="card"><div class="mast">EVENT · WEEK ${s.week}</div><h1>${ev.title}</h1>${actorLine}<div class="body">${ev.body(s)}</div></div>`
    const card = m.querySelector('.card')!
    choices.forEach((c: Choice) => {
      const b = document.createElement('button')
      b.textContent = c.label
      b.onclick = () => { applyChoice(s, ev, c); next(i + 1) }
      card.appendChild(b)
    })
  }
  next(0)
}

export function presentGazette(s: GameState, done: () => void): void {
  const g = buildGazette(s)
  const fore = g.forecasts.length
    ? g.forecasts.map(h => `<div class="headline">▸ ${h.text}</div>`).join('')
    : '<div class="small">No wires this week. Enjoy it while it lasts.</div>'
  modal(
    `<div class="mast">EST. 1874 · ONE BIT</div><h1>${g.masthead}</h1>` +
    `<div class="small">${g.meter}</div>` +
    `<h2>THE WEEK PAST</h2><div class="body">${g.outcomes.map(o => `• ${o}`).join('<br>')}</div>` +
    `<h2>THE WIRE SAYS</h2>${fore}`,
    done,
  )
}

export function presentEnding(s: GameState): void {
  const titles: Record<string, string> = {
    railroad: 'THE RAILROAD COMES', cattle: 'A CATTLE TOWN NOW', skiptown: 'GONE BY MORNING', bust: 'GHOST TOWN',
  }
  modal(`<div class="mast">FINAL EDITION</div><h1>${titles[s.ending!]}</h1><div class="body">${epilogue(s)}</div><div class="small">Seed ${s.seed} · ${s.week} weeks. Reload to run it different.</div>`)
}
