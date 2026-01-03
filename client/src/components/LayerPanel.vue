<template>
  <div class="layer-panel">
    <div class="panel-header">
      <span>图层</span>
    </div>
    <div class="layer-list">
      <div
        v-for="layer in layers"
        :key="layer.id"
        class="layer-item"
        @click="toggleLayer(layer.id)"
      >
        <el-icon :size="16" :color="layer.color">
          <component :is="layer.icon" />
        </el-icon>
        <span class="layer-name">{{ layer.name }}</span>
        <el-icon :size="14" class="visibility-icon">
          <View v-if="layerVisibility[layer.id]" />
          <Hide v-else />
        </el-icon>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { View, Hide } from '@element-plus/icons-vue'
import { useEditorStore } from '@/stores/editor'
import { markRaw } from 'vue'

// Define layer icons as raw components
const WallIcon = markRaw({
  template: `<svg viewBox="0 0 24 24" width="1em" height="1em"><line x1="4" y1="20" x2="20" y2="4" stroke="currentColor" stroke-width="3"/></svg>`
})

const RoomIcon = markRaw({
  template: `<svg viewBox="0 0 24 24" width="1em" height="1em"><rect x="4" y="4" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"/></svg>`
})

const POIIcon = markRaw({
  template: `<svg viewBox="0 0 24 24" width="1em" height="1em"><circle cx="12" cy="8" r="5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 13 L12 20" stroke="currentColor" stroke-width="2"/></svg>`
})

const NavPathIcon = markRaw({
  template: `<svg viewBox="0 0 24 24" width="1em" height="1em"><path d="M4 12 L12 4 L20 12 L12 20 Z" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="3,2"/></svg>`
})

const NavNodeIcon = markRaw({
  template: `<svg viewBox="0 0 24 24" width="1em" height="1em"><circle cx="12" cy="12" r="6" fill="none" stroke="currentColor" stroke-width="2"/><line x1="12" y1="8" x2="12" y2="16" stroke="currentColor" stroke-width="2"/><line x1="8" y1="12" x2="16" y2="12" stroke="currentColor" stroke-width="2"/></svg>`
})

const editorStore = useEditorStore()
const { layerVisibility } = storeToRefs(editorStore)

const layers = [
  { id: 'wall', name: '墙体', icon: WallIcon, color: '#333' },
  { id: 'room', name: '房间', icon: RoomIcon, color: '#666' },
  { id: 'poi', name: '兴趣点', icon: POIIcon, color: '#FF6B6B' },
  { id: 'navpath', name: '导航路径', icon: NavPathIcon, color: '#4CAF50' },
  { id: 'navnode', name: '导航节点', icon: NavNodeIcon, color: '#2196F3' }
]

function toggleLayer(layerId: string) {
  editorStore.toggleLayerVisibility(layerId)
}
</script>

<style scoped>
.layer-panel {
  border-top: 1px solid #e0e0e0;
  flex-shrink: 0;
}

.panel-header {
  padding: 12px 16px;
  font-weight: 600;
  border-bottom: 1px solid #e0e0e0;
  font-size: 13px;
}

.layer-list {
  padding: 8px;
}

.layer-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  gap: 10px;
  transition: background 0.2s;
}

.layer-item:hover {
  background: #f5f5f5;
}

.layer-name {
  flex: 1;
  font-size: 13px;
}

.visibility-icon {
  color: #999;
}
</style>

