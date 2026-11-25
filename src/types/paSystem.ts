export type SimMode = 'inspect' | 'cutaway' | 'integrated' | 'troubleshooting';

export type DeviceId = 'microphone' | 'preamp' | 'speaker' | 'sensors';

export type FocusTarget = 'microphone' | 'preamp' | 'speaker' | 'system';

export type LanguageMode = 'id' | 'id-en';

export type AudioSourceMode = 'airport-announcement' | 'plosive-test' | 'tone-1khz' | 'live-mic';

export type CableState = 'connected' | 'loose' | 'disconnected';

export type CrossoverMode = '1-way' | '2-way';

export type SplProbeLocation = 'room-lounge' | 'mic-gooseneck';

export type SplWeighting = 'dBA' | 'dBC';

export type DistributionMode = '8ohm' | '70v-100v' | 'short-fault';

export interface ComponentAnnotation {
  id: string;
  device: DeviceId;
  nameId: string;
  nameEn: string;
  layerType: 'external' | 'internal';
  category: string;
  descId: string;
  specs: string[];
}

export interface FaultScenario {
  id: string;
  titleId: string;
  symptomId: string;
  hintId: string;
  targetExplanationId: string;
  initialOverrides: Partial<SimulationState>;
  isResolved: (state: SimulationState, metrics: AudioMetrics) => boolean;
}

export interface TelemetryPoint {
  timeSec: number;
  spl_db: number;
  temp_preamp_c: number;
  temp_speaker_c: number;
  current_ma: number;
}

export interface SimulationState {
  mode: SimMode;
  focusTarget: FocusTarget;
  languageMode: LanguageMode;

  // Inspection & Cut-away
  explodedProgress: number; // 0 to 1
  cutAwayActive: boolean;

  // Module 1: PA Microphone
  windshieldAttached: boolean;
  gooseneckAngle: number; // -35 to +35 degrees
  gooseneckDistance: number; // 0.15 to 1.0 (meters normalized)
  pttActive: boolean;

  // Module 2: Pre-Amplifier
  preampPowerOn: boolean;
  preampGain: number; // 0 to 100 (%)

  // Module 3: Ceiling Speaker
  speakerGrilleRemoved: boolean;
  ceilingMountProgress: number; // 0 to 1
  crossoverMode: CrossoverMode;
  backCanDamping: boolean;
  speakerPolarityReversed: boolean;

  // Wiring (Integrated & Troubleshooting)
  cableMicToPreamp: CableState;
  cablePreampToSpeaker: CableState;

  // Audio DSP & Room Test
  audioPlaying: boolean;
  audioSourceMode: AudioSourceMode;
  showOscilloscope: boolean;

  // PRD v1.4 Virtual Sensors & Load Environment
  showSensorProbes: boolean;
  splProbeLocation: SplProbeLocation;
  splListenerDistanceM: number; // 1.0 to 5.0 meters
  splWeighting: SplWeighting;
  ambientNoiseDb: number; // 42 to 80 dB
  distributionMode: DistributionMode;
  plenumVentilationPoor: boolean;

  // Troubleshooting
  activeFaultId: string | null;
}

export interface AudioMetrics {
  inputMv: number; // Millivolts (0 - 50 mV)
  outputV: number; // Line-level Volts (0 - 3.5 V)
  splDb: number; // Weighted Room/Probe SPL (dBA or dBC)
  spl_db: number; // PRD v1.4 state bus alias
  splDba: number;
  splDbc: number;
  snrDb: number; // Signal-to-Noise Ratio dB
  intelligibilityPct: number; // 0 - 100% Speech Intelligibility
  temp_preamp_c: number; // Pre-Amp PCB / NPN transistor temp (°C)
  temp_speaker_c: number; // Voice coil / Back Can temp (°C)
  current_preamp_ma: number; // Pre-Amp DC supply rail current (mA)
  current_speaker_ma: number; // Speaker output line current (mA)
  current_ma: number; // Total monitored current (mA)
  isClipping: boolean;
  isLowSnr: boolean;
  isHumPresent: boolean;
  isPopNoiseActive: boolean;
  isThermalThrottling: boolean;
  isOvercurrent: boolean;
  isSignalActive: boolean;
  inputWaveform: Float32Array;
  outputWaveform: Float32Array;
}
