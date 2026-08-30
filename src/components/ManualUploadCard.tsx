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
  Share2,
  FolderDown,
  Info,
} from 'lucide-react';
import { triggerBrowserSave } from '../services/api';

interface ManualUploadCardProps {
  fileName: string;
  fileSizeBytes?: number;
  speed: number;
  amplification: number;
  customTitle?: string;
  downloadUrl?: string;
  blobUrl?: string;
  blob?: Blob;
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
  downloadUrl,
  blobUrl,
  blob,
  onDismiss,
  onReDownload,
  onShowToast,
}) => {
  const [copiedTitle, setCopiedTitle] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const suggestedName =
    customTitle && customTitle.trim()
      ? customTitle.trim().substring(0, 30)
      : `audio_${Math.random().toString(36).substring(2, 8)}`;

  const robloxCreatorAudioUrl = 'https://create.roblox.com/dashboard/creations?activeTab=Audio';
  const effectiveUrl = downloadUrl || blobUrl || '#';

  const handleCopyTitle = () => {
    navigator.clipboard.writeText(suggestedName);
    setCopiedTitle(true);
    onShowToast(`Nombre copiado: "${suggestedName}"`, 'success');
    setTimeout(() => setCopiedTitle(false), 2000);
  };

  const handleManualSave = () => {
    if (downloadUrl) {
      triggerBrowserSave(downloadUrl, fileName);
    } else if (blobUrl) {
      triggerBrowserSave(blobUrl, fileName);
    } else {
      onReDownload();
    }
    onShowToast('Iniciando descarga del archivo MP3...', 'info');
  };

  const handleShareOrSaveToFiles = async () => {
    try {
      setIsSharing(true);
      if (blob && navigator.canShare) {
        const file = new File([blob], fileName, { type: 'audio/mpeg' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: fileName,
            text: 'Audio convertido listo para Roblox',
          });
          onShowToast('✓ Guardado en tu dispositivo', 'success');
          return;
        }
      }
      handleManualSave();
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        handleManualSave();
      }
    } finally {
      setIsSharing(false);
    }
  };

  const formatSize = (bytes?: number) => {
    if (!bytes) return '';
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share && !!blob;

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
              Audio Listo para Guardar y Subir
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

      {/* Primary Action Buttons: Guardar en Archivos + Abrir Roblox Creator */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* Button 1: Force Save / Download directly */}
        <div className="bg-[#070B12] border border-emerald-500/40 rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-lg shadow-emerald-500/5">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
              Paso A: Guardar en tu dispositivo
            </span>
            <h4 className="text-sm font-bold text-white mt-1 flex items-center gap-1.5">
              <FolderDown className="w-4 h-4 text-emerald-400" />
              <span>Descargar a tu carpeta de Archivos</span>
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              Haz clic abajo para guardar el archivo <strong className="text-slate-200">{fileName}</strong> directamente en tus Descargas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <a
              id="direct-download-anchor-btn"
              href={effectiveUrl}
              download={fileName}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleManualSave}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/30 active:scale-95 transition-all text-center"
            >
              <Download className="w-4 h-4" />
              <span>Guardar en Archivos / Descargar</span>
            </a>

            {canNativeShare && (
              <button
                type="button"
                id="mobile-share-save-files-btn"
                onClick={handleShareOrSaveToFiles}
                disabled={isSharing}
                className="px-3.5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs transition-all flex items-center gap-1.5"
                title="Abrir menú de compartir / Guardar en Archivos de iOS o Android"
              >
                <Share2 className="w-4 h-4 text-emerald-400" />
                <span className="hidden sm:inline">Compartir</span>
              </button>
            )}
          </div>
        </div>

        {/* Button 2: Open Roblox Creator Hub */}
        <div className="bg-[#070B12] border border-blue-500/40 rounded-2xl p-4 flex flex-col justify-between gap-3 shadow-lg shadow-blue-500/5">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
              Paso B: Subir a Roblox
            </span>
            <h4 className="text-sm font-bold text-white mt-1 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span>Abrir Roblox Creator Hub</span>
            </h4>
            <p className="text-xs text-slate-400 mt-1">
              Abre el panel oficial de Roblox en una nueva pestaña para arrastrar el archivo y obtener tu ID.
            </p>
          </div>

          <div className="pt-1">
            <a
              id="open-roblox-creator-hub-btn"
              href={robloxCreatorAudioUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-600/30 active:scale-95 transition-all group text-center"
            >
              <span>Ir a Roblox Creator Hub</span>
              <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>
          </div>
        </div>
      </div>

      {/* Simple 3-Step Guide */}
      <div className="bg-[#0A0E17]/80 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-emerald-400" />
            <span>Instrucciones de Subida Manual a Roblox (100% Gratis y Sin Errores):</span>
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          <div className="p-3 rounded-lg bg-[#070B12] border border-slate-800/80 space-y-1">
            <div className="flex items-center gap-2 font-bold text-emerald-400">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[11px]">1</span>
              <span>Guarda el archivo</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Presiona <strong className="text-slate-200">"Guardar en Archivos / Descargar"</strong> para que se guarde en tu teléfono o PC.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-[#070B12] border border-slate-800/80 space-y-1">
            <div className="flex items-center gap-2 font-bold text-blue-400">
              <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-[11px]">2</span>
              <span>Upload Asset</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              En Roblox Creator Hub, pulsa el botón azul <strong className="text-slate-200">"Upload Asset"</strong> y selecciona tu MP3.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-[#070B12] border border-slate-800/80 space-y-1">
            <div className="flex items-center gap-2 font-bold text-cyan-400">
              <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center text-[11px]">3</span>
              <span>Guardar & Copiar ID</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Haz clic en <strong className="text-slate-200">"Upload"</strong>. En segundos tendrás tu <strong className="text-slate-200">Asset ID</strong> para tu juego.
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
