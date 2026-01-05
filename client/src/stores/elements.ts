import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  MapElement,
  WallElement,
  RoomElement,
  CorridorElement,
  HallElement,
  DoorElement,
  WindowElement,
  POIElement,
  PosterElement,
  TextElement,
  NavPathElement,
  NavNodeElement,
  Point,
  ElementStyle,
  HistoryAction
} from '@/types'

// Generate unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

// Default styles
const defaultStyles: Record<string, ElementStyle> = {
  wall: { strokeColor: '#333333', strokeWidth: 3, fillColor: undefined, opacity: 1 },
  room: { strokeColor: '#666666', strokeWidth: 2, fillColor: '#E8F4F8', opacity: 0.5 },
  corridor: { strokeColor: '#999999', strokeWidth: 2, fillColor: '#F5F5F5', opacity: 0.3 },
  hall: { strokeColor: '#888888', strokeWidth: 2, fillColor: '#FAFAFA', opacity: 0.3 },
  door: { strokeColor: '#8B4513', strokeWidth: 2, fillColor: '#DEB887', opacity: 1 },
  window: { strokeColor: '#4169E1', strokeWidth: 2, fillColor: '#87CEEB', opacity: 0.8 },
  poi: { strokeColor: '#FF6B6B', strokeWidth: 2, fillColor: '#FFE0E0', opacity: 1 },
  poster: { strokeColor: '#FFC107', strokeWidth: 2, fillColor: '#FFECB3', opacity: 1 },
  text: { strokeColor: '#333333', strokeWidth: 1, fillColor: undefined, opacity: 1 },
  navpath: { strokeColor: '#4CAF50', strokeWidth: 2, fillColor: undefined, opacity: 0.7 },
  navnode: { strokeColor: '#2196F3', strokeWidth: 2, fillColor: '#64B5F6', opacity: 1 }
}

export const useElementsStore = defineStore('elements', () => {
  // All elements indexed by floor
  const elementsByFloor = ref<Record<number, MapElement[]>>({
    1: []
  })

  // History for undo/redo
  const history = ref<HistoryAction[]>([])
  const historyIndex = ref<number>(-1)
  const maxHistoryLength = 50

  // Computed: get elements for current floor
  function getElementsByFloor(floor: number): MapElement[] {
    return elementsByFloor.value[floor] || []
  }

  // Computed: get all elements
  const allElements = computed(() => {
    return Object.values(elementsByFloor.value).flat()
  })

  // Get element by ID
  function getElementById(id: string): MapElement | undefined {
    for (const elements of Object.values(elementsByFloor.value)) {
      const element = elements.find(el => el.id === id)
      if (element) return element
    }
    return undefined
  }

  // Add element
  function addElement(element: Omit<MapElement, 'id' | 'visible' | 'locked' | 'style'> & Partial<Pick<MapElement, 'style'>>) {
    const floor = element.floor
    if (!elementsByFloor.value[floor]) {
      elementsByFloor.value[floor] = []
    }

    const newElement: MapElement = {
      ...element,
      id: generateId(),
      visible: true,
      locked: false,
      style: element.style || { ...defaultStyles[element.type] }
    } as MapElement

    elementsByFloor.value[floor].push(newElement)

    // Add to history
    pushHistory({
      type: 'add',
      elements: [newElement]
    })

    return newElement.id
  }

  // Create wall
  function createWall(floor: number, points: Point[], thickness: number = 1.5): string {
    return addElement({
      type: 'wall',
      floor,
      points: [...points],
      thickness
    } as Omit<WallElement, 'id' | 'visible' | 'locked' | 'style'>)
  }

  // Create room
  function createRoom(floor: number, points: Point[], name?: string): string {
    // Calculate area
    const area = calculatePolygonArea(points)
    return addElement({
      type: 'room',
      floor,
      points: [...points],
      name,
      area
    } as Omit<RoomElement, 'id' | 'visible' | 'locked' | 'style'>)
  }

  // Create POI
  function createPOI(floor: number, position: Point, poiType: string = 'custom', name?: string, accessNodeId?: string): string {
    return addElement({
      type: 'poi',
      floor,
      position: { ...position },
      poiType,
      name,
      accessNodeId
    } as unknown as Omit<POIElement, 'id' | 'visible' | 'locked' | 'style'>)
  }

  // Create navigation path
  function createNavPath(
    floor: number,
    points: Point[],
    bidirectional: boolean = true,
    startNodeId?: string,
    endNodeId?: string,
    distance?: number
  ): string {
    // Temporarily disable history during auto-association
    const wasRecordingHistory = historyIndex.value

    const pathId = addElement({
      type: 'navpath',
      floor,
      points: [...points],
      bidirectional,
      startNodeId,
      endNodeId,
      distance
    } as Omit<NavPathElement, 'id' | 'visible' | 'locked' | 'style'>)

    const nodesToUpdate: Array<{ id: string, oldPaths: string[], newPaths: string[] }> = []

    // Auto-associate with connected nodes (without creating history entries)
    if (startNodeId) {
      const startNode = getElementById(startNodeId) as NavNodeElement | undefined
      if (startNode && startNode.type === 'navnode') {
        if (!startNode.connectedPaths.includes(pathId)) {
          const oldPaths = [...startNode.connectedPaths]
          const newPaths = [...startNode.connectedPaths, pathId]
          startNode.connectedPaths = newPaths
          nodesToUpdate.push({ id: startNodeId, oldPaths, newPaths })
        }
      }
    }

    if (endNodeId && endNodeId !== startNodeId) {
      const endNode = getElementById(endNodeId) as NavNodeElement | undefined
      if (endNode && endNode.type === 'navnode') {
        if (!endNode.connectedPaths.includes(pathId)) {
          const oldPaths = [...endNode.connectedPaths]
          const newPaths = [...endNode.connectedPaths, pathId]
          endNode.connectedPaths = newPaths
          nodesToUpdate.push({ id: endNodeId, oldPaths, newPaths })
        }
      }
    }

    // Record a single batch history entry for path creation + node associations
    if (nodesToUpdate.length > 0) {
      const path = getElementById(pathId)
      const updatedNodes = nodesToUpdate.map(n => getElementById(n.id)!).filter(Boolean)

      // Remove the last history entry (path creation) and replace with batch
      if (history.value.length > 0) {
        history.value.pop()
        historyIndex.value--
      }

      // Add batch entry
      pushHistory({
        type: 'batch',
        elements: [path!, ...updatedNodes],
        previousState: [
          path!,
          ...nodesToUpdate.map(n => {
            const node = getElementById(n.id)!
            return { ...node, connectedPaths: n.oldPaths } as MapElement
          })
        ]
      })
    }

    return pathId
  }

  // Create navigation node
  function createNavNode(floor: number, position: Point, id?: string): string {
    // Extract index from ID if provided, or generate sequential ID
    let nodeId = id
    let index: number | undefined

    if (nodeId) {
      const validation = validateNavNodeId(nodeId)
      if (validation.valid) {
        index = validation.index
      }
    } else {
      // Auto-generate ID with default corridor 'a'
      nodeId = generateNavNodeId(floor, 'a')
      const validation = validateNavNodeId(nodeId)
      index = validation.index
    }

    const elementId = addElement({
      type: 'navnode',
      floor,
      position: { ...position },
      connectedPaths: [],
      index
    } as Omit<NavNodeElement, 'id' | 'visible' | 'locked' | 'style'>)

    // Update the generated element with custom ID if provided
    if (id) {
      const element = getElementById(elementId)
      if (element) {
        (element as any).id = id
      }
    }

    return elementId
  }

  // Create door
  function createDoor(floor: number, position: Point, width: number = 90, rotation: number = 0): string {
    return addElement({
      type: 'door',
      floor,
      position: { ...position },
      width,
      rotation,
      openDirection: 'right'
    } as Omit<DoorElement, 'id' | 'visible' | 'locked' | 'style'>)
  }

  // Create window
  function createWindow(floor: number, position: Point, width: number = 100, rotation: number = 0): string {
    return addElement({
      type: 'window',
      floor,
      position: { ...position },
      width,
      rotation
    } as Omit<WindowElement, 'id' | 'visible' | 'locked' | 'style'>)
  }

  // Create corridor
  function createCorridor(floor: number, points: Point[], name?: string): string {
    const area = calculatePolygonArea(points)
    return addElement({
      type: 'corridor',
      floor,
      points: [...points],
      name,
      area
    } as Omit<CorridorElement, 'id' | 'visible' | 'locked' | 'style'>)
  }

  // Create hall
  function createHall(floor: number, points: Point[], name?: string): string {
    const area = calculatePolygonArea(points)
    return addElement({
      type: 'hall',
      floor,
      points: [...points],
      name,
      area
    } as Omit<HallElement, 'id' | 'visible' | 'locked' | 'style'>)
  }

  // Create poster
  function createPoster(floor: number, position: Point, name?: string, rotation?: string, vertexId?: string): string {
    return addElement({
      type: 'poster',
      floor,
      position: { ...position },
      name,
      rotation,
      vertexId
    } as Omit<PosterElement, 'id' | 'visible' | 'locked' | 'style'>)
  }

  // Create text label
  function createText(
    floor: number,
    position: Point,
    text: string = 'Text',
    options?: {
      fontSize?: number
      fontFamily?: string
      color?: string
      rotation?: number
      alignment?: 'left' | 'center' | 'right'
      bold?: boolean
      italic?: boolean
    }
  ): string {
    return addElement({
      type: 'text',
      floor,
      position: { ...position },
      text,
      fontSize: options?.fontSize || 16,
      fontFamily: options?.fontFamily || 'Arial',
      color: options?.color || '#333333',
      rotation: options?.rotation || 0,
      alignment: options?.alignment || 'center',
      bold: options?.bold || false,
      italic: options?.italic || false
    } as Omit<TextElement, 'id' | 'visible' | 'locked' | 'style'>)
  }

  // Update element
  function updateElement(id: string, updates: Partial<MapElement>) {
    for (const floor in elementsByFloor.value) {
      const elements = elementsByFloor.value[floor]
      const index = elements.findIndex(el => el.id === id)
      if (index !== -1) {
        const oldElement = { ...elements[index] }
        elements[index] = { ...elements[index], ...updates } as MapElement

        pushHistory({
          type: 'update',
          elements: [elements[index]],
          previousState: [oldElement]
        })
        return
      }
    }
  }

  // Delete element
  function deleteElement(id: string) {
    for (const floor in elementsByFloor.value) {
      const elements = elementsByFloor.value[floor]
      const index = elements.findIndex(el => el.id === id)
      if (index !== -1) {
        const element = elements[index]
        const affectedElements: MapElement[] = [element]
        const previousStates: MapElement[] = [{ ...element }]

        // Clean up associations before deleting (without creating separate history entries)
        if (element.type === 'navpath') {
          // Remove this path from connected nodes
          const navPath = element as NavPathElement
          if (navPath.startNodeId) {
            const startNode = getElementById(navPath.startNodeId) as NavNodeElement | undefined
            if (startNode && startNode.type === 'navnode') {
              const oldPaths = [...startNode.connectedPaths]
              const newPaths = startNode.connectedPaths.filter(pid => pid !== id)
              if (oldPaths.length !== newPaths.length) {
                previousStates.push({ ...startNode })
                startNode.connectedPaths = newPaths
                affectedElements.push(startNode)
              }
            }
          }
          if (navPath.endNodeId && navPath.endNodeId !== navPath.startNodeId) {
            const endNode = getElementById(navPath.endNodeId) as NavNodeElement | undefined
            if (endNode && endNode.type === 'navnode') {
              const oldPaths = [...endNode.connectedPaths]
              const newPaths = endNode.connectedPaths.filter(pid => pid !== id)
              if (oldPaths.length !== newPaths.length) {
                previousStates.push({ ...endNode })
                endNode.connectedPaths = newPaths
                affectedElements.push(endNode)
              }
            }
          }
        } else if (element.type === 'navnode') {
          // Remove node reference from connected paths
          const navNode = element as NavNodeElement
          navNode.connectedPaths.forEach(pathId => {
            const path = getElementById(pathId) as NavPathElement | undefined
            if (path && path.type === 'navpath') {
              const oldPath = { ...path }
              const updates: Partial<NavPathElement> = {}
              if (path.startNodeId === id) {
                updates.startNodeId = undefined
              }
              if (path.endNodeId === id) {
                updates.endNodeId = undefined
              }
              if (Object.keys(updates).length > 0) {
                Object.assign(path, updates)
                previousStates.push(oldPath)
                affectedElements.push(path)
              }
            }
          })
        }

        const deleted = elements.splice(index, 1)

        // Push single batch history entry for deletion + cleanups
        pushHistory({
          type: affectedElements.length > 1 ? 'batch' : 'delete',
          elements: deleted,
          previousState: affectedElements.length > 1 ? previousStates : undefined
        })
        return
      }
    }
  }

  // Helper: Remove path from node's connectedPaths
  function cleanupNavNodePath(nodeId: string, pathId: string) {
    const node = getElementById(nodeId) as NavNodeElement | undefined
    if (node && node.type === 'navnode') {
      const newConnectedPaths = node.connectedPaths.filter(id => id !== pathId)
      if (newConnectedPaths.length !== node.connectedPaths.length) {
        updateElement(nodeId, {
          connectedPaths: newConnectedPaths
        })
      }
    }
  }

  // Helper: Validate NavNode ID format (Python format: a1, b2, c3, etc.)
  function validateNavNodeId(id: string): { valid: boolean; corridor?: string; index?: number; error?: string } {
    const match = id.match(/^([a-z]+)(\d+)$/i)
    if (!match) {
      return {
        valid: false,
        error: 'ID must be in format: letter(s) + number (e.g., a1, b2, corridor3)'
      }
    }
    return {
      valid: true,
      corridor: match[1].toLowerCase(),
      index: parseInt(match[2])
    }
  }

  // Helper: Get NavNodes in same corridor
  function getCorridorNavNodes(corridorId: string, floor?: number): NavNodeElement[] {
    const nodes: NavNodeElement[] = []
    const floorsToCheck = floor !== undefined ? [floor] : Object.keys(elementsByFloor.value)

    floorsToCheck.forEach(f => {
      const elements = elementsByFloor.value[f] || []
      elements.forEach(el => {
        if (el.type === 'navnode') {
          const validation = validateNavNodeId(el.id)
          if (validation.valid && validation.corridor === corridorId.toLowerCase()) {
            nodes.push(el as NavNodeElement)
          }
        }
      })
    })

    // Sort by index
    return nodes.sort((a, b) => {
      const aVal = validateNavNodeId(a.id)
      const bVal = validateNavNodeId(b.id)
      return (aVal.index || 0) - (bVal.index || 0)
    })
  }

  // Helper: Auto-assign NavNode index based on corridor
  function generateNavNodeId(floor: number, corridorId: string = 'a'): string {
    const existingNodes = getCorridorNavNodes(corridorId, floor)
    const maxIndex = existingNodes.length > 0
      ? Math.max(...existingNodes.map(n => validateNavNodeId(n.id).index || 0))
      : 0
    return `${corridorId}${maxIndex + 1}`
  }

  // Delete multiple elements with cascade cleanup
  function deleteElements(ids: string[]) {
    const deleted: MapElement[] = []
    const affectedElements: MapElement[] = []
    const previousStates: MapElement[] = []

    // First, collect elements to delete
    for (const floor in elementsByFloor.value) {
      for (const el of elementsByFloor.value[floor]) {
        if (ids.includes(el.id)) {
          deleted.push(el)
          previousStates.push({ ...el })

          // Perform cascade cleanup for each element
          if (el.type === 'navpath') {
            const navPath = el as NavPathElement
            // Remove this path from connected nodes
            if (navPath.startNodeId && !ids.includes(navPath.startNodeId)) {
              const startNode = getElementById(navPath.startNodeId) as NavNodeElement | undefined
              if (startNode && startNode.type === 'navnode') {
                const oldPaths = [...startNode.connectedPaths]
                const newPaths = startNode.connectedPaths.filter(pid => pid !== el.id)
                if (oldPaths.length !== newPaths.length) {
                  if (!affectedElements.some(e => e.id === startNode.id)) {
                    previousStates.push({ ...startNode })
                    startNode.connectedPaths = newPaths
                    affectedElements.push(startNode)
                  }
                }
              }
            }
            if (navPath.endNodeId && navPath.endNodeId !== navPath.startNodeId && !ids.includes(navPath.endNodeId)) {
              const endNode = getElementById(navPath.endNodeId) as NavNodeElement | undefined
              if (endNode && endNode.type === 'navnode') {
                const oldPaths = [...endNode.connectedPaths]
                const newPaths = endNode.connectedPaths.filter(pid => pid !== el.id)
                if (oldPaths.length !== newPaths.length) {
                  if (!affectedElements.some(e => e.id === endNode.id)) {
                    previousStates.push({ ...endNode })
                    endNode.connectedPaths = newPaths
                    affectedElements.push(endNode)
                  }
                }
              }
            }
          } else if (el.type === 'navnode') {
            const navNode = el as NavNodeElement
            // Remove node reference from connected paths
            navNode.connectedPaths.forEach(pathId => {
              if (!ids.includes(pathId)) {
                const path = getElementById(pathId) as NavPathElement | undefined
                if (path && path.type === 'navpath') {
                  if (!affectedElements.some(e => e.id === path.id)) {
                    const oldPath = { ...path }
                    const updates: Partial<NavPathElement> = {}
                    if (path.startNodeId === el.id) {
                      updates.startNodeId = undefined
                    }
                    if (path.endNodeId === el.id) {
                      updates.endNodeId = undefined
                    }
                    if (Object.keys(updates).length > 0) {
                      Object.assign(path, updates)
                      previousStates.push(oldPath)
                      affectedElements.push(path)
                    }
                  }
                }
              }
            })
          }
        }
      }
    }

    // Now delete the elements
    for (const floor in elementsByFloor.value) {
      elementsByFloor.value[floor] = elementsByFloor.value[floor].filter(el => !ids.includes(el.id))
    }

    // Push to history with all affected elements
    if (deleted.length > 0) {
      const allAffected = [...deleted, ...affectedElements]
      pushHistory({
        type: 'batch',
        elements: allAffected,
        previousState: previousStates
      })
    }
  }

  // Move element
  function moveElement(id: string, deltaX: number, deltaY: number) {
    const element = getElementById(id)
    if (!element) return

    if ('points' in element) {
      const newPoints = element.points.map(p => ({
        x: p.x + deltaX,
        y: p.y + deltaY
      }))
      updateElement(id, { points: newPoints } as Partial<MapElement>)
    } else if ('position' in element) {
      updateElement(id, {
        position: {
          x: element.position.x + deltaX,
          y: element.position.y + deltaY
        }
      } as Partial<MapElement>)
    }
  }

  // Update element points (for walls, paths, polygons, rooms)
  function updateElementPoints(id: string, points: Point[]) {
    const element = getElementById(id)
    if (!element) return

    // Only works for elements with points array
    if (!('points' in element)) return

    updateElement(id, { points: [...points] } as Partial<MapElement>)
  }

  // Remove a point from element by index
  function removePointFromElement(id: string, pointIndex: number) {
    const element = getElementById(id)
    if (!element) return

    // Only works for elements with points array
    if (!('points' in element)) return

    const newPoints = [...element.points]
    newPoints.splice(pointIndex, 1)

    // Determine minimum points required
    let minPoints = 2
    if (element.type === 'room' || element.type === 'polygon' ||
        element.type === 'corridor' || element.type === 'hall') {
      minPoints = 3 // Polygons need at least 3 points
    }

    // If not enough points left, delete the entire element
    if (newPoints.length < minPoints) {
      deleteElement(id)
      return
    }

    // Update with new points
    updateElement(id, { points: newPoints } as Partial<MapElement>)
  }

  // History management
  function pushHistory(action: HistoryAction) {
    // Remove any redo history
    history.value = history.value.slice(0, historyIndex.value + 1)
    history.value.push(action)
    historyIndex.value++

    // Limit history length
    if (history.value.length > maxHistoryLength) {
      history.value.shift()
      historyIndex.value--
    }
  }

  function undo() {
    if (historyIndex.value < 0) return

    const action = history.value[historyIndex.value]

    if (action.type === 'add') {
      // Remove added elements
      for (const element of action.elements) {
        const floor = element.floor
        const index = elementsByFloor.value[floor]?.findIndex(el => el.id === element.id)
        if (index !== undefined && index !== -1) {
          elementsByFloor.value[floor].splice(index, 1)
        }
      }
    } else if (action.type === 'delete') {
      // Restore deleted elements
      for (const element of action.elements) {
        if (!elementsByFloor.value[element.floor]) {
          elementsByFloor.value[element.floor] = []
        }
        elementsByFloor.value[element.floor].push(element)
      }
    } else if (action.type === 'update' && action.previousState) {
      // Restore previous state
      for (const element of action.previousState) {
        const floor = element.floor
        const index = elementsByFloor.value[floor]?.findIndex(el => el.id === element.id)
        if (index !== undefined && index !== -1) {
          elementsByFloor.value[floor][index] = element
        }
      }
    } else if (action.type === 'batch' && action.previousState) {
      // Restore all elements to previous state (for batch operations)
      for (const element of action.previousState) {
        const floor = element.floor
        const index = elementsByFloor.value[floor]?.findIndex(el => el.id === element.id)
        if (index !== undefined && index !== -1) {
          elementsByFloor.value[floor][index] = element
        }
      }
    }

    historyIndex.value--
  }

  function redo() {
    if (historyIndex.value >= history.value.length - 1) return

    historyIndex.value++
    const action = history.value[historyIndex.value]

    if (action.type === 'add') {
      // Re-add elements
      for (const element of action.elements) {
        if (!elementsByFloor.value[element.floor]) {
          elementsByFloor.value[element.floor] = []
        }
        elementsByFloor.value[element.floor].push(element)
      }
    } else if (action.type === 'delete') {
      // Re-delete elements
      for (const element of action.elements) {
        const floor = element.floor
        const index = elementsByFloor.value[floor]?.findIndex(el => el.id === element.id)
        if (index !== undefined && index !== -1) {
          elementsByFloor.value[floor].splice(index, 1)
        }
      }
    } else if (action.type === 'update') {
      // Apply updates
      for (const element of action.elements) {
        const floor = element.floor
        const index = elementsByFloor.value[floor]?.findIndex(el => el.id === element.id)
        if (index !== undefined && index !== -1) {
          elementsByFloor.value[floor][index] = element
        }
      }
    } else if (action.type === 'batch') {
      // Re-apply batch updates
      for (const element of action.elements) {
        const floor = element.floor
        const index = elementsByFloor.value[floor]?.findIndex(el => el.id === element.id)
        if (index !== undefined && index !== -1) {
          elementsByFloor.value[floor][index] = element
        }
      }
    }
  }

  const canUndo = computed(() => historyIndex.value >= 0)
  const canRedo = computed(() => historyIndex.value < history.value.length - 1)

  // Clear all elements
  function clearAll() {
    const allDeleted: MapElement[] = []
    for (const floor in elementsByFloor.value) {
      allDeleted.push(...elementsByFloor.value[floor])
      elementsByFloor.value[floor] = []
    }
    if (allDeleted.length > 0) {
      pushHistory({
        type: 'delete',
        elements: allDeleted
      })
    }
  }

  // Initialize floor
  function initFloor(floor: number) {
    if (!elementsByFloor.value[floor]) {
      elementsByFloor.value[floor] = []
    }
  }

  // Import multiple elements (supports undo as a single action)
  function importElements(elements: Array<Omit<MapElement, 'id' | 'visible' | 'locked' | 'style'> & Partial<Pick<MapElement, 'style'>>>) {
    const importedElements: MapElement[] = []

    for (const element of elements) {
      const floor = element.floor
      if (!elementsByFloor.value[floor]) {
        elementsByFloor.value[floor] = []
      }

      const newElement: MapElement = {
        ...element,
        id: generateId(),
        visible: true,
        locked: false,
        style: element.style || { ...defaultStyles[element.type] }
      } as MapElement

      elementsByFloor.value[floor].push(newElement)
      importedElements.push(newElement)
    }

    // Add all imported elements as a single history action
    if (importedElements.length > 0) {
      pushHistory({
        type: 'add',
        elements: importedElements
      })
    }

    return importedElements.length
  }

  // Copy elements from one floor to another
  function copyFloorElements(fromFloor: number, toFloor: number) {
    const sourceElements = elementsByFloor.value[fromFloor] || []
    if (!elementsByFloor.value[toFloor]) {
      elementsByFloor.value[toFloor] = []
    }

    const copiedElements: MapElement[] = []
    for (const element of sourceElements) {
      const newElement = {
        ...JSON.parse(JSON.stringify(element)),
        id: generateId(),
        floor: toFloor
      }
      elementsByFloor.value[toFloor].push(newElement)
      copiedElements.push(newElement)
    }

    if (copiedElements.length > 0) {
      pushHistory({
        type: 'add',
        elements: copiedElements
      })
    }
  }

  // Save to localStorage
  function saveToStorage() {
    try {
      const data = JSON.stringify(elementsByFloor.value)
      localStorage.setItem('indoor-map-elements', data)
      return true
    } catch (e) {
      console.error('Failed to save to localStorage:', e)
      return false
    }
  }

  // Load from localStorage
  function loadFromStorage(): boolean {
    try {
      const data = localStorage.getItem('indoor-map-elements')
      if (data) {
        const parsed = JSON.parse(data)
        elementsByFloor.value = parsed
        // Reset history after loading
        history.value = []
        historyIndex.value = -1
        return true
      }
      return false
    } catch (e) {
      console.error('Failed to load from localStorage:', e)
      return false
    }
  }

  // Check if has saved data
  function hasSavedData(): boolean {
    return localStorage.getItem('indoor-map-elements') !== null
  }

  // Clear saved data
  function clearSavedData() {
    localStorage.removeItem('indoor-map-elements')
  }

  return {
    elementsByFloor,
    allElements,
    getElementsByFloor,
    getElementById,
    addElement,
    createWall,
    createRoom,
    createCorridor,
    createHall,
    createPOI,
    createPoster,
    createText,
    createNavPath,
    createNavNode,
    createDoor,
    createWindow,
    updateElement,
    deleteElement,
    deleteElements,
    moveElement,
    updateElementPoints,
    removePointFromElement,
    undo,
    redo,
    canUndo,
    canRedo,
    clearAll,
    initFloor,
    importElements,
    copyFloorElements,
    saveToStorage,
    loadFromStorage,
    hasSavedData,
    clearSavedData,
    // Navigation helpers
    validateNavNodeId,
    getCorridorNavNodes,
    generateNavNodeId
  }
})

// Helper function to calculate polygon area
function calculatePolygonArea(points: Point[]): number {
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
