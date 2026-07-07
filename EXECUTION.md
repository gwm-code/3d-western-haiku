# DEADWATER GULCH — Execution Log

## Phase 0 ✅ COMPLETE

**Date:** 2025-07-07  
**Status:** All gates passed

### What was built:

1. **Project skeleton**
   - Vite + TypeScript (strict) with esnext target
   - three.js 0.184.0 pinned (no version drift)
   - Vitest + Playwright dev stack
   - Clean separation: `sim/` (pure TS, no DOM/three), `graphics/`, `ui/`

2. **Deterministic RNG**
   - 32-bit Lehmer multiplier (seed → reproducible sequence)
   - `setSeed(day)` for gameplay determinism
   - Utility functions: `rng()`, `rngInt()`, `rngBool()`, `rngGauss()`, `rngWeighted()`, `rngShuffle()`
   - All sim randomness routed through single source

3. **State management**
   - `GameState` typed interface (Map-based collections for proper semantics)
   - `serializeState()` → JSON for saves
   - `deserializeState()` with validation (no silent corruption)
   - `cloneState()` for test round-trips
   - localStorage integration with fallback to new game

4. **WebGPU harness**
   - `WebGPURenderer` initialized with device error reporting
   - QA interface exposed: `window.qa = { error, state, setState, fps, gpuPasses }`
   - Canvas boot validates adapter → device → renderer
   - Placeholder animation loop ready for graphics

5. **Test suite (Phase 0)**
   - 10 specs: RNG sequences, bounds, probability, serialization, clone, error handling
   - All tests green; determinism verified (same seed = same output)
   - Test infrastructure ready for Phase 1+ (40+ specs planned)

### Build status:

```
$ npm run build
> tsc --noEmit && vite build
✓ TypeScript clean
✓ Vite build: 179KB (three) + 548KB (app) gzipped

$ npm test
Test Files  1 passed (1)
Tests  10 passed (10)
```

### Documentation:

- `docs/THREE-NOTES.md`: Verified three.js 0.184.0 facts (import paths, renderer init, TSL gotchas)
- `docs/MEMORY.md`: Hard rules, quantitative floors, phase progress table, self-score template
- `.gitignore`: Production-ready excludes

### Next (Phase 1):

Terrain generation + Perlin noise heightmap + river carving + sky dome + directional light  
Golden-hour sampling gate: `darkest-20 shadows have chroma >= 12/255`

---

**Commit hash:** fce8569  
**Repo:** /home/claude/deadwater-gulch  
**Status:** Ready to push to remote
