import React from 'react';
import { Sliders, Gauge, Volume2, Clock, VolumeX, Sparkles, Play, Square, Loader2 } from 'lucide-react';
import { UploadSettings } from '../types';

interface AdvancedSettingsCardProps {
  settings: UploadSettings;
  onSettingsChange: (newSettings: UploadSettings) => void;
  onPreviewAudio?: () => void;
  isPreviewLoading?: boolean;
  isPlayingPreview?: boolean;
  onStopPreview?: () => void;
  hasAudioSource?: boolean;
}

const SPEED_PRESETS = [
  { id: 'preset-lento-btn', label: 'Lento 2.1x', value: 2.1 },
  { id: 'preset-default-btn', label: 'Default 2.33x', value: 2.33 },
  { id: 'preset-rapido-btn', label: 'Rápido 2.5x', value: 2.5 },
  { id: 'preset-mas-rapido-btn', label: 'Más rápido 2.7x', value: 2.7 },
  { id: 'preset-ultra-btn', label: 'Ultra 2.9x', value: 2.9 },
];

export const AdvancedSettingsCard: React.FC<AdvancedSettingsCardProps> = ({
  settings,
  onSettingsChange,
  onPreviewAudio,
  isPreviewLoading = false,
  isPlayingPreview = false,
  onStopPreview,
  hasAudioSource = false,
}) => {
  const handlePresetClick = (value: number) => {
    onSettingsChange({
      ...settings,
      speed: value,
    });
  };

  return (
    <div className="bg-[#121A2A] border border-slate-800/90 rounded-2xl p-5 sm:p-6 shadow-xl shadow-black/30 transition-all hover:border-slate-700/80">
      {/* Section Title */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
              Advanced Settings
            </h2>
            <p className="text-xs text-slate-400">
              Ajustes de velocidad, amplificación de volumen y recorte de duración
            </p>
          </div>
        </div>

        {/* Audio Test Preview Button */}
        {onPreviewAudio && (
          <div>
            {isPlayingPreview ? (
              <button
                type="button"
                onClick={onStopPreview}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-600/20 text-rose-300 border border-rose-500/30 hover:bg-rose-600/30 transition-all shadow-sm"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Detener Prueba</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onPreviewAudio}
                disabled={!hasAudioSource || isPreviewLoading}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all shadow-sm ${
                  !hasAudioSource || isPreviewLoading
                    ? 'opacity-40 bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed'
                    : 'bg-cyan-600/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-600/30 hover:text-white'
                }`}
                title={hasAudioSource ? 'Escucha una muestra previa del audio procesado' : 'Selecciona un audio primero'}
              >
                {isPreviewLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Procesando muestra...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current text-cyan-400" />
                    <span>Previsualizar Audio</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="space-y-6">
        {/* Presets Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Presets de Velocidad</span>
            </label>
            <span className="text-[11px] text-slate-400">Clic rápido para aplicar</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {SPEED_PRESETS.map((preset) => {
              const isSelected = Math.abs(settings.speed - preset.value) < 0.01;
              return (
                <button
                  key={preset.label}
                  type="button"
                  id={preset.id}
                  onClick={() => handlePresetClick(preset.value)}
                  className={`py-2 px-2.5 rounded-xl text-xs font-semibold transition-all border text-center ${
                    isSelected
                      ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white border-blue-400 shadow-md shadow-blue-500/30 scale-[1.02]'
                      : 'bg-[#0A0E17] text-slate-300 border-slate-800 hover:border-slate-700 hover:bg-slate-800/60'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 1. Velocidad Slider */}
        <div className="bg-[#0A0E17] p-4 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400">
                <Gauge className="w-4 h-4" />
              </div>
              <span className="text-sm font-semibold text-slate-200">Velocidad</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold text-blue-400 font-mono">
                {settings.speed.toFixed(2)}x
              </span>
              {settings.speed === 2.33 && (
                <span className="text-[10px] font-bold uppercase bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20">
                  Default
                </span>
              )}
            </div>
          </div>

          <input
            type="range"
            id="speed-slider"
            min="2.1"
            max="2.9"
            step="0.01"
            value={settings.speed}
            onChange={(e) =>
              onSettingsChange({
                ...settings,
                speed: parseFloat(e.target.value),
              })
            }
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500 focus:outline-none"
          />

          <div className="flex justify-between text-[11px] text-slate-500 mt-1.5 font-mono">
            <span>2.10x (Mín)</span>
            <span className="text-slate-400">2.33x (Normal)</span>
            <span>2.90x (Máx)</span>
          </div>
        </div>

        {/* 2. Amplificación Slider */}
        <div className="bg-[#0A0E17] p-4 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Volume2 className="w-4 h-4" />
              </div>
              <span className="text-sm font-semibold text-slate-200">Amplificación</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className={`text-base font-bold font-mono ${
                  settings.amplification > 0
                    ? 'text-amber-400'
                    : settings.amplification < 0
                    ? 'text-cyan-400'
                    : 'text-slate-300'
                }`}
              >
                {settings.amplification > 0 ? `+${settings.amplification}` : settings.amplification} dB
              </span>
              {settings.amplification === -4 && (
                <span className="text-[10px] font-bold uppercase bg-cyan-500/10 text-cyan-400 px-1.5 py-0.5 rounded border border-cyan-500/20">
                  Default
                </span>
              )}
            </div>
          </div>

          <input
            type="range"
            id="amplification-slider"
            min="-20"
            max="20"
            step="1"
            value={settings.amplification}
            onChange={(e) =>
              onSettingsChange({
                ...settings,
                amplification: parseInt(e.target.value, 10),
              })
            }
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 focus:outline-none"
          />

          <div className="flex justify-between text-[11px] text-slate-500 mt-1.5 font-mono">
            <span>-20 dB</span>
            <span className="text-slate-400">-4 dB (Equilibrado)</span>
            <span>+20 dB</span>
          </div>
        </div>

        {/* 3. Duración Máxima Slider */}
        <div className="bg-[#0A0E17] p-4 rounded-xl border border-slate-800/80">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-400">
                <Clock className="w-4 h-4" />
              </div>
              <span className="text-sm font-semibold text-slate-200">Duración máxima</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-base font-bold text-purple-400 font-mono">
                {settings.maxDuration} s
              </span>
              <span className="text-xs text-slate-500 font-mono">
                ({Math.floor(settings.maxDuration / 60)}m {settings.maxDuration % 60}s)
              </span>
              {settings.maxDuration === 400 && (
                <span className="text-[10px] font-bold uppercase bg-purple-500/10 text-purple-400 px-1.5 py-0.5 rounded border border-purple-500/20">
                  Default
                </span>
              )}
            </div>
          </div>

          <input
            type="range"
            id="max-duration-slider"
            min="10"
            max="400"
            step="5"
            value={settings.maxDuration}
            onChange={(e) =>
              onSettingsChange({
                ...settings,
                maxDuration: parseInt(e.target.value, 10),
              })
            }
            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500 focus:outline-none"
          />

          <div className="flex justify-between text-[11px] text-slate-500 mt-1.5 font-mono">
            <span>10 s (Mín)</span>
            <span className="text-slate-400">200 s</span>
            <span>400 s (Máx Roblox)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
