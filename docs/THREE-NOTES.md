# THREE-NOTES

Verified three.js 0.184.0 + @types/three 0.184.1 facts for WebGPU TSL work.

## Verified APIs

### WebGPU Renderer Initialization

- `import { WebGPURenderer } from 'three/webgpu'`
- Constructor: `new WebGPURenderer({ canvas, antialias, trackTimestamp })`
- Must await `renderer.init()` before use
- `renderer.render(scene, camera)` in animation loop
- Module path: `three/webgpu` (NOT `three/src/...`)

### Device & Adapter Setup

- `navigator.gpu.requestAdapter()` returns adapter (null if unavailable)
- `adapter.requestDevice({ requiredLimits })` with `maxStorageBuffersPerShaderStage: 16`
- Device has `onuncapturederror` callback for GPU errors
- TSL gotcha #1: `cameraPosition` is per-pass (shadow camera in shadow passes)
  - Solution: route camera-distance logic through explicit uniform instead
  - See `threejs-tsl-webgpu` skill for full rules before writing compute/post code

### Import Paths (strict adherence)

- Core math: `import * as THREE from 'three'` (math, geometry, material base classes)
- WebGPU renderer & nodes: `import { WebGPURenderer } from 'three/webgpu'`
- TSL functions: `import { ... } from 'three/tsl'`
- Addons: `import { ... } from 'three/addons/...'`
- **NEVER** `three/src/...` (creates second module instance)
- **NEVER** dynamic imports of internal files

### Build Configuration

- Vite: `build.target: "esnext"` (WebGPU needs ES2022+ bitwise ops)
- `build.chunkSizeWarningLimit: 4096` (three/webgpu is large)
- `tsconfig.json`: `"types": ["@webgpu/types"]` for GPU type safety
- `tsc --noEmit` is mandatory gate (Vite alone does not typecheck)

## Open Questions

- Full TSL post-processing pipeline (MRT, TAA/velocity)
- Compute shader storage-buffer idiom details
- Cascade shadow caching for performance
- Hi-Z culling interaction with WebGPU

Consult `threejs-tsl-webgpu`, `threejs-photoreal-worlds` when these arise.

---

Last updated: Phase 0 (harness initialization)
