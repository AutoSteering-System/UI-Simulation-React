const { useState, useEffect, useRef } = React;

const App = () => {
  const { state, actions } = window.MockBackend.useStore();
  const {
    vehicleSettings,
    implementSettings,
    rtkSettings,
    lineType,
    isMultiLineMode,
    manualOffset,
    showGuidanceLines,
    guidanceLine,
    pointA,
    pointB,
    aPlusPoint,
    aPlusHeading,
    isRecordingCurve,
    curvePoints,
    pivotCenter,
    pivotRadius,
    coverageTrail,
    fields,
    selectedFieldId,
    activeTaskId,
    loadedField,
    activeBoundaryIdx,
    activeLineId,
    viewMode,
    newFieldName,
    isRecordingBoundary,
    tempBoundary,
    currentFieldBoundaries
  } = state;

  const [steeringMode, setSteeringMode] = useState('MANUAL');
  const [isRecording, setIsRecording] = useState(false);
  const [rtkStatus, setRtkStatus] = useState('FIX');
  const [crossTrackError, setCrossTrackError] = useState(0.0);

  // ACTION DOCK STATES
  const [isCreating, setIsCreating] = useState(false);
  const [dockMenuOpen, setDockMenuOpen] = useState(false);

  // Driving & Physics
  const [speed, setSpeed] = useState(0);
  const [manualTargetSpeed, setManualTargetSpeed] = useState(0);
  const [steeringAngle, setSteeringAngle] = useState(0);
  const [worldPos, setWorldPos] = useState({ x: 0, y: 0 });
  const [heading, setHeading] = useState(0);
  const [mapVisualHeading, setMapVisualHeading] = useState(0);
  const [viewTransitioning, setViewTransitioning] = useState(false);
  const [workedArea, setWorkedArea] = useState(0.0);

  // Physics Ref
  const physics = useRef({
      speed: 0,
      targetSpeed: 0,
      steeringAngle: 0,
      heading: 0,
      x: 0,
      y: 0,
      lastTime: 0
  });

  // UI States
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [fieldManagerOpen, setFieldManagerOpen] = useState(false);
  const [linesPanelOpen, setLinesPanelOpen] = useState(false);
  const [lineModeModalOpen, setLineModeModalOpen] = useState(false);
  const [lineNameModalOpen, setLineNameModalOpen] = useState(false);
  const [manualHeadingModalOpen, setManualHeadingModalOpen] = useState(false);
  const [rtkAdvancedOpen, setRtkAdvancedOpen] = useState(false);
  const [gnssTab, setGnssTab] = useState('GNSS');

  // Boundary States
  const [boundaryNameModalOpen, setBoundaryNameModalOpen] = useState(false);
  const [tempBoundaryName, setTempBoundaryName] = useState('');
  const [boundaryAlertOpen, setBoundaryAlertOpen] = useState(false);
  const [boundaryAlertType, setBoundaryAlertType] = useState(null);
  const [previewBoundary, setPreviewBoundary] = useState(null);

  // Delete Confirm Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const [tempLineName, setTempLineName] = useState('');
  const [tempManualHeading, setTempManualHeading] = useState('0.0');
  const [settingsTab, setSettingsTab] = useState('overview');

  // NEW: Locked Lane Index for Auto Steer
  const activeLaneRef = useRef(null);
  const bootstrappedLineRef = useRef(false);

  const [featureSettings, setFeatureSettings] = useState({
      terrainCompensation: true,
      electricPowerSteering: true,
      easySwitch: true,
      manualIntervention: true,
      isobusUT: true,
      sectionControl: true,
      variableRate: false,
      obd: true,
      wiredCamera: true,
      wirelessCamera: false,
      acreRecording: true,
      liftSensor: true,
      autoUTurn: true,
      headlandTurn: true,
      canbusSteerReady: true,
      pwmSteerReady: false,
      mobaTrac: false,
      landLeveling: false,
      dataTransfer: true
  });
  const [cameraPanelOpen, setCameraPanelOpen] = useState(false);
  const [diagnosticsPanelOpen, setDiagnosticsPanelOpen] = useState(false);
  const [isCombinationPaused, setIsCombinationPaused] = useState(false);

  const [satelliteCount, setSatelliteCount] = useState(12);
  const [notification, setNotification] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(0.6);
  const [sceneViewMode, setSceneViewMode] = useState(() => {
      const params = new URLSearchParams(window.location.search);
      const mode = params.get('view') || params.get('vehicle') || params.get('mapView');
      return mode === '2D' ? '2D' : '3D';
  });
  const mapOrientation = 'HEADING_UP';
  const [theme, setTheme] = useState(() => {
      const mode = new URLSearchParams(window.location.search).get('theme') || localStorage.getItem('autosteer-theme');
      return mode === 'dark' ? 'dark' : 'light';
  });
  const [isDraggingMap, setIsDraggingMap] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const keysPressed = useRef({});
  const crossTrackErrorRef = useRef(0);
  const mapVisualHeadingRef = useRef(0);
  const turnAssistRef = useRef(null);
  const [turnAssistActive, setTurnAssistActive] = useState(false);
  const [currentTime, setCurrentTime] = useState('');

  // Store refs to guidance data for physics loop
  const guidanceRef = useRef({
      type: null,
      points: null,
      isMulti: false,
      width: 0,
      manualOffset: 0
  });

  // Sync guidanceRef with state
  useEffect(() => {
    // Find active line object to get its specific properties
    const activeField = fields.find(f => f.id === selectedFieldId);

    guidanceRef.current = {
        type: guidanceLine,
        isMulti: isMultiLineMode,
        width: implementSettings.width * PIXELS_PER_METER,
        manualOffset: manualOffset,
        points: {
            a: pointA,
            b: pointB,
            aplus: { point: aPlusPoint, heading: aPlusHeading },
            curve: curvePoints,
            pivot: { center: pivotCenter, radius: pivotRadius }
        }
    };
  }, [guidanceLine, pointA, pointB, aPlusPoint, aPlusHeading, curvePoints, pivotCenter, pivotRadius, activeLineId, fields, selectedFieldId, isMultiLineMode, implementSettings.width, manualOffset]);


  const t = theme === 'dark' ? {
    bgMain: 'bg-[#15171e]',
    bgPanel: 'bg-slate-950',
    bgHeader: 'bg-slate-950/90',
    bgBottom: 'bg-slate-950/95',
    bgCard: 'bg-slate-950/90',
    bgInput: 'bg-slate-800',
    textMain: 'text-white',
    textSub: 'text-slate-400',
    textDim: 'text-slate-500',
    border: 'border-slate-800',
    borderCard: 'border-slate-700',
    divider: 'bg-slate-800',
    activeItem: 'bg-slate-800',
    selectedItem: 'bg-blue-900/30 border-blue-500/50',
    gridColor1: '#475569',
    deviceFrame: 'bg-slate-950 border-slate-800'
  } : {
    bgMain: 'bg-gray-100',
    bgPanel: 'bg-white',
    bgHeader: 'bg-white/90',
    bgBottom: 'bg-white/95',
    bgCard: 'bg-white/95',
    bgInput: 'bg-gray-100',
    textMain: 'text-slate-900',
    textSub: 'text-slate-500',
    textDim: 'text-slate-400',
    border: 'border-gray-300',
    borderCard: 'border-gray-300',
    divider: 'bg-gray-200',
    activeItem: 'bg-gray-100',
    selectedItem: 'bg-blue-50 border-blue-300',
    gridColor1: '#94a3b8',
    deviceFrame: 'bg-white border-gray-300'
  };

  // Helper for compass direction
  const getCardinalDirection = (angle) => {
      let val = parseFloat(angle);
      if (isNaN(val)) return '--';
      val = val % 360;
      if (val < 0) val += 360;

      if (val >= 337.5 || val < 22.5) return 'North';
      if (val >= 22.5 && val < 67.5) return 'Northeast (NE)';
      if (val >= 67.5 && val < 112.5) return 'East';
      if (val >= 112.5 && val < 157.5) return 'Southeast (SE)';
      if (val >= 157.5 && val < 202.5) return 'South';
      if (val >= 202.5 && val < 247.5) return 'Southwest (SW)';
      if (val >= 247.5 && val < 292.5) return 'West';
      if (val >= 292.5 && val < 337.5) return 'Northwest (NW)';
      return '';
  };

  const getCardinalShortDirection = (angle) => {
      let val = parseFloat(angle);
      if (isNaN(val)) return '--';
      val = val % 360;
      if (val < 0) val += 360;

      if (val >= 337.5 || val < 22.5) return 'N';
      if (val >= 22.5 && val < 67.5) return 'NE';
      if (val >= 67.5 && val < 112.5) return 'E';
      if (val >= 112.5 && val < 157.5) return 'SE';
      if (val >= 157.5 && val < 202.5) return 'S';
      if (val >= 202.5 && val < 247.5) return 'SW';
      if (val >= 247.5 && val < 292.5) return 'W';
      if (val >= 292.5 && val < 337.5) return 'NW';
      return '--';
  };

  const getHeadingDelta = (target, current) => {
      let diff = ((target - current + 540) % 360) - 180;
      if (diff < -180) diff += 360;
      return diff;
  };

  const normalizeHeadingValue = (value) => {
      const normalized = value % 360;
      return normalized < 0 ? normalized + 360 : normalized;
  };

  const getGuidanceMetrics = (guide, p) => {
      if (!guide || !guide.type || !guide.points || !p) {
          return { validLine: false, xte: 0, lineHeading: 0 };
      }

      if (guide.type === 'STRAIGHT_AB' && guide.points.a && guide.points.b) {
          const ax = guide.points.a.x; const ay = guide.points.a.y;
          const bx = guide.points.b.x; const by = guide.points.b.y;
          const dx = bx - ax; const dy = by - ay;
          const len = Math.hypot(dx, dy);
          if (len <= 0.001) return { validLine: false, xte: 0, lineHeading: 0 };
          return {
              validLine: true,
              xte: ((bx - ax) * (p.y - ay) - (by - ay) * (p.x - ax)) / len,
              lineHeading: Math.atan2(dx, -dy) * 180 / Math.PI
          };
      }

      if (guide.type === 'A_PLUS' && guide.points.aplus && guide.points.aplus.point && guide.points.aplus.heading != null) {
          const ax = guide.points.aplus.point.x;
          const ay = guide.points.aplus.point.y;
          const h = guide.points.aplus.heading;
          const rad = h * Math.PI / 180;
          const ux = Math.sin(rad);
          const uy = -Math.cos(rad);
          const vax = p.x - ax; const vay = p.y - ay;
          return {
              validLine: true,
              xte: vax * (-uy) + vay * (ux),
              lineHeading: h
          };
      }

      if (guide.type === 'PIVOT' && guide.points.pivot && guide.points.pivot.center && guide.points.pivot.radius) {
          const cx = guide.points.pivot.center.x;
          const cy = guide.points.pivot.center.y;
          const baseR = guide.points.pivot.radius;
          const dist = Math.hypot(p.x - cx, p.y - cy);
          const angleToCenter = Math.atan2(p.y - cy, p.x - cx);
          const vehicleAngle = (p.heading || 0) * Math.PI / 180;
          const tan1 = angleToCenter + Math.PI / 2;
          const tan2 = angleToCenter - Math.PI / 2;
          const normAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));
          const diff1 = Math.abs(normAngle(tan1 - vehicleAngle));
          const diff2 = Math.abs(normAngle(tan2 - vehicleAngle));
          return {
              validLine: true,
              xte: dist - baseR,
              lineHeading: (diff1 < diff2 ? tan1 : tan2) * 180 / Math.PI
          };
      }

      if ((guide.type === 'CURVE' || guide.type === 'COMBINATION') && guide.points.curve && guide.points.curve.length > 1) {
          let minDist = Infinity;
          let bestSeg = null;

          for (let i = 0; i < guide.points.curve.length - 1; i++) {
              const p1 = guide.points.curve[i];
              const p2 = guide.points.curve[i + 1];
              const len = Math.hypot(p2.x - p1.x, p2.y - p1.y);
              if (len <= 0.001) continue;
              const info = pointToSegmentDistance(p.x, p.y, p1.x, p1.y, p2.x, p2.y);
              if (info.distance < minDist) {
                  minDist = info.distance;
                  bestSeg = { p1, p2, cross: info.cross, len };
              }
          }

          if (!bestSeg) return { validLine: false, xte: 0, lineHeading: 0 };
          const dx = bestSeg.p2.x - bestSeg.p1.x;
          const dy = bestSeg.p2.y - bestSeg.p1.y;
          return {
              validLine: true,
              xte: bestSeg.cross / bestSeg.len,
              lineHeading: Math.atan2(dx, -dy) * 180 / Math.PI
          };
      }

      return { validLine: false, xte: 0, lineHeading: 0 };
  };

  const getTargetRelativeXte = (rawXte, guide) => {
      const offset = Number(guide.manualOffset) || 0;
      if (guide.isMulti && guide.width > 0) {
          const targetLaneIndex = activeLaneRef.current !== null ? activeLaneRef.current : Math.round(rawXte / guide.width);
          return rawXte - (targetLaneIndex * guide.width) - offset;
      }
      return rawXte - offset;
  };

  const setGuidanceErrorFromPixels = (xtePixels) => {
      const nextCm = Math.round((xtePixels / PIXELS_PER_METER) * 1000) / 10;
      if (Math.abs(nextCm - crossTrackErrorRef.current) < 0.2) return;
      crossTrackErrorRef.current = nextCm;
      setCrossTrackError(nextCm);
  };

  const getXteDirection = () => {
      if (Math.abs(crossTrackError) < 1) return 'CENTER';
      return crossTrackError < 0 ? 'LEFT' : 'RIGHT';
  };

  const getXteTone = () => {
      const abs = Math.abs(crossTrackError);
      if (abs >= 10) return 'bg-red-500/10 border-red-500 text-red-600';
      if (abs >= 4) return 'bg-yellow-500/10 border-yellow-500 text-yellow-700';
      return theme === 'dark' ? 'bg-slate-900/60 border-slate-700 text-white' : 'bg-white/70 border-gray-300 text-slate-900';
  };

  const getLineLengthMeters = (line) => {
      if (Number.isFinite(line?.length)) return line.length;

      const points = line?.points || {};
      if (points.a && points.b) {
          return Math.hypot(points.b.x - points.a.x, points.b.y - points.a.y) / PIXELS_PER_METER;
      }

      const curve = points.curve || [];
      if (curve.length > 1) {
          let total = 0;
          for (let i = 0; i < curve.length - 1; i++) {
              total += Math.hypot(curve[i + 1].x - curve[i].x, curve[i + 1].y - curve[i].y);
          }
          return total / PIXELS_PER_METER;
      }

      if (points.pivot?.radius) return (2 * Math.PI * points.pivot.radius) / PIXELS_PER_METER;
      return null;
  };

  const formatLineDate = (line) => {
      const raw = line?.createdAt || line?.date;
      if (!raw) return 'Not saved';
      const parsed = new Date(raw);
      return Number.isNaN(parsed.getTime()) ? raw : parsed.toLocaleDateString();
  };

  // --- 1. CLOCK ---
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
      localStorage.setItem('autosteer-theme', theme);
  }, [theme]);

  useEffect(() => {
      if (bootstrappedLineRef.current || loadedField || activeLineId || guidanceLine) return;

      const field = fields.find(f => f.id === selectedFieldId);
      const defaultLine = field?.lines?.[0];
      if (!field || !defaultLine) return;

      bootstrappedLineRef.current = true;
      actions.setLoadedField(field);
      actions.setActiveLineId(defaultLine.id);
      actions.setLineType(defaultLine.type);
      actions.setPointA(defaultLine.points?.a || null);
      actions.setPointB(defaultLine.points?.b || null);
      actions.setAPlusPoint(defaultLine.points?.aplus?.point || null);
      actions.setAPlusHeading(defaultLine.points?.aplus?.heading ?? null);
      actions.setCurvePoints(defaultLine.points?.curve || []);
      actions.setPivotCenter(defaultLine.points?.pivot?.center || null);
      actions.setPivotRadius(defaultLine.points?.pivot?.radius || null);
      actions.setGuidanceLine(defaultLine.type);
      if (defaultLine.isMulti !== undefined) actions.setIsMultiLineMode(defaultLine.isMulti);
  }, [fields, selectedFieldId, loadedField, activeLineId, guidanceLine]);

  // --- 2. INPUT ---
  useEffect(() => {
    const handleKeyDown = (e) => {
        if (menuOpen || settingsOpen || cameraPanelOpen || diagnosticsPanelOpen || (fieldManagerOpen && !isRecordingBoundary) || lineModeModalOpen || lineNameModalOpen || boundaryNameModalOpen || linesPanelOpen || manualHeadingModalOpen || boundaryAlertOpen || deleteModalOpen) return;
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].indexOf(e.key) > -1) e.preventDefault();
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            turnAssistRef.current = null;
            setTurnAssistActive(false);
        }
        keysPressed.current[e.key] = true;
    };
    const handleKeyUp = (e) => { keysPressed.current[e.key] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); };
  }, [menuOpen, settingsOpen, cameraPanelOpen, diagnosticsPanelOpen, fieldManagerOpen, lineModeModalOpen, isRecordingBoundary, lineNameModalOpen, boundaryNameModalOpen, linesPanelOpen, manualHeadingModalOpen, boundaryAlertOpen, deleteModalOpen]);

  // --- 3. PHYSICS ---
  useEffect(() => {
    let animationFrameId;

    const loop = (time) => {
        if (!physics.current.lastTime) physics.current.lastTime = time;
        const dt = Math.min((time - physics.current.lastTime) / 1000, 0.1);
        physics.current.lastTime = time;

        const p = physics.current;

        // --- SPEED CONTROL (Available in BOTH Manual and Auto) ---
        if (keysPressed.current['ArrowUp']) p.targetSpeed = Math.min(p.targetSpeed + 10 * dt, 15);
        else if (keysPressed.current['ArrowDown']) p.targetSpeed = Math.max(p.targetSpeed - 15 * dt, -5);

        // --- AUTO STEERING LOGIC ---
        if (steeringMode === 'AUTO') {
             // REMOVED FORCED SPEED LOGIC

             const guide = guidanceRef.current;
             const metrics = getGuidanceMetrics(guide, p);

             if (metrics.validLine) {
                 let xte = getTargetRelativeXte(metrics.xte, guide);
                 const lineHeading = metrics.lineHeading;
                 setGuidanceErrorFromPixels(xte);

                 let headingErr = normalizeAngle(lineHeading - p.heading);

                 if (Math.abs(headingErr) > 90) {
                     const reverseHeading = normalizeAngle(lineHeading + 180);
                     headingErr = normalizeAngle(reverseHeading - p.heading);
                     xte = -xte;
                 }

                 const kP_xte = 0.5;
                 const kP_head = 1.0;
                 let steerCmd = headingErr * kP_head - xte * kP_xte;

                 if (steerCmd > 40) steerCmd = 40;
                 if (steerCmd < -40) steerCmd = -40;
                 p.steeringAngle = steerCmd;
             } else {
                 setGuidanceErrorFromPixels(0);
             }

        } else {
             // MANUAL STEERING LOGIC
            const turnInputActive = keysPressed.current['ArrowLeft'] || keysPressed.current['ArrowRight'];
            const steerSpeed = isMap3D ? (turnInputActive ? 90 : 72) : 38;
            const activeTurnAssist = turnAssistRef.current;
            if (activeTurnAssist) {
                const remaining = Math.abs(getHeadingDelta(activeTurnAssist.targetHeading, p.heading));
                if (remaining <= 3) {
                    turnAssistRef.current = null;
                    setTurnAssistActive(false);
                    p.steeringAngle = 0;
                } else {
                    const assistSteer = remaining < 18 ? 26 : 42;
                    const assistTargetSpeed = remaining < 18 ? 4.5 : 5.5;
                    p.steeringAngle = Math.max(-45, Math.min(45, activeTurnAssist.direction * assistSteer));
                    p.targetSpeed = p.targetSpeed < 0 ? -assistTargetSpeed : assistTargetSpeed;
                }
            } else if (keysPressed.current['ArrowLeft']) p.steeringAngle = Math.max(p.steeringAngle - steerSpeed * dt, -45);
            else if (keysPressed.current['ArrowRight']) p.steeringAngle = Math.min(p.steeringAngle + steerSpeed * dt, 45);
            else {
                const steeringReturnSpeed = isMap3D ? 46 : 28;
                if (p.steeringAngle > 0) p.steeringAngle = Math.max(0, p.steeringAngle - steeringReturnSpeed * dt);
                else if (p.steeringAngle < 0) p.steeringAngle = Math.min(0, p.steeringAngle + steeringReturnSpeed * dt);
            }

            // NEW: Snap Line to Vehicle in Single Mode (Manual Driving)
            if (!guidanceRef.current.isMulti && guidanceRef.current.type) {
                const guide = guidanceRef.current;
                let currentSnapOffset = 0;
                // Calculate distance from original line
                if (guide.type === 'STRAIGHT_AB' && guide.points.a && guide.points.b) {
                   const ax = guide.points.a.x; const ay = guide.points.a.y;
                   const bx = guide.points.b.x; const by = guide.points.b.y;
                   const dx = bx - ax; const dy = by - ay;
                   const len = Math.hypot(dx, dy);
                   if (len > 0) {
                       currentSnapOffset = ((bx - ax) * (p.y - ay) - (by - ay) * (p.x - ax)) / len;
                   }
                } else if (guide.type === 'A_PLUS' && guide.points.aplus && guide.points.aplus.point) {
                    const ax = guide.points.aplus.point.x;
                    const ay = guide.points.aplus.point.y;
                    const h = guide.points.aplus.heading;
                    const rad = h * Math.PI / 180;
                    const ux = Math.sin(rad);
                    const uy = -Math.cos(rad);
                    const vax = p.x - ax; const vay = p.y - ay;
                    currentSnapOffset = vax * (-uy) + vay * (ux);
                } else if (guide.type === 'PIVOT' && guide.points.pivot && guide.points.pivot.center && guide.points.pivot.radius) {
                    const cx = guide.points.pivot.center.x;
                    const cy = guide.points.pivot.center.y;
                    const baseR = guide.points.pivot.radius;
                    const dist = Math.hypot(p.x - cx, p.y - cy);
                    currentSnapOffset = dist - baseR;
                } else if (guide.type === 'CURVE' && guide.points.curve && guide.points.curve.length > 1) {
                     // Approximate closest point for snapping
                     let minDist = Infinity;
                     let bestCross = 0;
                     for(let i=0; i<guide.points.curve.length-1; i++) {
                         const p1 = guide.points.curve[i];
                         const p2 = guide.points.curve[i+1];
                         const info = pointToSegmentDistance(p.x, p.y, p1.x, p1.y, p2.x, p2.y);
                         if (info.distance < minDist) {
                             minDist = info.distance;
                             const segLen = Math.hypot(p2.x - p1.x, p2.y - p1.y);
                             bestCross = info.cross / segLen;
                         }
                     }
                     currentSnapOffset = bestCross;
                }

                // Update state
                actions.setManualOffset(currentSnapOffset);
            }

            const guideForTelemetry = guidanceRef.current;
            const telemetry = getGuidanceMetrics(guideForTelemetry, p);
            if (telemetry.validLine) {
                setGuidanceErrorFromPixels(getTargetRelativeXte(telemetry.xte, guideForTelemetry));
            } else {
                setGuidanceErrorFromPixels(0);
            }
        }

        if (Math.abs(p.speed - p.targetSpeed) > 0.1) {
            const accel = p.speed < p.targetSpeed ? 5 : 10;
            p.speed += (p.targetSpeed - p.speed) * accel * dt;
        } else {
            p.speed = p.targetSpeed;
        }

        if (Math.abs(p.speed) > 0.1) {
            const steerRad = p.steeringAngle * Math.PI / 180;
            const wheelbase = Math.max(1.2, vehicleSettings?.wheelbase || 2.5);
            const speedMs = p.speed / 3.6;
            const turnRateDeg = (speedMs / wheelbase) * Math.tan(steerRad) * 180 / Math.PI;
            p.heading += turnRateDeg * dt;
            p.heading = (p.heading % 360 + 360) % 360;

            const headingRad = p.heading * Math.PI / 180;
            const pxPerSec = p.speed * 15;
            const moveDist = pxPerSec * dt;
            p.x += Math.sin(headingRad) * moveDist;
            p.y -= Math.cos(headingRad) * moveDist;
        }

        setSpeed(p.speed);
        setSteeringAngle(p.steeringAngle);
        setHeading(p.heading);
        setWorldPos({ x: p.x, y: p.y });

        const visualHeading = mapVisualHeadingRef.current;
        const visualDiff = getHeadingDelta(p.heading, visualHeading);
        const hasManualTurnInput = steeringMode === 'MANUAL' && (
            keysPressed.current['ArrowLeft'] ||
            keysPressed.current['ArrowRight'] ||
            Math.abs(p.steeringAngle) > 1
        );
        const maxVisualStep = (isMap3D ? 220 : (Math.abs(p.speed) > 0.1 ? 38 : 120)) * dt;
        const nextVisualHeading = normalizeHeadingValue(
            visualHeading + Math.max(-maxVisualStep, Math.min(maxVisualStep, visualDiff))
        );
        mapVisualHeadingRef.current = nextVisualHeading;
        setMapVisualHeading(nextVisualHeading);

        if (setManualTargetSpeed) {
             setManualTargetSpeed(prev => Math.abs(prev - p.targetSpeed) > 0.5 ? Math.round(p.targetSpeed) : prev);
        }

        animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [steeringMode, setManualTargetSpeed, vehicleSettings?.wheelbase, isMap3D]);

  // --- 4. RECORDING ---
  useEffect(() => {
      let intervalId;
      if (isRecording && Math.abs(speed) > 0.1) {
          intervalId = setInterval(() => {
              const speedMs = Math.abs(speed) / 3.6;
              const width = 3.0;
              const dt = 0.05;
              const areaM2 = speedMs * width * dt;
              const areaHa = areaM2 / 10000;
              setWorkedArea(prev => prev + areaHa);
          }, 50);
      }
      return () => clearInterval(intervalId);
  }, [isRecording, speed]);

  useEffect(() => {
      if (!isRecording && !isRecordingCurve && !isRecordingBoundary) return;
      const newPos = worldPos;
      const newHeading = heading;
      const shouldRecord = (prev, pt) => {
          const last = prev[prev.length - 1];
          if (last && Math.hypot(last.x - pt.x, last.y - pt.y) < 10) return prev;
          return [...prev, pt];
      };

      if (isRecording) actions.setCoverageTrail(prev => shouldRecord(prev, { x: newPos.x, y: newPos.y, h: newHeading }));
      if (isRecordingCurve) actions.setCurvePoints(prev => shouldRecord(prev, { x: newPos.x, y: newPos.y }));
      if (isRecordingBoundary) actions.setTempBoundary(prev => shouldRecord(prev, { x: newPos.x, y: newPos.y }));
  }, [worldPos, isRecording, isRecordingCurve, isRecordingBoundary, heading]);


  // --- 5. LOGIC & HANDLERS ---

  // NEW: Handler for Toggling Multi-Line Mode to calculate Offset
  const handleToggleMultiLine = () => {
      const nextMode = !isMultiLineMode;
      actions.setIsMultiLineMode(nextMode);

      if (!nextMode) {
          // Switching TO Single Mode -> Snap to current vehicle position (calculate offset)
          // Using current state from physics refs or state is tricky, but worldPos is updated
          // We recalculate XTE here.

          let calculatedOffset = 0;
          const guide = guidanceRef.current;
          const p = worldPos;

          const snapMetrics = getGuidanceMetrics(guide, { ...p, heading });
          if (snapMetrics.validLine) calculatedOffset = snapMetrics.xte;

          actions.setManualOffset(calculatedOffset);
          showNotification("Single Line: Snapped to Vehicle", "info");
      } else {
          actions.setManualOffset(0);
          showNotification("Multi Line: Grid Mode", "info");
      }
  };

  const toggleSteering = () => {
    if (!guidanceLine && steeringMode === 'MANUAL') return showNotification("Set Line first!", "warning");

    // Toggle Mode
    const newMode = steeringMode === 'MANUAL' ? 'AUTO' : 'MANUAL';

    if (newMode === 'AUTO' && rtkStatus !== 'FIX') {
        return showNotification("RTK FIX required before auto steer", "warning");
    }

    if (newMode === 'AUTO') {
        // --- 1. AUTO ENGAGED Logic ---

        // 1a. Lock the Lane (Calculate lane index closest to vehicle NOW)
        const guide = guidanceRef.current;
        if (guide && guide.type && guide.isMulti && guide.width > 0) {
             const metrics = getGuidanceMetrics(guide, { ...worldPos, heading });
             if (metrics.validLine) {
                 activeLaneRef.current = Math.round(metrics.xte / guide.width);
             }
        }

        // 1b. Close Action Dock & Stop Creating
        setIsCreating(false);
        setDockMenuOpen(false);

        showNotification("Auto Steer ENGAGED", "success");
    } else {
        // --- 2. MANUAL ENGAGED Logic ---
        setDragOffset({ x: 0, y: 0 });
        physics.current.steeringAngle = 0;

        // Unlock lane (optional, or keep it until next auto engage)
        activeLaneRef.current = null;

        showNotification("Manual Control Returned", "warning");
    }
    setSteeringMode(newMode);
  };

  const showNotification = (msg, type) => { setNotification({ msg, type }); setTimeout(() => setNotification(null), 3000); };
  const updateFeatureSetting = (key, value) => {
      setFeatureSettings(prev => ({ ...prev, [key]: value }));
  };

  const toggleFeatureSetting = (key) => {
      setFeatureSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleTrim = (direction) => {
      const trimPixels = PIXELS_PER_METER * 0.01;
      actions.setManualOffset(prev => prev + (direction === 'left' ? -trimPixels : trimPixels));
      showNotification(`Trim ${direction === 'left' ? 'Left' : 'Right'} 1cm`, "info");
  };
  const handleZoom = (type) => { setZoomLevel(prev => { if (type === 'in') return Math.min(prev + 0.2, 3.0); if (type === 'out') return Math.max(prev - 0.2, 0.2); return prev; }); };
  const handleRecenter = () => { setDragOffset({ x: 0, y: 0 }); setIsDraggingMap(false); };
  const handleSceneViewChange = (mode) => {
      if (mode === sceneViewMode) return;
      setViewTransitioning(true);
      setDragOffset({ x: 0, y: 0 });
      setIsDraggingMap(false);
      setSceneViewMode(mode);
      window.setTimeout(() => setViewTransitioning(false), 280);
  };

  const handleMapPointerDown = (e) => {
      setIsDraggingMap(false);
  };
  const handleMapPointerMove = (e) => {
      return;
  };
  const handleMapPointerUp = (e) => {
      setIsDraggingMap(false);
  };

  const resetLines = () => { actions.setPointA(null); actions.setPointB(null); actions.setAPlusPoint(null); actions.setAPlusHeading(null); actions.setCurvePoints([]); actions.setIsRecordingCurve(false); actions.setPivotCenter(null); actions.setPivotRadius(null); actions.setGuidanceLine(null); actions.setActiveLineId(null); setIsCombinationPaused(false); };

  const cancelLineCreation = () => {
      resetLines();
      setIsCreating(false); // EXIT CREATION MODE
      setDockMenuOpen(true); // RETURN TO DOCK MENU
      showNotification("Creation Cancelled", "info");
  };

  const updateManualSpeed = (val) => {
      const next = Math.max(-5, Math.min(15, Number(val) || 0));
      physics.current.targetSpeed = next;
      setManualTargetSpeed(next);
  };
  const cancelTurnAssist = () => {
      turnAssistRef.current = null;
      setTurnAssistActive(false);
  };
  const stopVehicle = () => {
      cancelTurnAssist();
      updateManualSpeed(0);
      physics.current.steeringAngle = 0;
      setSteeringAngle(0);
  };
  const updateSteering = (val) => {
      cancelTurnAssist();
      physics.current.steeringAngle = val;
      setSteeringAngle(val);
  };
  const handleUTurn = () => {
      const current = physics.current;
      const isLeftRequested = keysPressed.current['ArrowLeft'] || current.steeringAngle < -2;
      const direction = isLeftRequested ? -1 : 1;
      const targetSpeed = current.targetSpeed < 0 ? -5.5 : 5.5;
      turnAssistRef.current = {
          direction,
          targetHeading: normalizeHeadingValue(current.heading + 180)
      };
      setSteeringMode('MANUAL');
      setTurnAssistActive(true);
      current.targetSpeed = targetSpeed;
      current.steeringAngle = direction * 42;
      setManualTargetSpeed(targetSpeed);
      setSteeringAngle(current.steeringAngle);
      showNotification(`U-turn assist: ${direction < 0 ? 'left' : 'right'} 180\u00b0`, 'info');
  };
  const setSteerKey = (key, active) => {
      if (active && (key === 'ArrowLeft' || key === 'ArrowRight')) {
          cancelTurnAssist();
      }
      keysPressed.current[key] = active;
  };
  const startFieldCreation = () => { actions.setViewMode('CREATE_FIELD'); actions.setNewFieldName(''); actions.setCurrentFieldBoundaries([]); };
  const handleTaskAction = (task, action) => {
        const newStatus = action === 'start' ? 'In Progress' : action === 'pause' ? 'Paused' : 'Done';
        const updatedFields = fields.map(f => {
            if (f.id === selectedFieldId) {
                const newTasks = (f.tasks || []).map(t => t.id === task.id ? { ...t, status: newStatus } : t);
                return { ...f, tasks: newTasks };
            } return f;
        });
        actions.setFields(updatedFields);
        if (action === 'start') actions.setActiveTaskId(task.id);
        else if (action === 'finish') actions.setActiveTaskId(null);
  }

  const handleLoadLine = (line) => {
      actions.setActiveLineId(line.id);
      actions.setLineType(line.type);
      actions.setPointA(line.points.a);
      actions.setPointB(line.points.b);
      actions.setAPlusPoint(line.points.aplus?.point);
      actions.setAPlusHeading(line.points.aplus?.heading);
      actions.setCurvePoints(line.points.curve || []);
      actions.setPivotCenter(line.points.pivot?.center);
      actions.setPivotRadius(line.points.pivot?.radius);
      actions.setGuidanceLine(line.type);
      if (line.isMulti !== undefined) actions.setIsMultiLineMode(line.isMulti);
      setLinesPanelOpen(false);
      showNotification(`Loaded Line: ${line.name}`, "success");
  };

  const openSaveLineModal = () => {
      const count = fields.find(f => f.id === selectedFieldId)?.lines?.length || 0;
      setTempLineName(`${lineType.replace('_', ' ')} ${count + 1}`);
      setLineNameModalOpen(true);
  }

  const handleSaveLine = () => {
    if (!tempLineName.trim()) { showNotification("Please enter line name", "warning"); return; }
    const newLine = {
        id: Date.now(),
        name: tempLineName,
        type: lineType,
        isMulti: isMultiLineMode,
        date: new Date().toISOString().split('T')[0],
        points: { a: pointA, b: pointB, curve: curvePoints, pivot: { center: pivotCenter, radius: pivotRadius }, aplus: { point: aPlusPoint, heading: aPlusHeading } }
    };
    actions.setFields(prev => prev.map(f => { if (f.id === selectedFieldId) { return { ...f, lines: [...(f.lines || []), newLine] }; } return f; }));
    setLineNameModalOpen(false); setTempLineName(''); actions.setActiveLineId(newLine.id);
    setIsCreating(false); // Stop creating
    setDockMenuOpen(true); // RETURN TO DOCK MENU
    showNotification("Line Saved Successfully", "success");
    if (loadedField && loadedField.id === selectedFieldId) { actions.setLoadedField(prev => ({ ...prev, lines: [...(prev.lines || []), newLine] })); }
  };

  const handleABButtonClick = () => {
      if (!pointA) { resetLines(); actions.setPointA({ ...worldPos }); showNotification("Point A Set. Drive > 10m to set B.", "info"); }
      else if (!pointB) {
          const dist = Math.hypot(worldPos.x - pointA.x, worldPos.y - pointA.y);
          if (dist < 50) { showNotification(`Too short! Drive ${((50 - dist)/5).toFixed(1)}m more.`, "warning"); return; }
          actions.setPointB({ ...worldPos }); actions.setGuidanceLine('STRAIGHT_AB'); showNotification("AB Line Created!", "success"); setTimeout(openSaveLineModal, 500);
      }
      else { resetLines(); actions.setPointA({ ...worldPos }); showNotification("Point A Reset", "info"); }
  };

  // --- A+ LINE SPECIFIC FUNCTIONS ---
  const handleSetAPlus_PointA = () => {
      actions.setAPlusPoint({ ...worldPos });
      showNotification("Point A Set. Select Heading.", "info");
  };

  const handleSetAPlus_HeadingCurrent = () => {
      actions.setAPlusHeading(heading);
      showNotification(`Heading Set to Current: ${heading.toFixed(1)}\u00b0`, "info");
  };

  const handleSetAPlus_HeadingManual = (val) => {
      const num = parseFloat(val);
      if (isNaN(num) || num < 0 || num > 360) {
          showNotification("Invalid heading (0-360)", "warning");
          return;
      }
      actions.setAPlusHeading(num);
      setManualHeadingModalOpen(false);
      showNotification(`Heading Set Manually: ${num.toFixed(1)}\u00b0`, "info");
  };

  const handleConfirmAPlus = () => {
      if (!aPlusPoint) return showNotification("Please Set Point A first", "warning");
      if (aPlusHeading === null || aPlusHeading === undefined) return showNotification("Please Set Heading first", "warning");

      actions.setGuidanceLine('A_PLUS');
      showNotification("A+ Line Created!", "success");
      setTimeout(openSaveLineModal, 500);
  };

  const handleRecordCurve = () => {
      if (isRecordingCurve) {
          actions.setIsRecordingCurve(false);
          if (curvePoints.length > 2) { actions.setGuidanceLine('CURVE'); showNotification("Curve Saved!", "success"); setTimeout(openSaveLineModal, 500); }
          else { showNotification("Curve too short!", "error"); actions.setCurvePoints([]); }
      } else { resetLines(); actions.setIsRecordingCurve(true); actions.setCurvePoints([{...worldPos}]); showNotification("Recording Curve...", "info"); }
  };

  const handleCombinationRecord = () => {
      if (curvePoints.length === 0) actions.setCurvePoints([{ ...worldPos }]);
      actions.setIsRecordingCurve(true);
      setIsCombinationPaused(false);
      showNotification("Recording Combination Line", "info");
  };

  const handleCombinationPause = () => {
      actions.setIsRecordingCurve(false);
      setIsCombinationPaused(true);
      showNotification("Combination Line paused. Drive to straight segment end, then continue.", "info");
  };

  const handleCombinationFinish = () => {
      actions.setIsRecordingCurve(false);
      setIsCombinationPaused(false);
      if (curvePoints.length > 2) {
          actions.setGuidanceLine('COMBINATION');
          showNotification("Combination Line Created!", "success");
          setTimeout(openSaveLineModal, 500);
      } else {
          actions.setCurvePoints([]);
          showNotification("Combination line too short", "warning");
      }
  };

  const handleSetCenter = () => { resetLines(); actions.setPivotCenter({ ...worldPos }); showNotification("Pivot Center Set. Drive to Edge.", "info"); };
  const handleSetRadius = () => { if (!pivotCenter) return showNotification("Set Center first", "warning"); const radius = Math.hypot(worldPos.x - pivotCenter.x, worldPos.y - pivotCenter.y); if (radius < 50) return showNotification("Radius too small!", "warning"); actions.setPivotRadius(radius); actions.setGuidanceLine('PIVOT'); showNotification("Pivot Created!", "success"); setTimeout(openSaveLineModal, 500); };

  const selectLineMode = (type) => {
      actions.setLineType(type);
      setLineModeModalOpen(false);
      // Reset logic but keep mode
      resetLines();
      setIsCreating(true);
      setDockMenuOpen(false); // Close menu when creating starts
      showNotification(`Mode Changed: ${type.replace('_', ' ')}`, "info");
  };

  const startBoundaryCreation = () => {
     setFieldManagerOpen(false);
     setDockMenuOpen(false); // Close menu
     actions.setIsRecordingBoundary(true);
     physics.current.targetSpeed = 5;
     showNotification("Drive to record boundary...", "info");
  };

  // UPDATED FINISH BOUNDARY LOGIC
  const finishBoundaryRecording = () => {
      // 1. Check Minimum Distance (100m) - Reduced for testing
      const pathLengthPx = calculatePathLength(tempBoundary);
      // 50 meters * PIXELS_PER_METER (easier testing)
      if (pathLengthPx < (50 * PIXELS_PER_METER)) {
           showNotification(`Distance too short (< 50m). Run more!`, "warning");
           return;
      }

      // Use Case 1: Check for Self-Intersection (CROSSING) with LIVE POS
      // Add current position to check for the most recent crossing
      const currentPath = [...tempBoundary, worldPos];
      const selfIntersect = checkSelfIntersection(currentPath);

      if (selfIntersect) {
          // INTERSECTION FOUND -> Auto Trim Tail & Head -> Create Polygon
          const { earlySegmentIdx, lateSegmentIdx, point } = selfIntersect;

          const loopPoints = [point];
          // Take only the loop part (exclude start tail and current overshoot head)
          // From end of early segment to start of late segment
          // The intersection happens on segment 'earlySegmentIdx' and 'lateSegmentIdx'
          // We need points between them.
          for (let k = earlySegmentIdx + 1; k <= lateSegmentIdx; k++) {
              loopPoints.push(currentPath[k]);
          }
          loopPoints.push(point); // Close it precisely

          // Update preview and proceed
          setPreviewBoundary(loopPoints);
          actions.setTempBoundary([]);
          actions.setIsRecordingBoundary(false);
          physics.current.targetSpeed = 0;

          const count = viewMode === 'CREATE_FIELD' ? currentFieldBoundaries.length : (fields.find(f => f.id === selectedFieldId)?.boundaries?.length || 0);
          setTempBoundaryName(`Boundary ${count + 1}`);
          setBoundaryNameModalOpen(true);
          showNotification("Excess removed!", "success");
          return;
      }

      // Use Case 2 & 3: Check Distance to Start
      const firstPoint = tempBoundary[0];
      const lastPoint = worldPos;
      const dist = Math.hypot(firstPoint.x - lastPoint.x, firstPoint.y - lastPoint.y);
      const THRESHOLD = 100 * PIXELS_PER_METER; // INCREASED THRESHOLD (~100m range) for easier closing

      if (dist < THRESHOLD) {
          setBoundaryAlertType('AUTO_CLOSE');
          setBoundaryAlertOpen(true);
      } else {
          setBoundaryAlertType('INCOMPLETE');
          setBoundaryAlertOpen(true);
      }
  };

  const handleBoundaryAlertConfirm = (choice) => {
      setBoundaryAlertOpen(false);

      if (boundaryAlertType === 'AUTO_CLOSE') {
          if (choice === 'YES') {
              // Auto close logic
              const closedLoop = [...tempBoundary, tempBoundary[0]]; // Snap to start
              setPreviewBoundary(closedLoop);
              actions.setTempBoundary([]);
              actions.setIsRecordingBoundary(false);
              physics.current.targetSpeed = 0;

              const count = viewMode === 'CREATE_FIELD' ? currentFieldBoundaries.length : (fields.find(f => f.id === selectedFieldId)?.boundaries?.length || 0);
              setTempBoundaryName(`Boundary ${count + 1}`);
              setBoundaryNameModalOpen(true);
              showNotification("Boundary closed", "success");
          } else {
               showNotification("Continue recording...", "info");
          }
      } else if (boundaryAlertType === 'INCOMPLETE') {
          if (choice === 'CONTINUE') {
               showNotification("Continue recording...", "info");
          } else {
              // Cancel
              cancelBoundaryRecording();
          }
      }
  };

  const handleSaveBoundary = () => {
      if (!tempBoundaryName.trim()) {
          showNotification("Please enter boundary name", "warning");
          return;
      }

      // Use preview boundary as final data
      const finalPoints = previewBoundary || tempBoundary;

      const newBoundaryObj = { name: tempBoundaryName, points: finalPoints };
      let updatedBoundaries = [];

      if (viewMode === 'CREATE_FIELD') {
          // Add new boundary to list
          updatedBoundaries = [...currentFieldBoundaries, newBoundaryObj];
          actions.setCurrentFieldBoundaries(updatedBoundaries);
          // Set as active immediately for preview
          actions.setActiveBoundaryIdx(updatedBoundaries.length - 1);
      } else {
          // Update existing field
          const activeField = fields.find(f => f.id === selectedFieldId);
          updatedBoundaries = [...(activeField.boundaries || []), newBoundaryObj];

          const updatedFields = fields.map(f => {
              if (f.id === selectedFieldId) {
                  return { ...f, boundaries: updatedBoundaries };
              }
              return f;
          });
          actions.setFields(updatedFields);

          // Force update loaded field to reflect changes immediately
          const updatedActiveField = updatedFields.find(f => f.id === selectedFieldId);
          actions.setLoadedField(updatedActiveField);

          actions.setActiveBoundaryIdx(updatedBoundaries.length - 1);
      }

      setBoundaryNameModalOpen(false);
      setPreviewBoundary(null);
      actions.setTempBoundary([]);
      setTempBoundaryName('');
      actions.setIsRecordingBoundary(false);
      setDockMenuOpen(true);
      showNotification("Boundary Saved & Active!", "success");
  }

  const cancelBoundaryRecording = () => {
    actions.setIsRecordingBoundary(false);
    physics.current.targetSpeed = 0;
    actions.setTempBoundary([]);
    setPreviewBoundary(null);
    setDockMenuOpen(true);
    showNotification("Recording Cancelled", "info");
  };

  // Custom Delete Modal Handler
  const confirmDelete = (type, id, index) => {
      setItemToDelete({ type, id, index });
      setDeleteModalOpen(true);
  };

  const executeDelete = () => {
      if (!itemToDelete) return;
      const { type, id, index } = itemToDelete;

      if (type === 'boundary') {
            const updatedFields = fields.map(f => {
                if (f.id === selectedFieldId) {
                    const newBounds = (f.boundaries || []).filter((_, i) => i !== index);
                    return { ...f, boundaries: newBounds };
                }
                return f;
            });
            actions.setFields(updatedFields);

            if (loadedField && loadedField.id === selectedFieldId) {
                const newBounds = (loadedField.boundaries || []).filter((_, i) => i !== index);
                actions.setLoadedField({...loadedField, boundaries: newBounds});
            }
            if (activeBoundaryIdx === index) actions.setActiveBoundaryIdx(0);
            showNotification("Boundary Deleted", "info");
      } else if (type === 'line') {
            const updatedFields = fields.map(f => {
                if (f.id === selectedFieldId) {
                    const newLines = (f.lines || []).filter(l => l.id !== id);
                    return { ...f, lines: newLines };
                }
                return f;
            });
            actions.setFields(updatedFields);

            if (loadedField && loadedField.id === selectedFieldId) {
                const newLines = (loadedField.lines || []).filter(l => l.id !== id);
                actions.setLoadedField({...loadedField, lines: newLines});
            }
            if (activeLineId === id) {
                actions.setActiveLineId(null);
                actions.setGuidanceLine(null);
                resetLines();
            }
            showNotification("Line Deleted", "info");
      } else if (type === 'task') {
            const updatedFields = fields.map(f => {
                if (f.id === selectedFieldId) {
                    const newTasks = (f.tasks || []).filter(t => t.id !== id);
                    return { ...f, tasks: newTasks };
                }
                return f;
            });
            actions.setFields(updatedFields);
            if (activeTaskId === id) {
                actions.setActiveTaskId(null);
            }
            showNotification("Task Deleted", "info");
      }
      setDeleteModalOpen(false);
      setItemToDelete(null);
  }

  const handleDeleteField = () => {
      if (fields.length <= 1) { showNotification("Cannot delete the last field!", "warning"); return; }
      const updatedFields = fields.filter(f => f.id !== selectedFieldId);
      actions.setFields(updatedFields);
      if (updatedFields.length > 0) {
          actions.setSelectedFieldId(updatedFields[0].id);
          if (loadedField && loadedField.id === selectedFieldId) { actions.setLoadedField(null); actions.setCoverageTrail([]); }
      }
      showNotification("Field Deleted", "error");
  };
  const saveNewField = () => {
      if (!newFieldName) return showNotification("Enter field name", "warning");
      const area = (currentFieldBoundaries.reduce((acc, b) => acc + b.points.length, 0) * 0.05).toFixed(1);
      const newField = { id: Date.now(), name: newFieldName, area: area + " ha", lastUsed: "Just now", boundaries: currentFieldBoundaries, lines: [], tasks: [] };
      actions.setFields(prev => [...prev, newField]);
      actions.setSelectedFieldId(newField.id);
      actions.setViewMode('LIST');
      showNotification("Field Saved Successfully", "success");
  };
  const startTaskCreation = () => actions.setViewMode('CREATE_TASK');
  const saveNewTask = (type) => { const newTask = { id: Date.now(), name: `${type} ${new Date().getFullYear()}`, type, date: "Today", status: "Pending" }; const updatedFields = fields.map(f => { if (f.id === selectedFieldId) return { ...f, tasks: [newTask, ...(f.tasks || [])] }; return f; }); actions.setFields(updatedFields); actions.setViewMode('LIST'); showNotification(`Task "${newTask.name}" Created`, "success"); };

  const handleLoadField = () => {
      const field = fields.find(f => f.id === selectedFieldId);
      actions.setLoadedField(field);
      showNotification(`Loaded Field: ${field.name}`, "success");
      setFieldManagerOpen(false);
      actions.setCoverageTrail([]);
      resetLines();
      setDragOffset({x:0, y:0});

      if (field.lines && field.lines.length > 0) {
          const defaultLine = field.lines[0];
          handleLoadLine(defaultLine);
      }
  }

  const getDisplayHeading = () => { let h = heading % 360; if (h < 0) h += 360; return h.toFixed(1); };
  const getRtkColor = () => rtkStatus === 'FIX' ? 'bg-green-500 text-white border-green-400' : 'bg-yellow-500 text-black border-yellow-400';
  const getLineTypeIcon = () => { switch(lineType) { case 'STRAIGHT_AB': return GitCommitHorizontal; case 'A_PLUS': return ArrowUpFromDot; case 'CURVE': return Spline; case 'COMBINATION': return AlignJustify; case 'PIVOT': return CircleDashed; default: return GitCommitHorizontal; } };
  const activeFieldRecord = loadedField || fields.find(f => f.id === selectedFieldId);
  const activeTaskRecord = activeTaskId ? fields.find(f => f.id === selectedFieldId)?.tasks?.find(task => task.id === activeTaskId) : null;
  const activeLineRecord = activeLineId ? (activeFieldRecord?.lines || fields.find(f => f.id === selectedFieldId)?.lines || []).find(line => line.id === activeLineId) : null;
  const getGuidanceModeLabel = () => (activeLineRecord?.type || guidanceLine || lineType || 'NO_LINE').replace(/_/g, ' ');
  const isHeadingUpMap = mapOrientation === 'HEADING_UP';
  const isMap3D = sceneViewMode === '3D';
  const mapRotationDeg = isHeadingUpMap ? -mapVisualHeading : 0;
  const mapRotationRad = mapRotationDeg * Math.PI / 180;
  const sceneRotationDeg = isMap3D ? 0 : mapRotationDeg;
  const vehicleScreenOffsetX = (dragOffset.x * Math.cos(mapRotationRad) - dragOffset.y * Math.sin(mapRotationRad)) * zoomLevel;
  const vehicleScreenOffsetY = (dragOffset.x * Math.sin(mapRotationRad) + dragOffset.y * Math.cos(mapRotationRad)) * zoomLevel * (isMap3D ? 0.64 : 1);
  const vehicleScreenHeading = isHeadingUpMap ? 0 : heading;
  const vehicleScreenScale = Math.max(0.56, Math.min(0.92, zoomLevel * (isMap3D ? 1.02 : 0.98)));
  const gridMinorSize = 160;
  const gridMajorSize = gridMinorSize * 4;
  const gridOffsetX2DMinor = (-worldPos.x + dragOffset.x) % gridMinorSize;
  const gridOffsetY2DMinor = (-worldPos.y + dragOffset.y) % gridMinorSize;
  const gridOffsetX2DMajor = (-worldPos.x + dragOffset.x) % gridMajorSize;
  const gridOffsetY2DMajor = (-worldPos.y + dragOffset.y) % gridMajorSize;

  const renderCompassWidget = () => {
      const isDark = theme === 'dark';
      const face = isDark ? '#020617' : '#f8fafc';
      const ring = isDark ? '#334155' : '#cbd5e1';
      const muted = isDark ? '#94a3b8' : '#64748b';

      return (
          <div
              className={`absolute left-4 top-4 z-30 w-[120px] rounded-xl border ${t.borderCard} ${t.bgCard} shadow-lg backdrop-blur p-2 flex flex-col gap-2`}
              onPointerDown={(e) => e.stopPropagation()}
              onPointerMove={(e) => e.stopPropagation()}
              onPointerUp={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
          >
              <div className="flex items-center gap-2">
              <svg width="58" height="58" viewBox="0 0 82 82" aria-label="Compass" className="shrink-0">
                  <circle cx="41" cy="41" r="37" fill={face} stroke={ring} strokeWidth="2.2" />
                  <circle cx="41" cy="41" r="28" fill="none" stroke={ring} strokeWidth="1" opacity="0.55" />
                  {[0, 45, 90, 135, 180, 225, 270, 315].map((deg) => {
                      const rad = (deg - 90) * Math.PI / 180;
                      const outer = 35;
                      const inner = deg % 90 === 0 ? 27 : 31;
                      return (
                          <line
                              key={deg}
                              x1={41 + Math.cos(rad) * inner}
                              y1={41 + Math.sin(rad) * inner}
                              x2={41 + Math.cos(rad) * outer}
                              y2={41 + Math.sin(rad) * outer}
                              stroke={muted}
                              strokeWidth={deg % 90 === 0 ? 2 : 1}
                          />
                      );
                  })}
                  <text x="41" y="15" textAnchor="middle" fontSize="10" fontWeight="900" fill="#ef4444">N</text>
                  <text x="41" y="73" textAnchor="middle" fontSize="8" fontWeight="800" fill={muted}>S</text>
                  <text x="72" y="44" textAnchor="middle" fontSize="8" fontWeight="800" fill={muted}>E</text>
                  <text x="10" y="44" textAnchor="middle" fontSize="8" fontWeight="800" fill={muted}>W</text>
                  <g transform={`rotate(${heading}, 41, 41)`}>
                      <path d="M41 11 L47 41 L41 36 L35 41 Z" fill="#ef4444" stroke="#991b1b" strokeWidth="1" />
                      <path d="M41 71 L36 43 L41 48 L46 43 Z" fill="#64748b" stroke="#334155" strokeWidth="1" />
                  </g>
                  <circle cx="41" cy="41" r="3.5" fill="#2563eb" stroke="white" strokeWidth="1.5" />
              </svg>
                  <div className="min-w-0">
                      <div className={`text-[9px] uppercase font-black ${t.textSub}`}>HDG</div>
                      <div className={`text-lg font-black leading-none ${t.textMain}`}>{`${getDisplayHeading()}\u00b0`}</div>
                      <div className={`text-[10px] uppercase font-black text-blue-500`}>{getCardinalShortDirection(heading)}</div>
                  </div>
              </div>

               <div className="w-full">
                  <div className={`grid grid-cols-2 gap-1 p-1 rounded-lg ${isDark ? 'bg-slate-800' : 'bg-gray-100'}`}>
                  {['2D', '3D'].map((mode) => (
                      <button
                          key={mode}
                          onClick={(e) => {
                              e.stopPropagation();
                              handleSceneViewChange(mode);
                          }}
                          className={`py-1 rounded-md text-[11px] font-black transition ${sceneViewMode === mode ? 'bg-blue-600 text-white shadow' : `${t.textSub} hover:brightness-95`}`}
                      >
                          {mode}
                      </button>
                  ))}
                  </div>
              </div>
          </div>
      );
  };

  const renderFeatureStatusStrip = () => {
      const tiles = [
          { key: 'terrain', label: 'Terrain', value: featureSettings.terrainCompensation ? 'ON' : 'OFF', icon: Activity, active: featureSettings.terrainCompensation },
          { key: 'isobus', label: 'ISOBUS', value: featureSettings.isobusUT ? 'UT/TC' : 'OFF', icon: Cpu, active: featureSettings.isobusUT },
          { key: 'camera', label: 'Camera', value: featureSettings.wiredCamera || featureSettings.wirelessCamera ? 'LIVE' : 'OFF', icon: Video, active: featureSettings.wiredCamera || featureSettings.wirelessCamera, onClick: () => setCameraPanelOpen(true) },
          { key: 'obd', label: 'OBD', value: featureSettings.obd ? 'OK' : 'OFF', icon: Gauge, active: featureSettings.obd, onClick: () => setDiagnosticsPanelOpen(true) },
          { key: 'lift', label: 'Lift', value: featureSettings.liftSensor ? 'AUTO' : 'MAN', icon: ArrowUpFromDot, active: featureSettings.liftSensor },
          { key: 'steer', label: 'Steer', value: featureSettings.canbusSteerReady ? 'CAN' : featureSettings.pwmSteerReady ? 'PWM' : 'MOTOR', icon: SteeringWheelIcon, active: true }
      ];

      return (
          <div
              className={`absolute left-[154px] top-4 z-30 max-w-[calc(100%-340px)] overflow-x-auto rounded-xl border ${t.borderCard} ${theme === 'dark' ? 'bg-slate-950/86 shadow-black/30' : 'bg-white/82 shadow-slate-200/70'} backdrop-blur p-1.5 shadow-lg`}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
          >
              <div className="flex gap-1.5 min-w-max">
                  {tiles.map((tile) => (
                      <button
                          key={tile.key}
                          onClick={tile.onClick}
                          className={`shrink-0 min-w-[74px] px-2.5 py-1.5 rounded-lg border ${theme === 'dark' ? 'border-slate-700 bg-slate-900/88' : 'border-gray-200 bg-white/90'} flex items-center gap-2 ${tile.onClick ? 'hover:brightness-95 active:scale-95' : ''}`}
                      >
                          <tile.icon className={`w-3.5 h-3.5 ${tile.active ? 'text-green-500' : t.textDim}`} />
                          <div className="text-left leading-tight">
                              <div className={`text-[8px] font-black uppercase ${t.textSub}`}>{tile.label}</div>
                              <div className={`text-[11px] font-black ${tile.active ? 'text-green-500' : t.textMain}`}>{tile.value}</div>
                          </div>
                      </button>
                  ))}
              </div>
          </div>
      );
  };

  const renderGuidanceLightbar = () => {
      const abs = Math.abs(crossTrackError);
      const direction = getXteDirection();
      const litBars = Math.min(4, Math.ceil(abs / 3));
      const barTone = abs >= 10 ? 'bg-red-500' : abs >= 4 ? 'bg-yellow-500' : 'bg-blue-500';

      return (
          <div className={`h-[58px] min-w-[290px] max-w-[390px] w-full rounded-xl border-2 px-4 flex items-center gap-4 justify-center shadow-sm ${getXteTone()}`}>
              <div className="flex items-end gap-1.5 h-8">
                  {[-4, -3, -2, -1, 0, 1, 2, 3, 4].map((step) => {
                      const active = step === 0 || (direction === 'LEFT' && step < 0 && Math.abs(step) <= litBars) || (direction === 'RIGHT' && step > 0 && step <= litBars);
                      const height = step === 0 ? 'h-8' : Math.abs(step) === 1 ? 'h-6' : Math.abs(step) === 2 ? 'h-5' : 'h-4';
                      return (
                          <div
                              key={step}
                              className={`w-2 rounded-full ${height} ${step === 0 ? 'bg-slate-900 dark:bg-white' : active ? barTone : 'bg-slate-300/70 dark:bg-slate-700'}`}
                          />
                      );
                  })}
              </div>
              <div className="flex flex-col items-center w-24">
                  <span className="text-3xl font-black leading-none">{abs.toFixed(abs >= 10 ? 0 : 1)}</span>
                  <span className="text-[9px] uppercase font-black tracking-widest opacity-80">cm {direction}</span>
              </div>
          </div>
      );
  };

  const renderMissionOverview = () => (
      <div
          className={`absolute left-4 bottom-4 z-20 w-[300px] rounded-xl border ${t.borderCard} ${t.bgCard} shadow-lg backdrop-blur p-3`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
      >
          <div className="grid grid-cols-2 gap-2">
              <div className={`rounded-lg border ${t.borderCard} ${theme === 'dark' ? 'bg-slate-900/70' : 'bg-white/70'} px-3 py-2 min-w-0`}>
                  <div className={`text-[9px] uppercase font-black ${t.textSub}`}>Field</div>
                  <div className={`text-sm font-black truncate ${t.textMain}`}>{activeFieldRecord?.name || 'No Field'}</div>
              </div>
              <div className={`rounded-lg border ${t.borderCard} ${theme === 'dark' ? 'bg-slate-900/70' : 'bg-white/70'} px-3 py-2 min-w-0`}>
                  <div className={`text-[9px] uppercase font-black ${t.textSub}`}>Line</div>
                  <div className={`text-sm font-black truncate ${t.textMain}`}>{activeLineRecord?.name || getGuidanceModeLabel()}</div>
              </div>
              <div className={`rounded-lg border ${t.borderCard} ${theme === 'dark' ? 'bg-slate-900/70' : 'bg-white/70'} px-3 py-2 min-w-0`}>
                  <div className={`text-[9px] uppercase font-black ${t.textSub}`}>Task</div>
                  <div className={`text-sm font-black truncate ${activeTaskRecord ? 'text-blue-500' : t.textMain}`}>{activeTaskRecord?.name || 'No Active Task'}</div>
              </div>
              <div className={`rounded-lg border ${t.borderCard} ${theme === 'dark' ? 'bg-slate-900/70' : 'bg-white/70'} px-3 py-2 min-w-0`}>
                  <div className={`text-[9px] uppercase font-black ${t.textSub}`}>Implement</div>
                  <div className={`text-sm font-black truncate ${t.textMain}`}>{implementSettings.width.toFixed(1)} m / {workedArea.toFixed(2)} ha</div>
              </div>
          </div>
      </div>
  );

  const FeatureToggle = ({ label, detail, featureKey, icon: Icon = CheckCircle2 }) => (
      <button
          onClick={() => toggleFeatureSetting(featureKey)}
          className={`w-full p-4 rounded-xl border ${featureSettings[featureKey] ? 'border-green-500/50 bg-green-500/10' : `${t.borderCard} ${t.bgInput}`} flex items-center justify-between text-left`}
      >
          <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${featureSettings[featureKey] ? 'bg-green-500 text-white' : `${theme === 'dark' ? 'bg-slate-800' : 'bg-white'} ${t.textDim}`}`}>
                  <Icon className="w-5 h-5" />
              </div>
              <div>
                  <div className={`font-bold ${t.textMain}`}>{label}</div>
                  <div className={`text-xs ${t.textSub}`}>{detail}</div>
              </div>
          </div>
          <div className={`w-12 h-7 rounded-full p-1 transition-colors ${featureSettings[featureKey] ? 'bg-green-500' : 'bg-slate-400'}`}>
              <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${featureSettings[featureKey] ? 'translate-x-5' : ''}`}></div>
          </div>
      </button>
  );

  const renderCameraPanel = () => (
      <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
          <div className={`${t.bgPanel} border ${t.borderCard} rounded-2xl shadow-2xl w-full max-w-4xl max-h-[88vh] overflow-hidden flex flex-col`}>
              <div className={`p-4 border-b ${t.divider} flex items-center justify-between`}>
                  <div className="flex items-center gap-3">
                      <Video className="w-6 h-6 text-blue-500" />
                      <div>
                          <div className={`font-black ${t.textMain}`}>Camera Monitor</div>
                          <div className={`text-xs ${t.textSub}`}>Implement and rear safety feeds</div>
                      </div>
                  </div>
                  <button onClick={() => setCameraPanelOpen(false)} className={`p-2 rounded-lg border ${t.borderCard} ${t.textMain}`}><X className="w-5 h-5" /></button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 overflow-y-auto">
                  {[
                      { label: 'Rear Implement', active: featureSettings.wiredCamera },
                      { label: 'Headland / Blind Spot', active: featureSettings.wirelessCamera }
                  ].map((feed) => (
                      <div key={feed.label} className={`aspect-video rounded-xl border ${t.borderCard} ${theme === 'dark' ? 'bg-slate-950' : 'bg-slate-900'} relative overflow-hidden`}>
                          <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'linear-gradient(45deg, rgba(148,163,184,.25) 25%, transparent 25%, transparent 50%, rgba(148,163,184,.25) 50%, rgba(148,163,184,.25) 75%, transparent 75%, transparent)', backgroundSize: '28px 28px' }}></div>
                          <div className="absolute top-3 left-3 px-3 py-1 rounded bg-black/70 text-white text-xs font-bold">{feed.label}</div>
                          <div className={`absolute bottom-3 right-3 px-3 py-1 rounded text-xs font-black ${feed.active ? 'bg-green-500 text-white' : 'bg-slate-600 text-slate-200'}`}>{feed.active ? 'LIVE' : 'OFFLINE'}</div>
                          <div className="absolute inset-0 flex items-center justify-center">
                              <Video className={`w-14 h-14 ${feed.active ? 'text-green-400' : 'text-slate-500'}`} />
                          </div>
                      </div>
                  ))}
              </div>
              <div className={`p-4 border-t ${t.divider} flex gap-3 justify-end`}>
                  <button onClick={() => toggleFeatureSetting('wiredCamera')} className={`px-4 py-2 rounded-lg border ${t.borderCard} ${t.textMain}`}>Toggle Wired</button>
                  <button onClick={() => toggleFeatureSetting('wirelessCamera')} className={`px-4 py-2 rounded-lg border ${t.borderCard} ${t.textMain}`}>Toggle Wireless</button>
              </div>
          </div>
      </div>
  );

  const renderDiagnosticsPanel = () => (
      <div className="absolute inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
          <div className={`${t.bgPanel} border ${t.borderCard} rounded-2xl shadow-2xl w-full max-w-4xl max-h-[88vh] overflow-hidden flex flex-col`}>
              <div className={`p-4 border-b ${t.divider} flex items-center justify-between`}>
                  <div className="flex items-center gap-3">
                      <Cpu className="w-6 h-6 text-blue-500" />
                      <div>
                          <div className={`font-black ${t.textMain}`}>Diagnostics Center</div>
                          <div className={`text-xs ${t.textSub}`}>Version, scenario, hardware and parameter health</div>
                      </div>
                  </div>
                  <button onClick={() => setDiagnosticsPanelOpen(false)} className={`p-2 rounded-lg border ${t.borderCard} ${t.textMain}`}><X className="w-5 h-5" /></button>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-5 overflow-y-auto">
                  {[
                      ['Terminal', 'v24.102.3', 'OK'],
                      ['GNSS Receiver', rtkStatus, 'OK'],
                      ['IMU', featureSettings.terrainCompensation ? 'Compensating' : 'Bypass', featureSettings.terrainCompensation ? 'OK' : 'WARN'],
                      ['Steering Motor', featureSettings.electricPowerSteering ? 'Assist Ready' : 'Manual', 'OK'],
                      ['CANBUS', featureSettings.canbusSteerReady ? 'Online' : 'Offline', featureSettings.canbusSteerReady ? 'OK' : 'WARN'],
                      ['PWM', featureSettings.pwmSteerReady ? 'Enabled' : 'Disabled', featureSettings.pwmSteerReady ? 'OK' : 'OFF'],
                      ['OBD', featureSettings.obd ? 'Live Data' : 'Disabled', featureSettings.obd ? 'OK' : 'OFF'],
                      ['Logs', 'Ready to upload', 'OK']
                  ].map(([label, value, status]) => (
                      <div key={label} className={`${theme === 'dark' ? 'bg-slate-900' : 'bg-gray-50'} border ${t.borderCard} rounded-xl p-4`}>
                          <div className={`text-[10px] uppercase font-black ${t.textSub}`}>{label}</div>
                          <div className={`text-sm font-bold ${t.textMain} mt-1`}>{value}</div>
                          <div className={`text-[10px] font-black mt-3 ${status === 'OK' ? 'text-green-500' : status === 'WARN' ? 'text-yellow-500' : 'text-slate-500'}`}>{status}</div>
                      </div>
                  ))}
              </div>
              <div className={`p-4 border-t ${t.divider} flex justify-end gap-3`}>
                  <button onClick={() => showNotification('Diagnostic log upload queued', 'info')} className={`px-4 py-2 rounded-lg border ${t.borderCard} ${t.textMain}`}>Upload Logs</button>
                  <button onClick={() => setDiagnosticsPanelOpen(false)} className="px-4 py-2 rounded-lg bg-blue-600 text-white font-bold">Done</button>
              </div>
          </div>
      </div>
  );

  const get3DViewHeading = () => {
      if (!isHeadingUpMap) return 0;
      return mapVisualHeading;
  };

  const toVehicleLocal3D = (dx, dy) => {
      const h = get3DViewHeading() * Math.PI / 180;
      return {
          lateral: dx * Math.cos(h) + dy * Math.sin(h),
          forward: dx * Math.sin(h) - dy * Math.cos(h)
      };
  };

  const getProjected3DPoint = (pt, options = {}) => {
      if (!pt) return null;
      const isLocalPoint = options.local === true;
      const dx = (pt.x - worldPos.x + dragOffset.x);
      const dy = (pt.y - worldPos.y + dragOffset.y);

      const { lateral, forward } = (() => {
          if (isHeadingUpMap) {
              if (isLocalPoint) {
                  const dragLocal = toVehicleLocal3D(dragOffset.x, dragOffset.y);
                  return {
                      lateral: pt.x + dragLocal.lateral,
                      forward: pt.y + dragLocal.forward
                  };
              }
              return toVehicleLocal3D(dx, dy);
          }
          return {
              lateral: dx,
              forward: -dy
          };
      })();
      const horizonY = 66;
      const vehicleY = 470;
      const depth = 680;
      const forwardGain = options.forwardGain ?? 1;
      const projectedForward = forward * forwardGain;
      const denom = 1 + projectedForward / depth;
      if (!Number.isFinite(denom) || denom <= 0.05) return null;

      const perspective = 1 / denom;
      const usePerspectiveScale = options.usePerspectiveScale !== false;
      const lateralGain = options.lateralGain ?? 1;
      const lateralScale = usePerspectiveScale ? perspective * lateralGain : 1;
      const x = 500 + lateral * lateralScale;
      const y = horizonY + (vehicleY - horizonY) * perspective;
      if (Number.isFinite(options.minY) && y < options.minY) return null;
      if (Number.isFinite(options.maxY) && y > options.maxY) return null;
      if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
      return { x, y, perspective, lateralScale };
  };

  const getProjected3DPath = (points, options = {}) => {
      let d = '';
      let drawing = false;

      points.forEach((pt) => {
          const projected = getProjected3DPoint(pt, options);
          if (!projected) {
              drawing = false;
              return;
          }
          d += `${drawing ? 'L' : 'M'}${projected.x.toFixed(1)},${projected.y.toFixed(1)} `;
          drawing = true;
      });

      return d.trim();
  };

  const densifyPoints = (points, maxStep = 42) => {
      if (!points || points.length < 2) return points || [];
      const dense = [];
      for (let i = 0; i < points.length - 1; i++) {
          const start = points[i];
          const end = points[i + 1];
          const dist = Math.hypot(end.x - start.x, end.y - start.y);
          const steps = Math.max(1, Math.ceil(dist / maxStep));
          for (let step = 0; step < steps; step++) {
              const tStep = step / steps;
              dense.push({
                  x: start.x + (end.x - start.x) * tStep,
                  y: start.y + (end.y - start.y) * tStep
              });
          }
      }
      dense.push(points[points.length - 1]);
      return dense;
  };

  const parsePolylinePoints = (pointsText) => {
      if (!pointsText) return [];
      return pointsText.trim().split(/\s+/).map((pair) => {
          const [x, y] = pair.split(',').map(Number);
          return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
      }).filter(Boolean);
  };

  const get3DGridBounds = () => {
      const step = gridMinorSize;
      const extent = 3600 / Math.max(zoomLevel, 0.35);
      return {
          minX: Math.floor((worldPos.x - extent) / step) * step,
          maxX: Math.ceil((worldPos.x + extent) / step) * step,
          minY: Math.floor((worldPos.y - extent) / step) * step,
          maxY: Math.ceil((worldPos.y + extent) / step) * step
      };
  };

  const clipLineToBounds = (origin, unit, bounds) => {
      let tMin = -Infinity;
      let tMax = Infinity;
      const axes = [
          { pos: origin.x, dir: unit.x, min: bounds.minX, max: bounds.maxX },
          { pos: origin.y, dir: unit.y, min: bounds.minY, max: bounds.maxY }
      ];

      for (const axis of axes) {
          if (Math.abs(axis.dir) < 0.000001) {
              if (axis.pos < axis.min || axis.pos > axis.max) return null;
              continue;
          }

          const a = (axis.min - axis.pos) / axis.dir;
          const b = (axis.max - axis.pos) / axis.dir;
          tMin = Math.max(tMin, Math.min(a, b));
          tMax = Math.min(tMax, Math.max(a, b));
      }

      if (!Number.isFinite(tMin) || !Number.isFinite(tMax) || tMin >= tMax) return null;
      return { start: tMin, end: tMax };
  };

  const getGuidanceLineSpan = () => 90000 / Math.max(zoomLevel, 0.35);

  const getGuidanceLineSegmentAroundVehicle = (base, unit, offset = 0) => {
      const normal = { x: -unit.y, y: unit.x };
      const origin = {
          x: base.x + normal.x * offset,
          y: base.y + normal.y * offset
      };
      if (isMap3D) {
          const clipped = clipLineToBounds(origin, unit, get3DGridBounds());
          if (clipped) {
              return {
                  start: {
                      x: origin.x + unit.x * clipped.start,
                      y: origin.y + unit.y * clipped.start
                  },
                  end: {
                      x: origin.x + unit.x * clipped.end,
                      y: origin.y + unit.y * clipped.end
                  }
              };
          }
      }

      const closest = (worldPos.x - origin.x) * unit.x + (worldPos.y - origin.y) * unit.y;
      const span = getGuidanceLineSpan();
      const start = closest - span;
      const end = closest + span;

      return {
          start: {
              x: origin.x + unit.x * start,
              y: origin.y + unit.y * start
          },
          end: {
              x: origin.x + unit.x * end,
              y: origin.y + unit.y * end
          }
      };
  };

  const sampleGuidanceLinePoints = (base, unit, offset = 0, steps = 156) => {
      const segment = getGuidanceLineSegmentAroundVehicle(base, unit, offset);

      return Array.from({ length: steps + 1 }, (_, idx) => {
          const tStep = idx / steps;
          return {
              x: segment.start.x + (segment.end.x - segment.start.x) * tStep,
              y: segment.start.y + (segment.end.y - segment.start.y) * tStep
          };
      });
  };

  const sampleCirclePoints = (center, radius, segments = 180) => (
      Array.from({ length: segments + 1 }, (_, idx) => {
          const a = (idx / segments) * Math.PI * 2;
          return {
              x: center.x + Math.cos(a) * radius,
              y: center.y + Math.sin(a) * radius
          };
      })
  );

  const renderProjected3DPath = (key, points, stroke, strokeWidth = 2, options = {}) => {
      const map3DLateralGain = 0.62;
      const map3DForwardGain = 1.18;
      const projectionOptions = options.ground
          ? { lateralGain: map3DLateralGain, forwardGain: map3DForwardGain, usePerspectiveScale: true }
          : { lateralGain: map3DLateralGain, forwardGain: map3DForwardGain, usePerspectiveScale: true, minY: 96, maxY: 760 };
      const projectedPoints = densifyPoints(points, options.maxStep || 42)
          .map((pt) => getProjected3DPoint(pt, { ...projectionOptions, ...options.projection }))
          .filter(Boolean);
      if (options.solid && projectedPoints.length > 1) {
          return (
              <polyline
                  key={key}
                  {...(options.ground ? { 'data-ground-3d-path': key } : { 'data-guidance-3d-path': key })}
                  points={projectedPoints.map((pt) => `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join(' ')}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                  strokeLinecap={options.cap || 'round'}
                  strokeLinejoin="round"
                  strokeOpacity={options.opacity ?? 1}
                  vectorEffect="non-scaling-stroke"
              />
          );
      }

      const d = getProjected3DPath(densifyPoints(points, options.maxStep || 42), {
          ...projectionOptions,
          ...options.projection
      });
      if (!d) return null;
      return (
          <path
              key={key}
              {...(options.ground ? { 'data-ground-3d-path': key } : { 'data-guidance-3d-path': key })}
              d={d}
              fill="none"
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeLinecap={options.cap || (options.ground ? 'round' : 'butt')}
              strokeLinejoin="round"
              strokeOpacity={options.opacity ?? 1}
              strokeDasharray={options.dash}
          />
      );
  };

  const getGroundLocalWorldPoint = (x, y) => ({ x, y });

  const sampleGroundSegment = (lateralA, forwardA, lateralB, forwardB, steps = 48) => (
      Array.from({ length: steps + 1 }, (_, idx) => {
          const tStep = idx / steps;
          return getGroundLocalWorldPoint(
              lateralA + (lateralB - lateralA) * tStep,
              forwardA + (forwardB - forwardA) * tStep
          );
      })
  );

  const renderGroundPlane3D = () => {
      if (!isMap3D) return null;
      const elements = [];
      const step = gridMinorSize;
      const majorStep = gridMajorSize;
      const { minX, maxX, minY, maxY } = get3DGridBounds();
      const majorOpacity = theme === 'dark' ? 0.2 : 0.13;
      const minorOpacity = theme === 'dark' ? 0.095 : 0.055;

      for (let x = minX; x <= maxX; x += step) {
          const major = Math.abs(x % majorStep) < 0.001;
          elements.push(renderProjected3DPath(
              `ground-world-v-${x}`,
              [{ x, y: minY }, { x, y: maxY }],
              t.gridColor1,
              major ? 1.1 : 0.75,
              { opacity: major ? majorOpacity : minorOpacity, maxStep: 120, ground: true }
          ));
      }

      for (let y = minY; y <= maxY; y += step) {
          const major = Math.abs(y % majorStep) < 0.001;
          elements.push(renderProjected3DPath(
              `ground-world-h-${y}`,
              [{ x: minX, y }, { x: maxX, y }],
              t.gridColor1,
              major ? 1.1 : 0.75,
              { opacity: major ? majorOpacity : minorOpacity, maxStep: 120, ground: true }
          ));
      }

      return (
          <svg
              data-ground-plane="3d"
              className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-[3]"
              viewBox="0 0 1000 700"
              preserveAspectRatio="none"
              style={{
                  opacity: viewTransitioning ? 0.72 : 1,
                  transform: viewTransitioning ? 'scale(0.985)' : 'scale(1)',
                  transformOrigin: '50% 60%',
                  transition: 'opacity 0.28s ease, transform 0.28s ease',
                  willChange: 'opacity, transform'
              }}
          >
              {elements}
          </svg>
      );
  };

  const renderGuidanceLine3D = () => {
      if (!isMap3D) return null;

      const elements = [];
      const guide = guidanceRef.current;
      const metrics = getGuidanceMetrics(guide, { ...worldPos, heading });
      const currentLaneIndex = metrics.validLine && guide?.width > 0 ? Math.round(metrics.xte / guide.width) : 0;
      const highlightedLane = activeLaneRef.current !== null ? activeLaneRef.current : currentLaneIndex;
      const activeStroke = theme === 'dark' ? '#60a5fa' : '#2563eb';
      const laneStroke = theme === 'dark' ? '#38bdf8' : '#60a5fa';
      const previewStroke = theme === 'dark' ? '#fb7185' : '#ef4444';
      const boundaryStroke = theme === 'dark' ? '#94a3b8' : '#64748b';
      const alignWithGridProjection = { minY: undefined };

      const boundaries = (loadedField?.boundaries || []).concat(viewMode === 'CREATE_FIELD' ? currentFieldBoundaries : []);
      boundaries.forEach((bound, bIdx) => {
          const pts = (bound.points || bound || []).filter(Boolean);
          if (pts.length > 1) {
              elements.push(renderProjected3DPath(
                  `boundary-${bIdx}`,
                  [...pts, pts[0]],
                  bIdx === activeBoundaryIdx ? '#eab308' : boundaryStroke,
                  bIdx === activeBoundaryIdx ? 2.8 : 2,
                  { dash: '8 8', opacity: bIdx === activeBoundaryIdx ? 0.9 : 0.55, maxStep: 38 }
              ));
          }
      });

      if (previewBoundary?.length > 1) {
          elements.push(renderProjected3DPath('preview-boundary', [...previewBoundary, previewBoundary[0]], '#22c55e', 3, { dash: '8 7', opacity: 0.9 }));
      }

      if (!guidanceLine && pointA && lineType === 'STRAIGHT_AB') {
          elements.push(renderProjected3DPath('straight-preview', [pointA, worldPos], previewStroke, 3, { dash: '12 9' }));
      }

      if (isRecordingCurve && curvePoints.length > 0) {
          elements.push(renderProjected3DPath('curve-recording', [...curvePoints, worldPos], previewStroke, 3));
      }

      if (!guidanceLine && pivotCenter && lineType === 'PIVOT') {
          elements.push(renderProjected3DPath('pivot-radius-preview', [pivotCenter, worldPos], previewStroke, 3, { dash: '12 9' }));
      }

      if (!showGuidanceLines) return elements;

      if (guidanceLine === 'STRAIGHT_AB' && pointA && pointB) {
          const dx = pointB.x - pointA.x;
          const dy = pointB.y - pointA.y;
          const length = Math.hypot(dx, dy);
          if (length <= 0.001) return elements;
          const unit = { x: dx / length, y: dy / length };

          if (isMultiLineMode) {
              const width = implementSettings.width * PIXELS_PER_METER;
              for (let i = highlightedLane - 6; i <= highlightedLane + 6; i++) {
                  const active = i === highlightedLane;
                  elements.push(renderProjected3DPath(
                      `straight-3d-${i}`,
                      sampleGuidanceLinePoints(pointA, unit, (width * i) + manualOffset),
                      active ? activeStroke : laneStroke,
                      active ? 3.2 : 1.35,
                      { opacity: active ? 1 : 0.36, maxStep: 42, projection: alignWithGridProjection, solid: true }
                  ));
              }
          } else {
              elements.push(renderProjected3DPath(
                  'straight-3d-target',
                  sampleGuidanceLinePoints(pointA, unit, manualOffset),
                  activeStroke,
                  3.2,
                  { maxStep: 42, projection: alignWithGridProjection, solid: true }
              ));
          }
      }

      if ((guidanceLine === 'A_PLUS' || (lineType === 'A_PLUS' && !guidanceLine)) && aPlusPoint && aPlusHeading !== null && aPlusHeading !== undefined) {
          const rad = aPlusHeading * Math.PI / 180;
          const unit = { x: Math.sin(rad), y: -Math.cos(rad) };
          const isPreview = !guidanceLine;

          if (isPreview) {
              elements.push(renderProjected3DPath('aplus-preview', sampleGuidanceLinePoints(aPlusPoint, unit, 0), previewStroke, 3, { dash: '12 9', projection: alignWithGridProjection }));
          } else if (isMultiLineMode) {
              const width = implementSettings.width * PIXELS_PER_METER;
              for (let i = highlightedLane - 6; i <= highlightedLane + 6; i++) {
                  const active = i === highlightedLane;
                  elements.push(renderProjected3DPath(
                      `aplus-3d-${i}`,
                      sampleGuidanceLinePoints(aPlusPoint, unit, (width * i) + manualOffset),
                      active ? activeStroke : laneStroke,
                      active ? 3.2 : 1.35,
                      { opacity: active ? 1 : 0.36, maxStep: 42, projection: alignWithGridProjection, solid: true }
                  ));
              }
          } else {
              elements.push(renderProjected3DPath('aplus-3d-target', sampleGuidanceLinePoints(aPlusPoint, unit, manualOffset), activeStroke, 3.2, { maxStep: 42, projection: alignWithGridProjection, solid: true }));
          }
      }

      if (guidanceLine === 'PIVOT' && pivotCenter && pivotRadius) {
          if (isMultiLineMode) {
              const width = implementSettings.width * PIXELS_PER_METER;
              for (let i = highlightedLane - 2; i <= highlightedLane + 2; i++) {
                  const radius = pivotRadius + (i * width) + manualOffset;
                  if (radius <= 0) continue;
                  const active = i === highlightedLane;
                  elements.push(renderProjected3DPath(
                      `pivot-3d-${i}`,
                      sampleCirclePoints(pivotCenter, radius),
                      active ? activeStroke : laneStroke,
                      active ? 3.4 : 1.8,
                      { opacity: active ? 1 : 0.62, maxStep: 34 }
                  ));
              }
          } else {
              const radius = pivotRadius + manualOffset;
              if (radius > 0) {
                  elements.push(renderProjected3DPath('pivot-3d-target', sampleCirclePoints(pivotCenter, radius), activeStroke, 3.8, { maxStep: 34 }));
              }
          }
      }

      if ((guidanceLine === 'CURVE' || guidanceLine === 'COMBINATION') && curvePoints.length > 1) {
          if (isMultiLineMode) {
              const width = implementSettings.width * PIXELS_PER_METER;
              for (let i = highlightedLane - 2; i <= highlightedLane + 2; i++) {
                  const active = i === highlightedLane;
                  const points = parsePolylinePoints(getOffsetPolyline(curvePoints, (i * width) + manualOffset));
                  elements.push(renderProjected3DPath(
                      `curve-3d-${i}`,
                      points,
                      active ? activeStroke : laneStroke,
                      active ? 3.4 : 1.8,
                      { opacity: active ? 1 : 0.62, maxStep: 34 }
                  ));
              }
          } else {
              elements.push(renderProjected3DPath(
                  'curve-3d-target',
                  parsePolylinePoints(getOffsetPolyline(curvePoints, manualOffset)),
                  activeStroke,
                  3.8,
                  { maxStep: 34 }
              ));
          }
      }

      return elements.filter(Boolean);
  };

  const renderGuidanceLine = () => {
    // Check if lines should be shown
    if (isMap3D) return null;
    if (!showGuidanceLines) return null;

    // 1. Current Active Line from Logic
    let currentLaneIndex = 0;

    // Calculate lane index based on physics/position (duplicated logic for render)
    if (guidanceRef.current && guidanceRef.current.type && guidanceRef.current.width > 0) {
         // Re-calculate XTE roughly to find lane
         const guide = guidanceRef.current;
         const p = worldPos; // Current pos
         let xte = 0;

         if (guide.type === 'STRAIGHT_AB' && guide.points.a && guide.points.b) {
            const ax = guide.points.a.x; const ay = guide.points.a.y;
            const bx = guide.points.b.x; const by = guide.points.b.y;
            const dx = bx - ax; const dy = by - ay;
            const len = Math.hypot(dx, dy);
            xte = ((bx - ax) * (p.y - ay) - (by - ay) * (p.x - ax)) / len;
         }
         else if (guide.type === 'A_PLUS' && guide.points.aplus && guide.points.aplus.point) {
             const ax = guide.points.aplus.point.x;
             const ay = guide.points.aplus.point.y;
             const h = guide.points.aplus.heading;
             const rad = h * Math.PI / 180;
             const ux = Math.sin(rad);
             const uy = -Math.cos(rad);
             const vax = p.x - ax; const vay = p.y - ay;
             xte = vax * (-uy) + vay * (ux);
         }
         else if (guide.type === 'PIVOT' && guide.points.pivot && guide.points.pivot.center && guide.points.pivot.radius) {
             const cx = guide.points.pivot.center.x;
             const cy = guide.points.pivot.center.y;
             const r = guide.points.pivot.radius;
             const dist = Math.hypot(p.x - cx, p.y - cy);
             xte = dist - r;
         }
         else if (guide.type === 'CURVE' && guide.points.curve) {
             let minDist = Infinity;
             let bestCross = 0;
             for(let i=0; i<guide.points.curve.length-1; i++) {
                 const p1 = guide.points.curve[i];
                 const p2 = guide.points.curve[i+1];
                 const info = pointToSegmentDistance(p.x, p.y, p1.x, p1.y, p2.x, p2.y);
                 if (info.distance < minDist) {
                     minDist = info.distance;
                     const segLen = Math.hypot(p2.x - p1.x, p2.y - p1.y);
                     bestCross = info.cross / segLen;
                 }
             }
             xte = bestCross;
         }

         currentLaneIndex = Math.round(xte / guide.width);
    }


    if (guidanceLine === 'STRAIGHT_AB' && pointA && pointB) {
      const dx = pointB.x - pointA.x; const dy = pointB.y - pointA.y; const length = Math.sqrt(dx*dx + dy*dy); const ux = dx / length; const uy = dy / length;

      const elements = [];

      if (isMultiLineMode) {
          const w = implementSettings.width * PIXELS_PER_METER;
          const highlightedLane = activeLaneRef.current !== null ? activeLaneRef.current : currentLaneIndex;

          for (let i = highlightedLane - 6; i <= highlightedLane + 6; i++) {
              const offset = (w * i) + manualOffset;
              const isActive = i === highlightedLane;
              const strokeColor = isActive ? "#2563eb" : "#93c5fd";
              const strokeWidth = isActive ? "4" : "2";
              const segment = getGuidanceLineSegmentAroundVehicle(pointA, { x: ux, y: uy }, offset);

              elements.push(
                <line
                    key={`line-${i}`}
                    x1={segment.start.x} y1={segment.start.y}
                    x2={segment.end.x} y2={segment.end.y}
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                />
              );
          }
      } else {
           // Single Line Mode
           const offset = manualOffset;
           const segment = getGuidanceLineSegmentAroundVehicle(pointA, { x: ux, y: uy }, offset);

           elements.push(
               <line
                   key="target-line"
                   x1={segment.start.x} y1={segment.start.y}
                   x2={segment.end.x} y2={segment.end.y}
                   stroke="#2563eb"
                   strokeWidth="4"
               />
           );
      }
      return elements;
    }

    if ((guidanceLine === 'A_PLUS' || (lineType === 'A_PLUS' && !guidanceLine)) && aPlusPoint && aPlusHeading !== null && aPlusHeading !== undefined) {
        const rad = aPlusHeading * Math.PI / 180;
        const ux = Math.sin(rad);
        const uy = -Math.cos(rad);

        const isPreview = !guidanceLine;
        const elements = [];

        if (isPreview) {
             const segment = getGuidanceLineSegmentAroundVehicle(aPlusPoint, { x: ux, y: uy }, 0);
             elements.push(<line key="preview" x1={segment.start.x} y1={segment.start.y} x2={segment.end.x} y2={segment.end.y} stroke="red" strokeWidth="2" strokeDasharray="15, 10" />);
        } else {
             if (isMultiLineMode) {
                const w = implementSettings.width * PIXELS_PER_METER;
                const highlightedLane = activeLaneRef.current !== null ? activeLaneRef.current : currentLaneIndex;

                for (let i = highlightedLane - 6; i <= highlightedLane + 6; i++) {
                    const offset = (w * i) + manualOffset;
                    const isActive = i === highlightedLane;
                    const strokeColor = isActive ? "#2563eb" : "#93c5fd";
                    const strokeWidth = isActive ? "4" : "2";
                    const segment = getGuidanceLineSegmentAroundVehicle(aPlusPoint, { x: ux, y: uy }, offset);

                    elements.push(
                        <line
                            key={`line-${i}`}
                            x1={segment.start.x} y1={segment.start.y}
                            x2={segment.end.x} y2={segment.end.y}
                            stroke={strokeColor}
                            strokeWidth={strokeWidth}
                        />
                    );
                }
             } else {
                const offset = manualOffset;
                const segment = getGuidanceLineSegmentAroundVehicle(aPlusPoint, { x: ux, y: uy }, offset);
                elements.push(
                   <line
                       key="target-line"
                       x1={segment.start.x} y1={segment.start.y}
                       x2={segment.end.x} y2={segment.end.y}
                       stroke="#2563eb"
                       strokeWidth="4"
                   />
               );
             }
        }
        return elements;
    }

    if (guidanceLine === 'PIVOT' && pivotCenter && pivotRadius) {
        const elements = [];
        if (isMultiLineMode) {
            const w = implementSettings.width * PIXELS_PER_METER;
            const highlightedLane = activeLaneRef.current !== null ? activeLaneRef.current : currentLaneIndex;

            // Draw 5 lines (center + 2 each side)
            for (let i = highlightedLane - 2; i <= highlightedLane + 2; i++) {
                const r = pivotRadius + (i * w) + manualOffset;
                if (r > 0) {
                    const isActive = i === highlightedLane;
                    const strokeColor = isActive ? "#2563eb" : "#93c5fd";
                    const strokeWidth = isActive ? "4" : "2";
                    elements.push(
                        <circle
                            key={`pivot-${i}`}
                            cx={pivotCenter.x} cy={pivotCenter.y} r={r}
                            fill="none"
                            stroke={strokeColor}
                            strokeWidth={strokeWidth}
                        />
                    );
                }
            }
        } else {
            // Single Mode
            const r = pivotRadius + manualOffset;
            if (r > 0) {
                elements.push(
                    <circle
                        key="target-pivot"
                        cx={pivotCenter.x} cy={pivotCenter.y} r={r}
                        fill="none"
                        stroke="#2563eb"
                        strokeWidth="4"
                    />
                );
            }
        }
        return elements;
    }

    if ((guidanceLine === 'CURVE' || guidanceLine === 'COMBINATION') && curvePoints.length > 1) {
        const elements = [];

        if (isMultiLineMode) {
            const w = implementSettings.width * PIXELS_PER_METER;
            const highlightedLane = activeLaneRef.current !== null ? activeLaneRef.current : currentLaneIndex;

            // Draw 5 lines (center + 2 each side)
            for (let i = highlightedLane - 2; i <= highlightedLane + 2; i++) {
                const offset = (i * w) + manualOffset;
                const isActive = i === highlightedLane;
                const strokeColor = isActive ? "#2563eb" : "#93c5fd";
                const strokeWidth = isActive ? "4" : "2";

                elements.push(
                    <polyline
                        key={`curve-${i}`}
                        points={getOffsetPolyline(curvePoints, offset)}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={strokeWidth}
                    />
                );
            }
        } else {
            // Single Mode
            elements.push(
                <polyline
                    key="target-curve"
                    points={getOffsetPolyline(curvePoints, manualOffset)}
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="4"
                />
            );
        }
        return elements;
    }

    return null;
  };

  const renderActionDock = () => {
      // 1. Boundary Recording Active? Show controls
      if (isRecordingBoundary) {
          return (
            <div className={`p-2.5 rounded-2xl ${t.bgCard} shadow-xl border ${t.borderCard} flex flex-col gap-2 pointer-events-auto w-[86px]`}>
               <div className={`text-center font-black text-orange-500 uppercase text-[9px] tracking-wider`}>Boundary</div>
               <DockButton theme={t} icon={Square} label="Finish" color="green" onClick={finishBoundaryRecording}/>
               <DockButton theme={t} icon={X} label="Cancel" color="red" onClick={cancelBoundaryRecording}/>
            </div>
          );
      }

      // 4. Default State (Collapsed Symbol)
      // If Auto is engaged, show trim controls - TAKES PRECEDENCE over creation if Auto is active
      if (steeringMode === 'AUTO') {
           return (
            <div className={`p-2.5 rounded-2xl ${t.bgCard} shadow-xl border ${t.borderCard} flex flex-col gap-2 pointer-events-auto w-[86px]`}>
               <span className={`text-[9px] text-center ${t.textSub} font-black uppercase tracking-wider`}>Trim</span>
               <DockButton theme={t} icon={CornerUpLeft} label="L 1cm" color="green" onClick={() => handleTrim('left')}/>
               <DockButton theme={t} icon={CornerUpRight} label="R 1cm" color="green" onClick={() => handleTrim('right')}/>
               <div className={`h-px ${t.divider}`}></div>
               <DockButton theme={t} icon={Pause} label="Pause" color="orange" onClick={toggleSteering}/>
            </div>
           );
      }

      // 2. Creating a Line? Show specific line creation controls
      if (isCreating) {
        let content = null;
        switch (lineType) {
            case 'STRAIGHT_AB':
                let abLabel = "Set A"; let abColor = "blue";
                if (pointA && !pointB) { abLabel = "Set B"; abColor = "red"; } else if (pointA && pointB) { abLabel = "Set A"; abColor = "green"; }

                const handleCancelAB = () => {
                    if (pointA && !pointB) {
                        actions.setPointA(null);
                        showNotification("Reset to Set A", "info");
                    } else {
                        cancelLineCreation();
                    }
                };

                content = ( <><DockButton theme={t} icon={Target} label={abLabel} color={abColor} onClick={handleABButtonClick} /><DockButton theme={t} icon={X} label="Cancel" color="red" onClick={handleCancelAB}/></> );
                break;
            case 'A_PLUS':
                if (!aPlusPoint) {
                    content = (
                      <>
                        <DockButton theme={t} icon={Target} label="Set A" color="blue" onClick={handleSetAPlus_PointA}/>
                        <DockButton theme={t} icon={ArrowLeftRight} label="Shift" color="gray"/>
                        <DockButton theme={t} icon={MapPin} label="Bound" color="orange" onClick={startBoundaryCreation}/>
                        {/* Added Cancel Button */}
                        <div className={`h-px ${t.divider} mx-1`}></div>
                        <DockButton theme={t} icon={X} label="Cancel" color="red" onClick={cancelLineCreation}/>
                      </>
                    );
                } else {
                    content = (
                        <>
                            <DockButton theme={t} icon={RotateCcw} label="Reset A" color="orange" onClick={() => { actions.setAPlusPoint({ ...worldPos }); actions.setAPlusHeading(null); showNotification("Point A Reset to Current Position", "info"); }}/>
                            <DockButton theme={t} icon={Compass} label={aPlusHeading !== null ? `${aPlusHeading.toFixed(0)}\u00b0` : "Head"} color={aPlusHeading !== null ? "green" : "blue"} onClick={handleSetAPlus_HeadingCurrent}/>
                            <DockButton theme={t} icon={Keyboard} label="Input" color="gray" onClick={() => { setManualHeadingModalOpen(true); setTempManualHeading(heading.toFixed(1)); }}/>
                            <div className={`h-px ${t.divider} mx-1`}></div>

                            {aPlusHeading !== null && (
                                <DockButton theme={t} icon={Check} label="OK" color="green" onClick={handleConfirmAPlus}/>
                            )}

                            <DockButton theme={t} icon={X} label="Cancel" color="red" onClick={() => { actions.setAPlusPoint(null); actions.setAPlusHeading(null); }}/>
                        </>
                    );
                }
                break;
            case 'CURVE':
                content = ( <><DockButton theme={t} icon={isRecordingCurve ? Disc : Spline} label={isRecordingCurve ? "Stop" : "Record"} color={isRecordingCurve ? "red" : "blue"} onClick={handleRecordCurve} className={isRecordingCurve ? "animate-pulse" : ""} /><DockButton theme={t} icon={X} label="Cancel" color="red" onClick={cancelLineCreation}/></> );
                break;
            case 'COMBINATION':
                content = (
                    <>
                        <DockButton theme={t} icon={isRecordingCurve ? Pause : Disc} label={isRecordingCurve ? "Pause" : (curvePoints.length > 0 ? "Cont" : "Record")} color={isRecordingCurve ? "orange" : "blue"} onClick={isRecordingCurve ? handleCombinationPause : handleCombinationRecord} className={isRecordingCurve ? "animate-pulse" : ""} />
                        {curvePoints.length > 2 && <DockButton theme={t} icon={Check} label="Finish" color="green" onClick={handleCombinationFinish} />}
                        {isCombinationPaused && <DockButton theme={t} icon={AlignJustify} label="Line" color="gray" onClick={handleCombinationRecord} />}
                        <DockButton theme={t} icon={X} label="Cancel" color="red" onClick={cancelLineCreation}/>
                    </>
                );
                break;
            case 'PIVOT':
                content = ( <><DockButton theme={t} icon={Target} label="Center" color={pivotCenter?"green":"blue"} onClick={handleSetCenter}/><DockButton theme={t} icon={CircleDashed} label="Edge" color={pivotRadius?"green":"blue"} onClick={handleSetRadius}/><DockButton theme={t} icon={X} label="Cancel" color="red" onClick={cancelLineCreation}/></> );
                break;
            default: break;
        }
        return (
            <div className={`p-2.5 rounded-2xl ${t.bgCard} shadow-xl border ${t.borderCard} flex flex-col gap-2 pointer-events-auto w-[86px]`}>
                 <div className={`text-[9px] font-black ${t.textSub} uppercase text-center mb-1 leading-tight`}>{lineType.replace(/_/g,' ')}</div>
                 {content}
            </div>
        );
      }

      // 3. Dock Menu Open? Show the 3 choices
      if (dockMenuOpen) {
          return (
            <div className={`p-2 rounded-2xl ${t.bgCard} shadow-xl border ${t.borderCard} flex flex-col gap-1.5 pointer-events-auto w-[92px] animate-in slide-in-from-right-5 fade-in duration-200`}>
               <div className={`text-[9px] text-center ${t.textSub} font-black uppercase tracking-wider`}>Create</div>
               <DockButton theme={t} icon={Route} label="Line" color="blue" onClick={() => { setDockMenuOpen(false); setLineModeModalOpen(true); }}/>
               <DockButton theme={t} icon={MapPin} label="Bound" color="orange" onClick={startBoundaryCreation}/>
               <div className={`h-px ${t.divider}`}></div>
               <div className={`text-[9px] text-center ${t.textSub} font-black uppercase tracking-wider`}>View</div>
               <DockButton theme={t} icon={showGuidanceLines ? Eye : EyeOff} label="Lines" color={showGuidanceLines ? "blue" : "gray"} onClick={() => actions.setShowGuidanceLines(!showGuidanceLines)}/>
               <DockButton theme={t} icon={Plus} label="Zoom +" color="gray" onClick={() => handleZoom('in')}/>
               <DockButton theme={t} icon={Minus} label="Zoom -" color="gray" onClick={() => handleZoom('out')}/>
               <div className={`h-px ${t.divider}`}></div>
               <DockButton theme={t} icon={MoreHorizontal} label="Menu" color="gray" onClick={() => { setDockMenuOpen(false); setMenuOpen(true); }}/>
               <DockButton theme={t} icon={X} label="Close" color="gray" onClick={() => setDockMenuOpen(false)}/>
            </div>
          );
      }

      // Default Tool Symbol - PLUS CIRCLE floating button
      return (
         <div className={`p-2 rounded-2xl ${t.bgCard} shadow-xl border ${t.borderCard} pointer-events-auto w-[76px] flex flex-col gap-1.5`}>
            <button
                onClick={() => setDockMenuOpen(true)}
                className="w-full h-[58px] rounded-2xl bg-blue-600 border border-blue-400/40 shadow-xl flex items-center justify-center text-white hover:bg-blue-500 active:scale-95 transition-all"
            >
                <Plus className="w-8 h-8" />
            </button>
            <DockButton theme={t} icon={showGuidanceLines ? Eye : EyeOff} label="Lines" color={showGuidanceLines ? "blue" : "gray"} onClick={() => actions.setShowGuidanceLines(!showGuidanceLines)}/>
            <DockButton theme={t} icon={Plus} label="Zoom +" color="gray" onClick={() => handleZoom('in')}/>
            <DockButton theme={t} icon={Minus} label="Zoom -" color="gray" onClick={() => handleZoom('out')}/>
         </div>
      );
  };

  // HANDLER FOR REAL-TIME IMPLEMENT CHANGE
  const handleImplementChange = (key, value) => {
      actions.setImplementSettings(prev => ({ ...prev, [key]: value }));
  };

  const settingsNavSections = [
      {
          title: 'Run Setup',
          items: [
              { id: 'overview', label: 'Overview', icon: LayoutGrid },
              { id: 'guidance', label: 'Guidance', icon: Navigation },
              { id: 'rtk', label: 'RTK / GNSS', icon: Radio },
              { id: 'display', label: 'Display', icon: Monitor }
          ]
      },
      {
          title: 'Machine',
          items: [
              { id: 'vehicle', label: 'Vehicle', icon: Tractor },
              { id: 'implement', label: 'Implement', icon: Ruler },
              { id: 'steering', label: 'Steering', icon: SteeringWheelIcon },
              { id: 'uturn', label: 'U-Turn', icon: CornerUpLeft }
          ]
      },
      {
          title: 'Work Tools',
          items: [
              { id: 'isobus', label: 'ISOBUS', icon: Cpu },
              { id: 'camera', label: 'Camera', icon: Video },
              { id: 'landlevel', label: 'Land Level', icon: Globe },
              { id: 'data', label: 'Data', icon: Save }
          ]
      },
      {
          title: 'Service',
          items: [
              { id: 'diagnostics', label: 'Diagnostics', icon: AlertTriangle },
              { id: 'calibration', label: 'Calibration', icon: Gauge }
          ]
      }
  ];

  const renderSettingsContent = () => {
    switch (settingsTab) {
        case 'display': return ( <div className="space-y-4"><h3 className={`text-xl font-bold mb-4 border-b ${t.borderCard} pb-2 ${t.textMain}`}>Display</h3><div className="grid grid-cols-1 gap-4"><SettingSlider theme={t} label="Brightness" value={85} min={0} max={100} /><div className={`flex items-center justify-between p-4 lg:p-5 ${theme === 'dark' ? 'bg-slate-800' : 'bg-gray-100'} border ${t.borderCard} rounded-xl`}><div className="flex items-center gap-3">{theme === 'light' ? <Sun className="w-6 h-6 text-orange-500" /> : <Moon className="w-6 h-6 text-blue-400" />}<span className={`font-bold text-base lg:text-lg ${t.textMain}`}>Theme</span></div><div className="flex bg-slate-700/20 p-1 rounded-lg"><button onClick={() => setTheme('light')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${theme === 'light' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}><Sun className="w-4 h-4" /> Light</button><button onClick={() => setTheme('dark')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${theme === 'dark' ? 'bg-slate-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}><Moon className="w-4 h-4" /> Dark</button></div></div><SettingToggle theme={t} label="Auto dark mode" active={false} /></div></div> );
        case 'vehicle': return (
            <div className="space-y-4">
                <h3 className={`text-xl font-bold mb-4 border-b ${t.borderCard} pb-2 ${t.textMain}`}>Vehicle Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SettingInput theme={t} label="Vehicle Type" value={vehicleSettings.type} onChange={(e) => actions.setVehicleSettings({...vehicleSettings, type: e.target.value})} />
                    <SettingInput theme={t} label="Wheelbase (m)" value={vehicleSettings.wheelbase} type="number" onChange={(e) => actions.setVehicleSettings({...vehicleSettings, wheelbase: parseFloat(e.target.value) || 0})} />
                    <SettingInput theme={t} label="Front Axle Width (m)" value={vehicleSettings.frontAxleWidth} type="number" onChange={(e) => actions.setVehicleSettings({...vehicleSettings, frontAxleWidth: parseFloat(e.target.value) || 0})} />
                    <SettingInput theme={t} label="Rear Axle Width (m)" value={vehicleSettings.rearAxleWidth} type="number" onChange={(e) => actions.setVehicleSettings({...vehicleSettings, rearAxleWidth: parseFloat(e.target.value) || 0})} />
                    <SettingInput theme={t} label="Antenna Height (m)" value={vehicleSettings.antennaHeight} type="number" onChange={(e) => actions.setVehicleSettings({...vehicleSettings, antennaHeight: parseFloat(e.target.value) || 0})} />
                    <SettingInput theme={t} label="Antenna Offset X (m)" value={vehicleSettings.antennaOffset} type="number" onChange={(e) => actions.setVehicleSettings({...vehicleSettings, antennaOffset: parseFloat(e.target.value) || 0})} />
                    <SettingInput theme={t} label="Rear Hitch Length (m)" value={vehicleSettings.rearHitch} type="number" onChange={(e) => actions.setVehicleSettings({...vehicleSettings, rearHitch: parseFloat(e.target.value) || 0})} />
                    <SettingInput theme={t} label="Turning Radius (m)" value={vehicleSettings.turnRadius} type="number" onChange={(e) => actions.setVehicleSettings({...vehicleSettings, turnRadius: parseFloat(e.target.value) || 0})} />
                </div>
            </div>
        );
        case 'implement': return (
            <div className="space-y-4">
                <h3 className={`text-xl font-bold mb-4 border-b ${t.borderCard} pb-2 ${t.textMain}`}>Implement</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SettingInput theme={t} label="Implement Name" value={implementSettings.name} onChange={(e) => handleImplementChange('name', e.target.value)} />
                    <div className="flex flex-col gap-2">
                        <label className={`text-xs font-bold uppercase ${t.textSub}`}>Working Width (m)</label>
                        <input
                            type="number"
                            value={implementSettings.width}
                            onChange={(e) => handleImplementChange('width', parseFloat(e.target.value) || 0)}
                            className={`${t.bgInput} border ${t.borderCard} rounded-xl px-4 py-3 ${t.textMain}`}
                        />
                    </div>
                    <SettingInput theme={t} label="Overlap (cm)" value={implementSettings.overlap} type="number" onChange={(e) => handleImplementChange('overlap', parseFloat(e.target.value) || 0)} />
                    <SettingInput theme={t} label="Lateral Offset (cm)" value={implementSettings.offset} type="number" onChange={(e) => handleImplementChange('offset', parseFloat(e.target.value) || 0)} />
                    <SettingInput theme={t} label="Delay On (s)" value={implementSettings.delayOn} type="number" onChange={(e) => handleImplementChange('delayOn', parseFloat(e.target.value) || 0)} />
                    <SettingInput theme={t} label="Delay Off (s)" value={implementSettings.delayOff} type="number" onChange={(e) => handleImplementChange('delayOff', parseFloat(e.target.value) || 0)} />
                </div>
            </div>
        );
        case 'guidance': return (
            <div className="space-y-4">
                <h3 className={`text-xl font-bold mb-4 border-b ${t.borderCard} pb-2 ${t.textMain}`}>Guidance</h3>
                <div className="grid grid-cols-1 gap-4">
                    <div onClick={handleToggleMultiLine} className={`flex items-center justify-between p-4 ${t.bgInput} border ${t.borderCard} rounded-xl cursor-pointer`}>
                        <span className={`font-bold ${t.textMain}`}>Parallel Guidance Lines</span>
                        <div className={`w-12 h-7 rounded-full p-1 transition-colors ${isMultiLineMode ? 'bg-green-500' : 'bg-slate-400'}`}>
                            <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${isMultiLineMode ? 'translate-x-5' : ''}`}></div>
                        </div>
                    </div>
                    <SettingSlider theme={t} label="Steering Sensitivity" value={75} min={0} max={100} />
                    <SettingSlider theme={t} label="Line Acquisition Aggressiveness" value={60} min={0} max={100} />
                    <FeatureToggle label="Terrain Compensation" detail="IMU slope and bump correction for stable line tracking" featureKey="terrainCompensation" icon={Activity} />
                </div>
            </div>
        );
        case 'steering': return (
            <div className="space-y-5">
                <h3 className={`text-xl font-bold mb-4 border-b ${t.borderCard} pb-2 ${t.textMain}`}>Steering System</h3>
                <div className="grid grid-cols-1 gap-4">
                    <FeatureToggle label="Electric Power Steering" detail="Power assist when manual intervention is detected" featureKey="electricPowerSteering" icon={SteeringWheelIcon} />
                    <FeatureToggle label="Manual Intervention Ready" detail="Operator can take over without digging through screen controls" featureKey="manualIntervention" icon={MousePointer2} />
                    <FeatureToggle label="Easy Switch / Foot Pedal" detail="External switch or pedal toggles auto and manual modes" featureKey="easySwitch" icon={Disc} />
                    <FeatureToggle label="CANBUS Steer Ready" detail="Integrate with steer-ready tractors through CAN control" featureKey="canbusSteerReady" icon={Cpu} />
                    <FeatureToggle label="PWM Steering Output" detail="Fallback PWM control path for hydraulic retrofits" featureKey="pwmSteerReady" icon={Activity} />
                </div>
            </div>
        );
        case 'uturn': return (
            <div className="space-y-5">
                <h3 className={`text-xl font-bold mb-4 border-b ${t.borderCard} pb-2 ${t.textMain}`}>Headland / U-Turn</h3>
                <div className="grid grid-cols-1 gap-4">
                    <FeatureToggle label="Auto U-Turn" detail="Hands-free turn command at the end of the pass" featureKey="autoUTurn" icon={CornerUpLeft} />
                    <FeatureToggle label="Headland Path" detail="Use boundary/headland paths to plan safe turn zones" featureKey="headlandTurn" icon={MapPin} />
                    <div className={`${t.bgInput} border ${t.borderCard} rounded-xl p-4`}>
                        <div className={`font-bold ${t.textMain} mb-3`}>Turn Pattern</div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {['Basic Omega', 'Fish Tail', 'Smart U-Turn'].map((label, idx) => (
                                <button key={label} className={`p-4 rounded-lg border ${idx === 2 ? 'border-blue-500 bg-blue-500/10 text-blue-500' : `${t.borderCard} ${t.textMain}`} font-bold text-sm`}>
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
        case 'isobus': return (
            <div className="space-y-5">
                <h3 className={`text-xl font-bold mb-4 border-b ${t.borderCard} pb-2 ${t.textMain}`}>ISOBUS / Implement Control</h3>
                <div className="grid grid-cols-1 gap-4">
                    <FeatureToggle label="ISOBUS UT" detail="Universal Terminal for compatible implement screens" featureKey="isobusUT" icon={Monitor} />
                    <FeatureToggle label="TC-SC Section Control" detail="Automatic section switching to reduce skips and overlaps" featureKey="sectionControl" icon={CheckSquare} />
                    <FeatureToggle label="TC-GEO Variable Rate" detail="Georeferenced rate control for prescription maps" featureKey="variableRate" icon={Layers} />
                    <FeatureToggle label="Auto Acre Recording" detail="Work area starts/stops from implement state" featureKey="acreRecording" icon={Ruler} />
                    <FeatureToggle label="Lift Sensor" detail="Detect implement raised/lowered for accurate coverage tracking" featureKey="liftSensor" icon={ArrowUpFromDot} />
                </div>
            </div>
        );
        case 'camera': return (
            <div className="space-y-5">
                <h3 className={`text-xl font-bold mb-4 border-b ${t.borderCard} pb-2 ${t.textMain}`}>Camera</h3>
                <div className="grid grid-cols-1 gap-4">
                    <FeatureToggle label="Wired Camera" detail="Stable implement view for rear and row monitoring" featureKey="wiredCamera" icon={Video} />
                    <FeatureToggle label="Wireless Camera" detail="Flexible safety feed for headland and blind spot coverage" featureKey="wirelessCamera" icon={Video} />
                    <button onClick={() => setCameraPanelOpen(true)} className="px-5 py-3 rounded-lg bg-blue-600 text-white font-bold w-fit">Open Camera Monitor</button>
                </div>
            </div>
        );
        case 'diagnostics': return (
            <div className="space-y-5">
                <h3 className={`text-xl font-bold mb-4 border-b ${t.borderCard} pb-2 ${t.textMain}`}>Diagnostics / OBD</h3>
                <div className="grid grid-cols-1 gap-4">
                    <FeatureToggle label="On-Board Diagnostics" detail="Live vehicle status: RPM, engine load, temperature and alerts" featureKey="obd" icon={Gauge} />
                    <button onClick={() => setDiagnosticsPanelOpen(true)} className="px-5 py-3 rounded-lg bg-blue-600 text-white font-bold w-fit">Open Diagnostics Center</button>
                </div>
            </div>
        );
        case 'data': return (
            <div className="space-y-5">
                <h3 className={`text-xl font-bold mb-4 border-b ${t.borderCard} pb-2 ${t.textMain}`}>Data Transfer</h3>
                <div className="grid grid-cols-1 gap-4">
                    <FeatureToggle label="USB Import / Export" detail="Move fields, boundaries, lines and task data between machines" featureKey="dataTransfer" icon={Save} />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {['Export Field', 'Import Lines', 'Backup Tasks'].map((label) => (
                            <button key={label} onClick={() => showNotification(`${label} queued`, 'info')} className={`p-4 rounded-xl border ${t.borderCard} ${t.textMain} font-bold hover:brightness-95`}>{label}</button>
                        ))}
                    </div>
                </div>
            </div>
        );
        case 'landlevel': return (
            <div className="space-y-5">
                <h3 className={`text-xl font-bold mb-4 border-b ${t.borderCard} pb-2 ${t.textMain}`}>GNSS Land Leveling</h3>
                <div className="grid grid-cols-1 gap-4">
                    <FeatureToggle label="Land Leveling Mode" detail="GNSS slope guidance for leveling workflows" featureKey="landLeveling" icon={Globe} />
                    <FeatureToggle label="MOBA TRAC Correction" detail="Satellite correction workflow without a local base station" featureKey="mobaTrac" icon={Radio} />
                    <div className={`${t.bgInput} border ${t.borderCard} rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4`}>
                        <SettingInput theme={t} label="Target Slope (%)" value="0.20" type="number" onChange={() => {}} />
                        <SettingInput theme={t} label="Cross Slope (%)" value="0.00" type="number" onChange={() => {}} />
                        <SettingInput theme={t} label="Blade Offset (cm)" value="0" type="number" onChange={() => {}} />
                    </div>
                </div>
            </div>
        );
        case 'overview': {
            const quickTiles = [
              { id: 'calibration', label: 'Calibration', desc: 'Vehicle, implement, angle sensor', icon: Gauge },
              { id: 'guidance', label: 'Guidance', desc: 'Lines, auto-steer behavior', icon: Navigation },
              { id: 'rtk', label: 'RTK / GNSS', desc: 'Status + NTRIP settings', icon: Radio },
              { id: 'vehicle', label: 'Vehicle', desc: 'Type, wheelbase, axle width', icon: Tractor },
              { id: 'implement', label: 'Implement', desc: 'Width, offset, overlap', icon: Ruler },
              { id: 'steering', label: 'Steering', desc: 'EPS, easy switch, CAN/PWM', icon: SteeringWheelIcon }
            ];

            return (
              <div className="space-y-6">
                <div className="flex items-start justify-between gap-6">
                  <div>
                    <h3 className={`text-2xl font-bold ${t.textMain}`}>Critical Setup</h3>
                    <p className={`${t.textSub} text-sm`}>Primary run, machine and steering modules.</p>
                  </div>
                  <div className={`px-4 py-2 rounded-lg border ${t.borderCard} ${t.textSub} text-xs font-bold uppercase`}>Ready Check</div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {quickTiles.map((tile) => (
                    <button
                      key={tile.id}
                      onClick={() => setSettingsTab(tile.id)}
                      className={`text-left ${t.bgPanel} border ${t.borderCard} rounded-xl p-4 min-h-[112px] hover:brightness-95 transition`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className={`w-10 h-10 rounded-lg ${theme === 'dark' ? 'bg-slate-800' : 'bg-gray-100'} flex items-center justify-center`}>
                          <tile.icon className="w-5 h-5 text-blue-500" />
                        </div>
                        <ChevronRight className={`${t.textDim} w-5 h-5`} />
                      </div>
                      <div className={`text-base font-bold ${t.textMain}`}>{tile.label}</div>
                      <div className={`text-xs ${t.textSub} mt-1`}>{tile.desc}</div>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className={`${theme === 'dark' ? 'bg-slate-800' : 'bg-white'} p-3 rounded-xl border ${t.borderCard}`}>
                    <div className={`text-[10px] uppercase ${t.textSub}`}>RTK Status</div>
                    <div className={`text-lg font-bold ${t.textMain}`}>{rtkStatus}</div>
                  </div>
                  <div className={`${theme === 'dark' ? 'bg-slate-800' : 'bg-white'} p-3 rounded-xl border ${t.borderCard}`}>
                    <div className={`text-[10px] uppercase ${t.textSub}`}>Satellites</div>
                    <div className={`text-lg font-bold ${t.textMain}`}>{satelliteCount}</div>
                  </div>
                  <div className={`${theme === 'dark' ? 'bg-slate-800' : 'bg-white'} p-3 rounded-xl border ${t.borderCard}`}>
                    <div className={`text-[10px] uppercase ${t.textSub}`}>Angle Sensor</div>
                    <div className={`text-lg font-bold ${t.textMain}`}>{`${steeringAngle.toFixed(1)}\u00b0`}</div>
                  </div>
                </div>
              </div>
            );
        }
        case 'calibration': {
            const calibCards = [
              {
                title: 'Vehicle Calibration',
                status: 'OK',
                detail: 'Steering angle, wheelbase, axle width',
                actions: [
                  { label: 'Run Calibration', tone: 'primary', onClick: () => showNotification('Vehicle calibration started', 'success') },
                  { label: 'Reset', tone: 'ghost', onClick: () => showNotification('Vehicle calibration reset', 'info') }
                ],
                meta: { label: 'Last', value: 'Today 08:45' }
              },
              {
                title: 'Implement Calibration',
                status: 'Needs Check',
                detail: 'Width, overlap, offset, delay on/off',
                actions: [
                  { label: 'Run Calibration', tone: 'primary', onClick: () => showNotification('Implement calibration started', 'success') },
                  { label: 'Reset', tone: 'ghost', onClick: () => showNotification('Implement calibration reset', 'info') }
                ],
                meta: { label: 'Last', value: 'Yesterday 17:20' }
              },
              {
                title: 'Angle Sensor Calibration',
                status: 'OK',
                detail: 'Zero, range, live angle check',
                actions: [
                  { label: 'Calibrate Sensor', tone: 'primary', onClick: () => showNotification('Angle sensor calibration started', 'success') },
                  { label: 'Zero Offset', tone: 'ghost', onClick: () => showNotification('Angle sensor zeroed', 'info') }
                ],
                meta: { label: 'Live', value: `${steeringAngle.toFixed(1)}\u00b0` }
              }
            ];

            const statusClass = (status) => {
              if (status === 'OK') return 'bg-green-500/10 text-green-500 border-green-500/40';
              if (status === 'Needs Check') return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/40';
              return 'bg-slate-500/10 text-slate-500 border-slate-500/40';
            };

            return (
              <div className="space-y-6">
                <h3 className={`text-xl font-bold mb-2 border-b ${t.borderCard} pb-2 ${t.textMain}`}>Calibration</h3>
                <p className={`${t.textSub} text-sm`}>All calibration tasks are centralized here for quick access.</p>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  {calibCards.map((card) => (
                    <div key={card.title} className={`${t.bgPanel} border ${t.borderCard} rounded-2xl p-5 flex flex-col gap-4`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className={`text-base font-bold ${t.textMain}`}>{card.title}</div>
                          <div className={`text-xs ${t.textSub}`}>{card.detail}</div>
                        </div>
                        <span className={`shrink-0 text-xs font-bold px-3 py-1 rounded-full border ${statusClass(card.status)}`}>{card.status}</span>
                      </div>

                      <div className={`text-sm ${t.textSub}`}>{card.meta.label}: <span className={`${t.textMain} font-semibold`}>{card.meta.value}</span></div>

                      <div className="flex flex-wrap gap-3">
                        {card.actions.map((action) => (
                          <button
                            key={action.label}
                            onClick={action.onClick}
                            className={
                              action.tone === 'primary'
                                ? 'px-4 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-500'
                                : `px-4 py-2 rounded-lg border ${t.borderCard} ${t.textSub} font-bold hover:brightness-95`
                            }
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
        }
        case 'rtk': {
            const rtkQuality = rtkStatus === 'FIX' ? 95 : rtkStatus === 'FLOAT' ? 75 : rtkStatus === 'DIFF' ? 55 : 20;
            const rtkLabel = rtkStatus === 'FIX' ? 'CONNECTED' : rtkStatus === 'FLOAT' ? 'FLOAT' : rtkStatus === 'DIFF' ? 'DIFF' : 'DISCONNECTED';
            const rtkBadge = rtkStatus === 'FIX' ? 'text-green-500' : rtkStatus === 'FLOAT' ? 'text-yellow-500' : rtkStatus === 'DIFF' ? 'text-orange-500' : 'text-red-500';
            const rtkBar = rtkStatus === 'FIX' ? 'bg-green-500' : rtkStatus === 'FLOAT' ? 'bg-yellow-500' : rtkStatus === 'DIFF' ? 'bg-orange-500' : 'bg-red-500';
            const gnssTabs = ['GNSS', 'RNSS', 'SBAS'];
            const usedSatellites = [
              { label: 'GPS', count: 8, color: 'bg-blue-500' },
              { label: 'GLONASS', count: 4, color: 'bg-red-500' },
              { label: 'BEIDOU', count: 6, color: 'bg-emerald-500' },
              { label: 'GALILEO', count: 5, color: 'bg-yellow-500' }
            ];
            const unusedSatellites = [
              { label: 'GPS', count: 10, color: 'bg-blue-500' },
              { label: 'GLONASS', count: 3, color: 'bg-red-500' },
              { label: 'BEIDOU', count: 8, color: 'bg-emerald-500' },
              { label: 'GALILEO', count: 2, color: 'bg-yellow-500' }
            ];
            const skyPoints = [
              { id: 15, az: 15, el: 70 },
              { id: 7, az: 40, el: 35 },
              { id: 29, az: 95, el: 60 },
              { id: 42, az: 140, el: 20 },
              { id: 66, az: 210, el: 45 },
              { id: 25, az: 250, el: 25 },
              { id: 86, az: 315, el: 15 }
            ];
            const skySize = 150;
            const skyRadius = 62;

            return (
              <div className="space-y-4">
                <h3 className={`text-xl font-bold mb-2 border-b ${t.borderCard} pb-2 ${t.textMain}`}>RTK / GNSS Status</h3>

                <div className="flex gap-2 border-b border-slate-300/40">
                  {gnssTabs.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setGnssTab(tab)}
                      className={`px-5 py-2 text-sm font-bold rounded-t-lg border ${gnssTab === tab ? `${t.borderCard} ${t.textMain} ${t.bgPanel}` : `border-transparent ${t.textSub}`}`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <div className={`${t.bgPanel} border ${t.borderCard} rounded-xl p-4`}>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className={`text-xs uppercase tracking-widest ${t.textSub}`}>Link Status</div>
                      <div className={`text-lg font-bold ${t.textMain}`}>{rtkStatus}</div>
                    </div>
                    <div className={`text-sm font-black ${rtkBadge}`}>{rtkLabel}</div>
                  </div>
                  <div className={`h-2 ${theme === 'dark' ? 'bg-slate-700' : 'bg-gray-200'} rounded-full overflow-hidden`}>
                    <div className={`h-full ${rtkBar}`} style={{ width: `${rtkQuality}%` }}></div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
                  <div className="lg:col-span-3">
                    <div className={`text-xs uppercase ${t.textSub} mb-3`}>Satellites Used</div>
                    <div className="space-y-3">
                      {usedSatellites.map((item) => (
                        <div key={item.label} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${item.color}`}></span>
                            <span className={`text-sm ${t.textMain}`}>{item.label}</span>
                          </div>
                          <span className={`text-sm font-bold ${t.textMain}`}>{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="lg:col-span-6 flex justify-center">
                    <div className={`rounded-full border ${t.borderCard} p-2 ${theme === 'dark' ? 'bg-slate-900' : 'bg-gray-50'}`}>
                      <svg width={skySize} height={skySize} viewBox={`0 0 ${skySize} ${skySize}`}>
                        <circle cx={skySize / 2} cy={skySize / 2} r={skyRadius} fill="none" stroke={theme === 'dark' ? '#475569' : '#cbd5f5'} strokeWidth="2" />
                        <circle cx={skySize / 2} cy={skySize / 2} r={skyRadius * 0.66} fill="none" stroke={theme === 'dark' ? '#475569' : '#cbd5f5'} strokeWidth="1" />
                        <circle cx={skySize / 2} cy={skySize / 2} r={skyRadius * 0.33} fill="none" stroke={theme === 'dark' ? '#475569' : '#cbd5f5'} strokeWidth="1" />
                        <line x1={skySize / 2} y1={skySize / 2 - skyRadius} x2={skySize / 2} y2={skySize / 2 + skyRadius} stroke={theme === 'dark' ? '#64748b' : '#94a3b8'} strokeWidth="1" />
                        <line x1={skySize / 2 - skyRadius} y1={skySize / 2} x2={skySize / 2 + skyRadius} y2={skySize / 2} stroke={theme === 'dark' ? '#64748b' : '#94a3b8'} strokeWidth="1" />
                        {skyPoints.map((sat) => {
                          const r = (1 - sat.el / 90) * skyRadius;
                          const theta = (sat.az - 90) * (Math.PI / 180);
                          const x = skySize / 2 + r * Math.cos(theta);
                          const y = skySize / 2 + r * Math.sin(theta);
                          return (
                            <g key={sat.id}>
                              <circle cx={x} cy={y} r="11" fill={theme === 'dark' ? '#0f172a' : '#ffffff'} stroke={theme === 'dark' ? '#94a3b8' : '#64748b'} strokeWidth="1" />
                              <text x={x} y={y + 4} textAnchor="middle" fontSize="10" fill={theme === 'dark' ? '#e2e8f0' : '#0f172a'}>
                                {sat.id}
                              </text>
                            </g>
                          );
                        })}
                      </svg>
                    </div>
                  </div>

                  <div className="lg:col-span-3">
                    <div className={`text-xs uppercase ${t.textSub} mb-3`}>Satellites Unused</div>
                    <div className="space-y-3">
                      {unusedSatellites.map((item) => (
                        <div key={item.label} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${item.color} opacity-40`}></span>
                            <span className={`text-sm ${t.textMain}`}>{item.label}</span>
                          </div>
                          <span className={`text-sm font-bold ${t.textMain}`}>{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                  <div className={`${theme === 'dark' ? 'bg-slate-800' : 'bg-gray-100'} p-4 rounded-xl border ${t.borderCard}`}>
                    <div className={`text-[10px] uppercase ${t.textSub}`}>Correction Age</div>
                    <div className={`text-lg font-bold ${t.textMain}`}>{rtkStatus === 'FIX' ? '0.7s' : 'N/A'}</div>
                  </div>
                  <div className={`${theme === 'dark' ? 'bg-slate-800' : 'bg-gray-100'} p-4 rounded-xl border ${t.borderCard}`}>
                    <div className={`text-[10px] uppercase ${t.textSub}`}>Latency</div>
                    <div className={`text-lg font-bold ${t.textMain}`}>{rtkStatus === 'FIX' ? '220ms' : 'N/A'}</div>
                  </div>
                  <div className={`${theme === 'dark' ? 'bg-slate-800' : 'bg-gray-100'} p-4 rounded-xl border ${t.borderCard}`}>
                    <div className={`text-[10px] uppercase ${t.textSub}`}>Baseline</div>
                    <div className={`text-lg font-bold ${t.textMain}`}>{rtkStatus === 'FIX' ? '12.4 km' : 'N/A'}</div>
                  </div>
                  <div className={`${theme === 'dark' ? 'bg-slate-800' : 'bg-gray-100'} p-4 rounded-xl border ${t.borderCard}`}>
                    <div className={`text-[10px] uppercase ${t.textSub}`}>Accuracy (H/V)</div>
                    <div className={`text-lg font-bold ${t.textMain}`}>{rtkStatus === 'FIX' ? '2.2 cm / 3.1 cm' : 'N/A'}</div>
                  </div>
                </div>

                <div className={`${theme === 'dark' ? 'bg-slate-900/60' : 'bg-gray-50'} p-4 rounded-xl border ${t.borderCard}`}>
                  <button
                    onClick={() => setRtkAdvancedOpen((prev) => !prev)}
                    className={`w-full flex items-center justify-between text-sm font-bold ${t.textMain}`}
                  >
                    <span>NTRIP Settings</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${rtkAdvancedOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {rtkAdvancedOpen && (
                    <div className="mt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <SettingInput theme={t} label="NTRIP Host" value={rtkSettings.ntripHost} onChange={(e) => actions.setRtkSettings({...rtkSettings, ntripHost: e.target.value})} />
                        <SettingInput theme={t} label="Port" value={rtkSettings.port} onChange={(e) => actions.setRtkSettings({...rtkSettings, port: e.target.value})} />
                        <SettingInput theme={t} label="Mountpoint" value={rtkSettings.mountpoint} onChange={(e) => actions.setRtkSettings({...rtkSettings, mountpoint: e.target.value})} />
                        <SettingInput theme={t} label="User" value={rtkSettings.user} onChange={(e) => actions.setRtkSettings({...rtkSettings, user: e.target.value})} />
                      </div>
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className={`${theme === 'dark' ? 'bg-slate-800' : 'bg-white'} p-3 rounded-lg border ${t.borderCard}`}>
                          <div className={`text-[10px] uppercase ${t.textSub}`}>Stream</div>
                          <div className={`text-sm font-bold ${t.textMain}`}>RTCM3</div>
                        </div>
                        <div className={`${theme === 'dark' ? 'bg-slate-800' : 'bg-white'} p-3 rounded-lg border ${t.borderCard}`}>
                          <div className={`text-[10px] uppercase ${t.textSub}`}>Update Rate</div>
                          <div className={`text-sm font-bold ${t.textMain}`}>1 Hz</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
        }
        default: return <div className={t.textDim}>Select a menu item</div>;
    }
  };

  const renderSettingsPanel = () => (
      <div className={`absolute inset-0 ${theme === 'dark' ? 'bg-slate-950/96' : 'bg-gray-100/96'} z-40 flex overflow-hidden`}>
          <div className={`w-[28%] min-w-[280px] max-w-[340px] border-r ${t.border} ${t.bgPanel} flex flex-col min-h-0`}>
              <div className={`p-5 border-b ${t.borderCard}`}>
                  <h2 className={`text-xl lg:text-2xl font-black flex items-center gap-3 ${t.textMain}`}>
                      <Settings className="w-6 h-6 lg:w-7 lg:h-7 text-blue-500" />
                      System
                  </h2>
                  <div className={`mt-1 text-xs ${t.textSub}`}>Grouped setup for run, machine and service modules</div>
              </div>

              <div className={`m-4 p-3 rounded-xl border ${t.borderCard} ${theme === 'dark' ? 'bg-slate-900/70' : 'bg-gray-50'}`}>
                  <div className="grid grid-cols-3 gap-2 text-center">
                      <div>
                          <div className={`text-[9px] uppercase font-black ${t.textSub}`}>RTK</div>
                          <div className={`text-sm font-black ${rtkStatus === 'FIX' ? 'text-green-500' : 'text-yellow-500'}`}>{rtkStatus}</div>
                      </div>
                      <div>
                          <div className={`text-[9px] uppercase font-black ${t.textSub}`}>Sats</div>
                          <div className={`text-sm font-black ${t.textMain}`}>{satelliteCount}</div>
                      </div>
                      <div>
                          <div className={`text-[9px] uppercase font-black ${t.textSub}`}>Steer</div>
                          <div className={`text-sm font-black ${steeringMode === 'AUTO' ? 'text-green-500' : t.textMain}`}>{steeringMode}</div>
                      </div>
                  </div>
              </div>

              <nav className="flex-1 min-h-0 overflow-y-auto px-4 pb-4 space-y-5">
                  {settingsNavSections.map((section) => (
                      <div key={section.title}>
                          <div className={`px-2 mb-2 text-[10px] uppercase tracking-wider font-black ${t.textSub}`}>{section.title}</div>
                          <div className="space-y-1.5">
                              {section.items.map((item) => (
                                  <SettingsTab
                                      key={item.id}
                                      theme={t}
                                      label={item.label}
                                      icon={item.icon}
                                      active={settingsTab === item.id}
                                      onClick={() => setSettingsTab(item.id)}
                                  />
                              ))}
                          </div>
                      </div>
                  ))}
              </nav>
          </div>

          <div className={`flex-1 min-w-0 min-h-0 flex flex-col ${theme === 'dark' ? 'bg-slate-950' : 'bg-gray-50'}`}>
              <div className={`flex items-center justify-between p-5 lg:p-6 border-b ${t.borderCard} ${theme === 'dark' ? 'bg-slate-900/50' : 'bg-white/70'}`}>
                  <div>
                      <h3 className={`text-lg lg:text-xl font-black ${t.textMain}`}>{settingsNavSections.flatMap(section => section.items).find(item => item.id === settingsTab)?.label || 'Settings'}</h3>
                      <div className={`text-xs ${t.textSub}`}>Only the selected module is shown to keep setup focused.</div>
                  </div>
                  <button onClick={() => setSettingsOpen(false)} className={`p-2 ${t.activeItem} hover:brightness-95 rounded-lg border ${t.borderCard}`}>
                      <X className={`w-5 h-5 lg:w-6 lg:h-6 ${t.textMain}`} />
                  </button>
              </div>
              <div className="flex-1 min-h-0 p-5 lg:p-7 overflow-y-auto">
                  <div className="max-w-4xl pb-8">{renderSettingsContent()}</div>
              </div>
              <div className={`p-4 lg:p-5 border-t ${t.borderCard} flex justify-end gap-4 ${theme === 'dark' ? 'bg-slate-900/50' : 'bg-white/70'}`}>
                  <button className={`px-6 lg:px-8 py-2 lg:py-3 rounded-lg border ${t.borderCard} ${t.textMain} hover:brightness-95 text-base lg:text-lg`} onClick={() => setSettingsOpen(false)}>Cancel</button>
                  <button className="px-6 lg:px-8 py-2 lg:py-3 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-500 shadow-lg shadow-blue-900/20 text-base lg:text-lg" onClick={() => { setSettingsOpen(false); showNotification("Settings Saved Successfully", "success"); }}>Save Changes</button>
              </div>
          </div>
      </div>
  );

const renderLinesPanel = () => {
    const activeField = fields.find(f => f.id === selectedFieldId);
    const lines = activeField?.lines || [];
    const selectedLine = lines.find(line => line.id === activeLineId) || lines[0];
    const activeLineLength = selectedLine ? getLineLengthMeters(selectedLine) : null;
    const panelBg = theme === 'dark' ? 'bg-slate-950' : 'bg-gray-50';
    const surfaceBg = theme === 'dark' ? 'bg-slate-900/80' : 'bg-white';
    const mutedBg = theme === 'dark' ? 'bg-slate-900/55' : 'bg-slate-50';

    const getLineIconFor = (line) => {
        if (line?.type === 'CURVE') return Spline;
        if (line?.type === 'COMBINATION') return AlignJustify;
        if (line?.type === 'PIVOT') return CircleDashed;
        if (line?.type === 'A_PLUS') return ArrowUpFromDot;
        return GitCommitHorizontal;
    };

    const getLinePointList = (line) => {
        const pts = [];
        if (line?.points?.a) pts.push(line.points.a);
        if (line?.points?.b) pts.push(line.points.b);
        if (line?.points?.aplus?.point) pts.push(line.points.aplus.point);
        if (Array.isArray(line?.points?.curve)) pts.push(...line.points.curve);
        if (line?.points?.pivot?.center) pts.push(line.points.pivot.center);
        return pts.filter(p => Number.isFinite(p?.x) && Number.isFinite(p?.y));
    };

    const renderLinePreview = (line) => {
        const points = getLinePointList(line);
        const source = points.length > 1 ? points : [{ x: -140, y: -80 }, { x: 140, y: 80 }];
        const xs = source.map(p => p.x);
        const ys = source.map(p => p.y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);
        const width = 380;
        const height = 210;
        const pad = 34;
        const scale = Math.min((width - pad * 2) / Math.max(maxX - minX, 1), (height - pad * 2) / Math.max(maxY - minY, 1));
        const midX = (minX + maxX) / 2;
        const midY = (minY + maxY) / 2;
        const mapPoint = (pt) => ({
            x: width / 2 + (pt.x - midX) * scale,
            y: height / 2 + (pt.y - midY) * scale
        });
        const preview = source.map(mapPoint);
        const gridStroke = theme === 'dark' ? '#334155' : '#cbd5e1';

        return (
            <div className={`rounded-xl border ${t.borderCard} ${mutedBg} overflow-hidden`}>
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[210px] block" aria-label="Guidance line preview">
                    <defs>
                        <pattern id={`line-grid-${line?.id || 'empty'}`} width="24" height="24" patternUnits="userSpaceOnUse">
                            <path d="M 24 0 L 0 0 0 24" fill="none" stroke={gridStroke} strokeWidth="0.7" opacity={theme === 'dark' ? '0.28' : '0.42'} />
                        </pattern>
                    </defs>
                    <rect width={width} height={height} fill={`url(#line-grid-${line?.id || 'empty'})`} />
                    <rect width={width} height={height} fill={theme === 'dark' ? 'rgba(2,6,23,0.24)' : 'rgba(248,250,252,0.36)'} />
                    <polyline
                        points={preview.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
                        fill="none"
                        stroke="#2563eb"
                        strokeWidth="5"
                        strokeLinecap="round"
                    />
                    {preview[0] && <circle cx={preview[0].x} cy={preview[0].y} r="8" fill="#2563eb" stroke="white" strokeWidth="2" />}
                    {preview[preview.length - 1] && <circle cx={preview[preview.length - 1].x} cy={preview[preview.length - 1].y} r="8" fill="#f97316" stroke="white" strokeWidth="2" />}
                </svg>
            </div>
        );
    };

    return (
        <div className={`w-full h-full flex flex-col ${panelBg}`}>
            <div className={`flex items-center justify-between gap-4 px-6 py-5 border-b ${t.divider} ${theme === 'dark' ? 'bg-slate-950/90' : 'bg-white/90'}`}>
                <div className="min-w-0 flex items-center gap-3">
                    <div className={`shrink-0 w-11 h-11 rounded-xl border ${t.borderCard} ${surfaceBg} flex items-center justify-center`}>
                        <Route className="w-6 h-6 text-blue-500" />
                    </div>
                    <div className="min-w-0">
                        <h2 className={`text-xl font-black ${t.textMain}`}>Guidance Lines</h2>
                        <div className={`text-xs ${t.textSub} truncate`}>{activeField?.name || 'No field selected'} / {lines.length} saved lines</div>
                    </div>
                </div>
                <button
                    onClick={() => setLinesPanelOpen(false)}
                    className={`p-2 rounded-lg border ${t.borderCard} ${t.textMain} hover:brightness-95 transition-all`}
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="flex-1 min-h-0 p-5 lg:p-6 overflow-hidden">
                <div className="h-full grid grid-cols-[minmax(330px,0.95fr)_minmax(0,1.25fr)] gap-5">
                    <section className={`${surfaceBg} border ${t.borderCard} rounded-xl flex flex-col min-h-0 overflow-hidden`}>
                        <div className={`p-4 border-b ${t.divider}`}>
                            <div className="grid grid-cols-3 gap-2 mb-4">
                                <div className={`${mutedBg} border ${t.borderCard} rounded-lg p-3`}>
                                    <div className={`text-[9px] font-black uppercase ${t.textSub}`}>Total</div>
                                    <div className={`text-2xl font-black ${t.textMain}`}>{lines.length}</div>
                                </div>
                                <div className={`${mutedBg} border ${t.borderCard} rounded-lg p-3`}>
                                    <div className={`text-[9px] font-black uppercase ${t.textSub}`}>Active</div>
                                    <div className={`text-2xl font-black ${activeLineId ? 'text-green-500' : t.textMain}`}>{activeLineId ? 1 : 0}</div>
                                </div>
                                <div className={`${mutedBg} border ${t.borderCard} rounded-lg p-3`}>
                                    <div className={`text-[9px] font-black uppercase ${t.textSub}`}>Multi</div>
                                    <div className={`text-2xl font-black ${t.textMain}`}>{lines.filter(line => line.isMulti).length}</div>
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    setLinesPanelOpen(false);
                                    setLineModeModalOpen(true);
                                }}
                                className="w-full px-5 py-3 bg-blue-600 text-white font-black rounded-lg hover:bg-blue-500 transition-colors flex items-center justify-center gap-2"
                            >
                                <Plus className="w-5 h-5" />
                                New Guidance Line
                            </button>
                        </div>

                        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
                            {lines.length === 0 ? (
                                <div className={`h-full min-h-[280px] flex flex-col items-center justify-center text-center ${t.textDim}`}>
                                    <Navigation className="w-14 h-14 mb-4 opacity-50" />
                                    <p className={`text-lg font-black ${t.textMain}`}>No guidance line</p>
                                    <p className="text-sm mt-2 max-w-[260px]">Create AB, A+, curve, pivot or combination line for this field.</p>
                                </div>
                            ) : (
                                lines.map((line, index) => {
                                    const Icon = getLineIconFor(line);
                                    const lengthMeters = getLineLengthMeters(line);
                                    const active = activeLineId === line.id;
                                    return (
                                        <div key={line.id} className={`p-3 rounded-xl border transition-all ${active ? 'border-blue-500 bg-blue-500/10' : `${t.borderCard} ${mutedBg}`}`}>
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex items-start gap-3 min-w-0">
                                                    <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${active ? 'bg-blue-600 text-white' : `${theme === 'dark' ? 'bg-slate-800' : 'bg-white'} text-blue-500 border ${t.borderCard}`}`}>
                                                        <Icon className="w-5 h-5" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className={`font-black ${t.textMain} truncate`}>{line.name || `Line ${index + 1}`}</div>
                                                        <div className={`text-xs ${t.textSub}`}>{(line.type || 'LINE').replace(/_/g, ' ')} / {lengthMeters !== null ? `${lengthMeters.toFixed(1)} m` : '--'}</div>
                                                    </div>
                                                </div>
                                                {active && <span className="shrink-0 px-2 py-1 rounded-md bg-green-500/15 text-green-500 text-[10px] font-black uppercase">Active</span>}
                                            </div>
                                            <div className="mt-3 flex items-center justify-between gap-2">
                                                <span className={`text-xs ${t.textSub}`}>{formatLineDate(line)}</span>
                                                <div className="flex items-center gap-2">
                                                    <button onClick={() => confirmDelete('line', line.id)} className="p-2 rounded-lg text-red-500 hover:bg-red-500/10">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => handleLoadLine(line)} className={`px-3 py-2 rounded-lg text-xs font-black ${active ? 'bg-blue-600 text-white' : `border ${t.borderCard} ${t.textMain} hover:brightness-95`}`}>
                                                        {active ? 'Loaded' : 'Load'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </section>

                    <section className={`${surfaceBg} border ${t.borderCard} rounded-xl p-5 min-w-0 overflow-y-auto`}>
                        {selectedLine ? (
                            <div className="space-y-5">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="min-w-0">
                                        <div className={`text-[10px] uppercase tracking-wider font-black ${t.textSub}`}>Selected line</div>
                                        <h3 className={`text-2xl font-black ${t.textMain} truncate`}>{selectedLine.name}</h3>
                                        <div className={`mt-1 text-sm ${t.textSub}`}>{(selectedLine.type || 'LINE').replace(/_/g, ' ')} / {selectedLine.isMulti ? 'Parallel lines enabled' : 'Single path'}</div>
                                    </div>
                                    {activeLineId === selectedLine.id && <span className="shrink-0 px-3 py-1.5 rounded-lg bg-green-500/15 text-green-500 text-xs font-black uppercase">Active</span>}
                                </div>

                                {renderLinePreview(selectedLine)}

                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                    {[
                                        ['Type', (selectedLine.type || 'LINE').replace(/_/g, ' ')],
                                        ['Length', activeLineLength !== null ? `${activeLineLength.toFixed(1)} m` : '--'],
                                        ['Created', formatLineDate(selectedLine)],
                                        ['Pattern', selectedLine.isMulti ? 'Multi' : 'Single']
                                    ].map(([label, value]) => (
                                        <div key={label} className={`${mutedBg} border ${t.borderCard} rounded-lg p-3 min-w-0`}>
                                            <div className={`text-[9px] font-black uppercase ${t.textSub}`}>{label}</div>
                                            <div className={`mt-1 text-sm font-black ${t.textMain} truncate`}>{value}</div>
                                        </div>
                                    ))}
                                </div>

                                <div className={`pt-4 border-t ${t.borderCard} flex flex-wrap justify-end gap-3`}>
                                    <button onClick={() => confirmDelete('line', selectedLine.id)} className="px-5 py-3 rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/10 font-bold flex items-center gap-2">
                                        <Trash2 className="w-5 h-5" />
                                        Delete
                                    </button>
                                    <button onClick={() => handleLoadLine(selectedLine)} className="px-7 py-3 rounded-lg bg-blue-600 text-white font-black hover:bg-blue-500 shadow-lg shadow-blue-900/20 flex items-center gap-2">
                                        <CheckCircle2 className="w-5 h-5" />
                                        {activeLineId === selectedLine.id ? 'Reload Line' : 'Load Line'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className={`h-full min-h-[360px] flex flex-col items-center justify-center text-center ${t.textDim}`}>
                                <Route className="w-16 h-16 mb-4 opacity-50" />
                                <h3 className={`text-xl font-black ${t.textMain}`}>No line selected</h3>
                                <p className="text-sm mt-2 max-w-[320px]">Create a guidance line first, then load it here for the run screen.</p>
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
};

  const renderFieldManager = () => {
      const activeField = fields.find(f => f.id === selectedFieldId);
      const isLoadedActiveField = activeField && loadedField?.id === activeField.id;
      const panelBg = theme === 'dark' ? 'bg-slate-950' : 'bg-gray-50';
      const softPanelBg = theme === 'dark' ? 'bg-slate-900/70' : 'bg-white';
      const mutedPanelBg = theme === 'dark' ? 'bg-slate-900/45' : 'bg-slate-50';

      const getLineIcon = (line) => {
          if (line?.type === 'CURVE') return Spline;
          if (line?.type === 'COMBINATION') return AlignJustify;
          if (line?.type === 'PIVOT') return CircleDashed;
          if (line?.type === 'A_PLUS') return ArrowUpFromDot;
          return GitCommitHorizontal;
      };

      const getTaskIcon = (task) => {
          if (task?.type === 'Planting') return Sprout;
          if (task?.type === 'Spraying') return Droplets;
          if (task?.type === 'Harvesting') return Scissors;
          return Tractor;
      };

      const getLinePoints = (line) => {
          const pts = [];
          if (line?.points?.a) pts.push(line.points.a);
          if (line?.points?.b) pts.push(line.points.b);
          if (line?.points?.aplus?.point) pts.push(line.points.aplus.point);
          if (Array.isArray(line?.points?.curve)) pts.push(...line.points.curve);
          if (line?.points?.pivot?.center) pts.push(line.points.pivot.center);
          return pts.filter(Boolean);
      };

      const createPreviewMapper = (field, draftBoundaries = []) => {
          const boundaries = draftBoundaries.length > 0 ? draftBoundaries : (field?.boundaries || []);
          const linePoints = (field?.lines || []).flatMap(getLinePoints);
          const boundaryPoints = boundaries.flatMap(b => b?.points || b || []);
          const sourcePoints = [...boundaryPoints, ...linePoints].filter(p => Number.isFinite(p?.x) && Number.isFinite(p?.y));
          const fallback = [{ x: -220, y: -130 }, { x: 230, y: 145 }];
          const points = sourcePoints.length > 0 ? sourcePoints : fallback;
          const xs = points.map(p => p.x);
          const ys = points.map(p => p.y);
          const minX = Math.min(...xs);
          const maxX = Math.max(...xs);
          const minY = Math.min(...ys);
          const maxY = Math.max(...ys);
          const spanX = Math.max(maxX - minX, 1);
          const spanY = Math.max(maxY - minY, 1);
          const pad = 34;
          const width = 360;
          const height = 230;
          const scale = Math.min((width - pad * 2) / spanX, (height - pad * 2) / spanY);
          const midX = (minX + maxX) / 2;
          const midY = (minY + maxY) / 2;
          return (pt) => ({
              x: width / 2 + (pt.x - midX) * scale,
              y: height / 2 + (pt.y - midY) * scale
          });
      };

      const MiniFieldPreview = ({ field, draftBoundaries = [] }) => {
          const boundaries = draftBoundaries.length > 0 ? draftBoundaries : (field?.boundaries || []);
          const lines = field?.lines || [];
          const mapPoint = createPreviewMapper(field, draftBoundaries);
          const fieldId = field?.id || 'draft';
          const hasBoundaries = boundaries.length > 0;
          const defaultBoundary = '70,62 224,43 306,92 286,174 132,194 54,142';
          const gridStroke = theme === 'dark' ? '#334155' : '#cbd5e1';
          const boundaryFill = theme === 'dark' ? 'rgba(37,99,235,0.14)' : 'rgba(37,99,235,0.09)';
          const boundaryStroke = theme === 'dark' ? '#60a5fa' : '#2563eb';

          return (
              <div className={`relative overflow-hidden rounded-xl border ${t.borderCard} ${mutedPanelBg}`}>
                  <svg viewBox="0 0 360 230" className="w-full h-[230px] block" role="img" aria-label="Field preview">
                      <defs>
                          <pattern id={`field-grid-${fieldId}`} width="24" height="24" patternUnits="userSpaceOnUse">
                              <path d="M 24 0 L 0 0 0 24" fill="none" stroke={gridStroke} strokeWidth="0.7" opacity={theme === 'dark' ? '0.26' : '0.42'} />
                          </pattern>
                      </defs>
                      <rect width="360" height="230" fill={`url(#field-grid-${fieldId})`} />
                      <rect width="360" height="230" fill={theme === 'dark' ? 'rgba(15,23,42,0.34)' : 'rgba(248,250,252,0.42)'} />
                      {hasBoundaries ? (
                          boundaries.map((boundary, index) => {
                              const points = (boundary.points || boundary || []).filter(p => Number.isFinite(p?.x) && Number.isFinite(p?.y));
                              if (points.length < 2) return null;
                              const previewPoints = points.map(mapPoint).map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
                              return (
                                  <polygon
                                      key={`${boundary.name || 'boundary'}-${index}`}
                                      points={previewPoints}
                                      fill={index === activeBoundaryIdx ? boundaryFill : 'rgba(100,116,139,0.08)'}
                                      stroke={index === activeBoundaryIdx ? boundaryStroke : '#94a3b8'}
                                      strokeWidth={index === activeBoundaryIdx ? 3 : 2}
                                      strokeDasharray={index === activeBoundaryIdx ? 'none' : '7 6'}
                                  />
                              );
                          })
                      ) : (
                          <polygon points={defaultBoundary} fill={boundaryFill} stroke={boundaryStroke} strokeWidth="2.5" strokeDasharray="9 7" />
                      )}
                      {lines.slice(0, 5).map((line, index) => {
                          const points = getLinePoints(line);
                          if (points.length < 2) return null;
                          const previewPoints = points.map(mapPoint);
                          const Icon = getLineIcon(line);
                          return (
                              <g key={line.id || index}>
                                  <polyline
                                      points={previewPoints.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
                                      fill="none"
                                      stroke={activeLineId === line.id ? '#2563eb' : '#38bdf8'}
                                      strokeWidth={activeLineId === line.id ? 4 : 2}
                                      strokeLinecap="round"
                                      strokeOpacity={activeLineId === line.id ? 0.95 : 0.62}
                                  />
                                  {index === 0 && (
                                      <foreignObject x="154" y="96" width="52" height="38">
                                          <div className="h-full w-full flex items-center justify-center text-blue-500">
                                              <Icon className="w-5 h-5" />
                                          </div>
                                      </foreignObject>
                                  )}
                              </g>
                          );
                      })}
                      <circle cx="180" cy="115" r="5" fill="#f97316" stroke="white" strokeWidth="2" />
                  </svg>
                  {!hasBoundaries && (
                      <div className={`absolute left-3 bottom-3 px-3 py-1.5 rounded-lg border ${t.borderCard} ${softPanelBg} text-[10px] font-bold uppercase ${t.textSub}`}>
                          Preview boundary
                      </div>
                  )}
              </div>
          );
      };

      const StatCard = ({ icon: Icon, label, value, sub, tone = 'text-blue-500' }) => (
          <div className={`rounded-xl border ${t.borderCard} ${softPanelBg} p-4 min-w-0`}>
              <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                      <div className={`text-[10px] font-black uppercase tracking-wider ${t.textSub}`}>{label}</div>
                      <div className={`mt-1 text-2xl font-black leading-none ${t.textMain}`}>{value}</div>
                      {sub && <div className={`mt-1 text-xs ${t.textDim} truncate`}>{sub}</div>}
                  </div>
                  <div className={`shrink-0 w-10 h-10 rounded-lg ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'} flex items-center justify-center ${tone}`}>
                      <Icon className="w-5 h-5" />
                  </div>
              </div>
          </div>
      );

      const SectionTitle = ({ icon: Icon, title, actionLabel, onAction }) => (
          <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2 min-w-0">
                  <Icon className="w-4 h-4 text-blue-500 shrink-0" />
                  <h4 className={`font-black uppercase tracking-wider text-xs ${t.textSub} truncate`}>{title}</h4>
              </div>
              {actionLabel && (
                  <button onClick={onAction} className="shrink-0 text-xs font-black text-blue-500 hover:text-blue-400 flex items-center gap-1">
                      <Plus className="w-4 h-4" />
                      {actionLabel}
                  </button>
              )}
          </div>
      );

      const EmptyState = ({ label }) => (
          <div className={`rounded-lg border border-dashed ${t.borderCard} ${mutedPanelBg} py-5 px-4 text-center text-sm ${t.textDim}`}>
              {label}
          </div>
      );

      let rightContent;
      if (viewMode === 'CREATE_FIELD') {
          const draftField = {
              id: 'draft',
              name: newFieldName || 'New Field',
              boundaries: currentFieldBoundaries,
              lines: [],
              tasks: []
          };

          rightContent = (
              <div className="flex-1 min-h-0 flex flex-col">
                  <div className={`px-5 lg:px-6 py-4 border-b ${t.divider} flex items-center justify-between gap-4 ${theme === 'dark' ? 'bg-slate-950/80' : 'bg-white/80'}`}>
                      <div className="flex items-center gap-3 min-w-0">
                          <button onClick={() => actions.setViewMode('LIST')} className={`shrink-0 p-2 rounded-lg border ${t.borderCard} ${t.textMain} hover:brightness-95`}>
                              <ArrowLeftRight className="w-5 h-5 rotate-180" />
                          </button>
                          <div className="min-w-0">
                              <div className={`text-[10px] font-black uppercase tracking-widest ${t.textSub}`}>Field setup</div>
                              <h3 className={`text-xl font-black ${t.textMain} truncate`}>Create Field</h3>
                          </div>
                      </div>
                      <button onClick={() => setFieldManagerOpen(false)} className={`p-2 rounded-lg border ${t.borderCard} ${t.textMain} hover:brightness-95`}>
                          <X className="w-5 h-5" />
                      </button>
                  </div>

                  <div className="flex-1 min-h-0 overflow-y-auto p-5 lg:p-6">
                      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] gap-5 max-w-6xl">
                          <section className={`rounded-xl border ${t.borderCard} ${softPanelBg} p-5 space-y-5`}>
                              <div>
                                  <label className={`block text-[11px] font-black uppercase tracking-wider mb-2 ${t.textSub}`}>Field name</label>
                                  <input
                                      type="text"
                                      value={newFieldName}
                                      onChange={e => actions.setNewFieldName(e.target.value)}
                                      placeholder="Ex: South Farm 02"
                                      className={`w-full p-4 rounded-xl border ${t.borderCard} ${t.bgInput} ${t.textMain} focus:border-blue-500 outline-none`}
                                  />
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className={`rounded-xl border ${t.borderCard} ${mutedPanelBg} p-4`}>
                                      <div className="flex items-start justify-between gap-3">
                                          <div>
                                              <div className={`text-[10px] uppercase font-black ${t.textSub}`}>Boundary capture</div>
                                              <div className={`mt-1 text-sm ${t.textMain}`}>{currentFieldBoundaries.length} loop saved</div>
                                          </div>
                                          <MapPin className="w-5 h-5 text-orange-500" />
                                      </div>
                                      <button onClick={startBoundaryCreation} className="mt-4 w-full py-3 rounded-xl border-2 border-dashed border-blue-500/50 text-blue-500 font-black hover:bg-blue-500/10 flex items-center justify-center gap-2">
                                          <Tractor className="w-5 h-5" />
                                          {currentFieldBoundaries.length > 0 ? 'Record Another' : 'Record Boundary'}
                                      </button>
                                  </div>

                                  <div className={`rounded-xl border ${t.borderCard} ${mutedPanelBg} p-4`}>
                                      <div className="flex items-start justify-between gap-3">
                                          <div>
                                              <div className={`text-[10px] uppercase font-black ${t.textSub}`}>Setup status</div>
                                              <div className={`mt-1 text-sm ${t.textMain}`}>{currentFieldBoundaries.length > 0 ? 'Ready to save' : 'Boundary optional'}</div>
                                          </div>
                                          <CheckCircle2 className={`w-5 h-5 ${currentFieldBoundaries.length > 0 ? 'text-green-500' : t.textDim}`} />
                                      </div>
                                      <div className="mt-4 grid grid-cols-2 gap-2 text-center">
                                          <div className={`rounded-lg border ${t.borderCard} p-3`}>
                                              <div className={`text-xl font-black ${t.textMain}`}>{currentFieldBoundaries.length}</div>
                                              <div className={`text-[10px] uppercase font-bold ${t.textSub}`}>Boundaries</div>
                                          </div>
                                          <div className={`rounded-lg border ${t.borderCard} p-3`}>
                                              <div className={`text-xl font-black ${t.textMain}`}>0</div>
                                              <div className={`text-[10px] uppercase font-bold ${t.textSub}`}>Tasks</div>
                                          </div>
                                      </div>
                                  </div>
                              </div>

                              <div className={`pt-4 border-t ${t.divider} flex flex-wrap justify-end gap-3`}>
                                  <button onClick={() => actions.setViewMode('LIST')} className={`px-5 py-3 rounded-lg border ${t.borderCard} ${t.textMain} font-bold hover:brightness-95`}>Cancel</button>
                                  <button onClick={saveNewField} className="px-7 py-3 rounded-lg bg-blue-600 text-white font-black hover:bg-blue-500 shadow-lg shadow-blue-900/20 flex items-center gap-2">
                                      <Save className="w-5 h-5" />
                                      Save Field
                                  </button>
                              </div>
                          </section>

                          <section className="space-y-4">
                              <MiniFieldPreview field={draftField} draftBoundaries={currentFieldBoundaries} />
                              <div className={`rounded-xl border ${t.borderCard} ${softPanelBg} p-4`}>
                                  <SectionTitle icon={Layers} title="Create flow" />
                                  <div className="space-y-3">
                                      {['Name field', 'Record or import boundary', 'Save to field library'].map((step, index) => (
                                          <div key={step} className="flex items-center gap-3">
                                              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${index === 0 || (index === 1 && currentFieldBoundaries.length > 0) ? 'bg-blue-600 text-white' : `${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'} ${t.textSub}`}`}>
                                                  {index + 1}
                                              </div>
                                              <span className={`text-sm font-bold ${t.textMain}`}>{step}</span>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          </section>
                      </div>
                  </div>
              </div>
          );
      } else if (viewMode === 'CREATE_TASK') {
          const taskOptions = [
              { type: 'Tillage', title: 'Tillage / Plowing', detail: 'Soil prep, ripping, leveling', icon: Tractor },
              { type: 'Planting', title: 'Planting / Seeding', detail: 'Seed rows and pass tracking', icon: Sprout },
              { type: 'Spraying', title: 'Spraying', detail: 'Coverage and section control', icon: Droplets },
              { type: 'Harvesting', title: 'Harvesting', detail: 'Yield pass and area done', icon: Scissors }
          ];

          rightContent = (
              <div className="flex-1 min-h-0 flex flex-col">
                  <div className={`px-5 lg:px-6 py-4 border-b ${t.divider} flex items-center justify-between gap-4 ${theme === 'dark' ? 'bg-slate-950/80' : 'bg-white/80'}`}>
                      <div className="flex items-center gap-3 min-w-0">
                          <button onClick={() => actions.setViewMode('LIST')} className={`shrink-0 p-2 rounded-lg border ${t.borderCard} ${t.textMain} hover:brightness-95`}>
                              <ArrowLeftRight className="w-5 h-5 rotate-180" />
                          </button>
                          <div className="min-w-0">
                              <div className={`text-[10px] font-black uppercase tracking-widest ${t.textSub}`}>{activeField?.name || 'No field selected'}</div>
                              <h3 className={`text-xl font-black ${t.textMain} truncate`}>New Task</h3>
                          </div>
                      </div>
                      <button onClick={() => setFieldManagerOpen(false)} className={`p-2 rounded-lg border ${t.borderCard} ${t.textMain} hover:brightness-95`}>
                          <X className="w-5 h-5" />
                      </button>
                  </div>

                  <div className="flex-1 min-h-0 overflow-y-auto p-5 lg:p-6">
                      <div className="max-w-4xl">
                          <div className={`mb-5 rounded-xl border ${t.borderCard} ${softPanelBg} p-4 flex flex-wrap items-center justify-between gap-3`}>
                              <div>
                                  <div className={`text-[10px] uppercase font-black ${t.textSub}`}>Task target</div>
                                  <div className={`font-black ${t.textMain}`}>{activeField?.name || 'Select field first'}</div>
                              </div>
                              <div className={`text-sm ${t.textSub}`}>Creates a job under the selected field</div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {taskOptions.map(({ type, title, detail, icon: Icon }) => (
                                  <button
                                      key={type}
                                      onClick={() => saveNewTask(type)}
                                      className={`text-left rounded-xl border ${t.borderCard} ${softPanelBg} hover:border-blue-500 hover:bg-blue-500/5 transition-all p-5 flex items-start gap-4`}
                                  >
                                      <div className="shrink-0 w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                                          <Icon className="w-6 h-6" />
                                      </div>
                                      <div className="min-w-0">
                                          <div className={`font-black ${t.textMain}`}>{title}</div>
                                          <div className={`mt-1 text-sm ${t.textSub}`}>{detail}</div>
                                      </div>
                                  </button>
                              ))}
                          </div>
                      </div>
                  </div>
              </div>
          );
      } else if (activeField) {
          const boundaries = activeField.boundaries || [];
          const lines = activeField.lines || [];
          const tasks = activeField.tasks || [];

          rightContent = (
              <div className="flex-1 min-h-0 flex flex-col">
                  <div className={`px-5 lg:px-6 py-4 border-b ${t.divider} flex items-center justify-between gap-4 ${theme === 'dark' ? 'bg-slate-950/80' : 'bg-white/80'}`}>
                      <div className="min-w-0">
                          <div className="flex items-center gap-2 min-w-0">
                              <h3 className={`text-xl font-black ${t.textMain} truncate`}>{activeField.name}</h3>
                              {isLoadedActiveField && <span className="shrink-0 px-2 py-1 rounded-md bg-green-500/15 text-green-500 text-[10px] font-black uppercase">Loaded</span>}
                          </div>
                          <div className={`mt-1 flex flex-wrap items-center gap-2 text-xs ${t.textSub}`}>
                              <span>{activeField.area}</span>
                              <span className={t.textDim}>/</span>
                              <span>Last used {activeField.lastUsed || '--'}</span>
                          </div>
                      </div>
                      <button onClick={() => setFieldManagerOpen(false)} className={`p-2 rounded-lg border ${t.borderCard} ${t.textMain} hover:brightness-95`}>
                          <X className="w-5 h-5" />
                      </button>
                  </div>

                  <div className="flex-1 min-h-0 overflow-y-auto p-5 lg:p-6">
                      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
                          <StatCard icon={MapIcon} label="Area" value={activeField.area || '--'} sub="Saved field" />
                          <StatCard icon={MapPin} label="Boundaries" value={boundaries.length} sub={activeBoundaryIdx >= 0 && boundaries[activeBoundaryIdx] ? boundaries[activeBoundaryIdx].name || `Boundary ${activeBoundaryIdx + 1}` : 'None'} tone="text-orange-500" />
                          <StatCard icon={Route} label="Lines" value={lines.length} sub={activeLineId ? 'Guidance loaded' : 'Saved patterns'} tone="text-sky-500" />
                          <StatCard icon={FileText} label="Tasks" value={tasks.length} sub={activeTaskId ? 'Task running' : 'Job history'} tone="text-green-500" />
                      </div>

                      <div className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] gap-5">
                          <section className="space-y-5 min-w-0">
                              <MiniFieldPreview field={activeField} />

                              <div className={`rounded-xl border ${t.borderCard} ${softPanelBg} p-4`}>
                                  <SectionTitle icon={MapPin} title="Boundaries" actionLabel="Add" onAction={startBoundaryCreation} />
                                  {boundaries.length > 0 ? (
                                      <div className="space-y-2">
                                          {boundaries.map((boundary, index) => (
                                              <div
                                                  key={`${boundary.name || 'boundary'}-${index}`}
                                                  role="button"
                                                  tabIndex={0}
                                                  onClick={() => actions.setActiveBoundaryIdx(index)}
                                                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); actions.setActiveBoundaryIdx(index); } }}
                                                  className={`w-full flex items-center justify-between gap-3 p-3 rounded-lg border text-left transition-all ${activeBoundaryIdx === index ? t.selectedItem : `${t.borderCard} ${mutedPanelBg} hover:brightness-95`}`}
                                              >
                                                  <div className="flex items-center gap-3 min-w-0">
                                                      <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${activeBoundaryIdx === index ? 'bg-blue-600 text-white' : `${theme === 'dark' ? 'bg-slate-800' : 'bg-white'} ${t.textSub}`}`}>
                                                          <MapPin className="w-4 h-4" />
                                                      </div>
                                                      <div className="min-w-0">
                                                          <div className={`font-bold ${t.textMain} truncate`}>{boundary.name || `Boundary ${index + 1}`}</div>
                                                          <div className={`text-xs ${t.textSub}`}>{(boundary.points || boundary || []).length} points</div>
                                                      </div>
                                                  </div>
                                                  <div className="shrink-0 flex items-center gap-2">
                                                      {activeBoundaryIdx === index && <span className="hidden sm:inline px-2 py-1 rounded-md bg-blue-600 text-white text-[10px] font-black uppercase">Active</span>}
                                                      <button
                                                          onClick={(e) => { e.stopPropagation(); confirmDelete('boundary', null, index); }}
                                                          className="p-2 rounded-lg text-red-500 hover:bg-red-500/10"
                                                      >
                                                          <Trash2 className="w-4 h-4" />
                                                      </button>
                                                  </div>
                                              </div>
                                          ))}
                                      </div>
                                  ) : (
                                      <EmptyState label="No boundary saved. Record one to lock field shape." />
                                  )}
                              </div>
                          </section>

                          <section className="space-y-5 min-w-0">
                              <div className={`rounded-xl border ${t.borderCard} ${softPanelBg} p-4`}>
                                  <SectionTitle
                                      icon={Route}
                                      title="Guidance Lines"
                                      actionLabel="New"
                                      onAction={() => {
                                          setFieldManagerOpen(false);
                                          setLineModeModalOpen(true);
                                      }}
                                  />
                                  {lines.length > 0 ? (
                                      <div className="space-y-2">
                                          {lines.map((line) => {
                                              const Icon = getLineIcon(line);
                                              const active = activeLineId === line.id;
                                              return (
                                                  <div key={line.id} className={`flex items-center justify-between gap-3 p-3 rounded-lg border ${active ? 'border-blue-500 bg-blue-500/10' : `${t.borderCard} ${mutedPanelBg}`}`}>
                                                      <div className="flex items-center gap-3 min-w-0">
                                                          <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${active ? 'bg-blue-600 text-white' : `${theme === 'dark' ? 'bg-slate-800' : 'bg-white'} text-blue-500`}`}>
                                                              <Icon className="w-4 h-4" />
                                                          </div>
                                                          <div className="min-w-0">
                                                              <div className={`font-bold ${t.textMain} truncate`}>{line.name || 'Guidance line'}</div>
                                                              <div className={`text-xs ${t.textSub}`}>{(line.type || 'LINE').replaceAll('_', ' ')} / {line.date || '--'}</div>
                                                          </div>
                                                      </div>
                                                      <div className="shrink-0 flex items-center gap-2">
                                                          <button onClick={() => confirmDelete('line', line.id)} className="p-2 rounded-lg text-red-500 hover:bg-red-500/10">
                                                              <Trash2 className="w-4 h-4" />
                                                          </button>
                                                          <button onClick={() => handleLoadLine(line)} className={`px-3 py-2 rounded-lg text-xs font-black ${active ? 'bg-blue-600 text-white' : `border ${t.borderCard} ${t.textMain} hover:brightness-95`}`}>
                                                              {active ? 'Active' : 'Load'}
                                                          </button>
                                                      </div>
                                                  </div>
                                              );
                                          })}
                                      </div>
                                  ) : (
                                      <EmptyState label="No saved guidance line for this field." />
                                  )}
                              </div>

                              <div className={`rounded-xl border ${t.borderCard} ${softPanelBg} p-4`}>
                                  <SectionTitle icon={FileText} title="Tasks / Jobs" actionLabel="New" onAction={startTaskCreation} />
                                  {tasks.length > 0 ? (
                                      <div className="space-y-2">
                                          {tasks.map((task) => {
                                              const Icon = getTaskIcon(task);
                                              const active = activeTaskId === task.id;
                                              return (
                                                  <div key={task.id} className={`flex items-center justify-between gap-3 p-3 rounded-lg border ${active ? 'border-green-500 bg-green-500/10' : `${t.borderCard} ${mutedPanelBg}`}`}>
                                                      <div className="flex items-center gap-3 min-w-0">
                                                          <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${active ? 'bg-green-600 text-white' : `${theme === 'dark' ? 'bg-slate-800' : 'bg-white'} text-green-500`}`}>
                                                              <Icon className="w-4 h-4" />
                                                          </div>
                                                          <div className="min-w-0">
                                                              <div className={`font-bold ${t.textMain} truncate`}>{task.name}</div>
                                                              <div className={`text-xs ${t.textSub}`}>{task.date} / {task.status}</div>
                                                          </div>
                                                      </div>
                                                      <div className="shrink-0 flex items-center gap-2">
                                                          {active ? (
                                                              <>
                                                                  <button onClick={() => handleTaskAction(task, 'pause')} className="p-2 rounded-lg bg-orange-500/15 text-orange-500 hover:bg-orange-500/25">
                                                                      <Pause className="w-4 h-4" />
                                                                  </button>
                                                                  <button onClick={() => handleTaskAction(task, 'finish')} className="p-2 rounded-lg bg-green-500/15 text-green-500 hover:bg-green-500/25">
                                                                      <CheckSquare className="w-4 h-4" />
                                                                  </button>
                                                              </>
                                                          ) : (
                                                              <>
                                                                  {task.status !== 'Done' && (
                                                                      <button onClick={() => handleTaskAction(task, 'start')} className="p-2 rounded-lg bg-blue-500/15 text-blue-500 hover:bg-blue-500/25">
                                                                          <PlayCircle className="w-4 h-4" />
                                                                      </button>
                                                                  )}
                                                                  <button onClick={() => confirmDelete('task', task.id)} className="p-2 rounded-lg text-red-500 hover:bg-red-500/10">
                                                                      <Trash2 className="w-4 h-4" />
                                                                  </button>
                                                              </>
                                                          )}
                                                      </div>
                                                  </div>
                                              );
                                          })}
                                      </div>
                                  ) : (
                                      <EmptyState label="No task created yet." />
                                  )}
                              </div>
                          </section>
                      </div>
                  </div>

                  <div className={`px-5 lg:px-6 py-4 border-t ${t.divider} flex flex-wrap items-center justify-between gap-3 ${theme === 'dark' ? 'bg-slate-950/80' : 'bg-white/80'}`}>
                      <button onClick={handleDeleteField} className="px-5 py-3 rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/10 font-bold flex items-center gap-2">
                          <Trash2 className="w-5 h-5" />
                          Delete Field
                      </button>
                      <div className="flex flex-wrap items-center gap-3">
                          <button onClick={() => showNotification('Field sync queued', 'info')} className={`px-5 py-3 rounded-lg border ${t.borderCard} ${t.textMain} hover:brightness-95 font-bold flex items-center gap-2`}>
                              <Globe className="w-5 h-5 text-blue-500" />
                              Sync
                          </button>
                          <button onClick={handleLoadField} className="px-7 py-3 rounded-lg bg-green-600 text-white font-black hover:bg-green-500 shadow-lg shadow-green-900/20 flex items-center gap-2">
                              <CheckCircle2 className="w-5 h-5" />
                              {isLoadedActiveField ? 'Reload Field' : 'Load Field'}
                          </button>
                      </div>
                  </div>
              </div>
          );
      } else {
          rightContent = (
              <div className={`flex-1 flex items-center justify-center ${t.textDim}`}>
                  Select a field to view details
              </div>
          );
      }

      return (
          <div className="flex h-full w-full min-w-0">
              <div className={`w-[32%] min-w-[300px] max-w-[390px] border-r ${t.border} ${t.bgPanel} flex flex-col min-h-0`}>
                  <div className={`p-5 border-b ${t.divider}`}>
                      <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                              <h2 className={`text-xl font-black flex items-center gap-3 ${t.textMain}`}>
                                  <FolderOpen className="w-6 h-6 text-blue-500 shrink-0" />
                                  <span className="truncate">Field Library</span>
                              </h2>
                              <div className={`mt-1 text-xs ${t.textSub}`}>{fields.length} saved fields</div>
                          </div>
                          <button onClick={() => setFieldManagerOpen(false)} className={`shrink-0 p-2 rounded-lg border ${t.borderCard} ${t.textMain} hover:brightness-95 xl:hidden`}>
                              <X className="w-5 h-5" />
                          </button>
                      </div>
                      <button
                          onClick={startFieldCreation}
                          className="mt-4 w-full py-3 bg-blue-600 text-white rounded-xl font-black flex justify-center items-center gap-2 hover:bg-blue-500"
                      >
                          <Plus className="w-5 h-5" />
                          New Field
                      </button>
                  </div>

                  <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
                      {fields.map(f => {
                          const selected = selectedFieldId === f.id;
                          const loaded = loadedField?.id === f.id;
                          const fieldBoundaries = f.boundaries || [];
                          const fieldLines = f.lines || [];
                          const fieldTasks = f.tasks || [];
                          return (
                              <button
                                  key={f.id}
                                  onClick={() => { actions.setSelectedFieldId(f.id); actions.setViewMode('LIST'); }}
                                  className={`w-full text-left p-4 rounded-xl border transition-all ${selected ? t.selectedItem : `${t.bgCard} ${t.borderCard} hover:brightness-95`}`}
                              >
                                  <div className="flex items-start justify-between gap-3">
                                      <div className="flex items-start gap-3 min-w-0">
                                          <div className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${selected ? 'bg-blue-600 text-white' : `${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'} ${t.textSub}`}`}>
                                              <MapIcon className="w-5 h-5" />
                                          </div>
                                          <div className="min-w-0">
                                              <div className={`font-black ${t.textMain} truncate`}>{f.name}</div>
                                              <div className={`text-xs ${t.textSub}`}>{f.area || '--'} / {f.lastUsed || '--'}</div>
                                          </div>
                                      </div>
                                      {loaded ? <CheckCircle2 className="shrink-0 w-5 h-5 text-green-500" /> : selected ? <Check className="shrink-0 w-5 h-5 text-blue-500" /> : null}
                                  </div>
                                  <div className="mt-4 grid grid-cols-3 gap-2">
                                      <div className={`rounded-lg ${mutedPanelBg} border ${t.borderCard} px-2 py-2 text-center`}>
                                          <div className={`text-sm font-black ${t.textMain}`}>{fieldBoundaries.length}</div>
                                          <div className={`text-[9px] uppercase font-bold ${t.textSub}`}>Bounds</div>
                                      </div>
                                      <div className={`rounded-lg ${mutedPanelBg} border ${t.borderCard} px-2 py-2 text-center`}>
                                          <div className={`text-sm font-black ${t.textMain}`}>{fieldLines.length}</div>
                                          <div className={`text-[9px] uppercase font-bold ${t.textSub}`}>Lines</div>
                                      </div>
                                      <div className={`rounded-lg ${mutedPanelBg} border ${t.borderCard} px-2 py-2 text-center`}>
                                          <div className={`text-sm font-black ${t.textMain}`}>{fieldTasks.length}</div>
                                          <div className={`text-[9px] uppercase font-bold ${t.textSub}`}>Tasks</div>
                                      </div>
                                  </div>
                              </button>
                          );
                      })}
                  </div>
              </div>
              <div className={`flex-1 min-w-0 flex flex-col ${panelBg}`}>{rightContent}</div>
          </div>
      );
  };

  return (
    <div className="w-full h-screen bg-neutral-900 flex items-center justify-center p-4 overflow-hidden">
        <div className={`relative ${t.deviceFrame} shadow-2xl overflow-hidden flex border-[12px] rounded-2xl ring-4 ring-black/50 transition-colors duration-500`} style={{ width: '100%', maxWidth: '1280px', aspectRatio: '16/10', maxHeight: '100%' }}>
            {/* LEFT RAIL */}
            <aside className={`w-[8%] min-w-[70px] flex-shrink-0 ${t.bgPanel} border-r ${t.border} flex flex-col items-center py-[2%] z-30 shadow-2xl`}>
                <div className="mb-[15%]"><div className="w-10 h-10 lg:w-12 lg:h-12 bg-blue-600 rounded-xl flex items-center justify-center font-black text-xl lg:text-2xl italic shadow-blue-900/50 shadow-lg text-white">F</div></div>
                <nav className="flex-1 w-full flex flex-col items-center gap-2 pt-4">
                    <RailButton theme={t} icon={MapIcon} label="Run" active={!settingsOpen && !fieldManagerOpen && !linesPanelOpen} onClick={() => {setSettingsOpen(false); setFieldManagerOpen(false); setLinesPanelOpen(false);}} />
                    <div className={`h-px w-1/2 ${t.divider}`}></div>
                    <RailButton theme={t} icon={LayoutGrid} label="Field" active={fieldManagerOpen} onClick={() => {setFieldManagerOpen(true); setSettingsOpen(false); setLinesPanelOpen(false);}} />
                    <div className={`h-px w-1/2 ${t.divider}`}></div>
                    <RailButton
                        theme={t}
                        icon={Route}
                        label="Lines"
                        active={linesPanelOpen}
                        onClick={() => {setLinesPanelOpen(true); setFieldManagerOpen(false); setSettingsOpen(false);}}
                    />
                    <div className={`h-px w-1/2 ${t.divider}`}></div>
                    <RailButton theme={t} icon={Settings} label="System" active={settingsOpen} onClick={() => {setSettingsOpen(true); setFieldManagerOpen(false); setLinesPanelOpen(false);}} />
                </nav>
                <div className="mb-4 flex flex-col items-center gap-1">
                    <Signal className="w-4 h-4 lg:w-5 lg:h-5 text-green-500" />
                    <span className={`text-[9px] lg:text-[10px] ${t.textDim} font-mono`}>4G</span>
                    <span className={`text-[10px] lg:text-xs ${t.textMain} font-bold mt-1`}>{currentTime}</span>
                </div>
            </aside>

            {/* MAIN AREA */}
            <main className={`flex-1 relative flex flex-col ${t.textMain} font-sans select-none`}>
                {/* 2B) MAP CANVAS */}
                <div className={`absolute inset-x-0 top-[72px] bottom-[92px] ${t.bgMain} z-0 overflow-hidden transition-colors duration-500`}
                     onPointerDown={handleMapPointerDown}
                     onPointerMove={handleMapPointerMove}
                     onPointerUp={handleMapPointerUp}
                     onPointerCancel={handleMapPointerUp}
                     onPointerLeave={handleMapPointerUp}
                     style={{
                         cursor: 'default',
                         touchAction: 'none',
                          background: isMap3D
                              ? (theme === 'dark' ? '#15171e' : '#f3f4f6')
                              : undefined
                      }}>

                    {/* Heading-up map: zoom, map rotation, then world translation. */}
                    <div
                        data-map-layer="scale"
                        className="absolute w-full h-full z-0"
                        style={{
                            transformOrigin: '50% 60%',
                            transform: `scale(${zoomLevel})`,
                            transition: 'transform 0.1s linear',
                            willChange: 'transform'
                        }}
                    >
                        <div
                            data-map-layer="rotation"
                            className="absolute w-full h-full z-0"
                            style={{
                                transformOrigin: '50% 60%',
                                transform: `rotate(${sceneRotationDeg}deg)`,
                                transition: Math.abs(speed) > 0.1 ? 'none' : 'transform 0.16s ease-out',
                                willChange: 'transform'
                            }}
                        >
                        {!isMap3D && (
                            <>
                                <div
                                    data-map-layer="grid-2d-minor"
                                    className="absolute -inset-[75%] z-0 pointer-events-none"
                                    style={{
                                        opacity: theme === 'dark' ? 0.14 : 0.09,
                                        backgroundImage: `linear-gradient(${t.gridColor1} 1px, transparent 1px), linear-gradient(90deg, ${t.gridColor1} 1px, transparent 1px)`,
                                        backgroundSize: `${gridMinorSize}px ${gridMinorSize}px`,
                                        backgroundPosition: `${gridOffsetX2DMinor}px ${gridOffsetY2DMinor}px`
                                    }}
                                />
                                <div
                                    data-map-layer="grid-2d-major"
                                    className="absolute -inset-[75%] z-[1] pointer-events-none"
                                    style={{
                                        opacity: theme === 'dark' ? 0.26 : 0.17,
                                        backgroundImage: `linear-gradient(${t.gridColor1} 1.5px, transparent 1.5px), linear-gradient(90deg, ${t.gridColor1} 1.5px, transparent 1.5px)`,
                                        backgroundSize: `${gridMajorSize}px ${gridMajorSize}px`,
                                        backgroundPosition: `${gridOffsetX2DMajor}px ${gridOffsetY2DMajor}px`
                                    }}
                                />
                            </>
                        )}
                        <div
                            data-map-layer="world"
                            className="absolute w-full h-full z-0"
                            style={{
                                transform: `translate3d(${-worldPos.x + dragOffset.x}px, ${-worldPos.y + dragOffset.y}px, 0)`,
                                transition: isDraggingMap || Math.abs(speed) > 0.1 ? 'none' : 'transform 0.12s ease-out',
                                willChange: 'transform'
                            }}
                        >
                            {/* RENDER TEMP BOUNDARY WHILE RECORDING */}
                            {!isMap3D && isRecordingBoundary && tempBoundary.map((pt, i) => <div key={i} className="absolute w-2 h-2 bg-orange-500 rounded-full" style={{ left: `calc(50% + ${pt.x}px)`, top: `calc(60% + ${pt.y}px)` }} />)}

                            {/* RENDER SAVED BOUNDARIES (LOADED FIELD & NEW FIELD CREATION) */}
                            {!isMap3D && <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none">
                                <g style={{ transform: 'translate(50%, 60%)' }}>
                                    {(loadedField?.boundaries || []).concat(viewMode === 'CREATE_FIELD' ? currentFieldBoundaries : []).map((bound, bIdx) => (
                                        <polygon
                                            key={bIdx}
                                            points={(bound.points || bound).map(p => `${p.x},${p.y}`).join(' ')}
                                            fill={bIdx === activeBoundaryIdx ? "rgba(234, 179, 8, 0.2)" : "rgba(100, 116, 139, 0.2)"}
                                            stroke={bIdx === activeBoundaryIdx ? "#eab308" : "#64748b"}
                                            strokeWidth="2"
                                            strokeDasharray="5,5"
                                        />
                                    ))}
                                    {previewBoundary && (
                                        <polygon
                                            points={previewBoundary.map(p => `${p.x},${p.y}`).join(' ')}
                                            fill="rgba(34, 197, 94, 0.3)"
                                            stroke="#22c55e"
                                            strokeWidth="3"
                                            strokeDasharray="5,5"
                                        />
                                    )}
                                </g>
                            </svg>}


                            {!isMap3D && coverageTrail.map((point, i) => <div key={i} className="absolute bg-green-500/30" style={{ left: `calc(50% + ${point.x}px)`, top: `calc(60% + ${point.y}px)`, width: '20px', height: '20px', transform: `translate(-50%, -50%) rotate(${point.h}deg) scale(6, 1)` }}></div>)}

                            {/* CLOSING LOOP LINE (Visual Guide) */}
                            {!isMap3D && isRecordingBoundary && tempBoundary.length > 0 && (
                                <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none">
                                    <line
                                        x1={`calc(50% + ${tempBoundary[0].x}px)`}
                                        y1={`calc(60% + ${tempBoundary[0].y}px)`}
                                        x2={`calc(50% + ${worldPos.x}px)`}
                                        y2={`calc(60% + ${worldPos.y}px)`}
                                        stroke="orange" strokeWidth="2" strokeDasharray="10,5" strokeOpacity="0.7"
                                    />
                                </svg>
                            )}

                            {/* DYNAMIC DRAWING LAYER (RED LINES) & GUIDANCE LINES (BLUE) */}
                            <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none">
                                <g style={{ transform: 'translate(50%, 60%)' }}>
                                    {!isMap3D && !guidanceLine && pointA && lineType === 'STRAIGHT_AB' && <line x1={pointA.x} y1={pointA.y} x2={worldPos.x} y2={worldPos.y} stroke="red" strokeWidth="3" />}
                                    {!isMap3D && isRecordingCurve && <polyline points={curvePoints.map(p => `${p.x},${p.y}`).join(' ') + ` ${worldPos.x},${worldPos.y}`} fill="none" stroke="red" strokeWidth="3" />}
                                    {!isMap3D && !guidanceLine && pivotCenter && lineType === 'PIVOT' && <line x1={pivotCenter.x} y1={pivotCenter.y} x2={worldPos.x} y2={worldPos.y} stroke="red" strokeWidth="3" />}
                                    {renderGuidanceLine()}
                                </g>
                            </svg>

                            {/* CURVE & PIVOT DOTS/CIRCLES */}
                            {!isMap3D && ((guidanceLine === 'CURVE' || guidanceLine === 'COMBINATION') || isRecordingCurve) && curvePoints.map((pt, i) => <div key={i} className="absolute w-2 h-2 bg-blue-400 rounded-full" style={{ left: `calc(50% + ${pt.x}px)`, top: `calc(60% + ${pt.y}px)` }}></div>)}
                            {!isMap3D && guidanceLine === 'PIVOT' && pivotCenter && pivotRadius && [0, 1].map(offset => (<div key={offset} className="absolute border-2 border-blue-500/30 rounded-full" style={{left: `calc(50% + ${pivotCenter.x}px)`, top: `calc(60% + ${pivotCenter.y}px)`, width: `${(pivotRadius + offset * 120) * 2}px`, height: `${(pivotRadius + offset * 120) * 2}px`, transform: 'translate(-50%, -50%)'}}></div>))}

                            {!isMap3D && pointA && <div className="absolute flex flex-col items-center" style={{ left: `calc(50% + ${pointA.x}px)`, top: `calc(60% + ${pointA.y}px)`, transform: 'translate(-50%, -50%)' }}><div className="w-6 h-6 bg-blue-600 rounded-full border-2 border-white shadow-lg text-white flex items-center justify-center font-bold text-xs">A</div></div>}
                            {/* A+ Point Marker */}
                            {!isMap3D && aPlusPoint && <div className="absolute flex flex-col items-center" style={{ left: `calc(50% + ${aPlusPoint.x}px)`, top: `calc(60% + ${aPlusPoint.y}px)`, transform: 'translate(-50%, -50%)' }}><div className="w-6 h-6 bg-purple-600 rounded-full border-2 border-white shadow-lg text-white flex items-center justify-center font-bold text-xs">A+</div></div>}

                            {!isMap3D && pointB && <div className="absolute flex flex-col items-center" style={{ left: `calc(50% + ${pointB.x}px)`, top: `calc(60% + ${pointB.y}px)`, transform: 'translate(-50%, -50%)' }}><div className="w-6 h-6 bg-blue-600 rounded-full border-2 border-white shadow-lg text-white flex items-center justify-center font-bold text-xs">B</div></div>}

                        </div>
                        </div>
                    </div>

                    {renderGroundPlane3D()}

                    {isMap3D && (
                        <svg
                            data-guidance-layer="3d"
                            className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-[12]"
                            viewBox="0 0 1000 700"
                            preserveAspectRatio="none"
                            style={{
                                opacity: viewTransitioning ? 0.72 : 1,
                                transform: viewTransitioning ? 'scale(0.985)' : 'scale(1)',
                                transformOrigin: '50% 60%',
                                transition: 'opacity 0.28s ease, transform 0.28s ease',
                                willChange: 'opacity, transform'
                            }}
                        >
                            {renderGuidanceLine3D()}
                        </svg>
                    )}

                    {isMap3D && (
                        <div className="absolute inset-0 pointer-events-none z-10">
                            <div
                                className="absolute inset-x-0 top-0 h-[42%]"
                                style={{
                                    background: theme === 'dark'
                                        ? 'linear-gradient(180deg, rgba(21,23,30,0.02) 0%, rgba(21,23,30,0.01) 54%, rgba(21,23,30,0) 100%)'
                                        : 'linear-gradient(180deg, rgba(243,244,246,0.02) 0%, rgba(243,244,246,0.01) 54%, rgba(243,244,246,0) 100%)'
                                }}
                            />
                            <div
                                className="absolute inset-x-0 bottom-0 h-[24%]"
                                style={{
                                    background: theme === 'dark'
                                        ? 'linear-gradient(0deg, rgba(21,23,30,0.05) 0%, rgba(21,23,30,0) 100%)'
                                        : 'linear-gradient(0deg, rgba(243,244,246,0.04) 0%, rgba(243,244,246,0) 100%)'
                                }}
                            />
                        </div>
                    )}

                    {/* Vehicle anchor: screen-stable in heading-up, independent from the pitched map plane. */}
                    <div
                        data-vehicle-anchor
                        className="absolute flex flex-col items-center pointer-events-none z-[15]"
                        style={{
                            left: `calc(50% + ${vehicleScreenOffsetX}px)`,
                            top: `calc(60% + ${vehicleScreenOffsetY}px)`,
                            transform: `translate3d(-50%, -50%, 0) rotate(${vehicleScreenHeading}deg) scale(${vehicleScreenScale * (viewTransitioning ? 0.96 : 1)})`,
                            transformOrigin: 'center center',
                            transition: viewTransitioning ? 'transform 0.28s ease' : 'none',
                            willChange: 'transform'
                        }}
                    >
                        <div className="relative group">
                            <TractorVehicle mode={steeringMode} steeringAngle={steeringAngle} implementWidth={implementSettings.width} vehicleSettings={vehicleSettings} viewMode={sceneViewMode} />
                        </div>
                    </div>

                    {/* RE-CENTER BUTTON */}
                    {(dragOffset.x !== 0 || dragOffset.y !== 0) && (
                        <button
                            onClick={handleRecenter}
                            className={`absolute bottom-32 right-[120px] p-2 ${t.bgCard} backdrop-blur border ${t.borderCard} rounded-lg ${t.textMain} shadow-lg flex items-center gap-2 z-20`}
                        >
                            <Crosshair className="w-6 h-6 text-blue-500" />
                            <span className="text-xs font-bold hidden lg:inline">Re-center</span>
                        </button>
                    )}

                    {renderFeatureStatusStrip()}
                    {renderMissionOverview()}
                    {renderCompassWidget()}
                </div>

                {/* ... rest of the app ... */}
                <header className={`h-[72px] min-h-[72px] ${t.bgHeader} backdrop-blur-md grid grid-cols-[minmax(240px,1fr)_minmax(290px,390px)_minmax(270px,1fr)] items-center gap-4 px-[3%] z-20 border-b ${t.border}`}>
                    <div className="min-w-0 flex items-center gap-3">
                        <div className={`shrink-0 w-10 h-10 rounded-xl border ${t.borderCard} ${theme === 'dark' ? 'bg-slate-900' : 'bg-gray-100'} flex items-center justify-center`}>
                            <MapIcon className="w-5 h-5 text-blue-500" />
                        </div>
                        <div className="min-w-0">
                            <div className={`flex items-center gap-2 text-[10px] lg:text-xs ${t.textSub} uppercase tracking-wider font-black`}>
                                <Layers className="w-3 h-3 shrink-0" />
                                <span className="truncate">Run / Field / Guidance</span>
                            </div>
                            <div className="min-w-0 flex items-center gap-1.5 lg:gap-2">
                                <span className={`${t.textMain} font-black text-xs lg:text-base truncate`}>{activeFieldRecord?.name || 'No Field Loaded'}</span>
                                <span className={`${t.textDim} shrink-0`}>/</span>
                                <span className="text-blue-500 font-black text-xs lg:text-base truncate">{activeLineRecord?.name || getGuidanceModeLabel()}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-center">
                        {renderGuidanceLightbar()}
                    </div>
                    <div className="min-w-0 flex items-center justify-end gap-2">
                        <div className={`hidden lg:flex h-11 px-3 rounded-lg border ${t.borderCard} ${theme === 'dark' ? 'bg-slate-900/70' : 'bg-gray-50'} flex-col items-end justify-center`}>
                            <span className={`font-black leading-none ${t.textMain}`}>{`${getDisplayHeading()}\u00b0`}</span>
                            <span className={`text-[10px] ${t.textSub}`}>Heading</span>
                        </div>
                        <div className={`h-11 px-3 rounded-lg border ${t.borderCard} ${theme === 'dark' ? 'bg-slate-900/70' : 'bg-gray-50'} flex flex-col items-end justify-center`}>
                            <div className={`flex items-center gap-1 ${t.textMain}`}><Globe className="w-3 h-3 lg:w-4 lg:h-4 text-blue-500" /><span className="text-sm lg:text-base font-black font-mono">{satelliteCount}</span></div>
                            <span className={`text-[9px] lg:text-[10px] ${t.textDim}`}>Sats</span>
                        </div>
                        <div className={`h-11 px-4 rounded-lg border min-w-[74px] flex items-center justify-center ${getRtkColor()}`}>
                            <span className="text-xs font-black">{rtkStatus}</span>
                        </div>
                    </div>
                </header>

                {/* BOTTOM BAR */}
                <div className={`absolute bottom-0 left-0 right-0 h-[108px] min-h-[96px] ${t.bgBottom} backdrop-blur-xl border-t ${t.border} grid grid-cols-[minmax(178px,0.82fr)_minmax(360px,auto)_minmax(190px,0.82fr)] items-center gap-3 px-[3%] z-30`}>
                    <div className="min-w-0 flex items-center gap-2.5 h-full py-3">
                        <button onClick={handleUTurn} className={`h-full min-w-[84px] px-2.5 rounded-xl border ${turnAssistActive ? 'border-blue-500 bg-blue-500/10' : `${t.borderCard} ${theme==='dark'?'bg-slate-900':'bg-gray-100'}`} flex flex-col items-center justify-center active:scale-95`}>
                            <CornerUpLeft className={`w-7 h-7 ${turnAssistActive ? 'text-blue-500' : t.textDim}`}/>
                            <span className={`text-[11px] font-black ${turnAssistActive ? 'text-blue-500' : t.textSub}`}>U-TURN</span>
                        </button>
                        <button onClick={() => setIsRecording(!isRecording)} className={`h-full min-w-[88px] px-2.5 rounded-xl border flex flex-col items-center justify-center ${isRecording?'bg-red-900/20 border-red-500 text-red-500':`${theme==='dark'?'bg-slate-900 border-slate-700':'bg-gray-100 border-gray-300'} ${t.textDim}`}`}>
                            <div className={`w-4 h-4 rounded-full ${isRecording?'bg-red-500 animate-pulse':'bg-slate-500'}`}/>
                            <span className="text-[11px] font-black tracking-widest">{isRecording?'REC':'COVERAGE'}</span>
                        </button>
                        <div className={`hidden xl:flex min-w-0 h-full px-4 rounded-xl border ${t.borderCard} ${theme==='dark'?'bg-slate-900/70':'bg-gray-100'} flex-col justify-center`}>
                            <span className={`text-[10px] uppercase font-black ${t.textSub}`}>Task area</span>
                            <span className={`text-2xl font-black leading-none ${theme==='dark'?'text-slate-200':'text-slate-700'}`}>{workedArea.toFixed(2)}</span>
                            <span className={`text-[10px] uppercase font-bold ${t.textSub}`}>ha done</span>
                        </div>
                    </div>

                    <div className={`rounded-xl border ${t.borderCard} ${theme==='dark'?'bg-slate-900/80':'bg-gray-100/90'} px-3 py-3 shadow-sm`}>
                        <div className="flex items-center justify-center gap-2.5">
                            <button
                                onPointerDown={(e) => { e.preventDefault(); setSteerKey('ArrowLeft', true); }}
                                onPointerUp={() => setSteerKey('ArrowLeft', false)}
                                onPointerLeave={() => setSteerKey('ArrowLeft', false)}
                                onPointerCancel={() => setSteerKey('ArrowLeft', false)}
                                onMouseDown={(e) => { e.preventDefault(); setSteerKey('ArrowLeft', true); }}
                                onMouseUp={() => setSteerKey('ArrowLeft', false)}
                                onMouseLeave={() => setSteerKey('ArrowLeft', false)}
                                onClick={() => updateSteering(Math.max(steeringAngle - 5, -45))}
                                className={`w-10 h-10 rounded-xl border ${t.borderCard} ${theme==='dark'?'bg-slate-900':'bg-gray-100'} flex items-center justify-center active:scale-95 ${steeringAngle < -1 ? 'text-blue-500' : t.textMain}`}
                                title="Steer left"
                            >
                                <RotateCcw className="w-5 h-5" />
                            </button>
                            <button onClick={() => updateManualSpeed(manualTargetSpeed - 1)} className={`w-10 h-10 rounded-xl border ${t.borderCard} ${theme==='dark'?'bg-slate-900':'bg-gray-100'} flex items-center justify-center active:scale-95`}><Minus className={`w-5 h-5 ${t.textMain}`} /></button>
                            <div className="text-center min-w-[86px]">
                                <div className={`text-4xl font-black leading-none ${t.textMain}`}>{Math.abs(speed).toFixed(1)}</div>
                                <div className={`text-[11px] ${t.textSub} uppercase font-black`}>km/h</div>
                            </div>
                            <button onClick={() => updateManualSpeed(manualTargetSpeed + 1)} className={`w-10 h-10 rounded-xl border ${t.borderCard} ${theme==='dark'?'bg-slate-900':'bg-gray-100'} flex items-center justify-center active:scale-95`}><Plus className={`w-5 h-5 ${t.textMain}`} /></button>
                            <button
                                onPointerDown={(e) => { e.preventDefault(); setSteerKey('ArrowRight', true); }}
                                onPointerUp={() => setSteerKey('ArrowRight', false)}
                                onPointerLeave={() => setSteerKey('ArrowRight', false)}
                                onPointerCancel={() => setSteerKey('ArrowRight', false)}
                                onMouseDown={(e) => { e.preventDefault(); setSteerKey('ArrowRight', true); }}
                                onMouseUp={() => setSteerKey('ArrowRight', false)}
                                onMouseLeave={() => setSteerKey('ArrowRight', false)}
                                onClick={() => updateSteering(Math.min(steeringAngle + 5, 45))}
                                className={`w-10 h-10 rounded-xl border ${t.borderCard} ${theme==='dark'?'bg-slate-900':'bg-gray-100'} flex items-center justify-center active:scale-95 ${steeringAngle > 1 ? 'text-blue-500' : t.textMain}`}
                                title="Steer right"
                            >
                                <RotateCw className="w-5 h-5" />
                            </button>
                            <button onClick={stopVehicle} className="w-12 h-10 rounded-xl border border-red-500/40 bg-red-500/10 text-red-500 flex items-center justify-center active:scale-95"><Square className="w-4 h-4" /></button>
                        </div>
                    </div>

                    <div className="min-w-0 flex items-center justify-end">
                        <button onClick={toggleSteering} className={`h-[78px] w-full max-w-[250px] rounded-2xl flex items-center justify-between px-5 shadow-2xl active:scale-95 border ${steeringMode==='AUTO'?'bg-green-600 border-green-400':`${theme==='dark'?'bg-slate-800 border-slate-600':'bg-gray-800 border-gray-600'}`}`}>
                            <div className="flex flex-col items-start min-w-0">
                                <span className={`text-xs font-black uppercase ${steeringMode==='AUTO'?'text-green-200':'text-slate-400'}`}>Autosteer</span>
                                <span className="text-2xl font-black text-white truncate">{steeringMode==='AUTO'?'ENGAGED':'READY'}</span>
                                <span className={`text-[10px] font-bold ${steeringMode==='AUTO'?'text-green-100':'text-slate-400'}`}>{rtkStatus === 'FIX' ? 'RTK fixed' : 'Waiting RTK'}</span>
                            </div>
                            <div className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${steeringMode==='AUTO'?'bg-white/20 text-white':'bg-black/20 text-slate-400'}`}>
                                <SteeringWheelIcon className={`w-8 h-8 ${steeringMode==='AUTO'?'animate-spin-slow':''}`}/>
                            </div>
                        </button>
                    </div>
                </div>

                {/* MODALS */}
                {/* ... existing modals ... */}
                {cameraPanelOpen && renderCameraPanel()}
                {diagnosticsPanelOpen && renderDiagnosticsPanel()}
                {fieldManagerOpen && <div className={`absolute inset-0 ${theme === 'dark' ? 'bg-slate-950/95' : 'bg-gray-100/95'} z-40 flex overflow-hidden`}>{renderFieldManager()}</div>}

                {linesPanelOpen && (
                    <div className={`absolute inset-0 ${theme === 'dark' ? 'bg-slate-950/95' : 'bg-gray-100/95'} z-40 overflow-hidden`}>
                        {renderLinesPanel()}
                    </div>
                )}

                {settingsOpen && renderSettingsPanel()}
                {menuOpen && !fieldManagerOpen && !lineModeModalOpen && !linesPanelOpen && !manualHeadingModalOpen && !boundaryAlertOpen && !deleteModalOpen && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6"><div className={`${t.bgPanel} rounded-2xl w-full max-w-lg border ${t.borderCard} shadow-2xl flex flex-col max-h-[85vh]`}><div className={`p-4 border-b ${t.divider} flex justify-between items-center`}><div className="flex items-center gap-2"><Menu className="w-5 h-5 text-blue-500" /><h3 className={`font-bold text-lg ${t.textMain}`}>Quick Menu</h3></div><button onClick={() => setMenuOpen(false)} className={`px-3 py-1 ${theme === 'dark' ? 'bg-slate-800' : 'bg-gray-100'} rounded-lg text-xs hover:brightness-95 border ${t.borderCard} ${t.textMain}`}>Close</button></div><div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto"><div className={`sm:col-span-2 p-3 rounded-xl border ${t.borderCard} ${theme === 'dark' ? 'bg-slate-900' : 'bg-white'}`}><div className="flex items-center gap-2 mb-3"><Gauge className="w-5 h-5 text-orange-500" /><span className={`font-bold ${t.textMain} text-sm`}>Manual Drive</span></div><div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div className="flex flex-col gap-1"><span className={`text-[10px] ${t.textSub} uppercase font-bold`}>Speed</span><div className="flex items-center gap-2"><input type="range" min="-5" max="15" value={manualTargetSpeed} onChange={(e) => updateManualSpeed(Number(e.target.value))} className="w-full accent-orange-500 h-1.5 bg-slate-600 rounded-lg appearance-none cursor-pointer" /><span className={`font-mono font-bold text-lg w-12 text-center ${t.textMain}`}>{manualTargetSpeed}</span></div></div><div className="flex flex-col gap-1"><span className={`text-[10px] ${t.textSub} uppercase font-bold`}>Steering ({`${steeringAngle.toFixed(1)}\u00b0`})</span><div className="flex items-center gap-1"><button onClick={() => updateSteering(Math.max(steeringAngle - 5, -35))} className={`p-1.5 rounded-lg border ${t.borderCard} hover:bg-orange-500/20 active:scale-95`}><RotateCcw className={`w-4 h-4 ${t.textMain}`} /></button><input type="range" min="-35" max="35" value={steeringAngle} onChange={(e) => updateSteering(Number(e.target.value))} className="w-full accent-blue-500 h-1.5 bg-slate-600 rounded-lg appearance-none cursor-pointer" /><button onClick={() => updateSteering(Math.min(steeringAngle + 5, 35))} className={`p-1.5 rounded-lg border ${t.borderCard} hover:bg-orange-500/20 active:scale-95`}><RotateCw className={`w-4 h-4 ${t.textMain}`} /></button></div></div></div><p className={`text-[10px] ${t.textSub} mt-2 text-center`}>Arrow keys: Up / Down / Left / Right</p></div><QuickAction theme={t} icon={Video} label="Camera" sub="Monitor" onClick={() => { setMenuOpen(false); setCameraPanelOpen(true); }} /><QuickAction theme={t} icon={AlertTriangle} label="Diagnostics" sub="OBD / Logs" onClick={() => { setMenuOpen(false); setDiagnosticsPanelOpen(true); }} /><QuickAction theme={t} icon={Cpu} label="ISOBUS" sub="UT / TC" onClick={() => { setMenuOpen(false); setSettingsTab('isobus'); setSettingsOpen(true); }} /><QuickAction theme={t} icon={CornerUpLeft} label="U-Turn" sub="Headland" onClick={() => { setMenuOpen(false); setSettingsTab('uturn'); setSettingsOpen(true); }} /><QuickAction theme={t} icon={Activity} label="Terrain" sub="Comp." onClick={() => toggleFeatureSetting('terrainCompensation')} /><QuickAction theme={t} icon={Globe} label="Leveling" sub="GNSS" onClick={() => { setMenuOpen(false); setSettingsTab('landlevel'); setSettingsOpen(true); }} /><QuickAction theme={t} icon={Save} label="Data" sub="USB / Export" onClick={() => { setMenuOpen(false); setSettingsTab('data'); setSettingsOpen(true); }} /><QuickAction theme={t} icon={Navigation} label="NMEA" sub="Out" onClick={() => showNotification('NMEA output ready', 'info')} /></div></div></div>
                )}
                {lineNameModalOpen && (
                  <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6">
                      <div className={`${t.bgPanel} rounded-2xl w-full max-w-md border ${t.borderCard} shadow-2xl p-6`}>
                          <h3 className={`text-xl font-bold ${t.textMain} mb-4`}>Name Guidance Line</h3>
                          <input
                              type="text"
                              value={tempLineName}
                              onChange={(e) => setTempLineName(e.target.value)}
                              className={`w-full p-4 rounded-xl border ${t.borderCard} ${t.bgInput} ${t.textMain} focus:border-blue-500 outline-none mb-6`}
                              autoFocus
                          />
                          <div className="flex justify-end gap-3">
                              <button onClick={() => { setLineNameModalOpen(false); resetLines(); setIsCreating(false); setDockMenuOpen(true); }} className={`px-6 py-2 rounded-lg border ${t.borderCard} ${t.textSub} font-bold`}>Cancel</button>
                              <button onClick={handleSaveLine} className="px-6 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-500">Save</button>
                          </div>
                      </div>
                  </div>
                )}

                {/* NEW: Manual Heading Modal */}
                {manualHeadingModalOpen && (
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6">
                        <div className={`${t.bgPanel} rounded-2xl w-full max-w-sm border ${t.borderCard} shadow-2xl p-6`}>
                            <h3 className={`text-xl font-bold ${t.textMain} mb-4`}>Input Heading</h3>
                            <div className="flex flex-col gap-4 mb-6">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        value={tempManualHeading}
                                        onChange={(e) => setTempManualHeading(e.target.value)}
                                        className={`flex-1 p-4 rounded-xl border ${t.borderCard} ${t.bgInput} ${t.textMain} font-mono text-2xl font-bold text-center focus:border-blue-500 outline-none`}
                                        autoFocus
                                    />
                                    <span className={`text-2xl font-bold ${t.textSub}`}>{"\u00b0"}</span>
                                </div>
                                <div className={`text-center font-bold ${t.textSub} bg-blue-500/10 py-2 rounded-lg`}>
                                    {getCardinalDirection(tempManualHeading)}
                                </div>
                            </div>
                            <div className="flex justify-end gap-3">
                                <button onClick={() => setManualHeadingModalOpen(false)} className={`px-6 py-2 rounded-lg border ${t.borderCard} ${t.textSub} font-bold`}>Cancel</button>
                                <button onClick={() => handleSetAPlus_HeadingManual(tempManualHeading)} className="px-6 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-500">Set</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* NEW: Boundary Name Modal */}
                {boundaryNameModalOpen && (
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6">
                        <div className={`${t.bgPanel} rounded-2xl w-full max-w-md border ${t.borderCard} shadow-2xl p-6`}>
                            <h3 className={`text-xl font-bold ${t.textMain} mb-4`}>Name Boundary</h3>
                            <input
                                type="text"
                                value={tempBoundaryName}
                                onChange={(e) => setTempBoundaryName(e.target.value)}
                                className={`w-full p-4 rounded-xl border ${t.borderCard} ${t.bgInput} ${t.textMain} focus:border-blue-500 outline-none mb-6`}
                                autoFocus
                            />
                            <div className="flex justify-end gap-3">
                                <button onClick={() => {setBoundaryNameModalOpen(false); setDockMenuOpen(true); actions.setIsRecordingBoundary(false); actions.setTempBoundary([])}} className={`px-6 py-2 rounded-lg border ${t.borderCard} ${t.textSub} font-bold`}>Cancel</button>
                                <button onClick={handleSaveBoundary} className="px-6 py-2 rounded-lg bg-green-600 text-white font-bold hover:bg-green-500">Save</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* NEW: Boundary Alert Modal (Use Case 2 & 3) */}
                {boundaryAlertOpen && (
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6">
                        <div className={`${t.bgPanel} rounded-2xl w-full max-w-md border ${t.borderCard} shadow-2xl p-6 text-center`}>
                            <div className="flex justify-center mb-4">
                                <div className="p-3 bg-orange-500/20 rounded-full">
                                    <AlertTriangle className="w-8 h-8 text-orange-500" />
                                </div>
                            </div>
                            <h3 className={`text-xl font-bold ${t.textMain} mb-2`}>
                                {boundaryAlertType === 'AUTO_CLOSE' ? 'Close boundary?' : 'Boundary not closed'}
                            </h3>
                            <p className={`${t.textSub} mb-6`}>
                                {boundaryAlertType === 'AUTO_CLOSE'
                                    ? 'Vehicle is near starting point. Do you want to automatically connect boundary into a closed loop?'
                                    : 'Vehicle has not crossed the old boundary line. Do you want to continue running to complete or cancel?'}
                            </p>

                            <div className="flex justify-center gap-3">
                                {boundaryAlertType === 'AUTO_CLOSE' ? (
                                    <>
                                        <button onClick={() => handleBoundaryAlertConfirm('NO')} className={`px-6 py-2 rounded-lg border ${t.borderCard} ${t.textSub} font-bold`}>Continue running</button>
                                        <button onClick={() => handleBoundaryAlertConfirm('YES')} className="px-6 py-2 rounded-lg bg-green-600 text-white font-bold hover:bg-green-500">Close loop</button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={() => handleBoundaryAlertConfirm('CANCEL')} className={`px-6 py-2 rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/10 font-bold`}>Cancel</button>
                                        <button onClick={() => handleBoundaryAlertConfirm('CONTINUE')} className="px-6 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-500">Continue running</button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* NEW: Delete Confirmation Modal */}
                {deleteModalOpen && (
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6">
                        <div className={`${t.bgPanel} rounded-2xl w-full max-w-sm border ${t.borderCard} shadow-2xl p-6 text-center`}>
                             <div className="flex justify-center mb-4">
                                <div className="p-3 bg-red-500/20 rounded-full">
                                    <Trash2 className="w-8 h-8 text-red-500" />
                                </div>
                            </div>
                            <h3 className={`text-xl font-bold ${t.textMain} mb-2`}>Confirm delete?</h3>
                            <p className={`${t.textSub} mb-6`}>
                                This action cannot be undone. Are you sure you want to delete this item?
                            </p>
                            <div className="flex justify-center gap-3">
                                <button onClick={() => setDeleteModalOpen(false)} className={`px-6 py-2 rounded-lg border ${t.borderCard} ${t.textSub} font-bold`}>Cancel</button>
                                <button onClick={executeDelete} className="px-6 py-2 rounded-lg bg-red-600 text-white font-bold hover:bg-red-500">Delete permanently</button>
                            </div>
                        </div>
                    </div>
                )}

                {lineModeModalOpen && (
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6"><div className={`${t.bgPanel} rounded-2xl w-full max-w-3xl max-h-[88vh] overflow-y-auto border ${t.borderCard} shadow-2xl p-6`}><div className="flex justify-between items-center mb-6"><h3 className={`text-xl font-bold ${t.textMain}`}>Select Guidance Mode</h3><button onClick={() => setLineModeModalOpen(false)} className={`p-2 rounded-lg hover:bg-slate-800/50 ${t.textDim}`}><X className="w-6 h-6" /></button></div><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><button onClick={() => selectLineMode('STRAIGHT_AB')} className={`p-6 rounded-xl border ${t.borderCard} ${lineType === 'STRAIGHT_AB' ? 'bg-blue-500/10 border-blue-500' : 'hover:bg-slate-800/30'} flex flex-col items-center gap-3 transition-all`}><GitCommitHorizontal className={`w-12 h-12 ${lineType === 'STRAIGHT_AB' ? 'text-blue-500' : t.textDim}`} /><span className={`font-bold text-lg ${t.textMain}`}>Straight AB</span><span className={`text-xs ${t.textSub}`}>Standard straight line A to B</span></button><button onClick={() => selectLineMode('A_PLUS')} className={`p-6 rounded-xl border ${t.borderCard} ${lineType === 'A_PLUS' ? 'bg-blue-500/10 border-blue-500' : 'hover:bg-slate-800/30'} flex flex-col items-center gap-3 transition-all`}><ArrowUpFromDot className={`w-12 h-12 ${lineType === 'A_PLUS' ? 'text-blue-500' : t.textDim}`} /><span className={`font-bold text-lg ${t.textMain}`}>A+ Heading</span><span className={`text-xs ${t.textSub}`}>Straight line with defined heading</span></button><button onClick={() => selectLineMode('CURVE')} className={`p-6 rounded-xl border ${t.borderCard} ${lineType === 'CURVE' ? 'bg-blue-500/10 border-blue-500' : 'hover:bg-slate-800/30'} flex flex-col items-center gap-3 transition-all`}><Spline className={`w-12 h-12 ${lineType === 'CURVE' ? 'text-blue-500' : t.textDim}`} /><span className={`font-bold text-lg ${t.textMain}`}>Curve</span><span className={`text-xs ${t.textSub}`}>Adaptive curved guidance</span></button><button onClick={() => selectLineMode('PIVOT')} className={`p-6 rounded-xl border ${t.borderCard} ${lineType === 'PIVOT' ? 'bg-blue-500/10 border-blue-500' : 'hover:bg-slate-800/30'} flex flex-col items-center gap-3 transition-all`}><CircleDashed className={`w-12 h-12 ${lineType === 'PIVOT' ? 'text-blue-500' : t.textDim}`} /><span className={`font-bold text-lg ${t.textMain}`}>Pivot</span><span className={`text-xs ${t.textSub}`}>Center pivot circular pattern</span></button><button onClick={() => selectLineMode('COMBINATION')} className={`p-6 rounded-xl border ${t.borderCard} ${lineType === 'COMBINATION' ? 'bg-blue-500/10 border-blue-500' : 'hover:bg-slate-800/30'} flex flex-col items-center gap-3 transition-all`}><AlignJustify className={`w-12 h-12 ${lineType === 'COMBINATION' ? 'text-blue-500' : t.textDim}`} /><span className={`font-bold text-lg ${t.textMain}`}>Combination</span><span className={`text-xs ${t.textSub}`}>Curve plus straight segments</span></button>
                    {/* MULTI-LINE OPTION */}
                    <div className={`md:col-span-2 mt-4 flex items-center justify-between p-4 rounded-xl border ${t.borderCard} ${t.bgInput}`}>
                        <span className={`text-sm font-bold ${t.textMain}`}>Parallel Guidance Lines</span>
                        <div onClick={handleToggleMultiLine} className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${isMultiLineMode ? 'bg-blue-600' : 'bg-slate-600'}`}>
                            <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${isMultiLineMode ? 'translate-x-6' : ''}`} />
                        </div>
                    </div>
                    </div></div></div>
                )}
                {/* ACTION DOCK */}
                <div className="absolute right-4 top-[150px] bottom-[128px] w-[96px] z-20 flex flex-col justify-center pointer-events-none">
                    <div className="pointer-events-auto w-full flex flex-col items-end gap-2">
                        {renderActionDock()}
                    </div>
                </div>
            </main>
        </div>
    </div>
  );
};
