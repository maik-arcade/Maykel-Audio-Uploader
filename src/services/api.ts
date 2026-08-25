import { JobProgressEvent, SystemStatus, UploadHistoryItem, VerifyAccountResponse, CreatorType, ModerationCheckResponse, AudioInfo } from '../types';

export async function verifyRobloxAccount(
  creatorType: CreatorType,
  creatorId: string,
  apiKey: string
): Promise<VerifyAccountResponse> {
  const res = await fetch('/api/roblox/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ creatorType, creatorId, apiKey }),
  });

  const data = await res.json();
  if (!res.ok) {
    return {
      success: false,
      error: data.error || 'Error al verificar la cuenta de Roblox',
    };
  }
  return data;
}

export async function fetchSystemStatus(): Promise<SystemStatus> {
  const res = await fetch('/api/system-status');
  if (!res.ok) {
    throw new Error('No se pudo verificar el estado del servidor');
  }
  return res.json();
}

export async function fetchHistory(): Promise<UploadHistoryItem[]> {
  const res = await fetch('/api/history');
  if (!res.ok) {
    throw new Error('No se pudo obtener el historial');
  }
  return res.json();
}

export async function clearHistory(): Promise<void> {
  const res = await fetch('/api/history', { method: 'DELETE' });
  if (!res.ok) {
    throw new Error('No se pudo borrar el historial');
  }
}

export async function startUploadJob(formData: FormData): Promise<string> {
  const res = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Error al iniciar el proceso de upload');
  }

  return data.jobId;
}

export function subscribeToJobEvents(
  jobId: string,
  onEvent: (event: JobProgressEvent) => void,
  onError: (err: Error) => void
): () => void {
  // Use SSE with fallback to polling
  let eventSource: EventSource | null = null;
  let pollInterval: any = null;
  let isClosed = false;

  function cleanup() {
    isClosed = true;
    if (eventSource) {
      try {
        eventSource.close();
      } catch {}
      eventSource = null;
    }
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  }

  function startPolling() {
    if (isClosed || pollInterval) return;

    pollInterval = setInterval(async () => {
      if (isClosed) return;
      try {
        const res = await fetch(`/api/jobs/${encodeURIComponent(jobId)}`);
        if (!res.ok) {
          throw new Error('No se encontró el estado del trabajo');
        }
        const data: JobProgressEvent = await res.json();
        onEvent(data);
        if (data.status === 'completed' || data.status === 'rejected' || data.status === 'failed') {
          cleanup();
        }
      } catch (err: any) {
        if (!isClosed) {
          onError(err instanceof Error ? err : new Error(String(err)));
          cleanup();
        }
      }
    }, 1500);
  }

  try {
    if (typeof EventSource !== 'undefined') {
      const sseUrl = `${window.location.origin}/api/jobs/${encodeURIComponent(jobId)}/events`;
      eventSource = new EventSource(sseUrl);

      eventSource.onmessage = (e) => {
        try {
          const data: JobProgressEvent = JSON.parse(e.data);
          onEvent(data);
          if (data.status === 'completed' || data.status === 'rejected' || data.status === 'failed') {
            cleanup();
          }
        } catch (err) {
          console.error('Error parsing SSE event', err);
        }
      };

      eventSource.onerror = () => {
        if (eventSource) {
          try {
            eventSource.close();
          } catch {}
          eventSource = null;
        }
        startPolling();
      };
    } else {
      startPolling();
    }
  } catch {
    startPolling();
  }

  return cleanup;
}

export async function requestAudioPreview(formData: FormData): Promise<string> {
  const res = await fetch('/api/preview-audio', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Error al generar la vista previa del audio.');
  }

  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export async function checkRobloxModeration(params: {
  assetId: string;
  operationId?: string;
  apiKey?: string;
  historyId?: string;
}): Promise<ModerationCheckResponse> {
  const res = await fetch('/api/roblox/check-moderation', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'No se pudo verificar el estado de moderación');
  }
  return data;
}

export async function fetchAudioInfo(url: string): Promise<AudioInfo> {
  const res = await fetch('/api/audio-info', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'No se pudo obtener información del audio');
  }
  return data;
}

