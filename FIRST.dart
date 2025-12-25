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
  Scissors
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
  const [settingsTab, setSettingsTab] = useState('display'); 
  const [lineType, setLineType] = useState('AB');
  const [satelliteCount, setSatelliteCount] = useState(12);
  const [notification, setNotification] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1.0);
  const [theme, setTheme] = useState('light'); 

  // --- DATA STATES (Fields, Boundaries, Tasks) ---
  const [fields, setFields] = useState([
      { 
          id: 1, name: "Home_Field_01", area: "12.5 ha", lastUsed: "Today", 
          boundary: [], // List of {x, y}
          tasks: [
              { id: 101, name: "Spring Planting", type: "Planting", date: "2023-10-15", status: "Done" }
          ]
      },
      { 
          id: 2, name: "North_Sector_B", area: "8.2 ha", lastUsed: "Yesterday", 
          boundary: [],
          tasks: []
      },
  ]);
  const [selectedFieldId, setSelectedFieldId] = useState(1);
  
  // --- CREATION WIZARD STATES ---
  const [viewMode, setViewMode] = useState('LIST'); // 'LIST', 'CREATE_FIELD', 'CREATE_TASK'
  const [newFieldName, setNewFieldName] = useState('');
  const [isRecordingBoundary, setIsRecordingBoundary] = useState(false);
  const [tempBoundary, setTempBoundary] = useState([]); // Points being recorded
  
  // AB Line & Coverage
  const [pointA, setPointA] = useState(null); 
  const [pointB, setPointB] = useState(null); 
  const [guidanceLine, setGuidanceLine] = useState(null); 
  const [coverageTrail, setCoverageTrail] = useState([]); 

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

  // --- CONTROLS RESTORED ---
  useEffect(() => {
    const handleKeyDown = (e) => {
        // Only trigger manual controls if no large modals are open, OR if we are recording boundary (which requires driving)
        if (settingsOpen || (fieldManagerOpen && !isRecordingBoundary)) return; 
        
        // Prevent default scrolling behavior for arrow keys
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].indexOf(e.key) > -1) {
            e.preventDefault();
        }

        if (steeringMode === 'MANUAL') {
            if (e.key === 'ArrowUp') {
                setManualTargetSpeed(prev => Math.min(prev + 1, 15));
            } else if (e.key === 'ArrowDown') {
                setManualTargetSpeed(prev => Math.max(prev - 1, -5)); // Allow reverse
            } else if (e.key === 'ArrowLeft') {
                setSteeringAngle(prev => Math.max(prev - 2, -35)); 
            } else if (e.key === 'ArrowRight') {
                setSteeringAngle(prev => Math.min(prev + 2, 35)); 
            } else if (e.key === ' ') { 
                setManualTargetSpeed(0); 
                setSteeringAngle(0); 
            }
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [steeringMode, settingsOpen, fieldManagerOpen, isRecordingBoundary]);

  // --- PHYSICS LOOP RESTORED ---
  useEffect(() => {
    const interval = setInterval(() => {
      // 1. Speed Control
      let currentSpeed = speed;
      const target = steeringMode === 'AUTO' ? 8.5 : manualTargetSpeed;
      
      // Smooth acceleration/deceleration
      if (Math.abs(currentSpeed - target) > 0.1) {
          if (currentSpeed < target) currentSpeed += 0.2;
          else currentSpeed -= 0.5; // Brake faster
      } else {
          currentSpeed = target;
      }
      setSpeed(currentSpeed);

      // 2. Movement Physics
      if (Math.abs(currentSpeed) > 0.05) {
          // Turn rate based on speed and steering angle
          const turnRate = steeringAngle * 0.03 * (currentSpeed / 10); 
          const newHeading = heading + turnRate; 
          setHeading(newHeading);

          const rad = newHeading * Math.PI / 180;
          const moveStep = (currentSpeed / 8.5) * 8; 
          
          // Calculate new position
          const newPos = { 
              x: worldPos.x + Math.sin(rad) * moveStep, 
              y: worldPos.y - Math.cos(rad) * moveStep 
          };
          setWorldPos(newPos);

          // 3. Coverage Logic
          if (isRecording) {
              setCoverageTrail(prev => {
                  const last = prev[prev.length - 1];
                  if (last && Math.hypot(last.x - newPos.x, last.y - newPos.y) < 10) return prev;
                  return [...prev, { x: newPos.x, y: newPos.y, h: newHeading }]; 
              });
          }

          // 4. Boundary Recording Logic (Only when recording boundary)
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
  }, [steeringMode, speed, isRecording, worldPos, manualTargetSpeed, steeringAngle, heading, isRecordingBoundary]);

  // --- FUNCTIONS ---
  const toggleSteering = () => {
    if (!guidanceLine && steeringMode === 'MANUAL') return showNotification("Set AB Line first!", "warning");
    
    if (steeringMode === 'MANUAL') {
        setSteeringMode('AUTO');
        setManualTargetSpeed(0); // Reset manual speed when auto engages
        setSteeringAngle(0); 
        showNotification("Auto Steer ENGAGED", "success");
    } else {
        setSteeringMode('MANUAL');
        showNotification("Manual Control Returned", "warning");
    }
  };

  const showNotification = (msg, type) => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleTrim = (direction) => {
    setCrossTrackError(prev => direction === 'left' ? prev - 1 : prev + 1);
    showNotification(`Trim ${direction === 'left' ? 'Left' : 'Right'} 1cm`, "info");
  };

  // AB Line
  const handleSetA = () => { setPointA({ ...worldPos }); setPointB(null); setGuidanceLine(null); showNotification("Point A Set - Drive forward", "info"); };
  const handleSetB = () => {
      if (!pointA) return showNotification("Set Point A first", "warning");
      if (Math.hypot(worldPos.x - pointA.x, worldPos.y - pointA.y) < 50) return showNotification("Drive further!", "warning");
      setPointB({ ...worldPos }); setGuidanceLine(true); showNotification("AB Line Created!", "success");
  };

  // Field Management
  const startFieldCreation = () => { setViewMode('CREATE_FIELD'); setNewFieldName(''); setTempBoundary([]); };
  const startBoundaryRecording = () => { 
      setFieldManagerOpen(false); // Hide modal to see map
      setIsRecordingBoundary(true); 
      setManualTargetSpeed(5); // Auto start moving slowly
      showNotification("Use Arrow Keys to drive boundary...", "info");
  };
  const finishBoundaryRecording = () => {
      setIsRecordingBoundary(false);
      setManualTargetSpeed(0);
      setFieldManagerOpen(true); // Show modal again
      setViewMode('CREATE_FIELD'); 
  };
  const saveNewField = () => {
      if (!newFieldName) return showNotification("Enter field name", "warning");
      const newField = {
          id: Date.now(),
          name: newFieldName,
          area: (tempBoundary.length * 0.05).toFixed(1) + " ha", 
          lastUsed: "Just now",
          boundary: tempBoundary,
          tasks: []
      };
      setFields(prev => [...prev, newField]);
      setSelectedFieldId(newField.id);
      setViewMode('LIST');
      showNotification("Field Saved Successfully", "success");
  };

  // Task Management
  const startTaskCreation = () => setViewMode('CREATE_TASK');
  const saveNewTask = (type) => {
      const activeField = fields.find(f => f.id === selectedFieldId);
      const newTask = { id: Date.now(), name: `${type} ${new Date().getFullYear()}`, type, date: "Today", status: "Pending" };
      
      const updatedFields = fields.map(f => {
          if (f.id === selectedFieldId) return { ...f, tasks: [newTask, ...f.tasks] };
          return f;
      });
      setFields(updatedFields);
      setViewMode('LIST');
      showNotification(`Task "${newTask.name}" Created`, "success");
  };

  const getDisplayHeading = () => { let h = heading % 360; if (h < 0) h += 360; return h.toFixed(1); };
  const getRtkColor = () => rtkStatus === 'FIX' ? 'bg-green-500 text-white border-green-400' : 'bg-yellow-500 text-black border-yellow-400';

  // --- RENDERERS ---
  const renderFieldManager = () => {
      if (viewMode === 'CREATE_FIELD') {
          return (
              <div className={`flex-1 p-8 flex flex-col ${t.textMain}`}>
                  <div className="mb-6 flex items-center gap-2">
                      <button onClick={() => setViewMode('LIST')} className={`p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800`}><ArrowLeftRight className="w-5 h-5 rotate-180" /></button>
                      <h3 className="text-xl font-bold">Create New Field</h3>
                  </div>
                  
                  <div className="max-w-md mx-auto w-full space-y-6">
                      <div>
                          <label className={`block text-sm font-bold mb-2 ${t.textSub}`}>FIELD NAME</label>
                          <input type="text" value={newFieldName} onChange={e => setNewFieldName(e.target.value)} placeholder="Ex: South Farm 02" className={`w-full p-4 rounded-xl border ${t.borderCard} ${t.bgInput} focus:border-blue-500 outline-none`} />
                      </div>

                      <div className={`p-6 rounded-xl border ${t.borderCard} ${t.bgPanel}`}>
                          <div className="flex justify-between items-center mb-4">
                              <span className="font-bold">Boundary</span>
                              <span className={`text-xs ${tempBoundary.length > 0 ? 'text-green-500' : 'text-orange-500'}`}>{tempBoundary.length > 0 ? 'Recorded' : 'Not Set'}</span>
                          </div>
                          {tempBoundary.length === 0 ? (
                              <button onClick={startBoundaryRecording} className="w-full py-4 rounded-xl border-2 border-dashed border-blue-500/50 text-blue-500 font-bold hover:bg-blue-500/10 flex flex-col items-center gap-2">
                                  <Tractor className="w-8 h-8" />
                                  <span>Drive to Record Boundary</span>
                              </button>
                          ) : (
                              <div className="h-32 bg-slate-900/10 dark:bg-black/20 rounded-lg flex items-center justify-center border border-dashed border-green-500/50">
                                  <CheckCircle2 className="w-8 h-8 text-green-500 mr-2" />
                                  <span className="text-green-600 font-bold">{tempBoundary.length} points captured</span>
                              </div>
                          )}
                      </div>

                      <div className="pt-6 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-4">
                          <button onClick={() => setViewMode('LIST')} className="px-6 py-3 rounded-xl border font-bold text-slate-500">Cancel</button>
                          <button onClick={saveNewField} className="px-8 py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-500 shadow-lg">Save Field</button>
                      </div>
                  </div>
              </div>
          );
      }

      if (viewMode === 'CREATE_TASK') {
          return (
              <div className={`flex-1 p-8 flex flex-col ${t.textMain}`}>
                  <div className="mb-6 flex items-center gap-2">
                      <button onClick={() => setViewMode('LIST')} className={`p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800`}><ArrowLeftRight className="w-5 h-5 rotate-180" /></button>
                      <h3 className="text-xl font-bold">New Task for {fields.find(f => f.id === selectedFieldId)?.name}</h3>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6 max-w-2xl mx-auto">
                      <TaskOptionButton icon={Tractor} label="Tillage / Plowing" onClick={() => saveNewTask("Tillage")} t={t} />
                      <TaskOptionButton icon={Sprout} label="Planting / Seeding" onClick={() => saveNewTask("Planting")} t={t} />
                      <TaskOptionButton icon={Droplets} label="Spraying" onClick={() => saveNewTask("Spraying")} t={t} />
                      <TaskOptionButton icon={Scissors} label="Harvesting" onClick={() => saveNewTask("Harvesting")} t={t} />
                  </div>
              </div>
          );
      }

      // Default LIST View
      const activeField = fields.find(f => f.id === selectedFieldId);
      return (
          <div className="flex h-full">
              {/* Sidebar List */}
              <div className={`w-[35%] border-r ${t.border} ${t.bgPanel} flex flex-col`}>
                  <div className={`p-6 border-b ${t.divider}`}>
                      <h2 className={`text-xl font-bold flex items-center gap-3 ${t.textMain}`}><LayoutGrid className="w-6 h-6 text-blue-500" />Field Manager</h2>
                  </div>
                  <div className="p-4"><button onClick={startFieldCreation} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold flex justify-center gap-2 hover:bg-blue-500"><Plus className="w-5 h-5" /> New Field</button></div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-2">
                      {fields.map(f => (
                          <button key={f.id} onClick={() => setSelectedFieldId(f.id)} className={`w-full text-left p-4 rounded-xl border transition-all ${selectedFieldId === f.id ? t.selectedItem : `${t.bgCard} ${t.border} hover:brightness-95`}`}>
                              <div className="flex justify-between items-start"><div className="flex gap-3"><div className={`w-10 h-10 rounded-lg flex items-center justify-center ${selectedFieldId === f.id ? 'bg-blue-500 text-white' : 'bg-slate-300 dark:bg-slate-800 text-slate-500'}`}><MapIcon className="w-6 h-6" /></div><div><h4 className={`font-bold ${t.textMain}`}>{f.name}</h4><span className={`text-xs ${t.textSub}`}>{f.area}</span></div></div>{selectedFieldId === f.id && <CheckCircle2 className="w-5 h-5 text-blue-500" />}</div>
                          </button>
                      ))}
                  </div>
              </div>
              
              {/* Details Content */}
              <div className={`flex-1 flex flex-col ${theme === 'dark' ? 'bg-slate-950' : 'bg-gray-50'}`}>
                  <div className={`p-6 border-b ${t.divider} flex justify-between items-center`}>
                      <h3 className={`text-lg font-bold uppercase ${t.textSub}`}>{activeField?.name} OVERVIEW</h3>
                      <button onClick={() => setFieldManagerOpen(false)} className={`p-2 rounded-lg border ${t.borderCard} hover:bg-slate-200 dark:hover:bg-slate-800`}><X className={`w-6 h-6 ${t.textMain}`} /></button>
                  </div>
                  <div className="flex-1 p-8 overflow-y-auto space-y-8">
                      {/* Boundary Section */}
                      <div className={`p-6 rounded-xl border ${t.borderCard} ${t.bgPanel}`}>
                          <div className="flex justify-between mb-4"><h4 className={`font-bold uppercase ${t.textSub}`}>Boundary & Lines</h4></div>
                          <div className="flex items-center gap-4">
                              <div className={`flex-1 h-32 border-2 border-dashed ${activeField.boundary.length > 0 ? 'border-green-500/50 bg-green-500/10' : 'border-slate-500/30'} rounded-lg flex flex-col items-center justify-center`}>
                                  {activeField.boundary.length > 0 ? <><CheckCircle2 className="w-8 h-8 text-green-500 mb-2"/><span className="text-green-600 font-bold">Boundary Set</span></> : <><MapIcon className="w-8 h-8 opacity-30 mb-2"/><span>No Boundary</span></>}
                              </div>
                              <div className="flex-1 space-y-2">
                                  <div className={`p-3 rounded-lg border ${t.borderCard} flex justify-between items-center`}><span className={t.textMain}>AB Line 01</span><span className="text-xs bg-blue-500 text-white px-2 py-1 rounded">Active</span></div>
                                  <div className={`p-3 rounded-lg border ${t.borderCard} opacity-50 flex justify-between items-center`}><span>Curve 02</span><span className="text-xs">2 days ago</span></div>
                              </div>
                          </div>
                      </div>

                      {/* Tasks Section */}
                      <div className={`p-6 rounded-xl border ${t.borderCard} ${t.bgPanel}`}>
                          <div className="flex justify-between items-center mb-4">
                              <h4 className={`font-bold uppercase ${t.textSub}`}>Tasks History</h4>
                              <button onClick={startTaskCreation} className="text-sm font-bold text-blue-500 hover:underline flex items-center gap-1"><Plus className="w-4 h-4"/> New Task</button>
                          </div>
                          {activeField.tasks.length > 0 ? (
                              <div className="space-y-2">
                                  {activeField.tasks.map(task => (
                                      <div key={task.id} className={`flex items-center justify-between p-4 rounded-lg ${t.activeItem}`}>
                                          <div className="flex items-center gap-4">
                                              <div className="p-2 rounded bg-blue-500/20 text-blue-500">
                                                  {task.type === 'Planting' ? <Sprout className="w-5 h-5"/> : task.type === 'Spraying' ? <Droplets className="w-5 h-5"/> : <Tractor className="w-5 h-5"/>}
                                              </div>
                                              <div><div className={`font-bold ${t.textMain}`}>{task.name}</div><div className={`text-xs ${t.textSub}`}>{task.date}</div></div>
                                          </div>
                                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-500/20 text-green-500">{task.status}</span>
                                      </div>
                                  ))}
                              </div>
                          ) : (
                              <div className={`text-center py-8 ${t.textDim}`}>No tasks recorded yet.</div>
                          )}
                      </div>
                  </div>
              </div>
          </div>
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
                        </div>
                    </div>
                    
                    <div className="absolute top-[60%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 transition-transform duration-200">
                        <div className="relative group scale-100 lg:scale-110">
                            <TractorVehicle mode={steeringMode} steeringAngle={steeringAngle} />
                            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-32 h-1 bg-blue-400/50"></div>
                        </div>
                    </div>

                    {/* RECORDING BOUNDARY OVERLAY */}
                    {isRecordingBoundary && (
                        <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-orange-600 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-4 z-50 animate-pulse">
                            <div className="w-3 h-3 bg-white rounded-full animate-ping"></div>
                            <span className="font-bold">RECORDING BOUNDARY</span>
                            <button onClick={finishBoundaryRecording} className="bg-white text-orange-600 px-4 py-1 rounded-full text-xs font-black hover:bg-slate-100">FINISH</button>
                        </div>
                    )}

                    <div className="absolute right-24 bottom-32 z-20 flex flex-col gap-2">
                        <button onClick={() => setZoomLevel(z => Math.min(z+0.2, 2))} className={`p-2 ${t.bgCard} backdrop-blur border ${t.borderCard} rounded-lg ${t.textMain}`}><Plus className="w-6 h-6"/></button>
                        <button onClick={() => setZoomLevel(z => Math.max(z-0.2, 0.6))} className={`p-2 ${t.bgCard} backdrop-blur border ${t.borderCard} rounded-lg ${t.textMain}`}><Minus className="w-6 h-6"/></button>
                    </div>
                </div>

                {/* TOP HEADER */}
                <header className={`h-[10%] min-h-[40px] ${t.bgHeader} backdrop-blur-md flex items-center justify-between px-[3%] z-20 border-b ${t.border}`}>
                    <div className="flex items-center gap-[4%] w-1/3">
                        <div className="flex flex-col">
                            <div className={`flex items-center gap-2 text-[10px] lg:text-xs ${t.textSub} uppercase tracking-wider font-bold`}><Layers className="w-3 h-3" /><span>Field / Task</span></div>
                            <div className="flex items-center gap-1 lg:gap-2"><span className={`${t.textMain} font-bold text-xs lg:text-base`}>{fields.find(f => f.id === selectedFieldId)?.name}</span><span className={t.textDim}>/</span><span className="text-blue-500 font-bold text-xs lg:text-base">Planting_2023</span></div>
                        </div>
                    </div>
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
                    <button onClick={toggleSteering} className={`h-[80%] w-[260px] rounded-2xl flex items-center justify-between px-6 shadow-2xl active:scale-95 border ${steeringMode==='AUTO'?'bg-green-600 border-green-400':`${theme==='dark'?'bg-slate-800 border-slate-600':'bg-gray-800 border-gray-600'}`}`}>
                        <div className="flex flex-col items-start"><span className={`text-xs font-bold uppercase ${steeringMode==='AUTO'?'text-green-200':'text-slate-400'}`}>System</span><span className={`text-2xl font-black ${steeringMode==='AUTO'?'text-white':'text-white'}`}>{steeringMode==='AUTO'?'ENGAGED':'READY'}</span></div>
                        <div className={`w-14 h-14 rounded-full flex items-center justify-center ${steeringMode==='AUTO'?'bg-white/20 text-white':'bg-black/20 text-slate-400'}`}><SteeringWheelIcon className={`w-9 h-9 ${steeringMode==='AUTO'?'animate-spin-slow':''}`}/></div>
                    </button>
                </div>

                {/* MODALS */}
                {/* Field Manager Modal */}
                {fieldManagerOpen && (
                    <div className={`absolute inset-0 ${theme === 'dark' ? 'bg-slate-950/95' : 'bg-gray-100/95'} z-40 flex overflow-hidden`}>
                        {renderFieldManager()}
                    </div>
                )}
                
                {/* Quick Actions / Manual Drive RESTORED */}
                {menuOpen && !fieldManagerOpen && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6">
                        <div className={`${t.bgPanel} rounded-2xl w-full max-w-2xl border ${t.borderCard} shadow-2xl flex flex-col max-h-[90vh]`}>
                            <div className={`p-5 border-b ${t.divider} flex justify-between items-center`}><h3 className={`font-bold text-xl ${t.textMain}`}>Controls & Shortcuts</h3><button onClick={() => setMenuOpen(false)} className="px-4 py-2 border rounded">Close</button></div>
                            <div className="p-8 grid grid-cols-2 gap-6 overflow-y-auto">
                                {/* MANUAL DRIVE CONTROL */}
                                <div className={`col-span-2 p-4 rounded-xl border ${t.borderCard} ${theme === 'dark' ? 'bg-slate-900' : 'bg-white'}`}>
                                    <div className="flex items-center gap-3 mb-4"><Gauge className="w-6 h-6 text-orange-500" /><span className={`font-bold ${t.textMain}`}>Manual Drive Control</span></div>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="flex flex-col gap-2">
                                            <span className={`text-xs ${t.textSub} uppercase font-bold`}>Target Speed</span>
                                            <div className="flex items-center gap-4">
                                                <input type="range" min="-5" max="15" value={manualTargetSpeed} onChange={(e) => setManualTargetSpeed(Number(e.target.value))} className="w-full accent-orange-500 h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer" />
                                                <span className={`font-mono font-bold text-xl w-24 text-center ${t.textMain}`}>{manualTargetSpeed} <span className="text-xs">km/h</span></span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-2">
                                            <span className={`text-xs ${t.textSub} uppercase font-bold`}>Steering ({steeringAngle}°)</span>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => setSteeringAngle(prev => Math.max(prev - 5, -35))} className={`p-2 rounded-lg border ${t.borderCard} hover:bg-orange-500/20 active:scale-95`}><RotateCcw className={`w-5 h-5 ${t.textMain}`} /></button>
                                                <input type="range" min="-35" max="35" value={steeringAngle} onChange={(e) => setSteeringAngle(Number(e.target.value))} className="w-full accent-blue-500 h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer" />
                                                <button onClick={() => setSteeringAngle(prev => Math.min(prev + 5, 35))} className={`p-2 rounded-lg border ${t.borderCard} hover:bg-orange-500/20 active:scale-95`}><RotateCw className={`w-5 h-5 ${t.textMain}`} /></button>
                                            </div>
                                        </div>
                                    </div>
                                    <p className={`text-xs ${t.textSub} mt-2`}>*Use Arrow Keys: ↑ Forward, ↓ Brake/Reverse, ← → Turn</p>
                                </div>
                                <QuickAction theme={t} icon={Video} label="Camera" sub="Monitor" />
                                <QuickAction theme={t} icon={AlertTriangle} label="Diagnostics" sub="Errors" />
                                <QuickAction theme={t} icon={Ruler} label="Implement" sub="Width/Offset" />
                                <QuickAction theme={t} icon={LocateFixed} label="Calibration" sub="IMU/Angle" />
                                <QuickAction theme={t} icon={Activity} label="Terrain" sub="Compensation" />
                                <QuickAction theme={t} icon={Save} label="Save Line" sub="Current Track" />
                                <QuickAction theme={t} icon={Navigation} label="NMEA" sub="Output" />
                            </div>
                        </div>
                    </div>
                )}

                {/* FULL SETTINGS MENU */}
                {settingsOpen && (
                    <div className={`absolute inset-0 ${theme === 'dark' ? 'bg-slate-950/95' : 'bg-gray-100/95'} z-40 flex overflow-hidden`}>
                        <div className={`w-[25%] border-r ${t.border} ${t.bgPanel} flex flex-col`}>
                            <div className={`p-6 border-b ${t.divider}`}><h2 className={`text-xl lg:text-2xl font-bold flex items-center gap-3 ${t.textMain}`}><Settings className="w-6 h-6 lg:w-7 lg:h-7 text-blue-500" />Settings</h2></div>
                            <nav className="flex-1 overflow-y-auto p-4 space-y-2">
                                <SettingsTab theme={t} label="Display" icon={Monitor} active={settingsTab === 'display'} onClick={() => setSettingsTab('display')} />
                                <SettingsTab theme={t} label="Vehicle" icon={Tractor} active={settingsTab === 'vehicle'} onClick={() => setSettingsTab('vehicle')} />
                                <SettingsTab theme={t} label="Implement" icon={Ruler} active={settingsTab === 'implement'} onClick={() => setSettingsTab('implement')} />
                                <SettingsTab theme={t} label="Guidance" icon={Navigation} active={settingsTab === 'guidance'} onClick={() => setSettingsTab('guidance')} />
                                <SettingsTab theme={t} label="RTK / GNSS" icon={Radio} active={settingsTab === 'rtk'} onClick={() => setSettingsTab('rtk')} />
                            </nav>
                        </div>
                        <div className={`flex-1 flex flex-col ${theme === 'dark' ? 'bg-slate-950' : 'bg-gray-50'}`}>
                            <div className={`flex items-center justify-between p-6 lg:p-8 border-b ${t.divider} ${theme === 'dark' ? 'bg-slate-900/50' : 'bg-white/50'}`}>
                                <h3 className={`text-lg lg:text-xl font-medium ${t.textSub} uppercase tracking-widest`}>{settingsTab} CONFIGURATION</h3>
                                <button onClick={() => setSettingsOpen(false)} className={`p-2 lg:p-3 ${t.activeItem} hover:brightness-95 rounded-lg border ${t.borderCard}`}><X className={`w-5 h-5 lg:w-6 lg:h-6 ${t.textMain}`} /></button>
                            </div>
                            <div className="flex-1 p-6 lg:p-10 overflow-y-auto"><div className="max-w-4xl">{renderSettingsContent()}</div></div>
                            <div className={`p-4 lg:p-6 border-t ${t.divider} flex justify-end gap-4 ${theme === 'dark' ? 'bg-slate-900/50' : 'bg-white/50'}`}>
                                <button className={`px-6 lg:px-8 py-2 lg:py-3 rounded-lg border ${t.borderCard} ${t.textMain} hover:brightness-95 text-base lg:text-lg`}>Cancel</button>
                                <button className="px-6 lg:px-8 py-2 lg:py-3 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-500 shadow-lg shadow-blue-900/20 text-base lg:text-lg">Save Changes</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* RESTORED: DYNAMIC ACTION DOCK (Right) */}
                <div className="absolute right-[2%] top-[15%] bottom-[18%] w-[7%] min-w-[50px] z-20 flex flex-col justify-center pointer-events-none">
                    <div className={`${t.bgCard} backdrop-blur-md rounded-2xl p-2 shadow-2xl border ${t.borderCard} pointer-events-auto flex flex-col gap-3`}>
                        {steeringMode === 'MANUAL' ? (
                            <>
                                <div className={`flex flex-col gap-1.5 lg:gap-2 pb-2 border-b ${t.divider}`}>
                                    <span className={`text-[8px] lg:text-[9px] text-center ${t.textSub} font-bold uppercase`}>Line Type</span>
                                    <button onClick={() => setLineType('AB')} className={`text-[8px] lg:text-[9px] font-bold py-1.5 px-1 rounded-lg ${lineType === 'AB' ? 'bg-blue-600 text-white' : `${t.textDim} hover:bg-slate-100 dark:hover:bg-slate-800`}`}>AB LINE</button>
                                </div>
                                <DockButton theme={t} icon={Target} label="Set A" color={pointA?"green":"blue"} onClick={handleSetA}/>
                                <DockButton theme={t} icon={Target} label="Set B" color={pointB?"green":"blue"} onClick={handleSetB}/>
                                <DockButton theme={t} icon={ArrowLeftRight} label="Shift" color="gray"/>
                            </>
                        ) : (
                            <>
                                <span className={`text-[8px] lg:text-[9px] text-center ${t.textSub} font-bold uppercase pt-1`}>TRIM</span>
                                <DockButton theme={t} icon={CornerUpLeft} label="L 1cm" color="green" onClick={() => handleTrim('left')}/>
                                <DockButton theme={t} icon={CornerUpRight} label="R 1cm" color="green" onClick={() => handleTrim('right')}/>
                                <div className={`h-px ${t.divider} mx-1`}></div>
                                <DockButton theme={t} icon={Pause} label="Pause" color="orange" onClick={toggleSteering}/>
                            </>
                        )}
                        <div className={`h-px ${t.divider}`}></div>
                        <DockButton theme={t} icon={MoreHorizontal} label="Menu" color="gray" onClick={() => setMenuOpen(true)}/>
                    </div>
                </div>

            </main>
        </div>
    </div>
  );
};

// --- SUB COMPONENTS ---
const RailButton = ({ icon: Icon, label, active, onClick, theme }) => ( <button onClick={onClick} className={`flex flex-col items-center gap-1 w-full py-[15%] rounded-xl transition-all ${active ? 'bg-blue-600 text-white shadow-lg' : `${theme.textDim} hover:${theme.activeItem} hover:${theme.textMain}`}`}><Icon className="w-5 h-5 lg:w-7 lg:h-7" /><span className="text-[9px] lg:text-[10px] font-bold">{label}</span></button> );
const DockButton = ({ icon: Icon, label, color, onClick, theme }) => {
    const defaultStyle = theme.textMain === 'text-white' ? 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border-slate-600' : 'bg-gray-100 text-slate-500 hover:bg-gray-200 hover:text-slate-900 border-gray-300';
    const colorClasses = { blue: 'bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white border-blue-500/30', green: 'bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white border-green-500/30', orange: 'bg-orange-500/10 text-orange-500 hover:bg-orange-500 hover:text-white border-orange-500/30', gray: defaultStyle };
    return ( <button onClick={onClick} className={`w-full aspect-square rounded-xl flex flex-col items-center justify-center gap-1 border active:scale-95 ${colorClasses[color] || colorClasses.gray}`}><Icon className="w-6 h-6" /><span className="text-[10px] font-bold">{label}</span></button> );
};
const TaskOptionButton = ({ icon: Icon, label, onClick, t }) => (
    <button onClick={onClick} className={`p-6 rounded-2xl border ${t.borderCard} ${t.bgCard} hover:border-blue-500 hover:bg-blue-500/5 transition-all flex flex-col items-center gap-4 group`}>
        <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform"><Icon className="w-8 h-8" /></div>
        <span className={`font-bold text-lg ${t.textMain}`}>{label}</span>
    </button>
);
const SettingsTab = ({ label, icon: Icon, active, onClick, theme }) => ( <button onClick={onClick} className={`w-full flex items-center justify-between p-3 rounded-xl transition-colors ${active ? 'bg-blue-600 text-white' : theme.textMain}`}><div className="flex items-center gap-3"><Icon className="w-5 h-5" /><span className="text-sm font-medium">{label}</span></div>{active && <ChevronRight className="w-4 h-4" />}</button> );
const SettingInput = ({ label, value, theme }) => ( <div className="flex flex-col gap-2"><label className={`text-xs font-bold uppercase ${theme.textSub}`}>{label}</label><input type="text" defaultValue={value} className={`${theme.bgInput} border ${theme.borderCard} rounded-xl px-4 py-3 ${theme.textMain}`} /></div> );
const SettingToggle = ({ label, active, theme }) => ( <div className={`flex items-center justify-between p-4 ${theme.bgInput} border ${theme.borderCard} rounded-xl`}><span className={`font-bold ${theme.textMain}`}>{label}</span><div className={`w-12 h-7 rounded-full p-1 ${active ? 'bg-green-500' : 'bg-slate-400'}`}><div className={`w-5 h-5 rounded-full bg-white shadow-md transform ${active ? 'translate-x-5' : ''}`}></div></div></div> );
const SettingSlider = ({ label, value, min, max, theme }) => ( <div className={`flex flex-col gap-2 p-4 ${theme.bgInput} border ${theme.borderCard} rounded-xl`}><div className="flex justify-between"><span className={`font-bold ${theme.textMain}`}>{label}</span><span className="text-blue-500 font-mono">{value}%</span></div><input type="range" min={min} max={max} defaultValue={value} className="w-full accent-blue-500 h-2 bg-slate-600 rounded-lg" /></div> );

export default AutoSteerSystem;