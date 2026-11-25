import { AudioMetrics, AudioSourceMode, SimulationState, TelemetryPoint } from '../types/paSystem';

export class PaDspEngine {
  private ctx: AudioContext | null = null;
  private isInitialized = false;

  // Source nodes
  private bufferSource: AudioBufferSourceNode | null = null;
  private micStream: MediaStream | null = null;
  private micMediaSource: MediaStreamAudioSourceNode | null = null;
  private currentSourceMode: AudioSourceMode = 'airport-announcement';

  // Buffers (procedurally synthesized)
  private buffers: Partial<Record<'airport-announcement' | 'plosive-test' | 'tone-1khz', AudioBuffer>> = {};

  // DSP Graph nodes
  private sourceGainNode: GainNode | null = null;
  private plosiveFilterNode: BiquadFilterNode | null = null;
  private inputAnalyser: AnalyserNode | null = null;

  private micCableGainNode: GainNode | null = null;
  private humOsc50: OscillatorNode | null = null;
  private humOsc100: OscillatorNode | null = null;
  private humGainNode: GainNode | null = null;

  private noiseSource: AudioBufferSourceNode | null = null;
  private noiseGainNode: GainNode | null = null;

  private preampGainNode: GainNode | null = null;
  private clipWaveShaper: WaveShaperNode | null = null;
  private outputAnalyser: AnalyserNode | null = null;

  private crossoverFilter: BiquadFilterNode | null = null;
  private backCanFilter: BiquadFilterNode | null = null;
  private speakerGainNode: GainNode | null = null;
  private masterSafetyGain: GainNode | null = null;

  // Waveform buffers
  private inputWaveData = new Float32Array(256);
  private outputWaveData = new Float32Array(256);

  // State tracking
  private lastPttState = false;
  private micPermissionError: string | null = null;
  private latestState: SimulationState | null = null;

  // PRD v1.4 Thermal & Telemetry state
  private tempPreampC = 28.5;
  private tempSpeakerC = 27.0;
  private lastThermalUpdateMs = performance.now();
  private lastHistoryPushMs = 0;
  private startTimeMs = performance.now();
  private telemetryHistory: TelemetryPoint[] = [];

  public getMicPermissionError(): string | null {
    return this.micPermissionError;
  }

  public getTelemetryHistory(): TelemetryPoint[] {
    return this.telemetryHistory;
  }

  public resetTelemetry(): void {
    this.tempPreampC = 28.5;
    this.tempSpeakerC = 27.0;
    this.telemetryHistory = [];
    this.startTimeMs = performance.now();
  }

  public async ensureContext(): Promise<AudioContext> {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      await this.setupGraph();
    }
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    return this.ctx;
  }

  private async setupGraph(): Promise<void> {
    if (!this.ctx || this.isInitialized) return;
    const ctx = this.ctx;

    // Synthesize procedural test buffers
    this.buffers['airport-announcement'] = this.createAnnouncementBuffer(ctx);
    this.buffers['plosive-test'] = this.createPlosiveTestBuffer(ctx);
    this.buffers['tone-1khz'] = this.createTone1kHzBuffer(ctx);

    // 1. Source & Windshield Stage
    this.sourceGainNode = ctx.createGain();
    this.sourceGainNode.gain.value = 0;

    this.plosiveFilterNode = ctx.createBiquadFilter();
    this.plosiveFilterNode.type = 'highpass';
    this.plosiveFilterNode.frequency.value = 180;
    this.plosiveFilterNode.Q.value = 0.7;

    this.inputAnalyser = ctx.createAnalyser();
    this.inputAnalyser.fftSize = 256;

    // 2. Cable & 50Hz Hum Stage
    this.micCableGainNode = ctx.createGain();
    this.micCableGainNode.gain.value = 1;

    this.humGainNode = ctx.createGain();
    this.humGainNode.gain.value = 0;

    this.humOsc50 = ctx.createOscillator();
    this.humOsc50.type = 'sawtooth';
    this.humOsc50.frequency.value = 50;
    const humLowpass = ctx.createBiquadFilter();
    humLowpass.type = 'lowpass';
    humLowpass.frequency.value = 180;

    this.humOsc100 = ctx.createOscillator();
    this.humOsc100.type = 'sine';
    this.humOsc100.frequency.value = 100;

    this.humOsc50.connect(humLowpass);
    humLowpass.connect(this.humGainNode);
    this.humOsc100.connect(this.humGainNode);
    this.humOsc50.start();
    this.humOsc100.start();

    // 3. Pre-Amp Thermal Noise Floor
    this.noiseGainNode = ctx.createGain();
    this.noiseGainNode.gain.value = 0.008;
    const noiseBuffer = this.createWhiteNoiseBuffer(ctx);
    this.noiseSource = ctx.createBufferSource();
    this.noiseSource.buffer = noiseBuffer;
    this.noiseSource.loop = true;
    this.noiseSource.connect(this.noiseGainNode);
    this.noiseSource.start();

    // 4. Pre-Amp Gain & Clipping Stage
    this.preampGainNode = ctx.createGain();
    this.preampGainNode.gain.value = 1;

    this.clipWaveShaper = ctx.createWaveShaper();
    this.clipWaveShaper.curve = this.createSoftHardClipCurve();
    this.clipWaveShaper.oversample = '2x';

    this.outputAnalyser = ctx.createAnalyser();
    this.outputAnalyser.fftSize = 256;

    // 5. Ceiling Speaker Stage (Crossover + Back Can + Polarity/Output)
    this.crossoverFilter = ctx.createBiquadFilter();
    this.crossoverFilter.type = 'highshelf';
    this.crossoverFilter.frequency.value = 2800;
    this.crossoverFilter.gain.value = 2;

    this.backCanFilter = ctx.createBiquadFilter();
    this.backCanFilter.type = 'peaking';
    this.backCanFilter.frequency.value = 210;
    this.backCanFilter.Q.value = 2.4;
    this.backCanFilter.gain.value = 0;

    this.speakerGainNode = ctx.createGain();
    this.speakerGainNode.gain.value = 1;

    this.masterSafetyGain = ctx.createGain();
    this.masterSafetyGain.gain.value = 0.28;

    // Connect chain
    this.sourceGainNode.connect(this.plosiveFilterNode);
    this.plosiveFilterNode.connect(this.inputAnalyser);

    this.inputAnalyser.connect(this.micCableGainNode);
    this.micCableGainNode.connect(this.preampGainNode);
    this.humGainNode.connect(this.preampGainNode);
    this.noiseGainNode.connect(this.preampGainNode);

    this.preampGainNode.connect(this.clipWaveShaper);
    this.clipWaveShaper.connect(this.outputAnalyser);

    this.outputAnalyser.connect(this.crossoverFilter);
    this.crossoverFilter.connect(this.backCanFilter);
    this.backCanFilter.connect(this.speakerGainNode);
    this.speakerGainNode.connect(this.masterSafetyGain);
    this.masterSafetyGain.connect(ctx.destination);

    this.isInitialized = true;
  }

  private createSoftHardClipCurve(): Float32Array<ArrayBuffer> {
    const samples = 1024;
    const buffer = new ArrayBuffer(samples * 4);
    const curve = new Float32Array(buffer);
    const threshold = 0.72;
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      if (Math.abs(x) <= threshold) {
        curve[i] = x;
      } else {
        const sign = Math.sign(x);
        const excess = Math.abs(x) - threshold;
        curve[i] = sign * (threshold + Math.tanh(excess * 4) * 0.08);
      }
    }
    return curve;
  }

  private createWhiteNoiseBuffer(ctx: AudioContext): AudioBuffer {
    const len = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.25;
    }
    return buffer;
  }

  private createTone1kHzBuffer(ctx: AudioContext): AudioBuffer {
    const len = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const t = i / ctx.sampleRate;
      data[i] = Math.sin(2 * Math.PI * 1000 * t) * 0.32;
    }
    return buffer;
  }

  private createAnnouncementBuffer(ctx: AudioContext): AudioBuffer {
    const duration = 4.2;
    const sr = ctx.sampleRate;
    const len = Math.floor(sr * duration);
    const buffer = ctx.createBuffer(1, len, sr);
    const data = buffer.getChannelData(0);

    const syllables: Array<[number, number, number, number, number, boolean]> = [
      [0.65, 0.92, 155, 650, 1250, true],
      [0.94, 1.18, 162, 520, 1450, false],
      [1.20, 1.48, 150, 480, 1600, false],
      [1.50, 1.82, 142, 700, 1150, false],
      [2.05, 2.32, 165, 620, 1300, true],
      [2.34, 2.62, 158, 430, 1800, false],
      [2.64, 2.95, 148, 680, 1180, true],
      [2.97, 3.38, 138, 560, 1350, false],
      [3.52, 3.92, 132, 490, 1100, false],
    ];

    for (let i = 0; i < len; i++) {
      const t = i / sr;
      let sample = 0;

      if (t >= 0.04 && t < 0.62) {
        const notes = [
          { start: 0.04, freq: 523.25 },
          { start: 0.20, freq: 659.25 },
          { start: 0.36, freq: 783.99 },
        ];
        for (const n of notes) {
          if (t >= n.start) {
            const nt = t - n.start;
            const env = Math.exp(-nt * 6.5) * Math.min(1, nt * 120);
            sample += (Math.sin(2 * Math.PI * n.freq * nt) * 0.7 + Math.sin(4 * Math.PI * n.freq * nt) * 0.15) * env * 0.25;
          }
        }
      }

      for (const [s, e, f0, f1, f2, plosive] of syllables) {
        if (t >= s && t <= e) {
          const lt = t - s;
          const dur = e - s;
          const env = Math.sin((lt / dur) * Math.PI);
          const pitch = f0 * (1 - 0.08 * (lt / dur));
          const glottal =
            Math.sin(2 * Math.PI * pitch * lt) * 0.4 +
            Math.sin(2 * Math.PI * f1 * lt) * 0.32 * env +
            Math.sin(2 * Math.PI * f2 * lt) * 0.16 * env;

          sample += glottal * env * 0.32;

          if (plosive && lt < 0.09) {
            const puffEnv = Math.exp(-lt * 42);
            sample += (Math.sin(2 * Math.PI * 52 * lt) * 0.5 + (Math.random() * 2 - 1) * 0.35) * puffEnv * 0.55;
          }
        }
      }

      data[i] = Math.max(-0.95, Math.min(0.95, sample));
    }
    return buffer;
  }

  private createPlosiveTestBuffer(ctx: AudioContext): AudioBuffer {
    const duration = 2.6;
    const sr = ctx.sampleRate;
    const len = Math.floor(sr * duration);
    const buffer = ctx.createBuffer(1, len, sr);
    const data = buffer.getChannelData(0);

    const bursts = [0.15, 0.75, 1.35, 1.95];
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      let sample = 0;
      for (const b of bursts) {
        if (t >= b && t < b + 0.42) {
          const lt = t - b;
          const env = Math.sin((lt / 0.42) * Math.PI);
          sample += (Math.sin(2 * Math.PI * 145 * lt) * 0.4 + Math.sin(2 * Math.PI * 680 * lt) * 0.25) * env * 0.32;
          if (lt < 0.14) {
            const puffEnv = Math.exp(-lt * 26);
            sample += (Math.sin(2 * Math.PI * 55 * lt) * 0.75 + (Math.random() * 2 - 1) * 0.45) * puffEnv * 0.8;
          }
        }
      }
      data[i] = Math.max(-0.95, Math.min(0.95, sample));
    }
    return buffer;
  }

  public playPttChime(): void {
    if (!this.ctx || !this.isInitialized || !this.masterSafetyGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;
    const chimeNotes = [523.25, 659.25, 783.99];
    chimeNotes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.11);
      g.gain.setValueAtTime(0.001, now + idx * 0.11);
      g.gain.exponentialRampToValueAtTime(0.18, now + idx * 0.11 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.11 + 0.45);
      osc.connect(g);
      g.connect(this.masterSafetyGain!);
      osc.start(now + idx * 0.11);
      osc.stop(now + idx * 0.11 + 0.48);
    });
  }

  private stopCurrentSource(): void {
    if (this.bufferSource) {
      try {
        this.bufferSource.stop();
        this.bufferSource.disconnect();
      } catch {}
      this.bufferSource = null;
    }
    if (this.micMediaSource) {
      this.micMediaSource.disconnect();
      this.micMediaSource = null;
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach((t) => t.stop());
      this.micStream = null;
    }
  }

  private async startSource(mode: AudioSourceMode): Promise<void> {
    if (!this.ctx || !this.sourceGainNode) return;
    this.stopCurrentSource();
    this.currentSourceMode = mode;
    this.micPermissionError = null;

    if (mode === 'live-mic') {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: false,
            autoGainControl: false,
          },
        });
        this.micStream = stream;
        this.micMediaSource = this.ctx.createMediaStreamSource(stream);
        this.micMediaSource.connect(this.sourceGainNode);
      } catch (err) {
        this.micPermissionError =
          err instanceof Error ? err.message : 'Izin mikrofon perangkat tidak tersedia.';
      }
      return;
    }

    const buf = this.buffers[mode];
    if (buf) {
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      src.connect(this.sourceGainNode);
      src.start();
      this.bufferSource = src;
    }
  }

  public async applyState(state: SimulationState): Promise<void> {
    this.latestState = state;
    const shouldRunAudio = state.audioPlaying;

    if (shouldRunAudio) {
      await this.ensureContext();
      if (!this.bufferSource && !this.micMediaSource) {
        await this.startSource(state.audioSourceMode);
      } else if (state.audioSourceMode !== this.currentSourceMode) {
        await this.startSource(state.audioSourceMode);
      }
    } else if (!shouldRunAudio && (this.bufferSource || this.micMediaSource)) {
      this.stopCurrentSource();
    }

    if (!this.ctx || !this.isInitialized) return;
    const now = this.ctx.currentTime;

    if (state.pttActive && !this.lastPttState && state.audioPlaying) {
      this.playPttChime();
    }
    this.lastPttState = state.pttActive;

    const angleAtten = Math.max(0.32, Math.cos((state.gooseneckAngle * Math.PI) / 180));
    const distAtten = Math.min(1.35, 0.38 / Math.max(0.18, state.gooseneckDistance));
    const pttGate = state.pttActive && state.audioPlaying ? 1.0 : 0.0;
    this.sourceGainNode?.gain.setTargetAtTime(pttGate * angleAtten * distAtten, now, 0.025);

    if (this.plosiveFilterNode) {
      if (state.windshieldAttached) {
        this.plosiveFilterNode.type = 'highpass';
        this.plosiveFilterNode.frequency.setTargetAtTime(185, now, 0.03);
        this.plosiveFilterNode.Q.setTargetAtTime(0.7, now, 0.03);
      } else {
        this.plosiveFilterNode.type = 'lowshelf';
        this.plosiveFilterNode.frequency.setTargetAtTime(130, now, 0.03);
        this.plosiveFilterNode.gain.setTargetAtTime(9.5, now, 0.03);
      }
    }

    const micCableMult =
      state.cableMicToPreamp === 'connected' ? 1.0 : state.cableMicToPreamp === 'loose' ? 0.65 : 0.0;
    this.micCableGainNode?.gain.setTargetAtTime(micCableMult, now, 0.02);

    const anyLoose = state.cableMicToPreamp === 'loose' || state.cablePreampToSpeaker === 'loose';
    const humTarget = state.preampPowerOn && anyLoose ? 0.16 : 0.0;
    this.humGainNode?.gain.setTargetAtTime(humTarget, now, 0.03);

    if (this.preampGainNode && this.noiseGainNode) {
      if (!state.preampPowerOn) {
        this.preampGainNode.gain.setTargetAtTime(0, now, 0.02);
        this.noiseGainNode.gain.setTargetAtTime(0, now, 0.02);
      } else {
        const norm = state.preampGain / 100;
        const gainLinear = 0.06 * Math.pow(76, norm);
        this.preampGainNode.gain.setTargetAtTime(gainLinear, now, 0.025);
        this.noiseGainNode.gain.setTargetAtTime(0.012, now, 0.025);
      }
    }

    if (this.crossoverFilter) {
      if (state.crossoverMode === '2-way') {
        this.crossoverFilter.type = 'highshelf';
        this.crossoverFilter.frequency.setTargetAtTime(2600, now, 0.04);
        this.crossoverFilter.gain.setTargetAtTime(3.5, now, 0.04);
      } else {
        this.crossoverFilter.type = 'lowpass';
        this.crossoverFilter.frequency.setTargetAtTime(4800, now, 0.04);
        this.crossoverFilter.Q.setTargetAtTime(0.7, now, 0.04);
      }
    }

    if (this.backCanFilter) {
      this.backCanFilter.gain.setTargetAtTime(state.backCanDamping ? -1.5 : 8.5, now, 0.04);
    }

    // Speaker Output Cable, Polarity, & Thermal Throttling compression
    if (this.speakerGainNode) {
      let spkMult = 0;
      if (state.cablePreampToSpeaker === 'connected') {
        spkMult = state.speakerPolarityReversed ? -0.35 : 1.0;
      } else if (state.cablePreampToSpeaker === 'loose') {
        spkMult = state.speakerPolarityReversed ? -0.2 : 0.55;
      }
      if (state.distributionMode === 'short-fault') {
        spkMult *= 0.35; // Voltage sag under short-circuit overload
      }
      if (this.tempSpeakerC > 95 || this.tempPreampC > 72) {
        spkMult *= 0.68; // Thermal protection throttling
      }
      this.speakerGainNode.gain.setTargetAtTime(spkMult, now, 0.02);
    }
  }

  public sampleMetrics(state: SimulationState): AudioMetrics {
    const activeState = this.latestState || state;
    const nowMs = performance.now();
    const dtSec = Math.min(0.25, Math.max(0.001, (nowMs - this.lastThermalUpdateMs) / 1000));
    this.lastThermalUpdateMs = nowMs;

    if (this.ctx && this.isInitialized && this.inputAnalyser && this.outputAnalyser && activeState.audioPlaying) {
      this.inputAnalyser.getFloatTimeDomainData(this.inputWaveData);
      this.outputAnalyser.getFloatTimeDomainData(this.outputWaveData);
    } else {
      const t = nowMs * 0.001;
      for (let i = 0; i < 256; i++) {
        this.inputWaveData[i] = (Math.random() * 2 - 1) * 0.003;
        if (activeState.preampPowerOn) {
          const hum =
            activeState.cableMicToPreamp === 'loose' || activeState.cablePreampToSpeaker === 'loose'
              ? Math.sin(t * 20 + i * 0.25) * 0.22
              : 0;
          this.outputWaveData[i] = (Math.random() * 2 - 1) * 0.015 + hum;
        } else {
          this.outputWaveData[i] = 0;
        }
      }
    }

    let inSum = 0;
    let outSum = 0;
    let outPeak = 0;
    for (let i = 0; i < 256; i++) {
      const iv = this.inputWaveData[i];
      const ov = this.outputWaveData[i];
      inSum += iv * iv;
      outSum += ov * ov;
      if (Math.abs(ov) > outPeak) outPeak = Math.abs(ov);
    }

    const inRms = Math.sqrt(inSum / 256);
    const outRms = Math.sqrt(outSum / 256);

    const anyLoose =
      activeState.cableMicToPreamp === 'loose' || activeState.cablePreampToSpeaker === 'loose';
    const isHumPresent = activeState.preampPowerOn && anyLoose;

    const isSignalActive =
      activeState.audioPlaying &&
      activeState.pttActive &&
      activeState.preampPowerOn &&
      activeState.cableMicToPreamp !== 'disconnected' &&
      activeState.cablePreampToSpeaker !== 'disconnected' &&
      !activeState.speakerPolarityReversed;

    const inputMv = Math.min(48, inRms * 58);
    const outputV = activeState.preampPowerOn ? Math.min(3.2, outRms * 3.8) : 0;

    const isClipping =
      activeState.preampPowerOn &&
      ((outPeak >= 0.70 && activeState.pttActive && activeState.audioPlaying) ||
        (activeState.preampGain > 76 && activeState.pttActive && activeState.audioPlaying && activeState.cableMicToPreamp !== 'disconnected'));

    // Pop noise active when windshield removed + speaking
    const isPopNoiseActive =
      !activeState.windshieldAttached &&
      activeState.pttActive &&
      activeState.audioPlaying &&
      (activeState.audioSourceMode === 'plosive-test' ||
        activeState.audioSourceMode === 'airport-announcement' ||
        activeState.audioSourceMode === 'live-mic');

    // ==========================================
    // PRD v1.4 SENSOR 3: CURRENT SENSE (mA)
    // ==========================================
    let current_preamp_ma = 0;
    if (activeState.preampPowerOn) {
      // Continuous bias draw ~42 mA + signal amplification current
      current_preamp_ma = 42 + outputV * 28 + (isClipping ? 35 : 0);
      if (activeState.distributionMode === 'short-fault' && activeState.cablePreampToSpeaker !== 'disconnected') {
        current_preamp_ma += 180;
      }
    }

    let current_speaker_ma = 0;
    if (activeState.preampPowerOn && activeState.cablePreampToSpeaker !== 'disconnected') {
      const cableFactor = activeState.cablePreampToSpeaker === 'loose' ? 0.55 : 1.0;
      const driveLevel = Math.max(0.015, outputV * 0.85 + (isHumPresent ? 0.25 : 0));
      if (activeState.distributionMode === '70v-100v') {
        // 70V/100V high-voltage constant line: lower current (~40-260 mA)
        current_speaker_ma = driveLevel * 145 * cableFactor;
      } else if (activeState.distributionMode === '8ohm') {
        // Direct 8 ohm load: higher current (~120-780 mA)
        current_speaker_ma = driveLevel * 420 * cableFactor;
      } else {
        // short-fault (low-Z ~1.5 ohm): severe overcurrent (>1500 mA)
        current_speaker_ma = (980 + driveLevel * 1150) * cableFactor;
      }
      if (!activeState.pttActive && !isHumPresent) {
        current_speaker_ma *= 0.12; // Idle quiescent noise draw on line
      }
    }

    const current_ma = current_preamp_ma + current_speaker_ma;
    const isOvercurrent = current_speaker_ma > 1400 || current_ma > 1550;

    // ==========================================
    // PRD v1.4 SENSOR 2: THERMAL MODEL (°C)
    // ==========================================
    // Equilibrium target temperatures driven by current, clipping, short fault, & plenum ventilation
    const preampTargetTemp = activeState.preampPowerOn
      ? 36 +
        (current_preamp_ma / 260) * 28 +
        (isClipping ? 26 : 0) +
        (activeState.distributionMode === 'short-fault' ? 22 : 0)
      : 26.5;

    const speakerHeatPower =
      (current_speaker_ma / 650) * 24 +
      (isClipping ? 24 : 0) +
      (isOvercurrent ? 46 : 0) +
      (activeState.plenumVentilationPoor && activeState.preampPowerOn ? 28 : 0);
    const speakerTargetTemp = 26.5 + speakerHeatPower;

    // Fast responsive thermal time constant for educational simulation (~3-5s ramp)
    const preampRate = preampTargetTemp > this.tempPreampC ? 0.35 : 0.22;
    const spkRate = speakerTargetTemp > this.tempSpeakerC ? 0.32 : 0.18;
    this.tempPreampC += (preampTargetTemp - this.tempPreampC) * Math.min(1, preampRate * dtSec);
    this.tempSpeakerC += (speakerTargetTemp - this.tempSpeakerC) * Math.min(1, spkRate * dtSec);

    const isThermalThrottling = this.tempPreampC > 72 || this.tempSpeakerC > 95;

    // ==========================================
    // PRD v1.4 SENSOR 1: SOUND LEVEL / SPL PROBE (dBA/dBC)
    // ==========================================
    const speakerFactor =
      activeState.cablePreampToSpeaker === 'connected'
        ? activeState.speakerPolarityReversed
          ? 0.25
          : 1.0
        : activeState.cablePreampToSpeaker === 'loose'
        ? 0.5
        : 0;

    const throttleAttenDb = isThermalThrottling ? -4.5 : 0;
    const distAttenDb =
      activeState.splProbeLocation === 'room-lounge'
        ? -20 * Math.log10(Math.max(1.0, activeState.splListenerDistanceM))
        : -2.0; // Near microphone gooseneck

    const rawSpeakerOutputDb =
      activeState.preampPowerOn && speakerFactor > 0
        ? 62 +
          speakerFactor * Math.min(44, outputV * 24) +
          distAttenDb +
          throttleAttenDb
        : 0;

    // dBA attenuates low-end hum/plosive rumble compared to flat dBC
    const lowFreqBonusC = (isHumPresent ? 5.5 : 0) + (isPopNoiseActive ? 6.0 : 0);
    const ambientA = activeState.ambientNoiseDb;
    const ambientC = activeState.ambientNoiseDb + 3.5;

    // Energetic logarithmic sum of Signal SPL + Ambient Noise
    const combineDb = (sigDb: number, ambDb: number) =>
      sigDb <= 10
        ? ambDb
        : 10 * Math.log10(Math.pow(10, sigDb / 10) + Math.pow(10, ambDb / 10));

    const splDba = combineDb(rawSpeakerOutputDb, ambientA);
    const splDbc = combineDb(rawSpeakerOutputDb + lowFreqBonusC, ambientC);
    const splDb = activeState.splWeighting === 'dBA' ? splDba : splDbc;

    // SNR & Speech Intelligibility %
    const effectiveSigDb =
      activeState.pttActive && activeState.audioPlaying && speakerFactor > 0 && activeState.preampPowerOn
        ? rawSpeakerOutputDb
        : 0;
    const noiseFloorDb = ambientA + (isHumPresent ? 11 : 0);
    const snrDb = effectiveSigDb > 0 ? Math.max(0, Math.min(58, effectiveSigDb - noiseFloorDb + 12)) : 0;
    const isLowSnr =
      activeState.preampPowerOn &&
      activeState.pttActive &&
      activeState.audioPlaying &&
      (activeState.preampGain < 24 || snrDb < 16);

    const clipPenalty = isClipping ? 28 : 0;
    const popPenalty = isPopNoiseActive ? 18 : 0;
    const humPenalty = isHumPresent ? 22 : 0;
    const intelligibilityPct =
      effectiveSigDb <= 0
        ? 0
        : Math.max(
            5,
            Math.min(99, Math.round((snrDb / 34) * 100 - clipPenalty - popPenalty - humPenalty))
          );

    // Record telemetry history every 450 ms (keep last 90 samples)
    if (nowMs - this.lastHistoryPushMs >= 450) {
      this.lastHistoryPushMs = nowMs;
      this.telemetryHistory.push({
        timeSec: (nowMs - this.startTimeMs) / 1000,
        spl_db: splDb,
        temp_preamp_c: this.tempPreampC,
        temp_speaker_c: this.tempSpeakerC,
        current_ma,
      });
      if (this.telemetryHistory.length > 90) {
        this.telemetryHistory.shift();
      }
    }

    return {
      inputMv,
      outputV,
      splDb,
      spl_db: splDb,
      splDba,
      splDbc,
      snrDb,
      intelligibilityPct,
      temp_preamp_c: this.tempPreampC,
      temp_speaker_c: this.tempSpeakerC,
      current_preamp_ma,
      current_speaker_ma,
      current_ma,
      isClipping,
      isLowSnr,
      isHumPresent,
      isPopNoiseActive,
      isThermalThrottling,
      isOvercurrent,
      isSignalActive,
      inputWaveform: this.inputWaveData,
      outputWaveform: this.outputWaveData,
    };
  }

  public dispose(): void {
    this.stopCurrentSource();
    if (this.humOsc50) {
      try {
        this.humOsc50.stop();
      } catch {}
    }
    if (this.humOsc100) {
      try {
        this.humOsc100.stop();
      } catch {}
    }
    if (this.noiseSource) {
      try {
        this.noiseSource.stop();
      } catch {}
    }
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
  }
}
