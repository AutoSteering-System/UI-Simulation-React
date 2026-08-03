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
    'coverageTrail',
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
      label: 'Tractor 4WD',
      type: 'Tractor 4WD',
      brand: 'Generic',
      model: 'Utility 125',
      controlType: 'Electronic Steering Wheel',
      horsepower: 125,
      purchaseDate: '2024-01-15',
      wheelbase: 2.5,
      frontAxleWidth: 1.95,
      rearAxleWidth: 2.65,
      frontOverhang: 1.35,
      rearOverhang: 1.05,
      overallHeight: 3.10,
      antennaHeight: 3.20,
      antennaOffset: 0,
      antennaToRearAxle: 1.15,
      gnssReceiverModel: 'AG-372',
      gnssLayout: 'Dual antenna horizontal',
      gnssAntennaCount: 2,
      gnssBaseline: 1.20,
      gnssPrimarySide: 'Left / ANT A',
      gnssMountPosition: 'Cab roof crossbar',
      gnssHeadingOffset: 0,
      gnssRollOffset: 0,
      gnssPitchOffset: 0,
      rearHitch: 1.10,
      hitchOffset: 0,
      hitchHeight: 0.65,
      turnRadius: 4.5,
      turnRadiusSemanticsVersion: 2,
      steeringType: 'Front axle',
      hitchType: 'Rear 3-point'
    },
    vehicleProfiles: [
      { id: 'tractor-4wd', label: 'Tractor 4WD', detail: 'Standard rear implement tractor', type: 'Tractor 4WD', brand: 'Generic', model: 'Utility 125', controlType: 'Electronic Steering Wheel', horsepower: 125, purchaseDate: '2024-01-15', wheelbase: 2.5, frontAxleWidth: 1.95, rearAxleWidth: 2.65, frontOverhang: 1.35, rearOverhang: 1.05, overallHeight: 3.1, antennaHeight: 3.2, antennaOffset: 0, antennaToRearAxle: 1.15, gnssReceiverModel: 'AG-372', gnssLayout: 'Dual antenna horizontal', gnssAntennaCount: 2, gnssBaseline: 1.2, gnssPrimarySide: 'Left / ANT A', gnssMountPosition: 'Cab roof crossbar', gnssHeadingOffset: 0, gnssRollOffset: 0, gnssPitchOffset: 0, rearHitch: 1.1, hitchOffset: 0, hitchHeight: 0.65, turnRadius: 4.5, turnRadiusSemanticsVersion: 2, steeringType: 'Front axle', hitchType: 'Rear 3-point' },
      { id: 'articulated', label: 'Articulated', detail: 'Large articulated tractor', type: 'Articulated Tractor', brand: 'Generic', model: 'Artic 420', controlType: 'CAN Hydraulic', horsepower: 420, purchaseDate: '2023-09-20', wheelbase: 3.4, frontAxleWidth: 2.9, rearAxleWidth: 2.9, frontOverhang: 1.75, rearOverhang: 1.45, overallHeight: 3.55, antennaHeight: 3.45, antennaOffset: 0, antennaToRearAxle: 1.65, gnssReceiverModel: 'SMART7-S', gnssLayout: 'Dual antenna horizontal', gnssAntennaCount: 2, gnssBaseline: 1.6, gnssPrimarySide: 'Left / ANT A', gnssMountPosition: 'Cab roof crossbar', gnssHeadingOffset: 0, gnssRollOffset: 0, gnssPitchOffset: 0, rearHitch: 1.4, hitchOffset: 0, hitchHeight: 0.78, turnRadius: 8.0, steeringType: 'Articulated', hitchType: 'Drawbar' },
      { id: 'self-propelled', label: 'Self Propelled', detail: 'Sprayer / applicator chassis', type: 'Self Propelled', brand: 'Generic', model: 'SP 3200', controlType: 'CAN Hydraulic', horsepower: 280, purchaseDate: '2024-05-10', wheelbase: 3.0, frontAxleWidth: 3.2, rearAxleWidth: 3.2, frontOverhang: 1.6, rearOverhang: 1.25, overallHeight: 3.7, antennaHeight: 3.8, antennaOffset: 0, antennaToRearAxle: 1.4, gnssReceiverModel: 'AG-372', gnssLayout: 'Dual antenna horizontal', gnssAntennaCount: 2, gnssBaseline: 1.5, gnssPrimarySide: 'Left / ANT A', gnssMountPosition: 'Cab roof crossbar', gnssHeadingOffset: 0, gnssRollOffset: 0, gnssPitchOffset: 0, rearHitch: 0.5, hitchOffset: 0, hitchHeight: 0.72, turnRadius: 7.2, steeringType: 'Front axle', hitchType: 'Integrated' }
    ],
    implementSettings: {
      profileId: 'planter-6r',
      name: 'Planter_6R',
      type: 'Planting',
      brand: 'Generic',
      model: 'PX-6R',
      serialNumber: 'PL6R-2401',
      connectionType: 'Rear 3-point',
      width: DEFAULT_IMPLEMENT_WIDTH,
      overallWidth: 3.2,
      hitchToWorkPoint: 1.45,
      hitchToRear: 1.75,
      transportWidth: 3.2,
      transportLength: 2.4,
      workingDepth: 0.08,
      weightKg: 1450,
      capacity: 0,
      sections: 6,
      rowSpacing: 0.5,
      overlap: 0.1,
      offset: 0,
      delayOn: 0.5,
      delayOff: 0.2,
      controlMode: 'Section Control',
      sectionControl: true
    },
    implementProfiles: [
      { id: 'tillage-4m', label: 'Tillage 4.0m', detail: 'Drawbar cultivator / 4.0 m', name: 'Tillage_4M', type: 'Tillage', brand: 'Generic', model: 'CT-400', serialNumber: 'CT400-2401', connectionType: 'Drawbar', width: 4.0, overallWidth: 4.3, hitchToWorkPoint: 2.1, hitchToRear: 3.2, transportWidth: 3.0, transportLength: 4.4, workingDepth: 0.18, weightKg: 2800, capacity: 0, sections: 4, rowSpacing: 0.25, overlap: 0.1, offset: 0, delayOn: 0.2, delayOff: 0.1, controlMode: 'Manual Lift', sectionControl: false },
      { id: 'sprayer-12m', label: 'Sprayer 12m', detail: '6 boom sections / 12.0 m', name: 'Sprayer_12M', type: 'Spraying', brand: 'Generic', model: 'BS-1200', serialNumber: 'BS1200-2407', connectionType: 'Drawbar', width: 12.0, overallWidth: 12.4, hitchToWorkPoint: 2.4, hitchToRear: 3.1, transportWidth: 2.8, transportLength: 4.5, workingDepth: 0, weightKg: 2200, capacity: 2400, sections: 6, rowSpacing: 0, overlap: 0.2, offset: 0, delayOn: 0.8, delayOff: 0.4, controlMode: 'Boom Sections', sectionControl: true },
      { id: 'seeder-3m', label: 'Seeder 3.0m', detail: '18 rows / rear 3-point', name: 'Seeder_3M', type: 'Seeding', brand: 'Generic', model: 'SD-300', serialNumber: 'SD300-2411', connectionType: 'Rear 3-point', width: 3.0, overallWidth: 3.2, hitchToWorkPoint: 1.35, hitchToRear: 1.9, transportWidth: 3.2, transportLength: 2.6, workingDepth: 0.06, weightKg: 1650, capacity: 950, sections: 6, rowSpacing: 0.167, overlap: 0.05, offset: 0, delayOn: 0.5, delayOff: 0.25, controlMode: 'Section Control', sectionControl: true },
      { id: 'harvest-6m', label: 'Harvest Header 6m', detail: '6.0 m cutter / integrated', name: 'Harvest_Header_6M', type: 'Harvest', brand: 'Generic', model: 'HD-600', serialNumber: 'HD600-2318', connectionType: 'Integrated', width: 6.0, overallWidth: 6.35, hitchToWorkPoint: 0.9, hitchToRear: 1.6, transportWidth: 3.0, transportLength: 2.2, workingDepth: 0, weightKg: 2400, capacity: 0, sections: 2, rowSpacing: 0, overlap: 0.12, offset: 0, delayOn: 0.4, delayOff: 0.2, controlMode: 'Header Control', sectionControl: false },
      { id: 'planter-6r', label: 'Planter 6R', detail: '6 rows / 3.0 m', name: 'Planter_6R', type: 'Planting', brand: 'Generic', model: 'PX-6R', serialNumber: 'PL6R-2401', connectionType: 'Rear 3-point', width: 3.0, overallWidth: 3.2, hitchToWorkPoint: 1.45, hitchToRear: 1.75, transportWidth: 3.2, transportLength: 2.4, workingDepth: 0.08, weightKg: 1450, capacity: 0, sections: 6, rowSpacing: 0.5, overlap: 0.1, offset: 0, delayOn: 0.5, delayOff: 0.2, controlMode: 'Section Control', sectionControl: true },
      { id: 'leveler-3m', label: 'Land Leveler 3m', detail: '3.0 m scraper / drawbar', name: 'Land_Leveler_3M', type: 'Land Leveling', brand: 'Generic', model: 'LL-300', serialNumber: 'LL300-2309', connectionType: 'Drawbar', width: 3.0, overallWidth: 3.15, hitchToWorkPoint: 2.2, hitchToRear: 3.0, transportWidth: 3.15, transportLength: 4.1, workingDepth: 0.12, weightKg: 3100, capacity: 4.5, sections: 1, rowSpacing: 0, overlap: 0.08, offset: 0, delayOn: 0, delayOff: 0, controlMode: 'Grade Control', sectionControl: false },
      { id: 'ditcher-1_8m', label: 'Ditcher 1.8m', detail: 'V-ditch / rear 3-point', name: 'Ditcher_1_8M', type: 'Ditching', brand: 'Generic', model: 'DT-180', serialNumber: 'DT180-2414', connectionType: 'Rear 3-point', width: 1.8, overallWidth: 2.05, hitchToWorkPoint: 1.2, hitchToRear: 1.8, transportWidth: 2.05, transportLength: 2.1, workingDepth: 0.65, weightKg: 920, capacity: 0, sections: 1, rowSpacing: 0, overlap: 0, offset: 0, delayOn: 0, delayOff: 0, controlMode: 'Manual Lift', sectionControl: false }
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
      mode: 'ONE_KEY',
      sequence: 'SINGLE',
      headlandMode: 'Auto from boundary',
      pattern: 'AUTO',
      direction: 'Auto',
      nextPass: 'Adjacent',
      skipPasses: 0,
      targetSelectionVersion: 2,
      trigger: 'Manual confirm',
      startDistanceM: 18,
      turnSpeedKmh: 5.5,
      aggressiveness: 70,
      liftAction: true,
      resumeAutosteer: true,
      pauseCoverage: true,
      requireBoundary: false,
      workedPassThreshold: 0.98,
      smartHeadlandPasses: 1
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
    lineShiftOffset: 0,
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
            // 3.00 m working width minus the saved 0.10 m overlap.
            trackSpacingM: 2.9,
            spacingMode: 'FIXED',
            sourceImplementProfileId: 'planter-6r',
            sourceWorkingWidthM: 3,
            sourceOverlapM: 0.1,
            sourceOverallWidthM: 3.2,
            tramline: {
              enabled: false,
              intervalPasses: 4,
              anchorPassIndex: 0,
              visualOnly: true
            },
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
            createdAt: '2023-10-15T08:30:00.000Z',
            createdLocation: 'Home_Field_01',
            createdPosition: { x: 0, y: 0 },
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

  const encodeCoverageTrail = (trail) => {
    const scopes = [];
    const scopeIndices = new Map();
    const segments = [];
    const segmentIndices = new Map();
    const points = [];
    (Array.isArray(trail) ? trail : []).forEach((point) => {
      if (!Number.isFinite(Number(point?.x)) || !Number.isFinite(Number(point?.y))) return;
      const scope = [point.fieldId ?? null, point.taskId ?? null, point.lineId ?? null];
      const scopeKey = JSON.stringify(scope);
      let scopeIndex = scopeIndices.get(scopeKey);
      if (scopeIndex === undefined) {
        scopeIndex = scopes.length;
        scopes.push(scope);
        scopeIndices.set(scopeKey, scopeIndex);
      }
      const segmentId = point.segmentId ?? `SEGMENT:${scopeIndex}`;
      const coverageWidthM = Number(point.coverageWidthM);
      const encodedCoverageWidthMm = Number.isFinite(coverageWidthM) && coverageWidthM > 0
        ? Math.round(coverageWidthM * 1000)
        : 0;
      const implementProfileId = point.implementProfileId ?? null;
      const segmentKey = JSON.stringify([
        scopeIndex,
        segmentId,
        encodedCoverageWidthMm,
        implementProfileId
      ]);
      let segmentIndex = segmentIndices.get(segmentKey);
      if (segmentIndex === undefined) {
        segmentIndex = segments.length;
        segments.push([segmentId, scopeIndex, encodedCoverageWidthMm, implementProfileId]);
        segmentIndices.set(segmentKey, segmentIndex);
      }
      points.push([
        segmentIndex,
        Math.round(Number(point.x) * 10),
        Math.round(Number(point.y) * 10),
        Math.round((Number(point.h) || 0) * 10)
      ]);
    });
    return { format: 'SCOPED_XYH_WIDTH_V2', scopes, segments, points };
  };

  const decodeCoverageTrail = (payload) => {
    if (Array.isArray(payload)) return payload;
    const supportedFormat = payload?.format === 'SCOPED_XYH_V1'
      || payload?.format === 'SCOPED_XYH_WIDTH_V2';
    if (!supportedFormat || !Array.isArray(payload.points)) return [];
    return payload.points.map((row) => {
      const segment = payload.segments?.[row?.[0]] || [null, 0];
      const scope = payload.scopes?.[segment[1]] || [null, null, null];
      const point = {
        x: Number(row?.[1]) / 10,
        y: Number(row?.[2]) / 10,
        h: Number(row?.[3]) / 10,
        segmentId: segment[0],
        fieldId: scope[0],
        taskId: scope[1],
        lineId: scope[2]
      };
      if (payload.format === 'SCOPED_XYH_WIDTH_V2') {
        const coverageWidthMm = Number(segment[2]);
        if (Number.isFinite(coverageWidthMm) && coverageWidthMm > 0) {
          point.coverageWidthM = coverageWidthMm / 1000;
        }
        point.implementProfileId = segment[3] ?? null;
      }
      return point;
    }).filter(point => Number.isFinite(point.x) && Number.isFinite(point.y));
  };

  const pickPersistedState = (source) => PERSISTED_KEYS.reduce((acc, key) => {
    if (source[key] !== undefined) {
      acc[key] = key === 'coverageTrail' ? encodeCoverageTrail(source[key]) : source[key];
    }
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

    const migrateStockTractorTurnRadius = (profile) => {
      const profileId = profile?.profileId || profile?.id;
      const isUntouchedStockTractor = profileId === 'tractor-4wd'
        && profile?.brand === 'Generic'
        && profile?.model === 'Utility 125'
        && profile?.custom !== true
        && profile?.isCustom !== true;
      const usesLegacyDefault = Math.abs(Number(profile?.turnRadius) - 6.5) < 0.001;
      if (!isUntouchedStockTractor || !usesLegacyDefault) return profile;
      return {
        ...profile,
        turnRadius: 4.5,
        turnRadiusSemanticsVersion: 2
      };
    };

    const next = {
      ...base,
      ...persisted.data,
      coverageTrail: decodeCoverageTrail(persisted.data.coverageTrail)
    };
    // A run-only line shift must never leak into the next session. Saved line
    // copies restore their own translation from the line asset instead.
    next.lineShiftOffset = 0;
    const persistedVehicleSettings = persisted.data.vehicleSettings || {};
    next.vehicleSettings = { ...base.vehicleSettings, ...persistedVehicleSettings };
    if (!persistedVehicleSettings.gnssLayout) {
      const activeBaseProfile = base.vehicleProfiles.find((item) => item.id === next.vehicleSettings.profileId) || base.vehicleSettings;
      next.vehicleSettings = {
        ...next.vehicleSettings,
        gnssLayout: 'Dual antenna horizontal',
        gnssAntennaCount: 2,
        gnssBaseline: activeBaseProfile.gnssBaseline || 1.2,
        gnssPrimarySide: 'Left / ANT A',
        gnssMountPosition: 'Cab roof crossbar'
      };
    }
    next.vehicleSettings = migrateStockTractorTurnRadius(next.vehicleSettings);
    const persistedVehicleProfiles = persisted.data.vehicleProfiles || base.vehicleProfiles;
    next.vehicleProfiles = persistedVehicleProfiles.map((profile) => {
      const baseProfile = base.vehicleProfiles.find((item) => item.id === profile.id) || base.vehicleSettings;
      const merged = { ...baseProfile, ...profile };
      return profile.gnssLayout ? merged : {
        ...merged,
        gnssLayout: 'Dual antenna horizontal',
        gnssAntennaCount: 2,
        gnssBaseline: baseProfile.gnssBaseline || 1.2,
        gnssPrimarySide: 'Left / ANT A',
          gnssMountPosition: 'Cab roof crossbar'
      };
    });
    next.vehicleProfiles = next.vehicleProfiles.map(migrateStockTractorTurnRadius);
    const persistedImplementSettings = persisted.data.implementSettings || {};
    const activeImplementBase = base.implementProfiles.find((item) => item.id === persistedImplementSettings.profileId) || base.implementSettings;
    next.implementSettings = { ...base.implementSettings, ...activeImplementBase, ...persistedImplementSettings };
    const persistedImplementProfiles = persisted.data.implementProfiles || base.implementProfiles;
    next.implementProfiles = persistedImplementProfiles.map((profile) => ({
      ...base.implementSettings,
      ...(base.implementProfiles.find((item) => item.id === profile.id) || {}),
      ...profile,
      profileId: undefined
    }));
    // Every saved line owns a spacing snapshot. The implement profile remains
    // provenance only; changing that profile must not move old parallel lanes.
    const migratedTrackSpacingM = Math.max(
      0.1,
      (Number(next.implementSettings.width) || 3) - (Number(next.implementSettings.overlap) || 0)
    );
    const migrateLine = (line) => {
      const trackSpacingM = Number(line.trackSpacingM) > 0
        ? Number(line.trackSpacingM)
        : migratedTrackSpacingM;
      const sourceImplementProfileId = line.sourceImplementProfileId
        || next.implementSettings.profileId
        || null;
      const sourceProfile = next.implementProfiles.find(profile => profile.id === sourceImplementProfileId) || null;
      const explicitOverlapM = Number(line.sourceOverlapM);
      const sourceOverlapM = Number.isFinite(explicitOverlapM) && explicitOverlapM >= 0
        ? explicitOverlapM
        : Math.max(0, Number(sourceProfile?.overlap ?? next.implementSettings.overlap) || 0);
      const explicitWorkingWidthM = Number(line.sourceWorkingWidthM);
      const profileWorkingWidthM = Number(sourceProfile?.width);
      const profileSpacingM = profileWorkingWidthM - sourceOverlapM;
      const sourceWorkingWidthM = Number.isFinite(explicitWorkingWidthM) && explicitWorkingWidthM > 0
        ? explicitWorkingWidthM
        : Number.isFinite(profileWorkingWidthM)
            && profileWorkingWidthM > 0
            && Math.abs(profileSpacingM - trackSpacingM) <= 0.15
          ? profileWorkingWidthM
          : trackSpacingM + sourceOverlapM;
      const explicitOverallWidthM = Number(line.sourceOverallWidthM);
      const profileOverallWidthM = Number(sourceProfile?.overallWidth);
      const sourceOverallWidthM = Math.max(
        sourceWorkingWidthM,
        Number.isFinite(explicitOverallWidthM) && explicitOverallWidthM > 0
          ? explicitOverallWidthM
          : Number.isFinite(profileOverallWidthM)
              && profileOverallWidthM >= sourceWorkingWidthM
            ? profileOverallWidthM
            : sourceWorkingWidthM
      );
      return {
        ...line,
        trackSpacingM,
        spacingMode: 'FIXED',
        sourceImplementProfileId,
        sourceWorkingWidthM,
        sourceOverlapM,
        sourceOverallWidthM,
        tramline: {
          enabled: false,
          intervalPasses: 4,
          anchorPassIndex: 0,
          visualOnly: true,
          ...(line.tramline || {})
        }
      };
    };
    next.fields = (next.fields || []).map((field) => ({
      ...field,
      lines: (field.lines || []).map(migrateLine)
    }));
    if (next.loadedField) {
      next.loadedField = next.fields.find((field) => field.id === next.loadedField.id) || {
        ...next.loadedField,
        lines: (next.loadedField.lines || []).map(migrateLine)
      };
    }
    // Coverage was historically cleared whenever another field was loaded, so
    // any legacy unscoped trail belongs to the persisted active run. Attach that
    // scope once during hydration instead of silently orphaning the old work.
    const legacyCoverageScope = {
      fieldId: next.loadedField?.id || next.selectedFieldId || null,
      taskId: next.activeTaskId || null,
      lineId: next.activeLineId || null
    };
    next.coverageTrail = (next.coverageTrail || []).map((point, index) => {
      const hasScope = Object.prototype.hasOwnProperty.call(point || {}, 'fieldId')
        || Object.prototype.hasOwnProperty.call(point || {}, 'lineId');
      const scopedPoint = hasScope ? point : {
          ...point,
          ...legacyCoverageScope,
          segmentId: `LEGACY:${legacyCoverageScope.fieldId || 'NO_FIELD'}:${legacyCoverageScope.lineId || 'NO_LINE'}:${point?.segmentId ?? index}`
      };
      const sourceField = next.fields.find(field => field.id === scopedPoint.fieldId)
        || next.loadedField
        || null;
      const sourceLine = (sourceField?.lines || []).find(line => line.id === scopedPoint.lineId)
        || null;
      const implementProfileId = scopedPoint.implementProfileId
        || sourceLine?.sourceImplementProfileId
        || next.implementSettings.profileId
        || null;
      const sourceProfile = next.implementProfiles.find(profile => profile.id === implementProfileId) || null;
      const savedCoverageWidthM = Number(scopedPoint.coverageWidthM);
      const inferredCoverageWidthM = Number(sourceLine?.sourceWorkingWidthM)
        || Number(sourceProfile?.width)
        || Number(next.implementSettings.width)
        || 3;
      return {
        ...scopedPoint,
        coverageWidthM: Number.isFinite(savedCoverageWidthM) && savedCoverageWidthM > 0
          ? savedCoverageWidthM
          : Math.max(0.25, inferredCoverageWidthM),
        implementProfileId
      };
    });
    next.rtkSettings = { ...base.rtkSettings, ...(persisted.data.rtkSettings || {}) };
    next.wifiSettings = { ...base.wifiSettings, ...(persisted.data.wifiSettings || {}) };
    next.uTurnSettings = { ...base.uTurnSettings, ...(persisted.data.uTurnSettings || {}) };
    // Migrate the earlier demo-only labels into the three distinct workflows:
    // one turn now, boundary-triggered end-row turns, and full-field Smart planning.
    if (!persisted.data.uTurnSettings?.mode) {
      const legacyPattern = persisted.data.uTurnSettings?.pattern;
      next.uTurnSettings.mode = legacyPattern === 'Smart U-Turn' ? 'SMART' : 'ONE_KEY';
      next.uTurnSettings.pattern = legacyPattern === 'Fish Tail'
        ? 'FISH_TAIL'
        : 'AUTO';
    }
    if (next.uTurnSettings.pattern === 'Basic Omega' || next.uTurnSettings.pattern === 'OMEGA') {
      next.uTurnSettings.pattern = 'AUTO';
    }
    // Earlier builds persisted the temporary "Skip 2 / forward U" fallback
    // globally. Normal Forward U now keeps the adjacent target with a validated
    // bulb when needed, so migrate the old target policy once; future explicit
    // Skip choices remain untouched.
    if (Number(persisted.data.uTurnSettings?.targetSelectionVersion || 0) < 2) {
      next.uTurnSettings.nextPass = 'Adjacent';
      next.uTurnSettings.skipPasses = 0;
      next.uTurnSettings.targetSelectionVersion = 2;
    }
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
  let coveragePersistTimer = null;

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

  const scheduleCoveragePersist = () => {
    if (coveragePersistTimer !== null) return;
    coveragePersistTimer = window.setTimeout(() => {
      coveragePersistTimer = null;
      persistState();
      emit();
    }, 60000);
  };

  const setState = (patch) => {
    state = { ...state, ...patch };
    const persistedPatchKeys = Object.keys(patch).filter((key) => PERSISTED_KEYS.includes(key));
    if (persistedPatchKeys.length) {
      const coverageOnly = persistedPatchKeys.every(key => key === 'coverageTrail');
      if (coverageOnly) scheduleCoveragePersist();
      else {
        if (coveragePersistTimer !== null) {
          window.clearTimeout(coveragePersistTimer);
          coveragePersistTimer = null;
        }
        persistState();
      }
    }
    emit();
  };

  window.addEventListener('beforeunload', () => {
    if (coveragePersistTimer === null) return;
    window.clearTimeout(coveragePersistTimer);
    coveragePersistTimer = null;
    persistState();
  });

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
    setLineShiftOffset: (next) => setKey('lineShiftOffset', next),
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
