<template>
  <el-dialog
    :model-value="visible"
    @update:model-value="$emit('update:visible', $event)"
    title="导出地图"
    width="500px"
  >
    <div class="export-options">
      <!-- Project Name -->
      <div class="option-group">
        <label>项目名称</label>
        <el-input v-model="projectName" placeholder="室内地图" />
      </div>

      <!-- Export Format -->
      <div class="option-group">
        <label>导出格式</label>
        <el-radio-group v-model="exportFormat">
          <el-radio-button label="geojson">GeoJSON</el-radio-button>
          <el-radio-button label="png">PNG 图片</el-radio-button>
          <el-radio-button label="svg">SVG</el-radio-button>
        </el-radio-group>
      </div>

      <!-- Floor Selection -->
      <div class="option-group">
        <label>导出楼层</label>
        <el-radio-group v-model="floorSelection">
          <el-radio label="all">全部楼层</el-radio>
          <el-radio label="current">仅当前楼层</el-radio>
        </el-radio-group>
      </div>

      <!-- GeoJSON Options -->
      <div class="option-group" v-if="exportFormat === 'geojson'">
        <label>包含元素</label>
        <el-checkbox-group v-model="includeTypes">
          <el-checkbox label="wall">墙体</el-checkbox>
          <el-checkbox label="room">房间</el-checkbox>
          <el-checkbox label="door">门</el-checkbox>
          <el-checkbox label="window">窗户</el-checkbox>
          <el-checkbox label="corridor">走廊</el-checkbox>
          <el-checkbox label="hall">大厅</el-checkbox>
          <el-checkbox label="poi">兴趣点</el-checkbox>
          <el-checkbox label="poster">海报</el-checkbox>
          <el-checkbox label="text">文本标签</el-checkbox>
          <el-checkbox label="navpath">导航路径</el-checkbox>
          <el-checkbox label="navnode">导航节点</el-checkbox>
        </el-checkbox-group>
      </div>

      <!-- Image Options -->
      <div class="option-group" v-if="exportFormat === 'png' || exportFormat === 'svg'">
        <label>图片缩放</label>
        <el-select v-model="imageScale">
          <el-option label="1x (原始)" :value="1" />
          <el-option label="2x (高清)" :value="2" />
          <el-option label="4x (打印)" :value="4" />
        </el-select>
      </div>

      <div class="option-group" v-if="exportFormat === 'png' || exportFormat === 'svg'">
        <el-checkbox v-model="includeGrid">包含网格</el-checkbox>
      </div>
    </div>

    <template #footer>
      <el-button @click="$emit('update:visible', false)">取消</el-button>
      <el-button type="primary" @click="handleExport" :loading="exporting">
        导出
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { saveAs } from 'file-saver'
import { useEditorStore } from '@/stores/editor'
import { useElementsStore } from '@/stores/elements'
import { useFloorsStore } from '@/stores/floors'
import { exportToGeoJSON, exportFloorToGeoJSON } from '@/utils/geojson'
import { ElMessage } from 'element-plus'

defineProps<{
  visible: boolean
}>()

const emit = defineEmits(['update:visible'])

const editorStore = useEditorStore()
const elementsStore = useElementsStore()
const floorsStore = useFloorsStore()

const { currentFloor, scale, unit } = storeToRefs(editorStore)

const projectName = ref('室内地图')
const exportFormat = ref('geojson')
const floorSelection = ref('all')
const includeTypes = ref([
  'wall',
  'room',
  'door',
  'window',
  'corridor',
  'hall',
  'poi',
  'poster',
  'text',
  'navpath',
  'navnode'
])
const imageScale = ref(1)
const includeGrid = ref(false)
const exporting = ref(false)

async function handleExport() {
  exporting.value = true

  try {
    switch (exportFormat.value) {
      case 'geojson':
        exportGeoJSON()
        break
      case 'png':
        await exportPNG()
        break
      case 'svg':
        exportSVG()
        break
    }

    emit('update:visible', false)
    ElMessage.success('导出成功！')
  } catch (error) {
    console.error('Export error:', error)
    ElMessage.error('导出失败')
  } finally {
    exporting.value = false
  }
}

function exportGeoJSON() {
  const projectInfo = {
    name: projectName.value,
    scale: scale.value,
    unit: unit.value
  }

  let geojson

  if (floorSelection.value === 'current') {
    const floor = floorsStore.getFloor(currentFloor.value)
    if (!floor) return

    const elements = elementsStore.getElementsByFloor(currentFloor.value)
      .filter(el => includeTypes.value.includes(el.type))

    geojson = exportFloorToGeoJSON(elements, floor, projectInfo)
  } else {
    // Filter elements by type
    const filteredElements: Record<number, any[]> = {}
    for (const floor of floorsStore.floors) {
      filteredElements[floor.id] = elementsStore.getElementsByFloor(floor.id)
        .filter(el => includeTypes.value.includes(el.type))
    }

    geojson = exportToGeoJSON(filteredElements, projectInfo)
  }

  const blob = new Blob([JSON.stringify(geojson, null, 2)], {
    type: 'application/json'
  })

  const filename = `${projectName.value.replace(/\s+/g, '_')}.geojson`
  saveAs(blob, filename)
}

async function exportPNG() {
  // Get elements to export
  const elements = floorSelection.value === 'current'
    ? elementsStore.getElementsByFloor(currentFloor.value)
    : elementsStore.allElements

  const filtered = elements.filter(el => includeTypes.value.includes(el.type))

  if (filtered.length === 0) {
    ElMessage.warning('没有可导出的元素')
    return
  }

  // Calculate bounds of all elements
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

  for (const el of filtered) {
    if ('points' in el && el.points) {
      for (const p of el.points) {
        minX = Math.min(minX, p.x)
        minY = Math.min(minY, p.y)
        maxX = Math.max(maxX, p.x)
        maxY = Math.max(maxY, p.y)
      }
    } else if ('position' in el && el.position) {
      minX = Math.min(minX, el.position.x - 20)
      minY = Math.min(minY, el.position.y - 20)
      maxX = Math.max(maxX, el.position.x + 20)
      maxY = Math.max(maxY, el.position.y + 20)
    }
  }

  const padding = 50
  const width = (maxX - minX) + padding * 2
  const height = (maxY - minY) + padding * 2

  // Create canvas with proper size
  const scaleFactor = imageScale.value
  const exportCanvas = document.createElement('canvas')
  exportCanvas.width = width * scaleFactor
  exportCanvas.height = height * scaleFactor

  const ctx = exportCanvas.getContext('2d')
  if (!ctx) return

  // Set background
  ctx.fillStyle = '#f8f9fa'
  ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height)

  // Scale and translate to fit elements
  ctx.scale(scaleFactor, scaleFactor)
  ctx.translate(-minX + padding, -minY + padding)

  // Draw grid if needed
  if (includeGrid.value) {
    const gridSize = 10
    ctx.strokeStyle = '#e0e0e0'
    ctx.lineWidth = 0.5
    ctx.beginPath()
    for (let x = Math.floor(minX / gridSize) * gridSize; x <= maxX + padding; x += gridSize) {
      ctx.moveTo(x, minY - padding)
      ctx.lineTo(x, maxY + padding)
    }
    for (let y = Math.floor(minY / gridSize) * gridSize; y <= maxY + padding; y += gridSize) {
      ctx.moveTo(minX - padding, y)
      ctx.lineTo(maxX + padding, y)
    }
    ctx.stroke()
  }

  // Draw elements
  for (const el of filtered) {
    drawElementToCanvas(ctx, el)
  }

  // Convert to blob
  exportCanvas.toBlob((blob) => {
    if (blob) {
      const filename = `${projectName.value.replace(/\s+/g, '_')}.png`
      saveAs(blob, filename)
    }
  }, 'image/png')
}

function drawElementToCanvas(ctx: CanvasRenderingContext2D, el: any) {
  ctx.save()
  ctx.strokeStyle = el.style.strokeColor
  ctx.lineWidth = el.style.strokeWidth
  ctx.globalAlpha = el.style.opacity

  if (el.type === 'wall' && el.points?.length >= 2) {
    ctx.lineWidth = el.thickness || 8
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(el.points[0].x, el.points[0].y)
    for (let i = 1; i < el.points.length; i++) {
      ctx.lineTo(el.points[i].x, el.points[i].y)
    }
    ctx.stroke()
  } else if (el.type === 'room' && el.points?.length >= 3) {
    ctx.beginPath()
    ctx.moveTo(el.points[0].x, el.points[0].y)
    for (let i = 1; i < el.points.length; i++) {
      ctx.lineTo(el.points[i].x, el.points[i].y)
    }
    ctx.closePath()
    if (el.style.fillColor) {
      ctx.fillStyle = el.style.fillColor
      ctx.fill()
    }
    ctx.stroke()
  } else if (el.type === 'navpath' && el.points?.length >= 2) {
    ctx.setLineDash([8, 4])
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(el.points[0].x, el.points[0].y)
    for (let i = 1; i < el.points.length; i++) {
      ctx.lineTo(el.points[i].x, el.points[i].y)
    }
    ctx.stroke()
    ctx.setLineDash([])

    // Draw nodes
    for (const point of el.points) {
      ctx.beginPath()
      ctx.arc(point.x, point.y, 4, 0, Math.PI * 2)
      ctx.fillStyle = el.style.fillColor || '#4CAF50'
      ctx.fill()
    }
  } else if (el.type === 'poi' && el.position) {
    const pos = el.position
    const fillColor = el.style.fillColor || '#FF6B6B'

    // Draw marker
    ctx.beginPath()
    ctx.arc(pos.x, pos.y - 10, 10, 0, Math.PI * 2)
    ctx.fillStyle = fillColor
    ctx.fill()
    ctx.strokeStyle = '#333'
    ctx.lineWidth = 2
    ctx.stroke()

    // Draw pin point
    ctx.beginPath()
    ctx.moveTo(pos.x - 7, pos.y - 3)
    ctx.lineTo(pos.x, pos.y + 6)
    ctx.lineTo(pos.x + 7, pos.y - 3)
    ctx.closePath()
    ctx.fillStyle = fillColor
    ctx.fill()
  } else if (el.type === 'navnode' && el.position) {
    const pos = el.position
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, 8, 0, Math.PI * 2)
    ctx.fillStyle = el.style.fillColor || '#2196F3'
    ctx.fill()
    ctx.strokeStyle = el.style.strokeColor || '#1565C0'
    ctx.lineWidth = 2
    ctx.stroke()
  } else if ((el.type === 'corridor' || el.type === 'hall') && el.points?.length >= 3) {
    ctx.beginPath()
    ctx.moveTo(el.points[0].x, el.points[0].y)
    for (let i = 1; i < el.points.length; i++) {
      ctx.lineTo(el.points[i].x, el.points[i].y)
    }
    ctx.closePath()
    if (el.style.fillColor) {
      ctx.fillStyle = el.style.fillColor
      ctx.fill()
    }
    ctx.stroke()
  } else if (el.type === 'door' && el.position) {
    const pos = el.position
    const width = el.width || 90
    const rotation = (el.rotation || 0) * Math.PI / 180

    ctx.save()
    ctx.translate(pos.x, pos.y)
    ctx.rotate(rotation)

    // Draw door
    ctx.fillStyle = el.style.fillColor || '#DEB887'
    ctx.fillRect(-width/2, -5, width, 10)
    ctx.strokeRect(-width/2, -5, width, 10)

    ctx.restore()
  } else if (el.type === 'window' && el.position) {
    const pos = el.position
    const width = el.width || 100
    const rotation = (el.rotation || 0) * Math.PI / 180

    ctx.save()
    ctx.translate(pos.x, pos.y)
    ctx.rotate(rotation)

    // Draw window
    ctx.strokeStyle = '#4169E1'
    ctx.strokeRect(-width/2, -5, width, 10)
    ctx.beginPath()
    ctx.moveTo(-width/2, 0)
    ctx.lineTo(width/2, 0)
    ctx.stroke()

    ctx.restore()
  } else if (el.type === 'text' && el.position) {
    const pos = el.position
    const text = el.text || 'Text'
    const fontSize = el.fontSize || 16
    const fontFamily = el.fontFamily || 'Arial'
    const color = el.color || '#333333'
    const rotation = (el.rotation || 0) * Math.PI / 180
    const alignment = el.alignment || 'center'
    const bold = el.bold ? 'bold ' : ''
    const italic = el.italic ? 'italic ' : ''

    ctx.save()
    ctx.translate(pos.x, pos.y)
    ctx.rotate(rotation)

    ctx.font = `${italic}${bold}${fontSize}px ${fontFamily}`
    ctx.fillStyle = color
    ctx.textAlign = alignment
    ctx.textBaseline = 'middle'
    ctx.fillText(text, 0, 0)

    ctx.restore()
  } else if (el.type === 'poster' && el.position) {
    const pos = el.position
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, 6, 0, Math.PI * 2)
    ctx.fillStyle = el.style.fillColor || '#FFC107'
    ctx.fill()
    ctx.strokeStyle = el.style.strokeColor || '#FF9800'
    ctx.lineWidth = 2
    ctx.stroke()
  }

  ctx.restore()
}

function exportSVG() {
  // Generate SVG from elements
  const elements = floorSelection.value === 'current'
    ? elementsStore.getElementsByFloor(currentFloor.value)
    : elementsStore.allElements

  const filtered = elements.filter(el => includeTypes.value.includes(el.type))

  // Calculate bounds
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity

  for (const el of filtered) {
    if ('points' in el && el.points) {
      for (const p of el.points) {
        minX = Math.min(minX, p.x)
        minY = Math.min(minY, p.y)
        maxX = Math.max(maxX, p.x)
        maxY = Math.max(maxY, p.y)
      }
    } else if ('position' in el && el.position) {
      minX = Math.min(minX, el.position.x - 20)
      minY = Math.min(minY, el.position.y - 20)
      maxX = Math.max(maxX, el.position.x + 20)
      maxY = Math.max(maxY, el.position.y + 20)
    }
  }

  const padding = 50
  const width = (maxX - minX) + padding * 2
  const height = (maxY - minY) + padding * 2

  let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${minX - padding} ${minY - padding} ${width} ${height}">
  <style>
    .wall { stroke: #333; stroke-width: 2; stroke-linecap: round; fill: none; }
    .room { stroke: #666; stroke-width: 2; fill: #E8F4F8; fill-opacity: 0.5; }
    .navpath { stroke: #4CAF50; stroke-width: 2; stroke-dasharray: 8,4; fill: none; }
  </style>
`

  // Add elements to SVG
  for (const el of filtered) {
    if (el.type === 'wall' && 'points' in el && el.points.length > 1) {
      const d = el.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
      svgContent += `  <path class="wall" d="${d}"/>\n`
    } else if (el.type === 'room' && 'points' in el && el.points.length > 2) {
      const d = el.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + ' Z'
      svgContent += `  <path class="room" d="${d}"/>\n`
    } else if ((el.type === 'corridor' || el.type === 'hall') && 'points' in el && el.points.length > 2) {
      const d = el.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ') + ' Z'
      const fillColor = el.type === 'corridor' ? '#F5F5F5' : '#FAFAFA'
      svgContent += `  <path d="${d}" stroke="#888" stroke-width="2" fill="${fillColor}" fill-opacity="0.3"/>\n`
    } else if (el.type === 'navpath' && 'points' in el && el.points.length > 1) {
      const d = el.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
      svgContent += `  <path class="navpath" d="${d}"/>\n`
    } else if (el.type === 'poi' && 'position' in el) {
      svgContent += `  <circle cx="${el.position.x}" cy="${el.position.y}" r="8" fill="#FF6B6B"/>\n`
    } else if (el.type === 'navnode' && 'position' in el) {
      svgContent += `  <circle cx="${el.position.x}" cy="${el.position.y}" r="6" fill="#2196F3" stroke="#1565C0" stroke-width="2"/>\n`
    } else if (el.type === 'door' && 'position' in el) {
      const width = el.width || 90
      const rotation = el.rotation || 0
      // Use group with transform for rotation around center
      svgContent += `  <g transform="translate(${el.position.x}, ${el.position.y}) rotate(${rotation})">\n`
      svgContent += `    <rect x="${-width/2}" y="-5" width="${width}" height="10" fill="#DEB887" stroke="#8B4513" stroke-width="2"/>\n`
      svgContent += `  </g>\n`
    } else if (el.type === 'window' && 'position' in el) {
      const width = el.width || 100
      const rotation = el.rotation || 0
      // Use group with transform for rotation around center
      svgContent += `  <g transform="translate(${el.position.x}, ${el.position.y}) rotate(${rotation})">\n`
      svgContent += `    <rect x="${-width/2}" y="-5" width="${width}" height="10" fill="none" stroke="#4169E1" stroke-width="2"/>\n`
      svgContent += `    <line x1="${-width/2}" y1="0" x2="${width/2}" y2="0" stroke="#4169E1" stroke-width="1.5"/>\n`
      svgContent += `  </g>\n`
    } else if (el.type === 'text' && 'position' in el) {
      const fontSize = el.fontSize || 16
      const color = el.color || '#333333'
      const text = el.text || 'Text'
      const rotation = el.rotation || 0
      // Use transform for text rotation
      svgContent += `  <text x="${el.position.x}" y="${el.position.y}" font-size="${fontSize}" fill="${color}" text-anchor="middle" dominant-baseline="middle" transform="rotate(${rotation}, ${el.position.x}, ${el.position.y})">${text}</text>\n`
    } else if (el.type === 'poster' && 'position' in el) {
      svgContent += `  <circle cx="${el.position.x}" cy="${el.position.y}" r="6" fill="#FFC107" stroke="#FF9800" stroke-width="2"/>\n`
    }
  }

  svgContent += '</svg>'

  const blob = new Blob([svgContent], { type: 'image/svg+xml' })
  const filename = `${projectName.value.replace(/\s+/g, '_')}.svg`
  saveAs(blob, filename)
}
</script>

<style scoped>
.export-options {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.option-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.option-group > label {
  font-weight: 600;
  font-size: 13px;
  color: #333;
}

:deep(.el-checkbox-group) {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
</style>



