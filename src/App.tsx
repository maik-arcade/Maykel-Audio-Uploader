import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Header } from './components/Header';
import { RobloxAccountCard } from './components/RobloxAccountCard';
import { AudioSourceCard } from './components/AudioSourceCard';
import { AdvancedSettingsCard } from './components/AdvancedSettingsCard';
import { ProgressCard } from './components/ProgressCard';
import { ResultCard } from './components/ResultCard';
import { HistoryTable } from './components/HistoryTable';
import { AudioPreviewModal } from './components/AudioPreviewModal';
import { HelpModal } from './components/HelpModal';
import { ToastContainer, ToastMessage } from './components/Toast';
import {
  CreatorType,
  JobProgressEvent,
  SystemStatus,
  UploadHistoryItem,
  UploadSettings,
  RobloxProfile,
} from './types';
import {
  fetchHistory,
  fetchSystemStatus,
  clearHistory as apiClearHistory,
  startUploadJob,
  subscribeToJobEvents,
  requestAudioPreview,
  verifyRobloxAccount,
} from './services/api';

const STORAGE_KEYS = {
  CREATOR_TYPE: 'maykel_roblox_creator_type',
  CREATOR_ID: 'maykel_roblox_creator_id',
  API_KEY: 'maykel_roblox_api_key',
  PROFILE: 'maykel_roblox_profile',
};

export default function App() {
  // 1. Roblox account state
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

  // Load initial system status and history
  useEffect(() => {
    fetchSystemStatus()
      .then(setSystemStatus)
      .catch((err) => console.error('Status check failed:', err));

    loadHistoryData();
  }, []);

  const loadHistoryData = async () => {
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
        setVerifyError(null);
        setFormErrors({});

        // Persist to local storage
        localStorage.setItem(STORAGE_KEYS.CREATOR_TYPE, creatorType);
        localStorage.setItem(STORAGE_KEYS.CREATOR_ID, creatorId.trim());
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
      addToast(err.message || 'Error generando vista previa', 'error');
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // Convert & Upload to Roblox Handler
  const handleStartUpload = async () => {
    // 1. Validation
    const errors: { creatorId?: string; apiKey?: string } = {};
    if (!creatorId.trim()) {
      errors.creatorId = 'El ID de creador es obligatorio';
    }
    if (!apiKey.trim()) {
      errors.apiKey = 'La API Key de Roblox Open Cloud es obligatoria';
    }

    setFormErrors(errors);

    const hasAudio = selectedFile || (youtubeUrl && youtubeUrl.trim());
    if (!creatorId.trim() || !apiKey.trim() || !hasAudio) {
      addToast('Data incomplete: Completa las credenciales de Roblox y el audio', 'error');
      return;
    }

    setErrorMessage(null);
    setIsUploading(true);
    setLatestResult(null);

    try {
      const formData = new FormData();
      formData.append('creatorType', creatorType);
      formData.append('creatorId', creatorId.trim());
      formData.append('apiKey', apiKey.trim());
      formData.append('speed', settings.speed.toString());
      formData.append('amplification', settings.amplification.toString());
      formData.append('maxDuration', settings.maxDuration.toString());

      if (customTitle.trim()) {
        formData.append('customTitle', customTitle.trim());
      }

      if (detectedAudioInfo?.thumbnail) {
        formData.append('thumbnail', detectedAudioInfo.thumbnail);
      }
      if (detectedAudioInfo?.source) {
        formData.append('sourceType', detectedAudioInfo.source);
      }

      if (selectedFile) {
        formData.append('audioFile', selectedFile);
      } else if (youtubeUrl.trim()) {
        formData.append('youtubeUrl', youtubeUrl.trim());
      }

      const jobId = await startUploadJob(formData);

      // Subscribe to updates
      subscribeToJobEvents(
        jobId,
        (event) => {
          setCurrentJobEvent(event);

          if (event.status === 'completed' || event.status === 'rejected') {
            setIsUploading(false);
            setLatestResult(event);
            loadHistoryData();

            if (event.status === 'completed') {
              try {
                confetti({
                  particleCount: 80,
                  spread: 70,
                  origin: { y: 0.6 },
                });
              } catch {
                // ignore
              }
              addToast(`¡Upload completado! Asset ID: ${event.assetId || ''}`, 'success');
            } else if (event.status === 'rejected') {
              addToast('Audio rechazado por moderación de Roblox', 'error');
            }
          } else if (event.status === 'failed') {
            setIsUploading(false);
            setErrorMessage(event.error || 'Error al procesar o subir a Roblox');
            loadHistoryData();
          }
        },
        (err) => {
          setIsUploading(false);
          setErrorMessage(err.message || 'Error de conexión con el servidor.');
        }
      );
    } catch (err: any) {
      setIsUploading(false);
      setErrorMessage(err.message || 'Error al iniciar upload');
      addToast(err.message || 'Error al iniciar upload', 'error');
    }
  };

  const handleRetry = () => {
    setErrorMessage(null);
    setCurrentJobEvent(null);
    handleStartUpload();
  };

  const handleDismissError = () => {
    setErrorMessage(null);
    setCurrentJobEvent(null);
  };

  return (
    <div className="min-h-screen bg-[#080C14] text-slate-100 selection:bg-blue-600 selection:text-white pb-16">
      {/* Top Navigation / Brand Header */}
      <Header systemStatus={systemStatus} onOpenHelp={() => setIsHelpOpen(true)} />

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8 space-y-6">
        {/* Banner/Title Area */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/60 pb-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span>Panel de Conversión & Upload</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold bg-blue-600/20 text-blue-400 border border-blue-500/30">
                Roblox Creator
              </span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Convierte archivos de audio o YouTube aplicando velocidad, amplificación y súbelos directamente a Roblox.
            </p>
          </div>
        </div>

        {/* Success / Result Showcase Banner */}
        {latestResult && (
          <ResultCard
            jobEvent={latestResult}
            apiKey={apiKey}
            onDismiss={() => setLatestResult(null)}
            onShowToast={addToast}
            onModerationUpdated={loadHistoryData}
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
              currentJobEvent={currentJobEvent}
              errorMessage={errorMessage}
              onStartUpload={handleStartUpload}
              onRetry={handleRetry}
              onDismissError={handleDismissError}
              canUpload={!isUploading}
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

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
