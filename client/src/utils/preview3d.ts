/**
 * 3D Preview Generator
 * Generates standalone HTML with Three.js 3D visualization
 */

// Template for 3D preview HTML
export function generate3DPreviewHTML(geojsonData: any): string {
  const geojsonStr = JSON.stringify(geojsonData, null, 2);

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>室内3D地图预览</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif;
      overflow: hidden;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    }
    #canvas-container { width: 100vw; height: 100vh; }
    #info-panel {
      position: absolute; top: 20px; left: 20px;
      background: rgba(255, 255, 255, 0.95);
      padding: 20px; border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
      max-width: 280px; backdrop-filter: blur(10px);
    }
    #info-panel h2 { color: #1a1a2e; margin-bottom: 15px; font-size: 1.3em; }
    .control-group { margin-bottom: 15px; }
    .control-group label { display: block; margin-bottom: 8px; color: #444; font-weight: 500; font-size: 0.9em; }
    .btn-group { display: flex; gap: 8px; flex-wrap: wrap; }
    .btn {
      padding: 8px 16px; border: none; border-radius: 8px;
      cursor: pointer; font-size: 0.85em; transition: all 0.2s ease; font-weight: 500;
    }
    .btn-primary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
    .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4); }
    .btn-secondary { background: #f0f0f0; color: #333; }
    .btn-secondary:hover { background: #e0e0e0; }
    .btn-secondary.active { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; }
    #room-info {
      padding: 12px; background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
      border-radius: 10px; font-size: 0.9em; color: #555; min-height: 60px;
    }
    #room-info strong { color: #1a1a2e; }
    .legend { margin-top: 15px; padding-top: 15px; border-top: 1px solid #eee; }
    .legend-item { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; font-size: 0.85em; color: #666; }
    .legend-color { width: 20px; height: 20px; border-radius: 4px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); }
    #loading {
      position: fixed; top: 0; left: 0; width: 100%; height: 100%;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      display: flex; justify-content: center; align-items: center;
      z-index: 1000; flex-direction: column; gap: 20px;
    }
    .spinner { width: 50px; height: 50px; border: 4px solid rgba(255, 255, 255, 0.2); border-top-color: #667eea; border-radius: 50%; animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    #loading-text { color: white; font-size: 1.1em; }
    .tooltip { position: absolute; background: rgba(26, 26, 46, 0.95); color: white; padding: 10px 15px; border-radius: 8px; font-size: 0.9em; pointer-events: none; opacity: 0; transition: opacity 0.2s; z-index: 100; }
    .tooltip.visible { opacity: 1; }
    #controls-hint { position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); background: rgba(255, 255, 255, 0.9); padding: 10px 20px; border-radius: 20px; font-size: 0.85em; color: #666; }
  </style>
</head>
<body>
  <div id="loading"><div class="spinner"></div><div id="loading-text">加载3D室内地图...</div></div>
  <div id="canvas-container"></div>
  <div id="info-panel">
    <h2>🏠 室内3D地图</h2>
    <div class="control-group">
      <label>视角控制</label>
      <div class="btn-group">
        <button class="btn btn-primary" onclick="resetCamera()">重置视角</button>
        <button class="btn btn-secondary" onclick="setTopView()">俯视图</button>
      </div>
    </div>
    <div class="control-group">
      <label>显示选项</label>
      <div class="btn-group">
        <button class="btn btn-secondary active" id="btn-walls" onclick="toggleWalls()">墙壁</button>
        <button class="btn btn-secondary active" id="btn-nav" onclick="toggleNavPath()">导航路径</button>
        <button class="btn btn-secondary active" id="btn-labels" onclick="toggleLabels()">标签</button>
      </div>
    </div>
    <div class="control-group">
      <label>房间信息</label>
      <div id="room-info">将鼠标悬停在房间上查看详情</div>
    </div>
    <div class="legend">
      <div class="legend-item"><div class="legend-color" style="background: #E8F4F8; border: 1px solid #666;"></div><span>房间区域</span></div>
      <div class="legend-item"><div class="legend-color" style="background: #333;"></div><span>墙壁</span></div>
      <div class="legend-item"><div class="legend-color" style="background: #DEB887;"></div><span>门</span></div>
      <div class="legend-item"><div class="legend-color" style="background: #87CEEB;"></div><span>窗户</span></div>
      <div class="legend-item"><div class="legend-color" style="background: #4CAF50;"></div><span>导航路径</span></div>
    </div>
  </div>
  <div class="tooltip" id="tooltip"></div>
  <div id="controls-hint">🖱️ 左键拖动旋转 | 滚轮缩放 | 右键拖动平移</div>

  <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js"></script>
  <script>
    const geoJsonData = ${geojsonStr};

    let scene, camera, renderer, controls;
    let wallsGroup, navPathGroup, labelsGroup;
    let roomMeshes = [];
    const scale = 0.01;
    const wallHeight = 2.5;
    const floorY = 0;

    const colors = {
      floor: 0xE8F4F8, wall: 0x555555, wallTop: 0x666666,
      door: 0xDEB887, doorFrame: 0x8B4513,
      window: 0x87CEEB, windowFrame: 0x4169E1,
      navPath: 0x4CAF50, navPoint: 0x2196F3,
      ambient: 0xffffff, directional: 0xffffff, ground: 0x2d2d3a
    };

    const roomColors = { '主卧': 0xFFE4E1, '次卧': 0xE0FFFF, '儿童房': 0xFFF8DC, '厨房': 0xF0FFF0, '客厅': 0xFFF0F5 };

    function init() {
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0x1a1a2e);
      scene.fog = new THREE.Fog(0x1a1a2e, 20, 50);

      camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
      camera.position.set(8, 10, 12);
      camera.lookAt(5, 0, 2);

      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      document.getElementById('canvas-container').appendChild(renderer.domElement);

      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.maxPolarAngle = Math.PI / 2.1;
      controls.minDistance = 3;
      controls.maxDistance = 30;
      controls.target.set(5, 0, 2);

      setupLights();

      wallsGroup = new THREE.Group();
      navPathGroup = new THREE.Group();
      labelsGroup = new THREE.Group();
      scene.add(wallsGroup);
      scene.add(navPathGroup);
      scene.add(labelsGroup);

      createGround();
      parseGeoJSON();

      window.addEventListener('resize', onWindowResize);
      renderer.domElement.addEventListener('mousemove', onMouseMove);

      setTimeout(() => { document.getElementById('loading').style.display = 'none'; }, 500);
      animate();
    }

    function setupLights() {
      scene.add(new THREE.AmbientLight(colors.ambient, 0.4));
      const dirLight = new THREE.DirectionalLight(colors.directional, 0.8);
      dirLight.position.set(10, 20, 10);
      dirLight.castShadow = true;
      dirLight.shadow.mapSize.width = 2048;
      dirLight.shadow.mapSize.height = 2048;
      scene.add(dirLight);
      const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
      fillLight.position.set(-5, 10, -5);
      scene.add(fillLight);
      scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 0.3));
    }

    function createGround() {
      const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(100, 100),
        new THREE.MeshStandardMaterial({ color: colors.ground, roughness: 0.9 })
      );
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -0.01;
      ground.receiveShadow = true;
      scene.add(ground);
      const grid = new THREE.GridHelper(50, 50, 0x444466, 0x333355);
      grid.position.y = -0.005;
      scene.add(grid);
    }

    function parseGeoJSON() {
      (geoJsonData.features || []).forEach(feature => {
        const props = feature.properties || {};
        const geom = feature.geometry;
        const type = props.type || props._designer_type;
        switch (type) {
          case 'room': case 'corridor': case 'hall':
            if (geom.type === 'Polygon') createRoom(geom.coordinates[0], props);
            break;
          case 'wall':
            if (geom.type === 'LineString') createWall(geom.coordinates, props.thickness || 6);
            break;
          case 'door':
            createDoor(geom.coordinates, props);
            break;
          case 'window':
            createWindow(geom.coordinates, props);
            break;
          case 'edge': case 'navpath':
            if (geom.type === 'LineString') createNavPath(geom.coordinates);
            break;
          case 'point': case 'navnode':
            createNavPoint(geom.coordinates);
            break;
          case 'text':
            createLabel(geom.coordinates, props.text);
            break;
        }
      });
    }

    function createRoom(coords, props) {
      const shape = new THREE.Shape();
      coords.forEach((c, i) => { i === 0 ? shape.moveTo(c[0] * scale, c[1] * scale) : shape.lineTo(c[0] * scale, c[1] * scale); });
      const floorGeom = new THREE.ShapeGeometry(shape);
      const color = roomColors[props.name] || colors.floor;
      const floor = new THREE.Mesh(floorGeom, new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0.1, side: THREE.DoubleSide }));
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = floorY + 0.01;
      floor.receiveShadow = true;
      floor.userData = { type: 'room', name: props.name || '房间', area: props.area ? (props.area / 10000).toFixed(1) : '未知' };
      roomMeshes.push(floor);
      scene.add(floor);
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(floorGeom), new THREE.LineBasicMaterial({ color: 0x666666 }));
      edges.rotation.x = -Math.PI / 2;
      edges.position.y = floorY + 0.02;
      scene.add(edges);
      
      // Create walls around room perimeter
      const roomWallThickness = 0.06;
      for (let i = 0; i < coords.length - 1; i++) {
        const [x1, z1] = [coords[i][0] * scale, coords[i][1] * scale];
        const [x2, z2] = [coords[i+1][0] * scale, coords[i+1][1] * scale];
        const len = Math.sqrt((x2-x1)**2 + (z2-z1)**2);
        if (len < 0.01) continue; // Skip very short segments
        const angle = Math.atan2(z2-z1, x2-x1);
        const wall = new THREE.Mesh(
          new THREE.BoxGeometry(len, wallHeight, roomWallThickness),
          new THREE.MeshStandardMaterial({ color: colors.wall, roughness: 0.7, metalness: 0.1 })
        );
        wall.position.set((x1+x2)/2, wallHeight/2, (z1+z2)/2);
        wall.rotation.y = -angle;
        wall.castShadow = true;
        wall.receiveShadow = true;
        wallsGroup.add(wall);
      }
    }

    function createWall(coords, thickness) {
      const t = thickness * scale * 0.8;
      for (let i = 0; i < coords.length - 1; i++) {
        const [x1, z1] = [coords[i][0] * scale, coords[i][1] * scale];
        const [x2, z2] = [coords[i+1][0] * scale, coords[i+1][1] * scale];
        const len = Math.sqrt((x2-x1)**2 + (z2-z1)**2);
        const angle = Math.atan2(z2-z1, x2-x1);
        const wall = new THREE.Mesh(new THREE.BoxGeometry(len, wallHeight, t), new THREE.MeshStandardMaterial({ color: colors.wall, roughness: 0.7 }));
        wall.position.set((x1+x2)/2, wallHeight/2, (z1+z2)/2);
        wall.rotation.y = -angle;
        wall.castShadow = true;
        wall.receiveShadow = true;
        wallsGroup.add(wall);
        const top = new THREE.Mesh(new THREE.BoxGeometry(len+0.02, 0.05, t+0.02), new THREE.MeshStandardMaterial({ color: colors.wallTop, roughness: 0.5 }));
        top.position.set((x1+x2)/2, wallHeight, (z1+z2)/2);
        top.rotation.y = -angle;
        wallsGroup.add(top);
      }
    }

    function createDoor(coords, props) {
      const x = coords[0] * scale, z = coords[1] * scale;
      const w = (props.width || 90) * scale, h = 2.1, d = 0.08;
      const rot = (props.rotation || 0) * Math.PI / 180;
      const frame = new THREE.Mesh(new THREE.BoxGeometry(w+0.1, h+0.1, d+0.04), new THREE.MeshStandardMaterial({ color: colors.doorFrame, roughness: 0.6 }));
      frame.position.set(x, h/2, z);
      frame.rotation.y = rot;
      frame.castShadow = true;
      wallsGroup.add(frame);
      const door = new THREE.Mesh(new THREE.BoxGeometry(w-0.05, h-0.1, d), new THREE.MeshStandardMaterial({ color: colors.door, roughness: 0.5 }));
      door.position.set(x, h/2, z);
      door.rotation.y = rot;
      wallsGroup.add(door);
    }

    function createWindow(coords, props) {
      const x = coords[0] * scale, z = coords[1] * scale;
      const w = (props.width || 100) * scale, h = 1.2, d = 0.06;
      const rot = (props.rotation || 0) * Math.PI / 180;
      const windowY = 1.0;
      const frame = new THREE.Mesh(new THREE.BoxGeometry(w+0.1, h+0.1, d+0.04), new THREE.MeshStandardMaterial({ color: colors.windowFrame, roughness: 0.4 }));
      frame.position.set(x, windowY+h/2, z);
      frame.rotation.y = rot;
      wallsGroup.add(frame);
      const glass = new THREE.Mesh(new THREE.BoxGeometry(w-0.1, h-0.1, d*0.5), new THREE.MeshStandardMaterial({ color: colors.window, transparent: true, opacity: 0.4 }));
      glass.position.set(x, windowY+h/2, z);
      glass.rotation.y = rot;
      wallsGroup.add(glass);
    }

    function createNavPath(coords) {
      const pts = coords.map(c => new THREE.Vector3(c[0]*scale, 0.05, c[1]*scale));
      if (pts.length < 2) return;
      const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.1);
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 50, 0.03, 8, false), new THREE.MeshStandardMaterial({ color: colors.navPath, emissive: colors.navPath, emissiveIntensity: 0.3 }));
      navPathGroup.add(tube);
    }

    function createNavPoint(coords) {
      const x = coords[0] * scale, z = coords[1] * scale;
      const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.08, 32, 32), new THREE.MeshStandardMaterial({ color: colors.navPoint, emissive: colors.navPoint, emissiveIntensity: 0.4 }));
      sphere.position.set(x, 0.1, z);
      navPathGroup.add(sphere);
    }

    function createLabel(coords, text) {
      const x = coords[0] * scale, z = coords[1] * scale;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 256; canvas.height = 64;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.fillRect(0, 0, 256, 64);
      ctx.font = 'bold 28px Microsoft YaHei, Arial';
      ctx.fillStyle = '#333333';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text || '', 128, 32);
      const tex = new THREE.CanvasTexture(canvas);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true }));
      sprite.position.set(x, 0.5, z);
      sprite.scale.set(1.5, 0.4, 1);
      labelsGroup.add(sprite);
    }

    function onWindowResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const tooltip = document.getElementById('tooltip');

    function onMouseMove(e) {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(roomMeshes);
      if (intersects.length > 0) {
        const info = intersects[0].object.userData;
        document.getElementById('room-info').innerHTML = '<strong>' + info.name + '</strong><br>面积: ' + info.area + ' m²';
        tooltip.textContent = info.name;
        tooltip.style.left = e.clientX + 15 + 'px';
        tooltip.style.top = e.clientY + 15 + 'px';
        tooltip.classList.add('visible');
        document.body.style.cursor = 'pointer';
      } else {
        tooltip.classList.remove('visible');
        document.body.style.cursor = 'default';
      }
    }

    function animate() {
      requestAnimationFrame(animate);
      controls.update();
      labelsGroup.children.forEach(s => s.lookAt(camera.position));
      renderer.render(scene, camera);
    }

    function resetCamera() { camera.position.set(8, 10, 12); controls.target.set(5, 0, 2); controls.update(); }
    function setTopView() { camera.position.set(5, 15, 2); controls.target.set(5, 0, 2); controls.update(); }
    function toggleWalls() { wallsGroup.visible = !wallsGroup.visible; document.getElementById('btn-walls').classList.toggle('active'); }
    function toggleNavPath() { navPathGroup.visible = !navPathGroup.visible; document.getElementById('btn-nav').classList.toggle('active'); }
    function toggleLabels() { labelsGroup.visible = !labelsGroup.visible; document.getElementById('btn-labels').classList.toggle('active'); }

    init();
  </script>
</body>
</html>`;
}

/**
 * Open 3D preview in new window
 */
export function open3DPreview(geojsonData: any): void {
  const htmlContent = generate3DPreviewHTML(geojsonData);
  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'width=1280,height=800,menubar=no,toolbar=no');
}
