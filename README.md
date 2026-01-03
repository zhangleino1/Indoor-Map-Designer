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

| Key | Action |
|-----|--------|
| V | Select tool |
| W | Wall/Line tool |
| R | Room/Rectangle tool |
| P | Polygon tool |
| D | Door tool |
| Shift+W | Window tool |
| M | POI marker tool |
| N | Navigation path tool |
| Delete | Delete selected elements |
| Ctrl+Z | Undo |
| Ctrl+Shift+Z | Redo |
| Escape | Cancel drawing / Clear selection |
| Enter | Finish drawing |

### Mouse Controls

- **Left Click**: Draw/Select
- **Right Click**: Cancel drawing
- **Double Click**: Finish polygon/path drawing
- **Ctrl + Scroll**: Zoom in/out
- **Scroll**: Pan canvas
- **Middle Button Drag**: Pan canvas

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
