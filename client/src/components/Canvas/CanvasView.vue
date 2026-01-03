<template>
  <div
    ref="containerRef"
    class="canvas-wrapper"
    @wheel="handleWheel"
    @mousedown="handleMouseDown"
    @mousemove="handleMouseMove"
    @mouseup="handleMouseUp"
    @mouseleave="handleMouseLeave"
    @dblclick="handleDoubleClick"
    @contextmenu.prevent="handleContextMenu"
  >
    <canvas ref="canvasRef" class="main-canvas"></canvas>

    <!-- Dimension label overlay -->
    <div
      v-if="currentDimension"
      class="dimension-label"
      :style="dimensionLabelStyle"
    >
      {{ currentDimension }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useEditorStore } from '@/stores/editor'
import { useElementsStore } from '@/stores/elements'
import type { Point, MapElement, ToolType } from '@/types'
import { snapPoint, type SnapOptions } from '@/utils/snap'
import type { SnapResult } from '@/types'
import {
  distance,
  elementContainsPoint,
  createRectangle
} from '@/utils/geometry'

const containerRef = ref<HTMLDivElement>()
const canvasRef = ref<HTMLCanvasElement>()
const ctx = ref<CanvasRenderingContext2D | null>(null)

const editorStore = useEditorStore()
const elementsStore = useElementsStore()

const {
  currentTool,
  currentFloor,
  selectedIds,
  zoom,
  panOffset,
  gridSize,
  showGrid,
  snapToGrid,
  snapToEndpoint,
  isDrawing,
  drawingPoints,
  hoverPoint,
  layerVisibility,
  currentPoiType
} = storeToRefs(editorStore)

// Mouse state
const isPanning = ref(false)
const isSpacePressed = ref(false)  // Track space key for panning mode
const lastMousePos = ref<Point>({ x: 0, y: 0 })
const startDragPos = ref<Point | null>(null)
const isDragging = ref(false)

// Dimension display
const currentDimension = ref<string>('')
const dimensionPos = ref<Point>({ x: 0, y: 0 })

// Snap type for visual feedback
const currentSnapType = ref<'none' | 'grid' | 'endpoint' | 'midpoint'>('none')

const dimensionLabelStyle = computed(() => ({
  left: `${dimensionPos.value.x}px`,
  top: `${dimensionPos.value.y}px`
}))

// Get current floor elements
const currentElements = computed(() => {
  return elementsStore.getElementsByFloor(currentFloor.value).filter(
    el => el.visible && layerVisibility.value[el.type]
  )
})

// Initialize canvas
onMounted(() => {
  if (!canvasRef.value || !containerRef.value) return

  ctx.value = canvasRef.value.getContext('2d')
  resizeCanvas()
  window.addEventListener('resize', resizeCanvas)
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
  window.addEventListener('saveDrawing', handleSaveDrawingEvent as EventListener)

  // Initial render
  render()
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeCanvas)
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
  window.removeEventListener('saveDrawing', handleSaveDrawingEvent as EventListener)
})

// 处理工具栏切换时的绘制保存事件
function handleSaveDrawingEvent(e: CustomEvent) {
  const { points, tool } = e.detail
  saveDrawingAsElement(points, tool, currentFloor.value)
}

// 安全切换工具，会自动保存正在绘制的内容
function switchTool(newTool: ToolType) {
  const { previousPoints, previousTool, wasDrawing } = editorStore.setTool(newTool)
  
  // 如果正在绘制且有足够的点，保存元素
  if (wasDrawing && previousPoints.length >= 2) {
    saveDrawingAsElement(previousPoints, previousTool, currentFloor.value)
  }
}

// 将绘制的点保存为元素
function saveDrawingAsElement(points: Point[], tool: ToolType, floor: number) {
  if (points.length < 1) return
  
  switch (tool) {
    case 'wall':
      if (points.length >= 2) {
        elementsStore.createWall(floor, points)
      }
      break
    case 'room':
      if (points.length >= 2) {
        const rect = createRectangle(points[0], points[points.length - 1])
        elementsStore.createRoom(floor, rect)
      }
      break
    case 'polygon':
      if (points.length >= 3) {
        elementsStore.createRoom(floor, [...points, points[0]])
      }
      break
    case 'navpath':
      if (points.length >= 2) {
        elementsStore.createNavPath(floor, points)
      }
      break
    case 'poi':
      // POI只需要一个点
      elementsStore.createPOI(floor, points[0], currentPoiType.value)
      break
    case 'navnode':
      // 导航节点只需要一个点
      elementsStore.createNavNode(floor, points[0])
      break
  }
}

// Watch for changes that require re-render
watch([
  currentElements,
  zoom,
  panOffset,
  showGrid,
  gridSize,
  selectedIds,
  isDrawing,
  drawingPoints,
  hoverPoint
], () => {
  render()
}, { deep: true })

function resizeCanvas() {
  if (!canvasRef.value || !containerRef.value) return

  const rect = containerRef.value.getBoundingClientRect()
  canvasRef.value.width = rect.width
  canvasRef.value.height = rect.height
  editorStore.setCanvasSize(rect.width, rect.height)
  render()
}

function render() {
  if (!ctx.value || !canvasRef.value) return

  const c = ctx.value
  const width = canvasRef.value.width
  const height = canvasRef.value.height

  // Clear canvas
  c.fillStyle = '#f8f9fa'
  c.fillRect(0, 0, width, height)

  c.save()

  // Apply transformations
  c.translate(panOffset.value.x, panOffset.value.y)
  c.scale(zoom.value, zoom.value)

  // Draw grid
  if (showGrid.value) {
    drawGrid(c, width, height)
  }

  // Draw elements
  for (const element of currentElements.value) {
    drawElement(c, element)
  }

  // Draw selection highlights
  for (const id of selectedIds.value) {
    const element = elementsStore.getElementById(id)
    if (element) {
      drawSelectionHighlight(c, element)
    }
  }

  // Draw current drawing preview
  if (isDrawing.value && drawingPoints.value.length > 0) {
    drawDrawingPreview(c)
  }

  // Draw snap indicator
  if (hoverPoint.value) {
    drawSnapIndicator(c, hoverPoint.value)
  }

  c.restore()
}

function drawGrid(c: CanvasRenderingContext2D, width: number, height: number) {
  const gs = gridSize.value
  const offsetX = panOffset.value.x
  const offsetY = panOffset.value.y
  const z = zoom.value

  // Calculate visible grid range
  const startX = Math.floor(-offsetX / z / gs) * gs - gs
  const startY = Math.floor(-offsetY / z / gs) * gs - gs
  const endX = Math.ceil((width - offsetX) / z / gs) * gs + gs
  const endY = Math.ceil((height - offsetY) / z / gs) * gs + gs

  c.strokeStyle = '#e0e0e0'
  c.lineWidth = 0.5

  c.beginPath()
  for (let x = startX; x <= endX; x += gs) {
    c.moveTo(x, startY)
    c.lineTo(x, endY)
  }
  for (let y = startY; y <= endY; y += gs) {
    c.moveTo(startX, y)
    c.lineTo(endX, y)
  }
  c.stroke()

  // Draw origin axes
  c.strokeStyle = '#ccc'
  c.lineWidth = 1
  c.beginPath()
  c.moveTo(0, startY)
  c.lineTo(0, endY)
  c.moveTo(startX, 0)
  c.lineTo(endX, 0)
  c.stroke()
}

function drawElement(c: CanvasRenderingContext2D, element: MapElement) {
  const style = element.style

  c.strokeStyle = style.strokeColor
  c.lineWidth = style.strokeWidth
  c.globalAlpha = style.opacity

  switch (element.type) {
    case 'wall':
      drawWall(c, element)
      break
    case 'room':
      drawRoom(c, element)
      break
    case 'poi':
      drawPOI(c, element)
      break
    case 'navpath':
      drawNavPath(c, element)
      break
    case 'navnode':
      drawNavNode(c, element)
      break
    case 'door':
      drawDoor(c, element)
      break
    case 'window':
      drawWindow(c, element)
      break
  }

  c.globalAlpha = 1
}

function drawWall(c: CanvasRenderingContext2D, element: any) {
  if (element.points.length < 2) return

  c.lineWidth = element.thickness || 8
  c.lineCap = 'round'
  c.lineJoin = 'round'

  c.beginPath()
  c.moveTo(element.points[0].x, element.points[0].y)
  for (let i = 1; i < element.points.length; i++) {
    c.lineTo(element.points[i].x, element.points[i].y)
  }
  c.stroke()

  // Draw dimension labels
  for (let i = 0; i < element.points.length - 1; i++) {
    const p1 = element.points[i]
    const p2 = element.points[i + 1]
    const length = distance(p1, p2)
    const midX = (p1.x + p2.x) / 2
    const midY = (p1.y + p2.y) / 2

    c.save()
    c.fillStyle = '#333'
    c.font = '12px Arial'
    c.textAlign = 'center'
    c.textBaseline = 'bottom'
    c.fillText(editorStore.formatLength(length), midX, midY - 5)
    c.restore()
  }
}

function drawRoom(c: CanvasRenderingContext2D, element: any) {
  if (element.points.length < 3) return

  c.beginPath()
  c.moveTo(element.points[0].x, element.points[0].y)
  for (let i = 1; i < element.points.length; i++) {
    c.lineTo(element.points[i].x, element.points[i].y)
  }
  c.closePath()

  if (element.style.fillColor) {
    c.fillStyle = element.style.fillColor
    c.fill()
  }
  c.stroke()

  // Draw dimension labels for each edge
  const points = element.points
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i]
    const p2 = points[(i + 1) % points.length]
    const length = distance(p1, p2)
    const midX = (p1.x + p2.x) / 2
    const midY = (p1.y + p2.y) / 2

    c.save()
    c.fillStyle = '#666'
    c.font = '11px Arial'
    c.textAlign = 'center'
    c.textBaseline = 'bottom'
    c.fillText(editorStore.formatLength(length), midX, midY - 3)
    c.restore()
  }

  // Draw room name if exists
  if (element.name) {
    const bounds = getBoundsFromPoints(element.points)
    const centerX = (bounds.minX + bounds.maxX) / 2
    const centerY = (bounds.minY + bounds.maxY) / 2

    c.save()
    c.fillStyle = '#666'
    c.font = '14px Arial'
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    c.fillText(element.name, centerX, centerY)
    c.restore()
  }
}

function drawPOI(c: CanvasRenderingContext2D, element: any) {
  const pos = element.position
  const poiType = element.poiType || 'custom'

  // 根据POI类型定义不同的颜色和图标
  const poiStyles: Record<string, { color: string; icon: string }> = {
    elevator: { color: '#2196F3', icon: 'E' },
    stairs: { color: '#9C27B0', icon: 'S' },
    toilet: { color: '#00BCD4', icon: 'WC' },
    exit: { color: '#F44336', icon: '→' },
    entrance: { color: '#4CAF50', icon: '←' },
    shop: { color: '#FF9800', icon: '$' },
    office: { color: '#607D8B', icon: 'O' },
    custom: { color: '#FF6B6B', icon: '★' }
  }

  const style = poiStyles[poiType] || poiStyles.custom
  const fillColor = element.style.fillColor || style.color

  // Draw marker pin
  c.beginPath()
  c.arc(pos.x, pos.y - 10, 10, 0, Math.PI * 2)
  c.fillStyle = fillColor
  c.fill()
  c.strokeStyle = element.style.strokeColor || '#333'
  c.lineWidth = 2
  c.stroke()

  // Draw pin point
  c.beginPath()
  c.moveTo(pos.x - 7, pos.y - 3)
  c.lineTo(pos.x, pos.y + 6)
  c.lineTo(pos.x + 7, pos.y - 3)
  c.closePath()
  c.fillStyle = fillColor
  c.fill()

  // Draw POI type icon using SVG-like symbols (cross-platform compatible)
  c.save()
  c.fillStyle = '#fff'
  c.strokeStyle = '#fff'
  c.lineWidth = 1.5

  // Draw type-specific icon
  drawPOIIcon(c, pos.x, pos.y - 10, poiType)

  c.restore()

  // Draw POI name if exists
  if (element.name) {
    c.save()
    c.fillStyle = '#333'
    c.font = '11px Arial'
    c.textAlign = 'center'
    c.textBaseline = 'top'
    c.fillText(element.name, pos.x, pos.y + 10)
    c.restore()
  } else {
    // 如果没有名称，显示类型名称
    c.save()
    c.fillStyle = '#666'
    c.font = '10px Arial'
    c.textAlign = 'center'
    c.textBaseline = 'top'
    const typeLabels: Record<string, string> = {
      elevator: '电梯',
      stairs: '楼梯',
      toilet: '洗手间',
      exit: '出口',
      entrance: '入口',
      shop: '商店',
      office: '办公室',
      custom: ''
    }
    const label = typeLabels[poiType]
    if (label) {
      c.fillText(label, pos.x, pos.y + 10)
    }
    c.restore()
  }
}

// Draw POI icon using canvas paths (SVG-like, cross-platform compatible)
function drawPOIIcon(c: CanvasRenderingContext2D, x: number, y: number, type: string) {
  c.save()
  c.translate(x, y)

  switch (type) {
    case 'elevator':
      // Up/down arrows
      c.beginPath()
      c.moveTo(-3, -4)
      c.lineTo(0, -7)
      c.lineTo(3, -4)
      c.moveTo(-3, 4)
      c.lineTo(0, 7)
      c.lineTo(3, 4)
      c.stroke()
      break
    case 'stairs':
      // Stairs shape
      c.beginPath()
      c.moveTo(-5, 5)
      c.lineTo(-5, 1)
      c.lineTo(-1, 1)
      c.lineTo(-1, -3)
      c.lineTo(3, -3)
      c.lineTo(3, -7)
      c.lineTo(5, -7)
      c.stroke()
      break
    case 'toilet':
      // WC text
      c.font = 'bold 8px Arial'
      c.textAlign = 'center'
      c.textBaseline = 'middle'
      c.fillText('WC', 0, 0)
      break
    case 'exit':
      // Arrow pointing out
      c.beginPath()
      c.moveTo(-4, 0)
      c.lineTo(4, 0)
      c.lineTo(1, -3)
      c.moveTo(4, 0)
      c.lineTo(1, 3)
      c.stroke()
      break
    case 'entrance':
      // Arrow pointing in
      c.beginPath()
      c.moveTo(4, 0)
      c.lineTo(-4, 0)
      c.lineTo(-1, -3)
      c.moveTo(-4, 0)
      c.lineTo(-1, 3)
      c.stroke()
      break
    case 'shop':
      // Shopping bag
      c.beginPath()
      c.rect(-4, -2, 8, 7)
      c.moveTo(-2, -2)
      c.quadraticCurveTo(-2, -6, 0, -6)
      c.quadraticCurveTo(2, -6, 2, -2)
      c.stroke()
      break
    case 'office':
      // Building
      c.beginPath()
      c.rect(-4, -6, 8, 12)
      c.moveTo(-2, -4)
      c.lineTo(-2, -2)
      c.moveTo(2, -4)
      c.lineTo(2, -2)
      c.moveTo(-2, 0)
      c.lineTo(-2, 2)
      c.moveTo(2, 0)
      c.lineTo(2, 2)
      c.stroke()
      break
    default:
      // Star
      c.beginPath()
      for (let i = 0; i < 5; i++) {
        const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2
        const r = i % 2 === 0 ? 6 : 3
        if (i === 0) {
          c.moveTo(r * Math.cos(angle), r * Math.sin(angle))
        } else {
          c.lineTo(r * Math.cos(angle), r * Math.sin(angle))
        }
      }
      c.closePath()
      c.fill()
      break
  }

  c.restore()
}


function drawNavPath(c: CanvasRenderingContext2D, element: any) {
  if (element.points.length < 2) return

  c.setLineDash([8, 4])
  c.lineCap = 'round'

  c.beginPath()
  c.moveTo(element.points[0].x, element.points[0].y)
  for (let i = 1; i < element.points.length; i++) {
    c.lineTo(element.points[i].x, element.points[i].y)
  }
  c.stroke()

  c.setLineDash([])

  // Draw dimension labels for each segment
  for (let i = 0; i < element.points.length - 1; i++) {
    const p1 = element.points[i]
    const p2 = element.points[i + 1]
    const length = distance(p1, p2)
    const midX = (p1.x + p2.x) / 2
    const midY = (p1.y + p2.y) / 2

    c.save()
    c.fillStyle = '#2E7D32'
    c.font = '10px Arial'
    c.textAlign = 'center'
    c.textBaseline = 'bottom'
    c.fillText(editorStore.formatLength(length), midX, midY - 5)
    c.restore()
  }

  // Draw nodes
  for (const point of element.points) {
    c.beginPath()
    c.arc(point.x, point.y, 4, 0, Math.PI * 2)
    c.fillStyle = element.style.fillColor || '#4CAF50'
    c.fill()
  }
}

// 绘制门
function drawDoor(c: CanvasRenderingContext2D, element: any) {
  const pos = element.position
  const width = element.width || 90
  const rotation = element.rotation || 0
  const fillColor = element.style.fillColor || '#DEB887'

  c.save()
  c.translate(pos.x, pos.y)
  c.rotate((rotation * Math.PI) / 180)

  // Draw door frame
  c.strokeStyle = element.style.strokeColor || '#8B4513'
  c.lineWidth = 3
  c.beginPath()
  c.moveTo(-width / 2, 0)
  c.lineTo(width / 2, 0)
  c.stroke()

  // Draw door panel (arc showing swing)
  c.strokeStyle = element.style.strokeColor || '#8B4513'
  c.lineWidth = 2
  c.setLineDash([4, 4])
  c.beginPath()
  c.arc(-width / 2, 0, width, 0, -Math.PI / 2, true)
  c.stroke()
  c.setLineDash([])

  // Draw door leaf
  c.fillStyle = fillColor
  c.strokeStyle = element.style.strokeColor || '#8B4513'
  c.lineWidth = 2
  c.beginPath()
  c.moveTo(-width / 2, 0)
  c.lineTo(-width / 2, -width * 0.7)
  c.stroke()

  // Draw door handle
  c.beginPath()
  c.arc(-width / 2 + 8, -width * 0.35, 3, 0, Math.PI * 2)
  c.fillStyle = '#333'
  c.fill()

  c.restore()
}

// 绘制窗户
function drawWindow(c: CanvasRenderingContext2D, element: any) {
  const pos = element.position
  const width = element.width || 100
  const rotation = element.rotation || 0
  const fillColor = element.style.fillColor || '#87CEEB'

  c.save()
  c.translate(pos.x, pos.y)
  c.rotate((rotation * Math.PI) / 180)

  const height = 10  // Window thickness

  // Draw window frame
  c.fillStyle = fillColor
  c.fillRect(-width / 2, -height / 2, width, height)

  c.strokeStyle = element.style.strokeColor || '#4169E1'
  c.lineWidth = 2
  c.strokeRect(-width / 2, -height / 2, width, height)

  // Draw window divisions
  c.beginPath()
  c.moveTo(0, -height / 2)
  c.lineTo(0, height / 2)
  c.stroke()

  // Draw wall breaks
  c.strokeStyle = '#fff'
  c.lineWidth = 4
  c.beginPath()
  c.moveTo(-width / 2, 0)
  c.lineTo(width / 2, 0)
  c.stroke()

  c.restore()
}

// 绘制导航节点
function drawNavNode(c: CanvasRenderingContext2D, element: any) {
  const pos = element.position
  
  // 绘制节点圆圈
  c.beginPath()
  c.arc(pos.x, pos.y, 8, 0, Math.PI * 2)
  c.fillStyle = element.style.fillColor || '#2196F3'
  c.fill()
  c.strokeStyle = element.style.strokeColor || '#1565C0'
  c.lineWidth = 2
  c.stroke()
  
  // 绘制中心十字
  c.beginPath()
  c.strokeStyle = '#fff'
  c.lineWidth = 2
  c.moveTo(pos.x - 4, pos.y)
  c.lineTo(pos.x + 4, pos.y)
  c.moveTo(pos.x, pos.y - 4)
  c.lineTo(pos.x, pos.y + 4)
  c.stroke()
}

function drawSelectionHighlight(c: CanvasRenderingContext2D, element: MapElement) {
  c.save()
  c.strokeStyle = '#409eff'
  c.lineWidth = 2
  c.setLineDash([5, 3])

  if ('points' in element && element.points) {
    c.beginPath()
    c.moveTo(element.points[0].x, element.points[0].y)
    for (let i = 1; i < element.points.length; i++) {
      c.lineTo(element.points[i].x, element.points[i].y)
    }
    if (element.type === 'room') {
      c.closePath()
    }
    c.stroke()

    // Draw control points
    c.setLineDash([])
    c.fillStyle = '#fff'
    c.strokeStyle = '#409eff'
    for (const point of element.points) {
      c.beginPath()
      c.arc(point.x, point.y, 5, 0, Math.PI * 2)
      c.fill()
      c.stroke()
    }
  } else if ('position' in element && element.position) {
    c.beginPath()
    c.arc(element.position.x, element.position.y, 15, 0, Math.PI * 2)
    c.stroke()
  }

  c.restore()
}

function drawDrawingPreview(c: CanvasRenderingContext2D) {
  c.save()
  c.strokeStyle = '#409eff'
  c.lineWidth = 2
  c.setLineDash([5, 3])

  const points = drawingPoints.value
  const tool = currentTool.value

  if (tool === 'wall' || tool === 'navpath') {
    c.beginPath()
    c.moveTo(points[0].x, points[0].y)
    for (let i = 1; i < points.length; i++) {
      c.lineTo(points[i].x, points[i].y)
    }
    c.stroke()
  } else if (tool === 'room' && points.length >= 2) {
    const rect = createRectangle(points[0], points[points.length - 1])
    c.beginPath()
    c.moveTo(rect[0].x, rect[0].y)
    for (let i = 1; i < rect.length; i++) {
      c.lineTo(rect[i].x, rect[i].y)
    }
    c.stroke()

    // Show dimensions
    const width = Math.abs(points[points.length - 1].x - points[0].x)
    const height = Math.abs(points[points.length - 1].y - points[0].y)
    currentDimension.value = `${editorStore.formatLength(width)} x ${editorStore.formatLength(height)}`
  } else if (tool === 'polygon') {
    c.beginPath()
    c.moveTo(points[0].x, points[0].y)
    for (let i = 1; i < points.length; i++) {
      c.lineTo(points[i].x, points[i].y)
    }
    c.stroke()
  }

  // Draw preview points
  c.setLineDash([])
  c.fillStyle = '#409eff'
  for (const point of points) {
    c.beginPath()
    c.arc(point.x, point.y, 4, 0, Math.PI * 2)
    c.fill()
  }

  c.restore()
}

function drawSnapIndicator(c: CanvasRenderingContext2D, point: Point) {
  c.save()

  const snapType = currentSnapType.value

  if (snapType === 'endpoint') {
    // Endpoint snap: larger magenta crosshair with circle
    c.strokeStyle = '#e91e63'
    c.lineWidth = 2

    // Outer circle
    c.beginPath()
    c.arc(point.x, point.y, 12, 0, Math.PI * 2)
    c.stroke()

    // Inner dot
    c.beginPath()
    c.arc(point.x, point.y, 3, 0, Math.PI * 2)
    c.fillStyle = '#e91e63'
    c.fill()

    // Crosshair
    c.beginPath()
    c.moveTo(point.x - 16, point.y)
    c.lineTo(point.x - 6, point.y)
    c.moveTo(point.x + 6, point.y)
    c.lineTo(point.x + 16, point.y)
    c.moveTo(point.x, point.y - 16)
    c.lineTo(point.x, point.y - 6)
    c.moveTo(point.x, point.y + 6)
    c.lineTo(point.x, point.y + 16)
    c.stroke()
  } else if (snapType === 'midpoint') {
    // Midpoint snap: diamond shape
    c.strokeStyle = '#9c27b0'
    c.lineWidth = 2

    c.beginPath()
    c.moveTo(point.x, point.y - 10)
    c.lineTo(point.x + 10, point.y)
    c.lineTo(point.x, point.y + 10)
    c.lineTo(point.x - 10, point.y)
    c.closePath()
    c.stroke()

    // Inner dot
    c.beginPath()
    c.arc(point.x, point.y, 3, 0, Math.PI * 2)
    c.fillStyle = '#9c27b0'
    c.fill()
  } else {
    // Grid snap: simple crosshair (default)
    c.strokeStyle = '#ff6b6b'
    c.lineWidth = 2

    c.beginPath()
    c.moveTo(point.x - 8, point.y)
    c.lineTo(point.x + 8, point.y)
    c.moveTo(point.x, point.y - 8)
    c.lineTo(point.x, point.y + 8)
    c.stroke()
  }

  c.restore()
}

function getBoundsFromPoints(points: Point[]) {
  let minX = Infinity, minY = Infinity
  let maxX = -Infinity, maxY = -Infinity

  for (const p of points) {
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x)
    maxY = Math.max(maxY, p.y)
  }

  return { minX, minY, maxX, maxY }
}

// Event handlers
function handleWheel(e: WheelEvent) {
  e.preventDefault()

  if (e.ctrlKey) {
    // Zoom
    const rect = containerRef.value!.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1
    const newZoom = Math.max(0.1, Math.min(5, zoom.value * zoomFactor))

    // Adjust pan to zoom toward mouse position
    const scale = newZoom / zoom.value
    const newPanX = mouseX - (mouseX - panOffset.value.x) * scale
    const newPanY = mouseY - (mouseY - panOffset.value.y) * scale

    editorStore.setZoom(newZoom)
    editorStore.setPanOffset({ x: newPanX, y: newPanY })
  } else {
    // Pan
    editorStore.setPanOffset({
      x: panOffset.value.x - e.deltaX,
      y: panOffset.value.y - e.deltaY
    })
  }
}

function handleMouseDown(e: MouseEvent) {
  const rect = containerRef.value!.getBoundingClientRect()
  const screenPos = { x: e.clientX - rect.left, y: e.clientY - rect.top }
  const canvasPos = editorStore.screenToCanvas(screenPos)

  lastMousePos.value = screenPos

  // Middle button or Space + Left click for panning
  if (e.button === 1 || (e.button === 0 && isSpacePressed.value)) {
    isPanning.value = true
    e.preventDefault()  // Prevent text selection while panning
    return
  }

  if (e.button !== 0) return

  const tool = currentTool.value

  if (tool === 'select') {
    // Check if clicking on an element
    const clickedElement = findElementAtPoint(canvasPos)

    if (clickedElement) {
      if (e.shiftKey) {
        // Toggle selection
        if (selectedIds.value.includes(clickedElement.id)) {
          editorStore.removeSelectedId(clickedElement.id)
        } else {
          editorStore.addSelectedId(clickedElement.id)
        }
      } else {
        // Single select or start drag
        if (!selectedIds.value.includes(clickedElement.id)) {
          editorStore.setSelectedIds([clickedElement.id])
        }
        startDragPos.value = canvasPos
        isDragging.value = true
      }
    } else {
      // Clear selection
      editorStore.clearSelection()
    }
  } else {
    // Drawing tools
    const snappedPos = getSnappedPosition(canvasPos)

    // 单击创建的工具类型（POI、导航节点、门、窗户）
    if (tool === 'poi' || tool === 'navnode' || tool === 'door' || tool === 'window') {
      if (tool === 'poi') {
        elementsStore.createPOI(currentFloor.value, snappedPos, currentPoiType.value)
      } else if (tool === 'navnode') {
        elementsStore.createNavNode(currentFloor.value, snappedPos)
      } else if (tool === 'door') {
        elementsStore.createDoor(currentFloor.value, snappedPos)
      } else if (tool === 'window') {
        elementsStore.createWindow(currentFloor.value, snappedPos)
      }
      // 不进入绘制模式，直接创建
      return
    }

    // 拖动绘制的工具类型（房间/矩形）
    if (tool === 'room') {
      // 开始新的拖动绘制
      editorStore.startDrawing(snappedPos)
      editorStore.addDrawingPoint(snappedPos) // 添加结束点，初始与起点相同
      return
    }

    // 多点绘制的工具类型
    if (!isDrawing.value) {
      editorStore.startDrawing(snappedPos)
    } else {
      editorStore.addDrawingPoint(snappedPos)
    }
  }
}

function handleMouseMove(e: MouseEvent) {
  const rect = containerRef.value!.getBoundingClientRect()
  const screenPos = { x: e.clientX - rect.left, y: e.clientY - rect.top }
  const canvasPos = editorStore.screenToCanvas(screenPos)

  // Update dimension label position
  dimensionPos.value = { x: screenPos.x + 15, y: screenPos.y - 25 }

  if (isPanning.value) {
    const dx = screenPos.x - lastMousePos.value.x
    const dy = screenPos.y - lastMousePos.value.y
    editorStore.setPanOffset({
      x: panOffset.value.x + dx,
      y: panOffset.value.y + dy
    })
    lastMousePos.value = screenPos
    return
  }

  if (isDragging.value && startDragPos.value && selectedIds.value.length > 0) {
    const dx = canvasPos.x - startDragPos.value.x
    const dy = canvasPos.y - startDragPos.value.y

    for (const id of selectedIds.value) {
      elementsStore.moveElement(id, dx, dy)
    }
    startDragPos.value = canvasPos
    return
  }

  if (isDrawing.value) {
    const snappedPos = getSnappedPosition(canvasPos)
    editorStore.setHoverPoint(snappedPos)

    // Update last drawing point for preview
    if (drawingPoints.value.length > 0) {
      // 对于房间工具，更新最后一个点以实时预览
      if (currentTool.value === 'room' && drawingPoints.value.length >= 2) {
        editorStore.updateLastDrawingPoint(snappedPos)
        const width = Math.abs(snappedPos.x - drawingPoints.value[0].x)
        const height = Math.abs(snappedPos.y - drawingPoints.value[0].y)
        currentDimension.value = `${editorStore.formatLength(width)} x ${editorStore.formatLength(height)}`
      } else if (currentTool.value === 'wall' || currentTool.value === 'navpath') {
        const lastPoint = drawingPoints.value[drawingPoints.value.length - 1]
        const length = distance(lastPoint, snappedPos)
        currentDimension.value = editorStore.formatLength(length)
      }
    }
  } else {
    currentDimension.value = ''
    editorStore.setHoverPoint(null)
  }

  lastMousePos.value = screenPos
}

function handleMouseUp(e: MouseEvent) {
  // Stop panning on middle button release or left button release (when space panning)
  if (e.button === 1 || (e.button === 0 && isPanning.value)) {
    isPanning.value = false
    return
  }

  isDragging.value = false
  startDragPos.value = null
  
  // 如果正在用房间工具绘制，鼠标释放时完成绘制
  if (isDrawing.value && currentTool.value === 'room') {
    const points = drawingPoints.value
    if (points.length >= 2) {
      const rect = createRectangle(points[0], points[points.length - 1])
      // 只有当矩形有实际大小时才创建（使用画布坐标，与缩放无关）
      const width = Math.abs(points[1].x - points[0].x)
      const height = Math.abs(points[1].y - points[0].y)
      // 最小尺寸为 5 个画布单位（不受缩放影响）
      const minSize = 5
      if (width > minSize && height > minSize) {
        elementsStore.createRoom(currentFloor.value, rect)
      }
    }
    editorStore.cancelDrawing()
    currentDimension.value = ''
  }
}

function handleMouseLeave() {
  isPanning.value = false
  isDragging.value = false
  editorStore.setHoverPoint(null)
  currentDimension.value = ''
}

function handleDoubleClick() {
  if (!isDrawing.value) return

  finishDrawing()
}

function handleContextMenu() {
  if (isDrawing.value) {
    editorStore.cancelDrawing()
    currentDimension.value = ''
  }
}

function handleKeyDown(e: KeyboardEvent) {
  // Space key for panning mode
  if (e.code === 'Space' && !isSpacePressed.value) {
    isSpacePressed.value = true
    e.preventDefault()  // Prevent page scrolling
    return
  }

  // Tool shortcuts
  switch (e.key.toLowerCase()) {
    case 'v':
      switchTool('select')
      break
    case 'w':
      if (e.shiftKey) {
        switchTool('window')
      } else {
        switchTool('wall')
      }
      break
    case 'd':
      switchTool('door')
      break
    case 'r':
      switchTool('room')
      break
    case 'p':
      switchTool('polygon')
      break
    case 'o':
      switchTool('navnode')
      break
    case 'm':
      switchTool('poi')
      break
    case 'n':
      switchTool('navpath')
      break
    case 'escape':
      if (isDrawing.value) {
        editorStore.cancelDrawing()
        currentDimension.value = ''
      } else {
        editorStore.clearSelection()
      }
      break
    case 'enter':
      if (isDrawing.value) {
        finishDrawing()
      }
      break
    case 'delete':
      if (selectedIds.value.length > 0 && !isDrawing.value) {
        elementsStore.deleteElements(selectedIds.value)
        editorStore.clearSelection()
      }
      break
    case 'backspace':
      if (isDrawing.value) {
        // 绘制时删除最后一个点
        if (!editorStore.removeLastDrawingPoint()) {
          // 如果只剩一个点，取消绘制
          editorStore.cancelDrawing()
          currentDimension.value = ''
        }
      } else if (selectedIds.value.length > 0) {
        elementsStore.deleteElements(selectedIds.value)
        editorStore.clearSelection()
      }
      break
    case 'z':
      if (e.ctrlKey || e.metaKey) {
        if (e.shiftKey) {
          elementsStore.redo()
        } else {
          elementsStore.undo()
        }
      }
      break
  }
}

function handleKeyUp(e: KeyboardEvent) {
  // Release space key - exit panning mode
  if (e.code === 'Space') {
    isSpacePressed.value = false
    isPanning.value = false
  }
}

function finishDrawing() {
  const points = editorStore.finishDrawing()
  if (points.length < 2) return

  const tool = currentTool.value
  const floor = currentFloor.value

  switch (tool) {
    case 'wall':
      elementsStore.createWall(floor, points)
      break
    case 'room':
      if (points.length >= 2) {
        const rect = createRectangle(points[0], points[points.length - 1])
        elementsStore.createRoom(floor, rect)
      }
      break
    case 'polygon':
      if (points.length >= 3) {
        elementsStore.createRoom(floor, [...points, points[0]])
      }
      break
    case 'navpath':
      elementsStore.createNavPath(floor, points)
      break
    case 'navnode':
      if (points.length >= 1) {
        elementsStore.createNavNode(floor, points[0])
      }
      break
    case 'poi':
      if (points.length >= 1) {
        elementsStore.createPOI(floor, points[0])
      }
      break
  }

  currentDimension.value = ''
}

function findElementAtPoint(point: Point): MapElement | undefined {
  // Search in reverse order (top elements first)
  const elements = [...currentElements.value].reverse()
  for (const element of elements) {
    if (elementContainsPoint(element, point, 10)) {
      return element
    }
  }
  return undefined
}

function getSnappedPosition(point: Point): Point {
  const result = snapPoint(
    point,
    currentElements.value,
    {
      gridSize: gridSize.value,
      snapToGrid: snapToGrid.value,
      snapToEndpoint: snapToEndpoint.value,
      snapToMidpoint: true
    }
  )
  // Update snap type for visual feedback
  currentSnapType.value = result.snapped ? result.type as any : 'none'
  return result.point
}
</script>

<style scoped>
.canvas-wrapper {
  flex: 1;
  overflow: hidden;
  cursor: crosshair;
  position: relative;
}

.main-canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.dimension-label {
  position: absolute;
  background: rgba(0, 0, 0, 0.75);
  color: #fff;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  pointer-events: none;
  white-space: nowrap;
}
</style>
