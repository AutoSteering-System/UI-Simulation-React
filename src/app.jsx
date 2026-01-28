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
  const [settingsTab, setSettingsTab] = useState('display'); 

  // NEW: Locked Lane Index for Auto Steer
  const activeLaneRef = useRef(null);

  const [satelliteCount, setSatelliteCount] = useState(12);
  const [notification, setNotification] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(0.6); 
  const [theme, setTheme] = useState('light'); 
  const [isDraggingMap, setIsDraggingMap] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const keysPressed = useRef({});
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
        if (menuOpen || settingsOpen || (fieldManagerOpen && !isRecordingBoundary) || lineModeModalOpen || lineNameModalOpen || boundaryNameModalOpen || linesPanelOpen || manualHeadingModalOpen || boundaryAlertOpen || deleteModalOpen) return; 
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].indexOf(e.key) > -1) e.preventDefault();
        keysPressed.current[e.key] = true;
    };
    const handleKeyUp = (e) => { keysPressed.current[e.key] = false; };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); };
  }, [menuOpen, settingsOpen, fieldManagerOpen, lineModeModalOpen, isRecordingBoundary, lineNameModalOpen, boundaryNameModalOpen, linesPanelOpen, manualHeadingModalOpen, boundaryAlertOpen, deleteModalOpen]);

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
             let xte = 0;
             let lineHeading = 0;
             let validLine = false;

             if (guide.type === 'STRAIGHT_AB' && guide.points.a && guide.points.b) {
                const ax = guide.points.a.x; const ay = guide.points.a.y;
                const bx = guide.points.b.x; const by = guide.points.b.y;
                const dx = bx - ax; const dy = by - ay;
                const len = Math.hypot(dx, dy);
                
                const crossProduct = (bx - ax) * (p.y - ay) - (by - ay) * (p.x - ax);
                xte = crossProduct / len;
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
                 xte = vax * (-uy) + vay * (ux);
                 lineHeading = h;
                 validLine = true;
             }
             else if (guide.type === 'PIVOT' && guide.points.pivot && guide.points.pivot.center && guide.points.pivot.radius) {
                 const cx = guide.points.pivot.center.x;
                 const cy = guide.points.pivot.center.y;
                 const baseR = guide.points.pivot.radius;
                 const dist = Math.hypot(p.x - cx, p.y - cy);
                 xte = dist - baseR; // Raw XTE from center
                 
                 // Calculate Heading (Tangent)
                 const angleToCenter = Math.atan2(p.y - cy, p.x - cx);
                 // Assuming clockwise/counter-clockwise logic based on current heading
                 const vehicleAngle = p.heading * Math.PI / 180;
                 // Tangent is +/- 90 degrees from radial vector
                 let tan1 = angleToCenter + Math.PI/2;
                 let tan2 = angleToCenter - Math.PI/2;
                 
                 // Normalize angles
                 const normAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));
                 const diff1 = Math.abs(normAngle(tan1 - vehicleAngle));
                 const diff2 = Math.abs(normAngle(tan2 - vehicleAngle));
                 
                 // Pick closer tangent
                 lineHeading = (diff1 < diff2 ? tan1 : tan2) * 180 / Math.PI;
                 validLine = true;
             }
             else if (guide.type === 'CURVE' && guide.points.curve && guide.points.curve.length > 1) {
                 // Basic curve following: Find closest segment
                 let minDist = Infinity;
                 let bestSeg = null;
                 
                 for(let i=0; i<guide.points.curve.length-1; i++) {
                     const p1 = guide.points.curve[i];
                     const p2 = guide.points.curve[i+1];
                     const info = pointToSegmentDistance(p.x, p.y, p1.x, p1.y, p2.x, p2.y);
                     if (info.distance < minDist) {
                         minDist = info.distance;
                         bestSeg = { p1, p2, cross: info.cross };
                     }
                 }
                 
                 if (bestSeg) {
                     // Determine side (cross product)
                     const len = Math.hypot(bestSeg.p2.x - bestSeg.p1.x, bestSeg.p2.y - bestSeg.p1.y);
                     xte = bestSeg.cross / len; // Distance to Base Curve
                     
                     const dx = bestSeg.p2.x - bestSeg.p1.x;
                     const dy = bestSeg.p2.y - bestSeg.p1.y;
                     lineHeading = Math.atan2(dx, -dy) * 180 / Math.PI;
                     validLine = true;
                 }
             }

             if (validLine) {
                 // MULTI-LINE OFFSET LOGIC & LANE LOCKING
                 // Applies to ALL line types now including Curve/Pivot
                 if (guide.isMulti && guide.width > 0) {
                     let targetLaneIndex = 0;
                     
                     if (activeLaneRef.current !== null) {
                         // Use LOCKED LANE (The lane we were closest to when engaging auto)
                         targetLaneIndex = activeLaneRef.current;
                     } else {
                         // Fallback dynamic calculation (e.g. initial frame before lock set)
                         targetLaneIndex = Math.round(xte / guide.width);
                     }
                     
                     // XTE is now relative to the LOCKED lane center
                     xte = xte - (targetLaneIndex * guide.width);
                     
                 } else {
                     // SINGLE LINE MODE: Subtract manualOffset (Snap to vehicle when toggled)
                     xte = xte - guide.manualOffset;
                 }

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
             }
             
        } else {
             // MANUAL STEERING LOGIC
            const steerSpeed = 25;
            if (keysPressed.current['ArrowLeft']) p.steeringAngle = Math.max(p.steeringAngle - steerSpeed * dt, -45);
            else if (keysPressed.current['ArrowRight']) p.steeringAngle = Math.min(p.steeringAngle + steerSpeed * dt, 45);
            else {
                if (p.steeringAngle > 0) p.steeringAngle = Math.max(0, p.steeringAngle - 20 * dt);
                else if (p.steeringAngle < 0) p.steeringAngle = Math.min(0, p.steeringAngle + 20 * dt);
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
          
          if (guide && guide.points) {
              if (guide.type === 'STRAIGHT_AB' && guide.points.a && guide.points.b) {
                  const ax = guide.points.a.x; const ay = guide.points.a.y;
                  const bx = guide.points.b.x; const by = guide.points.b.y;
                  const dx = bx - ax; const dy = by - ay;
                  const len = Math.hypot(dx, dy);
                  if (len > 0) {
                      calculatedOffset = ((bx - ax) * (p.y - ay) - (by - ay) * (p.x - ax)) / len;
                  }
              } else if (guide.type === 'A_PLUS' && guide.points.aplus && guide.points.aplus.point && guide.points.aplus.heading != null) {
                  const ax = guide.points.aplus.point.x;
                  const ay = guide.points.aplus.point.y;
                  const h = guide.points.aplus.heading;
                  const rad = h * Math.PI / 180;
                  const ux = Math.sin(rad);
                  const uy = -Math.cos(rad);
                  const vax = p.x - ax; const vay = p.y - ay;
                  calculatedOffset = vax * (-uy) + vay * (ux);
              }
          }
          
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
    
    if (newMode === 'AUTO') {
        // --- 1. AUTO ENGAGED Logic ---
        
        // 1a. Lock the Lane (Calculate lane index closest to vehicle NOW)
        const guide = guidanceRef.current;
        if (guide && guide.type && guide.isMulti && guide.width > 0) {
             const p = worldPos;
             let rawXte = 0;
             
             // Calculate RAW XTE (Distance from main AB line)
             if (guide.type === 'STRAIGHT_AB' && guide.points.a && guide.points.b) {
                const ax = guide.points.a.x; const ay = guide.points.a.y;
                const bx = guide.points.b.x; const by = guide.points.b.y;
                const dx = bx - ax; const dy = by - ay;
                const len = Math.hypot(dx, dy);
                if (len > 0) {
                    rawXte = ((bx - ax) * (p.y - ay) - (by - ay) * (p.x - ax)) / len;
                }
             } else if (guide.type === 'A_PLUS' && guide.points.aplus && guide.points.aplus.point) {
                 const ax = guide.points.aplus.point.x;
                 const ay = guide.points.aplus.point.y;
                 const h = guide.points.aplus.heading;
                 const rad = h * Math.PI / 180;
                 const ux = Math.sin(rad);
                 const uy = -Math.cos(rad); 
                 const vax = p.x - ax; const vay = p.y - ay;
                 rawXte = vax * (-uy) + vay * (ux);
             } else if (guide.type === 'PIVOT' && guide.points.pivot && guide.points.pivot.center) {
                 const cx = guide.points.pivot.center.x;
                 const cy = guide.points.pivot.center.y;
                 const r = guide.points.pivot.radius;
                 const dist = Math.hypot(p.x - cx, p.y - cy);
                 rawXte = dist - r;
             } else if (guide.type === 'CURVE' && guide.points.curve) {
                 // Simplified locking for Curve: Assume 0 for now as 'closest segment' logic is heavy
                 // In a real app, you'd run the pointToSegment logic here
                 // For now, let's assume rawXte is roughly 0 relative to "some" curve, 
                 // effectively locking to nearest parallel curve if we implemented full XTE check
                 // Here we will just let the loop find the nearest curve lane
                 
                 // Reuse XTE logic from loop? No, loop runs every frame.
                 // We duplicate logic briefly or trust the loop to set it on first frame
                 // To force a lock, we really need the distance calculation here.
                 // COPY-PASTE logic from Loop for simple robustness:
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
                 rawXte = bestCross;
             }
             
             // LOCK LANE
             const nearestLaneIndex = Math.round(rawXte / guide.width);
             activeLaneRef.current = nearestLaneIndex; 
             // showNotification(`Locked to Lane ${nearestLaneIndex}`, "info");
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

  const resetLines = () => { actions.setPointA(null); actions.setPointB(null); actions.setAPlusPoint(null); actions.setAPlusHeading(null); actions.setCurvePoints([]); actions.setIsRecordingCurve(false); actions.setPivotCenter(null); actions.setPivotRadius(null); actions.setGuidanceLine(null); actions.setActiveLineId(null); };
  
  const cancelLineCreation = () => { 
      resetLines(); 
      setIsCreating(false); // EXIT CREATION MODE
      setDockMenuOpen(true); // RETURN TO DOCK MENU
      showNotification("Creation Cancelled", "info"); 
  };
  
  const updateManualSpeed = (val) => { physics.current.targetSpeed = val; setManualTargetSpeed(val); };
  const updateSteering = (val) => { physics.current.steeringAngle = val; setSteeringAngle(val); };
  const startFieldCreation = () => { actions.setViewMode('CREATE_FIELD'); actions.setNewFieldName(''); actions.setCurrentFieldBoundaries([]); };
  const handleTaskAction = (task, action) => { 
        const newStatus = action === 'start' ? 'In Progress' : action === 'pause' ? 'Paused' : 'Done'; 
        const updatedFields = fields.map(f => { 
            if (f.id === selectedFieldId) { 
                const newTasks = f.tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t); 
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
      showNotification(`Heading Set to Current: ${heading.toFixed(1)}°`, "info");
  };

  const handleSetAPlus_HeadingManual = (val) => {
      const num = parseFloat(val);
      if (isNaN(num) || num < 0 || num > 360) {
          showNotification("Invalid heading (0-360)", "warning");
          return;
      }
      actions.setAPlusHeading(num);
      setManualHeadingModalOpen(false);
      showNotification(`Heading Set Manually: ${num.toFixed(1)}°`, "info");
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
                    const newBounds = f.boundaries.filter((_, i) => i !== index);
                    return { ...f, boundaries: newBounds };
                }
                return f;
            });
            actions.setFields(updatedFields);
            
            if (loadedField && loadedField.id === selectedFieldId) {
                const newBounds = loadedField.boundaries.filter((_, i) => i !== index);
                actions.setLoadedField({...loadedField, boundaries: newBounds});
            }
            if (activeBoundaryIdx === index) actions.setActiveBoundaryIdx(0);
            showNotification("Boundary Deleted", "info");
      } else if (type === 'line') {
            const updatedFields = fields.map(f => {
                if (f.id === selectedFieldId) {
                    const newLines = f.lines.filter(l => l.id !== id);
                    return { ...f, lines: newLines };
                }
                return f;
            });
            actions.setFields(updatedFields);
            
            if (loadedField && loadedField.id === selectedFieldId) {
                const newLines = loadedField.lines.filter(l => l.id !== id);
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
                    const newTasks = f.tasks.filter(t => t.id !== id);
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
  const saveNewTask = (type) => { const activeField = fields.find(f => f.id === selectedFieldId); const newTask = { id: Date.now(), name: `${type} ${new Date().getFullYear()}`, type, date: "Today", status: "Pending" }; const updatedFields = fields.map(f => { if (f.id === selectedFieldId) return { ...f, tasks: [newTask, ...f.tasks] }; return f; }); actions.setFields(updatedFields); actions.setViewMode('LIST'); showNotification(`Task "${newTask.name}" Created`, "success"); };
  
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
  const getLineTypeIcon = () => { switch(lineType) { case 'STRAIGHT_AB': return GitCommitHorizontal; case 'A_PLUS': return ArrowUpFromDot; case 'CURVE': return Spline; case 'PIVOT': return CircleDashed; default: return GitCommitHorizontal; } };

  const renderGuidanceLine = () => {
    // Check if lines should be shown
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
      const x1 = pointA.x - ux * 10000; const y1 = pointA.y - uy * 10000; const x2 = pointA.x + ux * 10000; const y2 = pointA.y + uy * 10000;
      
      const elements = [];
      
      if (isMultiLineMode) {
          const w = implementSettings.width * PIXELS_PER_METER;
          const nx = -uy; const ny = ux; 
          const highlightedLane = activeLaneRef.current !== null ? activeLaneRef.current : currentLaneIndex;

          for (let i = highlightedLane - 6; i <= highlightedLane + 6; i++) {
              const offset = w * i;
              const isActive = i === highlightedLane;
              const strokeColor = isActive ? "#2563eb" : "#93c5fd";
              const strokeWidth = isActive ? "4" : "2";
              
              elements.push(
                <line 
                    key={`line-${i}`} 
                    x1={x1 + nx * offset} y1={y1 + ny * offset} 
                    x2={x2 + nx * offset} y2={y2 + ny * offset} 
                    stroke={strokeColor} 
                    strokeWidth={strokeWidth} 
                />
              );
          }
      } else {
           // Single Line Mode
           const nx = -uy; const ny = ux;
           const offset = manualOffset;
           
           elements.push(
               <line 
                   key="target-line"
                   x1={x1 + nx * offset} y1={y1 + ny * offset} 
                   x2={x2 + nx * offset} y2={y2 + ny * offset} 
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
        const x1 = aPlusPoint.x - ux * 100000; 
        const y1 = aPlusPoint.y - uy * 100000; 
        const x2 = aPlusPoint.x + ux * 100000; 
        const y2 = aPlusPoint.y + uy * 100000;
        
        const isPreview = !guidanceLine;
        const elements = [];
        
        if (isPreview) {
             elements.push(<line key="preview" x1={x1} y1={y1} x2={x2} y2={y2} stroke="red" strokeWidth="2" strokeDasharray="15, 10" />);
        } else {
             if (isMultiLineMode) {
                const w = implementSettings.width * PIXELS_PER_METER;
                const nx = -uy; const ny = ux;
                const highlightedLane = activeLaneRef.current !== null ? activeLaneRef.current : currentLaneIndex;

                for (let i = highlightedLane - 6; i <= highlightedLane + 6; i++) {
                    const offset = w * i;
                    const isActive = i === highlightedLane;
                    const strokeColor = isActive ? "#2563eb" : "#93c5fd";
                    const strokeWidth = isActive ? "4" : "2";

                    elements.push(
                        <line 
                            key={`line-${i}`}
                            x1={x1 + nx * offset} y1={y1 + ny * offset} 
                            x2={x2 + nx * offset} y2={y2 + ny * offset} 
                            stroke={strokeColor} 
                            strokeWidth={strokeWidth} 
                        />
                    );
                }
             } else {
                const nx = -uy; const ny = ux;
                const offset = manualOffset;
                elements.push(
                   <line 
                       key="target-line"
                       x1={x1 + nx * offset} y1={y1 + ny * offset} 
                       x2={x2 + nx * offset} y2={y2 + ny * offset} 
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
                const r = pivotRadius + (i * w);
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

    if (guidanceLine === 'CURVE' && curvePoints.length > 1) {
        const elements = [];
        
        if (isMultiLineMode) {
            const w = implementSettings.width * PIXELS_PER_METER;
            const highlightedLane = activeLaneRef.current !== null ? activeLaneRef.current : currentLaneIndex;
            
            // Draw 5 lines (center + 2 each side)
            for (let i = highlightedLane - 2; i <= highlightedLane + 2; i++) {
                const offset = i * w;
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
            <div className={`p-3 rounded-2xl ${t.bgCard} shadow-lg border ${t.borderCard} flex flex-col gap-2 pointer-events-auto w-[60px]`}>
               <div className={`text-center font-bold text-orange-500 uppercase text-[8px]`}>REC</div>
               <DockButton theme={t} icon={Square} label="Finish" color="green" onClick={finishBoundaryRecording}/>
               <DockButton theme={t} icon={X} label="Cancel" color="red" onClick={cancelBoundaryRecording}/>
            </div> 
          );
      }

      // 4. Default State (Collapsed Symbol)
      // If Auto is engaged, show trim controls - TAKES PRECEDENCE over creation if Auto is active
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
                            <DockButton theme={t} icon={Compass} label={aPlusHeading !== null ? `${aPlusHeading.toFixed(0)}°` : "Head"} color={aPlusHeading !== null ? "green" : "blue"} onClick={handleSetAPlus_HeadingCurrent}/>
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

  // HANDLER FOR REAL-TIME IMPLEMENT CHANGE
  const handleImplementChange = (key, value) => {
      actions.setImplementSettings(prev => ({ ...prev, [key]: value }));
  };

  const renderSettingsContent = () => {
    switch (settingsTab) {
        case 'display': return ( <div className="space-y-4"><h3 className={`text-xl font-bold mb-4 border-b ${t.borderCard} pb-2 ${t.textMain}`}>Display</h3><div className="grid grid-cols-1 gap-4"><SettingSlider theme={t} label="Brightness" value={85} min={0} max={100} /><div className={`flex items-center justify-between p-4 lg:p-5 ${theme === 'dark' ? 'bg-slate-800' : 'bg-gray-100'} border ${t.borderCard} rounded-xl`}><div className="flex items-center gap-3">{theme === 'light' ? <Sun className="w-6 h-6 text-orange-500" /> : <Moon className="w-6 h-6 text-blue-400" />}<span className={`font-bold text-base lg:text-lg ${t.textMain}`}>Theme</span></div><div className="flex bg-slate-700/20 p-1 rounded-lg"><button onClick={() => setTheme('light')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${theme === 'light' ? 'bg-white text-slate-900 shadow-md' : 'text-slate-500 hover:text-slate-700'}`}><Sun className="w-4 h-4" /> Light</button><button onClick={() => setTheme('dark')} className={`px-4 py-2 rounded-md text-sm font-bold transition-all flex items-center gap-2 ${theme === 'dark' ? 'bg-slate-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'}`}><Moon className="w-4 h-4" /> Dark</button></div></div><SettingToggle theme={t} label="Auto dark mode" active={false} /></div></div> );
        case 'vehicle': return ( 
            <div className="space-y-4">
                <h3 className={`text-xl font-bold mb-4 border-b ${t.borderCard} pb-2 ${t.textMain}`}>Vehicle Configuration</h3>
                <div className="grid grid-cols-2 gap-4">
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
                <div className="grid grid-cols-2 gap-4">
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
                        <span className={`font-bold ${t.textMain}`}>Straight Line Multiple</span>
                        <div className={`w-12 h-7 rounded-full p-1 transition-colors ${isMultiLineMode ? 'bg-green-500' : 'bg-slate-400'}`}>
                            <div className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${isMultiLineMode ? 'translate-x-5' : ''}`}></div>
                        </div>
                    </div>
                    <SettingSlider theme={t} label="Steering Sensitivity" value={75} min={0} max={100} />
                    <SettingSlider theme={t} label="Line Acquisition Aggressiveness" value={60} min={0} max={100} />
                    <SettingToggle theme={t} label="Enable U-Turn" active={true} />
                    <SettingToggle theme={t} label="Terrain Compensation" active={true} />
                </div>
            </div> 
        );
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
            const skySize = 260;
            const skyRadius = 110;

            return (
              <div className="space-y-6">
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

                <div className={`${t.bgPanel} border ${t.borderCard} rounded-xl p-5`}>
                  <div className="flex items-center justify-between mb-4">
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

                <div className="grid grid-cols-12 gap-6 items-center">
                  <div className="col-span-3">
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

                  <div className="col-span-6 flex justify-center">
                    <div className={`rounded-full border ${t.borderCard} p-4 ${theme === 'dark' ? 'bg-slate-900' : 'bg-gray-50'}`}>
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

                  <div className="col-span-3">
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

                <div className="grid grid-cols-4 gap-4">
                  <div className={`${theme === 'dark' ? 'bg-slate-800' : 'bg-gray-100'} p-4 rounded-xl border ${t.borderCard}`}>
                    <div className={`text-[10px] uppercase ${t.textSub}`}>Correction Age</div>
                    <div className={`text-lg font-bold ${t.textMain}`}>{rtkStatus === 'FIX' ? '0.7s' : '—'}</div>
                  </div>
                  <div className={`${theme === 'dark' ? 'bg-slate-800' : 'bg-gray-100'} p-4 rounded-xl border ${t.borderCard}`}>
                    <div className={`text-[10px] uppercase ${t.textSub}`}>Latency</div>
                    <div className={`text-lg font-bold ${t.textMain}`}>{rtkStatus === 'FIX' ? '220ms' : '—'}</div>
                  </div>
                  <div className={`${theme === 'dark' ? 'bg-slate-800' : 'bg-gray-100'} p-4 rounded-xl border ${t.borderCard}`}>
                    <div className={`text-[10px] uppercase ${t.textSub}`}>Baseline</div>
                    <div className={`text-lg font-bold ${t.textMain}`}>{rtkStatus === 'FIX' ? '12.4 km' : '—'}</div>
                  </div>
                  <div className={`${theme === 'dark' ? 'bg-slate-800' : 'bg-gray-100'} p-4 rounded-xl border ${t.borderCard}`}>
                    <div className={`text-[10px] uppercase ${t.textSub}`}>Accuracy (H/V)</div>
                    <div className={`text-lg font-bold ${t.textMain}`}>{rtkStatus === 'FIX' ? '2.2 cm / 3.1 cm' : '—'}</div>
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
                      <div className="grid grid-cols-2 gap-4">
                        <SettingInput theme={t} label="NTRIP Host" value={rtkSettings.ntripHost} onChange={(e) => actions.setRtkSettings({...rtkSettings, ntripHost: e.target.value})} />
                        <SettingInput theme={t} label="Port" value={rtkSettings.port} onChange={(e) => actions.setRtkSettings({...rtkSettings, port: e.target.value})} />
                        <SettingInput theme={t} label="Mountpoint" value={rtkSettings.mountpoint} onChange={(e) => actions.setRtkSettings({...rtkSettings, mountpoint: e.target.value})} />
                        <SettingInput theme={t} label="User" value={rtkSettings.user} onChange={(e) => actions.setRtkSettings({...rtkSettings, user: e.target.value})} />
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-4">
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

const renderLinesPanel = () => {
    const activeField = fields.find(f => f.id === selectedFieldId);
    const lines = activeField?.lines || [];
    
    return (
        <div className={`w-full h-full flex flex-col ${theme === 'dark' ? 'bg-slate-900' : 'bg-white'}`}>
            {/* Header với nút X */}
            <div className={`flex items-center justify-between p-6 border-b ${t.divider}`}>
                <h2 className={`text-xl font-bold ${t.textMain}`}>Lines Management</h2>
                <button 
                    onClick={() => setLinesPanelOpen(false)} 
                    className={`p-2 rounded-lg ${t.activeItem} hover:brightness-95 transition-all`}
                >
                    <X className="w-5 h-5" />
                </button>
            </div>
            
            {/* Nội dung panel */}
            <div className="flex-1 overflow-y-auto p-6">
                {lines.length === 0 ? (
                    <div className={`text-center py-12 ${t.textDim}`}>
                        <Navigation className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p className="text-lg">No lines created yet</p>
                        <p className="text-sm mt-2">Create your first guidance line to get started</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {lines.map((line, index) => (
                            <div key={line.id} className={`p-4 ${theme === 'dark' ? 'bg-slate-800' : 'bg-gray-50'} border ${t.borderCard} rounded-xl`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-3 h-3 rounded-full ${line.active ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                                        <span className={`font-medium ${t.textMain}`}>{line.name || `Line ${index + 1}`}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => actions.setActiveLineId(line.id)} 
                                            className={`px-3 py-1 text-sm rounded-lg ${line.active ? 'bg-green-600 text-white' : `border ${t.borderCard} ${t.textSub} hover:bg-opacity-10 hover:bg-current`}`}
                                        >
                                            {line.active ? 'Active' : 'Activate'}
                                        </button>
                                        <button 
                                            onClick={() => deleteLine(line.id)} 
                                            className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                <div className={`mt-3 text-sm ${t.textSub}`}>
                                    <p>Length: {line.length?.toFixed(1) || 'N/A'} m</p>
                                    <p>Created: {new Date(line.createdAt).toLocaleDateString()}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                
                {/* Nút tạo line mới */}
                <div className="mt-6 flex justify-center">
                    <button 
                        onClick={() => {
                            setLinesPanelOpen(false);
                            setLineModeModalOpen(true);
                        }} 
                        className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-500 transition-colors flex items-center gap-2"
                    >
                        <Plus className="w-5 h-5" />
                        Create New Line
                    </button>
                </div>
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
                  <div className="mb-6 flex items-center gap-2"><button onClick={() => actions.setViewMode('LIST')} className={`p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800`}><ArrowLeftRight className="w-5 h-5 rotate-180" /></button><h3 className="text-xl font-bold">Create New Field</h3></div>
                  <div className="max-w-2xl w-full space-y-6">
                      <div><label className={`block text-sm font-bold mb-2 ${t.textSub}`}>FIELD NAME</label><input type="text" value={newFieldName} onChange={e => actions.setNewFieldName(e.target.value)} placeholder="Ex: South Farm 02" className={`w-full p-4 rounded-xl border ${t.borderCard} ${t.bgInput} focus:border-blue-500 outline-none`} /></div>
                      <div className={`p-6 rounded-xl border ${t.borderCard} ${t.bgPanel}`}><div className="flex justify-between items-center mb-4"><span className="font-bold">Boundaries Recorded</span><span className={`text-xs ${currentFieldBoundaries.length > 0 ? 'text-green-500' : 'text-orange-500'}`}>{currentFieldBoundaries.length} loops saved</span></div><div className="space-y-3">{currentFieldBoundaries.length > 0 && <div className="h-20 bg-green-500/10 rounded-lg flex items-center justify-center border border-green-500/30 text-green-600 font-bold mb-2"><CheckCircle2 className="w-6 h-6 mr-2"/> {currentFieldBoundaries.length} Boundaries Ready</div>}<button onClick={startBoundaryCreation} className="w-full py-4 rounded-xl border-2 border-dashed border-blue-500/50 text-blue-500 font-bold hover:bg-blue-500/10 flex flex-col items-center gap-2"><Tractor className="w-8 h-8" /><span>{currentFieldBoundaries.length > 0 ? "Record Another Boundary" : "Drive to Record Boundary"}</span></button></div></div>
                      <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-4"><button onClick={() => actions.setViewMode('LIST')} className="px-6 py-3 rounded-xl border font-bold text-slate-500">Cancel</button><button onClick={saveNewField} className="px-8 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 shadow-lg">Save Field</button></div>
                  </div>
              </div>
          );
      } else if (viewMode === 'CREATE_TASK') {
          rightContent = (
              <div className="flex-1 flex flex-col p-8 overflow-y-auto">
                  <div className="mb-6 flex items-center gap-2"><button onClick={() => actions.setViewMode('LIST')} className={`p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800`}><ArrowLeftRight className="w-5 h-5 rotate-180" /></button><h3 className="text-xl font-bold">New Task</h3></div>
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
                            <div className="flex justify-between items-center mb-4"><h4 className={`font-bold uppercase ${t.textSub}`}>Boundaries</h4><button onClick={startBoundaryCreation} className="text-sm font-bold text-blue-500 hover:underline flex items-center gap-1"><Plus className="w-4 h-4"/> Add Boundary</button></div>
                            {boundaries.length > 0 ? (
                                <div className="space-y-2">{boundaries.map((b, i) => (<div key={i} onClick={() => actions.setActiveBoundaryIdx(i)} className={`w-full flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${activeBoundaryIdx === i ? t.selectedItem : `${t.borderCard} hover:brightness-95`}`}><div className="flex items-center gap-3"><MapIcon className={`w-5 h-5 ${activeBoundaryIdx === i ? 'text-blue-500' : t.textDim}`} /><span className={t.textMain}>{b.name || `Boundary ${i + 1}`}</span></div><div className="flex items-center gap-2"><button onClick={(e) => { e.stopPropagation(); confirmDelete('boundary', null, i); }} className={`p-2 rounded text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30`}><Trash2 className="w-4 h-4"/></button>{activeBoundaryIdx === i && <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded">Active</span>}</div></div>))}</div>
                            ) : (<div className={`text-center py-4 ${t.textDim} border-2 border-dashed border-slate-500/30 rounded-lg`}>No boundaries</div>)}
                        </div>
                        {/* LINES SECTION */}
                        <div className={`p-6 rounded-xl border ${t.borderCard} ${t.bgPanel}`}>
                            <div className="flex justify-between items-center mb-4"><h4 className={`font-bold uppercase ${t.textSub}`}>Saved Lines</h4></div>
                            {lines && lines.length > 0 ? ( <div className="space-y-2">{lines.map((l) => (<div key={l.id} className={`flex items-center justify-between p-3 rounded-lg border ${t.borderCard}`}><div className="flex items-center gap-3">{l.type === 'CURVE' ? <Spline className="w-5 h-5 text-purple-500" /> : <GitCommitHorizontal className="w-5 h-5 text-blue-500" />}<span className={t.textMain}>{l.name}</span></div><div className="flex items-center gap-2"><span className={`text-xs ${t.textSub}`}>{l.date}</span><button onClick={() => confirmDelete('line', l.id)} className={`p-2 rounded text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30`}><Trash2 className="w-4 h-4"/></button><button onClick={() => handleLoadLine(l)} className={`px-3 py-1 rounded text-xs font-bold ${activeLineId === l.id ? 'bg-blue-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>{activeLineId === l.id ? 'Active' : 'Load'}</button></div></div>))}</div>) : (<div className={`text-center py-4 ${t.textDim}`}>No lines saved</div>)}
                        </div>
                        {/* TASKS SECTION */}
                        <div className={`p-6 rounded-xl border ${t.borderCard} ${t.bgPanel}`}>
                            <div className="flex justify-between items-center mb-4"><h4 className={`font-bold uppercase ${t.textSub}`}>Tasks History</h4><button onClick={startTaskCreation} className="text-sm font-bold text-blue-500 hover:underline flex items-center gap-1"><Plus className="w-4 h-4"/> New Task</button></div>{activeField.tasks.length > 0 ? (<div className="space-y-2">{activeField.tasks.map(task => (<div key={task.id} className={`flex items-center justify-between p-4 rounded-lg border transition-all ${activeTaskId === task.id ? 'border-green-500 bg-green-500/10' : t.borderCard}`}><div className="flex items-center gap-4"><div className="p-2 rounded bg-blue-500/20 text-blue-500">{task.type === 'Planting' ? <Sprout className="w-5 h-5"/> : task.type === 'Spraying' ? <Droplets className="w-5 h-5"/> : <Tractor className="w-5 h-5"/>}</div><div><div className={`font-bold ${t.textMain}`}>{task.name}</div><div className={`text-xs ${t.textSub}`}>{task.date} • {task.status}</div></div></div><div className="flex gap-2">{activeTaskId === task.id ? (<><button onClick={() => handleTaskAction(task, 'pause')} className="p-2 bg-orange-500/20 text-orange-500 rounded-lg hover:bg-orange-500/30"><Pause className="w-4 h-4" /></button><button onClick={() => handleTaskAction(task, 'finish')} className="p-2 bg-green-500/20 text-green-500 rounded-lg hover:bg-green-500/30"><CheckSquare className="w-4 h-4" /></button></>) : (task.status !== 'Done' && (<><button onClick={() => handleTaskAction(task, 'start')} className="p-2 bg-blue-500/20 text-blue-500 rounded-lg hover:bg-blue-500/30"><PlayCircle className="w-4 h-4" /></button><button onClick={() => confirmDelete('task', task.id)} className={`p-2 rounded text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30`}><Trash2 className="w-4 h-4"/></button></>))}</div></div>))}</div>) : (<div className={`text-center py-8 ${t.textDim}`}>No tasks recorded yet.</div>)}</div>
                  </div>
                  <div className={`p-6 border-t ${t.divider} flex justify-end gap-4 ${theme === 'dark' ? 'bg-slate-900/50' : 'bg-white/50'}`}><button onClick={handleDeleteField} className={`px-6 py-3 rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/10 flex items-center gap-2`}><Trash2 className="w-5 h-5" /> Delete</button><button onClick={handleLoadField} className="px-8 py-3 rounded-lg bg-green-600 text-white font-bold hover:bg-green-500 shadow-lg shadow-green-900/20 flex items-center gap-2"><CheckCircle2 className="w-5 h-5" /> Load Field</button></div>
              </div>
          );
      } else {
          rightContent = <div className="flex-1 flex items-center justify-center text-slate-500">Select a field to view details</div>;
      }

      return (
          <div className="flex h-full w-full">
              <div className={`w-[35%] border-r ${t.border} ${t.bgPanel} flex flex-col`}>
                  <div className={`p-6 border-b ${t.divider}`}><h2 className={`text-xl font-bold flex items-center gap-3 ${t.textMain}`}><LayoutGrid className="w-6 h-6 text-blue-500" />Field Manager</h2></div>
                  <div className="p-4"><button onClick={() => { actions.setViewMode('CREATE_FIELD'); actions.setNewFieldName(''); actions.setCurrentFieldBoundaries([]); }} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold flex justify-center gap-2 hover:bg-blue-500"><Plus className="w-5 h-5" /> New Field</button></div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-2">{fields.map(f => (<button key={f.id} onClick={() => { actions.setSelectedFieldId(f.id); actions.setViewMode('LIST'); }} className={`w-full text-left p-4 rounded-xl border transition-all ${selectedFieldId === f.id ? t.selectedItem : `${t.bgCard} ${t.border} hover:brightness-95`}`}><div className="flex justify-between items-start"><div className="flex gap-3"><div className={`w-10 h-10 rounded-lg flex items-center justify-center ${selectedFieldId === f.id ? 'bg-blue-500 text-white' : 'bg-slate-300 dark:bg-slate-800 text-slate-500'}`}><MapIcon className="w-6 h-6" /></div><div><h4 className={`font-bold ${t.textMain}`}>{f.name}</h4><span className={`text-xs ${t.textSub}`}>{f.area}</span></div></div>{selectedFieldId === f.id && <CheckCircle2 className="w-5 h-5 text-blue-500" />}</div></button>))}</div>
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
                                    <TractorVehicle mode={steeringMode} steeringAngle={steeringAngle} implementWidth={implementSettings.width} vehicleSettings={vehicleSettings} />
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

                    {/* ZOOM & SHOW LINES CONTROLS */}
                    <div className="absolute right-24 bottom-32 z-20 flex flex-col gap-2">
                        <button onClick={() => actions.setShowGuidanceLines(!showGuidanceLines)} className={`p-2 ${t.bgCard} backdrop-blur border ${t.borderCard} rounded-lg ${t.textMain} transition-all hover:bg-blue-50 dark:hover:bg-blue-900/30`}>
                            {showGuidanceLines ? <Eye className="w-6 h-6 text-blue-500"/> : <EyeOff className="w-6 h-6 text-slate-400"/>}
                        </button>
                        <div className={`h-px ${t.divider}`}></div>
                        <button onClick={() => handleZoom('in')} className={`p-2 ${t.bgCard} backdrop-blur border ${t.borderCard} rounded-lg ${t.textMain}`}><Plus className="w-6 h-6"/></button>
                        <button onClick={() => handleZoom('out')} className={`p-2 ${t.bgCard} backdrop-blur border ${t.borderCard} rounded-lg ${t.textMain}`}><Minus className="w-6 h-6"/></button>
                    </div>
                </div>

                {/* ... rest of the app ... */}
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
                {/* ... existing modals ... */}
                {fieldManagerOpen && <div className={`absolute inset-0 ${theme === 'dark' ? 'bg-slate-950/95' : 'bg-gray-100/95'} z-40 flex overflow-hidden`}>{renderFieldManager()}</div>}
                
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
                
                {settingsOpen && <div className={`absolute inset-0 ${theme === 'dark' ? 'bg-slate-950/95' : 'bg-gray-100/95'} z-40 flex overflow-hidden`}><div className={`w-[25%] border-r ${t.border} ${t.bgPanel} flex flex-col`}><div className={`p-6 border-b ${t.divider}`}><h2 className={`text-xl lg:text-2xl font-bold flex items-center gap-3 ${t.textMain}`}><Settings className="w-6 h-6 lg:w-7 lg:h-7 text-blue-500" />Settings</h2></div><nav className="flex-1 overflow-y-auto p-4 space-y-2"><SettingsTab theme={t} label="Display" icon={Monitor} active={settingsTab === 'display'} onClick={() => setSettingsTab('display')} /><SettingsTab theme={t} label="Vehicle" icon={Tractor} active={settingsTab === 'vehicle'} onClick={() => setSettingsTab('vehicle')} /><SettingsTab theme={t} label="Implement" icon={Ruler} active={settingsTab === 'implement'} onClick={() => setSettingsTab('implement')} /><SettingsTab theme={t} label="Guidance" icon={Navigation} active={settingsTab === 'guidance'} onClick={() => setSettingsTab('guidance')} /><SettingsTab theme={t} label="RTK / GNSS" icon={Radio} active={settingsTab === 'rtk'} onClick={() => setSettingsTab('rtk')} /></nav></div><div className={`flex-1 flex flex-col ${theme === 'dark' ? 'bg-slate-950' : 'bg-gray-50'}`}><div className={`flex items-center justify-between p-6 lg:p-8 border-b ${t.divider} ${theme === 'dark' ? 'bg-slate-900/50' : 'bg-white/50'}`}><h3 className={`text-lg lg:text-xl font-medium ${t.textSub} uppercase tracking-widest`}>{settingsTab} CONFIGURATION</h3><button onClick={() => setSettingsOpen(false)} className={`p-2 lg:p-3 ${t.activeItem} hover:brightness-95 rounded-lg border ${t.borderCard}`}><X className={`w-5 h-5 lg:w-6 lg:h-6 ${t.textMain}`} /></button></div><div className="flex-1 p-6 lg:p-10 overflow-y-auto"><div className="max-w-4xl">{renderSettingsContent()}</div></div><div className={`p-4 lg:p-6 border-t ${t.divider} flex justify-end gap-4 ${theme === 'dark' ? 'bg-slate-900/50' : 'bg-white/50'}`}><button className={`px-6 lg:px-8 py-2 lg:py-3 rounded-lg border ${t.borderCard} ${t.textMain} hover:brightness-95 text-base lg:text-lg`} onClick={() => setSettingsOpen(false)}>Cancel</button><button className="px-6 lg:px-8 py-2 lg:py-3 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-500 shadow-lg shadow-blue-900/20 text-base lg:text-lg" onClick={() => { setSettingsOpen(false); showNotification("Settings Saved Successfully", "success"); }}>Save Changes</button></div></div></div>}
                {menuOpen && !fieldManagerOpen && !lineModeModalOpen && !linesPanelOpen && !manualHeadingModalOpen && !boundaryAlertOpen && !deleteModalOpen && (
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
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6"><div className={`${t.bgPanel} rounded-2xl w-full max-w-2xl border ${t.borderCard} shadow-2xl p-6`}><div className="flex justify-between items-center mb-6"><h3 className={`text-xl font-bold ${t.textMain}`}>Select Guidance Mode</h3><button onClick={() => setLineModeModalOpen(false)} className={`p-2 rounded-lg hover:bg-slate-800/50 ${t.textDim}`}><X className="w-6 h-6" /></button></div><div className="grid grid-cols-2 gap-4"><button onClick={() => selectLineMode('STRAIGHT_AB')} className={`p-6 rounded-xl border ${t.borderCard} ${lineType === 'STRAIGHT_AB' ? 'bg-blue-500/10 border-blue-500' : 'hover:bg-slate-800/30'} flex flex-col items-center gap-3 transition-all`}><GitCommitHorizontal className={`w-12 h-12 ${lineType === 'STRAIGHT_AB' ? 'text-blue-500' : t.textDim}`} /><span className={`font-bold text-lg ${t.textMain}`}>Straight AB</span><span className={`text-xs ${t.textSub}`}>Standard straight line A to B</span></button><button onClick={() => selectLineMode('A_PLUS')} className={`p-6 rounded-xl border ${t.borderCard} ${lineType === 'A_PLUS' ? 'bg-blue-500/10 border-blue-500' : 'hover:bg-slate-800/30'} flex flex-col items-center gap-3 transition-all`}><ArrowUpFromDot className={`w-12 h-12 ${lineType === 'A_PLUS' ? 'text-blue-500' : t.textDim}`} /><span className={`font-bold text-lg ${t.textMain}`}>A+ Heading</span><span className={`text-xs ${t.textSub}`}>Straight line with defined heading</span></button><button onClick={() => selectLineMode('CURVE')} className={`p-6 rounded-xl border ${t.borderCard} ${lineType === 'CURVE' ? 'bg-blue-500/10 border-blue-500' : 'hover:bg-slate-800/30'} flex flex-col items-center gap-3 transition-all`}><Spline className={`w-12 h-12 ${lineType === 'CURVE' ? 'text-blue-500' : t.textDim}`} /><span className={`font-bold text-lg ${t.textMain}`}>Curve</span><span className={`text-xs ${t.textSub}`}>Adaptive curved guidance</span></button><button onClick={() => selectLineMode('PIVOT')} className={`p-6 rounded-xl border ${t.borderCard} ${lineType === 'PIVOT' ? 'bg-blue-500/10 border-blue-500' : 'hover:bg-slate-800/30'} flex flex-col items-center gap-3 transition-all`}><CircleDashed className={`w-12 h-12 ${lineType === 'PIVOT' ? 'text-blue-500' : t.textDim}`} /><span className={`font-bold text-lg ${t.textMain}`}>Pivot</span><span className={`text-xs ${t.textSub}`}>Center pivot circular pattern</span></button>
                    {/* MULTI-LINE OPTION */}
                    <div className="col-span-2 mt-4 flex items-center justify-between p-4 rounded-xl border border-slate-700/50 bg-slate-800/30">
                        <span className="text-sm font-bold text-white">Straight Line Multiple</span>
                        <div onClick={handleToggleMultiLine} className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-colors ${isMultiLineMode ? 'bg-blue-600' : 'bg-slate-600'}`}>
                            <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${isMultiLineMode ? 'translate-x-6' : ''}`} />
                        </div>
                    </div>
                    </div></div></div>
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
