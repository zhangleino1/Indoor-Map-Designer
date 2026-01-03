<template>
  <div class="properties-panel">
    <div class="panel-header">
      <span>属性</span>
    </div>

    <div class="panel-content" v-if="selectedElement">
      <!-- Element Type -->
      <div class="property-group">
        <div class="group-title">元素</div>
        <div class="property-row">
          <span class="property-label">类型</span>
          <span class="property-value type-badge">{{ selectedElement.type }}</span>
        </div>
        <div class="property-row">
          <span class="property-label">ID</span>
          <span class="property-value id-value">{{ selectedElement.id.substring(0, 8) }}...</span>
        </div>
      </div>

      <!-- Name -->
      <div class="property-group">
        <div class="group-title">名称</div>
        <el-input
          v-model="elementName"
          size="small"
          placeholder="输入名称"
          @change="updateName"
        />
      </div>

      <!-- Position (for point elements) -->
      <div class="property-group" v-if="'position' in selectedElement">
        <div class="group-title">位置</div>
        <div class="property-row">
          <span class="property-label">X</span>
          <el-input-number
            v-model="posX"
            size="small"
            :controls="false"
            @change="updatePosition"
          />
        </div>
        <div class="property-row">
          <span class="property-label">Y</span>
          <el-input-number
            v-model="posY"
            size="small"
            :controls="false"
            @change="updatePosition"
          />
        </div>
      </div>

      <!-- Dimensions (for walls) -->
      <div class="property-group" v-if="selectedElement.type === 'wall'">
        <div class="group-title">尺寸</div>
        <div class="property-row">
          <span class="property-label">厚度</span>
          <el-input-number
            v-model="wallThickness"
            size="small"
            :min="1"
            :max="100"
            @change="updateWallThickness"
          />
        </div>
        <div class="property-row">
          <span class="property-label">长度</span>
          <span class="property-value">{{ wallLength }}</span>
        </div>
      </div>

      <!-- Door/Window properties -->
      <div class="property-group" v-if="selectedElement.type === 'door' || selectedElement.type === 'window'">
        <div class="group-title">尺寸</div>
        <div class="property-row">
          <span class="property-label">宽度</span>
          <el-input-number
            v-model="elementWidth"
            size="small"
            :min="10"
            :max="500"
            @change="updateWidth"
          />
        </div>
        <div class="property-row">
          <span class="property-label">旋转</span>
          <el-slider
            v-model="elementRotation"
            :min="0"
            :max="360"
            size="small"
            @change="updateRotation"
          />
        </div>
      </div>

      <!-- POI properties -->
      <div class="property-group" v-if="selectedElement.type === 'poi'">
        <div class="group-title">兴趣点类型</div>
        <el-select v-model="poiType" size="small" @change="updatePOIType">
          <el-option label="电梯" value="elevator" />
          <el-option label="楼梯" value="stairs" />
          <el-option label="卫生间" value="toilet" />
          <el-option label="出口" value="exit" />
          <el-option label="入口" value="entrance" />
          <el-option label="商店" value="shop" />
          <el-option label="办公室" value="office" />
          <el-option label="自定义" value="custom" />
        </el-select>

        <div class="property-row" v-if="poiType === 'elevator' || poiType === 'stairs'">
          <span class="property-label">连接到</span>
          <el-input
            v-model="connectsTo"
            size="small"
            placeholder="例如: 1,2,3"
            @change="updateConnectsTo"
          />
        </div>
      </div>

      <!-- Room properties -->
      <div class="property-group" v-if="selectedElement.type === 'room'">
        <div class="group-title">房间信息</div>
        <div class="property-row">
          <span class="property-label">面积</span>
          <span class="property-value">{{ roomArea }}</span>
        </div>
      </div>

      <!-- Style -->
      <div class="property-group">
        <div class="group-title">样式</div>
        <div class="property-row">
          <span class="property-label">描边</span>
          <el-color-picker
            v-model="strokeColor"
            size="small"
            @change="updateStyle"
          />
        </div>
        <div class="property-row" v-if="hasFill">
          <span class="property-label">填充</span>
          <el-color-picker
            v-model="fillColor"
            size="small"
            show-alpha
            @change="updateStyle"
          />
        </div>
        <div class="property-row">
          <span class="property-label">透明度</span>
          <el-slider
            v-model="opacity"
            :min="0"
            :max="1"
            :step="0.1"
            size="small"
            @change="updateStyle"
          />
        </div>
      </div>

      <!-- Actions -->
      <div class="property-group">
        <el-button type="danger" size="small" @click="deleteElement">
          删除元素
        </el-button>
      </div>
    </div>

    <div class="panel-empty" v-else>
      <el-icon :size="32" color="#ccc"><InfoFilled /></el-icon>
      <p>选择一个元素以查看属性</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { InfoFilled } from '@element-plus/icons-vue'
import { useEditorStore } from '@/stores/editor'
import { useElementsStore } from '@/stores/elements'
import type { MapElement, WallElement, DoorElement, POIElement, RoomElement } from '@/types'
import { calculateLineLength, calculatePolygonArea } from '@/utils/geometry'

const editorStore = useEditorStore()
const elementsStore = useElementsStore()

const { selectedIds } = storeToRefs(editorStore)

// Local state for editing
const elementName = ref('')
const posX = ref(0)
const posY = ref(0)
const wallThickness = ref(24)
const elementWidth = ref(90)
const elementRotation = ref(0)
const poiType = ref('custom')
const connectsTo = ref('')
const strokeColor = ref('#333333')
const fillColor = ref('#E8F4F8')
const opacity = ref(1)

const selectedElement = computed<MapElement | null>(() => {
  if (selectedIds.value.length !== 1) return null
  return elementsStore.getElementById(selectedIds.value[0]) || null
})

const hasFill = computed(() => {
  if (!selectedElement.value) return false
  return ['room', 'door', 'window', 'poi'].includes(selectedElement.value.type)
})

const wallLength = computed(() => {
  if (!selectedElement.value || selectedElement.value.type !== 'wall') return ''
  const wall = selectedElement.value as WallElement
  return editorStore.formatLength(calculateLineLength(wall.points))
})

const roomArea = computed(() => {
  if (!selectedElement.value || selectedElement.value.type !== 'room') return ''
  const room = selectedElement.value as RoomElement
  const area = calculatePolygonArea(room.points)
  // Convert to square meters based on scale
  const scale = editorStore.scale
  const sqCm = area * scale * scale
  return `${(sqCm / 10000).toFixed(2)} m虏`
})

// Sync local state when selection changes
watch(selectedElement, (element) => {
  if (!element) return

  elementName.value = element.name || ''
  strokeColor.value = element.style.strokeColor
  fillColor.value = element.style.fillColor || '#ffffff'
  opacity.value = element.style.opacity

  if ('position' in element) {
    posX.value = element.position.x
    posY.value = element.position.y
  }

  if (element.type === 'wall') {
    wallThickness.value = (element as WallElement).thickness
  }

  if (element.type === 'door' || element.type === 'window') {
    elementWidth.value = (element as DoorElement).width
    elementRotation.value = (element as DoorElement).rotation
  }

  if (element.type === 'poi') {
    poiType.value = (element as POIElement).poiType
    connectsTo.value = (element as POIElement).connectsTo?.join(',') || ''
  }
}, { immediate: true })

function updateName() {
  if (!selectedElement.value) return
  elementsStore.updateElement(selectedElement.value.id, { name: elementName.value })
}

function updatePosition() {
  if (!selectedElement.value) return
  elementsStore.updateElement(selectedElement.value.id, {
    position: { x: posX.value, y: posY.value }
  } as any)
}

function updateWallThickness() {
  if (!selectedElement.value) return
  elementsStore.updateElement(selectedElement.value.id, {
    thickness: wallThickness.value
  } as any)
}

function updateWidth() {
  if (!selectedElement.value) return
  elementsStore.updateElement(selectedElement.value.id, {
    width: elementWidth.value
  } as any)
}

function updateRotation() {
  if (!selectedElement.value) return
  elementsStore.updateElement(selectedElement.value.id, {
    rotation: elementRotation.value
  } as any)
}

function updatePOIType() {
  if (!selectedElement.value) return
  elementsStore.updateElement(selectedElement.value.id, {
    poiType: poiType.value
  } as any)
}

function updateConnectsTo() {
  if (!selectedElement.value) return
  const floors = connectsTo.value.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n))
  elementsStore.updateElement(selectedElement.value.id, {
    connectsTo: floors
  } as any)
}

function updateStyle() {
  if (!selectedElement.value) return
  elementsStore.updateElement(selectedElement.value.id, {
    style: {
      ...selectedElement.value.style,
      strokeColor: strokeColor.value,
      fillColor: fillColor.value,
      opacity: opacity.value
    }
  })
}

function deleteElement() {
  if (!selectedElement.value) return
  elementsStore.deleteElement(selectedElement.value.id)
  editorStore.clearSelection()
}
</script>

<style scoped>
.properties-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  padding: 12px 16px;
  font-weight: 600;
  border-bottom: 1px solid #e0e0e0;
}

.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
}

.panel-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #999;
  text-align: center;
  padding: 24px;
}

.property-group {
  margin-bottom: 16px;
}

.group-title {
  font-size: 12px;
  font-weight: 600;
  color: #666;
  margin-bottom: 8px;
  text-transform: uppercase;
}

.property-row {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  gap: 8px;
}

.property-label {
  flex: 0 0 80px;
  font-size: 13px;
  color: #666;
}

.property-value {
  flex: 1;
  font-size: 13px;
  color: #333;
}

.type-badge {
  display: inline-block;
  padding: 2px 8px;
  background: #409eff;
  color: #fff;
  border-radius: 4px;
  font-size: 12px;
  text-transform: capitalize;
}

.id-value {
  font-family: monospace;
  font-size: 11px;
  color: #999;
}

:deep(.el-input-number) {
  width: 100%;
}

:deep(.el-select) {
  width: 100%;
}
</style>

