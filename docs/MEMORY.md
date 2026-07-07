# MEMORY — Hard Rules & Progress

**Execution started:** 2025-07-07

## Hard Rules (Banned Outcomes)

These are copied verbatim from PLAN-deadwater-gulch.md § Guardrails. Do not skip or lower.

- Runtime dependencies: **only** `three@0.184.0` (pinned). Dev: vite, typescript, vitest, @types/three@0.184.1, @webgpu/types, playwright. Nothing else.
- **Do not trade the design down** to simpler visuals (2D/canvas is banned).
- `sim/` imports neither `three` nor the DOM. All randomness via `rng()`.
- `strict: true` TypeScript; no `any` except the one save-parse boundary.
- No swallowed exceptions; use `failLoud()`.
- Do not reorder phases or skip a gate. A failing gate is stop-and-report, not paper-over.
- Do not rename fields in data shapes or signatures.
- Do not rebalance `BDEF`/economy constants (mark `// BALANCE?` if tuning).
- For unfamiliar three/TSL API: read impl in node_modules/three AND @types decl. Consult skills before writing.
- If blocked: stop and report exact phase, step number, blocker.

## Quantitative Floors (Under-Delivery = Failure)

| Metric | Floor | Evidence |
|--------|-------|----------|
| Rendered vegetation | >= 400,000 grass instances | `stats.counters.grass` check |
| FPS steady state | >= 60 fps @ 1440p (M1-class GPU) | Benchmark bookmark |
| Day simulation | >= 1 cycle (24h sim) deterministic | `setSeed` → same event log |
| Building types | >= 14 distinct silhouettes | Art gating via visual test |
| Settler count | >= 120 active + 30 cattle | Nav + collision test @ >= 60 fps |
| Vitest specs | >= 40 total (6+ per system) | `npm test` passing count |
| Win condition | Pop >= 60 + no fatal event | End-to-end 30-min run |
| Golden-hour light | Darkest shadow chroma >= 12/255 | Pixel sampling in QA harness |

Category-error acceptance test ("one-second rule"):
1. No flat black/desaturated-gray shadows
2. Town reads as frontier, not generic-fantasy
3. Terrain is real 3D, not heightmap with sprites
4. Buildings terrace into land, not placed on slopes
5. World has motion (dust, herds, settlers, train)

## Pillars & Operational Tests

**A. Valley, not grid** → water flows to lowest channel; no building on slope > maxSlope without terrace
**B. Light tells time/mood** → golden-hour shadowed ground has chroma >= 12/255
**C. Frontier lawless by structure** → outlaw pressure monotone fn of (wealth + vice)
**D. Nothing static** → >= 1 class of macro-motion on screen at all times
**E. Boom and bust** → game reaching turn cap must experience both boom and bust
**F. Earned measurable beauty** → all art gates are numeric assertions, never eyeball

## Phase Progress & Verdicts

| Phase | Status | Entry Verdict | Gate Check | Exit Verdict |
|-------|--------|---------------|-----------:|--------------|
| 0 | 🟢 DONE | RNG + harness | Determinism | ✓ 10 tests |
| 1 | 🟢 DONE | Terrain + sky + light | Perlin, river, mesh | ✓ 11 tests |
| 2 | 🟢 DONE | Water + vegetation | Animation, 6 species | ✓ 3 tests |
| 3 | 🟢 DONE | Buildings + placement | 14 types, terrace | ✓ 8 tests |
| 4 | 🟢 DONE | Agents + nav | A*, settlers, cattle | ✓ 10 tests |
| 5 | 🟢 DONE | Economy sim | Production, boom/bust | ✓ 12 tests |
| 6 | 🟡 NEXT | Western systems | Raids, duels, law | - |
| 7 | ⬜ TODO | Weather/fire/disease | Drought, storms, fire | - |
| 8 | ⬜ TODO | UI/audio/Gazette | HUD, SFX, Gazette | - |
| 9 | ⬜ TODO | Perf optimization | 60 fps @1440p | - |

## Self-Score Template (fill at Phase 9)

(0=tech-demo, 3=shipped-indie, 5=reference-grade)

- **A. Valley-not-grid** __/5 · Evidence:
- **B. Light/time/mood** __/5 · Evidence:
- **C. Lawless-by-structure** __/5 · Evidence:
- **D. Nothing-static** __/5 · Evidence:
- **E. Boom-and-bust** __/5 · Evidence:
- **F. Measurable-beauty** __/5 · Evidence:

**Overall execution health:** [TBD at Phase 9]

---

**Last updated:** Phase 5 (2025-07-07, 54/54 tests passing)
