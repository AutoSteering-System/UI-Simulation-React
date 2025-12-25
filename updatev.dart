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
  // Icons for Line Types
  GitCommitHorizontal, 
  ArrowUpFromDot,      
  Spline,              
  CircleDashed,        
  MousePointer2,       
  Disc                 
} from 'lucide-react';

// --- CUSTOM ICONS ---
const SteeringWheelIcon = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="2" />
    <path d="M12 14v8" />
    <path d="M10.6 13.4L4.2 17.2" />
    <path d="M13.4 13.4l6.4 3.8" />
  </svg>
);

// --- COMPONENT XE MÁY CÀY (TRACTOR SVG) ---
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

const AutoSteerSystem = () => {
  // --- SYSTEM STATES ---
  const [steeringMode, setSteeringMode] = useState('MANUAL');
  const [isRecording, setIsRecording] = useState(false);
  const [rtkStatus, setRtkStatus] = useState('FIX');
  const [crossTrackError, setCrossTrackError] = useState(0.0);
  
  // Driving & Physics
  const [speed, setSpeed] = useState(0);
  const [manualTargetSpeed, setManualTargetSpeed] = useState(0);
  const [steeringAngle, setSteeringAngle] = useState(0); 
  const [worldPos, setWorldPos] = useState({ x: 0, y: 0 }); 
  const [heading, setHeading] = useState(0);
  
  // UI States
  const [menuOpen, setMenuOpen] = useState(false); 
  const [settingsOpen, setSettingsOpen] = useState(false); 
  const [fieldManagerOpen, setFieldManagerOpen] = useState(false); 
  const [lineModeModalOpen, setLineModeModalOpen] = useState(false); 

  const [settingsTab, setSettingsTab] = useState('display'); 
  const [lineType, setLineType] = useState('STRAIGHT_AB'); 
  const [satelliteCount, setSatelliteCount] = useState(12);
  const [notification, setNotification] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(0.6); 
  const [theme, setTheme] = useState('light'); 

  // --- DATA STATES ---
  const [fields, setFields] = useState([
      { id: 1, name: "Home_Field_01", area: "12.5 ha", lastUsed: "Today", boundary: [], tasks: [] },
      { id: 2, name: "North_Sector_B", area: "8.2 ha", lastUsed: "Yesterday", boundary: [], tasks: [] },
  ]);
  const [selectedFieldId, setSelectedFieldId] = useState(1);
  
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
  
  // --- CREATION WIZARD STATES ---
  const [viewMode, setViewMode] = useState('LIST'); 
  const [newFieldName, setNewFieldName] = useState('');
  const [isRecordingBoundary, setIsRecordingBoundary] = useState(false);
  const [tempBoundary, setTempBoundary] = useState([]); 

  // --- THEME CONFIGURATION ---
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

  // --- CONTROLS ---
  useEffect(() => {
    const handleKeyDown = (e) => {
        if (menuOpen || settingsOpen || (fieldManagerOpen && !isRecordingBoundary) || lineModeModalOpen) return; 
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].indexOf(e.key) > -1) e.preventDefault();

        if (steeringMode === 'MANUAL') {
            if (e.key === 'ArrowUp') setManualTargetSpeed(prev => Math.min(prev + 1, 15));
            else if (e.key === 'ArrowDown') setManualTargetSpeed(prev => Math.max(prev - 1, -5));
            else if (e.key === 'ArrowLeft') setSteeringAngle(prev => Math.max(prev - 2, -35)); 
            else if (e.key === 'ArrowRight') setSteeringAngle(prev => Math.min(prev + 2, 35)); 
            else if (e.key === ' ') { setManualTargetSpeed(0); setSteeringAngle(0); }
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [steeringMode, menuOpen, settingsOpen, fieldManagerOpen, lineModeModalOpen, isRecordingBoundary]);

  // --- PHYSICS LOOP ---
  useEffect(() => {
    const interval = setInterval(() => {
      // Speed Control
      let currentSpeed = speed;
      const target = steeringMode === 'AUTO' ? 8.5 : manualTargetSpeed;
      if (Math.abs(currentSpeed - target) > 0.1) currentSpeed = currentSpeed < target ? currentSpeed + 0.2 : currentSpeed - 0.5;
      else currentSpeed = target;
      setSpeed(currentSpeed);

      // Movement
      if (Math.abs(currentSpeed) > 0.05) {
          const turnRate = steeringAngle * 0.03 * (currentSpeed / 10); 
          const newHeading = heading + turnRate; 
          setHeading(newHeading);

          const rad = newHeading * Math.PI / 180;
          const moveStep = (currentSpeed / 8.5) * 8; 
          const newPos = { x: worldPos.x + Math.sin(rad) * moveStep, y: worldPos.y - Math.cos(rad) * moveStep };
          setWorldPos(newPos);

          if (isRecording) {
              setCoverageTrail(prev => {
                  const last = prev[prev.length - 1];
                  if (last && Math.hypot(last.x - newPos.x, last.y - newPos.y) < 10) return prev;
                  return [...prev, { x: newPos.x, y: newPos.y, h: newHeading }]; 
              });
          }
          // Record curve points while driving
          if (isRecordingCurve) {
              setCurvePoints(prev => {
                  const last = prev[prev.length - 1];
                  if (last && Math.hypot(last.x - newPos.x, last.y - newPos.y) < 20) return prev; 
                  return [...prev, { x: newPos.x, y: newPos.y }];
              });
          }
          if (isRecordingBoundary) {
              setTempBoundary(prev => {
                  const last = prev[prev.length - 1];
                  if (last && Math.hypot(last.x - newPos.x, last.y - newPos.y) < 20) return prev;
                  return [...prev, { x: newPos.x, y: newPos.y }];
              });
          }
      }
    }, 50); 
    return () => clearInterval(interval);
  }, [steeringMode, speed, isRecording, worldPos, manualTargetSpeed, steeringAngle, heading, isRecordingCurve, isRecordingBoundary]);

  // --- FUNCTIONS ---
  const toggleSteering = () => {
    if (!guidanceLine && steeringMode === 'MANUAL') return showNotification("Set Line first!", "warning");
    setSteeringMode(prev => prev === 'MANUAL' ? 'AUTO' : 'MANUAL');
    if (steeringMode === 'MANUAL') { setManualTargetSpeed(0); setSteeringAngle(0); showNotification("Auto Steer ENGAGED", "success"); }
    else showNotification("Manual Control Returned", "warning");
  };

  const showNotification = (msg, type) => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleTrim = (direction) => {
    setCrossTrackError(prev => direction === 'left' ? prev - 1 : prev + 1);
    showNotification(`Trim ${direction === 'left' ? 'Left' : 'Right'} 1cm`, "info");
  };

  const handleZoom = (type) => {
      setZoomLevel(prev => {
          if (type === 'in') return Math.min(prev + 0.2, 3.0); 
          if (type === 'out') return Math.max(prev - 0.2, 0.2); 
          return prev;
      });
  };

  // Line Logic
  const resetLines = () => {
      setPointA(null); setPointB(null); setAPlusPoint(null); setAPlusHeading(null);
      setCurvePoints([]); setIsRecordingCurve(false); setPivotCenter(null); setPivotRadius(null);
      setGuidanceLine(null);
  };

  // Unified AB Handler
  const handleABButtonClick = () => {
      if (!pointA) {
          resetLines();
          setPointA({ ...worldPos });
          showNotification("Point A Set. Drive to Point B.", "info");
      } else if (!pointB) {
          if (Math.hypot(worldPos.x - pointA.x, worldPos.y - pointA.y) < 50) {
              showNotification("Drive further to set Point B", "warning");
              return;
          }
          setPointB({ ...worldPos });
          setGuidanceLine('STRAIGHT_AB');
          showNotification("AB Line Created!", "success");
      } else {
          resetLines();
          setPointA({ ...worldPos });
          showNotification("Point A Reset", "info");
      }
  };

  const handleSetA_Plus = () => { resetLines(); setAPlusPoint({ ...worldPos }); setAPlusHeading(heading); setGuidanceLine('A_PLUS'); showNotification(`A+ Line Set at ${heading.toFixed(1)}°`, "success"); };
  const handleRecordCurve = () => {
      if (isRecordingCurve) {
          setIsRecordingCurve(false);
          if (curvePoints.length > 2) { setGuidanceLine('CURVE'); showNotification("Curve Saved!", "success"); }
          else { showNotification("Curve too short!", "error"); setCurvePoints([]); }
      } else {
          resetLines(); setIsRecordingCurve(true); setCurvePoints([{...worldPos}]); showNotification("Recording Curve...", "info");
      }
  };
  const handleSetCenter = () => { resetLines(); setPivotCenter({ ...worldPos }); showNotification("Pivot Center Set. Drive to Edge.", "info"); };
  const handleSetRadius = () => {
      if (!pivotCenter) return showNotification("Set Center first", "warning");
      const radius = Math.hypot(worldPos.x - pivotCenter.x, worldPos.y - pivotCenter.y);
      if (radius < 50) return showNotification("Radius too small!", "warning");
      setPivotRadius(radius); setGuidanceLine('PIVOT'); showNotification("Pivot Created!", "success");
  };
  const selectLineMode = (type) => { setLineType(type); setLineModeModalOpen(false); resetLines(); showNotification(`Mode Changed: ${type.replace('_', ' ')}`, "info"); };

  // Field Logic
  const startFieldCreation = () => { setViewMode('CREATE_FIELD'); setNewFieldName(''); setTempBoundary([]); };
  const startBoundaryRecording = () => { setFieldManagerOpen(false); setIsRecordingBoundary(true); setManualTargetSpeed(5); showNotification("Drive to record boundary...", "info"); };
  const finishBoundaryRecording = () => { setIsRecordingBoundary(false); setManualTargetSpeed(0); setFieldManagerOpen(true); setViewMode('CREATE_FIELD'); };
  const saveNewField = () => {
      if (!newFieldName) return showNotification("Enter field name", "warning");
      const newField = { id: Date.now(), name: newFieldName, area: (tempBoundary.length * 0.05).toFixed(1) + " ha", lastUsed: "Just now", boundary: tempBoundary, tasks: [] };
      setFields(prev => [...prev, newField]); setSelectedFieldId(newField.id); setViewMode('LIST'); showNotification("Field Saved Successfully", "success");
  };
  const startTaskCreation = () => setViewMode('CREATE_TASK');
  const saveNewTask = (type) => {
      const activeField = fields.find(f => f.id === selectedFieldId);
      const newTask = { id: Date.now(), name: `${type} ${new Date().getFullYear()}`, type, date: "Today", status: "Pending" };
      const updatedFields = fields.map(f => { if (f.id === selectedFieldId) return { ...f, tasks: [newTask, ...f.tasks] }; return f; });
      setFields(updatedFields); setViewMode('LIST'); showNotification(`Task "${newTask.name}" Created`, "success");
  };
  const handleLoadField = () => {
      const field = fields.find(f => f.id === selectedFieldId);
      showNotification(`Loaded Field: ${field.name}`, "success");
      setFieldManagerOpen(false); setCoverageTrail([]); resetLines(); setWorldPos({x:0, y:0}); setHeading(0);
  }

  const getDisplayHeading = () => { let h = heading % 360; if (h < 0) h += 360; return h.toFixed(1); };
  const getRtkColor = () => rtkStatus === 'FIX' ? 'bg-green-500 text-white border-green-400' : 'bg-yellow-500 text-black border-yellow-400';
  const getLineTypeIcon = () => {
      switch(lineType) {
          case 'STRAIGHT_AB': return GitCommitHorizontal;
          case 'A_PLUS': return ArrowUpFromDot;
          case 'CURVE': return Spline;
          case 'PIVOT': return CircleDashed;
          default: return GitCommitHorizontal;
      }
  };

  // --- RENDERERS (Inside Component) ---

  const renderActionDock = () => {
      if (steeringMode === 'AUTO') {
          return (
            <>
                <span className={`text-[8px] lg:text-[9px] text-center ${t.textSub} font-bold uppercase pt-1`}>TRIM</span>
                <DockButton theme={t} icon={CornerUpLeft} label="L 1cm" color="green" onClick={() => handleTrim('left')}/>
                <DockButton theme={t} icon={CornerUpRight} label="R 1cm" color="green" onClick={() => handleTrim('right')}/>
                <div className={`h-px ${t.divider} mx-1`}></div>
                <DockButton theme={t} icon={Pause} label="Pause" color="orange" onClick={toggleSteering}/>
            </>
          );
      }
      switch (lineType) {
          case 'STRAIGHT_AB': 
              let abLabel = "Set A";
              let abColor = "blue";
              if (pointA && !pointB) { abLabel = "Set B"; abColor = "red"; }
              else if (pointA && pointB) { abLabel = "Set A"; abColor = "green"; }
              
              return ( 
                <>
                    <DockButton theme={t} icon={Target} label={abLabel} color={abColor} onClick={handleABButtonClick} />
                    <DockButton theme={t} icon={ArrowLeftRight} label="Shift" color="gray"/>
                </> 
              );
          case 'A_PLUS': return ( <><DockButton theme={t} icon={Target} label="Set A+" color={aPlusPoint?"green":"blue"} onClick={handleSetA_Plus}/><DockButton theme={t} icon={ArrowLeftRight} label="Shift" color="gray"/></> );
          case 'CURVE': return ( <><DockButton theme={t} icon={isRecordingCurve ? Disc : Spline} label={isRecordingCurve ? "Stop" : "Record"} color={isRecordingCurve ? "red" : "blue"} onClick={handleRecordCurve} className={isRecordingCurve ? "animate-pulse" : ""} /><DockButton theme={t} icon={ArrowLeftRight} label="Shift" color="gray"/></> );
          case 'PIVOT': return ( <><DockButton theme={t} icon={Target} label="Center" color={pivotCenter?"green":"blue"} onClick={handleSetCenter}/><DockButton theme={t} icon={CircleDashed} label="Edge" color={pivotRadius?"green":"blue"} onClick={handleSetRadius}/></> );
          default: return null;
      }
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

  const renderFieldManager = () => {
      if (viewMode === 'CREATE_FIELD') return ( <div className={`flex-1 p-8 flex flex-col ${t.textMain}`}><div className="mb-6 flex items-center gap-2"><button onClick={() => setViewMode('LIST')} className={`p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800`}><ArrowLeftRight className="w-5 h-5 rotate-180" /></button><h3 className="text-xl font-bold">Create New Field</h3></div><div className="max-w-md mx-auto w-full space-y-6"><div><label className={`block text-sm font-bold mb-2 ${t.textSub}`}>FIELD NAME</label><input type="text" value={newFieldName} onChange={e => setNewFieldName(e.target.value)} placeholder="Ex: South Farm 02" className={`w-full p-4 rounded-xl border ${t.borderCard} ${t.bgInput} focus:border-blue-500 outline-none`} /></div><div className={`p-6 rounded-xl border ${t.borderCard} ${t.bgPanel}`}><div className="flex justify-between items-center mb-4"><span className="font-bold">Boundary</span><span className={`text-xs ${tempBoundary.length > 0 ? 'text-green-500' : 'text-orange-500'}`}>{tempBoundary.length > 0 ? 'Recorded' : 'Not Set'}</span></div>{tempBoundary.length === 0 ? (<button onClick={startBoundaryRecording} className="w-full py-4 rounded-xl border-2 border-dashed border-blue-500/50 text-blue-500 font-bold hover:bg-blue-500/10 flex flex-col items-center gap-2"><Tractor className="w-8 h-8" /><span>Drive to Record Boundary</span></button>) : (<div className="h-32 bg-slate-900/10 dark:bg-black/20 rounded-lg flex items-center justify-center border border-dashed border-green-500/50"><CheckCircle2 className="w-8 h-8 text-green-500 mr-2" /><span className="text-green-600 font-bold">{tempBoundary.length} points captured</span></div>)}</div><div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-4"><button onClick={() => setViewMode('LIST')} className="px-6 py-3 rounded-xl border font-bold text-slate-500">Cancel</button><button onClick={saveNewField} className="px-8 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 shadow-lg">Save Field</button></div></div></div> );
      if (viewMode === 'CREATE_TASK') return ( <div className={`flex-1 p-8 flex flex-col ${t.textMain}`}><div className="mb-6 flex items-center gap-2"><button onClick={() => setViewMode('LIST')} className={`p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800`}><ArrowLeftRight className="w-5 h-5 rotate-180" /></button><h3 className="text-xl font-bold">New Task</h3></div><div className="grid grid-cols-2 gap-6 max-w-2xl mx-auto"><TaskOptionButton icon={Tractor} label="Tillage / Plowing" onClick={() => saveNewTask("Tillage")} t={t} /><TaskOptionButton icon={Sprout} label="Planting / Seeding" onClick={() => saveNewTask("Planting")} t={t} /><TaskOptionButton icon={Droplets} label="Spraying" onClick={() => saveNewTask("Spraying")} t={t} /><TaskOptionButton icon={Scissors} label="Harvesting" onClick={() => saveNewTask("Harvesting")} t={t} /></div></div> );
      
      const activeField = fields.find(f => f.id === selectedFieldId);
      return (
          <div className="flex h-full">
              <div className={`w-[35%] border-r ${t.border} ${t.bgPanel} flex flex-col`}><div className={`p-6 border-b ${t.divider}`}><h2 className={`text-xl font-bold flex items-center gap-3 ${t.textMain}`}><LayoutGrid className="w-6 h-6 text-blue-500" />Field Manager</h2></div><div className="p-4"><button onClick={startFieldCreation} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold flex justify-center gap-2 hover:bg-blue-500"><Plus className="w-5 h-5" /> New Field</button></div><div className="flex-1 overflow-y-auto p-4 space-y-2">{fields.map(f => (<button key={f.id} onClick={() => setSelectedFieldId(f.id)} className={`w-full text-left p-4 rounded-xl border transition-all ${selectedFieldId === f.id ? t.selectedItem : `${t.bgCard} ${t.border} hover:brightness-95`}`}><div className="flex justify-between items-start"><div className="flex gap-3"><div className={`w-10 h-10 rounded-lg flex items-center justify-center ${selectedFieldId === f.id ? 'bg-blue-500 text-white' : 'bg-slate-300 dark:bg-slate-800 text-slate-500'}`}><MapIcon className="w-6 h-6" /></div><div><h4 className={`font-bold ${t.textMain}`}>{f.name}</h4><span className={`text-xs ${t.textSub}`}>{f.area}</span></div></div>{selectedFieldId === f.id && <CheckCircle2 className="w-5 h-5 text-blue-500" />}</div></button>))}</div></div>
              <div className={`flex-1 flex flex-col ${theme === 'dark' ? 'bg-slate-950' : 'bg-gray-50'}`}><div className={`p-6 border-b ${t.divider} flex justify-between items-center`}><h3 className={`text-lg font-bold uppercase ${t.textSub}`}>{activeField?.name} OVERVIEW</h3><button onClick={() => setFieldManagerOpen(false)} className={`p-2 rounded-lg border ${t.borderCard} hover:bg-slate-200 dark:hover:bg-slate-800`}><X className={`w-6 h-6 ${t.textMain}`} /></button></div><div className="flex-1 p-8 overflow-y-auto space-y-8"><div className={`p-6 rounded-xl border ${t.borderCard} ${t.bgPanel}`}><div className="flex justify-between mb-4"><h4 className={`font-bold uppercase ${t.textSub}`}>Boundary & Lines</h4></div><div className="flex items-center gap-4"><div className={`flex-1 h-32 border-2 border-dashed ${activeField.boundary.length > 0 ? 'border-green-500/50 bg-green-500/10' : 'border-slate-500/30'} rounded-lg flex flex-col items-center justify-center`}>{activeField.boundary.length > 0 ? <><CheckCircle2 className="w-8 h-8 text-green-500 mb-2"/><span className="text-green-600 font-bold">Boundary Set</span></> : <><MapIcon className="w-8 h-8 opacity-30 mb-2"/><span>No Boundary</span></>}</div><div className="flex-1 space-y-2"><div className={`p-3 rounded-lg border ${t.borderCard} flex justify-between items-center`}><span className={t.textMain}>AB Line 01</span><span className="text-xs bg-blue-500 text-white px-2 py-1 rounded">Active</span></div></div></div></div><div className={`p-6 rounded-xl border ${t.borderCard} ${t.bgPanel}`}><div className="flex justify-between items-center mb-4"><h4 className={`font-bold uppercase ${t.textSub}`}>Tasks History</h4><button onClick={startTaskCreation} className="text-sm font-bold text-blue-500 hover:underline flex items-center gap-1"><Plus className="w-4 h-4"/> New Task</button></div>{activeField.tasks.length > 0 ? (<div className="space-y-2">{activeField.tasks.map(task => (<div key={task.id} className={`flex items-center justify-between p-4 rounded-lg ${t.activeItem}`}><div className="flex items-center gap-4"><div className="p-2 rounded bg-blue-500/20 text-blue-500">{task.type === 'Planting' ? <Sprout className="w-5 h-5"/> : task.type === 'Spraying' ? <Droplets className="w-5 h-5"/> : <Tractor className="w-5 h-5"/>}</div><div><div className={`font-bold ${t.textMain}`}>{task.name}</div><div className={`text-xs ${t.textSub}`}>{task.date}</div></div></div><span className="px-3 py-1 rounded-full text-xs font-bold bg-green-500/20 text-green-500">{task.status}</span></div>))}</div>) : (<div className={`text-center py-8 ${t.textDim}`}>No tasks recorded yet.</div>)}</div></div><div className={`p-6 border-t ${t.divider} flex justify-end gap-4 ${theme === 'dark' ? 'bg-slate-900/50' : 'bg-white/50'}`}><button className={`px-6 py-3 rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/10 flex items-center gap-2`}><Trash2 className="w-5 h-5" /> Delete</button><button onClick={handleLoadField} className="px-8 py-3 rounded-lg bg-green-600 text-white font-bold hover:bg-green-500 shadow-lg shadow-green-900/20 flex items-center gap-2"><CheckCircle2 className="w-5 h-5" /> Load Field</button></div></div></div>
      );
  };

  return (
    <div className="w-full h-screen bg-neutral-900 flex items-center justify-center p-4 overflow-hidden">
        <div className={`relative ${t.deviceFrame} shadow-2xl overflow-hidden flex border-[12px] rounded-2xl ring-4 ring-black/50 transition-colors duration-500`} style={{ width: '100%', maxWidth: '1280px', aspectRatio: '16/10', maxHeight: '100%' }}>
            
            {/* LEFT RAIL */}
            <aside className={`w-[8%] min-w-[70px] flex-shrink-0 ${t.bgPanel} border-r ${t.border} flex flex-col items-center py-[2%] z-30 shadow-2xl`}>
                <div className="mb-[15%]"><div className="w-10 h-10 lg:w-12 lg:h-12 bg-blue-600 rounded-xl flex items-center justify-center font-black text-xl lg:text-2xl italic shadow-blue-900/50 shadow-lg text-white">F</div></div>
                <nav className="flex-1 w-full flex flex-col gap-[6%] items-center">
                    <RailButton theme={t} icon={MapIcon} label="Run" active={!settingsOpen && !fieldManagerOpen} onClick={() => {setSettingsOpen(false); setFieldManagerOpen(false);}} />
                    <RailButton theme={t} icon={LayoutGrid} label="Field" active={fieldManagerOpen} onClick={() => {setFieldManagerOpen(true); setSettingsOpen(false);}} />
                    <RailButton theme={t} icon={Route} label="Lines" />
                    <div className={`h-px w-1/2 ${t.divider} my-2`}></div>
                    <RailButton theme={t} icon={Settings} label="System" active={settingsOpen} onClick={() => {setSettingsOpen(true); setFieldManagerOpen(false);}} />
                </nav>
                <div className="mb-4 flex flex-col items-center gap-1"><Signal className="w-4 h-4 lg:w-5 lg:h-5 text-green-500" /><span className={`text-[9px] lg:text-[10px] ${t.textDim} font-mono`}>4G</span></div>
            </aside>

            {/* MAIN AREA */}
            <main className={`flex-1 relative flex flex-col ${t.textMain} font-sans select-none`}>
                {/* 2B) MAP CANVAS */}
                <div className={`absolute inset-0 ${t.bgMain} z-0 overflow-hidden transition-colors duration-500`}>
                    <div className="absolute w-full h-full" style={{ transformOrigin: '50% 60%', transform: `scale(${zoomLevel}) rotate(${-heading}deg)`, transition: 'transform 0.1s linear' }}>
                        <div className="absolute w-full h-full" style={{ transform: `translate(${-worldPos.x}px, ${-worldPos.y}px)`, transition: 'transform 0.05s linear' }}>
                            <div className="absolute -top-[10000px] -left-[10000px] w-[20000px] h-[20000px] opacity-20" style={{ backgroundImage: `linear-gradient(${t.gridColor1} 1px, transparent 1px), linear-gradient(90deg, ${t.gridColor1} 1px, transparent 1px)`, backgroundSize: '50px 50px' }}></div>
                            
                            {/* DYNAMIC DRAWING LAYER (RED LINES) */}
                            <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none">
                                <g style={{ transform: 'translate(50%, 50%)' }}>
                                    {/* 1. Straight AB Preview */}
                                    {!guidanceLine && pointA && lineType === 'STRAIGHT_AB' && (
                                        <line 
                                            x1={pointA.x} y1={pointA.y}
                                            x2={worldPos.x} y2={worldPos.y}
                                            stroke="red" strokeWidth="3" strokeDasharray="10,5"
                                        />
                                    )}
                                    
                                    {/* 2. Curve Recording Preview */}
                                    {isRecordingCurve && (
                                        <polyline
                                            points={curvePoints.map(p => `${p.x},${p.y}`).join(' ') + ` ${worldPos.x},${worldPos.y}`}
                                            fill="none" stroke="red" strokeWidth="3"
                                        />
                                    )}

                                    {/* 3. Pivot Radius Preview */}
                                    {!guidanceLine && pivotCenter && lineType === 'PIVOT' && (
                                        <line 
                                            x1={pivotCenter.x} y1={pivotCenter.y}
                                            x2={worldPos.x} y2={worldPos.y}
                                            stroke="red" strokeWidth="3" 
                                        />
                                    )}
                                </g>
                            </svg>

                            {/* RENDER TEMP BOUNDARY WHILE RECORDING */}
                            {isRecordingBoundary && tempBoundary.length > 0 && (
                                <>
                                    {tempBoundary.map((pt, i) => (
                                        <div key={i} className="absolute w-2 h-2 bg-orange-500 rounded-full" style={{ left: `calc(50% + ${pt.x}px)`, top: `calc(50% + ${pt.y}px)` }} />
                                    ))}
                                </>
                            )}

                            {/* RENDER FIELD BOUNDARY */}
                            {fields.find(f => f.id === selectedFieldId)?.boundary.map((pt, i) => (
                                <div key={i} className="absolute w-3 h-3 bg-yellow-500 rounded-full" style={{ left: `calc(50% + ${pt.x}px)`, top: `calc(50% + ${pt.y}px)` }} />
                            ))}

                            {/* AB Lines & Coverage */}
                            {coverageTrail.map((point, i) => <div key={i} className="absolute bg-green-500/30" style={{ left: `calc(50% + ${point.x}px)`, top: `calc(50% + ${point.y}px)`, width: '20px', height: '20px', transform: `translate(-50%, -50%) rotate(${point.h}deg) scale(6, 1)` }}></div>)}
                            {guidanceLine && pointA && <div className="absolute top-[-10000px] bottom-[-10000px] w-1 bg-blue-500/50 shadow-[0_0_10px_rgba(59,130,246,0.5)]" style={{ left: `calc(50% + ${pointA.x}px)` }}></div>}
                            {guidanceLine === 'A_PLUS' && aPlusPoint && <div className="absolute top-[-10000px] bottom-[-10000px] w-1 bg-blue-500/50" style={{ left: `calc(50% + ${aPlusPoint.x}px)`, transform: `rotate(${aPlusHeading}deg)`, transformOrigin: `${aPlusPoint.x}px ${aPlusPoint.y}px` }}></div>}
                            {(guidanceLine === 'CURVE' || isRecordingCurve) && curvePoints.map((pt, i) => <div key={i} className="absolute w-2 h-2 bg-blue-400 rounded-full" style={{ left: `calc(50% + ${pt.x}px)`, top: `calc(50% + ${pt.y}px)` }}></div>)}
                            {guidanceLine === 'PIVOT' && pivotCenter && pivotRadius && [0, 1].map(offset => (<div key={offset} className="absolute border-2 border-blue-500/30 rounded-full" style={{left: `calc(50% + ${pivotCenter.x}px)`, top: `calc(50% + ${pivotCenter.y}px)`, width: `${(pivotRadius + offset * 120) * 2}px`, height: `${(pivotRadius + offset * 120) * 2}px`, transform: 'translate(-50%, -50%)'}}></div>))}

                            {pointA && <div className="absolute flex flex-col items-center" style={{ left: `calc(50% + ${pointA.x}px)`, top: `calc(50% + ${pointA.y}px)`, transform: 'translate(-50%, -50%)' }}><div className="w-6 h-6 bg-blue-600 rounded-full border-2 border-white shadow-lg text-white flex items-center justify-center font-bold text-xs">A</div></div>}
                            {pointB && <div className="absolute flex flex-col items-center" style={{ left: `calc(50% + ${pointB.x}px)`, top: `calc(50% + ${pointB.y}px)`, transform: 'translate(-50%, -50%)' }}><div className="w-6 h-6 bg-blue-600 rounded-full border-2 border-white shadow-lg text-white flex items-center justify-center font-bold text-xs">B</div></div>}
                        </div>
                    </div>
                    
                    <div className="absolute top-[60%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 transition-transform duration-200">
                        <div className="relative group scale-100 lg:scale-110"><TractorVehicle mode={steeringMode} steeringAngle={steeringAngle} /><div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-blue-400/50"></div></div>
                    </div>

                    {isRecordingBoundary && <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-orange-600 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-4 z-50 animate-pulse"><div className="w-3 h-3 bg-white rounded-full animate-ping"></div><span className="font-bold">RECORDING BOUNDARY</span><button onClick={finishBoundaryRecording} className="bg-white text-orange-600 px-4 py-1 rounded-full text-xs font-black hover:bg-slate-100">FINISH</button></div>}

                    <div className="absolute right-24 bottom-32 z-20 flex flex-col gap-2"><button onClick={() => handleZoom('in')} className={`p-2 ${t.bgCard} backdrop-blur border ${t.borderCard} rounded-lg ${t.textMain}`}><Plus className="w-6 h-6"/></button><button onClick={() => handleZoom('out')} className={`p-2 ${t.bgCard} backdrop-blur border ${t.borderCard} rounded-lg ${t.textMain}`}><Minus className="w-6 h-6"/></button></div>
                </div>

                {/* TOP HEADER */}
                <header className={`h-[10%] min-h-[40px] ${t.bgHeader} backdrop-blur-md flex items-center justify-between px-[3%] z-20 border-b ${t.border}`}>
                    <div className="flex items-center gap-[4%] w-1/3"><div className="flex flex-col"><div className={`flex items-center gap-2 text-[10px] lg:text-xs ${t.textSub} uppercase tracking-wider font-bold`}><Layers className="w-3 h-3" /><span>Field / Task</span></div><div className="flex items-center gap-1 lg:gap-2"><span className={`${t.textMain} font-bold text-xs lg:text-base`}>{fields.find(f => f.id === selectedFieldId)?.name}</span><span className={t.textDim}>/</span><span className="text-blue-500 font-bold text-xs lg:text-base">Planting_2023</span></div></div></div>
                    <div className="flex-1 flex justify-center"><div className={`flex items-center gap-4 px-6 py-1.5 rounded-xl border-2 ${Math.abs(crossTrackError)>5?'bg-red-900/20 border-red-500':`${theme==='dark'?'bg-slate-900/60':'bg-white/60'} ${t.borderCard}`}`}><ArrowLeftRight className={`w-5 h-5 ${t.textDim}`}/><div className="flex flex-col items-center w-28"><span className={`text-4xl font-black ${t.textMain}`}>{Math.abs(crossTrackError).toFixed(1)}</span></div><ArrowLeftRight className={`w-5 h-5 ${t.textDim}`}/></div></div>
                    <div className="flex items-center justify-end gap-6 w-1/3"><div className="hidden lg:flex flex-col items-end mr-2"><span className={`font-bold ${t.textMain}`}>{getDisplayHeading()}°</span><span className={`text-xs ${t.textSub}`}>Heading</span></div><div className={`px-3 py-1 rounded border min-w-[70px] ${getRtkColor()}`}><span className="text-xs font-black">{rtkStatus}</span></div></div>
                </header>

                {/* BOTTOM BAR */}
                <div className={`absolute bottom-0 left-0 right-0 h-[14%] min-h-[70px] ${t.bgBottom} backdrop-blur-xl border-t ${t.border} flex items-center justify-between px-[3%] z-30`}>
                    {/* Left Buttons */}
                    <div className="flex gap-4 h-full py-2">
                        <button className={`h-full aspect-square rounded-xl border ${t.borderCard} flex flex-col items-center justify-center ${theme==='dark'?'bg-slate-900':'bg-gray-100'}`}><CornerUpLeft className={`w-8 h-8 ${t.textDim}`}/><span className={`text-xs font-bold ${t.textSub}`}>U-TURN</span></button>
                        <button onClick={() => setIsRecording(!isRecording)} className={`h-full aspect-[4/3] rounded-xl border flex flex-col items-center justify-center ${isRecording?'bg-red-900/20 border-red-500 text-red-500':`${theme==='dark'?'bg-slate-900 border-slate-700':'bg-gray-100 border-gray-300'} ${t.textDim}`}`}><div className={`w-4 h-4 rounded-full ${isRecording?'bg-red-500 animate-pulse':'bg-slate-500'}`}/><span className="text-xs font-black tracking-widest">{isRecording?'REC':'OFF'}</span></button>
                    </div>
                    {/* Center Info */}
                    <div className="flex flex-col items-center"><div className="flex items-end gap-8 pb-2"><div className="text-center"><div className={`text-4xl font-bold ${t.textMain}`}>{Math.abs(speed).toFixed(1)}</div><div className={`text-xs ${t.textSub} uppercase font-bold`}>km/h</div></div><div className={`w-px h-10 ${t.divider}`}></div><div className="text-center"><div className={`text-2xl font-bold ${theme==='dark'?'text-slate-300':'text-slate-600'}`}>2.45</div><div className={`text-xs ${t.textSub} uppercase font-bold`}>Ha Done</div></div></div></div>
                    {/* Engage Button */}
                    <button onClick={toggleSteering} className={`h-[80%] w-[260px] rounded-2xl flex items-center justify-between px-6 shadow-2xl active:scale-95 border ${steeringMode==='AUTO'?'bg-green-600 border-green-400':`${theme==='dark'?'bg-slate-800 border-slate-600':'bg-gray-800 border-gray-600'}`}`}><div className="flex flex-col items-start"><span className={`text-xs font-bold uppercase ${steeringMode==='AUTO'?'text-green-200':'text-slate-400'}`}>System</span><span className={`text-2xl font-black ${steeringMode==='AUTO'?'text-white':'text-white'}`}>{steeringMode==='AUTO'?'ENGAGED':'READY'}</span></div><div className={`w-14 h-14 rounded-full flex items-center justify-center ${steeringMode==='AUTO'?'bg-white/20 text-white':'bg-black/20 text-slate-400'}`}><SteeringWheelIcon className={`w-9 h-9 ${steeringMode==='AUTO'?'animate-spin-slow':''}`}/></div></button>
                </div>

                {/* MODALS */}
                {fieldManagerOpen && <div className={`absolute inset-0 ${theme === 'dark' ? 'bg-slate-950/95' : 'bg-gray-100/95'} z-40 flex overflow-hidden`}>{renderFieldManager()}</div>}
                {settingsOpen && <div className={`absolute inset-0 ${theme === 'dark' ? 'bg-slate-950/95' : 'bg-gray-100/95'} z-40 flex overflow-hidden`}><div className={`w-[25%] border-r ${t.border} ${t.bgPanel} flex flex-col`}><div className={`p-6 border-b ${t.divider}`}><h2 className={`text-xl lg:text-2xl font-bold flex items-center gap-3 ${t.textMain}`}><Settings className="w-6 h-6 lg:w-7 lg:h-7 text-blue-500" />Settings</h2></div><nav className="flex-1 overflow-y-auto p-4 space-y-2"><SettingsTab theme={t} label="Display" icon={Monitor} active={settingsTab === 'display'} onClick={() => setSettingsTab('display')} /><SettingsTab theme={t} label="Vehicle" icon={Tractor} active={settingsTab === 'vehicle'} onClick={() => setSettingsTab('vehicle')} /><SettingsTab theme={t} label="Implement" icon={Ruler} active={settingsTab === 'implement'} onClick={() => setSettingsTab('implement')} /><SettingsTab theme={t} label="Guidance" icon={Navigation} active={settingsTab === 'guidance'} onClick={() => setSettingsTab('guidance')} /><SettingsTab theme={t} label="RTK / GNSS" icon={Radio} active={settingsTab === 'rtk'} onClick={() => setSettingsTab('rtk')} /></nav></div><div className={`flex-1 flex flex-col ${theme === 'dark' ? 'bg-slate-950' : 'bg-gray-50'}`}><div className={`flex items-center justify-between p-6 lg:p-8 border-b ${t.divider} ${theme === 'dark' ? 'bg-slate-900/50' : 'bg-white/50'}`}><h3 className={`text-lg lg:text-xl font-medium ${t.textSub} uppercase tracking-widest`}>{settingsTab} CONFIGURATION</h3><button onClick={() => setSettingsOpen(false)} className={`p-2 lg:p-3 ${t.activeItem} hover:brightness-95 rounded-lg border ${t.borderCard}`}><X className={`w-5 h-5 lg:w-6 lg:h-6 ${t.textMain}`} /></button></div><div className="flex-1 p-6 lg:p-10 overflow-y-auto"><div className="max-w-4xl">{renderSettingsContent()}</div></div><div className={`p-4 lg:p-6 border-t ${t.divider} flex justify-end gap-4 ${theme === 'dark' ? 'bg-slate-900/50' : 'bg-white/50'}`}><button className={`px-6 lg:px-8 py-2 lg:py-3 rounded-lg border ${t.borderCard} ${t.textMain} hover:brightness-95 text-base lg:text-lg`}>Cancel</button><button className="px-6 lg:px-8 py-2 lg:py-3 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-500 shadow-lg shadow-blue-900/20 text-base lg:text-lg">Save Changes</button></div></div></div>}
                {menuOpen && !fieldManagerOpen && !lineModeModalOpen && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6"><div className={`${t.bgPanel} rounded-2xl w-full max-w-lg border ${t.borderCard} shadow-2xl flex flex-col max-h-[85vh]`}><div className={`p-4 border-b ${t.divider} flex justify-between items-center`}><div className="flex items-center gap-2"><Menu className="w-5 h-5 text-blue-500" /><h3 className={`font-bold text-lg ${t.textMain}`}>Quick Menu</h3></div><button onClick={() => setMenuOpen(false)} className={`px-3 py-1 ${theme === 'dark' ? 'bg-slate-800' : 'bg-gray-100'} rounded-lg text-xs hover:brightness-95 border ${t.borderCard} ${t.textMain}`}>Close</button></div><div className="p-4 grid grid-cols-2 gap-3 overflow-y-auto"><div className={`col-span-2 p-3 rounded-xl border ${t.borderCard} ${theme === 'dark' ? 'bg-slate-900' : 'bg-white'}`}><div className="flex items-center gap-2 mb-3"><Gauge className="w-5 h-5 text-orange-500" /><span className={`font-bold ${t.textMain} text-sm`}>Manual Drive</span></div><div className="grid grid-cols-2 gap-4"><div className="flex flex-col gap-1"><span className={`text-[10px] ${t.textSub} uppercase font-bold`}>Speed</span><div className="flex items-center gap-2"><input type="range" min="-5" max="15" value={manualTargetSpeed} onChange={(e) => setManualTargetSpeed(Number(e.target.value))} className="w-full accent-orange-500 h-1.5 bg-slate-600 rounded-lg appearance-none cursor-pointer" /><span className={`font-mono font-bold text-lg w-12 text-center ${t.textMain}`}>{manualTargetSpeed}</span></div></div><div className="flex flex-col gap-1"><span className={`text-[10px] ${t.textSub} uppercase font-bold`}>Steering ({steeringAngle}°)</span><div className="flex items-center gap-1"><button onClick={() => setSteeringAngle(prev => Math.max(prev - 5, -35))} className={`p-1.5 rounded-lg border ${t.borderCard} hover:bg-orange-500/20 active:scale-95`}><RotateCcw className={`w-4 h-4 ${t.textMain}`} /></button><input type="range" min="-35" max="35" value={steeringAngle} onChange={(e) => setSteeringAngle(Number(e.target.value))} className="w-full accent-blue-500 h-1.5 bg-slate-600 rounded-lg appearance-none cursor-pointer" /><button onClick={() => setSteeringAngle(prev => Math.min(prev + 5, 35))} className={`p-1.5 rounded-lg border ${t.borderCard} hover:bg-orange-500/20 active:scale-95`}><RotateCw className={`w-4 h-4 ${t.textMain}`} /></button></div></div></div><p className={`text-[10px] ${t.textSub} mt-2 text-center`}>*Arrow Keys: ↑ ↓ ← →</p></div><QuickAction theme={t} icon={Video} label="Camera" sub="Monitor" /><QuickAction theme={t} icon={AlertTriangle} label="Diagnostics" sub="Errors" /><QuickAction theme={t} icon={Ruler} label="Implement" sub="Width" /><QuickAction theme={t} icon={LocateFixed} label="Calibrate" sub="IMU" /><QuickAction theme={t} icon={Activity} label="Terrain" sub="Comp." /><QuickAction theme={t} icon={Save} label="Save Line" sub="Track" /><QuickAction theme={t} icon={Navigation} label="NMEA" sub="Out" /></div></div></div>
                )}
                {lineModeModalOpen && (
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6"><div className={`${t.bgPanel} rounded-2xl w-full max-w-2xl border ${t.borderCard} shadow-2xl p-6`}><div className="flex justify-between items-center mb-6"><h3 className={`text-xl font-bold ${t.textMain}`}>Select Guidance Mode</h3><button onClick={() => setLineModeModalOpen(false)} className={`p-2 rounded-lg hover:bg-slate-800/50 ${t.textDim}`}><X className="w-6 h-6" /></button></div><div className="grid grid-cols-2 gap-4"><button onClick={() => selectLineMode('STRAIGHT_AB')} className={`p-6 rounded-xl border ${t.borderCard} ${lineType === 'STRAIGHT_AB' ? 'bg-blue-500/10 border-blue-500' : 'hover:bg-slate-800/30'} flex flex-col items-center gap-3 transition-all`}><GitCommitHorizontal className={`w-12 h-12 ${lineType === 'STRAIGHT_AB' ? 'text-blue-500' : t.textDim}`} /><span className={`font-bold text-lg ${t.textMain}`}>Straight AB</span><span className={`text-xs ${t.textSub}`}>Standard straight line A to B</span></button><button onClick={() => selectLineMode('A_PLUS')} className={`p-6 rounded-xl border ${t.borderCard} ${lineType === 'A_PLUS' ? 'bg-blue-500/10 border-blue-500' : 'hover:bg-slate-800/30'} flex flex-col items-center gap-3 transition-all`}><ArrowUpFromDot className={`w-12 h-12 ${lineType === 'A_PLUS' ? 'text-blue-500' : t.textDim}`} /><span className={`font-bold text-lg ${t.textMain}`}>A+ Heading</span><span className={`text-xs ${t.textSub}`}>Straight line with defined heading</span></button><button onClick={() => selectLineMode('CURVE')} className={`p-6 rounded-xl border ${t.borderCard} ${lineType === 'CURVE' ? 'bg-blue-500/10 border-blue-500' : 'hover:bg-slate-800/30'} flex flex-col items-center gap-3 transition-all`}><Spline className={`w-12 h-12 ${lineType === 'CURVE' ? 'text-blue-500' : t.textDim}`} /><span className={`font-bold text-lg ${t.textMain}`}>Curve</span><span className={`text-xs ${t.textSub}`}>Adaptive curved guidance</span></button><button onClick={() => selectLineMode('PIVOT')} className={`p-6 rounded-xl border ${t.borderCard} ${lineType === 'PIVOT' ? 'bg-blue-500/10 border-blue-500' : 'hover:bg-slate-800/30'} flex flex-col items-center gap-3 transition-all`}><CircleDashed className={`w-12 h-12 ${lineType === 'PIVOT' ? 'text-blue-500' : t.textDim}`} /><span className={`font-bold text-lg ${t.textMain}`}>Pivot</span><span className={`text-xs ${t.textSub}`}>Center pivot circular pattern</span></button></div></div></div>
                )}
                {/* ACTION DOCK */}
                <div className="absolute right-[2%] top-[15%] bottom-[18%] w-[7%] min-w-[50px] z-20 flex flex-col justify-center pointer-events-none"><div className={`${t.bgCard} backdrop-blur-md rounded-2xl p-2 shadow-2xl border ${t.borderCard} pointer-events-auto flex flex-col gap-3`}><div className={`flex flex-col gap-1.5 lg:gap-2 pb-2 border-b ${t.divider}`}><span className={`text-[8px] lg:text-[9px] text-center ${t.textSub} font-bold uppercase`}>Mode</span><button onClick={() => setLineModeModalOpen(true)} className={`flex flex-col items-center justify-center gap-1 py-1.5 px-1 rounded-lg hover:${t.activeItem} transition-colors`}>{React.createElement(getLineTypeIcon(), { className: `w-6 h-6 ${t.textMain}` })}<span className={`text-[8px] font-bold ${t.textMain}`}>{lineType.replace('_', ' ')}</span></button></div>{renderActionDock()}<div className={`h-px ${t.divider}`}></div><DockButton theme={t} icon={MoreHorizontal} label="Menu" color="gray" onClick={() => setMenuOpen(true)}/></div></div>
            </main>
        </div>
    </div>
  );
};

const RailButton = ({ icon: Icon, label, active, onClick, theme }) => ( <button onClick={onClick} className={`flex flex-col items-center gap-1 w-full py-[15%] rounded-xl transition-all ${active ? 'bg-blue-600 text-white shadow-lg' : `${theme.textDim} hover:${theme.activeItem} hover:${theme.textMain}`}`}><Icon className="w-5 h-5 lg:w-7 lg:h-7" /><span className="text-[9px] lg:text-[10px] font-bold">{label}</span></button> );
const DockButton = ({ icon: Icon, label, color, onClick, theme, className }) => { const colorClasses = { blue: 'bg-blue-500/10 text-blue-500 border-blue-500/30', green: 'bg-green-500/10 text-green-500 border-green-500/30', orange: 'bg-orange-500/10 text-orange-500 border-orange-500/30', red: 'bg-red-500/10 text-red-500 border-red-500/30', gray: theme.textMain === 'text-white' ? 'bg-slate-800 text-slate-400 border-slate-600' : 'bg-gray-100 text-slate-500 border-gray-300' }; return ( <button onClick={onClick} className={`w-full aspect-square rounded-xl flex flex-col items-center justify-center gap-1 border active:scale-95 ${colorClasses[color] || colorClasses.gray} ${className || ''}`}><Icon className="w-6 h-6" /><span className="text-[10px] font-bold">{label}</span></button> ); };
const QuickAction = ({ icon: Icon, label, sub, theme }) => ( <button className={`flex flex-col items-start p-3 ${theme.textMain === 'text-white' ? 'bg-slate-800/50 hover:bg-slate-800' : 'bg-gray-50 hover:bg-gray-100'} border ${theme.borderCard} rounded-xl hover:border-blue-500/50 transition-all group`}><div className={`p-2 ${theme.activeItem} rounded-lg mb-2 ${theme.textSub} group-hover:text-blue-500 group-hover:bg-blue-500/10 transition-colors`}><Icon className="w-5 h-5" /></div><span className={`text-sm font-bold ${theme.textMain}`}>{label}</span><span className={`text-[10px] ${theme.textSub}`}>{sub}</span></button> );
const TaskOptionButton = ({ icon: Icon, label, onClick, t }) => ( <button onClick={onClick} className={`p-6 rounded-2xl border ${t.borderCard} ${t.bgCard} hover:border-blue-500 hover:bg-blue-500/5 transition-all flex flex-col items-center gap-4 group`}><div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform"><Icon className="w-8 h-8" /></div><span className={`font-bold text-lg ${t.textMain}`}>{label}</span></button> );
const SettingsTab = ({ label, icon: Icon, active, onClick, theme }) => ( <button onClick={onClick} className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors ${active ? 'bg-blue-600 text-white' : theme.textMain}`}><div className="flex items-center gap-3"><Icon className="w-5 h-5" /><span className="text-sm font-medium">{label}</span></div>{active && <ChevronRight className="w-4 h-4" />}</button> );
const SettingInput = ({ label, value, theme }) => ( <div className="flex flex-col gap-2"><label className={`text-xs font-bold uppercase ${theme.textSub}`}>{label}</label><input type="text" defaultValue={value} className={`${theme.bgInput} border ${theme.borderCard} rounded-xl px-4 py-3 ${theme.textMain}`} /></div> );
const SettingToggle = ({ label, active, theme }) => ( <div className={`flex items-center justify-between p-4 ${theme.bgInput} border ${theme.borderCard} rounded-xl`}><span className={`font-bold ${theme.textMain}`}>{label}</span><div className={`w-12 h-7 rounded-full p-1 ${active ? 'bg-green-500' : 'bg-slate-400'}`}><div className={`w-5 h-5 rounded-full bg-white shadow-md transform ${active ? 'translate-x-5' : ''}`}></div></div></div> );
const SettingSlider = ({ label, value, min, max, theme }) => ( <div className={`flex flex-col gap-2 p-4 ${theme.bgInput} border ${theme.borderCard} rounded-xl`}><div className="flex justify-between"><span className={`font-bold ${theme.textMain}`}>{label}</span><span className="text-blue-500 font-mono">{value}%</span></div><input type="range" min={min} max={max} defaultValue={value} className="w-full accent-blue-500 h-2 bg-slate-600 rounded-lg" /></div> );

export default AutoSteerSystem;