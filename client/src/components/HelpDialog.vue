<template>
  <el-dialog
    :model-value="visible"
    @update:model-value="$emit('update:visible', $event)"
    title="快捷键帮助"
    width="500px"
  >
    <div class="help-content">
      <div class="help-section">
        <h4>工具切换</h4>
        <div class="shortcut-list">
          <div class="shortcut-item">
            <span class="key">V</span>
            <span class="desc">选择工具</span>
          </div>
          <div class="shortcut-item">
            <span class="key">W</span>
            <span class="desc">墙体 / 线段工具</span>
          </div>
          <div class="shortcut-item">
            <span class="key">R</span>
            <span class="desc">房间 / 矩形工具</span>
          </div>
          <div class="shortcut-item">
            <span class="key">P</span>
            <span class="desc">多边形工具</span>
          </div>
          <div class="shortcut-item">
            <span class="key">M</span>
            <span class="desc">兴趣点标记工具</span>
          </div>
          <div class="shortcut-item">
            <span class="key">N</span>
            <span class="desc">导航路径工具</span>
          </div>
          <div class="shortcut-item">
            <span class="key">O</span>
            <span class="desc">导航节点工具</span>
          </div>
        </div>
      </div>

      <div class="help-section">
        <h4>绘制操作</h4>
        <div class="shortcut-list">
          <div class="shortcut-item">
            <span class="key">Enter</span>
            <span class="desc">完成绘制</span>
          </div>
          <div class="shortcut-item">
            <span class="key">Escape</span>
            <span class="desc">取消绘制 / 清除选择</span>
          </div>
          <div class="shortcut-item">
            <span class="key">Backspace</span>
            <span class="desc">删除最后一个点 / 删除选中</span>
          </div>
          <div class="shortcut-item">
            <span class="key">Delete</span>
            <span class="desc">删除选中元素</span>
          </div>
          <div class="shortcut-item">
            <span class="key">双击</span>
            <span class="desc">完成多边形/路径绘制</span>
          </div>
          <div class="shortcut-item">
            <span class="key">右键</span>
            <span class="desc">取消绘制</span>
          </div>
        </div>
      </div>

      <div class="help-section">
        <h4>编辑操作</h4>
        <div class="shortcut-list">
          <div class="shortcut-item">
            <span class="key">Ctrl + Z</span>
            <span class="desc">撤销</span>
          </div>
          <div class="shortcut-item">
            <span class="key">Ctrl + Shift + Z</span>
            <span class="desc">重做</span>
          </div>
        </div>
      </div>

      <div class="help-section">
        <h4>视图操作</h4>
        <div class="shortcut-list">
          <div class="shortcut-item">
            <span class="key">Ctrl + 滚轮</span>
            <span class="desc">缩放画布</span>
          </div>
          <div class="shortcut-item">
            <span class="key">滚轮</span>
            <span class="desc">平移画布</span>
          </div>
          <div class="shortcut-item">
            <span class="key">中键拖动</span>
            <span class="desc">平移画布</span>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <el-button type="primary" @click="$emit('update:visible', false)">
        知道了
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
defineProps<{
  visible: boolean
}>()

defineEmits(['update:visible'])
</script>

<style scoped>
.help-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.help-section h4 {
  margin: 0 0 10px 0;
  font-size: 14px;
  color: #333;
  border-bottom: 1px solid #e0e0e0;
  padding-bottom: 6px;
}

.shortcut-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.shortcut-item {
  display: flex;
  align-items: center;
  gap: 12px;
}

.key {
  display: inline-block;
  min-width: 100px;
  padding: 4px 10px;
  background: #f5f5f5;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
  color: #333;
  text-align: center;
}

.desc {
  font-size: 13px;
  color: #666;
}
</style>
