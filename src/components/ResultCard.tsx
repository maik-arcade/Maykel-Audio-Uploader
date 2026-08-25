import React, { useState } from 'react';
import {
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  AlertOctagon,
  X,
  Music2,
  RefreshCw,
  Clock,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Loader2,
} from 'lucide-react';
import { JobProgressEvent } from '../types';
import { checkRobloxModeration } from '../services/api';

interface ResultCardProps {
  jobEvent: JobProgressEvent;
  apiKey?: string;
  onDismiss: () => void;
  onShowToast: (msg: string, type?: 'info' | 'error' | 'success') => void;
  onModerationUpdated?: () => void;
}

export const ResultCard: React.FC<ResultCardProps> = ({
  jobEvent,
  apiKey,
  onDismiss,
  onShowToast,
  onModerationUpdated,
}) => {
  const [copied, setCopied] = useState(false);
  const [isCheckingModeration, setIsCheckingModeration] = useState(false);
  const [moderationStatus, setModerationStatus] = useState<string>(
    jobEvent.moderationState ||
      (jobEvent.status === 'rejected'
        ? 'MODERATION_STATE_REJECTED'
        : jobEvent.status === 'moderating'
        ? 'MODERATION_STATE_REVIEWING'
        : 'MODERATION_STATE_APPROVED')
  );
  const [lastCheckedTime, setLastCheckedTime] = useState<number | null>(null);

  const assetId = jobEvent.assetId || 'Pendiente';
  const details = jobEvent.details;

  const isApproved =
    moderationStatus === 'MODERATION_STATE_APPROVED' ||
    moderationStatus === 'Approved' ||
    (moderationStatus === 'APPROVED' && jobEvent.status !== 'rejected');

  const isReviewing =
    moderationStatus === 'MODERATION_STATE_REVIEWING' ||
    moderationStatus === 'Reviewing' ||
    moderationStatus === 'MODERATION_PENDING' ||
    moderationStatus === 'PENDING' ||
    jobEvent.status === 'moderating';

  const isRejected =
    moderationStatus === 'MODERATION_STATE_REJECTED' ||
    moderationStatus === 'Rejected' ||
    moderationStatus === 'REJECTED' ||
    moderationStatus === 'BLOCKED' ||
    jobEvent.status === 'rejected';

  const handleCopyAssetId = () => {
    if (!assetId || assetId === 'Pendiente') return;
    navigator.clipboard.writeText(assetId);
    setCopied(true);
    onShowToast(`Asset ID copiado: ${assetId}`, 'success');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleRecheckModeration = async () => {
    if (!assetId || assetId === 'Pendiente') {
      onShowToast('Aún no hay un Asset ID para verificar.', 'error');
      return;
    }

    setIsCheckingModeration(true);
    try {
      const res = await checkRobloxModeration({
        assetId,
        operationId: jobEvent.operationId,
        apiKey: apiKey || '',
        historyId: jobEvent.jobId,
      });

      setModerationStatus(res.moderationState);
      setLastCheckedTime(Date.now());

      if (res.isApproved) {
        onShowToast(`✓ ¡Aprobado! El audio pasó la moderación de Roblox.`, 'success');
      } else if (res.isReviewing) {
        onShowToast(`⏳ Roblox aún está revisando la moderación de este audio.`, 'info');
      } else if (res.isRejected) {
        onShowToast(`✗ Audio rechazado por la moderación de Roblox.`, 'error');
      } else {
        onShowToast(`Estado de moderación: ${res.message}`, 'info');
      }

      if (onModerationUpdated) {
        onModerationUpdated();
      }
    } catch (err: any) {
      onShowToast(err.message || 'Error al comprobar la moderación con Roblox', 'error');
    } finally {
      setIsCheckingModeration(false);
    }
  };

  const formattedDate = details?.timestamp
    ? new Date(details.timestamp).toLocaleString()
    : new Date().toLocaleString();

  return (
    <div
      id="upload-result-card"
      className={`rounded-2xl p-6 border shadow-2xl transition-all relative overflow-hidden ${
        isRejected
          ? 'bg-[#1a1215] border-rose-500/40 text-rose-100 shadow-rose-950/40'
          : isReviewing
          ? 'bg-[#18160f] border-amber-500/40 text-amber-100 shadow-amber-950/40'
          : 'bg-[#0f1b2d] border-emerald-500/40 text-emerald-100 shadow-emerald-950/40'
      }`}
    >
      {/* Background glow */}
      <div
        className={`absolute -right-16 -top-16 w-48 h-48 rounded-full blur-3xl opacity-20 pointer-events-none ${
          isRejected ? 'bg-rose-500' : isReviewing ? 'bg-amber-400' : 'bg-emerald-400'
        }`}
      />

      {/* Dismiss button */}
      <button
        onClick={onDismiss}
        type="button"
        id="dismiss-result-btn"
        className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
        title="Cerrar resultado"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Header */}
      <div className="flex items-center gap-3.5 mb-5">
        <div
          className={`p-3 rounded-2xl border flex items-center justify-center ${
            isRejected
              ? 'bg-rose-500/20 text-rose-400 border-rose-500/30 ring-4 ring-rose-500/10'
              : isReviewing
              ? 'bg-amber-500/20 text-amber-400 border-amber-500/30 ring-4 ring-amber-500/10'
              : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 ring-4 ring-emerald-500/10'
          }`}
        >
          {isRejected ? (
            <AlertOctagon className="w-7 h-7" />
          ) : isReviewing ? (
            <Clock className="w-7 h-7 animate-pulse" />
          ) : (
            <CheckCircle2 className="w-7 h-7" />
          )}
        </div>
        <div>
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            {isRejected
              ? 'Audio rechazado por moderación de Roblox'
              : isReviewing
              ? 'Upload Enviado - Moderación en Revisión'
              : '¡Upload Exitoso & Aprobado!'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300">
            {isRejected
              ? 'Roblox revisó el audio y rechazó el contenido por sus filtros de moderación.'
              : isReviewing
              ? 'El audio se subió a Roblox, pero su sistema de moderación aún lo está evaluando.'
              : 'El audio se ha procesado, subido y aprobado correctamente para tu cuenta de Roblox.'}
          </p>
        </div>
      </div>

      {/* DEDICATED ROBLOX MODERATION STATUS SECTION */}
      <div
        id="roblox-moderation-tracker-box"
        className={`rounded-2xl p-4 sm:p-5 mb-5 border transition-all ${
          isApproved
            ? 'bg-emerald-950/40 border-emerald-500/30'
            : isReviewing
            ? 'bg-amber-950/40 border-amber-500/30'
            : 'bg-rose-950/40 border-rose-500/30'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
          <div className="flex items-start sm:items-center gap-3">
            <div
              className={`p-2 rounded-xl border flex-shrink-0 ${
                isApproved
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : isReviewing
                  ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                  : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
              }`}
            >
              {isApproved ? (
                <ShieldCheck className="w-5 h-5" />
              ) : isReviewing ? (
                <ShieldAlert className="w-5 h-5 animate-pulse" />
              ) : (
                <ShieldX className="w-5 h-5" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Estado de Moderación en Roblox
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                    isApproved
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : isReviewing
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 animate-pulse'
                      : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                  }`}
                >
                  {isApproved ? 'Aprobado ✓' : isReviewing ? 'En Revisión ⏳' : 'Rechazado ✗'}
                </span>
              </div>

              <p className="text-xs text-slate-200 mt-1">
                {isApproved &&
                  'El audio pasó la moderación de Roblox con éxito. Ya puedes usarlo libremente en cualquier juego o experiencia.'}
                {isReviewing &&
                  'Roblox está analizando este archivo de audio. Esto puede tardar desde unos segundos hasta un par de minutos.'}
                {isRejected &&
                  'Roblox rechazó este audio según sus políticas comunitarias. No podrá reproducirse en experiencias.'}
              </p>

              {lastCheckedTime && (
                <span className="text-[10px] text-slate-400 block mt-1">
                  Última verificación:{' '}
                  {new Date(lastCheckedTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
              )}
            </div>
          </div>

          {/* Quick Reload / Recheck Button */}
          <button
            type="button"
            id="recheck-moderation-btn"
            onClick={handleRecheckModeration}
            disabled={isCheckingModeration || !assetId || assetId === 'Pendiente'}
            className={`flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border shadow-md flex-shrink-0 ${
              isReviewing
                ? 'bg-amber-500 hover:bg-amber-400 text-black border-amber-400 shadow-amber-500/20 active:scale-95'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border-slate-700 active:scale-95'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title="Volver a consultar el estado de moderación en Roblox"
          >
            {isCheckingModeration ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Consultando Roblox...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{isReviewing ? 'Comprobar si ya pasó la moderación' : 'Re-comprobar'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Asset ID Showcase */}
      {assetId && assetId !== 'Pendiente' && (
        <div className="bg-[#0A0E17]/90 border border-slate-700/80 rounded-2xl p-4 sm:p-5 mb-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Music2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                Roblox Asset ID
              </span>
              <span className="text-xl sm:text-2xl font-mono font-bold text-white tracking-wider selection:bg-blue-600">
                {assetId}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              id="copy-asset-id-btn"
              onClick={handleCopyAssetId}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-lg ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Asset ID</span>
                </>
              )}
            </button>

            <a
              href="https://create.roblox.com/dashboard/creations?activeTab=Audio"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
              title="Abrir Creator Hub en Roblox"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="hidden sm:inline">Creator Hub</span>
            </a>
          </div>
        </div>
      )}

      {/* Details Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
        <div className="bg-[#0A0E17]/60 p-3 rounded-xl border border-slate-800/80">
          <span className="text-slate-500 font-medium block mb-0.5">Nombre del audio</span>
          <span className="text-white font-semibold truncate block" title={details?.displayName || 'MAYKEL Audio'}>
            {details?.displayName || 'MAYKEL Audio'}
          </span>
        </div>

        <div className="bg-[#0A0E17]/60 p-3 rounded-xl border border-slate-800/80">
          <span className="text-slate-500 font-medium block mb-0.5">Moderación</span>
          <span
            className={`font-semibold font-mono inline-block px-1.5 py-0.5 rounded text-[11px] ${
              isApproved
                ? 'bg-emerald-500/20 text-emerald-400'
                : isReviewing
                ? 'bg-amber-500/20 text-amber-400'
                : 'bg-rose-500/20 text-rose-400'
            }`}
          >
            {isApproved ? 'APPROVED' : isReviewing ? 'REVIEWING' : 'REJECTED'}
          </span>
        </div>

        <div className="bg-[#0A0E17]/60 p-3 rounded-xl border border-slate-800/80">
          <span className="text-slate-500 font-medium block mb-0.5">Velocidad</span>
          <span className="text-amber-400 font-bold font-mono">
            {details?.speed ? `${details.speed.toFixed(2)}x` : '2.33x'}
          </span>
        </div>

        <div className="bg-[#0A0E17]/60 p-3 rounded-xl border border-slate-800/80">
          <span className="text-slate-500 font-medium block mb-0.5">Amplificación</span>
          <span className="text-cyan-400 font-bold font-mono">
            {details?.amplification !== undefined
              ? `${details.amplification > 0 ? '+' : ''}${details.amplification} dB`
              : '-4 dB'}
          </span>
        </div>

        <div className="bg-[#0A0E17]/60 p-3 rounded-xl border border-slate-800/80">
          <span className="text-slate-500 font-medium block mb-0.5">Duración Máx.</span>
          <span className="text-purple-400 font-bold font-mono">
            {details?.duration ? `${details.duration}s` : '400s'}
          </span>
        </div>

        <div className="bg-[#0A0E17]/60 p-3 rounded-xl border border-slate-800/80">
          <span className="text-slate-500 font-medium block mb-0.5">Fecha y hora</span>
          <span className="text-slate-300 font-medium truncate block" title={formattedDate}>
            {formattedDate}
          </span>
        </div>
      </div>
    </div>
  );
};
