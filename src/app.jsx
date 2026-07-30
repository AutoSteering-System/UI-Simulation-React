const { useState, useEffect, useRef } = React;

const MAP_ZOOM_REFERENCE = 0.6;
const DEFAULT_MAP_ZOOM = 1.2;
const MIN_MAP_ZOOM = 0.6;
const MAX_MAP_ZOOM = 2.4;
const MAP_ZOOM_STEP = 0.2;

const DEFAULT_FEATURE_SETTINGS = {
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
    angleSensorEnabled: true,
    mobaTrac: false,
    landLeveling: false,
    dataTransfer: true
};

const WifiGlyph = ({ className = '' }) => (
    <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        className={className}
    >
        <path d="M3 8.5C8.3 4.2 15.7 4.2 21 8.5" />
        <path d="M6.3 12c3.3-2.7 8.1-2.7 11.4 0" />
        <path d="M9.6 15.4c1.4-1.1 3.4-1.1 4.8 0" />
        <circle cx="12" cy="18.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
);

const CloseGlyph = ({ className = '' }) => (
    <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        className={className}
    >
        <path d="M4 4l8 8" />
        <path d="M12 4l-8 8" />
    </svg>
);

const App = () => {
  const { state, actions } = window.MockBackend.useStore();
  const {
    vehicleSettings: activeVehicleSettings,
    vehicleProfiles,
    implementSettings: activeImplementSettings,
    implementProfiles,
    rtkSettings,
    wifiSettings,
    uTurnSettings,
    localDatabase,
    systemHealth,
    gnssTelemetry,
    runStatus,
    rtkTelemetry,
    runKpi,
    alarms,
    eventLog,
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
  // false | 'line' | 'nudge' | 'tools'. The dock stays compact; panels overlay the map when requested.
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

  // Boundary States
  const [boundaryNameModalOpen, setBoundaryNameModalOpen] = useState(false);
  const [tempBoundaryName, setTempBoundaryName] = useState('');
  const [boundaryAlertOpen, setBoundaryAlertOpen] = useState(false);
  const [boundaryAlertType, setBoundaryAlertType] = useState(null);
  const [previewBoundary, setPreviewBoundary] = useState(null);
  const [boundaryCaptureReady, setBoundaryCaptureReady] = useState(false);
  const boundaryCaptureContextRef = useRef({ reopenFieldManager: false });

  // Delete Confirm Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const [tempLineName, setTempLineName] = useState('');
  const [tempManualHeading, setTempManualHeading] = useState('0.0');
  const [settingsTab, setSettingsTab] = useState('overview');
  const [fieldAssetTab, setFieldAssetTab] = useState('lines');
  const [fieldQuickView, setFieldQuickView] = useState(null);
  const [showArchivedLines, setShowArchivedLines] = useState(false);
  const [lineCatalogFilter, setLineCatalogFilter] = useState('ALL');
  const [selectedCatalogLineId, setSelectedCatalogLineId] = useState(null);
  const [selectedBoundaryIndex, setSelectedBoundaryIndex] = useState(null);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [rtkTestState, setRtkTestState] = useState('idle');
  const [baseSurveyState, setBaseSurveyState] = useState('idle');
  const readUiLocalState = () => {
      try {
          return JSON.parse(localStorage.getItem('autosteer-ui-settings-v1') || '{}') || {};
      } catch (error) {
          return {};
      }
  };
  const savedUiLocalState = readUiLocalState();
  const [calibrationStatus, setCalibrationStatus] = useState(() => ({
      vehicle: 'OK',
      implement: 'Needs Check',
      angle: 'OK',
      ...(savedUiLocalState.calibrationStatus || {})
  }));

  // NEW: Locked Lane Index for Auto Steer
  const activeLaneRef = useRef(null);
  const manualLaneRef = useRef(null);
  const bootstrappedLineRef = useRef(false);
  const runTelemetrySyncRef = useRef({ runStatus: '', rtkTelemetry: '', runKpi: '' });

  const [featureSettings, setFeatureSettings] = useState(() => ({
      ...DEFAULT_FEATURE_SETTINGS,
      ...(savedUiLocalState.featureSettings || {})
  }));
  const [cameraPanelOpen, setCameraPanelOpen] = useState(false);
  const [diagnosticsPanelOpen, setDiagnosticsPanelOpen] = useState(false);
  const [isCombinationPaused, setIsCombinationPaused] = useState(false);
  const [vehicleProfileSearch, setVehicleProfileSearch] = useState('');
  const [vehicleSetupStep, setVehicleSetupStep] = useState('information');
  const [vehicleMeasureFocus, setVehicleMeasureFocus] = useState('wheelbase');
  const [vehicleSettings, setVehicleSettingsDraft] = useState(() => ({ ...activeVehicleSettings }));
  const settingsContentScrollRef = useRef(null);
  const [implementProfileSearch, setImplementProfileSearch] = useState('');
  const [implementSetupStep, setImplementSetupStep] = useState('information');
  const [implementMeasureFocus, setImplementMeasureFocus] = useState('width');
  const [implementSettings, setImplementSettingsDraft] = useState(() => ({ ...activeImplementSettings }));
  const [pendingProfileDeleteKey, setPendingProfileDeleteKey] = useState(null);
  const [pendingProfileSwitchKey, setPendingProfileSwitchKey] = useState(null);
  const [wifiAdvancedOpen, setWifiAdvancedOpen] = useState(false);
  const [wifiScanning, setWifiScanning] = useState(false);
  const [wifiJoinTarget, setWifiJoinTarget] = useState(null);
  const [wifiJoinPassword, setWifiJoinPassword] = useState('');
  const [wifiForgetConfirmSsid, setWifiForgetConfirmSsid] = useState(null);
  const [wifiHiddenNetwork, setWifiHiddenNetwork] = useState({ ssid: '', security: 'WPA2/WPA3', password: '' });
  const [wifiConnectionAttempt, setWifiConnectionAttempt] = useState({
      status: 'idle',
      ssid: '',
      phase: '',
      step: 0,
      message: '',
      network: null
  });
  const wifiConnectionTimersRef = useRef([]);
  const wifiConnectionAttemptIdRef = useRef(0);
  const [rtkQualityOpen, setRtkQualityOpen] = useState(false);
  const [eventHistoryOpen, setEventHistoryOpen] = useState(false);
  const [productivityOpen, setProductivityOpen] = useState(false);
  const [uTurnPanelOpen, setUTurnPanelOpen] = useState(false);

  useEffect(() => {
      if (!settingsOpen || settingsTab !== 'vehicle') {
          setVehicleSettingsDraft({ ...activeVehicleSettings });
      }
  }, [activeVehicleSettings, settingsOpen, settingsTab]);

  useEffect(() => {
      if (!settingsOpen || settingsTab !== 'implement') {
          setImplementSettingsDraft({ ...activeImplementSettings });
      }
  }, [activeImplementSettings, settingsOpen, settingsTab]);

  useEffect(() => () => {
      wifiConnectionTimersRef.current.forEach(timer => window.clearTimeout(timer));
      wifiConnectionTimersRef.current = [];
  }, []);

  const [satelliteCount, setSatelliteCount] = useState(() => Number(savedUiLocalState.satelliteCount || gnssTelemetry?.roverUsedSats || 12));
  const [notification, setNotification] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(DEFAULT_MAP_ZOOM);
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
  const mapCanvasRef = useRef(null);
  const [mapCanvasSize, setMapCanvasSize] = useState({ width: 1000, height: 700 });
  const dragStartRef = useRef({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const keysPressed = useRef({});
  const crossTrackErrorRef = useRef(0);
  const guidanceErrorFilterRef = useRef({
      value: 0,
      lastSampleAt: 0,
      lastCommitAt: 0,
      lastDisplay: 0
  });
  const mapVisualHeadingRef = useRef(0);
  const turnAssistRef = useRef(null);
  const rtkLossHandledRef = useRef(false);
  const [turnAssistActive, setTurnAssistActive] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const setupOverlayOpen = menuOpen || settingsOpen || cameraPanelOpen || diagnosticsPanelOpen || linesPanelOpen || lineModeModalOpen || lineNameModalOpen || boundaryNameModalOpen || manualHeadingModalOpen || boundaryAlertOpen || deleteModalOpen || (fieldManagerOpen && !isRecordingBoundary);
  const runDockSuppressed = setupOverlayOpen || rtkQualityOpen || eventHistoryOpen || productivityOpen || uTurnPanelOpen;

  useEffect(() => {
      if (!dockMenuOpen) return;
      const shouldCloseDockTools = isCreating
           || isRecordingBoundary
           || uTurnPanelOpen
           || rtkQualityOpen
           || eventHistoryOpen
           || productivityOpen
           || menuOpen
          || settingsOpen
          || fieldManagerOpen
          || linesPanelOpen
          || lineModeModalOpen
          || lineNameModalOpen
          || boundaryNameModalOpen
          || manualHeadingModalOpen
          || boundaryAlertOpen
          || deleteModalOpen;
      if (shouldCloseDockTools) setDockMenuOpen(false);
  }, [dockMenuOpen, isCreating, isRecordingBoundary, uTurnPanelOpen, rtkQualityOpen, eventHistoryOpen, productivityOpen, menuOpen, settingsOpen, fieldManagerOpen, linesPanelOpen, lineModeModalOpen, lineNameModalOpen, boundaryNameModalOpen, manualHeadingModalOpen, boundaryAlertOpen, deleteModalOpen]);

  useEffect(() => {
      const mapCanvas = mapCanvasRef.current;
      if (!mapCanvas) return undefined;

      const updateMapCanvasSize = () => {
          const bounds = mapCanvas.getBoundingClientRect();
          const nextWidth = Math.max(1, bounds.width);
          const nextHeight = Math.max(1, bounds.height);
          setMapCanvasSize((current) => (
              Math.abs(current.width - nextWidth) < 0.5 && Math.abs(current.height - nextHeight) < 0.5
                  ? current
                  : { width: nextWidth, height: nextHeight }
          ));
      };

      updateMapCanvasSize();
      const resizeObserver = typeof ResizeObserver !== 'undefined'
          ? new ResizeObserver(updateMapCanvasSize)
          : null;
      resizeObserver?.observe(mapCanvas);
      window.addEventListener('resize', updateMapCanvasSize);

      return () => {
          resizeObserver?.disconnect();
          window.removeEventListener('resize', updateMapCanvasSize);
      };
  }, []);

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

  useEffect(() => {
      manualLaneRef.current = null;
      guidanceErrorFilterRef.current = {
          value: 0,
          lastSampleAt: 0,
          lastCommitAt: 0,
          lastDisplay: 0
      };
      crossTrackErrorRef.current = 0;
      setCrossTrackError(0);
  }, [activeLineId, guidanceLine, isMultiLineMode, implementSettings.width]);


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
          let targetLaneIndex = activeLaneRef.current;
          if (targetLaneIndex === null) {
              const nearestLane = Math.round(rawXte / guide.width);
              if (steeringMode !== 'MANUAL') {
                  targetLaneIndex = nearestLane;
              } else {
                  if (manualLaneRef.current === null) manualLaneRef.current = nearestLane;
                  const laneRelativeXte = rawXte - manualLaneRef.current * guide.width;
                  const switchThreshold = guide.width * 0.62;
                  if (laneRelativeXte > switchThreshold) manualLaneRef.current += 1;
                  else if (laneRelativeXte < -switchThreshold) manualLaneRef.current -= 1;
                  targetLaneIndex = manualLaneRef.current;
              }
          }
          return rawXte - (targetLaneIndex * guide.width) - offset;
      }
      return rawXte - offset;
  };

  const setGuidanceErrorFromPixels = (xtePixels) => {
      const rawCm = Math.round((xtePixels / PIXELS_PER_METER) * 1000) / 10;
      const now = performance.now();
      const filter = guidanceErrorFilterRef.current;
      const sampleDeltaMs = filter.lastSampleAt > 0
          ? Math.min(120, Math.max(8, now - filter.lastSampleAt))
          : 16;
      const smoothingTimeMs = steeringMode === 'MANUAL' ? 340 : 110;
      const alpha = 1 - Math.exp(-sampleDeltaMs / smoothingTimeMs);

      filter.value += (rawCm - filter.value) * alpha;
      filter.lastSampleAt = now;
      if (Math.abs(rawCm) < 0.45 && Math.abs(filter.value) < 0.8) filter.value = 0;

      const quantizeStep = steeringMode === 'MANUAL'
          ? (Math.abs(filter.value) >= 10 ? 1 : 0.5)
          : 0.1;
      const nextDisplay = Math.round(filter.value / quantizeStep) * quantizeStep;
      const displayDelta = Math.abs(nextDisplay - filter.lastDisplay);
      const elapsedSinceCommit = now - filter.lastCommitAt;
      const minimumInterval = steeringMode === 'MANUAL' ? 120 : 45;
      const forceCommit = displayDelta >= (steeringMode === 'MANUAL' ? 8 : 3);
      const manualDisplayDeadband = Math.abs(filter.value) >= 10 ? 2 : 0.75;

      if (!forceCommit && elapsedSinceCommit < minimumInterval) return;
      if (steeringMode === 'MANUAL' && displayDelta < manualDisplayDeadband && elapsedSinceCommit < 360) return;
      if (displayDelta < 0.05) return;

      filter.lastDisplay = nextDisplay;
      filter.lastCommitAt = now;
      crossTrackErrorRef.current = nextDisplay;
      setCrossTrackError(nextDisplay);
  };

  const getXteDirection = () => {
      if (Math.abs(crossTrackError) < 1) return 'CENTER';
      return crossTrackError < 0 ? 'LEFT' : 'RIGHT';
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

  const getCreatedDateTime = (entity) => {
      const raw = entity?.createdAt || entity?.date;
      if (!raw) return { date: 'Not recorded', time: 'Time unavailable', exact: false };

      const parsed = new Date(raw);
      if (Number.isNaN(parsed.getTime())) {
          return { date: String(raw), time: 'Time unavailable', exact: false };
      }

      const hasExactTime = Boolean(entity?.createdAt);
      return {
          date: parsed.toLocaleDateString([], { year: 'numeric', month: 'short', day: '2-digit' }),
          time: hasExactTime
              ? parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
              : 'Time unavailable',
          exact: hasExactTime
      };
  };

  const getCreatedLocation = (entity, field) => entity?.createdLocation || entity?.location || field?.name || 'Location unavailable';

  const getCreatedPosition = (entity) => {
      const position = entity?.createdPosition;
      if (!Number.isFinite(position?.x) || !Number.isFinite(position?.y)) return 'Position unavailable';
      return `X ${position.x.toFixed(1)} m / Y ${position.y.toFixed(1)} m`;
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
      try {
          localStorage.setItem('autosteer-ui-settings-v1', JSON.stringify({
              featureSettings,
              calibrationStatus,
              satelliteCount
          }));
      } catch (error) {
          console.warn('Failed to persist UI settings', error);
      }
  }, [featureSettings, calibrationStatus, satelliteCount]);

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

  useEffect(() => {
      setSelectedCatalogLineId(null);
  }, [selectedFieldId]);

  // --- 2. INPUT ---
  useEffect(() => {
    const handleKeyDown = (e) => {
        if (e.key === 'Escape' && dockMenuOpen) {
            setDockMenuOpen(false);
            return;
        }
        const focusedControl = e.target?.closest?.('input, textarea, select, [contenteditable="true"]');
        const dockButtonActivation = e.target?.closest?.('[data-run-dock] button') && (e.key === ' ' || e.key === 'Enter');
        if (focusedControl || dockButtonActivation) return;
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
  }, [dockMenuOpen, menuOpen, settingsOpen, cameraPanelOpen, diagnosticsPanelOpen, fieldManagerOpen, lineModeModalOpen, isRecordingBoundary, lineNameModalOpen, boundaryNameModalOpen, linesPanelOpen, manualHeadingModalOpen, boundaryAlertOpen, deleteModalOpen]);

  // --- 3. PHYSICS ---
  useEffect(() => {
    let animationFrameId;

    const loop = (time) => {
        if (!physics.current.lastTime) physics.current.lastTime = time;
        const dt = Math.min((time - physics.current.lastTime) / 1000, 0.1);
        physics.current.lastTime = time;

        const p = physics.current;
        if (setupOverlayOpen) {
            animationFrameId = requestAnimationFrame(loop);
            return;
        }

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
            const manualSteerLimit = isMap3D ? 30 : 38;
            const steerSpeed = isMap3D ? (turnInputActive ? 32 : 30) : 38;
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
            } else if (keysPressed.current['ArrowLeft']) p.steeringAngle = Math.max(p.steeringAngle - steerSpeed * dt, -manualSteerLimit);
            else if (keysPressed.current['ArrowRight']) p.steeringAngle = Math.min(p.steeringAngle + steerSpeed * dt, manualSteerLimit);
            else {
                const steeringReturnSpeed = isMap3D ? 30 : 28;
                if (p.steeringAngle > 0) p.steeringAngle = Math.max(0, p.steeringAngle - steeringReturnSpeed * dt);
                else if (p.steeringAngle < 0) p.steeringAngle = Math.min(0, p.steeringAngle + steeringReturnSpeed * dt);
            }

            const guideForTelemetry = guidanceRef.current;
            const telemetry = getGuidanceMetrics(guideForTelemetry, p);
            if (telemetry.validLine) {
                // Manual keeps selecting the nearest pass as the vehicle moves,
                // but the displayed line error is intentionally frozen until AUTO.
                getTargetRelativeXte(telemetry.xte, guideForTelemetry);
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
        const maxVisualStep = (isMap3D
            ? (hasManualTurnInput ? 54 : (Math.abs(p.speed) > 0.1 ? 68 : 110))
            : (Math.abs(p.speed) > 0.1 ? 38 : 120)
        ) * dt;
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
  }, [steeringMode, setManualTargetSpeed, vehicleSettings?.wheelbase, isMap3D, setupOverlayOpen]);

  // --- 4. RECORDING ---
  useEffect(() => {
      let intervalId;
      if (isRecording && Math.abs(speed) > 0.1) {
          intervalId = setInterval(() => {
              const speedMs = Math.abs(speed) / 3.6;
              const width = Math.max(0.1, Number(implementSettings.width) || 3);
              const dt = 0.05;
              const areaM2 = speedMs * width * dt;
              const areaHa = areaM2 / 10000;
              setWorkedArea(prev => prev + areaHa);
          }, 50);
      }
      return () => clearInterval(intervalId);
  }, [isRecording, speed, implementSettings.width]);

  useEffect(() => {
      if (!isRecording && !isRecordingCurve && !isRecordingBoundary) return;
      const newPos = worldPos;
      const newHeading = heading;
      const isFarEnough = (points, point) => {
          const last = points[points.length - 1];
          return !last || Math.hypot(last.x - point.x, last.y - point.y) >= 10;
      };

      const coveragePoint = { x: newPos.x, y: newPos.y, h: newHeading };
      const pathPoint = { x: newPos.x, y: newPos.y };
      if (isRecording && isFarEnough(coverageTrail, coveragePoint)) {
          actions.setCoverageTrail(prev => [...prev, coveragePoint]);
      }
      if (isRecordingCurve && isFarEnough(curvePoints, pathPoint)) {
          actions.setCurvePoints(prev => [...prev, pathPoint]);
      }
      if (isRecordingBoundary && isFarEnough(tempBoundary, pathPoint)) {
          actions.setTempBoundary(prev => [...prev, pathPoint]);
      }
  }, [worldPos, isRecording, isRecordingCurve, isRecordingBoundary, heading]);

  useEffect(() => {
      const sync = runTelemetrySyncRef.current;
      const now = Date.now();
      const round = (value, precision = 1) => {
          const scale = 10 ** precision;
          return Math.round((Number(value) || 0) * scale) / scale;
      };
      const runStatusKey = JSON.stringify({
          steeringState: currentRunStatus.steeringState,
          steeringReason: currentRunStatus.steeringReason,
          overrideDetected: currentRunStatus.overrideDetected,
          engageAllowed: currentRunStatus.engageAllowed,
          recoveryAction: currentRunStatus.recoveryAction
      });
      const rtkTelemetryKey = JSON.stringify({
          fixType: currentRtkTelemetry.fixType,
          ageSec: currentRtkTelemetry.ageSec,
          latencyMs: currentRtkTelemetry.latencyMs,
          hdop: currentRtkTelemetry.hdop,
          pdop: currentRtkTelemetry.pdop,
          baseSource: currentRtkTelemetry.baseSource
      });
      const runKpiKey = JSON.stringify({
          xteCm: round(currentRunKpi.xteCm, 0),
          headingErrDeg: round(currentRunKpi.headingErrDeg, 1),
          speedKmh: round(currentRunKpi.speedKmh, 1),
          targetSpeedKmh: round(currentRunKpi.targetSpeedKmh, 1),
          areaDoneHa: round(currentRunKpi.areaDoneHa, 3),
          areaRemainingHa: round(currentRunKpi.areaRemainingHa, 3),
          etaMin: currentRunKpi.etaMin,
          workRateHaHr: round(currentRunKpi.workRateHaHr, 2),
          passIndex: currentRunKpi.passIndex
      });

      if (sync.runStatus !== runStatusKey) {
          sync.runStatus = runStatusKey;
          actions.setRunStatus(currentRunStatus);
      }
      if (sync.rtkTelemetry !== rtkTelemetryKey) {
          sync.rtkTelemetry = rtkTelemetryKey;
          actions.setRtkTelemetry({
              ...currentRtkTelemetry,
              lastUpdateTs: now
          });
      }
      if (sync.runKpi !== runKpiKey && now - (sync.lastRunKpiAt || 0) > 350) {
          sync.runKpi = runKpiKey;
          sync.lastRunKpiAt = now;
          actions.setRunKpi(currentRunKpi);
      }
  }, [
      steeringMode,
      rtkStatus,
      guidanceLine,
      turnAssistActive,
      speed,
      manualTargetSpeed,
      workedArea,
      crossTrackError,
      liveHeadingError,
      liveAreaRemaining,
      liveEtaMin,
      liveWorkRate,
      livePassIndex,
      activeFieldAreaHa,
      rtkSettings?.baseId
  ]);


  // --- 5. LOGIC & HANDLERS ---

  const addEventLog = (message, severity = 'info') => {
      const event = {
          id: Date.now() + Math.random(),
          severity,
          message,
          timestamp: new Date().toISOString(),
          acked: severity !== 'critical'
      };
      actions.setEventLog(prev => [event, ...(prev || [])].slice(0, 80));
      return event;
  };

  const addAlarm = (id, severity, message) => {
      const alarm = {
          id,
          severity,
          message,
          timestamp: new Date().toISOString(),
          acked: false
      };
      actions.setAlarms(prev => {
          const list = prev || [];
          if (list.some(item => item.id === id && !item.acked)) return list;
          return [alarm, ...list].slice(0, 24);
      });
      actions.setEventLog(prev => [alarm, ...(prev || [])].slice(0, 80));
  };

  const ackAlarm = (id) => {
      actions.setAlarms(prev => (prev || []).map(alarm => alarm.id === id ? { ...alarm, acked: true } : alarm));
      addEventLog(`Alarm acknowledged: ${id}`, 'info');
  };

  const clearOverrideState = () => {
      actions.setRunStatus(prev => ({ ...(prev || {}), overrideDetected: false, steeringReason: liveRunStatus.steeringReason }));
      actions.setAlarms(prev => (prev || []).map(alarm => alarm.id === 'manual-override' ? { ...alarm, acked: true } : alarm));
      addEventLog('Manual override cleared', 'info');
  };

  useEffect(() => {
      if (steeringMode === 'AUTO' && rtkStatus !== 'FIX') {
          setSteeringMode('MANUAL');
          manualLaneRef.current = activeLaneRef.current;
          activeLaneRef.current = null;
          actions.setRunStatus(prev => ({
              ...(prev || {}),
              steeringState: 'FAULT',
              steeringReason: 'RTK lost while engaged',
              overrideDetected: false,
              engageAllowed: false,
              recoveryAction: 'Restore RTK FIX'
          }));
          if (!rtkLossHandledRef.current) {
              rtkLossHandledRef.current = true;
              addAlarm('rtk-lost', 'critical', 'RTK lost while autosteer engaged');
              showNotification('RTK lost: autosteer disengaged', 'error');
          }
      } else if (rtkStatus === 'FIX') {
          rtkLossHandledRef.current = false;
      }
  }, [steeringMode, rtkStatus]);

  // NEW: Handler for Toggling Multi-Line Mode to calculate Offset
  const handleToggleMultiLine = () => {
      const nextMode = !isMultiLineMode;
      manualLaneRef.current = null;
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
    if (!hasGuidanceToEngage && steeringMode === 'MANUAL') {
        addAlarm('no-guidance-line', 'warning', 'Autosteer blocked: no guidance line loaded');
        return showNotification("Set Line first!", "warning");
    }

    // Toggle Mode
    const newMode = steeringMode === 'MANUAL' ? 'AUTO' : 'MANUAL';

    if (newMode === 'AUTO' && rtkStatus !== 'FIX') {
        addAlarm('rtk-required', 'warning', 'Autosteer blocked: RTK FIX required');
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
        manualLaneRef.current = null;

        // 1b. Close Action Dock & Stop Creating
        setIsCreating(false);
        setDockMenuOpen(false);

        showNotification("Auto Steer ENGAGED", "success");
    } else {
        // --- 2. MANUAL ENGAGED Logic ---
        setDragOffset({ x: 0, y: 0 });
        physics.current.steeringAngle = 0;

        manualLaneRef.current = activeLaneRef.current;
        activeLaneRef.current = null;

        showNotification("Manual Control Returned", "warning");
    }
    setSteeringMode(newMode);
  };

  const showNotification = (msg, type) => {
      setNotification({ msg, type });
      addEventLog(msg, type === 'error' ? 'critical' : type === 'warning' ? 'warning' : 'info');
      setTimeout(() => setNotification(null), 3000);
  };
  const updateFeatureSetting = (key, value) => {
      setFeatureSettings(prev => ({ ...prev, [key]: value }));
  };

  const toggleFeatureSetting = (key) => {
      setFeatureSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleFactoryReset = () => {
      const confirmed = window.confirm('Factory reset will clear fields, lines, tasks and setup values. Continue?');
      if (!confirmed) return;
      try {
          localStorage.removeItem('autosteer-ui-settings-v1');
      } catch (error) {
          console.warn('Failed to clear UI local settings', error);
      }
      actions.factoryReset();
      setSteeringMode('MANUAL');
      setIsRecording(false);
      setRtkStatus('FIX');
      setCrossTrackError(0);
      crossTrackErrorRef.current = 0;
      guidanceErrorFilterRef.current = {
          value: 0,
          lastSampleAt: 0,
          lastCommitAt: 0,
          lastDisplay: 0
      };
      setSpeed(0);
      setManualTargetSpeed(0);
      setSteeringAngle(0);
      setWorldPos({ x: 0, y: 0 });
      setHeading(0);
      setMapVisualHeading(0);
      mapVisualHeadingRef.current = 0;
      physics.current = {
          speed: 0,
          targetSpeed: 0,
          steeringAngle: 0,
          heading: 0,
          x: 0,
          y: 0,
          lastTime: 0
      };
      setWorkedArea(0);
      setIsCreating(false);
      setDockMenuOpen(false);
      setFieldManagerOpen(false);
      setLinesPanelOpen(false);
      setLineModeModalOpen(false);
      setLineNameModalOpen(false);
      setManualHeadingModalOpen(false);
      setBoundaryNameModalOpen(false);
      setBoundaryAlertOpen(false);
      setPreviewBoundary(null);
      setBoundaryCaptureReady(false);
      setDeleteModalOpen(false);
      setItemToDelete(null);
      setTempLineName('');
      setTempManualHeading('0.0');
      setSettingsTab('overview');
      setRtkTestState('idle');
      setBaseSurveyState('idle');
      setCalibrationStatus({ vehicle: 'OK', implement: 'Needs Check', angle: 'OK' });
      activeLaneRef.current = null;
      manualLaneRef.current = null;
      bootstrappedLineRef.current = false;
      turnAssistRef.current = null;
      setTurnAssistActive(false);
      setFeatureSettings(DEFAULT_FEATURE_SETTINGS);
      setSatelliteCount(12);
      setZoomLevel(DEFAULT_MAP_ZOOM);
      setDragOffset({ x: 0, y: 0 });
      setIsDraggingMap(false);
      showNotification('Factory reset complete', 'success');
  };

  const handleTrim = (direction) => {
      const trimPixels = PIXELS_PER_METER * 0.01;
      actions.setManualOffset(prev => prev + (direction === 'left' ? -trimPixels : trimPixels));
      showNotification(`Trim ${direction === 'left' ? 'Left' : 'Right'} 1cm`, "info");
  };
  const handleZoom = (type) => {
      setZoomLevel((previous) => {
          if (type === 'reset') return DEFAULT_MAP_ZOOM;
          const next = type === 'in'
              ? Math.min(previous + MAP_ZOOM_STEP, MAX_MAP_ZOOM)
              : type === 'out'
                  ? Math.max(previous - MAP_ZOOM_STEP, MIN_MAP_ZOOM)
                  : previous;
          return Math.round(next * 100) / 100;
      });
  };
  const handleCoverageRecordingToggle = () => {
      const nextRecording = !isRecording;
      setIsRecording(nextRecording);
      showNotification(nextRecording ? 'Coverage recording started' : 'Coverage recording paused', nextRecording ? 'success' : 'info');
  };
  const handleRecenter = () => { setDragOffset({ x: 0, y: 0 }); setIsDraggingMap(false); };
  const handleSceneViewChange = (mode) => {
      if (mode === sceneViewMode) return;
      setViewTransitioning(true);
      setDragOffset({ x: 0, y: 0 });
      setIsDraggingMap(false);
      setSceneViewMode(mode);
      window.setTimeout(() => setViewTransitioning(false), 280);
  };
  const openRunScreen = () => {
      setMenuOpen(false);
      setSettingsOpen(false);
      setFieldManagerOpen(false);
      setLinesPanelOpen(false);
      setDockMenuOpen(false);
      setUTurnPanelOpen(false);
      actions.setViewMode('LIST');
  };
  const openFieldAssetPanel = (tab = 'lines') => {
      setMenuOpen(false);
      setFieldAssetTab(tab);
      setFieldQuickView(null);
      actions.setViewMode('LIST');
      setFieldManagerOpen(true);
      setSettingsOpen(false);
      setLinesPanelOpen(false);
      setDockMenuOpen(false);
      setUTurnPanelOpen(false);
  };
  const openLinesCatalog = () => {
      setMenuOpen(false);
      setLinesPanelOpen(true);
      setFieldManagerOpen(false);
      setSettingsOpen(false);
      setDockMenuOpen(false);
      setUTurnPanelOpen(false);
      actions.setViewMode('LIST');
  };
  const openSystemPanel = () => {
      setMenuOpen(false);
      setSettingsOpen(true);
      setFieldManagerOpen(false);
      setLinesPanelOpen(false);
      setDockMenuOpen(false);
      setUTurnPanelOpen(false);
  };
  const openWifiPanel = () => {
      setSettingsTab('wifi');
      openSystemPanel();
  };

  const handleMapPointerDown = (e) => {
      if (dockMenuOpen && !isCreating) setDockMenuOpen(false);
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
      setDockMenuOpen(false);
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
      const limit = sceneViewMode === '3D' ? 30 : 38;
      const next = Math.max(-limit, Math.min(limit, Number(val) || 0));
      physics.current.steeringAngle = next;
      setSteeringAngle(next);
  };
  const handleUTurn = (requestedDirection) => {
      const current = physics.current;
      const configuredDirection = uTurnSettings?.direction || 'Auto';
      const isLeftRequested = requestedDirection === 'left'
          || configuredDirection === 'Left'
          || (requestedDirection !== 'right' && configuredDirection !== 'Right' && (keysPressed.current['ArrowLeft'] || current.steeringAngle < -2));
      const direction = isLeftRequested ? -1 : 1;
      const configuredSpeed = Number(uTurnSettings?.turnSpeedKmh || 5.5);
      const targetSpeed = current.targetSpeed < 0 ? -configuredSpeed : configuredSpeed;
      turnAssistRef.current = {
          direction,
          targetHeading: normalizeHeadingValue(current.heading + 180),
          pattern: uTurnSettings?.pattern || 'Smart U-Turn',
          nextPass: uTurnSettings?.nextPass || 'Adjacent',
          skipPasses: Number(uTurnSettings?.skipPasses || 0)
      };
      setSteeringMode('MANUAL');
      setTurnAssistActive(true);
      current.targetSpeed = targetSpeed;
      current.steeringAngle = direction * 42;
      setManualTargetSpeed(targetSpeed);
      setSteeringAngle(current.steeringAngle);
      showNotification(`${uTurnSettings?.pattern || 'U-turn'}: ${direction < 0 ? 'left' : 'right'} / ${uTurnSettings?.nextPass || 'Adjacent'}`, 'info');
  };
  const setSteerKey = (key, active) => {
      if (active && (key === 'ArrowLeft' || key === 'ArrowRight')) {
          if (steeringMode === 'AUTO') {
              setSteeringMode('MANUAL');
              actions.setRunStatus(prev => ({
                  ...(prev || {}),
                  steeringState: 'PAUSED',
                  steeringReason: 'Operator manual steering override',
                  overrideDetected: true,
                  engageAllowed: true,
                  recoveryAction: 'Re-engage when aligned'
              }));
              addAlarm('manual-override', 'warning', 'Manual steering override detected');
              showNotification('Manual override: autosteer disengaged', 'warning');
          }
          cancelTurnAssist();
      }
      keysPressed.current[key] = active;
  };
  const startFieldCreation = () => { actions.setViewMode('CREATE_FIELD'); actions.setNewFieldName(''); actions.setCurrentFieldBoundaries([]); };
  const handleTaskAction = (task, action) => {
        const newStatus = action === 'start' ? 'In Progress' : action === 'pause' ? 'Paused' : 'Done';
        const actionTime = new Date().toISOString();
        const updatedFields = fields.map(f => {
            if (f.id === selectedFieldId) {
                const newTasks = (f.tasks || []).map(t => t.id === task.id ? {
                    ...t,
                    status: newStatus,
                    updatedAt: actionTime,
                    ...(action === 'start' ? { startedAt: actionTime } : {}),
                    ...(action === 'pause' ? { pausedAt: actionTime } : {}),
                    ...(action === 'finish' ? { completedAt: actionTime } : {})
                } : t);
                return { ...f, tasks: newTasks };
            } return f;
        });
        actions.setFields(updatedFields);
        if (loadedField?.id === selectedFieldId) {
            actions.setLoadedField(updatedFields.find(field => field.id === selectedFieldId));
        }
        if (action === 'start') actions.setActiveTaskId(task.id);
        else actions.setActiveTaskId(null);
  }

  const updateSelectedFieldLines = (updater) => {
      actions.setFields(prev => prev.map(field => {
          if (field.id !== selectedFieldId) return field;
          return { ...field, lines: updater(field.lines || []) };
      }));
      if (loadedField?.id === selectedFieldId) {
          actions.setLoadedField(prev => prev ? { ...prev, lines: updater(prev.lines || []) } : prev);
      }
  };

  const handleLoadLine = (line) => {
      if (!line || line.archived) {
          showNotification('Archived line cannot be loaded', 'warning');
          return;
      }
      setSelectedCatalogLineId(line.id);
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
    actions.setShowGuidanceLines(true);
      if (line.isMulti !== undefined) actions.setIsMultiLineMode(line.isMulti);
      setLinesPanelOpen(false);
      setIsCreating(false);
      setDockMenuOpen(false);
      setLineModeModalOpen(false);
      showNotification(`Loaded Line: ${line.name}`, "success");
  };

  const handleRenameLine = (line) => {
      if (!line) return;
      setSelectedCatalogLineId(line.id);
      const nextName = window.prompt('Rename guidance line', line.name || 'Guidance line');
      if (!nextName || !nextName.trim()) return;
      updateSelectedFieldLines(lines => lines.map(item => item.id === line.id ? { ...item, name: nextName.trim(), updatedAt: new Date().toISOString() } : item));
      showNotification('Line renamed', 'success');
  };

  const handleDuplicateLine = (line) => {
      if (!line) return;
      const duplicate = {
          ...line,
          id: Date.now(),
          name: `${line.name || 'Guidance line'} Copy`,
          date: new Date().toISOString().split('T')[0],
          archived: false,
          updatedAt: new Date().toISOString()
      };
      updateSelectedFieldLines(lines => [duplicate, ...lines]);
      setSelectedCatalogLineId(duplicate.id);
      showNotification('Line duplicated', 'success');
  };

  const handleArchiveLine = (line) => {
      if (!line) return;
      setSelectedCatalogLineId(line.id);
      updateSelectedFieldLines(lines => lines.map(item => item.id === line.id ? { ...item, archived: true, archivedAt: new Date().toISOString() } : item));
      if (activeLineId === line.id) {
          resetLines();
          setSteeringMode('MANUAL');
      }
      setShowArchivedLines(true);
      showNotification('Line archived', 'info');
  };

  const handleRestoreLine = (line) => {
      if (!line) return;
      setSelectedCatalogLineId(line.id);
      updateSelectedFieldLines(lines => lines.map(item => item.id === line.id ? { ...item, archived: false, restoredAt: new Date().toISOString() } : item));
      showNotification('Line restored', 'success');
  };

  const openSaveLineModal = () => {
      const count = (fields.find(f => f.id === selectedFieldId)?.lines || []).filter(line => !line.archived).length;
      setTempLineName(`${lineType.replace('_', ' ')} ${count + 1}`);
      setLineNameModalOpen(true);
  }

  const finishGuidanceLineCreation = (message = "Line ready. Engage autosteer when aligned.") => {
      setIsCreating(false);
      setDockMenuOpen(false);
      setLineModeModalOpen(false);
      showNotification(message, "success");
  };

  const startStraightABCreation = () => {
      actions.setLineType('STRAIGHT_AB');
      resetLines();
      actions.setShowGuidanceLines(true);
      setIsCreating(true);
      setDockMenuOpen(false);
      setLineModeModalOpen(false);
      showNotification("Straight AB: Set A, drive, set B", "info");
  };

  const cancelSaveLineModal = () => {
      setLineNameModalOpen(false);
      setTempLineName('');
  };

  const handleSaveLine = () => {
    if (!tempLineName.trim()) { showNotification("Please enter line name", "warning"); return; }
    const createdAt = new Date();
    const lineField = fields.find(field => field.id === selectedFieldId);
    const newLine = {
        id: Date.now(),
        name: tempLineName,
        type: lineType,
        isMulti: isMultiLineMode,
        date: createdAt.toISOString().split('T')[0],
        createdAt: createdAt.toISOString(),
        createdLocation: lineField?.name || loadedField?.name || 'Location unavailable',
        createdPosition: { x: worldPos.x, y: worldPos.y },
        quality: 'Good',
        archived: false,
        points: { a: pointA, b: pointB, curve: curvePoints, pivot: { center: pivotCenter, radius: pivotRadius }, aplus: { point: aPlusPoint, heading: aPlusHeading } }
    };
    actions.setFields(prev => prev.map(f => { if (f.id === selectedFieldId) { return { ...f, lines: [...(f.lines || []), newLine] }; } return f; }));
    setLineNameModalOpen(false); setTempLineName(''); actions.setActiveLineId(newLine.id); setSelectedCatalogLineId(newLine.id);
    setIsCreating(false); // Stop creating
    setDockMenuOpen(false);
    showNotification("Line Saved Successfully", "success");
    if (loadedField && loadedField.id === selectedFieldId) { actions.setLoadedField(prev => ({ ...prev, lines: [...(prev.lines || []), newLine] })); }
  };

  const handleABButtonClick = () => {
      if (!pointA) {
          resetLines();
          actions.setPointA({ ...worldPos });
          showNotification("Point A Set. Drive > 10m to set B.", "info");
      }
      else if (!pointB) {
          const nextPointB = { ...worldPos };
          const dist = Math.hypot(nextPointB.x - pointA.x, nextPointB.y - pointA.y);
          if (dist < 50) { showNotification(`Too short! Drive ${((50 - dist)/5).toFixed(1)}m more.`, "warning"); return; }
          actions.setPointB(nextPointB);
          actions.setGuidanceLine('STRAIGHT_AB');
          actions.setShowGuidanceLines(true);
          const snappedHeading = normalizeHeadingValue(Math.atan2(nextPointB.x - pointA.x, pointA.y - nextPointB.y) * 180 / Math.PI);
          mapVisualHeadingRef.current = snappedHeading;
          setMapVisualHeading(snappedHeading);
          finishGuidanceLineCreation("AB Line ready");
      }
      else {
          resetLines();
          actions.setPointA({ ...worldPos });
          showNotification("Point A Reset", "info");
      }
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
      finishGuidanceLineCreation("A+ Line ready");
  };

  const handleRecordCurve = () => {
      if (isRecordingCurve) {
          actions.setIsRecordingCurve(false);
          if (curvePoints.length > 2) { actions.setGuidanceLine('CURVE'); finishGuidanceLineCreation("Curve line ready"); }
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
          finishGuidanceLineCreation("Combination line ready");
      } else {
          actions.setCurvePoints([]);
          showNotification("Combination line too short", "warning");
      }
  };

  const handleSetCenter = () => { resetLines(); actions.setPivotCenter({ ...worldPos }); showNotification("Pivot Center Set. Drive to Edge.", "info"); };
  const handleSetRadius = () => { if (!pivotCenter) return showNotification("Set Center first", "warning"); const radius = Math.hypot(worldPos.x - pivotCenter.x, worldPos.y - pivotCenter.y); if (radius < 50) return showNotification("Radius too small!", "warning"); actions.setPivotRadius(radius); actions.setGuidanceLine('PIVOT'); finishGuidanceLineCreation("Pivot line ready"); };

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
     boundaryCaptureContextRef.current = { reopenFieldManager: fieldManagerOpen };
     setFieldManagerOpen(false);
     setDockMenuOpen(false); // Close menu
     setRtkQualityOpen(false);
     setEventHistoryOpen(false);
     setProductivityOpen(false);
     setUTurnPanelOpen(false);
     actions.setIsRecordingBoundary(false);
     actions.setTempBoundary([]);
     setPreviewBoundary(null);
     setBoundaryCaptureReady(true);
     physics.current.targetSpeed = 0;
     setManualTargetSpeed(0);
     showNotification("Boundary ready. Press Start when positioned at the field edge.", "info");
  };

  const beginBoundaryRecording = () => {
     setBoundaryCaptureReady(false);
     actions.setTempBoundary([{ x: worldPos.x, y: worldPos.y }]);
     actions.setIsRecordingBoundary(true);
     physics.current.targetSpeed = 0;
     setManualTargetSpeed(0);
     showNotification("Boundary recording started. Drive along the field edge.", "success");
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

      const boundaryField = fields.find(field => field.id === selectedFieldId);
      const newBoundaryObj = {
          name: tempBoundaryName,
          points: finalPoints,
          createdAt: new Date().toISOString(),
          createdLocation: viewMode === 'CREATE_FIELD'
              ? (newFieldName.trim() || 'New field draft')
              : (boundaryField?.name || loadedField?.name || 'Location unavailable'),
          createdPosition: { x: worldPos.x, y: worldPos.y }
      };
      let updatedBoundaries = [];

      if (viewMode === 'CREATE_FIELD') {
          // Add new boundary to list
          updatedBoundaries = [...currentFieldBoundaries, newBoundaryObj];
          actions.setCurrentFieldBoundaries(updatedBoundaries);
          // Set as active immediately for preview
          actions.setActiveBoundaryIdx(updatedBoundaries.length - 1);
          setSelectedBoundaryIndex(updatedBoundaries.length - 1);
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
          setSelectedBoundaryIndex(updatedBoundaries.length - 1);
      }

      setBoundaryNameModalOpen(false);
      setPreviewBoundary(null);
      actions.setTempBoundary([]);
      setTempBoundaryName('');
      actions.setIsRecordingBoundary(false);
      setBoundaryCaptureReady(false);
      setDockMenuOpen(false);
      if (boundaryCaptureContextRef.current.reopenFieldManager) {
          setFieldManagerOpen(true);
      }
      boundaryCaptureContextRef.current = { reopenFieldManager: false };
      showNotification("Boundary Saved & Active!", "success");
  }

  const cancelBoundaryRecording = () => {
    const shouldReopenFieldManager = boundaryCaptureContextRef.current.reopenFieldManager;
    setBoundaryCaptureReady(false);
    actions.setIsRecordingBoundary(false);
    physics.current.targetSpeed = 0;
    setManualTargetSpeed(0);
    actions.setTempBoundary([]);
    setPreviewBoundary(null);
    setDockMenuOpen(false);
    if (shouldReopenFieldManager) {
        setFieldManagerOpen(true);
    }
    boundaryCaptureContextRef.current = { reopenFieldManager: false };
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
            setSelectedBoundaryIndex(null);
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
            setSelectedCatalogLineId(prev => prev === id ? null : prev);
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
            setSelectedTaskId(prev => prev === id ? null : prev);
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
      const normalizedBoundaries = currentFieldBoundaries.map(boundary => ({
          ...boundary,
          createdLocation: !boundary?.createdLocation || boundary.createdLocation === 'New field draft'
              ? newFieldName
              : boundary.createdLocation
      }));
      const newField = { id: Date.now(), name: newFieldName, area: area + " ha", lastUsed: "Just now", boundaries: normalizedBoundaries, lines: [], tasks: [] };
      actions.setFields(prev => [...prev, newField]);
      actions.setSelectedFieldId(newField.id);
      actions.setViewMode('LIST');
      showNotification("Field Saved Successfully", "success");
  };
  const startTaskCreation = () => actions.setViewMode('CREATE_TASK');
  const saveNewTask = (type) => {
      const createdAt = new Date();
      const taskField = fields.find(field => field.id === selectedFieldId);
      const newTask = {
          id: Date.now(),
          name: `${type} ${createdAt.getFullYear()}`,
          type,
          date: createdAt.toISOString(),
          createdAt: createdAt.toISOString(),
          createdLocation: taskField?.name || loadedField?.name || 'Location unavailable',
          createdPosition: { x: worldPos.x, y: worldPos.y },
          status: "Pending"
      };
      const updatedFields = fields.map(f => f.id === selectedFieldId
          ? { ...f, tasks: [newTask, ...(f.tasks || [])] }
          : f);
      actions.setFields(updatedFields);
      if (loadedField?.id === selectedFieldId) {
          actions.setLoadedField(updatedFields.find(field => field.id === selectedFieldId));
      }
      setSelectedTaskId(newTask.id);
      actions.setViewMode('LIST');
      showNotification(`Task "${newTask.name}" Created`, "success");
  };

  const handleLoadField = () => {
      const field = fields.find(f => f.id === selectedFieldId);
      actions.setLoadedField(field);
      showNotification(`Loaded Field: ${field.name}`, "success");
      setFieldManagerOpen(false);
      actions.setCoverageTrail([]);
      resetLines();
      setDragOffset({x:0, y:0});

      const loadableLines = (field.lines || []).filter(line => !line.archived);
      if (loadableLines.length > 0) {
          const defaultLine = loadableLines[0];
          handleLoadLine(defaultLine);
      }
  }

  const getDisplayHeading = () => { let h = heading % 360; if (h < 0) h += 360; return h.toFixed(1); };
  const getRtkColor = () => rtkStatus === 'FIX' ? 'bg-green-500 text-white border-green-400' : 'bg-yellow-500 text-black border-yellow-400';
  const getLineTypeIcon = () => { switch(lineType) { case 'STRAIGHT_AB': return GitCommitHorizontal; case 'A_PLUS': return ArrowUpFromDot; case 'CURVE': return Spline; case 'COMBINATION': return AlignJustify; case 'PIVOT': return CircleDashed; default: return GitCommitHorizontal; } };
  const activeFieldRecord = loadedField || fields.find(f => f.id === selectedFieldId);
  const activeTaskRecord = activeTaskId ? fields.find(f => f.id === selectedFieldId)?.tasks?.find(task => task.id === activeTaskId) : null;
  const activeLineRecord = activeLineId ? (activeFieldRecord?.lines || fields.find(f => f.id === selectedFieldId)?.lines || []).filter(line => !line.archived).find(line => line.id === activeLineId) : null;
  const activeFieldAreaHa = parseFloat(String(activeFieldRecord?.area || '0').replace(/[^\d.]/g, '')) || 0;
  const liveGuide = {
      type: guidanceLine,
      isMulti: isMultiLineMode,
      width: implementSettings.width * PIXELS_PER_METER,
      manualOffset,
      points: {
          a: pointA,
          b: pointB,
          aplus: { point: aPlusPoint, heading: aPlusHeading },
          curve: curvePoints,
          pivot: { center: pivotCenter, radius: pivotRadius }
      }
  };
  const liveGuidanceMetrics = getGuidanceMetrics(liveGuide, { ...worldPos, heading });
  const hasGuidanceToEngage = Boolean((guidanceLine || activeLineRecord || liveGuide.type) && liveGuidanceMetrics.validLine);
  const getAxisHeadingError = (lineHeading, vehicleHeading) => {
      let diff = normalizeAngle(lineHeading - vehicleHeading);
      if (Math.abs(diff) > 90) diff = normalizeAngle(lineHeading + 180 - vehicleHeading);
      return diff;
  };
  const liveHeadingError = liveGuidanceMetrics.validLine ? getAxisHeadingError(liveGuidanceMetrics.lineHeading, heading) : 0;
  const livePassIndex = liveGuidanceMetrics.validLine && liveGuide?.width ? Math.round(liveGuidanceMetrics.xte / liveGuide.width) : 0;
  const liveAreaRemaining = Math.max(0, activeFieldAreaHa - workedArea);
  const liveWorkRate = Math.abs(speed) > 0.2 ? Math.abs(speed) * Number(implementSettings.width || 0) / 10 : 0;
  const liveEtaMin = liveWorkRate > 0.05 ? Math.round((liveAreaRemaining / liveWorkRate) * 60) : null;
  const activeAlarms = (alarms || []).filter(alarm => !alarm.acked);
  const criticalAlarm = activeAlarms.find(alarm => alarm.severity === 'critical');
  const currentRunKpi = {
      ...(runKpi || {}),
      xteCm: crossTrackError,
      headingErrDeg: liveHeadingError,
      speedKmh: speed,
      targetSpeedKmh: manualTargetSpeed,
      areaDoneHa: workedArea,
      areaRemainingHa: liveAreaRemaining,
      etaMin: liveEtaMin,
      workRateHaHr: liveWorkRate,
      passIndex: activeLaneRef.current ?? manualLaneRef.current ?? livePassIndex
  };
  const straightABPreviewEnd = pointA ? { ...worldPos } : null;
  const liveRunStatus = (() => {
      if (steeringMode === 'AUTO' && !hasGuidanceToEngage) {
          return { steeringState: 'FAULT', steeringReason: 'Guidance geometry lost while engaged', overrideDetected: false, engageAllowed: false, recoveryAction: 'Return to manual' };
      }
      if (steeringMode === 'AUTO' && rtkStatus !== 'FIX') {
          return { steeringState: 'FAULT', steeringReason: 'RTK lost while engaged', overrideDetected: false, engageAllowed: false, recoveryAction: 'Return to manual' };
      }
      if (runStatus?.steeringReason === 'RTK lost while engaged' && rtkStatus !== 'FIX') {
          return { steeringState: 'FAULT', steeringReason: 'RTK lost while engaged', overrideDetected: false, engageAllowed: false, recoveryAction: 'Restore RTK FIX' };
      }
      if (turnAssistActive) {
          return { steeringState: 'PAUSED', steeringReason: 'Turn assist active', overrideDetected: false, engageAllowed: false, recoveryAction: 'Complete turn' };
      }
      if (runStatus?.overrideDetected) {
          return { steeringState: 'PAUSED', steeringReason: 'Operator manual steering override', overrideDetected: true, engageAllowed: true, recoveryAction: 'Clear override' };
      }
      if (steeringMode === 'AUTO') {
          return { steeringState: 'ENGAGED', steeringReason: 'Autosteer controlling active pass', overrideDetected: false, engageAllowed: true, recoveryAction: 'Disengage' };
      }
      if (!hasGuidanceToEngage) {
          return { steeringState: 'MANUAL', steeringReason: 'Create or load a guidance line', overrideDetected: false, engageAllowed: false, recoveryAction: 'Load line' };
      }
      if (rtkStatus !== 'FIX') {
          return { steeringState: 'MANUAL', steeringReason: 'Waiting for RTK FIX', overrideDetected: false, engageAllowed: false, recoveryAction: 'Check RTK' };
      }
      return { steeringState: 'READY', steeringReason: 'Ready to engage autosteer', overrideDetected: runStatus?.overrideDetected || false, engageAllowed: true, recoveryAction: 'Engage autosteer' };
  })();
  const currentRunStatus = { ...(runStatus || {}), ...liveRunStatus };
  const autosteerReady = hasGuidanceToEngage
      && rtkStatus === 'FIX'
      && currentRunStatus.steeringState === 'READY'
      && !currentRunStatus.overrideDetected;
  const autosteerStateLabel = isRecordingBoundary || boundaryCaptureReady
      ? 'BOUNDARY'
      : isCreating
          ? 'CREATING'
      : currentRunStatus.steeringState === 'FAULT'
      ? 'FAULT'
      : currentRunStatus.steeringState === 'PAUSED'
          ? 'PAUSED'
      : currentRunStatus.steeringState === 'ENGAGED'
          ? 'ENGAGED'
          : !hasGuidanceToEngage
              ? 'NO LINE'
              : currentRunStatus.overrideDetected || rtkStatus !== 'FIX' || currentRunStatus.engageAllowed === false
                  ? 'BLOCKED'
                  : 'READY';
  const autosteerPrimaryLabel = isRecordingBoundary || boundaryCaptureReady
      ? (isRecordingBoundary ? 'RECORDING' : 'PRESS START')
      : isCreating
          ? 'LINE SETUP'
      : turnAssistActive
          ? 'TURN ACTIVE'
      : steeringMode === 'AUTO'
      ? 'DISENGAGE'
      : !hasGuidanceToEngage
          ? 'SELECT LINE'
          : currentRunStatus.overrideDetected
              ? 'CLEAR OVERRIDE'
          : rtkStatus !== 'FIX'
              ? 'CHECK RTK'
              : currentRunStatus.engageAllowed === false
                  ? 'VIEW ISSUE'
                  : 'ENGAGE';
  const autosteerSubLabel = isRecordingBoundary || boundaryCaptureReady
      ? (isRecordingBoundary ? `${tempBoundary.length} points / finish from the right controls` : 'Start boundary capture from the right controls')
      : isCreating
          ? 'Complete guidance from the right controls'
      : currentRunStatus.steeringState === 'FAULT' || currentRunStatus.steeringState === 'PAUSED'
          ? currentRunStatus.steeringReason
      : steeringMode === 'AUTO'
      ? 'Autosteer controlling active pass'
      : !hasGuidanceToEngage
          ? 'Create or load guidance'
          : currentRunStatus.overrideDetected
              ? currentRunStatus.steeringReason
          : autosteerReady
              ? 'RTK FIX / guidance ready'
              : (currentRunStatus.steeringReason || 'RTK FIX required');
  const autosteerButtonTone = autosteerStateLabel === 'FAULT'
      ? 'bg-red-700 border-red-400'
      : autosteerStateLabel === 'PAUSED' || autosteerStateLabel === 'BOUNDARY'
          ? 'bg-orange-500 border-orange-300'
          : autosteerStateLabel === 'ENGAGED'
              ? 'bg-green-600 border-green-400'
              : autosteerReady || autosteerStateLabel === 'CREATING' || autosteerStateLabel === 'NO LINE'
                  ? 'bg-blue-600 border-blue-400'
                  : 'bg-slate-800 border-orange-500/70';
  const autosteerAccentText = autosteerStateLabel === 'FAULT'
      ? 'text-red-100'
      : autosteerStateLabel === 'PAUSED' || autosteerStateLabel === 'BOUNDARY'
          ? 'text-orange-50'
          : autosteerStateLabel === 'ENGAGED'
              ? 'text-green-100'
              : autosteerReady || autosteerStateLabel === 'CREATING' || autosteerStateLabel === 'NO LINE'
                  ? 'text-blue-100'
                  : 'text-orange-300';
  const autosteerIconTone = autosteerStateLabel === 'FAULT' || autosteerStateLabel === 'PAUSED' || autosteerStateLabel === 'BOUNDARY' || autosteerStateLabel === 'ENGAGED' || autosteerReady || autosteerStateLabel === 'CREATING' || autosteerStateLabel === 'NO LINE'
      ? 'bg-white/20 text-white'
      : 'bg-orange-500/15 text-orange-300';
  const AutosteerStatusIcon = autosteerStateLabel === 'PAUSED'
      ? Pause
      : autosteerStateLabel === 'BOUNDARY'
          ? MapPin
          : autosteerStateLabel === 'CREATING'
              ? Route
              : SteeringWheelIcon;
  const handleAutosteerPrimary = () => {
      setDockMenuOpen(false);
      if (isRecordingBoundary || boundaryCaptureReady || isCreating) {
          showNotification(
              isRecordingBoundary
                  ? 'Finish or cancel boundary from the right controls'
                  : boundaryCaptureReady
                      ? 'Press Start in the right controls to begin boundary capture'
                      : 'Complete guidance setup from the right controls',
              'info'
          );
          return;
      }
      if (turnAssistActive) {
          showNotification('Complete or cancel the active turn before engaging autosteer', 'info');
          return;
      }
      if (steeringMode === 'AUTO' || autosteerReady) {
          toggleSteering();
          return;
      }
      if (!hasGuidanceToEngage) {
          setRtkQualityOpen(false);
          setEventHistoryOpen(false);
          setProductivityOpen(false);
          setUTurnPanelOpen(false);
          setDockMenuOpen('line');
          showNotification('Select or create a guidance line', 'info');
          return;
      }
      if (currentRunStatus.overrideDetected) {
          clearOverrideState();
          showNotification('Manual override cleared', 'info');
          return;
      }
      if (currentRunStatus.engageAllowed === false && rtkStatus === 'FIX') {
          setEventHistoryOpen(true);
          setRtkQualityOpen(false);
          setProductivityOpen(false);
          showNotification(currentRunStatus.steeringReason || 'Autosteer is blocked', 'warning');
          return;
      }
      setRtkQualityOpen(true);
      setEventHistoryOpen(false);
      setProductivityOpen(false);
      showNotification('RTK FIX required before autosteer', 'warning');
  };
  const currentRtkTelemetry = {
      ...(rtkTelemetry || {}),
      fixType: rtkStatus,
      ageSec: rtkStatus === 'FIX' ? 1.2 : 6.8,
      latencyMs: rtkStatus === 'FIX' ? 48 : 180,
      hdop: rtkStatus === 'FIX' ? 0.7 : 1.8,
      pdop: rtkStatus === 'FIX' ? 1.1 : 2.7,
      baseSource: rtkSettings?.baseId || rtkTelemetry?.baseSource || 'BASE-01'
  };
  const currentGnssTelemetry = {
      ...(gnssTelemetry || {}),
      roverVisibleSats: 38,
      roverUsedSats: satelliteCount,
      baseVisibleSats: 4,
      constellations: gnssTelemetry?.constellations || 'GPS / GLO / GAL / BDS',
      roverStatus: rtkStatus,
      horizontalAccuracyCm: rtkStatus === 'FIX' ? 2.2 : 18.0,
      verticalAccuracyCm: rtkStatus === 'FIX' ? 3.1 : 28.0,
      correctionAgeSec: currentRtkTelemetry.ageSec,
      baselineKm: rtkSettings?.correctionSource === 'NTRIP' ? 12.4 : 0.8,
      antenna: gnssTelemetry?.antenna || 'Rover roof'
  };
  const getGuidanceModeLabel = () => (activeLineRecord?.type || guidanceLine || lineType || 'NO_LINE').replace(/_/g, ' ');
  const isHeadingUpMap = mapOrientation === 'HEADING_UP';
  const isMap3D = sceneViewMode === '3D';
  const mapRotationDeg = isHeadingUpMap ? -mapVisualHeading : 0;
  const mapRotationRad = mapRotationDeg * Math.PI / 180;
  const sceneRotationDeg = isMap3D ? 0 : mapRotationDeg;
  const vehicleScreenOffsetX = (dragOffset.x * Math.cos(mapRotationRad) - dragOffset.y * Math.sin(mapRotationRad)) * zoomLevel;
  const vehicleScreenOffsetY = (dragOffset.x * Math.sin(mapRotationRad) + dragOffset.y * Math.cos(mapRotationRad)) * zoomLevel * (isMap3D ? 0.64 : 1);
  const vehicleScreenHeading = isHeadingUpMap ? 0 : heading;
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
              className={`absolute left-4 top-4 z-30 w-[108px] rounded-xl border ${t.borderCard} ${t.bgCard} shadow-lg backdrop-blur p-2 flex flex-col items-center gap-2`}
              onPointerDown={(e) => e.stopPropagation()}
              onPointerMove={(e) => e.stopPropagation()}
              onPointerUp={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
          >
              <svg width="62" height="62" viewBox="0 0 82 82" aria-label="Compass" className="shrink-0">
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
          { key: 'lift', label: 'Lift', value: featureSettings.liftSensor ? 'AUTO' : 'MAN', icon: ArrowUpFromDot, active: featureSettings.liftSensor }
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
      const barTone = abs >= 10 ? 'bg-red-500' : abs >= 4 ? 'bg-yellow-500' : 'bg-blue-500';
      const offsetCm = manualOffset / PIXELS_PER_METER * 100;
      const offsetValue = `${offsetCm > 0 ? '+' : ''}${offsetCm.toFixed(0)}cm`;
      const passValue = `${currentRunKpi.passIndex >= 0 ? '+' : ''}${currentRunKpi.passIndex}`;
      const errorTextTone = abs >= 10 ? 'text-red-500' : abs >= 4 ? 'text-yellow-600 dark:text-yellow-400' : t.textMain;
      const meterPosition = Math.max(4, Math.min(96, 50 + (crossTrackError / 30) * 46));
      const errorFeedLive = steeringMode === 'AUTO';
      const meterTrack = theme === 'dark'
          ? 'linear-gradient(90deg, rgba(239,68,68,.35) 0%, rgba(245,158,11,.25) 28%, rgba(59,130,246,.28) 50%, rgba(245,158,11,.25) 72%, rgba(239,68,68,.35) 100%)'
          : 'linear-gradient(90deg, rgba(239,68,68,.24) 0%, rgba(245,158,11,.18) 28%, rgba(59,130,246,.20) 50%, rgba(245,158,11,.18) 72%, rgba(239,68,68,.24) 100%)';

      return (
          <div
              data-guidance-hud
              className={`h-full w-full ${theme === 'dark' ? 'bg-slate-900/30' : 'bg-slate-50/55'} px-2 grid grid-cols-[96px_minmax(0,1fr)_96px] items-center`}
          >
              <div className="min-w-0 flex flex-col items-center justify-center text-center">
                  <span className={`text-base font-black leading-none tabular-nums ${t.textMain}`}>{passValue}</span>
                  <span className={`mt-1 text-[9px] uppercase font-black tracking-wider leading-none ${t.textSub}`}>Pass</span>
              </div>

              <div
                  data-error-center
                  className="relative min-w-0 h-full px-4 flex flex-col items-center justify-center text-center"
              >
                  <span aria-hidden="true" className={`absolute left-0 top-1/2 h-11 -translate-y-1/2 border-l ${t.borderCard}`} />
                  <span aria-hidden="true" className={`absolute right-0 top-1/2 h-11 -translate-y-1/2 border-r ${t.borderCard}`} />
                  <div className="flex items-center justify-center">
                      <span className={`text-[8px] uppercase font-black leading-none tracking-[0.12em] ${t.textSub}`}>Line error</span>
                  </div>
                  <div className="relative mt-1 h-[27px] w-full">
                      <span data-error-value className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[27px] font-black leading-none tabular-nums ${errorTextTone}`}>
                          {abs.toFixed(abs >= 10 ? 0 : 1)}
                      </span>
                      <span
                          data-error-meta
                          className={`absolute top-1/2 -translate-y-1/2 flex flex-col items-start text-[8px] font-black uppercase leading-[1.05] tracking-[0.06em] ${errorTextTone}`}
                          style={{ left: 'calc(50% + 40px)' }}
                      >
                          <span>cm</span>
                          <span>{direction}</span>
                      </span>
                  </div>
                  <div
                      data-error-meter
                      role="meter"
                      aria-label={`Cross-track error ${abs.toFixed(1)} centimeters ${direction}`}
                      aria-valuemin="-30"
                      aria-valuemax="30"
                      aria-valuenow={Math.max(-30, Math.min(30, crossTrackError))}
                      className="mt-1.5 flex w-full max-w-[220px] items-center gap-2"
                  >
                      <span className={`text-[8px] font-black leading-none ${t.textDim}`}>L</span>
                      <span className="relative h-1.5 flex-1 rounded-full" style={{ background: meterTrack }}>
                          <span className={`absolute left-1/2 top-1/2 h-3 w-px -translate-x-1/2 -translate-y-1/2 ${theme === 'dark' ? 'bg-white/70' : 'bg-slate-700/70'}`} />
                          <span
                              className={`absolute top-1/2 z-10 h-4 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white shadow-sm ${barTone} transition-[left] duration-300 ease-out`}
                              style={{ left: `${meterPosition}%` }}
                          />
                      </span>
                      <span className={`text-[8px] font-black leading-none ${t.textDim}`}>R</span>
                  </div>
              </div>

              <div className="min-w-0 flex flex-col items-center justify-center text-center">
                  <span className={`text-base font-black leading-none tabular-nums ${t.textMain}`}>{offsetValue}</span>
                  <span className={`mt-1 text-[9px] uppercase font-black tracking-wider leading-none ${t.textSub}`}>Offset</span>
              </div>
          </div>
      );
  };

  const getSeverityTone = (severity) => {
      if (severity === 'critical') return 'border-red-500 bg-red-500/12 text-red-500';
      if (severity === 'warning') return 'border-yellow-500 bg-yellow-500/12 text-yellow-600 dark:text-yellow-400';
      return 'border-blue-500 bg-blue-500/12 text-blue-500';
  };

  const getSteeringTone = () => {
      if (currentRunStatus.steeringState === 'ENGAGED') return 'bg-green-600 text-white border-green-400';
      if (currentRunStatus.steeringState === 'READY') return 'bg-blue-600 text-white border-blue-400';
      if (currentRunStatus.steeringState === 'PAUSED') return 'bg-yellow-500 text-black border-yellow-300';
      if (currentRunStatus.steeringState === 'FAULT') return 'bg-red-600 text-white border-red-400';
      return `${theme === 'dark' ? 'bg-slate-900 text-slate-200 border-slate-700' : 'bg-white text-slate-900 border-gray-300'}`;
  };

  const getRtkQualityTone = () => {
      if (currentRtkTelemetry.fixType === 'FIX' && currentRtkTelemetry.ageSec <= 2 && currentRtkTelemetry.hdop <= 1.2) return 'bg-green-600 text-white border-green-400';
      if (currentRtkTelemetry.fixType === 'FIX' || currentRtkTelemetry.fixType === 'FLOAT') return 'bg-yellow-500 text-black border-yellow-300';
      return 'bg-red-600 text-white border-red-400';
  };

  const renderRunSafetyCluster = () => (
      <div className="min-w-0 flex items-center justify-end gap-2">
          <button
              type="button"
              aria-label={`Open RTK quality, ${currentRtkTelemetry.fixType}, rover ${currentGnssTelemetry.roverUsedSats} used of ${currentGnssTelemetry.roverVisibleSats} visible satellites`}
              onClick={() => { setRtkQualityOpen(prev => !prev); setEventHistoryOpen(false); setProductivityOpen(false); }}
              disabled={isRecordingBoundary}
              className={`h-12 min-w-[148px] xl:min-w-[162px] px-3 rounded-xl border shadow-sm text-left ${getRtkQualityTone()} focus:outline-none focus:ring-2 focus:ring-blue-500 flex flex-col justify-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
              <div className="text-[10px] uppercase font-black opacity-80 leading-none">GNSS / RTK</div>
              <div className="flex items-center gap-1.5 min-w-0">
                  <Globe className="w-3.5 h-3.5" />
                  <span className="text-sm font-black">{currentRtkTelemetry.fixType}</span>
                  <span className="text-sm font-black opacity-90">{currentGnssTelemetry.roverUsedSats}/{currentGnssTelemetry.roverVisibleSats} SAT</span>
              </div>
          </button>

          <button
              type="button"
              aria-label={`${activeAlarms.length} active alarms, open event history`}
              onClick={() => { setEventHistoryOpen(prev => !prev); setRtkQualityOpen(false); setProductivityOpen(false); }}
              disabled={isRecordingBoundary}
              className={`h-12 min-w-[58px] px-3 rounded-xl border ${activeAlarms.length > 0 ? getSeverityTone(activeAlarms[0].severity) : `${theme === 'dark' ? 'bg-slate-900 border-slate-700 text-slate-300' : 'bg-white border-gray-300 text-slate-700'}`} flex flex-col items-center justify-center shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs font-black">{activeAlarms.length}</span>
          </button>
      </div>
  );

  const renderCriticalAlarmBanner = () => {
      const recoveryNotice = !criticalAlarm && currentRunStatus.overrideDetected ? {
          id: 'manual-override',
          severity: 'warning',
          message: currentRunStatus.steeringReason,
          action: clearOverrideState,
          label: 'CLEAR'
      } : null;
      const pinned = criticalAlarm || recoveryNotice;
      if (!pinned) return null;
      const isCritical = pinned.severity === 'critical';
      return (
          <div className={`absolute left-[154px] right-[118px] xl:right-[128px] top-3 z-40 rounded-xl border shadow-2xl px-4 py-3 flex items-center justify-between gap-4 ${isCritical ? 'border-red-500 bg-red-600 text-white' : 'border-yellow-500 bg-yellow-500 text-black'}`}>
              <div className="min-w-0 flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 shrink-0" />
                  <div className="min-w-0">
                      <div className="text-xs font-black uppercase">{isCritical ? 'Critical Alarm' : 'Recovery Required'}</div>
                      <div className="text-sm font-bold truncate">{pinned.message}</div>
                  </div>
              </div>
              <button onClick={() => pinned.action ? pinned.action() : ackAlarm(pinned.id)} className={`shrink-0 px-4 py-2 rounded-lg font-black text-sm ${isCritical ? 'bg-white/15 hover:bg-white/25' : 'bg-black/10 hover:bg-black/15'}`}>
                  {pinned.label || 'ACK'}
              </button>
          </div>
      );
  };

  const renderRtkQualityPanel = () => {
      if (!rtkQualityOpen) return null;
      const stale = currentRtkTelemetry.ageSec > 5;
      return (
          <div className={`absolute right-4 top-[86px] z-[45] w-[320px] rounded-2xl border ${t.borderCard} ${t.bgCard} shadow-2xl p-4`}>
              <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                      <div className={`text-xs uppercase font-black ${t.textSub}`}>RTK Quality</div>
                      <div className={`text-xl font-black ${stale ? 'text-red-500' : currentRtkTelemetry.fixType === 'FIX' ? 'text-green-500' : 'text-yellow-500'}`}>{currentRtkTelemetry.fixType}</div>
                  </div>
                  <button aria-label="Close RTK quality panel" onClick={() => setRtkQualityOpen(false)} className={`p-2 rounded-lg border ${t.borderCard} ${t.textMain}`}>
                      <X className="w-4 h-4" />
                  </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                  {[
                      ['Age', `${currentRtkTelemetry.ageSec.toFixed(1)} s`, stale ? 'text-red-500' : t.textMain],
                      ['Latency', `${currentRtkTelemetry.latencyMs} ms`, currentRtkTelemetry.latencyMs > 150 ? 'text-yellow-500' : t.textMain],
                      ['HDOP', currentRtkTelemetry.hdop.toFixed(1), currentRtkTelemetry.hdop > 1.5 ? 'text-yellow-500' : t.textMain],
                      ['PDOP', currentRtkTelemetry.pdop.toFixed(1), currentRtkTelemetry.pdop > 2.5 ? 'text-yellow-500' : t.textMain],
                      ['Rover', `${currentGnssTelemetry.roverUsedSats}/${currentGnssTelemetry.roverVisibleSats}`, t.textMain],
                      ['Base Sats', currentGnssTelemetry.baseVisibleSats, t.textMain],
                      ['H Acc', `${currentGnssTelemetry.horizontalAccuracyCm.toFixed(1)} cm`, currentGnssTelemetry.horizontalAccuracyCm > 5 ? 'text-yellow-500' : t.textMain],
                      ['Base', currentRtkTelemetry.baseSource, t.textMain]
                  ].map(([label, value, tone]) => (
                      <div key={label} className={`rounded-lg border ${t.borderCard} ${theme === 'dark' ? 'bg-slate-900' : 'bg-slate-50'} p-3 min-w-0`}>
                          <div className={`text-[10px] uppercase font-black ${t.textSub}`}>{label}</div>
                          <div className={`text-sm font-black truncate ${tone}`}>{value}</div>
                      </div>
                  ))}
              </div>
              {stale && (
                  <div className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 text-red-500 px-3 py-2 text-sm font-bold">
                      Correction data stale. Check base/NTRIP link.
                  </div>
              )}
              <button
                  onClick={() => {
                      setRtkQualityOpen(false);
                      setSettingsTab('rtk');
                      setSettingsOpen(true);
                  }}
                  className="mt-3 w-full h-11 rounded-xl bg-blue-600 text-white font-black hover:bg-blue-500 active:scale-[0.99]"
              >
                  Open RTK / GNSS Setup
              </button>
          </div>
      );
  };

  const renderUTurnQuickPanel = () => {
      if (!uTurnPanelOpen || settingsOpen || fieldManagerOpen || linesPanelOpen) return null;
      const turnConfig = {
          pattern: 'Smart U-Turn',
          direction: 'Auto',
          nextPass: 'Adjacent',
          skipPasses: 0,
          turnSpeedKmh: 5.5,
          liftAction: true,
          resumeAutosteer: true,
          ...uTurnSettings
      };
      const optionButton = (group, value, label = value) => {
          const active = turnConfig[group] === value;
          return (
              <button
                  key={`${group}-${value}`}
                  onClick={() => handleUTurnSettingChange(group, value)}
                  className={`h-10 rounded-lg border text-xs font-black ${active ? 'border-blue-500 bg-blue-600 text-white' : `${t.borderCard} ${t.textMain} ${theme === 'dark' ? 'bg-slate-900' : 'bg-white'}`}`}
              >
                  {label}
              </button>
          );
      };
      const passButton = (value, skip, label) => {
          const active = turnConfig.nextPass === value && Number(turnConfig.skipPasses || 0) === skip;
          return (
              <button
                  key={`${value}-${skip}`}
                  onClick={() => {
                      handleUTurnSettingChange('nextPass', value);
                      handleUTurnSettingChange('skipPasses', skip);
                  }}
                  className={`h-10 rounded-lg border text-xs font-black ${active ? 'border-blue-500 bg-blue-600 text-white' : `${t.borderCard} ${t.textMain} ${theme === 'dark' ? 'bg-slate-900' : 'bg-white'}`}`}
              >
                  {label}
              </button>
          );
      };
      const togglePill = (key, label) => {
          const active = Boolean(turnConfig[key]);
          return (
              <button
                  key={key}
                  onClick={() => handleUTurnSettingChange(key, !active)}
                  className={`h-9 px-3 rounded-lg border text-xs font-black ${active ? 'border-green-500 bg-green-500/10 text-green-500' : `${t.borderCard} ${t.textSub}`}`}
              >
                  {label}
              </button>
          );
      };

      return (
          <div className={`absolute right-4 top-[86px] z-[45] w-[340px] rounded-2xl border ${t.borderCard} ${t.bgCard} shadow-2xl p-4`}>
              <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex items-center gap-3">
                      <div className={`shrink-0 w-10 h-10 rounded-xl ${theme === 'dark' ? 'bg-slate-800' : 'bg-blue-50'} flex items-center justify-center`}>
                          <CornerUpLeft className="w-5 h-5 text-blue-500" />
                      </div>
                      <div className="min-w-0">
                          <div className={`text-xs uppercase font-black ${t.textSub}`}>Turn Plan</div>
                          <div className={`text-lg font-black truncate ${t.textMain}`}>{turnConfig.pattern}</div>
                      </div>
                  </div>
                  <button aria-label="Close turn plan" onClick={() => setUTurnPanelOpen(false)} className={`p-2 rounded-lg border ${t.borderCard} ${t.textMain}`}>
                      <X className="w-4 h-4" />
                  </button>
              </div>

              <div className="mt-4 space-y-3">
                  <div>
                      <div className={`mb-1.5 text-[10px] uppercase font-black ${t.textSub}`}>Pattern</div>
                      <div className="grid grid-cols-3 gap-2">
                          {optionButton('pattern', 'Smart U-Turn', 'Smart')}
                          {optionButton('pattern', 'Basic Omega', 'Omega')}
                          {optionButton('pattern', 'Fish Tail', 'Fish Tail')}
                      </div>
                  </div>
                  <div>
                      <div className={`mb-1.5 text-[10px] uppercase font-black ${t.textSub}`}>Direction</div>
                      <div className="grid grid-cols-3 gap-2">
                          {optionButton('direction', 'Auto')}
                          {optionButton('direction', 'Left')}
                          {optionButton('direction', 'Right')}
                      </div>
                  </div>
                  <div>
                      <div className={`mb-1.5 text-[10px] uppercase font-black ${t.textSub}`}>Next Pass</div>
                      <div className="grid grid-cols-3 gap-2">
                          {passButton('Adjacent', 0, '+1')}
                          {passButton('Skip', 1, 'Skip 1')}
                          {passButton('Skip', 2, 'Skip 2')}
                      </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                      {togglePill('liftAction', 'Lift')}
                      {togglePill('resumeAutosteer', 'Resume Auto')}
                  </div>
              </div>

              <div className="mt-4 grid grid-cols-[1fr_auto] gap-2">
                  <button
                      onClick={() => {
                          setUTurnPanelOpen(false);
                          handleUTurn();
                      }}
                      className="h-11 rounded-xl bg-blue-600 text-white font-black hover:bg-blue-500 active:scale-[0.99]"
                  >
                      Run Turn
                  </button>
                  <button
                      onClick={() => {
                          setUTurnPanelOpen(false);
                          setSettingsTab('uturn');
                          setSettingsOpen(true);
                      }}
                      className={`h-11 px-3 rounded-xl border ${t.borderCard} ${t.textMain} font-black hover:brightness-95`}
                  >
                      Setup
                  </button>
              </div>
          </div>
      );
  };

  const renderEventHistoryDrawer = () => {
      if (!eventHistoryOpen) return null;
      const events = [...(alarms || []), ...(eventLog || [])]
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 28);
      return (
          <div className={`absolute right-4 top-[86px] bottom-[112px] z-[45] w-[360px] rounded-2xl border ${t.borderCard} ${t.bgCard} shadow-2xl flex flex-col overflow-hidden`}>
              <div className={`shrink-0 p-4 border-b ${t.divider} flex items-center justify-between gap-3`}>
                  <div>
                      <div className={`text-xs uppercase font-black ${t.textSub}`}>Events</div>
                      <div className={`text-lg font-black ${t.textMain}`}>Alarms & History</div>
                  </div>
                  <button aria-label="Close events panel" onClick={() => setEventHistoryOpen(false)} className={`p-2 rounded-lg border ${t.borderCard} ${t.textMain}`}>
                      <X className="w-4 h-4" />
                  </button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
                  {events.length === 0 ? (
                      <div className={`h-full flex items-center justify-center text-sm ${t.textDim}`}>No events yet.</div>
                  ) : events.map((event) => (
                      <div key={`${event.id}-${event.timestamp}`} className={`rounded-xl border p-3 ${getSeverityTone(event.severity)}`}>
                          <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                  <div className="text-[10px] uppercase font-black">{event.severity}</div>
                                  <div className="text-sm font-bold leading-tight">{event.message}</div>
                                  <div className="text-[10px] opacity-80 mt-1">{new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                              </div>
                              {!event.acked && (
                                  <button onClick={() => ackAlarm(event.id)} className="shrink-0 px-2 py-1 rounded bg-white/20 text-xs font-black">
                                      ACK
                                  </button>
                              )}
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      );
  };

  const renderProductivityPanel = () => {
      if (!productivityOpen) return null;
      const implementName = cleanProfileLabel(implementSettings.name, activeImplementProfile.label);
      const sections = Math.max(1, Math.min(16, Number(implementSettings.sections || 1)));
      const etaLabel = currentRunKpi.etaMin === null ? '--' : currentRunKpi.etaMin < 60 ? `${currentRunKpi.etaMin} min` : `${Math.floor(currentRunKpi.etaMin / 60)}h ${currentRunKpi.etaMin % 60}m`;
      return (
          <div className={`absolute left-[154px] bottom-[112px] z-[45] w-[360px] rounded-2xl border ${t.borderCard} ${t.bgCard} shadow-2xl overflow-hidden`}>
              <div className={`p-4 border-b ${t.divider} flex items-center justify-between gap-3`}>
                  <div className="min-w-0">
                      <div className={`text-xs uppercase font-black ${t.textSub}`}>Productivity</div>
                      <div className={`text-lg font-black ${t.textMain} truncate`}>{activeTaskRecord?.name || 'No active task'}</div>
                  </div>
                  <button aria-label="Close productivity panel" onClick={() => setProductivityOpen(false)} className={`p-2 rounded-lg border ${t.borderCard} ${t.textMain}`}>
                      <X className="w-4 h-4" />
                  </button>
              </div>
              <div className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                      {[
                          ['Done', `${currentRunKpi.areaDoneHa.toFixed(2)} ha`, 'text-green-500'],
                          ['Remaining', `${currentRunKpi.areaRemainingHa.toFixed(2)} ha`, t.textMain],
                          ['Work rate', `${currentRunKpi.workRateHaHr.toFixed(2)} ha/h`, t.textMain],
                          ['ETA', etaLabel, t.textMain]
                      ].map(([label, value, tone]) => (
                          <div key={label} className={`rounded-xl border ${t.borderCard} ${theme === 'dark' ? 'bg-slate-900' : 'bg-slate-50'} p-3 min-w-0`}>
                              <div className={`text-[10px] uppercase font-black ${t.textSub}`}>{label}</div>
                              <div className={`text-base font-black truncate ${tone}`}>{value}</div>
                          </div>
                      ))}
                  </div>
                  <div className={`rounded-xl border ${t.borderCard} ${theme === 'dark' ? 'bg-slate-900' : 'bg-slate-50'} p-3`}>
                      <div className="flex items-center justify-between gap-3 mb-3">
                          <div className="min-w-0">
                              <div className={`text-[10px] uppercase font-black ${t.textSub}`}>Implement</div>
                              <div className={`text-sm font-black ${t.textMain} truncate`}>{implementName}</div>
                          </div>
                          <span className="shrink-0 text-xs font-black text-blue-500">{Number(implementSettings.width || 0).toFixed(1)} m</span>
                      </div>
                      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${sections}, minmax(0, 1fr))` }}>
                          {Array.from({ length: sections }).map((_, index) => (
                              <div
                                  key={index}
                                  className={`h-7 rounded-md border flex items-center justify-center text-[10px] font-black ${isRecording ? 'bg-green-500/18 border-green-500/45 text-green-500' : `${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'} ${t.textSub}`}`}
                              >
                                  {index + 1}
                              </div>
                          ))}
                      </div>
                  </div>
                  <div className={`rounded-xl border ${t.borderCard} ${theme === 'dark' ? 'bg-slate-900' : 'bg-slate-50'} p-3 flex items-center justify-between gap-3`}>
                      <div className="min-w-0">
                          <div className={`text-[10px] uppercase font-black ${t.textSub}`}>Coverage recording</div>
                          <div className={`text-sm font-black ${isRecording ? 'text-red-500' : t.textMain}`}>{isRecording ? 'Recording coverage' : 'Paused'}</div>
                      </div>
                      <button onClick={() => setIsRecording(prev => !prev)} className={`shrink-0 px-3 py-2 rounded-lg text-xs font-black ${isRecording ? 'bg-red-500/12 text-red-500 border border-red-500/30' : 'bg-blue-600 text-white'}`}>
                          {isRecording ? 'Stop' : 'Start'}
                      </button>
                  </div>
              </div>
          </div>
      );
  };

  const renderMissionOverview = () => {
      const runCardBg = theme === 'dark' ? 'bg-slate-900/80' : 'bg-white/90';
      const runShelfBg = theme === 'dark' ? 'bg-slate-950/68' : 'bg-white/76';
      const fieldName = activeFieldRecord?.name || 'No Field Loaded';
      const lineName = activeLineRecord?.name || getGuidanceModeLabel();
      const implementName = cleanProfileLabel(implementSettings.name, activeImplementProfile.label);

      return (
      <div
          className={`absolute left-4 right-[124px] bottom-4 z-20 rounded-2xl border ${t.borderCard} ${runShelfBg} shadow-xl backdrop-blur-md p-2.5`}
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
      >
          <div className="grid grid-cols-2 xl:grid-cols-[minmax(180px,1.15fr)_minmax(160px,0.95fr)_minmax(170px,1fr)_minmax(160px,0.9fr)] gap-2.5">
              <div className={`h-[68px] rounded-xl border ${t.borderCard} ${runCardBg} px-3 py-2 min-w-0`}>
                  <div className={`text-[9px] uppercase font-black tracking-wider ${t.textSub}`}>Field / Line</div>
                  <div className={`text-sm font-black truncate ${t.textMain}`}>{fieldName}</div>
                  <div className="text-[10px] font-bold text-blue-500 truncate">{lineName}</div>
              </div>
              <div className={`h-[68px] rounded-xl border ${t.borderCard} ${runCardBg} px-3 py-2 min-w-0`}>
                  <div className={`text-[9px] uppercase font-black tracking-wider ${t.textSub}`}>Task / Coverage</div>
                  <div className={`text-sm font-black truncate ${activeTaskRecord ? 'text-green-500' : t.textMain}`}>{activeTaskRecord?.name || 'No Active Task'}</div>
                  <div className={`text-[10px] font-bold ${t.textSub}`}>{workedArea.toFixed(2)} ha done</div>
              </div>
              <div className={`h-[68px] rounded-xl border ${t.borderCard} ${runCardBg} px-3 py-2 min-w-0`}>
                  <div className={`text-[9px] uppercase font-black tracking-wider ${t.textSub}`}>Implement</div>
                  <div className={`text-sm font-black truncate ${t.textMain}`}>{implementName}</div>
                  <div className={`text-[10px] font-bold ${t.textSub}`}>{Number(implementSettings.width || 0).toFixed(1)} m / {implementSettings.sections || 1} sections</div>
                  {false && (
                      <>
                  <div className={`text-sm font-black ${t.textMain}`}>{getDisplayHeading()}°</div>
                  <div className={`text-[10px] font-bold ${t.textSub}`}>{getCardinalShortDirection(heading)} / HDG UP</div>
                      </>
                  )}
              </div>
              <div className={`h-[68px] rounded-xl border ${t.borderCard} ${runCardBg} px-3 py-2 min-w-0`}>
                  <div className={`text-[9px] uppercase font-black tracking-wider ${t.textSub}`}>GNSS / Steer</div>
                  <div className={`text-sm font-black truncate ${rtkStatus === 'FIX' ? 'text-green-500' : 'text-yellow-500'}`}>{rtkStatus} / {steeringMode}</div>
                  <div className={`text-[10px] font-bold ${t.textSub}`}>{satelliteCount} sats / {getDisplayHeading()}&deg; {getCardinalShortDirection(heading)}</div>
              </div>
          </div>
      </div>
      );
  };

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
      const horizonY = options.horizonY ?? 72;
      const vehicleY = 470;
      const depth = options.depth ?? 820;
      const forwardGain = options.forwardGain ?? 1;
      const projectedForward = forward * forwardGain;
      const denom = 1 + projectedForward / depth;
      if (!Number.isFinite(denom) || denom <= 0.05) return null;

      const perspective = 1 / denom;
      const usePerspectiveScale = options.usePerspectiveScale !== false;
      const lateralGain = options.lateralGain ?? 1;
      const lateralPerspectiveStrength = Math.max(0, Math.min(1, options.lateralPerspectiveStrength ?? 1));
      const perspectiveLateral = 1 + ((perspective - 1) * lateralPerspectiveStrength);
      const lateralScale = usePerspectiveScale ? perspectiveLateral * lateralGain : lateralGain;
      const cameraZoom = isMap3D ? zoomLevel / MAP_ZOOM_REFERENCE : 1;
      const projectedX = 500 + lateral * lateralScale;
      const projectedY = horizonY + (vehicleY - horizonY) * perspective;
      const x = 500 + (projectedX - 500) * cameraZoom;
      const y = vehicleY + (projectedY - vehicleY) * cameraZoom;
      const screenMargin = options.screenMargin ?? 0;
      const minX = options.minX ?? -screenMargin;
      const maxX = options.maxX ?? (1000 + screenMargin);
      if (Number.isFinite(options.minY) && y < options.minY) return null;
      if (Number.isFinite(options.maxY) && y > options.maxY) return null;
      if (Number.isFinite(minX) && x < minX) return null;
      if (Number.isFinite(maxX) && x > maxX) return null;
      if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
      return { x, y, perspective, lateralScale };
  };

  const getPhysicalVehicleScreenScale3D = () => {
      const widthMeters = Math.max(0.25, Number(implementSettings.width) || 3);
      const halfWidthWorld = widthMeters * PIXELS_PER_METER / 2;
      const headingRad = heading * Math.PI / 180;
      const rightX = Math.cos(headingRad);
      const rightY = Math.sin(headingRad);
      const projectionOptions = {
          lateralGain: 0.62,
          forwardGain: 1.18,
          usePerspectiveScale: true
      };
      const projectedLeft = getProjected3DPoint({
          x: worldPos.x - rightX * halfWidthWorld,
          y: worldPos.y - rightY * halfWidthWorld
      }, projectionOptions);
      const projectedRight = getProjected3DPoint({
          x: worldPos.x + rightX * halfWidthWorld,
          y: worldPos.y + rightY * halfWidthWorld
      }, projectionOptions);

      if (!projectedLeft || !projectedRight) return 0.2;

      const screenDx = (projectedRight.x - projectedLeft.x) * mapCanvasSize.width / 1000;
      const screenDy = (projectedRight.y - projectedLeft.y) * mapCanvasSize.height / 700;
      const projectedImplementWidth = Math.hypot(screenDx, screenDy);
      const implementVisualWidth = widthMeters * 48;
      return Math.max(0.1, Math.min(1.2, projectedImplementWidth / implementVisualWidth));
  };

  const vehicleScreenScale = isMap3D
      ? getPhysicalVehicleScreenScale3D()
      : Math.max(0.1, Math.min(1.2, zoomLevel * PIXELS_PER_METER / 48));

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

  const normalizeDashPattern = (dashPattern, fallback = [42, 34]) => {
      const rawValues = Array.isArray(dashPattern)
          ? dashPattern
          : String(dashPattern || '').split(/[,\s]+/);
      const values = rawValues
          .map(Number)
          .filter(value => Number.isFinite(value) && value > 0.001);
      const normalized = values.length ? values : fallback;
      return normalized.length % 2 === 0 ? normalized : normalized.concat(normalized);
  };

  const getWorldAnchoredDashSegments = (points, dashPattern) => {
      if (!points || points.length < 2) return [];

      const pattern = normalizeDashPattern(dashPattern);
      const segments = [];
      let patternIndex = 0;
      let remainingInPattern = pattern[0];

      for (let i = 0; i < points.length - 1; i++) {
          const start = points[i];
          const end = points[i + 1];
          const segmentLength = Math.hypot(end.x - start.x, end.y - start.y);
          if (!Number.isFinite(segmentLength) || segmentLength <= 0.001) continue;

          let travelled = 0;
          while (travelled < segmentLength - 0.001) {
              const step = Math.min(remainingInPattern, segmentLength - travelled);
              const shouldDraw = patternIndex % 2 === 0;
              if (shouldDraw && step > 0.001) {
                  const t0 = travelled / segmentLength;
                  const t1 = (travelled + step) / segmentLength;
                  segments.push({
                      start: {
                          x: start.x + (end.x - start.x) * t0,
                          y: start.y + (end.y - start.y) * t0
                      },
                      end: {
                          x: start.x + (end.x - start.x) * t1,
                          y: start.y + (end.y - start.y) * t1
                      }
                  });
              }

              travelled += step;
              remainingInPattern -= step;
              if (remainingInPattern <= 0.001) {
                  patternIndex = (patternIndex + 1) % pattern.length;
                  remainingInPattern = pattern[patternIndex];
              }
          }
      }

      return segments;
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

  const getUTurnPathPoints = () => {
      if (!turnAssistActive && !uTurnPanelOpen) return [];

      const configuredDirection = uTurnSettings?.direction || 'Auto';
      const direction = turnAssistRef.current?.direction
          || (configuredDirection === 'Left' ? -1 : configuredDirection === 'Right' ? 1 : (steeringAngle < -1 ? -1 : 1));
      const turnPattern = (turnAssistRef.current?.pattern || uTurnSettings?.pattern || 'Smart U-Turn').toLowerCase();
      const radiusMeters = Math.max(4.5, Number(vehicleSettings?.turnRadius || 6.5));
      const radius = Math.max(150, radiusMeters * PIXELS_PER_METER * 1.9);
      const laneShift = Math.max(
          implementSettings.width * PIXELS_PER_METER * Math.max(1, Number(turnAssistRef.current?.skipPasses || uTurnSettings?.skipPasses || 0) + 1),
          radius * 1.25
      );
      const lead = Math.max(220, radius * 1.35);
      const exitLead = Math.max(96, radius * 0.62);
      const currentHeading = heading * Math.PI / 180;
      const forward = { x: Math.sin(currentHeading), y: -Math.cos(currentHeading) };
      const right = { x: Math.cos(currentHeading), y: Math.sin(currentHeading) };

      const localToWorld = (forwardDistance, lateralDistance) => ({
          x: worldPos.x + forward.x * forwardDistance + right.x * lateralDistance,
          y: worldPos.y + forward.y * forwardDistance + right.y * lateralDistance
      });
      const cubic = (p0, c1, c2, p1, steps = 28) => Array.from({ length: steps + 1 }, (_, idx) => {
          const tStep = idx / steps;
          const inv = 1 - tStep;
          return {
              x: (inv ** 3 * p0.x) + (3 * inv ** 2 * tStep * c1.x) + (3 * inv * tStep ** 2 * c2.x) + (tStep ** 3 * p1.x),
              y: (inv ** 3 * p0.y) + (3 * inv ** 2 * tStep * c1.y) + (3 * inv * tStep ** 2 * c2.y) + (tStep ** 3 * p1.y)
          };
      });
      const append = (target, segment) => {
          segment.forEach((point, idx) => {
              if (idx === 0 && target.length) return;
              target.push(point);
          });
      };

      const start = localToWorld(0, 0);
      const entry = localToWorld(lead, 0);
      const exit = localToWorld(lead, direction * laneShift);
      const out = localToWorld(Math.max(34, lead - exitLead), direction * laneShift);
      const points = [start, entry];

      if (turnPattern.includes('fish')) {
          const kickOut = localToWorld(lead * 0.82, direction * laneShift * 1.28);
          const neck = localToWorld(lead * 1.26, direction * laneShift * 0.56);
          append(points, cubic(entry, localToWorld(lead * 1.02, direction * laneShift * 0.28), localToWorld(lead * 0.94, direction * laneShift * 1.14), kickOut, 20));
          append(points, cubic(kickOut, localToWorld(lead * 0.48, direction * laneShift * 1.42), localToWorld(lead * 1.38, direction * laneShift * 1.02), neck, 24));
          append(points, cubic(neck, localToWorld(lead * 1.38, direction * laneShift * 0.12), localToWorld(lead * 0.74, direction * laneShift), out, 24));
          return points;
      }

      const crownForward = lead + Math.max(radius * 1.25, laneShift * 0.88);
      append(points, cubic(
          entry,
          localToWorld(crownForward, 0),
          localToWorld(crownForward, direction * laneShift),
          exit,
          42
      ));
      points.push(out);
      return points;
  };

  const renderProjected3DPath = (key, points, stroke, strokeWidth = 2, options = {}) => {
      const map3DLateralGain = 0.62;
      const map3DForwardGain = 1.18;
      const projectionOptions = options.ground
          ? { lateralGain: map3DLateralGain, forwardGain: map3DForwardGain, usePerspectiveScale: true }
          : { lateralGain: map3DLateralGain, forwardGain: map3DForwardGain, usePerspectiveScale: true };
      if (options.anchoredDash) {
          const dashSegments = getWorldAnchoredDashSegments(points, options.worldDash || options.dash);
          const segmentNodes = dashSegments.map((segment, index) => {
              const projectedStart = getProjected3DPoint(segment.start, { ...projectionOptions, ...options.projection });
              const projectedEnd = getProjected3DPoint(segment.end, { ...projectionOptions, ...options.projection });
              if (!projectedStart || !projectedEnd) return null;
              return (
                  <line
                      key={`${key}-dash-${index}`}
                      data-boundary-dash-segment={key}
                      x1={projectedStart.x.toFixed(1)}
                      y1={projectedStart.y.toFixed(1)}
                      x2={projectedEnd.x.toFixed(1)}
                      y2={projectedEnd.y.toFixed(1)}
                      stroke={stroke}
                      strokeWidth={strokeWidth}
                      strokeLinecap={options.cap || 'round'}
                      strokeOpacity={options.opacity ?? 1}
                      vectorEffect="non-scaling-stroke"
                  />
              );
          }).filter(Boolean);

          if (!segmentNodes.length) return null;
          return (
              <g
                  key={key}
                  {...(options.ground ? { 'data-ground-3d-path': key } : { 'data-guidance-3d-path': key })}
                  data-anchored-dashes="true"
              >
                  {segmentNodes}
              </g>
          );
      }
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

  const clipScreenLineToRect = (anchor, dir, rect = { xMin: 0, xMax: 1000, yMin: 0, yMax: 700 }) => {
      if (!anchor || !dir) return null;
      const candidates = [];
      const pushCandidate = (t, x, y) => {
          if (!Number.isFinite(t) || !Number.isFinite(x) || !Number.isFinite(y)) return;
          if (x < rect.xMin - 0.5 || x > rect.xMax + 0.5 || y < rect.yMin - 0.5 || y > rect.yMax + 0.5) return;
          if (candidates.some((item) => Math.abs(item.x - x) < 0.5 && Math.abs(item.y - y) < 0.5)) return;
          candidates.push({ t, x, y });
      };

      if (Math.abs(dir.x) > 0.0001) {
          [rect.xMin, rect.xMax].forEach((x) => {
              const t = (x - anchor.x) / dir.x;
              pushCandidate(t, x, anchor.y + dir.y * t);
          });
      }
      if (Math.abs(dir.y) > 0.0001) {
          [rect.yMin, rect.yMax].forEach((y) => {
              const t = (y - anchor.y) / dir.y;
              pushCandidate(t, anchor.x + dir.x * t, y);
          });
      }

      if (candidates.length < 2) return null;
      candidates.sort((a, b) => a.t - b.t);
      return { start: candidates[0], end: candidates[candidates.length - 1] };
  };

  const clipScreenSegmentToRect = (start, end, rect = { xMin: 0, xMax: 1000, yMin: 0, yMax: 700 }) => {
      if (!start || !end) return null;
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      let t0 = 0;
      let t1 = 1;

      const clip = (p, q) => {
          if (Math.abs(p) < 0.000001) return q >= 0;
          const r = q / p;
          if (p < 0) {
              if (r > t1) return false;
              if (r > t0) t0 = r;
          } else {
              if (r < t0) return false;
              if (r < t1) t1 = r;
          }
          return true;
      };

      if (
          !clip(-dx, start.x - rect.xMin) ||
          !clip(dx, rect.xMax - start.x) ||
          !clip(-dy, start.y - rect.yMin) ||
          !clip(dy, rect.yMax - start.y)
      ) {
          return null;
      }

      return {
          start: {
              x: start.x + dx * t0,
              y: start.y + dy * t0
          },
          end: {
              x: start.x + dx * t1,
              y: start.y + dy * t1
          }
      };
  };

  const get3DGuidanceLocalBasis = (unit) => {
      const localDirRaw = toVehicleLocal3D(unit.x, unit.y);
      const length = Math.hypot(localDirRaw.lateral, localDirRaw.forward);
      if (length <= 0.0001) return null;

      const dir = {
          lateral: localDirRaw.lateral / length,
          forward: localDirRaw.forward / length
      };

      return {
          dir,
          normal: {
              lateral: -dir.forward,
              forward: dir.lateral
          }
      };
  };

  const render3DProjectedLaneLine = (key, base, unit, offsetPx, stroke, strokeWidth = 2, options = {}) => {
      if (!base || !unit) return null;
      const normal = { x: -unit.y, y: unit.x };
      const origin = {
          x: base.x + normal.x * (Number(offsetPx) || 0),
          y: base.y + normal.y * (Number(offsetPx) || 0)
      };
      const strokeInset = Math.max(1, strokeWidth / 2);
      const viewRect = options.rect || {
          xMin: options.minX ?? strokeInset,
          xMax: options.maxX ?? (1000 - strokeInset),
          yMin: options.minY ?? strokeInset,
          yMax: options.maxY ?? (700 - strokeInset)
      };
      const clippedWorld = clipLineToBounds(origin, unit, get3DGridBounds());
      if (!clippedWorld) return null;

      const projectionOptions = {
          lateralGain: options.lateralGain ?? 0.62,
          forwardGain: options.forwardGain ?? 1.18,
          usePerspectiveScale: true,
          lateralPerspectiveStrength: options.lateralPerspectiveStrength ?? 1,
          depth: options.depth ?? 820,
          horizonY: options.horizonY ?? 72,
          minY: -1000000,
          maxY: 1000000,
          minX: -1000000,
          maxX: 1000000,
          screenMargin: 1000000
      };
      const worldSpan = clippedWorld.end - clippedWorld.start;
      if (!Number.isFinite(worldSpan) || worldSpan <= 0.001) return null;
      const maxStep = options.maxStep ?? 80;
      const steps = Math.max(2, Math.min(260, Math.ceil(worldSpan / maxStep)));
      let path = '';
      let drawing = false;
      let lastPoint = null;

      const worldAt = (tValue) => ({
          x: origin.x + unit.x * tValue,
          y: origin.y + unit.y * tValue
      });
      const appendMoveOrLine = (point) => {
          const command = !drawing || !lastPoint || Math.hypot(point.x - lastPoint.x, point.y - lastPoint.y) > 0.75
              ? 'M'
              : 'L';
          path += `${command}${point.x.toFixed(1)},${point.y.toFixed(1)} `;
          drawing = true;
          lastPoint = point;
      };

      for (let step = 0; step < steps; step++) {
          const tA = clippedWorld.start + (worldSpan * step / steps);
          const tB = clippedWorld.start + (worldSpan * (step + 1) / steps);
          const projectedA = getProjected3DPoint(worldAt(tA), projectionOptions);
          const projectedB = getProjected3DPoint(worldAt(tB), projectionOptions);

          if (!projectedA || !projectedB) {
              drawing = false;
              lastPoint = null;
              continue;
          }

          const clippedScreen = clipScreenSegmentToRect(projectedA, projectedB, viewRect);
          if (!clippedScreen) {
              drawing = false;
              lastPoint = null;
              continue;
          }

          appendMoveOrLine(clippedScreen.start);
          path += `L${clippedScreen.end.x.toFixed(1)},${clippedScreen.end.y.toFixed(1)} `;
          lastPoint = clippedScreen.end;
      }

      if (!path.trim()) return null;

      return (
          <path
              key={key}
              data-guidance-3d-path={key}
              d={path.trim()}
              fill="none"
              stroke={stroke}
              strokeWidth={strokeWidth}
              strokeLinecap={options.cap || 'butt'}
              strokeLinejoin="round"
              strokeOpacity={options.opacity ?? 1}
              vectorEffect="non-scaling-stroke"
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

  const liveBoundaryStroke = '#f97316';
  const liveBoundaryStrokeWidth = 4;
  const liveBoundaryUnderlayWidth = 8;
  const liveBoundaryUnderlayOpacity = 0.84;
  const coverageWorldWidth = Math.max(1, Number(implementSettings.width || 3) * PIXELS_PER_METER);
  const coverageSwathColor = theme === 'dark' ? '#22c55e' : '#16a34a';
  const coverageSwathOpacity = theme === 'dark' ? 0.22 : 0.16;
  const coverageLiveColor = theme === 'dark' ? '#4ade80' : '#16a34a';
  const coverageLiveOpacity = theme === 'dark' ? 0.3 : 0.22;

  const getCoverageRenderPoints = () => {
      const points = (coverageTrail || []).filter(point => Number.isFinite(point?.x) && Number.isFinite(point?.y));
      if (!isRecording) return points;
      const last = points[points.length - 1];
      if (!last || Math.hypot(last.x - worldPos.x, last.y - worldPos.y) > 0.1) {
          return [...points, { ...worldPos, h: heading }];
      }
      return points;
  };

  const renderCoverage2D = () => {
      if (isMap3D || (!isRecording && coverageTrail.length === 0)) return null;
      const points = getCoverageRenderPoints();
      const headingRad = heading * Math.PI / 180;
      const forward = { x: Math.sin(headingRad), y: -Math.cos(headingRad) };
      const footprintHalfLength = Math.max(4, Math.min(10, coverageWorldWidth * 0.22));

      return (
          <svg data-coverage-layer="2d" className="absolute inset-0 w-full h-full overflow-visible pointer-events-none z-[2]">
              <g style={{ transform: 'translate(50%, 60%)' }}>
                  {points.length > 1 && (
                      <polyline
                          data-coverage-2d="swath"
                          points={points.map(point => `${point.x},${point.y}`).join(' ')}
                          fill="none"
                          stroke={coverageSwathColor}
                          strokeWidth={coverageWorldWidth}
                          strokeOpacity={coverageSwathOpacity}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                      />
                  )}
                  {isRecording && (
                      <line
                          data-coverage-2d="live-footprint"
                          x1={worldPos.x - forward.x * footprintHalfLength}
                          y1={worldPos.y - forward.y * footprintHalfLength}
                          x2={worldPos.x + forward.x * footprintHalfLength}
                          y2={worldPos.y + forward.y * footprintHalfLength}
                          stroke={coverageLiveColor}
                          strokeWidth={coverageWorldWidth}
                          strokeOpacity={coverageLiveOpacity}
                          strokeLinecap="round"
                      />
                  )}
              </g>
          </svg>
      );
  };

  const renderCoverage3D = () => {
      if (!isMap3D || (!isRecording && coverageTrail.length < 2)) return null;
      const points = getCoverageRenderPoints();
      const halfWidth = coverageWorldWidth / 2;
      const projectionOptions = {
          lateralGain: 0.62,
          forwardGain: 1.18,
          usePerspectiveScale: true,
          screenMargin: 260,
          minY: -180,
          maxY: 880
      };
      const projectPolygon = (corners) => {
          const projected = corners.map(corner => getProjected3DPoint(corner, projectionOptions));
          return projected.every(Boolean)
              ? projected.map(point => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ')
              : null;
      };
      const segmentNodes = [];

      const smoothCoverageCenterline = (sourcePoints) => {
          if (sourcePoints.length < 3) return sourcePoints;
          const smoothed = [];
          const subdivisions = 3;

          for (let index = 0; index < sourcePoints.length - 1; index++) {
              const p0 = sourcePoints[Math.max(0, index - 1)];
              const p1 = sourcePoints[index];
              const p2 = sourcePoints[index + 1];
              const p3 = sourcePoints[Math.min(sourcePoints.length - 1, index + 2)];

              for (let step = 0; step < subdivisions; step++) {
                  const tValue = step / subdivisions;
                  const t2 = tValue * tValue;
                  const t3 = t2 * tValue;
                  smoothed.push({
                      x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * tValue + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
                      y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * tValue + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3)
                  });
              }
          }

          smoothed.push(sourcePoints[sourcePoints.length - 1]);
          return smoothed;
      };

      const getUnitDirection = (start, end) => {
          if (!start || !end) return null;
          const dx = end.x - start.x;
          const dy = end.y - start.y;
          const length = Math.hypot(dx, dy);
          return length > 0.001 ? { x: dx / length, y: dy / length } : null;
      };

      const centerline = smoothCoverageCenterline(points);
      const ribbonSamples = centerline.map((point, index) => {
          const previousDirection = index > 0
              ? getUnitDirection(centerline[index - 1], point)
              : getUnitDirection(point, centerline[index + 1]);
          const nextDirection = index < centerline.length - 1
              ? getUnitDirection(point, centerline[index + 1])
              : getUnitDirection(centerline[index - 1], point);
          const fallbackDirection = previousDirection || nextDirection || { x: 0, y: -1 };
          const incoming = previousDirection || fallbackDirection;
          const outgoing = nextDirection || fallbackDirection;
          const incomingNormal = { x: -incoming.y, y: incoming.x };
          const outgoingNormal = { x: -outgoing.y, y: outgoing.x };
          const normalSum = {
              x: incomingNormal.x + outgoingNormal.x,
              y: incomingNormal.y + outgoingNormal.y
          };
          const normalSumLength = Math.hypot(normalSum.x, normalSum.y);
          const joinNormal = normalSumLength > 0.001
              ? { x: normalSum.x / normalSumLength, y: normalSum.y / normalSumLength }
              : outgoingNormal;
          const joinDot = Math.abs(joinNormal.x * outgoingNormal.x + joinNormal.y * outgoingNormal.y);
          const miterLength = Math.min(halfWidth * 1.7, halfWidth / Math.max(0.36, joinDot));

          return {
              left: {
                  x: point.x + joinNormal.x * miterLength,
                  y: point.y + joinNormal.y * miterLength
              },
              right: {
                  x: point.x - joinNormal.x * miterLength,
                  y: point.y - joinNormal.y * miterLength
              }
          };
      });

      const projectedRibbonChunks = [];
      let currentChunk = [];
      const flushRibbonChunk = () => {
          if (currentChunk.length > 1) projectedRibbonChunks.push(currentChunk);
          currentChunk = [];
      };

      ribbonSamples.forEach(sample => {
          const left = getProjected3DPoint(sample.left, projectionOptions);
          const right = getProjected3DPoint(sample.right, projectionOptions);
          if (!left || !right) {
              flushRibbonChunk();
              return;
          }
          currentChunk.push({ left, right });
      });
      flushRibbonChunk();

      projectedRibbonChunks.forEach((chunk, chunkIndex) => {
          const polygon = [
              ...chunk.map(sample => sample.left),
              ...chunk.slice().reverse().map(sample => sample.right)
          ].map(point => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');

          segmentNodes.push(
              <polygon
                  key={`coverage-ribbon-${chunkIndex}`}
                  data-coverage-3d-ribbon={chunkIndex}
                  points={polygon}
                  fill={coverageSwathColor}
                  fillOpacity={coverageSwathOpacity}
                  stroke="none"
                  shapeRendering="geometricPrecision"
              />
          );
      });

      if (isRecording) {
          const headingRad = heading * Math.PI / 180;
          const forward = { x: Math.sin(headingRad), y: -Math.cos(headingRad) };
          const normal = { x: Math.cos(headingRad), y: Math.sin(headingRad) };
          const halfLength = Math.max(4, Math.min(10, coverageWorldWidth * 0.22));
          const polygon = projectPolygon([
              { x: worldPos.x - forward.x * halfLength + normal.x * halfWidth, y: worldPos.y - forward.y * halfLength + normal.y * halfWidth },
              { x: worldPos.x + forward.x * halfLength + normal.x * halfWidth, y: worldPos.y + forward.y * halfLength + normal.y * halfWidth },
              { x: worldPos.x + forward.x * halfLength - normal.x * halfWidth, y: worldPos.y + forward.y * halfLength - normal.y * halfWidth },
              { x: worldPos.x - forward.x * halfLength - normal.x * halfWidth, y: worldPos.y - forward.y * halfLength - normal.y * halfWidth }
          ]);
          if (polygon) {
              segmentNodes.push(
                  <polygon
                      key="coverage-live-footprint"
                      data-coverage-3d-live="footprint"
                      points={polygon}
                      fill={coverageLiveColor}
                      fillOpacity={coverageLiveOpacity}
                      stroke="none"
                      strokeLinejoin="round"
                  />
              );
          }
      }

      return <g key="coverage-layer-3d" data-coverage-layer="3d">{segmentNodes}</g>;
  };

  const getGuidanceLaneVisual = (isActive, laneDistance = 0) => {
      if (isActive) {
          return {
              stroke: theme === 'dark' ? '#a78bfa' : '#7c3aed',
              width: 3.4,
              opacity: 1
          };
      }

      return {
          stroke: theme === 'dark' ? '#38bdf8' : '#60a5fa',
          width: laneDistance <= 1 ? 1.35 : 1.05,
          opacity: laneDistance <= 1 ? 0.55 : laneDistance <= 3 ? 0.4 : 0.3
      };
  };

  const renderGuidanceLine3D = () => {
      if (!isMap3D) return null;

      const elements = [];
      elements.push(renderCoverage3D());
      const guide = guidanceRef.current;
      const activeGuidanceType = guidanceLine || guide?.type || activeLineRecord?.type || lineType;
      const metrics = getGuidanceMetrics(guide, { ...worldPos, heading });
      const currentLaneIndex = metrics.validLine && guide?.width > 0 ? Math.round(metrics.xte / guide.width) : 0;
      const highlightedLane = activeLaneRef.current ?? manualLaneRef.current ?? currentLaneIndex;
      const activeStroke = getGuidanceLaneVisual(true).stroke;
      const corridorEdge = theme === 'dark' ? '#67e8f9' : '#0ea5e9';
      const previewStroke = theme === 'dark' ? '#fb7185' : '#ef4444';
      const boundaryStroke = theme === 'dark' ? '#94a3b8' : '#64748b';
      const guidanceProjection = {
          lateralGain: 0.62,
          forwardGain: 1.18,
          usePerspectiveScale: true,
          lateralPerspectiveStrength: 1
      };
      const render3DPointMarker = (key, point, label, fill = '#2563eb') => {
          const projected = getProjected3DPoint(point, {
              ...guidanceProjection,
              minX: -80,
              maxX: 1080,
              minY: -80,
              maxY: 780
          });
          if (!projected) return null;
          const radius = Math.max(7, Math.min(12, 9 * (projected.perspective || 1)));
          return (
              <g key={key} data-guidance-3d-marker={key} transform={`translate(${projected.x.toFixed(1)} ${projected.y.toFixed(1)})`}>
                  <circle r={radius + 4} fill={theme === 'dark' ? 'rgba(15,23,42,0.76)' : 'rgba(255,255,255,0.82)'} />
                  <circle r={radius} fill={fill} stroke="white" strokeWidth="2" />
                  <text x="0" y="3.4" textAnchor="middle" fontSize="10" fontWeight="900" fill="white">{label}</text>
              </g>
          );
      };
      const getABMarkers = () => [
          pointA ? render3DPointMarker('ab-point-a', pointA, 'A', '#2563eb') : null,
          pointB ? render3DPointMarker('ab-point-b', pointB, 'B', '#f97316') : null
      ].filter(Boolean);

      const boundaries = (loadedField?.boundaries || []).concat(viewMode === 'CREATE_FIELD' ? currentFieldBoundaries : []);
      boundaries.forEach((bound, bIdx) => {
          const pts = (bound.points || bound || []).filter(Boolean);
          if (pts.length > 1) {
              elements.push(renderProjected3DPath(
                  `boundary-${bIdx}`,
                  [...pts, pts[0]],
                  bIdx === activeBoundaryIdx ? '#eab308' : boundaryStroke,
                  bIdx === activeBoundaryIdx ? 2.8 : 2,
                  {
                      anchoredDash: true,
                      worldDash: [48, 34],
                      opacity: bIdx === activeBoundaryIdx ? 0.9 : 0.55,
                      projection: { screenMargin: 96 }
                  }
              ));
          }
      });

      if (previewBoundary?.length > 1) {
          elements.push(renderProjected3DPath('preview-boundary', [...previewBoundary, previewBoundary[0]], '#22c55e', 3, {
              anchoredDash: true,
              worldDash: [48, 34],
              opacity: 0.9,
              projection: { screenMargin: 96 }
          }));
      }

      if (isRecordingBoundary && tempBoundary.length > 0) {
          const liveBoundaryPath = [...tempBoundary, worldPos];
          if (liveBoundaryPath.length > 1) {
              elements.push(renderProjected3DPath(
                  'boundary-recording-underlay',
                  liveBoundaryPath,
                  theme === 'dark' ? '#0f172a' : '#ffffff',
                  liveBoundaryUnderlayWidth,
                  { opacity: liveBoundaryUnderlayOpacity, maxStep: 18, solid: true, projection: { screenMargin: 96 } }
              ));
              elements.push(renderProjected3DPath(
                  'boundary-recording',
                  liveBoundaryPath,
                  liveBoundaryStroke,
                  liveBoundaryStrokeWidth,
                  { opacity: 1, maxStep: 18, solid: true, projection: { screenMargin: 96 } }
              ));
          }
          elements.push(render3DPointMarker('boundary-recording-start', tempBoundary[0], 'S', liveBoundaryStroke));
      }

      if (!guidanceLine && !activeLineRecord && pointA && straightABPreviewEnd && lineType === 'STRAIGHT_AB') {
          elements.push(renderProjected3DPath('straight-preview', [pointA, straightABPreviewEnd], previewStroke, 3, { dash: '12 9', projection: guidanceProjection }));
      }

      if (isRecordingCurve && curvePoints.length > 0) {
          elements.push(renderProjected3DPath('curve-recording', [...curvePoints, worldPos], previewStroke, 3));
      }

      if (!guidanceLine && pivotCenter && lineType === 'PIVOT') {
          elements.push(renderProjected3DPath('pivot-radius-preview', [pivotCenter, worldPos], previewStroke, 3, { dash: '12 9' }));
      }

      const uTurnPathPoints3D = getUTurnPathPoints();
      if (uTurnPathPoints3D.length > 1) {
          const uTurnStroke = theme === 'dark' ? '#fbbf24' : '#f97316';
          elements.push(renderProjected3DPath(
              'uturn-3d-path-underlay',
              uTurnPathPoints3D,
              theme === 'dark' ? '#020617' : '#ffffff',
              7.5,
              { opacity: theme === 'dark' ? 0.76 : 0.92, maxStep: 16, projection: guidanceProjection, solid: true }
          ));
          elements.push(renderProjected3DPath(
              'uturn-3d-path',
              uTurnPathPoints3D,
              uTurnStroke,
              turnAssistActive ? 4.6 : 4,
              { opacity: turnAssistActive ? 1 : 0.9, maxStep: 16, projection: guidanceProjection, solid: true }
          ));
          elements.push(render3DPointMarker('uturn-3d-exit', uTurnPathPoints3D[uTurnPathPoints3D.length - 1], 'T', uTurnStroke));
      }

      if (!showGuidanceLines) return [...elements, ...getABMarkers()].filter(Boolean);

      if (activeGuidanceType === 'STRAIGHT_AB' && pointA && pointB) {
          const dx = pointB.x - pointA.x;
          const dy = pointB.y - pointA.y;
          const length = Math.hypot(dx, dy);
          if (length <= 0.001) return elements;
          const unit = { x: dx / length, y: dy / length };

          if (isMultiLineMode) {
              const width = Math.max(1, implementSettings.width * PIXELS_PER_METER);
              const laneSpacingPx = width;
              for (let i = highlightedLane - 4; i <= highlightedLane + 4; i++) {
                  const active = i === highlightedLane;
                  const visual = getGuidanceLaneVisual(active, Math.abs(i - highlightedLane));
                  elements.push(render3DProjectedLaneLine(
                      `straight-3d-${i}`,
                      pointA,
                      unit,
                      (i * laneSpacingPx) + manualOffset,
                      visual.stroke,
                      visual.width,
                      { opacity: visual.opacity }
                  ));
              }
          } else {
              elements.push(render3DProjectedLaneLine(
                  'straight-3d-target',
                  pointA,
                  unit,
                  manualOffset,
                  activeStroke,
                  3.4,
                  {}
              ));
          }
      }

      if ((guidanceLine === 'A_PLUS' || (lineType === 'A_PLUS' && !guidanceLine)) && aPlusPoint && aPlusHeading !== null && aPlusHeading !== undefined) {
          const rad = aPlusHeading * Math.PI / 180;
          const unit = { x: Math.sin(rad), y: -Math.cos(rad) };
          const isPreview = !guidanceLine;

          if (isPreview) {
              elements.push(renderProjected3DPath('aplus-preview', sampleGuidanceLinePoints(aPlusPoint, unit, 0), previewStroke, 3, { dash: '12 9', projection: guidanceProjection }));
          } else if (isMultiLineMode) {
              const width = Math.max(1, implementSettings.width * PIXELS_PER_METER);
              const laneSpacingPx = width;
              for (let i = highlightedLane - 4; i <= highlightedLane + 4; i++) {
                  const active = i === highlightedLane;
                  const visual = getGuidanceLaneVisual(active, Math.abs(i - highlightedLane));
                  elements.push(render3DProjectedLaneLine(
                      `aplus-3d-${i}`,
                      aPlusPoint,
                      unit,
                      (i * laneSpacingPx) + manualOffset,
                      visual.stroke,
                      visual.width,
                      { opacity: visual.opacity }
                  ));
              }
          } else {
              elements.push(render3DProjectedLaneLine('aplus-3d-target', aPlusPoint, unit, manualOffset, activeStroke, 3.4, {}));
          }
      }

      if (guidanceLine === 'PIVOT' && pivotCenter && pivotRadius) {
          if (isMultiLineMode) {
              const width = implementSettings.width * PIXELS_PER_METER;
              for (let i = highlightedLane - 2; i <= highlightedLane + 2; i++) {
                  const radius = pivotRadius + (i * width) + manualOffset;
                  if (radius <= 0) continue;
                  const active = i === highlightedLane;
                  const visual = getGuidanceLaneVisual(active, Math.abs(i - highlightedLane));
                  elements.push(renderProjected3DPath(
                      `pivot-3d-${i}`,
                      sampleCirclePoints(pivotCenter, radius),
                      visual.stroke,
                      visual.width,
                      { opacity: visual.opacity, maxStep: 34, projection: guidanceProjection }
                  ));
              }
          } else {
              const radius = pivotRadius + manualOffset;
              if (radius > 0) {
                  elements.push(renderProjected3DPath('pivot-3d-target', sampleCirclePoints(pivotCenter, radius), activeStroke, 3.4, { maxStep: 34, projection: guidanceProjection }));
              }
          }
      }

      if ((guidanceLine === 'CURVE' || guidanceLine === 'COMBINATION') && curvePoints.length > 1) {
          if (isMultiLineMode) {
              const width = implementSettings.width * PIXELS_PER_METER;
              for (let i = highlightedLane - 2; i <= highlightedLane + 2; i++) {
                  const active = i === highlightedLane;
                  const visual = getGuidanceLaneVisual(active, Math.abs(i - highlightedLane));
                  const points = parsePolylinePoints(getOffsetPolyline(curvePoints, (i * width) + manualOffset));
                  elements.push(renderProjected3DPath(
                      `curve-3d-${i}`,
                      points,
                      visual.stroke,
                      visual.width,
                      { opacity: visual.opacity, maxStep: 34, projection: guidanceProjection }
                  ));
              }
          } else {
              elements.push(renderProjected3DPath(
                  'curve-3d-target',
                  parsePolylinePoints(getOffsetPolyline(curvePoints, manualOffset)),
                  activeStroke,
                  3.4,
                  { maxStep: 34, projection: guidanceProjection }
              ));
          }
      }

      return [...elements, ...getABMarkers()].filter(Boolean);
  };

  const renderUTurnPath2D = () => {
      if (isMap3D) return null;
      const points = getUTurnPathPoints();
      if (points.length < 2) return null;
      const stroke = theme === 'dark' ? '#fbbf24' : '#f97316';
      const exitPoint = points[points.length - 1];
      const pointString = points.map((p) => `${p.x},${p.y}`).join(' ');

      return (
          <g data-guidance-2d-uturn="path">
              <polyline
                  points={pointString}
                  fill="none"
                  stroke={theme === 'dark' ? '#020617' : '#ffffff'}
                  strokeWidth={turnAssistActive ? 8 : 7}
                  strokeOpacity={theme === 'dark' ? 0.78 : 0.94}
                  strokeLinecap="round"
                  strokeLinejoin="round"
              />
              <polyline
                  points={pointString}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={turnAssistActive ? 4.8 : 4}
                  strokeOpacity={turnAssistActive ? 1 : 0.9}
                  strokeLinecap="round"
                  strokeLinejoin="round"
              />
              <circle
                  cx={exitPoint.x}
                  cy={exitPoint.y}
                  r="9"
                  fill={stroke}
                  stroke="white"
                  strokeWidth="3"
              />
          </g>
      );
  };

  const renderGuidanceLine = () => {
    // Check if lines should be shown
    if (isMap3D) return null;
    if (!showGuidanceLines) return null;

    // 1. Current Active Line from Logic
    let currentLaneIndex = 0;
    const activeGuidanceType = guidanceLine || guidanceRef.current?.type || activeLineRecord?.type || lineType;

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


    if (activeGuidanceType === 'STRAIGHT_AB' && pointA && pointB) {
      const dx = pointB.x - pointA.x; const dy = pointB.y - pointA.y; const length = Math.sqrt(dx*dx + dy*dy); const ux = dx / length; const uy = dy / length;

      const elements = [];

      if (isMultiLineMode) {
          const w = implementSettings.width * PIXELS_PER_METER;
          const highlightedLane = activeLaneRef.current ?? manualLaneRef.current ?? currentLaneIndex;

          for (let i = highlightedLane - 4; i <= highlightedLane + 4; i++) {
              const offset = (w * i) + manualOffset;
              const isActive = i === highlightedLane;
              const laneDistance = Math.abs(i - highlightedLane);
              const visual = getGuidanceLaneVisual(isActive, laneDistance);
              const segment = getGuidanceLineSegmentAroundVehicle(pointA, { x: ux, y: uy }, offset);

              elements.push(
                <line
                    key={`line-${i}`}
                    data-guidance-2d-lane={i}
                    x1={segment.start.x} y1={segment.start.y}
                    x2={segment.end.x} y2={segment.end.y}
                    stroke={visual.stroke}
                    strokeWidth={visual.width}
                    strokeOpacity={visual.opacity}
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
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
                   data-guidance-2d-lane="target"
                   x1={segment.start.x} y1={segment.start.y}
                   x2={segment.end.x} y2={segment.end.y}
                   stroke={getGuidanceLaneVisual(true).stroke}
                   strokeWidth={getGuidanceLaneVisual(true).width}
                   strokeLinecap="round"
                   vectorEffect="non-scaling-stroke"
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
             elements.push(<line key="preview" x1={segment.start.x} y1={segment.start.y} x2={segment.end.x} y2={segment.end.y} stroke="red" strokeWidth="2" strokeDasharray="15, 10" strokeLinecap="round" />);
        } else {
             if (isMultiLineMode) {
                const w = implementSettings.width * PIXELS_PER_METER;
                const highlightedLane = activeLaneRef.current ?? manualLaneRef.current ?? currentLaneIndex;

                for (let i = highlightedLane - 4; i <= highlightedLane + 4; i++) {
                    const offset = (w * i) + manualOffset;
                    const isActive = i === highlightedLane;
                    const laneDistance = Math.abs(i - highlightedLane);
                    const visual = getGuidanceLaneVisual(isActive, laneDistance);
                    const segment = getGuidanceLineSegmentAroundVehicle(aPlusPoint, { x: ux, y: uy }, offset);

                    elements.push(
                        <line
                            key={`line-${i}`}
                            data-guidance-2d-lane={i}
                            x1={segment.start.x} y1={segment.start.y}
                            x2={segment.end.x} y2={segment.end.y}
                            stroke={visual.stroke}
                            strokeWidth={visual.width}
                            strokeOpacity={visual.opacity}
                            strokeLinecap="round"
                            vectorEffect="non-scaling-stroke"
                        />
                    );
                }
             } else {
                const offset = manualOffset;
                const segment = getGuidanceLineSegmentAroundVehicle(aPlusPoint, { x: ux, y: uy }, offset);
                elements.push(
                   <line
                       key="target-line"
                       data-guidance-2d-lane="target"
                       x1={segment.start.x} y1={segment.start.y}
                       x2={segment.end.x} y2={segment.end.y}
                       stroke={getGuidanceLaneVisual(true).stroke}
                       strokeWidth={getGuidanceLaneVisual(true).width}
                       strokeLinecap="round"
                       vectorEffect="non-scaling-stroke"
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
            const highlightedLane = activeLaneRef.current ?? manualLaneRef.current ?? currentLaneIndex;

            // Draw 5 lines (center + 2 each side)
            for (let i = highlightedLane - 2; i <= highlightedLane + 2; i++) {
                const r = pivotRadius + (i * w) + manualOffset;
                if (r > 0) {
                    const isActive = i === highlightedLane;
                    const laneDistance = Math.abs(i - highlightedLane);
                    const visual = getGuidanceLaneVisual(isActive, laneDistance);
                    elements.push(
                        <circle
                            key={`pivot-${i}`}
                            data-guidance-2d-lane={i}
                            cx={pivotCenter.x} cy={pivotCenter.y} r={r}
                            fill="none"
                            stroke={visual.stroke}
                            strokeWidth={visual.width}
                            strokeOpacity={visual.opacity}
                            vectorEffect="non-scaling-stroke"
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
                        data-guidance-2d-lane="target"
                        cx={pivotCenter.x} cy={pivotCenter.y} r={r}
                        fill="none"
                        stroke={getGuidanceLaneVisual(true).stroke}
                        strokeWidth={getGuidanceLaneVisual(true).width}
                        strokeLinecap="round"
                        vectorEffect="non-scaling-stroke"
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
            const highlightedLane = activeLaneRef.current ?? manualLaneRef.current ?? currentLaneIndex;

            // Draw 5 lines (center + 2 each side)
            for (let i = highlightedLane - 2; i <= highlightedLane + 2; i++) {
                const offset = (i * w) + manualOffset;
                const isActive = i === highlightedLane;
                const laneDistance = Math.abs(i - highlightedLane);
                const visual = getGuidanceLaneVisual(isActive, laneDistance);
                const curvePointsText = getOffsetPolyline(curvePoints, offset);

                elements.push(
                    <polyline
                        key={`curve-${i}`}
                        data-guidance-2d-lane={i}
                        points={curvePointsText}
                        fill="none"
                        stroke={visual.stroke}
                        strokeWidth={visual.width}
                        strokeOpacity={visual.opacity}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                    />
                );
            }
        } else {
            // Single Mode
            elements.push(
                <polyline
                    key="target-curve"
                    data-guidance-2d-lane="target"
                    points={getOffsetPolyline(curvePoints, manualOffset)}
                    fill="none"
                    stroke={getGuidanceLaneVisual(true).stroke}
                    strokeWidth={getGuidanceLaneVisual(true).width}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                />
            );
        }
        return elements;
    }

    return null;
  };

  const renderActionDock = () => {
      const isDarkDock = theme === 'dark';
      const dockSurface = isDarkDock
          ? 'bg-slate-950/90 border-slate-700/90 shadow-black/40'
          : 'bg-white/90 border-slate-200 shadow-slate-900/15';
      const drawerSurface = isDarkDock
          ? 'bg-slate-950/95 border-slate-700 shadow-black/40'
          : 'bg-white/95 border-slate-200 shadow-slate-900/20';
      const solidTone = {
          blue: 'bg-blue-600 text-white shadow-md shadow-blue-900/20 hover:bg-blue-500',
          green: 'bg-green-600 text-white shadow-md shadow-green-900/20 hover:bg-green-500',
          orange: 'bg-orange-500 text-white shadow-md shadow-orange-900/20 hover:bg-orange-400',
          red: 'bg-red-500 text-white shadow-md shadow-red-900/20 hover:bg-red-400',
          gray: isDarkDock ? 'bg-slate-800 text-slate-100 hover:bg-slate-700' : 'bg-slate-800 text-white hover:bg-slate-700'
      };
      const ghostTone = {
          blue: isDarkDock ? 'text-blue-300 hover:bg-blue-500/10' : 'text-blue-700 hover:bg-blue-500/10',
          green: isDarkDock ? 'text-green-300 hover:bg-green-500/10' : 'text-green-700 hover:bg-green-500/10',
          orange: isDarkDock ? 'text-orange-300 hover:bg-orange-500/10' : 'text-orange-700 hover:bg-orange-500/10',
          red: isDarkDock ? 'text-red-300 hover:bg-red-500/10' : 'text-red-700 hover:bg-red-500/10',
          gray: `${t.textDim} hover:bg-blue-500/5`
      };
      const statusTone = {
          blue: isDarkDock ? 'text-blue-300' : 'text-blue-700',
          green: isDarkDock ? 'text-green-300' : 'text-green-700',
          orange: isDarkDock ? 'text-orange-300' : 'text-orange-700',
          red: isDarkDock ? 'text-red-300' : 'text-red-700',
          gray: t.textDim
      };
      const dotTone = {
          blue: 'bg-blue-500',
          green: 'bg-green-500',
          orange: 'bg-orange-500',
          red: 'bg-red-500',
          gray: isDarkDock ? 'bg-slate-500' : 'bg-slate-400'
      };
      const stopDockPointer = (event) => event.stopPropagation();
      const runDockAction = (handler) => (event) => {
          event.preventDefault();
          event.stopPropagation();
          handler?.(event);
      };
      const renderShell = ({ status, tone = 'gray', children }) => (
          <section
              aria-label={`${status} contextual controls`}
              className={`pointer-events-auto w-[140px] xl:w-[148px] max-h-full overflow-y-auto rounded-l-2xl border-y border-l ${dockSurface} backdrop-blur-xl p-2 flex flex-col items-center gap-2 select-none shadow-xl`}
              onPointerDown={stopDockPointer}
              onPointerMove={stopDockPointer}
              onPointerUp={stopDockPointer}
              onClick={stopDockPointer}
          >
              <div className={`w-full h-7 flex items-center justify-start gap-1.5 px-1 text-[10px] font-black uppercase tracking-wide ${statusTone[tone] || statusTone.gray}`}>
                  <span className={`w-2 h-2 rounded-full ${dotTone[tone] || dotTone.gray}`} />
                  <span className="truncate">{status}</span>
              </div>
              {children}
          </section>
      );
      const renderMainButton = ({ icon: Icon, label, sub, color = 'blue', onClick, pulse = false }) => (
          <button
              type="button"
              onPointerDown={stopDockPointer}
              onPointerUp={stopDockPointer}
              onClick={runDockAction(onClick)}
              title={sub ? `${label}: ${sub}` : label}
              aria-label={sub ? `${label}: ${sub}` : label}
              className={`w-full min-h-[78px] rounded-xl ${solidTone[color] || solidTone.gray} flex flex-col items-center justify-center gap-1 px-2 active:scale-[0.98] transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/50 touch-manipulation ${pulse ? 'ring-2 ring-white/50' : ''}`}
          >
              <Icon className="w-6 h-6 shrink-0" />
              <span className="max-w-full px-1 text-[12px] font-black leading-none truncate">{label}</span>
              {sub && <span className="max-w-full px-1 text-[10px] font-bold leading-none opacity-80 truncate">{sub}</span>}
          </button>
      );
      const renderTinyButton = ({ icon: Icon, label, color = 'gray', onClick, hidden = false, active = false, disabled = false, ariaExpanded, ariaPressed }) => {
          if (hidden) return null;
          return (
              <button
                  type="button"
                  onPointerDown={stopDockPointer}
                  onPointerUp={stopDockPointer}
                  onClick={disabled ? undefined : runDockAction(onClick)}
                  title={label}
                  aria-label={label}
                  aria-expanded={ariaExpanded}
                  aria-pressed={ariaPressed}
                  disabled={disabled}
                  className={`w-full min-h-[50px] rounded-xl ${active ? (isDarkDock ? 'bg-blue-500/20 border-blue-400/50' : 'bg-blue-50 border-blue-400') : (isDarkDock ? 'bg-slate-900/60' : 'bg-white/70')} ${ghostTone[color] || ghostTone.gray} border ${active ? '' : t.borderCard} flex items-center justify-start gap-2 px-2 active:scale-[0.98] transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/40 touch-manipulation disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="min-w-0 text-left text-[11px] xl:text-xs font-black leading-none truncate">{label}</span>
              </button>
          );
      };
      const renderGrid = (children) => <div className="w-full flex flex-col items-center gap-1.5">{children}</div>;
      const renderDivider = () => <div className={`h-px w-2/3 ${t.divider}`} />;
      const renderStepLine = (steps) => (
          <div className={`w-full min-h-7 rounded-lg ${isDarkDock ? 'bg-slate-900/75' : 'bg-slate-100'} flex items-center justify-center gap-2 px-1`}>
              {steps.map((step, index) => (
                  <div key={`${step.label}-${index}`} className={`flex items-center gap-1 text-[9px] font-black uppercase ${step.done ? 'text-blue-500' : t.textSub}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${step.done ? 'bg-blue-500' : isDarkDock ? 'bg-slate-700' : 'bg-slate-300'}`} />
                      {step.label}
                  </div>
              ))}
          </div>
      );
      const compactStatus = (value) => String(value || '').replace(/_/g, ' ');
      const offsetCm = manualOffset / PIXELS_PER_METER * 100;
      const activeGuideName = activeLineRecord?.name || (hasGuidanceToEngage ? compactStatus(guidanceLine || lineType) : 'No guidance line');
      const guidanceBadge = autosteerReady
          ? { label: 'READY', className: 'bg-blue-600 text-white' }
          : currentRunStatus.overrideDetected
              ? { label: 'OVERRIDE', className: 'bg-orange-500 text-white' }
              : rtkStatus !== 'FIX'
              ? { label: rtkStatus, className: 'bg-orange-500 text-white' }
                  : { label: 'BLOCKED', className: 'bg-orange-500 text-white' };
      const toggleDockPanel = (panel) => {
          setRtkQualityOpen(false);
          setEventHistoryOpen(false);
          setProductivityOpen(false);
          setUTurnPanelOpen(false);
          setDockMenuOpen(open => open === panel ? false : panel);
      };
      const openUTurnSetup = () => {
          setDockMenuOpen(false);
          setUTurnPanelOpen(true);
      };
      const openLinesLibrary = () => openLinesCatalog();
      const openLineTypePicker = () => {
          setDockMenuOpen(false);
          setLinesPanelOpen(false);
          setFieldManagerOpen(false);
          setUTurnPanelOpen(false);
          setLineModeModalOpen(true);
      };
      const drawerTone = {
          blue: isDarkDock ? 'border-blue-500/30 bg-blue-500/10 text-blue-300' : 'border-blue-200 bg-blue-50 text-blue-700',
          orange: isDarkDock ? 'border-orange-500/30 bg-orange-500/10 text-orange-300' : 'border-orange-200 bg-orange-50 text-orange-700',
          gray: isDarkDock ? 'border-slate-700 bg-slate-900/70 text-slate-200' : 'border-slate-200 bg-slate-50 text-slate-800'
      };
      const railDivider = isDarkDock ? 'border-slate-800' : 'border-slate-200';
      const renderDrawerShell = ({ icon: Icon, title, subtitle, children }) => (
          <section
              className={`pointer-events-auto w-[272px] xl:w-[320px] max-h-full overflow-y-auto rounded-2xl border ${drawerSurface} backdrop-blur-xl shadow-2xl`}
              onPointerDown={stopDockPointer}
              onPointerMove={stopDockPointer}
              onPointerUp={stopDockPointer}
              onClick={stopDockPointer}
          >
              <div className={`sticky top-0 z-10 px-4 py-3 border-b ${t.divider} ${isDarkDock ? 'bg-slate-950/95' : 'bg-white/95'} backdrop-blur-xl flex items-center gap-3`}>
                  <div className={`w-10 h-10 rounded-xl ${isDarkDock ? 'bg-blue-500/15 text-blue-300' : 'bg-blue-50 text-blue-600'} flex items-center justify-center`}>
                      <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                      <div className={`text-sm font-black ${t.textMain}`}>{title}</div>
                      <div className={`text-xs ${t.textSub} truncate`}>{subtitle}</div>
                  </div>
                  <button type="button" aria-label={`Close ${title}`} onClick={runDockAction(() => setDockMenuOpen(false))} className={`w-9 h-9 rounded-lg border ${t.borderCard} ${t.textMain} flex items-center justify-center hover:brightness-95`}>
                      <X className="w-4 h-4" />
                  </button>
              </div>
              <div className="p-4 space-y-3">{children}</div>
          </section>
      );
      const renderDrawerAction = ({ icon: Icon, label, detail, onClick, tone = 'gray' }) => (
          <button
              type="button"
              onClick={runDockAction(onClick)}
              className={`w-full min-h-[58px] rounded-xl border ${drawerTone[tone] || drawerTone.gray} px-3 py-2.5 flex items-center gap-3 text-left active:scale-[0.99] transition focus:outline-none focus:ring-2 focus:ring-blue-500/40`}
          >
              <Icon className="w-5 h-5 shrink-0" />
              <div className="min-w-0">
                  <div className="text-[13px] font-black leading-tight">{label}</div>
                  {detail && <div className={`mt-0.5 text-[11px] leading-tight ${t.textSub}`}>{detail}</div>}
              </div>
          </button>
      );
      const renderNudgeControls = () => (
          <div className={`rounded-xl border ${t.borderCard} ${isDarkDock ? 'bg-slate-900/60' : 'bg-slate-50'} p-3`}>
              <div className="flex items-center justify-between gap-3 mb-3">
                  <div>
                      <div className={`text-[11px] font-black uppercase ${t.textSub}`}>Guidance offset</div>
                      <div className={`text-lg font-black ${Math.abs(offsetCm) > 0.05 ? 'text-blue-500' : t.textMain}`}>{offsetCm.toFixed(1)} cm</div>
                  </div>
                  <button type="button" onClick={runDockAction(() => actions.setManualOffset(0))} className={`h-9 px-3 rounded-lg border ${t.borderCard} ${t.textMain} text-xs font-black`}>Reset</button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={runDockAction(() => handleTrim('left'))} className={`h-14 rounded-xl border ${t.borderCard} ${t.textMain} font-black flex items-center justify-center gap-2 hover:bg-blue-500/10`}>
                      <CornerUpLeft className="w-5 h-5 text-blue-500" /> -1 cm
                  </button>
                  <button type="button" onClick={runDockAction(() => handleTrim('right'))} className={`h-14 rounded-xl border ${t.borderCard} ${t.textMain} font-black flex items-center justify-center gap-2 hover:bg-blue-500/10`}>
                      +1 cm <CornerUpRight className="w-5 h-5 text-blue-500" />
                  </button>
              </div>
          </div>
      );
      const renderLinePanel = () => renderDrawerShell({
          icon: Route,
          title: 'Guidance Line',
          subtitle: activeGuideName,
          children: (
              <>
                  <div className={`rounded-xl border ${hasGuidanceToEngage ? drawerTone.blue : drawerTone.gray} p-3`}>
                      <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                              <div className="text-[11px] font-black uppercase opacity-75">{hasGuidanceToEngage ? 'Current line' : 'Guidance required'}</div>
                              <div className="mt-1 text-base font-black truncate">{activeGuideName}</div>
                              <div className="mt-1 text-xs font-bold opacity-75">{hasGuidanceToEngage ? `${compactStatus(lineType)} / ${isMultiLineMode ? 'Parallel passes' : 'Single line'}` : 'Select a saved line or create a new one'}</div>
                          </div>
                          {hasGuidanceToEngage && <span className={`shrink-0 px-2 py-1 rounded-lg text-[10px] font-black ${guidanceBadge.className}`}>{guidanceBadge.label}</span>}
                      </div>
                  </div>
                  {hasGuidanceToEngage ? (
                      <div className="grid grid-cols-2 gap-2">
                          {renderDrawerAction({ icon: ArrowLeftRight, label: 'Adjust Offset', detail: `${offsetCm.toFixed(1)} cm`, onClick: () => toggleDockPanel('nudge') })}
                          {renderDrawerAction({ icon: MoreHorizontal, label: 'Run Tools', detail: 'Map and setup', onClick: () => toggleDockPanel('tools') })}
                      </div>
                  ) : renderDrawerAction({ icon: MoreHorizontal, label: 'Run Tools', detail: 'Map visibility, zoom and setup', onClick: () => toggleDockPanel('tools') })}
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">
                      {renderDrawerAction({ icon: FolderOpen, label: 'Line Library', detail: 'Load saved guidance', onClick: openLinesLibrary })}
                      {renderDrawerAction({ icon: GitCommitHorizontal, label: 'New Line', detail: 'Choose line type', tone: 'blue', onClick: openLineTypePicker })}
                  </div>
                  {renderDrawerAction({ icon: Route, label: 'Create Straight AB', detail: 'Set point A, drive, then set point B', tone: 'blue', onClick: startStraightABCreation })}
                  {!activeLineId && hasGuidanceToEngage && renderDrawerAction({ icon: Save, label: 'Save Current Line', detail: 'Store this guidance line in the active field', onClick: openSaveLineModal })}
              </>
          )
      });
      const renderNudgePanel = () => renderDrawerShell({
          icon: ArrowLeftRight,
          title: 'Nudge Guidance',
          subtitle: activeGuideName,
          children: (
              <>
                  <div className={`rounded-xl border ${drawerTone.blue} p-3`}>
                      <div className="text-[11px] font-black uppercase opacity-75">Active guidance</div>
                      <div className="mt-1 text-base font-black truncate">{activeGuideName}</div>
                      <div className="mt-1 text-xs font-bold opacity-75">Move the active pass without changing the saved line</div>
                  </div>
                  {renderNudgeControls()}
              </>
          )
      });
      const renderToolsPanel = () => renderDrawerShell({
          icon: MoreHorizontal,
          title: 'Map & Run Tools',
          subtitle: 'Secondary controls stay out of the main canvas',
          children: (
                  <>
                  <div className={`text-[11px] font-black uppercase ${t.textSub}`}>Map presentation</div>
                  {renderDrawerAction({ icon: showGuidanceLines ? EyeOff : Eye, label: showGuidanceLines ? 'Hide Lines' : 'Show Lines', onClick: () => actions.setShowGuidanceLines(!showGuidanceLines) })}
                  <div className={`rounded-xl border ${t.borderCard} ${isDarkDock ? 'bg-slate-900/60' : 'bg-slate-50'} p-3`}>
                      <div className="mb-2.5 flex items-center justify-between gap-3">
                          <div>
                              <div className={`text-[11px] font-black uppercase ${t.textSub}`}>Map scale</div>
                              <div className={`mt-0.5 text-xs font-bold ${t.textMain}`}>{isMap3D ? 'Perspective view' : 'Top-down view'}</div>
                          </div>
                          <span className="rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-black text-white">
                              {Math.round(zoomLevel / DEFAULT_MAP_ZOOM * 100)}%
                          </span>
                      </div>
                      <div className="grid grid-cols-[1fr_1.35fr_1fr] gap-2">
                          <button
                              type="button"
                              aria-label="Zoom Out"
                              disabled={zoomLevel <= MIN_MAP_ZOOM}
                              onClick={runDockAction(() => handleZoom('out'))}
                              className={`h-11 rounded-lg border ${t.borderCard} ${t.textMain} flex items-center justify-center disabled:opacity-35 disabled:cursor-not-allowed hover:bg-blue-500/10`}
                          >
                              <Minus className="h-5 w-5" />
                          </button>
                          <button
                              type="button"
                              aria-label="Reset Zoom"
                              onClick={runDockAction(() => handleZoom('reset'))}
                              className={`h-11 rounded-lg border ${t.borderCard} ${t.textMain} text-[11px] font-black hover:bg-blue-500/10`}
                          >
                              RESET
                          </button>
                          <button
                              type="button"
                              aria-label="Zoom In"
                              disabled={zoomLevel >= MAX_MAP_ZOOM}
                              onClick={runDockAction(() => handleZoom('in'))}
                              className={`h-11 rounded-lg border ${t.borderCard} ${t.textMain} flex items-center justify-center disabled:opacity-35 disabled:cursor-not-allowed hover:bg-blue-500/10`}
                          >
                              <Plus className="h-5 w-5" />
                          </button>
                      </div>
                  </div>
                  {renderDrawerAction({ icon: Crosshair, label: 'Center Vehicle', detail: 'Return the map to the live vehicle position', onClick: handleRecenter })}
                  <div className={`pt-1 text-[11px] font-black uppercase ${t.textSub}`}>Run setup</div>
                  <div className="grid grid-cols-2 gap-2">
                      {renderDrawerAction({ icon: MapPin, label: 'Record Boundary', detail: 'Drive the field edge', tone: 'orange', onClick: startBoundaryCreation })}
                      {renderDrawerAction({ icon: Settings, label: 'U-Turn Plan', detail: 'Pattern and next pass', onClick: openUTurnSetup })}
                  </div>
              </>
          )
      });
      const renderActionRail = () => {
          const offsetLabel = `${offsetCm > 0 ? '+' : ''}${offsetCm.toFixed(0)} cm`;
          const railItems = [
              {
                  id: 'line',
                  icon: Route,
                  label: 'Guidance',
                  detail: hasGuidanceToEngage ? activeGuideName : 'Create / load',
                  disabled: false
              },
              {
                  id: 'nudge',
                  icon: ArrowLeftRight,
                  label: 'Nudge',
                  detail: hasGuidanceToEngage ? offsetLabel : 'No line',
                  disabled: !hasGuidanceToEngage
              },
              {
                  id: 'tools',
                  icon: MapIcon,
                  label: 'Map',
                  detail: 'View / setup',
                  disabled: false
              }
          ];

          return (
              <section
                  aria-label="Run action dock"
                  className={`pointer-events-auto w-[184px] xl:w-[196px] rounded-l-2xl border-y border-l ${dockSurface} backdrop-blur-xl p-2 shadow-xl select-none`}
                  onPointerDown={stopDockPointer}
                  onPointerMove={stopDockPointer}
                  onPointerUp={stopDockPointer}
                  onClick={stopDockPointer}
              >
                  <div className={`h-9 px-1.5 flex items-center justify-start gap-2 text-[10px] font-black uppercase tracking-wider ${t.textSub}`}>
                      <span className="w-1 h-4 rounded-full bg-blue-500" />
                      Run controls
                  </div>
                  <div className="space-y-1">
                      {railItems.map(({ id, icon: Icon, label, detail, disabled }) => {
                          const active = dockMenuOpen === id;
                          return (
                              <button
                                  key={id}
                                  type="button"
                                  title={`${label}: ${detail}`}
                                  aria-label={`${label} actions: ${detail}`}
                                  aria-expanded={active}
                                  disabled={disabled}
                                  onClick={runDockAction(() => toggleDockPanel(id))}
                                  className={`w-full min-h-[58px] rounded-xl px-2.5 flex items-center gap-2.5 text-left transition-all focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500/50 disabled:opacity-45 disabled:cursor-not-allowed ${
                                      active
                                          ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20'
                                          : `${isDarkDock ? 'bg-slate-900/45 text-slate-200 hover:bg-slate-800' : 'bg-slate-50/85 text-slate-700 hover:bg-blue-50'}`
                                  }`}
                              >
                                  <span className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                                      active
                                          ? 'bg-white/15 text-white'
                                          : isDarkDock ? 'bg-slate-800 text-blue-300' : 'bg-blue-50 text-blue-600'
                                  }`}>
                                      <Icon className="w-[18px] h-[18px]" />
                                  </span>
                                  <span className="min-w-0 flex-1">
                                      <span className="block text-[11px] font-black uppercase leading-tight truncate">{label}</span>
                                      <span className="block mt-0.5 text-[9px] font-bold leading-tight opacity-70 truncate">{detail}</span>
                                  </span>
                              </button>
                          );
                      })}
                  </div>
              </section>
          );
      };
      const renderContextDrawer = () => {
          if (dockMenuOpen === 'line') return renderLinePanel();
          if (dockMenuOpen === 'nudge') return renderNudgePanel();
          if (dockMenuOpen === 'tools') return renderToolsPanel();
          return null;
      };
      const renderDockLayout = (dock) => (
          <div className="h-full max-h-full flex items-start gap-2 pointer-events-none">
              {renderContextDrawer()}
              {dock}
          </div>
      );

      const renderBoundaryCaptureDock = () => {
          const recording = Boolean(isRecordingBoundary);
          const capturedLengthMeters = tempBoundary.length > 1
              ? calculatePathLength(tempBoundary) / PIXELS_PER_METER
              : 0;
          const CaptureIcon = recording ? Radio : MapPin;

          return (
              <section
                  aria-label={`${recording ? 'Boundary recording' : 'Boundary ready'} contextual controls`}
                  className={`pointer-events-auto w-[184px] xl:w-[196px] overflow-hidden rounded-l-2xl border-y border-l ${dockSurface} backdrop-blur-xl shadow-xl select-none`}
                  onPointerDown={stopDockPointer}
                  onPointerMove={stopDockPointer}
                  onPointerUp={stopDockPointer}
                  onClick={stopDockPointer}
              >
                  <div className={`px-3 py-3 border-b ${railDivider} flex items-center gap-2.5`}>
                      <span className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${recording ? 'bg-red-500/12 text-red-500' : 'bg-orange-500/12 text-orange-500'}`}>
                          <CaptureIcon className="w-[18px] h-[18px]" />
                      </span>
                      <span className="min-w-0 flex-1">
                          <span className={`block text-[10px] font-black uppercase tracking-wide ${recording ? 'text-red-500' : 'text-orange-600'}`}>
                              Boundary capture
                          </span>
                          <span className={`block mt-0.5 text-[11px] font-black leading-tight ${t.textMain}`}>
                              {recording ? 'Recording field edge' : 'Ready to record'}
                          </span>
                      </span>
                      <span className={`shrink-0 w-2 h-2 rounded-full ${recording ? 'bg-red-500 animate-pulse' : 'bg-orange-500'}`} />
                  </div>

                  <div className="p-2.5 space-y-2.5">
                      {recording ? (
                          <>
                              <button
                                  type="button"
                                  onClick={runDockAction(finishBoundaryRecording)}
                                  className="w-full min-h-[58px] rounded-xl bg-green-600 hover:bg-green-500 text-white px-3 flex items-center gap-2.5 text-left shadow-md shadow-green-900/20 active:scale-[0.98] transition-all focus:outline-none focus:ring-2 focus:ring-green-500/40"
                              >
                                  <span className="shrink-0 w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
                                      <Square className="w-4 h-4" />
                                  </span>
                                  <span className="min-w-0">
                                      <span className="block text-xs font-black leading-tight">Finish recording</span>
                                      <span className="block mt-0.5 text-[9px] font-bold opacity-80">Close and review boundary</span>
                                  </span>
                              </button>

                              <div className="grid grid-cols-2 gap-1.5">
                                  <div className={`rounded-lg ${isDarkDock ? 'bg-slate-900/65' : 'bg-slate-50'} p-2`}>
                                      <div className={`text-[8px] font-black uppercase ${t.textSub}`}>Points</div>
                                      <div className={`mt-0.5 text-sm font-black ${t.textMain}`}>{tempBoundary.length}</div>
                                  </div>
                                  <div className={`rounded-lg ${isDarkDock ? 'bg-slate-900/65' : 'bg-slate-50'} p-2`}>
                                      <div className={`text-[8px] font-black uppercase ${t.textSub}`}>Distance</div>
                                      <div className={`mt-0.5 text-sm font-black ${t.textMain}`}>{capturedLengthMeters.toFixed(1)} m</div>
                                  </div>
                              </div>

                              <div className={`rounded-lg px-2.5 py-2 text-[10px] font-bold leading-snug ${isDarkDock ? 'bg-orange-500/10 text-orange-200' : 'bg-orange-50 text-orange-800'}`}>
                                  Drive the full field edge, then return near the start point.
                              </div>
                          </>
                      ) : (
                          <>
                              <button
                                  type="button"
                                  onClick={runDockAction(beginBoundaryRecording)}
                                  className="w-full min-h-[58px] rounded-xl bg-orange-500 hover:bg-orange-400 text-white px-3 flex items-center gap-2.5 text-left shadow-md shadow-orange-900/20 active:scale-[0.98] transition-all focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                              >
                                  <span className="shrink-0 w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center">
                                      <Play className="w-4 h-4" />
                                  </span>
                                  <span className="min-w-0">
                                      <span className="block text-xs font-black leading-tight">Start recording</span>
                                      <span className="block mt-0.5 text-[9px] font-bold opacity-80">Begin boundary capture</span>
                                  </span>
                              </button>

                              <div className={`rounded-xl ${isDarkDock ? 'bg-slate-900/65' : 'bg-slate-50'} p-2.5 flex items-start gap-2`}>
                                  <span className="shrink-0 w-6 h-6 rounded-full bg-orange-500 text-white flex items-center justify-center text-[10px] font-black">1</span>
                                  <span className="min-w-0">
                                      <span className={`block text-[11px] font-black ${t.textMain}`}>Position vehicle</span>
                                      <span className={`block mt-0.5 text-[9px] font-bold leading-snug ${t.textSub}`}>Move to the field edge before starting.</span>
                                  </span>
                              </div>
                          </>
                      )}
                  </div>

                  <div className={`px-2.5 py-2 border-t ${railDivider}`}>
                      <button
                          type="button"
                          onClick={runDockAction(cancelBoundaryRecording)}
                          className={`w-full h-10 rounded-lg flex items-center justify-center gap-2 text-[11px] font-black ${ghostTone.red}`}
                      >
                          <X className="w-4 h-4" />
                          Cancel capture
                      </button>
                  </div>
              </section>
          );
      };

      if (boundaryCaptureReady) {
          return renderDockLayout(renderBoundaryCaptureDock());
      }

      if (isRecordingBoundary) {
          return renderDockLayout(renderBoundaryCaptureDock());
      }

      if (uTurnPanelOpen) return null;

      if (isCreating) {
          let title = compactStatus(lineType);
          let status = 'Create';
          let primary = null;
          let content = null;
          let tone = 'blue';
          switch (lineType) {
              case 'STRAIGHT_AB': {
                  let abLabel = 'Set A';
                  let abColor = 'blue';
                  if (pointA && !pointB) { abLabel = 'Set B'; abColor = 'blue'; }
                  else if (pointA && pointB) { abLabel = 'Set A'; abColor = 'green'; }
                  const handleCancelAB = () => {
                      if (pointA && !pointB) {
                          actions.setPointA(null);
                          showNotification('Reset to Set A', 'info');
                      } else {
                          cancelLineCreation();
                      }
                  };
                  status = pointA ? 'Set B' : 'Set A';
                  tone = pointA ? 'orange' : 'blue';
                  primary = renderMainButton({ icon: Target, label: abLabel, color: abColor, onClick: handleABButtonClick });
                  content = (
                      <>
                          {renderStepLine([{ label: 'A', done: Boolean(pointA) }, { label: 'B', done: Boolean(pointB) }])}
                          {renderGrid(
                              <>
                                  {renderTinyButton({ icon: GitCommitHorizontal, label: 'Type', onClick: openLineTypePicker })}
                                  {renderTinyButton({ icon: X, label: pointA && !pointB ? 'Reset' : 'Cancel', color: 'red', onClick: handleCancelAB })}
                              </>
                          )}
                      </>
                  );
                  break;
              }
              case 'A_PLUS':
                  title = 'A+';
                  if (!aPlusPoint) {
                      status = 'Set A';
                      primary = renderMainButton({ icon: Target, label: 'Set A', color: 'blue', onClick: handleSetAPlus_PointA });
                      content = renderGrid(
                          <>
                              {renderTinyButton({ icon: GitCommitHorizontal, label: 'Type', onClick: openLineTypePicker })}
                              {renderTinyButton({ icon: X, label: 'Cancel', color: 'red', onClick: cancelLineCreation })}
                          </>
                      );
                  } else {
                      status = aPlusHeading !== null ? 'Ready' : 'Heading';
                      tone = aPlusHeading !== null ? 'green' : 'orange';
                      primary = aPlusHeading !== null
                          ? renderMainButton({ icon: Check, label: 'Confirm', sub: `${aPlusHeading.toFixed(0)}°`, color: 'green', onClick: handleConfirmAPlus })
                          : renderMainButton({ icon: Compass, label: 'Set heading', sub: `${heading.toFixed(0)}°`, color: 'blue', onClick: handleSetAPlus_HeadingCurrent });
                      content = (
                          <>
                              {renderStepLine([{ label: 'A', done: Boolean(aPlusPoint) }, { label: 'H', done: aPlusHeading !== null }])}
                              {renderGrid(
                                  <>
                                      {renderTinyButton({ icon: Keyboard, label: 'Input', onClick: () => { setManualHeadingModalOpen(true); setTempManualHeading(heading.toFixed(1)); } })}
                                      {renderTinyButton({ icon: RotateCcw, label: 'Reset', color: 'orange', onClick: () => { actions.setAPlusPoint({ ...worldPos }); actions.setAPlusHeading(null); showNotification('Point A Reset to Current Position', 'info'); } })}
                                      {renderTinyButton({ icon: GitCommitHorizontal, label: 'Type', onClick: openLineTypePicker })}
                                      {renderTinyButton({ icon: X, label: 'Cancel', color: 'red', onClick: () => { actions.setAPlusPoint(null); actions.setAPlusHeading(null); } })}
                                  </>
                              )}
                          </>
                      );
                  }
                  break;
              case 'CURVE':
                  status = isRecordingCurve ? 'REC' : 'Ready';
                  tone = isRecordingCurve ? 'red' : 'blue';
                  primary = renderMainButton({ icon: isRecordingCurve ? Disc : Spline, label: isRecordingCurve ? 'Stop' : 'Record', sub: `${curvePoints.length}`, color: isRecordingCurve ? 'red' : 'blue', onClick: handleRecordCurve, pulse: isRecordingCurve });
                  content = renderGrid(
                      <>
                          {renderTinyButton({ icon: GitCommitHorizontal, label: 'Type', onClick: openLineTypePicker })}
                          {renderTinyButton({ icon: X, label: 'Cancel', color: 'red', onClick: cancelLineCreation })}
                      </>
                  );
                  break;
              case 'COMBINATION':
                  status = isRecordingCurve ? 'REC' : curvePoints.length > 0 ? 'Pause' : 'Ready';
                  tone = isRecordingCurve ? 'orange' : 'blue';
                  primary = renderMainButton({ icon: isRecordingCurve ? Pause : Disc, label: isRecordingCurve ? 'Pause' : (curvePoints.length > 0 ? 'Continue' : 'Record'), sub: `${curvePoints.length}`, color: isRecordingCurve ? 'orange' : 'blue', onClick: isRecordingCurve ? handleCombinationPause : handleCombinationRecord, pulse: isRecordingCurve });
                  content = renderGrid(
                      <>
                          {curvePoints.length > 2 && renderTinyButton({ icon: Check, label: 'Finish', color: 'green', onClick: handleCombinationFinish })}
                          {isCombinationPaused && renderTinyButton({ icon: AlignJustify, label: 'Line', onClick: handleCombinationRecord })}
                          {renderTinyButton({ icon: GitCommitHorizontal, label: 'Type', onClick: openLineTypePicker })}
                          {renderTinyButton({ icon: X, label: 'Cancel', color: 'red', onClick: cancelLineCreation })}
                      </>
                  );
                  break;
              case 'PIVOT':
                  status = pivotCenter ? 'Set edge' : 'Center';
                  tone = pivotCenter ? 'orange' : 'blue';
                  primary = pivotCenter
                      ? renderMainButton({ icon: CircleDashed, label: 'Set edge', color: pivotRadius ? 'green' : 'blue', onClick: handleSetRadius })
                      : renderMainButton({ icon: Target, label: 'Set center', color: 'blue', onClick: handleSetCenter });
                  content = (
                      <>
                          {renderStepLine([{ label: 'C', done: Boolean(pivotCenter) }, { label: 'R', done: Boolean(pivotRadius) }])}
                          {renderGrid(
                              <>
                                  {renderTinyButton({ icon: Target, label: 'Center', color: pivotCenter ? 'green' : 'gray', onClick: handleSetCenter })}
                                  {renderTinyButton({ icon: X, label: 'Cancel', color: 'red', onClick: cancelLineCreation })}
                              </>
                          )}
                      </>
                  );
                  break;
              default:
                  break;
          }
          return renderDockLayout(renderShell({
              status: title === 'STRAIGHT AB' ? status : title,
              tone,
              children: (
                  <>
                      {primary}
                      {renderDivider()}
                      {content}
                  </>
              )
          }));
      }

      return renderDockLayout(renderActionRail());
  };

  const savedVehicleProfiles = vehicleProfiles || [];
  const savedImplementProfiles = implementProfiles || [];
  const implementTypeOptions = [
      { id: 'tillage', label: 'Tillage', detail: 'Cultivator, plow and soil preparation', connectionType: 'Drawbar', controlMode: 'Manual Lift', width: 4, overallWidth: 4.3, hitchToWorkPoint: 2.1, hitchToRear: 3.2, transportWidth: 3, transportLength: 4.4, workingDepth: 0.18, weightKg: 2800, capacity: 0, sections: 4, rowSpacing: 0.25 },
      { id: 'spraying', label: 'Spraying', detail: 'Boom sprayer and liquid application', connectionType: 'Drawbar', controlMode: 'Boom Sections', width: 12, overallWidth: 12.4, hitchToWorkPoint: 2.4, hitchToRear: 3.1, transportWidth: 2.8, transportLength: 4.5, workingDepth: 0, weightKg: 2200, capacity: 2400, sections: 6, rowSpacing: 0 },
      { id: 'seeding', label: 'Seeding', detail: 'Grain drill and air seeder', connectionType: 'Rear 3-point', controlMode: 'Section Control', width: 3, overallWidth: 3.2, hitchToWorkPoint: 1.35, hitchToRear: 1.9, transportWidth: 3.2, transportLength: 2.6, workingDepth: 0.06, weightKg: 1650, capacity: 950, sections: 6, rowSpacing: 0.167 },
      { id: 'harvest', label: 'Harvest', detail: 'Header and crop pickup attachment', connectionType: 'Integrated', controlMode: 'Header Control', width: 6, overallWidth: 6.35, hitchToWorkPoint: 0.9, hitchToRear: 1.6, transportWidth: 3, transportLength: 2.2, workingDepth: 0, weightKg: 2400, capacity: 0, sections: 2, rowSpacing: 0 },
      { id: 'planting', label: 'Planting', detail: 'Precision row-crop planter', connectionType: 'Rear 3-point', controlMode: 'Section Control', width: 3, overallWidth: 3.2, hitchToWorkPoint: 1.45, hitchToRear: 1.75, transportWidth: 3.2, transportLength: 2.4, workingDepth: 0.08, weightKg: 1450, capacity: 0, sections: 6, rowSpacing: 0.5 },
      { id: 'leveling', label: 'Land Leveling', detail: 'Scraper, grader and leveling blade', connectionType: 'Drawbar', controlMode: 'Grade Control', width: 3, overallWidth: 3.15, hitchToWorkPoint: 2.2, hitchToRear: 3, transportWidth: 3.15, transportLength: 4.1, workingDepth: 0.12, weightKg: 3100, capacity: 4.5, sections: 1, rowSpacing: 0 },
      { id: 'ditching', label: 'Ditching', detail: 'V-ditch and drainage former', connectionType: 'Rear 3-point', controlMode: 'Manual Lift', width: 1.8, overallWidth: 2.05, hitchToWorkPoint: 1.2, hitchToRear: 1.8, transportWidth: 2.05, transportLength: 2.1, workingDepth: 0.65, weightKg: 920, capacity: 0, sections: 1, rowSpacing: 0 }
  ];
  const filteredVehicleProfiles = savedVehicleProfiles.filter(profile => `${profile.label || ''} ${profile.type || ''} ${profile.detail || ''}`.toLowerCase().includes(vehicleProfileSearch.toLowerCase()));
  const filteredImplementProfiles = savedImplementProfiles.filter(profile => `${profile.label || ''} ${profile.name || ''} ${profile.type || ''} ${profile.detail || ''}`.toLowerCase().includes(implementProfileSearch.toLowerCase()));
  const activeVehicleProfile = savedVehicleProfiles.find(profile => profile.id === activeVehicleSettings.profileId) || savedVehicleProfiles[0] || activeVehicleSettings;
  const activeImplementProfile = savedImplementProfiles.find(profile => profile.id === activeImplementSettings.profileId) || savedImplementProfiles[0] || activeImplementSettings;
  const selectedVehicleProfile = savedVehicleProfiles.find(profile => profile.id === vehicleSettings.profileId) || null;
  const selectedImplementProfile = savedImplementProfiles.find(profile => profile.id === implementSettings.profileId) || null;
  const getVehicleAssetPrefix = (profile = {}) => {
      const identity = `${profile.type || ''} ${profile.label || ''} ${profile.id || ''}`.toLowerCase();
      if (identity.includes('articulated')) return 'articulated';
      if (identity.includes('self propelled') || identity.includes('self-propelled')) return 'sprayer';
      return 'tractor';
  };
  const getVehicleAsset = (profile, view = 'side') => `src/assets/vehicles/${getVehicleAssetPrefix(profile)}-${view}.png`;
  const getImplementAssetKey = (profile = {}) => {
      const identity = `${profile.type || ''} ${profile.label || ''} ${profile.id || ''}`.toLowerCase();
      if (identity.includes('spray') || identity.includes('spread')) return 'spraying';
      if (identity.includes('seed')) return 'seeding';
      if (identity.includes('harvest') || identity.includes('header')) return 'harvest';
      if (identity.includes('plant')) return 'planting';
      if (identity.includes('level') || identity.includes('blade') || identity.includes('grade')) return 'leveling';
      if (identity.includes('ditch')) return 'ditching';
      return 'tillage';
  };
  const getImplementAsset = (profile) => `src/assets/implements/${getImplementAssetKey(profile)}.png`;
  const makeProfileId = (prefix, name) => `${prefix}-${String(name || 'profile').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${Date.now().toString(36)}`;
  const cleanProfileLabel = (value, fallback) => String(value || fallback).replace(/_/g, ' ');
  const getImplementProfileDetail = (profile) => `${profile.sections || 1} sections / ${Number(profile.width || 0).toFixed(1)} m`;
  const getVehicleProfileDetail = (profile) => `${profile.steeringType || 'Front axle'} / ${Number(profile.wheelbase || 0).toFixed(1)} m wheelbase`;
  const makeUniqueProfileLabel = (requestedLabel, profiles, excludeId = null) => {
      const base = cleanProfileLabel(requestedLabel, 'Profile').trim() || 'Profile';
      const used = new Set(profiles.filter(profile => profile.id !== excludeId).map(profile => String(profile.label || '').trim().toLowerCase()));
      if (!used.has(base.toLowerCase())) return base;
      let suffix = 2;
      while (used.has(`${base} ${suffix}`.toLowerCase())) suffix += 1;
      return `${base} ${suffix}`;
  };
  const vehicleInformationReady = Boolean(String(vehicleSettings.label || '').trim()) && Boolean(vehicleSettings.type);
  const vehicleGeometryReady = Number(vehicleSettings.wheelbase) > 0
      && Number(vehicleSettings.frontAxleWidth) > 0
      && Number(vehicleSettings.rearAxleWidth) > 0
      && Number(vehicleSettings.antennaHeight) > 0
      && Number(vehicleSettings.gnssBaseline) > 0
      && Number(vehicleSettings.antennaToRearAxle) >= 0
      && Number(vehicleSettings.hitchHeight) >= 0;
  const implementInformationReady = Boolean(String(implementSettings.name || '').trim())
      && Boolean(implementSettings.type)
      && Boolean(implementSettings.connectionType);
  const implementGeometryReady = Number(implementSettings.width) > 0
      && Number(implementSettings.overallWidth) >= Number(implementSettings.width)
      && Number(implementSettings.hitchToWorkPoint) >= 0
      && Number(implementSettings.hitchToRear) >= Number(implementSettings.hitchToWorkPoint)
      && Number(implementSettings.sections) > 0
      && Number(implementSettings.delayOn) >= 0
      && Number(implementSettings.delayOff) >= 0
      && Number(implementSettings.transportWidth) > 0
      && Number(implementSettings.transportLength) > 0
      && Number(implementSettings.weightKg) >= 0;

  const handleVehicleChange = (key, value) => {
      setVehicleSettingsDraft(prev => ({ ...prev, [key]: value }));
  };

  const vehicleSetupStepIds = ['information', 'geometry', 'summary'];
  const goToVehicleStep = (index) => {
      const bounded = Math.max(0, Math.min(vehicleSetupStepIds.length - 1, index));
      setVehicleSetupStep(vehicleSetupStepIds[bounded]);
      requestAnimationFrame(() => {
          settingsContentScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      });
  };
  const startNewVehicleProfile = () => {
      const template = savedVehicleProfiles[0] || vehicleSettings;
      setPendingProfileDeleteKey(null);
      setPendingProfileSwitchKey(null);
      setVehicleSettingsDraft(prev => ({
          ...prev,
          ...template,
          id: undefined,
          profileId: null,
          label: 'New Vehicle',
          brand: 'Generic',
          model: '',
          purchaseDate: '',
          custom: true
      }));
      setVehicleSetupStep('information');
      setVehicleMeasureFocus('wheelbase');
      requestAnimationFrame(() => settingsContentScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }));
      showNotification('New vehicle draft ready — complete the details, then save', 'info');
  };
  const implementSetupStepIds = ['information', 'geometry', 'summary'];
  const goToImplementStep = (index) => {
      const bounded = Math.max(0, Math.min(implementSetupStepIds.length - 1, index));
      setImplementSetupStep(implementSetupStepIds[bounded]);
      requestAnimationFrame(() => {
          settingsContentScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
      });
  };
  const startNewImplementProfile = () => {
      const template = implementTypeOptions[0];
      setPendingProfileDeleteKey(null);
      setPendingProfileSwitchKey(null);
      setImplementSettingsDraft(prev => ({
          ...prev,
          ...template,
          id: undefined,
          profileId: null,
          name: 'New_Implement',
          type: template.label,
          brand: 'Generic',
          model: template.label,
          serialNumber: '',
          overlap: 0,
          offset: 0,
          delayOn: 0,
          delayOff: 0,
          sectionControl: false,
          custom: true
      }));
      setImplementSetupStep('information');
      setImplementMeasureFocus('width');
      requestAnimationFrame(() => settingsContentScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }));
      showNotification('New implement draft ready — choose a type and complete the details', 'info');
  };
  const applyImplementType = (option) => {
      setImplementSettingsDraft(prev => ({
          ...prev,
          ...option,
          type: option.label,
          name: `${option.label.replace(/\s+/g, '_')}_${Number(option.width || 0).toFixed(1)}M`,
          brand: prev.brand || 'Generic',
          model: option.label,
          serialNumber: '',
          overlap: Number(prev.overlap || 0),
          offset: 0,
          delayOn: option.controlMode === 'Manual Lift' ? 0 : 0.5,
          delayOff: option.controlMode === 'Manual Lift' ? 0 : 0.2,
          sectionControl: ['Section Control', 'Boom Sections'].includes(option.controlMode)
      }));
      setImplementMeasureFocus('width');
  };

  const buildVehicleSettings = (profile, base = activeVehicleSettings) => {
      const fallbackPower = profile.id === 'articulated' ? 420 : profile.id === 'self-propelled' ? 280 : 125;
      return {
          ...base,
          ...profile,
          profileId: profile.id,
          label: profile.label || profile.type || base.label,
          brand: profile.brand || 'Generic',
          model: profile.model || profile.label || profile.type || 'Vehicle',
          controlType: profile.controlType || (profile.steeringType === 'Articulated' || profile.id === 'self-propelled' ? 'CAN Hydraulic' : 'Electronic Steering Wheel'),
          horsepower: Number(profile.horsepower || fallbackPower),
          purchaseDate: profile.purchaseDate || base.purchaseDate || '',
          frontOverhang: Number(profile.frontOverhang ?? base.frontOverhang ?? 1.35),
          rearOverhang: Number(profile.rearOverhang ?? base.rearOverhang ?? 1.05),
          overallHeight: Number(profile.overallHeight ?? base.overallHeight ?? 3.1),
          antennaToRearAxle: Number(profile.antennaToRearAxle ?? Math.max(0.5, Number(profile.wheelbase || base.wheelbase || 2.5) * 0.46)),
          gnssReceiverModel: profile.gnssReceiverModel || base.gnssReceiverModel || 'AG-372',
          gnssLayout: 'Dual antenna horizontal',
          gnssAntennaCount: 2,
          gnssBaseline: Number(profile.gnssBaseline ?? base.gnssBaseline ?? 1.2),
          gnssPrimarySide: profile.gnssPrimarySide || base.gnssPrimarySide || 'Left / ANT A',
          gnssMountPosition: profile.gnssMountPosition || base.gnssMountPosition || 'Cab roof crossbar',
          gnssHeadingOffset: Number(profile.gnssHeadingOffset ?? base.gnssHeadingOffset ?? 0),
          gnssRollOffset: Number(profile.gnssRollOffset ?? base.gnssRollOffset ?? 0),
          gnssPitchOffset: Number(profile.gnssPitchOffset ?? base.gnssPitchOffset ?? 0),
          hitchOffset: Number(profile.hitchOffset ?? base.hitchOffset ?? 0),
          hitchHeight: Number(profile.hitchHeight ?? base.hitchHeight ?? 0.65)
      };
  };

  const applyVehicleProfile = (profile) => {
      const currentBaseline = selectedVehicleProfile ? buildVehicleSettings(selectedVehicleProfile, activeVehicleSettings) : null;
      const hasUnsavedDraft = !currentBaseline || JSON.stringify(vehicleSettings) !== JSON.stringify(currentBaseline);
      const switchKey = `vehicle:${profile.id}`;
      if (vehicleSettings.profileId !== profile.id && hasUnsavedDraft && pendingProfileSwitchKey !== switchKey) {
          setPendingProfileSwitchKey(switchKey);
          return showNotification(`Unsaved vehicle changes — select ${profile.label} again to discard them`, 'warning');
      }
      setPendingProfileDeleteKey(null);
      setPendingProfileSwitchKey(null);
      setVehicleSettingsDraft(buildVehicleSettings(profile, activeVehicleSettings));
      setVehicleSetupStep('information');
      showNotification(`${profile.label} selected for review`, 'info');
  };

  const activateVehicleProfile = (profile) => {
      const nextSettings = buildVehicleSettings(profile, activeVehicleSettings);
      if (vehicleSettings.profileId === profile.id && JSON.stringify(vehicleSettings) !== JSON.stringify(nextSettings)) {
          return showNotification('Save or discard vehicle edits before activating this profile', 'warning');
      }
      setPendingProfileDeleteKey(null);
      setPendingProfileSwitchKey(null);
      setVehicleSettingsDraft(nextSettings);
      actions.setVehicleSettings(nextSettings);
      showNotification(`${profile.label} is now the active vehicle`, 'success');
  };

  const saveVehicleProfile = () => {
      if (!vehicleInformationReady || !vehicleGeometryReady) {
          goToVehicleStep(vehicleInformationReady ? 1 : 0);
          return showNotification(vehicleInformationReady ? 'Complete all required vehicle dimensions before saving' : 'Vehicle name and type are required', 'warning');
      }
      const currentProfile = savedVehicleProfiles.find(profile => profile.id === vehicleSettings.profileId);
      const shouldUpdate = currentProfile?.custom === true;
      const isCopy = Boolean(currentProfile && !currentProfile.custom);
      const requestedLabel = cleanProfileLabel(vehicleSettings.label || vehicleSettings.type, 'Vehicle Profile');
      const copyLabel = isCopy ? `${requestedLabel} Copy` : requestedLabel;
      const label = makeUniqueProfileLabel(copyLabel, savedVehicleProfiles, shouldUpdate ? currentProfile.id : null);
      const id = shouldUpdate ? currentProfile.id : makeProfileId('vehicle', label);
      const nextProfile = {
          ...vehicleSettings,
          id,
          profileId: undefined,
          label,
          detail: getVehicleProfileDetail(vehicleSettings),
          custom: true,
          savedAt: new Date().toISOString()
      };

      actions.setVehicleProfiles(prev => shouldUpdate
          ? prev.map(profile => profile.id === id ? nextProfile : profile)
          : [nextProfile, ...prev]
      );
      const nextDraft = { ...nextProfile, profileId: id };
      setVehicleSettingsDraft(nextDraft);
      if (shouldUpdate && activeVehicleSettings.profileId === id) {
          actions.setVehicleSettings(nextDraft);
      }
      setPendingProfileDeleteKey(null);
      setPendingProfileSwitchKey(null);
      showNotification(
          `${label} ${shouldUpdate ? 'changes saved' : isCopy ? 'copy created' : 'created'}${activeVehicleSettings.profileId === id ? '' : ' — activate it when ready'}`,
          'success'
      );
  };

  const deleteVehicleProfile = (profile, event) => {
      event.stopPropagation();
      if (!profile.custom) return showNotification('Built-in vehicle templates cannot be deleted', 'warning');
      if (activeVehicleSettings.profileId === profile.id) {
          return showNotification('Activate another vehicle before deleting this profile', 'warning');
      }
      const deleteKey = `vehicle:${profile.id}`;
      if (pendingProfileDeleteKey !== deleteKey) {
          setPendingProfileDeleteKey(deleteKey);
          return showNotification(`Press Confirm to delete ${profile.label}`, 'warning');
      }
      const nextProfiles = savedVehicleProfiles.filter(item => item.id !== profile.id);
      actions.setVehicleProfiles(nextProfiles);
      if (vehicleSettings.profileId === profile.id) {
          setVehicleSettingsDraft({ ...activeVehicleSettings });
      }
      setPendingProfileDeleteKey(null);
      setPendingProfileSwitchKey(null);
      showNotification(`${profile.label} vehicle profile deleted`, 'info');
  };

  // HANDLER FOR REAL-TIME IMPLEMENT CHANGE
  const handleImplementChange = (key, value) => {
      setImplementSettingsDraft(prev => ({ ...prev, [key]: value }));
  };

  const buildImplementSettings = (profile, base = activeImplementSettings) => {
      const typeDefaults = implementTypeOptions.find(option => option.id === getImplementAssetKey(profile)) || implementTypeOptions[0];
      return {
          ...base,
          ...typeDefaults,
          ...profile,
          profileId: profile.id,
          type: implementTypeOptions.some(option => option.label === profile.type) ? profile.type : typeDefaults.label,
          brand: profile.brand || base.brand || 'Generic',
          model: profile.model || profile.label || profile.type,
          serialNumber: profile.serialNumber || '',
          connectionType: profile.connectionType || typeDefaults.connectionType,
          overallWidth: Number(profile.overallWidth ?? Math.max(Number(profile.width || typeDefaults.width), Number(profile.width || typeDefaults.width) + 0.2)),
          hitchToWorkPoint: Number(profile.hitchToWorkPoint ?? typeDefaults.hitchToWorkPoint),
          hitchToRear: Number(profile.hitchToRear ?? typeDefaults.hitchToRear),
          transportWidth: Number(profile.transportWidth ?? typeDefaults.transportWidth),
          transportLength: Number(profile.transportLength ?? typeDefaults.transportLength),
          workingDepth: Number(profile.workingDepth ?? typeDefaults.workingDepth),
          weightKg: Number(profile.weightKg ?? typeDefaults.weightKg),
          capacity: Number(profile.capacity ?? typeDefaults.capacity),
          sectionControl: profile.sectionControl ?? ['Section Control', 'Boom Sections'].includes(profile.controlMode || typeDefaults.controlMode)
      };
  };

  const applyImplementProfile = (profile) => {
      const currentBaseline = selectedImplementProfile ? buildImplementSettings(selectedImplementProfile, activeImplementSettings) : null;
      const hasUnsavedDraft = !currentBaseline || JSON.stringify(implementSettings) !== JSON.stringify(currentBaseline);
      const switchKey = `implement:${profile.id}`;
      if (implementSettings.profileId !== profile.id && hasUnsavedDraft && pendingProfileSwitchKey !== switchKey) {
          setPendingProfileSwitchKey(switchKey);
          return showNotification(`Unsaved implement changes — select ${profile.label} again to discard them`, 'warning');
      }
      setPendingProfileDeleteKey(null);
      setPendingProfileSwitchKey(null);
      setImplementSettingsDraft(buildImplementSettings(profile, activeImplementSettings));
      setImplementSetupStep('information');
      setImplementMeasureFocus('width');
      showNotification(`${profile.label} selected for review`, 'info');
  };

  const activateImplementProfile = (profile) => {
      const nextSettings = buildImplementSettings(profile, activeImplementSettings);
      if (implementSettings.profileId === profile.id && JSON.stringify(implementSettings) !== JSON.stringify(nextSettings)) {
          return showNotification('Save or discard implement edits before activating this profile', 'warning');
      }
      setPendingProfileDeleteKey(null);
      setPendingProfileSwitchKey(null);
      setImplementSettingsDraft(nextSettings);
      actions.setImplementSettings(nextSettings);
      setImplementMeasureFocus('width');
      showNotification(`${profile.label} is now the active implement`, 'success');
  };

  const saveImplementProfile = () => {
      if (!implementInformationReady || !implementGeometryReady) {
          goToImplementStep(implementInformationReady ? 1 : 0);
          return showNotification(implementInformationReady ? 'Complete all required implement dimensions before saving' : 'Implement name, type and connection are required', 'warning');
      }
      const currentProfile = savedImplementProfiles.find(profile => profile.id === implementSettings.profileId);
      const shouldUpdate = currentProfile?.custom === true;
      const isCopy = Boolean(currentProfile && !currentProfile.custom);
      const requestedLabel = cleanProfileLabel(implementSettings.name, `${implementSettings.type || 'Implement'} ${Number(implementSettings.width || 0).toFixed(1)}m`);
      const copyLabel = isCopy ? `${requestedLabel} Copy` : requestedLabel;
      const label = makeUniqueProfileLabel(copyLabel, savedImplementProfiles, shouldUpdate ? currentProfile.id : null);
      const id = shouldUpdate ? currentProfile.id : makeProfileId('implement', label);
      const nextProfile = {
          ...implementSettings,
          id,
          profileId: undefined,
          label,
          detail: getImplementProfileDetail(implementSettings),
          custom: true,
          savedAt: new Date().toISOString()
      };

      actions.setImplementProfiles(prev => shouldUpdate
          ? prev.map(profile => profile.id === id ? nextProfile : profile)
          : [nextProfile, ...prev]
      );
      const nextDraft = { ...nextProfile, profileId: id };
      setImplementSettingsDraft(nextDraft);
      if (shouldUpdate && activeImplementSettings.profileId === id) {
          actions.setImplementSettings(nextDraft);
      }
      setPendingProfileDeleteKey(null);
      setPendingProfileSwitchKey(null);
      showNotification(
          `${label} ${shouldUpdate ? 'changes saved' : isCopy ? 'copy created' : 'created'}${activeImplementSettings.profileId === id ? '' : ' — activate it when ready'}`,
          'success'
      );
  };

  const deleteImplementProfile = (profile, event) => {
      event.stopPropagation();
      if (!profile.custom) return showNotification('Built-in implement templates cannot be deleted', 'warning');
      if (activeImplementSettings.profileId === profile.id) {
          return showNotification('Activate another implement before deleting this profile', 'warning');
      }
      const deleteKey = `implement:${profile.id}`;
      if (pendingProfileDeleteKey !== deleteKey) {
          setPendingProfileDeleteKey(deleteKey);
          return showNotification(`Press Confirm to delete ${profile.label}`, 'warning');
      }
      const nextProfiles = savedImplementProfiles.filter(item => item.id !== profile.id);
      actions.setImplementProfiles(nextProfiles);
      if (implementSettings.profileId === profile.id) {
          setImplementSettingsDraft({ ...activeImplementSettings });
      }
      setPendingProfileDeleteKey(null);
      setPendingProfileSwitchKey(null);
      showNotification(`${profile.label} implement profile deleted`, 'info');
  };

  const closeSettingsPanel = () => {
      setVehicleSettingsDraft({ ...activeVehicleSettings });
      setImplementSettingsDraft({ ...activeImplementSettings });
      setPendingProfileDeleteKey(null);
      setPendingProfileSwitchKey(null);
      setSettingsOpen(false);
  };

  const handleRtkSettingChange = (key, value) => {
      actions.setRtkSettings(prev => ({ ...prev, [key]: value }));
  };
  const handleWifiSettingChange = (key, value) => {
      actions.setWifiSettings(prev => ({ ...prev, [key]: value }));
  };
  const handleUTurnSettingChange = (key, value) => {
      actions.setUTurnSettings(prev => ({ ...prev, [key]: value }));
  };

  const SettingsSection = ({ title, detail, icon: Icon = Settings, children, actions: sectionActions }) => (
      <section className={`${t.bgPanel} border ${t.borderCard} rounded-xl p-4 lg:p-5 space-y-4`}>
          <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                  <div className={`shrink-0 w-10 h-10 rounded-lg ${theme === 'dark' ? 'bg-slate-800' : 'bg-gray-100'} flex items-center justify-center`}>
                      <Icon className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="min-w-0">
                      <h4 className={`font-black ${t.textMain}`}>{title}</h4>
                      {detail && <div className={`text-xs ${t.textSub}`}>{detail}</div>}
                  </div>
              </div>
              {sectionActions && <div className="shrink-0 flex flex-wrap gap-2 justify-end">{sectionActions}</div>}
          </div>
          {children}
      </section>
  );

  const SettingSelect = ({ label, value, onChange, options }) => (
      <div className="flex flex-col gap-1.5">
          <label className={`text-[11px] font-bold uppercase ${t.textSub}`}>{label}</label>
          <select
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className={`${t.bgInput} border ${t.borderCard} rounded-lg px-4 py-2.5 ${t.textMain} outline-none`}
          >
              {options.map((option) => (
                  <option key={option} value={option}>{option}</option>
              ))}
          </select>
      </div>
  );

  const SettingsActionButton = ({ children, onClick, variant = 'ghost' }) => {
      const variantClass = variant === 'primary'
          ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-500'
          : variant === 'danger'
              ? 'bg-red-500/10 text-red-500 border-red-500/40 hover:bg-red-500/15'
              : `${t.textMain} border ${t.borderCard} hover:brightness-95`;
      return (
          <button onClick={onClick} className={`px-4 py-2 rounded-lg border text-sm font-black transition ${variantClass}`}>
              {children}
          </button>
      );
  };

  const SettingsMetric = ({ label, value, tone = t.textMain }) => (
      <div className={`${theme === 'dark' ? 'bg-slate-800' : 'bg-gray-100'} p-3 rounded-xl border ${t.borderCard}`}>
          <div className={`text-[10px] uppercase font-black ${t.textSub}`}>{label}</div>
          <div className={`text-lg font-black truncate ${tone}`}>{value}</div>
      </div>
  );

  const ConfigTile = ({ icon: Icon = CheckCircle2, label, value, tone = 'text-blue-500' }) => (
      <div className={`${theme === 'dark' ? 'bg-slate-900/70' : 'bg-white'} border ${t.borderCard} rounded-xl p-3 flex items-center gap-3 min-w-0`}>
          <div className={`shrink-0 w-9 h-9 rounded-lg ${theme === 'dark' ? 'bg-slate-800' : 'bg-gray-100'} flex items-center justify-center`}>
              <Icon className={`w-5 h-5 ${tone}`} />
          </div>
          <div className="min-w-0">
              <div className={`text-[10px] uppercase font-black ${t.textSub}`}>{label}</div>
              <div className={`text-sm font-black truncate ${t.textMain}`}>{value}</div>
          </div>
      </div>
  );

  const SetupLibrarySidebar = ({
      eyebrow,
      title,
      count,
      searchValue,
      onSearchChange,
      searchPlaceholder,
      profiles,
      isActive,
      isSelected,
      onSelect,
      onActivate,
      getImage,
      getSecondary,
      getMeta,
      onDelete,
      emptyText,
      headerAction,
      footer,
      entity
  }) => (
      <aside className={`flex min-h-0 flex-col border-r font-sans ${t.border} ${theme === 'dark' ? 'bg-slate-950/45' : 'bg-slate-50/80'}`}>
          <div className={`border-b ${t.border} px-4 py-3.5`}>
              <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                      <div className={`text-[10px] font-semibold uppercase leading-4 tracking-[0.08em] ${t.textSub}`}>{eyebrow}</div>
                      <div className={`truncate text-[15px] font-bold leading-5 tracking-[-0.01em] ${t.textMain}`}>{title}</div>
                  </div>
                  <span className="mt-0.5 flex shrink-0 items-center gap-1.5">
                      <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-blue-500/10 px-2 text-[10px] font-bold tabular-nums text-blue-500">
                          {count}
                      </span>
                      {headerAction}
                  </span>
              </div>
              <label className="relative mt-3 block">
                  <Search className={`pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 ${t.textDim}`} />
                  <input
                      value={searchValue}
                      onChange={(event) => onSearchChange(event.target.value)}
                      placeholder={searchPlaceholder}
                      className={`h-10 w-full rounded-lg border ${t.borderCard} ${t.bgInput} pl-8 pr-3 text-xs font-medium ${t.textMain} outline-none transition-colors placeholder:font-normal focus:border-blue-500`}
                  />
              </label>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto p-3">
              {profiles.map((profile) => {
                  const active = isActive(profile);
                  const selected = isSelected(profile);
                  const deleteKey = `${entity}:${profile.id}`;
                  const confirmingDelete = pendingProfileDeleteKey === deleteKey;
                  return (
                      <article
                          key={profile.id}
                          className={`group w-full min-w-0 rounded-xl border px-2.5 py-2 transition-colors ${selected ? 'border-blue-500 bg-blue-500/10 ring-1 ring-blue-500/15' : active ? 'border-green-500/60 bg-green-500/5' : `${t.borderCard} ${theme === 'dark' ? 'bg-slate-900/55' : 'bg-white'} hover:border-blue-500/50`}`}
                      >
                          <button type="button" onClick={() => onSelect(profile)} className="grid w-full min-w-0 grid-cols-[48px_minmax(0,1fr)] items-center gap-2 text-left">
                              <span className={`flex h-11 w-12 items-center justify-center overflow-hidden rounded-lg border ${selected ? 'border-blue-500/40 bg-blue-500/10' : `${t.borderCard} ${theme === 'dark' ? 'bg-slate-950/70' : 'bg-slate-50'}`}`}>
                                  <img src={getImage(profile)} alt="" aria-hidden="true" className="h-full w-full object-contain p-1" />
                              </span>
                              <span className="min-w-0">
                                  <span
                                      className={`block text-xs font-bold leading-[15px] tracking-[-0.01em] ${selected ? 'text-blue-500' : t.textMain}`}
                                      style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                                  >
                                      {profile.label}
                                  </span>
                                  <span className={`mt-0.5 block truncate text-[10px] font-medium leading-4 ${t.textSub}`}>{getSecondary(profile)}</span>
                                  <span className={`block truncate text-[10px] font-normal leading-[14px] ${t.textDim}`}>{getMeta(profile)}</span>
                              </span>
                          </button>

                          <div className={`mt-2 flex items-center justify-between gap-2 border-t ${t.border} pt-2`}>
                              <span className={`text-[8px] font-semibold uppercase tracking-[0.08em] ${profile.custom ? 'text-violet-500' : t.textDim}`}>
                                  {profile.custom ? 'Custom profile' : 'Built-in'}
                              </span>
                              <span className="flex items-center gap-1.5">
                                  {profile.custom && (
                                      <button
                                          type="button"
                                          aria-label={confirmingDelete ? `Confirm delete ${profile.label}` : `Delete ${profile.label}`}
                                          onClick={(event) => onDelete(profile, event)}
                                          disabled={active}
                                          title={active ? 'Activate another profile before deleting this one' : confirmingDelete ? 'Press again to confirm deletion' : 'Delete profile'}
                                          className={`flex h-7 items-center gap-1 rounded-md border px-2 text-[9px] font-semibold uppercase transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${confirmingDelete ? 'border-red-500 bg-red-500 text-white' : 'border-red-500/30 text-red-500 hover:bg-red-500/10'}`}
                                      >
                                          <Trash2 className="h-3 w-3" />
                                          {confirmingDelete ? 'Confirm' : 'Delete'}
                                      </button>
                                  )}
                                  {active ? (
                                      <span className="flex h-7 items-center gap-1 rounded-md bg-green-500/12 px-2 text-[9px] font-bold uppercase text-green-500">
                                          <CheckCircle2 className="h-3 w-3" />
                                          Active
                                      </span>
                                  ) : (
                                      <button
                                          type="button"
                                          onClick={() => onActivate(profile)}
                                          className="flex h-7 items-center gap-1 rounded-md bg-blue-600 px-2.5 text-[9px] font-bold uppercase text-white transition-colors hover:bg-blue-500"
                                      >
                                          Activate
                                          <ChevronRight className="h-3 w-3" />
                                      </button>
                                  )}
                              </span>
                          </div>
                      </article>
                  );
              })}
              {profiles.length === 0 && (
                  <div className={`rounded-xl border border-dashed ${t.borderCard} px-3 py-5 text-center text-xs font-medium ${t.textDim}`}>{emptyText}</div>
              )}
          </div>

          <div className={`border-t ${t.border} p-3`}>{footer}</div>
      </aside>
  );

  const VehicleLibrarySidebar = () => (
      <SetupLibrarySidebar
          eyebrow="Vehicle"
          title="Machines"
          count={savedVehicleProfiles.length}
          searchValue={vehicleProfileSearch}
          onSearchChange={setVehicleProfileSearch}
          searchPlaceholder="Search machines"
          profiles={filteredVehicleProfiles}
          isActive={(profile) => activeVehicleSettings.profileId === profile.id}
          isSelected={(profile) => vehicleSettings.profileId === profile.id}
          onSelect={applyVehicleProfile}
          onActivate={activateVehicleProfile}
          getImage={(profile) => getVehicleAsset(profile, 'side')}
          getSecondary={(profile) => `${profile.brand || 'Generic'} \u00B7 ${profile.model || profile.type}`}
          getMeta={(profile) => `${profile.type || 'Vehicle'} \u00B7 ${Number(profile.horsepower || 0)} HP`}
          onDelete={deleteVehicleProfile}
          emptyText="No matching machine"
          entity="vehicle"
          headerAction={(
              <button
                  type="button"
                  onClick={startNewVehicleProfile}
                  className="flex h-7 items-center gap-1 rounded-md bg-blue-600 px-2 text-[9px] font-bold uppercase text-white transition-colors hover:bg-blue-500"
              >
                  <Plus className="h-3 w-3" />
                  New
              </button>
          )}
          footer={(
              <button
                  type="button"
                  onClick={() => showNotification('Quick import is ready for a vehicle profile file', 'info')}
                  className={`flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border ${t.borderCard} px-2 text-[11px] font-semibold ${t.textSub} transition-colors hover:border-blue-500 hover:text-blue-500`}
              >
                  <FolderOpen className="h-4 w-4" />
                  Import profile
              </button>
          )}
      />
  );

  const ImplementLibrarySidebar = () => (
      <SetupLibrarySidebar
          eyebrow="Implement"
          title="Implements"
          count={savedImplementProfiles.length}
          searchValue={implementProfileSearch}
          onSearchChange={setImplementProfileSearch}
          searchPlaceholder="Search implements"
          profiles={filteredImplementProfiles}
          isActive={(profile) => activeImplementSettings.profileId === profile.id}
          isSelected={(profile) => implementSettings.profileId === profile.id}
          onSelect={applyImplementProfile}
          onActivate={activateImplementProfile}
          getImage={getImplementAsset}
          getSecondary={(profile) => `${profile.type || 'Implement'} \u00B7 ${profile.connectionType || 'Rear 3-point'}`}
          getMeta={(profile) => `${Number(profile.width || 0).toFixed(1)} m working width`}
          onDelete={deleteImplementProfile}
          emptyText="No matching implement"
          entity="implement"
          headerAction={(
              <button
                  type="button"
                  onClick={startNewImplementProfile}
                  className="flex h-7 items-center gap-1 rounded-md bg-blue-600 px-2 text-[9px] font-bold uppercase text-white transition-colors hover:bg-blue-500"
              >
                  <Plus className="h-3 w-3" />
                  New
              </button>
          )}
          footer={(
              <button
                  type="button"
                  onClick={() => showNotification('Quick import is ready for an implement profile file', 'info')}
                  className={`flex h-10 w-full items-center justify-center gap-1.5 rounded-lg border ${t.borderCard} px-2 text-[11px] font-semibold ${t.textSub} transition-colors hover:border-blue-500 hover:text-blue-500`}
              >
                  <FolderOpen className="h-4 w-4" />
                  Import profile
              </button>
          )}
      />
  );

  const VehicleParameterInput = ({ field, label, value, unit = 'm', hint, className = '' }) => {
      const active = vehicleMeasureFocus === field;
      return (
          <label
              className={`flex min-w-0 cursor-text items-center gap-3 border-b ${t.border} px-3 py-2.5 transition-colors last:border-b-0 ${active ? 'bg-blue-500/7' : ''} ${className}`}
              style={active ? { boxShadow: 'inset 3px 0 0 #2563eb' } : undefined}
              onClick={() => setVehicleMeasureFocus(field)}
          >
              <span className="min-w-0 flex-1">
                  <span className={`block text-[9px] font-black uppercase tracking-wide ${active ? 'text-blue-500' : t.textMain}`}>{label}</span>
                  {hint && <span className={`mt-0.5 block truncate text-[8px] ${t.textDim}`}>{hint}</span>}
              </span>
              <span className={`flex w-[92px] shrink-0 items-center rounded-lg border ${active ? 'border-blue-500/40' : t.borderCard} ${t.bgInput} px-2.5`}>
                  <input
                      type="number"
                      step={unit === '°' ? '0.1' : '0.01'}
                      value={Number.isFinite(Number(value)) ? Math.round(Number(value) * 1000) / 1000 : 0}
                      onFocus={() => setVehicleMeasureFocus(field)}
                      onChange={(event) => handleVehicleChange(field, parseFloat(event.target.value) || 0)}
                      className={`h-9 min-w-0 flex-1 bg-transparent text-right text-sm font-black outline-none ${t.textMain}`}
                  />
                  <span className={`ml-1 text-[9px] font-black uppercase ${t.textDim}`}>{unit}</span>
              </span>
          </label>
      );
  };

  const ImplementParameterInput = ({ field, label, value, unit = 'm', hint, step = '0.01', className = '' }) => {
      const active = implementMeasureFocus === field;
      return (
          <label
              className={`flex min-w-0 cursor-text items-center gap-3 border-b ${t.border} px-3 py-2.5 transition-colors last:border-b-0 ${active ? 'bg-blue-500/7' : ''} ${className}`}
              style={active ? { boxShadow: 'inset 3px 0 0 #2563eb' } : undefined}
              onClick={() => setImplementMeasureFocus(field)}
          >
              <span className="min-w-0 flex-1">
                  <span className={`block text-[9px] font-black uppercase tracking-wide ${active ? 'text-blue-500' : t.textMain}`}>{label}</span>
                  {hint && <span className={`mt-0.5 block truncate text-[8px] ${t.textDim}`}>{hint}</span>}
              </span>
              <span className={`flex w-[100px] shrink-0 items-center rounded-lg border ${active ? 'border-blue-500/40' : t.borderCard} ${t.bgInput} px-2.5`}>
                  <input
                      type="number"
                      step={step}
                      value={Number.isFinite(Number(value)) ? Math.round(Number(value) * 1000) / 1000 : 0}
                      onFocus={() => setImplementMeasureFocus(field)}
                      onChange={(event) => handleImplementChange(field, parseFloat(event.target.value) || 0)}
                      className={`h-9 min-w-0 flex-1 bg-transparent text-right text-sm font-black outline-none ${t.textMain}`}
                  />
                  <span className={`ml-1 text-[9px] font-black uppercase ${t.textDim}`}>{unit}</span>
              </span>
          </label>
      );
  };

  const RealImplementMeasurementView = () => {
      const implementDisplayType = implementTypeOptions.find(option => option.id === getImplementAssetKey(implementSettings))?.label || implementSettings.type || 'Implement';
      const numberValue = (field, decimals = 2) => Number(implementSettings[field] || 0).toFixed(decimals);
      const measures = {
          width: ['Working width', `${numberValue('width')} m`, '#2563eb', 'width'],
          overallWidth: ['Overall width', `${numberValue('overallWidth')} m`, '#06b6d4', 'overall'],
          hitchToWorkPoint: ['Hitch to working point', `${numberValue('hitchToWorkPoint')} m`, '#f59e0b', 'length'],
          hitchToRear: ['Hitch to rear edge', `${numberValue('hitchToRear')} m`, '#f97316', 'length'],
          offset: ['Lateral offset', `${Number(implementSettings.offset || 0) >= 0 ? '+' : ''}${numberValue('offset')} m`, '#8b5cf6', 'offset'],
          overlap: ['Skip / overlap', `${numberValue('overlap')} m`, '#ef4444', 'overlap'],
          sections: ['Sections / rows', `${Math.max(1, Number(implementSettings.sections || 1))}`, '#16a34a', 'sections'],
          rowSpacing: ['Row spacing', `${numberValue('rowSpacing', 3)} m`, '#16a34a', 'rows'],
          transportWidth: ['Transport width', `${numberValue('transportWidth')} m`, '#0f766e', 'transportWidth'],
          transportLength: ['Transport length', `${numberValue('transportLength')} m`, '#d97706', 'transportLength'],
          workingDepth: ['Working depth', `${numberValue('workingDepth')} m`, '#a16207', 'depth'],
          weightKg: ['Operating weight', `${Math.round(Number(implementSettings.weightKg || 0))} kg`, '#64748b', 'mass'],
          capacity: ['Tank / hopper capacity', `${numberValue('capacity', 0)} ${implementDisplayType === 'Land Leveling' ? 'm³' : 'L'}`, '#0284c7', 'capacity'],
          delayOn: ['Switch-on delay', `${numberValue('delayOn', 1)} s`, '#22c55e', 'timing'],
          delayOff: ['Switch-off delay', `${numberValue('delayOff', 1)} s`, '#ef4444', 'timing']
      };
      const selected = measures[implementMeasureFocus] || measures.width;
      const [selectedLabel, selectedValue, selectedColor, selectedMode] = selected;
      const sectionCount = Math.max(1, Math.min(16, Number(implementSettings.sections || 1)));
      const offsetPx = Math.max(-80, Math.min(80, Number(implementSettings.offset || 0) * 80));
      const gridStroke = theme === 'dark' ? '#1e293b' : '#e2e8f0';
      const panelFill = theme === 'dark' ? '#020617' : '#ffffff';
      const mutedColor = theme === 'dark' ? '#64748b' : '#94a3b8';
      const sectionWidthPx = 360 / sectionCount;

      const MeasureLabel = ({ x, y, text = selectedValue, color = selectedColor }) => (
          <g>
              <rect x={x - 46} y={y - 13} width="92" height="26" rx="8" fill={panelFill} stroke={color} strokeWidth="1.5" />
              <text x={x} y={y + 4} textAnchor="middle" fontSize="10" fontWeight="900" fill={color}>{text}</text>
          </g>
      );

      return (
          <div className={`overflow-hidden rounded-2xl border ${t.borderCard} ${theme === 'dark' ? 'bg-slate-950' : 'bg-white'}`}>
              <style>{`
                  @keyframes implementMeasureIn {
                      from { opacity: 0; transform: translateY(6px) scale(.985); }
                      to { opacity: 1; transform: translateY(0) scale(1); }
                  }
                  @keyframes implementTimingPulse {
                      0%, 100% { opacity: .35; }
                      50% { opacity: 1; }
                  }
              `}</style>
              <div className={`flex items-center justify-between gap-3 border-b ${t.border} px-3.5 py-3`}>
                  <div className="min-w-0">
                      <div className={`text-[8px] font-black uppercase tracking-wider ${t.textSub}`}>{implementDisplayType} reference</div>
                      <div className={`truncate text-sm font-black ${t.textMain}`}>{selectedLabel}</div>
                  </div>
                  <span className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-black" style={{ color: selectedColor, backgroundColor: `${selectedColor}14` }}>
                      {selectedValue}
                  </span>
              </div>

              <svg viewBox="0 0 520 330" className="h-[350px] w-full" role="img" aria-label={`${selectedLabel} on real ${implementDisplayType} view`}>
                  <defs>
                      <pattern id="real-implement-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                          <path d="M30 0H0V30" fill="none" stroke={gridStroke} strokeWidth="1" />
                      </pattern>
                      <marker id="implement-measure-arrow" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto-start-reverse">
                          <path d="M0 0L7 3.5L0 7Z" fill={selectedColor} />
                      </marker>
                  </defs>
                  <rect width="520" height="330" fill="url(#real-implement-grid)" />
                  <g key={`${getImplementAssetKey(implementSettings)}-${implementMeasureFocus}`} style={{ animation: 'implementMeasureIn 220ms ease-out' }}>
                      <image href={getImplementAsset(implementSettings)} x="38" y="36" width="444" height="220" preserveAspectRatio="xMidYMid meet" />
                      <line x1="260" y1="28" x2="260" y2="300" stroke={mutedColor} strokeDasharray="6 5" opacity="0.42" />
                      <circle cx="260" cy="246" r="6" fill={panelFill} stroke={selectedColor} strokeWidth="2.5" />
                      <text x="270" y="250" fontSize="8" fontWeight="900" fill={mutedColor}>HITCH DATUM</text>

                      {selectedMode === 'width' && (
                          <>
                              <line x1="82" y1="276" x2="438" y2="276" stroke={selectedColor} strokeWidth="3.5" markerStart="url(#implement-measure-arrow)" markerEnd="url(#implement-measure-arrow)" />
                              <MeasureLabel x={260} y={298} />
                          </>
                      )}
                      {selectedMode === 'overall' && (
                          <>
                              <line x1="58" y1="292" x2="462" y2="292" stroke={selectedColor} strokeWidth="3.5" markerStart="url(#implement-measure-arrow)" markerEnd="url(#implement-measure-arrow)" />
                              <MeasureLabel x={260} y={270} />
                          </>
                      )}
                      {selectedMode === 'length' && (
                          <>
                              <line x1="62" y1="66" x2="62" y2="246" stroke={selectedColor} strokeWidth="3.5" markerStart="url(#implement-measure-arrow)" markerEnd="url(#implement-measure-arrow)" />
                              <line x1="62" y1="246" x2="250" y2="246" stroke={selectedColor} strokeDasharray="5 4" opacity="0.65" />
                              <MeasureLabel x={112} y={158} />
                          </>
                      )}
                      {selectedMode === 'offset' && (
                          <>
                              <line x1="260" y1="278" x2={260 + offsetPx} y2="278" stroke={selectedColor} strokeWidth="3.5" markerEnd="url(#implement-measure-arrow)" />
                              <circle cx={260 + offsetPx} cy="278" r="6" fill={panelFill} stroke={selectedColor} strokeWidth="2.5" />
                              <MeasureLabel x={260} y={304} />
                          </>
                      )}
                      {selectedMode === 'overlap' && (
                          <>
                              <rect x="72" y="250" width="28" height="42" rx="8" fill={selectedColor} opacity="0.2" stroke={selectedColor} />
                              <rect x="420" y="250" width="28" height="42" rx="8" fill={selectedColor} opacity="0.2" stroke={selectedColor} />
                              <MeasureLabel x={260} y={282} />
                          </>
                      )}
                      {selectedMode === 'sections' && (
                          <>
                              {Array.from({ length: sectionCount }).map((_, index) => (
                                  <rect key={index} x={80 + index * sectionWidthPx} y="270" width={Math.max(5, sectionWidthPx - 3)} height="24" rx="4" fill={selectedColor} opacity={0.22 + (index % 2) * 0.12} stroke={selectedColor} />
                              ))}
                              <MeasureLabel x={260} y={244} />
                          </>
                      )}
                      {selectedMode === 'rows' && (
                          <>
                              {Array.from({ length: Math.min(12, sectionCount * 2) }).map((_, index, items) => (
                                  <line key={index} x1={92 + index * (336 / Math.max(1, items.length - 1))} y1="260" x2={92 + index * (336 / Math.max(1, items.length - 1))} y2="296" stroke={selectedColor} strokeWidth="2.5" />
                              ))}
                              <MeasureLabel x={260} y={238} />
                          </>
                      )}
                      {selectedMode === 'transportWidth' && (
                          <>
                              <line x1="126" y1="286" x2="394" y2="286" stroke={selectedColor} strokeWidth="3.5" strokeDasharray="8 5" markerStart="url(#implement-measure-arrow)" markerEnd="url(#implement-measure-arrow)" />
                              <MeasureLabel x={260} y={258} />
                          </>
                      )}
                      {selectedMode === 'transportLength' && (
                          <>
                              <line x1="456" y1="72" x2="456" y2="246" stroke={selectedColor} strokeWidth="3.5" strokeDasharray="8 5" markerStart="url(#implement-measure-arrow)" markerEnd="url(#implement-measure-arrow)" />
                              <MeasureLabel x={408} y={158} />
                          </>
                      )}
                      {selectedMode === 'depth' && (
                          <>
                              <line x1="428" y1="238" x2="428" y2="294" stroke={selectedColor} strokeWidth="3.5" markerStart="url(#implement-measure-arrow)" markerEnd="url(#implement-measure-arrow)" />
                              <MeasureLabel x={372} y={276} />
                          </>
                      )}
                      {selectedMode === 'mass' && <MeasureLabel x={260} y={282} />}
                      {selectedMode === 'capacity' && (
                          <>
                              <circle cx="260" cy="144" r="42" fill={selectedColor} opacity="0.12" stroke={selectedColor} strokeWidth="2.5" strokeDasharray="7 5" />
                              <MeasureLabel x={260} y={205} />
                          </>
                      )}
                      {selectedMode === 'timing' && (
                          <>
                              <circle cx="260" cy="246" r="30" fill="none" stroke={selectedColor} strokeWidth="4" style={{ animation: 'implementTimingPulse 1.1s ease-in-out infinite' }} />
                              <MeasureLabel x={260} y={194} />
                          </>
                      )}
                  </g>
              </svg>

              <div className={`flex items-center gap-2 border-t ${t.border} px-3.5 py-2.5`}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: selectedColor }} />
                  <span className={`text-[9px] font-bold ${t.textSub}`}>Select a value on the right · the implement reference updates automatically</span>
              </div>
          </div>
      );
  };

  const GnssAxisField = ({ field, axis, label, value, color, hint, unit = 'm' }) => {
      const active = vehicleMeasureFocus === field;
      const normalizedValue = Number.isFinite(Number(value)) ? Math.round(Number(value) * 1000) / 1000 : 0;
      return (
          <label
              className={`flex min-w-0 cursor-text items-center gap-3 border-b ${t.border} px-3 py-2.5 last:border-b-0 transition-colors ${active ? 'bg-blue-500/5' : ''}`}
              style={active ? { boxShadow: `inset 3px 0 0 ${color}` } : undefined}
              onClick={() => setVehicleMeasureFocus(field)}
          >
              <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-black text-white shadow-sm"
                  style={{ backgroundColor: color }}
              >
                  {axis}
              </span>
              <span className="min-w-0 flex-1">
                  <span className={`block text-[10px] font-black uppercase tracking-wide ${t.textMain}`}>{label}</span>
                  <span className={`block truncate text-[9px] ${t.textDim}`}>{hint}</span>
              </span>
              <span className={`flex w-[88px] shrink-0 items-center rounded-lg border ${active ? 'border-blue-500/40' : t.borderCard} ${t.bgInput} px-2.5`}>
                  <input
                      type="number"
                      step={unit === '°' ? '0.1' : '0.01'}
                      value={normalizedValue}
                      onFocus={() => setVehicleMeasureFocus(field)}
                      onChange={(event) => handleVehicleChange(field, parseFloat(event.target.value) || 0)}
                      className={`h-9 min-w-0 flex-1 bg-transparent text-right text-sm font-black outline-none ${t.textMain}`}
                  />
                  <span className={`ml-1 text-[9px] font-black uppercase ${t.textDim}`}>{unit}</span>
              </span>
          </label>
      );
  };

  const GnssAngleField = ({ field, axis, label, value, color }) => {
      const active = vehicleMeasureFocus === field;
      return (
          <label
              className={`min-w-0 cursor-text rounded-xl border p-2.5 transition-colors ${active ? 'bg-blue-500/5' : `${t.borderCard} ${theme === 'dark' ? 'bg-slate-900/50' : 'bg-white'}`}`}
              style={active ? { borderColor: color, boxShadow: `0 0 0 1px ${color}22` } : undefined}
              onClick={() => setVehicleMeasureFocus(field)}
          >
              <span className="flex items-center gap-1.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-md text-[8px] font-black text-white" style={{ backgroundColor: color }}>{axis}</span>
                  <span className={`truncate text-[9px] font-black uppercase ${t.textSub}`}>{label}</span>
              </span>
              <span className="mt-2 flex items-end gap-1">
                  <input
                      type="number"
                      step="0.1"
                      value={Number.isFinite(Number(value)) ? Math.round(Number(value) * 10) / 10 : 0}
                      onFocus={() => setVehicleMeasureFocus(field)}
                      onChange={(event) => handleVehicleChange(field, parseFloat(event.target.value) || 0)}
                      className={`min-w-0 flex-1 bg-transparent text-lg font-black leading-none outline-none ${t.textMain}`}
                  />
                  <span className={`text-[10px] font-black ${t.textDim}`}>°</span>
              </span>
          </label>
      );
  };

  const GnssMountingDiagram = () => {
      const xColor = '#2563eb';
      const yColor = '#8b5cf6';
      const zColor = '#16a34a';
      const baselineColor = '#f59e0b';
      const yawColor = '#f97316';
      const rollColor = '#06b6d4';
      const pitchColor = '#ec4899';
      const gridColor = theme === 'dark' ? '#1e293b' : '#e2e8f0';
      const bodyFill = theme === 'dark' ? '#172554' : '#dbeafe';
      const bodyStroke = theme === 'dark' ? '#60a5fa' : '#2563eb';
      const wheelFill = theme === 'dark' ? '#475569' : '#334155';
      const labelColor = theme === 'dark' ? '#cbd5e1' : '#334155';
      const panelFill = theme === 'dark' ? '#020617' : '#f8fafc';
      const xValue = Number(vehicleSettings.antennaToRearAxle || 0);
      const yValue = Number(vehicleSettings.antennaOffset || 0);
      const zValue = Number(vehicleSettings.antennaHeight || 0);
      const baselineValue = Math.max(0.2, Number(vehicleSettings.gnssBaseline || 1.2));
      const pairCenterX = 160 + Math.max(-42, Math.min(42, yValue * 34));
      const pairCenterY = 151 - Math.max(18, Math.min(102, xValue * 52));
      const baselinePixels = Math.max(58, Math.min(112, baselineValue * 62));
      const antennaAX = pairCenterX - baselinePixels / 2;
      const antennaBX = pairCenterX + baselinePixels / 2;
      const receiverZ = 101 - Math.max(48, Math.min(78, zValue * 20));
      const focusInfo = {
          antennaToRearAxle: { label: 'Fore-aft X', value: `${xValue.toFixed(2)} m`, color: xColor },
          antennaOffset: { label: 'Lateral Y', value: `${yValue.toFixed(2)} m`, color: yColor },
          antennaHeight: { label: 'Height Z', value: `${zValue.toFixed(2)} m`, color: zColor },
          gnssBaseline: { label: 'Antenna baseline B', value: `${baselineValue.toFixed(2)} m`, color: baselineColor },
          gnssHeadingOffset: { label: 'Heading / yaw', value: `${Number(vehicleSettings.gnssHeadingOffset || 0).toFixed(1)}°`, color: yawColor },
          gnssRollOffset: { label: 'Roll', value: `${Number(vehicleSettings.gnssRollOffset || 0).toFixed(1)}°`, color: rollColor },
          gnssPitchOffset: { label: 'Pitch', value: `${Number(vehicleSettings.gnssPitchOffset || 0).toFixed(1)}°`, color: pitchColor }
      };
      const selected = focusInfo[vehicleMeasureFocus] || focusInfo.gnssBaseline;
      const lineStyle = (field, color) => ({
          stroke: color,
          strokeWidth: vehicleMeasureFocus === field ? 3.5 : 2,
          opacity: vehicleMeasureFocus === field ? 1 : 0.45
      });

      return (
          <div className={`overflow-hidden rounded-2xl border ${t.borderCard} ${theme === 'dark' ? 'bg-slate-950' : 'bg-white'}`}>
              <div className={`flex items-center justify-between gap-3 border-b ${t.border} px-4 py-3`}>
                  <div className="min-w-0">
                      <div className="flex items-center gap-2">
                          <div className={`text-[9px] font-black uppercase tracking-wider ${t.textSub}`}>Dual-antenna heading system</div>
                          <span className="rounded-md bg-amber-500/12 px-1.5 py-0.5 text-[8px] font-black uppercase text-amber-500">2 ANT · Horizontal</span>
                      </div>
                      <div className={`truncate text-sm font-black ${t.textMain}`}>2 × {vehicleSettings.gnssReceiverModel || 'GNSS receiver'} · {vehicleSettings.gnssMountPosition || 'Cab roof crossbar'}</div>
                  </div>
                  <span className="shrink-0 rounded-lg px-2.5 py-1.5 text-right" style={{ backgroundColor: `${selected.color}14` }}>
                      <span className="block text-[8px] font-black uppercase" style={{ color: selected.color }}>{selected.label}</span>
                      <span className={`block text-xs font-black ${t.textMain}`}>{selected.value}</span>
                  </span>
              </div>

              <div className="grid grid-cols-[minmax(0,1.25fr)_minmax(190px,0.75fr)] gap-2.5 p-3">
                  <div className={`overflow-hidden rounded-xl border ${t.borderCard}`} style={{ backgroundColor: panelFill }}>
                      <div className={`flex items-center justify-between border-b ${t.border} px-3 py-2`}>
                          <span className={`text-[9px] font-black uppercase ${t.textSub}`}>Top view · Pair center X / Y</span>
                          <span className={`text-[8px] font-bold ${t.textDim}`}>Heading is perpendicular to baseline</span>
                      </div>
                      <svg viewBox="0 0 320 205" className="h-[250px] w-full" role="img" aria-label="Top view of horizontal dual GNSS antennas A and B">
                          <defs>
                              <pattern id="gnss-grid-top" width="20" height="20" patternUnits="userSpaceOnUse">
                                  <path d="M20 0H0V20" fill="none" stroke={gridColor} strokeWidth="1" />
                              </pattern>
                              <marker id="gnss-arrow-x" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto-start-reverse"><path d="M0 0L6 3L0 6Z" fill={xColor} /></marker>
                              <marker id="gnss-arrow-y" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto-start-reverse"><path d="M0 0L6 3L0 6Z" fill={yColor} /></marker>
                              <marker id="gnss-arrow-baseline" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto-start-reverse"><path d="M0 0L6 3L0 6Z" fill={baselineColor} /></marker>
                          </defs>
                          <rect width="320" height="205" fill="url(#gnss-grid-top)" />
                          <line x1="160" y1="12" x2="160" y2="190" stroke={gridColor} strokeDasharray="5 4" />
                          <rect x="83" y="32" width="28" height="48" rx="9" fill={wheelFill} />
                          <rect x="209" y="32" width="28" height="48" rx="9" fill={wheelFill} />
                          <rect x="77" y="128" width="35" height="56" rx="10" fill={wheelFill} />
                          <rect x="208" y="128" width="35" height="56" rx="10" fill={wheelFill} />
                          <path d="M132 25H188L198 77V159L184 180H136L122 159V77L132 25Z" fill={bodyFill} stroke={bodyStroke} strokeWidth="2" />
                          <rect x="131" y="75" width="58" height="59" rx="9" fill={theme === 'dark' ? '#0f2744' : '#eff6ff'} stroke={bodyStroke} strokeWidth="1.5" />
                          <line x1="70" y1="151" x2="250" y2="151" stroke={theme === 'dark' ? '#94a3b8' : '#64748b'} strokeWidth="2" />
                          <text x="74" y="166" fontSize="8" fontWeight="800" fill={labelColor}>REAR AXLE DATUM</text>

                          <line x1="264" y1="151" x2="264" y2={pairCenterY} {...lineStyle('antennaToRearAxle', xColor)} markerStart="url(#gnss-arrow-x)" markerEnd="url(#gnss-arrow-x)" />
                          <rect x="270" y={(151 + pairCenterY) / 2 - 10} width="44" height="20" rx="6" fill={theme === 'dark' ? '#0f172a' : '#ffffff'} stroke={xColor} />
                          <text x="292" y={(151 + pairCenterY) / 2 + 4} textAnchor="middle" fontSize="9" fontWeight="900" fill={xColor}>X {xValue.toFixed(2)}</text>

                          <line x1="160" y1={pairCenterY + 21} x2={pairCenterX} y2={pairCenterY + 21} {...lineStyle('antennaOffset', yColor)} markerEnd="url(#gnss-arrow-y)" />
                          <text x={Math.max(35, Math.min(285, (160 + pairCenterX) / 2))} y={pairCenterY + 34} textAnchor="middle" fontSize="9" fontWeight="900" fill={yColor}>Y {yValue.toFixed(2)}</text>

                          <line x1={antennaAX} y1={pairCenterY} x2={antennaBX} y2={pairCenterY} {...lineStyle('gnssBaseline', baselineColor)} markerStart="url(#gnss-arrow-baseline)" markerEnd="url(#gnss-arrow-baseline)" />
                          <rect x={pairCenterX - 29} y={pairCenterY - 32} width="58" height="18" rx="6" fill={theme === 'dark' ? '#0f172a' : '#ffffff'} stroke={baselineColor} />
                          <text x={pairCenterX} y={pairCenterY - 20} textAnchor="middle" fontSize="8.5" fontWeight="900" fill={baselineColor}>B {baselineValue.toFixed(2)} m</text>

                          <circle cx={antennaAX} cy={pairCenterY} r="10" fill={theme === 'dark' ? '#020617' : '#ffffff'} stroke={baselineColor} strokeWidth="3" />
                          <circle cx={antennaAX} cy={pairCenterY} r="3" fill={baselineColor} />
                          <circle cx={antennaBX} cy={pairCenterY} r="10" fill={theme === 'dark' ? '#020617' : '#ffffff'} stroke={baselineColor} strokeWidth="3" />
                          <circle cx={antennaBX} cy={pairCenterY} r="3" fill={baselineColor} />
                          <text x={antennaAX} y={pairCenterY + 15} textAnchor="middle" fontSize="7.5" fontWeight="900" fill={labelColor}>ANT A</text>
                          <text x={antennaBX} y={pairCenterY + 15} textAnchor="middle" fontSize="7.5" fontWeight="900" fill={labelColor}>ANT B</text>
                          <circle cx={pairCenterX} cy={pairCenterY} r="3.5" fill={yColor} />
                          <line x1={pairCenterX} y1={pairCenterY - 39} x2={pairCenterX} y2={pairCenterY - 59} stroke={rollColor} strokeWidth="2.5" markerEnd="url(#gnss-arrow-x)" />
                          <text x={pairCenterX + 7} y={pairCenterY - 48} fontSize="7.5" fontWeight="900" fill={rollColor}>HEADING</text>

                          <g transform="translate(20 28)">
                              <line x1="0" y1="28" x2="0" y2="0" stroke={xColor} strokeWidth="2.5" markerEnd="url(#gnss-arrow-x)" />
                              <line x1="0" y1="28" x2="28" y2="28" stroke={yColor} strokeWidth="2.5" markerEnd="url(#gnss-arrow-y)" />
                              <text x="-5" y="-3" fontSize="9" fontWeight="900" fill={xColor}>X</text>
                              <text x="33" y="31" fontSize="9" fontWeight="900" fill={yColor}>Y</text>
                          </g>
                      </svg>
                  </div>

                  <div className="space-y-2.5">
                      <div className={`overflow-hidden rounded-xl border ${t.borderCard}`} style={{ backgroundColor: panelFill }}>
                          <div className={`border-b ${t.border} px-3 py-2`}>
                              <span className={`block text-[9px] font-black uppercase ${t.textSub}`}>Front view · B / Z</span>
                              <span className={`block text-[8px] font-bold ${t.textDim}`}>Two antennas mounted left ↔ right</span>
                          </div>
                          <svg viewBox="0 0 320 128" className="h-[156px] w-full" role="img" aria-label="Front view of two horizontal GNSS antennas and receiver height">
                              <defs>
                                  <marker id="gnss-arrow-z" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto-start-reverse"><path d="M0 0L6 3L0 6Z" fill={zColor} /></marker>
                                  <marker id="gnss-arrow-b-front" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto-start-reverse"><path d="M0 0L6 3L0 6Z" fill={baselineColor} /></marker>
                              </defs>
                              <line x1="18" y1="105" x2="302" y2="105" stroke={gridColor} strokeWidth="2" />
                              <rect x="58" y="78" width="42" height="27" rx="8" fill={wheelFill} />
                              <rect x="220" y="78" width="42" height="27" rx="8" fill={wheelFill} />
                              <path d="M103 100V62L123 42H197L217 62V100Z" fill={bodyFill} stroke={bodyStroke} strokeWidth="2" />
                              <rect x="126" y="48" width="68" height="34" rx="5" fill={theme === 'dark' ? '#0f2744' : '#eff6ff'} stroke={bodyStroke} />
                              <line x1="91" y1={receiverZ} x2="229" y2={receiverZ} stroke={baselineColor} strokeWidth="4" strokeLinecap="round" />
                              <circle cx="112" cy={receiverZ} r="7" fill={theme === 'dark' ? '#020617' : '#fff'} stroke={baselineColor} strokeWidth="3" />
                              <circle cx="208" cy={receiverZ} r="7" fill={theme === 'dark' ? '#020617' : '#fff'} stroke={baselineColor} strokeWidth="3" />
                              <text x="112" y={receiverZ - 10} textAnchor="middle" fontSize="7.5" fontWeight="900" fill={labelColor}>A</text>
                              <text x="208" y={receiverZ - 10} textAnchor="middle" fontSize="7.5" fontWeight="900" fill={labelColor}>B</text>
                              <line x1="112" y1={receiverZ + 17} x2="208" y2={receiverZ + 17} {...lineStyle('gnssBaseline', baselineColor)} markerStart="url(#gnss-arrow-b-front)" markerEnd="url(#gnss-arrow-b-front)" />
                              <text x="160" y={receiverZ + 29} textAnchor="middle" fontSize="8" fontWeight="900" fill={baselineColor}>BASELINE {baselineValue.toFixed(2)} m</text>
                              <line x1="55" y1="105" x2="55" y2={receiverZ} {...lineStyle('antennaHeight', zColor)} markerStart="url(#gnss-arrow-z)" markerEnd="url(#gnss-arrow-z)" />
                              <rect x="65" y={(105 + receiverZ) / 2 - 10} width="52" height="20" rx="6" fill={theme === 'dark' ? '#0f172a' : '#fff'} stroke={zColor} />
                              <text x="91" y={(105 + receiverZ) / 2 + 4} textAnchor="middle" fontSize="9" fontWeight="900" fill={zColor}>Z {zValue.toFixed(2)}</text>
                          </svg>
                      </div>

                      <div className="grid grid-cols-3 gap-1.5">
                          {[
                              ['H', 'Yaw', vehicleSettings.gnssHeadingOffset, yawColor, 'gnssHeadingOffset'],
                              ['R', 'Roll', vehicleSettings.gnssRollOffset, rollColor, 'gnssRollOffset'],
                              ['P', 'Pitch', vehicleSettings.gnssPitchOffset, pitchColor, 'gnssPitchOffset']
                          ].map(([axis, label, value, color, field]) => (
                              <button
                                  key={field}
                                  type="button"
                                  onClick={() => setVehicleMeasureFocus(field)}
                                  className={`min-w-0 rounded-lg border px-1.5 py-2 text-center ${vehicleMeasureFocus === field ? 'bg-blue-500/5' : t.borderCard}`}
                                  style={vehicleMeasureFocus === field ? { borderColor: color } : undefined}
                              >
                                  <span className="mx-auto flex h-6 w-6 items-center justify-center rounded-md text-[8px] font-black text-white" style={{ backgroundColor: color }}>{axis}</span>
                                  <span className={`mt-1 block text-[8px] font-black uppercase ${t.textSub}`}>{label}</span>
                                  <span className={`block text-[11px] font-black ${t.textMain}`}>{Number(value || 0).toFixed(1)}°</span>
                              </button>
                          ))}
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  const GnssLiveIllustration = () => {
      const colors = {
          baseline: '#f59e0b',
          x: '#2563eb',
          y: '#8b5cf6',
          z: '#16a34a',
          heading: '#06b6d4',
          roll: '#ec4899',
          pitch: '#f97316'
      };
      const baseline = Math.max(0.2, Number(vehicleSettings.gnssBaseline || 1.2));
      const xValue = Number(vehicleSettings.antennaToRearAxle || 0);
      const yValue = Number(vehicleSettings.antennaOffset || 0);
      const zValue = Number(vehicleSettings.antennaHeight || 0);
      const baselinePx = Math.max(82, Math.min(170, baseline * 78));
      const barHeightY = Math.max(44, Math.min(70, 60 - (zValue - 3) * 8));
      const topPairX = 260 + Math.max(-58, Math.min(58, yValue * 70));
      const topPairY = 235 - Math.max(50, Math.min(125, xValue * 60));
      const sideRearAxleX = 160;
      const sideAntennaX = 245 + Math.max(-35, Math.min(55, (xValue - 1.2) * 45));
      const sideAntennaY = barHeightY - 8;
      const vehicleAssetPrefix = vehicleSettings.type === 'Articulated Tractor'
          ? 'articulated'
          : vehicleSettings.type === 'Self Propelled'
              ? 'sprayer'
              : 'tractor';
      const realVehicleLabel = vehicleSettings.label || vehicleSettings.type || 'Vehicle';
      const vehicleImage = (view) => `src/assets/vehicles/${vehicleAssetPrefix}-${view}.png`;
      const activeView = ['gnssBaseline', 'antennaHeight', 'gnssRollOffset'].includes(vehicleMeasureFocus)
          ? 'front'
          : ['antennaToRearAxle', 'gnssPitchOffset'].includes(vehicleMeasureFocus)
              ? 'side'
              : 'top';
      const selectedMap = {
          gnssBaseline: ['Antenna baseline', `B ${baseline.toFixed(2)} m`, colors.baseline],
          antennaToRearAxle: ['Pair center to rear axle', `X ${xValue.toFixed(2)} m`, colors.x],
          antennaOffset: ['Pair center lateral offset', `Y ${yValue.toFixed(2)} m`, colors.y],
          antennaHeight: ['Shared antenna height', `Z ${zValue.toFixed(2)} m`, colors.z],
          gnssHeadingOffset: ['Baseline heading correction', `${Number(vehicleSettings.gnssHeadingOffset || 0).toFixed(1)}°`, colors.heading],
          gnssRollOffset: ['Crossbar roll correction', `${Number(vehicleSettings.gnssRollOffset || 0).toFixed(1)}°`, colors.roll],
          gnssPitchOffset: ['Crossbar pitch correction', `${Number(vehicleSettings.gnssPitchOffset || 0).toFixed(1)}°`, colors.pitch]
      };
      const selected = selectedMap[vehicleMeasureFocus] || selectedMap.gnssBaseline;
      const panelFill = theme === 'dark' ? '#020617' : '#f8fafc';
      const gridStroke = theme === 'dark' ? '#1e293b' : '#e2e8f0';
      const textColor = theme === 'dark' ? '#cbd5e1' : '#334155';
      const mutedColor = theme === 'dark' ? '#64748b' : '#94a3b8';
      const primaryIsLeft = (vehicleSettings.gnssPrimarySide || 'Left / ANT A').startsWith('Left');
      const focusStroke = (field, color) => vehicleMeasureFocus === field ? color : mutedColor;
      const focusWidth = (field) => vehicleMeasureFocus === field ? 4 : 2;

      const AntennaPair = ({ centerX = 0, centerY = 0, scale = 1 }) => (
          <g
              style={{
                  transform: `translate(${centerX}px, ${centerY}px) scale(${scale})`,
                  transformOrigin: '0 0',
                  transition: 'transform 320ms cubic-bezier(0.22, 1, 0.36, 1)'
              }}
          >
              <line x1={-baselinePx / 2} y1="0" x2={baselinePx / 2} y2="0" stroke={colors.baseline} strokeWidth="5" strokeLinecap="round" />
              <g style={{ transform: `translateX(${-baselinePx / 2}px)`, transition: 'transform 320ms cubic-bezier(0.22, 1, 0.36, 1)' }}>
                  {primaryIsLeft && <circle cx="0" cy="0" r="16" fill="none" stroke={colors.baseline} strokeWidth="2" opacity="0.4" style={{ animation: 'gnssAntennaPulse 1.7s ease-out infinite' }} />}
                  <circle cx="0" cy="0" r="11" fill={panelFill} stroke={colors.baseline} strokeWidth="4" />
                  <circle cx="0" cy="0" r="3" fill={colors.baseline} />
                  <text x="0" y="24" textAnchor="middle" fontSize="9" fontWeight="900" fill={textColor}>ANT A</text>
                  <text x="0" y="35" textAnchor="middle" fontSize="7" fontWeight="800" fill={primaryIsLeft ? colors.baseline : mutedColor}>{primaryIsLeft ? 'PRIMARY' : 'SECONDARY'}</text>
              </g>
              <g style={{ transform: `translateX(${baselinePx / 2}px)`, transition: 'transform 320ms cubic-bezier(0.22, 1, 0.36, 1)' }}>
                  {!primaryIsLeft && <circle cx="0" cy="0" r="16" fill="none" stroke={colors.baseline} strokeWidth="2" opacity="0.4" style={{ animation: 'gnssAntennaPulse 1.7s ease-out infinite' }} />}
                  <circle cx="0" cy="0" r="11" fill={panelFill} stroke={colors.baseline} strokeWidth="4" />
                  <circle cx="0" cy="0" r="3" fill={colors.baseline} />
                  <text x="0" y="24" textAnchor="middle" fontSize="9" fontWeight="900" fill={textColor}>ANT B</text>
                  <text x="0" y="35" textAnchor="middle" fontSize="7" fontWeight="800" fill={!primaryIsLeft ? colors.baseline : mutedColor}>{!primaryIsLeft ? 'PRIMARY' : 'SECONDARY'}</text>
              </g>
              <circle cx="0" cy="0" r="4" fill={colors.y} />
          </g>
      );

      return (
          <div className={`overflow-hidden rounded-2xl border ${t.borderCard} ${theme === 'dark' ? 'bg-slate-950' : 'bg-white'}`}>
              <style>{`
                  @keyframes gnssViewIn {
                      from { opacity: 0; transform: translateY(8px); }
                      to { opacity: 1; transform: translateY(0); }
                  }
                  @keyframes gnssAntennaPulse {
                      0% { r: 12; opacity: .55; }
                      100% { r: 23; opacity: 0; }
                  }
              `}</style>
              <div className={`flex flex-wrap items-center justify-between gap-3 border-b ${t.border} px-4 py-3`}>
                  <div className="min-w-0">
                      <div className="flex items-center gap-2">
                          <div className={`text-[9px] font-black uppercase tracking-wider ${t.textSub}`}>Live vehicle reference</div>
                          <span className="rounded-md bg-amber-500/12 px-1.5 py-0.5 text-[8px] font-black uppercase text-amber-500">ANT A ↔ ANT B</span>
                      </div>
                      <div className={`truncate text-sm font-black ${t.textMain}`}>{realVehicleLabel} · 2 × {vehicleSettings.gnssReceiverModel || 'GNSS receiver'}</div>
                  </div>
                  <div className={`flex rounded-xl p-1 ${theme === 'dark' ? 'bg-slate-900' : 'bg-gray-100'}`}>
                      {[
                          ['front', 'Front · B/Z', 'gnssBaseline'],
                          ['side', 'Side · X', 'antennaToRearAxle'],
                          ['top', 'Top · Y/H', 'antennaOffset']
                      ].map(([view, label, focus]) => (
                          <button
                              key={view}
                              type="button"
                              onClick={() => setVehicleMeasureFocus(focus)}
                              className={`rounded-lg px-2.5 py-1.5 text-[8px] font-black ${activeView === view ? 'bg-blue-600 text-white shadow-sm' : t.textSub}`}
                          >
                              {label}
                          </button>
                      ))}
                  </div>
              </div>

              <div className="p-3">
                  <div className={`relative overflow-hidden rounded-xl border ${t.borderCard}`} style={{ backgroundColor: panelFill }}>
                      <div className={`absolute left-3 top-3 z-10 rounded-xl border ${t.borderCard} ${theme === 'dark' ? 'bg-slate-950/90' : 'bg-white/92'} px-3 py-2 shadow-sm backdrop-blur`}>
                          <div className={`text-[8px] font-black uppercase ${t.textSub}`}>Selected measurement</div>
                          <div className="mt-0.5 flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: selected[2] }} />
                              <span className={`text-[10px] font-black ${t.textMain}`}>{selected[0]}</span>
                          </div>
                          <div className="mt-0.5 text-lg font-black leading-none" style={{ color: selected[2] }}>{selected[1]}</div>
                      </div>
                      <div className={`absolute right-3 top-3 z-10 text-right text-[8px] font-bold ${t.textDim}`}>
                          <div>{activeView === 'front' ? 'FRONT VIEW' : activeView === 'side' ? 'RIGHT SIDE VIEW' : 'TOP VIEW'}</div>
                          <div>Values update live</div>
                      </div>

                      <svg viewBox="0 0 520 300" className="h-[310px] w-full" role="img" aria-label={`Real ${activeView} tractor view with horizontal dual GNSS antennas`}>
                          <defs>
                              <pattern id="gnss-live-grid" width="28" height="28" patternUnits="userSpaceOnUse">
                                  <path d="M28 0H0V28" fill="none" stroke={gridStroke} strokeWidth="1" />
                              </pattern>
                              <marker id="live-arrow-x" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto-start-reverse"><path d="M0 0L7 3.5L0 7Z" fill={colors.x} /></marker>
                              <marker id="live-arrow-y" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto-start-reverse"><path d="M0 0L7 3.5L0 7Z" fill={colors.y} /></marker>
                              <marker id="live-arrow-z" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto-start-reverse"><path d="M0 0L7 3.5L0 7Z" fill={colors.z} /></marker>
                              <marker id="live-arrow-b" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto-start-reverse"><path d="M0 0L7 3.5L0 7Z" fill={colors.baseline} /></marker>
                              <marker id="live-arrow-heading" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto-start-reverse"><path d="M0 0L7 3.5L0 7Z" fill={colors.heading} /></marker>
                          </defs>
                          <rect width="520" height="300" fill="url(#gnss-live-grid)" />

                          {activeView === 'front' && (
                              <g key="front" style={{ animation: 'gnssViewIn 240ms ease-out' }}>
                                  <line x1="42" y1="257" x2="478" y2="257" stroke={gridStroke} strokeWidth="3" />
                                  <image
                                      href={vehicleImage('front')}
                                      x="130"
                                      y="20"
                                      width="260"
                                      height="260"
                                      preserveAspectRatio="xMidYMid meet"
                                      style={{ filter: theme === 'dark' ? 'drop-shadow(0 10px 10px rgba(0,0,0,.34))' : 'drop-shadow(0 9px 8px rgba(15,23,42,.18))' }}
                                  />
                                  <line x1="260" y1="94" x2="260" y2="252" stroke={gridStroke} strokeDasharray="6 5" />
                                  <g style={{ transform: `translateY(${barHeightY}px)`, transition: 'transform 320ms cubic-bezier(0.22, 1, 0.36, 1)' }}>
                                      <line x1="170" y1="0" x2="350" y2="0" stroke={colors.baseline} strokeWidth="6" strokeLinecap="round" opacity="0.72" />
                                      <AntennaPair centerX={260} centerY={0} />
                                      <line x1={260 - baselinePx / 2} y1="52" x2={260 + baselinePx / 2} y2="52" stroke={focusStroke('gnssBaseline', colors.baseline)} strokeWidth={focusWidth('gnssBaseline')} markerStart="url(#live-arrow-b)" markerEnd="url(#live-arrow-b)" />
                                      <rect x="225" y="60" width="70" height="22" rx="7" fill={panelFill} stroke={colors.baseline} />
                                      <text x="260" y="75" textAnchor="middle" fontSize="10" fontWeight="900" fill={colors.baseline}>B {baseline.toFixed(2)} m</text>
                                  </g>
                                  <line x1="66" y1="257" x2="66" y2={barHeightY} stroke={focusStroke('antennaHeight', colors.z)} strokeWidth={focusWidth('antennaHeight')} markerStart="url(#live-arrow-z)" markerEnd="url(#live-arrow-z)" />
                                  <rect x="78" y={(257 + barHeightY) / 2 - 12} width="72" height="24" rx="7" fill={panelFill} stroke={colors.z} />
                                  <text x="114" y={(257 + barHeightY) / 2 + 4} textAnchor="middle" fontSize="10" fontWeight="900" fill={colors.z}>Z {zValue.toFixed(2)} m</text>
                                  <text x="260" y="284" textAnchor="middle" fontSize="9" fontWeight="800" fill={mutedColor}>FRONT REFERENCE · ANT A / B ACROSS CAB ROOF</text>
                              </g>
                          )}

                          {activeView === 'side' && (
                              <g key="side" style={{ animation: 'gnssViewIn 240ms ease-out' }}>
                                  <line x1="38" y1="257" x2="482" y2="257" stroke={gridStroke} strokeWidth="3" />
                                  <image
                                      href={vehicleImage('side')}
                                      x="90"
                                      y="-10"
                                      width="340"
                                      height="340"
                                      preserveAspectRatio="xMidYMid meet"
                                      style={{ filter: theme === 'dark' ? 'drop-shadow(0 10px 10px rgba(0,0,0,.34))' : 'drop-shadow(0 9px 8px rgba(15,23,42,.18))' }}
                                  />
                                  <line x1={sideRearAxleX} y1="142" x2={sideRearAxleX} y2="257" stroke={colors.x} strokeDasharray="5 4" opacity="0.65" />
                                  <circle cx={sideRearAxleX} cy="211" r="7" fill={colors.x} stroke={panelFill} strokeWidth="3" />
                                  <text x={sideRearAxleX} y="278" textAnchor="middle" fontSize="9" fontWeight="900" fill={colors.x}>REAR AXLE DATUM</text>
                                  <g style={{ transform: `translate(${sideAntennaX}px, ${sideAntennaY}px)`, transition: 'transform 320ms cubic-bezier(0.22, 1, 0.36, 1)' }}>
                                      <line x1="-42" y1="0" x2="42" y2="0" stroke={colors.baseline} strokeWidth="6" strokeLinecap="round" />
                                      <circle cx="-5" cy="0" r="10" fill={panelFill} stroke={colors.baseline} strokeWidth="3" />
                                      <circle cx="5" cy="0" r="10" fill={panelFill} stroke={colors.baseline} strokeWidth="3" />
                                      <text x="0" y="-16" textAnchor="middle" fontSize="9" fontWeight="900" fill={colors.baseline}>ANT A / B</text>
                                  </g>
                                  <line x1={sideRearAxleX} y1="116" x2={sideAntennaX} y2="116" stroke={focusStroke('antennaToRearAxle', colors.x)} strokeWidth={focusWidth('antennaToRearAxle')} markerStart="url(#live-arrow-x)" markerEnd="url(#live-arrow-x)" />
                                  <line x1={sideAntennaX} y1={sideAntennaY + 12} x2={sideAntennaX} y2="116" stroke={colors.x} strokeDasharray="4 4" opacity="0.55" />
                                  <line x1={sideRearAxleX} y1="116" x2={sideRearAxleX} y2="200" stroke={colors.x} strokeDasharray="4 4" opacity="0.55" />
                                  <rect x={(sideRearAxleX + sideAntennaX) / 2 - 38} y="124" width="76" height="24" rx="7" fill={panelFill} stroke={colors.x} />
                                  <text x={(sideRearAxleX + sideAntennaX) / 2} y="140" textAnchor="middle" fontSize="10" fontWeight="900" fill={colors.x}>X {xValue.toFixed(2)} m</text>
                                  <line x1="62" y1="257" x2="62" y2={sideAntennaY} stroke={colors.z} strokeWidth="2" opacity="0.5" markerStart="url(#live-arrow-z)" markerEnd="url(#live-arrow-z)" />
                              </g>
                          )}

                          {activeView === 'top' && (
                              <g key="top" style={{ animation: 'gnssViewIn 240ms ease-out' }}>
                                  <line x1="260" y1="28" x2="260" y2="280" stroke={gridStroke} strokeDasharray="6 5" />
                                  <image
                                      href={vehicleImage('top')}
                                      x="110"
                                      y="0"
                                      width="300"
                                      height="300"
                                      preserveAspectRatio="xMidYMid meet"
                                      style={{ filter: theme === 'dark' ? 'drop-shadow(0 10px 10px rgba(0,0,0,.34))' : 'drop-shadow(0 9px 8px rgba(15,23,42,.18))' }}
                                  />
                                  <line x1="118" y1="226" x2="402" y2="226" stroke={colors.x} strokeWidth="2.5" />
                                  <text x="121" y="242" fontSize="9" fontWeight="900" fill={colors.x}>REAR AXLE DATUM</text>
                                  <AntennaPair centerX={topPairX} centerY={topPairY} />
                                  <line x1="260" y1={topPairY + 50} x2={topPairX} y2={topPairY + 50} stroke={focusStroke('antennaOffset', colors.y)} strokeWidth={focusWidth('antennaOffset')} markerEnd="url(#live-arrow-y)" />
                                  <rect x={topPairX - 35} y={topPairY + 58} width="70" height="22" rx="7" fill={panelFill} stroke={colors.y} />
                                  <text x={topPairX} y={topPairY + 73} textAnchor="middle" fontSize="10" fontWeight="900" fill={colors.y}>Y {yValue.toFixed(2)} m</text>
                                  <line x1={topPairX} y1={topPairY - 18} x2={topPairX} y2={Math.max(22, topPairY - 70)} stroke={focusStroke('gnssHeadingOffset', colors.heading)} strokeWidth={focusWidth('gnssHeadingOffset')} markerEnd="url(#live-arrow-heading)" />
                                  <text x={topPairX + 9} y={Math.max(34, topPairY - 48)} fontSize="9" fontWeight="900" fill={colors.heading}>HEADING</text>
                                  <line x1="446" y1="226" x2="446" y2={topPairY} stroke={colors.x} strokeWidth="2" opacity="0.45" markerStart="url(#live-arrow-x)" markerEnd="url(#live-arrow-x)" />
                                  <text x="458" y={(226 + topPairY) / 2} fontSize="9" fontWeight="900" fill={colors.x}>X {xValue.toFixed(2)}</text>
                              </g>
                          )}
                      </svg>
                  </div>

                  <div className={`mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-xl border ${t.borderCard} px-3 py-2`}>
                      <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-green-500" />
                          <span className={`text-[9px] font-black ${t.textMain}`}>Illustration follows selected input automatically</span>
                      </div>
                      <div className={`text-[9px] font-bold ${t.textSub}`}>Primary: {vehicleSettings.gnssPrimarySide || 'Left / ANT A'} · Baseline {baseline.toFixed(2)} m</div>
                  </div>
              </div>
          </div>
      );
  };

  const RealVehicleMeasurementView = () => {
      const vehicleImage = (view) => getVehicleAsset(vehicleSettings, view);
      const value = (field, decimals = 2) => Number(vehicleSettings[field] || 0).toFixed(decimals);
      const measures = {
          wheelbase: ['Wheelbase', `${value('wheelbase')} m`, 'Chassis', '#2563eb', 'side'],
          turnRadius: ['Minimum turn radius', `${value('turnRadius')} m`, 'Chassis', '#2563eb', 'top'],
          frontAxleWidth: ['Front wheel track', `${value('frontAxleWidth')} m`, 'Chassis', '#2563eb', 'front'],
          rearAxleWidth: ['Rear wheel track', `${value('rearAxleWidth')} m`, 'Chassis', '#2563eb', 'front'],
          frontOverhang: ['Front overhang', `${value('frontOverhang')} m`, 'Chassis', '#2563eb', 'side'],
          rearOverhang: ['Rear overhang', `${value('rearOverhang')} m`, 'Chassis', '#2563eb', 'side'],
          overallHeight: ['Vehicle height', `${value('overallHeight')} m`, 'Chassis', '#2563eb', 'side'],
          gnssBaseline: ['Antenna baseline', `B ${value('gnssBaseline')} m`, 'Dual GNSS', '#f59e0b', 'front'],
          antennaToRearAxle: ['Pair center to rear axle', `X ${value('antennaToRearAxle')} m`, 'Dual GNSS', '#2563eb', 'side'],
          antennaOffset: ['Pair center lateral offset', `Y ${value('antennaOffset')} m`, 'Dual GNSS', '#8b5cf6', 'top'],
          antennaHeight: ['Shared antenna height', `Z ${value('antennaHeight')} m`, 'Dual GNSS', '#16a34a', 'front'],
          gnssHeadingOffset: ['Heading correction', `${value('gnssHeadingOffset', 1)}°`, 'Dual GNSS', '#06b6d4', 'top'],
          gnssRollOffset: ['Roll correction', `${value('gnssRollOffset', 1)}°`, 'Dual GNSS', '#ec4899', 'front'],
          gnssPitchOffset: ['Pitch correction', `${value('gnssPitchOffset', 1)}°`, 'Dual GNSS', '#f97316', 'side'],
          rearHitch: ['Rear axle to hitch', `X ${value('rearHitch')} m`, 'Hitch', '#7c3aed', 'side'],
          hitchOffset: ['Hitch lateral offset', `Y ${value('hitchOffset')} m`, 'Hitch', '#7c3aed', 'top'],
          hitchHeight: ['Hitch height', `Z ${value('hitchHeight')} m`, 'Hitch', '#7c3aed', 'side']
      };
      const selected = measures[vehicleMeasureFocus] || measures.wheelbase;
      const [selectedLabel, selectedValue, selectedGroup, selectedColor, activeView] = selected;
      const activeViewBox = activeView === 'front'
          ? vehicleMeasureFocus === 'antennaHeight' ? '40 0 440 330' : '100 0 320 330'
          : activeView === 'side'
              ? '40 0 440 330'
              : vehicleMeasureFocus === 'turnRadius' ? '150 20 330 290' : '150 10 220 310';
      const gridStroke = theme === 'dark' ? '#1e293b' : '#e2e8f0';
      const panelFill = theme === 'dark' ? '#020617' : '#ffffff';
      const textColor = theme === 'dark' ? '#e2e8f0' : '#0f172a';
      const mutedColor = theme === 'dark' ? '#64748b' : '#94a3b8';
      const antennaPairX = 260 + Math.max(-50, Math.min(50, Number(vehicleSettings.antennaOffset || 0) * 65));
      const hitchPointX = 260 + Math.max(-45, Math.min(45, Number(vehicleSettings.hitchOffset || 0) * 65));

      const MeasureLabel = ({ x, y, text = selectedValue, color = selectedColor }) => (
          <g>
              <rect x={x - 39} y={y - 12} width="78" height="24" rx="8" fill={panelFill} stroke={color} strokeWidth="1.5" />
              <text x={x} y={y + 4} textAnchor="middle" fontSize="10" fontWeight="900" fill={color}>{text}</text>
          </g>
      );

      return (
          <div className={`overflow-hidden rounded-2xl border ${t.borderCard} ${theme === 'dark' ? 'bg-slate-950' : 'bg-white'}`}>
              <style>{`
                  @keyframes realVehicleViewIn {
                      from { opacity: 0; transform: translateY(6px) scale(.985); }
                      to { opacity: 1; transform: translateY(0) scale(1); }
                  }
              `}</style>
              <div className={`flex items-center justify-between gap-3 border-b ${t.border} px-3.5 py-3`}>
                  <div className="min-w-0">
                      <div className={`text-[8px] font-black uppercase tracking-wider ${t.textSub}`}>{selectedGroup} reference</div>
                      <div className={`truncate text-sm font-black ${t.textMain}`}>{selectedLabel}</div>
                  </div>
                  <span className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-black" style={{ color: selectedColor, backgroundColor: `${selectedColor}14` }}>
                      {selectedValue}
                  </span>
              </div>

              <svg viewBox={activeViewBox} className="h-[350px] w-full" role="img" aria-label={`${selectedLabel} on real ${activeView} vehicle view`}>
                  <defs>
                      <pattern id="real-vehicle-grid" width="30" height="30" patternUnits="userSpaceOnUse">
                          <path d="M30 0H0V30" fill="none" stroke={gridStroke} strokeWidth="1" />
                      </pattern>
                      <marker id="real-measure-arrow" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto-start-reverse">
                          <path d="M0 0L7 3.5L0 7Z" fill={selectedColor} />
                      </marker>
                  </defs>
                  <rect width="520" height="330" fill="url(#real-vehicle-grid)" />

                  {activeView === 'front' && (
                      <g key={`front-${vehicleMeasureFocus}`} style={{ animation: 'realVehicleViewIn 220ms ease-out' }}>
                          <image href={vehicleImage('front')} x="125" y="30" width="270" height="270" preserveAspectRatio="xMidYMid meet" />
                          <line x1="52" y1="286" x2="468" y2="286" stroke={gridStroke} strokeWidth="2.5" />

                          {['frontAxleWidth', 'rearAxleWidth'].includes(vehicleMeasureFocus) && (
                              <>
                                  <line x1="155" y1="258" x2="365" y2="258" stroke={selectedColor} strokeWidth="3.5" markerStart="url(#real-measure-arrow)" markerEnd="url(#real-measure-arrow)" />
                                  <MeasureLabel x={260} y={226} />
                              </>
                          )}
                          {vehicleMeasureFocus === 'gnssBaseline' && (
                              <>
                                  <line x1="205" y1="72" x2="315" y2="72" stroke={selectedColor} strokeWidth="4" markerStart="url(#real-measure-arrow)" markerEnd="url(#real-measure-arrow)" />
                                  <circle cx="205" cy="72" r="8" fill={panelFill} stroke={selectedColor} strokeWidth="3" />
                                  <circle cx="315" cy="72" r="8" fill={panelFill} stroke={selectedColor} strokeWidth="3" />
                                  <MeasureLabel x={260} y={112} />
                              </>
                          )}
                          {vehicleMeasureFocus === 'antennaHeight' && (
                              <>
                                  <line x1="72" y1="286" x2="72" y2="72" stroke={selectedColor} strokeWidth="3.5" markerStart="url(#real-measure-arrow)" markerEnd="url(#real-measure-arrow)" />
                                  <line x1="72" y1="72" x2="210" y2="72" stroke={selectedColor} strokeDasharray="5 4" opacity="0.7" />
                                  <MeasureLabel x={118} y={180} />
                              </>
                          )}
                          {vehicleMeasureFocus === 'gnssRollOffset' && (
                              <>
                                  <line x1="203" y1="78" x2="317" y2="66" stroke={selectedColor} strokeWidth="4" strokeLinecap="round" />
                                  <circle cx="203" cy="78" r="7" fill={panelFill} stroke={selectedColor} strokeWidth="3" />
                                  <circle cx="317" cy="66" r="7" fill={panelFill} stroke={selectedColor} strokeWidth="3" />
                                  <MeasureLabel x={260} y={112} />
                              </>
                          )}
                      </g>
                  )}

                  {activeView === 'side' && (
                      <g key={`side-${vehicleMeasureFocus}`} style={{ animation: 'realVehicleViewIn 220ms ease-out' }}>
                          <image href={vehicleImage('side')} x="70" y="-10" width="380" height="380" preserveAspectRatio="xMidYMid meet" />
                          <line x1="42" y1="280" x2="478" y2="280" stroke={gridStroke} strokeWidth="2.5" />

                          {vehicleMeasureFocus === 'wheelbase' && (
                              <>
                                  <line x1="160" y1="262" x2="375" y2="262" stroke={selectedColor} strokeWidth="3.5" markerStart="url(#real-measure-arrow)" markerEnd="url(#real-measure-arrow)" />
                                  <line x1="160" y1="208" x2="160" y2="262" stroke={selectedColor} strokeDasharray="5 4" opacity="0.6" />
                                  <line x1="375" y1="208" x2="375" y2="262" stroke={selectedColor} strokeDasharray="5 4" opacity="0.6" />
                                  <MeasureLabel x={268} y={230} />
                              </>
                          )}
                          {vehicleMeasureFocus === 'frontOverhang' && (
                              <>
                                  <line x1="375" y1="232" x2="452" y2="232" stroke={selectedColor} strokeWidth="3.5" markerStart="url(#real-measure-arrow)" markerEnd="url(#real-measure-arrow)" />
                                  <MeasureLabel x={413} y={198} />
                              </>
                          )}
                          {vehicleMeasureFocus === 'rearOverhang' && (
                              <>
                                  <line x1="72" y1="232" x2="160" y2="232" stroke={selectedColor} strokeWidth="3.5" markerStart="url(#real-measure-arrow)" markerEnd="url(#real-measure-arrow)" />
                                  <MeasureLabel x={116} y={198} />
                              </>
                          )}
                          {vehicleMeasureFocus === 'overallHeight' && (
                              <>
                                  <line x1="58" y1="280" x2="58" y2="54" stroke={selectedColor} strokeWidth="3.5" markerStart="url(#real-measure-arrow)" markerEnd="url(#real-measure-arrow)" />
                                  <MeasureLabel x={106} y={166} />
                              </>
                          )}
                          {vehicleMeasureFocus === 'antennaToRearAxle' && (
                              <>
                                  <circle cx="160" cy="214" r="6" fill={selectedColor} stroke={panelFill} strokeWidth="2.5" />
                                  <circle cx="255" cy="58" r="8" fill={panelFill} stroke="#f59e0b" strokeWidth="3" />
                                  <line x1="160" y1="122" x2="255" y2="122" stroke={selectedColor} strokeWidth="3.5" markerStart="url(#real-measure-arrow)" markerEnd="url(#real-measure-arrow)" />
                                  <line x1="160" y1="122" x2="160" y2="205" stroke={selectedColor} strokeDasharray="5 4" opacity="0.65" />
                                  <line x1="255" y1="66" x2="255" y2="122" stroke={selectedColor} strokeDasharray="5 4" opacity="0.65" />
                                  <MeasureLabel x={207} y={150} />
                              </>
                          )}
                          {vehicleMeasureFocus === 'gnssPitchOffset' && (
                              <>
                                  <line x1="220" y1="64" x2="292" y2="54" stroke={selectedColor} strokeWidth="4" strokeLinecap="round" />
                                  <MeasureLabel x={256} y={101} />
                              </>
                          )}
                          {vehicleMeasureFocus === 'rearHitch' && (
                              <>
                                  <circle cx="160" cy="214" r="6" fill={selectedColor} stroke={panelFill} strokeWidth="2.5" />
                                  <circle cx="82" cy="220" r="6" fill={selectedColor} stroke={panelFill} strokeWidth="2.5" />
                                  <line x1="82" y1="190" x2="160" y2="190" stroke={selectedColor} strokeWidth="3.5" markerStart="url(#real-measure-arrow)" markerEnd="url(#real-measure-arrow)" />
                                  <MeasureLabel x={121} y={157} />
                              </>
                          )}
                          {vehicleMeasureFocus === 'hitchHeight' && (
                              <>
                                  <circle cx="82" cy="220" r="7" fill={selectedColor} stroke={panelFill} strokeWidth="2.5" />
                                  <line x1="55" y1="280" x2="55" y2="220" stroke={selectedColor} strokeWidth="3.5" markerStart="url(#real-measure-arrow)" markerEnd="url(#real-measure-arrow)" />
                                  <line x1="55" y1="220" x2="82" y2="220" stroke={selectedColor} strokeDasharray="5 4" />
                                  <MeasureLabel x={105} y={250} />
                              </>
                          )}
                      </g>
                  )}

                  {activeView === 'top' && (
                      <g key={`top-${vehicleMeasureFocus}`} style={{ animation: 'realVehicleViewIn 220ms ease-out' }}>
                          <image href={vehicleImage('top')} x="105" y="12" width="310" height="310" preserveAspectRatio="xMidYMid meet" />
                          <line x1="260" y1="24" x2="260" y2="310" stroke={mutedColor} strokeDasharray="6 5" opacity="0.55" />

                          {vehicleMeasureFocus === 'turnRadius' && (
                              <>
                                  <path d="M350 82C448 126 464 220 402 292" fill="none" stroke={selectedColor} strokeWidth="3.5" strokeDasharray="7 5" markerEnd="url(#real-measure-arrow)" />
                                  <MeasureLabel x={424} y={170} />
                              </>
                          )}
                          {vehicleMeasureFocus === 'antennaOffset' && (
                              <>
                                  <line x1="260" y1="145" x2={antennaPairX} y2="145" stroke={selectedColor} strokeWidth="3.5" markerEnd="url(#real-measure-arrow)" />
                                  <circle cx={antennaPairX} cy="145" r="8" fill={panelFill} stroke={selectedColor} strokeWidth="3" />
                                  <MeasureLabel x={260} y={183} />
                              </>
                          )}
                          {vehicleMeasureFocus === 'gnssHeadingOffset' && (
                              <>
                                  <line x1="260" y1="151" x2="260" y2="67" stroke={selectedColor} strokeWidth="3.5" markerEnd="url(#real-measure-arrow)" />
                                  <circle cx="260" cy="151" r="8" fill={panelFill} stroke="#f59e0b" strokeWidth="3" />
                                  <MeasureLabel x={312} y={105} />
                              </>
                          )}
                          {vehicleMeasureFocus === 'hitchOffset' && (
                              <>
                                  <line x1="260" y1="276" x2={hitchPointX} y2="276" stroke={selectedColor} strokeWidth="3.5" markerEnd="url(#real-measure-arrow)" />
                                  <circle cx={hitchPointX} cy="276" r="7" fill={panelFill} stroke={selectedColor} strokeWidth="3" />
                                  <MeasureLabel x={260} y={244} />
                              </>
                          )}
                      </g>
                  )}
              </svg>

              <div className={`flex items-center gap-2 border-t ${t.border} px-3.5 py-2.5`}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: selectedColor }} />
                  <span className={`text-[9px] font-bold ${t.textSub}`}>Select a measurement on the right · the real vehicle view updates automatically</span>
              </div>
          </div>
      );
  };

  const VehicleGeometryDiagram = ({ group = 'chassis' }) => {
      const isChassis = group === 'chassis';
      const isGnss = group === 'gnss';
      const accent = '#2563eb';
      const muted = theme === 'dark' ? '#64748b' : '#94a3b8';
      const bodyFill = theme === 'dark' ? '#1e3a5f' : '#dbeafe';
      const bodyStroke = theme === 'dark' ? '#60a5fa' : '#2563eb';
      const wheelFill = theme === 'dark' ? '#475569' : '#334155';
      const panelFill = theme === 'dark' ? '#0f172a' : '#f8fafc';
      const gridStroke = theme === 'dark' ? '#1e293b' : '#e2e8f0';
      const activeStroke = (field) => vehicleMeasureFocus === field ? accent : muted;
      const activeWidth = (field) => vehicleMeasureFocus === field ? 3 : 1.4;
      const measureValue = {
          wheelbase: `${Number(vehicleSettings.wheelbase || 0).toFixed(2)} m`,
          frontAxleWidth: `${Number(vehicleSettings.frontAxleWidth || 0).toFixed(2)} m`,
          rearAxleWidth: `${Number(vehicleSettings.rearAxleWidth || 0).toFixed(2)} m`,
          frontOverhang: `${Number(vehicleSettings.frontOverhang || 0).toFixed(2)} m`,
          rearOverhang: `${Number(vehicleSettings.rearOverhang || 0).toFixed(2)} m`,
          overallHeight: `${Number(vehicleSettings.overallHeight || 0).toFixed(2)} m`,
          turnRadius: `${Number(vehicleSettings.turnRadius || 0).toFixed(2)} m`,
          antennaHeight: `${Number(vehicleSettings.antennaHeight || 0).toFixed(2)} m`,
          antennaOffset: `${Number(vehicleSettings.antennaOffset || 0).toFixed(2)} m`,
          antennaToRearAxle: `${Number(vehicleSettings.antennaToRearAxle || 0).toFixed(2)} m`,
          gnssHeadingOffset: `${Number(vehicleSettings.gnssHeadingOffset || 0).toFixed(1)}°`,
          gnssRollOffset: `${Number(vehicleSettings.gnssRollOffset || 0).toFixed(1)}°`,
          gnssPitchOffset: `${Number(vehicleSettings.gnssPitchOffset || 0).toFixed(1)}°`,
          rearHitch: `${Number(vehicleSettings.rearHitch || 0).toFixed(2)} m`,
          hitchOffset: `${Number(vehicleSettings.hitchOffset || 0).toFixed(2)} m`,
          hitchHeight: `${Number(vehicleSettings.hitchHeight || 0).toFixed(2)} m`
      };

      const MeasurementLabel = ({ x, y, field, anchor = 'middle' }) => (
          <g>
              <rect
                  x={anchor === 'middle' ? x - 31 : x}
                  y={y - 10}
                  width="62"
                  height="20"
                  rx="7"
                  fill={vehicleMeasureFocus === field ? accent : panelFill}
                  stroke={activeStroke(field)}
                  strokeWidth="1"
              />
              <text
                  x={anchor === 'middle' ? x : x + 31}
                  y={y + 4}
                  textAnchor="middle"
                  fontSize="10"
                  fontWeight="800"
                  fill={vehicleMeasureFocus === field ? '#ffffff' : (theme === 'dark' ? '#cbd5e1' : '#334155')}
              >
                  {measureValue[field]}
              </text>
          </g>
      );

      return (
          <div className={`rounded-2xl border ${t.borderCard} overflow-hidden ${theme === 'dark' ? 'bg-slate-950' : 'bg-slate-50'}`}>
              <div className={`flex items-center justify-between gap-3 border-b ${t.border} px-4 py-3`}>
                  <div>
                      <div className={`text-[10px] font-black uppercase tracking-wider ${t.textSub}`}>Live geometry</div>
                      <div className={`text-sm font-black ${t.textMain}`}>{isChassis ? 'Chassis / top view' : isGnss ? 'GNSS receiver reference' : 'Hitch / coupling reference'}</div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 px-2.5 py-1 text-[9px] font-black uppercase text-blue-500">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                      Selected measure
                  </span>
              </div>
              <div className="px-3 pb-3 pt-2">
                  <svg viewBox="0 0 360 300" className="h-[300px] w-full" role="img" aria-label={isChassis ? 'Top view vehicle dimension diagram' : isGnss ? 'GNSS receiver dimension diagram' : 'Vehicle hitch dimension diagram'}>
                      <defs>
                          <pattern id={`vehicle-grid-${group}`} width="24" height="24" patternUnits="userSpaceOnUse">
                              <path d="M24 0H0V24" fill="none" stroke={gridStroke} strokeWidth="1" />
                          </pattern>
                          <marker id={`vehicle-arrow-${group}`} markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto-start-reverse">
                              <path d="M0 0L6 3L0 6Z" fill={accent} />
                          </marker>
                      </defs>
                      <rect x="0" y="0" width="360" height="300" rx="14" fill={`url(#vehicle-grid-${group})`} />

                      {isChassis ? (
                          <>
                              <line x1="180" y1="18" x2="180" y2="284" stroke={gridStroke} strokeDasharray="5 5" />
                              <rect x="88" y="47" width="33" height="61" rx="10" fill={wheelFill} />
                              <rect x="239" y="47" width="33" height="61" rx="10" fill={wheelFill} />
                              <rect x="78" y="184" width="42" height="74" rx="11" fill={wheelFill} />
                              <rect x="240" y="184" width="42" height="74" rx="11" fill={wheelFill} />
                              <path d="M143 43H217L228 104V225L210 253H150L132 225V104L143 43Z" fill={bodyFill} stroke={bodyStroke} strokeWidth="2" />
                              <path d="M151 53H209L215 105H145L151 53Z" fill={theme === 'dark' ? '#0f2744' : '#bfdbfe'} stroke={bodyStroke} strokeWidth="1.5" />
                              <rect x="147" y="118" width="66" height="76" rx="10" fill={theme === 'dark' ? '#172554' : '#eff6ff'} stroke={bodyStroke} strokeWidth="1.5" />
                              <path d="M180 253V277" stroke={bodyStroke} strokeWidth="6" strokeLinecap="round" />
                              <circle cx="180" cy="282" r="5" fill={accent} />

                              <line x1="70" y1="77" x2="70" y2="221" stroke={activeStroke('wheelbase')} strokeWidth={activeWidth('wheelbase')} markerStart={vehicleMeasureFocus === 'wheelbase' ? `url(#vehicle-arrow-${group})` : undefined} markerEnd={vehicleMeasureFocus === 'wheelbase' ? `url(#vehicle-arrow-${group})` : undefined} />
                              <line x1="76" y1="77" x2="128" y2="77" stroke={gridStroke} />
                              <line x1="76" y1="221" x2="128" y2="221" stroke={gridStroke} />
                              <MeasurementLabel x={39} y={149} field="wheelbase" />

                              <line x1="104" y1="31" x2="256" y2="31" stroke={activeStroke('frontAxleWidth')} strokeWidth={activeWidth('frontAxleWidth')} markerStart={vehicleMeasureFocus === 'frontAxleWidth' ? `url(#vehicle-arrow-${group})` : undefined} markerEnd={vehicleMeasureFocus === 'frontAxleWidth' ? `url(#vehicle-arrow-${group})` : undefined} />
                              <MeasurementLabel x={180} y={15} field="frontAxleWidth" />

                              <line x1="99" y1="271" x2="261" y2="271" stroke={activeStroke('rearAxleWidth')} strokeWidth={activeWidth('rearAxleWidth')} markerStart={vehicleMeasureFocus === 'rearAxleWidth' ? `url(#vehicle-arrow-${group})` : undefined} markerEnd={vehicleMeasureFocus === 'rearAxleWidth' ? `url(#vehicle-arrow-${group})` : undefined} />
                              <MeasurementLabel x={180} y={287} field="rearAxleWidth" />

                               <path d="M285 205C332 185 338 125 307 93" fill="none" stroke={activeStroke('turnRadius')} strokeWidth={activeWidth('turnRadius')} strokeDasharray="5 4" />
                               <MeasurementLabel x={312} y={78} field="turnRadius" />

                               {vehicleMeasureFocus === 'frontOverhang' && (
                                   <>
                                       <line x1="304" y1="43" x2="304" y2="77" stroke={accent} strokeWidth="3" markerStart={`url(#vehicle-arrow-${group})`} markerEnd={`url(#vehicle-arrow-${group})`} />
                                       <MeasurementLabel x={326} y={44} field="frontOverhang" />
                                   </>
                               )}
                               {vehicleMeasureFocus === 'rearOverhang' && (
                                   <>
                                       <line x1="304" y1="221" x2="304" y2="253" stroke={accent} strokeWidth="3" markerStart={`url(#vehicle-arrow-${group})`} markerEnd={`url(#vehicle-arrow-${group})`} />
                                       <MeasurementLabel x={326} y={257} field="rearOverhang" />
                                   </>
                               )}
                           </>
                      ) : isGnss ? (
                           <>
                               <line x1="180" y1="18" x2="180" y2="284" stroke={gridStroke} strokeDasharray="5 5" />
                              <rect x="88" y="47" width="33" height="61" rx="10" fill={wheelFill} />
                              <rect x="239" y="47" width="33" height="61" rx="10" fill={wheelFill} />
                              <rect x="78" y="184" width="42" height="74" rx="11" fill={wheelFill} />
                              <rect x="240" y="184" width="42" height="74" rx="11" fill={wheelFill} />
                              <path d="M143 43H217L228 104V225L210 253H150L132 225V104L143 43Z" fill={bodyFill} stroke={bodyStroke} strokeWidth="2" />
                              <rect x="147" y="118" width="66" height="76" rx="10" fill={theme === 'dark' ? '#172554' : '#eff6ff'} stroke={bodyStroke} strokeWidth="1.5" />
                              <line x1="180" y1="44" x2="180" y2="258" stroke={gridStroke} strokeDasharray="4 4" />
                              <circle cx="196" cy="118" r="8" fill="#ffffff" stroke={accent} strokeWidth="4" />
                              <circle cx="196" cy="118" r="2.5" fill={accent} />
                              <path d="M180 253V277" stroke={bodyStroke} strokeWidth="6" strokeLinecap="round" />
                              <circle cx="180" cy="282" r="5" fill={accent} />

                              <line x1="180" y1="96" x2="196" y2="96" stroke={activeStroke('antennaOffset')} strokeWidth={activeWidth('antennaOffset')} markerStart={vehicleMeasureFocus === 'antennaOffset' ? `url(#vehicle-arrow-${group})` : undefined} markerEnd={vehicleMeasureFocus === 'antennaOffset' ? `url(#vehicle-arrow-${group})` : undefined} />
                              <MeasurementLabel x={226} y={86} field="antennaOffset" />

                               <line x1="248" y1="118" x2="248" y2="221" stroke={activeStroke('antennaToRearAxle')} strokeWidth={activeWidth('antennaToRearAxle')} markerStart={vehicleMeasureFocus === 'antennaToRearAxle' ? `url(#vehicle-arrow-${group})` : undefined} markerEnd={vehicleMeasureFocus === 'antennaToRearAxle' ? `url(#vehicle-arrow-${group})` : undefined} />
                               <MeasurementLabel x={300} y={169} field="antennaToRearAxle" />

                               <g transform="translate(18 58)">
                                  <rect x="0" y="0" width="74" height="136" rx="12" fill={panelFill} stroke={activeStroke('antennaHeight')} strokeWidth={activeWidth('antennaHeight')} />
                                  <path d="M16 105H58M24 104V77L32 58H51L58 77V104" fill={bodyFill} stroke={bodyStroke} strokeWidth="2" />
                                  <line x1="37" y1="22" x2="37" y2="104" stroke={activeStroke('antennaHeight')} strokeWidth={activeWidth('antennaHeight')} markerStart={vehicleMeasureFocus === 'antennaHeight' ? `url(#vehicle-arrow-${group})` : undefined} markerEnd={vehicleMeasureFocus === 'antennaHeight' ? `url(#vehicle-arrow-${group})` : undefined} />
                                  <circle cx="37" cy="19" r="6" fill="#ffffff" stroke={accent} strokeWidth="3" />
                                   <text x="37" y="124" textAnchor="middle" fontSize="9" fontWeight="800" fill={theme === 'dark' ? '#cbd5e1' : '#334155'}>{measureValue.antennaHeight}</text>
                               </g>

                               <g transform="translate(250 232)">
                                   {[
                                       ['H', 'gnssHeadingOffset', 0],
                                       ['R', 'gnssRollOffset', 34],
                                       ['P', 'gnssPitchOffset', 68]
                                   ].map(([label, field, x]) => (
                                       <g key={field} transform={`translate(${x} 0)`}>
                                           <circle cx="12" cy="12" r="11" fill={vehicleMeasureFocus === field ? accent : panelFill} stroke={activeStroke(field)} />
                                           <text x="12" y="15" textAnchor="middle" fontSize="8" fontWeight="900" fill={vehicleMeasureFocus === field ? '#fff' : muted}>{label}</text>
                                           <text x="12" y="35" textAnchor="middle" fontSize="7" fontWeight="800" fill={muted}>{measureValue[field]}</text>
                                       </g>
                                   ))}
                               </g>
                           </>
                      ) : (
                           <>
                               <line x1="180" y1="18" x2="180" y2="284" stroke={gridStroke} strokeDasharray="5 5" />
                               <rect x="88" y="47" width="33" height="61" rx="10" fill={wheelFill} />
                               <rect x="239" y="47" width="33" height="61" rx="10" fill={wheelFill} />
                               <rect x="78" y="184" width="42" height="74" rx="11" fill={wheelFill} />
                               <rect x="240" y="184" width="42" height="74" rx="11" fill={wheelFill} />
                               <path d="M143 43H217L228 104V225L210 253H150L132 225V104L143 43Z" fill={bodyFill} stroke={bodyStroke} strokeWidth="2" />
                               <rect x="147" y="118" width="66" height="76" rx="10" fill={theme === 'dark' ? '#172554' : '#eff6ff'} stroke={bodyStroke} strokeWidth="1.5" />
                               <path d="M180 253V282" stroke={bodyStroke} strokeWidth="6" strokeLinecap="round" />
                               <circle cx="180" cy="284" r="6" fill="#ffffff" stroke={accent} strokeWidth="3" />

                               <line x1="270" y1="221" x2="270" y2="284" stroke={activeStroke('rearHitch')} strokeWidth={activeWidth('rearHitch')} markerStart={vehicleMeasureFocus === 'rearHitch' ? `url(#vehicle-arrow-${group})` : undefined} markerEnd={vehicleMeasureFocus === 'rearHitch' ? `url(#vehicle-arrow-${group})` : undefined} />
                               <MeasurementLabel x={316} y={250} field="rearHitch" />

                               <line x1="180" y1="267" x2="204" y2="267" stroke={activeStroke('hitchOffset')} strokeWidth={activeWidth('hitchOffset')} markerStart={vehicleMeasureFocus === 'hitchOffset' ? `url(#vehicle-arrow-${group})` : undefined} markerEnd={vehicleMeasureFocus === 'hitchOffset' ? `url(#vehicle-arrow-${group})` : undefined} />
                               <MeasurementLabel x={232} y={279} field="hitchOffset" />

                               <g transform="translate(18 72)">
                                   <rect x="0" y="0" width="76" height="128" rx="12" fill={panelFill} stroke={activeStroke('hitchHeight')} strokeWidth={activeWidth('hitchHeight')} />
                                   <path d="M15 104H61M24 104V66H52V104" fill={bodyFill} stroke={bodyStroke} strokeWidth="2" />
                                   <circle cx="38" cy="70" r="5" fill="#ffffff" stroke={accent} strokeWidth="2.5" />
                                   <line x1="12" y1="70" x2="12" y2="104" stroke={activeStroke('hitchHeight')} strokeWidth={activeWidth('hitchHeight')} markerStart={vehicleMeasureFocus === 'hitchHeight' ? `url(#vehicle-arrow-${group})` : undefined} markerEnd={vehicleMeasureFocus === 'hitchHeight' ? `url(#vehicle-arrow-${group})` : undefined} />
                                   <text x="38" y="121" textAnchor="middle" fontSize="9" fontWeight="800" fill={theme === 'dark' ? '#cbd5e1' : '#334155'}>{measureValue.hitchHeight}</text>
                               </g>
                           </>
                      )}
                  </svg>
              </div>
          </div>
      );
  };

  const settingsNavSections = [
      {
          title: 'Run Setup',
          items: [
              { id: 'overview', label: 'Overview', icon: LayoutGrid },
              { id: 'guidance', label: 'Guidance', icon: Navigation },
              { id: 'rtk', label: 'RTK / GNSS', icon: Radio },
              { id: 'wifi', label: 'WiFi / Network', icon: WifiGlyph },
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
        case 'display': return (
            <div className="space-y-5">
                <SettingsSection title="Display" detail="Screen theme, brightness and map presentation." icon={Monitor}>
                    <div className="grid grid-cols-1 gap-4">
                        <SettingSlider theme={t} label="Brightness" value={85} min={0} max={100} />
                        <div className={`flex flex-wrap items-center justify-between gap-3 p-4 ${theme === 'dark' ? 'bg-slate-800' : 'bg-gray-100'} border ${t.borderCard} rounded-xl`}>
                            <div className="flex items-center gap-3">
                                {theme === 'light' ? <Sun className="w-6 h-6 text-orange-500" /> : <Moon className="w-6 h-6 text-blue-400" />}
                                <span className={`font-bold text-base ${t.textMain}`}>Theme</span>
                            </div>
                            <div className="flex bg-slate-700/20 p-1 rounded-lg">
                                <button onClick={() => setTheme('light')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${theme === 'light' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}><Sun className="w-4 h-4" /> Light</button>
                                <button onClick={() => setTheme('dark')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${theme === 'dark' ? 'bg-slate-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}><Moon className="w-4 h-4" /> Dark</button>
                            </div>
                        </div>
                    </div>
                </SettingsSection>
                <SettingsSection title="Run View" detail="Keep both vehicle and map synced by one 2D/3D control." icon={MapIcon}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <ConfigTile icon={MapIcon} label="Scene" value={sceneViewMode} />
                        <ConfigTile icon={Compass} label="Orientation" value="HDG UP" />
                        <ConfigTile icon={LayoutGrid} label="Grid Step" value={`${gridMinorSize}px`} />
                    </div>
                </SettingsSection>
            </div>
        );
        case 'wifi': {
            const wifiConfig = {
                enabled: true,
                mode: 'Client',
                status: 'Disconnected',
                ssid: '',
                security: 'WPA2/WPA3',
                password: '',
                signalDbm: -90,
                channel: 'Auto',
                band: '2.4 GHz',
                autoReconnect: true,
                dhcp: true,
                ipAddress: '192.168.1.48',
                subnetMask: '255.255.255.0',
                gateway: '192.168.1.1',
                dnsPrimary: '8.8.8.8',
                dnsSecondary: '1.1.1.1',
                hotspotEnabled: false,
                hotspotSsid: 'Autosteer_Setup',
                hotspotPassword: '',
                lteFallback: true,
                lastScanAt: null,
                savedNetworks: [],
                ...wifiSettings
            };
            const connected = wifiConfig.enabled && wifiConfig.status === 'Connected' && Boolean(wifiConfig.ssid);
            const wifiSignalPercent = Math.max(0, Math.min(100, Math.round(((Number(wifiConfig.signalDbm) + 90) / 55) * 100)));
            const savedNetworkSsids = new Set((wifiConfig.savedNetworks || []).map(network => network.ssid));
            const nearbyNetworkCatalog = [
                { ssid: 'Farm_RTK_Network', security: 'WPA2/WPA3', signalDbm: -58, status: 'Available' },
                { ssid: 'Tractor_Hotspot', security: 'WPA2', signalDbm: -67, status: 'Available' },
                { ssid: 'Workshop_AP', security: 'WPA2', signalDbm: -72, status: 'Available' },
                { ssid: 'Field_Base_AP', security: 'WPA2', signalDbm: -61, status: 'Available' },
                { ssid: 'NTRIP_Mobile', security: 'WPA2', signalDbm: -70, status: 'Available' },
                { ssid: 'Farm_Office', security: 'WPA3', signalDbm: -64, status: 'Available' },
                { ssid: 'AGCO_Service', security: 'WPA2', signalDbm: -73, status: 'Available' },
                { ssid: 'JohnDeere_Link', security: 'WPA2', signalDbm: -69, status: 'Available' },
                { ssid: 'Greenhouse_AP', security: 'WPA2', signalDbm: -76, status: 'Available' },
                { ssid: 'North_Field_RTK', security: 'WPA2/WPA3', signalDbm: -66, status: 'Available' },
                { ssid: 'South_Field_RTK', security: 'WPA2/WPA3', signalDbm: -68, status: 'Available' },
                { ssid: 'Barn_Camera', security: 'WPA2', signalDbm: -77, status: 'Available' },
                { ssid: 'Sprayer_Unit_04', security: 'WPA2', signalDbm: -74, status: 'Available' },
                { ssid: 'Seeder_Controller', security: 'WPA2', signalDbm: -79, status: 'Available' },
                { ssid: 'Irrigation_Gateway', security: 'WPA2', signalDbm: -81, status: 'Available' },
                { ssid: 'Harvester_Cab', security: 'WPA2', signalDbm: -71, status: 'Available' },
                { ssid: 'Field_Guest', security: 'Open', signalDbm: -75, status: 'Available' },
                {
                    ssid: 'Workshop_Extender',
                    security: 'WPA2',
                    signalDbm: -84,
                    status: 'Available',
                    connectFailure: 'The access point stopped responding. Move closer or check the router, then try again.'
                },
                { ssid: 'Mobile_Hotspot', security: 'WPA3', signalDbm: -65, status: 'Available' },
                { ssid: 'BaseStation_Backup', security: 'WPA2', signalDbm: -78, status: 'Available' }
            ];
            const scanNetworkMap = new Map(nearbyNetworkCatalog.map(network => [network.ssid, network]));
            (wifiConfig.savedNetworks || []).forEach(network => {
                scanNetworkMap.set(network.ssid, {
                    ...(scanNetworkMap.get(network.ssid) || {}),
                    ...network
                });
            });
            const scanNetworks = Array.from(scanNetworkMap.values())
                .sort((left, right) => {
                    const leftConnected = left.ssid === wifiConfig.ssid && connected;
                    const rightConnected = right.ssid === wifiConfig.ssid && connected;
                    if (leftConnected !== rightConnected) return leftConnected ? -1 : 1;
                    const leftSaved = savedNetworkSsids.has(left.ssid);
                    const rightSaved = savedNetworkSsids.has(right.ssid);
                    if (leftSaved !== rightSaved) return leftSaved ? -1 : 1;
                    return Number(right.signalDbm || -90) - Number(left.signalDbm || -90);
                });
            const connectingToWifi = wifiConnectionAttempt.status === 'connecting';
            const toggleWifiFlag = (key) => handleWifiSettingChange(key, !wifiConfig[key]);
            const signalLabel = (strength) => strength >= 70 ? 'Excellent' : strength >= 48 ? 'Good' : strength >= 28 ? 'Fair' : 'Weak';
            const WifiSignalBars = ({ strength, active = false }) => (
                <span className="flex h-6 w-7 items-end justify-center gap-[2px]" aria-hidden="true">
                    {[28, 46, 68, 92].map((threshold, index) => (
                        <span
                            key={threshold}
                            className={`w-1 rounded-sm ${strength >= threshold ? (active ? 'bg-white' : 'bg-blue-500') : (theme === 'dark' ? 'bg-slate-700' : 'bg-slate-300')}`}
                            style={{ height: `${7 + index * 4}px` }}
                        />
                    ))}
                </span>
            );
            const clearWifiConnectionTimers = () => {
                wifiConnectionTimersRef.current.forEach(timer => window.clearTimeout(timer));
                wifiConnectionTimersRef.current = [];
            };
            const resetWifiConnectionAttempt = () => {
                clearWifiConnectionTimers();
                wifiConnectionAttemptIdRef.current += 1;
                setWifiConnectionAttempt({
                    status: 'idle',
                    ssid: '',
                    phase: '',
                    step: 0,
                    message: '',
                    network: null
                });
            };
            const finalizeWifiConnection = (network) => {
                const { connectFailure, ...savedNetwork } = network;
                const existingSavedNetworks = wifiConfig.savedNetworks || [];
                const nextSavedNetworks = existingSavedNetworks
                    .filter(item => item.ssid !== network.ssid)
                    .map(item => ({
                        ...item,
                        status: item.status === 'Connected' ? 'Saved' : item.status
                    }));
                handleWifiSettingChange('enabled', true);
                handleWifiSettingChange('ssid', network.ssid);
                handleWifiSettingChange('security', network.security);
                handleWifiSettingChange('signalDbm', network.signalDbm);
                handleWifiSettingChange('status', 'Connected');
                handleWifiSettingChange('password', '');
                handleWifiSettingChange('savedNetworks', [
                    {
                        ...savedNetwork,
                        status: 'Connected'
                    },
                    ...nextSavedNetworks
                ]);
                resetWifiConnectionAttempt();
                setWifiJoinTarget(null);
                setWifiJoinPassword('');
                setWifiForgetConfirmSsid(null);
                showNotification(`WiFi connected: ${network.ssid}`, 'success');
            };
            const connectWifiNetwork = (network, password = '') => {
                if (connectingToWifi) return;
                const requiresPassword = network.security !== 'Open' && !savedNetworkSsids.has(network.ssid);
                if (requiresPassword && password.length < 8) {
                    showNotification('WiFi password must contain at least 8 characters', 'warning');
                    return;
                }
                const connectionFailureMessage = network.connectFailure
                    || (requiresPassword && /wrong|incorrect/i.test(password)
                        ? 'The password is incorrect. Check it and try again.'
                        : '');

                clearWifiConnectionTimers();
                const attemptId = wifiConnectionAttemptIdRef.current + 1;
                wifiConnectionAttemptIdRef.current = attemptId;
                setWifiJoinTarget(null);
                setWifiJoinPassword('');
                setWifiForgetConfirmSsid(null);
                setWifiConnectionAttempt({
                    status: 'connecting',
                    ssid: network.ssid,
                    phase: 'Checking network availability',
                    step: 1,
                    message: '',
                    network
                });

                const setConnectionPhase = (step, phase) => {
                    if (wifiConnectionAttemptIdRef.current !== attemptId) return;
                    setWifiConnectionAttempt(previous => (
                        previous.status === 'connecting' && previous.ssid === network.ssid
                            ? { ...previous, step, phase }
                            : previous
                    ));
                };

                wifiConnectionTimersRef.current = [
                    window.setTimeout(() => setConnectionPhase(2, 'Authenticating credentials'), 450),
                    window.setTimeout(() => setConnectionPhase(3, 'Requesting an IP address'), 1050),
                    window.setTimeout(() => {
                        if (wifiConnectionAttemptIdRef.current !== attemptId) return;
                        if (connectionFailureMessage) {
                            setWifiConnectionAttempt({
                                status: 'failed',
                                ssid: network.ssid,
                                phase: '',
                                step: 0,
                                message: connectionFailureMessage,
                                network
                            });
                            wifiConnectionTimersRef.current = [];
                            showNotification(`Could not connect to ${network.ssid}`, 'error');
                            return;
                        }
                        finalizeWifiConnection(network);
                    }, 1750)
                ];
            };
            const requestWifiConnection = (network) => {
                if (connectingToWifi) return;
                const alreadySaved = savedNetworkSsids.has(network.ssid);
                if (alreadySaved || network.security === 'Open') {
                    connectWifiNetwork(network);
                    return;
                }
                setWifiJoinTarget(network);
                setWifiJoinPassword('');
                setWifiForgetConfirmSsid(null);
            };
            const cancelWifiConnection = () => {
                const cancelledSsid = wifiConnectionAttempt.ssid;
                resetWifiConnectionAttempt();
                showNotification(`Connection cancelled${cancelledSsid ? `: ${cancelledSsid}` : ''}`, 'info');
            };
            const forgetWifiNetwork = (network) => {
                const nextSavedNetworks = (wifiConfig.savedNetworks || []).filter(item => item.ssid !== network.ssid);
                handleWifiSettingChange('savedNetworks', nextSavedNetworks);
                if (wifiConfig.ssid === network.ssid) {
                    handleWifiSettingChange('ssid', '');
                    handleWifiSettingChange('status', 'Disconnected');
                    handleWifiSettingChange('signalDbm', -90);
                }
                setWifiForgetConfirmSsid(null);
                showNotification(`Forgot WiFi network: ${network.ssid}`, 'info');
            };
            const requestForgetWifiNetwork = (network) => {
                if (wifiForgetConfirmSsid !== network.ssid) {
                    setWifiForgetConfirmSsid(network.ssid);
                    return;
                }
                forgetWifiNetwork(network);
            };
            const disconnectWifi = () => {
                resetWifiConnectionAttempt();
                handleWifiSettingChange('status', 'Disconnected');
                handleWifiSettingChange('signalDbm', -90);
                showNotification('WiFi disconnected', 'info');
            };
            const toggleWifiEnabled = () => {
                const nextEnabled = !wifiConfig.enabled;
                handleWifiSettingChange('enabled', nextEnabled);
                if (!nextEnabled) {
                    resetWifiConnectionAttempt();
                    handleWifiSettingChange('status', 'Disconnected');
                    handleWifiSettingChange('signalDbm', -90);
                    setWifiJoinTarget(null);
                    setWifiJoinPassword('');
                }
                showNotification(nextEnabled ? 'WiFi enabled' : 'WiFi disabled', nextEnabled ? 'success' : 'info');
            };
            const scanWifiNetworks = () => {
                if (!wifiConfig.enabled || wifiScanning || connectingToWifi) return;
                setWifiScanning(true);
                window.setTimeout(() => {
                    handleWifiSettingChange('lastScanAt', new Date().toISOString());
                    setWifiScanning(false);
                    showNotification('Nearby WiFi networks updated', 'success');
                }, 700);
            };
            const renderWifiSettingRow = ({ label, detail, flagKey, icon: Icon = CheckCircle2 }) => (
                <button
                    type="button"
                    onClick={() => toggleWifiFlag(flagKey)}
                    role="switch"
                    aria-checked={Boolean(wifiConfig[flagKey])}
                    title={detail}
                    className="flex min-h-[44px] w-full items-center justify-between gap-2 px-3 py-1.5 text-left transition-colors hover:bg-blue-500/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
                >
                    <div className="flex min-w-0 items-center gap-2">
                        <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${wifiConfig[flagKey] ? 'bg-blue-500/10 text-blue-500' : `${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'} ${t.textDim}`}`}>
                            <Icon className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0">
                            <div className={`truncate text-xs font-bold leading-tight ${t.textMain}`}>{label}</div>
                            <div className={`hidden truncate text-[10px] font-medium leading-tight ${t.textSub} xl:block`}>{detail}</div>
                        </div>
                    </div>
                    <span className={`h-4 w-7 shrink-0 rounded-full p-0.5 transition-colors ${wifiConfig[flagKey] ? 'bg-blue-600' : 'bg-slate-400'}`}>
                        <span className={`block h-3 w-3 rounded-full bg-white shadow-sm transition-transform ${wifiConfig[flagKey] ? 'translate-x-3' : ''}`} />
                    </span>
                </button>
            );

            return (
              <div data-wifi-page className="mx-auto flex h-full min-h-0 w-full max-w-5xl flex-col gap-2">
                <section data-wifi-summary className={`shrink-0 overflow-hidden rounded-xl border ${t.borderCard} ${t.bgPanel}`}>
                    <div>
                        <div
                            data-wifi-current-status
                            className={`overflow-hidden ${
                                connectingToWifi
                                    ? 'bg-blue-500/5'
                                    : connected
                                        ? `${theme === 'dark' ? 'bg-slate-900/30' : 'bg-emerald-500/[0.035]'}`
                                        : `${theme === 'dark' ? 'bg-slate-900/25' : 'bg-slate-50'}`
                            }`}
                        >
                            <div className={`flex min-h-[60px] flex-nowrap items-center gap-3 border-l-[3px] px-3 py-2 ${
                                connectingToWifi ? 'border-l-blue-500' : connected ? 'border-l-emerald-500' : 'border-l-slate-400'
                            }`}>
                                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                                    connectingToWifi
                                        ? 'bg-blue-600 text-white'
                                        : connected
                                            ? 'bg-blue-500/10 text-blue-500'
                                            : 'bg-blue-500/10 text-blue-500'
                                }`}>
                                    {connectingToWifi
                                        ? <span className="h-5 w-5 rounded-full border-2 border-current border-r-transparent animate-spin" aria-hidden="true" />
                                        : connected
                                            ? <WifiSignalBars strength={wifiSignalPercent} />
                                            : <WifiGlyph className="h-5 w-5" />}
                                </span>

                                <div className="min-w-0 flex-1">
                                    <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.1em] ${
                                        connectingToWifi ? 'text-blue-500' : connected ? 'text-emerald-500' : t.textSub
                                    }`}>
                                        <span className={`h-1.5 w-1.5 rounded-full ${
                                            connectingToWifi ? 'animate-pulse bg-blue-500' : connected ? 'bg-emerald-500' : wifiConfig.enabled ? 'bg-amber-400' : 'bg-slate-400'
                                        }`} />
                                        Wi-Fi · {connectingToWifi ? 'Connecting' : connected ? 'Connected' : wifiConfig.enabled ? 'Not connected' : 'Off'}
                                    </div>
                                    <div className={`mt-0.5 truncate text-sm font-bold leading-tight ${t.textMain}`}>
                                        {connectingToWifi ? wifiConnectionAttempt.ssid : connected ? wifiConfig.ssid : 'Choose a network'}
                                    </div>
                                    <div className={`mt-0.5 truncate text-[10px] font-medium leading-tight ${t.textSub}`} aria-live="polite">
                                        {connectingToWifi
                                            ? wifiConnectionAttempt.phase
                                            : connected
                                                ? `${wifiConfig.security} · ${wifiConfig.band} · Ch ${wifiConfig.channel}`
                                                : 'Use the list below to connect'}
                                    </div>
                                </div>

                                {!connectingToWifi && connected && (
                                    <div className={`hidden min-w-[188px] grid-cols-2 divide-x ${theme === 'dark' ? 'divide-slate-700' : 'divide-slate-200'} lg:grid`}>
                                        {[
                                            ['Signal', `${signalLabel(wifiSignalPercent)} · ${wifiConfig.signalDbm} dBm`],
                                            ['IP address', wifiConfig.ipAddress]
                                        ].map(([label, value]) => (
                                            <div key={label} className="min-w-0 px-2.5">
                                                <div className={`text-[9px] font-bold uppercase tracking-wide ${t.textDim}`}>{label}</div>
                                                <div className={`mt-0.5 truncate text-[11px] font-semibold ${t.textMain}`}>{value}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="ml-auto flex shrink-0 items-center gap-1.5">
                                    {connectingToWifi ? (
                                        <button
                                            type="button"
                                            onClick={cancelWifiConnection}
                                            className={`h-9 rounded-lg border ${t.borderCard} px-3 text-xs font-bold leading-none ${t.textMain} hover:border-red-500 hover:text-red-500`}
                                        >
                                            Cancel
                                        </button>
                                    ) : connected ? (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => setWifiAdvancedOpen(true)}
                                                className="h-9 rounded-lg bg-blue-600 px-3 text-xs font-bold leading-none text-white hover:bg-blue-500"
                                            >
                                                Details
                                            </button>
                                            <button
                                                type="button"
                                                onClick={disconnectWifi}
                                                className={`hidden h-9 rounded-lg border ${t.borderCard} px-3 text-xs font-bold leading-none ${t.textSub} hover:border-red-500 hover:text-red-500 md:block`}
                                            >
                                                Disconnect
                                            </button>
                                        </>
                                    ) : null}
                                    <button
                                        type="button"
                                        onClick={toggleWifiEnabled}
                                        role="switch"
                                        aria-checked={Boolean(wifiConfig.enabled)}
                                        aria-label="Wi-Fi"
                                        className={`ml-1 flex h-9 items-center gap-1.5 rounded-lg px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${wifiConfig.enabled ? 'bg-blue-600 text-white' : `${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-200'} ${t.textSub}`}`}
                                    >
                                        <span className="text-xs font-bold leading-none">{wifiConfig.enabled ? 'ON' : 'OFF'}</span>
                                        <span className={`h-5 w-9 rounded-full p-0.5 ${wifiConfig.enabled ? 'bg-white/25' : 'bg-slate-400'}`}>
                                            <span className={`block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${wifiConfig.enabled ? 'translate-x-4' : ''}`} />
                                        </span>
                                    </button>
                                </div>
                            </div>

                            {connectingToWifi && (
                                <div className={`flex items-center gap-3 border-t ${t.border} px-3 py-1.5`} aria-live="polite">
                                    <span className={`min-w-0 flex-1 truncate text-[10px] font-semibold ${t.textMain}`}>{wifiConnectionAttempt.phase}</span>
                                    <div className={`h-1.5 w-28 overflow-hidden rounded-full ${theme === 'dark' ? 'bg-slate-800' : 'bg-blue-100'}`}>
                                        <div
                                            className="h-full rounded-full bg-blue-600 transition-all duration-300"
                                            style={{ width: `${Math.max(12, (wifiConnectionAttempt.step / 3) * 100)}%` }}
                                        />
                                    </div>
                                    <span className={`text-[10px] font-bold ${t.textDim}`}>{wifiConnectionAttempt.step}/3</span>
                                </div>
                            )}
                        </div>

                        <div className={`grid border-t ${t.border} ${theme === 'dark' ? 'divide-slate-700' : 'divide-slate-200'} divide-y lg:grid-cols-3 lg:divide-x lg:divide-y-0`}>
                            {renderWifiSettingRow({ label: 'Auto reconnect', detail: 'Reconnect after signal loss.', flagKey: 'autoReconnect', icon: WifiGlyph })}
                            {renderWifiSettingRow({ label: 'Automatic IP', detail: 'Router assigns the IP address.', flagKey: 'dhcp', icon: Globe })}
                            {renderWifiSettingRow({ label: 'LTE fallback', detail: 'Keep RTK correction online.', flagKey: 'lteFallback', icon: Radio })}
                        </div>
                    </div>
                </section>

                <section className={`flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border ${t.borderCard} ${t.bgPanel}`}>
                    <div className={`flex min-h-[50px] shrink-0 items-center justify-between gap-3 border-b ${t.border} px-4 py-2`}>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2.5">
                                <div className={`text-sm font-bold ${t.textMain}`}>Available networks</div>
                                {wifiConfig.enabled && (
                                    <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-500">
                                        {scanNetworks.length} found
                                    </span>
                                )}
                            </div>
                            <div className={`mt-0.5 truncate text-[10px] font-medium leading-tight ${t.textSub}`}>
                                {wifiConfig.enabled ? 'Select a network to connect' : 'Turn on Wi-Fi to view nearby networks'}
                            </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                            {wifiConfig.lastScanAt && (
                                <div className={`hidden text-right text-[9px] font-bold uppercase tracking-wide ${t.textDim} md:block`}>
                                    <span className="block">Updated</span>
                                    <span className={`block text-[10px] font-medium normal-case tracking-normal ${t.textSub}`}>
                                        {new Date(wifiConfig.lastScanAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            )}
                            <button
                                type="button"
                                onClick={() => setWifiAdvancedOpen(true)}
                                className={`h-9 rounded-lg border ${t.borderCard} px-3 text-xs font-bold leading-none ${t.textMain} hover:border-blue-500 hover:text-blue-500`}
                            >
                                Advanced
                            </button>
                            <button
                                type="button"
                                onClick={scanWifiNetworks}
                                disabled={!wifiConfig.enabled || wifiScanning || connectingToWifi}
                                className={`inline-flex h-9 min-w-[112px] items-center justify-center gap-1.5 rounded-lg border px-3 text-xs font-bold leading-none transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-40 ${
                                    theme === 'dark'
                                        ? 'border-blue-400/35 bg-blue-400/8 text-blue-300 hover:bg-blue-400/15'
                                        : 'border-blue-500/25 bg-blue-50 text-blue-600 hover:border-blue-500 hover:bg-blue-100'
                                }`}
                            >
                                {wifiScanning && (
                                    <span className="h-3.5 w-3.5 shrink-0 rounded-full border-2 border-current border-r-transparent animate-spin" aria-hidden="true" />
                                )}
                                <span className="leading-none">{wifiScanning ? 'Scanning…' : 'Find networks'}</span>
                            </button>
                        </div>
                    </div>

                    {wifiConnectionAttempt.status === 'failed' && (
                        <div role="alert" className={`shrink-0 flex flex-wrap items-center justify-between gap-3 border-b border-red-500/25 ${theme === 'dark' ? 'bg-red-500/10' : 'bg-red-50'} px-5 py-3.5`}>
                            <div className="flex min-w-0 items-start gap-3">
                                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-500/12 text-red-500">
                                    <AlertCircle className="h-5 w-5" />
                                </span>
                                <div className="min-w-0">
                                    <div className="text-sm font-bold text-red-500">Couldn’t connect to {wifiConnectionAttempt.ssid}</div>
                                    <div className={`mt-0.5 text-[10px] font-medium leading-4 ${t.textSub}`}>{wifiConnectionAttempt.message}</div>
                                </div>
                            </div>
                            <div className="flex shrink-0 gap-2">
                                <button
                                    type="button"
                                    onClick={resetWifiConnectionAttempt}
                                    className={`h-9 rounded-lg border ${t.borderCard} px-3 text-xs font-bold ${t.textMain}`}
                                >
                                    Dismiss
                                </button>
                                <button
                                    type="button"
                                    onClick={() => requestWifiConnection(wifiConnectionAttempt.network)}
                                    className="h-9 rounded-lg bg-red-500 px-4 text-xs font-bold text-white hover:bg-red-400"
                                >
                                    Retry
                                </button>
                            </div>
                        </div>
                    )}

                    {wifiConfig.enabled ? (
                    <div className="relative min-h-0 flex-1">
                    <div
                        data-wifi-network-list
                        aria-label="Available Wi-Fi networks"
                        tabIndex={0}
                        className="h-full min-h-0 overflow-y-auto overscroll-contain [scrollbar-gutter:stable] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
                    >
                        {scanNetworks.map((network) => {
                            const networkConnected = network.ssid === wifiConfig.ssid && connected;
                            const saved = networkConnected || savedNetworkSsids.has(network.ssid);
                            const networkConnecting = connectingToWifi && wifiConnectionAttempt.ssid === network.ssid;
                            const networkFailed = wifiConnectionAttempt.status === 'failed' && wifiConnectionAttempt.ssid === network.ssid;
                            const strength = Math.max(0, Math.min(100, Math.round(((Number(network.signalDbm) + 90) / 55) * 100)));
                            return (
                                <div
                                    key={network.ssid}
                                    data-network-ssid={network.ssid}
                                    data-connection-state={networkConnecting ? 'connecting' : networkFailed ? 'failed' : networkConnected ? 'connected' : 'idle'}
                                className={`grid min-h-[58px] grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-2.5 border-b ${t.border} px-3 py-1.5 last:border-b-0 ${
                                        networkFailed
                                            ? 'bg-red-500/7 shadow-[inset_3px_0_0_#ef4444]'
                                            : networkConnecting || networkConnected
                                                ? 'bg-blue-500/7 shadow-[inset_3px_0_0_#2563eb]'
                                                : 'transition-colors hover:bg-blue-500/5'
                                    }`}
                                >
                                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                                            networkFailed
                                                ? 'bg-red-500/12 text-red-500'
                                                : networkConnecting || networkConnected
                                                    ? 'bg-blue-600 text-white'
                                                    : theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'
                                        }`}>
                                            {networkConnecting
                                                ? <span className="h-4 w-4 rounded-full border-2 border-current border-r-transparent animate-spin" aria-hidden="true" />
                                                : networkFailed
                                                    ? <AlertCircle className="h-4 w-4" />
                                                    : <WifiSignalBars strength={strength} active={networkConnected} />}
                                    </span>
                                    <div className="min-w-0">
                                        <div className="flex min-w-0 items-center gap-2">
                                            <span className={`truncate text-sm font-bold ${t.textMain}`}>{network.ssid}</span>
                                            {networkConnected && <span className="rounded-full bg-emerald-500/12 px-1.5 py-0.5 text-[9px] font-bold uppercase text-emerald-500">Connected</span>}
                                            {networkConnecting && <span className="rounded-full bg-blue-500/12 px-1.5 py-0.5 text-[9px] font-bold uppercase text-blue-500">Connecting</span>}
                                            {networkFailed && <span className="rounded-full bg-red-500/12 px-1.5 py-0.5 text-[9px] font-bold uppercase text-red-500">Failed</span>}
                                        </div>
                                        <div className={`mt-0.5 truncate text-[10px] font-medium ${networkFailed ? 'text-red-500' : t.textSub}`} aria-live={networkConnecting || networkFailed ? 'polite' : undefined}>
                                            {networkConnecting
                                                ? wifiConnectionAttempt.phase
                                                : networkFailed
                                                    ? 'Connection failed · Retry available'
                                                    : `${network.security} · ${signalLabel(strength)} signal${saved ? ' · Saved' : ''}`}
                                        </div>
                                    </div>
                                    <div className="flex shrink-0 items-center justify-end gap-2">
                                        {networkConnecting ? (
                                            <button
                                                type="button"
                                                onClick={cancelWifiConnection}
                                                className={`h-9 min-w-[96px] rounded-lg border ${t.borderCard} px-3 text-xs font-bold ${t.textMain} hover:border-red-500 hover:text-red-500`}
                                            >
                                                Cancel
                                            </button>
                                        ) : networkFailed ? (
                                            <button
                                                type="button"
                                                onClick={() => requestWifiConnection(network)}
                                                className="h-9 min-w-[96px] rounded-lg bg-red-500 px-3 text-xs font-bold text-white hover:bg-red-400"
                                            >
                                                Retry
                                            </button>
                                        ) : networkConnected ? (
                                            <button
                                                type="button"
                                                onClick={() => setWifiAdvancedOpen(true)}
                                                className={`h-9 min-w-[96px] rounded-lg border ${t.borderCard} px-3 text-xs font-bold ${t.textMain} hover:border-blue-500 hover:text-blue-500`}
                                            >
                                                Details
                                            </button>
                                        ) : wifiForgetConfirmSsid === network.ssid ? (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() => requestForgetWifiNetwork(network)}
                                                    className="h-9 min-w-[80px] rounded-lg bg-red-500 px-3 text-xs font-bold text-white hover:bg-red-400"
                                                >
                                                    Confirm
                                                </button>
                                                <button
                                                    type="button"
                                                    aria-label={`Cancel forgetting ${network.ssid}`}
                                                    onClick={() => setWifiForgetConfirmSsid(null)}
                                                    className={`h-9 rounded-lg border ${t.borderCard} px-2.5 text-xs font-bold ${t.textMain} hover:border-blue-500`}
                                                >
                                                    Cancel
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                {saved && (
                                                    <button
                                                        type="button"
                                                        disabled={connectingToWifi}
                                                        aria-label={`Forget ${network.ssid}`}
                                                        onClick={() => setWifiForgetConfirmSsid(network.ssid)}
                                                        className="h-9 rounded-lg border border-red-500/25 bg-red-500/5 px-3 text-xs font-bold leading-none text-red-500 transition-colors hover:border-red-500/40 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-35"
                                                    >
                                                        Forget
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    disabled={connectingToWifi}
                                                    onClick={() => requestWifiConnection(network)}
                                                    className="inline-flex h-9 min-w-[96px] items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs font-bold text-white transition-colors hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-35"
                                                >
                                                    Connect
                                                    <ChevronRight className="h-4 w-4" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {scanNetworks.length > 5 && (
                        <div className={`pointer-events-none absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t ${theme === 'dark' ? 'from-slate-950/80' : 'from-white/90'} to-transparent`} />
                    )}
                    </div>
                    ) : (
                        <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-8 text-center">
                            <span className={`flex h-14 w-14 items-center justify-center rounded-2xl ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'} ${t.textDim}`}>
                                <WifiGlyph className="h-6 w-6" />
                            </span>
                            <div className={`mt-4 text-sm font-black ${t.textMain}`}>Wi-Fi is off</div>
                            <div className={`mt-1 max-w-sm text-xs ${t.textSub}`}>Turn Wi-Fi on to find nearby correction and service networks.</div>
                            <button type="button" onClick={toggleWifiEnabled} className="mt-4 h-10 rounded-xl bg-blue-600 px-5 text-xs font-black text-white hover:bg-blue-500">Turn on Wi-Fi</button>
                        </div>
                    )}
                </section>

                {wifiAdvancedOpen && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 p-5 backdrop-blur-sm">
                        <div
                            data-wifi-advanced-dialog
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="wifi-advanced-dialog-title"
                            className={`flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border ${t.borderCard} ${t.bgPanel} shadow-2xl`}
                        >
                            <div className={`flex shrink-0 items-center justify-between gap-4 border-b ${t.border} px-5 py-4`}>
                                <div className="flex min-w-0 items-center gap-3">
                                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white">
                                        <Cpu className="h-5 w-5" />
                                    </span>
                                    <div className="min-w-0">
                                        <div id="wifi-advanced-dialog-title" className={`text-lg font-black ${t.textMain}`}>Advanced network settings</div>
                                        <div className={`text-[11px] ${t.textSub}`}>IP information and hidden network access</div>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    aria-label="Close advanced network settings"
                                    onClick={() => setWifiAdvancedOpen(false)}
                                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${t.borderCard} ${t.activeItem} ${t.textMain} transition-colors hover:border-blue-500 hover:text-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50`}
                                >
                                    <CloseGlyph className="h-4 w-4" />
                                </button>
                            </div>

                            <div className="min-h-0 flex-1 overflow-y-auto p-5">
                                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                                    {[
                                        ['IP address', wifiConfig.ipAddress],
                                        ['Gateway', wifiConfig.gateway],
                                        ['Subnet mask', wifiConfig.subnetMask],
                                        ['DNS server', wifiConfig.dnsPrimary]
                                    ].map(([label, value]) => (
                                        <div key={label} className={`min-w-0 rounded-xl ${theme === 'dark' ? 'bg-slate-900/60' : 'bg-slate-50'} px-3.5 py-3 ring-1 ring-inset ${theme === 'dark' ? 'ring-slate-700' : 'ring-slate-200'}`}>
                                            <div className={`text-[9px] font-black uppercase tracking-wide ${t.textSub}`}>{label}</div>
                                            <div className={`mt-1 truncate text-xs font-black ${t.textMain}`}>{value}</div>
                                        </div>
                                    ))}
                                </div>

                                <div className={`mt-4 rounded-2xl border ${t.borderCard} p-4`}>
                                    <div className={`text-sm font-black ${t.textMain}`}>Join a hidden network</div>
                                    <div className={`mt-0.5 text-[11px] ${t.textSub}`}>Enter the exact network name and security details.</div>
                                    <div className="mt-4 grid grid-cols-1 items-end gap-3 xl:grid-cols-[minmax(0,1fr)_150px_minmax(0,1fr)_auto]">
                                        <SettingInput
                                            theme={t}
                                            label="Network name"
                                            value={wifiHiddenNetwork.ssid}
                                            onChange={(event) => setWifiHiddenNetwork(previous => ({ ...previous, ssid: event.target.value }))}
                                        />
                                        <SettingSelect
                                            label="Security"
                                            value={wifiHiddenNetwork.security}
                                            onChange={(value) => setWifiHiddenNetwork(previous => ({ ...previous, security: value }))}
                                            options={['WPA2/WPA3', 'WPA2', 'WPA3', 'Open']}
                                        />
                                        <SettingInput
                                            theme={t}
                                            label="Password"
                                            value={wifiHiddenNetwork.password}
                                            type="password"
                                            onChange={(event) => setWifiHiddenNetwork(previous => ({ ...previous, password: event.target.value }))}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (!wifiHiddenNetwork.ssid.trim()) {
                                                    showNotification('Enter a network name first', 'warning');
                                                    return;
                                                }
                                                if (wifiHiddenNetwork.security !== 'Open' && wifiHiddenNetwork.password.length < 8) {
                                                    showNotification('WiFi password must contain at least 8 characters', 'warning');
                                                    return;
                                                }
                                                connectWifiNetwork({
                                                    ssid: wifiHiddenNetwork.ssid.trim(),
                                                    security: wifiHiddenNetwork.security,
                                                    signalDbm: -58,
                                                    status: 'Available'
                                                }, wifiHiddenNetwork.password);
                                                setWifiHiddenNetwork({ ssid: '', security: 'WPA2/WPA3', password: '' });
                                                setWifiAdvancedOpen(false);
                                            }}
                                            className="h-11 rounded-xl bg-blue-600 px-5 text-sm font-black text-white hover:bg-blue-500"
                                        >
                                            Join
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className={`flex shrink-0 justify-end border-t ${t.border} px-5 py-4`}>
                                <button
                                    type="button"
                                    onClick={() => setWifiAdvancedOpen(false)}
                                    className="h-10 rounded-xl bg-blue-600 px-6 text-sm font-black text-white hover:bg-blue-500"
                                >
                                    Done
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {wifiJoinTarget && (
                    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/50 p-5 backdrop-blur-sm">
                        <div
                            data-wifi-join-dialog
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="wifi-join-dialog-title"
                            className={`w-full max-w-md overflow-hidden rounded-2xl border ${t.borderCard} ${t.bgPanel} shadow-2xl`}
                        >
                            <div className={`flex items-start justify-between gap-4 border-b ${t.border} px-5 py-4`}>
                                <div className="flex min-w-0 items-center gap-3">
                                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-600 text-white">
                                        <WifiGlyph className="h-5 w-5" />
                                    </span>
                                    <div className="min-w-0">
                                        <div className={`text-[10px] font-black uppercase tracking-wide ${t.textSub}`}>Join network</div>
                                        <div id="wifi-join-dialog-title" className={`truncate text-lg font-black ${t.textMain}`}>{wifiJoinTarget.ssid}</div>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    aria-label="Cancel joining network"
                                    onClick={() => {
                                        setWifiJoinTarget(null);
                                        setWifiJoinPassword('');
                                    }}
                                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${t.borderCard} ${t.textMain}`}
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                            <div className="p-5">
                                <div className={`mb-4 rounded-xl ${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'} px-4 py-3 text-xs ${t.textSub}`}>
                                    Secured with <span className={`font-black ${t.textMain}`}>{wifiJoinTarget.security}</span>. Enter the network password to continue.
                                </div>
                                <SettingInput
                                    theme={t}
                                    label="Network password"
                                    value={wifiJoinPassword}
                                    type="password"
                                    onChange={(event) => setWifiJoinPassword(event.target.value)}
                                />
                                <div className="mt-5 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setWifiJoinTarget(null);
                                            setWifiJoinPassword('');
                                        }}
                                        className={`h-11 rounded-xl border ${t.borderCard} px-5 text-sm font-bold ${t.textMain}`}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        disabled={wifiJoinPassword.length < 8}
                                        onClick={() => connectWifiNetwork(wifiJoinTarget, wifiJoinPassword)}
                                        className="inline-flex h-11 min-w-[116px] items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-sm font-black text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                        Connect
                                        <ChevronRight className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
              </div>
            );
        }
        case 'vehicle': {
            const avgTrack = ((Number(vehicleSettings.frontAxleWidth) || 0) + (Number(vehicleSettings.rearAxleWidth) || 0)) / 2;
            const overallLength = Number(vehicleSettings.frontOverhang || 0) + Number(vehicleSettings.wheelbase || 0) + Number(vehicleSettings.rearOverhang || 0);
            const vehicleSteps = [
                { id: 'information', label: 'Information', detail: 'Profile and controls', icon: Tractor },
                { id: 'geometry', label: 'Dimensions', detail: 'Chassis, GNSS and hitch', icon: Ruler },
                { id: 'summary', label: 'Review', detail: 'Validate and save', icon: CheckCircle2 }
            ];
            const currentStepIndex = vehicleSteps.findIndex(step => step.id === vehicleSetupStep);
            const informationReady = Boolean(vehicleSettings.label || activeVehicleProfile.label) && Boolean(vehicleSettings.type);
            const chassisReady = Number(vehicleSettings.wheelbase) > 0
                && Number(vehicleSettings.frontAxleWidth) > 0
                && Number(vehicleSettings.rearAxleWidth) > 0;
            const gnssReady = Number(vehicleSettings.antennaHeight) > 0
                && Number(vehicleSettings.gnssBaseline) > 0
                && Number(vehicleSettings.antennaToRearAxle) >= 0;
            const hitchReady = Number(vehicleSettings.hitchHeight) >= 0
                && Number(vehicleSettings.rearHitch) >= 0;
            const geometryReady = Number(vehicleSettings.wheelbase) > 0
                && Number(vehicleSettings.frontAxleWidth) > 0
                && Number(vehicleSettings.rearAxleWidth) > 0
                && Number(vehicleSettings.antennaHeight) > 0
                && Number(vehicleSettings.gnssBaseline) > 0
                && Number(vehicleSettings.antennaToRearAxle) >= 0
                && Number(vehicleSettings.hitchHeight) >= 0;
            const goToVehicleStep = (index) => {
                const bounded = Math.max(0, Math.min(vehicleSteps.length - 1, index));
                setVehicleSetupStep(vehicleSteps[bounded].id);
                requestAnimationFrame(() => {
                    settingsContentScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                });
            };
            const renderReviewRow = (label, value, unit = '') => (
                <div className={`flex items-center justify-between gap-4 border-b ${t.border} py-2.5 last:border-b-0`}>
                    <span className={`text-xs font-bold ${t.textSub}`}>{label}</span>
                    <span className={`text-sm font-black ${t.textMain}`}>{value}{unit && <span className={`ml-1 text-[10px] uppercase ${t.textDim}`}>{unit}</span>}</span>
                </div>
            );

            return (
                <section className={`${t.bgPanel} min-h-full overflow-hidden`}>
                    <div className={`grid grid-cols-3 border-b ${t.border}`}>
                        {vehicleSteps.map((step, index) => {
                            const StepIcon = step.icon;
                            const active = step.id === vehicleSetupStep;
                            const complete = index < currentStepIndex || (step.id === 'information' ? informationReady : step.id === 'geometry' ? geometryReady : false);
                            return (
                                <button
                                    key={step.id}
                                    onClick={() => goToVehicleStep(index)}
                                    className={`relative flex min-w-0 items-center justify-center gap-2 px-2 py-3 text-left transition-colors ${active ? (theme === 'dark' ? 'bg-blue-500/12' : 'bg-blue-50') : 'hover:bg-blue-500/5'}`}
                                >
                                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-black ${active ? 'bg-blue-600 text-white' : complete ? 'bg-green-500/15 text-green-500' : `${theme === 'dark' ? 'bg-slate-800' : 'bg-gray-100'} ${t.textSub}`}`}>
                                        {complete && !active ? <Check className="h-3.5 w-3.5" /> : <StepIcon className="h-3.5 w-3.5" />}
                                    </span>
                                    <span className="hidden min-w-0 sm:block">
                                        <span className={`block truncate text-xs font-black ${active ? 'text-blue-500' : t.textMain}`}>{step.label}</span>
                                        <span className={`block truncate text-[9px] ${t.textDim}`}>{step.detail}</span>
                                    </span>
                                    {active && <span className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-blue-600" />}
                                </button>
                            );
                        })}
                    </div>

                    <div className="grid min-h-[560px] grid-cols-[232px_minmax(0,1fr)]">
                        <VehicleLibrarySidebar />

                        <div className="min-w-0 p-5 lg:p-6">
                            {vehicleSetupStep === 'information' && (
                                <div className={`overflow-hidden rounded-2xl border ${t.borderCard}`}>
                                    <div className={`flex flex-wrap items-center justify-between gap-3 border-b ${t.border} px-4 py-3`}>
                                        <div className="flex min-w-0 items-center gap-3">
                                            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${theme === 'dark' ? 'bg-slate-800' : 'bg-blue-50'} text-blue-500`}>
                                                <Tractor className="h-5 w-5" />
                                            </span>
                                            <div className="min-w-0">
                                                <div className={`text-[9px] font-black uppercase tracking-wide ${t.textSub}`}>
                                                    {vehicleSettings.profileId === activeVehicleSettings.profileId ? 'Active machine' : vehicleSettings.profileId ? 'Selected machine' : 'New vehicle draft'}
                                                </div>
                                                <div className={`truncate text-base font-black ${t.textMain}`}>{vehicleSettings.label || activeVehicleProfile.label}</div>
                                                <div className={`truncate text-[10px] ${t.textSub}`}>{vehicleSettings.brand || 'Generic'} · {vehicleSettings.model || vehicleSettings.type}</div>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                                            <span className={`rounded-lg border ${t.borderCard} px-2.5 py-1.5 text-[9px] font-black ${t.textMain}`}>{Number(vehicleSettings.horsepower || 0)} HP</span>
                                            <span className={`rounded-lg border ${t.borderCard} px-2.5 py-1.5 text-[9px] font-black ${t.textMain}`}>{vehicleSettings.steeringType || 'Front axle'}</span>
                                            <span className={`rounded-full px-2.5 py-1 text-[8px] font-black uppercase ${informationReady ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'}`}>
                                                {informationReady ? 'Complete' : 'Required'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="space-y-4 p-4">
                                        <div className="grid grid-cols-[28px_minmax(0,1fr)] gap-3">
                                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500/10 text-[10px] font-black text-blue-500">1</span>
                                            <div>
                                                <div className={`mb-3 text-xs font-black ${t.textMain}`}>Identity</div>
                                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                                    <SettingInput theme={t} label="Profile Name" value={vehicleSettings.label || activeVehicleProfile.label || ''} onChange={(event) => handleVehicleChange('label', event.target.value)} />
                                                    <SettingSelect label="Vehicle Type" value={vehicleSettings.type || 'Tractor 4WD'} onChange={(value) => handleVehicleChange('type', value)} options={['Tractor 4WD', 'Articulated Tractor', 'Self Propelled', 'Harvester', 'Utility Vehicle']} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className={`h-px ${t.divider}`} />

                                        <div className="grid grid-cols-[28px_minmax(0,1fr)] gap-3">
                                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500/10 text-[10px] font-black text-blue-500">2</span>
                                            <div>
                                                <div className={`mb-3 text-xs font-black ${t.textMain}`}>Machine details</div>
                                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                                    <SettingInput theme={t} label="Brand" value={vehicleSettings.brand || ''} onChange={(event) => handleVehicleChange('brand', event.target.value)} />
                                                    <SettingInput theme={t} label="Model" value={vehicleSettings.model || ''} onChange={(event) => handleVehicleChange('model', event.target.value)} />
                                                    <SettingInput theme={t} label="Power (HP)" value={vehicleSettings.horsepower || 0} type="number" onChange={(event) => handleVehicleChange('horsepower', parseFloat(event.target.value) || 0)} />
                                                    <SettingInput theme={t} label="Purchase Date" value={vehicleSettings.purchaseDate || ''} type="date" onChange={(event) => handleVehicleChange('purchaseDate', event.target.value)} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className={`h-px ${t.divider}`} />

                                        <div className="grid grid-cols-[28px_minmax(0,1fr)] gap-3">
                                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500/10 text-[10px] font-black text-blue-500">3</span>
                                            <div>
                                                <div className={`mb-3 text-xs font-black ${t.textMain}`}>Steering system</div>
                                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                                    <SettingSelect label="Steering Control" value={vehicleSettings.controlType || 'Electronic Steering Wheel'} onChange={(value) => handleVehicleChange('controlType', value)} options={['Electronic Steering Wheel', 'CAN Hydraulic', 'PWM Hydraulic', 'Manual Assist']} />
                                                    <SettingSelect label="Steering Geometry" value={vehicleSettings.steeringType || 'Front axle'} onChange={(value) => handleVehicleChange('steeringType', value)} options={['Front axle', 'Articulated', 'Rear steer']} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {vehicleSetupStep === 'geometry' && (
                                <div className="space-y-4">
                                    <div className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border ${t.borderCard} p-3`}>
                                        <div>
                                            <div className={`text-[9px] font-black uppercase tracking-wide ${t.textSub}`}>Dimension setup</div>
                                            <div className={`text-sm font-black ${t.textMain}`}>All vehicle reference points</div>
                                            <div className={`mt-0.5 text-[9px] ${t.textDim}`}>One page · select any measurement to update the visual</div>
                                        </div>
                                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                                            {[
                                                ['Chassis', '7 measures', chassisReady],
                                                ['Dual GNSS', '7 measures', gnssReady],
                                                ['Hitch', '3 measures', hitchReady]
                                            ].map(([label, detail, ready]) => (
                                                <div key={label} className={`flex items-center gap-2 rounded-lg border ${t.borderCard} px-2.5 py-1.5`}>
                                                    <span className={`h-1.5 w-1.5 rounded-full ${ready ? 'bg-green-500' : 'bg-orange-500'}`} />
                                                    <span>
                                                        <span className={`block text-[8px] font-black uppercase ${t.textMain}`}>{label}</span>
                                                        <span className={`block text-[7px] ${t.textDim}`}>{detail}</span>
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div
                                        className="grid grid-cols-[minmax(250px,0.95fr)_minmax(300px,1.05fr)] items-start gap-3 overflow-hidden"
                                        style={{ height: 'min(540px, calc(100vh - 220px))', minHeight: '420px' }}
                                    >
                                        <div className="h-fit">
                                            <RealVehicleMeasurementView />
                                        </div>

                                        <div className={`h-full overflow-y-auto rounded-2xl border ${t.borderCard} p-4`}>
                                            <div className="mb-4">
                                                <div className={`text-[10px] font-black uppercase tracking-wide ${t.textSub}`}>Complete dimension sheet</div>
                                                <div className={`text-base font-black ${t.textMain}`}>Chassis, GNSS and hitch</div>
                                                <p className={`mt-1 text-[10px] leading-relaxed ${t.textSub}`}>Everything is visible here. Select a value and the reference view changes automatically.</p>
                                            </div>

                                            {(
                                                <>
                                                    <div className="mb-3 flex items-center justify-between gap-3">
                                                        <div className="flex items-center gap-2.5">
                                                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-[9px] font-black text-white">01</span>
                                                            <div>
                                                                <div className={`text-xs font-black ${t.textMain}`}>Chassis dimensions</div>
                                                                <div className={`text-[9px] ${t.textDim}`}>Axles, body and turning envelope</div>
                                                            </div>
                                                        </div>
                                                        <span className={`text-[8px] font-black uppercase ${chassisReady ? 'text-green-500' : 'text-orange-500'}`}>{chassisReady ? 'Ready' : 'Check values'}</span>
                                                    </div>
                                                    <div className={`overflow-hidden rounded-xl border ${t.borderCard}`}>
                                                        <VehicleParameterInput field="wheelbase" label="Wheelbase" value={vehicleSettings.wheelbase} hint="Front axle to rear axle." />
                                                        <VehicleParameterInput field="turnRadius" label="Min. turn radius" value={vehicleSettings.turnRadius} hint="Guidance and U-turn limit." />
                                                        <VehicleParameterInput field="frontAxleWidth" label="Front wheel track" value={vehicleSettings.frontAxleWidth} hint="Tire center to tire center." />
                                                        <VehicleParameterInput field="rearAxleWidth" label="Rear wheel track" value={vehicleSettings.rearAxleWidth} hint="Tire center to tire center." />
                                                        <VehicleParameterInput field="frontOverhang" label="Front overhang" value={vehicleSettings.frontOverhang || 0} hint="Front axle to nose." />
                                                        <VehicleParameterInput field="rearOverhang" label="Rear overhang" value={vehicleSettings.rearOverhang || 0} hint="Rear axle to body edge." />
                                                        <VehicleParameterInput field="overallHeight" label="Vehicle height" value={vehicleSettings.overallHeight || 0} hint="Ground to highest point." />
                                                    </div>
                                                    <div className={`mt-3 grid grid-cols-3 gap-2 rounded-xl border ${t.borderCard} p-3`}>
                                                        <div>
                                                            <div className={`text-[8px] font-black uppercase ${t.textSub}`}>Overall length</div>
                                                            <div className={`text-sm font-black ${t.textMain}`}>{overallLength.toFixed(2)} m</div>
                                                        </div>
                                                        <div>
                                                            <div className={`text-[8px] font-black uppercase ${t.textSub}`}>Average track</div>
                                                            <div className={`text-sm font-black ${t.textMain}`}>{avgTrack.toFixed(2)} m</div>
                                                        </div>
                                                        <div>
                                                            <div className={`text-[8px] font-black uppercase ${t.textSub}`}>Steering</div>
                                                            <div className={`truncate text-[11px] font-black ${t.textMain}`}>{vehicleSettings.steeringType || 'Front axle'}</div>
                                                        </div>
                                                    </div>
                                                    <div className={`my-5 h-px ${t.divider}`} />
                                                </>
                                            )}

                                            {(
                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between gap-3">
                                                        <div className="flex items-center gap-2.5">
                                                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-[9px] font-black text-white">02</span>
                                                            <div>
                                                                <div className={`text-xs font-black ${t.textMain}`}>Dual GNSS receiver</div>
                                                                <div className={`text-[9px] ${t.textDim}`}>Hardware, pair center and antenna alignment</div>
                                                            </div>
                                                        </div>
                                                        <span className={`text-[8px] font-black uppercase ${gnssReady ? 'text-green-500' : 'text-orange-500'}`}>{gnssReady ? 'Ready' : 'Check values'}</span>
                                                    </div>
                                                    <section className="space-y-2">
                                                        <div className="py-1">
                                                            <div className="flex items-start justify-between gap-3">
                                                                <div>
                                                                    <div className={`text-[9px] font-black uppercase tracking-wide ${t.textSub}`}>1 · Dual receiver hardware</div>
                                                                    <div className={`text-xs font-black ${t.textMain}`}>Two antennas on one horizontal crossbar</div>
                                                                </div>
                                                                <span className="rounded-lg bg-amber-500/12 px-2 py-1 text-[8px] font-black uppercase text-amber-500">A ↔ B · Horizontal</span>
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-1 gap-2">
                                                            <SettingSelect label="Receiver Model" value={vehicleSettings.gnssReceiverModel || 'AG-372'} onChange={(value) => handleVehicleChange('gnssReceiverModel', value)} options={['AG-372', 'SMART7-S', 'Nav-900', 'Generic RTK']} />
                                                            <SettingSelect label="Crossbar Position" value={vehicleSettings.gnssMountPosition || 'Cab roof crossbar'} onChange={(value) => handleVehicleChange('gnssMountPosition', value)} options={['Cab roof crossbar', 'Front roof crossbar', 'Rear roof crossbar', 'Custom crossbar']} />
                                                            <SettingSelect label="Primary Antenna" value={vehicleSettings.gnssPrimarySide || 'Left / ANT A'} onChange={(value) => handleVehicleChange('gnssPrimarySide', value)} options={['Left / ANT A', 'Right / ANT B']} />
                                                        </div>
                                                    </section>

                                                    <section className={`overflow-hidden rounded-xl ${theme === 'dark' ? 'bg-slate-900/55' : 'bg-slate-50'}`}>
                                                        <div className={`flex items-start justify-between gap-3 border-b ${t.border} px-3 py-2.5`}>
                                                            <div>
                                                                <div className={`text-[9px] font-black uppercase tracking-wide ${t.textSub}`}>2 · Baseline & pair-center position</div>
                                                                <div className={`text-xs font-black ${t.textMain}`}>Measure from rear axle to the midpoint of ANT A / ANT B</div>
                                                            </div>
                                                            <span className={`shrink-0 rounded-lg ${theme === 'dark' ? 'bg-slate-900' : 'bg-gray-100'} px-2 py-1 text-[8px] font-black ${t.textSub}`}>B + X / Y / Z</span>
                                                        </div>
                                                        <GnssAxisField field="gnssBaseline" axis="B" label="Antenna baseline" value={vehicleSettings.gnssBaseline || 1.2} color="#f59e0b" hint="ANT A center to ANT B center" />
                                                        <GnssAxisField field="antennaToRearAxle" axis="X" label="Pair-center fore-aft" value={vehicleSettings.antennaToRearAxle || 0} color="#2563eb" hint="+ forward from rear axle" />
                                                        <GnssAxisField field="antennaOffset" axis="Y" label="Pair-center lateral" value={vehicleSettings.antennaOffset} color="#8b5cf6" hint="+ right · − left of vehicle centerline" />
                                                        <GnssAxisField field="antennaHeight" axis="Z" label="Shared antenna height" value={vehicleSettings.antennaHeight} color="#16a34a" hint="Ground to ANT A / ANT B phase centers" />
                                                    </section>

                                                    <section className="pt-1">
                                                        <div className="mb-2.5">
                                                            <div className={`text-[9px] font-black uppercase tracking-wide ${t.textSub}`}>3 · Baseline orientation calibration</div>
                                                            <div className={`text-xs font-black ${t.textMain}`}>Correct crossbar alignment after installation</div>
                                                        </div>
                                                        <div className="grid grid-cols-3 gap-2">
                                                            <GnssAngleField field="gnssHeadingOffset" axis="H" label="Heading" value={vehicleSettings.gnssHeadingOffset || 0} color="#f97316" />
                                                            <GnssAngleField field="gnssRollOffset" axis="R" label="Roll" value={vehicleSettings.gnssRollOffset || 0} color="#06b6d4" />
                                                            <GnssAngleField field="gnssPitchOffset" axis="P" label="Pitch" value={vehicleSettings.gnssPitchOffset || 0} color="#ec4899" />
                                                        </div>
                                                    </section>

                                                    <div className={`flex items-center gap-2 rounded-xl border border-green-500/25 bg-green-500/8 px-3 py-2.5`}>
                                                        <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                                                        <div className="min-w-0">
                                                            <div className="text-[9px] font-black uppercase text-green-500">Reference ready</div>
                                                            <div className={`truncate text-[10px] font-bold ${t.textSub}`}>B {Number(vehicleSettings.gnssBaseline || 0).toFixed(2)} m · X {Number(vehicleSettings.antennaToRearAxle || 0).toFixed(2)} m · Y {Number(vehicleSettings.antennaOffset || 0).toFixed(2)} m · Z {Number(vehicleSettings.antennaHeight || 0).toFixed(2)} m</div>
                                                        </div>
                                                    </div>
                                                    <div className={`my-2 h-px ${t.divider}`} />
                                                </div>
                                            )}

                                            {(
                                                <>
                                                    <div className="mb-3 flex items-center justify-between gap-3">
                                                        <div className="flex items-center gap-2.5">
                                                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600 text-[9px] font-black text-white">03</span>
                                                            <div>
                                                                <div className={`text-xs font-black ${t.textMain}`}>Hitch & coupling point</div>
                                                                <div className={`text-[9px] ${t.textDim}`}>Rear axle reference to implement connection</div>
                                                            </div>
                                                        </div>
                                                        <span className={`text-[8px] font-black uppercase ${hitchReady ? 'text-green-500' : 'text-orange-500'}`}>{hitchReady ? 'Ready' : 'Check values'}</span>
                                                    </div>
                                                    <SettingSelect label="Hitch Type" value={vehicleSettings.hitchType || 'Rear 3-point'} onChange={(value) => handleVehicleChange('hitchType', value)} options={['Rear 3-point', 'Drawbar', 'Integrated', 'Front mount']} />
                                                    <div className={`mt-3 overflow-hidden rounded-xl border ${t.borderCard}`}>
                                                        <VehicleParameterInput field="rearHitch" label="Rear axle to hitch / X" value={vehicleSettings.rearHitch} hint="Axle center to coupling pin." />
                                                        <VehicleParameterInput field="hitchOffset" label="Lateral offset / Y" value={vehicleSettings.hitchOffset || 0} hint="+ right, − left of center." />
                                                        <VehicleParameterInput field="hitchHeight" label="Hitch height / Z" value={vehicleSettings.hitchHeight || 0} hint="Ground to coupling point." />
                                                    </div>
                                                    <div className={`mt-3 rounded-xl ${theme === 'dark' ? 'bg-slate-900/55' : 'bg-slate-50'} p-3`}>
                                                        <div className={`text-[9px] font-black uppercase ${t.textSub}`}>Coupling reference</div>
                                                        <div className={`mt-1 text-xs font-black ${t.textMain}`}>{vehicleSettings.hitchType || 'Rear 3-point'}</div>
                                                        <div className={`mt-1 text-[10px] leading-relaxed ${t.textDim}`}>These offsets are measured from the rear axle center and are used to place the implement correctly on the map.</div>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {vehicleSetupStep === 'summary' && (
                                <div className="grid grid-cols-[minmax(250px,0.9fr)_minmax(300px,1.1fr)] gap-3">
                                    <div className="space-y-3">
                                        <RealVehicleMeasurementView />
                                        <div className="grid grid-cols-3 gap-2">
                                            <SettingsMetric label="Wheelbase" value={`${Number(vehicleSettings.wheelbase || 0).toFixed(2)} m`} />
                                            <SettingsMetric label="Track Avg" value={`${avgTrack.toFixed(2)} m`} />
                                            <SettingsMetric label="Length" value={`${overallLength.toFixed(2)} m`} />
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <div className={`rounded-2xl border ${t.borderCard} p-4`}>
                                            <div className="mb-3 flex items-start justify-between gap-3">
                                                <div>
                                                    <div className={`text-[10px] font-black uppercase tracking-wide ${t.textSub}`}>Vehicle summary</div>
                                                    <div className={`text-base font-black ${t.textMain}`}>{vehicleSettings.label || activeVehicleProfile.label}</div>
                                                </div>
                                                <span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${informationReady && geometryReady ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'}`}>
                                                    {informationReady && geometryReady ? 'Ready to save' : 'Needs review'}
                                                </span>
                                            </div>
                                            {renderReviewRow('Machine', `${vehicleSettings.brand || 'Generic'} ${vehicleSettings.model || vehicleSettings.type}`)}
                                            {renderReviewRow('Control', vehicleSettings.controlType || 'Electronic Steering Wheel')}
                                            {renderReviewRow('Wheelbase', Number(vehicleSettings.wheelbase || 0).toFixed(2), 'm')}
                                            {renderReviewRow('Front / Rear track', `${Number(vehicleSettings.frontAxleWidth || 0).toFixed(2)} / ${Number(vehicleSettings.rearAxleWidth || 0).toFixed(2)}`, 'm')}
                                            {renderReviewRow('GNSS receiver pair', `2 × ${vehicleSettings.gnssReceiverModel || 'Generic RTK'} · ${vehicleSettings.gnssMountPosition || 'Cab roof crossbar'}`)}
                                            {renderReviewRow('GNSS baseline / primary', `${Number(vehicleSettings.gnssBaseline || 0).toFixed(2)} m · ${vehicleSettings.gnssPrimarySide || 'Left / ANT A'}`)}
                                            {renderReviewRow('Pair-center X/Y/Z', `${Number(vehicleSettings.antennaToRearAxle || 0).toFixed(2)} / ${Number(vehicleSettings.antennaOffset || 0).toFixed(2)} / ${Number(vehicleSettings.antennaHeight || 0).toFixed(2)}`, 'm')}
                                            {renderReviewRow('GNSS H/R/P offset', `${Number(vehicleSettings.gnssHeadingOffset || 0).toFixed(1)} / ${Number(vehicleSettings.gnssRollOffset || 0).toFixed(1)} / ${Number(vehicleSettings.gnssPitchOffset || 0).toFixed(1)}`, '°')}
                                            {renderReviewRow('Hitch X/Y/Z', `${Number(vehicleSettings.rearHitch || 0).toFixed(2)} / ${Number(vehicleSettings.hitchOffset || 0).toFixed(2)} / ${Number(vehicleSettings.hitchHeight || 0).toFixed(2)}`, 'm')}
                                        </div>
                                        <div className={`rounded-2xl border ${t.borderCard} p-4`}>
                                            <div className={`mb-3 text-[10px] font-black uppercase tracking-wide ${t.textSub}`}>Validation</div>
                                            {[
                                                ['Identity complete', informationReady],
                                                ['Chassis dimensions valid', Number(vehicleSettings.wheelbase) > 0 && avgTrack > 0],
                                                ['Dual GNSS baseline configured', Number(vehicleSettings.gnssBaseline) > 0 && Number(vehicleSettings.antennaHeight) > 0 && Number(vehicleSettings.antennaToRearAxle) >= 0],
                                                ['Hitch reference configured', Number(vehicleSettings.rearHitch) >= 0 && Number(vehicleSettings.hitchHeight) >= 0]
                                            ].map(([label, ready]) => (
                                                <div key={label} className="flex items-center gap-2 py-1.5">
                                                    {ready ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <AlertTriangle className="h-4 w-4 text-orange-500" />}
                                                    <span className={`text-xs font-bold ${ready ? t.textMain : 'text-orange-500'}`}>{label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                </section>
            );
        }
        case 'implement': {
            const implementWidth = Number(implementSettings.width) || 0;
            const implementOverallWidth = Number(implementSettings.overallWidth) || implementWidth;
            const implementSections = Math.max(1, Number(implementSettings.sections) || 1);
            const sectionWidth = implementWidth / implementSections;
            const implementTypeLabel = implementTypeOptions.find(option => option.id === getImplementAssetKey(implementSettings))?.label || implementSettings.type || 'Tillage';
            const implementSteps = [
                { id: 'information', label: 'Information', detail: 'Type and connection', icon: Ruler },
                { id: 'geometry', label: 'Dimensions', detail: 'Coverage and reference points', icon: Activity },
                { id: 'summary', label: 'Review', detail: 'Validate and save', icon: CheckCircle2 }
            ];
            const currentStepIndex = implementSteps.findIndex(step => step.id === implementSetupStep);
            const informationReady = Boolean(implementSettings.name)
                && Boolean(implementSettings.type)
                && Boolean(implementSettings.connectionType);
            const coverageReady = implementWidth > 0
                && implementOverallWidth >= implementWidth
                && Number(implementSettings.hitchToWorkPoint) >= 0
                && Number(implementSettings.hitchToRear) >= Number(implementSettings.hitchToWorkPoint);
            const controlReady = implementSections > 0
                && Number(implementSettings.delayOn) >= 0
                && Number(implementSettings.delayOff) >= 0;
            const transportReady = Number(implementSettings.transportWidth) > 0
                && Number(implementSettings.transportLength) > 0
                && Number(implementSettings.weightKg) >= 0;
            const geometryReady = coverageReady && controlReady && transportReady;
            const renderImplementReviewRow = (label, value, unit = '') => (
                <div className={`flex items-center justify-between gap-4 border-b ${t.border} py-2.5 last:border-b-0`}>
                    <span className={`text-xs font-bold ${t.textSub}`}>{label}</span>
                    <span className={`text-right text-sm font-black ${t.textMain}`}>{value}{unit && <span className={`ml-1 text-[10px] uppercase ${t.textDim}`}>{unit}</span>}</span>
                </div>
            );

            return (
                <section className={`${t.bgPanel} min-h-full overflow-hidden`}>
                    <div className={`grid grid-cols-3 border-b ${t.border}`}>
                        {implementSteps.map((step, index) => {
                            const StepIcon = step.icon;
                            const active = step.id === implementSetupStep;
                            const complete = index < currentStepIndex || (step.id === 'information' ? informationReady : step.id === 'geometry' ? geometryReady : false);
                            return (
                                <button
                                    key={step.id}
                                    type="button"
                                    onClick={() => goToImplementStep(index)}
                                    className={`relative flex min-w-0 items-center justify-center gap-2 px-2 py-3 text-left transition-colors ${active ? (theme === 'dark' ? 'bg-blue-500/12' : 'bg-blue-50') : 'hover:bg-blue-500/5'}`}
                                >
                                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-black ${active ? 'bg-blue-600 text-white' : complete ? 'bg-green-500/15 text-green-500' : `${theme === 'dark' ? 'bg-slate-800' : 'bg-gray-100'} ${t.textSub}`}`}>
                                        {complete && !active ? <Check className="h-3.5 w-3.5" /> : <StepIcon className="h-3.5 w-3.5" />}
                                    </span>
                                    <span className="hidden min-w-0 sm:block">
                                        <span className={`block truncate text-xs font-black ${active ? 'text-blue-500' : t.textMain}`}>{step.label}</span>
                                        <span className={`block truncate text-[9px] ${t.textDim}`}>{step.detail}</span>
                                    </span>
                                    {active && <span className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-blue-600" />}
                                </button>
                            );
                        })}
                    </div>

                    <div className="grid min-h-[560px] grid-cols-[232px_minmax(0,1fr)]">
                        <ImplementLibrarySidebar />

                        <div className="min-w-0 p-4 lg:p-5">
                            {implementSetupStep === 'information' && (
                                <div className="space-y-3">
                                    <div className={`overflow-hidden rounded-2xl border ${t.borderCard}`}>
                                        <div className={`flex flex-wrap items-center justify-between gap-4 border-b ${t.border} px-5 py-4`}>
                                            <div className="flex min-w-0 items-center gap-4">
                                                <span className={`flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-xl border ${t.borderCard} ${theme === 'dark' ? 'bg-slate-950' : 'bg-slate-50'}`}>
                                                    <img src={getImplementAsset(implementSettings)} alt="" aria-hidden="true" className="h-full w-full object-contain p-1.5" />
                                                </span>
                                                <div className="min-w-0">
                                                    <div className={`text-[10px] font-black uppercase tracking-wide ${t.textSub}`}>
                                                        {implementSettings.profileId === activeImplementSettings.profileId ? 'Active implement' : implementSettings.profileId ? 'Selected implement' : 'New implement draft'}
                                                    </div>
                                                    <div className={`truncate text-lg font-black leading-6 ${t.textMain}`}>{cleanProfileLabel(implementSettings.name, activeImplementProfile.label)}</div>
                                                    <div className={`truncate text-[10px] ${t.textSub}`}>{implementTypeLabel} · {implementSettings.connectionType || 'Connection required'}</div>
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap items-center justify-end gap-2">
                                                <span className={`rounded-lg border ${t.borderCard} px-3 py-2 text-[10px] font-black ${t.textMain}`}>{implementWidth.toFixed(1)} m work</span>
                                                <span className={`rounded-lg border ${t.borderCard} px-3 py-2 text-[10px] font-black ${t.textMain}`}>{implementSections} sections</span>
                                                <span className={`rounded-full px-3 py-1.5 text-[9px] font-black uppercase ${informationReady ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'}`}>
                                                    {informationReady ? 'Complete' : 'Required'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="p-5">
                                            <div className="mb-4 flex items-end justify-between gap-3">
                                                <div>
                                                    <div className={`text-sm font-black ${t.textMain}`}>Choose implement type</div>
                                                    <div className={`mt-0.5 text-[10px] ${t.textDim}`}>Pick by picture first; dimensions and control defaults update automatically.</div>
                                                </div>
                                                <span className={`text-[10px] font-black uppercase ${t.textSub}`}>7 categories</span>
                                            </div>
                                            <div className="grid grid-cols-[repeat(auto-fit,minmax(132px,1fr))] gap-3">
                                                {implementTypeOptions.map((option) => {
                                                    const active = getImplementAssetKey(implementSettings) === option.id;
                                                    return (
                                                        <button
                                                            key={option.id}
                                                            type="button"
                                                            onClick={() => applyImplementType(option)}
                                                            className={`group relative min-w-0 overflow-hidden rounded-xl border p-3 text-left transition-colors ${active ? 'border-blue-500 bg-blue-500/10 ring-1 ring-blue-500/15' : `${t.borderCard} ${theme === 'dark' ? 'bg-slate-900/55' : 'bg-white'} hover:border-blue-500/50`}`}
                                                        >
                                                            <div className={`flex h-24 items-center justify-center rounded-lg ${theme === 'dark' ? 'bg-slate-950/70' : 'bg-slate-50'}`}>
                                                                <img src={`src/assets/implements/${option.id}.png`} alt="" aria-hidden="true" className="h-full w-full object-contain p-1.5" />
                                                            </div>
                                                            <div className={`mt-2.5 truncate text-[11px] font-black ${active ? 'text-blue-500' : t.textMain}`}>{option.label}</div>
                                                            <div className={`mt-0.5 truncate text-[9px] ${t.textDim}`}>{option.detail}</div>
                                                            {active && <CheckCircle2 className="absolute right-2.5 top-2.5 h-[18px] w-[18px] text-blue-500" />}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>

                                    <div className={`overflow-hidden rounded-2xl border ${t.borderCard}`}>
                                        <div className={`border-b ${t.border} px-5 py-4`}>
                                            <div className={`text-[10px] font-black uppercase tracking-wide ${t.textSub}`}>Implement identity</div>
                                            <div className={`text-base font-black ${t.textMain}`}>Name, connection and control</div>
                                        </div>
                                        <div className="grid grid-cols-1 gap-4 p-5 md:grid-cols-2">
                                            <SettingInput theme={t} label="Implement Name" value={implementSettings.name || ''} onChange={(event) => handleImplementChange('name', event.target.value)} />
                                            <SettingSelect label="Implement Type" value={implementTypeLabel} onChange={(value) => {
                                                const option = implementTypeOptions.find(item => item.label === value);
                                                if (option) applyImplementType(option);
                                            }} options={implementTypeOptions.map(option => option.label)} />
                                            <SettingInput theme={t} label="Brand" value={implementSettings.brand || ''} onChange={(event) => handleImplementChange('brand', event.target.value)} />
                                            <SettingInput theme={t} label="Model" value={implementSettings.model || ''} onChange={(event) => handleImplementChange('model', event.target.value)} />
                                            <SettingInput theme={t} label="Serial Number" value={implementSettings.serialNumber || ''} onChange={(event) => handleImplementChange('serialNumber', event.target.value)} />
                                            <SettingSelect label="Connection" value={implementSettings.connectionType || 'Rear 3-point'} onChange={(value) => handleImplementChange('connectionType', value)} options={['Rear 3-point', 'Drawbar', 'Front mount', 'Integrated']} />
                                            <SettingSelect label="Control Mode" value={implementSettings.controlMode || 'Manual Lift'} onChange={(value) => {
                                                handleImplementChange('controlMode', value);
                                                handleImplementChange('sectionControl', ['Section Control', 'Boom Sections'].includes(value));
                                            }} options={['Manual Lift', 'Section Control', 'Boom Sections', 'Rate Control', 'Grade Control', 'Header Control', 'ISOBUS']} />
                                            <div className={`flex items-center justify-between rounded-lg border ${t.borderCard} ${t.bgInput} px-4 py-2.5`}>
                                                <span>
                                                    <span className={`block text-[11px] font-bold uppercase ${t.textSub}`}>Automatic Sections</span>
                                                    <span className={`block text-[9px] ${t.textDim}`}>Use coverage map to switch sections.</span>
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleImplementChange('sectionControl', !implementSettings.sectionControl)}
                                                    className={`h-6 w-11 rounded-full p-0.5 transition-colors ${implementSettings.sectionControl ? 'bg-green-500' : 'bg-slate-500'}`}
                                                >
                                                    <span className={`block h-5 w-5 rounded-full bg-white transition-transform ${implementSettings.sectionControl ? 'translate-x-5' : ''}`} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {implementSetupStep === 'geometry' && (
                                <div className="space-y-3">
                                    <div className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border ${t.borderCard} p-3`}>
                                        <div>
                                            <div className={`text-[9px] font-black uppercase tracking-wide ${t.textSub}`}>Geometry setup</div>
                                            <div className={`text-sm font-black ${t.textMain}`}>All implement reference points</div>
                                            <div className={`mt-0.5 text-[9px] ${t.textDim}`}>One page · select any value to update the real implement visual</div>
                                        </div>
                                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                                            {[
                                                ['Coverage', '6 values', coverageReady],
                                                ['Control', '4 values', controlReady],
                                                ['Transport', '4 values', transportReady]
                                            ].map(([label, detail, ready]) => (
                                                <div key={label} className={`flex items-center gap-2 rounded-lg border ${t.borderCard} px-2.5 py-1.5`}>
                                                    <span className={`h-1.5 w-1.5 rounded-full ${ready ? 'bg-green-500' : 'bg-orange-500'}`} />
                                                    <span>
                                                        <span className={`block text-[8px] font-black uppercase ${t.textMain}`}>{label}</span>
                                                        <span className={`block text-[7px] ${t.textDim}`}>{detail}</span>
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div
                                        className="grid grid-cols-[minmax(250px,0.95fr)_minmax(320px,1.05fr)] items-start gap-3 overflow-hidden"
                                        style={{ height: 'min(540px, calc(100vh - 220px))', minHeight: '420px' }}
                                    >
                                        <div className="h-fit">
                                            <RealImplementMeasurementView />
                                        </div>

                                        <div className={`h-full overflow-y-auto rounded-2xl border ${t.borderCard}`}>
                                            <div className={`border-b ${t.border} px-4 py-3`}>
                                                <div className={`text-[9px] font-black uppercase tracking-wide ${t.textSub}`}>Complete geometry sheet</div>
                                                <div className={`text-sm font-black ${t.textMain}`}>Coverage, attachment and transport</div>
                                                <div className={`mt-1 text-[9px] ${t.textDim}`}>The selected measurement is highlighted on the real implement.</div>
                                            </div>

                                            <div className={`flex items-start gap-3 border-b ${t.border} px-4 py-3`}>
                                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-[9px] font-black text-white">01</span>
                                                <div>
                                                    <div className={`text-xs font-black ${t.textMain}`}>Coverage geometry</div>
                                                    <div className={`text-[9px] ${t.textDim}`}>Pass spacing and implement footprint</div>
                                                </div>
                                            </div>
                                            <div>
                                                <ImplementParameterInput field="width" label="Working width" value={implementSettings.width} hint="Effective treated width." />
                                                <ImplementParameterInput field="overallWidth" label="Overall width" value={implementSettings.overallWidth} hint="Physical edge to edge." />
                                                <ImplementParameterInput field="overlap" label="Skip / overlap" value={implementSettings.overlap} hint="Positive value overlaps adjacent passes." />
                                                <ImplementParameterInput field="offset" label="Lateral offset" value={implementSettings.offset} hint="+ right, − left of tractor centerline." />
                                                <ImplementParameterInput field="workingDepth" label="Working depth" value={implementSettings.workingDepth} hint="Nominal depth below ground." />
                                            </div>

                                            <div className={`flex items-start gap-3 border-y ${t.border} px-4 py-3`}>
                                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-500 text-[9px] font-black text-white">02</span>
                                                <div>
                                                    <div className={`text-xs font-black ${t.textMain}`}>Attachment reference</div>
                                                    <div className={`text-[9px] ${t.textDim}`}>Measure every distance from the hitch datum</div>
                                                </div>
                                            </div>
                                            <div className={`border-b ${t.border} p-3`}>
                                                <SettingSelect label="Connection Type" value={implementSettings.connectionType || 'Rear 3-point'} onChange={(value) => handleImplementChange('connectionType', value)} options={['Rear 3-point', 'Drawbar', 'Front mount', 'Integrated']} />
                                            </div>
                                            <div>
                                                <ImplementParameterInput field="hitchToWorkPoint" label="Hitch to working point" value={implementSettings.hitchToWorkPoint} hint="Hitch datum to active tool center." />
                                                <ImplementParameterInput field="hitchToRear" label="Hitch to rear edge" value={implementSettings.hitchToRear} hint="Hitch datum to furthest rear point." />
                                            </div>

                                            <div className={`flex items-start gap-3 border-y ${t.border} px-4 py-3`}>
                                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-green-600 text-[9px] font-black text-white">03</span>
                                                <div>
                                                    <div className={`text-xs font-black ${t.textMain}`}>Rows, sections and timing</div>
                                                    <div className={`text-[9px] ${t.textDim}`}>Control layout used during coverage recording</div>
                                                </div>
                                            </div>
                                            <div>
                                                <ImplementParameterInput field="sections" label="Sections / rows" value={implementSettings.sections} unit="" hint={`${sectionWidth.toFixed(2)} m per section.`} step="1" />
                                                <ImplementParameterInput field="rowSpacing" label="Row spacing" value={implementSettings.rowSpacing} hint="Center-to-center row spacing." step="0.001" />
                                                <ImplementParameterInput field="delayOn" label="Switch-on delay" value={implementSettings.delayOn} unit="s" hint="Advance when entering untreated area." step="0.1" />
                                                <ImplementParameterInput field="delayOff" label="Switch-off delay" value={implementSettings.delayOff} unit="s" hint="Delay when leaving treated area." step="0.1" />
                                            </div>

                                            <div className={`flex items-start gap-3 border-y ${t.border} px-4 py-3`}>
                                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-teal-600 text-[9px] font-black text-white">04</span>
                                                <div>
                                                    <div className={`text-xs font-black ${t.textMain}`}>Transport and capacity</div>
                                                    <div className={`text-[9px] ${t.textDim}`}>Folded envelope and operational load</div>
                                                </div>
                                            </div>
                                            <div>
                                                <ImplementParameterInput field="transportWidth" label="Transport width" value={implementSettings.transportWidth} hint="Folded or road width." />
                                                <ImplementParameterInput field="transportLength" label="Transport length" value={implementSettings.transportLength} hint="Hitch to rear in transport state." />
                                                <ImplementParameterInput field="weightKg" label="Operating weight" value={implementSettings.weightKg} unit="kg" hint="Loaded operational weight." step="1" />
                                                <ImplementParameterInput field="capacity" label={implementSettings.type === 'Land Leveling' ? 'Bowl capacity' : 'Tank / hopper capacity'} value={implementSettings.capacity} unit={implementSettings.type === 'Land Leveling' ? 'm³' : 'L'} hint="Nominal usable capacity." step="1" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {implementSetupStep === 'summary' && (
                                <div className="grid grid-cols-[minmax(250px,0.95fr)_minmax(320px,1.05fr)] gap-3">
                                    <RealImplementMeasurementView />
                                    <div className="space-y-3">
                                        <div className={`rounded-2xl border ${t.borderCard} p-4`}>
                                            <div className="mb-3 flex items-start justify-between gap-3">
                                                <div>
                                                    <div className={`text-[10px] font-black uppercase tracking-wide ${t.textSub}`}>Implement summary</div>
                                                    <div className={`text-base font-black ${t.textMain}`}>{cleanProfileLabel(implementSettings.name, activeImplementProfile.label)}</div>
                                                    <div className={`text-[10px] ${t.textSub}`}>{implementSettings.brand || 'Generic'} · {implementSettings.model || implementSettings.type}</div>
                                                </div>
                                                <span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${informationReady && geometryReady ? 'bg-green-500/10 text-green-500' : 'bg-orange-500/10 text-orange-500'}`}>
                                                    {informationReady && geometryReady ? 'Ready to save' : 'Needs review'}
                                                </span>
                                            </div>
                                            {renderImplementReviewRow('Type / connection', `${implementTypeLabel} · ${implementSettings.connectionType}`)}
                                            {renderImplementReviewRow('Working / overall width', `${implementWidth.toFixed(2)} / ${implementOverallWidth.toFixed(2)}`, 'm')}
                                            {renderImplementReviewRow('Hitch to work / rear', `${Number(implementSettings.hitchToWorkPoint || 0).toFixed(2)} / ${Number(implementSettings.hitchToRear || 0).toFixed(2)}`, 'm')}
                                            {renderImplementReviewRow('Offset / overlap', `${Number(implementSettings.offset || 0).toFixed(2)} / ${Number(implementSettings.overlap || 0).toFixed(2)}`, 'm')}
                                            {renderImplementReviewRow('Sections / row spacing', `${implementSections} / ${Number(implementSettings.rowSpacing || 0).toFixed(3)}`, 'm')}
                                            {renderImplementReviewRow('Control / timing', `${implementSettings.controlMode} · ${Number(implementSettings.delayOn || 0).toFixed(1)} / ${Number(implementSettings.delayOff || 0).toFixed(1)} s`)}
                                            {renderImplementReviewRow('Transport W / L', `${Number(implementSettings.transportWidth || 0).toFixed(2)} / ${Number(implementSettings.transportLength || 0).toFixed(2)}`, 'm')}
                                            {renderImplementReviewRow('Weight / capacity', `${Math.round(Number(implementSettings.weightKg || 0))} kg · ${Number(implementSettings.capacity || 0).toFixed(0)} ${implementSettings.type === 'Land Leveling' ? 'm³' : 'L'}`)}
                                        </div>
                                        <div className={`rounded-2xl border ${t.borderCard} p-4`}>
                                            <div className={`mb-3 text-[10px] font-black uppercase tracking-wide ${t.textSub}`}>Validation</div>
                                            {[
                                                ['Identity and connection complete', informationReady],
                                                ['Coverage geometry valid', coverageReady],
                                                ['Sections and timing valid', controlReady],
                                                ['Transport envelope valid', transportReady]
                                            ].map(([label, ready]) => (
                                                <div key={label} className="flex items-center gap-2 py-1.5">
                                                    {ready ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <AlertTriangle className="h-4 w-4 text-orange-500" />}
                                                    <span className={`text-xs font-bold ${ready ? t.textMain : 'text-orange-500'}`}>{label}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            );
        }
        case 'guidance': return (
            <div className="space-y-5">
                <SettingsSection
                    title="Guidance Lines"
                    detail="Line selection, multi-line lanes and acquisition behavior."
                    icon={Route}
                    actions={<><SettingsActionButton onClick={() => setLinesPanelOpen(true)}>Open Lines</SettingsActionButton><SettingsActionButton variant="primary" onClick={() => setLineModeModalOpen(true)}>Create Line</SettingsActionButton></>}
                >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <ConfigTile icon={Route} label="Active Line" value={activeLineRecord?.name || getGuidanceModeLabel()} />
                        <ConfigTile icon={Ruler} label="Implement Width" value={`${implementSettings.width.toFixed(1)} m`} />
                        <ConfigTile icon={ArrowLeftRight} label="Trim Offset" value={`${(manualOffset / PIXELS_PER_METER * 100).toFixed(1)} cm`} />
                    </div>
                    <button onClick={handleToggleMultiLine} className={`w-full flex items-center justify-between p-4 ${t.bgInput} border ${t.borderCard} rounded-xl text-left`}>
                        <div>
                            <div className={`font-bold ${t.textMain}`}>Parallel Guidance Lines</div>
                            <div className={`text-xs ${t.textSub}`}>Show lane set around the active AB/A+ line.</div>
                        </div>
                        <div className={`w-12 h-7 rounded-full p-1 transition-colors ${isMultiLineMode ? 'bg-green-500' : 'bg-slate-400'}`}>
                            <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${isMultiLineMode ? 'translate-x-5' : ''}`}></div>
                        </div>
                    </button>
                </SettingsSection>
                <SettingsSection title="Auto Guidance" detail="Controller aggressiveness and compensation options." icon={Navigation}>
                    <div className="grid grid-cols-1 gap-4">
                        <SettingSlider theme={t} label="Steering Sensitivity" value={75} min={0} max={100} />
                        <SettingSlider theme={t} label="Line Acquisition Aggressiveness" value={60} min={0} max={100} />
                        <FeatureToggle label="Terrain Compensation" detail="IMU slope and bump correction for stable line tracking" featureKey="terrainCompensation" icon={Activity} />
                    </div>
                </SettingsSection>
            </div>
        );
        case 'steering': return (
            <div className="space-y-5">
                <SettingsSection title="Steering Controller" detail="Manual takeover, external switch and controller output." icon={SteeringWheelIcon}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                        <SettingsMetric label="Mode" value={steeringMode} tone={steeringMode === 'AUTO' ? 'text-green-500' : t.textMain} />
                        <SettingsMetric label="Wheel Angle" value={`${steeringAngle.toFixed(1)} deg`} />
                        <SettingsMetric label="Output" value={featureSettings.canbusSteerReady ? 'CAN' : featureSettings.pwmSteerReady ? 'PWM' : 'Manual'} />
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                        <FeatureToggle label="Electric Power Steering" detail="Power assist when manual intervention is detected" featureKey="electricPowerSteering" icon={SteeringWheelIcon} />
                        <FeatureToggle label="Manual Intervention Ready" detail="Operator can take over without digging through screen controls" featureKey="manualIntervention" icon={MousePointer2} />
                        <FeatureToggle label="Easy Switch / Foot Pedal" detail="External switch or pedal toggles auto and manual modes" featureKey="easySwitch" icon={Disc} />
                        <FeatureToggle label="CANBUS Steer Ready" detail="Integrate with steer-ready tractors through CAN control" featureKey="canbusSteerReady" icon={Cpu} />
                        <FeatureToggle label="PWM Steering Output" detail="Fallback PWM control path for hydraulic retrofits" featureKey="pwmSteerReady" icon={Activity} />
                    </div>
                </SettingsSection>
            </div>
        );
        case 'uturn': {
            const turnConfig = {
              enabled: true,
              headlandMode: 'Auto from boundary',
              pattern: 'Smart U-Turn',
              direction: 'Auto',
              nextPass: 'Adjacent',
              skipPasses: 0,
              trigger: 'Manual confirm',
              startDistanceM: 18,
              turnSpeedKmh: 5.5,
              aggressiveness: 70,
              liftAction: true,
              resumeAutosteer: true,
              pauseCoverage: true,
              requireBoundary: false,
              ...uTurnSettings
            };
            const turnPatternOptions = [
                { id: 'Smart U-Turn', title: 'Smart U-Turn', detail: 'Boundary-aware path to the selected next pass.', icon: CornerUpLeft },
                { id: 'Basic Omega', title: 'Basic Omega', detail: 'Wide single sweep when headland space is limited.', icon: CornerUpRight },
                { id: 'Fish Tail', title: 'Fish Tail', detail: 'Two-stage turn to line up trailing implements.', icon: Spline },
                { id: 'Manual Assist', title: 'Manual Assist', detail: 'Operator steers, system keeps target pass ready.', icon: SteeringWheelIcon }
            ];
            const renderTurnToggle = ({ label, detail, settingKey, icon: Icon = CheckCircle2 }) => (
                <button
                    onClick={() => handleUTurnSettingChange(settingKey, !turnConfig[settingKey])}
                    className={`p-4 rounded-xl border text-left flex items-center justify-between gap-4 ${turnConfig[settingKey] ? 'border-green-500/50 bg-green-500/10' : `${t.borderCard} ${t.bgInput}`}`}
                >
                    <div className="flex items-center gap-3 min-w-0">
                        <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${turnConfig[settingKey] ? 'bg-green-500 text-white' : `${theme === 'dark' ? 'bg-slate-800' : 'bg-white'} ${t.textDim}`}`}>
                            <Icon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <div className={`font-bold ${t.textMain}`}>{label}</div>
                            <div className={`text-xs ${t.textSub}`}>{detail}</div>
                        </div>
                    </div>
                    <div className={`shrink-0 w-12 h-7 rounded-full p-1 transition-colors ${turnConfig[settingKey] ? 'bg-green-500' : 'bg-slate-400'}`}>
                        <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${turnConfig[settingKey] ? 'translate-x-5' : ''}`}></div>
                    </div>
                </button>
            );

            return (
              <div className="space-y-5">
                <SettingsSection
                    title="Headland Turn Assist"
                    detail="Configure how the controller leaves one pass, turns at the headland and enters the next pass."
                    icon={CornerUpLeft}
                    actions={<><SettingsActionButton onClick={() => cancelTurnAssist()}>Cancel Turn</SettingsActionButton><SettingsActionButton variant="primary" onClick={() => handleUTurn()}>Test Turn</SettingsActionButton></>}
                >
                    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                        <SettingsMetric label="State" value={turnAssistActive ? 'Turning' : turnConfig.enabled ? 'Ready' : 'Off'} tone={turnAssistActive ? 'text-blue-500' : turnConfig.enabled ? 'text-green-500' : 'text-slate-500'} />
                        <SettingsMetric label="Pattern" value={turnConfig.pattern} />
                        <SettingsMetric label="Next Pass" value={turnConfig.nextPass === 'Skip' ? `Skip ${turnConfig.skipPasses}` : turnConfig.nextPass} />
                        <SettingsMetric label="Turn Speed" value={`${Number(turnConfig.turnSpeedKmh || 0).toFixed(1)} km/h`} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {renderTurnToggle({ label: 'Enable Turn Assist', detail: 'Allow one-tap or headland-triggered U-turn workflow.', settingKey: 'enabled', icon: CornerUpLeft })}
                        {renderTurnToggle({ label: 'Use Headland Path', detail: 'Use boundary/headland geometry to keep the turn inside the field.', settingKey: 'requireBoundary', icon: MapPin })}
                    </div>
                </SettingsSection>

                <SettingsSection title="Turn Pattern" detail="Choose the path shape before running automatic or assisted turns." icon={Route}>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                        {turnPatternOptions.map((option) => {
                            const active = turnConfig.pattern === option.id;
                            const Icon = option.icon;
                            return (
                                <button
                                    key={option.id}
                                    onClick={() => handleUTurnSettingChange('pattern', option.id)}
                                    className={`text-left rounded-xl border p-4 min-h-[132px] transition-all ${active ? 'border-blue-500 bg-blue-500/10' : `${t.borderCard} ${theme === 'dark' ? 'bg-slate-900/70' : 'bg-white'} hover:brightness-95`}`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${active ? 'bg-blue-600 text-white' : `${theme === 'dark' ? 'bg-slate-800' : 'bg-gray-100'} text-blue-500`}`}>
                                            <Icon className="w-5 h-5" />
                                        </div>
                                        {active && <CheckCircle2 className="w-5 h-5 text-blue-500" />}
                                    </div>
                                    <div className={`mt-3 font-black ${t.textMain}`}>{option.title}</div>
                                    <div className={`text-xs ${t.textSub}`}>{option.detail}</div>
                                </button>
                            );
                        })}
                    </div>
                </SettingsSection>

                <SettingsSection title="Turn Rules" detail="These values define when the turn starts and which pass it targets." icon={Settings}>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                        <SettingSelect label="Direction" value={turnConfig.direction} onChange={(value) => handleUTurnSettingChange('direction', value)} options={['Auto', 'Left', 'Right']} />
                        <SettingSelect label="Next Pass" value={turnConfig.nextPass} onChange={(value) => handleUTurnSettingChange('nextPass', value)} options={['Adjacent', 'Skip', 'Same Track', 'Manual Select']} />
                        <SettingInput theme={t} label="Skip Passes" value={turnConfig.skipPasses} type="number" onChange={(e) => handleUTurnSettingChange('skipPasses', Math.max(0, parseInt(e.target.value, 10) || 0))} />
                        <SettingSelect label="Trigger" value={turnConfig.trigger} onChange={(value) => handleUTurnSettingChange('trigger', value)} options={['Manual confirm', 'Headland prompt', 'Auto at boundary']} />
                        <SettingInput theme={t} label="Start Distance (m)" value={turnConfig.startDistanceM} type="number" onChange={(e) => handleUTurnSettingChange('startDistanceM', Math.max(0, parseFloat(e.target.value) || 0))} />
                        <SettingInput theme={t} label="Turn Speed (km/h)" value={turnConfig.turnSpeedKmh} type="number" onChange={(e) => handleUTurnSettingChange('turnSpeedKmh', Math.max(1, parseFloat(e.target.value) || 1))} />
                        <SettingInput theme={t} label="Aggressiveness (%)" value={turnConfig.aggressiveness} type="number" onChange={(e) => handleUTurnSettingChange('aggressiveness', Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0)))} />
                        <SettingSelect label="Headland Mode" value={turnConfig.headlandMode} onChange={(value) => handleUTurnSettingChange('headlandMode', value)} options={['Auto from boundary', 'Manual headland', 'No headland']} />
                    </div>
                </SettingsSection>

                <SettingsSection title="Implement Actions" detail="Actions applied around the turn so coverage and implement state stay clean." icon={ArrowUpFromDot}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {renderTurnToggle({ label: 'Lift Implement', detail: 'Raise at start, lower when aligned to next pass.', settingKey: 'liftAction', icon: ArrowUpFromDot })}
                        {renderTurnToggle({ label: 'Pause Coverage', detail: 'Do not paint coverage while turning on headland.', settingKey: 'pauseCoverage', icon: Pause })}
                        {renderTurnToggle({ label: 'Resume Autosteer', detail: 'Re-engage guidance when heading error is acceptable.', settingKey: 'resumeAutosteer', icon: CheckCircle2 })}
                    </div>
                </SettingsSection>
              </div>
            );
        }
        case 'isobus': return (
            <div className="space-y-5">
                <SettingsSection title="ISOBUS / Implement Control" detail="UT, task controller and automatic implement state." icon={Cpu}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                        <ConfigTile icon={Monitor} label="Terminal" value={featureSettings.isobusUT ? 'UT online' : 'Disabled'} tone={featureSettings.isobusUT ? 'text-green-500' : 'text-slate-500'} />
                        <ConfigTile icon={CheckSquare} label="Section Control" value={featureSettings.sectionControl ? 'TC-SC' : 'Off'} tone={featureSettings.sectionControl ? 'text-green-500' : 'text-slate-500'} />
                        <ConfigTile icon={Layers} label="Rate Control" value={featureSettings.variableRate ? 'TC-GEO' : 'Manual'} tone={featureSettings.variableRate ? 'text-green-500' : 'text-slate-500'} />
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                        <FeatureToggle label="ISOBUS UT" detail="Universal Terminal for compatible implement screens" featureKey="isobusUT" icon={Monitor} />
                        <FeatureToggle label="TC-SC Section Control" detail="Automatic section switching to reduce skips and overlaps" featureKey="sectionControl" icon={CheckSquare} />
                        <FeatureToggle label="TC-GEO Variable Rate" detail="Georeferenced rate control for prescription maps" featureKey="variableRate" icon={Layers} />
                        <FeatureToggle label="Auto Acre Recording" detail="Work area starts/stops from implement state" featureKey="acreRecording" icon={Ruler} />
                        <FeatureToggle label="Lift Sensor" detail="Detect implement raised/lowered for accurate coverage tracking" featureKey="liftSensor" icon={ArrowUpFromDot} />
                    </div>
                </SettingsSection>
            </div>
        );
        case 'camera': return (
            <div className="space-y-5">
                <SettingsSection
                    title="Camera"
                    detail="Rear implement and blind spot feeds."
                    icon={Video}
                    actions={<SettingsActionButton variant="primary" onClick={() => setCameraPanelOpen(true)}>Open Monitor</SettingsActionButton>}
                >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <ConfigTile icon={Video} label="Rear Implement" value={featureSettings.wiredCamera ? 'Live' : 'Offline'} tone={featureSettings.wiredCamera ? 'text-green-500' : 'text-slate-500'} />
                        <ConfigTile icon={Video} label="Blind Spot" value={featureSettings.wirelessCamera ? 'Live' : 'Offline'} tone={featureSettings.wirelessCamera ? 'text-green-500' : 'text-slate-500'} />
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                        <FeatureToggle label="Wired Camera" detail="Stable implement view for rear and row monitoring" featureKey="wiredCamera" icon={Video} />
                        <FeatureToggle label="Wireless Camera" detail="Flexible safety feed for headland and blind spot coverage" featureKey="wirelessCamera" icon={Video} />
                    </div>
                </SettingsSection>
            </div>
        );
        case 'diagnostics': return (
            <div className="space-y-5">
                <SettingsSection
                    title="Diagnostics / OBD"
                    detail="Vehicle health, controller bus and service logs."
                    icon={Gauge}
                    actions={<SettingsActionButton variant="primary" onClick={() => setDiagnosticsPanelOpen(true)}>Open Center</SettingsActionButton>}
                >
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
                        <SettingsMetric label="OBD" value={featureSettings.obd ? 'Live' : 'Off'} tone={featureSettings.obd ? 'text-green-500' : 'text-slate-500'} />
                        <SettingsMetric label="CAN" value={featureSettings.canbusSteerReady ? 'Online' : 'Offline'} tone={featureSettings.canbusSteerReady ? 'text-green-500' : 'text-yellow-500'} />
                        <SettingsMetric label="IMU" value={featureSettings.terrainCompensation ? 'OK' : 'Bypass'} />
                        <SettingsMetric label="Logs" value="Ready" />
                    </div>
                    <FeatureToggle label="On-Board Diagnostics" detail="Live vehicle status: RPM, engine load, temperature and alerts" featureKey="obd" icon={Gauge} />
                </SettingsSection>
                <SettingsSection
                    title="Factory Reset"
                    detail="Restore default fields, machine setup, RTK profile, guidance state and local run settings."
                    icon={AlertTriangle}
                    actions={<SettingsActionButton variant="danger" onClick={handleFactoryReset}>Factory Reset</SettingsActionButton>}
                >
                    <div className={`rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm ${theme === 'dark' ? 'text-red-200' : 'text-red-700'}`}>
                        This clears saved demo fields, active line, tasks, RTK setup, vehicle/implement setup and runtime counters.
                    </div>
                </SettingsSection>
            </div>
        );
        case 'data': return (
            <div className="space-y-5">
                <SettingsSection
                    title="Local Database"
                    detail="Persistent local storage for fields, lines, profiles, RTK setup and machine configuration."
                    icon={Save}
                    actions={<SettingsActionButton variant="primary" onClick={() => { actions.setLocalDatabase(prev => ({ ...(prev || {}), status: 'Saved manually' })); showNotification('Local database saved', 'success'); }}>Save Now</SettingsActionButton>}
                >
                    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                        <SettingsMetric label="Status" value={localDatabase?.status || 'Ready'} tone={(localDatabase?.status || '').includes('failed') ? 'text-red-500' : 'text-green-500'} />
                        <SettingsMetric label="Adapter" value={localDatabase?.adapter || 'localStorage'} />
                        <SettingsMetric label="Version" value={`v${localDatabase?.version || 1}`} />
                        <SettingsMetric label="Fields" value={fields.length} />
                    </div>
                    <div className={`rounded-xl border ${t.borderCard} ${t.bgInput} p-4 grid grid-cols-1 md:grid-cols-2 gap-3`}>
                        <div className="min-w-0">
                            <div className={`text-[10px] uppercase font-black ${t.textSub}`}>Storage Key</div>
                            <div className={`font-mono text-sm font-black truncate ${t.textMain}`}>{localDatabase?.storageKey || 'autosteer.local.db.v1'}</div>
                        </div>
                        <div className="min-w-0">
                            <div className={`text-[10px] uppercase font-black ${t.textSub}`}>Last Saved</div>
                            <div className={`text-sm font-black truncate ${t.textMain}`}>
                                {localDatabase?.lastSavedAt ? new Date(localDatabase.lastSavedAt).toLocaleString() : 'Not saved yet'}
                            </div>
                        </div>
                        <div className="min-w-0">
                            <div className={`text-[10px] uppercase font-black ${t.textSub}`}>Last Loaded</div>
                            <div className={`text-sm font-black truncate ${t.textMain}`}>
                                {localDatabase?.lastLoadedAt ? new Date(localDatabase.lastLoadedAt).toLocaleString() : 'This session'}
                            </div>
                        </div>
                        <div className="min-w-0">
                            <div className={`text-[10px] uppercase font-black ${t.textSub}`}>Saved Objects</div>
                            <div className={`text-sm font-black truncate ${t.textMain}`}>
                                {fields.length} fields / {fields.reduce((total, field) => total + (field.lines || []).length, 0)} lines
                            </div>
                        </div>
                    </div>
                    <div className={`rounded-xl border ${t.borderCard} ${theme === 'dark' ? 'bg-slate-900/65' : 'bg-white'} p-4 text-sm ${t.textSub}`}>
                        Local DB is browser-local. Refreshing or restarting the dev server keeps saved data; browser clear-site-data or Factory Reset will reset it.
                    </div>
                </SettingsSection>
                <SettingsSection title="Data Transfer" detail="Fields, boundaries, lines and task records." icon={Save}>
                    <FeatureToggle label="USB Import / Export" detail="Move fields, boundaries, lines and task data between machines" featureKey="dataTransfer" icon={Save} />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {[
                            { label: 'Export Field', icon: FolderOpen },
                            { label: 'Import Lines', icon: Route },
                            { label: 'Backup Tasks', icon: FileText }
                        ].map((item) => (
                            <button key={item.label} onClick={() => showNotification(`${item.label} queued`, 'info')} className={`p-4 rounded-xl border ${t.borderCard} ${t.textMain} font-bold hover:brightness-95 text-left flex items-center gap-3`}>
                                <item.icon className="w-5 h-5 text-blue-500" />
                                {item.label}
                            </button>
                        ))}
                    </div>
                </SettingsSection>
            </div>
        );
        case 'landlevel': return (
            <div className="space-y-5">
                <SettingsSection title="GNSS Land Leveling" detail="Slope guidance and correction workflow." icon={Globe}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                        <SettingsMetric label="Mode" value={featureSettings.landLeveling ? 'Active' : 'Off'} tone={featureSettings.landLeveling ? 'text-green-500' : 'text-slate-500'} />
                        <SettingsMetric label="Correction" value={featureSettings.mobaTrac ? 'MOBA TRAC' : rtkStatus} />
                        <SettingsMetric label="Blade Offset" value="0 cm" />
                    </div>
                    <div className="grid grid-cols-1 gap-3">
                        <FeatureToggle label="Land Leveling Mode" detail="GNSS slope guidance for leveling workflows" featureKey="landLeveling" icon={Globe} />
                        <FeatureToggle label="MOBA TRAC Correction" detail="Satellite correction workflow without a local base station" featureKey="mobaTrac" icon={Radio} />
                    </div>
                    <div className={`${t.bgInput} border ${t.borderCard} rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4 mt-4`}>
                        <SettingInput theme={t} label="Target Slope (%)" value="0.20" type="number" onChange={() => {}} />
                        <SettingInput theme={t} label="Cross Slope (%)" value="0.00" type="number" onChange={() => {}} />
                        <SettingInput theme={t} label="Blade Offset (cm)" value="0" type="number" onChange={() => {}} />
                    </div>
                </SettingsSection>
            </div>
        );
        case 'overview': {
            const correctionSource = rtkSettings.correctionSource || 'Base Station';
            const calibrationReady = (calibrationStatus.vehicle === 'OK' ? 1 : 0)
                + (calibrationStatus.implement === 'OK' ? 1 : 0)
                + (!featureSettings.angleSensorEnabled || calibrationStatus.angle === 'OK' ? 1 : 0);
            const overviewChecks = [
              {
                id: 'rtk',
                title: 'Correction Source',
                value: correctionSource === 'Base Station' ? 'Local Base' : correctionSource,
                detail: correctionSource === 'Base Station' ? 'Base station is the primary workflow.' : 'Local Base is recommended when field base hardware is available.',
                icon: LocateFixed,
                status: rtkStatus,
                tone: rtkStatus === 'FIX' ? 'text-green-500 border-green-500/40 bg-green-500/10' : 'text-yellow-500 border-yellow-500/40 bg-yellow-500/10'
              },
              {
                id: 'vehicle',
                title: 'Vehicle',
                value: activeVehicleSettings.type,
                detail: `${activeVehicleSettings.wheelbase} m wheelbase / ${activeVehicleSettings.steeringType || 'Front axle'}`,
                icon: Tractor,
                status: 'SET',
                tone: 'text-blue-500 border-blue-500/40 bg-blue-500/10'
              },
              {
                id: 'implement',
                title: 'Implement',
                value: activeImplementSettings.name,
                detail: `${Number(activeImplementSettings.width || 0).toFixed(1)} m / ${activeImplementSettings.sections || 1} sections`,
                icon: Ruler,
                status: activeImplementSettings.profileId ? 'PROFILE' : 'CUSTOM',
                tone: 'text-blue-500 border-blue-500/40 bg-blue-500/10'
              },
              {
                id: 'calibration',
                title: 'Calibration',
                value: `${calibrationReady}/3 ready`,
                detail: 'Vehicle, implement and angle sensor checks.',
                icon: Gauge,
                status: calibrationReady === 3 ? 'OK' : 'CHECK',
                tone: calibrationReady === 3 ? 'text-green-500 border-green-500/40 bg-green-500/10' : 'text-yellow-500 border-yellow-500/40 bg-yellow-500/10'
              },
              {
                id: 'guidance',
                title: 'Guidance Line',
                value: activeLineRecord?.name || getGuidanceModeLabel(),
                detail: isMultiLineMode ? 'Parallel lanes enabled.' : 'Single active line.',
                icon: Route,
                status: guidanceLine ? 'READY' : 'SELECT',
                tone: guidanceLine ? 'text-green-500 border-green-500/40 bg-green-500/10' : 'text-yellow-500 border-yellow-500/40 bg-yellow-500/10'
              },
              {
                id: 'steering',
                title: 'Steering',
                value: steeringMode,
                detail: featureSettings.canbusSteerReady ? 'CAN steer-ready path available.' : 'Manual steering path active.',
                icon: SteeringWheelIcon,
                status: featureSettings.canbusSteerReady ? 'CAN' : 'MANUAL',
                tone: featureSettings.canbusSteerReady ? 'text-green-500 border-green-500/40 bg-green-500/10' : 'text-slate-500 border-slate-500/30 bg-slate-500/10'
              }
            ];

            return (
              <div className="space-y-5">
                <SettingsSection
                    title="Run Readiness"
                    detail="Setup order for an auto steering run. Fix the warning cards before engaging auto steer."
                    icon={LayoutGrid}
                    actions={<SettingsActionButton variant="primary" onClick={() => setSettingsTab('rtk')}>Setup RTK</SettingsActionButton>}
                >
                    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                        <SettingsMetric label="Correction" value={correctionSource === 'Base Station' ? 'Local Base' : correctionSource} tone={rtkStatus === 'FIX' ? 'text-green-500' : 'text-yellow-500'} />
                        <SettingsMetric label="Field" value={activeFieldRecord?.name || 'No Field'} />
                        <SettingsMetric label="Line" value={activeLineRecord?.name || getGuidanceModeLabel()} />
                        <SettingsMetric label="Ready" value={`${overviewChecks.filter(item => ['OK', 'READY', 'SET', 'PROFILE', 'CAN', 'FIX'].includes(item.status)).length}/${overviewChecks.length}`} />
                    </div>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                        {overviewChecks.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setSettingsTab(item.id)}
                                className={`${theme === 'dark' ? 'bg-slate-900/70' : 'bg-white'} border ${t.borderCard} rounded-xl p-4 text-left min-h-[116px] hover:brightness-95 transition`}
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex items-start gap-3 min-w-0">
                                        <div className={`shrink-0 w-10 h-10 rounded-lg ${theme === 'dark' ? 'bg-slate-800' : 'bg-gray-100'} flex items-center justify-center`}>
                                            <item.icon className="w-5 h-5 text-blue-500" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className={`text-[10px] uppercase font-black ${t.textSub}`}>{item.title}</div>
                                            <div className={`font-black truncate ${t.textMain}`}>{item.value}</div>
                                            <div className={`text-xs ${t.textSub}`}>{item.detail}</div>
                                        </div>
                                    </div>
                                    <span className={`shrink-0 text-[10px] font-black px-2.5 py-1 rounded-full border ${item.tone}`}>{item.status}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </SettingsSection>

                <SettingsSection title="Active Machine" detail="Current vehicle and implement pair used by coverage and guidance spacing." icon={Tractor}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <ConfigTile icon={Tractor} label="Vehicle Profile" value={activeVehicleProfile.label} />
                        <ConfigTile icon={Ruler} label="Implement Profile" value={activeImplementProfile.label} />
                        <ConfigTile icon={Activity} label="Coverage Width" value={`${Number(activeImplementSettings.width || 0).toFixed(1)} m`} />
                    </div>
                </SettingsSection>

                <SettingsSection title="System Health" detail="Sensor and communication modules used by the run screen." icon={Activity}>
                    <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
                        {[
                            ['GNSS', systemHealth?.gnss || 'OK', Globe],
                            ['IMU', systemHealth?.imu || 'OK', Compass],
                            ['Steering', systemHealth?.steering || 'OK', SteeringWheelIcon],
                            ['CAN Bus', systemHealth?.canbus || 'OK', Cpu],
                            ['OBD', systemHealth?.obd || 'OK', Gauge],
                            ['Camera', systemHealth?.camera || 'OK', Video]
                        ].map(([label, value, Icon]) => (
                            <div key={label} className={`${theme === 'dark' ? 'bg-slate-900/70' : 'bg-white'} border ${t.borderCard} rounded-xl p-3 flex items-center gap-3 min-w-0`}>
                                <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${value === 'OK' ? 'bg-green-500/12 text-green-500' : 'bg-yellow-500/12 text-yellow-500'}`}>
                                    <Icon className="w-5 h-5" />
                                </div>
                                <div className="min-w-0">
                                    <div className={`text-[10px] uppercase font-black ${t.textSub}`}>{label}</div>
                                    <div className={`text-sm font-black truncate ${value === 'OK' ? 'text-green-500' : 'text-yellow-500'}`}>{value}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </SettingsSection>
              </div>
            );
        }
        case 'calibration': {
            const calibCards = [
              {
                title: 'Vehicle Geometry',
                key: 'vehicle',
                icon: Tractor,
                status: calibrationStatus.vehicle,
                detail: 'Confirms wheelbase, antenna, hitch and steering limit.',
                actions: [
                  { label: 'Run Geometry', tone: 'primary', onClick: () => { setCalibrationStatus(prev => ({ ...prev, vehicle: 'OK' })); showNotification('Vehicle geometry calibration completed', 'success'); } },
                  { label: 'Reset', tone: 'ghost', onClick: () => { setCalibrationStatus(prev => ({ ...prev, vehicle: 'Needs Check' })); showNotification('Vehicle calibration reset', 'info'); } }
                ],
                meta: [
                    { label: 'Wheelbase', value: `${vehicleSettings.wheelbase} m` },
                    { label: 'Steering', value: vehicleSettings.steeringType || 'Front axle' },
                    { label: 'Antenna', value: `${vehicleSettings.antennaHeight} m` },
                    { label: 'Hitch', value: vehicleSettings.hitchType || 'Rear 3-point' }
                ]
              },
              {
                title: 'Implement Setup',
                key: 'implement',
                icon: Ruler,
                status: calibrationStatus.implement,
                detail: 'Confirms width, section count, offset, delay and lift state.',
                actions: [
                  { label: 'Run Implement', tone: 'primary', onClick: () => { setCalibrationStatus(prev => ({ ...prev, implement: 'OK' })); showNotification('Implement calibration completed', 'success'); } },
                  { label: 'Reset', tone: 'ghost', onClick: () => { setCalibrationStatus(prev => ({ ...prev, implement: 'Needs Check' })); showNotification('Implement calibration reset', 'info'); } }
                ],
                meta: [
                    { label: 'Type', value: implementSettings.type || 'Custom' },
                    { label: 'Width', value: `${implementSettings.width} m` },
                    { label: 'Sections', value: implementSettings.sections || 1 },
                    { label: 'Delay', value: `${implementSettings.delayOn}/${implementSettings.delayOff}s` }
                ]
              },
              {
                title: 'Angle Sensor',
                key: 'angle',
                icon: Gauge,
                status: featureSettings.angleSensorEnabled ? calibrationStatus.angle : 'Disabled',
                detail: featureSettings.angleSensorEnabled ? 'Zero steering angle and verify live range.' : 'System will estimate steering from commanded wheel angle.',
                actions: featureSettings.angleSensorEnabled ? [
                  { label: 'Calibrate', tone: 'primary', onClick: () => { setCalibrationStatus(prev => ({ ...prev, angle: 'OK' })); showNotification('Angle sensor calibration completed', 'success'); } },
                  { label: 'Disable', tone: 'ghost', onClick: () => { updateFeatureSetting('angleSensorEnabled', false); showNotification('Angle sensor disabled', 'info'); } }
                ] : [
                  { label: 'Enable Sensor', tone: 'primary', onClick: () => { updateFeatureSetting('angleSensorEnabled', true); setCalibrationStatus(prev => ({ ...prev, angle: 'Needs Check' })); showNotification('Angle sensor enabled; calibration required', 'warning'); } }
                ],
                meta: [
                    { label: 'Mode', value: featureSettings.angleSensorEnabled ? 'Sensor' : 'Disabled' },
                    { label: 'Live Angle', value: featureSettings.angleSensorEnabled ? `${steeringAngle.toFixed(1)}\u00b0` : '--' },
                    { label: 'Range', value: featureSettings.angleSensorEnabled ? '\u00b145\u00b0' : '--' },
                    { label: 'Fallback', value: featureSettings.angleSensorEnabled ? 'Off' : 'Commanded' }
                ]
              }
            ];

            const statusClass = (status) => {
              if (status === 'OK') return 'bg-green-500/10 text-green-500 border-green-500/40';
              if (status === 'Needs Check') return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/40';
              if (status === 'Disabled') return 'bg-slate-500/10 text-slate-500 border-slate-500/40';
              return 'bg-slate-500/10 text-slate-500 border-slate-500/40';
            };
            const doneCount = calibCards.filter(card => card.status === 'OK' || card.status === 'Disabled').length;

            return (
              <div className="space-y-5">
                <SettingsSection
                    title="Calibration Center"
                    detail="Run the required calibration before engaging auto steer."
                    icon={Gauge}
                    actions={<SettingsActionButton variant="primary" onClick={() => { setCalibrationStatus({ vehicle: 'OK', implement: 'OK', angle: 'OK' }); showNotification('All calibration checks completed', 'success'); }}>Run Check</SettingsActionButton>}
                >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <SettingsMetric label="Ready Modules" value={`${doneCount}/${calibCards.length}`} tone={doneCount === calibCards.length ? 'text-green-500' : 'text-yellow-500'} />
                        <SettingsMetric label="Steering Angle" value={`${steeringAngle.toFixed(1)} deg`} />
                        <SettingsMetric label="Implement Width" value={`${implementSettings.width} m`} />
                    </div>
                    <div className={`h-2 rounded-full overflow-hidden ${theme === 'dark' ? 'bg-slate-800' : 'bg-gray-200'}`}>
                        <div className="h-full bg-green-500" style={{ width: `${(doneCount / calibCards.length) * 100}%` }}></div>
                    </div>
                </SettingsSection>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
                  {calibCards.map((card) => (
                    <article key={card.title} className={`${t.bgPanel} border ${t.borderCard} rounded-xl p-3 flex flex-col gap-2.5 min-h-[236px]`}>
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-start gap-2.5 min-w-0">
                            <div className={`shrink-0 w-9 h-9 rounded-lg ${theme === 'dark' ? 'bg-slate-800' : 'bg-gray-100'} flex items-center justify-center`}>
                                <card.icon className="w-5 h-5 text-blue-500" />
                            </div>
                            <div className="min-w-0">
                                <div className={`text-base font-black leading-tight ${t.textMain}`}>{card.title}</div>
                                <div className={`text-[11px] leading-snug ${t.textSub}`}>{card.detail}</div>
                            </div>
                        </div>
                        <span className={`shrink-0 text-[10px] font-black px-2 py-1 rounded-full border ${statusClass(card.status)}`}>{card.status}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {card.meta.map((item) => (
                            <div key={item.label} className={`${theme === 'dark' ? 'bg-slate-900/70' : 'bg-gray-50'} border ${t.borderCard} rounded-lg p-2`}>
                                <div className={`text-[9px] uppercase font-black ${t.textSub}`}>{item.label}</div>
                                <div className={`text-[13px] font-black leading-tight ${t.textMain}`}>{item.value}</div>
                            </div>
                        ))}
                      </div>

                      <div className="mt-auto flex gap-2">
                        {card.actions.map((action) => (
                          <button
                            key={action.label}
                            onClick={action.onClick}
                            className={
                              action.tone === 'primary'
                                ? 'px-3 py-2 rounded-lg bg-blue-600 text-white font-black hover:bg-blue-500 text-xs whitespace-nowrap flex-1'
                                : `px-3 py-2 rounded-lg border ${t.borderCard} ${t.textSub} font-black hover:brightness-95 text-xs whitespace-nowrap`
                            }
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            );
        }
        case 'rtk': {
            const rtkConfig = {
              correctionSource: 'Base Station',
              receiverPort: 'COM3',
              baudRate: '115200',
              protocol: 'RTCM3',
              ntripHost: '',
              port: '2101',
              mountpoint: '',
              user: '',
              password: '',
              autoReconnect: true,
              sendGga: true,
              ggaInterval: '5',
              nmeaOutput: false,
              nmeaRate: '10',
              baseMode: 'Survey In',
              baseId: 'BASE-01',
              baseLatitude: '10.7769',
              baseLongitude: '106.7009',
              baseHeight: '12.5',
              surveyDuration: '180',
              surveyAccuracy: '2.5',
              radioChannel: '07',
              radioPower: '1W',
              radioFrequency: '464.500',
              ...rtkSettings
            };
            const rtkQuality = rtkStatus === 'FIX' ? 95 : rtkStatus === 'FLOAT' ? 75 : rtkStatus === 'DIFF' ? 55 : 20;
            const rtkLabel = rtkStatus === 'FIX' ? 'CONNECTED' : rtkStatus === 'FLOAT' ? 'FLOAT' : rtkStatus === 'DIFF' ? 'DIFF' : 'DISCONNECTED';
            const rtkBadge = rtkStatus === 'FIX' ? 'text-green-500' : rtkStatus === 'FLOAT' ? 'text-yellow-500' : rtkStatus === 'DIFF' ? 'text-orange-500' : 'text-red-500';
            const rtkBar = rtkStatus === 'FIX' ? 'bg-green-500' : rtkStatus === 'FLOAT' ? 'bg-yellow-500' : rtkStatus === 'DIFF' ? 'bg-orange-500' : 'bg-red-500';
            const rtkMode = rtkConfig.correctionSource === 'NTRIP'
                ? 'NTRIP'
                : 'BASE';
            const sourceModes = [
                { id: 'BASE', source: 'Base Station', label: 'Local Base', detail: 'Survey-in + radio link', icon: LocateFixed },
                { id: 'NTRIP', source: 'NTRIP', label: 'NTRIP Rover', detail: 'Internet caster / VRS', icon: Globe }
            ];
            const constellationSource = [
                { label: 'GPS', visible: 12 },
                { label: 'GLO', visible: 9 },
                { label: 'GAL', visible: 7 },
                { label: 'BDS', visible: 10 }
            ];
            const totalConstellationVisible = constellationSource.reduce((total, item) => total + item.visible, 0);
            let remainingUsedSats = Math.max(0, Number(currentGnssTelemetry.roverUsedSats) || 0);
            const constellationStats = constellationSource.map((item, index) => {
                const proportionalUsed = Math.round((currentGnssTelemetry.roverUsedSats * item.visible) / Math.max(totalConstellationVisible, 1));
                const used = index === constellationSource.length - 1
                    ? Math.min(item.visible, remainingUsedSats)
                    : Math.min(item.visible, remainingUsedSats, proportionalUsed);
                remainingUsedSats -= used;
                return { ...item, used };
            });
            const toggleRtkFlag = (key) => handleRtkSettingChange(key, !rtkConfig[key]);
            const renderToggleFlag = ({ label, detail, flagKey, icon: Icon = CheckCircle2 }) => (
                <button
                    onClick={() => toggleRtkFlag(flagKey)}
                    className={`p-4 rounded-xl border text-left flex items-center justify-between gap-4 ${rtkConfig[flagKey] ? 'border-green-500/50 bg-green-500/10' : `${t.borderCard} ${t.bgInput}`}`}
                >
                    <div className="flex items-center gap-3 min-w-0">
                        <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${rtkConfig[flagKey] ? 'bg-green-500 text-white' : `${theme === 'dark' ? 'bg-slate-800' : 'bg-white'} ${t.textDim}`}`}>
                            <Icon className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <div className={`font-bold ${t.textMain}`}>{label}</div>
                            <div className={`text-xs ${t.textSub}`}>{detail}</div>
                        </div>
                    </div>
                    <div className={`shrink-0 w-12 h-7 rounded-full p-1 transition-colors ${rtkConfig[flagKey] ? 'bg-green-500' : 'bg-slate-400'}`}>
                        <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${rtkConfig[flagKey] ? 'translate-x-5' : ''}`}></div>
                    </div>
                </button>
            );
            const renderModeCard = (mode) => {
                const active = rtkMode === mode.id;
                const Icon = mode.icon;
                return (
                    <button
                        key={mode.id}
                        onClick={() => {
                            handleRtkSettingChange('correctionSource', mode.source);
                            setRtkTestState('idle');
                            setBaseSurveyState('idle');
                        }}
                        className={`text-left rounded-xl border p-3 min-h-[96px] transition-all ${active ? 'border-blue-500 bg-blue-500/10' : `${t.borderCard} ${theme === 'dark' ? 'bg-slate-900/70' : 'bg-white'} hover:brightness-95`}`}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${active ? 'bg-blue-600 text-white' : `${theme === 'dark' ? 'bg-slate-800' : 'bg-gray-100'} text-blue-500`}`}>
                                <Icon className="w-5 h-5" />
                            </div>
                            {active && <CheckCircle2 className="w-5 h-5 text-blue-500" />}
                        </div>
                        <div className={`mt-3 font-black ${t.textMain}`}>{mode.label}</div>
                        <div className={`text-xs ${t.textSub}`}>{mode.detail}</div>
                    </button>
                );
            };

            return (
              <div className="space-y-5">
                <SettingsSection
                    title="RTK Setup"
                    detail="Pick one correction workflow first, then configure only that workflow."
                    icon={Radio}
                    actions={<SettingsActionButton onClick={() => showNotification('GNSS rover status refreshed', 'info')}>Refresh Status</SettingsActionButton>}
                >
                    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-3 items-stretch">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {sourceModes.map(renderModeCard)}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <SettingsMetric label="Mode" value={sourceModes.find(mode => mode.id === rtkMode)?.label || 'Local Base'} />
                            <SettingsMetric label="RTK Status" value={rtkStatus} tone={rtkStatus === 'FIX' ? 'text-green-500' : 'text-yellow-500'} />
                            <SettingsMetric label="Rover Sats" value={`${currentGnssTelemetry.roverUsedSats}/${currentGnssTelemetry.roverVisibleSats}`} />
                            <SettingsMetric label="Base Sats" value={currentGnssTelemetry.baseVisibleSats} />
                        </div>
                    </div>
                    <div className={`h-2 ${theme === 'dark' ? 'bg-slate-800' : 'bg-gray-200'} rounded-full overflow-hidden`}>
                        <div className={`h-full ${rtkBar}`} style={{ width: `${rtkQuality}%` }}></div>
                    </div>
                </SettingsSection>

                <SettingsSection
                    title="GNSS Rover"
                    detail="Live status from the rover receiver and antenna. RTK setup below only configures correction input."
                    icon={Globe}
                >
                    <div className="grid grid-cols-1 xl:grid-cols-[280px_minmax(0,1fr)] gap-4">
                        <div className={`rounded-xl border ${rtkStatus === 'FIX' ? 'border-green-500/45 bg-green-500/10' : 'border-yellow-500/45 bg-yellow-500/10'} p-4`}>
                            <div className={`text-[10px] uppercase font-black ${t.textSub}`}>Rover Fix</div>
                            <div className={`mt-1 text-4xl font-black leading-none ${rtkStatus === 'FIX' ? 'text-green-500' : 'text-yellow-500'}`}>{currentGnssTelemetry.roverStatus}</div>
                            <div className={`mt-3 grid grid-cols-2 gap-2`}>
                                <div className={`rounded-lg border ${t.borderCard} ${theme === 'dark' ? 'bg-slate-900/70' : 'bg-white/70'} p-3`}>
                                    <div className={`text-[9px] uppercase font-black ${t.textSub}`}>Used</div>
                                    <div className={`text-xl font-black ${t.textMain}`}>{currentGnssTelemetry.roverUsedSats}</div>
                                </div>
                                <div className={`rounded-lg border ${t.borderCard} ${theme === 'dark' ? 'bg-slate-900/70' : 'bg-white/70'} p-3`}>
                                    <div className={`text-[9px] uppercase font-black ${t.textSub}`}>Visible</div>
                                    <div className={`text-xl font-black ${t.textMain}`}>{currentGnssTelemetry.roverVisibleSats}</div>
                                </div>
                            </div>
                            <div className={`mt-3 text-xs font-bold ${t.textSub}`}>Base reference: {currentGnssTelemetry.baseVisibleSats} sats</div>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            <SettingsMetric label="H Accuracy" value={`${currentGnssTelemetry.horizontalAccuracyCm.toFixed(1)} cm`} tone={currentGnssTelemetry.horizontalAccuracyCm <= 5 ? 'text-green-500' : 'text-yellow-500'} />
                            <SettingsMetric label="V Accuracy" value={`${currentGnssTelemetry.verticalAccuracyCm.toFixed(1)} cm`} tone={currentGnssTelemetry.verticalAccuracyCm <= 8 ? 'text-green-500' : 'text-yellow-500'} />
                            <SettingsMetric label="Correction Age" value={`${currentGnssTelemetry.correctionAgeSec.toFixed(1)} s`} />
                            <SettingsMetric label="Baseline" value={`${currentGnssTelemetry.baselineKm.toFixed(1)} km`} />
                            <SettingsMetric label="HDOP" value={currentRtkTelemetry.hdop.toFixed(1)} tone={currentRtkTelemetry.hdop <= 1.2 ? 'text-green-500' : 'text-yellow-500'} />
                            <SettingsMetric label="PDOP" value={currentRtkTelemetry.pdop.toFixed(1)} tone={currentRtkTelemetry.pdop <= 2.0 ? 'text-green-500' : 'text-yellow-500'} />
                            <SettingsMetric label="Latency" value={`${currentRtkTelemetry.latencyMs} ms`} tone={currentRtkTelemetry.latencyMs <= 100 ? 'text-green-500' : 'text-yellow-500'} />
                            <SettingsMetric label="Antenna" value={currentGnssTelemetry.antenna === 'Rover roof' ? 'Roof' : currentGnssTelemetry.antenna} />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <ConfigTile icon={Globe} label="Constellation" value={currentGnssTelemetry.constellations} />
                        <ConfigTile icon={Radio} label="Correction Source" value={sourceModes.find(mode => mode.id === rtkMode)?.label || 'Local Base'} />
                        <ConfigTile icon={LocateFixed} label="Base Source" value={currentRtkTelemetry.baseSource} />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {constellationStats.map((item) => (
                            <div key={item.label} className={`rounded-xl border ${t.borderCard} ${theme === 'dark' ? 'bg-slate-900/70' : 'bg-white'} p-3`}>
                                <div className={`text-[10px] uppercase font-black ${t.textSub}`}>{item.label}</div>
                                <div className={`text-xl font-black ${t.textMain}`}>{Math.min(item.used, item.visible)}/{item.visible}</div>
                                <div className={`text-[10px] uppercase font-black ${t.textSub}`}>used / visible</div>
                            </div>
                        ))}
                    </div>
                    <div className={`rounded-xl border ${t.borderCard} ${t.bgInput} p-4 flex flex-wrap items-center justify-between gap-3`}>
                        <div className="min-w-0">
                            <div className={`text-[10px] uppercase font-black ${t.textSub}`}>Status Rule</div>
                            <div className={`font-black ${t.textMain}`}>FIX requires RTK correction age under 2s and HDOP under 1.2.</div>
                        </div>
                        <div className={`text-sm font-bold ${t.textSub}`}>Header shows visible rover/base sats as {currentGnssTelemetry.roverVisibleSats}/{currentGnssTelemetry.baseVisibleSats}.</div>
                    </div>
                </SettingsSection>

                {rtkMode === 'NTRIP' && (
                    <SettingsSection
                        title="NTRIP Rover"
                        detail="Use mobile internet to receive VRS/caster corrections."
                        icon={Globe}
                        actions={<><SettingsActionButton onClick={() => { setRtkTestState('ok'); setRtkStatus('FIX'); setSatelliteCount(12); showNotification('NTRIP caster connection OK', 'success'); }}>{rtkTestState === 'ok' || rtkTestState === 'saved' ? 'Tested OK' : 'Test Caster'}</SettingsActionButton><SettingsActionButton variant="primary" onClick={() => { setRtkTestState('saved'); showNotification('NTRIP profile saved', 'success'); }}>{rtkTestState === 'saved' ? 'Saved' : 'Save NTRIP'}</SettingsActionButton></>}
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <SettingInput theme={t} label="Caster Host" value={rtkConfig.ntripHost} onChange={(e) => handleRtkSettingChange('ntripHost', e.target.value)} />
                            <SettingInput theme={t} label="Port" value={rtkConfig.port} onChange={(e) => handleRtkSettingChange('port', e.target.value)} />
                            <SettingInput theme={t} label="Mountpoint" value={rtkConfig.mountpoint} onChange={(e) => handleRtkSettingChange('mountpoint', e.target.value)} />
                            <SettingInput theme={t} label="GGA Interval (s)" value={rtkConfig.ggaInterval} type="number" onChange={(e) => handleRtkSettingChange('ggaInterval', e.target.value)} />
                            <SettingInput theme={t} label="User" value={rtkConfig.user} onChange={(e) => handleRtkSettingChange('user', e.target.value)} />
                            <SettingInput theme={t} label="Password" value={rtkConfig.password} type="password" onChange={(e) => handleRtkSettingChange('password', e.target.value)} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {renderToggleFlag({ label: 'Auto Reconnect', detail: 'Reconnect caster after mobile signal drop.', flagKey: 'autoReconnect', icon: RotateCw })}
                            {renderToggleFlag({ label: 'Send GGA Position', detail: 'Required by most VRS mountpoints.', flagKey: 'sendGga', icon: Navigation })}
                        </div>
                    </SettingsSection>
                )}

                {rtkMode === 'BASE' && (
                    <SettingsSection
                        title="Local Base / Radio"
                        detail="Setup a field base station and send correction through radio."
                        icon={LocateFixed}
                        actions={<><SettingsActionButton onClick={() => { setBaseSurveyState('running'); setRtkStatus('FLOAT'); showNotification('Base survey-in started', 'info'); }}>{baseSurveyState === 'saved' ? 'Survey OK' : baseSurveyState === 'running' ? 'Surveying' : 'Start Survey'}</SettingsActionButton><SettingsActionButton variant="primary" onClick={() => { setBaseSurveyState('saved'); setRtkStatus('FIX'); showNotification('Base station profile saved', 'success'); }}>{baseSurveyState === 'saved' ? 'Base Saved' : 'Save Base'}</SettingsActionButton></>}
                    >
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <SettingSelect label="Base Mode" value={rtkConfig.baseMode} onChange={(value) => handleRtkSettingChange('baseMode', value)} options={['Survey In', 'Known Position', 'Moving Base']} />
                            <SettingInput theme={t} label="Base ID" value={rtkConfig.baseId} onChange={(e) => handleRtkSettingChange('baseId', e.target.value)} />
                            <SettingInput theme={t} label="Survey Duration (s)" value={rtkConfig.surveyDuration} type="number" onChange={(e) => handleRtkSettingChange('surveyDuration', e.target.value)} />
                            <SettingInput theme={t} label="Target Accuracy (cm)" value={rtkConfig.surveyAccuracy} type="number" onChange={(e) => handleRtkSettingChange('surveyAccuracy', e.target.value)} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <SettingInput theme={t} label="Base Latitude" value={rtkConfig.baseLatitude} onChange={(e) => handleRtkSettingChange('baseLatitude', e.target.value)} />
                            <SettingInput theme={t} label="Base Longitude" value={rtkConfig.baseLongitude} onChange={(e) => handleRtkSettingChange('baseLongitude', e.target.value)} />
                            <SettingInput theme={t} label="Base Height (m)" value={rtkConfig.baseHeight} type="number" onChange={(e) => handleRtkSettingChange('baseHeight', e.target.value)} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <SettingSelect label="Receiver Port" value={rtkConfig.receiverPort} onChange={(value) => handleRtkSettingChange('receiverPort', value)} options={['COM1', 'COM2', 'COM3', 'USB', 'TCP']} />
                            <SettingSelect label="Baud Rate" value={rtkConfig.baudRate} onChange={(value) => handleRtkSettingChange('baudRate', value)} options={['9600', '38400', '57600', '115200', '230400']} />
                            <SettingSelect label="Correction Format" value={rtkConfig.protocol} onChange={(value) => handleRtkSettingChange('protocol', value)} options={['RTCM3', 'RTCM2', 'CMR+', 'NMEA']} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <SettingInput theme={t} label="Radio Channel" value={rtkConfig.radioChannel} onChange={(e) => handleRtkSettingChange('radioChannel', e.target.value)} />
                            <SettingInput theme={t} label="Radio Frequency (MHz)" value={rtkConfig.radioFrequency} onChange={(e) => handleRtkSettingChange('radioFrequency', e.target.value)} />
                            <SettingSelect label="Radio Power" value={rtkConfig.radioPower} onChange={(value) => handleRtkSettingChange('radioPower', value)} options={['0.5W', '1W', '2W', '5W']} />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <ConfigTile icon={LocateFixed} label="Survey State" value={baseSurveyState === 'saved' ? 'Saved' : baseSurveyState === 'running' ? 'Running' : 'Ready'} tone={baseSurveyState === 'saved' ? 'text-green-500' : 'text-blue-500'} />
                            <ConfigTile icon={Radio} label="Radio Link" value={`${rtkConfig.radioFrequency} MHz / ${rtkConfig.radioPower}`} />
                            <ConfigTile icon={CheckCircle2} label="Correction" value={rtkStatus} tone={rtkStatus === 'FIX' ? 'text-green-500' : 'text-yellow-500'} />
                        </div>
                    </SettingsSection>
                )}

                <SettingsSection title="Correction Link Health" detail="Compact correction input health for the selected RTK workflow." icon={Activity}>
                    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                        <SettingsMetric label="Link" value={rtkLabel} tone={rtkBadge} />
                        <SettingsMetric label="Correction Age" value={`${currentRtkTelemetry.ageSec.toFixed(1)}s`} />
                        <SettingsMetric label="Latency" value={`${currentRtkTelemetry.latencyMs}ms`} />
                        <SettingsMetric label="Baseline" value={rtkMode === 'BASE' ? 'Local base' : `${currentGnssTelemetry.baselineKm.toFixed(1)} km`} />
                    </div>
                </SettingsSection>
              </div>
            );
        }
        default: return <div className={t.textDim}>Select a menu item</div>;
    }
  };

  const renderSettingsPanel = () => {
      const currentItem = settingsNavSections.flatMap(section => section.items).find(item => item.id === settingsTab) || settingsNavSections[0].items[0];
      const CurrentIcon = currentItem.icon || Settings;

      return (
          <div className={`absolute inset-0 ${theme === 'dark' ? 'bg-slate-950/96' : 'bg-gray-100/96'} z-40 flex flex-col overflow-hidden`}>
              <div className={`shrink-0 px-5 lg:px-7 py-4 border-b ${t.borderCard} ${theme === 'dark' ? 'bg-slate-950' : 'bg-white'} flex items-center justify-between gap-4 shadow-sm`}>
                  <div className="min-w-0 flex items-center gap-4">
                      <div className="shrink-0 w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-900/20">
                          <Settings className="w-7 h-7" />
                      </div>
                      <div className="min-w-0">
                          <div className={`text-[10px] uppercase tracking-widest font-black ${t.textSub}`}>System Setup</div>
                          <div className="flex items-center gap-2 min-w-0">
                              <h2 className={`text-xl lg:text-2xl font-black truncate ${t.textMain}`}>System</h2>
                              <span className={t.textDim}>/</span>
                              <div className="flex items-center gap-2 min-w-0">
                                  <CurrentIcon className="w-5 h-5 text-blue-500 shrink-0" />
                                  <span className={`text-lg lg:text-xl font-black truncate ${t.textMain}`}>{currentItem.label}</span>
                              </div>
                          </div>
                          <div className={`text-xs ${t.textSub}`}>Run, machine, correction and service modules in one setup workspace.</div>
                      </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                      <div className={`hidden md:flex rounded-xl border ${t.borderCard} ${theme === 'dark' ? 'bg-slate-900/75' : 'bg-gray-50'} overflow-hidden`}>
                          {[
                              { label: 'RTK', value: rtkStatus, tone: rtkStatus === 'FIX' ? 'text-green-500' : 'text-yellow-500' },
                              { label: 'GNSS', value: `${currentGnssTelemetry.roverVisibleSats}/${currentGnssTelemetry.baseVisibleSats}`, tone: t.textMain },
                              { label: 'DB', value: localDatabase?.status || 'Ready', tone: (localDatabase?.status || '').toLowerCase().includes('fail') ? 'text-red-500' : 'text-green-500' }
                          ].map((item, idx) => (
                              <div key={item.label} className={`px-4 py-2 text-center ${idx > 0 ? `border-l ${t.borderCard}` : ''}`}>
                                  <div className={`text-[9px] uppercase font-black ${t.textSub}`}>{item.label}</div>
                                  <div className={`text-sm font-black ${item.tone}`}>{item.value}</div>
                              </div>
                          ))}
                      </div>
                      <button
                          onClick={closeSettingsPanel}
                          aria-label={settingsTab === 'wifi' ? 'Close network settings' : 'Close settings and discard unsaved changes'}
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${t.borderCard} ${t.activeItem} ${t.textMain} transition-colors hover:border-blue-500 hover:text-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50`}
                      >
                          <CloseGlyph className="h-4 w-4" />
                      </button>
                  </div>
              </div>

              <div className="flex-1 min-h-0 flex overflow-hidden">
                  <div className={`w-[30%] min-w-[240px] max-w-[300px] border-r ${t.border} ${t.bgPanel} flex flex-col min-h-0`}>
                      <nav className="flex-1 min-h-0 overflow-y-auto px-4 py-5 space-y-5">
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
                                              onClick={() => {
                                                  setSettingsTab(item.id);
                                                  requestAnimationFrame(() => settingsContentScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' }));
                                              }}
                                          />
                                      ))}
                                  </div>
                              </div>
                          ))}
                      </nav>
                  </div>

                  <div className={`flex-1 min-w-0 min-h-0 flex flex-col ${theme === 'dark' ? 'bg-slate-950' : 'bg-gray-50'}`}>
                      <div
                          ref={settingsContentScrollRef}
                          data-settings-content
                          data-settings-tab={settingsTab}
                          className={`flex-1 min-h-0 ${
                              settingsTab === 'wifi'
                                  ? 'overflow-hidden p-2.5 lg:p-3'
                                  : `overflow-y-auto scroll-pb-28 ${['vehicle', 'implement'].includes(settingsTab) ? 'p-0' : 'p-5 lg:p-7'}`
                          }`}
                      >
                          <div className={
                              settingsTab === 'wifi'
                                  ? 'h-full min-h-0 w-full'
                                  : `${['vehicle', 'implement'].includes(settingsTab) ? 'w-full' : 'max-w-5xl'} pb-24`
                          }>
                              {renderSettingsContent()}
                          </div>
                      </div>
                      <div className={`${settingsTab === 'wifi' ? 'px-4 py-2.5' : 'p-4 lg:p-5'} border-t ${t.borderCard} flex items-center gap-3 ${['vehicle', 'implement'].includes(settingsTab) ? 'justify-between' : 'justify-end'} ${theme === 'dark' ? 'bg-slate-900/50' : 'bg-white/70'}`}>
                          {settingsTab !== 'wifi' && (
                              <button className={`px-5 lg:px-7 py-2 lg:py-3 rounded-lg border ${t.borderCard} ${t.textMain} hover:brightness-95 text-sm lg:text-base`} onClick={closeSettingsPanel}>Cancel</button>
                          )}
                          {settingsTab === 'wifi' ? (
                              <button
                                  className="h-10 rounded-lg bg-blue-600 px-6 text-sm font-bold text-white shadow-md shadow-blue-900/15 hover:bg-blue-500"
                                  onClick={closeSettingsPanel}
                              >
                                  Done
                              </button>
                          ) : settingsTab === 'vehicle' ? (
                              <div className="flex items-center gap-3">
                                  {selectedVehicleProfile && activeVehicleSettings.profileId !== selectedVehicleProfile.id && (
                                      <button
                                          type="button"
                                          onClick={() => activateVehicleProfile(selectedVehicleProfile)}
                                          className="flex items-center gap-2 rounded-lg border border-green-500/40 bg-green-500/10 px-4 py-2.5 text-sm font-black text-green-600 hover:bg-green-500/15"
                                      >
                                          <CheckCircle2 className="h-4 w-4" />
                                          Activate
                                      </button>
                                  )}
                                  <button
                                      onClick={() => goToVehicleStep(vehicleSetupStepIds.indexOf(vehicleSetupStep) - 1)}
                                      disabled={vehicleSetupStep === 'information'}
                                      className={`flex items-center gap-2 rounded-lg border ${t.borderCard} px-4 py-2.5 text-sm font-black ${t.textMain} disabled:cursor-not-allowed disabled:opacity-35`}
                                  >
                                      <ChevronRight className="h-4 w-4 rotate-180" />
                                      Back
                                  </button>
                                  <div className={`hidden min-w-[96px] text-center text-[10px] font-bold sm:block ${t.textDim}`}>
                                      Step {vehicleSetupStepIds.indexOf(vehicleSetupStep) + 1} / {vehicleSetupStepIds.length}
                                  </div>
                                  <button
                                      onClick={() => {
                                          const index = vehicleSetupStepIds.indexOf(vehicleSetupStep);
                                          if (vehicleSetupStep === 'information' && !vehicleInformationReady) {
                                              return showNotification('Vehicle name and type are required', 'warning');
                                          }
                                          if (vehicleSetupStep !== 'information' && !vehicleGeometryReady) {
                                              return showNotification('Complete all required vehicle dimensions first', 'warning');
                                          }
                                          if (index < vehicleSetupStepIds.length - 1) {
                                              goToVehicleStep(index + 1);
                                          } else {
                                              saveVehicleProfile();
                                          }
                                      }}
                                      className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-blue-900/20 hover:bg-blue-500"
                                  >
                                      {vehicleSetupStep === 'summary'
                                          ? !selectedVehicleProfile
                                              ? 'Create Vehicle'
                                              : selectedVehicleProfile.custom
                                                  ? 'Save Changes'
                                                  : 'Save Copy'
                                          : 'Continue'}
                                      {vehicleSetupStep === 'summary' ? <Check className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                  </button>
                              </div>
                          ) : settingsTab === 'implement' ? (
                              <div className="flex items-center gap-3">
                                  {selectedImplementProfile && activeImplementSettings.profileId !== selectedImplementProfile.id && (
                                      <button
                                          type="button"
                                          onClick={() => activateImplementProfile(selectedImplementProfile)}
                                          className="flex items-center gap-2 rounded-lg border border-green-500/40 bg-green-500/10 px-4 py-2.5 text-sm font-black text-green-600 hover:bg-green-500/15"
                                      >
                                          <CheckCircle2 className="h-4 w-4" />
                                          Activate
                                      </button>
                                  )}
                                  <button
                                      onClick={() => goToImplementStep(implementSetupStepIds.indexOf(implementSetupStep) - 1)}
                                      disabled={implementSetupStep === 'information'}
                                      className={`flex items-center gap-2 rounded-lg border ${t.borderCard} px-4 py-2.5 text-sm font-black ${t.textMain} disabled:cursor-not-allowed disabled:opacity-35`}
                                  >
                                      <ChevronRight className="h-4 w-4 rotate-180" />
                                      Back
                                  </button>
                                  <div className={`hidden min-w-[96px] text-center text-[10px] font-bold sm:block ${t.textDim}`}>
                                      Step {implementSetupStepIds.indexOf(implementSetupStep) + 1} / {implementSetupStepIds.length}
                                  </div>
                                  <button
                                      onClick={() => {
                                          const index = implementSetupStepIds.indexOf(implementSetupStep);
                                          if (implementSetupStep === 'information' && !implementInformationReady) {
                                              return showNotification('Implement name, type and connection are required', 'warning');
                                          }
                                          if (implementSetupStep !== 'information' && !implementGeometryReady) {
                                              return showNotification('Complete all required implement dimensions first', 'warning');
                                          }
                                          if (index < implementSetupStepIds.length - 1) {
                                              goToImplementStep(index + 1);
                                          } else {
                                              saveImplementProfile();
                                          }
                                      }}
                                      className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-black text-white shadow-lg shadow-blue-900/20 hover:bg-blue-500"
                                  >
                                      {implementSetupStep === 'summary'
                                          ? !selectedImplementProfile
                                              ? 'Create Implement'
                                              : selectedImplementProfile.custom
                                                  ? 'Save Changes'
                                                  : 'Save Copy'
                                          : 'Continue'}
                                      {implementSetupStep === 'summary' ? <Check className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                  </button>
                              </div>
                          ) : (
                              <button className="px-6 lg:px-8 py-2 lg:py-3 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-500 shadow-lg shadow-blue-900/20 text-base lg:text-lg" onClick={() => { setSettingsOpen(false); showNotification("Settings Saved Successfully", "success"); }}>Save Changes</button>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      );
  };

const ManagerNewButton = ({ entity, onClick, tone = 'blue', disabled = false }) => {
    const toneClass = {
        blue: 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/20',
        orange: 'bg-orange-500 hover:bg-orange-400 shadow-orange-900/20',
        green: 'bg-green-600 hover:bg-green-500 shadow-green-900/20'
    }[tone] || 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/20';

    return (
        <button
            type="button"
            data-manager-new={entity.toLowerCase()}
            onClick={onClick}
            disabled={disabled}
            className={`h-10 px-4 rounded-lg text-white font-black flex items-center justify-center gap-2 shadow-md transition-colors disabled:opacity-45 disabled:cursor-not-allowed ${toneClass}`}
        >
            <Plus className="w-4 h-4" />
            <span className="text-xs whitespace-nowrap">New {entity}</span>
        </button>
    );
};

const ManagerCloseButton = ({ label, onClick }) => (
    <button
        type="button"
        aria-label={`Close ${label}`}
        onClick={onClick}
        className={`h-10 w-10 rounded-lg border ${t.borderCard} ${t.textMain} hover:brightness-95 transition-all flex items-center justify-center`}
    >
        <X className="w-5 h-5" />
    </button>
);

const renderLinesPanel = () => {
    const activeField = fields.find(f => f.id === selectedFieldId);
    const allLines = activeField?.lines || [];
    const activeCatalogLines = allLines.filter(line => !line.archived);
    const archivedLines = allLines.filter(line => line.archived);
    const baseLines = showArchivedLines ? allLines : activeCatalogLines;
    const normalizeLineType = (type) => {
        if (type === 'STRAIGHT_AB') return 'STRAIGHT';
        if (type === 'A_PLUS') return 'A_PLUS';
        if (type === 'CURVE') return 'CURVE';
        if (type === 'PIVOT') return 'PIVOT';
        if (type === 'COMBINATION') return 'COMBINATION';
        return 'OTHER';
    };
    const lineTypeFilters = [
        { id: 'ALL', label: 'All', icon: Layers },
        { id: 'STRAIGHT', label: 'Straight', icon: GitCommitHorizontal },
        { id: 'CURVE', label: 'Curve', icon: Spline },
        { id: 'PIVOT', label: 'Pivot', icon: CircleDashed },
        { id: 'A_PLUS', label: 'A+', icon: ArrowUpFromDot },
        { id: 'COMBINATION', label: 'Combo', icon: AlignJustify }
    ];
    const getFilterCount = (filterId) => filterId === 'ALL'
        ? baseLines.length
        : baseLines.filter(line => normalizeLineType(line.type) === filterId).length;
    const currentFilter = lineTypeFilters.some(filter => filter.id === lineCatalogFilter) ? lineCatalogFilter : 'ALL';
    const visibleLineTypeFilters = lineTypeFilters.filter(filter => filter.id === 'ALL' || getFilterCount(filter.id) > 0 || filter.id === currentFilter);
    const lines = currentFilter === 'ALL' ? baseLines : baseLines.filter(line => normalizeLineType(line.type) === currentFilter);
    const selectedLine = lines.find(line => line.id === selectedCatalogLineId) || lines.find(line => line.id === activeLineId) || lines[0] || activeCatalogLines.find(line => line.id === activeLineId) || activeCatalogLines[0] || allLines[0];
    const loadedLine = activeCatalogLines.find(line => line.id === activeLineId) || null;
    const loadedLineLength = loadedLine ? getLineLengthMeters(loadedLine) : null;
    const activeLineLength = selectedLine ? getLineLengthMeters(selectedLine) : null;
    const panelBg = theme === 'dark' ? 'bg-slate-950' : 'bg-white';
    const surfaceBg = theme === 'dark' ? 'bg-slate-900/80' : 'bg-white';
    const mutedBg = theme === 'dark' ? 'bg-slate-900/55' : 'bg-slate-50';
    const selectedLineCreated = selectedLine ? getCreatedDateTime(selectedLine) : null;
    const selectedLineLocation = selectedLine ? getCreatedLocation(selectedLine, activeField) : '--';
    const workingWidthMeters = Math.max(0, Number(implementSettings.width) || 0);
    const overlapMeters = Math.max(0, Number(implementSettings.overlap) || 0);
    const passSpacingMeters = Math.max(0, workingWidthMeters - overlapMeters);

    const getLineHeadingDegrees = (line) => {
        const storedHeading = Number(line?.heading ?? line?.points?.aplus?.heading);
        if (Number.isFinite(storedHeading)) return (storedHeading + 360) % 360;

        const points = line?.points || {};
        let start = points.a;
        let end = points.b;
        const path = Array.isArray(points.curve) ? points.curve : [];
        if ((!start || !end) && path.length > 1) {
            start = path[0];
            end = path[path.length - 1];
        }
        if (!start || !end) return null;

        const dx = end.x - start.x;
        const dy = end.y - start.y;
        if (Math.hypot(dx, dy) < 0.001) return null;
        return (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360;
    };

    const selectedLineHeading = selectedLine ? getLineHeadingDegrees(selectedLine) : null;
    const selectedLineHeadingLabel = selectedLineHeading === null
        ? 'Not available'
        : `${selectedLineHeading.toFixed(1)}° ${getCardinalShortDirection(selectedLineHeading)}`;

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
        const width = 320;
        const height = 128;
        const pad = 22;
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
            <div className={`rounded-lg border ${t.borderCard} ${mutedBg} overflow-hidden`}>
                <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[128px] block" aria-label="Guidance line preview">
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
                        strokeWidth="4"
                        strokeLinecap="round"
                    />
                    {preview[0] && <circle cx={preview[0].x} cy={preview[0].y} r="6" fill="#2563eb" stroke="white" strokeWidth="2" />}
                    {preview[preview.length - 1] && <circle cx={preview[preview.length - 1].x} cy={preview[preview.length - 1].y} r="6" fill="#f97316" stroke="white" strokeWidth="2" />}
                </svg>
            </div>
        );
    };

    return (
        <div className={`w-full h-full flex flex-col ${panelBg}`}>
            <div className={`flex items-center justify-between gap-4 px-5 py-4 border-b ${t.divider} ${theme === 'dark' ? 'bg-slate-950/90' : 'bg-white/90'}`}>
                <div className="min-w-0 flex items-center gap-3">
                    <div className={`shrink-0 w-10 h-10 rounded-xl border ${t.borderCard} ${surfaceBg} flex items-center justify-center`}>
                        <Route className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="min-w-0">
                        <h2 className={`text-lg font-black ${t.textMain}`}>Guidance Lines</h2>
                        <div className={`text-xs ${t.textSub} truncate`}>{activeField?.name || 'No field selected'} / {activeCatalogLines.length} active lines</div>
                    </div>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                    <ManagerNewButton
                        entity="Line"
                        onClick={() => {
                            setLinesPanelOpen(false);
                            setLineModeModalOpen(true);
                        }}
                    />
                    <ManagerCloseButton label="guidance lines" onClick={() => setLinesPanelOpen(false)} />
                </div>
            </div>

            <div className={`shrink-0 px-4 py-2 border-b ${t.divider} ${theme === 'dark' ? 'bg-blue-950/14' : 'bg-blue-50/65'}`}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0 flex items-center gap-2.5">
                        <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${loadedLine ? 'bg-blue-600 text-white' : `${surfaceBg} ${t.textSub} border ${t.borderCard}`}`}>
                            <Route className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                            <div className={`text-[9px] uppercase font-black tracking-widest ${t.textSub}`}>Active line</div>
                            <div className={`text-sm font-black truncate ${loadedLine ? t.textMain : t.textSub}`}>{loadedLine?.name || 'No line loaded'}</div>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-black">
                        <span className={`px-2.5 py-1 rounded-lg border ${loadedLine ? 'border-green-500/35 bg-green-500/10 text-green-500' : `${t.borderCard} ${t.textSub}`}`}>{loadedLine ? 'LOADED' : 'NO ACTIVE'}</span>
                        <span className={`px-2.5 py-1 rounded-lg border ${t.borderCard} ${surfaceBg} ${t.textMain}`}>{loadedLine ? (loadedLine.type || 'LINE').replace(/_/g, ' ') : '--'}</span>
                        <span className={`px-2.5 py-1 rounded-lg border ${t.borderCard} ${surfaceBg} ${t.textMain}`}>{loadedLineLength !== null ? `${loadedLineLength.toFixed(1)} m` : '--'}</span>
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-0 flex overflow-hidden">
                    <aside className={`w-[30%] min-w-[240px] max-w-[300px] border-r ${t.border} ${panelBg} flex flex-col min-h-0`}>
                        <div className={`shrink-0 px-3 py-2 border-b ${t.divider} ${theme === 'dark' ? 'bg-slate-950/55' : 'bg-white/70'}`}>
                            <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                    <div className={`text-[9px] uppercase tracking-wider font-black ${t.textSub}`}>Catalog</div>
                                    <div className="min-w-0 flex items-center gap-2">
                                        <div className={`text-sm font-black ${t.textMain} truncate`}>Saved Lines</div>
                                        <span className="shrink-0 px-1.5 py-0.5 rounded-md bg-blue-600/10 text-blue-500 text-[10px] font-black">{activeCatalogLines.length}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-2 flex items-center gap-1.5 overflow-x-auto pb-1">
                                    {visibleLineTypeFilters.map(({ id, label, icon: Icon }) => {
                                        const active = currentFilter === id;
                                        const count = getFilterCount(id);
                                        return (
                                            <button
                                                key={id}
                                                type="button"
                                                onClick={() => setLineCatalogFilter(id)}
                                                className={`shrink-0 h-7 rounded-full border px-2 flex items-center gap-1.5 transition-all ${active ? 'bg-blue-600 text-white border-blue-500 shadow-sm' : `${t.borderCard} ${surfaceBg} ${t.textSub} hover:border-blue-400 hover:text-blue-500`}`}
                                            >
                                                <Icon className="w-3.5 h-3.5 shrink-0" />
                                                <span className="text-[9px] font-black uppercase">{label}</span>
                                                <span className={`text-[10px] font-black ${active ? 'text-white' : 'text-blue-500'}`}>{count}</span>
                                            </button>
                                        );
                                    })}
                            </div>

                            <div className={`mt-1 flex items-center justify-between gap-2 text-[10px] ${t.textSub}`}>
                                <div className="truncate">
                                    {currentFilter === 'ALL'
                                        ? `${activeCatalogLines.length} active${archivedLines.length ? ` / ${archivedLines.length} archived` : ''}`
                                        : `${lines.length} ${visibleLineTypeFilters.find(filter => filter.id === currentFilter)?.label || 'filtered'} lines`}
                                </div>
                                {archivedLines.length > 0 && (
                                    <button
                                        onClick={() => setShowArchivedLines(prev => !prev)}
                                        className={`shrink-0 px-2 py-0.5 rounded-md border ${showArchivedLines ? 'border-yellow-500/50 bg-yellow-500/10 text-yellow-500' : `${t.borderCard} ${t.textSub} hover:text-yellow-500`} font-black`}
                                    >
                                        {showArchivedLines ? 'Hide archive' : `Archive ${archivedLines.length}`}
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="flex-1 min-h-0 overflow-y-auto p-2.5 space-y-2">
                            {lines.length === 0 ? (
                                <div className={`h-full min-h-[280px] flex flex-col items-center justify-center text-center ${t.textDim}`}>
                                    <Navigation className="w-14 h-14 mb-4 opacity-50" />
                                    <p className={`text-lg font-black ${t.textMain}`}>{currentFilter === 'ALL' ? 'No guidance line' : 'No line in this type'}</p>
                                    <p className="text-sm mt-2 max-w-[260px]">{currentFilter === 'ALL' ? 'Create AB, A+, curve, pivot or combination line for this field.' : 'Choose another type filter or create a new line.'}</p>
                                </div>
                            ) : (
                                lines.map((line, index) => {
                                    const Icon = getLineIconFor(line);
                                    const lengthMeters = getLineLengthMeters(line);
                                    const active = activeLineId === line.id;
                                    const selected = selectedLine?.id === line.id;
                                    const archived = Boolean(line.archived);
                                    return (
                                        <div
                                            key={line.id}
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => setSelectedCatalogLineId(line.id)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault();
                                                    setSelectedCatalogLineId(line.id);
                                                }
                                            }}
                                            className={`relative p-2.5 rounded-xl border text-left transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 ${selected ? 'border-blue-500 bg-blue-500/10 shadow-sm ring-1 ring-blue-500/20' : active ? 'border-green-500/35 bg-green-500/10' : archived ? 'border-yellow-500/35 bg-yellow-500/10' : `${t.borderCard} ${surfaceBg} hover:border-blue-400/70`}`}
                                        >
                                            {selected && <div className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r bg-blue-600" />}
                                            <div className="flex items-start gap-2 min-w-0">
                                                <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${selected ? 'bg-blue-600 text-white' : active ? 'bg-green-500/15 text-green-500 border border-green-500/25' : archived ? 'bg-yellow-500/12 text-yellow-500 border border-yellow-500/25' : `${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-50'} text-blue-500 border ${t.borderCard}`}`}>
                                                    <Icon className="w-4 h-4" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-start justify-between gap-2">
                                                        <div
                                                            className={`text-sm font-black leading-tight ${archived ? t.textSub : t.textMain}`}
                                                            title={line.name || `Line ${index + 1}`}
                                                            style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                                                        >
                                                            {line.name || `Line ${index + 1}`}
                                                        </div>
                                                        {active && <span className="shrink-0 px-1.5 py-0.5 rounded-md bg-green-500/15 text-green-500 text-[8px] font-black uppercase">Loaded</span>}
                                                        {selected && !active && <span className="shrink-0 px-1.5 py-0.5 rounded-md bg-blue-500/15 text-blue-500 text-[8px] font-black uppercase">Selected</span>}
                                                        {archived && <span className="shrink-0 px-1.5 py-0.5 rounded-md bg-yellow-500/15 text-yellow-500 text-[8px] font-black uppercase">Archived</span>}
                                                    </div>
                                                    <div className={`mt-0.5 text-[10px] ${t.textSub}`}>{(line.type || 'LINE').replace(/_/g, ' ')} / {lengthMeters !== null ? `${lengthMeters.toFixed(1)} m` : '--'}</div>
                                                </div>
                                            </div>
                                            <div className="mt-2 flex items-center justify-between gap-2">
                                                <span className={`text-[10px] ${t.textSub}`}>{formatLineDate(line)}</span>
                                                <div className="flex items-center gap-1.5">
                                                    {archived ? (
                                                        <button onClick={(e) => { e.stopPropagation(); handleRestoreLine(line); }} className="px-3 py-2 rounded-lg text-xs font-black border border-yellow-500/40 text-yellow-500 hover:bg-yellow-500/10">
                                                            Restore
                                                        </button>
                                                    ) : (
                                                        <>
                                                            <button aria-label={`Rename ${line.name}`} onClick={(e) => { e.stopPropagation(); handleRenameLine(line); }} className={`p-1.5 rounded-lg ${t.textSub} hover:bg-blue-500/10 hover:text-blue-500`}>
                                                                <PenTool className="w-3.5 h-3.5" />
                                                            </button>
                                                            <button onClick={(e) => { e.stopPropagation(); handleLoadLine(line); }} className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black ${active ? 'bg-blue-600 text-white' : `border ${t.borderCard} ${t.textMain} hover:brightness-95`}`}>
                                                                {active ? 'Loaded' : 'Load'}
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </aside>

                    <div className={`flex-1 min-w-0 min-h-0 p-3 lg:p-4 overflow-hidden ${theme === 'dark' ? 'bg-slate-950' : 'bg-gray-50'}`}>
                    <section className={`${surfaceBg} border ${t.borderCard} rounded-xl min-w-0 min-h-0 h-full overflow-hidden flex flex-col`}>
                        {selectedLine ? (
                            <>
                                <div className={`shrink-0 px-4 py-3 border-b ${t.divider} flex items-start justify-between gap-3`}>
                                    <div className="min-w-0">
                                        <div className={`text-[9px] uppercase tracking-wider font-black ${t.textSub}`}>Selected line</div>
                                        <h3 className={`text-lg font-black ${t.textMain} truncate`}>{selectedLine.name}</h3>
                                        <div className={`mt-0.5 text-xs ${t.textSub}`}>{(selectedLine.type || 'LINE').replace(/_/g, ' ')} / {selectedLine.isMulti ? 'Parallel lines enabled' : 'Single path'}</div>
                                    </div>
                                    <div className="shrink-0 flex items-center gap-2">
                                        {selectedLine.archived && <span className="px-2 py-1 rounded-lg bg-yellow-500/15 text-yellow-500 text-[10px] font-black uppercase">Archived</span>}
                                        {activeLineId === selectedLine.id && <span className="px-2 py-1 rounded-lg bg-green-500/15 text-green-500 text-[10px] font-black uppercase">Active</span>}
                                    </div>
                                </div>

                                <div className="flex-1 min-h-0 p-3 lg:p-4 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.58fr)] xl:grid-cols-[minmax(0,1.05fr)_minmax(250px,0.62fr)] gap-3 lg:gap-4 overflow-hidden">
                                    <div className="min-w-0 min-h-0 flex flex-col gap-3">
                                        {renderLinePreview(selectedLine)}
                                        <div className="grid grid-cols-2 xl:grid-cols-4 gap-2">
                                            {[
                                                { label: 'Length', value: activeLineLength !== null ? `${activeLineLength.toFixed(1)} m` : '--' },
                                                { label: 'Created', value: selectedLineCreated?.date || 'Not recorded', sub: selectedLineCreated?.exact ? selectedLineCreated.time : null },
                                                { label: 'Location', value: selectedLineLocation },
                                                { label: 'Quality', value: selectedLine.archived ? 'Archived' : (selectedLine.quality || 'Good') }
                                            ].map(({ label, value, sub }) => (
                                                <div key={label} className={`${mutedBg} border ${t.borderCard} rounded-lg p-2.5 min-w-0`}>
                                                    <div className={`text-[9px] font-black uppercase ${t.textSub}`}>{label}</div>
                                                    <div className={`mt-1 text-xs leading-tight font-black ${t.textMain} truncate`} title={value}>{value}</div>
                                                    {sub && <div className={`mt-0.5 text-[9px] font-bold ${t.textSub}`}>{sub}</div>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className={`min-w-0 min-h-0 rounded-xl border ${t.borderCard} ${mutedBg} p-3 lg:p-3.5 flex flex-col overflow-y-auto`}>
                                        <div className="flex items-start gap-2.5">
                                            <div className="shrink-0 w-8 h-8 rounded-lg bg-blue-600/10 text-blue-500 flex items-center justify-center">
                                                <Settings className="w-4 h-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className={`font-black uppercase tracking-wider text-[11px] ${t.textMain}`}>Guidance setup</h4>
                                                <div className={`mt-0.5 text-[10px] leading-tight ${t.textSub}`}>Spacing generated from the active implement.</div>
                                            </div>
                                        </div>

                                        <div className={`mt-3 rounded-xl border border-blue-500/25 ${theme === 'dark' ? 'bg-blue-950/25' : 'bg-blue-50'} p-3`}>
                                            <div className={`text-[9px] font-black uppercase tracking-wider ${t.textSub}`}>Pass spacing</div>
                                            <div className="mt-1 flex items-end justify-between gap-3">
                                                <div className="text-2xl leading-none font-black text-blue-600">{passSpacingMeters.toFixed(2)} <span className="text-sm">m</span></div>
                                                <div className={`text-[9px] font-bold text-right ${t.textSub}`}>Width − overlap</div>
                                            </div>
                                        </div>

                                        <div className="mt-2 grid grid-cols-2 gap-2">
                                            {[
                                                ['Working width', `${workingWidthMeters.toFixed(2)} m`],
                                                ['Overlap', `${overlapMeters.toFixed(2)} m`],
                                                ['Heading', selectedLineHeadingLabel],
                                                ['Pass layout', selectedLine.isMulti ? 'Parallel' : 'Single']
                                            ].map(([label, value]) => (
                                                <div key={label} className={`${surfaceBg} border ${t.borderCard} rounded-lg p-2.5 min-w-0`}>
                                                    <div className={`text-[9px] font-black uppercase ${t.textSub}`}>{label}</div>
                                                    <div className={`mt-1 text-xs leading-tight font-black ${t.textMain} truncate`} title={value}>{value}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                <div className={`shrink-0 px-4 py-3 border-t ${t.divider} flex flex-wrap justify-between gap-2 ${theme === 'dark' ? 'bg-slate-950/50' : 'bg-white/70'}`}>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <button onClick={() => confirmDelete('line', selectedLine.id)} className="px-3 py-2 rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/10 font-bold flex items-center gap-2">
                                            <Trash2 className="w-4 h-4" />
                                            Delete
                                        </button>
                                        {!selectedLine.archived && (
                                            <button onClick={() => handleArchiveLine(selectedLine)} className={`px-3 py-2 rounded-lg border ${t.borderCard} ${t.textMain} hover:brightness-95 font-bold flex items-center gap-2`}>
                                                <EyeOff className="w-4 h-4" />
                                                Archive
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 justify-end">
                                        {selectedLine.archived ? (
                                            <button onClick={() => handleRestoreLine(selectedLine)} className="px-5 py-2 rounded-lg bg-yellow-500 text-black font-black hover:bg-yellow-400 shadow-lg shadow-yellow-900/10 flex items-center gap-2">
                                                <CheckCircle2 className="w-4 h-4" />
                                                Restore
                                            </button>
                                        ) : (
                                            <>
                                                <button onClick={() => handleRenameLine(selectedLine)} className={`px-3 py-2 rounded-lg border ${t.borderCard} ${t.textMain} hover:brightness-95 font-bold flex items-center gap-2`}>
                                                    <PenTool className="w-4 h-4" />
                                                    Rename
                                                </button>
                                                <button onClick={() => handleDuplicateLine(selectedLine)} className={`px-3 py-2 rounded-lg border ${t.borderCard} ${t.textMain} hover:brightness-95 font-bold flex items-center gap-2`}>
                                                    <Copy className="w-4 h-4" />
                                                    Duplicate
                                                </button>
                                                <button onClick={() => handleLoadLine(selectedLine)} className="px-5 py-2 rounded-lg bg-blue-600 text-white font-black hover:bg-blue-500 shadow-lg shadow-blue-900/20 flex items-center gap-2">
                                                    <CheckCircle2 className="w-4 h-4" />
                                                    {activeLineId === selectedLine.id ? 'Reload Line' : 'Load Line'}
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            </>
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
      const panelBg = theme === 'dark' ? 'bg-slate-950' : 'bg-white';
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

      const getBoundaryPoints = (boundary) => {
          if (Array.isArray(boundary?.points)) return boundary.points;
          if (Array.isArray(boundary)) return boundary;
          return [];
      };

      const renderFieldQuickView = () => {
          if (!activeField || !fieldQuickView) return null;

          const quickBoundaries = activeField.boundaries || [];
          const quickLines = (activeField.lines || []).filter(line => !line.archived);
          const quickTasks = activeField.tasks || [];
          const quickViewMeta = {
              boundaries: {
                  eyebrow: 'Field edge',
                  title: 'Boundaries',
                  detail: `${quickBoundaries.length} saved for ${activeField.name}`,
                  icon: MapPin,
                  tone: 'text-orange-500',
                  iconBg: 'bg-orange-500/12',
                  createLabel: 'New Boundary',
                  createClass: 'bg-orange-500 hover:bg-orange-400 shadow-orange-900/15'
              },
              lines: {
                  eyebrow: 'Guidance',
                  title: 'Guidance lines',
                  detail: `${quickLines.length} available for ${activeField.name}`,
                  icon: Route,
                  tone: 'text-blue-500',
                  iconBg: 'bg-blue-500/12',
                  createLabel: 'New Line',
                  createClass: 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/15'
              },
              tasks: {
                  eyebrow: 'Field work',
                  title: 'Tasks',
                  detail: `${quickTasks.length} jobs for ${activeField.name}`,
                  icon: FileText,
                  tone: 'text-green-500',
                  iconBg: 'bg-green-500/12',
                  createLabel: 'New Task',
                  createClass: 'bg-green-600 hover:bg-green-500 shadow-green-900/15'
              }
          };
          const meta = quickViewMeta[fieldQuickView];
          const QuickIcon = meta.icon;
          const renderQuickAssetMeta = (asset) => {
              const created = getCreatedDateTime(asset);
              const location = getCreatedLocation(asset, activeField);
              const createdLabel = created.exact ? `${created.date} · ${created.time}` : created.date;

              return (
                  <div className={`mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold ${t.textSub}`}>
                      <span className="inline-flex min-w-0 items-center gap-1.5">
                          <Calendar className="w-3 h-3 shrink-0 opacity-70" />
                          <span className="truncate">{createdLabel}</span>
                      </span>
                      <span className="inline-flex min-w-0 items-center gap-1.5">
                          <MapPin className="w-3 h-3 shrink-0 opacity-70" />
                          <span className="truncate">{location}</span>
                      </span>
                  </div>
              );
          };

          const closeQuickView = () => setFieldQuickView(null);
          const createFromQuickView = () => {
              const assetType = fieldQuickView;
              setFieldQuickView(null);

              if (assetType === 'boundaries') {
                  startBoundaryCreation();
                  return;
              }

              if (assetType === 'lines') {
                  setFieldManagerOpen(false);
                  setLinesPanelOpen(false);
                  setLineModeModalOpen(true);
                  return;
              }

              setFieldAssetTab('tasks');
              actions.setViewMode('CREATE_TASK');
          };

          return (
              <div
                  className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/25 backdrop-blur-[2px] p-4 lg:p-8"
                  onMouseDown={closeQuickView}
              >
                  <section
                      role="dialog"
                      aria-modal="true"
                      aria-label={`${meta.title} quick view`}
                      onMouseDown={(event) => event.stopPropagation()}
                      className={`w-full max-w-[520px] max-h-[62vh] overflow-hidden rounded-2xl border ${t.borderCard} ${panelBg} shadow-2xl flex flex-col`}
                  >
                      <div className={`shrink-0 px-4 py-3 border-b ${t.divider} flex items-center justify-between gap-4`}>
                          <div className="min-w-0 flex items-center gap-3">
                              <div className={`shrink-0 w-10 h-10 rounded-xl ${meta.iconBg} ${meta.tone} flex items-center justify-center`}>
                                  <QuickIcon className="w-5 h-5" />
                              </div>
                              <div className="min-w-0">
                                  <div className={`text-[9px] font-black uppercase tracking-[0.18em] ${t.textSub}`}>{meta.eyebrow} / Quick select</div>
                                  <h3 className={`text-lg leading-tight font-black ${t.textMain}`}>{meta.title}</h3>
                                  <div className={`mt-0.5 text-xs truncate ${t.textSub}`}>{meta.detail}</div>
                              </div>
                          </div>
                          <button
                              type="button"
                              onClick={closeQuickView}
                              className={`shrink-0 p-2 rounded-lg border ${t.borderCard} ${t.textMain} hover:brightness-95`}
                              aria-label="Close quick view"
                          >
                              <X className="w-5 h-5" />
                          </button>
                      </div>

                      <div className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-5">
                          {fieldQuickView === 'boundaries' && (
                              <div className="space-y-3">
                                  {quickBoundaries.length > 0 ? quickBoundaries.map((boundary, index) => {
                                      const pointCount = getBoundaryPoints(boundary).length;
                                      const active = index === activeBoundaryIdx;
                                      return (
                                          <button
                                              type="button"
                                              key={boundary.id || boundary.name || index}
                                              onClick={() => { actions.setActiveBoundaryIdx(index); closeQuickView(); }}
                                              className={`w-full rounded-xl border p-3 flex items-center gap-3 text-left ${active ? 'border-orange-500 bg-orange-500/10' : `${t.borderCard} ${mutedPanelBg} hover:border-orange-400`}`}
                                          >
                                              <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${active ? 'bg-orange-500 text-white' : `${softPanelBg} text-orange-500 border ${t.borderCard}`}`}>
                                                  <MapPin className="w-5 h-5" />
                                              </div>
                                              <div className="min-w-0 flex-1">
                                                  <div className={`font-black truncate ${t.textMain}`}>{boundary.name || `Boundary ${index + 1}`}</div>
                                                  <div className={`mt-0.5 text-xs ${t.textSub}`}>{pointCount} recorded points</div>
                                                  {renderQuickAssetMeta(boundary)}
                                              </div>
                                              <span className={`shrink-0 px-2 py-1 rounded-md text-[9px] font-black uppercase ${active ? 'bg-orange-500/15 text-orange-500' : `${softPanelBg} ${t.textSub}`}`}>
                                                  {active ? 'Selected' : 'Select'}
                                              </span>
                                          </button>
                                      );
                                  }) : (
                                      <div className={`rounded-xl border border-dashed ${t.borderCard} p-8 text-center`}>
                                          <MapPin className={`w-9 h-9 mx-auto ${t.textDim}`} />
                                          <div className={`mt-3 font-black ${t.textMain}`}>No boundary yet</div>
                                          <div className={`mt-1 text-sm ${t.textSub}`}>Create a boundary for this field directly below.</div>
                                      </div>
                                  )}
                              </div>
                          )}

                          {fieldQuickView === 'lines' && (
                              <div className="space-y-3">
                                  {quickLines.length > 0 ? quickLines.map(line => {
                                      const active = activeLineId === line.id;
                                      const LineIcon = getLineIcon(line);
                                      return (
                                          <button
                                              type="button"
                                              key={line.id}
                                              onClick={() => { handleLoadLine(line); closeQuickView(); }}
                                              className={`w-full rounded-xl border p-3 flex items-center gap-3 text-left transition-all ${active ? 'border-blue-500 bg-blue-500/10' : `${t.borderCard} ${mutedPanelBg} hover:border-blue-400`}`}
                                          >
                                              <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${active ? 'bg-blue-600 text-white' : `${softPanelBg} text-blue-500 border ${t.borderCard}`}`}>
                                                  <LineIcon className="w-5 h-5" />
                                              </div>
                                              <div className="min-w-0 flex-1">
                                                  <div className={`font-black truncate ${t.textMain}`}>{line.name}</div>
                                                  <div className={`mt-0.5 text-xs ${t.textSub}`}>{(line.type || 'LINE').replaceAll('_', ' ')} / {line.isMulti ? 'Parallel passes' : 'Single path'}</div>
                                                  {renderQuickAssetMeta(line)}
                                              </div>
                                              <span className={`shrink-0 px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase ${active ? 'bg-blue-500/15 text-blue-500' : `${softPanelBg} ${t.textSub}`}`}>
                                                  {active ? 'Selected' : 'Select'}
                                              </span>
                                          </button>
                                      );
                                  }) : (
                                      <div className={`rounded-xl border border-dashed ${t.borderCard} p-8 text-center`}>
                                          <Route className={`w-9 h-9 mx-auto ${t.textDim}`} />
                                          <div className={`mt-3 font-black ${t.textMain}`}>No guidance line</div>
                                          <div className={`mt-1 text-sm ${t.textSub}`}>Create a guidance line for this field directly below.</div>
                                      </div>
                                  )}
                              </div>
                          )}

                          {fieldQuickView === 'tasks' && (
                              <div className="space-y-3">
                                      {quickTasks.length > 0 ? quickTasks.map(task => {
                                          const active = activeTaskId === task.id;
                                          const TaskIcon = getTaskIcon(task);
                                          return (
                                              <div key={task.id} className={`rounded-xl border p-3.5 flex items-center gap-3 ${active ? 'border-green-500 bg-green-500/10' : `${t.borderCard} ${mutedPanelBg}`}`}>
                                                  <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${active ? 'bg-green-600 text-white' : `${softPanelBg} text-green-500 border ${t.borderCard}`}`}>
                                                      <TaskIcon className="w-5 h-5" />
                                                  </div>
                                                  <div className="min-w-0 flex-1">
                                                      <div className={`font-black truncate ${t.textMain}`}>{task.name}</div>
                                                      <div className={`mt-0.5 text-xs ${t.textSub}`}>{task.type || 'Field work'} / {task.status || 'Pending'}</div>
                                                      {renderQuickAssetMeta(task)}
                                                  </div>
                                                  <div className="shrink-0 flex items-center gap-2">
                                                      {active ? (
                                                          <span className="px-2.5 py-1.5 rounded-lg bg-green-500/15 text-green-500 text-[9px] font-black uppercase">Selected</span>
                                                      ) : task.status !== 'Done' ? (
                                                          <button type="button" onClick={() => { handleTaskAction(task, 'start'); closeQuickView(); }} className="px-3 py-2 rounded-lg bg-green-600 text-white text-xs font-black hover:bg-green-500">
                                                              Select
                                                          </button>
                                                      ) : (
                                                          <span className={`px-2.5 py-1.5 rounded-lg ${mutedPanelBg} text-[9px] font-black uppercase ${t.textSub}`}>Done</span>
                                                      )}
                                                  </div>
                                              </div>
                                          );
                                      }) : (
                                          <div className={`rounded-xl border border-dashed ${t.borderCard} p-7 text-center`}>
                                              <FileText className={`w-9 h-9 mx-auto ${t.textDim}`} />
                                              <div className={`mt-3 font-black ${t.textMain}`}>No task yet</div>
                                              <div className={`mt-1 text-sm ${t.textSub}`}>Create a task for this field directly below.</div>
                                          </div>
                                      )}
                              </div>
                          )}
                      </div>

                      <div className={`shrink-0 px-4 py-3 border-t ${t.divider} flex items-center justify-end gap-2 ${theme === 'dark' ? 'bg-slate-950/70' : 'bg-slate-50'}`}>
                          <button type="button" onClick={closeQuickView} className={`px-4 py-2 rounded-lg border ${t.borderCard} ${t.textMain} text-xs font-black hover:brightness-95`}>
                              Close
                          </button>
                          <button
                              type="button"
                              onClick={createFromQuickView}
                              aria-label={`${meta.createLabel} for ${activeField.name}`}
                              className={`px-4 py-2 rounded-lg text-white text-xs font-black shadow-lg flex items-center gap-2 ${meta.createClass}`}
                          >
                              <Plus className="w-4 h-4" />
                              {meta.createLabel}
                          </button>
                      </div>
                  </section>
              </div>
          );
      };

      const createPreviewMapper = (field, draftBoundaries = []) => {
          const boundaries = draftBoundaries.length > 0 ? draftBoundaries : (field?.boundaries || []);
          const linePoints = (field?.lines || []).flatMap(getLinePoints);
          const boundaryPoints = boundaries.flatMap(getBoundaryPoints).filter(p => Number.isFinite(p?.x) && Number.isFinite(p?.y));
          const finiteLinePoints = linePoints.filter(p => Number.isFinite(p?.x) && Number.isFinite(p?.y));
          const getSpan = (points) => {
              if (!points.length) return { x: 0, y: 0 };
              const xs = points.map(p => p.x);
              const ys = points.map(p => p.y);
              return { x: Math.max(...xs) - Math.min(...xs), y: Math.max(...ys) - Math.min(...ys) };
          };
          const boundarySpan = getSpan(boundaryPoints);
          const hasUsableBoundary = boundaryPoints.length >= 3 && Math.max(boundarySpan.x, boundarySpan.y) > 2;
          const sourcePoints = hasUsableBoundary
              ? boundaryPoints
              : (finiteLinePoints.length > 1 ? finiteLinePoints : boundaryPoints);
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

      const MiniFieldPreview = ({ field, draftBoundaries = [], compact = false }) => {
          const boundaries = draftBoundaries.length > 0 ? draftBoundaries : (field?.boundaries || []);
          const lines = field?.lines || [];
          const boundaryShapes = boundaries.map((boundary, index) => ({
              boundary,
              index,
              points: getBoundaryPoints(boundary).filter(p => Number.isFinite(p?.x) && Number.isFinite(p?.y))
          })).filter(item => item.points.length >= 2);
          const mapPoint = createPreviewMapper(field, draftBoundaries);
          const fieldId = field?.id || 'draft';
          const hasRenderableBoundary = boundaryShapes.length > 0;
          const defaultBoundary = '62,58 226,42 306,90 286,172 132,194 50,140';
          const gridStroke = theme === 'dark' ? '#334155' : '#cbd5e1';
          const boundaryFill = theme === 'dark' ? 'rgba(249,115,22,0.16)' : 'rgba(249,115,22,0.10)';
          const boundaryStroke = theme === 'dark' ? '#fb923c' : '#f97316';
          const inactiveBoundaryStroke = theme === 'dark' ? '#fbbf24' : '#f59e0b';

          return (
              <div className={`relative overflow-hidden rounded-xl border ${t.borderCard} ${mutedPanelBg} h-full ${compact ? 'min-h-[180px]' : 'min-h-[230px]'}`}>
                  <svg viewBox="0 0 360 230" className={`w-full h-full block ${compact ? 'min-h-[180px]' : 'min-h-[230px]'}`} role="img" aria-label="Field preview">
                      <defs>
                          <pattern id={`field-grid-${fieldId}`} width="24" height="24" patternUnits="userSpaceOnUse">
                              <path d="M 24 0 L 0 0 0 24" fill="none" stroke={gridStroke} strokeWidth="0.7" opacity={theme === 'dark' ? '0.26' : '0.42'} />
                          </pattern>
                      </defs>
                      <rect width="360" height="230" fill={`url(#field-grid-${fieldId})`} />
                      <rect width="360" height="230" fill={theme === 'dark' ? 'rgba(15,23,42,0.34)' : 'rgba(248,250,252,0.42)'} />
                      {hasRenderableBoundary ? (
                          boundaryShapes.map(({ boundary, index, points }) => {
                              const previewPoints = points.map(mapPoint).map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
                              const active = index === activeBoundaryIdx;
                              if (points.length === 2) {
                                  return (
                                      <polyline
                                          key={`${boundary.name || 'boundary'}-${index}`}
                                          points={previewPoints}
                                          fill="none"
                                          stroke={active ? boundaryStroke : inactiveBoundaryStroke}
                                          strokeWidth={active ? 3 : 2}
                                          strokeDasharray="8 6"
                                          strokeLinecap="round"
                                      />
                                  );
                              }
                              return (
                                  <polygon
                                      key={`${boundary.name || 'boundary'}-${index}`}
                                      points={previewPoints}
                                      fill={active ? boundaryFill : 'rgba(245,158,11,0.07)'}
                                      stroke={active ? boundaryStroke : inactiveBoundaryStroke}
                                      strokeWidth={active ? 3 : 2}
                                      strokeDasharray={active ? 'none' : '7 6'}
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
                                  {index === 0 && previewPoints.map((point, pointIndex) => (
                                      <circle
                                          key={`${line.id || index}-point-${pointIndex}`}
                                          cx={point.x}
                                          cy={point.y}
                                          r={pointIndex === 0 ? 4 : 3.5}
                                          fill={pointIndex === 0 ? '#2563eb' : '#38bdf8'}
                                          stroke="white"
                                          strokeWidth="1.5"
                                      />
                                  ))}
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

      const BoundaryMapPreview = ({ boundaries = [] }) => {
          const mapPoint = createPreviewMapper({ boundaries, lines: [] });
          const gridStroke = theme === 'dark' ? '#334155' : '#cbd5e1';
          const activeStroke = theme === 'dark' ? '#fbbf24' : '#f59e0b';
          return (
              <div className={`relative overflow-hidden rounded-xl border ${t.borderCard} ${mutedPanelBg} min-h-[320px] h-full`}>
                  <svg viewBox="0 0 360 230" className="absolute inset-0 w-full h-full" role="img" aria-label="Boundary map">
                      <defs>
                          <pattern id="boundary-manager-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                              <path d="M 24 0 L 0 0 0 24" fill="none" stroke={gridStroke} strokeWidth="0.7" opacity={theme === 'dark' ? '0.24' : '0.42'} />
                          </pattern>
                      </defs>
                      <rect width="360" height="230" fill="url(#boundary-manager-grid)" />
                      <rect width="360" height="230" fill={theme === 'dark' ? 'rgba(15,23,42,0.28)' : 'rgba(248,250,252,0.46)'} />
                      {boundaries.map((boundary, index) => {
                          const points = getBoundaryPoints(boundary).filter(p => Number.isFinite(p?.x) && Number.isFinite(p?.y));
                          if (points.length < 2) return null;
                          const previewPoints = points.map(mapPoint).map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
                          const active = index === activeBoundaryIdx;
                          return (
                              <polygon
                                  key={`${boundary.name || 'boundary'}-${index}`}
                                  points={previewPoints}
                                  fill={active ? 'rgba(245,158,11,0.14)' : 'rgba(100,116,139,0.08)'}
                                  stroke={active ? activeStroke : '#94a3b8'}
                                  strokeWidth={active ? 3.2 : 2}
                                  strokeDasharray={active ? 'none' : '8 7'}
                              />
                          );
                      })}
                  </svg>
                  {boundaries.length === 0 && (
                      <div className={`absolute inset-0 flex flex-col items-center justify-center text-center px-8 ${t.textDim}`}>
                          <MapPin className="w-12 h-12 mb-3 opacity-55" />
                          <div className={`text-lg font-black ${t.textMain}`}>No boundary recorded</div>
                          <div className="mt-1 text-sm">Record a loop from the run screen to define field edges.</div>
                      </div>
                  )}
              </div>
          );
      };

      const renderBoundaryManager = () => {
          const boundaries = activeField?.boundaries || [];
          const activeIndex = boundaries.length > 0 ? Math.min(Math.max(activeBoundaryIdx || 0, 0), boundaries.length - 1) : -1;
          const activeBoundary = activeIndex >= 0 ? boundaries[activeIndex] : null;
          const selectedIndex = Number.isInteger(selectedBoundaryIndex) && selectedBoundaryIndex >= 0 && selectedBoundaryIndex < boundaries.length
              ? selectedBoundaryIndex
              : activeIndex;
          const selectedBoundary = selectedIndex >= 0 ? boundaries[selectedIndex] : null;
          const activePoints = getBoundaryPoints(activeBoundary).length;
          const selectedPoints = getBoundaryPoints(selectedBoundary);
          const selectedCreated = getCreatedDateTime(selectedBoundary);
          const selectedLocation = getCreatedLocation(selectedBoundary, activeField);
          const selectedPosition = getCreatedPosition(selectedBoundary);
          const selectedPerimeter = selectedPoints.length > 1
              ? calculatePathLength(selectedPoints) / PIXELS_PER_METER
              : 0;
          const selectedArea = selectedPoints.length > 2
              ? Math.abs(selectedPoints.reduce((sum, point, index) => {
                  const next = selectedPoints[(index + 1) % selectedPoints.length];
                  return sum + (point.x * next.y) - (next.x * point.y);
              }, 0)) / 2 / (PIXELS_PER_METER * PIXELS_PER_METER) / 10000
              : 0;

          return (
              <div className={`w-full h-full flex flex-col ${panelBg}`}>
                  <div className={`flex items-center justify-between gap-4 px-5 py-4 border-b ${t.divider} ${theme === 'dark' ? 'bg-slate-950/90' : 'bg-white/90'}`}>
                      <div className="min-w-0 flex items-center gap-3">
                          <div className={`shrink-0 w-10 h-10 rounded-xl border ${t.borderCard} ${softPanelBg} flex items-center justify-center`}>
                              <MapPin className="w-5 h-5 text-orange-500" />
                          </div>
                          <div className="min-w-0">
                              <h2 className={`text-lg font-black ${t.textMain}`}>Boundary Manager</h2>
                              <div className={`text-xs ${t.textSub} truncate`}>{activeField?.name || 'No field selected'} / {boundaries.length} saved loops</div>
                          </div>
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                          <ManagerNewButton entity="Boundary" tone="orange" onClick={startBoundaryCreation} />
                          <ManagerCloseButton label="boundary manager" onClick={() => setFieldManagerOpen(false)} />
                      </div>
                  </div>

                  <div className={`shrink-0 px-4 py-2 border-b ${t.divider} ${theme === 'dark' ? 'bg-orange-950/14' : 'bg-orange-50/65'}`}>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="min-w-0 flex items-center gap-2.5">
                              <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${activeBoundary ? 'bg-orange-500 text-white' : `${softPanelBg} ${t.textSub} border ${t.borderCard}`}`}>
                                  <MapPin className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                  <div className={`text-[9px] uppercase font-black tracking-widest ${t.textSub}`}>Active boundary</div>
                                  <div className={`text-sm font-black truncate ${activeBoundary ? t.textMain : t.textSub}`}>{activeBoundary?.name || 'No boundary active'}</div>
                              </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-black">
                              <span className={`px-2.5 py-1 rounded-lg border ${activeBoundary ? 'border-green-500/35 bg-green-500/10 text-green-500' : `${t.borderCard} ${t.textSub}`}`}>{activeBoundary ? 'ACTIVE' : 'NO ACTIVE'}</span>
                              <span className={`px-2.5 py-1 rounded-lg border ${t.borderCard} ${softPanelBg} ${t.textMain}`}>{activePoints || 0} pts</span>
                              <span className={`px-2.5 py-1 rounded-lg border ${t.borderCard} ${softPanelBg} ${t.textMain}`}>{activeField?.name || '--'}</span>
                          </div>
                      </div>
                  </div>

                  <div className="flex-1 min-h-0 flex overflow-hidden">
                      <aside className={`w-[30%] min-w-[240px] max-w-[300px] border-r ${t.border} ${panelBg} flex flex-col min-h-0`}>
                          <div className={`shrink-0 px-3 py-3 border-b ${t.divider} ${theme === 'dark' ? 'bg-slate-950/55' : 'bg-white/70'}`}>
                              <div className="flex items-center justify-between gap-3">
                                  <div>
                                      <div className={`text-[9px] uppercase tracking-wider font-black ${t.textSub}`}>Catalog</div>
                                      <div className={`text-sm font-black ${t.textMain}`}>Saved Boundaries</div>
                                  </div>
                                  <span className="px-2 py-1 rounded-lg bg-orange-500/10 text-orange-500 text-[10px] font-black">{boundaries.length}</span>
                              </div>
                              <div className={`mt-2 text-[10px] ${t.textSub}`}>Select a loop to inspect its location and capture details.</div>
                          </div>

                          <div className="flex-1 min-h-0 overflow-y-auto p-2.5 space-y-2">
                              {boundaries.length > 0 ? boundaries.map((boundary, index) => {
                                  const points = getBoundaryPoints(boundary);
                                  const active = index === activeIndex;
                                  const selected = index === selectedIndex;
                                  const created = getCreatedDateTime(boundary);
                                  return (
                                      <div
                                          key={`${boundary.name || 'boundary'}-${index}`}
                                          role="button"
                                          tabIndex={0}
                                          onClick={() => setSelectedBoundaryIndex(index)}
                                          onKeyDown={(event) => {
                                              if (event.key === 'Enter' || event.key === ' ') {
                                                  event.preventDefault();
                                                  setSelectedBoundaryIndex(index);
                                              }
                                          }}
                                          className={`relative p-2.5 rounded-xl border text-left transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500/40 ${selected ? 'border-orange-500 bg-orange-500/10 shadow-sm ring-1 ring-orange-500/20' : active ? 'border-green-500/35 bg-green-500/10' : `${t.borderCard} ${softPanelBg} hover:border-orange-400/70`}`}
                                      >
                                          {selected && <div className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r bg-orange-500" />}
                                          <div className="flex items-start gap-2 min-w-0">
                                              <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${selected ? 'bg-orange-500 text-white' : active ? 'bg-green-500/15 text-green-500 border border-green-500/25' : `${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-50'} text-orange-500 border ${t.borderCard}`}`}>
                                                  <MapPin className="w-4 h-4" />
                                              </div>
                                              <div className="min-w-0 flex-1">
                                                  <div className="flex items-start justify-between gap-2">
                                                      <div className={`text-sm font-black leading-tight ${t.textMain} truncate`}>{boundary.name || `Boundary ${index + 1}`}</div>
                                                      {active && <span className="shrink-0 px-1.5 py-0.5 rounded-md bg-green-500/15 text-green-500 text-[8px] font-black uppercase">Active</span>}
                                                      {selected && !active && <span className="shrink-0 px-1.5 py-0.5 rounded-md bg-orange-500/15 text-orange-500 text-[8px] font-black uppercase">Selected</span>}
                                                  </div>
                                                  <div className={`mt-0.5 text-[10px] ${t.textSub}`}>{points.length} points / Loop {index + 1}</div>
                                              </div>
                                          </div>
                                          <div className={`mt-2 pt-2 border-t ${t.divider} flex items-center justify-between gap-2`}>
                                              <div className="min-w-0">
                                                  <div className={`text-[9px] font-bold ${t.textSub} truncate`}>{created.date}</div>
                                                  <div className={`text-[9px] ${t.textDim} truncate`}>{getCreatedLocation(boundary, activeField)}</div>
                                              </div>
                                              <ChevronRight className={`w-4 h-4 shrink-0 ${selected ? 'text-orange-500' : t.textDim}`} />
                                          </div>
                                      </div>
                                  );
                              }) : (
                                  <div className={`h-full min-h-[280px] flex flex-col items-center justify-center text-center px-5 ${t.textDim}`}>
                                      <MapPin className="w-14 h-14 mb-4 opacity-45" />
                                      <div className={`text-lg font-black ${t.textMain}`}>No boundary saved</div>
                                      <div className="mt-2 text-sm">Use New Boundary, position the vehicle, then press Start to record.</div>
                                  </div>
                              )}
                          </div>
                      </aside>

                      <div className={`flex-1 min-w-0 min-h-0 p-3 lg:p-4 overflow-hidden ${theme === 'dark' ? 'bg-slate-950' : 'bg-gray-50'}`}>
                          <section className={`${softPanelBg} border ${t.borderCard} rounded-xl min-w-0 min-h-0 h-full overflow-hidden flex flex-col`}>
                              {selectedBoundary ? (
                                  <>
                                      <div className={`shrink-0 px-4 py-3 border-b ${t.divider} flex items-start justify-between gap-3`}>
                                          <div className="min-w-0">
                                              <div className={`text-[9px] uppercase tracking-wider font-black ${t.textSub}`}>Selected boundary</div>
                                              <h3 className={`text-lg font-black ${t.textMain} truncate`}>{selectedBoundary.name || `Boundary ${selectedIndex + 1}`}</h3>
                                              <div className={`mt-0.5 text-xs ${t.textSub}`}>{selectedPoints.length} recorded points / Loop {selectedIndex + 1}</div>
                                          </div>
                                          <div className="shrink-0 flex items-center gap-2">
                                              {selectedIndex === activeIndex && <span className="px-2 py-1 rounded-lg bg-green-500/15 text-green-500 text-[10px] font-black uppercase">Active</span>}
                                              <span className="px-2 py-1 rounded-lg bg-orange-500/15 text-orange-500 text-[10px] font-black uppercase">Closed loop</span>
                                          </div>
                                      </div>

                                      <div className="flex-1 min-h-0 p-3 lg:p-4 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(230px,0.62fr)] gap-3 lg:gap-4 overflow-hidden">
                                          <div className="min-w-0 min-h-0 flex flex-col gap-3">
                                              <div className="min-h-[210px] flex-1">
                                                  <BoundaryMapPreview boundaries={[selectedBoundary]} />
                                              </div>
                                              <div className="grid grid-cols-2 xl:grid-cols-4 gap-2">
                                                  {[
                                                      ['Points', selectedPoints.length],
                                                      ['Perimeter', selectedPerimeter > 0 ? `${selectedPerimeter.toFixed(1)} m` : '--'],
                                                      ['Area', selectedArea > 0 ? `${selectedArea.toFixed(2)} ha` : '--'],
                                                      ['Status', selectedIndex === activeIndex ? 'Active' : 'Saved']
                                                  ].map(([label, value]) => (
                                                      <div key={label} className={`${mutedPanelBg} border ${t.borderCard} rounded-lg p-2.5 min-w-0`}>
                                                          <div className={`text-[9px] font-black uppercase ${t.textSub}`}>{label}</div>
                                                          <div className={`mt-1 text-xs leading-tight font-black ${label === 'Status' && value === 'Active' ? 'text-green-500' : t.textMain} break-words`}>{value}</div>
                                                      </div>
                                                  ))}
                                              </div>
                                          </div>

                                          <div className={`min-w-0 min-h-0 rounded-xl border ${t.borderCard} ${mutedPanelBg} p-3 flex flex-col overflow-y-auto`}>
                                              <div className="flex items-center gap-2 mb-3">
                                                  <MapPin className="w-4 h-4 text-orange-500 shrink-0" />
                                                  <h4 className={`font-black uppercase tracking-wider text-[11px] ${t.textSub}`}>Capture details</h4>
                                              </div>
                                              <div className="space-y-2">
                                                  {[
                                                      { label: 'Created date', value: selectedCreated.date, sub: selectedCreated.time, icon: Calendar },
                                                      { label: 'Created at', value: selectedLocation, sub: 'Field / location', icon: MapPin },
                                                      { label: 'Vehicle position', value: selectedPosition, sub: 'Simulation coordinates', icon: Crosshair },
                                                      { label: 'Capture source', value: 'Vehicle boundary recorder', sub: selectedCreated.exact ? 'Exact timestamp saved' : 'Legacy record', icon: Navigation }
                                                  ].map(({ label, value, sub, icon: Icon }) => (
                                                      <div key={label} className={`${softPanelBg} border ${t.borderCard} rounded-lg p-2.5 flex items-start gap-2.5 min-w-0`}>
                                                          <div className="shrink-0 w-7 h-7 rounded-lg bg-orange-500/10 text-orange-500 flex items-center justify-center">
                                                              <Icon className="w-3.5 h-3.5" />
                                                          </div>
                                                          <div className="min-w-0">
                                                              <div className={`text-[9px] font-black uppercase ${t.textSub}`}>{label}</div>
                                                              <div className={`mt-0.5 text-xs font-black ${t.textMain} break-words`}>{value}</div>
                                                              <div className={`mt-0.5 text-[9px] ${t.textDim}`}>{sub}</div>
                                                          </div>
                                                      </div>
                                                  ))}
                                              </div>
                                          </div>
                                      </div>

                                      <div className={`shrink-0 px-4 py-3 border-t ${t.divider} flex flex-wrap items-center justify-between gap-2 ${theme === 'dark' ? 'bg-slate-950/50' : 'bg-white/70'}`}>
                                          <button onClick={() => confirmDelete('boundary', null, selectedIndex)} className="px-3 py-2 rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/10 font-bold flex items-center gap-2">
                                              <Trash2 className="w-4 h-4" />
                                              Delete
                                          </button>
                                          <button
                                              onClick={() => actions.setActiveBoundaryIdx(selectedIndex)}
                                              disabled={selectedIndex === activeIndex}
                                              className={`px-5 py-2 rounded-lg font-black flex items-center gap-2 ${selectedIndex === activeIndex ? `${mutedPanelBg} ${t.textDim} border ${t.borderCard} cursor-default` : 'bg-orange-500 text-white hover:bg-orange-400 shadow-lg shadow-orange-900/15'}`}
                                          >
                                              <CheckCircle2 className="w-4 h-4" />
                                              {selectedIndex === activeIndex ? 'Active Boundary' : 'Set Active'}
                                          </button>
                                      </div>
                                  </>
                              ) : (
                                  <div className={`h-full min-h-[360px] flex flex-col items-center justify-center text-center px-8 ${t.textDim}`}>
                                      <MapPin className="w-16 h-16 mb-4 opacity-45" />
                                      <h3 className={`text-xl font-black ${t.textMain}`}>No boundary selected</h3>
                                      <p className="text-sm mt-2 max-w-[340px]">Create a boundary first. The saved loop, creation time and field location will appear here.</p>
                                  </div>
                              )}
                          </section>
                      </div>
                  </div>
              </div>
          );
      };

      const taskOptions = [
          { type: 'Tillage', title: 'Tillage / Plowing', detail: 'Soil prep, ripping, leveling', icon: Tractor },
          { type: 'Planting', title: 'Planting / Seeding', detail: 'Seed rows and pass tracking', icon: Sprout },
          { type: 'Spraying', title: 'Spraying', detail: 'Coverage and section control', icon: Droplets },
          { type: 'Harvesting', title: 'Harvesting', detail: 'Yield pass and area done', icon: Scissors }
      ];

      const renderTaskManager = () => {
          const tasks = activeField?.tasks || [];
          const activeTask = activeTaskId ? tasks.find(task => task.id === activeTaskId) : null;
          const pendingTasks = tasks.filter(task => task.status !== 'Done' && task.id !== activeTaskId);
          const doneTasks = tasks.filter(task => task.status === 'Done');
          const selectedTask = tasks.find(task => task.id === selectedTaskId) || activeTask || tasks[0] || null;
          const selectedTaskCreated = getCreatedDateTime(selectedTask);
          const selectedTaskLocation = getCreatedLocation(selectedTask, activeField);
          const selectedTaskPosition = getCreatedPosition(selectedTask);
          const SelectedTaskIcon = selectedTask ? getTaskIcon(selectedTask) : FileText;
          const getTaskStatusTone = (task) => {
              if (activeTaskId === task?.id) return 'bg-green-500/15 text-green-500 border-green-500/30';
              if (task?.status === 'Done') return 'bg-slate-500/12 text-slate-500 border-slate-500/25';
              if (task?.status === 'Paused') return 'bg-orange-500/12 text-orange-500 border-orange-500/25';
              return 'bg-blue-500/12 text-blue-500 border-blue-500/25';
          };

          return (
              <div className={`w-full h-full flex flex-col ${panelBg}`}>
                  <div className={`flex items-center justify-between gap-4 px-5 py-4 border-b ${t.divider} ${theme === 'dark' ? 'bg-slate-950/90' : 'bg-white/90'}`}>
                      <div className="min-w-0 flex items-center gap-3">
                          <div className={`shrink-0 w-10 h-10 rounded-xl border ${t.borderCard} ${softPanelBg} flex items-center justify-center`}>
                              <FileText className="w-5 h-5 text-green-500" />
                          </div>
                          <div className="min-w-0">
                              <h2 className={`text-lg font-black ${t.textMain}`}>Task Board</h2>
                              <div className={`text-xs ${t.textSub} truncate`}>{activeField?.name || 'No field selected'} / {tasks.length} tasks</div>
                          </div>
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                          <ManagerNewButton entity="Task" tone="green" onClick={startTaskCreation} disabled={viewMode === 'CREATE_TASK'} />
                          <ManagerCloseButton label="task board" onClick={() => setFieldManagerOpen(false)} />
                      </div>
                  </div>

                  <div className={`shrink-0 px-4 py-2 border-b ${t.divider} ${theme === 'dark' ? 'bg-green-950/14' : 'bg-green-50/65'}`}>
                      <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="min-w-0 flex items-center gap-2.5">
                              <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${activeTask ? 'bg-green-600 text-white' : `${softPanelBg} ${t.textSub} border ${t.borderCard}`}`}>
                                  <Activity className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                  <div className={`text-[9px] uppercase font-black tracking-widest ${t.textSub}`}>Active task</div>
                                  <div className={`text-sm font-black truncate ${activeTask ? t.textMain : t.textSub}`}>{activeTask?.name || 'No task running'}</div>
                              </div>
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-black">
                              <span className={`px-2.5 py-1 rounded-lg border ${activeTask ? 'border-green-500/35 bg-green-500/10 text-green-500' : `${t.borderCard} ${t.textSub}`}`}>{activeTask ? 'RUNNING' : 'NO ACTIVE'}</span>
                              <span className={`px-2.5 py-1 rounded-lg border ${t.borderCard} ${softPanelBg} ${t.textMain}`}>{pendingTasks.length} pending</span>
                              <span className={`px-2.5 py-1 rounded-lg border ${t.borderCard} ${softPanelBg} ${t.textMain}`}>{doneTasks.length} done</span>
                          </div>
                      </div>
                  </div>

                  {viewMode === 'CREATE_TASK' ? (
                      <div className="flex-1 min-h-0 overflow-y-auto p-5 lg:p-6">
                          <div className="max-w-5xl mx-auto">
                              <div className={`mb-5 rounded-xl border ${t.borderCard} ${softPanelBg} p-4 flex flex-wrap items-center justify-between gap-3`}>
                                  <div>
                                      <div className={`text-[10px] uppercase font-black ${t.textSub}`}>New task target</div>
                                      <div className={`font-black ${t.textMain}`}>{activeField?.name || 'Select field first'}</div>
                                  </div>
                                  <button onClick={() => actions.setViewMode('LIST')} className={`h-10 px-4 rounded-lg border ${t.borderCard} ${t.textMain} font-black hover:brightness-95`}>
                                      Back to Tasks
                                  </button>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {taskOptions.map(({ type, title, detail, icon: Icon }) => (
                                      <button
                                          key={type}
                                          onClick={() => saveNewTask(type)}
                                          className={`text-left rounded-xl border ${t.borderCard} ${softPanelBg} hover:border-green-500 hover:bg-green-500/5 transition-all p-5 flex items-start gap-4`}
                                      >
                                          <div className="shrink-0 w-12 h-12 rounded-xl bg-green-500/10 text-green-500 flex items-center justify-center">
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
                  ) : (
                      <div className="flex-1 min-h-0 flex overflow-hidden">
                          <aside className={`w-[30%] min-w-[240px] max-w-[300px] border-r ${t.border} ${panelBg} flex flex-col min-h-0`}>
                              <div className={`shrink-0 px-3 py-3 border-b ${t.divider} ${theme === 'dark' ? 'bg-slate-950/55' : 'bg-white/70'}`}>
                                  <div className="flex items-center justify-between gap-3">
                                      <div>
                                          <div className={`text-[9px] uppercase tracking-wider font-black ${t.textSub}`}>Catalog</div>
                                          <div className={`text-sm font-black ${t.textMain}`}>Field Tasks</div>
                                      </div>
                                      <span className="px-2 py-1 rounded-lg bg-green-500/10 text-green-500 text-[10px] font-black">{tasks.length}</span>
                                  </div>
                                  <div className="mt-2 grid grid-cols-3 gap-1.5">
                                      {[
                                          ['Running', activeTask ? 1 : 0, 'text-green-500'],
                                          ['Pending', pendingTasks.length, 'text-blue-500'],
                                          ['Done', doneTasks.length, 'text-slate-500']
                                      ].map(([label, value, tone]) => (
                                          <div key={label} className={`rounded-lg border ${t.borderCard} ${softPanelBg} px-2 py-1.5 text-center`}>
                                              <div className={`text-sm font-black ${tone}`}>{value}</div>
                                              <div className={`text-[8px] font-black uppercase ${t.textSub}`}>{label}</div>
                                          </div>
                                      ))}
                                  </div>
                              </div>

                              <div className="flex-1 min-h-0 overflow-y-auto p-2.5 space-y-2">
                                  {tasks.length > 0 ? tasks.map(task => {
                                      const Icon = getTaskIcon(task);
                                      const active = activeTaskId === task.id;
                                      const selected = selectedTask?.id === task.id;
                                      const created = getCreatedDateTime(task);
                                      return (
                                          <div
                                              key={task.id}
                                              role="button"
                                              tabIndex={0}
                                              onClick={() => setSelectedTaskId(task.id)}
                                              onKeyDown={(event) => {
                                                  if (event.key === 'Enter' || event.key === ' ') {
                                                      event.preventDefault();
                                                      setSelectedTaskId(task.id);
                                                  }
                                              }}
                                              className={`relative p-2.5 rounded-xl border text-left transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500/40 ${selected ? 'border-green-500 bg-green-500/10 shadow-sm ring-1 ring-green-500/20' : active ? 'border-green-500/35 bg-green-500/5' : `${t.borderCard} ${softPanelBg} hover:border-green-400/70`}`}
                                          >
                                              {selected && <div className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r bg-green-600" />}
                                              <div className="flex items-start gap-2 min-w-0">
                                                  <div className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${selected ? 'bg-green-600 text-white' : `${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-50'} text-green-500 border ${t.borderCard}`}`}>
                                                      <Icon className="w-4 h-4" />
                                                  </div>
                                                  <div className="min-w-0 flex-1">
                                                      <div className="flex items-start justify-between gap-2">
                                                          <div className={`text-sm font-black leading-tight ${t.textMain} truncate`}>{task.name}</div>
                                                          <span className={`shrink-0 px-1.5 py-0.5 rounded-md border text-[8px] font-black uppercase ${getTaskStatusTone(task)}`}>{active ? 'Running' : task.status}</span>
                                                      </div>
                                                      <div className={`mt-0.5 text-[10px] ${t.textSub}`}>{task.type || 'Field work'}</div>
                                                  </div>
                                              </div>
                                              <div className={`mt-2 pt-2 border-t ${t.divider} flex items-center justify-between gap-2`}>
                                                  <div className="min-w-0">
                                                      <div className={`text-[9px] font-bold ${t.textSub} truncate`}>{created.date}</div>
                                                      <div className={`text-[9px] ${t.textDim} truncate`}>{getCreatedLocation(task, activeField)}</div>
                                                  </div>
                                                  <ChevronRight className={`w-4 h-4 shrink-0 ${selected ? 'text-green-500' : t.textDim}`} />
                                              </div>
                                          </div>
                                      );
                                  }) : (
                                      <div className={`h-full min-h-[280px] flex flex-col items-center justify-center text-center px-5 ${t.textDim}`}>
                                          <FileText className="w-14 h-14 mb-4 opacity-45" />
                                          <div className={`text-lg font-black ${t.textMain}`}>No task created</div>
                                          <div className="mt-2 text-sm">Create a job for this field, then start it when the vehicle is ready.</div>
                                      </div>
                                  )}
                              </div>
                          </aside>

                          <div className={`flex-1 min-w-0 min-h-0 p-3 lg:p-4 overflow-hidden ${theme === 'dark' ? 'bg-slate-950' : 'bg-gray-50'}`}>
                              <section className={`${softPanelBg} border ${t.borderCard} rounded-xl min-w-0 min-h-0 h-full overflow-hidden flex flex-col`}>
                                  {selectedTask ? (
                                      <>
                                          <div className={`shrink-0 px-4 py-3 border-b ${t.divider} flex items-start justify-between gap-3`}>
                                              <div className="min-w-0 flex items-start gap-3">
                                                  <div className="shrink-0 w-10 h-10 rounded-xl bg-green-500/10 text-green-500 flex items-center justify-center">
                                                      <SelectedTaskIcon className="w-5 h-5" />
                                                  </div>
                                                  <div className="min-w-0">
                                                      <div className={`text-[9px] uppercase tracking-wider font-black ${t.textSub}`}>Selected task</div>
                                                      <h3 className={`text-lg font-black ${t.textMain} truncate`}>{selectedTask.name}</h3>
                                                      <div className={`mt-0.5 text-xs ${t.textSub}`}>{selectedTask.type || 'Field work'} / {activeField?.name || 'No field'}</div>
                                                  </div>
                                              </div>
                                              <span className={`shrink-0 px-2.5 py-1 rounded-lg border text-[10px] font-black uppercase ${getTaskStatusTone(selectedTask)}`}>
                                                  {activeTaskId === selectedTask.id ? 'Running' : selectedTask.status}
                                              </span>
                                          </div>

                                          <div className="flex-1 min-h-0 p-3 lg:p-4 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(230px,0.62fr)] gap-3 lg:gap-4 overflow-hidden">
                                              <div className="min-w-0 min-h-0 flex flex-col gap-3">
                                                  <div className={`rounded-xl border ${t.borderCard} ${mutedPanelBg} p-4`}>
                                                      <div className="flex items-center justify-between gap-4">
                                                          <div className="min-w-0">
                                                              <div className={`text-[9px] uppercase tracking-wider font-black ${t.textSub}`}>Work profile</div>
                                                              <div className={`mt-1 text-xl font-black ${t.textMain}`}>{selectedTask.type || 'General field work'}</div>
                                                              <div className={`mt-1 text-sm ${t.textSub}`}>{taskOptions.find(option => option.type === selectedTask.type)?.detail || 'Field operation and progress tracking'}</div>
                                                          </div>
                                                          <div className={`shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center ${getTaskStatusTone(selectedTask)} border`}>
                                                              <SelectedTaskIcon className="w-8 h-8" />
                                                          </div>
                                                      </div>
                                                  </div>

                                                  <div className="grid grid-cols-2 gap-2">
                                                      {[
                                                          ['Status', activeTaskId === selectedTask.id ? 'Running' : selectedTask.status],
                                                          ['Field', activeField?.name || '--'],
                                                          ['Started', selectedTask.startedAt ? getCreatedDateTime({ createdAt: selectedTask.startedAt }).date : 'Not started'],
                                                          ['Completed', selectedTask.completedAt ? getCreatedDateTime({ createdAt: selectedTask.completedAt }).date : 'Not completed']
                                                      ].map(([label, value]) => (
                                                          <div key={label} className={`${mutedPanelBg} border ${t.borderCard} rounded-lg p-2.5 min-w-0`}>
                                                              <div className={`text-[9px] font-black uppercase ${t.textSub}`}>{label}</div>
                                                              <div className={`mt-1 text-xs leading-tight font-black ${label === 'Status' && activeTaskId === selectedTask.id ? 'text-green-500' : t.textMain} break-words`}>{value}</div>
                                                          </div>
                                                      ))}
                                                  </div>

                                                  <div className={`rounded-xl border ${t.borderCard} ${mutedPanelBg} p-3`}>
                                                      <div className={`text-[9px] uppercase tracking-wider font-black ${t.textSub}`}>Operator note</div>
                                                      <div className={`mt-1 text-sm ${t.textMain}`}>Task is tied to <span className="font-black">{activeField?.name || 'this field'}</span>. Start it only when the vehicle and implement are positioned for work.</div>
                                                  </div>
                                              </div>

                                              <div className={`min-w-0 min-h-0 rounded-xl border ${t.borderCard} ${mutedPanelBg} p-3 flex flex-col overflow-y-auto`}>
                                                  <div className="flex items-center gap-2 mb-3">
                                                      <MapPin className="w-4 h-4 text-green-500 shrink-0" />
                                                      <h4 className={`font-black uppercase tracking-wider text-[11px] ${t.textSub}`}>Creation details</h4>
                                                  </div>
                                                  <div className="space-y-2">
                                                      {[
                                                          { label: 'Created date', value: selectedTaskCreated.date, sub: selectedTaskCreated.time, icon: Calendar },
                                                          { label: 'Created at', value: selectedTaskLocation, sub: 'Field / location', icon: MapPin },
                                                          { label: 'Vehicle position', value: selectedTaskPosition, sub: 'Simulation coordinates', icon: Crosshair },
                                                          { label: 'Record quality', value: selectedTaskCreated.exact ? 'Complete metadata' : 'Legacy task', sub: selectedTaskCreated.exact ? 'Exact timestamp saved' : 'Creation time unavailable', icon: CheckCircle2 }
                                                      ].map(({ label, value, sub, icon: Icon }) => (
                                                          <div key={label} className={`${softPanelBg} border ${t.borderCard} rounded-lg p-2.5 flex items-start gap-2.5 min-w-0`}>
                                                              <div className="shrink-0 w-7 h-7 rounded-lg bg-green-500/10 text-green-500 flex items-center justify-center">
                                                                  <Icon className="w-3.5 h-3.5" />
                                                              </div>
                                                              <div className="min-w-0">
                                                                  <div className={`text-[9px] font-black uppercase ${t.textSub}`}>{label}</div>
                                                                  <div className={`mt-0.5 text-xs font-black ${t.textMain} break-words`}>{value}</div>
                                                                  <div className={`mt-0.5 text-[9px] ${t.textDim}`}>{sub}</div>
                                                              </div>
                                                          </div>
                                                      ))}
                                                  </div>
                                              </div>
                                          </div>

                                          <div className={`shrink-0 px-4 py-3 border-t ${t.divider} flex flex-wrap items-center justify-between gap-2 ${theme === 'dark' ? 'bg-slate-950/50' : 'bg-white/70'}`}>
                                              <button onClick={() => confirmDelete('task', selectedTask.id)} className="px-3 py-2 rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/10 font-bold flex items-center gap-2">
                                                  <Trash2 className="w-4 h-4" />
                                                  Delete
                                              </button>
                                              <div className="flex flex-wrap items-center gap-2">
                                                  {activeTaskId === selectedTask.id ? (
                                                      <>
                                                          <button onClick={() => handleTaskAction(selectedTask, 'pause')} className="px-4 py-2 rounded-lg border border-orange-500/30 text-orange-500 hover:bg-orange-500/10 font-black flex items-center gap-2">
                                                              <Pause className="w-4 h-4" />
                                                              Pause
                                                          </button>
                                                          <button onClick={() => handleTaskAction(selectedTask, 'finish')} className="px-5 py-2 rounded-lg bg-green-600 text-white hover:bg-green-500 font-black flex items-center gap-2">
                                                              <CheckSquare className="w-4 h-4" />
                                                              Finish Task
                                                          </button>
                                                      </>
                                                  ) : selectedTask.status !== 'Done' ? (
                                                      <button onClick={() => handleTaskAction(selectedTask, 'start')} className="px-5 py-2 rounded-lg bg-green-600 text-white hover:bg-green-500 font-black shadow-lg shadow-green-900/15 flex items-center gap-2">
                                                          <PlayCircle className="w-4 h-4" />
                                                          Start Task
                                                      </button>
                                                  ) : (
                                                      <span className={`px-4 py-2 rounded-lg border ${t.borderCard} ${mutedPanelBg} ${t.textSub} font-black flex items-center gap-2`}>
                                                          <CheckCircle2 className="w-4 h-4" />
                                                          Completed
                                                      </span>
                                                  )}
                                              </div>
                                          </div>
                                      </>
                                  ) : (
                                      <div className={`h-full min-h-[360px] flex flex-col items-center justify-center text-center px-8 ${t.textDim}`}>
                                          <FileText className="w-16 h-16 mb-4 opacity-45" />
                                          <h3 className={`text-xl font-black ${t.textMain}`}>No task selected</h3>
                                          <p className="text-sm mt-2 max-w-[340px]">Create a task first. Its time, field and vehicle location will be stored here.</p>
                                      </div>
                                  )}
                              </section>
                          </div>
                      </div>
                  )}
              </div>
          );
      };

      if (viewMode === 'LIST' && activeField && fieldAssetTab === 'boundaries') {
          return renderBoundaryManager();
      }

      if ((viewMode === 'LIST' || viewMode === 'CREATE_TASK') && activeField && fieldAssetTab === 'tasks') {
          return renderTaskManager();
      }

      let rightContent;
      if (viewMode === 'CREATE_FIELD') {
          const draftField = {
              id: 'draft',
              name: newFieldName || 'New Field',
              boundaries: currentFieldBoundaries,
              lines: [],
              tasks: []
          };
          const hasFieldName = newFieldName.trim().length > 0;
          const boundaryCount = currentFieldBoundaries.length;
          const estimatedArea = (currentFieldBoundaries.reduce((acc, boundary) => acc + (boundary.points?.length || 0), 0) * 0.05).toFixed(1);

          rightContent = (
              <div className="flex-1 min-h-0 flex flex-col">
                  <div className={`shrink-0 px-4 lg:px-5 py-3 border-b ${t.divider} flex items-center justify-between gap-4 ${theme === 'dark' ? 'bg-slate-950/80' : 'bg-white/80'}`}>
                      <div className="flex items-center gap-3 min-w-0">
                          <button onClick={() => actions.setViewMode('LIST')} className={`shrink-0 p-2 rounded-lg border ${t.borderCard} ${t.textMain} hover:brightness-95`}>
                              <ArrowLeftRight className="w-5 h-5 rotate-180" />
                          </button>
                          <div className="min-w-0">
                              <div className={`text-[10px] font-black uppercase tracking-widest ${t.textSub}`}>Field setup</div>
                              <h3 className={`text-lg font-black ${t.textMain} truncate`}>Create new field</h3>
                              <div className={`text-[11px] ${t.textSub}`}>Name the field, then add a boundary when available.</div>
                          </div>
                      </div>
                      <div className={`shrink-0 h-9 px-3 rounded-lg border ${hasFieldName ? 'border-green-500/30 bg-green-500/10 text-green-500' : `${t.borderCard} ${t.textSub}`} flex items-center gap-2 text-[10px] font-black uppercase`}>
                          {hasFieldName ? <CheckCircle2 className="w-4 h-4" /> : <CircleDashed className="w-4 h-4" />}
                          {hasFieldName ? 'Ready to save' : 'Name required'}
                      </div>
                  </div>

                  <div className={`flex-1 min-h-0 p-3 lg:p-4 ${theme === 'dark' ? 'bg-slate-950/45' : 'bg-slate-50'} overflow-y-auto xl:overflow-hidden`}>
                      <div className="h-full min-h-0 grid grid-cols-1 xl:grid-cols-[minmax(0,1.05fr)_minmax(280px,0.95fr)] gap-3 lg:gap-4">
                          <section className="min-w-0 flex flex-col gap-3">
                              <div className={`rounded-xl border ${hasFieldName ? 'border-blue-500/40' : t.borderCard} ${softPanelBg} p-3`}>
                                  <div className="flex items-center justify-between gap-3 mb-2">
                                      <div className="flex items-center gap-3 min-w-0">
                                          <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${hasFieldName ? 'bg-blue-600 text-white' : `${mutedPanelBg} ${t.textSub} border ${t.borderCard}`}`}>1</div>
                                          <div className="min-w-0">
                                              <div className={`font-black ${t.textMain}`}>Field identity</div>
                                              <div className={`text-[11px] ${t.textSub}`}>Use a name that is easy to find later.</div>
                                          </div>
                                      </div>
                                      <span className="shrink-0 text-[9px] font-black uppercase text-blue-500">Required</span>
                                  </div>
                                  <label className={`block text-[9px] font-black uppercase tracking-wider mb-1 ${t.textSub}`}>Field name</label>
                                  <div className="relative">
                                      <MapIcon className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${hasFieldName ? 'text-blue-500' : t.textDim}`} />
                                      <input
                                          type="text"
                                          value={newFieldName}
                                          onChange={e => actions.setNewFieldName(e.target.value)}
                                          placeholder="e.g. South Farm 02"
                                          className={`w-full h-11 pl-11 pr-11 rounded-xl border ${hasFieldName ? 'border-blue-500' : t.borderCard} ${t.bgInput} ${t.textMain} font-bold focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 outline-none`}
                                          autoFocus
                                      />
                                      {hasFieldName && <CheckCircle2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />}
                                  </div>
                              </div>

                              <div className={`rounded-xl border ${boundaryCount > 0 ? 'border-orange-500/40' : t.borderCard} ${softPanelBg} p-3`}>
                                  <div className="flex items-center justify-between gap-3">
                                      <div className="flex items-center gap-3 min-w-0">
                                          <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${boundaryCount > 0 ? 'bg-orange-500 text-white' : `${mutedPanelBg} ${t.textSub} border ${t.borderCard}`}`}>2</div>
                                          <div className="min-w-0">
                                              <div className={`font-black ${t.textMain}`}>Field boundary</div>
                                              <div className={`text-[11px] ${t.textSub}`}>{boundaryCount > 0 ? `${boundaryCount} loop saved / ${estimatedArea} ha estimated` : 'You can add this now or later.'}</div>
                                          </div>
                                      </div>
                                      <span className={`shrink-0 text-[9px] font-black uppercase ${boundaryCount > 0 ? 'text-orange-500' : t.textSub}`}>{boundaryCount > 0 ? 'Captured' : 'Optional'}</span>
                                  </div>
                                  <button
                                      type="button"
                                      onClick={startBoundaryCreation}
                                      className={`mt-2 w-full min-h-12 px-3 rounded-xl border flex items-center justify-between gap-3 text-left transition-all ${boundaryCount > 0 ? 'border-orange-500/35 bg-orange-500/10 hover:bg-orange-500/15' : `${t.borderCard} ${mutedPanelBg} hover:border-blue-400 hover:bg-blue-500/5`}`}
                                  >
                                      <div className="min-w-0 flex items-center gap-3">
                                          <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${boundaryCount > 0 ? 'bg-orange-500 text-white' : 'bg-blue-500/10 text-blue-500'}`}>
                                              <MapPin className="w-5 h-5" />
                                          </div>
                                          <div className="min-w-0">
                                              <div className={`text-sm font-black ${t.textMain}`}>{boundaryCount > 0 ? 'Record another boundary' : 'Record boundary'}</div>
                                              <div className={`text-[10px] ${t.textSub}`}>Drive the perimeter to capture the field edge</div>
                                          </div>
                                      </div>
                                      <ArrowLeftRight className={`shrink-0 w-4 h-4 ${t.textDim}`} />
                                  </button>
                              </div>

                              <div className={`rounded-xl border ${hasFieldName ? 'border-green-500/30 bg-green-500/5' : t.borderCard} ${!hasFieldName ? softPanelBg : ''} p-3 flex items-center gap-3`}>
                                  <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-black ${hasFieldName ? 'bg-green-600 text-white' : `${mutedPanelBg} ${t.textSub} border ${t.borderCard}`}`}>3</div>
                                  <div className="min-w-0 flex-1">
                                      <div className={`font-black ${t.textMain}`}>Review and save</div>
                                      <div className={`text-[11px] ${t.textSub}`}>{hasFieldName ? `${newFieldName.trim()} is ready for the field library.` : 'Enter a field name to continue.'}</div>
                                  </div>
                                  {hasFieldName && <CheckCircle2 className="shrink-0 w-5 h-5 text-green-500" />}
                              </div>
                          </section>

                          <section className={`min-w-0 min-h-[300px] rounded-xl border ${t.borderCard} ${softPanelBg} p-3 flex flex-col`}>
                              <div className="shrink-0 px-1 pb-3 flex items-center justify-between gap-3">
                                  <div className="min-w-0">
                                      <div className={`text-[9px] font-black uppercase tracking-wider ${t.textSub}`}>Live preview</div>
                                      <div className={`font-black truncate ${t.textMain}`}>{newFieldName.trim() || 'Untitled field'}</div>
                                  </div>
                                  <span className={`shrink-0 px-2 py-1 rounded-md text-[9px] font-black uppercase ${boundaryCount > 0 ? 'bg-orange-500/15 text-orange-500' : `${mutedPanelBg} ${t.textSub}`}`}>
                                      {boundaryCount > 0 ? `${boundaryCount} boundary` : 'No boundary'}
                                  </span>
                              </div>
                              <div className="flex-1 min-h-[220px]">
                                  <MiniFieldPreview field={draftField} draftBoundaries={currentFieldBoundaries} compact />
                              </div>
                              <div className="shrink-0 pt-3 grid grid-cols-3 gap-2">
                                  {[
                                      ['Area', boundaryCount > 0 ? `${estimatedArea} ha` : '--'],
                                      ['Boundaries', boundaryCount],
                                      ['Status', hasFieldName ? 'Ready' : 'Draft']
                                  ].map(([label, value]) => (
                                      <div key={label} className={`min-w-0 rounded-lg border ${t.borderCard} ${mutedPanelBg} p-2 text-center`}>
                                          <div className={`text-xs font-black truncate ${label === 'Status' && hasFieldName ? 'text-green-500' : t.textMain}`}>{value}</div>
                                          <div className={`mt-0.5 text-[8px] font-black uppercase ${t.textSub}`}>{label}</div>
                                      </div>
                                  ))}
                              </div>
                          </section>
                      </div>
                  </div>

                  <div className={`shrink-0 px-4 lg:px-5 py-3 border-t ${t.divider} ${theme === 'dark' ? 'bg-slate-950/85' : 'bg-white/90'} flex items-center justify-between gap-3`}>
                      <div className={`hidden sm:flex items-center gap-2 text-[10px] ${t.textSub}`}>
                          <CheckCircle2 className={`w-4 h-4 ${hasFieldName ? 'text-green-500' : t.textDim}`} />
                          Boundary is optional and can be added later.
                      </div>
                      <div className="ml-auto flex items-center gap-2">
                          <button onClick={() => actions.setViewMode('LIST')} className={`h-10 px-4 rounded-lg border ${t.borderCard} ${t.textMain} text-xs font-black hover:brightness-95`}>Cancel</button>
                          <button
                              onClick={saveNewField}
                              disabled={!hasFieldName}
                              className={`h-10 px-5 rounded-lg text-xs font-black flex items-center gap-2 transition-all ${hasFieldName ? 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/20' : `${mutedPanelBg} ${t.textDim} border ${t.borderCard} cursor-not-allowed`}`}
                          >
                              <Save className="w-4 h-4" />
                              Save field
                          </button>
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
                      <button onClick={() => setFieldManagerOpen(false)} className="hidden">
                          <X className="w-5 h-5" />
                      </button>
                  </div>

                  <div className="flex-1 min-h-0 overflow-y-auto p-5 lg:p-6 pb-28">
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
          const lines = (activeField.lines || []).filter(line => !line.archived);
          const tasks = activeField.tasks || [];
          const activeBoundary = boundaries[Math.min(Math.max(activeBoundaryIdx || 0, 0), Math.max(boundaries.length - 1, 0))] || null;
          const activeLine = lines.find(line => line.id === activeLineId) || lines[0] || null;
          const activeTask = tasks.find(task => task.id === activeTaskId) || tasks.find(task => task.status !== 'Done') || tasks[0] || null;
          const implementLabel = cleanProfileLabel(implementSettings.name, activeImplementProfile.label);
          const fieldArea = activeField.area || '--';
          const fieldSetupReady = Boolean(activeBoundary || activeLine);

          const openImplementSetup = () => {
              setFieldQuickView(null);
              setFieldManagerOpen(false);
              setSettingsTab('implement');
              setSettingsOpen(true);
          };

          const OverviewSetupButton = ({ id, icon: Icon, label, value, detail, status, onClick, disabled = false }) => {
              const selected = fieldQuickView === id;
              return (
                  <button
                      type="button"
                      onClick={onClick}
                      disabled={disabled}
                      aria-label={`${label}: ${value}. ${detail}. ${status}`}
                      className={`w-full min-w-0 min-h-[96px] rounded-xl border text-left overflow-hidden transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
                          selected
                              ? 'border-blue-500 bg-blue-500/5 shadow-sm'
                              : `${t.borderCard} ${softPanelBg} hover:border-blue-400 hover:bg-blue-500/5`
                      }`}
                  >
                      <div className={`h-9 px-3 flex items-center justify-between gap-2 border-b ${selected ? 'border-blue-500/30 bg-blue-500/10' : t.divider}`}>
                          <div className="min-w-0 flex items-center gap-2">
                              <Icon className={`w-4 h-4 shrink-0 ${selected ? 'text-blue-500' : t.textSub}`} />
                              <span className={`text-[11px] font-black uppercase tracking-wider truncate ${selected ? 'text-blue-600' : t.textSub}`}>{label}</span>
                          </div>
                          <div className="shrink-0 flex items-center gap-2" title={status}>
                              <span className={`w-2 h-2 rounded-full ${status === 'Ready' || status === 'Active' ? 'bg-green-500' : status === 'No data' ? 'bg-slate-300' : 'bg-blue-400'}`} />
                              <ArrowLeftRight className={`w-4 h-4 ${selected ? 'text-blue-500' : t.textDim}`} />
                          </div>
                      </div>
                      <div className="px-3 py-2.5 flex items-center gap-3">
                          <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${selected ? 'bg-blue-600 text-white' : theme === 'dark' ? 'bg-slate-800 text-blue-300' : 'bg-blue-50 text-blue-600'}`}>
                              <Icon className="w-5 h-5" />
                          </div>
                          <div className="min-w-0 flex-1">
                              <div className={`font-black leading-tight truncate ${t.textMain}`}>{value}</div>
                              <div className={`mt-1 text-[11px] leading-tight truncate ${t.textSub}`}>{detail}</div>
                          </div>
                      </div>
                  </button>
              );
          };

          rightContent = (
              <div className="flex-1 min-h-0 flex flex-col">
                  <div className="shrink-0 px-4 lg:px-5 py-3 bg-gradient-to-r from-blue-700 to-blue-500 text-white flex items-center justify-between gap-4">
                      <div className="min-w-0 flex items-center gap-3">
                          <div className="shrink-0 w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center">
                              <MapIcon className="w-5 h-5 text-white" />
                          </div>
                          <div className="min-w-0">
                              <div className="text-[9px] font-black uppercase tracking-[0.18em] text-blue-100">Field overview</div>
                              <div className="flex items-center gap-2 min-w-0">
                                  <h3 className="text-lg font-black truncate">{activeField.name}</h3>
                                  {isLoadedActiveField && <span className="shrink-0 px-2 py-1 rounded-md bg-white/15 text-white text-[9px] font-black uppercase">Loaded</span>}
                              </div>
                              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-blue-100">
                                  <span>{fieldArea}</span>
                                  <span className="text-blue-200">/</span>
                                  <span>Last used {activeField.lastUsed || '--'}</span>
                              </div>
                          </div>
                      </div>
                      <div className="shrink-0 flex items-center gap-2">
                          <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase ${fieldSetupReady ? 'bg-green-500 text-white' : 'bg-white/15 text-white'}`}>
                              {fieldSetupReady ? 'Setup ready' : 'Needs setup'}
                          </span>
                      </div>
                  </div>

                  <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(250px,0.86fr)_minmax(340px,1.14fr)] overflow-hidden">
                      <section className={`min-w-0 min-h-0 p-4 border-r ${t.border} ${theme === 'dark' ? 'bg-slate-950/55' : 'bg-slate-50'} flex flex-col`}>
                          <div className="flex items-center justify-between gap-3 mb-3">
                              <div className="flex items-center gap-2 min-w-0">
                                  <MapIcon className="w-4 h-4 text-blue-500 shrink-0" />
                                  <span className={`text-[11px] font-black uppercase tracking-wider ${t.textSub}`}>Field map</span>
                              </div>
                              <span className={`text-[10px] font-black ${t.textSub}`}>{boundaries.length} boundary</span>
                          </div>
                          <div className="min-h-[180px] flex-1">
                                  <MiniFieldPreview field={activeField} compact />
                          </div>
                          <div className={`mt-3 rounded-xl border ${t.borderCard} ${softPanelBg} p-3`}>
                              <div className="flex items-end justify-between gap-3">
                                  <div>
                                      <div className={`text-[10px] font-black uppercase tracking-wider ${t.textSub}`}>Total area</div>
                                      <div className={`mt-1 text-3xl font-black leading-none ${t.textMain}`}>{fieldArea}</div>
                                  </div>
                                  <div className={`text-right text-[11px] ${t.textSub}`}>
                                      <div>Last used</div>
                                      <div className={`font-black ${t.textMain}`}>{activeField.lastUsed || '--'}</div>
                                  </div>
                              </div>
                              <div className="mt-3 grid grid-cols-3 gap-2">
                                  {[
                                      ['Bounds', boundaries.length],
                                      ['Lines', lines.length],
                                      ['Tasks', tasks.length]
                                  ].map(([label, value]) => (
                                      <div key={label} className={`rounded-lg border ${t.borderCard} ${mutedPanelBg} px-2 py-2.5 text-center`}>
                                          <div className={`text-lg font-black leading-none ${t.textMain}`}>{value}</div>
                                          <div className={`mt-1 text-[9px] font-black uppercase ${t.textSub}`}>{label}</div>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      </section>

                      <section className={`min-w-0 min-h-0 overflow-y-auto p-3 ${panelBg}`}>
                          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                              <OverviewSetupButton
                                  id="boundaries"
                                  icon={MapPin}
                                  label="Boundary"
                                  value={activeBoundary?.name || 'No boundary'}
                                  detail={activeBoundary ? `${getBoundaryPoints(activeBoundary).length} recorded points` : 'Record the field edge'}
                                  status={activeBoundary ? 'Ready' : 'No data'}
                                  onClick={() => setFieldQuickView('boundaries')}
                              />
                              <OverviewSetupButton
                                  id="lines"
                                  icon={Route}
                                  label="Guidance line"
                                  value={activeLine?.name || 'No guidance line'}
                                  detail={activeLine ? (activeLine.type || 'LINE').replaceAll('_', ' ') : 'Create or load a saved line'}
                                  status={activeLineId === activeLine?.id ? 'Active' : activeLine ? 'Saved' : 'No data'}
                                  onClick={() => setFieldQuickView('lines')}
                              />
                          </div>

                          <div className="mt-2">
                              <OverviewSetupButton
                                  id="tasks"
                                  icon={activeTask ? getTaskIcon(activeTask) : FileText}
                                  label="Task"
                                  value={activeTask?.name || 'No task selected'}
                                  detail={activeTask ? `${activeTask.type || 'Field work'} / ${activeTask.status || 'Pending'}` : 'Create a job for this field'}
                                  status={activeTaskId === activeTask?.id ? 'Active' : activeTask ? activeTask.status : 'No data'}
                                  onClick={() => setFieldQuickView('tasks')}
                              />
                          </div>

                          <section className={`mt-2 rounded-xl border ${t.borderCard} ${softPanelBg} overflow-hidden`}>
                              <button
                                  type="button"
                                  onClick={openImplementSetup}
                                  aria-label={`Implement setup: ${implementLabel}`}
                                  className={`w-full h-11 px-3 border-b ${t.divider} flex items-center justify-between gap-3 text-left hover:bg-blue-500/5 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500`}
                              >
                                  <div className="min-w-0 flex items-center gap-2">
                                      <Ruler className="w-4 h-4 text-blue-500 shrink-0" />
                                      <span className={`text-[11px] font-black uppercase tracking-wider ${t.textSub}`}>Implement</span>
                                      <span className={`font-black truncate ${t.textMain}`}>{implementLabel}</span>
                                  </div>
                                  <ArrowLeftRight className={`w-4 h-4 shrink-0 ${t.textDim}`} />
                              </button>
                              <div className="p-3 grid grid-cols-[80px_minmax(0,1fr)] gap-3 items-center">
                                  <div className={`h-[84px] rounded-xl border ${t.borderCard} ${theme === 'dark' ? 'bg-blue-500/10' : 'bg-gradient-to-b from-blue-50 to-slate-100'} flex flex-col items-center justify-center text-blue-600`}>
                                      <Tractor className="w-8 h-8" />
                                      <span className="mt-1.5 text-[8px] font-black uppercase">{implementSettings.type || 'Implement'}</span>
                                  </div>
                                  <div className="min-w-0">
                                      <div className="grid grid-cols-2 gap-2">
                                          {[
                                              ['Working width', `${Number(implementSettings.width || 0).toFixed(3)} m`],
                                              ['Skip / overlap', `${Number(implementSettings.overlap || 0).toFixed(3)} m`]
                                          ].map(([label, value]) => (
                                              <div key={label} className="min-w-0">
                                                  <div className={`mb-1 text-[9px] font-bold truncate ${t.textSub}`}>{label}</div>
                                                  <div className={`h-9 rounded-lg border ${t.borderCard} ${mutedPanelBg} px-2 flex items-center`}>
                                                      <span className={`font-mono text-sm font-black truncate ${t.textMain}`}>{value}</span>
                                                  </div>
                                              </div>
                                          ))}
                                      </div>
                                      <div className={`mt-2 flex items-center gap-2 text-[9px] font-bold ${t.textSub}`}>
                                          <span>{implementSettings.sections || 1} sections</span>
                                          <span className={t.textDim}>/</span>
                                          <span className="truncate">{implementSettings.controlMode || 'Manual control'}</span>
                                      </div>
                                  </div>
                              </div>
                          </section>
                      </section>
                  </div>

                  <div className={`px-5 py-3 border-t ${t.divider} flex flex-wrap items-center justify-between gap-3 ${theme === 'dark' ? 'bg-slate-950/80' : 'bg-white/80'}`}>
                      <button onClick={handleDeleteField} className="px-4 py-2.5 rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/10 font-bold flex items-center gap-2">
                          <Trash2 className="w-4 h-4" />
                          Delete Field
                      </button>
                      <div className="flex flex-wrap items-center gap-3">
                          <button onClick={() => showNotification('Field sync queued', 'info')} className={`px-4 py-2.5 rounded-lg border ${t.borderCard} ${t.textMain} hover:brightness-95 font-bold flex items-center gap-2`}>
                              <Globe className="w-4 h-4 text-blue-500" />
                              Sync
                          </button>
                          <button onClick={handleLoadField} className="px-6 py-2.5 rounded-lg bg-green-600 text-white font-black hover:bg-green-500 shadow-lg shadow-green-900/20 flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4" />
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
          <div className={`relative w-full h-full flex flex-col ${panelBg}`}>
              <div className={`flex items-center justify-between gap-4 px-5 py-4 border-b ${t.divider} ${theme === 'dark' ? 'bg-slate-950/90' : 'bg-white/90'}`}>
                  <div className="min-w-0 flex items-center gap-3">
                      <div className={`shrink-0 w-10 h-10 rounded-xl border ${t.borderCard} ${softPanelBg} flex items-center justify-center`}>
                          <FolderOpen className="w-5 h-5 text-blue-500" />
                      </div>
                      <div className="min-w-0">
                          <h2 className={`text-lg font-black ${t.textMain}`}>Field Library</h2>
                          <div className={`text-xs ${t.textSub} truncate`}>{fields.length} saved fields / {loadedField ? `${loadedField.name} loaded` : 'No field loaded'}</div>
                      </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                      <ManagerNewButton entity="Field" onClick={startFieldCreation} />
                      <ManagerCloseButton
                          label="field library"
                          onClick={() => {
                              setFieldQuickView(null);
                              setFieldManagerOpen(false);
                          }}
                      />
                  </div>
              </div>

              <div className="flex-1 min-h-0 flex overflow-hidden">
                      <aside className={`w-[25%] min-w-[228px] max-w-[286px] border-r ${t.border} ${panelBg} flex flex-col min-h-0`}>
                          <div className={`shrink-0 px-4 py-3 border-b ${t.divider}`}>
                              <div className="flex items-center justify-between gap-3">
                                  <div className="min-w-0">
                                      <div className={`text-[9px] font-black uppercase tracking-wider ${t.textSub}`}>Library</div>
                                      <div className={`text-base font-black ${t.textMain}`}>Fields</div>
                                  </div>
                              </div>
                              <div className={`mt-3 h-10 rounded-lg border flex items-center px-2 ${theme === 'dark' ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-200'}`}>
                                  {[
                                      ['Fields', fields.length],
                                      ['Loaded', loadedField ? 1 : 0],
                                      ['Lines', fields.reduce((total, f) => total + (f.lines || []).filter(line => !line.archived).length, 0)]
                                  ].map(([label, value], index) => (
                                      <div key={label} className={`min-w-0 flex-1 flex items-center justify-center gap-1.5 ${index > 0 ? `${theme === 'dark' ? 'border-l border-blue-500/20' : 'border-l border-blue-200'}` : ''}`}>
                                          <span className={`text-sm font-black leading-none ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}>{value}</span>
                                          <span className={`text-[8px] font-black uppercase truncate ${theme === 'dark' ? 'text-blue-200/70' : 'text-blue-700/70'}`}>{label}</span>
                                      </div>
                                  ))}
                              </div>
                          </div>

                          <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
                              {fields.map(f => {
                                  const selected = selectedFieldId === f.id;
                                  const loaded = loadedField?.id === f.id;
                                  const fieldBoundaries = f.boundaries || [];
                                  const fieldLines = (f.lines || []).filter(line => !line.archived);
                                  const fieldTasks = f.tasks || [];
                                  return (
                                      <button
                                          key={f.id}
                                          onClick={() => { setFieldQuickView(null); setFieldAssetTab('lines'); actions.setSelectedFieldId(f.id); actions.setViewMode('LIST'); }}
                                          title={f.name}
                                          className={`relative w-full text-left p-3 rounded-lg border transition-all ${selected ? `${t.selectedItem} shadow-sm` : `${softPanelBg} ${t.borderCard} hover:brightness-95`}`}
                                      >
                                          {selected && <span className="absolute left-0 top-3 bottom-3 w-1 rounded-r bg-blue-600" />}
                                          <div className="flex items-start justify-between gap-3">
                                              <div className="min-w-0 flex items-center gap-3">
                                                  <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${selected ? 'bg-blue-600 text-white' : `${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'} ${t.textSub}`}`}>
                                                      <MapIcon className="w-4 h-4" />
                                                  </div>
                                                  <div className="min-w-0">
                                                      <div
                                                          className={`font-black ${t.textMain} leading-tight`}
                                                          style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                                                      >
                                                          {f.name}
                                                      </div>
                                                      <div className={`mt-0.5 text-xs ${t.textSub}`}>{f.area || '--'} / {f.lastUsed || '--'}</div>
                                                  </div>
                                              </div>
                                              {loaded ? <CheckCircle2 className="shrink-0 w-5 h-5 text-green-500" /> : selected ? <Check className="shrink-0 w-5 h-5 text-blue-500" /> : null}
                                          </div>
                                          <div className="mt-2.5 flex items-center gap-1.5 min-w-0">
                                              {[
                                                  ['B', fieldBoundaries.length],
                                                  ['L', fieldLines.length],
                                                  ['T', fieldTasks.length]
                                              ].map(([label, value]) => (
                                                  <span key={label} className={`min-w-0 flex-1 rounded-md ${mutedPanelBg} border ${t.borderCard} px-1.5 py-1 text-center`}>
                                                      <span className={`text-xs font-black ${t.textMain}`}>{value}</span>
                                                      <span className={`ml-1 text-[8px] uppercase font-black ${t.textSub}`}>{label}</span>
                                                  </span>
                                              ))}
                                          </div>
                                      </button>
                                  );
                              })}
                          </div>
                      </aside>
                      <div className={`flex-1 min-w-0 min-h-0 p-4 lg:p-5 overflow-hidden ${theme === 'dark' ? 'bg-slate-950' : 'bg-gray-50'}`}>
                      <section className={`${softPanelBg} border ${t.borderCard} rounded-xl flex flex-col min-h-0 h-full overflow-hidden`}>
                          {rightContent}
                      </section>
                      </div>
              </div>
              {renderFieldQuickView()}
          </div>
      );
  };

  return (
    <div className="w-full h-screen bg-neutral-900 flex items-center justify-center p-4 overflow-hidden">
        <div className={`relative ${t.deviceFrame} shadow-2xl flex border-[12px] rounded-2xl ring-4 ring-black/50 transition-colors duration-500`} style={{ width: '100%', maxWidth: '1280px', height: 'min(800px, calc(100vh - 32px))', maxHeight: '100%', overflow: 'clip' }}>
            {/* LEFT RAIL */}
            <aside className={`w-[8.5%] min-w-[82px] flex-shrink-0 ${t.bgPanel} border-r ${t.border} flex flex-col items-center overflow-hidden z-30 shadow-2xl`}>
                <div className="relative h-[88px] w-full flex flex-shrink-0 items-center justify-center">
                    <div className="flex h-11 w-11 xl:h-12 xl:w-12 items-center justify-center">
                        <div
                            role="img"
                            aria-label="Customer G logo"
                            className={`h-12 w-12 xl:h-[50px] xl:w-[50px] max-w-none ${theme === 'dark' ? 'bg-[#d4af69]' : 'bg-[#946a32]'}`}
                            style={{
                                WebkitMaskImage: 'url("./src/assets/customer-g-logo-clean.png")',
                                maskImage: 'url("./src/assets/customer-g-logo-clean.png")',
                                WebkitMaskRepeat: 'no-repeat',
                                maskRepeat: 'no-repeat',
                                WebkitMaskPosition: 'center',
                                maskPosition: 'center',
                                WebkitMaskSize: '100%',
                                maskSize: '100%'
                            }}
                        />
                    </div>
                    <div className={`absolute bottom-0 left-1/2 h-px w-1/2 -translate-x-1/2 ${t.divider}`} />
                </div>
                <nav className="flex-1 min-h-0 w-full flex flex-col items-center gap-1.5 overflow-y-auto overflow-x-hidden pt-2 [scrollbar-width:none]">
                    <RailButton theme={t} icon={MapIcon} label="Run" active={!settingsOpen && !fieldManagerOpen && !linesPanelOpen} onClick={openRunScreen} />
                    <div className={`h-px w-1/2 ${t.divider}`}></div>
                    <RailButton theme={t} icon={LayoutGrid} label="Field" active={fieldManagerOpen && fieldAssetTab === 'lines'} onClick={() => openFieldAssetPanel('lines')} />
                    <div className={`h-px w-1/2 ${t.divider}`}></div>
                    <RailButton
                        theme={t}
                        icon={Route}
                        label="Lines"
                        active={linesPanelOpen}
                        onClick={openLinesCatalog}
                    />
                    <div className={`h-px w-1/2 ${t.divider}`}></div>
                    <RailButton
                        theme={t}
                        icon={MapPin}
                        label="Bound"
                        active={fieldManagerOpen && fieldAssetTab === 'boundaries'}
                        onClick={() => openFieldAssetPanel('boundaries')}
                    />
                    <div className={`h-px w-1/2 ${t.divider}`}></div>
                    <RailButton
                        theme={t}
                        icon={FileText}
                        label="Tasks"
                        active={fieldManagerOpen && fieldAssetTab === 'tasks'}
                        onClick={() => openFieldAssetPanel('tasks')}
                    />
                    <div className={`h-px w-1/2 ${t.divider}`}></div>
                    <RailButton theme={t} icon={Settings} label="System" active={settingsOpen && settingsTab !== 'wifi'} onClick={openSystemPanel} />
                </nav>
                <div className="mb-1 flex w-full shrink-0 flex-col items-center">
                    <div className={`h-px w-1/2 ${t.divider}`} />
                    <button
                        type="button"
                        onClick={openWifiPanel}
                        className={`group relative flex w-full flex-col items-center gap-1 rounded-lg py-[10%] text-center transition-all duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 ${
                            settingsOpen && settingsTab === 'wifi'
                                ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20'
                                : wifiConnectionAttempt.status === 'connecting'
                                    ? `${theme === 'dark' ? 'bg-amber-500/10 text-amber-400' : 'bg-amber-50 text-amber-600'}`
                                    : wifiConnectionAttempt.status === 'failed'
                                        ? `${theme === 'dark' ? 'bg-red-500/10 text-red-400' : 'bg-red-50 text-red-600'}`
                                        : `${t.textDim} ${theme === 'dark' ? 'bg-transparent hover:bg-slate-800/45' : 'bg-transparent hover:bg-slate-100/70'}`
                        }`}
                        title="WiFi / Network"
                        aria-label={
                            wifiConnectionAttempt.status === 'connecting'
                                ? `Open WiFi settings, connecting to ${wifiConnectionAttempt.ssid}`
                                : wifiConnectionAttempt.status === 'failed'
                                    ? `Open WiFi settings, connection to ${wifiConnectionAttempt.ssid} failed`
                                    : 'Open WiFi and network settings'
                        }
                    >
                        <span className="relative flex h-5 w-5 items-center justify-center lg:h-6 lg:w-6">
                            <span className={`flex h-full w-full items-center justify-center ${
                            settingsOpen && settingsTab === 'wifi'
                                ? 'text-white'
                                : wifiConnectionAttempt.status === 'connecting'
                                    ? 'text-amber-500'
                                    : wifiConnectionAttempt.status === 'failed' ? 'text-red-500' : 'group-hover:text-blue-500'
                            }`}>
                            {wifiConnectionAttempt.status === 'connecting'
                                ? <span className="h-5 w-5 rounded-full border-2 border-current border-r-transparent animate-spin" aria-hidden="true" />
                                : wifiConnectionAttempt.status === 'failed'
                                    ? <AlertCircle className="h-5 w-5" />
                                    : <WifiGlyph className="h-full w-full" />}
                            </span>
                            <span className={`absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 ${
                                settingsOpen && settingsTab === 'wifi'
                                    ? 'border-blue-600'
                                    : theme === 'dark' ? 'border-slate-950' : 'border-white'
                            } ${
                                wifiConnectionAttempt.status === 'connecting'
                                    ? 'animate-pulse bg-amber-300'
                                    : wifiConnectionAttempt.status === 'failed'
                                        ? 'bg-red-400'
                                    : wifiSettings?.status === 'Connected' ? 'bg-emerald-400' : 'bg-slate-400'
                            }`} />
                        </span>
                        <span className={`text-[9px] font-semibold lg:text-[10px] ${
                            settingsOpen && settingsTab === 'wifi' ? 'text-white' : t.textMain
                        }`}>Wi-Fi</span>
                    </button>
                    <div className={`h-px w-1/2 ${t.divider}`} />
                    <div
                        role="status"
                        title="Local time"
                        aria-label={`Local time ${currentTime}`}
                        className={`flex w-full flex-col items-center gap-1 rounded-lg py-[10%] ${t.textDim}`}
                    >
                        <Clock className="h-5 w-5 lg:h-6 lg:w-6" aria-hidden="true" />
                        <time
                            dateTime={currentTime}
                            className={`text-[11px] font-semibold leading-none tabular-nums lg:text-xs ${t.textMain}`}
                            aria-label={`Current time ${currentTime}`}
                        >
                            {currentTime}
                        </time>
                    </div>
                </div>
            </aside>

            {/* MAIN AREA */}
            <main className={`flex-1 relative flex flex-col ${t.textMain} font-sans select-none`}>
                {/* 2B) MAP CANVAS */}
                <div ref={mapCanvasRef} data-map-canvas className={`absolute inset-x-0 top-[88px] bottom-[88px] ${t.bgMain} z-0 overflow-hidden transition-colors duration-500`}
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
                            {/* RENDER SAVED BOUNDARIES (LOADED FIELD & NEW FIELD CREATION) */}
                            {!isMap3D && <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none" shapeRendering="geometricPrecision">
                                <g style={{ transform: 'translate(50%, 60%)' }}>
                                    {isRecordingBoundary && tempBoundary.length > 0 && (
                                        <g data-boundary-recording-2d="live-path">
                                            <polyline
                                                points={[...tempBoundary, worldPos].map(point => `${point.x},${point.y}`).join(' ')}
                                                fill="none"
                                                stroke={theme === 'dark' ? '#0f172a' : '#ffffff'}
                                                strokeWidth={liveBoundaryUnderlayWidth}
                                                strokeOpacity={liveBoundaryUnderlayOpacity}
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                vectorEffect="non-scaling-stroke"
                                            />
                                            <polyline
                                                points={[...tempBoundary, worldPos].map(point => `${point.x},${point.y}`).join(' ')}
                                                fill="none"
                                                stroke={liveBoundaryStroke}
                                                strokeWidth={liveBoundaryStrokeWidth}
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                vectorEffect="non-scaling-stroke"
                                            />
                                            <circle
                                                cx={tempBoundary[0].x}
                                                cy={tempBoundary[0].y}
                                                r="11"
                                                fill={theme === 'dark' ? '#0f172a' : '#ffffff'}
                                                fillOpacity="0.9"
                                            />
                                            <circle
                                                cx={tempBoundary[0].x}
                                                cy={tempBoundary[0].y}
                                                r="8"
                                                fill={liveBoundaryStroke}
                                                stroke="white"
                                                strokeWidth="2"
                                                vectorEffect="non-scaling-stroke"
                                            />
                                            <text
                                                x={tempBoundary[0].x}
                                                y={tempBoundary[0].y + 3.5}
                                                textAnchor="middle"
                                                fontSize="9"
                                                fontWeight="900"
                                                fill="white"
                                            >
                                                S
                                            </text>
                                        </g>
                                    )}
                                    {(loadedField?.boundaries || []).concat(viewMode === 'CREATE_FIELD' ? currentFieldBoundaries : []).map((bound, bIdx) => (
                                        <polygon
                                            key={bIdx}
                                            data-boundary-2d={bIdx}
                                            points={(bound.points || bound).map(p => `${p.x},${p.y}`).join(' ')}
                                            fill="none"
                                            stroke={bIdx === activeBoundaryIdx ? "#eab308" : "#64748b"}
                                            strokeWidth={bIdx === activeBoundaryIdx ? 2.8 : 2}
                                            strokeOpacity={bIdx === activeBoundaryIdx ? 0.9 : 0.55}
                                            strokeDasharray="5,5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            vectorEffect="non-scaling-stroke"
                                        />
                                    ))}
                                    {previewBoundary && (
                                        <polygon
                                            data-boundary-preview-2d="true"
                                            points={previewBoundary.map(p => `${p.x},${p.y}`).join(' ')}
                                            fill="none"
                                            stroke="#22c55e"
                                            strokeWidth="3"
                                            strokeOpacity="0.9"
                                            strokeDasharray="5,5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            vectorEffect="non-scaling-stroke"
                                        />
                                    )}
                                </g>
                            </svg>}


                            {renderCoverage2D()}

                            {/* DYNAMIC DRAWING LAYER (RED LINES) & GUIDANCE LINES (BLUE) */}
                            <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none">
                                <g style={{ transform: 'translate(50%, 60%)' }}>
                                    {!isMap3D && !guidanceLine && !activeLineRecord && pointA && straightABPreviewEnd && lineType === 'STRAIGHT_AB' && <line x1={pointA.x} y1={pointA.y} x2={straightABPreviewEnd.x} y2={straightABPreviewEnd.y} stroke="red" strokeWidth="3" />}
                                    {!isMap3D && isRecordingCurve && <polyline points={curvePoints.map(p => `${p.x},${p.y}`).join(' ') + ` ${worldPos.x},${worldPos.y}`} fill="none" stroke="red" strokeWidth="3" />}
                                    {!isMap3D && !guidanceLine && pivotCenter && lineType === 'PIVOT' && <line x1={pivotCenter.x} y1={pivotCenter.y} x2={worldPos.x} y2={worldPos.y} stroke="red" strokeWidth="3" />}
                                    {renderGuidanceLine()}
                                    {renderUTurnPath2D()}
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
                        data-vehicle-scale={vehicleScreenScale.toFixed(4)}
                        data-implement-width-m={Number(implementSettings.width || 0).toFixed(3)}
                        data-vehicle-width-m={Math.max(Number(vehicleSettings.frontAxleWidth) || 0, Number(vehicleSettings.rearAxleWidth) || 0).toFixed(3)}
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
                            className={`absolute bottom-32 right-[118px] xl:right-[128px] p-2 ${t.bgCard} backdrop-blur border ${t.borderCard} rounded-lg ${t.textMain} shadow-lg flex items-center gap-2 z-20`}
                        >
                            <Crosshair className="w-6 h-6 text-blue-500" />
                            <span className="text-xs font-bold hidden xl:inline">Re-center</span>
                        </button>
                    )}

                    {renderCompassWidget()}
                    {renderCriticalAlarmBanner()}
                </div>

                {/* ... rest of the app ... */}
                <header data-top-bar className={`relative h-[88px] min-h-[88px] ${t.bgHeader} backdrop-blur-md flex items-center justify-between gap-3 px-3 xl:px-[3%] z-20 border-b ${t.border}`}>
                    <div className="relative z-20 min-w-0 max-w-[34%] flex items-center gap-3">
                        <div className={`shrink-0 w-10 h-10 rounded-xl border ${t.borderCard} ${theme === 'dark' ? 'bg-slate-900' : 'bg-gray-100'} flex items-center justify-center`}>
                            <MapIcon className="w-5 h-5 text-blue-500" />
                        </div>
                        <div className="min-w-0">
                            <div className={`flex items-center gap-1.5 text-[10px] ${t.textSub} uppercase tracking-[0.06em] font-bold leading-none`}>
                                <Layers className="w-3 h-3 shrink-0" />
                                <span className="truncate">Run / {activeTaskRecord?.name || 'No Task'} / {Number(implementSettings.width || 0).toFixed(1)} m</span>
                            </div>
                            <div className="mt-1 min-w-0 flex items-center gap-1.5 text-sm leading-none">
                                <span className={`${t.textMain} font-bold truncate`}>{activeFieldRecord?.name || 'No Field Loaded'}</span>
                                <span className={`${t.textDim} shrink-0 font-medium`}>/</span>
                                <span className="text-blue-500 font-bold truncate">{activeLineRecord?.name || getGuidanceModeLabel()}</span>
                            </div>
                        </div>
                    </div>
                    <div className="absolute left-1/2 top-0 z-10 h-full w-[480px] max-w-[46%] -translate-x-1/2">
                        {renderGuidanceLightbar()}
                    </div>
                    <div className="relative z-20 min-w-0 ml-auto">
                        {renderRunSafetyCluster()}
                    </div>
                </header>

                {renderRtkQualityPanel()}
                {renderUTurnQuickPanel()}
                {renderEventHistoryDrawer()}
                {renderProductivityPanel()}

                {/* BOTTOM BAR */}
                <div data-bottom-bar className={`absolute bottom-0 left-0 right-0 h-[88px] min-h-[88px] ${t.bgBottom} backdrop-blur-xl border-t ${t.border} grid grid-cols-[minmax(170px,1fr)_minmax(300px,480px)_minmax(170px,1fr)] xl:grid-cols-[minmax(280px,1fr)_480px_minmax(280px,1fr)] items-stretch gap-0 px-0 z-30`}>
                    <div className="min-w-0 h-full grid grid-cols-2 gap-0">
                        <button data-bottom-action="uturn" onClick={handleUTurn} className={`h-full w-full px-4 border-0 border-r ${t.borderCard} ${turnAssistActive ? 'bg-blue-500/8' : 'bg-transparent'} flex items-center justify-center gap-2.5 text-left active:bg-blue-500/10 hover:bg-blue-500/5 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500/35`}>
                            <span className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${turnAssistActive ? 'bg-blue-500/15 text-blue-500' : `${theme === 'dark' ? 'bg-slate-800/80' : 'bg-slate-100'} ${t.textDim}`}`}>
                                <CornerUpLeft className="w-5 h-5"/>
                            </span>
                            <span className="min-w-0">
                                <span className={`block text-[10px] font-bold tracking-[0.06em] ${turnAssistActive ? 'text-blue-500' : t.textMain}`}>U-TURN</span>
                                <span className={`mt-0.5 block text-[9px] font-bold leading-none ${turnAssistActive ? 'text-blue-500' : t.textSub}`}>{turnAssistActive ? 'ACTIVE' : 'TURN SETUP'}</span>
                            </span>
                        </button>
                        <button
                            data-bottom-action="coverage"
                            type="button"
                            aria-pressed={isRecording}
                            aria-label={isRecording ? 'Pause coverage recording' : 'Start coverage recording'}
                            disabled={isRecordingBoundary}
                            onClick={handleCoverageRecordingToggle}
                            className={`h-full w-full px-4 border-0 border-r ${t.borderCard} flex items-center justify-center gap-2.5 text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-inset ${isRecording ? 'bg-red-500/8 text-red-500 focus:ring-red-500/35' : `bg-transparent ${t.textMain} hover:bg-blue-500/5 focus:ring-blue-500/35`}`}
                        >
                            <span className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${isRecording ? 'bg-red-500/15 text-red-500' : theme === 'dark' ? 'bg-slate-800/80 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                                <Disc className={`w-5 h-5 ${isRecording ? 'motion-safe:animate-pulse' : ''}`}/>
                            </span>
                            <span className="min-w-0">
                                <span className="block text-[10px] font-bold tracking-[0.06em]">COVERAGE</span>
                                <span className={`mt-0.5 block text-[9px] font-bold leading-none ${isRecording ? 'text-red-500' : t.textSub}`}>{isRecording ? 'RECORDING' : 'READY'}</span>
                            </span>
                        </button>
                    </div>

                    <div data-bottom-telemetry className={`h-full w-full border-0 border-r ${t.borderCard} bg-transparent px-2`}>
                        <div className="grid grid-cols-3 h-full items-center text-center">
                            <button
                                type="button"
                                aria-label={`Productivity summary: ${workedArea.toFixed(2)} hectares done`}
                                onClick={() => { setProductivityOpen(prev => !prev); setRtkQualityOpen(false); setEventHistoryOpen(false); }}
                                disabled={isRecordingBoundary}
                                className="min-w-0 h-12 flex flex-col items-center justify-center transition-colors hover:bg-blue-500/5 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <div className={`text-[9px] uppercase font-bold tracking-[0.06em] leading-none ${t.textSub}`}>Area</div>
                                <div className={`mt-1 text-xl font-black leading-none tabular-nums ${t.textMain}`}>{workedArea.toFixed(2)}</div>
                                <div className={`mt-1 text-[10px] uppercase font-bold leading-none ${t.textSub}`}>ha</div>
                            </button>
                            <div className={`min-w-0 h-12 border-x ${t.borderCard} flex flex-col items-center justify-center text-center`}>
                                <div className={`text-[9px] uppercase font-bold tracking-[0.06em] leading-none ${t.textSub}`}>Speed</div>
                                <div className={`mt-1 text-xl font-black leading-none tabular-nums ${t.textMain}`}>{Math.abs(speed).toFixed(1)}</div>
                                <div className={`mt-1 text-[10px] uppercase font-bold leading-none ${t.textSub}`}>km/h</div>
                            </div>
                            <div className="min-w-0 h-12 flex flex-col items-center justify-center text-center">
                                <div className={`text-[9px] uppercase font-bold tracking-[0.06em] leading-none ${t.textSub}`}>Heading</div>
                                <div className={`mt-1 text-xl font-black leading-none tabular-nums ${t.textMain}`}>{heading.toFixed(1)}&deg;</div>
                                <div className={`mt-1 text-[10px] uppercase font-bold leading-none ${t.textSub}`}>{getCardinalShortDirection(heading)}</div>
                            </div>
                        </div>
                    </div>

                    <div className="min-w-0 h-full flex items-stretch justify-end">
                        <div className="h-full w-full">
                            <button
                                data-bottom-autosteer
                                type="button"
                                onClick={handleAutosteerPrimary}
                                aria-label={`Autosteer ${autosteerStateLabel}. ${autosteerPrimaryLabel}. ${autosteerSubLabel}`}
                                className={`w-full min-w-0 h-full rounded-none border-0 flex items-center justify-between px-5 active:brightness-95 transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white/40 ${autosteerButtonTone}`}
                            >
                                <div className="flex flex-col items-start min-w-0">
                                    <span className={`text-[9px] font-bold uppercase tracking-[0.06em] ${autosteerAccentText}`}>Autosteer / {autosteerStateLabel}</span>
                                    <span className="max-w-full text-xl xl:text-[22px] font-black text-white leading-none truncate">{autosteerPrimaryLabel}</span>
                                    <span className={`max-w-[170px] text-[8px] font-bold truncate ${autosteerStateLabel === 'BLOCKED' ? 'text-slate-300' : 'text-white/90'}`}>{autosteerSubLabel}</span>
                                </div>
                                <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${autosteerIconTone}`}>
                                    <AutosteerStatusIcon className="w-6 h-6"/>
                                </div>
                            </button>
                        </div>
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
                              <button onClick={cancelSaveLineModal} className={`px-6 py-2 rounded-lg border ${t.borderCard} ${t.textSub} font-bold`}>Cancel</button>
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
                                <button onClick={() => { setBoundaryNameModalOpen(false); cancelBoundaryRecording(); }} className={`px-6 py-2 rounded-lg border ${t.borderCard} ${t.textSub} font-bold`}>Cancel</button>
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
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6">
                        <div className={`${t.bgPanel} rounded-2xl w-full max-w-4xl max-h-[88vh] border ${t.borderCard} shadow-2xl overflow-hidden flex flex-col`}>
                            <div className={`shrink-0 px-5 py-4 border-b ${t.divider} flex items-center justify-between gap-4`}>
                                <div className="min-w-0">
                                    <div className={`text-[10px] uppercase tracking-widest font-black ${t.textSub}`}>Create Guidance</div>
                                    <h3 className={`text-xl font-black ${t.textMain}`}>Choose Line Type</h3>
                                </div>
                                <button onClick={() => setLineModeModalOpen(false)} className={`p-2 rounded-lg border ${t.borderCard} ${t.textMain} hover:brightness-95`}>
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="min-h-0 flex-1 grid grid-cols-1 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.78fr)] overflow-hidden">
                                <div className="min-h-0 overflow-y-auto p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {[
                                        { type: 'STRAIGHT_AB', title: 'Straight AB', detail: 'Set A, drive forward, set B.', icon: GitCommitHorizontal, tag: 'Most used' },
                                        { type: 'A_PLUS', title: 'A+ Heading', detail: 'Set A and enter or capture heading.', icon: ArrowUpFromDot },
                                        { type: 'CURVE', title: 'Curve', detail: 'Record a curved pass while driving.', icon: Spline },
                                        { type: 'PIVOT', title: 'Pivot', detail: 'Set center and edge radius.', icon: CircleDashed },
                                        { type: 'COMBINATION', title: 'Combination', detail: 'Record curve with straight segments.', icon: AlignJustify }
                                    ].map(({ type, title, detail, icon: Icon, tag }) => {
                                        const active = lineType === type;
                                        return (
                                            <button
                                                key={type}
                                                onClick={() => selectLineMode(type)}
                                                className={`text-left rounded-xl border p-4 min-h-[104px] transition-all flex items-start gap-4 ${active ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/15' : `${t.borderCard} ${theme === 'dark' ? 'bg-slate-900/70' : 'bg-white'} hover:border-blue-400 hover:bg-blue-500/5`}`}
                                            >
                                                <div className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${active ? 'bg-blue-600 text-white' : `${theme === 'dark' ? 'bg-slate-800' : 'bg-slate-100'} text-blue-500`}`}>
                                                    <Icon className="w-5 h-5" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2 min-w-0">
                                                        <span className={`font-black ${t.textMain} whitespace-nowrap`}>{title}</span>
                                                        {tag && <span className="px-1.5 py-0.5 rounded bg-green-500/15 text-green-500 text-[8px] font-black uppercase whitespace-nowrap">{tag}</span>}
                                                    </div>
                                                    <div className={`mt-1 text-xs leading-relaxed ${t.textSub}`}>{detail}</div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>

                                <aside className={`min-h-0 border-t lg:border-t-0 lg:border-l ${t.divider} ${theme === 'dark' ? 'bg-slate-950/45' : 'bg-slate-50'} p-5 flex flex-col gap-4`}>
                                    <div className={`rounded-xl border ${t.borderCard} ${theme === 'dark' ? 'bg-slate-900/70' : 'bg-white'} p-4`}>
                                        <div className={`text-[10px] uppercase font-black ${t.textSub}`}>Next step</div>
                                        <div className={`mt-2 text-sm font-bold ${t.textMain}`}>After choosing a type, the right-side run dock changes to the exact buttons needed to capture that line.</div>
                                    </div>
                                    <button onClick={handleToggleMultiLine} className={`w-full rounded-xl border ${isMultiLineMode ? 'border-blue-500 bg-blue-500/10' : t.borderCard} p-4 text-left flex items-center justify-between gap-3`}>
                                        <div className="min-w-0">
                                            <div className={`font-black ${t.textMain}`}>Parallel Guidance Lines</div>
                                            <div className={`text-xs ${t.textSub}`}>Create offset lines for implement passes.</div>
                                        </div>
                                        <div className={`shrink-0 w-12 h-7 rounded-full p-1 transition-colors ${isMultiLineMode ? 'bg-blue-600' : 'bg-slate-500'}`}>
                                            <div className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform ${isMultiLineMode ? 'translate-x-5' : ''}`} />
                                        </div>
                                    </button>
                                    <button onClick={() => setLineModeModalOpen(false)} className={`mt-auto w-full h-11 rounded-xl border ${t.borderCard} ${t.textMain} font-black hover:brightness-95`}>
                                        Cancel
                                    </button>
                                </aside>
                            </div>
                        </div>
                    </div>
                )}
                {(!runDockSuppressed || isRecordingBoundary) && (
                    <aside
                        data-run-dock
                        aria-label="Contextual run controls"
                        className="absolute right-0 top-[104px] bottom-[112px] z-[35] pointer-events-none"
                    >
                        {renderActionDock()}
                    </aside>
                )}
            </main>
        </div>
    </div>
  );
};
