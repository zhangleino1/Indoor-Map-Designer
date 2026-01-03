<template>
  <div class="ruler-container">
    <!-- Corner -->
    <div class="ruler-corner"></div>

    <!-- Horizontal ruler -->
    <canvas ref="hRulerRef" class="ruler horizontal"></canvas>

    <!-- Vertical ruler -->
    <canvas ref="vRulerRef" class="ruler vertical"></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useEditorStore } from '@/stores/editor'

const RULER_SIZE = 20

const hRulerRef = ref<HTMLCanvasElement>()
const vRulerRef = ref<HTMLCanvasElement>()

const editorStore = useEditorStore()
const { zoom, panOffset, canvasSize, unit, scale, gridSize } = storeToRefs(editorStore)

onMounted(() => {
  resizeRulers()
  window.addEventListener('resize', resizeRulers)
  render()
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeRulers)
})

watch([zoom, panOffset, canvasSize, unit, gridSize], () => {
  render()
}, { deep: true })

function resizeRulers() {
  if (hRulerRef.value) {
    // Subtract RULER_SIZE since the horizontal ruler starts at left: 20px
    hRulerRef.value.width = Math.max(0, canvasSize.value.width - RULER_SIZE)
    hRulerRef.value.height = RULER_SIZE
  }
  if (vRulerRef.value) {
    vRulerRef.value.width = RULER_SIZE
    // Subtract RULER_SIZE since the vertical ruler starts at top: 20px
    vRulerRef.value.height = Math.max(0, canvasSize.value.height - RULER_SIZE)
  }
  render()
}

function render() {
  renderHorizontalRuler()
  renderVerticalRuler()
}

function formatValue(pixels: number): string {
  const cm = pixels * scale.value
  if (unit.value === 'px') {
    return `${Math.round(pixels)}`
  } else if (unit.value === 'm') {
    return `${(cm / 100).toFixed(1)}`
  }
  return `${Math.round(cm)}`
}

function renderHorizontalRuler() {
  const canvas = hRulerRef.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const width = canvas.width
  const height = canvas.height

  // Clear
  ctx.fillStyle = '#f5f5f5'
  ctx.fillRect(0, 0, width, height)

  // Draw border
  ctx.strokeStyle = '#ddd'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, height - 0.5)
  ctx.lineTo(width, height - 0.5)
  ctx.stroke()

  // Use grid size as base step to align with grid
  const baseStep = gridSize.value
  const screenStep = baseStep * zoom.value

  // Calculate major step (multiply grid size to get readable spacing)
  let majorMultiplier = 1
  if (screenStep < 10) majorMultiplier = 10
  else if (screenStep < 20) majorMultiplier = 5
  else if (screenStep < 50) majorMultiplier = 2

  const majorStep = baseStep * majorMultiplier

  // Adjust panOffset to account for ruler position (ruler starts at left: 20px)
  // The main canvas applies panOffset after its own coordinate system, so we need to
  // offset by RULER_SIZE to align the ruler ticks with the grid lines
  const adjustedPanX = panOffset.value.x - RULER_SIZE

  // Calculate visible range - align to baseStep (same as grid)
  const startX = Math.floor(-adjustedPanX / zoom.value / baseStep) * baseStep - baseStep
  const endX = Math.ceil((width - adjustedPanX) / zoom.value / baseStep) * baseStep + baseStep

  ctx.fillStyle = '#666'
  ctx.font = '10px Arial'
  ctx.textAlign = 'center'
  ctx.strokeStyle = '#999'
  ctx.lineWidth = 1

  // Iterate through every grid position
  for (let x = startX; x <= endX; x += baseStep) {
    const screenX = x * zoom.value + adjustedPanX

    if (screenX < 0 || screenX > width) continue

    // Check if this is a major tick (at majorStep intervals)
    const isMajor = Math.abs(x % majorStep) < 0.001 || Math.abs((x % majorStep) - majorStep) < 0.001

    if (isMajor) {
      // Major tick
      ctx.beginPath()
      ctx.moveTo(screenX, height)
      ctx.lineTo(screenX, height - 8)
      ctx.stroke()

      // Label
      ctx.fillText(formatValue(x), screenX, height - 10)
    } else {
      // Minor tick
      ctx.beginPath()
      ctx.moveTo(screenX, height)
      ctx.lineTo(screenX, height - 4)
      ctx.stroke()
    }
  }
}

function renderVerticalRuler() {
  const canvas = vRulerRef.value
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const width = canvas.width
  const height = canvas.height

  // Clear
  ctx.fillStyle = '#f5f5f5'
  ctx.fillRect(0, 0, width, height)

  // Draw border
  ctx.strokeStyle = '#ddd'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(width - 0.5, 0)
  ctx.lineTo(width - 0.5, height)
  ctx.stroke()

  // Use grid size as base step to align with grid
  const baseStep = gridSize.value
  const screenStep = baseStep * zoom.value

  // Calculate major step (multiply grid size to get readable spacing)
  let majorMultiplier = 1
  if (screenStep < 10) majorMultiplier = 10
  else if (screenStep < 20) majorMultiplier = 5
  else if (screenStep < 50) majorMultiplier = 2

  const majorStep = baseStep * majorMultiplier

  // Adjust panOffset to account for ruler position (ruler starts at top: 20px)
  const adjustedPanY = panOffset.value.y - RULER_SIZE

  // Calculate visible range - align to baseStep (same as grid)
  const startY = Math.floor(-adjustedPanY / zoom.value / baseStep) * baseStep - baseStep
  const endY = Math.ceil((height - adjustedPanY) / zoom.value / baseStep) * baseStep + baseStep

  ctx.fillStyle = '#666'
  ctx.font = '10px Arial'
  ctx.textAlign = 'right'
  ctx.textBaseline = 'middle'
  ctx.strokeStyle = '#999'
  ctx.lineWidth = 1

  // Iterate through every grid position
  for (let y = startY; y <= endY; y += baseStep) {
    const screenY = y * zoom.value + adjustedPanY

    if (screenY < 0 || screenY > height) continue

    // Check if this is a major tick (at majorStep intervals)
    const isMajor = Math.abs(y % majorStep) < 0.001 || Math.abs((y % majorStep) - majorStep) < 0.001

    if (isMajor) {
      // Major tick
      ctx.beginPath()
      ctx.moveTo(width, screenY)
      ctx.lineTo(width - 8, screenY)
      ctx.stroke()

      // Label (rotated)
      ctx.save()
      ctx.translate(width - 10, screenY)
      ctx.rotate(-Math.PI / 2)
      ctx.textAlign = 'center'
      ctx.fillText(formatValue(y), 0, 0)
      ctx.restore()
    } else {
      // Minor tick
      ctx.beginPath()
      ctx.moveTo(width, screenY)
      ctx.lineTo(width - 4, screenY)
      ctx.stroke()
    }
  }
}
</script>

<style scoped>
.ruler-container {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 10;
}

.ruler-corner {
  position: absolute;
  top: 0;
  left: 0;
  width: 20px;
  height: 20px;
  background: #f5f5f5;
  border-right: 1px solid #ddd;
  border-bottom: 1px solid #ddd;
}

.ruler.horizontal {
  position: absolute;
  top: 0;
  left: 20px;
}

.ruler.vertical {
  position: absolute;
  top: 20px;
  left: 0;
}
</style>
