import React, { useState } from 'react';
import {
  User,
  Users,
  KeyRound,
  Eye,
  EyeOff,
  ShieldCheck,
  Info,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Edit3,
  LogOut,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';
import { CreatorType, RobloxProfile } from '../types';

interface RobloxAccountCardProps {
  creatorType: CreatorType;
  onCreatorTypeChange: (type: CreatorType) => void;
  creatorId: string;
  onCreatorIdChange: (id: string) => void;
  apiKey: string;
  onApiKeyChange: (key: string) => void;
  verifiedProfile: RobloxProfile | null;
  onVerifyAndSave: () => Promise<void>;
  onUnlinkAccount: () => void;
  isVerifying: boolean;
  verifyError: string | null;
  errors?: {
    creatorId?: string;
    apiKey?: string;
  };
  onShowToast?: (text: string, type?: 'info' | 'error' | 'success') => void;
}

export const RobloxAccountCard: React.FC<RobloxAccountCardProps> = ({
  creatorType,
  onCreatorTypeChange,
  creatorId,
  onCreatorIdChange,
  apiKey,
  onApiKeyChange,
  verifiedProfile,
  onVerifyAndSave,
  onUnlinkAccount,
  isVerifying,
  verifyError,
  errors,
  onShowToast,
}) => {
  const [showApiKey, setShowApiKey] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const errMap = errors || {};

  const handleCopyId = (idToCopy: string) => {
    navigator.clipboard.writeText(idToCopy);
    setCopiedId(true);
    if (onShowToast) onShowToast('ID copiado al portapapeles', 'success');
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleSaveClick = async (e: React.FormEvent) => {
    e.preventDefault();
    await onVerifyAndSave();
    // if verified, exit editing mode
    if (verifiedProfile) {
      setIsEditing(false);
    }
  };

  // ================= VIEW: LINKED ACCOUNT PROFILE =================
  if (verifiedProfile && !isEditing) {
    const robloxProfileUrl =
      verifiedProfile.creatorType === 'User'
        ? `https://www.roblox.com/users/${verifiedProfile.id}/profile`
        : `https://www.roblox.com/groups/${verifiedProfile.id}`;

    return (
      <div
        id="roblox-account-linked-card"
        className="bg-gradient-to-b from-[#141F33] to-[#0E1626] border border-blue-500/30 rounded-2xl p-5 sm:p-6 shadow-2xl shadow-blue-950/40 relative overflow-hidden transition-all"
      >
        {/* Glow accent */}
        <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top bar with ROBLOX ACCOUNT & Linked status */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <span className="text-xs font-black tracking-widest text-slate-300 uppercase">
              ROBLOX ACCOUNT
            </span>
          </div>

          {/* Status Badge: Linked */}
          <div
            id="roblox-account-linked-badge"
            className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-bold shadow-sm shadow-emerald-500/10"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>Linked.</span>
          </div>
        </div>

        {/* Profile Content */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5">
          {/* Avatar Thumbnail */}
          <div className="relative group">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-[#080C14] border-2 border-blue-500/40 p-1 shadow-lg shadow-blue-500/10 overflow-hidden flex items-center justify-center">
              {verifiedProfile.avatarUrl ? (
                <img
                  src={verifiedProfile.avatarUrl}
                  alt={verifiedProfile.name}
                  className="w-full h-full object-cover rounded-xl"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <User className="w-10 h-10 text-slate-500" />
              )}
            </div>
            {verifiedProfile.isVerified && (
              <div
                className="absolute -bottom-1 -right-1 bg-blue-500 text-white p-1 rounded-full border-2 border-[#121A2A]"
                title="Verificado en Roblox"
              >
                <Check className="w-3 h-3 stroke-[3]" />
              </div>
            )}
          </div>

          {/* Account Details */}
          <div className="flex-1 text-center sm:text-left min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
              <h3
                id="roblox-profile-username"
                className="text-xl sm:text-2xl font-black text-white tracking-tight truncate"
              >
                {verifiedProfile.displayName || verifiedProfile.name}
              </h3>
              {verifiedProfile.displayName && verifiedProfile.displayName !== verifiedProfile.name && (
                <span className="text-xs font-semibold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-700/50 inline-block self-center sm:self-auto">
                  @{verifiedProfile.name}
                </span>
              )}
            </div>

            {/* Creator Type & ID badge */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-blue-600/20 text-blue-300 border border-blue-500/30 rounded-lg text-xs font-medium">
                {verifiedProfile.creatorType === 'User' ? (
                  <>
                    <User className="w-3 h-3" />
                    <span>User ID: {verifiedProfile.id}</span>
                  </>
                ) : (
                  <>
                    <Users className="w-3 h-3" />
                    <span>Group ID: {verifiedProfile.id}</span>
                  </>
                )}
              </span>

              <button
                type="button"
                id="copy-roblox-id-btn"
                onClick={() => handleCopyId(verifiedProfile.id)}
                className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition-colors text-xs inline-flex items-center gap-1"
                title="Copiar ID"
              >
                {copiedId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>

              <a
                href={robloxProfileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-400 hover:text-blue-400 p-1 rounded-md hover:bg-slate-800 transition-colors inline-flex items-center"
                title="Ver en Roblox"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            {/* API Key Status line */}
            <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-center sm:justify-start gap-2 text-xs text-slate-400">
              <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
              <span>API Key: <code className="font-mono text-emerald-300 font-medium">••••••••••••{apiKey ? apiKey.slice(-4) : ''}</code></span>
              <span className="text-[10px] text-emerald-400/80 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 font-semibold">
                Activa
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between gap-3">
          <button
            type="button"
            id="edit-roblox-account-btn"
            onClick={() => setIsEditing(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800/90 hover:bg-slate-700/90 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-all shadow-sm"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Editar Credenciales</span>
          </button>

          <button
            type="button"
            id="unlink-roblox-account-btn"
            onClick={onUnlinkAccount}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold rounded-xl border border-rose-500/30 transition-all"
            title="Desvincular cuenta de Roblox"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Desvincular</span>
          </button>
        </div>
      </div>
    );
  }

  // ================= VIEW: FORM TO INPUT & VERIFY ACCOUNT =================
  return (
    <div className="bg-[#121A2A] border border-slate-800/90 rounded-2xl p-5 sm:p-6 shadow-xl shadow-black/30 transition-all hover:border-slate-700/80">
      {/* Section Title */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
              Cuenta Roblox
            </h2>
            <p className="text-xs text-slate-400">
              Ingresa tu ID y API Key para verificar y vincular tu cuenta
            </p>
          </div>
        </div>
        <span className="text-[11px] font-medium text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700/50">
          Open Cloud v1
        </span>
      </div>

      {/* Error Banner if verification failed */}
      {verifyError && (
        <div
          id="roblox-verify-error-banner"
          className="mb-5 p-3.5 bg-rose-500/10 border border-rose-500/40 rounded-xl flex items-start gap-3 text-rose-300 text-xs animate-in fade-in duration-200"
        >
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold text-rose-200 mb-0.5">Error al vincular cuenta de Roblox</p>
            <p className="leading-relaxed text-rose-300/90">{verifyError}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSaveClick} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Creator Type Selector */}
          <div className="md:col-span-4">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Tipo de Creador
            </label>
            <div className="grid grid-cols-2 gap-2 bg-[#0A0E17] p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                id="creator-type-user-btn"
                onClick={() => onCreatorTypeChange('User')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                  creatorType === 'User'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>User</span>
              </button>
              <button
                type="button"
                id="creator-type-group-btn"
                onClick={() => onCreatorTypeChange('Group')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-semibold transition-all ${
                  creatorType === 'Group'
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Group</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5 flex items-center gap-1">
              <Info className="w-3 h-3" />
              <span>{creatorType === 'User' ? 'Sube a tu perfil de Roblox' : 'Sube al catálogo del grupo'}</span>
            </p>
          </div>

          {/* User / Group ID */}
          <div className="md:col-span-8">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              {creatorType === 'User' ? 'User ID' : 'Group ID'} <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                {creatorType === 'User' ? <User className="w-4 h-4" /> : <Users className="w-4 h-4" />}
              </div>
              <input
                type="text"
                id="creator-id-input"
                placeholder={creatorType === 'User' ? 'Ej: 5112225927 o tu usuario / enlace' : 'Ej: 52917562 o enlace del grupo'}
                value={creatorId}
                onChange={(e) => {
                  const raw = e.target.value;
                  // If pasted URL, extract ID immediately for convenience
                  const urlMatch = raw.match(/roblox\.com\/(?:users|groups|share\/g)\/(\d+)/i);
                  if (urlMatch) {
                    onCreatorIdChange(urlMatch[1]);
                  } else {
                    onCreatorIdChange(raw.trim());
                  }
                }}
                className={`w-full pl-10 pr-4 py-2.5 bg-[#0A0E17] border rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all ${
                  errMap.creatorId ? 'border-rose-500/80 bg-rose-500/5' : 'border-slate-800 focus:border-blue-500'
                }`}
              />
            </div>
            {errMap.creatorId ? (
              <p className="text-[11px] text-rose-400 font-medium mt-1">{errMap.creatorId}</p>
            ) : (
              <p className="text-[11px] text-slate-500 mt-1">
                {creatorType === 'User' 
                  ? 'Ingresa tu User ID numérico, tu nombre de usuario o pega tu enlace de perfil.' 
                  : 'Ingresa el Group ID numérico o pega el enlace del grupo.'}
              </p>
            )}
          </div>

          {/* Open Cloud API Key */}
          <div className="md:col-span-12">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Open Cloud API Key <span className="text-rose-400">*</span>
              </label>
              <span className="text-[11px] text-emerald-400/90 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Protegido por backend</span>
              </span>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <input
                type={showApiKey ? 'text' : 'password'}
                id="roblox-api-key-input"
                placeholder="roblox_api_key_..."
                value={apiKey}
                onChange={(e) => onApiKeyChange(e.target.value)}
                className={`w-full pl-10 pr-11 py-2.5 bg-[#0A0E17] border rounded-xl text-sm font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all ${
                  errMap.apiKey ? 'border-rose-500/80 bg-rose-500/5' : 'border-slate-800 focus:border-blue-500'
                }`}
                autoComplete="off"
                spellCheck="false"
              />
              <button
                type="button"
                id="toggle-api-key-visibility-btn"
                onClick={() => setShowApiKey(!showApiKey)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition-colors"
                title={showApiKey ? 'Ocultar API Key' : 'Mostrar API Key'}
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errMap.apiKey ? (
              <p className="text-[11px] text-rose-400 font-medium mt-1">{errMap.apiKey}</p>
            ) : (
              <p className="text-[11px] text-slate-500 mt-1">
                Generada en Roblox Creator Hub con permiso <code>Asset: Read & Write</code>
              </p>
            )}
          </div>
        </div>

        {/* Submit / Save Button */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
          {isEditing && verifiedProfile && (
            <button
              type="button"
              id="cancel-edit-roblox-account-btn"
              onClick={() => setIsEditing(false)}
              className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition-colors"
            >
              Cancelar
            </button>
          )}

          <button
            type="submit"
            id="save-roblox-account-btn"
            disabled={isVerifying || !creatorId.trim() || !apiKey.trim()}
            className={`w-full ${isEditing && verifiedProfile ? 'sm:w-auto' : ''} ml-auto flex items-center justify-center gap-2 py-2.5 px-6 rounded-xl font-bold text-xs sm:text-sm text-white shadow-lg transition-all ${
              isVerifying || !creatorId.trim() || !apiKey.trim()
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/30 hover:shadow-blue-500/40 active:scale-[0.99]'
            }`}
          >
            {isVerifying ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin text-white" />
                <span>Verificando con Roblox...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Guardar y Vincular Cuenta</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
