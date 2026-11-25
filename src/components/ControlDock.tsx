import React, { useState } from 'react';
import {
  AlertCircle,
  Cable,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Eye,
  Gauge,
  HelpCircle,
  Mic,
  Play,
  Power,
  RotateCcw,
  Sliders,
  Speaker,
  Square,
  Wrench,
} from 'lucide-react';
import { COMPONENT_ANNOTATIONS, FAULT_SCENARIOS } from '../data/annotations';
import {
  AudioMetrics,
  AudioSourceMode,
  CableState,
  DistributionMode,
  FocusTarget,
  SimulationState,
  SplProbeLocation,
} from '../types/paSystem';

interface ControlDockProps {
  simState: SimulationState;
  metrics: AudioMetrics;
  micPermissionError: string | null;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onUpdateState: (patch: Partial<SimulationState>) => void;
  onResetCamera: () => void;
  onSelectAnnotation: (id: string) => void;
  onLoadFaultScenario: (faultId: string) => void;
}

type IntegratedSubTab = 'wiring' | 'mic' | 'preamp' | 'speaker' | 'sensors';

export const ControlDock: React.FC<ControlDockProps> = ({
  simState,
  metrics,
  micPermissionError,
  collapsed,
  onToggleCollapse,
  onUpdateState,
  onResetCamera,
  onSelectAnnotation,
  onLoadFaultScenario,
}) => {
  const [integratedTab, setIntegratedTab] = useState<IntegratedSubTab>('wiring');
  const [showHint, setShowHint] = useState(false);

  const isIntegratedOrFault =
    simState.mode === 'integrated' || simState.mode === 'troubleshooting';

  const activeFault = FAULT_SCENARIOS.find((f) => f.id === simState.activeFaultId) || null;
  const faultResolved = activeFault ? activeFault.isResolved(simState, metrics) : false;

  const focusList = Object.values(COMPONENT_ANNOTATIONS).filter((a) =>
    simState.focusTarget === 'system' ? true : a.device === simState.focusTarget || a.device === 'sensors'
  );

  const activeControlDevice: IntegratedSubTab = isIntegratedOrFault
    ? integratedTab
    : simState.focusTarget === 'microphone'
    ? 'mic'
    : simState.focusTarget === 'preamp'
    ? 'preamp'
    : simState.focusTarget === 'speaker'
    ? 'speaker'
    : 'sensors';

  return (
    <div
      className={`pointer-events-none fixed bottom-4 left-1/2 z-20 w-[95vw] max-w-[1040px] -translate-x-1/2 transition-transform duration-300 ease-out ${
        collapsed ? 'translate-y-[calc(100%-30px)]' : 'translate-y-0'
      }`}
    >
      {/* Collapse / Expand Handle */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="pointer-events-auto flex items-center gap-1.5 rounded-t-lg border border-b-0 border-slate-700/80 bg-[#0F1623]/95 px-3.5 py-1 text-xs font-medium text-slate-300 transition-colors hover:text-white focus-visible:outline focus-visible:outline-sky-400"
        >
          {collapsed ? (
            <>
              <ChevronUp className="h-3.5 w-3.5 text-sky-400" />
              <span>Tampilkan Kontrol (H)</span>
            </>
          ) : (
            <>
              <ChevronDown className="h-3.5 w-3.5 text-sky-400" />
              <span>Sembunyikan Kontrol (H)</span>
            </>
          )}
        </button>
      </div>

      {/* Main Dock Panel (Solid dark surface, zero backdrop-blur) */}
      <div className="pointer-events-auto rounded-xl border border-slate-700/80 bg-[#0F1623]/96 px-4 py-3 shadow-2xl">
        {/* Troubleshooting Scenario Banner */}
        {simState.mode === 'troubleshooting' && activeFault && (
          <div className="mb-3 rounded-lg border border-slate-700/80 bg-slate-900/90 p-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {FAULT_SCENARIOS.map((sc, idx) => (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => {
                      setShowHint(false);
                      onLoadFaultScenario(sc.id);
                    }}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                      simState.activeFaultId === sc.id
                        ? 'bg-sky-500 text-slate-950'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    Kasus {idx + 1}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowHint((v) => !v)}
                  className="flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-700 whitespace-nowrap shrink-0"
                >
                  <HelpCircle className="h-3.5 w-3.5 text-amber-400" />
                  <span>{showHint ? 'Tutup Petunjuk' : 'Petunjuk'}</span>
                </button>

                {faultResolved ? (
                  <span className="flex items-center gap-1.5 rounded-md border border-emerald-500/40 bg-emerald-950/60 px-2.5 py-1 text-xs font-semibold text-emerald-300 whitespace-nowrap shrink-0">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Masalah Teratasi</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 rounded-md border border-amber-500/40 bg-amber-950/60 px-2.5 py-1 text-xs font-semibold text-amber-300 whitespace-nowrap shrink-0">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>Diagnosis Aktif</span>
                  </span>
                )}
              </div>
            </div>

            <p className="mt-2 text-xs text-slate-200">
              <strong className="font-semibold text-white">{activeFault.titleId}:</strong>{' '}
              {activeFault.symptomId}
            </p>
            {showHint && !faultResolved && (
              <p className="mt-1 text-xs text-amber-300">Petunjuk: {activeFault.hintId}</p>
            )}
            {faultResolved && (
              <p className="mt-1 text-xs text-emerald-300">
                Analisis Teknis: {activeFault.targetExplanationId}
              </p>
            )}
          </div>
        )}

        {/* Row 1: Primary Navigation (Focus / Sub-Tab + Global Mode Sliders / Audio Play) */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-800 pb-2.5">
          {/* Left: Device Focus or Integrated Sub-Tabs */}
          {!isIntegratedOrFault ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'microphone', label: '1. Mikrofon', icon: Mic },
                  { id: 'preamp', label: '2. Pre-Amplifier', icon: Sliders },
                  { id: 'speaker', label: '3. Ceiling Speaker', icon: Speaker },
                  { id: 'system', label: 'Semua', icon: Eye },
                ] as Array<{ id: FocusTarget; label: string; icon: React.ComponentType<{ className?: string }> }>
              ).map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => onUpdateState({ focusTarget: id })}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                    simState.focusTarget === id
                      ? 'bg-sky-500 text-slate-950 font-semibold'
                      : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  { id: 'wiring', label: 'Kabel & Plafon', icon: Cable, focus: 'system' as FocusTarget },
                  { id: 'mic', label: 'Mikrofon', icon: Mic, focus: 'microphone' as FocusTarget },
                  { id: 'preamp', label: 'Pre-Amp', icon: Sliders, focus: 'preamp' as FocusTarget },
                  { id: 'speaker', label: 'Speaker', icon: Speaker, focus: 'speaker' as FocusTarget },
                  { id: 'sensors', label: 'Sensor & Beban', icon: Gauge, focus: 'system' as FocusTarget },
                ] as const
              ).map(({ id, label, icon: Icon, focus }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setIntegratedTab(id);
                    onUpdateState({ focusTarget: focus });
                  }}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                    integratedTab === id
                      ? 'bg-sky-500 text-slate-950 font-semibold'
                      : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          )}

          {/* Right: Exploded / Cutaway OR Live Audio DSP Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {!isIntegratedOrFault ? (
              <>
                <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/90 px-2.5 py-1">
                  <span className="text-xs font-medium text-slate-300 whitespace-nowrap">
                    Exploded View
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={Math.round(simState.explodedProgress * 100)}
                    onChange={(e) =>
                      onUpdateState({ explodedProgress: Number(e.target.value) / 100 })
                    }
                    className="tech-slider w-24"
                    aria-label="Exploded View"
                  />
                  <span className="font-mono-tech w-9 text-right text-xs text-sky-300">
                    {Math.round(simState.explodedProgress * 100)}%
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    onUpdateState({
                      mode: simState.mode === 'cutaway' ? 'inspect' : 'cutaway',
                      cutAwayActive: simState.mode !== 'cutaway',
                    })
                  }
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                    simState.mode === 'cutaway' || simState.cutAwayActive
                      ? 'bg-amber-500 text-slate-950 font-semibold'
                      : 'border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  Cut-Away
                </button>
              </>
            ) : (
              <>
                <select
                  value={simState.audioSourceMode}
                  onChange={(e) =>
                    onUpdateState({
                      audioSourceMode: e.target.value as AudioSourceMode,
                      audioPlaying: true,
                    })
                  }
                  className="rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-sky-400"
                  aria-label="Sumber Audio Uji"
                >
                  <option value="airport-announcement">Rekaman: Pengumuman Bandara</option>
                  <option value="plosive-test">Rekaman: Uji Plosif (P/B)</option>
                  <option value="tone-1khz">Sinyal: Nada Kalibrasi 1 kHz</option>
                  <option value="live-mic">Input: Mikrofon Perangkat Asli</option>
                </select>

                <button
                  type="button"
                  onClick={() => onUpdateState({ audioPlaying: !simState.audioPlaying })}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                    simState.audioPlaying
                      ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                      : 'bg-sky-500 text-slate-950 hover:bg-sky-400'
                  }`}
                >
                  {simState.audioPlaying ? (
                    <>
                      <Square className="h-3.5 w-3.5" />
                      <span>Hentikan Uji</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5" />
                      <span>Mulai Uji Suara</span>
                    </>
                  )}
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => onUpdateState({ showSensorProbes: !simState.showSensorProbes })}
              className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                simState.showSensorProbes
                  ? 'border border-sky-500/50 bg-sky-950/60 text-sky-200'
                  : 'border border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
              title="Tampilkan atau sembunyikan probe sensor 3D"
            >
              <Gauge className="h-3.5 w-3.5" />
              <span>Sensor 3D: {simState.showSensorProbes ? 'Tampil' : 'Sembunyi'}</span>
            </button>

            <button
              type="button"
              onClick={onResetCamera}
              className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-700 hover:text-white whitespace-nowrap shrink-0"
              title="Reset Sudut Kamera"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Reset Kamera</span>
            </button>
          </div>
        </div>

        {/* Row 2: Device-Specific Real Controls */}
        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-3">
          {activeControlDevice === 'wiring' && isIntegratedOrFault && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1.5">
                <span className="text-xs text-slate-300 whitespace-nowrap">Kabel Mic → Pre-Amp:</span>
                <select
                  value={simState.cableMicToPreamp}
                  onChange={(e) =>
                    onUpdateState({ cableMicToPreamp: e.target.value as CableState })
                  }
                  className="rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-xs text-slate-100"
                >
                  <option value="connected">Terpasang Rapat</option>
                  <option value="loose">Longgar (Dengung)</option>
                  <option value="disconnected">Terputus</option>
                </select>
              </div>

              <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1.5">
                <span className="text-xs text-slate-300 whitespace-nowrap">Kabel Pre-Amp → Speaker:</span>
                <select
                  value={simState.cablePreampToSpeaker}
                  onChange={(e) =>
                    onUpdateState({ cablePreampToSpeaker: e.target.value as CableState })
                  }
                  className="rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-xs text-slate-100"
                >
                  <option value="connected">Terpasang Rapat</option>
                  <option value="loose">Longgar</option>
                  <option value="disconnected">Terputus</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() =>
                  onUpdateState({ speakerPolarityReversed: !simState.speakerPolarityReversed })
                }
                className={`rounded-lg px-2.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 ${
                  simState.speakerPolarityReversed
                    ? 'border border-red-500/50 bg-red-950/60 text-red-200'
                    : 'border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
              >
                Polaritas (+/-): {simState.speakerPolarityReversed ? 'Terbalik' : 'Normal'}
              </button>

              <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1">
                <span className="text-xs text-slate-300 whitespace-nowrap">Klem Plafon:</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(simState.ceilingMountProgress * 100)}
                  onChange={(e) =>
                    onUpdateState({ ceilingMountProgress: Number(e.target.value) / 100 })
                  }
                  className="tech-slider w-20"
                  aria-label="Sekrup Pengunci Plafon"
                />
                <span className="font-mono-tech w-8 text-right text-xs text-sky-300">
                  {Math.round(simState.ceilingMountProgress * 100)}%
                </span>
              </div>
            </div>
          )}

          {activeControlDevice === 'mic' && (
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => onUpdateState({ pttActive: !simState.pttActive, audioPlaying: true })}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                  simState.pttActive
                    ? 'bg-red-600 text-white hover:bg-red-500'
                    : 'border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
              >
                <Mic className="h-3.5 w-3.5" />
                <span>PTT: {simState.pttActive ? 'AKTIF (ON)' : 'NONAKTIF'}</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  onUpdateState({ windshieldAttached: !simState.windshieldAttached })
                }
                className={`rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                  simState.windshieldAttached
                    ? 'border border-emerald-500/40 bg-emerald-950/50 text-emerald-200'
                    : 'border border-amber-500/40 bg-amber-950/50 text-amber-200'
                }`}
              >
                Windshield: {simState.windshieldAttached ? 'Terpasang' : 'Dilepas (Pop Noise)'}
              </button>

              <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1">
                <span className="text-xs text-slate-300 whitespace-nowrap">Sudut Gooseneck:</span>
                <input
                  type="range"
                  min={-35}
                  max={35}
                  value={simState.gooseneckAngle}
                  onChange={(e) => onUpdateState({ gooseneckAngle: Number(e.target.value) })}
                  className="tech-slider w-20"
                  aria-label="Sudut Gooseneck"
                />
                <span className="font-mono-tech w-9 text-right text-xs text-sky-300">
                  {simState.gooseneckAngle}°
                </span>
              </div>

              <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1">
                <span className="text-xs text-slate-300 whitespace-nowrap">Jarak Suara:</span>
                <input
                  type="range"
                  min={15}
                  max={100}
                  value={Math.round(simState.gooseneckDistance * 100)}
                  onChange={(e) =>
                    onUpdateState({ gooseneckDistance: Number(e.target.value) / 100 })
                  }
                  className="tech-slider w-20"
                  aria-label="Jarak Sumber Suara"
                />
                <span className="font-mono-tech w-11 text-right text-xs text-sky-300">
                  {Math.round(simState.gooseneckDistance * 100)} cm
                </span>
              </div>
            </div>
          )}

          {activeControlDevice === 'preamp' && (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onUpdateState({ preampPowerOn: !simState.preampPowerOn })}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                  simState.preampPowerOn
                    ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                    : 'border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
              >
                <Power className="h-3.5 w-3.5" />
                <span>Saklar Daya: {simState.preampPowerOn ? 'I (ON)' : 'O (OFF)'}</span>
              </button>

              <div className="flex items-center gap-2.5 rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-1">
                <span className="text-xs text-slate-300 whitespace-nowrap">Kenop Gain:</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={simState.preampGain}
                  onChange={(e) => onUpdateState({ preampGain: Number(e.target.value) })}
                  className="tech-slider w-32"
                  aria-label="Kenop Gain Pre-Amplifier"
                />
                <span
                  className={`font-mono-tech w-24 text-right text-xs ${
                    simState.preampGain > 75
                      ? 'text-red-400'
                      : simState.preampGain < 24
                      ? 'text-amber-300'
                      : 'text-emerald-300'
                  }`}
                >
                  {simState.preampGain}% (+{Math.round(10 + simState.preampGain * 0.46)} dB)
                </span>
              </div>

              <button
                type="button"
                onClick={() => onUpdateState({ pttActive: !simState.pttActive, audioPlaying: true })}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 ${
                  simState.pttActive
                    ? 'bg-red-600 text-white'
                    : 'border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
              >
                PTT Mic: {simState.pttActive ? 'ON' : 'OFF'}
              </button>
            </div>
          )}

          {activeControlDevice === 'speaker' && (
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() =>
                  onUpdateState({ speakerGrilleRemoved: !simState.speakerGrilleRemoved })
                }
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 whitespace-nowrap shrink-0"
              >
                Grille: {simState.speakerGrilleRemoved ? 'Terlepas' : 'Terpasang'}
              </button>

              <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1">
                <span className="text-xs text-slate-300 whitespace-nowrap">Sekrup Dog-Ear:</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(simState.ceilingMountProgress * 100)}
                  onChange={(e) =>
                    onUpdateState({ ceilingMountProgress: Number(e.target.value) / 100 })
                  }
                  className="tech-slider w-20"
                  aria-label="Sekrup Pengunci Dog-Ear Clamp"
                />
                <span className="font-mono-tech w-9 text-right text-xs text-sky-300">
                  {Math.round(simState.ceilingMountProgress * 100)}%
                </span>
              </div>

              <button
                type="button"
                onClick={() =>
                  onUpdateState({
                    crossoverMode: simState.crossoverMode === '1-way' ? '2-way' : '1-way',
                  })
                }
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 whitespace-nowrap shrink-0"
              >
                Crossover: {simState.crossoverMode === '1-way' ? '1-Way Full Range' : '2-Way Pasif'}
              </button>

              <button
                type="button"
                onClick={() => onUpdateState({ backCanDamping: !simState.backCanDamping })}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700 whitespace-nowrap shrink-0"
              >
                Back Can: {simState.backCanDamping ? 'Redaman Aktif' : 'Tanpa Redaman'}
              </button>

              <button
                type="button"
                onClick={() =>
                  onUpdateState({ speakerPolarityReversed: !simState.speakerPolarityReversed })
                }
                className={`rounded-lg px-2.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 ${
                  simState.speakerPolarityReversed
                    ? 'border border-red-500/50 bg-red-950/60 text-red-200'
                    : 'border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
              >
                Polaritas: {simState.speakerPolarityReversed ? 'Terbalik' : 'Normal (+/-)'}
              </button>
            </div>
          )}

          {activeControlDevice === 'sensors' && (
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1">
                <span className="text-xs text-slate-300 whitespace-nowrap">Probe SPL:</span>
                <select
                  value={simState.splProbeLocation}
                  onChange={(e) =>
                    onUpdateState({ splProbeLocation: e.target.value as SplProbeLocation })
                  }
                  className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-xs text-slate-100"
                >
                  <option value="room-lounge">Ruang Tunggu (Speaker)</option>
                  <option value="mic-gooseneck">Area Gooseneck Mic</option>
                </select>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateState({
                      splWeighting: simState.splWeighting === 'dBA' ? 'dBC' : 'dBA',
                    })
                  }
                  className="rounded border border-slate-700 bg-slate-800 px-2 py-0.5 font-mono-tech text-xs font-semibold text-sky-300 hover:bg-slate-700"
                >
                  {simState.splWeighting}
                </button>
              </div>

              <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1">
                <span className="text-xs text-slate-300 whitespace-nowrap">Jarak Uji:</span>
                <input
                  type="range"
                  min={10}
                  max={50}
                  value={Math.round(simState.splListenerDistanceM * 10)}
                  onChange={(e) =>
                    onUpdateState({ splListenerDistanceM: Number(e.target.value) / 10 })
                  }
                  className="tech-slider w-16"
                  aria-label="Jarak Probe SPL"
                />
                <span className="font-mono-tech w-9 text-right text-xs text-sky-300">
                  {simState.splListenerDistanceM.toFixed(1)} m
                </span>
              </div>

              <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1">
                <span className="text-xs text-slate-300 whitespace-nowrap">Ambient:</span>
                <input
                  type="range"
                  min={42}
                  max={80}
                  value={simState.ambientNoiseDb}
                  onChange={(e) => onUpdateState({ ambientNoiseDb: Number(e.target.value) })}
                  className="tech-slider w-16"
                  aria-label="Kebisingan Latar Ambient"
                />
                <span className="font-mono-tech w-11 text-right text-xs text-amber-300">
                  {simState.ambientNoiseDb} dB
                </span>
              </div>

              <div className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1">
                <span className="text-xs text-slate-300 whitespace-nowrap">Jalur Beban:</span>
                <select
                  value={simState.distributionMode}
                  onChange={(e) =>
                    onUpdateState({ distributionMode: e.target.value as DistributionMode })
                  }
                  className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-xs text-slate-100"
                >
                  <option value="70v-100v">70V / 100V Line</option>
                  <option value="8ohm">8 Ω Direct</option>
                  <option value="short-fault">Korsleting (Low-Z)</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() =>
                  onUpdateState({ plenumVentilationPoor: !simState.plenumVentilationPoor })
                }
                className={`rounded-lg px-2.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 ${
                  simState.plenumVentilationPoor
                    ? 'border border-red-500/50 bg-red-950/60 text-red-200'
                    : 'border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
                }`}
              >
                Ventilasi Plafon: {simState.plenumVentilationPoor ? 'Tertutup (Panas)' : 'Normal'}
              </button>
            </div>
          )}

          {/* Quick Component Annotation Selector in Inspect / Cutaway */}
          {!isIntegratedOrFault && (
            <div className="flex items-center gap-2">
              <Wrench className="h-3.5 w-3.5 text-slate-400" />
              <select
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) onSelectAnnotation(e.target.value);
                }}
                className="max-w-[220px] rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-200"
                aria-label="Inspeksi Komponen"
              >
                <option value="">Klik 3D atau pilih komponen...</option>
                {focusList.map((comp) => (
                  <option key={comp.id} value={comp.id}>
                    {comp.nameId}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Quick PTT / Power indicator in Integrated Wiring tab */}
          {activeControlDevice === 'wiring' && isIntegratedOrFault && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onUpdateState({ preampPowerOn: !simState.preampPowerOn })}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 ${
                  simState.preampPowerOn
                    ? 'bg-emerald-500 text-slate-950'
                    : 'border border-slate-700 bg-slate-800 text-slate-300'
                }`}
              >
                Power: {simState.preampPowerOn ? 'I' : 'O'}
              </button>
              <button
                type="button"
                onClick={() => onUpdateState({ pttActive: !simState.pttActive, audioPlaying: true })}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 ${
                  simState.pttActive
                    ? 'bg-red-600 text-white'
                    : 'border border-slate-700 bg-slate-800 text-slate-300'
                }`}
              >
                PTT: {simState.pttActive ? 'ON' : 'OFF'}
              </button>
            </div>
          )}
        </div>

        {/* Live Microphone Permission Error Banner if applicable */}
        {micPermissionError && simState.audioSourceMode === 'live-mic' && (
          <p className="mt-2 text-xs text-amber-300">
            Catatan Mikrofon Perangkat: {micPermissionError}. Pilih rekaman uji bawaan jika browser tidak mengizinkan akses mic.
          </p>
        )}
      </div>
    </div>
  );
};
