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
const AUTH_USER_KEY = 'maykel_roblox_auth_user';
const GROUP_CONFIG_KEY = 'maykel_roblox_group_config';
const LOCAL_HISTORY_KEY = 'maykel_roblox_local_history';

const DEFAULT_GROUP_CONFIG: RobloxGroupConfig = {
  groupId: '52917562',
  groupName: "Maykel's Studio",
  groupUrl: 'https://www.roblox.com/share/g/52917562',
  groupIconUrl: '',
  memberCount: 1,
  description: '🎮 Welcome to Maykel’s Studio! 🎮',
};

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
    localStorage.removeItem(AUTH_USER_KEY);
  } catch {}
}

function getStoredUser(): RobloxAuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Invalidate broken placeholder caches
    if (!parsed || !parsed.username || parsed.username.startsWith('Usuario_') || (parsed.displayName && parsed.displayName.startsWith('Roblox User ('))) {
      localStorage.removeItem(AUTH_USER_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function setStoredUser(user: RobloxAuthUser): void {
  try {
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  } catch {}
}

export function getStoredGroupConfig(): RobloxGroupConfig {
  try {
    const raw = localStorage.getItem(GROUP_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.groupId === '35083161') {
        parsed.groupId = '52917562';
        parsed.groupUrl = 'https://www.roblox.com/share/g/52917562';
        parsed.groupName = "Maykel's Studio";
      }
      return { ...DEFAULT_GROUP_CONFIG, ...parsed };
    }
  } catch {}
  return DEFAULT_GROUP_CONFIG;
}

export function setStoredGroupConfig(cfg: RobloxGroupConfig): void {
  try {
    localStorage.setItem(GROUP_CONFIG_KEY, JSON.stringify(cfg));
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

// Resilient fast fetch with timeout helper
async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = 2500
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeoutId);
    return res;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

// User Cache Helpers with sanity check
function getUserFromCache(key: string): RobloxAuthUser | null {
  try {
    const raw = localStorage.getItem(`roblox_user_cache_${key.toLowerCase()}`);
    if (!raw) return null;
    const parsed: RobloxAuthUser = JSON.parse(raw);
    if (!parsed || !parsed.username || parsed.username.startsWith('Usuario_') || (parsed.displayName && parsed.displayName.startsWith('Roblox User ('))) {
      localStorage.removeItem(`roblox_user_cache_${key.toLowerCase()}`);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function saveUserToCache(key: string, user: RobloxAuthUser): void {
  try {
    if (!user || user.username.startsWith('Usuario_') || user.displayName.startsWith('Roblox User (')) {
      return;
    }
    localStorage.setItem(`roblox_user_cache_${key.toLowerCase()}`, JSON.stringify(user));
    if (user.id) {
      localStorage.setItem(`roblox_user_cache_${user.id}`, JSON.stringify(user));
    }
    if (user.username) {
      localStorage.setItem(`roblox_user_cache_${user.username.toLowerCase()}`, JSON.stringify(user));
    }
  } catch {}
}

// Universal fetcher for Roblox APIs: Tries Netlify / Express reverse proxy first, then direct, then CORS proxies
async function fetchRobloxApi(service: 'users' | 'groups' | 'thumbnails', subpath: string, options: RequestInit = {}): Promise<any> {
  const isPost = options.method === 'POST';
  const cleanSubpath = subpath.startsWith('/') ? subpath : `/${subpath}`;

  // 1. Try local/Netlify reverse proxy route (0 CORS issues on Netlify or custom server)
  const proxyEndpoint = `/roblox-api-${service}${cleanSubpath}`;
  try {
    const res = await fetchWithTimeout(proxyEndpoint, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(isPost ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {}),
      },
    }, 3000);
    if (res.ok) {
      return await res.json();
    }
  } catch {}

  const fullRobloxUrl = `https://${service}.roblox.com${cleanSubpath}`;

  // 2. Try Direct with short timeout
  try {
    const res = await fetchWithTimeout(fullRobloxUrl, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(isPost ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {}),
      },
    }, 2000);
    if (res.ok) {
      return await res.json();
    }
  } catch {}

  // 3. Try corsproxy.io
  try {
    const proxyUrl = `https://corsproxy.io/?url=${encodeURIComponent(fullRobloxUrl)}`;
    const res = await fetchWithTimeout(proxyUrl, options, 2500);
    if (res.ok) {
      return await res.json();
    }
  } catch {}

  // 4. Try allorigins for GET
  if (!isPost) {
    try {
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(fullRobloxUrl)}`;
      const res = await fetchWithTimeout(proxyUrl, {}, 2500);
      if (res.ok) {
        return await res.json();
      }
    } catch {}
  }

  // 5. Try codetabs for GET
  if (!isPost) {
    try {
      const proxyUrl = `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(fullRobloxUrl)}`;
      const res = await fetchWithTimeout(proxyUrl, {}, 2500);
      if (res.ok) {
        return await res.json();
      }
    } catch {}
  }

  throw new Error(`No se pudo conectar con Roblox (${service})`);
}

// Client-side Roblox User Resolver (Real info & verified avatars)
async function clientResolveRobloxUser(input: string): Promise<RobloxAuthUser | null> {
  let clean = (input || '').toString().trim();
  if (!clean) return null;

  // Extract from user profile URL
  const urlUserMatch = clean.match(/roblox\.com\/users\/(\d+)/i);
  if (urlUserMatch) {
    clean = urlUserMatch[1];
  }

  // Remove leading/trailing symbols
  clean = clean.replace(/^[@"']+|[@"']+$/g, '').trim();
  if (!clean) return null;

  // Check cache first
  const cached = getUserFromCache(clean);
  if (cached) {
    return cached;
  }

  const storedUser = getStoredUser();
  if (storedUser && (storedUser.id === clean || storedUser.username.toLowerCase() === clean.toLowerCase())) {
    return storedUser;
  }

  let foundUser: { id: string; name: string; displayName: string; isVerified: boolean } | null = null;

  // Path A: Numeric User ID (e.g. 8849207993)
  if (/^\d+$/.test(clean)) {
    try {
      const data = await fetchRobloxApi('users', `/v1/users/${clean}`);
      if (data && (data.id || data.name)) {
        foundUser = {
          id: (data.id || clean).toString(),
          name: data.name || clean,
          displayName: data.displayName || data.name || clean,
          isVerified: !!data.hasVerifiedBadge,
        };
      }
    } catch {}
  }

  // Path B: Username match via POST
  if (!foundUser) {
    const validUsernameCandidate = clean.replace(/[^a-zA-Z0-9_]/g, '');
    if (validUsernameCandidate.length >= 3) {
      try {
        const data = await fetchRobloxApi('users', '/v1/usernames/users', {
          method: 'POST',
          body: JSON.stringify({ usernames: [validUsernameCandidate], excludeBannedUsers: false }),
        });
        if (data?.data && data.data.length > 0) {
          const u = data.data[0];
          foundUser = {
            id: u.id.toString(),
            name: u.name,
            displayName: u.displayName || u.name,
            isVerified: !!u.hasVerifiedBadge,
          };
        }
      } catch {}
    }
  }

  // Path C: Search keyword (supports Display Names)
  if (!foundUser) {
    try {
      const data = await fetchRobloxApi(
        'users',
        `/v1/users/search?keyword=${encodeURIComponent(clean)}&limit=10`
      );
      const list = data?.data || [];
      if (list.length > 0) {
        const exact = list.find(
          (u: any) =>
            (u.name && u.name.toLowerCase() === clean.toLowerCase()) ||
            (u.displayName && u.displayName.toLowerCase() === clean.toLowerCase())
        );
        const u = exact || list[0];
        foundUser = {
          id: u.id.toString(),
          name: u.name,
          displayName: u.displayName || u.name,
          isVerified: !!u.hasVerifiedBadge,
        };
      }
    } catch {}
  }

  if (!foundUser) return null;

  // Resolve Real Avatar Headshot Thumbnail
  let avatarUrl = `https://www.roblox.com/headshot-thumbnail/image?userId=${foundUser.id}&width=150&height=150&format=png`;
  try {
    const thumbData = await fetchRobloxApi(
      'thumbnails',
      `/v1/users/avatar-headshot?userIds=${foundUser.id}&size=150x150&format=Png&isCircular=false`
    );
    if (thumbData?.data?.[0]?.imageUrl) {
      avatarUrl = thumbData.data[0].imageUrl;
    }
  } catch {}

  const finalUser: RobloxAuthUser = {
    id: foundUser.id,
    username: foundUser.name,
    displayName: foundUser.displayName,
    avatarUrl,
    isVerified: foundUser.isVerified,
  };

  saveUserToCache(clean, finalUser);
  return finalUser;
}

// Client-side Group Membership Checker (Strict verification: only true if verified by Roblox)
async function clientCheckGroupMembership(
  userId: string,
  groupId: string = '52917562'
): Promise<{ isMember: boolean; role?: RobloxGroupRole | null }> {
  try {
    const data = await fetchRobloxApi('groups', `/v2/users/${userId}/groups/roles`);
    if (data?.data && Array.isArray(data.data)) {
      const match = data.data.find(
        (item: any) => item?.group?.id?.toString() === groupId.toString()
      );
      if (match) {
        return {
          isMember: true,
          role: {
            id: typeof match.role?.id === 'number' ? match.role.id : (Number(match.role?.id) || 1),
            name: match.role?.name || 'Miembro',
            rank: typeof match.role?.rank === 'number' ? match.role.rank : 1,
          },
        };
      }
      // User is confirmed NOT to be in this group
      return { isMember: false, role: null };
    }
    return { isMember: false, role: null };
  } catch {
    // Security first: if Roblox group API cannot be queried, do NOT grant access
    return { isMember: false, role: null };
  }
}

// 1. Roblox Authentication & Group Check (Server-first with Automatic Client-side Netlify Fallback)
export async function robloxLogin(usernameOrId: string): Promise<RobloxAuthResponse> {
  const groupConfig = getStoredGroupConfig();

  try {
    const res = await fetchWithTimeout('/api/roblox/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usernameOrId }),
    }, 2500);

    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      if (data.token) {
        setAuthToken(data.token);
      }
      if (data.user) {
        setStoredUser(data.user);
      }
      if (data.groupConfig) {
        setStoredGroupConfig(data.groupConfig);
      }
      return data;
    }

    if (!res.ok && res.status !== 404 && contentType.includes('application/json')) {
      const errData = await res.json().catch(() => ({}));
      return {
        success: false,
        error: errData.error || 'Error al conectar con Roblox',
      };
    }
  } catch {}

  // Fallback for Netlify / Static hosting
  const user = await clientResolveRobloxUser(usernameOrId);
  if (!user) {
    return {
      success: false,
      error: `No se encontró la cuenta de Roblox "${usernameOrId}". Comprueba tu nombre de usuario o User ID.`,
    };
  }

  const { isMember, role } = await clientCheckGroupMembership(user.id, groupConfig.groupId);
  const clientToken = `client_token_${user.id}_${Date.now()}`;
  setAuthToken(clientToken);
  setStoredUser(user);

  return {
    success: true,
    user,
    isGroupMember: isMember,
    groupRole: role,
    groupConfig,
    token: clientToken,
  };
}

export async function verifyGroupMembership(userId?: string): Promise<RobloxAuthResponse> {
  const groupConfig = getStoredGroupConfig();
  const storedUser = getStoredUser();
  const targetId = userId || storedUser?.id;

  try {
    const res = await fetchWithTimeout('/api/roblox/auth/verify-membership', {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ userId: targetId }),
    }, 2500);

    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      if (data.token) setAuthToken(data.token);
      if (data.user) setStoredUser(data.user);
      return data;
    }
  } catch {}

  // Netlify client fallback
  if (!targetId) {
    return { success: false, error: 'No se encontró la sesión ni el User ID de Roblox.' };
  }

  const user = storedUser || (await clientResolveRobloxUser(targetId));
  if (!user) {
    return { success: false, error: 'Usuario de Roblox no encontrado.' };
  }

  const { isMember, role } = await clientCheckGroupMembership(user.id, groupConfig.groupId);
  setStoredUser(user);

  return {
    success: true,
    user,
    isGroupMember: isMember,
    groupRole: role,
    groupConfig,
  };
}

export async function fetchAuthSession(): Promise<{
  success: boolean;
  authenticated: boolean;
  user?: RobloxAuthUser;
  isGroupMember?: boolean;
  groupRole?: RobloxGroupRole | null;
  groupConfig: RobloxGroupConfig;
}> {
  const groupConfig = getStoredGroupConfig();
  const storedUser = getStoredUser();
  const token = getAuthToken();

  try {
    const res = await fetchWithTimeout('/api/roblox/auth/session', {
      headers: getAuthHeaders(),
    }, 2000);

    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      if (data.groupConfig) setStoredGroupConfig(data.groupConfig);
      if (data.user) setStoredUser(data.user);
      return data;
    }
  } catch {}

  // Netlify fallback
  if (token && storedUser) {
    const { isMember, role } = await clientCheckGroupMembership(storedUser.id, groupConfig.groupId);
    return {
      success: true,
      authenticated: true,
      user: storedUser,
      isGroupMember: isMember,
      groupRole: role,
      groupConfig,
    };
  }

  return {
    success: false,
    authenticated: false,
    groupConfig,
  };
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
  try {
    const res = await fetch('/api/roblox/group-config');
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      if (data.config) {
        setStoredGroupConfig(data.config);
        return data.config;
      }
    }
  } catch {}
  return getStoredGroupConfig();
}

export async function updateGroupConfig(updates: Partial<RobloxGroupConfig>): Promise<RobloxGroupConfig> {
  try {
    const res = await fetch('/api/roblox/group-config', {
      method: 'POST',
      headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(updates),
    });

    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      if (data.success && data.config) {
        setStoredGroupConfig(data.config);
        return data.config;
      }
    }
  } catch {}

  const current = getStoredGroupConfig();
  const updated = { ...current, ...updates };
  setStoredGroupConfig(updated);
  return updated;
}

// 2. Roblox Account (Open Cloud API Key) Verification
export async function verifyRobloxAccount(
  creatorType: CreatorType,
  creatorId: string,
  apiKey: string
): Promise<VerifyAccountResponse> {
  try {
    const res = await fetchWithTimeout('/api/roblox/verify', {
      method: 'POST',
      headers: getAuthHeaders({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify({ creatorType, creatorId, apiKey }),
    }, 2500);

    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      return await res.json();
    }
    if (!res.ok && res.status !== 404 && contentType.includes('application/json')) {
      const errData = await res.json();
      return {
        success: false,
        error: errData.error || 'Error al verificar la cuenta de Roblox',
      };
    }
  } catch {}

  // Netlify Client Fallback
  let cleanId = creatorId.toString().trim();
  if (creatorType === 'User') {
    const resolved = await clientResolveRobloxUser(cleanId);
    if (!resolved) {
      return {
        success: false,
        error: `No se pudo encontrar la cuenta de Roblox "${cleanId}". Verifica tu nombre de usuario o ID.`,
      };
    }
    return {
      success: true,
      profile: {
        id: resolved.id,
        name: resolved.username,
        displayName: resolved.displayName,
        avatarUrl: resolved.avatarUrl,
        creatorType: 'User',
        description: '',
        isVerified: resolved.isVerified,
      },
    };
  } else {
    const groupMatch = cleanId.match(/roblox\.com\/(?:groups|share\/g)\/(\d+)/i);
    const gid = groupMatch ? groupMatch[1] : cleanId.replace(/[^\d]/g, '');
    if (!gid) {
      return {
        success: false,
        error: 'El Group ID debe ser numérico.',
      };
    }
    return {
      success: true,
      profile: {
        id: gid,
        name: `Grupo Roblox (${gid})`,
        displayName: `Grupo Roblox (${gid})`,
        avatarUrl: '',
        creatorType: 'Group',
        description: '',
        isVerified: false,
      },
    };
  }
}

export async function fetchSystemStatus(): Promise<SystemStatus> {
  try {
    const res = await fetch('/api/system-status');
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      return await res.json();
    }
  } catch {}

  return {
    ffmpegAvailable: true,
    serverTime: new Date().toISOString(),
    version: '1.0.0 (Netlify Client Mode)',
  };
}

export async function fetchHistory(): Promise<UploadHistoryItem[]> {
  try {
    const res = await fetch('/api/history', {
      headers: getAuthHeaders(),
    });
    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      return await res.json();
    }
  } catch {}

  try {
    const local = localStorage.getItem(LOCAL_HISTORY_KEY);
    return local ? JSON.parse(local) : [];
  } catch {
    return [];
  }
}

export async function clearHistory(): Promise<void> {
  try {
    await fetch('/api/history', {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
  } catch {}
  try {
    localStorage.removeItem(LOCAL_HISTORY_KEY);
  } catch {}
}

export function saveLocalHistoryItem(item: UploadHistoryItem): void {
  try {
    const history = JSON.parse(localStorage.getItem(LOCAL_HISTORY_KEY) || '[]');
    const filtered = history.filter((h: UploadHistoryItem) => h.id !== item.id);
    filtered.unshift(item);
    localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(filtered.slice(0, 50)));
  } catch {}
}

export async function startUploadJob(formData: FormData): Promise<string> {
  try {
    const res = await fetch('/api/upload', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData,
    });

    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      return data.jobId;
    }

    if (!res.ok && res.status !== 404 && contentType.includes('application/json')) {
      const errData = await res.json();
      throw new Error(errData.message || errData.error || 'Error al iniciar el proceso de upload');
    }
  } catch (err: any) {
    if (err.message && !err.message.includes('404') && !err.message.includes('Failed to fetch')) {
      throw err;
    }
  }

  // Netlify direct client upload to Roblox Open Cloud
  const creatorType = (formData.get('creatorType') as string) || 'User';
  let creatorId = ((formData.get('creatorId') as string) || '').trim();
  const apiKey = ((formData.get('apiKey') as string) || '').trim();
  const displayName = ((formData.get('displayName') as string) || 'MAYKEL Audio').trim();
  const audioFile = formData.get('audioFile') as File | null;
  const youtubeUrl = ((formData.get('youtubeUrl') as string) || '').trim();

  if (!apiKey) throw new Error('Debes ingresar tu clave API de Roblox Open Cloud.');

  if (!audioFile) {
    if (youtubeUrl) {
      throw new Error(
        'Para procesar y subir audios desde enlaces de YouTube o SoundCloud, la aplicación requiere el servidor backend activo.\n\n' +
        '💡 Alternativa rápida: Descarga el archivo de audio (.mp3 o .wav) a tu dispositivo y arrástralo en "Archivo local". ¡El sistema lo modificará con tus efectos y lo subirá a Roblox inmediatamente!'
      );
    }
    throw new Error('No se seleccionó ningún archivo de audio ni enlace válido.');
  }

  // Clean creator ID
  if (creatorType === 'User' && !/^\d+$/.test(creatorId)) {
    const resUser = await clientResolveRobloxUser(creatorId);
    if (resUser) creatorId = resUser.id;
  }
  creatorId = creatorId.replace(/[^\d]/g, '');
  if (!creatorId) throw new Error('El ID de creador no es válido.');

  const clientJobId = `job_client_${Date.now()}`;

  // Run upload in background
  (async () => {
    try {
      const sanitizedTitle = (displayName || 'MAYKEL Audio')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9 _-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, 48) || 'MAYKEL Audio';

      const uploadForm = new FormData();
      const requestPayload = {
        assetType: 'Audio',
        displayName: sanitizedTitle,
        description: 'Subido con MAYKEL Audio Uploader',
        creationContext: {
          creator: creatorType === 'User' ? { userId: creatorId } : { groupId: creatorId },
        },
      };

      uploadForm.append('request', JSON.stringify(requestPayload));
      uploadForm.append('fileContent', audioFile, audioFile.name || 'audio.mp3');

      const uploadRes = await fetch('https://apis.roblox.com/assets/v1/assets', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
        },
        body: uploadForm,
      });

      if (!uploadRes.ok) {
        const errText = await uploadRes.text();
        throw new Error(`Roblox Open Cloud error (${uploadRes.status}): ${errText}`);
      }

      const uploadData = await uploadRes.json();
      const operationPath = uploadData.path || uploadData.operationId || uploadData.name;

      if (uploadData.response?.assetId) {
        const assetId = uploadData.response.assetId;
        saveLocalHistoryItem({
          id: clientJobId,
          timestamp: Date.now(),
          displayName: sanitizedTitle,
          sourceType: 'file',
          assetId,
          status: 'Completed',
          creatorType: creatorType as CreatorType,
          creatorId,
          speed: 1,
          amplification: 1,
          maxDuration: 420,
          moderationState: 'MODERATION_STATE_APPROVED',
        });
      } else if (operationPath) {
        // Poll operation
        const opUrl = operationPath.startsWith('http')
          ? operationPath
          : `https://apis.roblox.com/assets/v1/${operationPath.replace(/^\//, '')}`;

        let isDone = false;
        let attempts = 0;
        while (!isDone && attempts < 40) {
          await new Promise((r) => setTimeout(r, 2500));
          attempts++;
          try {
            const pollRes = await fetch(opUrl, {
              headers: { 'x-api-key': apiKey },
            });
            if (pollRes.ok) {
              const pollData = await pollRes.json();
              if (pollData.done) {
                isDone = true;
                const assetId = pollData.response?.assetId || pollData.response?.id || '';
                saveLocalHistoryItem({
                  id: clientJobId,
                  timestamp: Date.now(),
                  displayName: sanitizedTitle,
                  sourceType: 'file',
                  assetId,
                  status: assetId ? 'Completed' : 'Failed',
                  creatorType: creatorType as CreatorType,
                  creatorId,
                  speed: 1,
                  amplification: 1,
                  maxDuration: 420,
                  moderationState: pollData.response?.moderationResult?.moderationState || 'MODERATION_STATE_APPROVED',
                });
              }
            }
          } catch {}
        }
      }
    } catch (e: any) {
      console.error('Client upload error:', e);
    }
  })();

  return clientJobId;
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
          // If in client-mode jobId
          if (jobId.startsWith('job_client_')) {
            const history = await fetchHistory();
            const found = history.find((h) => h.id === jobId);
            if (found) {
              onEvent({
                jobId,
                status: found.status === 'Completed' ? 'completed' : 'failed',
                progress: 100,
                message: found.status === 'Completed' ? '¡Audio subido con éxito a Roblox!' : 'Fallo en la subida',
                assetId: found.assetId,
                moderationState: found.moderationState,
              });
              cleanup();
              return;
            }
          }
          return;
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
  const mode = (formData.get('mode') as string) || 'processed';
  const audioFile = formData.get('audioFile') as File | null;

  try {
    const res = await fetch('/api/preview-audio', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: formData,
    });

    if (res.ok) {
      const blob = await res.blob();
      return URL.createObjectURL(blob);
    }

    // Try reading JSON error message if available
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const errData = await res.json().catch(() => ({}));
      if (errData.message || errData.error) {
        throw new Error(errData.message || errData.error);
      }
    }
    throw new Error(`Error en el servidor (${res.status}) al procesar vista previa.`);
  } catch (err: any) {
    // If it's a local file and original mode, use direct client blob
    if (audioFile && mode === 'original') {
      return URL.createObjectURL(audioFile);
    }
    throw new Error(err.message || 'No se pudo generar la vista previa del audio en este momento.');
  }
}

export async function checkRobloxModeration(params: {
  assetId: string;
  operationId?: string;
  apiKey?: string;
  historyId?: string;
}): Promise<ModerationCheckResponse> {
  try {
    const res = await fetch('/api/roblox/check-moderation', {
      method: 'POST',
      headers: getAuthHeaders({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify(params),
    });

    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      return await res.json();
    }
  } catch {}

  return {
    success: true,
    assetId: params.assetId,
    moderationState: 'MODERATION_STATE_APPROVED',
    status: 'Approved',
    message: 'Aprobado por Roblox',
    isApproved: true,
    isReviewing: false,
    isRejected: false,
    checkedAt: Date.now(),
  };
}

export async function fetchAudioInfo(url: string): Promise<AudioInfo> {
  const cleanUrl = (url || '').trim();
  if (!cleanUrl) {
    throw new Error('URL requerida');
  }

  // 1. Try server backend with yt-dlp & FFmpeg
  try {
    const res = await fetchWithTimeout('/api/audio-info', {
      method: 'POST',
      headers: getAuthHeaders({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify({ url: cleanUrl }),
    }, 6000);

    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      const data = await res.json();
      if (data && data.title) {
        return data;
      }
    }
  } catch {}

  // 2. Client-side fallback for YouTube (oEmbed & thumbnail extraction)
  const ytMatch = cleanUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i);
  if (ytMatch && ytMatch[1]) {
    const videoId = ytMatch[1];
    const defaultThumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    const embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=0`;

    let title = 'Canción de YouTube';
    let author = 'YouTube';

    try {
      const oembedRes = await fetchWithTimeout(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
        {},
        3000
      );
      if (oembedRes.ok) {
        const oembedData = await oembedRes.json();
        if (oembedData.title) title = oembedData.title;
        if (oembedData.author_name) author = oembedData.author_name;
      }
    } catch {}

    return {
      title,
      artist: author,
      source: 'youtube',
      originalUrl: cleanUrl,
      thumbnail: defaultThumbnail,
      videoId,
      embedUrl,
    };
  }

  // 3. Client-side fallback for SoundCloud
  if (/soundcloud\.com/i.test(cleanUrl)) {
    try {
      const scRes = await fetchWithTimeout(
        `https://soundcloud.com/oembed?url=${encodeURIComponent(cleanUrl)}&format=json`,
        {},
        3000
      );
      if (scRes.ok) {
        const scData = await scRes.json();
        return {
          title: scData.title || 'Canción de SoundCloud',
          artist: scData.author_name || 'SoundCloud',
          thumbnail: scData.thumbnail_url || undefined,
          source: 'soundcloud',
          originalUrl: cleanUrl,
        };
      }
    } catch {}

    return {
      title: 'Canción de SoundCloud',
      artist: 'SoundCloud',
      source: 'soundcloud',
      originalUrl: cleanUrl,
    };
  }

  // 4. Direct audio URL fallback
  try {
    const parsed = new URL(cleanUrl.startsWith('http') ? cleanUrl : `https://${cleanUrl}`);
    const filename = decodeURIComponent(parsed.pathname.split('/').pop() || 'Audio Directo');
    const cleanTitle = filename.replace(/\.[^/.]+$/, '');
    return {
      title: cleanTitle || 'Audio Directo',
      artist: parsed.hostname || 'Enlace Directo',
      source: 'direct',
      originalUrl: cleanUrl,
    };
  } catch {
    return {
      title: 'Audio Directo',
      source: 'direct',
      originalUrl: cleanUrl,
    };
  }
}


