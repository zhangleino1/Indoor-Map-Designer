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
  | 'navpath'
  | 'navnode'

// Element types
export type ElementType =
  | 'wall'
  | 'room'
  | 'door'
  | 'window'
  | 'poi'
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
}

// Navigation path element
export interface NavPathElement extends BaseElement {
  type: 'navpath'
  points: Point[]
  bidirectional: boolean
}

// Navigation node element
export interface NavNodeElement extends BaseElement {
  type: 'navnode'
  position: Point
  connectedPaths: string[]
}

// Union type for all elements
export type MapElement =
  | WallElement
  | RoomElement
  | DoorElement
  | WindowElement
  | POIElement
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
