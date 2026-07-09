/**
 * APPENDIX A — the ten exemplar events, shipped verbatim. These are the quality bar:
 * every future event is judged against this prose. Tone bible: laconic, dusty, specific.
 * Never "the townsfolk are unhappy" — always a name, a knife, a debt.
 */
import { register } from './events'
import { byId, rival, displayName, alive } from './residents'
import { bustWatch } from './clock'
import type { GameState } from './types'

const dn = (s: GameState, id: string) => { const r = byId(s, id); return r ? displayName(r) : 'a stranger' }
const widow = (s: GameState) => alive(s).find(r => r.role === 'merchant') ?? alive(s)[0]
const preacher = (s: GameState) => alive(s).find(r => r.role === 'preacher') ?? alive(s)[0]
const gambler = (s: GameState) => alive(s).find(r => r.role === 'gambler') ?? alive(s)[0]
const deputy = (s: GameState) => alive(s).find(r => r.role === 'deputy') ?? alive(s)[0]
const doctor = (s: GameState) => alive(s).find(r => r.role === 'doctor') ?? alive(s)[0]
const ranchers = (s: GameState) => alive(s).filter(r => r.role === 'rancher')

// 1 — THE CLAIM JUMPER
register({
  id: 'claim_jumper', arc: 'gold', title: 'THE CLAIM JUMPER',
  actors: s => [s.rivalId, widow(s).id],
  weight: s => (s.week >= 2 && s.week <= 6 ? 3 : 0),
  body: s => `${displayName(rival(s))} says the Widow ${widow(s).name.split(' ')[1]}'s claim was never filed proper. He's got three men on her fence line and a lawyer's letter from Carson City. The Widow's got a shotgun across her knees and your last promise in her pocket. The men at the assay office have stopped weighing and started watching.`,
  choices: s => [
    { label: `The letter's legal. Let it stand.`, effects: [
      { kind: 'loyalty', who: 'rival', amount: 1 },
      { kind: 'loyalty', who: widow(s).id, amount: -4 },
      { kind: 'leaves', who: widow(s).id },
      { kind: 'schedule', eventId: 'prescott_boy', inWeeks: 3 },
    ], foreshadow: `${widow(s).name.split(' ')[1].toUpperCase()} BOY SEEN RIDING WEST WITH HARD MEN` },
    { label: `Tear the letter up in front of him.`, effects: [
      { kind: 'loyalty', who: 'rival', amount: -3 },
      { kind: 'grudge', who: 'rival', vs: widow(s).id },
      { kind: 'loyalty', who: widow(s).id, amount: 3 },
    ] },
    { label: `Buy the claim yourself. Double price.`, effects: [
      { kind: 'money', amount: -400 },
      { kind: 'loyalty', who: widow(s).id, amount: 2 },
      { kind: 'flag', flag: 'rival_files_it_away' },
    ] },
  ],
})

// follow-up: the widow's boy
register({
  id: 'prescott_boy', arc: 'gold', title: 'THE BOY COMES BACK WRONG',
  actors: s => [s.rivalId],
  weight: () => 0, // scheduled only
  body: s => `The Widow's boy is back, sixteen and armored in someone else's anger. He rode in with two of ${displayName(rival(s))}'s dismissed men and didn't take his hat off in the church. The deputy says he's been asking which nights the assay office keeps its gold.`,
  choices: () => [
    { label: `Talk to him yourself, founder to orphan.`, effects: [{ kind: 'flag', flag: 'boy_talked_down' }] },
    { label: `Have the deputy run all three out of town.`, effects: [{ kind: 'outlaw', who: 'random:drifter' }] },
  ],
})

// 2 — HIGH WATER MARK
register({
  id: 'high_water', arc: 'water', title: 'HIGH WATER MARK',
  actors: s => ranchers(s).slice(0, 2).map(r => r.id),
  weight: s => (s.week >= 3 && ranchers(s).length >= 2 ? 2.5 : 0),
  body: s => { const [a, b] = ranchers(s); return `Second dry week. The river is down to its brown bones and ${a.name} has dammed the upstream fork for his cattle. ${b.name} rode up there yesterday with a pick and came back with a split lip. The mine needs that water too, and everybody knows whose name is on the water gate.` },
  choices: s => { const [a, b] = ranchers(s); return [
    { label: `Make them share it. Stand there while they do.`, effects: [
      { kind: 'loyalty', who: a.id, amount: -1 }, { kind: 'loyalty', who: b.id, amount: 1 },
    ] },
    { label: `Buy the water rights outright. It's your river now.`, effects: [
      { kind: 'money', amount: -600 }, { kind: 'waterRights' },
      { kind: 'loyalty', who: a.id, amount: -2 },
    ], foreshadow: `WATER GATE CHANGES HANDS — CATTLE MEN CIRCLE THE COURTHOUSE` },
    { label: `Let the river decide.`, effects: [
      { kind: 'grudge', who: a.id, vs: b.id }, { kind: 'grudge', who: b.id, vs: a.id },
    ] },
  ] },
})

// 3 — THE SERMON AGAINST THE SALOON
register({
  id: 'sermon', arc: 'culture', title: 'THE SERMON AGAINST THE SALOON',
  actors: s => [preacher(s).id],
  weight: s => (s.week >= 2 ? 2 : 0),
  body: s => { const drunks = alive(s).filter(r => r.traits.includes('drunkard')).slice(0, 3); const names = drunks.map(d => d.name.split(' ')[0]).join(', ') || 'half the mine shift'; return `${displayName(preacher(s))} named names from the pulpit Sunday: ${names}. Said the saloon takes wages Monday and souls by Friday. The barkeep stood in the back with his arms crossed, counting the congregation like a till.` },
  choices: s => [
    { label: `Stand with the preacher. Close the saloon Sundays.`, effects: [
      { kind: 'loyalty', who: preacher(s).id, amount: 3 },
      { kind: 'loyalty', who: 'random:barkeep', amount: -3 },
      { kind: 'flag', flag: 'dry_sundays' },
    ] },
    { label: `Buy the front pew AND a round for the house.`, effects: [
      { kind: 'money', amount: -80 },
      { kind: 'loyalty', who: preacher(s).id, amount: 1 },
    ] },
    { label: `A town runs on thirst. Say nothing.`, effects: [
      { kind: 'loyalty', who: preacher(s).id, amount: -2 },
      { kind: 'grudge', who: preacher(s).id, vs: 'random:barkeep' },
    ] },
  ],
})

// 4 — A LETTER FROM UNION PACIFIC
register({
  id: 'up_letter', arc: 'railroad', title: 'A LETTER FROM UNION PACIFIC',
  actors: s => [deputy(s).id],
  weight: s => (s.week >= 4 && !s.flags['done:up_letter'] ? 3 : 0),
  body: () => `Cream paper, Omaha postmark. A survey team will pass through Thursday "assessing grades and dispositions" — meaning the ground and the people both. They want beds, quiet, and no card tables. What they report back decides whether steel ever comes up this valley.`,
  choices: () => [
    { label: `Roll out everything. Best rooms, dry town, band at dusk.`, effects: [
      { kind: 'money', amount: -150 }, { kind: 'railFavor', amount: 2 },
      { kind: 'schedule', eventId: 'survey_visit', inWeeks: 1 },
    ], foreshadow: `SURVEY MEN DUE THURSDAY — MAIN STREET GETS A BROOM` },
    { label: `They're guests, not royalty. Business as usual.`, effects: [
      { kind: 'railFavor', amount: 0 },
      { kind: 'schedule', eventId: 'survey_visit', inWeeks: 1 },
    ], foreshadow: `RAILROAD MEN TO SEE DEADWATER AS SHE IS` },
  ],
})
register({
  id: 'survey_visit', arc: 'railroad', title: 'THE SURVEY TEAM',
  actors: s => [gambler(s).id],
  weight: () => 0,
  body: s => `They came, they measured, they drank coffee like it owed them money. Then ${displayName(gambler(s))} got the young one into a friendly game and now the boy is down two months' pay and talking about "irregularities" in his report.`,
  choices: s => [
    { label: `Make the gambler give it back. All of it.`, effects: [
      { kind: 'railFavor', amount: 2 }, { kind: 'loyalty', who: gambler(s).id, amount: -2 },
    ] },
    { label: `A bet's a bet. See them to the road.`, effects: [ { kind: 'railFavor', amount: -2 } ] },
  ],
})

// 5 — THE CARD GAME
register({
  id: 'card_game', arc: 'feud', title: 'THE CARD GAME',
  actors: s => [gambler(s).id, deputy(s).id],
  weight: s => (s.week >= 2 ? 2 : 0),
  body: s => `${displayName(gambler(s))} won the deputy's badge in a hand of stud last night — pinned it to his own vest and wore it to breakfast. ${deputy(s).name} says it was collateral, not a bet. The sheriff wants it settled quiet, before the town decides the law can be won at cards.`,
  choices: s => [
    { label: `Buy the badge back. Price of peace.`, effects: [
      { kind: 'money', amount: -60 },
    ] },
    { label: `Make him give it back at gunpoint of the law.`, effects: [
      { kind: 'grudge', who: gambler(s).id, vs: deputy(s).id },
      { kind: 'loyalty', who: gambler(s).id, amount: -2 },
    ] },
    { label: `Let him keep it a week. Let the town laugh.`, effects: [
      { kind: 'loyalty', who: deputy(s).id, amount: -3 },
      { kind: 'grudge', who: deputy(s).id, vs: gambler(s).id },
    ] },
  ],
})

// THE DUEL (scheduled by feudTick — cinematic endpoint of feud chains)
register({
  id: 'duel', arc: 'feud', title: 'HIGH NOON',
  actors: s => [`r${s.flags['duel_a'] ?? 0}`, `r${s.flags['duel_b'] ?? 1}`],
  weight: () => 0,
  body: s => `${dn(s, `r${s.flags['duel_a'] ?? 0}`)} and ${dn(s, `r${s.flags['duel_b'] ?? 1}`)} have set it for noon on the main street. The barkeep is taking wagers with one hand and pouring courage with the other. Nobody has sent for you, which is its own kind of message.`,
  choices: s => { const a = `r${s.flags['duel_a'] ?? 0}`, b = `r${s.flags['duel_b'] ?? 1}`
    const ga = byId(s, a)?.grit ?? 5, gb = byId(s, b)?.grit ?? 5
    const loser = ga >= gb ? b : a, winner = ga >= gb ? a : b
    return [
      { label: `Let them settle it. Watch from the porch.`, effects: [
        { kind: 'dies', who: loser },
        { kind: 'loyalty', who: winner, amount: -1 },
        { kind: 'flag', flag: 'duel_seen' },
      ] },
      { label: `Have the deputy break it up. Fines for both.`, effects: [
        { kind: 'money', amount: 40 },
        { kind: 'loyalty', who: a, amount: -1 }, { kind: 'loyalty', who: b, amount: -1 },
      ] },
    ] },
})

// 6 — QUARANTINE
register({
  id: 'quarantine', arc: 'disease', title: 'QUARANTINE',
  actors: s => [doctor(s).id],
  weight: s => (s.week >= 5 ? 1.6 : 0),
  body: s => `${displayName(doctor(s))} came out of the third tent on miners' row with his sleeves rolled and his face closed. Camp fever. He wants the mine shut a week and every man's bedding burned. The mine boss counted what a week costs and offered the doctor a number instead.`,
  choices: s => [
    { label: `Close the mine. Burn the bedding. A week is a week.`, effects: [
      { kind: 'flag', flag: 'mineClosed', amount: 1 },
      { kind: 'schedule', eventId: 'mine_reopens', inWeeks: 1 },
      { kind: 'loyalty', who: doctor(s).id, amount: 3 },
    ], foreshadow: `MINE DARK A WEEK — FEVER ANSWERS TO NO PAYROLL` },
    { label: `Half shifts, masks, and pray.`, effects: [
      { kind: 'goldRate', amount: -4 },
      { kind: 'dies', who: 'random:miner' },
      { kind: 'loyalty', who: doctor(s).id, amount: -2 },
    ] },
  ],
})
register({
  id: 'mine_reopens', arc: 'disease', title: 'THE MINE REOPENS',
  actors: s => [doctor(s).id],
  weight: () => 0,
  body: s => `Seven days dark and the fever broke with nobody under a stone for it. ${displayName(doctor(s))} signed the all-clear and the shift bell rang before he'd finished his signature.`,
  choices: () => [ { label: `Back to work.`, effects: [{ kind: 'flag', flag: 'mineClosed', amount: 0 }] } ],
})

// 7 — THE ASSAY LIES
register({
  id: 'assay_lies', arc: 'gold', title: 'THE ASSAY LIES',
  actors: s => [alive(s).find(r => r.role === 'merchant' && r.traits.includes('sly'))?.id ?? widow(s).id],
  weight: s => (s.week >= 3 && alive(s).some(r => r.role === 'merchant') ? 2 : 0),
  body: s => { const m = alive(s).find(r => r.role === 'merchant' && r.traits.includes('sly')) ?? widow(s); return `A miner weighed his dust twice — once at ${m.name.split(' ')[1]}'s counter, once on the doctor's pharmacy scale. Four percent light, every time, for who knows how long. The word isn't out yet. It's in your hand.` },
  choices: s => { const m = alive(s).find(r => r.role === 'merchant' && r.traits.includes('sly')) ?? widow(s); return [
    { label: `Name him on the notice board. Let the town do the rest.`, effects: [
      { kind: 'loyalty', who: m.id, amount: -5 },
      { kind: 'grudge', who: m.id, vs: 'rival' },
      { kind: 'money', amount: 120 },
    ] },
    { label: `Quiet word, full restitution, and he owes you.`, effects: [
      { kind: 'money', amount: 200 }, { kind: 'loyalty', who: m.id, amount: 2 },
      { kind: 'flag', flag: 'merchant_owned' },
    ] },
  ] },
})

// 8 — DRIVE SEASON
register({
  id: 'drive_season', arc: 'cattle', title: 'DRIVE SEASON',
  actors: s => [ranchers(s)[0]?.id ?? alive(s)[0].id],
  weight: s => (s.week >= 4 ? 2 : 0),
  body: () => `Dust on the south road that isn't weather: four hundred head and eleven drovers who've been paid in advance and know it. They'll spend a week's wages in one night — and leave the kind of week behind that takes two sermons to clean up.`,
  choices: s => [
    { label: `Open the town. Every till in Deadwater says yes.`, effects: [
      { kind: 'money', amount: 350 },
      { kind: 'grudge', who: 'random:miner', vs: 'random:drifter' },
      { kind: 'schedule', eventId: 'drover_trouble', inWeeks: 1 },
    ], foreshadow: `DROVERS IN TOWN — SHERIFF DOUBLES THE NIGHT WATCH` },
    { label: `Water them at the edge of town and move them on.`, effects: [
      { kind: 'money', amount: 60 },
      { kind: 'loyalty', who: ranchers(s)[0]?.id ?? alive(s)[0].id, amount: -2 },
    ] },
    { label: `Buy forty head. Start the town's own herd.`, effects: [
      { kind: 'money', amount: -320 }, { kind: 'ranch', amount: 1 },
    ] },
  ],
})
register({
  id: 'drover_trouble', arc: 'cattle', title: 'WHAT THE DROVERS LEFT',
  actors: s => [alive(s).find(r => r.role === 'barkeep')?.id ?? alive(s)[0].id],
  weight: () => 0,
  body: () => `The drovers are gone. They left money in every till, a knife-mark on the saloon bar, one broken engagement, and a miner who swears — with witnesses — that he'll kill the next man who mentions Tuesday.`,
  choices: () => [ { label: `Note who's nursing what, and watch them.`, effects: [{ kind: 'flag', flag: 'watched' }] } ],
})

// 9 — THE BANK EXAMINER (SKIP TOWN arc — the only event that knows your secret)
register({
  id: 'bank_examiner', arc: 'heist', title: 'THE BANK EXAMINER',
  actors: s => [s.rivalId],
  weight: s => (s.skim > 0 ? 4 : 0),
  body: s => `A neat little man off the stage with territorial credentials and a ledger under his arm like a Bible. He's asking about deposits, withdrawals, and "founder's discretionary accounts." ${displayName(rival(s))} met him at the stage and shook his hand a beat too long. Somebody wrote a letter.`,
  choices: () => [
    { label: `Open the books. All of them. Come clean.`, effects: [
      { kind: 'money', amount: -300 }, { kind: 'flag', flag: 'came_clean' }, { kind: 'skim', amount: 0 },
    ] },
    { label: `A donation to the territorial widows' fund, perhaps.`, effects: [
      { kind: 'money', amount: -200 }, { kind: 'flag', flag: 'examiner_bought' },
    ], foreshadow: `EXAMINER DEPARTS SATISFIED — LEDGERS 'IN GOOD ORDER'` },
    { label: `The books burned in the '74 fire. Tragic.`, effects: [
      { kind: 'flag', flag: 'examiner_suspicious' },
      { kind: 'schedule', eventId: 'bank_examiner_returns', inWeeks: 2 },
    ], foreshadow: `EXAMINER TO RETURN WITH MARSHALS — 'ROUTINE', HE SAYS` },
  ],
})
register({
  id: 'bank_examiner_returns', arc: 'heist', title: 'THE EXAMINER RETURNS',
  actors: s => [s.rivalId],
  weight: () => 0,
  body: () => `Two marshals this time, and the little man isn't smiling. Whatever you're going to do about the money, the window for doing it quietly closed on the morning stage.`,
  choices: () => [
    { label: `Tonight, then. Saddle the fast horse.`, effects: [{ kind: 'flag', flag: 'skiptown_now' }] },
    { label: `Surrender the skim. Take the disgrace standing.`, effects: [{ kind: 'money', amount: -500 }, { kind: 'skim', amount: 0 }] },
  ],
})

// 10 — LAST VEIN (bust-watch exemplar; fires at ~25%)
register({
  id: 'last_vein', arc: 'clock', title: 'LAST VEIN',
  actors: s => [alive(s).find(r => r.role === 'miner')?.id ?? alive(s)[0].id],
  weight: s => (bustWatch(s) && !s.flags['done:last_vein'] ? 10 : 0),
  body: s => { const m = alive(s).find(r => r.role === 'miner') ?? alive(s)[0]; return `${m.name} came up from the deep gallery holding a chunk of quartz shot through with color and didn't smile once. "That's her," he said. "The last good vein. Six weeks of it, maybe eight." By supper every man in town had done the same arithmetic on the same napkin.` },
  choices: () => [
    { label: `Say it plain at the town meeting. Deadwater plans its next life.`, effects: [
      { kind: 'flag', flag: 'bust_public' }, { kind: 'railFavor', amount: 1 },
    ], foreshadow: `FOUNDER NAMES THE HOUR — 'THIS TOWN OUTLIVES ITS GOLD'` },
    { label: `Keep it quiet. Buy time, and maybe the bank's contents.`, effects: [
      { kind: 'flag', flag: 'bust_secret' }, { kind: 'skim', amount: 150 },
    ] },
  ],
})
