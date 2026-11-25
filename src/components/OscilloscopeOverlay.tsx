import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Flame,
  Radio,
  RotateCcw,
  TrendingUp,
  Volume2,
  X,
  Zap,
} from 'lucide-react';
import { AudioMetrics, SimulationState, TelemetryPoint } from '../types/paSystem';

interface OscilloscopeOverlayProps {
  metricsRef: React.MutableRefObject<AudioMetrics>;
  telemetryHistoryRef: React.MutableRefObject<TelemetryPoint[]>;
  simState: SimulationState;
  onResetTelemetry: () => void;
  onClose: () => void;
}

type TelemetryTab = 'scope' | 'trends';

export const OscilloscopeOverlay: React.FC<OscilloscopeOverlayProps> = ({
  metricsRef,
  telemetryHistoryRef,
  simState,
  onResetTelemetry,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<TelemetryTab>('scope');
  const scopeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const trendCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const readoutsRef = useRef<{
    inMv: HTMLSpanElement | null;
    outV: HTMLSpanElement | null;
    spl: HTMLSpanElement | null;
    snr: HTMLSpanElement | null;
    intel: HTMLSpanElement | null;
    tPre: HTMLSpanElement | null;
    tSpk: HTMLSpanElement | null;
    iPre: HTMLSpanElement | null;
    iSpk: HTMLSpanElement | null;
  }>({
    inMv: null,
    outV: null,
    spl: null,
    snr: null,
    intel: null,
    tPre: null,
    tSpk: null,
    iPre: null,
    iSpk: null,
  });

  useEffect(() => {
    let rafId = 0;
    let lastDraw = 0;

    const draw = (now: number) => {
      rafId = requestAnimationFrame(draw);
      if (now - lastDraw < 40) return;
      lastDraw = now;

      const m = metricsRef.current;

      // Update live tabular readouts
      if (readoutsRef.current.inMv) readoutsRef.current.inMv.textContent = `${m.inputMv.toFixed(1)} mV`;
      if (readoutsRef.current.outV) readoutsRef.current.outV.textContent = `${m.outputV.toFixed(2)} V`;
      if (readoutsRef.current.spl)
        readoutsRef.current.spl.textContent = `${m.splDb.toFixed(1)} ${simState.splWeighting}`;
      if (readoutsRef.current.snr) readoutsRef.current.snr.textContent = `${m.snrDb.toFixed(0)} dB`;
      if (readoutsRef.current.intel)
        readoutsRef.current.intel.textContent = `${m.intelligibilityPct}%`;
      if (readoutsRef.current.tPre)
        readoutsRef.current.tPre.textContent = `${m.temp_preamp_c.toFixed(1)} °C`;
      if (readoutsRef.current.tSpk)
        readoutsRef.current.tSpk.textContent = `${m.temp_speaker_c.toFixed(1)} °C`;
      if (readoutsRef.current.iPre)
        readoutsRef.current.iPre.textContent = `${Math.round(m.current_preamp_ma)} mA`;
      if (readoutsRef.current.iSpk)
        readoutsRef.current.iSpk.textContent = `${Math.round(m.current_speaker_ma)} mA`;

      // Draw Oscilloscope Tab
      if (activeTab === 'scope' && scopeCanvasRef.current) {
        const ctx = scopeCanvasRef.current.getContext('2d');
        if (ctx) {
          const w = scopeCanvasRef.current.width;
          const h = scopeCanvasRef.current.height;
          ctx.fillStyle = '#090d16';
          ctx.fillRect(0, 0, w, h);

          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 1;
          for (let gx = 0; gx <= w; gx += w / 8) {
            ctx.beginPath();
            ctx.moveTo(gx, 0);
            ctx.lineTo(gx, h);
            ctx.stroke();
          }
          for (let gy = 0; gy <= h; gy += h / 4) {
            ctx.beginPath();
            ctx.moveTo(0, gy);
            ctx.lineTo(w, gy);
            ctx.stroke();
          }

          ctx.strokeStyle = '#334155';
          ctx.beginPath();
          ctx.moveTo(0, h / 2);
          ctx.lineTo(w, h / 2);
          ctx.stroke();

          if (simState.preampPowerOn) {
            ctx.strokeStyle = 'rgba(239, 68, 68, 0.35)';
            ctx.setLineDash([4, 4]);
            const clipTop = h / 2 - 0.72 * (h * 0.44);
            const clipBot = h / 2 + 0.72 * (h * 0.44);
            ctx.beginPath();
            ctx.moveTo(0, clipTop);
            ctx.lineTo(w, clipTop);
            ctx.moveTo(0, clipBot);
            ctx.lineTo(w, clipBot);
            ctx.stroke();
            ctx.setLineDash([]);
          }

          // Input mV
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 1.7;
          ctx.beginPath();
          const inWave = m.inputWaveform;
          for (let i = 0; i < inWave.length; i++) {
            const x = (i / (inWave.length - 1)) * w;
            const y = h / 2 - Math.max(-1, Math.min(1, inWave[i] * 2.4)) * (h * 0.42);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();

          // Output V
          ctx.strokeStyle = m.isClipping ? '#ef4444' : '#fbbf24';
          ctx.lineWidth = 2.0;
          ctx.beginPath();
          const outWave = m.outputWaveform;
          for (let i = 0; i < outWave.length; i++) {
            const x = (i / (outWave.length - 1)) * w;
            const y = h / 2 - Math.max(-1, Math.min(1, outWave[i] * 1.15)) * (h * 0.44);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      }

      // Draw Temperature & Current Trend Log Chart
      if (activeTab === 'trends' && trendCanvasRef.current) {
        const ctx = trendCanvasRef.current.getContext('2d');
        const hist = telemetryHistoryRef.current;
        if (ctx) {
          const w = trendCanvasRef.current.width;
          const h = trendCanvasRef.current.height;
          ctx.fillStyle = '#090d16';
          ctx.fillRect(0, 0, w, h);

          // Grid
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 1;
          for (let gy = 0; gy <= h; gy += h / 4) {
            ctx.beginPath();
            ctx.moveTo(0, gy);
            ctx.lineTo(w, gy);
            ctx.stroke();
          }

          // Safe Thermal Threshold Line (~75°C on 20-130°C scale)
          const mapTempY = (t: number) => h - Math.max(0, Math.min(1, (t - 20) / 110)) * (h - 12) - 6;
          const mapCurY = (ma: number) => h - Math.max(0, Math.min(1, ma / 2200)) * (h - 12) - 6;

          ctx.strokeStyle = 'rgba(239, 68, 68, 0.35)';
          ctx.setLineDash([4, 4]);
          const warnY = mapTempY(72);
          ctx.beginPath();
          ctx.moveTo(0, warnY);
          ctx.lineTo(w, warnY);
          ctx.stroke();
          ctx.setLineDash([]);

          if (hist.length > 1) {
            const drawSeries = (
              color: string,
              getVal: (p: TelemetryPoint) => number,
              mapY: (v: number) => number
            ) => {
              ctx.strokeStyle = color;
              ctx.lineWidth = 1.8;
              ctx.beginPath();
              hist.forEach((pt, idx) => {
                const x = (idx / Math.max(1, hist.length - 1)) * w;
                const y = mapY(getVal(pt));
                if (idx === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
              });
              ctx.stroke();
            };

            drawSeries('#38bdf8', (p) => p.current_ma, mapCurY);
            drawSeries('#fbbf24', (p) => p.temp_preamp_c, mapTempY);
            drawSeries('#f87171', (p) => p.temp_speaker_c, mapTempY);
          }
        }
      }
    };

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [activeTab, metricsRef, telemetryHistoryRef, simState.preampPowerOn, simState.splWeighting]);

  const m = metricsRef.current;

  return (
    <aside
      aria-label="Osiloskop & Telemetri Sensor"
      className="pointer-events-auto w-[348px] rounded-xl border border-slate-700/80 bg-[#0F1623]/95 p-3.5 shadow-xl"
    >
      {/* Header & Sub-Tabs */}
      <div className="flex items-center justify-between gap-2 pb-2">
        <div className="flex items-center gap-1 rounded-lg bg-slate-900 p-0.5 border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('scope')}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium whitespace-nowrap transition-colors ${
              activeTab === 'scope'
                ? 'bg-sky-500 text-slate-950 font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Activity className="h-3 w-3" />
            <span>Osiloskop & SPL</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('trends')}
            className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] font-medium whitespace-nowrap transition-colors ${
              activeTab === 'trends'
                ? 'bg-sky-500 text-slate-950 font-semibold'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <TrendingUp className="h-3 w-3" />
            <span>Tren Suhu & Arus</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100 focus-visible:outline focus-visible:outline-sky-400"
          aria-label="Tutup Panel Telemetri"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {activeTab === 'scope' ? (
        <>
          <div className="overflow-hidden rounded-lg border border-slate-800 bg-[#090d16]">
            <canvas ref={scopeCanvasRef} width={320} height={100} className="block h-[100px] w-full" />
          </div>

          <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-0.5 w-3 bg-sky-400" />
              Input:{' '}
              <span
                ref={(el) => {
                  readoutsRef.current.inMv = el;
                }}
                className="font-mono-tech font-medium text-sky-300"
              >
                {m.inputMv.toFixed(1)} mV
              </span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className={`inline-block h-0.5 w-3 ${m.isClipping ? 'bg-red-500' : 'bg-amber-400'}`} />
              Output:{' '}
              <span
                ref={(el) => {
                  readoutsRef.current.outV = el;
                }}
                className={`font-mono-tech font-medium ${m.isClipping ? 'text-red-400' : 'text-amber-300'}`}
              >
                {m.outputV.toFixed(2)} V
              </span>
            </span>
          </div>
        </>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-slate-800 bg-[#090d16]">
            <canvas ref={trendCanvasRef} width={320} height={116} className="block h-[116px] w-full" />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-400">
            <div className="flex items-center gap-2.5">
              <span className="flex items-center gap-1 text-amber-300">
                <span className="inline-block h-0.5 w-2.5 bg-amber-400" /> T-PreAmp
              </span>
              <span className="flex items-center gap-1 text-red-300">
                <span className="inline-block h-0.5 w-2.5 bg-red-400" /> T-Coil
              </span>
              <span className="flex items-center gap-1 text-sky-300">
                <span className="inline-block h-0.5 w-2.5 bg-sky-400" /> Arus (mA)
              </span>
            </div>
            <button
              type="button"
              onClick={onResetTelemetry}
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              <RotateCcw className="h-2.5 w-2.5" />
              <span>Reset Log</span>
            </button>
          </div>
        </>
      )}

      {/* Acoustic SPL Probe + SNR + Intelligibility */}
      <div className="mt-2.5 grid grid-cols-3 gap-1.5 border-t border-slate-800 pt-2.5">
        <div className="rounded-lg border border-slate-800 bg-slate-900/80 px-2 py-1.5">
          <div className="flex items-center gap-1 text-[10px] text-slate-400">
            <Volume2 className="h-3 w-3 text-sky-400" />
            <span>Probe SPL</span>
          </div>
          <span
            ref={(el) => {
              readoutsRef.current.spl = el;
            }}
            className="font-mono-tech mt-0.5 block text-xs font-semibold text-slate-100"
          >
            {m.splDb.toFixed(1)} {simState.splWeighting}
          </span>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900/80 px-2 py-1.5">
          <div className="flex items-center gap-1 text-[10px] text-slate-400">
            <Radio className="h-3 w-3 text-slate-400" />
            <span>SNR</span>
          </div>
          <span
            ref={(el) => {
              readoutsRef.current.snr = el;
            }}
            className="font-mono-tech mt-0.5 block text-xs font-semibold text-slate-100"
          >
            {m.snrDb.toFixed(0)} dB
          </span>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900/80 px-2 py-1.5">
          <div className="text-[10px] text-slate-400">Kejelasan</div>
          <span
            ref={(el) => {
              readoutsRef.current.intel = el;
            }}
            className="font-mono-tech mt-0.5 block text-xs font-semibold text-slate-100"
          >
            {m.intelligibilityPct}%
          </span>
        </div>
      </div>

      {/* Thermal & Current Sensors Live Readout Grid */}
      <div className="mt-1.5 grid grid-cols-2 gap-1.5">
        <div className="rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1.5">
          <div className="flex items-center gap-1 text-[10px] text-slate-400">
            <Flame className={`h-3 w-3 ${m.isThermalThrottling ? 'text-red-400' : 'text-amber-400'}`} />
            <span>Suhu (PreAmp / Coil)</span>
          </div>
          <div className="font-mono-tech mt-0.5 flex items-center gap-1.5 text-xs font-semibold">
            <span
              ref={(el) => {
                readoutsRef.current.tPre = el;
              }}
              className={m.temp_preamp_c > 72 ? 'text-red-400' : 'text-amber-300'}
            >
              {m.temp_preamp_c.toFixed(1)} °C
            </span>
            <span className="text-slate-600">/</span>
            <span
              ref={(el) => {
                readoutsRef.current.tSpk = el;
              }}
              className={m.temp_speaker_c > 95 ? 'text-red-400' : 'text-slate-200'}
            >
              {m.temp_speaker_c.toFixed(1)} °C
            </span>
          </div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1.5">
          <div className="flex items-center gap-1 text-[10px] text-slate-400">
            <Zap className={`h-3 w-3 ${m.isOvercurrent ? 'text-red-400' : 'text-emerald-400'}`} />
            <span>Arus (Daya / Speaker)</span>
          </div>
          <div className="font-mono-tech mt-0.5 flex items-center gap-1.5 text-xs font-semibold">
            <span
              ref={(el) => {
                readoutsRef.current.iPre = el;
              }}
              className="text-emerald-300"
            >
              {Math.round(m.current_preamp_ma)} mA
            </span>
            <span className="text-slate-600">/</span>
            <span
              ref={(el) => {
                readoutsRef.current.iSpk = el;
              }}
              className={m.isOvercurrent ? 'text-red-400' : 'text-sky-300'}
            >
              {Math.round(m.current_speaker_ma)} mA
            </span>
          </div>
        </div>
      </div>

      {/* Explicit Semantic Status Alerts */}
      <div className="mt-2 space-y-1 text-[11px]">
        {!simState.preampPowerOn && (
          <div className="flex items-center gap-2 rounded-md border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-slate-300">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-slate-400" />
            <span>Power OFF (Arus Daya 0 mA)</span>
          </div>
        )}
        {m.isOvercurrent && (
          <div className="flex items-center gap-2 rounded-md border border-red-500/40 bg-red-950/60 px-2.5 py-1 text-red-200">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-400" />
            <span>Arus Berlebih / Overload (&gt;1400 mA) — Periksa Beban</span>
          </div>
        )}
        {m.isThermalThrottling && (
          <div className="flex items-center gap-2 rounded-md border border-red-500/40 bg-red-950/60 px-2.5 py-1 text-red-200">
            <Flame className="h-3.5 w-3.5 shrink-0 text-red-400" />
            <span>Thermal Throttling Aktif — Risiko Kerusakan Komponen</span>
          </div>
        )}
        {m.isClipping && (
          <div className="flex items-center gap-2 rounded-md border border-red-500/40 bg-red-950/60 px-2.5 py-1 text-red-200">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-400" />
            <span>Distorsi Kliping — Turunkan Gain Pre-Amp</span>
          </div>
        )}
        {m.isHumPresent && (
          <div className="flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-950/60 px-2.5 py-1 text-amber-200">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
            <span>Dengung 50 Hz — Kabel Longgar</span>
          </div>
        )}
        {m.isPopNoiseActive && (
          <div className="flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-950/60 px-2.5 py-1 text-amber-200">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
            <span>Pop Noise Plosif — Pasang Windshield</span>
          </div>
        )}
        {simState.preampPowerOn && simState.cablePreampToSpeaker === 'disconnected' && (
          <div className="flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-950/60 px-2.5 py-1 text-amber-200">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
            <span>Arus Speaker 0 mA — Jalur Kabel Terputus</span>
          </div>
        )}
        {m.isLowSnr && !m.isHumPresent && simState.cablePreampToSpeaker !== 'disconnected' && (
          <div className="flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-950/60 px-2.5 py-1 text-amber-200">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-400" />
            <span>SNR Rendah (Arus bias aktif, sinyal kecil / noise tinggi)</span>
          </div>
        )}
        {m.isSignalActive &&
          !m.isClipping &&
          !m.isHumPresent &&
          !m.isLowSnr &&
          !m.isPopNoiseActive &&
          !m.isThermalThrottling &&
          !m.isOvercurrent && (
            <div className="flex items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-950/50 px-2.5 py-1 text-emerald-200">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
              <span>Sinyal Jernih · Termal & Arus Nominal</span>
            </div>
          )}
      </div>
    </aside>
  );
};
