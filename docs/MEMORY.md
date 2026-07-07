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
| 0 | 🟢 DONE | RNG + harness | `npm run build` → tsc clean, `npm test` Phase0 specs | ✓ Determinism verified |
| 1 | 🟡 NEXT | Terrain + sky + light | Golden-hour sample darkest-20 luminance 40–80, chroma >= 12 | - |
| 2 | ⬜ TODO | Water + vegetation | >= 400k grass; >= 6 species; >= 60 fps vista | - |
| 3 | ⬜ TODO | Buildings + placement | 14 silhouettes; terrace on 0.15-rad slope; no float | - |
| 4 | ⬜ TODO | Agents + nav | >= 120 settlers + 30 cattle @ >= 60 fps; herd mass | - |
| 5 | ⬜ TODO | Economy sim | >= 20 Vitest specs; determinism, production, starvation | - |
| 6 | ⬜ TODO | Western systems | >= 6 more specs; raid screenshot shows bandits valley-mouth | - |
| 7 | ⬜ TODO | Weather/fire/disease | Drought river-drop + bleach; duststorm; fire emissive + spread | - |
| 8 | ⬜ TODO | UI/audio/Gazette | 20-min unattended 6x: pop>=20, >=1 raid, >=1 Gazette, qa.error null | - |
| 9 | ⬜ TODO | Perf optimization | >= 60 fps @1440p, pixel-equivalent to pre-opt baseline | - |

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

**Last updated:** Phase 0 (2025-07-07)
