/** Resident generation — P2: people, not meters. */
import { rng, rngInt, pick } from "./rng"
import type { Resident, Role, Trait, GameState } from "./types"

const FIRST = ["Jeb","Clara","Amos","Hattie","Silas","Mae","Ezra","Belle","Cole","Ruth","Wyatt","Ada","Gideon","Pearl","Lucius","Etta","Harlan","Josie","Obadiah","Nora","Emmett","Dulcie","Caleb","Vera","Roscoe","Ida","Tobias","Minnie","Zeke","Ora"]
const LAST = ["Mercer","Prescott","Colley","Vane","Dunmore","Harrow","Slade","Boone","Ketchum","Ashford","Pike","Rourke","Calder","Whitlow","Marsh","Granger","Doyle","Lasky","Trent","Vickers","Hobbs","Crane","Purdy","Stroud","Redd","Faulk","Nash","Quill","Barlow","Yates"]
const NICKS = ["Rattlesnake","Deacon","Lucky","Preach","Doc","Dusty","Whisper","Three-Card","Ironhead","Sparrow"]
const ROLES: Role[] = ["miner","miner","miner","miner","miner","miner","rancher","rancher","barkeep","deputy","doctor","preacher","gambler","merchant","merchant","drifter","drifter"]
const TRAITS: Trait[] = ["greedy","pious","hotheaded","cowardly","sly","loyal","drunkard","ambitious"]

export function generateResidents(): { residents: Resident[]; rivalId: string } {
  const n = rngInt(18, 22)
  const residents: Resident[] = []
  const usedNames = new Set<string>()
  for (let i = 0; i < n; i++) {
    let name = ""
    do { name = `${pick(FIRST)} ${pick(LAST)}` } while (usedNames.has(name))
    usedNames.add(name)
    const t1 = pick(TRAITS)
    let t2 = pick(TRAITS); while (t2 === t1) t2 = pick(TRAITS)
    residents.push({
      id: `r${i}`, name,
      nickname: rng() < 0.22 ? pick(NICKS) : undefined,
      role: i < ROLES.length ? ROLES[i] : pick(ROLES),
      grit: rngInt(1, 10),
      loyalty: rngInt(-1, 2),
      grudges: [], traits: [t1, t2],
      alive: true, outlaw: false, left: false,
    })
  }
  // The rival: prefer ambitious+sly; else force those traits on someone.
  let rival = residents.find(r => r.traits.includes("ambitious") && r.traits.includes("sly"))
  if (!rival) { rival = residents[rngInt(0, residents.length - 1)]; rival.traits = ["ambitious", "sly"] }
  rival.nickname = rival.nickname ?? "Rattlesnake"
  return { residents, rivalId: rival.id }
}

export function displayName(r: Resident): string {
  return r.nickname ? `${r.name.split(" ")[0]} "${r.nickname}" ${r.name.split(" ")[1]}` : r.name
}
export function alive(s: GameState): Resident[] { return s.residents.filter(r => r.alive && !r.left && !r.outlaw) }
export function byId(s: GameState, id: string): Resident | undefined { return s.residents.find(r => r.id === id) }
export function rival(s: GameState): Resident { return byId(s, s.rivalId)! }
export function randomOf(s: GameState, role?: string): Resident {
  const pool = alive(s).filter(r => (!role || r.role === role) && r.id !== s.rivalId)
  return pool.length ? pool[Math.floor(rng() * pool.length)] : alive(s)[0]
}
