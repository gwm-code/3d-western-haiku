/**
 * Audio system: sound effects and ambient music.
 * Web Audio API for synthesis and playback.
 */

/**
 * Audio manager (singleton).
 */
export interface AudioManager {
  audioContext: AudioContext
  volume: number // 0–1
  enabled: boolean
  ambientOscillator: OscillatorNode | null
  ambientGain: GainNode | null
}

/**
 * Initialize audio manager.
 */
export function initAudioManager(): AudioManager {
  const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  
  return {
    audioContext,
    volume: 0.5,
    enabled: true,
    ambientOscillator: null,
    ambientGain: null,
  }
}

/**
 * Play a simple sine wave beep.
 */
export function playBeep(
  audio: AudioManager,
  frequency: number = 440,
  duration: number = 0.1
): void {
  if (!audio.enabled) return
  
  const ctx = audio.audioContext
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  
  osc.frequency.value = frequency
  osc.type = 'sine'
  
  gain.gain.setValueAtTime(audio.volume * 0.3, ctx.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration)
  
  osc.connect(gain)
  gain.connect(ctx.destination)
  
  osc.start(ctx.currentTime)
  osc.stop(ctx.currentTime + duration)
}

/**
 * Play event-specific sound.
 */
export function playSoundEffect(audio: AudioManager, effect: string): void {
  if (!audio.enabled) return
  
  switch (effect) {
    case 'raid':
      playBeep(audio, 200, 0.2) // Low, ominous
      setTimeout(() => playBeep(audio, 200, 0.2), 150)
      break
    case 'fire':
      playBeep(audio, 600, 0.15) // High alarm
      setTimeout(() => playBeep(audio, 500, 0.15), 100)
      break
    case 'duel':
      playBeep(audio, 330, 0.1) // Conflict tone
      break
    case 'disease':
      playBeep(audio, 150, 0.3) // Long, low
      break
    case 'population-increase':
      playBeep(audio, 523, 0.1) // Bright, positive
      break
    case 'population-decrease':
      playBeep(audio, 261, 0.2) // Low, sad
      break
    case 'gold-found':
      playBeep(audio, 784, 0.15) // High, happy
      break
    case 'rain':
      // Quiet patter
      for (let i = 0; i < 3; i++) {
        setTimeout(() => playBeep(audio, 200 + Math.random() * 100, 0.05), i * 50)
      }
      break
    default:
      playBeep(audio, 440, 0.1)
  }
}

/**
 * Start ambient background music (generative).
 */
export function startAmbientMusic(audio: AudioManager, tempo: 'slow' | 'normal' | 'fast' = 'normal'): void {
  if (audio.ambientOscillator) {
    stopAmbientMusic(audio)
  }
  
  if (!audio.enabled) return
  
  const ctx = audio.audioContext
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  
  // Choose base frequency based on tempo
  const frequencies = {
    slow: [131, 164, 196],     // Low, mournful
    normal: [196, 246, 293],   // Middle, neutral
    fast: [293, 349, 440],     // High, energetic
  }
  
  const freqSet = frequencies[tempo]
  const baseFreq = freqSet[Math.floor(Math.random() * freqSet.length)]
  
  osc.frequency.value = baseFreq
  osc.type = 'sine'
  
  gain.gain.setValueAtTime(audio.volume * 0.15, ctx.currentTime)
  
  // Slow pulse effect
  const pulseSpeed = tempo === 'slow' ? 0.5 : tempo === 'fast' ? 2 : 1
  const now = ctx.currentTime
  gain.gain.setTargetAtTime(audio.volume * 0.1, now, 1.0 / pulseSpeed)
  
  osc.connect(gain)
  gain.connect(ctx.destination)
  
  osc.start(ctx.currentTime)
  
  audio.ambientOscillator = osc
  audio.ambientGain = gain
}

/**
 * Stop ambient music.
 */
export function stopAmbientMusic(audio: AudioManager): void {
  if (audio.ambientOscillator) {
    audio.ambientOscillator.stop(audio.audioContext.currentTime)
    audio.ambientOscillator = null
  }
  if (audio.ambientGain) {
    audio.ambientGain.disconnect()
    audio.ambientGain = null
  }
}

/**
 * Set audio volume (0–1).
 */
export function setAudioVolume(audio: AudioManager, volume: number): void {
  audio.volume = Math.max(0, Math.min(1, volume))
  if (audio.ambientGain) {
    audio.ambientGain.gain.setTargetAtTime(audio.volume * 0.15, audio.audioContext.currentTime, 0.1)
  }
}

/**
 * Toggle audio on/off.
 */
export function toggleAudio(audio: AudioManager): void {
  audio.enabled = !audio.enabled
  if (!audio.enabled) {
    stopAmbientMusic(audio)
  }
}
