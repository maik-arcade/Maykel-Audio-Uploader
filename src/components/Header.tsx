import React from 'react';
import { Waves, Shield, HelpCircle, Activity, ExternalLink } from 'lucide-react';
import { SystemStatus } from '../types';

interface HeaderProps {
  systemStatus: SystemStatus | null;
  onOpenHelp: () => void;
}

export const Header: React.FC<HeaderProps> = ({ systemStatus, onOpenHelp }) => {
  return (
    <header className="w-full border-b border-slate-800/80 bg-[#0B0F19]/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Brand identity */}
        <div className="flex items-center gap-3.5">
          <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/25 ring-1 ring-blue-400/30">
            <Waves className="w-6 h-6 animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-1.5">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">MAYKEL</span>
                <span className="font-semibold text-slate-300 text-base sm:text-lg">Audio Uploader</span>
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-full">
                Open Cloud
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 font-normal">
              Convert and upload audio directly to Roblox Creator.
            </p>
          </div>
        </div>

        {/* Action badges & Help */}
        <div className="flex items-center gap-2.5">
          {/* FFmpeg status badge */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border ${
              systemStatus?.ffmpegAvailable
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/25'
            }`}
            title={systemStatus?.ffmpegAvailable ? 'FFmpeg motor activo y listo' : 'FFmpeg no detectado'}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>FFmpeg: {systemStatus?.ffmpegAvailable ? 'Online' : 'Offline'}</span>
          </div>

          {/* Security badge */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-slate-800/80 text-slate-300 border border-slate-700/60">
            <Shield className="w-3.5 h-3.5 text-blue-400" />
            <span>Backend Seguro</span>
          </div>

          {/* Guide / API Key Help button */}
          <button
            onClick={onOpenHelp}
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 hover:text-white border border-blue-500/30 transition-colors"
          >
            <HelpCircle className="w-4 h-4" />
            <span>Guía API Key</span>
          </button>

          {/* Roblox Creator link */}
          <a
            href="https://create.roblox.com/dashboard/creations?activeTab=Audio"
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
            title="Abrir Roblox Creator Dashboard"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </header>
  );
};
