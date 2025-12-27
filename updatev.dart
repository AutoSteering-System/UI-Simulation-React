import React, { useState, useEffect, useRef } from 'react';
import { 
  Map as MapIcon, 
  LayoutGrid, 
  Settings, 
  Menu, 
  Target, 
  Signal, 
  Play, 
  Pause, 
  ArrowLeftRight, 
  CornerUpLeft, 
  CornerUpRight, 
  MoreHorizontal,
  Video,
  Ruler,
  Layers,
  Save,
  Navigation,
  AlertTriangle,
  LocateFixed,
  Compass,
  Tractor,
  Route,
  Activity,
  Globe,
  X,
  ChevronRight,
  Monitor,
  Cpu,
  Radio,
  Plus,
  Minus,
  Sun,
  Moon,
  FolderOpen,
  FileText,
  Trash2,
  CheckCircle2,
  Gauge,
  RotateCcw,
  RotateCw,
  Flag,
  Calendar,
  Sprout,
  Droplets,
  Scissors,
  GitCommitHorizontal, 
  ArrowUpFromDot,       
  Spline,               
  CircleDashed,         
  MousePointer2,        
  Disc,
  Crosshair,
  Square,
  PlayCircle,
  CheckSquare,
  MapPin,
  Keyboard,
  Check,
  ChevronDown,
  ChevronsRight,
  PenTool,
  PlusCircle,
  AlertCircle
} from 'lucide-react';

// --- GEOMETRY HELPERS ---

// Scale factor: Assuming ~15 pixels = 1 meter based on physics logic
const PIXELS_PER_METER = 15; 

// Normalize angle to -180 to 180
const normalizeAngle = (angle) => {
    let a = angle % 360;
    if (a > 180) a -= 360;
    if (a < -180) a += 360;
    return a;
};

// Calculate total length of a path in pixels
const calculatePathLength = (points) => {
    let length = 0;
    for (let i = 0; i < points.length - 1; i++) {
        length += Math.hypot(points[i+1].x - points[i].x, points[i+1].y - points[i].y);
    }
    return length;
};

// Check if segment (p1, p2) intersects with (p3, p4)
const getLineIntersection = (p1, p2, p3, p4) => {
    const s1_x = p2.x - p1.x;
    const s1_y = p2.y - p1.y;
    const s2_x = p4.x - p3.x;
    const s2_y = p4.y - p3.y;

    const denom = -s2_x * s1_y + s1_x * s2_y;
    if (Math.abs(denom) < 0.0001) return null; // Parallel lines

    const s = (-s1_y * (p1.x - p3.x) + s1_x * (p1.y - p3.y)) / denom;
    const t = ( s2_x * (p1.y - p3.y) - s2_y * (p1.x - p3.x)) / denom;

    // Strict intersection (not endpoints) usually preferred, but 0..1 is okay
    if (s >= 0 && s <= 1 && t >= 0 && t <= 1) {
        return {
            x: p1.x + (t * s1_x),
            y: p1.y + (t * s1_y)
        };
    }
    return null;
};

// Check for ANY self-intersection in the path
const checkSelfIntersection = (points) => {
    if (points.length < 4) return null;
    
    // We iterate backwards to find the most recent intersection first.
    // 'i' is the start index of the "late" segment (the one currently being drawn/overshot)
    // The last segment is points[len-2] -> points[len-1]
    
    for (let i = points.length - 2; i >= 2; i--) {
        const p1 = points[i];
        const p2 = points[i+1];
        
        // 'j' is the start index of the "early" segment (the one we are crossing back into)
        // We stop at i - 1 to avoid checking adjacent segments (which naturally touch)
        for (let j = 0; j < i - 1; j++) {
            const p3 = points[j];
            const p4 = points[j+1];
            
            const intersection = getLineIntersection(p1, p2, p3, p4);
            if (intersection) {
                return {
                    earlySegmentIdx: j, // Index of Pj (start of the crossed segment)
                    lateSegmentIdx: i,  // Index of Pi (start of the crossing segment)
                    point: intersection
                };
            }
        }
    }
    return null;
};


const SteeringWheelIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="2" />
    <path d="M12 14v8" />
    <path d="M10.6 13.4L4.2 17.2" />
    <path d="M13.4 13.4l6.4 3.8" />
  </svg>
);

const TractorVehicle = ({ mode, steeringAngle }) => (
  <svg width="80" height="120" viewBox="0 0 100 120" className="drop-shadow-2xl filter">
    <rect x="20" y="20" width="60" height="6" fill="#334155" rx="2" />
    <rect x="15" y="85" width="70" height="8" fill="#334155" rx="2" />
    <g transform={`rotate(${steeringAngle}, 14, 24)`}><rect x="5" y="10" width="18" height="28" fill="#1e293b" rx="4" stroke="#0f172a" strokeWidth="2" /></g>
    <g transform={`rotate(${steeringAngle}, 86, 24)`}><rect x="77" y="10" width="18" height="28" fill="#1e293b" rx="4" stroke="#0f172a" strokeWidth="2" /></g>
    <rect x="0" y="70" width="22" height="45" fill="#1e293b" rx="5" stroke="#0f172a" strokeWidth="2" />
    <rect x="78" y="70" width="22" height="45" fill="#1e293b" rx="5" stroke="#0f172a" strokeWidth="2" />
    <path d="M30 10 L70 10 L75 100 L25 100 Z" fill={mode === 'AUTO' ? '#22c55e' : '#3b82f6'} stroke="white" strokeWidth="2" />
    <rect x="35" y="15" width="30" height="40" fill="rgba(0,0,0,0.1)" rx="2" />
    <path d="M32 60 L68 60 L72 90 L28 90 Z" fill="#94a3b8" opacity="0.8" stroke="white" strokeWidth="1" />
    <rect x="35" y="65" width="30" height="20" fill="white" opacity="0.9" rx="2" />
    <circle cx="35" cy="12" r="2" fill="#facc15" />
    <circle cx="65" cy="12" r="2" fill="#facc15" />
  </svg>
);

const App = () => {
  // --- SYSTEM STATES ---
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

  const [tempLineName, setTempLineName] = useState('');
  const [tempManualHeading, setTempManualHeading] = useState('0.0'); 
  const [settingsTab, setSettingsTab] = useState('display'); 
  const [lineType, setLineType] = useState('STRAIGHT_AB'); 
  const [satelliteCount, setSatelliteCount] = useState(12);
  const [notification, setNotification] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(0.6); 
  const [theme, setTheme] = useState('light'); 
  const [isDraggingMap, setIsDraggingMap] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const keysPressed = useRef({});
  const [currentTime, setCurrentTime] = useState('');

  // DATA STATES
  const [fields, setFields] = useState([
      { 
        id: 1, 
        name: "Home_Field_01", 
        area: "12.5 ha", 
        lastUsed: "Today", 
        boundaries: [], 
        lines: [ 
            { id: 101, name: "Main AB", type: "STRAIGHT_AB", date: "2023-10-01", points: { a: {x: -50, y: -200}, b: {x: -50, y: 200} } },
        ],
        tasks: [
             { id: 201, name: "Spring Planting", type: "Planting", date: "2023-10-15", status: "Paused" }
        ] 
      },
      { 
        id: 2, 
        name: "North_Sector_B", 
        area: "8.2 ha", 
        lastUsed: "Yesterday", 
        boundaries: [], 
        lines: [],
        tasks: [] 
      },
  ]);
  const [selectedFieldId, setSelectedFieldId] = useState(1);
  const [activeTaskId, setActiveTaskId] = useState(null);

  const [loadedField, setLoadedField] = useState(null); 
  const [activeBoundaryIdx, setActiveBoundaryIdx] = useState(0); 
  const [activeLineId, setActiveLineId] = useState(null);
  
  // --- LINE CREATION STATES ---
  const [pointA, setPointA] = useState(null); 
  const [pointB, setPointB] = useState(null); 
  const [aPlusPoint, setAPlusPoint] = useState(null);
  const [aPlusHeading, setAPlusHeading] = useState(null);
  const [isRecordingCurve, setIsRecordingCurve] = useState(false);
  const [curvePoints, setCurvePoints] = useState([]);
  const [pivotCenter, setPivotCenter] = useState(null);
  const [pivotRadius, setPivotRadius] = useState(null);
  const [guidanceLine, setGuidanceLine] = useState(null); 
  const [coverageTrail, setCoverageTrail] = useState([]); 
  
  // FIELD CREATION STATES
  const [viewMode, setViewMode] = useState('LIST'); 
  const [newFieldName, setNewFieldName] = useState('');
  const [isRecordingBoundary, setIsRecordingBoundary] = useState(false);
  const [tempBoundary, setTempBoundary] = useState([]); 
  const [currentFieldBoundaries, setCurrentFieldBoundaries] = useState([]);

  // Store refs to guidance data for physics loop
  const guidanceRef = useRef({
      type: null,
      points: null
  });

  // Sync guidanceRef with state
  useEffect(() => {
    guidanceRef.current = {
        type: guidanceLine,
        points: { 
            a: pointA, 
            b: pointB, 
            aplus: { point: aPlusPoint, heading: aPlusHeading },
            curve: curvePoints,
            pivot: { center: pivotCenter, radius: pivotRadius }
        }
    };
  }, [guidanceLine, pointA, pointB, aPlusPoint, aPlusHeading, curvePoints, pivotCenter, pivotRadius]);


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
      
      if (val >= 337.5 || val < 22.5) return 'Bắc (North)';
      if (val >= 22.5 && val < 67.5) return 'Đông Bắc (NE)';
      if (val >= 67.5 && val < 112.5) return 'Đông (East)';
      if (val >= 112.5 && val < 157.5) return 'Đông Nam (SE)';
      if (val >= 157.5 && val < 202.5) return 'Nam (South)';
      if (val >= 202.5 && val < 247.5) return 'Tây Nam (SW)';
      if (val >= 247.5 && val < 292.5) return 'Tây (West)';
      if (val >= 292.5 && val < 337.5) return 'Tây Bắc (NW)';
      return '';
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

  // --- 2. INPUT ---
  useEffect(() => {
    const handleKeyDown = (e) => {
        if (menuOpen || settingsOpen || (fieldManagerOpen && !isRecordingBoundary) || lineModeModalOpen || lineNameModalOpen || boundaryNameModalOpen || linesPanelOpen || manualHeadingModalOpen || boundaryAlertOpen) return; 
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].indexOf(e.key) > -1) e.preventDefault();
        keysPressed.current[e.key] = true;
    };
    const handleKeyUp = (e) => { keysPressed.current[e.key] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); };
  }, [menuOpen, settingsOpen, fieldManagerOpen, lineModeModalOpen, isRecordingBoundary, lineNameModalOpen, boundaryNameModalOpen, linesPanelOpen, manualHeadingModalOpen, boundaryAlertOpen]);

  // --- 3. PHYSICS ---
  useEffect(() => {
    let animationFrameId;

    const loop = (time) => {
        if (!physics.current.lastTime) physics.current.lastTime = time;
        const dt = Math.min((time - physics.current.lastTime) / 1000, 0.1); 
        physics.current.lastTime = time;

        const p = physics.current; 

        // --- AUTO STEERING LOGIC ---
        if (steeringMode === 'AUTO') {
             // 1. Maintain default speed if stopped or slow (Simulate driving)
             if (p.targetSpeed < 2) p.targetSpeed = 6; 

             // 2. Calculate Steering
             const guide = guidanceRef.current;
             let xte = 0;
             let lineHeading = 0;
             let validLine = false;

             if (guide.type === 'STRAIGHT_AB' && guide.points.a && guide.points.b) {
                const ax = guide.points.a.x; const ay = guide.points.a.y;
                const bx = guide.points.b.x; const by = guide.points.b.y;
                const dx = bx - ax; const dy = by - ay;
                const len = Math.hypot(dx, dy);
                
                // Normal vector calculation for XTE
                const crossProduct = (bx - ax) * (p.y - ay) - (by - ay) * (p.x - ax);
                xte = crossProduct / len;
                
                // Calculate Line Heading (0 deg is North/Up)
                lineHeading = Math.atan2(dx, -dy) * 180 / Math.PI;
                validLine = true;
             } 
             else if (guide.type === 'A_PLUS' && guide.points.aplus && guide.points.aplus.point && guide.points.aplus.heading != null) {
                 const ax = guide.points.aplus.point.x;
                 const ay = guide.points.aplus.point.y;
                 const h = guide.points.aplus.heading;
                 
                 const rad = h * Math.PI / 180;
                 const ux = Math.sin(rad);
                 const uy = -Math.cos(rad); 
                 
                 const vax = p.x - ax; const vay = p.y - ay;
                 xte = vax * (-uy) + vay * (ux); // Dot product with normal
                 
                 lineHeading = h;
                 validLine = true;
             }

             if (validLine) {
                 // --- BIDIRECTIONAL LOGIC ---
                 let headingErr = normalizeAngle(lineHeading - p.heading);
                 
                 // If the angle difference is > 90 (driving reverse relative to line), flip logic
                 if (Math.abs(headingErr) > 90) {
                     // Flip target heading by 180
                     const reverseHeading = normalizeAngle(lineHeading + 180);
                     headingErr = normalizeAngle(reverseHeading - p.heading);
                     
                     // IMPORTANT: Also flip XTE sign because "Left" and "Right" are reversed when driving backwards along the line
                     xte = -xte; 
                 }
                 
                 // Control Gains
                 const kP_xte = 0.5; 
                 const kP_head = 1.0; 
                 
                 // Control Law: Steer to reduce Heading Error AND XTE
                 // If XTE > 0 (Right), we need to steer Left (-).
                 let steerCmd = headingErr * kP_head - xte * kP_xte;
                 
                 // Clamp
                 if (steerCmd > 40) steerCmd = 40;
                 if (steerCmd < -40) steerCmd = -40;
                 
                 p.steeringAngle = steerCmd;
             }
             
        } else {
             // MANUAL MODE logic already handles key inputs
             if (keysPressed.current['ArrowUp']) p.targetSpeed = Math.min(p.targetSpeed + 10 * dt, 15); 
            else if (keysPressed.current['ArrowDown']) p.targetSpeed = Math.max(p.targetSpeed - 15 * dt, -5); 
            
            const steerSpeed = 25;
            if (keysPressed.current['ArrowLeft']) p.steeringAngle = Math.max(p.steeringAngle - steerSpeed * dt, -45);
            else if (keysPressed.current['ArrowRight']) p.steeringAngle = Math.min(p.steeringAngle + steerSpeed * dt, 45);
            else {
                if (p.steeringAngle > 0) p.steeringAngle = Math.max(0, p.steeringAngle - 20 * dt);
                else if (p.steeringAngle < 0) p.steeringAngle = Math.min(0, p.steeringAngle + 20 * dt);
            }
        }

        if (Math.abs(p.speed - p.targetSpeed) > 0.1) {
            const accel = p.speed < p.targetSpeed ? 5 : 10;
            p.speed += (p.targetSpeed - p.speed) * accel * dt;
        } else {
            p.speed = p.targetSpeed;
        }

        if (Math.abs(p.speed) > 0.1) {
            const turnRate = p.steeringAngle * 0.15 * (p.speed / 10) * dt; 
            p.heading += turnRate * 20; 
            
            p.heading = (p.heading % 360 + 360) % 360;

            const rad = p.heading * Math.PI / 180;
            const pxPerSec = Math.abs(p.speed) * 15; 
            const moveDist = pxPerSec * dt;
            const dir = p.speed > 0 ? 1 : -1;
            p.x += Math.sin(rad) * moveDist * dir;
            p.y -= Math.cos(rad) * moveDist * dir;
        }

        setSpeed(p.speed);
        setSteeringAngle(p.steeringAngle);
        setHeading(p.heading);
        setWorldPos({ x: p.x, y: p.y });
        
        if (setManualTargetSpeed) {
             setManualTargetSpeed(prev => Math.abs(prev - p.targetSpeed) > 0.5 ? Math.round(p.targetSpeed) : prev);
        }

        animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [steeringMode, setManualTargetSpeed]); 

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

      if (isRecording) setCoverageTrail(prev => shouldRecord(prev, { x: newPos.x, y: newPos.y, h: newHeading }));
      if (isRecordingCurve) setCurvePoints(prev => shouldRecord(prev, { x: newPos.x, y: newPos.y }));
      if (isRecordingBoundary) setTempBoundary(prev => shouldRecord(prev, { x: newPos.x, y: newPos.y }));
  }, [worldPos, isRecording, isRecordingCurve, isRecordingBoundary, heading]);


  // --- 5. LOGIC & HANDLERS ---
  const toggleSteering = () => {
    if (!guidanceLine && steeringMode === 'MANUAL') return showNotification("Set Line first!", "warning");
    if (steeringMode === 'MANUAL') {
        setDragOffset({ x: 0, y: 0 });
    } else {
        physics.current.targetSpeed = 0;
        physics.current.steeringAngle = 0;
    }
    setSteeringMode(prev => prev === 'MANUAL' ? 'AUTO' : 'MANUAL');
    if (steeringMode === 'MANUAL') showNotification("Auto Steer ENGAGED", "success");
    else showNotification("Manual Control Returned", "warning");
  };

  const showNotification = (msg, type) => { setNotification({ msg, type }); setTimeout(() => setNotification(null), 3000); };
  const handleTrim = (direction) => { setCrossTrackError(prev => direction === 'left' ? prev - 1 : prev + 1); showNotification(`Trim ${direction === 'left' ? 'Left' : 'Right'} 1cm`, "info"); };
  const handleZoom = (type) => { setZoomLevel(prev => { if (type === 'in') return Math.min(prev + 0.2, 3.0); if (type === 'out') return Math.max(prev - 0.2, 0.2); return prev; }); };
  const handleRecenter = () => { setDragOffset({ x: 0, y: 0 }); setIsDraggingMap(false); };

  const handleMapMouseDown = (e) => { if (e.button !== 0) return; setIsDraggingMap(true); dragStartRef.current = { x: e.clientX, y: e.clientY }; };
  const handleMapMouseMove = (e) => {
      if (!isDraggingMap) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      setDragOffset(prev => ({ x: prev.x - dx / zoomLevel, y: prev.y - dy / zoomLevel }));
  };
  const handleMapMouseUp = () => { setIsDraggingMap(false); };

  const resetLines = () => { setPointA(null); setPointB(null); setAPlusPoint(null); setAPlusHeading(null); setCurvePoints([]); setIsRecordingCurve(false); setPivotCenter(null); setPivotRadius(null); setGuidanceLine(null); setActiveLineId(null); };
  
  const cancelLineCreation = () => { 
      resetLines(); 
      setIsCreating(false); // EXIT CREATION MODE
      setDockMenuOpen(true); // RETURN TO DOCK MENU
      showNotification("Creation Cancelled", "info"); 
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
        date: new Date().toISOString().split('T')[0],
        points: { a: pointA, b: pointB, curve: curvePoints, pivot: { center: pivotCenter, radius: pivotRadius }, aplus: { point: aPlusPoint, heading: aPlusHeading } }
    };
    setFields(prev => prev.map(f => { if (f.id === selectedFieldId) { return { ...f, lines: [...(f.lines || []), newLine] }; } return f; }));
    setLineNameModalOpen(false); setTempLineName(''); setActiveLineId(newLine.id);
    setIsCreating(false); // Stop creating
    setDockMenuOpen(true); // RETURN TO DOCK MENU
    showNotification("Line Saved Successfully", "success");
    if (loadedField && loadedField.id === selectedFieldId) { setLoadedField(prev => ({ ...prev, lines: [...(prev.lines || []), newLine] })); }
  };

  const handleABButtonClick = () => {
      if (!pointA) { resetLines(); setPointA({ ...worldPos }); showNotification("Point A Set. Drive > 10m to set B.", "info"); }
      else if (!pointB) { 
          const dist = Math.hypot(worldPos.x - pointA.x, worldPos.y - pointA.y);
          if (dist < 50) { showNotification(`Too short! Drive ${((50 - dist)/5).toFixed(1)}m more.`, "warning"); return; } 
          setPointB({ ...worldPos }); setGuidanceLine('STRAIGHT_AB'); showNotification("AB Line Created!", "success"); setTimeout(openSaveLineModal, 500); 
      }
      else { resetLines(); setPointA({ ...worldPos }); showNotification("Point A Reset", "info"); }
  };
  
  // --- A+ LINE SPECIFIC FUNCTIONS ---
  const handleSetAPlus_PointA = () => {
      setAPlusPoint({ ...worldPos });
      showNotification("Point A Set. Select Heading.", "info");
  };

  const handleSetAPlus_HeadingCurrent = () => {
      setAPlusHeading(heading);
      showNotification(`Heading Set to Current: ${heading.toFixed(1)}°`, "info");
  };

  const handleSetAPlus_HeadingManual = (val) => {
      const num = parseFloat(val);
      if (isNaN(num) || num < 0 || num > 360) {
          showNotification("Invalid heading (0-360)", "warning");
          return;
      }
      setAPlusHeading(num);
      setManualHeadingModalOpen(false);
      showNotification(`Heading Set Manually: ${num.toFixed(1)}°`, "info");
  };

  const handleConfirmAPlus = () => {
      if (!aPlusPoint) return showNotification("Please Set Point A first", "warning");
      if (aPlusHeading === null || aPlusHeading === undefined) return showNotification("Please Set Heading first", "warning");
      
      setGuidanceLine('A_PLUS');
      showNotification("A+ Line Created!", "success");
      setTimeout(openSaveLineModal, 500);
  };

  const handleRecordCurve = () => { 
      if (isRecordingCurve) { 
          setIsRecordingCurve(false); 
          if (curvePoints.length > 2) { setGuidanceLine('CURVE'); showNotification("Curve Saved!", "success"); setTimeout(openSaveLineModal, 500); } 
          else { showNotification("Curve too short!", "error"); setCurvePoints([]); } 
      } else { resetLines(); setIsRecordingCurve(true); setCurvePoints([{...worldPos}]); showNotification("Recording Curve...", "info"); } 
  };
  const handleSetCenter = () => { resetLines(); setPivotCenter({ ...worldPos }); showNotification("Pivot Center Set. Drive to Edge.", "info"); };
  const handleSetRadius = () => { if (!pivotCenter) return showNotification("Set Center first", "warning"); const radius = Math.hypot(worldPos.x - pivotCenter.x, worldPos.y - pivotCenter.y); if (radius < 50) return showNotification("Radius too small!", "warning"); setPivotRadius(radius); setGuidanceLine('PIVOT'); showNotification("Pivot Created!", "success"); setTimeout(openSaveLineModal, 500); };
  
  const selectLineMode = (type) => { 
      setLineType(type); 
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
     setIsRecordingBoundary(true); 
     physics.current.targetSpeed = 5; 
     showNotification("Drive to record boundary...", "info"); 
  };
  
  const updateManualSpeed = (val) => { physics.current.targetSpeed = val; setManualTargetSpeed(val); };
  const updateSteering = (val) => { physics.current.steeringAngle = val; setSteeringAngle(val); };

  const handleLoadLine = (line) => {
      resetLines(); setActiveLineId(line.id); setLineType(line.type);
      if (line.type === 'STRAIGHT_AB' && line.points) { setPointA(line.points.a); setPointB(line.points.b); setGuidanceLine('STRAIGHT_AB'); }
      else if (line.type === 'CURVE' && line.points) { setCurvePoints(line.points.curve || []); setGuidanceLine('CURVE'); }
      else if (line.type === 'A_PLUS' && line.points) { setAPlusPoint(line.points.aplus?.point); setAPlusHeading(line.points.aplus?.heading); setGuidanceLine('A_PLUS'); }
      else if (line.type === 'PIVOT' && line.points) { setPivotCenter(line.points.pivot?.center); setPivotRadius(line.points.pivot?.radius); setGuidanceLine('PIVOT'); }
      showNotification(`Line "${line.name}" Loaded`, "success"); setLinesPanelOpen(false); 
      setIsCreating(false); // DO NOT ENTER CREATION MODE WHEN LOADING
      setDockMenuOpen(false); // Close menu
  }

  const handleTaskAction = (task, action) => {
      let newStatus = task.status;
      if (action === 'start') { newStatus = 'In Progress'; setActiveTaskId(task.id); showNotification(`Task "${task.name}" Started`, "success"); }
      else if (action === 'pause') { newStatus = 'Paused'; if (activeTaskId === task.id) setActiveTaskId(null); showNotification(`Task "${task.name}" Paused`, "info"); }
      else if (action === 'finish') { newStatus = 'Done'; if (activeTaskId === task.id) setActiveTaskId(null); showNotification(`Task "${task.name}" Finished!`, "success"); }
      setFields(prev => prev.map(f => { if (f.id === selectedFieldId) { return { ...f, tasks: f.tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t) }; } return f; }));
  }

  const startFieldCreation = () => { setViewMode('CREATE_FIELD'); setNewFieldName(''); setCurrentFieldBoundaries([]); setTempBoundary([]); };
  const startBoundaryRecording = () => { setFieldManagerOpen(false); setIsRecordingBoundary(true); physics.current.targetSpeed = 5; showNotification("Drive to record boundary...", "info"); };
  
  // UPDATED FINISH BOUNDARY LOGIC
  const finishBoundaryRecording = () => {
      // 1. Check Minimum Distance (100m) - Reduced for testing
      const pathLengthPx = calculatePathLength(tempBoundary);
      // 50 meters * PIXELS_PER_METER (easier testing)
      if (pathLengthPx < (50 * PIXELS_PER_METER)) {
           showNotification(`Quãng đường quá ngắn (< 50m). Hãy chạy thêm!`, "warning");
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
          setTempBoundary([]); 
          setIsRecordingBoundary(false);
          physics.current.targetSpeed = 0;
          
          const count = viewMode === 'CREATE_FIELD' ? currentFieldBoundaries.length : (fields.find(f => f.id === selectedFieldId)?.boundaries?.length || 0);
          setTempBoundaryName(`Boundary ${count + 1}`);
          setBoundaryNameModalOpen(true);
          showNotification("Đã cắt bỏ phần thừa!", "success");
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
              setTempBoundary([]);
              setIsRecordingBoundary(false);
              physics.current.targetSpeed = 0;
              
              const count = viewMode === 'CREATE_FIELD' ? currentFieldBoundaries.length : (fields.find(f => f.id === selectedFieldId)?.boundaries?.length || 0);
              setTempBoundaryName(`Boundary ${count + 1}`);
              setBoundaryNameModalOpen(true);
              showNotification("Đã đóng vòng biên", "success");
          } else {
               showNotification("Tiếp tục ghi...", "info");
          }
      } else if (boundaryAlertType === 'INCOMPLETE') {
          if (choice === 'CONTINUE') {
               showNotification("Tiếp tục ghi...", "info");
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
          setCurrentFieldBoundaries(updatedBoundaries);
          // Set as active immediately for preview
          setActiveBoundaryIdx(updatedBoundaries.length - 1);
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
          setFields(updatedFields);
          
          // Force update loaded field to reflect changes immediately
          const updatedActiveField = updatedFields.find(f => f.id === selectedFieldId);
          setLoadedField(updatedActiveField); 
          
          setActiveBoundaryIdx(updatedBoundaries.length - 1);
      }
      
      setBoundaryNameModalOpen(false);
      setPreviewBoundary(null); 
      setTempBoundary([]);
      setTempBoundaryName('');
      setIsRecordingBoundary(false);
      setDockMenuOpen(true); 
      showNotification("Boundary Saved & Active!", "success");
  }

  const cancelBoundaryRecording = () => {
    setIsRecordingBoundary(false);
    physics.current.targetSpeed = 0;
    setTempBoundary([]);
    setPreviewBoundary(null); 
    setDockMenuOpen(true); 
    showNotification("Recording Cancelled", "info");
  };
  
  const handleDeleteField = () => {
      if (fields.length <= 1) { showNotification("Cannot delete the last field!", "warning"); return; }
      const updatedFields = fields.filter(f => f.id !== selectedFieldId);
      setFields(updatedFields);
      if (updatedFields.length > 0) {
          setSelectedFieldId(updatedFields[0].id);
          if (loadedField && loadedField.id === selectedFieldId) { setLoadedField(null); setCoverageTrail([]); }
      }
      showNotification("Field Deleted", "error");
  };
  const saveNewField = () => { 
      if (!newFieldName) return showNotification("Enter field name", "warning");
      const area = (currentFieldBoundaries.reduce((acc, b) => acc + b.points.length, 0) * 0.05).toFixed(1);
      const newField = { id: Date.now(), name: newFieldName, area: area + " ha", lastUsed: "Just now", boundaries: currentFieldBoundaries, lines: [], tasks: [] }; 
      setFields(prev => [...prev, newField]); 
      setSelectedFieldId(newField.id); 
      setViewMode('LIST'); 
      showNotification("Field Saved Successfully", "success"); 
  };
  const startTaskCreation = () => setViewMode('CREATE_TASK');
  const saveNewTask = (type) => { const activeField = fields.find(f => f.id === selectedFieldId); const newTask = { id: Date.now(), name: `${type} ${new Date().getFullYear()}`, type, date: "Today", status: "Pending" }; const updatedFields = fields.map(f => { if (f.id === selectedFieldId) return { ...f, tasks: [newTask, ...f.tasks] }; return f; }); setFields(updatedFields); setViewMode('LIST'); showNotification(`Task "${newTask.name}" Created`, "success"); };
  
  const handleLoadField = () => { 
      const field = fields.find(f => f.id === selectedFieldId); 
      setLoadedField(field); 
      showNotification(`Loaded Field: ${field.name}`, "success"); 
      setFieldManagerOpen(false); 
      setCoverageTrail([]); 
      resetLines(); 
      setDragOffset({x:0, y:0}); 

      if (field.lines && field.lines.length > 0) {
          const defaultLine = field.lines[0];
          handleLoadLine(defaultLine);
      }
  }

  const getDisplayHeading = () => { let h = heading % 360; if (h < 0) h += 360; return h.toFixed(1); };
  const getRtkColor = () => rtkStatus === 'FIX' ? 'bg-green-500 text-white border-green-400' : 'bg-yellow-500 text-black border-yellow-400';
  const getLineTypeIcon = () => { switch(lineType) { case 'STRAIGHT_AB': return GitCommitHorizontal; case 'A_PLUS': return ArrowUpFromDot; case 'CURVE': return Spline; case 'PIVOT': return CircleDashed; default: return GitCommitHorizontal; } };

  const renderGuidanceLine = () => {
    if (guidanceLine === 'STRAIGHT_AB' && pointA && pointB) {
      const dx = pointB.x - pointA.x; const dy = pointB.y - pointA.y; const length = Math.sqrt(dx*dx + dy*dy); const ux = dx / length; const uy = dy / length;
      const x1 = pointA.x - ux * 10000; const y1 = pointA.y - uy * 10000; const x2 = pointA.x + ux * 10000; const y2 = pointA.y + uy * 10000;
      return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="blue" strokeWidth="2" strokeOpacity="0.6" />;
    }
    // A+ PREVIEW OR CONFIRMED LINE
    if ((guidanceLine === 'A_PLUS' || (lineType === 'A_PLUS' && !guidanceLine)) && aPlusPoint && aPlusHeading !== null && aPlusHeading !== undefined) {
        const rad = aPlusHeading * Math.PI / 180; 
        const ux = Math.sin(rad); 
        const uy = -Math.cos(rad);
        const x1 = aPlusPoint.x - ux * 100000; 
        const y1 = aPlusPoint.y - uy * 100000; 
        const x2 = aPlusPoint.x + ux * 100000; 
        const y2 = aPlusPoint.y + uy * 100000;
        // If it's a preview (not yet confirmed guidanceLine), make it dashed or lighter red
        const isPreview = !guidanceLine;
        return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={isPreview ? "red" : "blue"} strokeWidth="2" strokeOpacity={isPreview ? "0.8" : "0.6"} strokeDasharray={isPreview ? "15, 10" : "0"} />;
    }
    return null;
  };

  const renderActionDock = () => {
      // 1. Boundary Recording Active? Show controls
      if (isRecordingBoundary) {
          return ( 
            <div className={`p-3 rounded-2xl ${t.bgCard} shadow-lg border ${t.borderCard} flex flex-col gap-2 pointer-events-auto w-[60px]`}>
               <div className={`text-center font-bold text-orange-500 uppercase text-[8px]`}>REC</div>
               <DockButton theme={t} icon={Square} label="Finish" color="green" onClick={finishBoundaryRecording}/>
               <DockButton theme={t} icon={X} label="Cancel" color="red" onClick={cancelBoundaryRecording}/>
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
                        setPointA(null);
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
                        <DockButton theme={t} icon={MapPin} label="Bound" color="orange" onClick={startBoundaryRecording}/>
                      </> 
                    );
                } else {
                    content = ( 
                        <>
                            <DockButton theme={t} icon={RotateCcw} label="Reset A" color="orange" onClick={() => { setAPlusPoint({ ...worldPos }); setAPlusHeading(null); showNotification("Point A Reset to Current Position", "info"); }}/>
                            <DockButton theme={t} icon={Compass} label={aPlusHeading !== null ? `${aPlusHeading.toFixed(0)}°` : "Head"} color={aPlusHeading !== null ? "green" : "blue"} onClick={handleSetAPlus_HeadingCurrent}/>
                            <DockButton theme={t} icon={Keyboard} label="Input" color="gray" onClick={() => { setManualHeadingModalOpen(true); setTempManualHeading(heading.toFixed(1)); }}/>
                            <div className={`h-px ${t.divider} mx-1`}></div>
                            
                            {aPlusHeading !== null && (
                                <DockButton theme={t} icon={Check} label="OK" color="green" onClick={handleConfirmAPlus}/>
                            )}
                            
                            <DockButton theme={t} icon={X} label="Cancel" color="red" onClick={() => { setAPlusPoint(null); setAPlusHeading(null); }}/>
                        </> 
                    );
                }
                break;
            case 'CURVE': 
                content = ( <><DockButton theme={t} icon={isRecordingCurve ? Disc : Spline} label={isRecordingCurve ? "Stop" : "Record"} color={isRecordingCurve ? "red" : "blue"} onClick={handleRecordCurve} className={isRecordingCurve ? "animate-pulse" : ""} /><DockButton theme={t} icon={X} label="Cancel" color="red" onClick={cancelLineCreation}/></> );
                break;
            case 'PIVOT': 
                content = ( <><DockButton theme={t} icon={Target} label="Center" color={pivotCenter?"green":"blue"} onClick={handleSetCenter}/><DockButton theme={t} icon={CircleDashed} label="Edge" color={pivotRadius?"green":"blue"} onClick={handleSetRadius}/><DockButton theme={t} icon={X} label="Cancel" color="red" onClick={cancelLineCreation}/></> );
                break;
            default: break;
        }
        return (
            <div className={`p-3 rounded-2xl ${t.bgCard} shadow-lg border ${t.borderCard} flex flex-col gap-2 pointer-events-auto w-[60px]`}>
                 <div className={`text-[8px] font-bold ${t.textSub} uppercase text-center mb-1`}>{lineType.replace('_',' ')}</div>
                 {content}
            </div>
        );
      }

      // 3. Dock Menu Open? Show the 3 choices
      if (dockMenuOpen) {
          return (
            <div className={`p-3 rounded-2xl ${t.bgCard} shadow-lg border ${t.borderCard} flex flex-col gap-3 pointer-events-auto w-[60px] animate-in slide-in-from-right-5 fade-in duration-200`}>
               <DockButton theme={t} icon={Route} label="Line" color="blue" onClick={() => setLineModeModalOpen(true)}/>
               <DockButton theme={t} icon={MapPin} label="Bound" color="orange" onClick={startBoundaryCreation}/>
               <div className={`h-px ${t.divider}`}></div>
               <DockButton theme={t} icon={MoreHorizontal} label="Menu" color="gray" onClick={() => setMenuOpen(true)}/>
               <DockButton theme={t} icon={X} label="Close" color="gray" onClick={() => setDockMenuOpen(false)}/>
            </div>
          );
      }

      // 4. Default State (Collapsed Symbol)
      // If Auto is engaged, show trim controls
      if (steeringMode === 'AUTO') {
           return ( 
            <div className={`p-3 rounded-2xl ${t.bgCard} shadow-lg border ${t.borderCard} flex flex-col gap-2 pointer-events-auto w-[60px]`}>
               <span className={`text-[8px] text-center ${t.textSub} font-bold uppercase`}>TRIM</span>
               <DockButton theme={t} icon={CornerUpLeft} label="L 1cm" color="green" onClick={() => handleTrim('left')}/>
               <DockButton theme={t} icon={CornerUpRight} label="R 1cm" color="green" onClick={() => handleTrim('right')}/>
               <div className={`h-px ${t.divider}`}></div>
               <DockButton theme={t} icon={Pause} label="Pause" color="orange" onClick={toggleSteering}/>
            </div>
           );
      }

      // Default Tool Symbol - PLUS CIRCLE floating button
      return (
         <div className="pointer-events-auto">
            <button 
                onClick={() => setDockMenuOpen(true)}
                className={`w-16 h-16 rounded-full bg-blue-600 border-4 border-white/20 shadow-2xl flex items-center justify-center text-white hover:bg-blue-500 hover:scale-105 active:scale-95 transition-all`}
            >
                <Plus className="w-8 h-8" strokeWidth={3} />
            </button>
         </div>
      );
  };

  const renderSettingsContent = () => {
    switch (settingsTab) {
        case 'display': return ( <div className="space-y-4"><h3 className={`text-xl font-bold mb-4 border-b ${t.borderCard} pb-2 ${t.textMain}`}>Màn hình (Display)</h3><div className="grid grid-cols-1 gap-4"><SettingSlider theme={t} label="Độ sáng (Brightness)" value={85} min={0} max={100} /><div className={`flex items-center justify-between p-4 lg:p-5 ${theme === 'dark' ? 'bg-slate-800' : 'bg-gray-100'} border ${t.borderCard} rounded-xl`}><div className="flex items-center gap-3">{theme === 'light' ? <Sun className="w-6 h-6 text-orange-500" /> : <Moon className="w-6 h-6 text-blue-400" />}<span className={`font-bold text-base lg:text-lg ${t.textMain}`}>Giao diện (Theme)</span></div><div className="flex bg-slate-700/20 p-1 rounded-lg"><button onClick={() => setTheme('light')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${theme === 'light' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}><Sun className="w-4 h-4" /> Sáng</button><button onClick={() => setTheme('dark')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${theme === 'dark' ? 'bg-slate-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}><Moon className="w-4 h-4" /> Tối</button></div></div><SettingToggle theme={t} label="Chế độ ban đêm tự động" active={false} /></div></div> );
        case 'vehicle': return ( <div className="space-y-4"><h3 className={`text-xl font-bold mb-4 border-b ${t.borderCard} pb-2 ${t.textMain}`}>Cấu hình Xe (Vehicle)</h3><div className="grid grid-cols-2 gap-4"><SettingInput theme={t} label="Vehicle Type" value="Tractor 4WD" /><SettingInput theme={t} label="Wheelbase" value="285 cm" /><SettingInput theme={t} label="Antenna Height" value="320 cm" /><SettingInput theme={t} label="Antenna Offset (X)" value="0 cm" /><SettingInput theme={t} label="Rear Hitch Length" value="110 cm" /><SettingInput theme={t} label="Turning Radius" value="6.5 m" /></div></div> );
        case 'implement': return ( <div className="space-y-4"><h3 className={`text-xl font-bold mb-4 border-b ${t.borderCard} pb-2 ${t.textMain}`}>Nông cụ (Implement)</h3><div className="grid grid-cols-2 gap-4"><SettingInput theme={t} label="Implement Name" value="Planter_6R" /><SettingInput theme={t} label="Working Width" value="450 cm" /><SettingInput theme={t} label="Overlap" value="10 cm" /><SettingInput theme={t} label="Lateral Offset" value="0 cm" /><SettingInput theme={t} label="Delay On" value="0.5 s" /><SettingInput theme={t} label="Delay Off" value="0.2 s" /></div></div> );
        case 'guidance': return ( <div className="space-y-4"><h3 className={`text-xl font-bold mb-4 border-b ${t.borderCard} pb-2 ${t.textMain}`}>Dẫn hướng (Guidance)</h3><div className="grid grid-cols-1 gap-4"><SettingSlider theme={t} label="Steering Sensitivity" value={75} min={0} max={100} /><SettingSlider theme={t} label="Line Acquisition Aggressiveness" value={60} min={0} max={100} /><SettingToggle theme={t} label="Enable U-Turn" active={true} /><SettingToggle theme={t} label="Terrain Compensation" active={true} /></div></div> );
        case 'rtk': return ( <div className="space-y-4"><h3 className={`text-xl font-bold mb-4 border-b ${t.borderCard} pb-2 ${t.textMain}`}>Kết nối RTK (GNSS)</h3><div className={`${theme === 'dark' ? 'bg-slate-800' : 'bg-gray-100'} p-4 rounded-lg border ${t.borderCard} mb-4`}><div className="flex items-center justify-between mb-2"><span className={`text-sm ${t.textSub}`}>Status</span><span className="text-green-500 font-bold">CONNECTED</span></div><div className={`h-2 ${theme === 'dark' ? 'bg-slate-700' : 'bg-gray-300'} rounded-full overflow-hidden`}><div className="h-full bg-green-500 w-[95%]"></div></div></div><div className="grid grid-cols-2 gap-4"><SettingInput theme={t} label="NTRIP Host" value="rtk.sveaverken.com" /><SettingInput theme={t} label="Port" value="2101" /><SettingInput theme={t} label="Mountpoint" value="VRS_RTCM32" /><SettingInput theme={t} label="User" value="user123" /></div></div> );
        default: return <div className={t.textDim}>Select a menu item</div>;
    }
  };

  const renderLinesPanel = () => {
    const activeField = fields.find(f => f.id === selectedFieldId);
    const lines = activeField?.lines || [];

    return (
        <div className={`flex-1 p-8 flex flex-col ${t.textMain}`}>
             <div className="mb-6 flex items-center gap-2">
                 <h3 className="text-xl font-bold flex items-center gap-2"><Route className="w-6 h-6 text-blue-500"/> Guidance Lines</h3>
             </div>
             <div className="flex-1 overflow-y-auto space-y-4">
                 <div className={`p-6 rounded-xl border ${t.borderCard} ${t.bgPanel}`}>
                    <div className="flex justify-between items-center mb-4"><h4 className={`font-bold uppercase ${t.textSub}`}>Saved Lines for {activeField.name}</h4></div>
                    {lines && lines.length > 0 ? (
                            <div className="space-y-2">
                            {lines.map((l) => (
                                <div key={l.id} className={`flex items-center justify-between p-3 rounded-lg border ${t.borderCard}`}>
                                    <div className="flex items-center gap-3">{l.type === 'CURVE' ? <Spline className="w-5 h-5 text-purple-500" /> : <GitCommitHorizontal className="w-5 h-5 text-blue-500" />}<span className={t.textMain}>{l.name}</span></div>
                                    <div className="flex items-center gap-2"><span className={`text-xs ${t.textSub}`}>{l.date}</span><button onClick={() => handleLoadLine(l)} className={`px-3 py-1 rounded text-xs font-bold ${activeLineId === l.id ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>{activeLineId === l.id ? 'Active' : 'Load'}</button></div>
                                </div>
                            ))}
                            </div>
                    ) : (<div className={`text-center py-4 ${t.textDim}`}>No lines saved</div>)}
                 </div>
                 
                 <button onClick={() => { setLinesPanelOpen(false); setLineModeModalOpen(true); }} className="w-full py-4 rounded-xl border-2 border-dashed border-blue-500/50 text-blue-500 font-bold hover:bg-blue-500/10 flex flex-col items-center gap-2">
                    <Plus className="w-6 h-6" /><span>Create New Line</span>
                 </button>
             </div>
        </div>
    );
  };

  const renderFieldManager = () => {
      const activeField = fields.find(f => f.id === selectedFieldId);
      
      let rightContent;
      if (viewMode === 'CREATE_FIELD') {
          rightContent = (
              <div className="flex-1 flex flex-col p-8 overflow-y-auto">
                  <div className="mb-6 flex items-center gap-2"><button onClick={() => setViewMode('LIST')} className={`p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800`}><ArrowLeftRight className="w-5 h-5 rotate-180" /></button><h3 className="text-xl font-bold">Create New Field</h3></div>
                  <div className="max-w-2xl w-full space-y-6">
                      <div><label className={`block text-sm font-bold mb-2 ${t.textSub}`}>FIELD NAME</label><input type="text" value={newFieldName} onChange={e => setNewFieldName(e.target.value)} placeholder="Ex: South Farm 02" className={`w-full p-4 rounded-xl border ${t.borderCard} ${t.bgInput} focus:border-blue-500 outline-none`} /></div>
                      <div className={`p-6 rounded-xl border ${t.borderCard} ${t.bgPanel}`}><div className="flex justify-between items-center mb-4"><span className="font-bold">Boundaries Recorded</span><span className={`text-xs ${currentFieldBoundaries.length > 0 ? 'text-green-500' : 'text-orange-500'}`}>{currentFieldBoundaries.length} loops saved</span></div><div className="space-y-3">{currentFieldBoundaries.length > 0 && <div className="h-20 bg-green-500/10 rounded-lg flex items-center justify-center border border-green-500/30 text-green-600 font-bold mb-2"><CheckCircle2 className="w-6 h-6 mr-2"/> {currentFieldBoundaries.length} Boundaries Ready</div>}<button onClick={startBoundaryRecording} className="w-full py-4 rounded-xl border-2 border-dashed border-blue-500/50 text-blue-500 font-bold hover:bg-blue-500/10 flex flex-col items-center gap-2"><Tractor className="w-8 h-8" /><span>{currentFieldBoundaries.length > 0 ? "Record Another Boundary" : "Drive to Record Boundary"}</span></button></div></div>
                      <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-4"><button onClick={() => setViewMode('LIST')} className="px-6 py-3 rounded-xl border font-bold text-slate-500">Cancel</button><button onClick={saveNewField} className="px-8 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 shadow-lg">Save Field</button></div>
                  </div>
              </div>
          );
      } else if (viewMode === 'CREATE_TASK') {
          rightContent = (
              <div className="flex-1 flex flex-col p-8 overflow-y-auto">
                  <div className="mb-6 flex items-center gap-2"><button onClick={() => setViewMode('LIST')} className={`p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800`}><ArrowLeftRight className="w-5 h-5 rotate-180" /></button><h3 className="text-xl font-bold">New Task</h3></div>
                  <div className="grid grid-cols-2 gap-6 max-w-2xl"><TaskOptionButton icon={Tractor} label="Tillage / Plowing" onClick={() => saveNewTask("Tillage")} t={t} /><TaskOptionButton icon={Sprout} label="Planting / Seeding" onClick={() => saveNewTask("Planting")} t={t} /><TaskOptionButton icon={Droplets} label="Spraying" onClick={() => saveNewTask("Spraying")} t={t} /><TaskOptionButton icon={Scissors} label="Harvesting" onClick={() => saveNewTask("Harvesting")} t={t} /></div>
              </div>
          );
      } else if (activeField) {
          // OVERVIEW MODE
          const boundaries = activeField.boundaries || [];
          const lines = activeField.lines || [];
          rightContent = (
              <div className="flex-1 flex flex-col h-full">
                  <div className={`p-6 border-b ${t.divider} flex justify-between items-center`}><h3 className={`text-lg font-bold uppercase ${t.textSub}`}>{activeField.name} OVERVIEW</h3><button onClick={() => setFieldManagerOpen(false)} className={`p-2 rounded-lg border ${t.borderCard} hover:bg-slate-200 dark:hover:bg-slate-800`}><X className={`w-6 h-6 ${t.textMain}`} /></button></div>
                  <div className="flex-1 p-8 overflow-y-auto space-y-8">
                        {/* BOUNDARIES SECTION */}
                        <div className={`p-6 rounded-xl border ${t.borderCard} ${t.bgPanel}`}>
                            <div className="flex justify-between items-center mb-4"><h4 className={`font-bold uppercase ${t.textSub}`}>Boundaries</h4><button onClick={startBoundaryRecording} className="text-sm font-bold text-blue-500 hover:underline flex items-center gap-1"><Plus className="w-4 h-4"/> Add Boundary</button></div>
                            {boundaries.length > 0 ? (
                                <div className="space-y-2">{boundaries.map((b, i) => (<button key={i} onClick={() => setActiveBoundaryIdx(i)} className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${activeBoundaryIdx === i ? t.selectedItem : `${t.borderCard} hover:brightness-95`}`}><div className="flex items-center gap-3"><MapIcon className={`w-5 h-5 ${activeBoundaryIdx === i ? 'text-blue-500' : t.textDim}`} /><span className={t.textMain}>{b.name || `Boundary ${i + 1}`}</span></div>{activeBoundaryIdx === i && <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded">Active</span>}</button>))}</div>
                            ) : (<div className={`text-center py-4 ${t.textDim} border-2 border-dashed border-slate-500/30 rounded-lg`}>No boundaries</div>)}
                        </div>
                        {/* LINES SECTION */}
                        <div className={`p-6 rounded-xl border ${t.borderCard} ${t.bgPanel}`}>
                            <div className="flex justify-between items-center mb-4"><h4 className={`font-bold uppercase ${t.textSub}`}>Saved Lines</h4></div>
                            {lines && lines.length > 0 ? ( <div className="space-y-2">{lines.map((l) => (<div key={l.id} className={`flex items-center justify-between p-3 rounded-lg border ${t.borderCard}`}><div className="flex items-center gap-3">{l.type === 'CURVE' ? <Spline className="w-5 h-5 text-purple-500" /> : <GitCommitHorizontal className="w-5 h-5 text-blue-500" />}<span className={t.textMain}>{l.name}</span></div><div className="flex items-center gap-2"><span className={`text-xs ${t.textSub}`}>{l.date}</span><button onClick={() => handleLoadLine(l)} className={`px-3 py-1 rounded text-xs font-bold ${activeLineId === l.id ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>{activeLineId === l.id ? 'Active' : 'Load'}</button></div></div>))}</div>) : (<div className={`text-center py-4 ${t.textDim}`}>No lines saved</div>)}
                        </div>
                        {/* TASKS SECTION */}
                        <div className={`p-6 rounded-xl border ${t.borderCard} ${t.bgPanel}`}>
                            <div className="flex justify-between items-center mb-4"><h4 className={`font-bold uppercase ${t.textSub}`}>Tasks History</h4><button onClick={startTaskCreation} className="text-sm font-bold text-blue-500 hover:underline flex items-center gap-1"><Plus className="w-4 h-4"/> New Task</button></div>{activeField.tasks.length > 0 ? (<div className="space-y-2">{activeField.tasks.map(task => (<div key={task.id} className={`flex items-center justify-between p-4 rounded-lg border transition-all ${activeTaskId === task.id ? 'border-green-500 bg-green-500/10' : t.borderCard}`}><div className="flex items-center gap-4"><div className="p-2 rounded bg-blue-500/20 text-blue-500">{task.type === 'Planting' ? <Sprout className="w-5 h-5"/> : task.type === 'Spraying' ? <Droplets className="w-5 h-5"/> : <Tractor className="w-5 h-5"/>}</div><div><div className={`font-bold ${t.textMain}`}>{task.name}</div><div className={`text-xs ${t.textSub}`}>{task.date} • {task.status}</div></div></div><div className="flex gap-2">{activeTaskId === task.id ? (<><button onClick={() => handleTaskAction(task, 'pause')} className="p-2 bg-orange-500/20 text-orange-500 rounded-lg hover:bg-orange-500/30"><Pause className="w-4 h-4" /></button><button onClick={() => handleTaskAction(task, 'finish')} className="p-2 bg-green-500/20 text-green-500 rounded-lg hover:bg-green-500/30"><CheckSquare className="w-4 h-4" /></button></>) : (task.status !== 'Done' && (<button onClick={() => handleTaskAction(task, 'start')} className="p-2 bg-blue-500/20 text-blue-500 rounded-lg hover:bg-blue-500/30"><PlayCircle className="w-4 h-4" /></button>))}</div></div>))}</div>) : (<div className={`text-center py-8 ${t.textDim}`}>No tasks recorded yet.</div>)}</div>
                  </div>
                  <div className={`p-6 border-t ${t.divider} flex justify-end gap-4 ${theme === 'dark' ? 'bg-slate-900/50' : 'bg-white/50'}`}><button onClick={handleDeleteField} className={`px-6 py-3 rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/10 flex items-center gap-2`}><Trash2 className="w-5 h-5" /> Delete</button><button onClick={handleLoadField} className="px-8 py-3 rounded-lg bg-green-600 text-white font-bold hover:bg-green-500 shadow-lg shadow-green-900/20 flex items-center gap-2"><CheckCircle2 className="w-5 h-5" /> Load Field</button></div>
              </div>
          );
      } else {
          rightContent = <div className="flex-1 flex items-center justify-center text-slate-500">Select a field to view details</div>;
      }

      return (
          <div className="flex h-full">
              <div className={`w-[35%] border-r ${t.border} ${t.bgPanel} flex flex-col`}>
                  <div className={`p-6 border-b ${t.divider}`}><h2 className={`text-xl font-bold flex items-center gap-3 ${t.textMain}`}><LayoutGrid className="w-6 h-6 text-blue-500" />Field Manager</h2></div>
                  <div className="p-4"><button onClick={startFieldCreation} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold flex justify-center gap-2 hover:bg-blue-500"><Plus className="w-5 h-5" /> New Field</button></div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-2">{fields.map(f => (<button key={f.id} onClick={() => { setSelectedFieldId(f.id); setViewMode('LIST'); }} className={`w-full text-left p-4 rounded-xl border transition-all ${selectedFieldId === f.id ? t.selectedItem : `${t.bgCard} ${t.border} hover:brightness-95`}`}><div className="flex justify-between items-start"><div className="flex gap-3"><div className={`w-10 h-10 rounded-lg flex items-center justify-center ${selectedFieldId === f.id ? 'bg-blue-500 text-white' : 'bg-slate-300 dark:bg-slate-800 text-slate-500'}`}><MapIcon className="w-6 h-6" /></div><div><h4 className={`font-bold ${t.textMain}`}>{f.name}</h4><span className={`text-xs ${t.textSub}`}>{f.area}</span></div></div>{selectedFieldId === f.id && <CheckCircle2 className="w-5 h-5 text-blue-500" />}</div></button>))}</div>
              </div>
              <div className={`flex-1 flex flex-col ${theme === 'dark' ? 'bg-slate-950' : 'bg-gray-50'}`}>{rightContent}</div>
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
                <div className={`absolute inset-0 ${t.bgMain} z-0 overflow-hidden transition-colors duration-500`} 
                     onMouseDown={handleMapMouseDown}
                     onMouseMove={handleMapMouseMove}
                     onMouseUp={handleMapMouseUp}
                     onMouseLeave={handleMapMouseUp}
                     style={{ cursor: isDraggingMap ? 'grabbing' : 'grab' }}>
                    
                    {/* Fixed Map (North Up) - Only scale applies here */}
                    <div className="absolute w-full h-full" style={{ transformOrigin: '50% 60%', transform: `scale(${zoomLevel})`, transition: 'transform 0.1s linear' }}>
                        <div className="absolute w-full h-full" style={{ transform: `translate(${-worldPos.x + dragOffset.x}px, ${-worldPos.y + dragOffset.y}px)`, transition: isDraggingMap ? 'none' : 'transform 0.05s linear' }}>
                            <div className="absolute -top-[10000px] -left-[10000px] w-[20000px] h-[20000px] opacity-20" style={{ backgroundImage: `linear-gradient(${t.gridColor1} 1px, transparent 1px), linear-gradient(90deg, ${t.gridColor1} 1px, transparent 1px)`, backgroundSize: '50px 50px' }}></div>
                            
                            {/* RENDER TEMP BOUNDARY WHILE RECORDING */}
                            {isRecordingBoundary && tempBoundary.map((pt, i) => <div key={i} className="absolute w-2 h-2 bg-orange-500 rounded-full" style={{ left: `calc(50% + ${pt.x}px)`, top: `calc(60% + ${pt.y}px)` }} />)}
                            
                            {/* RENDER SAVED BOUNDARIES (LOADED FIELD & NEW FIELD CREATION) */}
                            <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none">
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
                            </svg>


                            {coverageTrail.map((point, i) => <div key={i} className="absolute bg-green-500/30" style={{ left: `calc(50% + ${point.x}px)`, top: `calc(60% + ${point.y}px)`, width: '20px', height: '20px', transform: `translate(-50%, -50%) rotate(${point.h}deg) scale(6, 1)` }}></div>)}
                            
                            {/* CLOSING LOOP LINE (Visual Guide) */}
                            {isRecordingBoundary && tempBoundary.length > 0 && (
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
                                    {!guidanceLine && pointA && lineType === 'STRAIGHT_AB' && <line x1={pointA.x} y1={pointA.y} x2={worldPos.x} y2={worldPos.y} stroke="red" strokeWidth="3" />}
                                    {isRecordingCurve && <polyline points={curvePoints.map(p => `${p.x},${p.y}`).join(' ') + ` ${worldPos.x},${worldPos.y}`} fill="none" stroke="red" strokeWidth="3" />}
                                    {!guidanceLine && pivotCenter && lineType === 'PIVOT' && <line x1={pivotCenter.x} y1={pivotCenter.y} x2={worldPos.x} y2={worldPos.y} stroke="red" strokeWidth="3" />}
                                    {renderGuidanceLine()}
                                </g>
                            </svg>

                            {/* CURVE & PIVOT DOTS/CIRCLES */}
                            {(guidanceLine === 'CURVE' || isRecordingCurve) && curvePoints.map((pt, i) => <div key={i} className="absolute w-2 h-2 bg-blue-400 rounded-full" style={{ left: `calc(50% + ${pt.x}px)`, top: `calc(60% + ${pt.y}px)` }}></div>)}
                            {guidanceLine === 'PIVOT' && pivotCenter && pivotRadius && [0, 1].map(offset => (<div key={offset} className="absolute border-2 border-blue-500/30 rounded-full" style={{left: `calc(50% + ${pivotCenter.x}px)`, top: `calc(60% + ${pivotCenter.y}px)`, width: `${(pivotRadius + offset * 120) * 2}px`, height: `${(pivotRadius + offset * 120) * 2}px`, transform: 'translate(-50%, -50%)'}}></div>))}

                            {pointA && <div className="absolute flex flex-col items-center" style={{ left: `calc(50% + ${pointA.x}px)`, top: `calc(60% + ${pointA.y}px)`, transform: 'translate(-50%, -50%)' }}><div className="w-6 h-6 bg-blue-600 rounded-full border-2 border-white shadow-lg text-white flex items-center justify-center font-bold text-xs">A</div></div>}
                            {/* A+ Point Marker */}
                            {aPlusPoint && <div className="absolute flex flex-col items-center" style={{ left: `calc(50% + ${aPlusPoint.x}px)`, top: `calc(60% + ${aPlusPoint.y}px)`, transform: 'translate(-50%, -50%)' }}><div className="w-6 h-6 bg-purple-600 rounded-full border-2 border-white shadow-lg text-white flex items-center justify-center font-bold text-xs">A+</div></div>}
                            
                            {pointB && <div className="absolute flex flex-col items-center" style={{ left: `calc(50% + ${pointB.x}px)`, top: `calc(60% + ${pointB.y}px)`, transform: 'translate(-50%, -50%)' }}><div className="w-6 h-6 bg-blue-600 rounded-full border-2 border-white shadow-lg text-white flex items-center justify-center font-bold text-xs">B</div></div>}
                        
                            {/* TRACTOR INSIDE MAP - Rotates based on heading */}
                             <div 
                                className="absolute flex flex-col items-center pointer-events-none" 
                                style={{ 
                                    left: `calc(50% + ${worldPos.x}px)`, 
                                    top: `calc(60% + ${worldPos.y}px)`, 
                                    transform: `translate(-50%, -50%) rotate(${heading}deg)`,
                                    transformOrigin: 'center center' // Ensure it rotates around its center
                                }}
                             >
                                <div className="relative group scale-100 lg:scale-110">
                                    <TractorVehicle mode={steeringMode} steeringAngle={steeringAngle} />
                                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-blue-400/50"></div>
                                </div>
                            </div>
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

                    <div className="absolute right-24 bottom-32 z-20 flex flex-col gap-2"><button onClick={() => handleZoom('in')} className={`p-2 ${t.bgCard} backdrop-blur border ${t.borderCard} rounded-lg ${t.textMain}`}><Plus className="w-6 h-6"/></button><button onClick={() => handleZoom('out')} className={`p-2 ${t.bgCard} backdrop-blur border ${t.borderCard} rounded-lg ${t.textMain}`}><Minus className="w-6 h-6"/></button></div>
                </div>

                {/* TOP HEADER */}
                <header className={`h-[10%] min-h-[40px] ${t.bgHeader} backdrop-blur-md flex items-center justify-between px-[3%] z-20 border-b ${t.border}`}>
                    <div className="flex items-center gap-[4%] w-1/3"><div className="flex flex-col"><div className={`flex items-center gap-2 text-[10px] lg:text-xs ${t.textSub} uppercase tracking-wider font-bold`}><Layers className="w-3 h-3" /><span>Field / Task</span></div><div className="flex items-center gap-1 lg:gap-2"><span className={`${t.textMain} font-bold text-xs lg:text-base`}>{loadedField ? loadedField.name : "No Field Loaded"}</span><span className={t.textDim}>/</span><span className={`text-blue-500 font-bold text-xs lg:text-base`}>{activeTaskId ? fields.find(f => f.id === selectedFieldId)?.tasks.find(t => t.id === activeTaskId)?.name : "No Active Task"}</span></div></div></div>
                    <div className="flex-1 flex justify-center"><div className={`flex items-center gap-4 px-6 py-1.5 rounded-xl border-2 ${Math.abs(crossTrackError)>5?'bg-red-900/20 border-red-500':`${theme==='dark'?'bg-slate-900/60':'bg-white/60'} ${t.borderCard}`}`}><ArrowLeftRight className={`w-5 h-5 ${t.textDim}`}/><div className="flex flex-col items-center w-28"><span className={`text-4xl font-black ${t.textMain}`}>{Math.abs(crossTrackError).toFixed(1)}</span></div><ArrowLeftRight className={`w-5 h-5 ${t.textDim}`}/></div></div>
                    <div className="flex items-center justify-end gap-6 w-1/3">
                        <div className="hidden lg:flex flex-col items-end mr-2"><span className={`font-bold ${t.textMain}`}>{getDisplayHeading()}°</span><span className={`text-xs ${t.textSub}`}>Heading</span></div>
                        <div className="flex flex-col items-end mr-2"><div className={`flex items-center gap-1 ${t.textMain}`}><Globe className="w-3 h-3 lg:w-4 lg:h-4 text-blue-500" /><span className="text-sm lg:text-base font-bold font-mono">{satelliteCount}</span></div><span className={`text-[9px] lg:text-[10px] ${t.textDim}`}>Sats</span></div>
                        <div className={`px-3 py-1 rounded border min-w-[70px] ${getRtkColor()}`}><span className="text-xs font-black">{rtkStatus}</span></div>
                    </div>
                </header>

                {/* BOTTOM BAR */}
                <div className={`absolute bottom-0 left-0 right-0 h-[14%] min-h-[70px] ${t.bgBottom} backdrop-blur-xl border-t ${t.border} flex items-center justify-between px-[3%] z-30`}>
                    {/* Left Buttons */}
                    <div className="flex gap-4 h-full py-2">
                        <button className={`h-full aspect-square rounded-xl border ${t.borderCard} flex flex-col items-center justify-center ${theme==='dark'?'bg-slate-900':'bg-gray-100'}`}><CornerUpLeft className={`w-8 h-8 ${t.textDim}`}/><span className={`text-xs font-bold ${t.textSub}`}>U-TURN</span></button>
                        <button onClick={() => setIsRecording(!isRecording)} className={`h-full aspect-[4/3] rounded-xl border flex flex-col items-center justify-center ${isRecording?'bg-red-900/20 border-red-500 text-red-500':`${theme==='dark'?'bg-slate-900 border-slate-700':'bg-gray-100 border-gray-300'} ${t.textDim}`}`}><div className={`w-4 h-4 rounded-full ${isRecording?'bg-red-500 animate-pulse':'bg-slate-500'}`}/><span className="text-xs font-black tracking-widest">{isRecording?'REC':'OFF'}</span></button>
                    </div>
                    {/* Center Info */}
                    <div className="flex flex-col items-center"><div className="flex items-end gap-8 pb-2"><div className="text-center"><div className={`text-4xl font-bold ${t.textMain}`}>{Math.abs(speed).toFixed(1)}</div><div className={`text-xs ${t.textSub} uppercase font-bold`}>km/h</div></div><div className={`w-px h-10 ${t.divider}`}></div><div className="text-center"><div className={`text-2xl font-bold ${theme==='dark'?'text-slate-300':'text-slate-600'}`}>{workedArea.toFixed(2)}</div><div className={`text-xs ${t.textSub} uppercase font-bold`}>Ha Done</div></div></div></div>
                    {/* Engage Button */}
                    <button onClick={toggleSteering} className={`h-[80%] w-[260px] rounded-2xl flex items-center justify-between px-6 shadow-2xl active:scale-95 border ${steeringMode==='AUTO'?'bg-green-600 border-green-400':`${theme==='dark'?'bg-slate-800 border-slate-600':'bg-gray-800 border-gray-600'}`}`}><div className="flex flex-col items-start"><span className={`text-xs font-bold uppercase ${steeringMode==='AUTO'?'text-green-200':'text-slate-400'}`}>System</span><span className={`text-2xl font-black ${steeringMode==='AUTO'?'text-white':'text-white'}`}>{steeringMode==='AUTO'?'ENGAGED':'READY'}</span></div><div className={`w-14 h-14 rounded-full flex items-center justify-center ${steeringMode==='AUTO'?'bg-white/20 text-white':'bg-black/20 text-slate-400'}`}><SteeringWheelIcon className={`w-9 h-9 ${steeringMode==='AUTO'?'animate-spin-slow':''}`}/></div></button>
                </div>

                {/* MODALS */}
                {fieldManagerOpen && <div className={`absolute inset-0 ${theme === 'dark' ? 'bg-slate-950/95' : 'bg-gray-100/95'} z-40 flex overflow-hidden`}>{renderFieldManager()}</div>}
                
                {/* NEW: LINES PANEL */}
                {linesPanelOpen && (
                    <div className={`absolute inset-0 ${theme === 'dark' ? 'bg-slate-950/95' : 'bg-gray-100/95'} z-40 flex overflow-hidden`}>
                        <div className={`w-[25%] border-r ${t.border} ${t.bgPanel} flex flex-col p-6`}>
                           <h3 className={`text-xl font-bold ${t.textMain} mb-4`}>Guidance Lines</h3>
                           <p className={`${t.textSub} text-sm mb-6`}>Manage guidance lines for the current field.</p>
                           <button onClick={() => setLinesPanelOpen(false)} className={`w-full py-3 rounded-lg border ${t.borderCard} ${t.textMain} hover:brightness-95`}>Close Panel</button>
                        </div>
                        {renderLinesPanel()}
                    </div>
                )}
                
                {settingsOpen && <div className={`absolute inset-0 ${theme === 'dark' ? 'bg-slate-950/95' : 'bg-gray-100/95'} z-40 flex overflow-hidden`}><div className={`w-[25%] border-r ${t.border} ${t.bgPanel} flex flex-col`}><div className={`p-6 border-b ${t.divider}`}><h2 className={`text-xl lg:text-2xl font-bold flex items-center gap-3 ${t.textMain}`}><Settings className="w-6 h-6 lg:w-7 lg:h-7 text-blue-500" />Settings</h2></div><nav className="flex-1 overflow-y-auto p-4 space-y-2"><SettingsTab theme={t} label="Display" icon={Monitor} active={settingsTab === 'display'} onClick={() => setSettingsTab('display')} /><SettingsTab theme={t} label="Vehicle" icon={Tractor} active={settingsTab === 'vehicle'} onClick={() => setSettingsTab('vehicle')} /><SettingsTab theme={t} label="Implement" icon={Ruler} active={settingsTab === 'implement'} onClick={() => setSettingsTab('implement')} /><SettingsTab theme={t} label="Guidance" icon={Navigation} active={settingsTab === 'guidance'} onClick={() => setSettingsTab('guidance')} /><SettingsTab theme={t} label="RTK / GNSS" icon={Radio} active={settingsTab === 'rtk'} onClick={() => setSettingsTab('rtk')} /></nav></div><div className={`flex-1 flex flex-col ${theme === 'dark' ? 'bg-slate-950' : 'bg-gray-50'}`}><div className={`flex items-center justify-between p-6 lg:p-8 border-b ${t.divider} ${theme === 'dark' ? 'bg-slate-900/50' : 'bg-white/50'}`}><h3 className={`text-lg lg:text-xl font-medium ${t.textSub} uppercase tracking-widest`}>{settingsTab} CONFIGURATION</h3><button onClick={() => setSettingsOpen(false)} className={`p-2 lg:p-3 ${t.activeItem} hover:brightness-95 rounded-lg border ${t.borderCard}`}><X className={`w-5 h-5 lg:w-6 lg:h-6 ${t.textMain}`} /></button></div><div className="flex-1 p-6 lg:p-10 overflow-y-auto"><div className="max-w-4xl">{renderSettingsContent()}</div></div><div className={`p-4 lg:p-6 border-t ${t.divider} flex justify-end gap-4 ${theme === 'dark' ? 'bg-slate-900/50' : 'bg-white/50'}`}><button className={`px-6 lg:px-8 py-2 lg:py-3 rounded-lg border ${t.borderCard} ${t.textMain} hover:brightness-95 text-base lg:text-lg`}>Cancel</button><button className="px-6 lg:px-8 py-2 lg:py-3 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-500 shadow-lg shadow-blue-900/20 text-base lg:text-lg">Save Changes</button></div></div></div>}
                {menuOpen && !fieldManagerOpen && !lineModeModalOpen && !linesPanelOpen && !manualHeadingModalOpen && !boundaryAlertOpen && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6"><div className={`${t.bgPanel} rounded-2xl w-full max-w-lg border ${t.borderCard} shadow-2xl flex flex-col max-h-[85vh]`}><div className={`p-4 border-b ${t.divider} flex justify-between items-center`}><div className="flex items-center gap-2"><Menu className="w-5 h-5 text-blue-500" /><h3 className={`font-bold text-lg ${t.textMain}`}>Quick Menu</h3></div><button onClick={() => setMenuOpen(false)} className={`px-3 py-1 ${theme === 'dark' ? 'bg-slate-800' : 'bg-gray-100'} rounded-lg text-xs hover:brightness-95 border ${t.borderCard} ${t.textMain}`}>Close</button></div><div className="p-4 grid grid-cols-2 gap-3 overflow-y-auto"><div className={`col-span-2 p-3 rounded-xl border ${t.borderCard} ${theme === 'dark' ? 'bg-slate-900' : 'bg-white'}`}><div className="flex items-center gap-2 mb-3"><Gauge className="w-5 h-5 text-orange-500" /><span className={`font-bold ${t.textMain} text-sm`}>Manual Drive</span></div><div className="grid grid-cols-2 gap-4"><div className="flex flex-col gap-1"><span className={`text-[10px] ${t.textSub} uppercase font-bold`}>Speed</span><div className="flex items-center gap-2"><input type="range" min="-5" max="15" value={manualTargetSpeed} onChange={(e) => updateManualSpeed(Number(e.target.value))} className="w-full accent-orange-500 h-1.5 bg-slate-600 rounded-lg appearance-none cursor-pointer" /><span className={`font-mono font-bold text-lg w-12 text-center ${t.textMain}`}>{manualTargetSpeed}</span></div></div><div className="flex flex-col gap-1"><span className={`text-[10px] ${t.textSub} uppercase font-bold`}>Steering ({steeringAngle}°)</span><div className="flex items-center gap-1"><button onClick={() => updateSteering(Math.max(steeringAngle - 5, -35))} className={`p-1.5 rounded-lg border ${t.borderCard} hover:bg-orange-500/20 active:scale-95`}><RotateCcw className={`w-4 h-4 ${t.textMain}`} /></button><input type="range" min="-35" max="35" value={steeringAngle} onChange={(e) => updateSteering(Number(e.target.value))} className="w-full accent-blue-500 h-1.5 bg-slate-600 rounded-lg appearance-none cursor-pointer" /><button onClick={() => updateSteering(Math.min(steeringAngle + 5, 35))} className={`p-1.5 rounded-lg border ${t.borderCard} hover:bg-orange-500/20 active:scale-95`}><RotateCw className={`w-4 h-4 ${t.textMain}`} /></button></div></div></div><p className={`text-[10px] ${t.textSub} mt-2 text-center`}>*Arrow Keys: ↑ ↓ ← →</p></div><QuickAction theme={t} icon={Video} label="Camera" sub="Monitor" /><QuickAction theme={t} icon={AlertTriangle} label="Diagnostics" sub="Errors" /><QuickAction theme={t} icon={Ruler} label="Implement" sub="Width" /><QuickAction theme={t} icon={LocateFixed} label="Calibrate" sub="IMU" /><QuickAction theme={t} icon={Activity} label="Terrain" sub="Comp." /><QuickAction theme={t} icon={Save} label="Save Line" sub="Track" /><QuickAction theme={t} icon={Navigation} label="NMEA" sub="Out" /></div></div></div>
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
                                    <span className={`text-2xl font-bold ${t.textSub}`}>°</span>
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
                                <button onClick={() => {setBoundaryNameModalOpen(false); setDockMenuOpen(true); setIsRecordingBoundary(false); setTempBoundary([])}} className={`px-6 py-2 rounded-lg border ${t.borderCard} ${t.textSub} font-bold`}>Cancel</button>
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
                                {boundaryAlertType === 'AUTO_CLOSE' ? 'Đóng vòng biên?' : 'Biên chưa khép kín'}
                            </h3>
                            <p className={`${t.textSub} mb-6`}>
                                {boundaryAlertType === 'AUTO_CLOSE' 
                                    ? 'Xe đang ở gần điểm bắt đầu. Bạn có muốn tự động nối biên thành một vòng khép kín?' 
                                    : 'Xe chưa chạy cắt qua đường biên cũ. Bạn muốn tiếp tục chạy để hoàn thành hay hủy bỏ?'}
                            </p>
                            
                            <div className="flex justify-center gap-3">
                                {boundaryAlertType === 'AUTO_CLOSE' ? (
                                    <>
                                        <button onClick={() => handleBoundaryAlertConfirm('NO')} className={`px-6 py-2 rounded-lg border ${t.borderCard} ${t.textSub} font-bold`}>Tiếp tục chạy</button>
                                        <button onClick={() => handleBoundaryAlertConfirm('YES')} className="px-6 py-2 rounded-lg bg-green-600 text-white font-bold hover:bg-green-500">Đóng vòng</button>
                                    </>
                                ) : (
                                    <>
                                        <button onClick={() => handleBoundaryAlertConfirm('CANCEL')} className={`px-6 py-2 rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/10 font-bold`}>Hủy bỏ</button>
                                        <button onClick={() => handleBoundaryAlertConfirm('CONTINUE')} className="px-6 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-500">Tiếp tục chạy</button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {lineModeModalOpen && (
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6"><div className={`${t.bgPanel} rounded-2xl w-full max-w-2xl border ${t.borderCard} shadow-2xl p-6`}><div className="flex justify-between items-center mb-6"><h3 className={`text-xl font-bold ${t.textMain}`}>Select Guidance Mode</h3><button onClick={() => setLineModeModalOpen(false)} className={`p-2 rounded-lg hover:bg-slate-800/50 ${t.textDim}`}><X className="w-6 h-6" /></button></div><div className="grid grid-cols-2 gap-4"><button onClick={() => selectLineMode('STRAIGHT_AB')} className={`p-6 rounded-xl border ${t.borderCard} ${lineType === 'STRAIGHT_AB' ? 'bg-blue-500/10 border-blue-500' : 'hover:bg-slate-800/30'} flex flex-col items-center gap-3 transition-all`}><GitCommitHorizontal className={`w-12 h-12 ${lineType === 'STRAIGHT_AB' ? 'text-blue-500' : t.textDim}`} /><span className={`font-bold text-lg ${t.textMain}`}>Straight AB</span><span className={`text-xs ${t.textSub}`}>Standard straight line A to B</span></button><button onClick={() => selectLineMode('A_PLUS')} className={`p-6 rounded-xl border ${t.borderCard} ${lineType === 'A_PLUS' ? 'bg-blue-500/10 border-blue-500' : 'hover:bg-slate-800/30'} flex flex-col items-center gap-3 transition-all`}><ArrowUpFromDot className={`w-12 h-12 ${lineType === 'A_PLUS' ? 'text-blue-500' : t.textDim}`} /><span className={`font-bold text-lg ${t.textMain}`}>A+ Heading</span><span className={`text-xs ${t.textSub}`}>Straight line with defined heading</span></button><button onClick={() => selectLineMode('CURVE')} className={`p-6 rounded-xl border ${t.borderCard} ${lineType === 'CURVE' ? 'bg-blue-500/10 border-blue-500' : 'hover:bg-slate-800/30'} flex flex-col items-center gap-3 transition-all`}><Spline className={`w-12 h-12 ${lineType === 'CURVE' ? 'text-blue-500' : t.textDim}`} /><span className={`font-bold text-lg ${t.textMain}`}>Curve</span><span className={`text-xs ${t.textSub}`}>Adaptive curved guidance</span></button><button onClick={() => selectLineMode('PIVOT')} className={`p-6 rounded-xl border ${t.borderCard} ${lineType === 'PIVOT' ? 'bg-blue-500/10 border-blue-500' : 'hover:bg-slate-800/30'} flex flex-col items-center gap-3 transition-all`}><CircleDashed className={`w-12 h-12 ${lineType === 'PIVOT' ? 'text-blue-500' : t.textDim}`} /><span className={`font-bold text-lg ${t.textMain}`}>Pivot</span><span className={`text-xs ${t.textSub}`}>Center pivot circular pattern</span></button></div></div></div>
                )}
                {/* ACTION DOCK */}
                <div className="absolute right-[2%] top-[15%] bottom-[18%] w-[7%] min-w-[60px] z-20 flex flex-col justify-center pointer-events-none">
                    <div className="pointer-events-auto w-full flex flex-col items-end gap-2">
                        {renderActionDock()}
                    </div>
                </div>
            </main>
        </div>
    </div>
  );
};

const RailButton = ({ icon: Icon, label, active, onClick, theme, className }) => ( <button onClick={onClick} className={`flex flex-col items-center gap-1 w-full py-[15%] rounded-xl transition-all ${active ? 'bg-blue-600 text-white shadow-lg' : `${theme.textDim} hover:${theme.activeItem} hover:${theme.textMain}`} ${className || ''}`}><Icon className="w-5 h-5 lg:w-7 lg:h-7" /><span className="text-[9px] lg:text-[10px] font-bold">{label}</span></button> );
const DockButton = ({ icon: Icon, label, color, onClick, theme, className }) => { const colorClasses = { blue: 'bg-blue-500/10 text-blue-500 border-blue-500/30', green: 'bg-green-500/10 text-green-500 border-green-500/30', orange: 'bg-orange-500/10 text-orange-500 border-orange-500/30', red: 'bg-red-500/10 text-red-500 border-red-500/30', gray: theme.textMain === 'text-white' ? 'bg-slate-800 text-slate-400 border-slate-600' : 'bg-gray-100 text-slate-500 border-gray-300' }; return ( <button onClick={onClick} className={`w-full aspect-square rounded-xl flex flex-col items-center justify-center gap-1 border active:scale-95 ${colorClasses[color] || colorClasses.gray} ${className || ''}`}><Icon className="w-6 h-6" /><span className="text-[10px] font-bold">{label}</span></button> ); };
const QuickAction = ({ icon: Icon, label, sub, theme }) => ( <button className={`flex flex-col items-start p-3 ${theme.textMain === 'text-white' ? 'bg-slate-800/50 hover:bg-slate-800' : 'bg-gray-50 hover:bg-gray-100'} border ${theme.borderCard} rounded-xl hover:border-blue-500/50 transition-all group`}><div className={`p-2 ${theme.activeItem} rounded-lg mb-2 ${theme.textSub} group-hover:text-blue-500 group-hover:bg-blue-500/10 transition-colors`}><Icon className="w-5 h-5" /></div><span className={`text-sm font-bold ${theme.textMain}`}>{label}</span><span className={`text-[10px] ${theme.textSub}`}>{sub}</span></button> );
const TaskOptionButton = ({ icon: Icon, label, onClick, t }) => ( <button onClick={onClick} className={`p-6 rounded-2xl border ${t.borderCard} ${t.bgCard} hover:border-blue-500 hover:bg-blue-500/5 transition-all flex flex-col items-center gap-4 group`}><div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform"><Icon className="w-8 h-8" /></div><span className={`font-bold text-lg ${t.textMain}`}>{label}</span></button> );
const SettingsTab = ({ label, icon: Icon, active, onClick, theme }) => ( <button onClick={onClick} className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors ${active ? 'bg-blue-600 text-white' : theme.textMain}`}><div className="flex items-center gap-3"><Icon className="w-5 h-5" /><span className="text-sm font-medium">{label}</span></div>{active && <ChevronRight className="w-4 h-4" />}</button> );
const SettingInput = ({ label, value, theme }) => ( <div className="flex flex-col gap-2"><label className={`text-xs font-bold uppercase ${theme.textSub}`}>{label}</label><input type="text" defaultValue={value} className={`${theme.bgInput} border ${theme.borderCard} rounded-xl px-4 py-3 ${theme.textMain}`} /></div> );
const SettingToggle = ({ label, active, theme }) => ( <div className={`flex items-center justify-between p-4 ${theme.bgInput} border ${theme.borderCard} rounded-xl`}><span className={`font-bold ${theme.textMain}`}>{label}</span><div className={`w-12 h-7 rounded-full p-1 ${active ? 'bg-green-500' : 'bg-slate-400'}`}><div className={`w-5 h-5 rounded-full bg-white shadow-md transform ${active ? 'translate-x-5' : ''}`}></div></div></div> );
const SettingSlider = ({ label, value, min, max, theme }) => ( <div className={`flex flex-col gap-2 p-4 ${theme.bgInput} border ${theme.borderCard} rounded-xl`}><div className="flex justify-between"><span className={`font-bold ${theme.textMain}`}>{label}</span><span className="text-blue-500 font-mono">{value}%</span></div><input type="range" min={min} max={max} defaultValue={value} className="w-full accent-blue-500 h-2 bg-slate-600 rounded-lg" /></div> );

export default App;