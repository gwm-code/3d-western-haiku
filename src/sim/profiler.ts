/**
 * Performance profiling system.
 * Tracks FPS, GPU passes, memory, render time.
 */

/**
 * Performance metrics snapshot.
 */
export interface PerformanceMetrics {
  fps: number // Current frames per second
  frameTime: number // Milliseconds per frame
  gpuFrames: number // GPU rendering passes
  memoryMB: number // Heap memory (if available)
  timestamp: number // When sampled
}

/**
 * Performance profiler (for monitoring over time).
 */
export interface Profiler {
  samples: PerformanceMetrics[]
  startTime: number
  frameCount: number
  lastFrameTime: number
}

/**
 * Create new profiler.
 */
export function newProfiler(): Profiler {
  return {
    samples: [],
    startTime: performance.now(),
    frameCount: 0,
    lastFrameTime: performance.now(),
  }
}

/**
 * Record a frame sample.
 */
export function sampleFrame(profiler: Profiler, gpuPasses: number = 0): void {
  const now = performance.now()
  const frameTime = now - profiler.lastFrameTime
  const fps = 1000 / frameTime
  
  const metrics: PerformanceMetrics = {
    fps: Math.round(fps),
    frameTime: Math.round(frameTime * 100) / 100,
    gpuFrames: gpuPasses,
    memoryMB: 0,
    timestamp: now,
  }
  
  // Try to get memory usage (non-standard)
  if ((performance as any).memory) {
    metrics.memoryMB = Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024)
  }
  
  profiler.samples.push(metrics)
  profiler.lastFrameTime = now
  profiler.frameCount++
  
  // Keep last 300 samples (5 seconds @ 60fps)
  if (profiler.samples.length > 300) {
    profiler.samples = profiler.samples.slice(-300)
  }
}

/**
 * Get average FPS over recent samples.
 */
export function getAverageFPS(profiler: Profiler, sampleCount: number = 60): number {
  const recent = profiler.samples.slice(-sampleCount)
  if (recent.length === 0) return 0
  
  const avgFPS = recent.reduce((sum, s) => sum + s.fps, 0) / recent.length
  return Math.round(avgFPS)
}

/**
 * Get min/max FPS over recent samples.
 */
export function getFPSBounds(profiler: Profiler, sampleCount: number = 60): {min: number, max: number} {
  const recent = profiler.samples.slice(-sampleCount)
  if (recent.length === 0) return { min: 0, max: 0 }
  
  const fps = recent.map(s => s.fps)
  return {
    min: Math.min(...fps),
    max: Math.max(...fps),
  }
}

/**
 * Get frame time percentile (e.g., 95th percentile = max acceptable frame time).
 */
export function getFrameTimePercentile(profiler: Profiler, percentile: number = 95): number {
  const recent = profiler.samples.slice(-300)
  if (recent.length === 0) return 0
  
  const frameTimes = recent.map(s => s.frameTime).sort((a, b) => a - b)
  const idx = Math.floor(frameTimes.length * (percentile / 100))
  return frameTimes[idx]
}

/**
 * Check if performance is acceptable (60+ FPS average).
 */
export function isPerformanceAcceptable(profiler: Profiler, minFPS: number = 60): boolean {
  const avgFPS = getAverageFPS(profiler, 60)
  return avgFPS >= minFPS
}

/**
 * Get performance report as text.
 */
export function getPerformanceReport(profiler: Profiler): string {
  const avgFPS = getAverageFPS(profiler, 60)
  const { min, max } = getFPSBounds(profiler, 60)
  const p95 = getFrameTimePercentile(profiler, 95)
  
  const lines = [
    `=== PERFORMANCE REPORT ===`,
    `Average FPS: ${avgFPS}`,
    `Range: ${min}–${max} FPS`,
    `Frame time (p95): ${p95.toFixed(2)}ms`,
    `Total samples: ${profiler.samples.length}`,
    `Session time: ${((profiler.lastFrameTime - profiler.startTime) / 1000).toFixed(1)}s`,
  ]
  
  if (profiler.samples.length > 0) {
    const latest = profiler.samples[profiler.samples.length - 1]
    lines.push(`Memory: ${latest.memoryMB} MB`)
  }
  
  lines.push(isPerformanceAcceptable(profiler, 60) ? 
    "✓ Performance acceptable" :
    "✗ Performance below target")
  
  return lines.join("\n")
}
