<template>
  <div class="floor-panel">
    <div class="panel-header">
      <span>楼层</span>
      <div class="header-actions">
        <el-tooltip content="添加上层">
          <el-button size="small" :icon="Plus" circle @click="addFloorAbove" />
        </el-tooltip>
        <el-tooltip content="添加地下层">
          <el-button size="small" :icon="Minus" circle @click="addBasement" />
        </el-tooltip>
      </div>
    </div>

    <div class="floor-list">
      <div
        v-for="floor in sortedFloors"
        :key="floor.id"
        class="floor-item"
        :class="{ active: currentFloor === floor.id }"
        @click="selectFloor(floor.id)"
      >
        <span class="floor-name">{{ floor.name }}</span>
        <div class="floor-actions">
          <el-tooltip content="切换可见性">
            <el-button
              size="small"
              :icon="floor.visible ? View : Hide"
              text
              @click.stop="toggleVisibility(floor.id)"
            />
          </el-tooltip>
          <el-dropdown trigger="click" @command="handleCommand($event, floor)">
            <el-button size="small" :icon="MoreFilled" text @click.stop />
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="rename">重命名</el-dropdown-item>
                <el-dropdown-item command="duplicate">复制</el-dropdown-item>
                <el-dropdown-item command="delete" divided :disabled="floors.length <= 1">
                  删除
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
    </div>

    <!-- Rename Dialog -->
    <el-dialog v-model="renameDialogVisible" title="重命名楼层" width="300px">
      <el-input v-model="newFloorName" placeholder="楼层名称" />
      <template #footer>
        <el-button @click="renameDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmRename">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { Plus, Minus, View, Hide, MoreFilled } from '@element-plus/icons-vue'
import { useEditorStore } from '@/stores/editor'
import { useFloorsStore } from '@/stores/floors'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { Floor } from '@/types'

const editorStore = useEditorStore()
const floorsStore = useFloorsStore()

const { currentFloor } = storeToRefs(editorStore)
const { floors, sortedFloors } = storeToRefs(floorsStore)

const renameDialogVisible = ref(false)
const newFloorName = ref('')
const selectedFloorForRename = ref<Floor | null>(null)

function selectFloor(floorId: number) {
  editorStore.setFloor(floorId)
}

function toggleVisibility(floorId: number) {
  floorsStore.toggleFloorVisibility(floorId)
}

function addFloorAbove() {
  const newId = floorsStore.addFloor()
  editorStore.setFloor(newId)
  ElMessage.success(`已添加 ${newId} 层`)
}

function addBasement() {
  const newId = floorsStore.addBasementFloor()
  editorStore.setFloor(newId)
  ElMessage.success(`已添加地下 B${Math.abs(newId)} 层`)
}

function handleCommand(command: string, floor: Floor) {
  switch (command) {
    case 'rename':
      selectedFloorForRename.value = floor
      newFloorName.value = floor.name
      renameDialogVisible.value = true
      break
    case 'duplicate':
      const newId = floorsStore.duplicateFloor(floor.id)
      if (newId) {
        editorStore.setFloor(newId)
        ElMessage.success('楼层已复制')
      }
      break
    case 'delete':
      ElMessageBox.confirm(
        '确定要删除此楼层吗？该楼层上的所有元素将被移除。',
        '删除楼层',
        {
          confirmButtonText: '删除',
          cancelButtonText: '取消',
          type: 'warning'
        }
      ).then(() => {
        if (floorsStore.removeFloor(floor.id)) {
          if (currentFloor.value === floor.id) {
            const remaining = floors.value[0]
            if (remaining) {
              editorStore.setFloor(remaining.id)
            }
          }
          ElMessage.success('楼层已删除')
        }
      }).catch(() => {})
      break
  }
}

function confirmRename() {
  if (selectedFloorForRename.value && newFloorName.value.trim()) {
    floorsStore.renameFloor(selectedFloorForRename.value.id, newFloorName.value.trim())
    renameDialogVisible.value = false
    ElMessage.success('楼层已重命名')
  }
}
</script>

<style scoped>
.floor-panel {
  position: absolute;
  left: 30px;  /* 20px ruler + 10px margin */
  bottom: 38px;  /* 28px status bar + 10px margin */
  width: 180px;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  z-index: 100;
}

.panel-header {
  padding: 10px 12px;
  font-weight: 600;
  font-size: 13px;
  border-bottom: 1px solid #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-actions {
  display: flex;
  gap: 4px;
}

.floor-list {
  max-height: 250px;
  overflow-y: auto;
}

.floor-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.floor-item:hover {
  background: #f5f5f5;
}

.floor-item.active {
  background: #ecf5ff;
  color: #409eff;
}

.floor-name {
  flex: 1;
  font-size: 13px;
  font-weight: 500;
}

.floor-actions {
  display: flex;
  gap: 2px;
  opacity: 0;
  transition: opacity 0.2s;
}

.floor-item:hover .floor-actions {
  opacity: 1;
}
</style>


