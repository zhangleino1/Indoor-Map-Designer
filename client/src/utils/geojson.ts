import type {
  MapElement,
  WallElement,
  RoomElement,
  CorridorElement,
  HallElement,
  POIElement,
  PosterElement,
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

  // Python GeoJSON format: door/vertex/vertex_id properties
  const multiDoor = room.doors && room.doors.length > 1 ? '1' : '0'
  const doorCoords = room.doors?.map(d => `${d.x},${d.y}`).join(';') || ''
  const vertexCoords = room.doorVertices?.map(v => `${v.x},${v.y}`).join(';') || ''
  const vertexIds = room.doorVertexIds?.join(';') || ''

  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [coords]
    },
    properties: {
      type: 'room',
      id: room.id,
      name: room.name,
      multi_door: multiDoor,
      door: doorCoords,
      vertex: vertexCoords,
      vertex_id: vertexIds,
      // Keep original properties for compatibility
      floor: room.floor,
      area: room.area || calculatePolygonArea(room.points),
      style: room.style
    }
  }
}

// Convert POI element to GeoJSON feature (Python format compatible)
function poiToFeature(poi: POIElement): GeoJSONFeature {
  // Map POI types to Python GeoJSON format
  let exportType = poi.poiType
  switch (poi.poiType) {
    case 'elevator':
      exportType = 'elevator'
      break
    case 'stairs':
      exportType = 'stair'
      break
    case 'toilet':
      exportType = poi.gender === 'men' ? 'men_toilet' :
                   poi.gender === 'women' ? 'women_toilet' : 'toilet'
      break
    // Other types keep original name
    default:
      exportType = poi.poiType
  }

  // Python format uses Polygon geometry for POIs (not Point)
  // Create a small polygon around the position if not provided
  const poiPolygon = poi.doors && poi.doors.length > 0
    ? ensureClosedPolygon(pointsToCoords(poi.doors))
    : createDefaultPOIPolygon(poi.position)

  // Python GeoJSON format: door/vertex/vertex_id properties
  const multiDoor = poi.doors && poi.doors.length > 1 ? '1' : '0'
  const doorCoords = poi.doors?.map(d => `${d.x},${d.y}`).join(';') || `${poi.position.x},${poi.position.y}`
  const vertexCoords = poi.doorVertices?.map(v => `${v.x},${v.y}`).join(';') || ''
  const vertexIds = poi.doorVertexIds?.join(';') || poi.accessNodeId || ''

  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [poiPolygon]
    },
    properties: {
      type: exportType,
      id: poi.id,
      name: poi.name,
      multi_door: multiDoor,
      door: doorCoords,
      vertex: vertexCoords,
      vertex_id: vertexIds,
      // Keep original properties for compatibility
      floor: poi.floor,
      poiType: poi.poiType,
      description: poi.description,
      icon: poi.icon,
      connectsTo: poi.connectsTo,
      style: poi.style
    }
  }
}

// Helper: Create a small square polygon around a point (default 2x2 units)
function createDefaultPOIPolygon(center: Point, size = 2): number[][] {
  const half = size / 2
  return [
    [center.x - half, center.y - half],
    [center.x + half, center.y - half],
    [center.x + half, center.y + half],
    [center.x - half, center.y + half],
    [center.x - half, center.y - half] // Close the polygon
  ]
}

// Helper: Ensure polygon is closed
function ensureClosedPolygon(coords: number[][]): number[][] {
  if (coords.length > 0) {
    const first = coords[0]
    const last = coords[coords.length - 1]
    if (first[0] !== last[0] || first[1] !== last[1]) {
      return [...coords, [...first]]
    }
  }
  return coords
}

// Convert navigation path to GeoJSON feature (Explicit edge format for Python)
function navPathToFeature(navPath: NavPathElement): GeoJSONFeature {
  // Calculate distance in meters (1px = 1cm, so /100 for meters)
  const lengthInCm = calculateLineLength(navPath.points)
  const distanceInMeters = lengthInCm / 100

  return {
    type: 'Feature',
    geometry: {
      type: 'LineString',
      coordinates: pointsToCoords(navPath.points)
    },
    properties: {
      // Python format: explicit edge with start/end nodes
      type: 'edge',  // Changed from 'navpath' to 'edge' for Python compatibility
      id: navPath.id,
      start_node: navPath.startNodeId || '',  // Explicit start node ID
      end_node: navPath.endNodeId || '',      // Explicit end node ID
      bidirectional: navPath.bidirectional !== false,
      distance: distanceInMeters,  // Distance in meters
      weight: navPath.distance || distanceInMeters,  // Allow custom weight
      floor: navPath.floor,
      // Designer-specific properties (for re-import)
      name: navPath.name,
      style: navPath.style,
      _designer_type: 'navpath'  // Preserve original type for import
    }
  }
}

// Convert corridor element to GeoJSON feature
function corridorToFeature(corridor: CorridorElement): GeoJSONFeature {
  const coords = ensureClosedPolygon(pointsToCoords(corridor.points))

  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [coords]
    },
    properties: {
      type: 'corridor',
      id: corridor.id,
      name: corridor.name,
      // Python format typically doesn't have door/vertex for corridors
      floor: corridor.floor,
      area: corridor.area || calculatePolygonArea(corridor.points),
      style: corridor.style
    }
  }
}

// Convert hall element to GeoJSON feature
function hallToFeature(hall: HallElement): GeoJSONFeature {
  const coords = ensureClosedPolygon(pointsToCoords(hall.points))

  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [coords]
    },
    properties: {
      type: 'hall',
      id: hall.id,
      name: hall.name,
      // Python format typically doesn't have door/vertex for halls
      floor: hall.floor,
      area: hall.area || calculatePolygonArea(hall.points),
      style: hall.style
    }
  }
}

// Convert poster element to GeoJSON feature
function posterToFeature(poster: PosterElement): GeoJSONFeature {
  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: pointToCoords(poster.position)
    },
    properties: {
      type: 'poster',
      id: poster.id,
      name: poster.name,
      floor: poster.floor,
      rotation: poster.rotation || '0,1',
      multi_door: '0',
      door: `${poster.position.x},${poster.position.y}`,
      vertex: '', // Posters typically don't have vertex in Python format
      vertex_id: poster.vertexId || '',
      style: poster.style
    }
  }
}

// Convert door element to GeoJSON feature
function doorToFeature(door: any): GeoJSONFeature {
  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: pointToCoords(door.position)
    },
    properties: {
      type: 'door',
      id: door.id,
      name: door.name,
      floor: door.floor,
      width: door.width,
      rotation: door.rotation,
      openDirection: door.openDirection,
      style: door.style
    }
  }
}

// Convert window element to GeoJSON feature
function windowToFeature(window: any): GeoJSONFeature {
  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: pointToCoords(window.position)
    },
    properties: {
      type: 'window',
      id: window.id,
      name: window.name,
      floor: window.floor,
      width: window.width,
      rotation: window.rotation,
      style: window.style
    }
  }
}

// Convert navigation node to GeoJSON feature (Python format: type "point")
function navNodeToFeature(navNode: NavNodeElement): GeoJSONFeature {
  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: pointToCoords(navNode.position)
    },
    properties: {
      type: 'point',  // Python format uses "point" not "navnode"
      id: navNode.id,
      rotation: navNode.rotation || '0,1',
      index: String(navNode.index ?? 0),
      // Include inct only if it exists
      ...(navNode.intersectionWith && { inct: navNode.intersectionWith }),
      // Keep original properties for compatibility
      floor: navNode.floor,
      name: navNode.name,
      connectedPaths: navNode.connectedPaths,
      style: navNode.style
    }
  }
}

// Convert any element to GeoJSON feature
export function elementToFeature(element: MapElement): GeoJSONFeature | null {
  switch (element.type) {
    case 'wall':
      return wallToFeature(element as WallElement)
    case 'room':
      return roomToFeature(element as RoomElement)
    case 'corridor':
      return corridorToFeature(element as CorridorElement)
    case 'hall':
      return hallToFeature(element as HallElement)
    case 'poi':
      return poiToFeature(element as POIElement)
    case 'poster':
      return posterToFeature(element as PosterElement)
    case 'navpath':
      return navPathToFeature(element as NavPathElement)
    case 'navnode':
      return navNodeToFeature(element as NavNodeElement)
    case 'door':
      return doorToFeature(element as any)
    case 'window':
      return windowToFeature(element as any)
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
  },
  options?: {
    coordinateSystem?: 'relative' | 'geographic'  // Coordinate system type
    origin?: string              // Origin description
  }
): GeoJSONCollection {
  const features: GeoJSONFeature[] = []

  for (const floor in elementsByFloor) {
    for (const element of elementsByFloor[floor]) {
      if (element.visible) {
        const feature = elementToFeature(element)
        if (feature) {
          features.push(feature)
        }
      }
    }
  }

  return {
    type: 'FeatureCollection',
    properties: {
      name: projectInfo.name,
      scale: projectInfo.scale,
      unit: projectInfo.unit,
      coordinateSystem: options?.coordinateSystem || 'relative',
      origin: options?.origin || 'canvas_topleft',
      format_version: '2.0',  // Mark as new explicit edge format
      edge_type: 'explicit'   // Indicate explicit edges (not implicit)
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
  },
  options?: {
    coordinateSystem?: 'relative' | 'geographic'
    origin?: string
  }
): GeoJSONCollection {
  const features: GeoJSONFeature[] = elements
    .filter(el => el.visible)
    .map(el => elementToFeature(el))
    .filter((f): f is GeoJSONFeature => f !== null)

  return {
    type: 'FeatureCollection',
    properties: {
      name: `${projectInfo.name} - ${floor.name}`,
      scale: projectInfo.scale,
      unit: projectInfo.unit,
      coordinateSystem: options?.coordinateSystem || 'relative',
      origin: options?.origin || 'canvas_topleft',
      format_version: '2.0',
      edge_type: 'explicit',
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
    id: `imported-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,  // Always generate new ID to avoid collisions
    floor: props.floor || 1,
    name: props.name,
    visible: true,
    locked: false,
    style: props.style || getDefaultStyle(type)
  }

  // Helper: Parse door/vertex properties from Python format
  const parseDoorVertexProps = (props: any) => {
    const result: any = {}

    if (props.door) {
      const doorStrs = props.door.split(';')
      result.doors = doorStrs.map((str: string) => {
        const [x, y] = str.split(',').map(Number)
        return { x, y }
      })
    }

    if (props.vertex) {
      const vertexStrs = props.vertex.split(';')
      result.doorVertices = vertexStrs.map((str: string) => {
        const [x, y] = str.split(',').map(Number)
        return { x, y }
      })
    }

    if (props.vertex_id) {
      result.doorVertexIds = props.vertex_id.split(';')
    }

    return result
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
      const roomCoords = (feature.geometry.coordinates as number[][][])[0]
      return {
        ...baseProps,
        type: 'room',
        points: coordsToPoints(roomCoords),
        area: props.area,
        ...parseDoorVertexProps(props)
      } as RoomElement

    case 'corridor':
      const corridorCoords = (feature.geometry.coordinates as number[][][])[0]
      return {
        ...baseProps,
        type: 'corridor',
        points: coordsToPoints(corridorCoords),
        area: props.area
      } as CorridorElement

    case 'hall':
      const hallCoords = (feature.geometry.coordinates as number[][][])[0]
      return {
        ...baseProps,
        type: 'hall',
        points: coordsToPoints(hallCoords),
        area: props.area
      } as HallElement

    // Python format POI types
    case 'elevator':
    case 'stair':
    case 'men_toilet':
    case 'women_toilet':
    case 'poi':
      // Map Python types back to POI types
      let poiType: any = props.poiType || 'custom'
      let gender: 'men' | 'women' | undefined

      if (type === 'elevator') poiType = 'elevator'
      else if (type === 'stair') poiType = 'stairs'
      else if (type === 'men_toilet') {
        poiType = 'toilet'
        gender = 'men'
      } else if (type === 'women_toilet') {
        poiType = 'toilet'
        gender = 'women'
      }

      // Extract position from polygon or point geometry
      let position: Point
      if (feature.geometry.type === 'Point') {
        position = coordToPoint(feature.geometry.coordinates as number[])
      } else {
        // If polygon, use centroid or first point
        const coords = (feature.geometry.coordinates as number[][][])[0]
        position = coordToPoint(coords[0])
      }

      return {
        ...baseProps,
        type: 'poi',
        position,
        poiType,
        gender,
        description: props.description,
        icon: props.icon,
        connectsTo: props.connectsTo,
        ...parseDoorVertexProps(props)
      } as POIElement

    case 'poster':
      return {
        ...baseProps,
        type: 'poster',
        position: coordToPoint(feature.geometry.coordinates as number[]),
        rotation: props.rotation,
        vertexId: props.vertex_id
      } as PosterElement

    case 'door':
      return {
        ...baseProps,
        type: 'door',
        position: coordToPoint(feature.geometry.coordinates as number[]),
        width: props.width || 90,
        rotation: props.rotation || 0,
        openDirection: props.openDirection || 'right'
      } as any

    case 'window':
      return {
        ...baseProps,
        type: 'window',
        position: coordToPoint(feature.geometry.coordinates as number[]),
        width: props.width || 100,
        rotation: props.rotation || 0
      } as any

    // Import edge (NavPath) - support both 'edge' and 'navpath' types
    case 'edge':
    case 'navpath':
      return {
        ...baseProps,
        type: 'navpath',
        points: coordsToPoints(feature.geometry.coordinates as number[][]),
        bidirectional: props.bidirectional !== false,
        startNodeId: props.start_node,
        endNodeId: props.end_node,
        distance: props.distance
      } as NavPathElement

    // Python format uses "point" for navigation nodes
    case 'point':
    case 'navnode':
      return {
        ...baseProps,
        type: 'navnode',
        position: coordToPoint(feature.geometry.coordinates as number[]),
        connectedPaths: props.connectedPaths || [],
        rotation: props.rotation,
        index: props.index ? parseInt(props.index) : undefined,
        intersectionWith: props.inct
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
    corridor: { strokeColor: '#999999', strokeWidth: 2, fillColor: '#F5F5F5', opacity: 0.3 },
    hall: { strokeColor: '#888888', strokeWidth: 2, fillColor: '#FAFAFA', opacity: 0.3 },
    door: { strokeColor: '#8B4513', strokeWidth: 3, fillColor: '#DEB887', opacity: 1 },
    window: { strokeColor: '#87CEEB', strokeWidth: 3, fillColor: '#B0E0E6', opacity: 0.8 },
    poi: { strokeColor: '#FF6B6B', strokeWidth: 2, fillColor: '#FFE0E0', opacity: 1 },
    elevator: { strokeColor: '#9C27B0', strokeWidth: 2, fillColor: '#E1BEE7', opacity: 0.8 },
    stair: { strokeColor: '#FF9800', strokeWidth: 2, fillColor: '#FFE0B2', opacity: 0.8 },
    men_toilet: { strokeColor: '#2196F3', strokeWidth: 2, fillColor: '#BBDEFB', opacity: 0.8 },
    women_toilet: { strokeColor: '#E91E63', strokeWidth: 2, fillColor: '#F8BBD0', opacity: 0.8 },
    poster: { strokeColor: '#FFC107', strokeWidth: 2, fillColor: '#FFECB3', opacity: 1 },
    point: { strokeColor: '#4CAF50', strokeWidth: 2, fillColor: '#C8E6C9', opacity: 1 },
    navpath: { strokeColor: '#4CAF50', strokeWidth: 2, opacity: 0.7 },
    navnode: { strokeColor: '#4CAF50', strokeWidth: 2, fillColor: '#C8E6C9', opacity: 1 }
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
