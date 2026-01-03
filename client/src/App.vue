<template>
  <div class="app-container">
    <!-- Top Menu Bar -->
    <MenuBar @export="showExportDialog = true" @import="handleImport" @showHelp="showHelpDialog = true" />

    <!-- Main Content -->
    <div class="main-content">
      <!-- Left Toolbar -->
      <Toolbar />

      <!-- Center Canvas -->
      <div class="canvas-container">
        <Ruler />
        <CanvasView />
        <StatusBar />
        <!-- Floor Panel (positioned inside canvas container) -->
        <FloorPanel />
      </div>

      <!-- Right Panel -->
      <div class="right-panel">
        <PropertiesPanel />
        <LayerPanel />
      </div>
    </div>

    <!-- Export Dialog -->
    <ExportDialog v-model:visible="showExportDialog" />

    <!-- Help Dialog -->
    <HelpDialog v-model:visible="showHelpDialog" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import MenuBar from '@/components/MenuBar.vue'
import Toolbar from '@/components/Toolbar/Toolbar.vue'
import CanvasView from '@/components/Canvas/CanvasView.vue'
import Ruler from '@/components/Canvas/Ruler.vue'
import StatusBar from '@/components/StatusBar.vue'
import PropertiesPanel from '@/components/Properties/PropertiesPanel.vue'
import LayerPanel from '@/components/LayerPanel.vue'
import FloorPanel from '@/components/FloorPanel/FloorPanel.vue'
import ExportDialog from '@/components/ExportDialog.vue'
import HelpDialog from '@/components/HelpDialog.vue'
import { useElementsStore } from '@/stores/elements'
import { importFromGeoJSON, validateGeoJSON } from '@/utils/geojson'
import { ElMessage } from 'element-plus'

const showExportDialog = ref(false)
const showHelpDialog = ref(false)
const elementsStore = useElementsStore()

// Auto-save functionality
let autoSaveTimer: number | null = null

// Load saved data on mount
onMounted(() => {
  if (elementsStore.hasSavedData()) {
    elementsStore.loadFromStorage()
    ElMessage.success('已恢复上次保存的数据')
  }
})

// Auto-save when elements change (debounced)
watch(
  () => elementsStore.elementsByFloor,
  () => {
    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer)
    }
    autoSaveTimer = window.setTimeout(() => {
      elementsStore.saveToStorage()
    }, 2000) // Save after 2 seconds of inactivity
  },
  { deep: true }
)

async function handleImport() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json,.geojson'

  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const data = JSON.parse(text)

      if (!validateGeoJSON(data)) {
        ElMessage.error('Invalid GeoJSON file')
        return
      }

      const { elements } = importFromGeoJSON(data)

      // Add imported elements (as a single undoable action)
      const count = elementsStore.importElements(elements as any)

      ElMessage.success(`已导入 ${count} 个元素`)
    } catch (error) {
      ElMessage.error('Failed to import file')
      console.error(error)
    }
  }

  input.click()
}
</script>

<style>
.app-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #f5f5f5;
  overflow: hidden;
}

.main-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.canvas-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.right-panel {
  width: 280px;
  background: #fff;
  border-left: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
</style>
