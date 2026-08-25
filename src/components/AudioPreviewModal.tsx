import React, { useRef, useEffect } from 'react';
import { Play, Pause, Volume2, X, Sparkles, RefreshCw } from 'lucide-react';

interface AudioPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  audioUrl: string | null;
  speed: number;
  amplification: number;
  maxDuration: number;
  title: string;
}

export const AudioPreviewModal: React.FC<AudioPreviewModalProps> = ({
  isOpen,
  onClose,
  audioUrl,
  speed,
  amplification,
  maxDuration,
  title,
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!isOpen && audioRef.current) {
      audioRef.current.pause();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#121A2A] border border-slate-700/80 rounded-2xl max-w-md w-full p-6 shadow-2xl shadow-blue-950/50 relative">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Volume2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Vista Previa de Audio</h3>
            <p className="text-xs text-slate-400">Audio procesado con FFmpeg a 44.1kHz</p>
          </div>
        </div>

        {/* Info Badges */}
        <div className="bg-[#0A0E17] border border-slate-800 rounded-xl p-3.5 mb-5 space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-400">Audio:</span>
            <span className="text-white font-medium truncate max-w-[200px]">{title || 'Audio'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Velocidad procesada:</span>
            <span className="text-amber-400 font-bold font-mono">{speed.toFixed(2)}x</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Amplificación:</span>
            <span className="text-cyan-400 font-bold font-mono">
              {amplification > 0 ? `+${amplification}` : amplification} dB
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Límite de duración:</span>
            <span className="text-purple-400 font-bold font-mono">{maxDuration}s</span>
          </div>
        </div>

        {/* Audio Player Element */}
        {audioUrl ? (
          <div className="bg-[#0A0E17] p-4 rounded-xl border border-blue-500/20 mb-5">
            <audio
              ref={audioRef}
              controls
              autoPlay
              src={audioUrl}
              className="w-full h-10 accent-blue-500 focus:outline-none rounded"
            />
          </div>
        ) : (
          <div className="py-6 text-center text-slate-500 text-xs">
            Cargando audio...
          </div>
        )}

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors"
        >
          Cerrar Vista Previa
        </button>
      </div>
    </div>
  );
};
