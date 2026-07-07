/**
 * Agent navigation: pathfinding and movement.
 * Uses A* over terrain heightmap.
 */

import { sampleHeight, isRiver } from './terrain'
import type { TerrainMap } from './terrain'
import type { Vec3 } from './types'

/**
 * Simple 2D grid node for A*.
 */
interface Node {
  x: number
  z: number
  g: number // Cost from start
  h: number // Heuristic to goal
  parent: Node | null
}

/**
 * Find shortest path using A*.
 * Returns array of waypoints from start to goal.
 */
export function findPath(
  terrain: TerrainMap,
  start: Vec3,
  goal: Vec3,
  maxSteps: number = 1000
): Vec3[] {
  // Convert to grid coordinates
  const startX = Math.floor(start.x / terrain.cellSize)
  const startZ = Math.floor(start.z / terrain.cellSize)
  const goalX = Math.floor(goal.x / terrain.cellSize)
  const goalZ = Math.floor(goal.z / terrain.cellSize)
  
  // Early exit if goal is in river
  if (isRiver(terrain, goal.x, goal.z)) {
    return [start] // Can't reach river
  }
  
  const openSet: Node[] = []
  const closedSet = new Set<string>()
  const nodeMap = new Map<string, Node>()
  
  const startNode: Node = {
    x: startX,
    z: startZ,
    g: 0,
    h: heuristic(startX, startZ, goalX, goalZ),
    parent: null,
  }
  openSet.push(startNode)
  nodeMap.set(`${startX},${startZ}`, startNode)
  
  let steps = 0
  
  while (openSet.length > 0 && steps < maxSteps) {
    steps++
    
    // Find lowest f-cost node
    let current = openSet[0]
    let currentIdx = 0
    for (let i = 1; i < openSet.length; i++) {
      const node = openSet[i]
      if (node.g + node.h < current.g + current.h) {
        current = node
        currentIdx = i
      }
    }
    
    if (current.x === goalX && current.z === goalZ) {
      // Found path, reconstruct it
      const path: Vec3[] = []
      let node: Node | null = current
      while (node) {
        path.unshift({
          x: node.x * terrain.cellSize + terrain.cellSize / 2,
          y: sampleHeight(terrain, node.x * terrain.cellSize, node.z * terrain.cellSize),
          z: node.z * terrain.cellSize + terrain.cellSize / 2,
        })
        node = node.parent
      }
      return path
    }
    
    openSet.splice(currentIdx, 1)
    closedSet.add(`${current.x},${current.z}`)
    
    // Check 8 neighbors
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dz === 0) continue
        
        const nx = current.x + dx
        const nz = current.z + dz
        
        if (nx < 0 || nx >= terrain.width || nz < 0 || nz >= terrain.height) continue
        if (closedSet.has(`${nx},${nz}`)) continue
        if (isRiver(terrain, nx * terrain.cellSize, nz * terrain.cellSize)) continue
        
        const g = current.g + (Math.abs(dx) + Math.abs(dz) === 2 ? 1.414 : 1) // Diagonal penalty
        const h = heuristic(nx, nz, goalX, goalZ)
        
        const key = `${nx},${nz}`
        const existing = nodeMap.get(key)
        
        if (!existing || g < existing.g) {
          const neighbor: Node = { x: nx, z: nz, g, h, parent: current }
          nodeMap.set(key, neighbor)
          
          if (!existing) {
            openSet.push(neighbor)
          }
        }
      }
    }
  }
  
  // No path found, return straight line to goal
  return [start, goal]
}

/**
 * Heuristic for A* (Manhattan distance).
 */
function heuristic(x1: number, z1: number, x2: number, z2: number): number {
  return Math.abs(x1 - x2) + Math.abs(z1 - z2)
}

/**
 * Move agent along path.
 */
export function moveAlongPath(
  current: Vec3,
  path: Vec3[],
  moveSpeed: number,
  deltaTime: number = 0.016
): { pos: Vec3; pathIdx: number } {
  if (path.length === 0) return { pos: current, pathIdx: 0 }
  
  const distance = moveSpeed * deltaTime
  let remaining = distance
  let idx = 0
  let pos = { ...current }
  
  while (remaining > 0 && idx < path.length) {
    const target = path[idx]
    const dx = target.x - pos.x
    const dz = target.z - pos.z
    const dist = Math.sqrt(dx * dx + dz * dz)
    
    if (dist <= remaining) {
      pos = { ...target }
      remaining -= dist
      idx++
    } else {
      const t = remaining / dist
      pos.x += dx * t
      pos.z += dz * t
      remaining = 0
    }
  }
  
  return { pos, pathIdx: idx }
}
