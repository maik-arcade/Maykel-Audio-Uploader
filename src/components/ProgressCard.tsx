import React, { useState } from 'react';
import {
  Upload,
  Download,
  Loader2,
  AlertTriangle,
  RotateCcw,
  ArrowRight,
  XCircle,
  FileAudio,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import { JobProgressEvent, JobStatus } from '../types';
import { cleanErrorMessage } from '../services/api';

interface ProgressCardProps {
  isUploading: boolean;
  isDownloading: boolean;
  currentJobEvent: JobProgressEvent | null;
  errorMessage: string | null;
  onStartUpload: () => void;
  onStartDownload: () => void;
  onRetry: () => void;
  onDismissError?: () => void;
  canUpload: boolean;
}

const STATUS_LABELS: Record<JobStatus, string> = {
  idle: 'Listo para iniciar',
  preparing: 'Preparando...',
  downloading: 'Descargando audio...',
  converting: 'Convirtiendo audio...',
  uploading: 'Enviando a Roblox...',
  moderating: 'Esperando moderación de Roblox...',
  completed: 'Completado',
  rejected: 'Audio rechazado por moderación de Roblox',
  failed: 'Error en el proceso',
};

export const ProgressCard: React.FC<ProgressCardProps> = ({
  isUploading,
  isDownloading,
  currentJobEvent,
  errorMessage,
  onStartUpload,
  onStartDownload,
  onRetry,
  onDismissError,
  canUpload,
}) => {
  const [activeTab, setActiveTab] = useState<'download' | 'auto'>('download');

  const currentStatus = currentJobEvent?.status || 'idle';
  const progressPercent = currentJobEvent?.progress || 0;
  const statusMessage = currentJobEvent?.message || (errorMessage ? errorMessage : STATUS_LABELS[currentStatus]);

  const isFailed = currentStatus === 'failed' || !!errorMessage;
  const isBusy = isUploading || isDownloading;

  return (
    <div className="bg-[#121A2A] border border-slate-800/90 rounded-2xl p-5 sm:p-6 shadow-xl shadow-black/30 transition-all space-y-4">
      {/* Mode Switcher Tabs */}
      {!isBusy && !isFailed && (
        <div className="flex items-center p-1 bg-[#0A0E17] rounded-xl border border-slate-800/80">
          <button
            type="button"
            id="tab-manual-download-mode"
            onClick={() => setActiveTab('download')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'download'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Download className="w-4 h-4 text-emerald-200" />
            <span>1. Descargar MP3 (Subida Manual)</span>
            <span className="hidden sm:inline-block text-[10px] bg-white/20 px-1.5 py-0.2 rounded font-mono">
              100% Seguro
            </span>
          </button>

          <button
            type="button"
            id="tab-auto-upload-mode"
            onClick={() => setActiveTab('auto')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs sm:text-sm font-bold transition-all ${
              activeTab === 'auto'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/20'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-4 h-4 text-blue-200" />
            <span>2. Subida Automática (API)</span>
          </button>
        </div>
      )}

      {/* Primary Action State */}
      {!isBusy && !isFailed && (
        <div>
          {activeTab === 'download' ? (
            <div className="space-y-3">
              <button
                type="button"
                id="main-download-mp3-btn"
                onClick={onStartDownload}
                className="w-full relative group overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600 hover:from-emerald-500 hover:via-teal-400 hover:to-emerald-500 text-white font-bold py-4 px-6 text-base sm:text-lg shadow-xl shadow-emerald-600/25 active:scale-[0.99] transition-all flex items-center justify-center gap-3 cursor-pointer"
              >
                <div className="absolute inset-0 w-1/2 h-full bg-white/10 skew-x-12 -translate-x-full group-hover:translate-x-[300%] transition-transform duration-1000 ease-out" />
                <Download className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
                <span>Descargar MP3 Listo para Roblox</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>

              <div className="bg-[#0A0E17]/60 border border-emerald-500/20 rounded-xl p-3 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5 text-emerald-300 font-medium">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>No requiere API Key • Bypassea límites</span>
                </span>
                <span className="font-mono text-slate-500">MP3 44.1kHz • 192kbps</span>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <button
                type="button"
                id="main-convert-upload-btn"
                onClick={onStartUpload}
                className="w-full relative group overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 hover:from-blue-500 hover:via-blue-400 hover:to-indigo-500 text-white font-bold py-4 px-6 text-base sm:text-lg shadow-xl shadow-blue-600/30 active:scale-[0.99] transition-all flex items-center justify-center gap-3 cursor-pointer"
              >
                <div className="absolute inset-0 w-1/2 h-full bg-white/10 skew-x-12 -translate-x-full group-hover:translate-x-[300%] transition-transform duration-1000 ease-out" />
                <Upload className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
                <span>Convert & Upload to Roblox</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>

              <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                <span>Roblox Open Cloud Assets API v1</span>
                <span>Requiere API Key</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Downloading in Progress State */}
      {isDownloading && (
        <div className="space-y-4 p-4 rounded-xl bg-[#0A0E17] border border-emerald-500/30 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white">
                  Procesando y Descargando Audio...
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  Aplicando velocidad 2.33x y optimización MP3 para Roblox
                </p>
              </div>
            </div>
          </div>
          <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5">
            <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full animate-pulse w-full" />
          </div>
        </div>
      )}

      {/* Uploading In Progress View */}
      {isUploading && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-white">
                  {STATUS_LABELS[currentStatus] || 'Procesando...'}
                </h3>
                <p className="text-xs text-slate-400 font-mono">
                  {statusMessage}
                </p>
              </div>
            </div>
            <span className="text-base font-mono font-bold text-blue-400 bg-blue-500/10 px-3 py-1 rounded-xl border border-blue-500/20">
              {progressPercent}%
            </span>
          </div>

          {/* Animated Progress Bar */}
          <div className="w-full h-3 bg-[#0A0E17] rounded-full overflow-hidden p-0.5 border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-500 rounded-full transition-all duration-500 ease-out relative overflow-hidden"
              style={{ width: `${Math.max(5, progressPercent)}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse" />
            </div>
          </div>

          {/* Granular Pipeline Indicators */}
          <div className="grid grid-cols-5 gap-1.5 pt-2 text-center text-[10px] font-medium">
            <div className={`p-1.5 rounded-lg border ${
              ['preparing', 'downloading', 'converting', 'uploading', 'moderating', 'completed'].includes(currentStatus)
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                : 'bg-slate-900/50 border-slate-800 text-slate-600'
            }`}>
              1. Preparar
            </div>
            <div className={`p-1.5 rounded-lg border ${
              ['downloading', 'converting', 'uploading', 'moderating', 'completed'].includes(currentStatus)
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                : 'bg-slate-900/50 border-slate-800 text-slate-600'
            }`}>
              2. Audio
            </div>
            <div className={`p-1.5 rounded-lg border ${
              ['converting', 'uploading', 'moderating', 'completed'].includes(currentStatus)
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                : 'bg-slate-900/50 border-slate-800 text-slate-600'
            }`}>
              3. FFmpeg
            </div>
            <div className={`p-1.5 rounded-lg border ${
              ['uploading', 'moderating', 'completed'].includes(currentStatus)
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                : 'bg-slate-900/50 border-slate-800 text-slate-600'
            }`}>
              4. Open Cloud
            </div>
            <div className={`p-1.5 rounded-lg border ${
              ['moderating', 'completed'].includes(currentStatus)
                ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                : 'bg-slate-900/50 border-slate-800 text-slate-600'
            }`}>
              5. Moderación
            </div>
          </div>
        </div>
      )}

      {/* Error state with fallback download option */}
      {isFailed && (
        <div id="upload-error-box" className="bg-rose-500/10 border border-rose-500/40 rounded-xl p-4 sm:p-5 space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-rose-200">Error durante la subida automática</h4>
              <div className="text-xs text-rose-200/90 mt-1.5 whitespace-pre-line leading-relaxed">
                {cleanErrorMessage(errorMessage || currentJobEvent?.error || 'Roblox no pudo procesar la subida automática.')}
              </div>
            </div>
          </div>

          {/* Quick Manual Upload Rescue Action */}
          <div className="bg-[#070B12] border border-emerald-500/30 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>¿No pudiste subirlo con API Key?</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Descarga el MP3 ya optimizado y súbelo tú mismo a Roblox en 10 segundos sin errores.
              </p>
            </div>
            <button
              type="button"
              id="fallback-download-mp3-btn"
              onClick={onStartDownload}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-lg transition-all shadow-md flex-shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar MP3</span>
            </button>
          </div>

          <div className="pt-2 border-t border-rose-500/20 flex flex-wrap items-center justify-between gap-2">
            {onDismissError && (
              <button
                type="button"
                id="dismiss-error-btn"
                onClick={onDismissError}
                className="flex items-center gap-1 px-3 py-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Volver</span>
              </button>
            )}

            <button
              type="button"
              id="retry-upload-btn"
              onClick={onRetry}
              className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg transition-colors shadow-md ml-auto"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reintentar Subida</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

