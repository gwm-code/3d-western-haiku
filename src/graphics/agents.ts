/**
 * Rendering for agents: settlers and cattle.
 * Instanced for performance.
 */

import * as THREE from 'three'
import type { GameState } from '../sim/types'

/**
 * Create settler mesh (simple capsule).
 */
function createSettlerMesh(x: number, y: number, z: number): THREE.Group {
  const group = new THREE.Group()
  group.position.set(x, y, z)
  
  // Body (cylinder)
  const bodyGeom = new THREE.CylinderGeometry(0.2, 0.2, 0.6, 8)
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x8B4513 })
  const body = new THREE.Mesh(bodyGeom, bodyMat)
  body.position.y = 0.3
  body.castShadow = true
  body.receiveShadow = true
  group.add(body)
  
  // Head (sphere)
  const headGeom = new THREE.SphereGeometry(0.15, 8, 8)
  const headMat = new THREE.MeshStandardMaterial({ color: 0xFFDBAC })
  const head = new THREE.Mesh(headGeom, headMat)
  head.position.y = 0.75
  head.castShadow = true
  group.add(head)
  
  return group
}

/**
 * Create cattle mesh (simple box).
 */
function createCattleMesh(x: number, y: number, z: number): THREE.Mesh {
  const geom = new THREE.BoxGeometry(0.5, 0.4, 1.0)
  const mat = new THREE.MeshStandardMaterial({ color: 0x8B4513 })
  const mesh = new THREE.Mesh(geom, mat)
  mesh.position.set(x, y, z)
  mesh.castShadow = true
  mesh.receiveShadow = true
  return mesh
}

/**
 * Container for agent graphics.
 */
export interface AgentGraphics {
  settlerMeshes: Map<string, THREE.Group>
  cattleMeshes: Map<string, THREE.Mesh>
  settlerCount: number
  cattleCount: number
}

/**
 * Setup agent rendering.
 */
export function setupAgentGraphics(scene: THREE.Scene, state: GameState): AgentGraphics {
  const settlerMeshes = new Map<string, THREE.Group>()
  const cattleMeshes = new Map<string, THREE.Mesh>()
  
  // Create settler meshes
  for (const [settlerId, settler] of state.settlers) {
    const mesh = createSettlerMesh(settler.pos.x, settler.pos.y, settler.pos.z)
    settlerMeshes.set(settlerId, mesh)
    scene.add(mesh)
  }
  
  // Create cattle meshes
  for (const [herdId, herd] of state.herds) {
    const mesh = createCattleMesh(herd.leader.x, herd.leader.y, herd.leader.z)
    cattleMeshes.set(herdId, mesh)
    scene.add(mesh)
  }
  
  console.log(`[Agents] Rendered ${state.settlers.size} settlers, ${state.herds.size} herds`)
  
  return {
    settlerMeshes,
    cattleMeshes,
    settlerCount: state.settlers.size,
    cattleCount: state.herds.size,
  }
}

/**
 * Update agent meshes (position sync from simulation).
 */
export function updateAgentMeshes(agents: AgentGraphics, state: GameState) {
  // Update settler positions
  for (const [settlerId, settler] of state.settlers) {
    const mesh = agents.settlerMeshes.get(settlerId)
    if (mesh) {
      mesh.position.set(settler.pos.x, settler.pos.y, settler.pos.z)
    }
  }
  
  // Update cattle positions
  for (const [herdId, herd] of state.herds) {
    const mesh = agents.cattleMeshes.get(herdId)
    if (mesh) {
      mesh.position.set(herd.leader.x, herd.leader.y, herd.leader.z)
    }
  }
}

/**
 * Create settler when spawned.
 */
export function spawnSettlerMesh(scene: THREE.Scene, agents: AgentGraphics, settlerId: string, x: number, y: number, z: number) {
  const mesh = createSettlerMesh(x, y, z)
  agents.settlerMeshes.set(settlerId, mesh)
  scene.add(mesh)
}

/**
 * Remove settler mesh.
 */
export function removeSettlerMesh(scene: THREE.Scene, agents: AgentGraphics, settlerId: string) {
  const mesh = agents.settlerMeshes.get(settlerId)
  if (mesh) {
    scene.remove(mesh)
    agents.settlerMeshes.delete(settlerId)
  }
}
