const { useState, useEffect } = React;

const MockBackend = (() => {
  let state = {
    vehicleSettings: {
      type: 'Tractor 4WD',
      wheelbase: 2.5,
      frontAxleWidth: 1.95,
      rearAxleWidth: 2.65,
      antennaHeight: 3.20,
      antennaOffset: 0,
      rearHitch: 1.10,
      turnRadius: 6.5
    },
    implementSettings: {
      name: 'Planter_6R',
      width: DEFAULT_IMPLEMENT_WIDTH,
      overlap: 0.1,
      offset: 0,
      delayOn: 0.5,
      delayOff: 0.2
    },
    rtkSettings: {
      ntripHost: 'rtk.sveaverken.com',
      port: '2101',
      mountpoint: 'VRS_RTCM32',
      user: 'user123'
    },
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
            points: { a: { x: -50, y: -200 }, b: { x: -50, y: 200 } }
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
  };

  const listeners = new Set();

  const emit = () => {
    listeners.forEach((listener) => listener(state));
  };

  const setState = (patch) => {
    state = { ...state, ...patch };
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
    setImplementSettings: (next) => setKey('implementSettings', next),
    setRtkSettings: (next) => setKey('rtkSettings', next),
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
    setCurrentFieldBoundaries: (next) => setKey('currentFieldBoundaries', next)
  };

  return { useStore, actions };
})();

window.MockBackend = MockBackend;
