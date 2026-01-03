import type { Point, SnapResult, MapElement } from '@/types'
import { distance, getMidpoint, lineIntersection, snapAngle, pointAtAngle, getAngle } from './geometry'

const SNAP_THRESHOLD = 15 // pixels

export interface SnapOptions {
  gridSize: number
  snapToGrid: boolean
  snapToEndpoint: boolean
  snapToMidpoint?: boolean
  snapToIntersection?: boolean
  snapToAngle?: boolean
  angleIncrement?: number
}

// Snap point to grid
export function snapToGrid(point: Point, gridSize: number): Point {
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize
  }
}

// Get all snap points from elements
export function getSnapPoints(
  elements: MapElement[],
  options: { endpoints?: boolean; midpoints?: boolean }
): Point[] {
  const points: Point[] = []

  for (const element of elements) {
    if ('points' in element && element.points) {
      // Add endpoints
      if (options.endpoints) {
        points.push(...element.points)
      }

      // Add midpoints
      if (options.midpoints) {
        for (let i = 0; i < element.points.length - 1; i++) {
          points.push(getMidpoint(element.points[i], element.points[i + 1]))
        }
      }
    } else if ('position' in element && element.position) {
      if (options.endpoints) {
        points.push(element.position)
      }
    }
  }

  return points
}

// Find nearest snap point
export function findNearestSnapPoint(
  point: Point,
  snapPoints: Point[],
  threshold: number = SNAP_THRESHOLD
): { point: Point; distance: number } | null {
  let nearest: { point: Point; distance: number } | null = null

  for (const snapPoint of snapPoints) {
    const dist = distance(point, snapPoint)
    if (dist <= threshold && (!nearest || dist < nearest.distance)) {
      nearest = { point: snapPoint, distance: dist }
    }
  }

  return nearest
}

// Find intersections with other elements
export function findIntersections(
  lineStart: Point,
  lineEnd: Point,
  elements: MapElement[]
): Point[] {
  const intersections: Point[] = []

  for (const element of elements) {
    if (!('points' in element) || !element.points) continue

    for (let i = 0; i < element.points.length - 1; i++) {
      const intersection = lineIntersection(
        lineStart,
        lineEnd,
        element.points[i],
        element.points[i + 1]
      )
      if (intersection) {
        intersections.push(intersection)
      }
    }
  }

  return intersections
}

// Comprehensive snap function
export function snapPoint(
  point: Point,
  elements: MapElement[],
  options: SnapOptions,
  referencePoint?: Point
): SnapResult {
  let result: SnapResult = {
    snapped: false,
    point: { ...point },
    type: 'none'
  }

  // 1. Try snapping to endpoints/midpoints first (highest priority)
  if (options.snapToEndpoint) {
    const snapPoints = getSnapPoints(elements, {
      endpoints: true,
      midpoints: options.snapToMidpoint
    })

    const nearest = findNearestSnapPoint(point, snapPoints)
    if (nearest) {
      result = {
        snapped: true,
        point: nearest.point,
        type: 'endpoint'
      }
      return result
    }
  }

  // 2. Snap to angle (when drawing lines)
  if (options.snapToAngle && referencePoint) {
    const angle = getAngle(referencePoint, point)
    const snappedAngle = snapAngle(angle, options.angleIncrement || 45)

    if (Math.abs(angle - snappedAngle) < 0.1) { // Close enough to snap
      const dist = distance(referencePoint, point)
      result = {
        snapped: true,
        point: pointAtAngle(referencePoint, snappedAngle, dist),
        type: 'grid' // Using grid type for angle snap
      }
      return result
    }
  }

  // 3. Snap to grid (lowest priority)
  if (options.snapToGrid) {
    const gridPoint = snapToGrid(point, options.gridSize)
    const dist = distance(point, gridPoint)

    if (dist <= SNAP_THRESHOLD) {
      result = {
        snapped: true,
        point: gridPoint,
        type: 'grid'
      }
    }
  }

  return result
}

// Snap with visual feedback info
export interface SnapFeedback {
  result: SnapResult
  guides: {
    type: 'horizontal' | 'vertical' | 'endpoint' | 'midpoint'
    from: Point
    to: Point
  }[]
}

export function snapPointWithFeedback(
  point: Point,
  elements: MapElement[],
  options: SnapOptions,
  referencePoint?: Point
): SnapFeedback {
  const result = snapPoint(point, elements, options, referencePoint)
  const guides: SnapFeedback['guides'] = []

  // Add guide lines for snapped point
  if (result.snapped && result.type === 'endpoint') {
    // Could add crosshair guides at snap point
    guides.push({
      type: 'endpoint',
      from: { x: result.point.x - 10, y: result.point.y },
      to: { x: result.point.x + 10, y: result.point.y }
    })
    guides.push({
      type: 'endpoint',
      from: { x: result.point.x, y: result.point.y - 10 },
      to: { x: result.point.x, y: result.point.y + 10 }
    })
  }

  return { result, guides }
}
