export type Role = "miner"|"rancher"|"barkeep"|"deputy"|"doctor"|"preacher"|"gambler"|"merchant"|"drifter"
export type Trait = "greedy"|"pious"|"hotheaded"|"cowardly"|"sly"|"loyal"|"drunkard"|"ambitious"
export type EndingId = "railroad"|"cattle"|"skiptown"|"bust"

export interface Resident {
  id: string; name: string; nickname?: string
  role: Role
  grit: number          // 1-10
  loyalty: number       // -5..+5, moves ONLY via chosen events
  grudges: string[]     // resident ids
  traits: Trait[]       // exactly 2
  alive: boolean; outlaw: boolean; left: boolean
}

export interface Effect {
  kind: "money"|"loyalty"|"grudge"|"outlaw"|"leaves"|"dies"|"schedule"|"flag"|"goldRate"|"waterRights"|"ranch"|"railFavor"|"skim"
  amount?: number
  who?: string
  vs?: string
  eventId?: string
  inWeeks?: number
  flag?: string
}

export interface Choice { label: string; effects: Effect[]; foreshadow?: string }

export interface GameEvent {
  id: string; arc: string; title: string
  body: (s: GameState) => string
  actors: (s: GameState) => string[]
  choices: (s: GameState) => Choice[]
  weight: (s: GameState) => number
}

export interface Headline { text: string; tag: string; dueWeek: number; resolved: boolean }

export interface GameState {
  seed: number
  week: number
  money: number
  goldTotal: number; goldLeft: number
  goldRate: number
  residents: Resident[]
  rivalId: string
  flags: Record<string, number>
  scheduled: { eventId: string; week: number }[]
  headlines: Headline[]
  log: string[]
  buildings: Record<string, number>
  waterRights: boolean; railFavor: number; skim: number
  ending: EndingId | null
}
