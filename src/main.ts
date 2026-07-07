import * as THREE from 'three'
import { WebGPURenderer } from 'three/webgpu'
import type { GameState } from './sim/types'
import { newGameState, serializeState, deserializeState } from './sim/util'
import { setSeed } from './sim/rng'
import { generateTerrain } from './sim/terrain'
import { setupTerrainGraphics } from './graphics/terrain'
import type { TerrainGraphics } from './graphics/terrain'
import { setupWaterGraphics, updateWater } from './graphics/water'
import type { WaterGraphics } from './graphics/water'
import { setupVegetationGraphics } from './graphics/vegetation'
import type { VegetationGraphics } from './graphics/vegetation'
import { newMotionActors, updateMotionActors } from './graphics/actors'
import type { MotionActors } from './graphics/actors'
import type { GameManager } from './sim/gamemanager'
import { newGameManager, tickGame, renderHUDOverlay, restartGame } from './sim/gamemanager'

/**
 * QA harness interface (exposed to console/tests).
 */
interface QAHarness {
  error: string | null
  state: GameState | null
  setState: (partial: Partial<GameState>) => void
  screenshot: (filename?: string) => Promise<Blob>
  fps: number
  gpuPasses: number
}

declare global {
  interface Window {
    qa: QAHarness
  }
}

class DeadwaterGulch {
  private renderer: WebGPURenderer | null = null
  private scene: THREE.Scene | null = null
  private camera: THREE.PerspectiveCamera | null = null
  private canvas: HTMLCanvasElement | null = null
  private state: GameState
  private gameManager: GameManager | null = null
  private frameCount = 0
  private lastFpsUpdate = Date.now()
  private fps = 0
  private terrain: TerrainGraphics | null = null
  private water: WaterGraphics | null = null
  private vegetation: VegetationGraphics | null = null
  private motionActors: MotionActors | null = null

  constructor() {
    this.state = this.loadState()
    setSeed(this.state.day) // Deterministic based on day
  }

  private loadState(): GameState {
    try {
      const saved = localStorage.getItem('deadwater_save_v1')
      if (saved) {
        return deserializeState(saved)
      }
    } catch (e) {
      console.warn('Save load failed, starting fresh:', e)
    }
    return newGameState()
  }

  private saveState() {
    try {
      localStorage.setItem('deadwater_save_v1', serializeState(this.state))
    } catch (e) {
      console.error('Save failed:', e)
    }
  }

  private setState(partial: Partial<GameState>) {
    this.state = { ...this.state, ...partial }
  }

  async init() {
    const canvas = document.getElementById('canvas') as HTMLCanvasElement
    if (!canvas) throw new Error('No canvas element')
    this.canvas = canvas

    // Initialize game manager
    this.gameManager = newGameManager(this.state)

    // Initialize WebGPU renderer
    const adapter = await navigator.gpu?.requestAdapter()
    if (!adapter) throw new Error('WebGPU adapter not found')

    const device = await adapter.requestDevice({
      requiredLimits: {
        maxStorageBuffersPerShaderStage: 16,
      },
    })

    if (!device) throw new Error('WebGPU device initialization failed')

    this.renderer = new WebGPURenderer({ 
      canvas,
      antialias: false,
      trackTimestamp: true,
    })
    await this.renderer.init()

    // Wire error handler
    device.onuncapturederror = (event: any) => {
      console.error('[WebGPU Error]', event.error)
      this.setError(event.error?.message || 'Unknown GPU error')
    }

    // Scene setup with terrain
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x87CEEB)

    // Generate terrain (Phase 1)
    const terrainSim = generateTerrain(this.state.day, 256, 256, 2.0)
    this.terrain = setupTerrainGraphics(this.scene, terrainSim)
    
    // Setup water (Phase 2)
    this.water = setupWaterGraphics(this.scene, terrainSim)
    
    // Setup vegetation (Phase 2)
    this.vegetation = setupVegetationGraphics(this.scene, terrainSim, this.state.day)

    // Initialize motion actors (train, raid riders, tumbleweeds)
    this.motionActors = newMotionActors()

    // Camera: orbital view over valley
    this.camera = new THREE.PerspectiveCamera(
      60,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      1000
    )
    this.camera.position.set(200, 80, 200)
    this.camera.lookAt(256, 40, 256)

    // Setup QA harness
    this.setupQA()

    // Start render loop
    this.animate()

    console.log('Deadwater Gulch initialized')
  }

  private setError(msg: string) {
    window.qa.error = msg
    console.error('[ERROR]', msg)
  }

  private setupQA() {
    window.qa = {
      error: null,
      state: this.state,
      setState: (partial) => {
        this.setState(partial)
        console.log('State updated:', partial)
      },
      screenshot: async (filename?: string) => {
        if (!this.renderer) throw new Error('Renderer not ready')
        // Placeholder: will implement with Playwright in harness
        console.log('Screenshot requested:', filename)
        return new Blob()
      },
      fps: 0,
      gpuPasses: 0,
    }
  }

  private animate = () => {
    requestAnimationFrame(this.animate)

    if (!this.renderer || !this.scene || !this.camera || !this.gameManager || !this.canvas) return

    this.frameCount++
    
    // Tick game simulation
    tickGame(this.gameManager, 0.016)
    this.state = this.gameManager.state
    
    // Update water animation
    if (this.water) {
      updateWater(this.water, 0.016)
    }

    // Update motion actors (train, raid riders, tumbleweeds)
    if (this.motionActors && this.scene) {
      updateMotionActors(this.motionActors, this.state, this.scene, 0.016)
    }

    // Update FPS display
    const now = Date.now()
    if (now - this.lastFpsUpdate > 1000) {
      this.fps = this.frameCount
      window.qa.fps = this.fps
      this.frameCount = 0
      this.lastFpsUpdate = now
    }

    // Save state periodically
    if (this.gameManager.state.day % 10 === 0) {
      this.saveState()
    }

    // Render 3D scene
    this.renderer.render(this.scene, this.camera)

    // Render HUD overlay
    const hudCanvas = document.createElement('canvas')
    hudCanvas.width = this.canvas.width
    hudCanvas.height = this.canvas.height
    renderHUDOverlay(this.gameManager, hudCanvas)

    // Update QA display
    const qaDiv = document.getElementById('qa')
    if (qaDiv) {
      let text = `FPS: ${this.fps}\nDay: ${this.state.day}\nPop: ${this.state.population}`
      text += `\nMorale: ${Math.floor(this.state.morale)}%`
      text += `\nGold: ${Math.floor(this.state.gold)}`
      if (this.vegetation) {
        text += `\nGrass: ${this.vegetation.totalCount}`
      }
      if (this.gameManager.gameStatus !== 'playing') {
        text += `\nStatus: ${this.gameManager.gameStatus.toUpperCase()}`
      }
      if (window.qa.error) {
        text += `\n[ERROR] ${window.qa.error}`
      }
      qaDiv.textContent = text
    }

    // Handle game over
    if (this.gameManager.isGameOver && this.gameManager.gameStatus !== 'playing') {
      const message = this.gameManager.gameStatus === 'won' ? 
        'VICTORY! Press R to restart' : 
        'GAME OVER! Press R to restart'
      console.log(message)
    }
  }
}

// Bootstrap
async function main() {
  try {
    const game = new DeadwaterGulch()
    await game.init()
  } catch (e) {
    console.error('[BOOTSTRAP FAILED]', e)
    const msg = e instanceof Error ? e.message : String(e)
    if (typeof window !== 'undefined') {
      window.qa = { error: msg } as any
    }
  }
}

main()
