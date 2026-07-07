/**
 * Motion actors: animated world entities.
 * Train crossing rail tracks, raid riders galloping, tumbleweeds rolling.
 */

import * as THREE from 'three'
import type { GameState, Train } from '../sim/types'
import type { Raid } from '../sim/raids'

/**
 * Train actor for rail-depot connections.
 */
export interface TrainActor {
  mesh: THREE.Group
  position: THREE.Vector3
  train: Train
}

/**
 * Create train mesh (locomotive + cars).
 */
function createTrainMesh(): THREE.Group {
  const group = new THREE.Group()
  
  // Locomotive body
  const locoBodies = new THREE.BoxGeometry(1.2, 1.5, 3.0)
  const locoMat = new THREE.MeshStandardMaterial({ color: 0x1C1C1C })
  const loco = new THREE.Mesh(locoBodies, locoMat)
  loco.position.z = -2
  loco.castShadow = true
  group.add(loco)
  
  // Smokestack (chimney)
  const stackGeom = new THREE.CylinderGeometry(0.3, 0.3, 1.2, 8)
  const stackMat = new THREE.MeshStandardMaterial({ color: 0x333333 })
  const stack = new THREE.Mesh(stackGeom, stackMat)
  stack.position.set(0, 1.2, -2.5)
  stack.castShadow = true
  group.add(stack)
  
  // Wheels (visible under locomotive)
  const wheelGeom = new THREE.CylinderGeometry(0.4, 0.4, 0.2, 16)
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1C1C1C, metalness: 0.8 })
  for (let i = 0; i < 3; i++) {
    const wheel = new THREE.Mesh(wheelGeom, wheelMat)
    wheel.rotation.z = Math.PI / 2
    wheel.position.set(-0.5, 0, -3 + i * 1.5)
    wheel.castShadow = true
    group.add(wheel)
  }
  
  // Cargo cars (2 simple boxes)
  for (let car = 0; car < 2; car++) {
    const carGeom = new THREE.BoxGeometry(1.0, 1.3, 2.5)
    const carMat = new THREE.MeshStandardMaterial({ 
      color: car === 0 ? 0x8B0000 : 0xA0522D,
      roughness: 0.7
    })
    const carMesh = new THREE.Mesh(carGeom, carMat)
    carMesh.position.z = 2 + car * 3
    carMesh.castShadow = true
    group.add(carMesh)
  }
  
  return group
}

/**
 * Create train actor and bind to game state.
 */
export function createTrainActor(train: Train): TrainActor {
  const mesh = createTrainMesh()
  const position = new THREE.Vector3(train.pos.x, train.pos.y, train.pos.z)
  mesh.position.copy(position)
  
  return { mesh, position, train }
}

/**
 * Update train position along rails based on progress (0–1).
 */
export function updateTrainActor(actor: TrainActor, state: GameState): void {
  if (!state.train) return
  
  // Interpolate position from depot1 to depot2
  const depot1Pos = new THREE.Vector3(0, 40, 0)  // Valley mouth entry
  const depot2Pos = new THREE.Vector3(256, 40, 256)  // Town center
  
  actor.position.lerpVectors(depot1Pos, depot2Pos, state.train.progress)
  actor.mesh.position.copy(actor.position)
  
  // Rotate to face direction of travel
  const direction = new THREE.Vector3().subVectors(depot2Pos, depot1Pos)
  actor.mesh.rotation.y = Math.atan2(direction.x, direction.z)
}

/**
 * Raid rider actor (outlaw on horseback).
 */
export interface RaidRiderActor {
  mesh: THREE.Group
  position: THREE.Vector3
  raidId: string
  riderId: string
}

/**
 * Create raid rider mesh (simple rider silhouette).
 */
function createRaidRiderMesh(): THREE.Group {
  const group = new THREE.Group()
  
  // Horse body
  const horseGeom = new THREE.BoxGeometry(0.8, 1.0, 1.5)
  const horseMat = new THREE.MeshStandardMaterial({ color: 0x654321 })
  const horse = new THREE.Mesh(horseGeom, horseMat)
  horse.castShadow = true
  group.add(horse)
  
  // Horse head
  const headGeom = new THREE.BoxGeometry(0.4, 0.4, 0.5)
  const head = new THREE.Mesh(headGeom, horseMat)
  head.position.set(0, 0.4, -1)
  head.castShadow = true
  group.add(head)
  
  // Rider (simple cylinder for torso)
  const torsoGeom = new THREE.CylinderGeometry(0.25, 0.25, 0.6, 8)
  const riderMat = new THREE.MeshStandardMaterial({ color: 0x8B4513 })
  const torso = new THREE.Mesh(torsoGeom, riderMat)
  torso.position.set(0, 1.2, 0)
  torso.castShadow = true
  group.add(torso)
  
  // Rider hat
  const hatGeom = new THREE.ConeGeometry(0.3, 0.3, 8)
  const hatMat = new THREE.MeshStandardMaterial({ color: 0x1C1C1C })
  const hat = new THREE.Mesh(hatGeom, hatMat)
  hat.position.set(0, 2.0, 0)
  hat.castShadow = true
  group.add(hat)
  
  return group
}

/**
 * Create raid rider actor.
 */
export function createRaidRiderActor(raidId: string, riderId: string, startPos: THREE.Vector3): RaidRiderActor {
  const mesh = createRaidRiderMesh()
  const position = startPos.clone()
  mesh.position.copy(position)
  
  return { mesh, position, raidId, riderId }
}

/**
 * Update raid rider position (galloping toward town).
 */
export function updateRaidRiderActor(actor: RaidRiderActor, targetPos: THREE.Vector3, speed: number = 0.5): void {
  const direction = new THREE.Vector3().subVectors(targetPos, actor.position)
  const distance = direction.length()
  
  if (distance > 0.1) {
    direction.normalize()
    actor.position.addScaledVector(direction, speed)
    actor.mesh.position.copy(actor.position)
    
    // Face direction of travel
    actor.mesh.rotation.y = Math.atan2(direction.x, direction.z)
  }
}

/**
 * Tumbleweed actor (wind-blown vegetation).
 */
export interface TumbleWeedActor {
  mesh: THREE.Group
  position: THREE.Vector3
  velocity: THREE.Vector3
  scale: number
}

/**
 * Create tumbleweed mesh (spiky sphere).
 */
function createTumbleWeedMesh(scale: number = 1.0): THREE.Group {
  const group = new THREE.Group()
  
  // Main sphere
  const sphereGeom = new THREE.SphereGeometry(0.3 * scale, 8, 8)
  const sphereMat = new THREE.MeshStandardMaterial({ 
    color: 0xDEB887,
    roughness: 0.9
  })
  const sphere = new THREE.Mesh(sphereGeom, sphereMat)
  sphere.castShadow = true
  group.add(sphere)
  
  // Spikes (thin cones radiating outward)
  for (let i = 0; i < 6; i++) {
    const spikeGeom = new THREE.ConeGeometry(0.05 * scale, 0.4 * scale, 4)
    const spikeMat = new THREE.MeshStandardMaterial({ color: 0xA0826D })
    const spike = new THREE.Mesh(spikeGeom, spikeMat)
    
    // Distribute spikes around sphere
    const angle = (i / 6) * Math.PI * 2
    const elevation = (i % 3) * (Math.PI / 3)
    spike.position.set(
      Math.cos(angle) * Math.cos(elevation) * 0.35 * scale,
      Math.sin(elevation) * 0.35 * scale,
      Math.sin(angle) * Math.cos(elevation) * 0.35 * scale
    )
    spike.castShadow = true
    group.add(spike)
  }
  
  return group
}

/**
 * Create tumbleweed actor.
 */
export function createTumbleWeedActor(pos: THREE.Vector3, windVelocity: THREE.Vector3): TumbleWeedActor {
  const scale = Math.random() * 0.5 + 0.5  // Random size 0.5–1.0
  const mesh = createTumbleWeedMesh(scale)
  mesh.position.copy(pos)
  
  return {
    mesh,
    position: pos.clone(),
    velocity: windVelocity.clone(),
    scale
  }
}

/**
 * Update tumbleweed position (roll with wind).
 */
export function updateTumbleWeedActor(actor: TumbleWeedActor, deltaTime: number = 0.016): void {
  // Apply wind velocity
  actor.position.addScaledVector(actor.velocity, deltaTime)
  actor.mesh.position.copy(actor.position)
  
  // Spin as it rolls
  actor.mesh.rotation.x += actor.velocity.length() * deltaTime * 2
  actor.mesh.rotation.z += actor.velocity.length() * deltaTime * 1.5
  
  // Fade out when far from town
  const distFromTown = actor.position.distanceTo(new THREE.Vector3(256, 40, 256))
  if (distFromTown > 400) {
    actor.mesh.visible = false
  }
}

/**
 * Container for all motion actors in the world.
 */
export interface MotionActors {
  train: TrainActor | null
  raidRiders: RaidRiderActor[]
  tumbleWeeds: TumbleWeedActor[]
}

/**
 * Create motion actors container.
 */
export function newMotionActors(): MotionActors {
  return {
    train: null,
    raidRiders: [],
    tumbleWeeds: [],
  }
}

/**
 * Update all motion actors based on game state.
 */
export function updateMotionActors(actors: MotionActors, state: GameState, scene: THREE.Scene, deltaTime: number = 0.016): void {
  // Update train
  if (state.train && state.railUnlocked) {
    if (!actors.train) {
      actors.train = createTrainActor(state.train)
      scene.add(actors.train.mesh)
    }
    updateTrainActor(actors.train, state)
  } else if (actors.train) {
    scene.remove(actors.train.mesh)
    actors.train = null
  }
  
  // Update raid riders (spawn when raids are active)
  const raids = (state as any).raids as Raid[] || []
  const activeRaids = raids.filter((r: Raid) => r.status === 'attacking')
  if (activeRaids.length === 0) {
    // Clear raid riders when raids end
    actors.raidRiders.forEach(rider => scene.remove(rider.mesh))
    actors.raidRiders = []
  } else {
    // Update existing riders (gallop toward town)
    for (const rider of actors.raidRiders) {
      updateRaidRiderActor(rider, new THREE.Vector3(256, 40, 256), 2.0 * deltaTime)
    }
  }
  
  // Update tumbleweeds (spawn during duststorms, roll with wind)
  if (state.weather === 'duststorm') {
    // Spawn new tumbleweeds occasionally
    if (Math.random() < 0.02) {
      const windDir = new THREE.Vector3(Math.sin(state.day * 0.1), 0, Math.cos(state.day * 0.1))
      const startPos = new THREE.Vector3(
        Math.random() * 512,
        0.5,
        Math.random() * 512
      )
      const velocity = windDir.multiplyScalar(3.0)
      const weed = createTumbleWeedActor(startPos, velocity)
      scene.add(weed.mesh)
      actors.tumbleWeeds.push(weed)
    }
  } else {
    // Remove tumbleweeds when duststorm ends
    actors.tumbleWeeds.forEach(weed => scene.remove(weed.mesh))
    actors.tumbleWeeds = []
  }
  
  // Update tumbleweeds that exist
  for (const weed of actors.tumbleWeeds) {
    updateTumbleWeedActor(weed, deltaTime)
  }
  
  // Remove off-screen tumbleweeds
  actors.tumbleWeeds = actors.tumbleWeeds.filter(weed => {
    if (weed.position.distanceTo(new THREE.Vector3(256, 40, 256)) > 500) {
      scene.remove(weed.mesh)
      return false
    }
    return true
  })
}
