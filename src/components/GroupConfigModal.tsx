import React, { useState, useEffect } from 'react';
import { X, Users, Save, ExternalLink, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { RobloxGroupConfig } from '../types';
import { updateGroupConfig } from '../services/api';

interface GroupConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: RobloxGroupConfig;
  onConfigUpdated: (newConfig: RobloxGroupConfig) => void;
  onShowToast: (msg: string, type: 'info' | 'error' | 'success') => void;
}

export const GroupConfigModal: React.FC<GroupConfigModalProps> = ({
  isOpen,
  onClose,
  currentConfig,
  onConfigUpdated,
  onShowToast,
}) => {
  const [groupId, setGroupId] = useState(currentConfig.groupId || '');
  const [groupName, setGroupName] = useState(currentConfig.groupName || '');
  const [groupUrl, setGroupUrl] = useState(currentConfig.groupUrl || '');
  const [isSaving, setIsSaving] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setGroupId(currentConfig.groupId || '');
      setGroupName(currentConfig.groupName || '');
      setGroupUrl(currentConfig.groupUrl || '');
      setPreviewError(null);
    }
  }, [isOpen, currentConfig]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = groupId.trim().replace(/[^\d]/g, '');
    if (!cleanId) {
      setPreviewError('El Group ID debe contener números.');
      return;
    }

    setIsSaving(true);
    setPreviewError(null);

    try {
      const updated = await updateGroupConfig({
        groupId: cleanId,
        groupName: groupName.trim(),
        groupUrl: groupUrl.trim() || `https://www.roblox.com/groups/${cleanId}`,
      });

      onConfigUpdated(updated);
      onShowToast(`Grupo actualizado: ${updated.groupName} (${updated.groupId})`, 'success');
      onClose();
    } catch (err: any) {
      setPreviewError(err.message || 'Error al actualizar la configuración del grupo');
      onShowToast(err.message || 'Error al guardar grupo', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#0E1322] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0B0F19]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Configuración del Grupo de Roblox</h3>
              <p className="text-xs text-slate-400">Grupo obligatorio para acceder al Uploader</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content & Form */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          {/* Current Live Badge */}
          <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center gap-3">
            {currentConfig.groupIconUrl ? (
              <img
                src={currentConfig.groupIconUrl}
                alt="Group Icon"
                className="w-12 h-12 rounded-xl object-cover border border-slate-700 bg-slate-800"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <Users className="w-6 h-6" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white truncate">{currentConfig.groupName}</span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  Activo
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                <span>ID: {currentConfig.groupId}</span>
                {currentConfig.memberCount !== undefined && currentConfig.memberCount > 0 && (
                  <>
                    <span>•</span>
                    <span>{currentConfig.memberCount.toLocaleString()} miembros</span>
                  </>
                )}
              </div>
            </div>
            <a
              href={currentConfig.groupUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Abrir grupo en Roblox"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          {previewError && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{previewError}</span>
            </div>
          )}

          {/* Group ID Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Roblox Group ID <span className="text-blue-400">*</span>
            </label>
            <input
              type="text"
              value={groupId}
              onChange={(e) => {
                const val = e.target.value;
                setGroupId(val);
                if (/^\d+$/.test(val.trim())) {
                  setGroupUrl(`https://www.roblox.com/groups/${val.trim()}`);
                }
              }}
              placeholder="Ej: 35083161"
              required
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Es el número identificador del grupo que aparece en el enlace de roblox.com/groups/<strong>ID</strong>
            </p>
          </div>

          {/* Group Name Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Nombre descriptivo del Grupo (Opcional)
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Ej: MAYKEL Official Community"
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>

          {/* Group URL Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
              Enlace directo del Grupo (URL)
            </label>
            <input
              type="url"
              value={groupUrl}
              onChange={(e) => setGroupUrl(e.target.value)}
              placeholder="https://www.roblox.com/groups/35083161"
              className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono text-xs"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium text-xs shadow-lg shadow-blue-600/30 transition-all"
            >
              {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>{isSaving ? 'Guardando...' : 'Guardar Configuración'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
