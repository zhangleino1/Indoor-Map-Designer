# Indoor Map Designer

## Project Overview

**Indoor Map Designer** is a full-stack web application for creating indoor floor plans and exporting them as GeoJSON data for navigation purposes. It features a canvas-based editor with various drawing tools (walls, rooms, doors, POIs) and supports multi-floor management.

### Architecture

The project is structured as a monorepo with two main packages:

*   **Client (`client/`):** A Vue 3 application built with Vite, handling the UI and drawing logic.
*   **Server (`server/`):** A Node.js/Express application handling project storage (local JSON files) and GeoJSON export.

### Tech Stack

**Frontend:**
*   **Framework:** Vue 3 (Composition API)
*   **Language:** TypeScript
*   **State Management:** Pinia
*   **Build Tool:** Vite
*   **UI Component Library:** Element Plus
*   **Graphics:** HTML5 Canvas (custom implementation in `client/src/components/Canvas/`)

**Backend:**
*   **Runtime:** Node.js
*   **Framework:** Express
*   **Language:** TypeScript (executed via `tsx` in development)
*   **Storage:** File-system based (JSON files stored in `server/data/projects/`)

## Building and Running

### Prerequisites
*   Node.js 18+
*   npm

### Setup
Install dependencies for both client and server from the root directory:
```bash
npm run install:all
```
*Alternatively, you can run `npm install` in the root, `client/`, and `server/` directories separately.*

### Development
Start both the client and server concurrently:
```bash
npm run dev
```
*   **Frontend:** `http://localhost:3000`
*   **Backend:** `http://localhost:3001`

**Individual Commands:**
*   **Client only:** `cd client && npm run dev`
*   **Server only:** `cd server && npm run dev`

### Build
Build the frontend for production:
```bash
npm run build
```
*(This command runs `npm run build` inside the `client` directory).*

## Key Features & Usage

*   **Tools:** Walls (`W`), Rooms (`R`), Polygons (`P`), Doors (`D`), Windows (`Shift+W`), POIs (`M`), Navigation Paths (`N`).
*   **Interaction:** Left-click to draw, Right-click to cancel/finish, Scroll/Drag to pan and zoom.
*   **Data Model:** Projects support multiple floors. Elements (walls, rooms, etc.) are associated with specific floors.
*   **Export:** Projects can be exported to standard GeoJSON format (`FeatureCollection`).

## Codebase Conventions

### Directory Structure
*   `client/src/components`: UI components. `CanvasView.vue` is the core drawing component.
*   `client/src/stores`: Pinia stores. `editor.ts` manages the editor state (tool selection, zoom, selection).
*   `client/src/utils`: Helper logic for geometry (`geometry.ts`) and GeoJSON conversion (`geojson.ts`).
*   `server/src/routes`: API route definitions. `projects.ts` handles CRUD operations and export logic.
*   `server/data/projects`: Default location where project JSON files are saved.

### Development Standards
*   **Styling:** Uses scoped CSS in Vue components and Element Plus for UI elements.
*   **Type Safety:** Strict TypeScript configuration. Shared types are typically defined in `client/src/types/index.ts` (and duplicated or loosely matched in server interfaces - *note: check for type sharing opportunities*).
*   **API Pattern:** The client proxies `/api` requests to the backend. The backend uses a simple RESTful structure.

### Key Configuration Files
*   `vite.config.ts` (Client): Configures the dev server proxy to localhost:3001.
*   `server/src/index.ts` (Server): Sets up the Express app, CORS, and the file-based "database" directory.
