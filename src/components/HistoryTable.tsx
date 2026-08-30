import React, { useState } from 'react';
import {
  History,
  Copy,
  Check,
  ExternalLink,
  Trash2,
  Search,
  AlertCircle,
  RefreshCw,
  Clock,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Loader2,
  Sparkles,
  Link as LinkIcon,
  Volume2,
  Gauge,
  Info,
  Sliders,
  CheckCircle2,
  FileAudio,
  Radio,
  Music,
} from 'lucide-react';
import { UploadHistoryItem } from '../types';
import { checkRobloxModeration } from '../services/api';

// Branded Platform Logos
const YouTubeIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path
      fill="#FF0000"
      d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"
    />
    <path fill="#FFFFFF" d="m9.545 15.568 6.273-3.568-6.273-3.568v7.136z" />
  </svg>
);

const SoundCloudIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path
      fill="#FF5500"
      d="M11.56 8.87V17h8.92c1.94 0 3.52-1.58 3.52-3.52 0-1.89-1.5-3.43-3.37-3.51-.31-2.78-2.67-4.97-5.55-4.97-1.39 0-2.67.51-3.66 1.36-.29-.27-.64-.5-.86-.49zm-1.56 1.83c-.09 0-.17.07-.17.16V17h1.03v-6.14c0-.09-.08-.16-.17-.16h-.69zm-1.72 1.48c-.09 0-.17.07-.17.16V17h1.03v-4.66c0-.09-.08-.16-.17-.16h-.69zm-1.72.63c-.09 0-.17.07-.17.16V17h1.03v-4.03c0-.09-.08-.16-.17-.16h-.69zm-1.72-.25c-.09 0-.17.07-.17.16V17h1.03v-4.28c0-.09-.08-.16-.17-.16h-.69zm-1.72.76c-.09 0-.17.07-.17.16V17h1.03v-3.52c0-.09-.08-.16-.17-.16h-.69zm-1.72 1.01c-.09 0-.17.07-.17.16V17h1.03v-2.51c0-.09-.08-.16-.17-.16h-.69zm-1.4.38v2.13h.69v-2.13c0-.09-.08-.16-.17-.16h-.35c-.09 0-.17.07-.17.16z"
    />
  </svg>
);

const getEffectiveSourceType = (
  item: UploadHistoryItem
): 'soundcloud' | 'youtube' | 'file' | 'direct' => {
  if (item.sourceType === 'soundcloud') return 'soundcloud';
  if (item.sourceType === 'youtube') return 'youtube';
  if (item.sourceType === 'direct') return 'direct';
  if (item.sourceType === 'file') return 'file';

  const url = (item.sourceUrl || '').toLowerCase();
  if (url.includes('soundcloud.com')) return 'soundcloud';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.startsWith('http://') || url.startsWith('https://')) return 'direct';
  return 'file';
};

interface HistoryTableProps {
  history: UploadHistoryItem[];
  apiKey?: string;
  onClearHistory: () => void;
  onShowToast: (msg: string, type?: 'info' | 'error' | 'success') => void;
  onReloadHistory?: () => void;
  isLoading?: boolean;
}

export const HistoryTable: React.FC<HistoryTableProps> = ({
  history,
  apiKey,
  onClearHistory,
  onShowToast,
  onReloadHistory,
  isLoading = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [checkingItemId, setCheckingItemId] = useState<string | null>(null);

  // Quick checker state
  const [manualAssetId, setManualAssetId] = useState('');
  const [isCheckingManual, setIsCheckingManual] = useState(false);
  const [manualResult, setManualResult] = useState<{
    status: 'Approved' | 'Reviewing' | 'Rejected' | 'Unknown';
    message: string;
    assetId: string;
  } | null>(null);

  const handleCopy = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    onShowToast(`${label} copiado: ${text}`, 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRecheckItem = async (item: UploadHistoryItem) => {
    if (!item.assetId) {
      onShowToast('Este elemento no tiene Asset ID asignado.', 'error');
      return;
    }

    setCheckingItemId(item.id);
    try {
      const res = await checkRobloxModeration({
        assetId: item.assetId,
        operationId: item.operationId,
        apiKey: apiKey || '',
        historyId: item.id,
      });

      if (res.isApproved) {
        onShowToast(`✓ ¡Aprobado! Asset ${item.assetId} verificado con éxito en Roblox.`, 'success');
      } else if (res.isReviewing) {
        onShowToast(`⏳ Asset ${item.assetId} aún está en revisión por moderación de Roblox.`, 'info');
      } else if (res.isRejected) {
        onShowToast(`✗ Asset ${item.assetId} rechazado por moderación de Roblox.`, 'error');
      } else {
        onShowToast(`Estado actualizado: ${res.message}`, 'info');
      }

      if (onReloadHistory) {
        onReloadHistory();
      }
    } catch (err: any) {
      onShowToast(err.message || 'Error al comprobar moderación en Roblox', 'error');
    } finally {
      setCheckingItemId(null);
    }
  };

  const handleManualCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = manualAssetId.trim().replace(/[^\d]/g, '');
    if (!cleanId) {
      onShowToast('Introduce un Asset ID numérico válido.', 'error');
      return;
    }

    setIsCheckingManual(true);
    setManualResult(null);
    try {
      const res = await checkRobloxModeration({
        assetId: cleanId,
        apiKey: apiKey || '',
      });

      setManualResult({
        status: res.status,
        message: res.message,
        assetId: cleanId,
      });

      if (res.isApproved) {
        onShowToast(`✓ Asset ID ${cleanId} Aprobado por Roblox`, 'success');
      } else if (res.isReviewing) {
        onShowToast(`⏳ Asset ID ${cleanId} en revisión por Roblox`, 'info');
      } else if (res.isRejected) {
        onShowToast(`✗ Asset ID ${cleanId} rechazado por Roblox`, 'error');
      }
    } catch (err: any) {
      onShowToast(err.message || 'Error al verificar Asset ID', 'error');
    } finally {
      setIsCheckingManual(false);
    }
  };

  const filteredHistory = history.filter((item) => {
    const term = searchTerm.toLowerCase();
    return (
      item.displayName.toLowerCase().includes(term) ||
      (item.assetId && item.assetId.includes(term)) ||
      (item.sourceUrl && item.sourceUrl.toLowerCase().includes(term)) ||
      item.creatorId.includes(term) ||
      item.status.toLowerCase().includes(term) ||
      (item.moderationState && item.moderationState.toLowerCase().includes(term))
    );
  });

  return (
    <div className="bg-[#121A2A] border border-slate-800/90 rounded-2xl p-5 sm:p-6 shadow-xl shadow-black/30 transition-all space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <History className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                Historial & Estado de Moderación
              </h2>
              <span className="text-xs font-mono font-semibold bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700">
                {history.length} / 50
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Audios procesados con enlace, velocidad, Asset ID y estado en Roblox
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              id="history-search-input"
              placeholder="Buscar por audio, ID, link..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-[#0A0E17] border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 w-44 sm:w-52 transition-all"
            />
          </div>

          {/* Clear history button */}
          {history.length > 0 && (
            <button
              type="button"
              id="clear-history-btn"
              onClick={onClearHistory}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 rounded-xl text-xs font-medium transition-colors"
              title="Borrar todo el historial"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Limpiar</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Asset ID Moderation Checker Bar */}
      <div className="bg-[#0A0E17]/80 border border-slate-800/80 rounded-xl p-3 sm:p-4">
        <form onSubmit={handleManualCheck} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="flex items-center gap-2 text-slate-400 flex-shrink-0">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-semibold text-slate-300">
              Verificador de moderación:
            </span>
          </div>

          <div className="flex-1 flex items-center gap-2">
            <input
              type="text"
              id="manual-asset-id-input"
              placeholder="Pega cualquier Asset ID de Roblox (ej. 116772390878423)"
              value={manualAssetId}
              onChange={(e) => setManualAssetId(e.target.value)}
              className="flex-1 bg-[#121A2A] border border-slate-700/80 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />

            <button
              type="submit"
              id="manual-check-btn"
              disabled={isCheckingManual || !manualAssetId.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
            >
              {isCheckingManual ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Consultando...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Comprobar</span>
                </>
              )}
            </button>
          </div>
        </form>

        {manualResult && (
          <div
            className={`mt-2.5 p-2.5 rounded-lg border text-xs flex items-center justify-between gap-3 ${
              manualResult.status === 'Approved'
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
                : manualResult.status === 'Reviewing'
                ? 'bg-amber-950/40 border-amber-500/30 text-amber-200'
                : 'bg-rose-950/40 border-rose-500/30 text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {manualResult.status === 'Approved' ? (
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              ) : manualResult.status === 'Reviewing' ? (
                <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
              ) : (
                <ShieldX className="w-4 h-4 text-rose-400" />
              )}
              <span>
                <strong>Asset {manualResult.assetId}:</strong> {manualResult.message}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setManualResult(null)}
              className="text-slate-400 hover:text-white text-[11px] underline"
            >
              Cerrar
            </button>
          </div>
        )}
      </div>

      {/* Content - Compact Vertical Cards Grid */}
      {isLoading ? (
        <div className="py-12 text-center text-slate-500 text-xs">
          Cargando historial...
        </div>
      ) : filteredHistory.length === 0 ? (
        <div className="bg-[#0A0E17]/40 border border-slate-800/60 rounded-xl p-8 text-center">
          <History className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
          <p className="text-sm font-medium text-slate-400">
            {searchTerm ? 'No se encontraron resultados para la búsqueda.' : 'Aún no hay uploads en el historial.'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Los audios que conviertas y subas a Roblox aparecerán aquí con su formato compacto y estado en tiempo real.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredHistory.map((item) => {
            const dateStr = new Date(item.timestamp).toLocaleString(undefined, {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            const effectiveSource = getEffectiveSourceType(item);

            const isItemApproved =
              item.moderationState === 'MODERATION_STATE_APPROVED' ||
              item.moderationState === 'Approved' ||
              (item.status === 'Completed' &&
                !item.moderationState?.includes('REJECT') &&
                !item.moderationState?.includes('REVIEW'));

            const isItemReviewing =
              item.moderationState === 'MODERATION_STATE_REVIEWING' ||
              item.moderationState === 'Reviewing' ||
              item.status === 'Reviewing';

            const isItemRejected =
              item.moderationState === 'MODERATION_STATE_REJECTED' ||
              item.moderationState === 'Rejected' ||
              item.status === 'Rejected';

            const isThisChecking = checkingItemId === item.id;
            const rbxAssetString = item.assetId ? `rbxassetid://${item.assetId}` : '';

            // Calculate in-game normal speed playback rate (1 / speed)
            const normalSpeedInGame = item.speed > 0 ? (1 / item.speed).toFixed(2) : '1.00';

            return (
              <div
                key={item.id}
                id={`history-card-${item.id}`}
                className="bg-[#0c1424] hover:bg-[#0e172a] border border-slate-800 hover:border-slate-700/90 rounded-2xl p-4 sm:p-4.5 shadow-lg transition-all flex flex-col justify-between space-y-3.5"
              >
                {/* 1. Top Source Banner / Artwork Photo depending on origin */}
                <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-[#070C16]">
                  {/* Visual Artwork Box */}
                  <div className="h-24 sm:h-28 w-full relative flex items-center justify-between px-4 overflow-hidden">
                    {/* Background depending on platform */}
                    {effectiveSource === 'soundcloud' ? (
                      <div className="absolute inset-0 bg-gradient-to-r from-[#FF5500] via-[#E03A00] to-[#771A00] opacity-90" />
                    ) : effectiveSource === 'youtube' ? (
                      <div className="absolute inset-0 bg-gradient-to-r from-[#D91B1B] via-[#A80D0D] to-[#4A0000] opacity-90" />
                    ) : effectiveSource === 'direct' ? (
                      <div className="absolute inset-0 bg-gradient-to-r from-[#0284C7] via-[#0369A1] to-[#082F49] opacity-90" />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-r from-[#3B82F6] via-[#1E40AF] to-[#0F172A] opacity-90" />
                    )}

                    {/* If thumbnail image is present, display image with darkening gradient */}
                    {item.thumbnail && (
                      <>
                        <img
                          src={item.thumbnail}
                          alt={item.displayName}
                          referrerPolicy="no-referrer"
                          className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-60"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
                      </>
                    )}

                    {/* Ambient subtle grid pattern */}
                    <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:12px_12px] opacity-10 pointer-events-none" />

                    {/* Platform Branding & Icon in top banner */}
                    <div className="relative z-10 flex items-center gap-3">
                      {/* Platform Logo Circle */}
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-lg border ${
                          effectiveSource === 'soundcloud'
                            ? 'bg-white text-[#FF5500] border-orange-300/40 shadow-orange-950/50'
                            : effectiveSource === 'youtube'
                            ? 'bg-white text-red-600 border-red-300/40 shadow-red-950/50'
                            : effectiveSource === 'direct'
                            ? 'bg-slate-900/90 text-cyan-400 border-cyan-500/30 shadow-cyan-950/50'
                            : 'bg-slate-900/90 text-blue-400 border-blue-500/30 shadow-blue-950/50'
                        }`}
                      >
                        {effectiveSource === 'soundcloud' ? (
                          <SoundCloudIcon className="w-7 h-7" />
                        ) : effectiveSource === 'youtube' ? (
                          <YouTubeIcon className="w-7 h-7" />
                        ) : effectiveSource === 'direct' ? (
                          <Radio className="w-6 h-6 text-cyan-400" />
                        ) : (
                          <FileAudio className="w-6 h-6 text-blue-400" />
                        )}
                      </div>

                      {/* Platform Name and Badge */}
                      <div className="text-white space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black uppercase tracking-wider text-white drop-shadow-md">
                            {effectiveSource === 'soundcloud'
                              ? 'SOUNDCLOUD'
                              : effectiveSource === 'youtube'
                              ? 'YOUTUBE'
                              : effectiveSource === 'direct'
                              ? 'ENLACE WEB'
                              : 'ARCHIVO LOCAL'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-200/90 font-medium truncate max-w-[180px] sm:max-w-[240px] drop-shadow-sm">
                          {item.displayName}
                        </p>
                      </div>
                    </div>

                    {/* Right side floating status pill inside banner */}
                    <div className="relative z-10 flex flex-col items-end gap-1">
                      {isItemApproved ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/90 text-white text-[11px] font-extrabold shadow-md backdrop-blur-sm">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Aprobado
                        </span>
                      ) : isItemReviewing ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/90 text-slate-950 text-[11px] font-extrabold shadow-md backdrop-blur-sm animate-pulse">
                          <Clock className="w-3.5 h-3.5" />
                          En Revisión
                        </span>
                      ) : isItemRejected ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-600/90 text-white text-[11px] font-extrabold shadow-md backdrop-blur-sm">
                          <ShieldX className="w-3.5 h-3.5" />
                          Rechazado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/90 text-slate-200 text-[11px] font-bold shadow-md backdrop-blur-sm border border-slate-700">
                          {item.status}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 2. Status Badges & Date Row */}
                <div className="flex items-center justify-between gap-2 flex-wrap pt-0.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Status Badge */}
                    {item.status === 'Completed' ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-md">
                        Completed
                      </span>
                    ) : item.status === 'Rejected' ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 bg-rose-500/15 border border-rose-500/30 px-2 py-0.5 rounded-md">
                        Rejected
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 bg-slate-800 border border-slate-700 px-2 py-0.5 rounded-md">
                        {item.status}
                      </span>
                    )}

                    {/* Uploaded Tag */}
                    <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-md">
                      Uploaded
                    </span>

                    {/* EXPIRED Tag */}
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400/90 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">
                      EXPIRED
                    </span>

                    {/* Source Specific Tag */}
                    {effectiveSource === 'soundcloud' ? (
                      <span className="text-[10px] font-bold text-orange-400 bg-[#FF5500]/15 border border-[#FF5500]/30 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <SoundCloudIcon className="w-3 h-3" />
                        <span>SoundCloud</span>
                      </span>
                    ) : effectiveSource === 'youtube' ? (
                      <span className="text-[10px] font-bold text-red-400 bg-red-500/15 border border-red-500/30 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <YouTubeIcon className="w-3 h-3" />
                        <span>YouTube</span>
                      </span>
                    ) : effectiveSource === 'direct' ? (
                      <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/15 border border-cyan-500/30 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <Radio className="w-3 h-3 text-cyan-400" />
                        <span>Enlace</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-slate-300 bg-slate-800/90 border border-slate-700/60 px-2 py-0.5 rounded-md flex items-center gap-1">
                        <FileAudio className="w-3 h-3 text-blue-400" />
                        <span>Archivo</span>
                      </span>
                    )}
                  </div>

                  {/* Date and Recheck Button */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono text-slate-500">
                      {dateStr}
                    </span>
                    {item.assetId && (
                      <button
                        type="button"
                        onClick={() => handleRecheckItem(item)}
                        disabled={isThisChecking}
                        className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 transition-all active:scale-95 disabled:opacity-50"
                        title="Revisar estado de moderación en Roblox"
                      >
                        {isThisChecking ? (
                          <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
                        ) : (
                          <RefreshCw className="w-3 h-3" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* 3. Song Title & Source URL Link */}
                <div className="space-y-1">
                  <h3
                    className="text-sm font-bold text-white leading-snug truncate"
                    title={item.displayName}
                  >
                    {item.displayName}
                  </h3>

                  {item.sourceUrl ? (
                    <div className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300">
                      <LinkIcon className="w-3 h-3 text-slate-500 flex-shrink-0" />
                      <a
                        href={item.sourceUrl.startsWith('http') ? item.sourceUrl : `https://${item.sourceUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate underline font-mono text-[11px]"
                        title={item.sourceUrl}
                      >
                        {item.sourceUrl}
                      </a>
                      <ExternalLink className="w-2.5 h-2.5 flex-shrink-0 text-slate-500" />
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono">
                      <span>{item.creatorType}: {item.creatorId}</span>
                    </div>
                  )}
                </div>

                {/* 4. Parameters (Speed, Amplify, Max Duration, In-game Normal Speed) */}
                <div className="bg-[#070C16] border border-slate-800/80 rounded-xl p-2.5 space-y-1 text-xs font-mono">
                  <div className="flex items-center justify-between text-slate-300">
                    <span>
                      Speed: <strong className="text-amber-400">{item.speed.toFixed(1)}x</strong>
                    </span>
                    <span>
                      Amplify: <strong className="text-cyan-400">{item.amplification > 0 ? `+${item.amplification}` : item.amplification}dB</strong>
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-400 text-[11px]">
                    <span>Max Duration: <strong className="text-slate-200">{item.maxDuration || 350}s</strong></span>
                    <span className="text-emerald-400" title="En Roblox Studio, asigna Sound.PlaybackSpeed a este valor para reproducir a velocidad y tono normal">
                      Normal Speed (in-game): <strong className="text-emerald-300">{normalSpeedInGame}</strong>
                    </span>
                  </div>
                </div>

                {/* 5. Moderation Status & rbxassetid:// string */}
                <div className="space-y-2">
                  {/* Moderation status banner */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {isItemApproved && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-lg">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                          Accepted (Aprobado)
                        </span>
                      )}
                      {isItemReviewing && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-lg animate-pulse">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          Reviewing (En revisión)
                        </span>
                      )}
                      {isItemRejected && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded-lg">
                          <ShieldX className="w-3.5 h-3.5 text-rose-400" />
                          Rejected (Rechazado)
                        </span>
                      )}
                      {!isItemApproved && !isItemReviewing && !isItemRejected && (
                        <span className="text-xs font-medium text-slate-400">
                          {item.status}
                        </span>
                      )}
                    </div>

                    {item.assetId && (
                      <a
                        href={`https://create.roblox.com/dashboard/creations?activeTab=Audio`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-blue-400 hover:text-blue-300 inline-flex items-center gap-1 hover:underline"
                      >
                        <span>Creator Hub</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>

                  {/* rbxassetid:// and copy buttons */}
                  {rbxAssetString && item.assetId !== 'Descarga Manual' ? (
                    <div className="flex items-center justify-between gap-2 bg-[#070C16] border border-blue-500/30 rounded-xl px-3 py-2">
                      <code className="text-xs font-mono font-bold text-cyan-300 truncate select-all">
                        {rbxAssetString}
                      </code>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        {/* Copy rbxassetid://... */}
                        <button
                          type="button"
                          onClick={() => handleCopy(rbxAssetString, 'Asset URL')}
                          className="px-2 py-1 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors"
                          title="Copiar rbxassetid://..."
                        >
                          {copiedId === rbxAssetString ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400">Copiado</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copiar</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ) : item.assetId === 'Descarga Manual' ? (
                    <div className="flex items-center justify-between gap-2 bg-[#07151e] border border-emerald-500/30 rounded-xl px-3 py-2">
                      <span className="text-xs font-mono font-bold text-emerald-300 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>MP3 Optimizado Descargado</span>
                      </span>

                      <a
                        href="https://create.roblox.com/dashboard/creations?activeTab=Audio"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 rounded-lg text-[11px] font-semibold flex items-center gap-1 transition-colors"
                        title="Subir archivo en Roblox Creator Hub"
                      >
                        <span>Subir en Roblox</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  ) : (
                    item.errorMessage && (
                      <p className="text-xs text-rose-400/90 italic bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
                        {item.errorMessage}
                      </p>
                    )
                  )}
                </div>

                {/* 6. Automatic cleanup / expiration notice */}
                <div className="pt-2 border-t border-slate-800/80">
                  <p className="text-[10px] text-slate-500 leading-tight">
                    Files have been automatically deleted after 1 hour. Please convert again if needed.
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
