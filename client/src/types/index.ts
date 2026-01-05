// Basic geometry types
export interface Point {
  x: number
  y: number
}

export interface Bounds {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

// Tool types
export type ToolType =
  | 'select'
  | 'wall'
  | 'room'
  | 'polygon'
  | 'door'
  | 'window'
  | 'poi'
  | 'text'
  | 'corridor'
  | 'hall'
  | 'poster'
  | 'navpath'
  | 'navnode'

// Element types
export type ElementType =
  | 'wall'
  | 'room'
  | 'corridor'
  | 'hall'
  | 'door'
  | 'window'
  | 'poi'
  | 'poster'
  | 'text'
  | 'navpath'
  | 'navnode'

// POI subtypes
export type POIType =
  | 'elevator'
  | 'stairs'
  | 'toilet'
  | 'exit'
  | 'entrance'
  | 'shop'
  | 'office'
  | 'custom'

// Base element interface
export interface BaseElement {
  id: string
  type: ElementType
  floor: number
  name?: string
  visible: boolean
  locked: boolean
  style: ElementStyle
}

// Element style
export interface ElementStyle {
  strokeColor: string
  strokeWidth: number
  fillColor?: string
  opacity: number
}

// Wall element (LineString)
export interface WallElement extends BaseElement {
  type: 'wall'
  points: Point[]
  thickness: number
}

// Room element (Polygon)
export interface RoomElement extends BaseElement {
  type: 'room'
  points: Point[]
  area?: number
  // Navigation support for Python GeoJSON format
  doors?: Point[]              // Door positions on room perimeter
  doorVertices?: Point[]       // Closest corridor points to each door
  doorVertexIds?: string[]     // Navigation vertex IDs for each door
}

// Corridor element (Polygon - walkable area)
export interface CorridorElement extends BaseElement {
  type: 'corridor'
  points: Point[]
  area?: number
}

// Hall element (Polygon - large walkable area)
export interface HallElement extends BaseElement {
  type: 'hall'
  points: Point[]
  area?: number
}

// Door element
export interface DoorElement extends BaseElement {
  type: 'door'
  position: Point
  width: number
  rotation: number  // in degrees
  openDirection?: 'left' | 'right' | 'both'
}

// Window element
export interface WindowElement extends BaseElement {
  type: 'window'
  position: Point
  width: number
  rotation: number  // in degrees
}

// POI element (Point with type)
export interface POIElement extends BaseElement {
  type: 'poi'
  position: Point
  poiType: POIType
  icon?: string
  description?: string
  connectsTo?: number[] // Connected floors for elevator/stairs
  // Navigation support for Python GeoJSON format
  gender?: 'men' | 'women' // For toilet POIs
  doors?: Point[]          // Door positions (POIs are rendered as polygons in Python format)
  doorVertices?: Point[]   // Closest corridor points
  doorVertexIds?: string[] // Navigation vertex IDs
  accessNodeId?: string    // Deprecated: use doorVertexIds instead
}

// Poster element (Point - information display)
export interface PosterElement extends BaseElement {
  type: 'poster'
  position: Point
  rotation?: string        // Direction vector like "'-1,0'" or "'0,1'"
  vertexId?: string        // Associated navigation vertex ID
}

// Text label element for annotations
export interface TextElement extends BaseElement {
  type: 'text'
  position: Point        // Text position (anchor point)
  text: string          // Text content
  fontSize?: number     // Font size in pixels (default: 16)
  fontFamily?: string   // Font family (default: 'Arial')
  color?: string        // Text color (default: '#333333')
  rotation?: number     // Rotation angle in degrees (default: 0)
  alignment?: 'left' | 'center' | 'right'  // Text alignment (default: 'center')
  bold?: boolean        // Bold text (default: false)
  italic?: boolean      // Italic text (default: false)
}

// Navigation path element
export interface NavPathElement extends BaseElement {
  type: 'navpath'
  points: Point[]
  bidirectional: boolean
  startNodeId?: string  // Connected node at start point
  endNodeId?: string    // Connected node at end point
  distance?: number     // Path length in meters
}

// Navigation node element
export interface NavNodeElement extends BaseElement {
  type: 'navnode'
  position: Point
  connectedPaths: string[] // Internal use: connected NavPath elements
  // Python GeoJSON format support
  rotation?: string        // Direction vector "0,1" or "1,0" (x,y)
  index?: number           // Sequential index within floor
  intersectionWith?: string // ID of connected vertex at intersection (inct)
}

// Union type for all elements
export type MapElement =
  | WallElement
  | RoomElement
  | CorridorElement
  | HallElement
  | DoorElement
  | WindowElement
  | POIElement
  | PosterElement
  | TextElement
  | NavPathElement
  | NavNodeElement

// Floor data
export interface Floor {
  id: number
  name: string
  visible: boolean
  elements: MapElement[]
}

// Project data
export interface Project {
  id: string
  name: string
  scale: number // pixels per cm
  unit: 'px' | 'cm' | 'm'
  width: number
  height: number
  floors: Floor[]
  createdAt: string
  updatedAt: string
}

// Editor state
export interface EditorState {
  currentTool: ToolType
  currentFloor: number
  selectedIds: string[]
  zoom: number
  panOffset: Point
  gridSize: number
  showGrid: boolean
  snapToGrid: boolean
  snapToEndpoint: boolean
}

// History action for undo/redo
export interface HistoryAction {
  type: 'add' | 'delete' | 'update' | 'batch'
  elements: MapElement[]
  previousState?: MapElement[]
}

// GeoJSON types
export interface GeoJSONFeature {
  type: 'Feature'
  geometry: {
    type: 'Point' | 'LineString' | 'Polygon'
    coordinates: number[] | number[][] | number[][][]
  }
  properties: Record<string, any>
}

export interface GeoJSONCollection {
  type: 'FeatureCollection'
  properties: {
    name: string
    scale: number
    unit: string
    coordinateSystem?: 'relative' | 'geographic' // Coordinate system type
    origin?: string              // Origin point description (e.g., 'canvas_topleft')
    floor?: number
    floorName?: string
    [key: string]: any
  }
  features: GeoJSONFeature[]
}

// Snap result
export interface SnapResult {
  snapped: boolean
  point: Point
  type: 'grid' | 'endpoint' | 'midpoint' | 'intersection' | 'none'
}
