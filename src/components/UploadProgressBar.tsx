import React from 'react';
import { Loader2, CheckCircle, XCircle, AlertTriangle, Radio, Download, Cpu, Send, ShieldAlert } from 'lucide-react';
import { JobStatus } from '../types';

interface UploadProgressBarProps {
  status: JobStatus;
  progress: number;
  message: string;
  error?: string;
  onCancel?: () => void;
}

export const UploadProgressBar: React.FC<UploadProgressBarProps> = ({
  status,
  progress,
  message,
  error,
  onCancel,
}) => {
  if (status === 'idle') return null;

  const isCompleted = status === 'completed';
  const isRejected = status === 'rejected';
  const isFailed = status === 'failed';
  const isProcessing = !isCompleted && !isRejected && !isFailed;

  const getStepIcon = () => {
    switch (status) {
      case 'downloading':
        return <Download className="w-5 h-5 animate-bounce text-cyan-400" />;
      case 'converting':
        return <Cpu className="w-5 h-5 animate-spin text-blue-400" />;
      case 'uploading':
        return <Send className="w-5 h-5 animate-pulse text-indigo-400" />;
      case 'moderating':
        return <Radio className="w-5 h-5 animate-ping text-purple-400" />;
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-emerald-400" />;
      case 'rejected':
        return <AlertTriangle className="w-5 h-5 text-amber-400" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-rose-400" />;
      default:
        return <Loader2 className="w-5 h-5 animate-spin text-blue-400" />;
    }
  };

  const getBarColor = () => {
    if (isCompleted) return 'bg-gradient-to-r from-emerald-500 to-teal-400';
    if (isRejected) return 'bg-gradient-to-r from-amber-500 to-orange-500';
    if (isFailed) return 'bg-gradient-to-r from-rose-600 to-red-500';
    return 'bg-gradient-to-r from-blue-600 via-cyan-500 to-blue-400';
  };

  return (
    <div className="bg-[#121A2A] border border-blue-500/30 rounded-2xl p-5 sm:p-6 shadow-2xl shadow-blue-500/10 transition-all">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[#0A0E17] border border-slate-800 flex items-center justify-center">
            {getStepIcon()}
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white tracking-wide">
              {isCompleted
                ? '¡Proceso Completado!'
                : isRejected
                ? 'Moderación Rechazada'
                : isFailed
                ? 'Error en el Proceso'
                : 'Procesando y Subiendo a Roblox...'}
            </h3>
            <p
              className={`text-xs ${
                isFailed ? 'text-rose-400' : isRejected ? 'text-amber-400' : 'text-slate-300'
              }`}
            >
              {message}
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-lg font-black font-mono text-white">{Math.round(progress)}%</span>
        </div>
      </div>

      {/* Progress Track */}
      <div className="relative w-full h-3 bg-[#0A0E17] rounded-full overflow-hidden border border-slate-800/80 p-0.5">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${getBarColor()}`}
          style={{ width: `${Math.max(5, Math.min(100, progress))}%` }}
        >
          {isProcessing && (
            <div className="w-full h-full bg-white/20 animate-pulse rounded-full" />
          )}
        </div>
      </div>

      {/* Step Indicators */}
      <div className="grid grid-cols-5 gap-1 text-[11px] font-medium text-slate-400 mt-4 text-center">
        <div
          className={`py-1 rounded-lg border transition-all ${
            progress >= 20
              ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
              : 'bg-[#0A0E17]/40 text-slate-600 border-transparent'
          }`}
        >
          1. Fuente
        </div>
        <div
          className={`py-1 rounded-lg border transition-all ${
            progress >= 50
              ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
              : 'bg-[#0A0E17]/40 text-slate-600 border-transparent'
          }`}
        >
          2. FFmpeg
        </div>
        <div
          className={`py-1 rounded-lg border transition-all ${
            progress >= 75
              ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
              : 'bg-[#0A0E17]/40 text-slate-600 border-transparent'
          }`}
        >
          3. Roblox API
        </div>
        <div
          className={`py-1 rounded-lg border transition-all ${
            progress >= 85
              ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
              : 'bg-[#0A0E17]/40 text-slate-600 border-transparent'
          }`}
        >
          4. Moderación
        </div>
        <div
          className={`py-1 rounded-lg border transition-all ${
            progress >= 100
              ? isCompleted
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-bold'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/30 font-bold'
              : 'bg-[#0A0E17]/40 text-slate-600 border-transparent'
          }`}
        >
          5. Final
        </div>
      </div>

      {/* Detailed Error message if present */}
      {error && isFailed && (
        <div className="mt-3 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-start gap-2.5">
          <ShieldAlert className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
          <div className="overflow-x-auto">
            <span className="font-semibold block mb-0.5">Detalles del Error:</span>
            <code className="text-[11px] font-mono break-all text-rose-200">{error}</code>
          </div>
        </div>
      )}
    </div>
  );
};
