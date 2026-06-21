const { useState, useEffect } = React;

const MockBackend = (() => {
  const STORAGE_KEY = 'autosteer.local.db.v1';
  const STORAGE_VERSION = 1;
  const PERSISTED_KEYS = [
    'vehicleSettings',
    'vehicleProfiles',
    'implementSettings',
    'implementProfiles',
    'rtkSettings',
    'wifiSettings',
    'uTurnSettings',
    'systemHealth',
    'gnssTelemetry',
    'fields',
    'selectedFieldId',
    'activeTaskId',
    'loadedField',
    'activeBoundaryIdx',
    'activeLineId',
    'lineType',
    'isMultiLineMode',
    'manualOffset',
    'showGuidanceLines',
    'guidanceLine',
    'pointA',
    'pointB',
    'aPlusPoint',
    'aPlusHeading',
    'curvePoints',
    'pivotCenter',
    'pivotRadius',
    'currentFieldBoundaries',
    'localDatabase'
  ];

  const createInitialState = () => ({
    localDatabase: {
      enabled: true,
      adapter: 'localStorage',
      name: 'Autosteer Local DB',
      storageKey: STORAGE_KEY,
      version: STORAGE_VERSION,
      lastLoadedAt: null,
      lastSavedAt: null,
      status: 'Ready'
    },
    vehicleSettings: {
      profileId: 'tractor-4wd',
      type: 'Tractor 4WD',
      wheelbase: 2.5,
      frontAxleWidth: 1.95,
      rearAxleWidth: 2.65,
      antennaHeight: 3.20,
      antennaOffset: 0,
      rearHitch: 1.10,
      turnRadius: 6.5,
      steeringType: 'Front axle',
      hitchType: 'Rear 3-point'
    },
    vehicleProfiles: [
      { id: 'tractor-4wd', label: 'Tractor 4WD', detail: 'Standard rear implement tractor', type: 'Tractor 4WD', wheelbase: 2.5, frontAxleWidth: 1.95, rearAxleWidth: 2.65, antennaHeight: 3.2, antennaOffset: 0, rearHitch: 1.1, turnRadius: 6.5, steeringType: 'Front axle', hitchType: 'Rear 3-point' },
      { id: 'articulated', label: 'Articulated', detail: 'Large articulated tractor', type: 'Articulated Tractor', wheelbase: 3.4, frontAxleWidth: 2.9, rearAxleWidth: 2.9, antennaHeight: 3.45, antennaOffset: 0, rearHitch: 1.4, turnRadius: 8.0, steeringType: 'Articulated', hitchType: 'Drawbar' },
      { id: 'self-propelled', label: 'Self Propelled', detail: 'Sprayer / applicator chassis', type: 'Self Propelled', wheelbase: 3.0, frontAxleWidth: 3.2, rearAxleWidth: 3.2, antennaHeight: 3.8, antennaOffset: 0, rearHitch: 0.5, turnRadius: 7.2, steeringType: 'Front axle', hitchType: 'Integrated' }
    ],
    implementSettings: {
      profileId: 'planter-6r',
      name: 'Planter_6R',
      type: 'Planter',
      width: DEFAULT_IMPLEMENT_WIDTH,
      sections: 6,
      rowSpacing: 0.5,
      overlap: 0.1,
      offset: 0,
      delayOn: 0.5,
      delayOff: 0.2,
      controlMode: 'Section Control'
    },
    implementProfiles: [
      { id: 'planter-6r', label: 'Planter 6R', detail: '6 rows / 3.0 m', name: 'Planter_6R', type: 'Planter', width: 3.0, sections: 6, rowSpacing: 0.5, overlap: 0.1, offset: 0, delayOn: 0.5, delayOff: 0.2, controlMode: 'Section Control' },
      { id: 'sprayer-12m', label: 'Sprayer 12m', detail: '6 sections / boom', name: 'Sprayer_12m', type: 'Sprayer', width: 12.0, sections: 6, rowSpacing: 0, overlap: 0.2, offset: 0, delayOn: 0.8, delayOff: 0.4, controlMode: 'Boom Sections' },
      { id: 'spreader-18m', label: 'Spreader 18m', detail: 'Spinner spread pattern', name: 'Spreader_18m', type: 'Spreader', width: 18.0, sections: 2, rowSpacing: 0, overlap: 0.3, offset: 0, delayOn: 1.0, delayOff: 0.6, controlMode: 'Rate Control' },
      { id: 'blade-2_4m', label: 'Blade 2.4m', detail: 'Land leveling blade', name: 'Blade_2_4m', type: 'Blade', width: 2.4, sections: 1, rowSpacing: 0, overlap: 0, offset: 0, delayOn: 0, delayOff: 0, controlMode: 'Manual Lift' },
      { id: 'custom', label: 'Custom', detail: 'Build from width / sections', name: 'Custom_Implement', type: 'Custom', width: 3.0, sections: 1, rowSpacing: 0, overlap: 0, offset: 0, delayOn: 0, delayOff: 0, controlMode: 'Manual Lift' }
    ],
    rtkSettings: {
      correctionSource: 'Base Station',
      receiverPort: 'COM3',
      baudRate: '115200',
      protocol: 'RTCM3',
      ntripHost: 'rtk.sveaverken.com',
      port: '2101',
      mountpoint: 'VRS_RTCM32',
      user: 'user123',
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
      radioFrequency: '464.500'
    },
    wifiSettings: {
      enabled: true,
      mode: 'Client',
      status: 'Connected',
      ssid: 'Farm_RTK_Network',
      security: 'WPA2/WPA3',
      password: '',
      signalDbm: -58,
      channel: '6',
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
      savedNetworks: [
        { ssid: 'Farm_RTK_Network', security: 'WPA2/WPA3', signalDbm: -58, status: 'Connected' },
        { ssid: 'Tractor_Hotspot', security: 'WPA2', signalDbm: -67, status: 'Saved' },
        { ssid: 'Workshop_AP', security: 'WPA2', signalDbm: -74, status: 'Saved' }
      ]
    },
    uTurnSettings: {
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
      requireBoundary: false
    },
    systemHealth: {
      gnss: 'OK',
      imu: 'OK',
      steering: 'OK',
      canbus: 'OK',
      obd: 'OK',
      camera: 'OK'
    },
    runStatus: {
      steeringState: 'READY',
      steeringReason: 'Line loaded, RTK fixed',
      overrideDetected: false,
      engageAllowed: true,
      recoveryAction: 'Engage autosteer'
    },
    rtkTelemetry: {
      fixType: 'FIX',
      ageSec: 1.2,
      latencyMs: 48,
      hdop: 0.7,
      pdop: 1.1,
      baseSource: 'BASE-01',
      lastUpdateTs: Date.now()
    },
    gnssTelemetry: {
      roverVisibleSats: 38,
      roverUsedSats: 12,
      baseVisibleSats: 4,
      constellations: 'GPS / GLO / GAL / BDS',
      roverStatus: 'FIX',
      horizontalAccuracyCm: 2.2,
      verticalAccuracyCm: 3.1,
      correctionAgeSec: 1.2,
      baselineKm: 0.8,
      antenna: 'Rover roof'
    },
    runKpi: {
      xteCm: 0,
      headingErrDeg: 0,
      speedKmh: 0,
      targetSpeedKmh: 0,
      areaDoneHa: 0,
      areaRemainingHa: 12.5,
      etaMin: null,
      workRateHaHr: 0,
      passIndex: 0
    },
    alarms: [],
    eventLog: [
      { id: 1, severity: 'info', message: 'System ready', timestamp: new Date().toISOString(), acked: true }
    ],
    lineType: 'STRAIGHT_AB',
    isMultiLineMode: true,
    manualOffset: 0,
    showGuidanceLines: true,
    guidanceLine: null,
    pointA: null,
    pointB: null,
    aPlusPoint: null,
    aPlusHeading: null,
    isRecordingCurve: false,
    curvePoints: [],
    pivotCenter: null,
    pivotRadius: null,
    coverageTrail: [],
    fields: [
      {
        id: 1,
        name: 'Home_Field_01',
        area: '12.5 ha',
        lastUsed: 'Today',
        boundaries: [],
        lines: [
          {
            id: 101,
            name: 'Main AB',
            type: 'STRAIGHT_AB',
            isMulti: true,
            date: '2023-10-01',
            points: { a: { x: 0, y: -200 }, b: { x: 0, y: 200 } }
          }
        ],
        tasks: [
          {
            id: 201,
            name: 'Spring Planting',
            type: 'Planting',
            date: '2023-10-15',
            status: 'Paused'
          }
        ]
      },
      {
        id: 2,
        name: 'North_Sector_B',
        area: '8.2 ha',
        lastUsed: 'Yesterday',
        boundaries: [],
        lines: [],
        tasks: []
      }
    ],
    selectedFieldId: 1,
    activeTaskId: null,
    loadedField: null,
    activeBoundaryIdx: 0,
    activeLineId: null,
    viewMode: 'LIST',
    newFieldName: '',
    isRecordingBoundary: false,
    tempBoundary: [],
    currentFieldBoundaries: []
  });

  const pickPersistedState = (source) => PERSISTED_KEYS.reduce((acc, key) => {
    if (source[key] !== undefined) acc[key] = source[key];
    return acc;
  }, {});

  const readPersistedState = () => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== STORAGE_VERSION || !parsed.data) return null;
      return parsed;
    } catch (error) {
      console.warn('Failed to read local database', error);
      return null;
    }
  };

  const hydrateState = () => {
    const base = createInitialState();
    const persisted = readPersistedState();
    if (!persisted) return base;

    const next = { ...base, ...persisted.data };
    next.vehicleSettings = { ...base.vehicleSettings, ...(persisted.data.vehicleSettings || {}) };
    next.implementSettings = { ...base.implementSettings, ...(persisted.data.implementSettings || {}) };
    next.rtkSettings = { ...base.rtkSettings, ...(persisted.data.rtkSettings || {}) };
    next.wifiSettings = { ...base.wifiSettings, ...(persisted.data.wifiSettings || {}) };
    next.uTurnSettings = { ...base.uTurnSettings, ...(persisted.data.uTurnSettings || {}) };
    next.systemHealth = { ...base.systemHealth, ...(persisted.data.systemHealth || {}) };
    next.gnssTelemetry = { ...base.gnssTelemetry, ...(persisted.data.gnssTelemetry || {}) };
    next.localDatabase = {
      ...base.localDatabase,
      ...(persisted.data.localDatabase || {}),
      storageKey: STORAGE_KEY,
      version: STORAGE_VERSION,
      lastLoadedAt: new Date().toISOString(),
      lastSavedAt: persisted.savedAt || persisted.data.localDatabase?.lastSavedAt || null,
      status: 'Loaded'
    };
    return next;
  };

  let state = hydrateState();

  const listeners = new Set();

  const emit = () => {
    listeners.forEach((listener) => listener(state));
  };

  const persistState = () => {
    if (!state.localDatabase?.enabled) return;
    try {
      const savedAt = new Date().toISOString();
      state = {
        ...state,
        localDatabase: {
          ...state.localDatabase,
          storageKey: STORAGE_KEY,
          version: STORAGE_VERSION,
          lastSavedAt: savedAt,
          status: 'Saved'
        }
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
        version: STORAGE_VERSION,
        savedAt,
        data: pickPersistedState(state)
      }));
    } catch (error) {
      state = {
        ...state,
        localDatabase: {
          ...state.localDatabase,
          status: 'Save failed'
        }
      };
      console.warn('Failed to save local database', error);
    }
  };

  const setState = (patch) => {
    state = { ...state, ...patch };
    const shouldPersist = Object.keys(patch).some((key) => PERSISTED_KEYS.includes(key));
    if (shouldPersist) persistState();
    emit();
  };

  const useStore = () => {
    const [snapshot, setSnapshot] = useState(state);

    useEffect(() => {
      const handler = (nextState) => setSnapshot(nextState);
      listeners.add(handler);
      return () => listeners.delete(handler);
    }, []);

    return { state: snapshot, actions };
  };

  const resolveNext = (current, next) => (typeof next === 'function' ? next(current) : next);
  const setKey = (key, next) => setState({ [key]: resolveNext(state[key], next) });

  const actions = {
    setVehicleSettings: (next) => setKey('vehicleSettings', next),
    setVehicleProfiles: (next) => setKey('vehicleProfiles', next),
    setImplementSettings: (next) => setKey('implementSettings', next),
    setImplementProfiles: (next) => setKey('implementProfiles', next),
    setRtkSettings: (next) => setKey('rtkSettings', next),
    setWifiSettings: (next) => setKey('wifiSettings', next),
    setUTurnSettings: (next) => setKey('uTurnSettings', next),
    setSystemHealth: (next) => setKey('systemHealth', next),
    setGnssTelemetry: (next) => setKey('gnssTelemetry', next),
    setLocalDatabase: (next) => setKey('localDatabase', next),
    setRunStatus: (next) => setKey('runStatus', next),
    setRtkTelemetry: (next) => setKey('rtkTelemetry', next),
    setRunKpi: (next) => setKey('runKpi', next),
    setAlarms: (next) => setKey('alarms', next),
    setEventLog: (next) => setKey('eventLog', next),
    setLineType: (next) => setKey('lineType', next),
    setIsMultiLineMode: (next) => setKey('isMultiLineMode', next),
    setManualOffset: (next) => setKey('manualOffset', next),
    setShowGuidanceLines: (next) => setKey('showGuidanceLines', next),
    setGuidanceLine: (next) => setKey('guidanceLine', next),
    setPointA: (next) => setKey('pointA', next),
    setPointB: (next) => setKey('pointB', next),
    setAPlusPoint: (next) => setKey('aPlusPoint', next),
    setAPlusHeading: (next) => setKey('aPlusHeading', next),
    setIsRecordingCurve: (next) => setKey('isRecordingCurve', next),
    setCurvePoints: (next) => setKey('curvePoints', next),
    setPivotCenter: (next) => setKey('pivotCenter', next),
    setPivotRadius: (next) => setKey('pivotRadius', next),
    setCoverageTrail: (next) => setKey('coverageTrail', next),
    setFields: (next) => setKey('fields', next),
    setSelectedFieldId: (next) => setKey('selectedFieldId', next),
    setActiveTaskId: (next) => setKey('activeTaskId', next),
    setLoadedField: (next) => setKey('loadedField', next),
    setActiveBoundaryIdx: (next) => setKey('activeBoundaryIdx', next),
    setActiveLineId: (next) => setKey('activeLineId', next),
    setViewMode: (next) => setKey('viewMode', next),
    setNewFieldName: (next) => setKey('newFieldName', next),
    setIsRecordingBoundary: (next) => setKey('isRecordingBoundary', next),
    setTempBoundary: (next) => setKey('tempBoundary', next),
    setCurrentFieldBoundaries: (next) => setKey('currentFieldBoundaries', next),
    factoryReset: () => {
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch (error) {
        console.warn('Failed to clear local database', error);
      }
      state = createInitialState();
      persistState();
      emit();
    }
  };

  return { useStore, actions };
})();

window.MockBackend = MockBackend;
