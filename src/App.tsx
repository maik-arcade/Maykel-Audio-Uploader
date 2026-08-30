import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Header } from './components/Header';
import { RobloxAccountCard } from './components/RobloxAccountCard';
import { AudioSourceCard } from './components/AudioSourceCard';
import { AdvancedSettingsCard } from './components/AdvancedSettingsCard';
import { ProgressCard } from './components/ProgressCard';
import { ResultCard } from './components/ResultCard';
import { ManualUploadCard } from './components/ManualUploadCard';
import { HistoryTable } from './components/HistoryTable';
import { AudioPreviewModal } from './components/AudioPreviewModal';
import { HelpModal } from './components/HelpModal';
import { GroupConfigModal } from './components/GroupConfigModal';
import { RobloxAuthGate } from './components/RobloxAuthGate';
import { ToastContainer, ToastMessage } from './components/Toast';
import {
  CreatorType,
  JobProgressEvent,
  SystemStatus,
  UploadHistoryItem,
  UploadSettings,
  RobloxProfile,
  RobloxAuthUser,
  RobloxGroupConfig,
  RobloxGroupRole,
} from './types';
import {
  fetchHistory,
  fetchSystemStatus,
  clearHistory as apiClearHistory,
  startUploadJob,
  subscribeToJobEvents,
  requestAudioPreview,
  verifyRobloxAccount,
  fetchAuthSession,
  robloxLogout,
  cleanErrorMessage,
  downloadRobloxReadyAudio,
  saveLocalHistoryItem,
} from './services/api';

const STORAGE_KEYS = {
  CREATOR_TYPE: 'maykel_roblox_creator_type',
  CREATOR_ID: 'maykel_roblox_creator_id',
  API_KEY: 'maykel_roblox_api_key',
  PROFILE: 'maykel_roblox_profile',
};

const DEFAULT_GROUP_CONFIG: RobloxGroupConfig = {
  groupId: '52917562',
  groupName: "Maykel's Studio",
  groupUrl: 'https://www.roblox.com/share/g/52917562',
};

export default function App() {
  // 0. Mandatory Roblox Authentication & Group Gate State
  const [authUser, setAuthUser] = useState<RobloxAuthUser | null>(null);
  const [isGroupMember, setIsGroupMember] = useState<boolean>(false);
  const [groupRole, setGroupRole] = useState<RobloxGroupRole | null>(null);
  const [groupConfig, setGroupConfig] = useState<RobloxGroupConfig>(DEFAULT_GROUP_CONFIG);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState<boolean>(false);

  // 1. Roblox Open Cloud account state (for API key upload)
  const [creatorType, setCreatorType] = useState<CreatorType>(() => {
    return (localStorage.getItem(STORAGE_KEYS.CREATOR_TYPE) as CreatorType) || 'User';
  });
  const [creatorId, setCreatorId] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.CREATOR_ID) || '';
  });
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.API_KEY) || '';
  });

  const [verifiedProfile, setVerifiedProfile] = useState<RobloxProfile | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PROFILE);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<{ creatorId?: string; apiKey?: string }>({});

  // 2. Audio source state
  const [youtubeUrl, setYoutubeUrl] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [customTitle, setCustomTitle] = useState<string>('');
  const [detectedAudioInfo, setDetectedAudioInfo] = useState<any>(null);

  // 3. Audio transformation settings
  const [settings, setSettings] = useState<UploadSettings>({
    speed: 2.33,
    amplification: -4,
    maxDuration: 400,
  });

  // 4. Job & Upload state
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [manualDownloadResult, setManualDownloadResult] = useState<{
    fileName: string;
    fileSizeBytes?: number;
    speed: number;
    amplification: number;
    customTitle?: string;
    downloadUrl?: string;
    blobUrl?: string;
    blob?: Blob;
  } | null>(null);
  const [currentJobEvent, setCurrentJobEvent] = useState<JobProgressEvent | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [latestResult, setLatestResult] = useState<JobProgressEvent | null>(null);

  // 5. Preview state
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false);

  // 6. System & History state
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [history, setHistory] = useState<UploadHistoryItem[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState<boolean>(false);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);

  // 7. Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (text: string, type: 'info' | 'error' | 'success' = 'info') => {
    const id = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Initial Auth & Session Verification
  useEffect(() => {
    async function initAuth() {
      setIsAuthLoading(true);
      try {
        const session = await fetchAuthSession();
        if (session.groupConfig) {
          setGroupConfig(session.groupConfig);
        }
        if (session.authenticated && session.user) {
          setAuthUser(session.user);
          setIsGroupMember(!!session.isGroupMember);
          setGroupRole(session.groupRole || null);

          // If creatorId is empty, auto populate with user id
          if (!creatorId) {
            setCreatorId(session.user.id);
            localStorage.setItem(STORAGE_KEYS.CREATOR_ID, session.user.id);
          }
        }
      } catch (err) {
        console.error('Failed to fetch auth session:', err);
      } finally {
        setIsAuthLoading(false);
      }
    }

    initAuth();
  }, []);

  // When user is a verified group member, load system status and history
  useEffect(() => {
    if (authUser && isGroupMember) {
      fetchSystemStatus()
        .then(setSystemStatus)
        .catch((err) => console.error('Status check failed:', err));

      loadHistoryData();
    }
  }, [authUser, isGroupMember]);

  const loadHistoryData = async () => {
    if (!authUser || !isGroupMember) return;
    setIsHistoryLoading(true);
    try {
      const list = await fetchHistory();
      setHistory(list);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const handleAuthSuccess = (user: RobloxAuthUser, isMember: boolean, role?: RobloxGroupRole | null) => {
    setAuthUser(user);
    setIsGroupMember(isMember);
    setGroupRole(role || null);

    if (!creatorId) {
      setCreatorId(user.id);
      localStorage.setItem(STORAGE_KEYS.CREATOR_ID, user.id);
    }
  };

  const handleLogout = async () => {
    await robloxLogout();
    setAuthUser(null);
    setIsGroupMember(false);
    setGroupRole(null);
    addToast('Sesión de Roblox cerrada', 'info');
  };

  // Roblox Account Verification & Save Handler
  const handleVerifyAndSave = async () => {
    const errors: { creatorId?: string; apiKey?: string } = {};
    if (!creatorId.trim()) {
      errors.creatorId = `El ${creatorType === 'User' ? 'User ID' : 'Group ID'} es obligatorio`;
    }
    if (!apiKey.trim()) {
      errors.apiKey = 'La clave API de Roblox Open Cloud es obligatoria';
    }

    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      setVerifyError('Por favor completa todos los campos requeridos.');
      return;
    }

    setIsVerifying(true);
    setVerifyError(null);

    try {
      const response = await verifyRobloxAccount(creatorType, creatorId.trim(), apiKey.trim());

      if (response.success && response.profile) {
        setVerifiedProfile(response.profile);
        setCreatorId(response.profile.id);
        setVerifyError(null);
        setFormErrors({});

        // Persist to local storage
        localStorage.setItem(STORAGE_KEYS.CREATOR_TYPE, creatorType);
        localStorage.setItem(STORAGE_KEYS.CREATOR_ID, response.profile.id);
        localStorage.setItem(STORAGE_KEYS.API_KEY, apiKey.trim());
        localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(response.profile));

        addToast(
          `¡Cuenta verificada! Conectado como ${response.profile.displayName || response.profile.name}`,
          'success'
        );
      } else {
        const errMsg = response.error || 'No se pudo verificar la cuenta de Roblox';
        setVerifyError(errMsg);
        addToast(errMsg, 'error');
      }
    } catch (err: any) {
      const errMsg = err.message || 'Error de conexión al verificar con Roblox';
      setVerifyError(errMsg);
      addToast(errMsg, 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  // Unlink Roblox Account Handler
  const handleUnlinkAccount = () => {
    if (window.confirm('¿Estás seguro de que deseas desvincular esta cuenta de Roblox?')) {
      setVerifiedProfile(null);
      setVerifyError(null);
      localStorage.removeItem(STORAGE_KEYS.PROFILE);
      localStorage.removeItem(STORAGE_KEYS.API_KEY);
      localStorage.removeItem(STORAGE_KEYS.CREATOR_ID);
      setApiKey('');
      setCreatorId('');
      addToast('Cuenta de Roblox desvinculada', 'info');
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm('¿Estás seguro de que deseas vaciar el historial de uploads?')) return;
    try {
      await apiClearHistory();
      setHistory([]);
      addToast('Historial vaciado correctamente', 'success');
    } catch (err: any) {
      addToast(err.message || 'Error al vaciar historial', 'error');
    }
  };

  // Audio Preview generator
  const handleOpenPreview = async () => {
    const hasAudio = selectedFile || (youtubeUrl && youtubeUrl.trim());
    if (!hasAudio) {
      addToast('Data incomplete: Selecciona un archivo o ingresa enlace de YouTube para previsualizar.', 'error');
      return;
    }

    setIsPreviewLoading(true);
    try {
      const formData = new FormData();
      if (selectedFile) {
        formData.append('audioFile', selectedFile);
      } else if (youtubeUrl) {
        formData.append('youtubeUrl', youtubeUrl.trim());
      }

      formData.append('speed', settings.speed.toString());
      formData.append('amplification', settings.amplification.toString());
      formData.append('maxDuration', settings.maxDuration.toString());

      const url = await requestAudioPreview(formData);
      setPreviewAudioUrl(url);
      setIsPreviewModalOpen(true);
    } catch (err: any) {
      addToast(err.message || 'Error al generar la vista previa', 'error');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // Start Manual Download Flow (100% Reliable Roblox Upload Alternative)
  const handleStartDownload = async () => {
    const hasAudio = selectedFile || (youtubeUrl && youtubeUrl.trim());
    if (!hasAudio) {
      setErrorMessage('Debes seleccionar un archivo de audio o ingresar un enlace de YouTube antes de descargar.');
      addToast('Falta el archivo o enlace de audio', 'error');
      return;
    }

    setIsDownloading(true);
    setErrorMessage(null);

    try {
      const result = await downloadRobloxReadyAudio({
        audioFile: selectedFile,
        youtubeUrl: youtubeUrl.trim(),
        speed: settings.speed,
        amplification: settings.amplification,
        maxDuration: settings.maxDuration,
        customTitle: customTitle.trim(),
      });

      setManualDownloadResult({
        fileName: result.fileName,
        fileSizeBytes: result.sizeBytes,
        speed: settings.speed,
        amplification: settings.amplification,
        customTitle: customTitle.trim(),
        downloadUrl: result.downloadUrl,
        blobUrl: result.blobUrl,
        blob: result.blob,
      });

      // Save item in history as a downloaded audio ready for manual upload
      const historyItem: UploadHistoryItem = {
        id: `download_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        timestamp: Date.now(),
        displayName: customTitle.trim() || result.fileName.replace(/\.mp3$/i, ''),
        sourceType: selectedFile ? 'file' : detectedAudioInfo?.source || 'youtube',
        sourceUrl: youtubeUrl || undefined,
        thumbnail: detectedAudioInfo?.thumbnail || undefined,
        creatorType: creatorType,
        creatorId: creatorId || (authUser ? authUser.id : 'Manual'),
        speed: settings.speed,
        amplification: settings.amplification,
        maxDuration: settings.maxDuration,
        status: 'Completed',
        assetId: 'Descarga Manual',
        moderationState: 'MODERATION_STATE_APPROVED',
      };
      saveLocalHistoryItem(historyItem);
      loadHistoryData();

      addToast(`✓ ¡Audio descargado! Listo para subir a Roblox`, 'success');
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {}
    } catch (err: any) {
      const msg = cleanErrorMessage(err.message || 'Error al procesar la descarga del audio');
      setErrorMessage(msg);
      addToast(msg, 'error');
    } finally {
      setIsDownloading(false);
    }
  };

  // Start Upload Flow
  const handleStartUpload = async () => {
    const errors: { creatorId?: string; apiKey?: string } = {};
    if (!creatorId.trim()) errors.creatorId = 'ID de creador obligatorio';
    if (!apiKey.trim()) errors.apiKey = 'Clave API de Roblox obligatoria';

    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      setErrorMessage('Por favor configura y verifica tu cuenta de Roblox con tu clave API antes de subir.');
      addToast('Faltan credenciales de Roblox', 'error');
      return;
    }

    const hasAudio = selectedFile || (youtubeUrl && youtubeUrl.trim());
    if (!hasAudio) {
      setErrorMessage('Data incomplete: Debes seleccionar un archivo de audio o ingresar un enlace de YouTube.');
      addToast('Falta el archivo o enlace de audio', 'error');
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    setLatestResult(null);

    try {
      const formData = new FormData();
      formData.append('creatorType', creatorType);
      formData.append('creatorId', creatorId.trim());
      formData.append('apiKey', apiKey.trim());

      if (selectedFile) {
        formData.append('audioFile', selectedFile);
      } else if (youtubeUrl) {
        formData.append('youtubeUrl', youtubeUrl.trim());
      }

      if (customTitle.trim()) {
        formData.append('customTitle', customTitle.trim());
      }

      formData.append('speed', settings.speed.toString());
      formData.append('amplification', settings.amplification.toString());
      formData.append('maxDuration', settings.maxDuration.toString());

      const jobId = await startUploadJob(formData);

      setCurrentJobEvent({
        jobId,
        status: 'queued',
        progress: 5,
        message: 'Iniciando trabajo...',
      });

      const unsubscribe = subscribeToJobEvents(
        jobId,
        (event) => {
          setCurrentJobEvent(event);

          if (event.status === 'completed') {
            setIsUploading(false);
            setLatestResult(event);
            loadHistoryData();
            addToast(`¡Subida completada con éxito! Asset ID: ${event.assetId}`, 'success');

            try {
              confetti({
                particleCount: 80,
                spread: 70,
                origin: { y: 0.6 },
              });
            } catch {}
          } else if (event.status === 'rejected') {
            setIsUploading(false);
            setLatestResult(event);
            const msg = cleanErrorMessage(`El audio fue rechazado por Roblox: ${event.details || event.message}`);
            setErrorMessage(msg);
            loadHistoryData();
            addToast('El audio fue bloqueado por moderación de Roblox', 'error');
          } else if (event.status === 'failed') {
            setIsUploading(false);
            const msg = cleanErrorMessage(event.error || event.message || 'Error en el procesamiento del audio');
            setErrorMessage(msg);
            addToast(msg, 'error');
          }
        },
        (err) => {
          setIsUploading(false);
          const msg = cleanErrorMessage(err.message || 'Error de conexión durante el seguimiento del trabajo');
          setErrorMessage(msg);
          addToast(msg, 'error');
        }
      );
    } catch (err: any) {
      setIsUploading(false);
      const msg = cleanErrorMessage(err.message || 'Error al iniciar la subida');
      setErrorMessage(msg);
      addToast(msg, 'error');
    }
  };

  const handleRetry = () => {
    handleStartUpload();
  };

  const handleDismissError = () => {
    setErrorMessage(null);
    setCurrentJobEvent(null);
  };

  return (
    <RobloxAuthGate
      authUser={authUser}
      isGroupMember={isGroupMember}
      groupRole={groupRole}
      groupConfig={groupConfig}
      isLoading={isAuthLoading}
      onAuthSuccess={handleAuthSuccess}
      onLogout={handleLogout}
      onShowToast={addToast}
      onOpenGroupConfig={() => setIsGroupModalOpen(true)}
    >
      <div className="min-h-screen bg-[#080C14] text-slate-100 flex flex-col font-sans selection:bg-blue-500 selection:text-white pb-16">
        {/* Top Navbar */}
        <Header
          systemStatus={systemStatus}
          onOpenHelp={() => setIsHelpOpen(true)}
          authUser={authUser}
          isGroupMember={isGroupMember}
          groupRole={groupRole}
          groupConfig={groupConfig}
          onOpenGroupConfig={() => setIsGroupModalOpen(true)}
          onLogout={handleLogout}
        />

        {/* Main App Container */}
        <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
          {/* Hero Section Banner */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-900/20 via-slate-900/40 to-slate-900/20 border border-blue-500/20 backdrop-blur-sm">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <span>Panel de Conversión & Upload</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-blue-600/20 text-blue-400 border border-blue-500/30">
                  Roblox Creator
                </span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Convierte archivos de audio o enlaces aplicando velocidad y súbelos directamente a Roblox.
              </p>
            </div>
          </div>

          {/* Success / Result Showcase Banner (Automated Roblox Upload) */}
          {latestResult && (
            <ResultCard
              jobEvent={latestResult}
              apiKey={apiKey}
              onDismiss={() => setLatestResult(null)}
              onShowToast={addToast}
              onModerationUpdated={loadHistoryData}
            />
          )}

          {/* Manual Download Result Showcase Banner (Direct MP3 & Roblox Creator Hub) */}
          {manualDownloadResult && (
            <ManualUploadCard
              fileName={manualDownloadResult.fileName}
              fileSizeBytes={manualDownloadResult.fileSizeBytes}
              speed={manualDownloadResult.speed}
              amplification={manualDownloadResult.amplification}
              customTitle={manualDownloadResult.customTitle}
              downloadUrl={manualDownloadResult.downloadUrl}
              blobUrl={manualDownloadResult.blobUrl}
              blob={manualDownloadResult.blob}
              onDismiss={() => setManualDownloadResult(null)}
              onReDownload={handleStartDownload}
              onShowToast={addToast}
            />
          )}

          {/* Dashboard Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column: Roblox Account & Audio Input */}
            <div className="space-y-6">
              <RobloxAccountCard
                creatorType={creatorType}
                onCreatorTypeChange={(type) => {
                  setCreatorType(type);
                  localStorage.setItem(STORAGE_KEYS.CREATOR_TYPE, type);
                }}
                creatorId={creatorId}
                onCreatorIdChange={(id) => {
                  setCreatorId(id);
                  localStorage.setItem(STORAGE_KEYS.CREATOR_ID, id);
                }}
                apiKey={apiKey}
                onApiKeyChange={(key) => {
                  setApiKey(key);
                  localStorage.setItem(STORAGE_KEYS.API_KEY, key);
                }}
                verifiedProfile={verifiedProfile}
                onVerifyAndSave={handleVerifyAndSave}
                onUnlinkAccount={handleUnlinkAccount}
                isVerifying={isVerifying}
                verifyError={verifyError}
                errors={formErrors}
                onShowToast={addToast}
              />

              <AudioSourceCard
                youtubeUrl={youtubeUrl}
                onYoutubeUrlChange={setYoutubeUrl}
                selectedFile={selectedFile}
                onFileSelect={setSelectedFile}
                customTitle={customTitle}
                onCustomTitleChange={setCustomTitle}
                settings={settings}
                onShowToast={addToast}
                onDetectedInfoChange={setDetectedAudioInfo}
                onDownloadAudio={handleStartDownload}
                isDownloading={isDownloading}
              />
            </div>

            {/* Right Column: Advanced Settings & Main Action */}
            <div className="space-y-6">
              <AdvancedSettingsCard
                settings={settings}
                onSettingsChange={setSettings}
                onOpenPreview={handleOpenPreview}
                hasAudioSource={!!selectedFile || (!!youtubeUrl && youtubeUrl.trim().length > 0)}
                isPreviewLoading={isPreviewLoading}
              />

              <ProgressCard
                isUploading={isUploading}
                isDownloading={isDownloading}
                currentJobEvent={currentJobEvent}
                errorMessage={errorMessage}
                onStartUpload={handleStartUpload}
                onStartDownload={handleStartDownload}
                onRetry={handleRetry}
                onDismissError={handleDismissError}
                canUpload={!isUploading && !isDownloading}
              />
            </div>
          </div>

          {/* History Section */}
          <div className="pt-2">
            <HistoryTable
              history={history}
              apiKey={apiKey}
              onClearHistory={handleClearHistory}
              onShowToast={addToast}
              onReloadHistory={loadHistoryData}
              isLoading={isHistoryLoading}
            />
          </div>
        </main>

        {/* Audio Preview Modal */}
        <AudioPreviewModal
          isOpen={isPreviewModalOpen}
          onClose={() => {
            setIsPreviewModalOpen(false);
            if (previewAudioUrl) {
              URL.revokeObjectURL(previewAudioUrl);
              setPreviewAudioUrl(null);
            }
          }}
          audioUrl={previewAudioUrl}
          speed={settings.speed}
          amplification={settings.amplification}
          maxDuration={settings.maxDuration}
          title={customTitle || (selectedFile ? selectedFile.name : 'Audio YouTube')}
        />

        {/* Help Modal */}
        <HelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />

        {/* Group Configuration Modal */}
        <GroupConfigModal
          isOpen={isGroupModalOpen}
          onClose={() => setIsGroupModalOpen(false)}
          currentConfig={groupConfig}
          onConfigUpdated={(newConfig) => {
            setGroupConfig(newConfig);
          }}
          onShowToast={addToast}
        />

        {/* Toast notifications */}
        <ToastContainer toasts={toasts} onDismiss={removeToast} />
      </div>
    </RobloxAuthGate>
  );
}
