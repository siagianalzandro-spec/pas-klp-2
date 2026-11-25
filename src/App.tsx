import { useCallback, useEffect, useRef, useState } from 'react';
import { Activity, Languages } from 'lucide-react';
import { PaDspEngine } from './audio/paDspEngine';
import { AnnotationCard } from './components/AnnotationCard';
import { ControlDock } from './components/ControlDock';
import { OscilloscopeOverlay } from './components/OscilloscopeOverlay';
import { FAULT_SCENARIOS } from './data/annotations';
import { PaViewport } from './three/PaViewport';
import { AudioMetrics, SimMode, SimulationState, TelemetryPoint } from './types/paSystem';

const INITIAL_METRICS: AudioMetrics = {
  inputMv: 0,
  outputV: 0,
  splDb: 45,
  spl_db: 45,
  splDba: 45,
  splDbc: 48.5,
  snrDb: 0,
  intelligibilityPct: 0,
  temp_preamp_c: 28.5,
  temp_speaker_c: 27.0,
  current_preamp_ma: 42,
  current_speaker_ma: 0,
  current_ma: 42,
  isClipping: false,
  isLowSnr: false,
  isHumPresent: false,
  isPopNoiseActive: false,
  isThermalThrottling: false,
  isOvercurrent: false,
  isSignalActive: false,
  inputWaveform: new Float32Array(256),
  outputWaveform: new Float32Array(256),
};

const INITIAL_STATE: SimulationState = {
  mode: 'inspect',
  focusTarget: 'microphone',
  languageMode: 'id-en',

  explodedProgress: 0,
  cutAwayActive: false,

  windshieldAttached: true,
  gooseneckAngle: 0,
  gooseneckDistance: 0.3,
  pttActive: false,

  preampPowerOn: true,
  preampGain: 54,

  speakerGrilleRemoved: false,
  ceilingMountProgress: 1,
  crossoverMode: '2-way',
  backCanDamping: true,
  speakerPolarityReversed: false,

  cableMicToPreamp: 'connected',
  cablePreampToSpeaker: 'connected',

  audioPlaying: false,
  audioSourceMode: 'airport-announcement',
  showOscilloscope: true,

  showSensorProbes: true,
  splProbeLocation: 'room-lounge',
  splListenerDistanceM: 2.2,
  splWeighting: 'dBA',
  ambientNoiseDb: 45,
  distributionMode: '70v-100v',
  plenumVentilationPoor: false,

  activeFaultId: null,
};

export default function App() {
  const [simState, setSimState] = useState<SimulationState>(INITIAL_STATE);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [cameraResetToken, setCameraResetToken] = useState(0);
  const [metricsSnapshot, setMetricsSnapshot] = useState<AudioMetrics>(INITIAL_METRICS);
  const [micPermissionError, setMicPermissionError] = useState<string | null>(null);

  const dspRef = useRef<PaDspEngine | null>(null);
  const metricsRef = useRef<AudioMetrics>(INITIAL_METRICS);
  const telemetryHistoryRef = useRef<TelemetryPoint[]>([]);
  const simStateRef = useRef<SimulationState>(simState);
  simStateRef.current = simState;

  useEffect(() => {
    const dsp = new PaDspEngine();
    dspRef.current = dsp;
    return () => {
      dsp.dispose();
      dspRef.current = null;
    };
  }, []);

  useEffect(() => {
    const dsp = dspRef.current;
    if (!dsp) return;
    void dsp.applyState(simState).then(() => {
      setMicPermissionError(dsp.getMicPermissionError());
    });
  }, [simState]);

  useEffect(() => {
    let timer = 0;
    let lastReactSync = 0;
    const sample = () => {
      if (dspRef.current) {
        const m = dspRef.current.sampleMetrics(simStateRef.current);
        metricsRef.current = m;
        telemetryHistoryRef.current = dspRef.current.getTelemetryHistory();
        const now = performance.now();
        if (now - lastReactSync > 120) {
          lastReactSync = now;
          setMetricsSnapshot(m);
        }
      }
      timer = window.setTimeout(sample, 33);
    };
    sample();
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLSelectElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.key.toLowerCase() === 'h') {
        setDockCollapsed((c) => !c);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const updateState = useCallback((patch: Partial<SimulationState>) => {
    setSimState((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleResetTelemetry = useCallback(() => {
    dspRef.current?.resetTelemetry();
    telemetryHistoryRef.current = [];
  }, []);

  const loadFaultScenario = useCallback((faultId: string) => {
    const fault = FAULT_SCENARIOS.find((f) => f.id === faultId);
    if (!fault) return;
    setSelectedAnnotationId(null);
    dspRef.current?.resetTelemetry();
    setSimState((prev) => ({
      ...prev,
      ...fault.initialOverrides,
      mode: 'troubleshooting',
      activeFaultId: fault.id,
      cutAwayActive: fault.initialOverrides.cutAwayActive ?? false,
      explodedProgress: 0,
    }));
  }, []);

  const handleModeSwitch = useCallback(
    (nextMode: SimMode) => {
      setSelectedAnnotationId(null);
      if (nextMode === 'troubleshooting') {
        const defaultFaultId = simStateRef.current.activeFaultId || FAULT_SCENARIOS[0].id;
        loadFaultScenario(defaultFaultId);
        return;
      }
      if (nextMode === 'integrated') {
        setSimState((prev) => ({
          ...prev,
          mode: 'integrated',
          focusTarget: 'system',
          cutAwayActive: false,
          explodedProgress: 0,
          showOscilloscope: true,
          showSensorProbes: true,
          activeFaultId: null,
        }));
        return;
      }
      if (nextMode === 'cutaway') {
        setSimState((prev) => ({
          ...prev,
          mode: 'cutaway',
          cutAwayActive: true,
          focusTarget: prev.focusTarget === 'system' ? 'microphone' : prev.focusTarget,
          activeFaultId: null,
        }));
        return;
      }
      setSimState((prev) => ({
        ...prev,
        mode: 'inspect',
        cutAwayActive: false,
        focusTarget: prev.focusTarget === 'system' ? 'microphone' : prev.focusTarget,
        activeFaultId: null,
      }));
    },
    [loadFaultScenario]
  );

  const handleDirect3DAction = useCallback((action: string) => {
    setSimState((prev) => {
      switch (action) {
        case 'toggle-ptt':
          return { ...prev, pttActive: !prev.pttActive, audioPlaying: true };
        case 'toggle-power':
          return { ...prev, preampPowerOn: !prev.preampPowerOn };
        case 'step-gain': {
          const next = prev.preampGain >= 90 ? 15 : prev.preampGain + 15;
          return { ...prev, preampGain: next };
        }
        case 'toggle-windshield':
          return { ...prev, windshieldAttached: !prev.windshieldAttached };
        case 'toggle-grille':
          return { ...prev, speakerGrilleRemoved: !prev.speakerGrilleRemoved };
        default:
          return prev;
      }
    });
  }, []);

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#0B0F17] text-slate-100">
      {/* Full-Bleed 3D WebGL Digital Twin Viewport */}
      <div className="absolute inset-0 z-0">
        <PaViewport
          simState={simState}
          metricsRef={metricsRef}
          cameraResetToken={cameraResetToken}
          onSelectAnnotation={setSelectedAnnotationId}
          onDirect3DAction={handleDirect3DAction}
        />
      </div>

      {/* Top Navigation Bar */}
      <header className="pointer-events-auto relative z-20 flex h-14 items-center justify-between gap-6 border-b border-slate-800/90 bg-[#0F1623]/95 px-5">
        <h1 className="font-display text-base font-bold tracking-tight text-slate-100 whitespace-nowrap shrink-0">
          PA Digital Twin
        </h1>

        <nav aria-label="Mode Simulasi" className="flex items-center gap-1 overflow-x-auto">
          {(
            [
              { id: 'inspect', label: 'Inspeksi & Exploded' },
              { id: 'cutaway', label: 'Cut-Away' },
              { id: 'integrated', label: 'Simulasi Sistem' },
              { id: 'troubleshooting', label: 'Troubleshooting' },
            ] as Array<{ id: SimMode; label: string }>
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleModeSwitch(tab.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                simState.mode === tab.id
                  ? 'bg-sky-500 text-slate-950 font-semibold'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() =>
              updateState({
                languageMode: simState.languageMode === 'id' ? 'id-en' : 'id',
              })
            }
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 whitespace-nowrap shrink-0"
            title="Tampilkan istilah teknis Bahasa Inggris"
          >
            <Languages className="h-3.5 w-3.5 text-sky-400" />
            <span>{simState.languageMode === 'id-en' ? 'ID / EN' : 'ID'}</span>
          </button>

          <button
            type="button"
            onClick={() => updateState({ showOscilloscope: !simState.showOscilloscope })}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
              simState.showOscilloscope
                ? 'bg-amber-500 text-slate-950 font-semibold'
                : 'border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            <span>Telemetri</span>
          </button>
        </div>
      </header>

      {/* Peripheral Corner Overlays */}
      <div className="pointer-events-none fixed inset-x-4 top-18 z-10 flex items-start justify-between gap-4">
        <div>
          <AnnotationCard
            annotationId={selectedAnnotationId}
            languageMode={simState.languageMode}
            onClose={() => setSelectedAnnotationId(null)}
          />
        </div>

        <div>
          {simState.showOscilloscope && (
            <OscilloscopeOverlay
              metricsRef={metricsRef}
              telemetryHistoryRef={telemetryHistoryRef}
              simState={simState}
              onResetTelemetry={handleResetTelemetry}
              onClose={() => updateState({ showOscilloscope: false })}
            />
          )}
        </div>
      </div>

      {/* Collapsible Bottom Control Dock */}
      <ControlDock
        simState={simState}
        metrics={metricsSnapshot}
        micPermissionError={micPermissionError}
        collapsed={dockCollapsed}
        onToggleCollapse={() => setDockCollapsed((c) => !c)}
        onUpdateState={updateState}
        onResetCamera={() => setCameraResetToken((t) => t + 1)}
        onSelectAnnotation={setSelectedAnnotationId}
        onLoadFaultScenario={loadFaultScenario}
      />
    </div>
  );
}
