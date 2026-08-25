import React, { useState } from 'react';
import {
  Shield,
  Users,
  ExternalLink,
  RefreshCw,
  Lock,
  ArrowRight,
  LogOut,
  AlertTriangle,
  UserCheck,
  Sparkles,
  Layers,
  KeyRound,
} from 'lucide-react';
import { RobloxAuthUser, RobloxGroupConfig, RobloxGroupRole } from '../types';
import { robloxLogin, verifyGroupMembership, robloxLogout } from '../services/api';

interface RobloxAuthGateProps {
  authUser: RobloxAuthUser | null;
  isGroupMember: boolean;
  groupRole?: RobloxGroupRole | null;
  groupConfig: RobloxGroupConfig;
  isLoading: boolean;
  onAuthSuccess: (user: RobloxAuthUser, isMember: boolean, role?: RobloxGroupRole | null) => void;
  onLogout: () => void;
  onShowToast: (msg: string, type: 'info' | 'error' | 'success') => void;
  onOpenGroupConfig?: () => void;
  children: React.ReactNode;
}

export const RobloxAuthGate: React.FC<RobloxAuthGateProps> = ({
  authUser,
  isGroupMember,
  groupRole,
  groupConfig,
  isLoading,
  onAuthSuccess,
  onLogout,
  onShowToast,
  onOpenGroupConfig,
  children,
}) => {
  const [usernameInput, setUsernameInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingMembership, setIsCheckingMembership] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [membershipNotice, setMembershipNotice] = useState<string | null>(null);

  // 1. Initial Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#080C14] text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="relative w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <RefreshCw className="w-8 h-8 animate-spin" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Comprobando sesión de Roblox...</h3>
            <p className="text-xs text-slate-400 mt-1">Verificando membresía en el servidor oficial</p>
          </div>
        </div>
      </div>
    );
  }

  // 2. Verified Member -> Render Main Uploader Content
  if (authUser && isGroupMember) {
    return <>{children}</>;
  }

  // Handle Login submission
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput.trim()) {
      setLoginError('Por favor ingresa tu nombre de usuario o User ID de Roblox');
      return;
    }

    setIsSubmitting(true);
    setLoginError(null);
    setMembershipNotice(null);

    try {
      const res = await robloxLogin(usernameInput.trim());
      if (res.success && res.user) {
        onAuthSuccess(res.user, !!res.isGroupMember, res.groupRole);
        if (res.isGroupMember) {
          onShowToast(`¡Bienvenido! Acceso concedido como ${res.user.displayName || res.user.username}`, 'success');
        } else {
          onShowToast('Cuenta verificada, pero debes unirte al grupo para desbloquear el uploader.', 'info');
        }
      } else {
        setLoginError(res.error || 'No se pudo iniciar sesión con Roblox');
        onShowToast(res.error || 'Error al iniciar sesión', 'error');
      }
    } catch (err: any) {
      setLoginError(err.message || 'Error de conexión con Roblox');
      onShowToast(err.message || 'Error de conexión', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Re-Verification of Group Membership
  const handleVerifyMembership = async () => {
    if (!authUser) return;

    setIsCheckingMembership(true);
    setMembershipNotice(null);

    try {
      const res = await verifyGroupMembership(authUser.id);
      if (res.success) {
        if (res.isGroupMember) {
          onAuthSuccess(authUser, true, res.groupRole);
          onShowToast('¡Excelente! Membresía confirmada. Acceso concedido a MAYKEL Audio Uploader.', 'success');
        } else {
          setMembershipNotice('Todavía no apareces como miembro del grupo. Únete y vuelve a intentarlo.');
          onShowToast('No apareces en la lista de miembros del grupo todavía.', 'error');
        }
      } else {
        setMembershipNotice(res.error || 'Error al comprobar membresía en Roblox.');
        onShowToast(res.error || 'Error al verificar con Roblox', 'error');
      }
    } catch (err: any) {
      setMembershipNotice(err.message || 'Error de conexión con los servidores de Roblox.');
      onShowToast(err.message || 'Error al verificar membresía', 'error');
    } finally {
      setIsCheckingMembership(false);
    }
  };

  // 3. User is Logged In BUT NOT a Group Member -> Access Restricted Screen
  if (authUser && !isGroupMember) {
    return (
      <div className="min-h-screen bg-[#080C14] text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
        {/* Glow ambient effects */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-xl bg-[#0E1322]/95 border border-slate-700/80 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl relative z-10 space-y-6">
          {/* Top User Status Header */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center gap-3">
              <img
                src={authUser.avatarUrl}
                alt={authUser.username}
                className="w-10 h-10 rounded-xl object-cover bg-slate-800 border border-slate-700"
                referrerPolicy="no-referrer"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-white truncate">{authUser.displayName}</span>
                  <span className="text-xs text-slate-400 font-mono">@{authUser.username}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    No es miembro del grupo
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onLogout}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="Cerrar sesión o cambiar de cuenta"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cambiar cuenta</span>
            </button>
          </div>

          {/* Main Restricted Hero */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 mx-auto flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
              <Lock className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">Acceso Restringido</h2>
            <p className="text-sm text-slate-300 max-w-md mx-auto">
              Para utilizar <strong>MAYKEL Audio Uploader</strong> debes pertenecer a nuestro grupo oficial de Roblox.
            </p>
          </div>

          {/* Group Info Showcase Card */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
              <span className="font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-400" />
                Grupo requerido
              </span>
              <span className="font-mono text-slate-500">ID: {groupConfig.groupId}</span>
            </div>

            <div className="flex items-center gap-3.5">
              {groupConfig.groupIconUrl ? (
                <img
                  src={groupConfig.groupIconUrl}
                  alt={groupConfig.groupName}
                  className="w-14 h-14 rounded-xl object-cover border border-slate-700 bg-slate-800 shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-14 h-14 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                  <Users className="w-7 h-7" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-base text-white truncate">{groupConfig.groupName}</h4>
                <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                  {groupConfig.description || 'Comunidad oficial de creadores en Roblox'}
                </p>
                {groupConfig.memberCount !== undefined && groupConfig.memberCount > 0 && (
                  <span className="text-[11px] text-blue-400 font-medium mt-1 inline-block">
                    {groupConfig.memberCount.toLocaleString()} miembros activos
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Membership Error Message if check failed */}
          {membershipNotice && (
            <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">{membershipNotice}</p>
                <p className="text-[11px] text-red-400/80 mt-0.5">
                  Asegúrate de pulsar "Join Group" en roblox.com con la cuenta <strong>{authUser.username}</strong> y luego presiona "Ya me uní — Verificar".
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons: Join Group & Re-verify */}
          <div className="space-y-3 pt-2">
            {/* 1. Primary Action: Join Group */}
            <a
              href={groupConfig.groupUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.01]"
            >
              <span>UNIRME AL GRUPO DE ROBLOX</span>
              <ExternalLink className="w-4 h-4" />
            </a>

            {/* 2. Secondary Action: Verify Membership */}
            <button
              type="button"
              onClick={handleVerifyMembership}
              disabled={isCheckingMembership}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 font-semibold text-sm transition-all disabled:opacity-50"
            >
              {isCheckingMembership ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
                  <span>Verificando membresía con Roblox...</span>
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  <span>YA ME UNÍ — VERIFICAR ACCESO</span>
                </>
              )}
            </button>
          </div>

          {/* Bottom Settings Link for Admin */}
          {onOpenGroupConfig && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={onOpenGroupConfig}
                className="text-xs text-slate-500 hover:text-slate-400 transition-colors"
              >
                Cambiar ID o configuración del grupo
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 4. User is NOT Logged In -> Show Official Roblox Login Screen
  return (
    <div className="min-h-screen bg-[#080C14] text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Dynamic Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md bg-[#0E1322]/95 border border-slate-700/80 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-xl relative z-10 space-y-6">
        {/* Brand Banner */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 mx-auto flex items-center justify-center text-white shadow-lg shadow-blue-500/25 ring-1 ring-blue-400/40">
            <Shield className="w-7 h-7" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Acceso Oficial con Roblox</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              MAYKEL <span className="text-cyan-400 font-medium">Audio Uploader</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-sm mx-auto">
              Inicia sesión con tu cuenta de Roblox para verificar tu pertenencia al grupo oficial y habilitar las funciones de subida.
            </p>
          </div>
        </div>

        {/* Target Group Information */}
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Grupo Oficial Requerido</span>
            <h4 className="font-bold text-xs text-white truncate">{groupConfig.groupName}</h4>
          </div>
          <a
            href={groupConfig.groupUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Ver grupo en Roblox"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>

        {/* Login Error Notification */}
        {loginError && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2 animate-in fade-in duration-200">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{loginError}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Nombre de Usuario o User ID de Roblox
            </label>
            <div className="relative">
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="Ej: tu_usuario_roblox o 123456789"
                required
                className="w-full pl-3.5 pr-10 py-3 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                <KeyRound className="w-4 h-4" />
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Comprobaremos en tiempo real tu cuenta y la membresía al grupo oficial en la API de Roblox.
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.01]"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Verificando con Roblox...</span>
              </>
            ) : (
              <>
                <span>INICIAR SESIÓN CON ROBLOX</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-500">
          <span>Seguridad oficial Roblox</span>
          {onOpenGroupConfig && (
            <button
              type="button"
              onClick={onOpenGroupConfig}
              className="text-slate-400 hover:text-slate-300 hover:underline transition-colors"
            >
              Configurar grupo
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
