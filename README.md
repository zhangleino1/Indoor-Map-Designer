# Indoor Map Designer

A web-based indoor map designer for creating floor plans and exporting GeoJSON for navigation.

## Features

- **Drawing Tools**: Wall, room, polygon, door, window, POI marker, navigation path
- **Multi-floor Support**: Manage multiple floors with easy switching
- **Precise Dimensions**: Real-time dimension display with unit conversion (px/cm/m)
- **Snap System**: Grid snapping and endpoint snapping for precision
- **Export Options**: GeoJSON, PNG, SVG export
- **Undo/Redo**: Full history management

## Tech Stack

- **Frontend**: Vue 3 + TypeScript + Canvas + Pinia + Element Plus
- **Backend**: Node.js + Express
- **Build Tool**: Vite

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

```bash
# Install all dependencies
npm run install:all

# Or install separately
cd client && npm install
cd ../server && npm install
```

### Development

```bash
# Run both client and server
npm run dev

# Or run separately
npm run dev:client  # Frontend on http://localhost:3000
npm run dev:server  # Backend on http://localhost:3001
```

### Build

```bash
npm run build
```

## Usage

### Keyboard Shortcuts

#### Tool Selection

| Key | Tool |
|-----|------|
| `V` | Select tool |
| `W` | Wall/Line tool |
| `Shift+W` | Window tool |
| `D` | Door tool |
| `R` | Room/Rectangle tool |
| `P` | Polygon tool |
| `M` | POI marker tool |
| `O` | Navigation node tool |
| `N` | Navigation path tool |

#### Drawing Mode (When Using Multi-point Tools)

**Multi-point tools**: Wall, NavPath, Polygon

| Key/Action | Effect |
|------------|--------|
| **Left Click** | Add point to current segment |
| **Double Click** | Finish current segment, stay in tool (can draw next segment) |
| **Right Click** | Finish current segment, stay in tool |
| **Enter** | Finish current segment, stay in tool |
| **Ctrl+Z** | Remove last point from current drawing |
| **Backspace** | Remove last point from current drawing |
| **Escape** | Cancel drawing and exit tool (switch to Select) |

**💡 Tip**: You can now draw multiple disconnected segments without exiting the tool!
- Example: Draw T-shaped wall → horizontal segment (double-click) → vertical segment (double-click) → Escape

#### Global Shortcuts

| Key | Action |
|-----|--------|
| **Ctrl+Z** | Undo (or remove last point when drawing) |
| **Ctrl+Shift+Z** | Redo |
| **Delete** | Delete selected elements |
| **Backspace** | Delete selected elements (or remove last point when drawing) |
| **Escape** | Cancel drawing / Clear selection / Exit tool |
| **Space** | Hold to enable pan mode (drag with mouse) |

### Mouse Controls

| Action | Effect |
|--------|--------|
| **Left Click** | Draw point / Select element |
| **Left Drag** | Draw rectangle (Room/Corridor/Hall) / Move selected element |
| **Double Click** | Finish current segment (multi-point tools) |
| **Right Click** | Finish current segment (when drawing) |
| **Ctrl + Scroll** | Zoom in/out |
| **Scroll** | Pan canvas vertically |
| **Shift + Scroll** | Pan canvas horizontally |
| **Middle Button Drag** | Pan canvas |
| **Space + Left Drag** | Pan canvas |

### Drawing Workflow Examples

#### Example 1: T-Shaped Wall
```
1. Press W (wall tool)
2. Click point 1 → point 2 → double-click (horizontal wall complete)
3. Click point 3 → point 4 → double-click (vertical wall complete, no connection!)
4. Press Escape (exit tool)
```

#### Example 2: Multiple Rooms
```
1. Press R (room tool)
2. Drag first room → release
3. Drag second room → release
4. Drag third room → release
...
n. Press Escape when done
```

#### Example 3: Complex Navigation Path
```
1. Press N (navpath tool)
2. Click points for route A → double-click (route A complete)
3. Click points for route B → double-click (route B complete)
4. Click points for route C → double-click (route C complete)
5. Press Escape (exit tool)
```

#### Example 4: Fix Wrong Point While Drawing
```
1. Drawing wall: point 1 → point 2 → point 3
2. Oops! Point 3 is wrong
3. Press Ctrl+Z (point 3 removed)
4. Click correct point 3 → continue drawing
5. Double-click to finish
```

## GeoJSON Output Format

```json
{
  "type": "FeatureCollection",
  "properties": {
    "name": "Building Name",
    "scale": 1,
    "unit": "cm"
  },
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[0,0], [500,0], [500,400], [0,400], [0,0]]]
      },
      "properties": {
        "id": "room-001",
        "type": "room",
        "floor": 1,
        "name": "Living Room",
        "area": 200000
      }
    }
  ]
}
```

## Project Structure

```
indoor-map-designer/
├── client/                 # Vue 3 frontend
│   ├── src/
│   │   ├── components/     # Vue components
│   │   ├── stores/         # Pinia stores
│   │   ├── types/          # TypeScript types
│   │   └── utils/          # Utility functions
│   └── package.json
├── server/                 # Node.js backend
│   ├── src/
│   │   ├── routes/         # API routes
│   │   └── index.ts        # Entry point
│   └── package.json
└── package.json            # Root package.json
```

## License

MIT
