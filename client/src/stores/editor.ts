import { ref } from 'vue'
import { defineStore } from 'pinia'
import type { ToolType, Point } from '@/types'

export const useEditorStore = defineStore('editor', () => {
  // Tool state
  const currentTool = ref<ToolType>('select')
  const currentFloor = ref<number>(1)
  const selectedIds = ref<string[]>([])

  // View state
  const zoom = ref<number>(1)
  const panOffset = ref<Point>({ x: 0, y: 0 })
  const canvasSize = ref<{ width: number; height: number }>({ width: 800, height: 600 })

  // Grid settings
  const gridSize = ref<number>(10) // 10cm = 0.1m 格子间隔
  const showGrid = ref<boolean>(true)
  const snapToGrid = ref<boolean>(true)
  const snapToEndpoint = ref<boolean>(true)

  // Scale settings
  const scale = ref<number>(1) // 1px = 1cm by default
  const unit = ref<'px' | 'cm' | 'm'>('m') // 默认使用米

  // Layer visibility
  const layerVisibility = ref<Record<string, boolean>>({
    wall: true,
    room: true,
    poi: true,
    navpath: true,
    navnode: true
  })

  // Drawing state
  const isDrawing = ref<boolean>(false)
  const drawingPoints = ref<Point[]>([])
  const hoverPoint = ref<Point | null>(null)

  // POI type selection
  const currentPoiType = ref<string>('custom')


  // Actions
  function setTool(tool: ToolType): { previousPoints: Point[]; previousTool: ToolType; wasDrawing: boolean } {
    // 保存之前的绘制点和工具类型
    const previousPoints = [...drawingPoints.value]
    const previousTool = currentTool.value
    const wasDrawing = isDrawing.value

    // 清空绘制状态
    isDrawing.value = false
    drawingPoints.value = []
    currentTool.value = tool

    // 返回之前的绘制状态
    return { previousPoints, previousTool, wasDrawing }
  }

  function setFloor(floor: number) {
    currentFloor.value = floor
    selectedIds.value = []
  }

  function setZoom(newZoom: number) {
    zoom.value = Math.max(0.1, Math.min(5, newZoom))
  }

  function setPanOffset(offset: Point) {
    panOffset.value = offset
  }

  function setSelectedIds(ids: string[]) {
    selectedIds.value = ids
  }

  function addSelectedId(id: string) {
    if (!selectedIds.value.includes(id)) {
      selectedIds.value.push(id)
    }
  }

  function removeSelectedId(id: string) {
    const index = selectedIds.value.indexOf(id)
    if (index !== -1) {
      selectedIds.value.splice(index, 1)
    }
  }

  function clearSelection() {
    selectedIds.value = []
  }

  function toggleLayerVisibility(layer: string) {
    if (layer in layerVisibility.value) {
      layerVisibility.value[layer] = !layerVisibility.value[layer]
    }
  }

  function setGridSize(size: number) {
    gridSize.value = Math.max(5, Math.min(100, size))
  }

  function toggleGrid() {
    showGrid.value = !showGrid.value
  }

  function toggleSnapToGrid() {
    snapToGrid.value = !snapToGrid.value
  }

  function toggleSnapToEndpoint() {
    snapToEndpoint.value = !snapToEndpoint.value
  }

  function startDrawing(point: Point) {
    isDrawing.value = true
    drawingPoints.value = [point]
  }

  function addDrawingPoint(point: Point) {
    drawingPoints.value.push(point)
  }

  function updateLastDrawingPoint(point: Point) {
    if (drawingPoints.value.length > 0) {
      drawingPoints.value[drawingPoints.value.length - 1] = point
    }
  }

  function finishDrawing() {
    isDrawing.value = false
    const points = [...drawingPoints.value]
    drawingPoints.value = []
    return points
  }

  function cancelDrawing() {
    isDrawing.value = false
    drawingPoints.value = []
  }

  function removeLastDrawingPoint() {
    if (drawingPoints.value.length > 1) {
      drawingPoints.value.pop()
      return true
    }
    return false
  }

  function setHoverPoint(point: Point | null) {
    hoverPoint.value = point
  }

  function setCanvasSize(width: number, height: number) {
    canvasSize.value = { width, height }
  }

  // Convert screen coordinates to canvas coordinates
  function screenToCanvas(screenPoint: Point): Point {
    return {
      x: (screenPoint.x - panOffset.value.x) / zoom.value,
      y: (screenPoint.y - panOffset.value.y) / zoom.value
    }
  }

  // Convert canvas coordinates to screen coordinates
  function canvasToScreen(canvasPoint: Point): Point {
    return {
      x: canvasPoint.x * zoom.value + panOffset.value.x,
      y: canvasPoint.y * zoom.value + panOffset.value.y
    }
  }

  // Format length based on current unit
  function formatLength(pixels: number): string {
    const cm = pixels * scale.value
    if (unit.value === 'px') {
      return `${pixels.toFixed(0)}px`
    } else if (unit.value === 'm') {
      return `${(cm / 100).toFixed(1)}m` // 显示0.1m精度
    }
    return `${cm.toFixed(1)}cm`
  }

  function setPoiType(poiType: string) {
    currentPoiType.value = poiType
  }

  return {
    // State
    currentTool,
    currentFloor,
    selectedIds,
    zoom,
    panOffset,
    canvasSize,
    gridSize,
    showGrid,
    snapToGrid,
    snapToEndpoint,
    scale,
    unit,
    layerVisibility,
    isDrawing,
    drawingPoints,
    hoverPoint,
    currentPoiType,
    // Actions
    setTool,
    setFloor,
    setZoom,
    setPanOffset,
    setSelectedIds,
    addSelectedId,
    removeSelectedId,
    clearSelection,
    toggleLayerVisibility,
    setGridSize,
    toggleGrid,
    toggleSnapToGrid,
    toggleSnapToEndpoint,
    startDrawing,
    addDrawingPoint,
    updateLastDrawingPoint,
    finishDrawing,
    cancelDrawing,
    removeLastDrawingPoint,
    setHoverPoint,
    setCanvasSize,
    screenToCanvas,
    canvasToScreen,
    formatLength,
    setPoiType
  }
})
