import React, { useState } from 'react';
import {
  Download,
  ExternalLink,
  CheckCircle2,
  Copy,
  Check,
  Music,
  Sparkles,
  ArrowRight,
  X,
  UploadCloud,
  Layers,
  HelpCircle,
} from 'lucide-react';

interface ManualUploadCardProps {
  fileName: string;
  fileSizeBytes?: number;
  speed: number;
  amplification: number;
  customTitle?: string;
  onDismiss: () => void;
  onReDownload: () => void;
  onShowToast: (msg: string, type?: 'info' | 'error' | 'success') => void;
}

export const ManualUploadCard: React.FC<ManualUploadCardProps> = ({
  fileName,
  fileSizeBytes,
  speed,
  amplification,
  customTitle,
  onDismiss,
  onReDownload,
  onShowToast,
}) => {
  const [copiedTitle, setCopiedTitle] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const suggestedName = (customTitle && customTitle.trim())
    ? customTitle.trim().substring(0, 30)
    : `audio_${Math.random().toString(36).substring(2, 8)}`;

  const robloxCreatorAudioUrl = 'https://create.roblox.com/dashboard/creations?activeTab=Audio';

  const handleCopyTitle = () => {
    navigator.clipboard.writeText(suggestedName);
    setCopiedTitle(true);
    onShowToast(`Nombre copiado: "${suggestedName}"`, 'success');
    setTimeout(() => setCopiedTitle(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(robloxCreatorAudioUrl);
    setCopiedLink(true);
    onShowToast('Enlace de Roblox Creator copiado', 'info');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div
      id="manual-upload-success-card"
      className="bg-gradient-to-br from-[#0c1829] via-[#0A0E17] to-[#0d1f38] border-2 border-emerald-500/50 rounded-2xl p-5 sm:p-6 shadow-2xl relative overflow-hidden space-y-5 animate-fadeIn"
    >
      {/* Glow Effects */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Dismiss Button */}
      <button
        type="button"
        id="dismiss-manual-upload-card-btn"
        onClick={onDismiss}
        className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        title="Cerrar panel"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Header */}
      <div className="flex items-start sm:items-center gap-3.5 pb-4 border-b border-slate-800/80">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/10 ring-4 ring-emerald-500/5">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <div className="min-w-0 pr-8">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
              Audio Descargado con Éxito
            </span>
            <span className="text-[11px] font-mono text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/20">
              ⚡ {speed.toFixed(2)}x • {amplification > 0 ? `+${amplification}` : amplification}dB
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-extrabold text-white mt-1 truncate">
            {fileName}
          </h3>
          <p className="text-xs text-slate-400">
            {formatSize(fileSizeBytes) ? `${formatSize(fileSizeBytes)} • ` : ''}Optimizado en MP3 44.1kHz para Roblox
          </p>
        </div>
      </div>

      {/* CTA: Open Roblox Creator Button */}
      <div className="bg-[#070B12] border border-blue-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg shadow-blue-500/5">
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span>Sube tu archivo a Roblox en 10 segundos</span>
          </h4>
          <p className="text-xs text-slate-400 leading-relaxed max-w-xl">
            Haz clic en el botón azul para abrir directamente la sección de creación de audios de Roblox en tu navegador.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-shrink-0">
          <a
            id="open-roblox-creator-hub-btn"
            href={robloxCreatorAudioUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-600/30 active:scale-95 transition-all group"
          >
            <span>Abrir Roblox Creator Hub</span>
            <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </a>

          <button
            type="button"
            id="redownload-audio-file-btn"
            onClick={onReDownload}
            className="p-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all flex items-center justify-center"
            title="Volver a descargar el archivo MP3"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Simple 4-Step Instructions */}
      <div className="bg-[#0A0E17]/80 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>Pasos para subir el archivo en Roblox (100% Gratis):</span>
          </h4>
          <span className="text-[11px] text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
            ✓ Sin errores de API
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          <div className="p-3 rounded-lg bg-[#070B12] border border-slate-800/80 space-y-1">
            <div className="flex items-center gap-2 font-bold text-blue-400">
              <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[11px]">1</span>
              <span>Clic en "Upload Asset"</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              En Roblox Creator Hub, haz clic en el botón azul <strong className="text-slate-200">"Upload Asset"</strong> (arriba a la derecha).
            </p>
          </div>

          <div className="p-3 rounded-lg bg-[#070B12] border border-slate-800/80 space-y-1">
            <div className="flex items-center gap-2 font-bold text-cyan-400">
              <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[11px]">2</span>
              <span>Selecciona el MP3</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Arrastra el archivo <strong className="text-slate-200">{fileName}</strong> que acabas de descargar.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-[#070B12] border border-slate-800/80 space-y-1">
            <div className="flex items-center gap-2 font-bold text-emerald-400">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[11px]">3</span>
              <span>Guardar & Copiar ID</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Haz clic en <strong className="text-slate-200">"Upload"</strong>. Al completarse, copia el <strong className="text-slate-200">Asset ID</strong> para usarlo en tu juego.
            </p>
          </div>
        </div>

        {/* Quick Name Copy Helper */}
        <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-t border-slate-800/60 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <span className="text-[11px]">💡 Nombre recomendado para Roblox:</span>
            <code className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-cyan-300 font-mono font-bold">
              {suggestedName}
            </code>
          </div>
          <button
            type="button"
            onClick={handleCopyTitle}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-medium text-xs transition-colors"
          >
            {copiedTitle ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedTitle ? '¡Copiado!' : 'Copiar Nombre'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
