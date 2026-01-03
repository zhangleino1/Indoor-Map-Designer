<template>
  <div class="status-bar">
    <div class="status-item">
      <span class="label">位置:</span>
      <span class="value">{{ formatPosition }}</span>
    </div>
    <div class="status-item">
      <span class="label">缩放:</span>
      <span class="value">{{ Math.round(zoom * 100) }}%</span>
    </div>
    <div class="status-item">
      <span class="label">工具:</span>
      <span class="value tool-name">{{ toolName }}</span>
    </div>
    <div class="status-item">
      <span class="label">楼层:</span>
      <span class="value">{{ currentFloorName }}</span>
    </div>
    <div class="status-item" v-if="selectedIds.length > 0">
      <span class="label">已选中:</span>
      <span class="value">{{ selectedIds.length }} 个元素</span>
    </div>
    <div class="status-spacer"></div>
    <div class="status-item">
      <span class="label">网格:</span>
      <span class="value">{{ gridSize }}px</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { useEditorStore } from '@/stores/editor'
import { useFloorsStore } from '@/stores/floors'

const editorStore = useEditorStore()
const floorsStore = useFloorsStore()

const {
  currentTool,
  currentFloor,
  selectedIds,
  zoom,
  hoverPoint,
  gridSize
} = storeToRefs(editorStore)

const formatPosition = computed(() => {
  if (hoverPoint.value) {
    return `(${Math.round(hoverPoint.value.x)}, ${Math.round(hoverPoint.value.y)})`
  }
  return '(-, -)'
})

const toolName = computed(() => {
  const names: Record<string, string> = {
    select: '选择',
    wall: '墙体',
    room: '房间',
    polygon: '多边形',
    door: '门 (D)',
    window: '窗户 (⇧W)',
    poi: '兴趣点',
    navpath: '导航路径',
    navnode: '导航节点'
  }
  return names[currentTool.value] || currentTool.value
})

const currentFloorName = computed(() => {
  const floor = floorsStore.getFloor(currentFloor.value)
  return floor?.name || `${currentFloor.value}层`
})
</script>

<style scoped>
.status-bar {
  height: 28px;
  background: #fff;
  border-top: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
  padding: 0 16px;
  gap: 24px;
  font-size: 12px;
  color: #666;
}

.status-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.label {
  color: #999;
}

.value {
  color: #333;
  font-weight: 500;
}

.tool-name {
  text-transform: capitalize;
}

.status-spacer {
  flex: 1;
}
</style>
