const VEHICLE_VIEWPORT_WIDTH = 220;
const VEHICLE_VIEWPORT_HEIGHT = 260;

const TractorVehicle2D = ({ mode, steeringAngle, implementWidth, vehicleSettings }) => {
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const cx = VEHICLE_VIEWPORT_WIDTH / 2;
  const frontY = 78;
  const rearY = 150;
  const hitchY = 188;
  const implementY = 205;
  const rearTrack = clamp((vehicleSettings?.rearAxleWidth || 2.65) * 42, 96, 118);
  const frontTrack = clamp((vehicleSettings?.frontAxleWidth || 1.95) * 40, 72, 94);
  const implementVisualWidth = clamp((implementWidth || 3) * 48, 126, 194);
  const bodyColor = mode === 'AUTO' ? '#22c55e' : '#2563eb';
  const bodyDark = mode === 'AUTO' ? '#15803d' : '#1d4ed8';
  const bodyLight = mode === 'AUTO' ? '#86efac' : '#60a5fa';

  const Tire = ({ x, y, width, height, steer = false, hub = 6 }) => (
    <g transform={steer ? `rotate(${steeringAngle}, ${x}, ${y})` : undefined}>
      <rect x={x - width / 2} y={y - height / 2} width={width} height={height} rx={width * 0.36} fill="#0f172a" stroke="#020617" strokeWidth="2" />
      {Array.from({ length: 7 }).map((_, i) => {
        const yy = y - height / 2 + 7 + i * ((height - 14) / 6);
        return <line key={i} x1={x - width / 2 + 3} y1={yy + 5} x2={x + width / 2 - 3} y2={yy - 5} stroke="#64748b" strokeWidth="2" opacity="0.55" />;
      })}
      <circle cx={x} cy={y} r={hub} fill="#facc15" stroke="#ca8a04" strokeWidth="2" />
      <circle cx={x} cy={y} r={hub * 0.42} fill="#475569" />
    </g>
  );

  return (
    <svg data-vehicle-view="2d" width={VEHICLE_VIEWPORT_WIDTH} height={VEHICLE_VIEWPORT_HEIGHT} viewBox={`0 0 ${VEHICLE_VIEWPORT_WIDTH} ${VEHICLE_VIEWPORT_HEIGHT}`} className="drop-shadow-2xl filter overflow-visible">
      <defs>
        <linearGradient id="tractor2d-body" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={bodyLight} />
          <stop offset="0.45" stopColor={bodyColor} />
          <stop offset="1" stopColor={bodyDark} />
        </linearGradient>
        <linearGradient id="tractor2d-glass" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#e0f2fe" stopOpacity="0.88" />
          <stop offset="1" stopColor="#38bdf8" stopOpacity="0.62" />
        </linearGradient>
      </defs>

      <ellipse cx={cx} cy="141" rx="62" ry="94" fill="#0f172a" opacity="0.12" />

      <path d={`M${cx - 6} ${rearY + 18} L${cx + 6} ${rearY + 18} L${cx + 4} ${hitchY} L${cx - 4} ${hitchY} Z`} fill="#475569" />
      <rect x={cx - implementVisualWidth / 2} y={implementY} width={implementVisualWidth} height="10" rx="2" fill="#f59e0b" stroke="#b45309" strokeWidth="2" />
      {Array.from({ length: 11 }).map((_, i) => {
        const x = cx - implementVisualWidth / 2 + (implementVisualWidth / 10) * i;
        return <line key={i} x1={x} y1={implementY + 2} x2={x} y2={implementY + 15} stroke="#78350f" strokeWidth="2" opacity="0.75" />;
      })}

      <rect x={cx - rearTrack / 2} y={rearY - 4} width={rearTrack} height="8" rx="4" fill="#334155" />
      <rect x={cx - frontTrack / 2} y={frontY - 3} width={frontTrack} height="6" rx="3" fill="#334155" />

      <Tire x={cx - rearTrack / 2} y={rearY} width={24} height={66} hub={7} />
      <Tire x={cx + rearTrack / 2} y={rearY} width={24} height={66} hub={7} />
      <Tire x={cx - frontTrack / 2} y={frontY} width={18} height={46} steer hub={5} />
      <Tire x={cx + frontTrack / 2} y={frontY} width={18} height={46} steer hub={5} />

      <path d={`M${cx - 25} 57 L${cx + 25} 57 L${cx + 31} 122 L${cx - 31} 122 Z`} fill="url(#tractor2d-body)" stroke={bodyDark} strokeWidth="3" strokeLinejoin="round" />
      <path d={`M${cx - 34} 118 L${cx + 34} 118 L${cx + 29} 176 L${cx - 29} 176 Z`} fill="url(#tractor2d-body)" stroke={bodyDark} strokeWidth="3" strokeLinejoin="round" />
      <rect x={cx - 23} y="104" width="46" height="44" rx="7" fill="url(#tractor2d-glass)" stroke={bodyDark} strokeWidth="3" />
      <rect x={cx - 18} y="66" width="36" height="42" rx="4" fill={bodyColor} stroke={bodyDark} strokeWidth="2" />
      <rect x={cx - 20} y="51" width="40" height="9" rx="2" fill="#111827" />
      <rect x={cx - 14} y="155" width="28" height="25" rx="4" fill="#1e293b" opacity="0.55" />

      <path d={`M${cx - 47} 120 Q${cx - 48} 147 ${cx - 37} 171 L${cx - 29} 168 L${cx - 30} 126 Z`} fill={bodyColor} stroke={bodyDark} strokeWidth="3" />
      <path d={`M${cx + 47} 120 Q${cx + 48} 147 ${cx + 37} 171 L${cx + 29} 168 L${cx + 30} 126 Z`} fill={bodyColor} stroke={bodyDark} strokeWidth="3" />
      <line x1={cx} y1="58" x2={cx} y2="177" stroke="#93c5fd" strokeWidth="2" opacity="0.45" />

      <path d={`M${cx} 23 L${cx + 14} 45 L${cx} 40 L${cx - 14} 45 Z`} fill="#ef4444" stroke="#991b1b" strokeWidth="2" />
    </svg>
  );
};

const TractorVehicle3DStyled = ({ mode, steeringAngle, implementWidth, vehicleSettings }) => {
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const cx = VEHICLE_VIEWPORT_WIDTH / 2;
  const bodyColor = mode === 'AUTO' ? '#22c55e' : '#2563eb';
  const bodyDark = mode === 'AUTO' ? '#15803d' : '#1d4ed8';
  const bodyLight = mode === 'AUTO' ? '#bbf7d0' : '#93c5fd';
  const rearTrack = clamp((vehicleSettings?.rearAxleWidth || 2.65) * 40, 96, 118);
  const frontTrack = clamp((vehicleSettings?.frontAxleWidth || 1.95) * 38, 72, 92);
  const implementVisualWidth = clamp((implementWidth || 3) * 48, 126, 194);

  const Tire3D = ({ x, y, width, height, steer = false, hub = 7, rear = false }) => (
    <g transform={steer ? `rotate(${steeringAngle}, ${x}, ${y})` : undefined}>
      <ellipse cx={x} cy={y + height * 0.08} rx={width * 0.75} ry={height * 0.54} fill="#020617" opacity="0.2" />
      <rect x={x - width / 2} y={y - height / 2} width={width} height={height} rx={width * 0.42} fill="url(#tractor3d-tire)" stroke="#020617" strokeWidth="2" />
      {Array.from({ length: rear ? 8 : 6 }).map((_, i) => {
        const yy = y - height / 2 + 8 + i * ((height - 16) / ((rear ? 8 : 6) - 1));
        return <line key={i} x1={x - width / 2 + 4} y1={yy + 6} x2={x + width / 2 - 4} y2={yy - 6} stroke="#64748b" strokeWidth="2.2" opacity="0.52" />;
      })}
      <ellipse cx={x} cy={y} rx={hub * 0.95} ry={hub * 1.18} fill="#facc15" stroke="#ca8a04" strokeWidth="2" />
      <ellipse cx={x} cy={y} rx={hub * 0.38} ry={hub * 0.46} fill="#475569" />
    </g>
  );

  return (
    <svg data-vehicle-view="3d" width={VEHICLE_VIEWPORT_WIDTH} height={VEHICLE_VIEWPORT_HEIGHT} viewBox={`0 0 ${VEHICLE_VIEWPORT_WIDTH} ${VEHICLE_VIEWPORT_HEIGHT}`} className="drop-shadow-2xl filter overflow-visible">
      <defs>
        <linearGradient id="tractor3d-body" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor={bodyLight} />
          <stop offset="0.4" stopColor={bodyColor} />
          <stop offset="1" stopColor={bodyDark} />
        </linearGradient>
        <linearGradient id="tractor3d-glass" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#eff6ff" stopOpacity="0.9" />
          <stop offset="1" stopColor="#38bdf8" stopOpacity="0.68" />
        </linearGradient>
        <linearGradient id="tractor3d-tire" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#334155" />
          <stop offset="0.22" stopColor="#0f172a" />
          <stop offset="0.78" stopColor="#111827" />
          <stop offset="1" stopColor="#475569" />
        </linearGradient>
      </defs>

      <ellipse cx={cx} cy="152" rx="68" ry="84" fill="#0f172a" opacity="0.14" />
      <path d={`M${cx - 7} 174 L${cx + 7} 174 L${cx + 4} 205 L${cx - 4} 205 Z`} fill="#475569" />
      <circle cx={cx} cy="212" r="4" fill="#f59e0b" stroke="#b45309" strokeWidth="2" />
      <rect x={cx - implementVisualWidth / 2} y="222" width={implementVisualWidth} height="10" rx="2" fill="#f59e0b" stroke="#b45309" strokeWidth="2" />
      {Array.from({ length: 11 }).map((_, i) => {
        const x = cx - implementVisualWidth / 2 + (implementVisualWidth / 10) * i;
        return <line key={i} x1={x} y1="224" x2={x} y2="237" stroke="#78350f" strokeWidth="2" opacity="0.75" />;
      })}

      <rect x={cx - rearTrack / 2} y="147" width={rearTrack} height="10" rx="5" fill="#334155" />
      <rect x={cx - frontTrack / 2} y="88" width={frontTrack} height="7" rx="4" fill="#334155" />

      <Tire3D x={cx - rearTrack / 2} y={155} width={28} height={76} hub={8} rear />
      <Tire3D x={cx + rearTrack / 2} y={155} width={28} height={76} hub={8} rear />
      <Tire3D x={cx - frontTrack / 2} y={89} width={19} height={50} hub={5} steer />
      <Tire3D x={cx + frontTrack / 2} y={89} width={19} height={50} hub={5} steer />

      <path d={`M${cx - 29} 59 L${cx + 29} 59 L${cx + 39} 117 L${cx - 39} 117 Z`} fill="url(#tractor3d-body)" stroke={bodyDark} strokeWidth="3" strokeLinejoin="round" />
      <path d={`M${cx - 42} 112 L${cx + 42} 112 L${cx + 31} 181 L${cx - 31} 181 Z`} fill="url(#tractor3d-body)" stroke={bodyDark} strokeWidth="3" strokeLinejoin="round" />
      <path d={`M${cx - 51} 124 Q${cx - 55} 150 ${cx - 39} 180 L${cx - 29} 174 L${cx - 33} 120 Z`} fill={bodyColor} stroke={bodyDark} strokeWidth="3" />
      <path d={`M${cx + 51} 124 Q${cx + 55} 150 ${cx + 39} 180 L${cx + 29} 174 L${cx + 33} 120 Z`} fill={bodyColor} stroke={bodyDark} strokeWidth="3" />

      <rect x={cx - 26} y="103" width="52" height="50" rx="8" fill="url(#tractor3d-glass)" stroke={bodyDark} strokeWidth="3" />
      <path d={`M${cx - 38} 88 L${cx + 38} 88 L${cx + 30} 107 L${cx - 30} 107 Z`} fill={bodyDark} stroke="#0f172a" strokeWidth="2" />
      <path d={`M${cx - 23} 66 L${cx + 23} 66 L${cx + 18} 102 L${cx - 18} 102 Z`} fill={bodyColor} stroke={bodyDark} strokeWidth="2" />
      <line x1={cx} y1="64" x2={cx} y2="179" stroke="#bfdbfe" strokeWidth="2" opacity="0.5" />
      <path d={`M${cx - 18} 153 L${cx + 18} 153 L${cx + 13} 182 L${cx - 13} 182 Z`} fill="#1e293b" opacity="0.52" />
      <path d={`M${cx} 30 L${cx + 13} 51 L${cx} 46 L${cx - 13} 51 Z`} fill="#ef4444" stroke="#991b1b" strokeWidth="2" />
    </svg>
  );
};

const TractorVehicle3DPrimitive = ({ mode, steeringAngle, implementWidth, vehicleSettings }) => {
  const mountRef = React.useRef(null);
  const sceneRef = React.useRef(null);

  React.useEffect(() => {
    const THREE = window.THREE;
    const mount = mountRef.current;
    if (!THREE || !mount) return undefined;

    const width = 220;
    const height = 260;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(32, width / height, 0.1, 100);
    camera.position.set(0, -7.4, 3.75);
    camera.lookAt(0, -0.45, 0.86);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    if (THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x94a3b8, 2.2));
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.1);
    keyLight.position.set(-4.5, -5.5, 8.5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 30;
    keyLight.shadow.camera.left = -6;
    keyLight.shadow.camera.right = 6;
    keyLight.shadow.camera.top = 6;
    keyLight.shadow.camera.bottom = -6;
    scene.add(keyLight);

    const group = new THREE.Group();
    scene.add(group);

    const makeMaterial = (color, extra = {}) => new THREE.MeshStandardMaterial({
      color,
      roughness: 0.5,
      metalness: 0.08,
      ...extra
    });

    const blue = makeMaterial(0x2563eb, { roughness: 0.36 });
    const green = makeMaterial(0x22c55e, { roughness: 0.36 });
    const dark = makeMaterial(0x0f172a, { roughness: 0.82 });
    const yellow = makeMaterial(0xfacc15, { roughness: 0.42 });
    const glass = makeMaterial(0xb7d8ff, { roughness: 0.12, metalness: 0.02, transparent: true, opacity: 0.72 });
    const metal = makeMaterial(0x64748b, { roughness: 0.45, metalness: 0.35 });
    const blackMetal = makeMaterial(0x1e293b, { roughness: 0.58, metalness: 0.22 });
    const implementMat = makeMaterial(0xf59e0b, { roughness: 0.48, metalness: 0.12 });
    const bodyMaterial = mode === 'AUTO' ? green : blue;
    const bodyMeshes = [];

    const addOutline = (mesh, color = 0x0f172a) => {
      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(mesh.geometry, 35),
        new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.28 })
      );
      edges.position.copy(mesh.position);
      edges.rotation.copy(mesh.rotation);
      edges.scale.copy(mesh.scale);
      mesh.parent.add(edges);
      return edges;
    };

    const makeBox = (name, size, position, material, options = {}) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), material);
      mesh.name = name;
      mesh.position.set(position.x, position.y, position.z);
      if (options.rotation) mesh.rotation.set(options.rotation.x || 0, options.rotation.y || 0, options.rotation.z || 0);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
      if (options.body) bodyMeshes.push(mesh);
      if (options.outline !== false) addOutline(mesh);
      return mesh;
    };

    const wheelbase = vehicleSettings?.wheelbase || 2.5;
    const frontTrack = vehicleSettings?.frontAxleWidth || 1.95;
    const rearTrack = vehicleSettings?.rearAxleWidth || 2.65;
    const bodyLength = Math.max(3.1, wheelbase + 0.85);
    const implementVisualWidth = Math.max(2.2, implementWidth || 3);

    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(2.55, 48),
      new THREE.ShadowMaterial({ opacity: 0.28 })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(0, 0.25, 0.015);
    shadow.receiveShadow = true;
    group.add(shadow);

    makeBox('main-frame', { x: 1.08, y: bodyLength, z: 0.24 }, { x: 0, y: -0.03, z: 0.55 }, blackMetal);
    makeBox('front-hood', { x: 0.96, y: 1.55, z: 0.48 }, { x: 0, y: -0.96, z: 0.92 }, bodyMaterial, { body: true });
    makeBox('hood-nose', { x: 0.78, y: 0.36, z: 0.36 }, { x: 0, y: -1.78, z: 0.79 }, bodyMaterial, { body: true });
    makeBox('engine-grill', { x: 0.72, y: 0.05, z: 0.34 }, { x: 0, y: -1.99, z: 0.79 }, blackMetal);
    makeBox('cabin-glass', { x: 1.02, y: 0.82, z: 0.9 }, { x: 0, y: 0.42, z: 1.35 }, glass);
    makeBox('cabin-roof', { x: 1.25, y: 1.0, z: 0.14 }, { x: 0, y: 0.42, z: 1.88 }, bodyMaterial, { body: true });
    makeBox('rear-deck', { x: 1.22, y: 0.86, z: 0.42 }, { x: 0, y: 1.07, z: 0.88 }, bodyMaterial, { body: true });
    makeBox('left-fender', { x: 0.42, y: 0.78, z: 0.24 }, { x: -rearTrack / 2, y: 0.82, z: 1.03 }, bodyMaterial, { body: true });
    makeBox('right-fender', { x: 0.42, y: 0.78, z: 0.24 }, { x: rearTrack / 2, y: 0.82, z: 1.03 }, bodyMaterial, { body: true });
    makeBox('front-axle', { x: frontTrack + 0.48, y: 0.16, z: 0.16 }, { x: 0, y: -1.18, z: 0.48 }, metal);
    makeBox('rear-axle', { x: rearTrack + 0.62, y: 0.18, z: 0.18 }, { x: 0, y: 0.86, z: 0.58 }, metal);
    makeBox('rear-hitch', { x: 0.2, y: 0.55, z: 0.14 }, { x: 0, y: 1.78, z: 0.46 }, metal, { outline: false });

    const createWheel = (x, y, radius, width, steerable) => {
      const wheelGroup = new THREE.Group();
      wheelGroup.position.set(x, y, radius);
      group.add(wheelGroup);

      const tire = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 28), dark);
      tire.rotation.z = Math.PI / 2;
      tire.castShadow = true;
      tire.receiveShadow = true;
      wheelGroup.add(tire);

      const rim = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.42, radius * 0.42, width + 0.02, 20), yellow);
      rim.rotation.z = Math.PI / 2;
      rim.castShadow = true;
      wheelGroup.add(rim);

      const hub = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.18, radius * 0.18, width + 0.04, 16), metal);
      hub.rotation.z = Math.PI / 2;
      hub.castShadow = true;
      wheelGroup.add(hub);

      for (let i = 0; i < 10; i++) {
        const lug = new THREE.Mesh(new THREE.BoxGeometry(0.055, radius * 0.42, 0.075), blackMetal);
        const a = (i / 10) * Math.PI * 2;
        lug.position.set(0, Math.cos(a) * radius * 0.86, Math.sin(a) * radius * 0.86);
        lug.rotation.x = a;
        lug.castShadow = true;
        wheelGroup.add(lug);
      }

      if (!steerable) return null;
      return wheelGroup;
    };

    const rearWheelY = 0.86;
    const frontWheelY = -1.18;
    const frontLeft = createWheel(-frontTrack / 2, frontWheelY, 0.34, 0.34, true);
    const frontRight = createWheel(frontTrack / 2, frontWheelY, 0.34, 0.34, true);
    createWheel(-rearTrack / 2, rearWheelY, 0.52, 0.5, false);
    createWheel(rearTrack / 2, rearWheelY, 0.52, 0.5, false);

    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.62, 10), metal);
    antenna.position.set(0, 0.04, 2.24);
    antenna.castShadow = true;
    group.add(antenna);
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 10), implementMat);
    beacon.position.set(0, 0.04, 2.58);
    beacon.castShadow = true;
    group.add(beacon);

    group.position.set(0, -0.08, -0.05);
    group.rotation.z = 0;

    const render = () => {
      renderer.render(scene, camera);
      sceneRef.current.frameId = requestAnimationFrame(render);
    };

    sceneRef.current = {
      renderer,
      bodyMeshes,
      frontWheels: [frontLeft, frontRight].filter(Boolean),
      frameId: null
    };
    render();

    return () => {
      if (sceneRef.current?.frameId) cancelAnimationFrame(sceneRef.current.frameId);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      sceneRef.current = null;
    };
  }, [implementWidth, vehicleSettings?.frontAxleWidth, vehicleSettings?.rearAxleWidth, vehicleSettings?.wheelbase]);

  React.useEffect(() => {
    const refs = sceneRef.current;
    if (!refs) return;
    refs.bodyMeshes.forEach((mesh) => mesh.material.color.set(mode === 'AUTO' ? 0x22c55e : 0x2563eb));
    const steerRad = steeringAngle * Math.PI / 180;
    refs.frontWheels.forEach((wheel) => {
      wheel.rotation.z = -steerRad;
    });
  }, [mode, steeringAngle]);

  if (!window.THREE) {
    return <TractorVehicle2D mode={mode} steeringAngle={steeringAngle} implementWidth={implementWidth} vehicleSettings={vehicleSettings} />;
  }

  return <div ref={mountRef} className="drop-shadow-2xl filter" style={{ width: 220, height: 260 }} />;
};

const TRACTOR_MODEL_PARTS = [
  { file: 'Tractor_body.obj', role: 'body' },
  { file: 'Tractor_traktor_eu_red.obj', role: 'body' },
  { file: 'Tractor_traktor_eu_shields.obj', role: 'body' },
  { file: 'Tractor_tyre.obj', role: 'tire' },
  { file: 'Tractor_traktor_eu_fl_glass.obj', role: 'glass' },
  { file: 'Tractor_traktor_eu_chrome.obj', role: 'chrome' },
  { file: 'Tractor_traktor_eu_fl_bulb.obj', role: 'lamp' },
  { file: 'Tractor_traktor_eu_fl_mirror.obj', role: 'dark' },
  { file: 'Tractor_black.obj', role: 'dark' },
  { file: 'Tractor_metal.obj', role: 'metal' },
  { file: 'Tractor_traktor_eu_elem.obj', role: 'metal' },
  { file: 'Tractor_Material__25.obj', role: 'metal' }
];

const OBJ_GEOMETRY_CACHE = new Map();

const parseObjGeometry = (THREE, text) => {
  const vertices = [];
  const normals = [];
  const outPositions = [];
  const outNormals = [];

  const resolveIndex = (raw, length) => {
    const idx = parseInt(raw, 10);
    if (Number.isNaN(idx)) return null;
    return idx < 0 ? length + idx : idx - 1;
  };

  const pushVertex = (token) => {
    const [vRaw, , nRaw] = token.split('/');
    const vIdx = resolveIndex(vRaw, vertices.length);
    if (vIdx === null || !vertices[vIdx]) return;
    const v = vertices[vIdx];
    outPositions.push(v[0], v[1], v[2]);

    const nIdx = nRaw ? resolveIndex(nRaw, normals.length) : null;
    if (nIdx !== null && normals[nIdx]) {
      const n = normals[nIdx];
      outNormals.push(n[0], n[1], n[2]);
    }
  };

  text.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed[0] === '#') return;
    const parts = trimmed.split(/\s+/);

    if (parts[0] === 'v' && parts.length >= 4) {
      const x = parseFloat(parts[1]);
      const y = parseFloat(parts[2]);
      const z = parseFloat(parts[3]);
      // OBJ model is Y-up. UI scene is Z-up, with forward along negative Y.
      vertices.push([x, -z, y]);
    } else if (parts[0] === 'vn' && parts.length >= 4) {
      const x = parseFloat(parts[1]);
      const y = parseFloat(parts[2]);
      const z = parseFloat(parts[3]);
      normals.push([x, -z, y]);
    } else if (parts[0] === 'f' && parts.length >= 4) {
      const face = parts.slice(1);
      for (let i = 1; i < face.length - 1; i++) {
        pushVertex(face[0]);
        pushVertex(face[i]);
        pushVertex(face[i + 1]);
      }
    }
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(outPositions, 3));
  if (outNormals.length === outPositions.length) {
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(outNormals, 3));
  } else {
    geometry.computeVertexNormals();
  }
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
};

const loadObjGeometry = (THREE, file) => {
  const url = `src/assets/models/tractor_parts/${file}`;
  if (!OBJ_GEOMETRY_CACHE.has(url)) {
    OBJ_GEOMETRY_CACHE.set(
      url,
      fetch(url)
        .then((res) => {
          if (!res.ok) throw new Error(`Failed to load ${url}`);
          return res.text();
        })
        .then((text) => parseObjGeometry(THREE, text))
    );
  }
  return OBJ_GEOMETRY_CACHE.get(url);
};

const TractorVehicle3D = ({ mode, steeringAngle, implementWidth, vehicleSettings }) => {
  const mountRef = React.useRef(null);
  const sceneRef = React.useRef(null);
  const [loadFailed, setLoadFailed] = React.useState(false);

  React.useEffect(() => {
    const THREE = window.THREE;
    const mount = mountRef.current;
    if (loadFailed) return undefined;
    if (!THREE || !mount) return undefined;

    let disposed = false;
    const width = VEHICLE_VIEWPORT_WIDTH;
    const height = VEHICLE_VIEWPORT_HEIGHT;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 100);
    camera.position.set(0, -7.6, 3.15);
    camera.lookAt(0, -0.18, 0.88);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    if (THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x8aa0b8, 2.0));
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(-5.5, -5.5, 8.5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);

    const root = new THREE.Group();
    scene.add(root);

    const bodyMaterial = new THREE.MeshStandardMaterial({ color: mode === 'AUTO' ? 0x22c55e : 0x2563eb, roughness: 0.36, metalness: 0.08 });
    const materials = {
      body: bodyMaterial,
      tire: new THREE.MeshStandardMaterial({ color: 0x0b1220, roughness: 0.85, metalness: 0.02 }),
      glass: new THREE.MeshStandardMaterial({ color: 0xaed7ff, roughness: 0.08, metalness: 0.02, transparent: true, opacity: 0.62 }),
      chrome: new THREE.MeshStandardMaterial({ color: 0xd6dee8, roughness: 0.22, metalness: 0.75 }),
      lamp: new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.24, metalness: 0.1, emissive: 0x7c4a03, emissiveIntensity: 0.12 }),
      dark: new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.58, metalness: 0.18 }),
      metal: new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.48, metalness: 0.32 })
    };

    const model = new THREE.Group();
    root.add(model);

    const makeBox = (name, size, position, material) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), material);
      mesh.name = name;
      mesh.position.set(position.x, position.y, position.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      root.add(mesh);
      return mesh;
    };

    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(2.7, 48),
      new THREE.ShadowMaterial({ opacity: 0.25 })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(0, 0.2, 0.02);
    shadow.receiveShadow = true;
    root.add(shadow);

    const implementMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.48, metalness: 0.1 });
    const metalMat = materials.metal;
    const implementVisualWidth = Math.max(2.2, implementWidth || 3);

    const addImplement = (rearY, direction = 1) => {
      makeBox('model-drawbar', { x: 0.16, y: 0.38, z: 0.12 }, { x: 0, y: rearY + direction * 0.14, z: 0.44 }, metalMat);
      makeBox('model-implement', { x: implementVisualWidth, y: 0.18, z: 0.18 }, { x: 0, y: rearY + direction * 0.34, z: 0.5 }, implementMat);
      for (let i = 0; i < 9; i++) {
        const x = -implementVisualWidth / 2 + (implementVisualWidth / 8) * i;
        makeBox(`model-tine-${i}`, { x: 0.035, y: 0.22, z: 0.07 }, { x, y: rearY + direction * 0.46, z: 0.25 }, metalMat);
      }
    };

    Promise.all(
      TRACTOR_MODEL_PARTS.map((part) =>
        loadObjGeometry(THREE, part.file).then((geometry) => ({ geometry, part }))
      )
    )
      .then((parts) => {
        if (disposed) return;
        parts.forEach(({ geometry, part }) => {
          const mesh = new THREE.Mesh(geometry, materials[part.role] || materials.metal);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          model.add(mesh);
        });

        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const modelScale = 4.25 / maxDim;
        model.scale.setScalar(modelScale);
        model.rotation.z = Math.PI;
        model.rotation.x = 0;
        const offset = center.clone().multiplyScalar(modelScale).applyEuler(model.rotation);
        const groundOffset = box.min.z * modelScale;
        model.position.set(-offset.x, -offset.y - 0.2, 0.03 - groundOffset);

        const normalizedBox = new THREE.Box3().setFromObject(model);
        addImplement(normalizedBox.min.y - 0.05, -1);
      })
      .catch(() => {
        if (!disposed) setLoadFailed(true);
      });

    const render = () => {
      renderer.render(scene, camera);
      if (sceneRef.current) sceneRef.current.frameId = requestAnimationFrame(render);
    };

    sceneRef.current = {
      renderer,
      bodyMaterial,
      frameId: null
    };
    render();

    return () => {
      disposed = true;
      if (sceneRef.current?.frameId) cancelAnimationFrame(sceneRef.current.frameId);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      sceneRef.current = null;
    };
  }, [loadFailed, implementWidth, vehicleSettings?.frontAxleWidth, vehicleSettings?.rearAxleWidth, vehicleSettings?.wheelbase]);

  React.useEffect(() => {
    const refs = sceneRef.current;
    if (!refs) return;
    refs.bodyMaterial.color.set(mode === 'AUTO' ? 0x22c55e : 0x2563eb);
  }, [mode, steeringAngle]);

  if (!window.THREE) {
    return <TractorVehicle2D mode={mode} steeringAngle={steeringAngle} implementWidth={implementWidth} vehicleSettings={vehicleSettings} />;
  }

  if (loadFailed) {
    return <TractorVehicle3DPrimitive mode={mode} steeringAngle={steeringAngle} implementWidth={implementWidth} vehicleSettings={vehicleSettings} />;
  }

  return <div ref={mountRef} className="drop-shadow-2xl filter" style={{ width: VEHICLE_VIEWPORT_WIDTH, height: VEHICLE_VIEWPORT_HEIGHT }} />;
};

const TractorVehicle = ({ mode, steeringAngle, implementWidth, vehicleSettings, viewMode = '2D' }) => {
  if (viewMode === '3D') {
    return (
      <TractorVehicle3DStyled
        mode={mode}
        steeringAngle={steeringAngle}
        implementWidth={implementWidth}
        vehicleSettings={vehicleSettings}
      />
    );
  }

  return (
    <TractorVehicle2D
      mode={mode}
      steeringAngle={steeringAngle}
      implementWidth={implementWidth}
      vehicleSettings={vehicleSettings}
    />
  );
};
