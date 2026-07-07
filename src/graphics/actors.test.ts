/**
 * Motion actors tests.
 * Verify train, raid riders, and tumbleweeds actually move, not just render.
 */

import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import type { GameState, Train, Building } from '../sim/types'
import { newGameState } from '../sim/util'
import {
  createTrainActor,
  updateTrainActor,
  createRaidRiderActor,
  updateRaidRiderActor,
  createTumbleWeedActor,
  updateTumbleWeedActor,
} from './actors'

describe('Graphics: Motion Actors', () => {
  it('Train actor changes position when updated', () => {
    const train: Train = {
      id: 'train-1',
      pos: { x: 0, y: 40, z: 0 },
      progress: 0,
      depot1: 'depot1',
      depot2: 'depot2',
    }
    
    const actor = createTrainActor(train)
    const initialPos = new THREE.Vector3().copy(actor.position)
    
    // Update train with progress
    const state: any = { train: { ...train, progress: 0.5 }, railUnlocked: true }
    updateTrainActor(actor, state)
    
    const newPos = new THREE.Vector3().copy(actor.position)
    const distance = initialPos.distanceTo(newPos)
    
    // After update with progress 0.5, position should have moved significantly
    expect(distance).toBeGreaterThan(50)
  })

  it('Raid rider actor moves toward target', () => {
    const startPos = new THREE.Vector3(0, 40, 0)
    const actor = createRaidRiderActor('raid1', 'rider1', startPos)
    const initialPos = new THREE.Vector3().copy(actor.position)
    
    const targetPos = new THREE.Vector3(256, 40, 256)
    
    // Update with significant speed
    updateRaidRiderActor(actor, targetPos, 50) // speed parameter
    
    const newPos = new THREE.Vector3().copy(actor.position)
    const distance = initialPos.distanceTo(newPos)
    
    // Rider should have moved
    expect(distance).toBeGreaterThan(0)
    expect(newPos.x).toBeGreaterThan(initialPos.x)
  })

  it('Tumbleweed actor rolls with wind velocity', () => {
    const pos = new THREE.Vector3(100, 0.5, 100)
    const windVelocity = new THREE.Vector3(2, 0, 1).normalize().multiplyScalar(3)
    const actor = createTumbleWeedActor(pos, windVelocity)
    
    const initialPos = new THREE.Vector3().copy(actor.position)
    
    // Update tumbleweed
    updateTumbleWeedActor(actor, 0.016) // 16ms frame time
    
    const newPos = new THREE.Vector3().copy(actor.position)
    const distance = initialPos.distanceTo(newPos)
    
    // Tumbleweed should roll with wind
    expect(distance).toBeGreaterThan(0)
    
    // Rotation should change as it rolls
    const rotationX = actor.mesh.rotation.x
    const rotationZ = actor.mesh.rotation.z
    expect(rotationX).not.toBe(0)
    expect(rotationZ).not.toBe(0)
  })

  it('Tumbleweed gets removed when too far from town', () => {
    const farPos = new THREE.Vector3(1000, 0.5, 1000) // > 500 units from town
    const windVelocity = new THREE.Vector3(1, 0, 1).normalize()
    const actor = createTumbleWeedActor(farPos, windVelocity)
    
    expect(actor.mesh.visible).toBe(true)
    
    // Update tumbleweed
    updateTumbleWeedActor(actor, 0.016)
    
    // Should be marked as invisible when too far
    expect(actor.mesh.visible).toBe(false)
  })

  it('Train only updates when railUnlocked and train exists', () => {
    const train: Train = {
      id: 'train-1',
      pos: { x: 128, y: 40, z: 128 },
      progress: 0.5,
      depot1: 'depot1',
      depot2: 'depot2',
    }
    
    const actor = createTrainActor(train)
    const pos1 = new THREE.Vector3().copy(actor.position)
    
    // Update with no train in state
    const stateDead: any = { train: null, railUnlocked: false }
    updateTrainActor(actor, stateDead)
    
    // Position should not change (or should gracefully handle null train)
    const pos2 = new THREE.Vector3().copy(actor.position)
    expect(pos1.distanceTo(pos2)).toBeLessThan(0.1) // Essentially unchanged
  })
})
