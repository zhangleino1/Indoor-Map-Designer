# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Indoor Map Designer - A web-based floor plan editor for creating indoor maps and exporting to GeoJSON format for navigation applications.

## Commands

### Development
```bash
# Run both client and server concurrently
npm run dev

# Run only the client (Vite dev server on http://localhost:3000)
npm run dev:client

# Run only the server (Express on http://localhost:3001)
npm run dev:server
```

### Installation
```bash
# Install all dependencies (root, client, and server)
npm run install:all
```

### Build
```bash
# Build client for production
npm run build
```

### Type Checking (client)
```bash
cd client && npx vue-tsc --noEmit
```

## Architecture

### Monorepo Structure
- `/client` - Vue 3 + TypeScript frontend with Vite
- `/server` - Express.js backend (project persistence API)
- Root `package.json` uses `concurrently` to run both

### Frontend State Management (Pinia Stores)
Three Pinia stores manage application state:

1. **`editor.ts`** - Editor UI state
   - Current tool, floor, zoom, pan offset
   - Grid/snap settings
   - Drawing state (points being drawn)
   - Selection state
   - Coordinate conversion: `screenToCanvas()` / `canvasToScreen()`

2. **`elements.ts`** - Map element data with undo/redo
   - Elements indexed by floor: `elementsByFloor: Record<number, MapElement[]>`
   - History stack with 50-action limit
   - Factory methods: `createWall()`, `createRoom()`, `createPOI()`, `createNavPath()`, `createNavNode()`, `createDoor()`, `createWindow()`
   - LocalStorage persistence: `saveToStorage()` / `loadFromStorage()`

3. **`floors.ts`** - Floor management
   - Add floors (above ground) or basements (negative IDs)
   - Duplicate floors with all elements

### Element Type System (`types/index.ts`)
All map elements extend `BaseElement` with these types:
- `WallElement` - LineString with thickness
- `RoomElement` - Polygon with area calculation
- `DoorElement` / `WindowElement` - Position + rotation
- `POIElement` - Point with poiType (elevator, stairs, toilet, exit, entrance, shop, office, custom)
- `NavPathElement` - LineString for navigation routing
- `NavNodeElement` - Navigation graph nodes

### Canvas Rendering (`CanvasView.vue`)
- Main drawing canvas with zoom/pan transforms
- Grid overlay with origin axes
- Tool-specific drawing handlers (click vs drag vs multi-point)
- Snap system integration for precision drawing
- Keyboard shortcuts handled in `handleKeyDown()`

### GeoJSON Export/Import (`utils/geojson.ts`)
- Converts internal elements to GeoJSON FeatureCollection
- Supports per-floor or all-floor export
- Import validates and reconstructs MapElement objects

### Snap System (`utils/snap.ts`)
- Priority: endpoint > midpoint > angle > grid
- `snapPoint()` returns `SnapResult` with snapped position and type
- Visual feedback indicators rendered for active snap type

## Key Patterns

### Element Creation Flow
1. User interaction in `CanvasView.vue` → calls `editorStore.startDrawing()`
2. Mouse events update `drawingPoints`
3. On finish → appropriate `elementsStore.create*()` method
4. History action pushed for undo support

### Coordinate Systems
- Canvas coordinates: Actual pixel positions on the HTML canvas
- World coordinates: Logical positions after zoom/pan transforms (1px = 1cm default)
- Scale setting controls display units (px/cm/m)

### Tool Switching
`editorStore.setTool()` returns previous drawing state so in-progress drawings can be saved before switching.
