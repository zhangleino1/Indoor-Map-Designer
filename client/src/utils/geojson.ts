import type {
  MapElement,
  WallElement,
  RoomElement,
  POIElement,
  NavPathElement,
  NavNodeElement,
  Point,
  GeoJSONFeature,
  GeoJSONCollection,
  Floor
} from '@/types'
import { calculatePolygonArea, calculateLineLength } from './geometry'

// Convert Point to GeoJSON coordinates
function pointToCoords(point: Point): number[] {
  return [point.x, point.y]
}

// Convert points array to GeoJSON coordinates
function pointsToCoords(points: Point[]): number[][] {
  return points.map(p => pointToCoords(p))
}

// Convert wall element to GeoJSON feature
function wallToFeature(wall: WallElement): GeoJSONFeature {
  return {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: pointsToCoords(wall.points)
    },
    properties: {
      id: wall.id,
      type: 'wall',
      floor: wall.floor,
      name: wall.name,
      thickness: wall.thickness,
      length: calculateLineLength(wall.points),
      style: wall.style
    }
  }
}

// Convert room element to GeoJSON feature
function roomToFeature(room: RoomElement): GeoJSONFeature {
  // Ensure polygon is closed
  const coords = pointsToCoords(room.points)
  if (coords.length > 0) {
    const first = coords[0]
    const last = coords[coords.length - 1]
    if (first[0] !== last[0] || first[1] !== last[1]) {
      coords.push([...first])
    }
  }

  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [coords]
    },
    properties: {
      id: room.id,
      type: 'room',
      floor: room.floor,
      name: room.name,
      area: room.area || calculatePolygonArea(room.points),
      style: room.style
    }
  }
}

// Convert POI element to GeoJSON feature
function poiToFeature(poi: POIElement): GeoJSONFeature {
  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: pointToCoords(poi.position)
    },
    properties: {
      id: poi.id,
      type: 'poi',
      poiType: poi.poiType,
      floor: poi.floor,
      name: poi.name,
      description: poi.description,
      icon: poi.icon,
      connectsTo: poi.connectsTo,
      style: poi.style
    }
  }
}

// Convert navigation path to GeoJSON feature
function navPathToFeature(navPath: NavPathElement): GeoJSONFeature {
  return {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: pointsToCoords(navPath.points)
    },
    properties: {
      id: navPath.id,
      type: 'navpath',
      floor: navPath.floor,
      name: navPath.name,
      bidirectional: navPath.bidirectional,
      length: calculateLineLength(navPath.points),
      style: navPath.style
    }
  }
}

// Convert navigation node to GeoJSON feature
function navNodeToFeature(navNode: NavNodeElement): GeoJSONFeature {
  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: pointToCoords(navNode.position)
    },
    properties: {
      id: navNode.id,
      type: 'navnode',
      floor: navNode.floor,
      name: navNode.name,
      connectedPaths: navNode.connectedPaths,
      style: navNode.style
    }
  }
}

// Convert any element to GeoJSON feature
export function elementToFeature(element: MapElement): GeoJSONFeature {
  switch (element.type) {
    case 'wall':
      return wallToFeature(element as WallElement)
    case 'room':
      return roomToFeature(element as RoomElement)
    case 'poi':
      return poiToFeature(element as POIElement)
    case 'navpath':
      return navPathToFeature(element as NavPathElement)
    case 'navnode':
      return navNodeToFeature(element as NavNodeElement)
    default:
      throw new Error(`Unknown element type: ${(element as any).type}`)
  }
}

// Export all elements to GeoJSON
export function exportToGeoJSON(
  elementsByFloor: Record<number, MapElement[]>,
  projectInfo: {
    name: string
    scale: number
    unit: string
  }
): GeoJSONCollection {
  const features: GeoJSONFeature[] = []

  for (const floor in elementsByFloor) {
    for (const element of elementsByFloor[floor]) {
      if (element.visible) {
        features.push(elementToFeature(element))
      }
    }
  }

  return {
    type: 'FeatureCollection',
    properties: {
      name: projectInfo.name,
      scale: projectInfo.scale,
      unit: projectInfo.unit
    },
    features
  }
}

// Export single floor to GeoJSON
export function exportFloorToGeoJSON(
  elements: MapElement[],
  floor: Floor,
  projectInfo: {
    name: string
    scale: number
    unit: string
  }
): GeoJSONCollection {
  const features: GeoJSONFeature[] = elements
    .filter(el => el.visible)
    .map(el => elementToFeature(el))

  return {
    type: 'FeatureCollection',
    properties: {
      name: `${projectInfo.name} - ${floor.name}`,
      scale: projectInfo.scale,
      unit: projectInfo.unit,
      floor: floor.id,
      floorName: floor.name
    },
    features
  }
}

// Import GeoJSON and convert to elements
export function importFromGeoJSON(
  geojson: GeoJSONCollection
): { elements: MapElement[]; projectInfo: any } {
  const elements: MapElement[] = []

  for (const feature of geojson.features) {
    const element = featureToElement(feature)
    if (element) {
      elements.push(element)
    }
  }

  return {
    elements,
    projectInfo: geojson.properties
  }
}

// Convert GeoJSON feature to element
function featureToElement(feature: GeoJSONFeature): MapElement | null {
  const props = feature.properties
  const type = props.type

  const baseProps = {
    id: props.id || `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    floor: props.floor || 1,
    name: props.name,
    visible: true,
    locked: false,
    style: props.style || getDefaultStyle(type)
  }

  switch (type) {
    case 'wall':
      return {
        ...baseProps,
        type: 'wall',
        points: coordsToPoints(feature.geometry.coordinates as number[][]),
        thickness: props.thickness || 24
      } as WallElement

    case 'room':
      const coords = (feature.geometry.coordinates as number[][][])[0]
      return {
        ...baseProps,
        type: 'room',
        points: coordsToPoints(coords),
        area: props.area
      } as RoomElement

    case 'poi':
      return {
        ...baseProps,
        type: 'poi',
        position: coordToPoint(feature.geometry.coordinates as number[]),
        poiType: props.poiType || 'custom',
        description: props.description,
        icon: props.icon,
        connectsTo: props.connectsTo
      } as POIElement

    case 'navpath':
      return {
        ...baseProps,
        type: 'navpath',
        points: coordsToPoints(feature.geometry.coordinates as number[][]),
        bidirectional: props.bidirectional !== false
      } as NavPathElement

    case 'navnode':
      return {
        ...baseProps,
        type: 'navnode',
        position: coordToPoint(feature.geometry.coordinates as number[]),
        connectedPaths: props.connectedPaths || []
      } as NavNodeElement

    default:
      console.warn(`Unknown feature type: ${type}`)
      return null
  }
}

// Convert GeoJSON coordinates to Point
function coordToPoint(coord: number[]): Point {
  return { x: coord[0], y: coord[1] }
}

// Convert GeoJSON coordinates array to Points
function coordsToPoints(coords: number[][]): Point[] {
  return coords.map(c => coordToPoint(c))
}

// Get default style for element type
function getDefaultStyle(type: string) {
  const styles: Record<string, any> = {
    wall: { strokeColor: '#333333', strokeWidth: 8, opacity: 1 },
    room: { strokeColor: '#666666', strokeWidth: 2, fillColor: '#E8F4F8', opacity: 0.5 },
    door: { strokeColor: '#8B4513', strokeWidth: 3, fillColor: '#DEB887', opacity: 1 },
    window: { strokeColor: '#87CEEB', strokeWidth: 3, fillColor: '#B0E0E6', opacity: 0.8 },
    poi: { strokeColor: '#FF6B6B', strokeWidth: 2, fillColor: '#FFE0E0', opacity: 1 },
    navpath: { strokeColor: '#4CAF50', strokeWidth: 2, opacity: 0.7 }
  }
  return styles[type] || { strokeColor: '#000000', strokeWidth: 1, opacity: 1 }
}

// Validate GeoJSON structure
export function validateGeoJSON(data: any): boolean {
  if (!data || typeof data !== 'object') return false
  if (data.type !== 'FeatureCollection') return false
  if (!Array.isArray(data.features)) return false

  for (const feature of data.features) {
    if (feature.type !== 'Feature') return false
    if (!feature.geometry || !feature.properties) return false
  }

  return true
}
