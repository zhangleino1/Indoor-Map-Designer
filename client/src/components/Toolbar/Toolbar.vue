<template>
  <div class="toolbar">
    <div class="tool-group">
      <el-tooltip content="选择 (V)" placement="right">
        <button
          class="tool-btn"
          :class="{ active: currentTool === 'select' }"
          @click="setTool('select')"
        >
          <el-icon :size="20"><Pointer /></el-icon>
        </button>
      </el-tooltip>
    </div>

    <el-divider />

    <div class="tool-group">
      <el-tooltip content="墙体 / 线段 (W)" placement="right">
        <button
          class="tool-btn"
          :class="{ active: currentTool === 'wall' }"
          @click="setTool('wall')"
        >
          <svg viewBox="0 0 24 24" width="20" height="20">
            <line x1="4" y1="20" x2="20" y2="4" stroke="currentColor" stroke-width="3"/>
          </svg>
        </button>
      </el-tooltip>

      <el-tooltip content="房间 / 矩形 (R)" placement="right">
        <button
          class="tool-btn"
          :class="{ active: currentTool === 'room' }"
          @click="setTool('room')"
        >
          <el-icon :size="20"><Box /></el-icon>
        </button>
      </el-tooltip>

      <el-tooltip content="多边形 (P)" placement="right">
        <button
          class="tool-btn"
          :class="{ active: currentTool === 'polygon' }"
          @click="setTool('polygon')"
        >
          <svg viewBox="0 0 24 24" width="20" height="20">
            <polygon points="12,2 22,8 18,20 6,20 2,8" fill="none" stroke="currentColor" stroke-width="2"/>
          </svg>
        </button>
      </el-tooltip>

      <el-tooltip content="门 (D)" placement="right">
        <button
          class="tool-btn"
          :class="{ active: currentTool === 'door' }"
          @click="setTool('door')"
        >
          <svg viewBox="0 0 24 24" width="20" height="20">
            <rect x="6" y="3" width="12" height="18" fill="none" stroke="currentColor" stroke-width="2"/>
            <circle cx="15" cy="12" r="1.5" fill="currentColor"/>
          </svg>
        </button>
      </el-tooltip>

      <el-tooltip content="窗户 (Shift+W)" placement="right">
        <button
          class="tool-btn"
          :class="{ active: currentTool === 'window' }"
          @click="setTool('window')"
        >
          <svg viewBox="0 0 24 24" width="20" height="20">
            <rect x="4" y="4" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"/>
            <line x1="12" y1="4" x2="12" y2="20" stroke="currentColor" stroke-width="1.5"/>
            <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" stroke-width="1.5"/>
          </svg>
        </button>
      </el-tooltip>
    </div>

    <el-divider />

    <!-- 路网工具组 -->
    <div class="tool-group">
      <el-tooltip content="导航路径 (N)" placement="right">
        <button
          class="tool-btn"
          :class="{ active: currentTool === 'navpath' }"
          @click="setTool('navpath')"
        >
          <el-icon :size="20"><Guide /></el-icon>
        </button>
      </el-tooltip>

      <el-tooltip content="导航节点 (O)" placement="right">
        <button
          class="tool-btn"
          :class="{ active: currentTool === 'navnode' }"
          @click="setTool('navnode')"
        >
          <el-icon :size="20"><Aim /></el-icon>
        </button>
      </el-tooltip>
    </div>

    <el-divider />

    <!-- 标记工具组 -->
    <div class="tool-group">
      <el-tooltip content="兴趣点标记 (M)" placement="right">
        <button
          class="tool-btn"
          :class="{ active: currentTool === 'poi' }"
          @click="setTool('poi')"
        >
          <el-icon :size="20"><LocationFilled /></el-icon>
        </button>
      </el-tooltip>

      <!-- POI 类型选择器 -->
      <el-popover
        v-if="currentTool === 'poi'"
        placement="right"
        :width="120"
        trigger="click"
      >
        <template #reference>
          <button class="tool-btn sub-tool" :style="{ background: currentPoiStyle.color }">
            <span class="poi-icon">{{ currentPoiStyle.icon }}</span>
          </button>
        </template>
        <div class="poi-type-list">
          <div
            v-for="(style, type) in poiStyles"
            :key="type"
            class="poi-type-item"
            :class="{ active: currentPoiType === type }"
            @click="selectPoiType(type)"
          >
            <span class="poi-icon" :style="{ background: style.color }">{{ style.icon }}</span>
            <span class="poi-label">{{ style.label }}</span>
          </div>
        </div>
      </el-popover>

      <el-tooltip content="文本标签 (T)" placement="right">
        <button
          class="tool-btn"
          :class="{ active: currentTool === 'text' }"
          @click="setTool('text')"
        >
          <el-icon :size="20"><EditPen /></el-icon>
        </button>
      </el-tooltip>
    </div>


    <el-divider />

    <div class="tool-group">
      <el-tooltip content="删除选中 (Delete)" placement="right">
        <button class="tool-btn danger" @click="deleteSelected" :disabled="!hasSelection">
          <el-icon :size="20"><Delete /></el-icon>
        </button>
      </el-tooltip>
      
      <el-tooltip content="清除全部" placement="right">
        <el-popconfirm
          title="确定要清除所有元素吗？"
          confirm-button-text="确定"
          cancel-button-text="取消"
          @confirm="clearAll"
        >
          <template #reference>
            <button class="tool-btn danger">
              <el-icon :size="20"><DeleteFilled /></el-icon>
            </button>
          </template>
        </el-popconfirm>
      </el-tooltip>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import {
  Pointer,
  Box,
  LocationFilled,
  Guide,
  Delete,
  DeleteFilled,
  Aim,
  EditPen
} from '@element-plus/icons-vue'
import { useEditorStore } from '@/stores/editor'
import { useElementsStore } from '@/stores/elements'
import type { ToolType } from '@/types'

const editorStore = useEditorStore()
const elementsStore = useElementsStore()

const { currentTool, selectedIds, currentPoiType } = storeToRefs(editorStore)

const hasSelection = computed(() => selectedIds.value.length > 0)

// POI类型样式定义 (使用跨平台兼容的符号)
const poiStyles: Record<string, { color: string; icon: string; label: string }> = {
  elevator: { color: '#2196F3', icon: '⇅', label: '电梯' },
  stairs: { color: '#9C27B0', icon: '⊏', label: '楼梯' },
  toilet: { color: '#00BCD4', icon: 'WC', label: '洗手间' },
  exit: { color: '#F44336', icon: '→', label: '出口' },
  entrance: { color: '#4CAF50', icon: '←', label: '入口' },
  shop: { color: '#FF9800', icon: '$', label: '商店' },
  office: { color: '#607D8B', icon: '⌂', label: '办公室' },
  custom: { color: '#FF6B6B', icon: '★', label: '自定义' }
}

const currentPoiStyle = computed(() => poiStyles[currentPoiType.value] || poiStyles.custom)

function setTool(tool: ToolType) {
  const { previousPoints, previousTool, wasDrawing } = editorStore.setTool(tool)
  
  // 触发自定义事件让 CanvasView 保存绘制
  if (wasDrawing && previousPoints.length >= 2) {
    window.dispatchEvent(new CustomEvent('saveDrawing', { 
      detail: { points: previousPoints, tool: previousTool } 
    }))
  }
}

function selectPoiType(type: string) {
  editorStore.setPoiType(type)
}

function deleteSelected() {
  if (selectedIds.value.length > 0) {
    elementsStore.deleteElements(selectedIds.value)
    editorStore.clearSelection()
  }
}

function clearAll() {
  elementsStore.clearAll()
  editorStore.clearSelection()
}
</script>

<style scoped>
.toolbar {
  width: 56px;
  background: #fff;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 0;
  gap: 4px;
}

.tool-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.tool-btn {
  width: 40px;
  height: 40px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  transition: all 0.2s;
}

.tool-btn:hover {
  background: #f0f0f0;
  color: #333;
}

.tool-btn.active {
  background: #409eff;
  color: #fff;
}

.tool-btn.danger:hover {
  background: #ff4d4f;
  color: #fff;
}

.tool-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.el-divider {
  margin: 8px 0;
  width: 32px;
}

.tool-btn.sub-tool {
  width: 36px;
  height: 36px;
  border-radius: 6px;
  color: #fff;
}

.poi-icon {
  font-size: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 4px;
}

.poi-type-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.poi-type-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.2s;
}

.poi-type-item:hover {
  background: #f0f0f0;
}

.poi-type-item.active {
  background: #e6f7ff;
}

.poi-label {
  font-size: 13px;
  color: #333;
}
</style>
