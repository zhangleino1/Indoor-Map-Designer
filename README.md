# Indoor Map Designer

一个基于 Web 的室内地图设计器，用于创建楼层平面图并导出 GeoJSON 格式，支持室内导航和定位应用。

## 关注我获得更多室内定位技术
![程序员石磊](https://github.com/zhangleino1/Indoor-Map-Designer/blob/main/%E6%89%AB%E7%A0%81_%E6%90%9C%E7%B4%A2%E8%81%94%E5%90%88%E4%BC%A0%E6%92%AD%E6%A0%B7%E5%BC%8F-%E6%A0%87%E5%87%86%E8%89%B2%E7%89%88.png)

## ✨ 核心特性

### 🎨 绘图工具
- **墙体/线段**：多点绘制，支持 T 型、L 型等复杂墙体
- **房间/矩形**：拖拽绘制矩形房间
- **多边形**：自由多边形绘制
- **门窗**：可调节宽度和旋转角度
- **兴趣点（POI）**：电梯、楼梯、洗手间、出入口等多种类型
- **文本标签**：为房间添加文字注释，支持字体、颜色、旋转等样式
- **导航路径**：绘制导航路线
- **导航节点**：标记导航关键点

### 🎯 高级编辑功能
- **控制点编辑**：选中元素后可拖动控制点调整形状
  - 拖动控制点实时调整墙体、路径形状
  - 点击控制点 + Delete 删除该点
  - 选中元素 + Backspace 快速删除最后一个点
  - 自动吸附网格和端点
- **多段连续绘图**：无需退出工具即可绘制多个分离的图形段
- **精确尺寸**：实时显示长度、面积等尺寸信息
- **多楼层支持**：管理多个楼层，独立编辑

### 🧭 导航网络
- **自动节点关联**：导航路径自动关联起止节点
- **双向路径支持**：支持单向/双向导航路径
- **Python 格式兼容**：导出符合 Python 导航库标准的 GeoJSON
- **显式边格式（v2.0）**：直接导出路径-节点关联关系

### 📤 导出功能
- **GeoJSON**：支持导出所有元素类型（墙体、房间、门窗、POI、文本、导航网络）
- **PNG 图片**：支持 1x/2x/4x 高清导出
- **SVG 矢量图**：可缩放矢量图形导出
- **3D 预览**：基于 Three.js 的 3D 模型预览

### ⚙️ 精确工具
- **网格吸附**：对齐到网格
- **端点吸附**：吸附到其他元素端点
- **中点吸附**：吸附到线段中点
- **角度吸附**：固定角度（0°/45°/90°）绘制

### 📋 历史管理
- **完整撤销/重做**：支持所有操作的撤销重做
- **批量操作**：支持多选删除、移动等
- **智能历史**：自动合并批量操作

## 🛠 技术栈

- **前端框架**: Vue 3 + TypeScript
- **状态管理**: Pinia
- **UI 库**: Element Plus
- **图形渲染**: HTML5 Canvas + SVG
- **3D 渲染**: Three.js
- **后端**: Node.js + Express
- **构建工具**: Vite

## 🎬 应用场景

- **室内导航系统**：商场、医院、机场等大型建筑的导航
- **视觉定位**：配合视觉 SLAM 系统进行室内定位
- **机器人路径规划**：室内服务机器人的路径规划
- **应急疏散**：建筑物应急疏散路线设计
- **空间分析**：室内空间利用率分析

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

```bash
# Install all dependencies
npm run install:all

# Or install separately
cd client && npm install
cd ../server && npm install
```

### Development

```bash
# Run both client and server
npm run dev

# Or run separately
npm run dev:client  # Frontend on http://localhost:3000
npm run dev:server  # Backend on http://localhost:3001
```

### Build

```bash
npm run build
```

## Usage

### Keyboard Shortcuts

#### Tool Selection

| Key | Tool |
|-----|------|
| `V` | Select tool |
| `W` | Wall/Line tool |
| `Shift+W` | Window tool |
| `D` | Door tool |
| `R` | Room/Rectangle tool |
| `P` | Polygon tool |
| `M` | POI marker tool |
| `T` | Text/Label tool |
| `O` | Navigation node tool |
| `N` | Navigation path tool |

#### Drawing Mode (When Using Multi-point Tools)

**Multi-point tools**: Wall, NavPath, Polygon

| Key/Action | Effect |
|------------|--------|
| **Left Click** | Add point to current segment |
| **Double Click** | Finish current segment, stay in tool (can draw next segment) |
| **Right Click** | Finish current segment, stay in tool |
| **Enter** | Finish current segment, stay in tool |
| **Ctrl+Z** | Remove last point from current drawing |
| **Backspace** | Remove last point from current drawing |
| **Escape** | Cancel drawing and exit tool (switch to Select) |

**💡 Tip**: You can now draw multiple disconnected segments without exiting the tool!
- Example: Draw T-shaped wall → horizontal segment (double-click) → vertical segment (double-click) → Escape

#### Global Shortcuts

| Key | Action |
|-----|--------|
| **Ctrl+Z** | Undo (or remove last point when drawing) |
| **Ctrl+Shift+Z** | Redo |
| **Delete** | Delete selected elements |
| **Backspace** | Delete selected elements (or remove last point when drawing) |
| **Escape** | Cancel drawing / Clear selection / Exit tool |
| **Space** | Hold to enable pan mode (drag with mouse) |

### Mouse Controls

| Action | Effect |
|--------|--------|
| **Left Click** | Draw point / Select element |
| **Left Drag** | Draw rectangle (Room/Corridor/Hall) / Move selected element |
| **Double Click** | Finish current segment (multi-point tools) |
| **Right Click** | Finish current segment (when drawing) |
| **Ctrl + Scroll** | Zoom in/out |
| **Scroll** | Pan canvas vertically |
| **Shift + Scroll** | Pan canvas horizontally |
| **Middle Button Drag** | Pan canvas |
| **Space + Left Drag** | Pan canvas |

### Drawing Workflow Examples

#### Example 1: T-Shaped Wall
```
1. Press W (wall tool)
2. Click point 1 → point 2 → double-click (horizontal wall complete)
3. Click point 3 → point 4 → double-click (vertical wall complete, no connection!)
4. Press Escape (exit tool)
```

#### Example 2: Multiple Rooms
```
1. Press R (room tool)
2. Drag first room → release
3. Drag second room → release
4. Drag third room → release
...
n. Press Escape when done
```

#### Example 3: Complex Navigation Path
```
1. Press N (navpath tool)
2. Click points for route A → double-click (route A complete)
3. Click points for route B → double-click (route B complete)
4. Click points for route C → double-click (route C complete)
5. Press Escape (exit tool)
```

#### Example 4: Fix Wrong Point While Drawing
```
1. Drawing wall: point 1 → point 2 → point 3
2. Oops! Point 3 is wrong
3. Press Ctrl+Z (point 3 removed)
4. Click correct point 3 → continue drawing
5. Double-click to finish
```

## GeoJSON Output Format

```json
{
  "type": "FeatureCollection",
  "properties": {
    "name": "Building Name",
    "scale": 1,
    "unit": "cm"
  },
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Polygon",
        "coordinates": [[[0,0], [500,0], [500,400], [0,400], [0,0]]]
      },
      "properties": {
        "id": "room-001",
        "type": "room",
        "floor": 1,
        "name": "Living Room",
        "area": 200000
      }
    }
  ]
}
```

## Project Structure

```
indoor-map-designer/
├── client/                 # Vue 3 frontend
│   ├── src/
│   │   ├── components/     # Vue components
│   │   ├── stores/         # Pinia stores
│   │   ├── types/          # TypeScript types
│   │   └── utils/          # Utility functions
│   └── package.json
├── server/                 # Node.js backend
│   ├── src/
│   │   ├── routes/         # API routes
│   │   └── index.ts        # Entry point
│   └── package.json
└── package.json            # Root package.json
```

## License

MIT
