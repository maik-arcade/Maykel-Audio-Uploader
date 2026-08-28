import React, { useState, useRef, useEffect } from 'react';
import {
  Music,
  Youtube,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  FileAudio,
  X,
  Sparkles,
  Play,
  Pause,
  Volume2,
  VolumeX,
  RefreshCw,
  Loader2,
  Headphones,
  Sliders,
  Check,
  ExternalLink,
  Clock,
  Radio,
  Eye,
  EyeOff,
} from 'lucide-react';
import { UploadSettings, AudioInfo } from '../types';
import { fetchAudioInfo, requestAudioPreview } from '../services/api';

interface AudioSourceCardProps {
  youtubeUrl: string;
  onYoutubeUrlChange: (url: string) => void;
  selectedFile: File | null;
  onFileSelect: (file: File | null) => void;
  customTitle: string;
  onCustomTitleChange: (title: string) => void;
  settings: UploadSettings;
  onShowToast: (msg: string, type?: 'info' | 'error' | 'success') => void;
  onDetectedInfoChange?: (info: AudioInfo | null) => void;
}

const DIRECT_AUDIO_REGEX = /\.(mp3|wav|ogg|flac|m4a|aac)(\?.*)?$/i;

function isValidAudioUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;

  try {
    let checkUrl = trimmed;
    if (!checkUrl.startsWith('http://') && !checkUrl.startsWith('https://')) {
      checkUrl = 'https://' + checkUrl;
    }
    const parsed = new URL(checkUrl);
    if (parsed.hostname.includes('youtube.com') || parsed.hostname.includes('youtu.be')) {
      return true;
    }
    if (parsed.hostname.includes('soundcloud.com')) {
      return true;
    }
    if (DIRECT_AUDIO_REGEX.test(parsed.pathname)) {
      return true;
    }
    return parsed.pathname.length > 3;
  } catch {
    return false;
  }
}

export const AudioSourceCard: React.FC<AudioSourceCardProps> = ({
  youtubeUrl,
  onYoutubeUrlChange,
  selectedFile,
  onFileSelect,
  customTitle,
  onCustomTitleChange,
  settings,
  onShowToast,
  onDetectedInfoChange,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Audio Info / Song Detection state
  const [detectedInfo, setDetectedInfo] = useState<AudioInfo | null>(null);
  const [isFetchingInfo, setIsFetchingInfo] = useState(false);
  const [lastFetchedUrl, setLastFetchedUrl] = useState<string>('');
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);

  // Notify parent of detectedInfo updates
  useEffect(() => {
    onDetectedInfoChange?.(detectedInfo);
  }, [detectedInfo, onDetectedInfoChange]);

  // Audio Player State (Dual Mode: 'original' vs 'effects')
  const [activePlaybackMode, setActivePlaybackMode] = useState<'original' | 'effects'>('effects');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);

  // Blob URLs
  const [originalAudioUrl, setOriginalAudioUrl] = useState<string | null>(null);
  const [processedAudioUrl, setProcessedAudioUrl] = useState<string | null>(null);
  const [processedSettingsKey, setProcessedSettingsKey] = useState<string>('');

  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  const isYtValid = youtubeUrl.trim().length > 0 && isValidAudioUrl(youtubeUrl);
  const isYtInvalid = youtubeUrl.trim().length > 0 && !isValidAudioUrl(youtubeUrl);

  // Settings key to detect when speed or amplification changed
  const currentSettingsKey = `${settings.speed}_${settings.amplification}_${settings.maxDuration}`;

  // 1. Debounce and fetch info when YouTube / SoundCloud / Link is entered
  useEffect(() => {
    const trimmed = youtubeUrl.trim();
    if (!trimmed || !isYtValid) {
      if (!selectedFile) {
        setDetectedInfo(null);
      }
      return;
    }

    if (trimmed === lastFetchedUrl) return;

    const timer = setTimeout(async () => {
      setIsFetchingInfo(true);
      try {
        const info = await fetchAudioInfo(trimmed);
        setDetectedInfo(info);
        setLastFetchedUrl(trimmed);

        // Auto-fill custom title if empty
        if (!customTitle && info.title) {
          onCustomTitleChange(info.title);
        }

        // Reset previous preview blobs when link changes
        setOriginalAudioUrl(null);
        setProcessedAudioUrl(null);
        setIsPlaying(false);
      } catch (err: any) {
        console.warn('Audio info fetch failed:', err);
      } finally {
        setIsFetchingInfo(false);
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [youtubeUrl, isYtValid, lastFetchedUrl, customTitle, onCustomTitleChange, selectedFile]);

  // 2. Handle Local File selection and detection
  useEffect(() => {
    if (selectedFile) {
      const cleanName = selectedFile.name.replace(/\.[^/.]+$/, '');
      const localInfo: AudioInfo = {
        title: cleanName,
        artist: 'Archivo local',
        source: 'file',
        formattedDuration: undefined,
      };
      setDetectedInfo(localInfo);

      // Create object URL for local original playback
      const localBlobUrl = URL.createObjectURL(selectedFile);
      setOriginalAudioUrl(localBlobUrl);
      setProcessedAudioUrl(null);
      setIsPlaying(false);

      if (!customTitle) {
        onCustomTitleChange(cleanName);
      }

      return () => {
        URL.revokeObjectURL(localBlobUrl);
      };
    } else if (!youtubeUrl) {
      setDetectedInfo(null);
      setOriginalAudioUrl(null);
      setProcessedAudioUrl(null);
    }
  }, [selectedFile]);

  // 3. Audio Player element time/state listeners
  useEffect(() => {
    const audio = audioElementRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };
    const handleLoadedMetadata = () => {
      setDuration(audio.duration || 0);
      setIsAudioLoading(false);
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };
    const handleWaiting = () => {
      setIsAudioLoading(true);
    };
    const handleCanPlay = () => {
      setIsAudioLoading(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('canplay', handleCanPlay);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('canplay', handleCanPlay);
    };
  }, [originalAudioUrl, processedAudioUrl, activePlaybackMode]);

  // Helper to load audio preview stream (Original vs Processed with Effects)
  const ensureAudioLoaded = async (mode: 'original' | 'effects'): Promise<string | null> => {
    if (mode === 'original') {
      if (selectedFile) {
        if (!originalAudioUrl) {
          const localUrl = URL.createObjectURL(selectedFile);
          setOriginalAudioUrl(localUrl);
          return localUrl;
        }
        return originalAudioUrl;
      }
      if (originalAudioUrl) return originalAudioUrl;

      if (!youtubeUrl || !youtubeUrl.trim()) {
        onShowToast('Ingresa un enlace de audio o selecciona un archivo primero.', 'info');
        return null;
      }

      // Fetch original stream from server
      setIsAudioLoading(true);
      try {
        const formData = new FormData();
        formData.append('youtubeUrl', youtubeUrl.trim());
        formData.append('mode', 'original');
        formData.append('speed', '1.0');
        formData.append('amplification', '0');
        formData.append('maxDuration', '120');

        const url = await requestAudioPreview(formData);
        setOriginalAudioUrl(url);
        return url;
      } catch (err: any) {
        onShowToast(err.message || 'Error al obtener audio original', 'error');
        return null;
      } finally {
        setIsAudioLoading(false);
      }
    } else {
      // Processed with effects
      if (processedAudioUrl && processedSettingsKey === currentSettingsKey) {
        return processedAudioUrl;
      }

      if (!selectedFile && (!youtubeUrl || !youtubeUrl.trim())) {
        onShowToast('Ingresa un enlace de audio o selecciona un archivo primero.', 'info');
        return null;
      }

      setIsAudioLoading(true);
      try {
        const formData = new FormData();
        if (selectedFile) {
          formData.append('audioFile', selectedFile);
        } else if (youtubeUrl) {
          formData.append('youtubeUrl', youtubeUrl.trim());
        }
        formData.append('mode', 'processed');
        formData.append('speed', settings.speed.toString());
        formData.append('amplification', settings.amplification.toString());
        formData.append('maxDuration', settings.maxDuration.toString());

        const url = await requestAudioPreview(formData);
        setProcessedAudioUrl(url);
        setProcessedSettingsKey(currentSettingsKey);
        return url;
      } catch (err: any) {
        onShowToast(err.message || 'Error al procesar audio con efectos', 'error');
        return null;
      } finally {
        setIsAudioLoading(false);
      }
    }
  };

  // Toggle Play / Pause handler
  const handleTogglePlay = async () => {
    const audio = audioElementRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
      return;
    }

    const currentSource = activePlaybackMode === 'original' ? originalAudioUrl : processedAudioUrl;
    const isStaleEffects =
      activePlaybackMode === 'effects' && processedSettingsKey !== currentSettingsKey;

    if (!currentSource || isStaleEffects) {
      const newUrl = await ensureAudioLoaded(activePlaybackMode);
      if (newUrl) {
        audio.src = newUrl;
        audio.play().then(() => setIsPlaying(true)).catch((e) => console.warn('Play error:', e));
      }
    } else {
      if (audio.src !== currentSource) {
        audio.src = currentSource;
      }
      audio.play().then(() => setIsPlaying(true)).catch((e) => console.warn('Play error:', e));
    }
  };

  // Switch between "Original" and "Con Efectos"
  const handleSwitchPlaybackMode = async (mode: 'original' | 'effects') => {
    if (activePlaybackMode === mode) return;

    const audio = audioElementRef.current;
    if (audio) {
      audio.pause();
    }
    setIsPlaying(false);
    setActivePlaybackMode(mode);

    // If already pre-loaded, attach source
    if (mode === 'original' && originalAudioUrl && audio) {
      audio.src = originalAudioUrl;
    } else if (
      mode === 'effects' &&
      processedAudioUrl &&
      processedSettingsKey === currentSettingsKey &&
      audio
    ) {
      audio.src = processedAudioUrl;
    }
  };

  // Force re-processing with new settings
  const handleRegenerateEffects = async () => {
    const audio = audioElementRef.current;
    if (audio) {
      audio.pause();
    }
    setIsPlaying(false);
    setProcessedAudioUrl(null);
    const url = await ensureAudioLoaded('effects');
    if (url && audio) {
      audio.src = url;
      audio.play().then(() => setIsPlaying(true)).catch(() => {});
      onShowToast(`Audio procesado a ${settings.speed}x y ${settings.amplification > 0 ? '+' : ''}${settings.amplification}dB`, 'success');
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioElementRef.current) {
      audioElementRef.current.currentTime = time;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioElementRef.current) {
      audioElementRef.current.volume = val;
      audioElementRef.current.muted = val === 0;
    }
    setIsMuted(val === 0);
  };

  const toggleMute = () => {
    if (!audioElementRef.current) return;
    if (isMuted) {
      audioElementRef.current.muted = false;
      setIsMuted(false);
    } else {
      audioElementRef.current.muted = true;
      setIsMuted(true);
    }
  };

  const formatSeconds = (sec: number) => {
    if (isNaN(sec) || sec < 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const handleYoutubeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onYoutubeUrlChange(val);
    if (val.trim()) {
      if (selectedFile) {
        onFileSelect(null);
      }
    }
  };

  const handleFileChange = (file: File | null) => {
    if (!file) {
      onFileSelect(null);
      return;
    }

    const validExtensions = ['.mp3', '.wav', '.ogg', '.flac'];
    const fileName = file.name.toLowerCase();
    const isValidExt = validExtensions.some((ext) => fileName.endsWith(ext));

    if (!isValidExt) {
      onShowToast('Usa formatos MP3, WAV, OGG o FLAC.', 'error');
      return;
    }

    onFileSelect(file);
    if (youtubeUrl) {
      onYoutubeUrlChange('');
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const hasSelectedAudio = !!selectedFile || isYtValid;

  return (
    <div className="bg-[#121A2A] border border-slate-800/90 rounded-2xl p-5 sm:p-6 shadow-xl shadow-black/30 transition-all hover:border-slate-700/80 space-y-5">
      {/* Hidden Audio Player instance */}
      <audio ref={audioElementRef} preload="metadata" />

      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Music className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
              Origen del Audio
            </h2>
            <p className="text-xs text-slate-400">
              Pega un enlace de YouTube / SoundCloud / MP3 o sube un archivo
            </p>
          </div>
        </div>
        <span className="text-[11px] font-medium text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700/50">
          MP3, WAV, OGG, FLAC
        </span>
      </div>

      {/* Method 1: YouTube / Link Input */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 uppercase tracking-wider">
            <Youtube className="w-4 h-4 text-rose-500" />
            <span>Link de Audio (YouTube / SoundCloud / Directo)</span>
          </label>

          {/* Validation Badges */}
          {isYtValid && (
            <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full animate-fadeIn">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Enlace detectado</span>
            </span>
          )}
          {isYtInvalid && (
            <span className="flex items-center gap-1 text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2.5 py-0.5 rounded-full animate-fadeIn">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Link no válido</span>
            </span>
          )}
        </div>

        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Music className="w-4 h-4" />
          </div>
          <input
            type="text"
            id="youtube-url-input"
            placeholder="Pega el link de YouTube, SoundCloud o audio directo..."
            value={youtubeUrl}
            onChange={handleYoutubeInput}
            className={`w-full pl-10 pr-10 py-2.5 bg-[#0A0E17] border rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all ${
              isYtValid
                ? 'border-emerald-500/60 focus:border-emerald-500'
                : isYtInvalid
                ? 'border-rose-500/60 focus:border-rose-500'
                : 'border-slate-800 focus:border-blue-500'
            }`}
          />
          {youtubeUrl && (
            <button
              type="button"
              id="clear-youtube-url-btn"
              onClick={() => {
                onYoutubeUrlChange('');
                setDetectedInfo(null);
                setOriginalAudioUrl(null);
                setProcessedAudioUrl(null);
                setIsPlaying(false);
              }}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200"
              title="Limpiar enlace"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Divider with 'O' */}
      <div className="relative flex py-1 items-center">
        <div className="flex-grow border-t border-slate-800"></div>
        <span className="flex-shrink mx-4 text-xs font-bold text-slate-500 uppercase tracking-widest bg-[#121A2A] px-2">
          O
        </span>
        <div className="flex-grow border-t border-slate-800"></div>
      </div>

      {/* Method 2: Local File Dropzone */}
      <div>
        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
          Archivo local
        </label>

        <input
          type="file"
          id="local-audio-file-input"
          ref={fileInputRef}
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleFileChange(e.target.files[0]);
            }
          }}
          accept=".mp3,.wav,.ogg,.flac,audio/mpeg,audio/wav,audio/ogg,audio/flac"
          className="hidden"
        />

        {!selectedFile ? (
          <div
            id="audio-dropzone-box"
            onDrop={handleDrop}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              setIsDragging(false);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-blue-500 bg-blue-500/10 ring-4 ring-blue-500/20 scale-[1.01]'
                : 'border-slate-800 bg-[#0A0E17]/60 hover:bg-[#0A0E17] hover:border-slate-700'
            }`}
          >
            <div className="flex flex-col items-center justify-center">
              <div className="w-11 h-11 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-2.5 shadow-inner">
                <UploadCloud className="w-5 h-5 animate-bounce" />
              </div>
              <p className="text-sm font-semibold text-slate-200 mb-1">
                Arrastra tu audio aquí o <span className="text-blue-400 hover:underline">haz clic para examinar</span>
              </p>
              <p className="text-xs text-slate-500">
                Formatos: <span className="text-slate-400 font-medium">MP3, WAV, OGG, FLAC</span> (Máx 60 MB)
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-[#0A0E17] border border-blue-500/30 rounded-2xl p-4 flex items-center justify-between shadow-lg shadow-blue-500/5">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 flex-shrink-0">
                <FileAudio className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-slate-400">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Archivo Local
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                id="change-selected-file-btn"
                onClick={() => fileInputRef.current?.click()}
                className="px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
              >
                Cambiar
              </button>
              <button
                type="button"
                id="remove-selected-file-btn"
                onClick={() => onFileSelect(null)}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                title="Eliminar archivo seleccionado"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* DETECTED SONG & REAL-TIME PREVIEW PLAYER SECTION */}
      {isFetchingInfo && (
        <div className="bg-[#0A0E17] border border-blue-500/30 rounded-2xl p-4 flex items-center gap-3 animate-pulse">
          <Loader2 className="w-5 h-5 text-blue-400 animate-spin flex-shrink-0" />
          <div>
            <p className="text-xs font-semibold text-white">Identificando canción del enlace...</p>
            <p className="text-[11px] text-slate-400">Extrayendo título, duración y metadata de audio</p>
          </div>
        </div>
      )}

      {hasSelectedAudio && detectedInfo && (
        <div
          id="detected-song-preview-container"
          className="bg-gradient-to-br from-[#0c1524] to-[#0A0E17] border border-blue-500/40 rounded-2xl p-4 sm:p-5 shadow-2xl relative overflow-hidden space-y-4 animate-fadeIn"
        >
          {/* Subtle Glow */}
          <div className="absolute top-0 right-0 w-36 h-36 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* Song Info Header Card */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 pb-3 border-b border-slate-800/80">
            <div className="flex items-center gap-3.5 min-w-0">
              {/* Thumbnail or Icon with fallback */}
              {detectedInfo.thumbnail ? (
                <div className="w-16 h-16 rounded-xl overflow-hidden border border-slate-700/80 flex-shrink-0 shadow-md relative group bg-black/40">
                  <img
                    src={detectedInfo.thumbnail}
                    alt={detectedInfo.title}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      if (detectedInfo.videoId && !e.currentTarget.src.includes('hqdefault')) {
                        e.currentTarget.src = `https://i.ytimg.com/vi/${detectedInfo.videoId}/hqdefault.jpg`;
                      }
                    }}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Music className="w-5 h-5 text-white" />
                  </div>
                </div>
              ) : (
                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white flex-shrink-0 shadow-md">
                  <Music className="w-6 h-6" />
                </div>
              )}

              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                    Canción Detectada
                  </span>
                  {detectedInfo.formattedDuration && (
                    <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {detectedInfo.formattedDuration}
                    </span>
                  )}
                </div>

                <h3 className="text-sm sm:text-base font-bold text-white truncate mt-0.5" title={detectedInfo.title}>
                  {detectedInfo.title}
                </h3>
                <p className="text-xs text-slate-400 truncate">
                  {detectedInfo.artist || (detectedInfo.source === 'file' ? 'Archivo local' : 'Audio detectado')}
                </p>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
              {/* Toggle Video Player Button if YouTube/Embed is available */}
              {(detectedInfo.embedUrl || detectedInfo.videoId) && (
                <button
                  type="button"
                  id="toggle-video-embed-btn"
                  onClick={() => setShowVideoPlayer(!showVideoPlayer)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-all flex-shrink-0"
                  title="Ver video para confirmar que es la canción deseada"
                >
                  {showVideoPlayer ? <EyeOff className="w-3.5 h-3.5 text-slate-400" /> : <Eye className="w-3.5 h-3.5 text-blue-400" />}
                  <span>{showVideoPlayer ? 'Ocultar Video' : 'Ver Video'}</span>
                </button>
              )}

              {/* Quick Action: Apply as Roblox Display Name */}
              {detectedInfo.title && customTitle !== detectedInfo.title && (
                <button
                  type="button"
                  id="apply-detected-title-btn"
                  onClick={() => {
                    onCustomTitleChange(detectedInfo.title.substring(0, 50));
                    onShowToast('Título asignado para Roblox', 'info');
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 transition-all flex-shrink-0"
                  title="Usar el título de esta canción como nombre en Roblox"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  <span>Usar nombre</span>
                </button>
              )}
            </div>
          </div>

          {/* Embedded Video Preview Player */}
          {showVideoPlayer && (detectedInfo.embedUrl || detectedInfo.videoId) && (
            <div className="rounded-xl overflow-hidden border border-slate-800 bg-black aspect-video w-full max-h-64 shadow-lg animate-fadeIn">
              <iframe
                src={detectedInfo.embedUrl || `https://www.youtube-nocookie.com/embed/${detectedInfo.videoId}?autoplay=0`}
                title={detectedInfo.title || 'Video preview'}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}

          {/* DUAL MODE AUDIO PLAYER: [Original] vs [Con Efectos] */}
          <div className="space-y-3">
            {/* Mode Switcher Tabs */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 p-1 bg-[#070B12] rounded-xl border border-slate-800">
                <button
                  type="button"
                  id="tab-listen-original"
                  onClick={() => handleSwitchPlaybackMode('original')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activePlaybackMode === 'original'
                      ? 'bg-slate-800 text-white shadow-sm border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Music className="w-3.5 h-3.5" />
                  <span>1. Escuchar Original</span>
                </button>

                <button
                  type="button"
                  id="tab-listen-effects"
                  onClick={() => handleSwitchPlaybackMode('effects')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activePlaybackMode === 'effects'
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/20 border border-blue-400/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Headphones className="w-3.5 h-3.5 text-cyan-300" />
                  <span>2. Con Efectos ({settings.speed.toFixed(2)}x)</span>
                </button>
              </div>

              {/* Status explanation badge */}
              <span className="text-[11px] text-slate-400 font-medium">
                {activePlaybackMode === 'original' ? (
                  <span className="text-slate-300">Comprueba si es la pista correcta</span>
                ) : (
                  <span className="text-cyan-300 font-semibold">
                    Velocidad {settings.speed.toFixed(2)}x • Amplif. {settings.amplification > 0 ? `+${settings.amplification}` : settings.amplification}dB
                  </span>
                )}
              </span>
            </div>

            {/* Main Player Bar */}
            <div className="bg-[#070B12] border border-slate-800 rounded-xl p-3.5 sm:p-4 space-y-3">
              <div className="flex items-center gap-3.5">
                {/* Big Play / Pause Button */}
                <button
                  type="button"
                  id="toggle-playback-btn"
                  onClick={handleTogglePlay}
                  disabled={isAudioLoading}
                  className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all shadow-lg active:scale-95 flex-shrink-0 ${
                    activePlaybackMode === 'effects'
                      ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                  } disabled:opacity-50`}
                  title={isPlaying ? 'Pausar' : 'Reproducir'}
                >
                  {isAudioLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : isPlaying ? (
                    <Pause className="w-5 h-5 fill-current" />
                  ) : (
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  )}
                </button>

                {/* Progress / Seek bar */}
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>{formatSeconds(currentTime)}</span>
                    <span className="text-slate-300 font-semibold">
                      {activePlaybackMode === 'effects' ? '⚡ Con Efectos de Velocidad & Volumen' : '🎵 Canción Original'}
                    </span>
                    <span>{formatSeconds(duration)}</span>
                  </div>

                  <input
                    type="range"
                    id="audio-scrubber-slider"
                    min={0}
                    max={duration || 100}
                    step={0.1}
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 focus:outline-none"
                  />
                </div>

                {/* Re-generate effects button if settings changed */}
                {activePlaybackMode === 'effects' && (
                  <button
                    type="button"
                    id="regenerate-effects-btn"
                    onClick={handleRegenerateEffects}
                    disabled={isAudioLoading}
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all flex-shrink-0"
                    title="Volver a generar audio con los efectos actuales"
                  >
                    <RefreshCw className={`w-4 h-4 ${isAudioLoading ? 'animate-spin' : ''}`} />
                  </button>
                )}

                {/* Volume / Mute */}
                <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={toggleMute}
                    className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
                    title={isMuted ? 'Desmutear' : 'Mutear'}
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-16 h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-slate-300"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Audio Display Name Input */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Nombre en Roblox (Display Name)
          </label>
          <span className="text-[11px] text-slate-500">Opcional</span>
        </div>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <input
            type="text"
            id="custom-audio-title-input"
            placeholder="MAYKEL Custom Audio"
            value={customTitle}
            maxLength={50}
            onChange={(e) => onCustomTitleChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#0A0E17] border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
          />
        </div>
        <p className="text-[11px] text-slate-500 mt-1">
          Se asignará como título del Asset en Roblox (máx 50 caracteres)
        </p>
      </div>
    </div>
  );
};
