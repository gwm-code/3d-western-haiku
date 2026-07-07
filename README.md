# DEADWATER GULCH

A real-time 3D frontier settlement sim (browser, WebGPU). A 1870s high-desert valley town-building game with dynamic economies, raids, fires, droughts, and boom-bust cycles. Built to reference standards: Red Dead Redemption 2's environmental light + weathering, Dorfromantik's diorama legibility, Frostpunk's economic pressure, Deadwood's frontier drama.

**Status:** Phase 0 complete (harness, RNG, determinism). Phase 1–9 in progress.

---

## Development

```bash
# Install
npm install

# Dev server (Vite)
npm run dev

# Build (tsc --noEmit + vite)
npm run build

# Run tests
npm test

# Test runner UI
npm run test -- --ui
```

## Architecture

- **`src/sim/`** — Pure TypeScript simulation logic (no DOM, no three.js)
  - `types.ts` — GameState, Building, Settler interfaces (hard names, do not rename)
  - `rng.ts` — Deterministic seeded RNG (Lehmer, 32-bit)
  - `util.ts` — save/load, serialization, fail-loud error handling
  - `phase*.test.ts` — Unit tests per system

- **`src/graphics/`** — Three.js WebGPU rendering
  - Terrain, sky, water, vegetation, buildings, agents
  - TSL shader code for light transport, LOD, instancing

- **`src/main.ts`** — Entry point with WebGPU init and QA harness
  - `window.qa = { error, state, setState, fps, gpuPasses }`

- **`docs/`**
  - `THREE-NOTES.md` — Verified three.js 0.184.0 API facts (append-only)
  - `MEMORY.md` — Hard rules, floors, phase tracker, self-score

- **Build:** Vite (esnext target) + strict TypeScript
- **Runtime:** three.js 0.184.0 only (WebGPURenderer + TSL)
- **Testing:** Vitest + Playwright (determinism tests, graphics QA)

---

## Guardrails (non-negotiable)

- **No design down-trade.** 2D/canvas = banned. Real 3D terrain, photoreal light, moving agents.
- **Strict types.** `strict: true`, no `any` (except 1 save-parse boundary).
- **Deterministic sim.** `rng()` only. `setSeed(day)` → reproducible economics & events.
- **Fail-loud.** No swallowed errors. `failLoud(msg)` on corruption.
- **Hard rules in code.** `BDEF` economy constants marked `// BALANCE?` if tuning. Floors machine-checked.
- **Gate discipline.** Each phase ends with quantified acceptance test. Failing gate = stop & report (not paper-over).

---

## Phase Checklist

| Phase | Goal | Gate Check | Status |
|-------|------|-----------|--------|
| 0 | Harness + RNG + determinism | `tsc --noEmit`, 10 tests green | ✅ Done |
| 1 | Terrain, sky, light | Golden-hour shadow chroma >= 12 | ⬜ TODO |
| 2 | Water + vegetation | 400k grass, 6 species, 60 fps | ⬜ TODO |
| 3 | Buildings + terrace | 14 silhouettes, slope handling | ⬜ TODO |
| 4 | Agents + nav | 120 settlers + 30 cattle, no river drown | ⬜ TODO |
| 5 | Economy sim | 20+ Vitest specs, production deltas | ⬜ TODO |
| 6 | Western systems | Raids, duels, law, reputation | ⬜ TODO |
| 7 | Weather/fire/disease | Drought, storms, emissive fire, plague | ⬜ TODO |
| 8 | UI/audio/Gazette | 20-min 6x run, Gulch Gazette, SFX | ⬜ TODO |
| 9 | Performance | 60 fps @1440p, pixel-equiv optimizations | ⬜ TODO |

---

## One-Second Rule (Category-Error Test)

A viewer's eye should NOT snag within 1 second on:
1. Flat black or desaturated-gray shadows (chroma < 12)
2. A town that reads as generic-fantasy rather than frontier
3. Cardboard-flat terrain (heightmap with sprites)
4. Buildings that look *placed* rather than *grown into* land
5. A static world (no dust, motion, life)

**Measured by pixel assertions** in the QA harness—never by eyeball.

---

## References (from the plan)

The spec was distilled from four Claude Code skills:
- `threejs-tsl-webgpu` — Three.js WebGPU + TSL best practices
- `threejs-photoreal-worlds` — Photoreal light, material weathering
- `graphics-qa-harness` — Automated pixel-level testing
- `autonomous-project-briefs` — Planning & execution discipline

Consult these directly for three.js API knowledge gaps (the API churns; memorized knowledge rots).

---

## Save Format

```json
{
  "saveVersion": 1,
  "day": 42,
  "gold": 5000,
  "population": 23,
  "buildings": [ { "id": "...", "type": "cabin", ... } ],
  "settlers": [ { "id": "...", "pos": { "x": 0, "y": 0, "z": 0 }, ... } ],
  "...": "..."
}
```

Stored in `localStorage` as `deadwater_save_v1`. Corrupt saves trigger new game (no silent crash).

---

**Executor's repo:** `/home/claude/deadwater-gulch`  
**Last phase completed:** Phase 0 (2025-07-07)  
**Do not skip phases. Do not trade the design down. Record gaps, not inflated scores.**
