import React from 'react';
import { Info, X } from 'lucide-react';
import { COMPONENT_ANNOTATIONS } from '../data/annotations';
import { LanguageMode } from '../types/paSystem';

interface AnnotationCardProps {
  annotationId: string | null;
  languageMode: LanguageMode;
  onClose: () => void;
}

const DEVICE_LABELS: Record<string, string> = {
  microphone: 'Modul 1: Mikrofon Pengumuman',
  preamp: 'Modul 2: Pre-Amplifier',
  speaker: 'Modul 3: Ceiling Speaker',
  sensors: 'Sensor Virtual 3D (Telemetri)',
};

export const AnnotationCard: React.FC<AnnotationCardProps> = ({
  annotationId,
  languageMode,
  onClose,
}) => {
  if (!annotationId) return null;
  const item = COMPONENT_ANNOTATIONS[annotationId];
  if (!item) return null;

  return (
    <aside
      aria-label="Inspeksi Komponen Teknis"
      className="pointer-events-auto w-[340px] max-w-[90vw] rounded-xl border border-slate-700/80 bg-[#0F1623]/95 p-4 shadow-xl"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-sky-400">
            <Info className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{DEVICE_LABELS[item.device]}</span>
          </div>
          <h3 className="font-display mt-1 text-base font-semibold leading-snug text-slate-100">
            {item.nameId}
          </h3>
          {languageMode === 'id-en' && (
            <p className="mt-0.5 text-xs font-medium text-slate-400">{item.nameEn}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100 focus-visible:outline focus-visible:outline-sky-400"
          aria-label="Tutup Anotasi"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
        <span>{item.category}</span>
        <span aria-hidden="true">·</span>
        <span>{item.layerType === 'internal' ? 'Struktur Internal' : 'Komponen Eksternal'}</span>
      </div>

      <p className="mt-2.5 text-[13px] leading-relaxed text-slate-300">{item.descId}</p>

      <div className="mt-3 space-y-1 border-t border-slate-800 pt-2.5">
        {item.specs.map((spec) => (
          <div key={spec} className="font-mono-tech text-[11px] text-slate-300">
            • {spec}
          </div>
        ))}
      </div>
    </aside>
  );
};
