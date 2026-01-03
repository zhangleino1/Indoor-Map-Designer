import type { Point, Bounds, MapElement } from '@/types'

// Distance between two points
export function distance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x
  const dy = p2.y - p1.y
  return Math.sqrt(dx * dx + dy * dy)
}

// Distance from point to line segment
export function pointToLineDistance(point: Point, lineStart: Point, lineEnd: Point): number {
  const A = point.x - lineStart.x
  const B = point.y - lineStart.y
  const C = lineEnd.x - lineStart.x
  const D = lineEnd.y - lineStart.y

  const dot = A * C + B * D
  const lenSq = C * C + D * D
  let param = -1

  if (lenSq !== 0) {
    param = dot / lenSq
  }

  let xx, yy

  if (param < 0) {
    xx = lineStart.x
    yy = lineStart.y
  } else if (param > 1) {
    xx = lineEnd.x
    yy = lineEnd.y
  } else {
    xx = lineStart.x + param * C
    yy = lineStart.y + param * D
  }

  return distance(point, { x: xx, y: yy })
}

// Check if point is inside polygon
export function pointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false
  const n = polygon.length

  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].x
    const yi = polygon[i].y
    const xj = polygon[j].x
    const yj = polygon[j].y

    if (((yi > point.y) !== (yj > point.y)) &&
      (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
      inside = !inside
    }
  }

  return inside
}

// Get bounding box of points
export function getBounds(points: Point[]): Bounds {
  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 }
  }

  let minX = points[0].x
  let minY = points[0].y
  let maxX = points[0].x
  let maxY = points[0].y

  for (const point of points) {
    minX = Math.min(minX, point.x)
    minY = Math.min(minY, point.y)
    maxX = Math.max(maxX, point.x)
    maxY = Math.max(maxY, point.y)
  }

  return { minX, minY, maxX, maxY }
}

// Check if point is inside bounds
export function pointInBounds(point: Point, bounds: Bounds, padding: number = 0): boolean {
  return point.x >= bounds.minX - padding &&
    point.x <= bounds.maxX + padding &&
    point.y >= bounds.minY - padding &&
    point.y <= bounds.maxY + padding
}

// Get center of bounds
export function getBoundsCenter(bounds: Bounds): Point {
  return {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2
  }
}

// Calculate polygon area (Shoelace formula)
export function calculatePolygonArea(points: Point[]): number {
  if (points.length < 3) return 0

  let area = 0
  const n = points.length

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    area += points[i].x * points[j].y
    area -= points[j].x * points[i].y
  }

  return Math.abs(area / 2)
}

// Calculate line length
export function calculateLineLength(points: Point[]): number {
  let length = 0
  for (let i = 0; i < points.length - 1; i++) {
    length += distance(points[i], points[i + 1])
  }
  return length
}

// Get angle between two points (in radians)
export function getAngle(from: Point, to: Point): number {
  return Math.atan2(to.y - from.y, to.x - from.x)
}

// Get angle in degrees
export function getAngleDegrees(from: Point, to: Point): number {
  return getAngle(from, to) * 180 / Math.PI
}

// Snap angle to nearest increment (e.g., 45 degrees)
export function snapAngle(angle: number, increment: number = 45): number {
  const radIncrement = increment * Math.PI / 180
  return Math.round(angle / radIncrement) * radIncrement
}

// Get point at distance and angle from origin
export function pointAtAngle(origin: Point, angle: number, dist: number): Point {
  return {
    x: origin.x + Math.cos(angle) * dist,
    y: origin.y + Math.sin(angle) * dist
  }
}

// Find intersection point of two line segments
export function lineIntersection(
  p1: Point, p2: Point,
  p3: Point, p4: Point
): Point | null {
  const x1 = p1.x, y1 = p1.y
  const x2 = p2.x, y2 = p2.y
  const x3 = p3.x, y3 = p3.y
  const x4 = p4.x, y4 = p4.y

  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
  if (Math.abs(denom) < 0.0001) return null

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom

  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return {
      x: x1 + t * (x2 - x1),
      y: y1 + t * (y2 - y1)
    }
  }

  return null
}

// Get midpoint of line segment
export function getMidpoint(p1: Point, p2: Point): Point {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2
  }
}

// Rotate point around center
export function rotatePoint(point: Point, center: Point, angle: number): Point {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const dx = point.x - center.x
  const dy = point.y - center.y
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos
  }
}

// Scale points from center
export function scalePoints(points: Point[], center: Point, scale: number): Point[] {
  return points.map(p => ({
    x: center.x + (p.x - center.x) * scale,
    y: center.y + (p.y - center.y) * scale
  }))
}

// Get element bounds
export function getElementBounds(element: MapElement): Bounds {
  if ('points' in element && element.points) {
    return getBounds(element.points)
  } else if ('position' in element && element.position) {
    const pos = element.position
    const size = 'width' in element ? element.width / 2 : 10
    return {
      minX: pos.x - size,
      minY: pos.y - size,
      maxX: pos.x + size,
      maxY: pos.y + size
    }
  }
  return { minX: 0, minY: 0, maxX: 0, maxY: 0 }
}

// Check if element contains point (for selection)
export function elementContainsPoint(element: MapElement, point: Point, tolerance: number = 10): boolean {
  if ('points' in element && element.points) {
    if (element.type === 'room') {
      return pointInPolygon(point, element.points)
    } else {
      // Line-based elements (wall, navpath)
      for (let i = 0; i < element.points.length - 1; i++) {
        if (pointToLineDistance(point, element.points[i], element.points[i + 1]) <= tolerance) {
          return true
        }
      }
    }
  } else if ('position' in element && element.position) {
    // For door/window with width, use width as the hit area
    if ('width' in element && element.width) {
      const halfWidth = element.width / 2
      // Use a larger hit area for doors/windows
      const hitTolerance = Math.max(halfWidth, tolerance)
      return distance(point, element.position) <= hitTolerance
    }
    return distance(point, element.position) <= tolerance
  }
  return false
}

// Create rectangle points from two corners
export function createRectangle(p1: Point, p2: Point): Point[] {
  return [
    { x: p1.x, y: p1.y },
    { x: p2.x, y: p1.y },
    { x: p2.x, y: p2.y },
    { x: p1.x, y: p2.y },
    { x: p1.x, y: p1.y } // Close the polygon
  ]
}
