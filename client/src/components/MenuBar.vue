<template>
  <div class="menu-bar">
    <div class="menu-left">
      <span class="app-title">室内地图设计器</span>
    </div>

    <div class="menu-center">
      <el-button-group>
        <el-button :icon="FolderOpened" @click="$emit('import')">导入</el-button>
        <el-button :icon="Download" @click="$emit('export')">导出</el-button>
      </el-button-group>

      <el-divider direction="vertical" />

      <el-button-group>
        <el-button :icon="Back" :disabled="!canUndo" @click="undo">撤销</el-button>
        <el-button :icon="Right" :disabled="!canRedo" @click="redo">重做</el-button>
      </el-button-group>

      <el-divider direction="vertical" />

      <el-button-group>
        <el-button :icon="ZoomIn" @click="zoomIn">放大</el-button>
        <el-button :icon="ZoomOut" @click="zoomOut">缩小</el-button>
        <el-button @click="resetZoom">{{ Math.round(zoom * 100) }}%</el-button>
      </el-button-group>

      <el-divider direction="vertical" />

      <el-checkbox v-model="showGrid" @change="toggleGrid">网格</el-checkbox>
      <el-checkbox v-model="snapToGrid" @change="toggleSnap">吸附</el-checkbox>
    </div>

    <div class="menu-right">
      <el-select v-model="unit" size="small" style="width: 80px">
        <el-option label="像素" value="px" />
        <el-option label="厘米" value="cm" />
        <el-option label="米" value="m" />
      </el-select>

      <el-divider direction="vertical" />

      <el-popconfirm
        title="确定要清除本地缓存吗？这将删除自动保存的数据。"
        confirm-button-text="确定"
        cancel-button-text="取消"
        @confirm="clearCache"
      >
        <template #reference>
          <el-tooltip content="清除本地缓存" placement="bottom">
            <el-button :icon="Delete" circle size="small" type="danger" plain />
          </el-tooltip>
        </template>
      </el-popconfirm>

      <el-tooltip content="快捷键帮助 (?)" placement="bottom">
        <el-button :icon="QuestionFilled" circle size="small" @click="$emit('showHelp')" />
      </el-tooltip>
    </div>
  </div>
</template>

<script setup lang="ts">

import { storeToRefs } from 'pinia'
import {
  FolderOpened,
  Download,
  Back,
  Right,
  ZoomIn,
  ZoomOut,
  QuestionFilled,
  Delete
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useEditorStore } from '@/stores/editor'
import { useElementsStore } from '@/stores/elements'

defineEmits(['export', 'import', 'showHelp'])

const editorStore = useEditorStore()
const elementsStore = useElementsStore()

const { zoom, showGrid, snapToGrid, unit } = storeToRefs(editorStore)
const { canUndo, canRedo } = storeToRefs(elementsStore)

function zoomIn() {
  editorStore.setZoom(zoom.value * 1.2)
}

function zoomOut() {
  editorStore.setZoom(zoom.value / 1.2)
}

function resetZoom() {
  editorStore.setZoom(1)
}

function toggleGrid() {
  editorStore.toggleGrid()
}

function toggleSnap() {
  editorStore.toggleSnapToGrid()
}

function undo() {
  elementsStore.undo()
}

function redo() {
  elementsStore.redo()
}

function clearCache() {
  try {
    localStorage.clear()
    ElMessage.success('缓存已清除')
  } catch (e) {
    ElMessage.error('清除缓存失败')
  }
}
</script>

<style scoped>
.menu-bar {
  height: 48px;
  background: #fff;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
  padding: 0 16px;
  gap: 16px;
}

.menu-left {
  display: flex;
  align-items: center;
}

.app-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.menu-center {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.menu-right {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
