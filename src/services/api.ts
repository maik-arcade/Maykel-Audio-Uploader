import {
  JobProgressEvent,
  SystemStatus,
  UploadHistoryItem,
  VerifyAccountResponse,
  CreatorType,
  ModerationCheckResponse,
  AudioInfo,
  RobloxAuthResponse,
  RobloxGroupConfig,
  RobloxAuthUser,
  RobloxGroupRole,
} from '../types';

const AUTH_TOKEN_KEY = 'maykel_roblox_auth_token';

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string): void {
  try {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  } catch {}
}

export function removeAuthToken(): void {
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {}
}

function getAuthHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  const token = getAuthToken();
  const headers: Record<string, string> = { ...extraHeaders };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// 1. Roblox Authentication & Group Check
export async function robloxLogin(usernameOrId: string): Promise<RobloxAuthResponse> {
  const res = await fetch('/api/roblox/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usernameOrId }),
  });

  const data = await res.json();
  if (!res.ok) {
    return {
      success: false,
      error: data.error || 'Error al conectar con Roblox',
    };
  }

  if (data.token) {
    setAuthToken(data.token);
  }

  return data;
}

export async function verifyGroupMembership(userId?: string): Promise<RobloxAuthResponse> {
  const res = await fetch('/api/roblox/auth/verify-membership', {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ userId }),
  });

  const data = await res.json();
  if (!res.ok) {
    return {
      success: false,
      error: data.error || 'Error al verificar pertenencia al grupo en Roblox',
    };
  }

  if (data.token) {
    setAuthToken(data.token);
  }

  return data;
}

export async function fetchAuthSession(): Promise<{
  success: boolean;
  authenticated: boolean;
  user?: RobloxAuthUser;
  isGroupMember?: boolean;
  groupRole?: RobloxGroupRole | null;
  groupConfig: RobloxGroupConfig;
}> {
  const res = await fetch('/api/roblox/auth/session', {
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    return {
      success: false,
      authenticated: false,
      groupConfig: {
        groupId: '35083161',
        groupName: 'MAYKEL Official Community',
        groupUrl: 'https://www.roblox.com/groups/35083161',
      },
    };
  }

  return res.json();
}

export async function robloxLogout(): Promise<void> {
  try {
    await fetch('/api/roblox/auth/logout', {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  } catch {}
  removeAuthToken();
}

export async function fetchGroupConfig(): Promise<RobloxGroupConfig> {
  const res = await fetch('/api/roblox/group-config');
  if (!res.ok) {
    throw new Error('Error al cargar configuración del grupo');
  }
  const data = await res.json();
  return data.config;
}

export async function updateGroupConfig(updates: Partial<RobloxGroupConfig>): Promise<RobloxGroupConfig> {
  const res = await fetch('/api/roblox/group-config', {
    method: 'POST',
    headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(updates),
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error || 'Error al guardar la configuración del grupo');
  }
  return data.config;
}

// 2. Roblox Account (Open Cloud API Key) Verification
export async function verifyRobloxAccount(
  creatorType: CreatorType,
  creatorId: string,
  apiKey: string
): Promise<VerifyAccountResponse> {
  const res = await fetch('/api/roblox/verify', {
    method: 'POST',
    headers: getAuthHeaders({
      'Content-Type': 'application/json',
    }),
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
  const res = await fetch('/api/history', {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      throw new Error('Debes ser miembro del grupo de Roblox para ver el historial');
    }
    throw new Error('No se pudo obtener el historial');
  }
  return res.json();
}

export async function clearHistory(): Promise<void> {
  const res = await fetch('/api/history', {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error('No se pudo borrar el historial');
  }
}

export async function startUploadJob(formData: FormData): Promise<string> {
  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || 'Error al iniciar el proceso de upload');
  }

  return data.jobId;
}

export function subscribeToJobEvents(
  jobId: string,
  onEvent: (event: JobProgressEvent) => void,
  onError: (err: Error) => void
): () => void {
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

  const token = getAuthToken();

  function startPolling() {
    if (isClosed || pollInterval) return;

    pollInterval = setInterval(async () => {
      if (isClosed) return;
      try {
        const res = await fetch(`/api/jobs/${encodeURIComponent(jobId)}`, {
          headers: getAuthHeaders(),
        });
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
      const sseUrl = `${window.location.origin}/api/jobs/${encodeURIComponent(jobId)}/events${
        token ? `?sessionToken=${encodeURIComponent(token)}` : ''
      }`;
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
    headers: getAuthHeaders(),
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || errorData.error || 'Error al generar la vista previa del audio.');
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
    headers: getAuthHeaders({
      'Content-Type': 'application/json',
    }),
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
    headers: getAuthHeaders({
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify({ url }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || 'No se pudo obtener información del audio');
  }
  return data;
}

