import React, { useState } from 'react';
import { Waves, Shield, HelpCircle, Activity, ExternalLink, Users, LogOut, Settings, CheckCircle2, ChevronDown } from 'lucide-react';
import { SystemStatus, RobloxAuthUser, RobloxGroupConfig, RobloxGroupRole } from '../types';

interface HeaderProps {
  systemStatus: SystemStatus | null;
  onOpenHelp: () => void;
  authUser: RobloxAuthUser | null;
  isGroupMember: boolean;
  groupRole?: RobloxGroupRole | null;
  groupConfig: RobloxGroupConfig;
  onOpenGroupConfig: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  systemStatus,
  onOpenHelp,
  authUser,
  isGroupMember,
  groupRole,
  groupConfig,
  onOpenGroupConfig,
  onLogout,
}) => {
  const [showUserDropdown, setShowUserDropdown] = useState(false);

  return (
    <header className="w-full border-b border-slate-800/80 bg-[#0B0F19]/90 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col md:flex-row items-center justify-between gap-3.5">
        {/* Brand identity */}
        <div className="flex items-center gap-3.5">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/25 ring-1 ring-blue-400/30 shrink-0">
            <Waves className="w-5 h-5 animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-1.5">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">MAYKEL</span>
                <span className="font-semibold text-slate-300 text-sm sm:text-base">Audio Uploader</span>
              </h1>
              <span className="px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-full">
                Open Cloud
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-400 font-normal">
              Convert and upload audio directly to Roblox Creator.
            </p>
          </div>
        </div>

        {/* Action badges, User profile & Help */}
        <div className="flex flex-wrap items-center justify-center md:justify-end gap-2 sm:gap-2.5">
          {/* FFmpeg status badge */}
          <div
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border ${
              systemStatus?.ffmpegAvailable
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/25'
            }`}
            title={systemStatus?.ffmpegAvailable ? 'FFmpeg motor activo y listo' : 'FFmpeg no detectado'}
          >
            <Activity className="w-3 h-3" />
            <span>FFmpeg: {systemStatus?.ffmpegAvailable ? 'Online' : 'Offline'}</span>
          </div>

          {/* Group Badge */}
          <a
            href={groupConfig.groupUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-800/80 text-slate-300 hover:text-white border border-slate-700/60 hover:border-slate-600 transition-colors"
            title={`Grupo requerido: ${groupConfig.groupName} (${groupConfig.groupId})`}
          >
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            <span className="max-w-[120px] truncate hidden sm:inline">{groupConfig.groupName}</span>
            <span className="sm:hidden">Grupo</span>
            <ExternalLink className="w-3 h-3 text-slate-500" />
          </a>

          {/* Group Settings button */}
          <button
            onClick={onOpenGroupConfig}
            type="button"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 border border-slate-700/60 transition-colors"
            title="Configurar Grupo de Roblox"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Guide / API Key Help button */}
          <button
            onClick={onOpenHelp}
            type="button"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 hover:text-white border border-blue-500/30 transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Guía API Key</span>
          </button>

          {/* User Profile Pill & Dropdown */}
          {authUser && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-800 border border-slate-700/80 text-white transition-all text-xs"
              >
                <img
                  src={authUser.avatarUrl}
                  alt={authUser.username}
                  className="w-6 h-6 rounded-lg object-cover bg-slate-700 border border-slate-600"
                  referrerPolicy="no-referrer"
                />
                <div className="text-left hidden sm:block">
                  <div className="font-semibold text-white leading-none max-w-[100px] truncate">
                    {authUser.displayName}
                  </div>
                  <div className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Miembro</span>
                  </div>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Dropdown Menu */}
              {showUserDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowUserDropdown(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 bg-[#0E1322] border border-slate-700/80 rounded-xl shadow-2xl z-50 p-2 text-xs space-y-1 text-slate-200 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-2 border-b border-slate-800">
                      <p className="font-bold text-white truncate">{authUser.displayName}</p>
                      <p className="text-[11px] text-slate-400 font-mono">@{authUser.username}</p>
                      <div className="flex items-center gap-1.5 mt-1 text-[11px] text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{groupRole?.name || 'Miembro verificado del grupo'}</span>
                      </div>
                    </div>

                    <a
                      href={groupConfig.groupUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
                      onClick={() => setShowUserDropdown(false)}
                    >
                      <span className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Ver Grupo Oficial</span>
                      </span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                    </a>

                    <button
                      type="button"
                      onClick={() => {
                        setShowUserDropdown(false);
                        onOpenGroupConfig();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors text-left"
                    >
                      <Settings className="w-3.5 h-3.5 text-slate-400" />
                      <span>Configuración de Grupo</span>
                    </button>

                    <div className="border-t border-slate-800 my-1" />

                    <button
                      type="button"
                      onClick={() => {
                        setShowUserDropdown(false);
                        onLogout();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-500/10 text-red-400 hover:text-red-300 transition-colors text-left"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Cerrar sesión</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

