import express from 'express';
import path from 'path';
import fs from 'fs';
import os from 'os';
import crypto from 'crypto';
import { spawn, execFile } from 'child_process';
import { promisify } from 'util';
import multer from 'multer';
import FormData from 'form-data';
import axios from 'axios';
import ytdl from '@distube/ytdl-core';
import { createServer as createViteServer } from 'vite';
import {
  UploadHistoryItem,
  JobStatus,
  JobProgressEvent,
  RobloxGroupConfig,
  RobloxAuthUser,
  RobloxGroupRole,
} from './src/types';

const execFileAsync = promisify(execFile);

const app = express();
const PORT = 3000;

// Temporary directories setup
const TEMP_DIR = path.join(os.tmpdir(), 'maykel_uploader');
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Data directory and storage files
const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');
const GROUP_CONFIG_FILE = path.join(DATA_DIR, 'group_config.json');
const SESSION_SECRET = process.env.ROBLOX_AUTH_SECRET || 'maykel_uploader_secure_auth_session_secret_2026';

// Centralized Roblox Group Configuration
const DEFAULT_GROUP_CONFIG: RobloxGroupConfig = {
  groupId: '35083161',
  groupName: 'MAYKEL Official Community',
  groupUrl: 'https://www.roblox.com/groups/35083161',
  groupIconUrl: '',
  memberCount: 0,
  description: 'Grupo oficial de Roblox para usuarios de MAYKEL Audio Uploader.',
};

function loadGroupConfig(): RobloxGroupConfig {
  try {
    if (fs.existsSync(GROUP_CONFIG_FILE)) {
      const data = fs.readFileSync(GROUP_CONFIG_FILE, 'utf-8');
      return { ...DEFAULT_GROUP_CONFIG, ...JSON.parse(data) };
    }
  } catch (err) {
    console.error('Error loading group config:', err);
  }
  return { ...DEFAULT_GROUP_CONFIG };
}

function saveGroupConfig(updates: Partial<RobloxGroupConfig>): RobloxGroupConfig {
  try {
    const current = loadGroupConfig();
    const updated: RobloxGroupConfig = {
      ...current,
      ...updates,
      groupId: (updates.groupId || current.groupId).toString().trim().replace(/[^\d]/g, ''),
    };
    if (!updated.groupUrl || updated.groupUrl.includes('roblox.com/groups/')) {
      updated.groupUrl = `https://www.roblox.com/groups/${updated.groupId}`;
    }
    fs.writeFileSync(GROUP_CONFIG_FILE, JSON.stringify(updated, null, 2), 'utf-8');
    return updated;
  } catch (err) {
    console.error('Error saving group config:', err);
    return loadGroupConfig();
  }
}

// In-memory active jobs
interface ActiveJob {
  id: string;
  status: JobStatus;
  progress: number;
  message: string;
  assetId?: string;
  operationId?: string;
  moderationState?: string;
  error?: string;
  details?: {
    displayName: string;
    speed: number;
    amplification: number;
    duration: number;
    timestamp: number;
  };
  listeners: Array<(event: JobProgressEvent) => void>;
  tempFiles: string[];
}

const activeJobs = new Map<string, ActiveJob>();

// Multer storage
const upload = multer({
  dest: TEMP_DIR,
  limits: {
    fileSize: 60 * 1024 * 1024, // 60MB max
  },
  fileFilter: (_req, file, cb) => {
    const allowedExtensions = ['.mp3', '.wav', '.ogg', '.flac'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Use MP3, WAV, OGG or FLAC.'));
    }
  },
});

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Helper: load history
function loadHistory(): UploadHistoryItem[] {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      const data = fs.readFileSync(HISTORY_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error loading history:', err);
  }
  return [];
}

// Helper: save history (max 50 items)
function saveHistoryItem(item: UploadHistoryItem) {
  try {
    const current = loadHistory();
    // remove duplicates by id if any
    const filtered = current.filter((h) => h.id !== item.id);
    const updated = [item, ...filtered].slice(0, 50);
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(updated, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving history:', err);
  }
}

// Helper: update history item
function updateHistoryItem(id: string, updates: Partial<UploadHistoryItem>): UploadHistoryItem | null {
  try {
    const current = loadHistory();
    const index = current.findIndex((h) => h.id === id || (h.assetId && h.assetId === id));
    if (index !== -1) {
      current[index] = { ...current[index], ...updates };
      fs.writeFileSync(HISTORY_FILE, JSON.stringify(current, null, 2), 'utf-8');
      return current[index];
    }
  } catch (err) {
    console.error('Error updating history item:', err);
  }
  return null;
}

// Helper: Check FFmpeg
async function checkFFmpeg(): Promise<boolean> {
  try {
    await execFileAsync('ffmpeg', ['-version']);
    return true;
  } catch {
    return false;
  }
}

// Helper: Notify Job Listeners
function emitJobProgress(job: ActiveJob) {
  const event: JobProgressEvent = {
    jobId: job.id,
    status: job.status,
    progress: job.progress,
    message: job.message,
    assetId: job.assetId,
    operationId: job.operationId,
    moderationState: job.moderationState,
    error: job.error,
    details: job.details,
  };
  job.listeners.forEach((listener) => {
    try {
      listener(event);
    } catch {
      // client disconnected
    }
  });
}

// Helper: Download audio from URL (SoundCloud, Direct URL, YouTube) safely
async function downloadYouTubeAudio(url: string, outputPath: string): Promise<string> {
  const trimmedUrl = url.trim();

  // Case A: Direct Audio URL (e.g. .mp3, .wav, .ogg, .flac or direct stream)
  const isDirectAudio = /\.(mp3|wav|ogg|flac|m4a|aac)(\?.*)?$/i.test(trimmedUrl);
  if (isDirectAudio) {
    try {
      const response = await axios({
        method: 'GET',
        url: trimmedUrl,
        responseType: 'stream',
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      const writeStream = fs.createWriteStream(outputPath);
      response.data.pipe(writeStream);

      await new Promise<void>((resolve, reject) => {
        writeStream.on('finish', () => resolve());
        writeStream.on('error', (err) => reject(err));
      });

      const parsedName = path.basename(new URL(trimmedUrl).pathname) || 'Direct Audio';
      return parsedName.replace(/\.[^/.]+$/, '');
    } catch (directErr: any) {
      console.warn('Direct stream download failed, attempting fallback...', directErr.message);
    }
  }

  // Case B: yt-dlp for SoundCloud, Bandcamp, YouTube, and other media sources
  const ytdlpPath = path.join(process.cwd(), 'bin', 'yt-dlp');
  if (fs.existsSync(ytdlpPath)) {
    const tempDir = path.dirname(outputPath);
    const tempBase = `ytdl_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const tempOutputTemplate = path.join(tempDir, `${tempBase}.%(ext)s`);

    try {
      const isYouTube = /(youtube\.com|youtu\.be)/i.test(trimmedUrl);
      const args = [
        '--no-playlist',
        '--no-simulate',
        ...(isYouTube ? ['--extractor-args', 'youtube:player_client=android,web,tv'] : []),
        '-f',
        'ba/b',
        '-x',
        '--audio-format',
        'mp3',
        '-o',
        tempOutputTemplate,
        '--print',
        '%(title)s',
        trimmedUrl,
      ];

      const { stdout } = await execFileAsync(ytdlpPath, args, { timeout: 45000 });
      const videoTitle = stdout.trim().split('\n')[0] || 'Audio';

      const downloadedMp3 = path.join(tempDir, `${tempBase}.mp3`);
      if (fs.existsSync(downloadedMp3)) {
        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath);
        }
        fs.renameSync(downloadedMp3, outputPath);
        return videoTitle;
      }
    } catch (ytdlpErr: any) {
      console.warn('yt-dlp attempt failed:', ytdlpErr.message);
      // Clean up any stray temp files
      const stray = path.join(tempDir, `${tempBase}.mp3`);
      if (fs.existsSync(stray)) {
        try { fs.unlinkSync(stray); } catch {}
      }
      if (/soundcloud\.com/i.test(trimmedUrl)) {
        throw new Error(`Error al descargar desde SoundCloud: ${ytdlpErr.message}`);
      }
    }
  }

  // Strategy 2: If it's a YouTube URL, try @distube/ytdl-core as secondary attempt
  if (/(youtube\.com|youtu\.be)/i.test(trimmedUrl)) {
    try {
      if (!ytdl.validateURL(trimmedUrl)) {
        throw new Error('El enlace ingresado no es una URL válida de YouTube.');
      }

      const info = await ytdl.getInfo(trimmedUrl, {
        requestOptions: {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
          },
        },
      });

      const title = info.videoDetails?.title || 'YouTube Audio';
      const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');

      const stream = ytdl(trimmedUrl, {
        quality: audioFormats.length > 0 ? 'highestaudio' : 'lowestvideo',
        filter: 'audioonly',
      });

      const writeStream = fs.createWriteStream(outputPath);
      stream.pipe(writeStream);

      await new Promise<void>((resolve, reject) => {
        stream.on('error', reject);
        writeStream.on('finish', () => resolve());
        writeStream.on('error', reject);
      });

      return title;
    } catch (distubeErr: any) {
      const rawMsg = distubeErr.message || '';
      if (rawMsg.includes('Sign in to confirm you’re not a bot') || rawMsg.includes('bot')) {
        throw new Error(
          '⚠️ YouTube bloqueó la descarga en este servidor en la nube con su protección antibot ("Sign in to confirm you’re not a bot").\n\n' +
          '💡 ¿Cómo solucionarlo al instante?\n' +
          '1. Puedes usar un enlace de SoundCloud o enlace directo de audio.\n' +
          '2. O descarga el audio (.mp3 o .wav) en tu dispositivo y arrástralo a la pestaña "Subir Archivo Local". ¡MAYKEL lo procesará a velocidad 2.33x y lo subirá a Roblox en segundos!'
        );
      }
      throw new Error(
        `No se pudo procesar el enlace: ${rawMsg}\n\n` +
        '💡 Tip: Descarga el archivo de audio a tu PC/móvil y súbelo en "Subir Archivo Local".'
      );
    }
  }

  throw new Error('No se pudo descargar el audio del enlace proporcionado. Asegúrate de que sea un enlace válido o sube el archivo directamente.');
}

// Helper: Process audio with FFmpeg
async function processAudioWithFFmpeg({
  inputPath,
  outputPath,
  speed,
  amplification,
  maxDuration,
}: {
  inputPath: string;
  outputPath: string;
  speed: number;
  amplification: number;
  maxDuration: number;
}): Promise<void> {
  return new Promise((resolve, reject) => {
    // Build filter chain for speed & amplification
    // FFmpeg atempo filter accepts 0.5 to 2.0. If speed > 2.0, chain filters.
    const filters: string[] = [];

    // 1. Amplification/Volume
    if (amplification !== 0) {
      filters.push(`volume=${amplification}dB`);
    }

    // 2. Speed / Tempo
    if (speed > 0) {
      if (speed <= 2.0) {
        filters.push(`atempo=${speed.toFixed(4)}`);
      } else {
        // e.g. speed = 2.33 -> 2.0 * 1.165
        const secondStage = (speed / 2.0).toFixed(4);
        filters.push(`atempo=2.0,atempo=${secondStage}`);
      }
    }

    const filterString = filters.length > 0 ? filters.join(',') : 'anull';

    const args = [
      '-y',
      '-i',
      inputPath,
      '-af',
      filterString,
      '-ar',
      '44100',
      '-ac',
      '2',
      '-b:a',
      '192k',
      '-t',
      maxDuration.toString(),
      '-f',
      'mp3',
      outputPath,
    ];

    const ffmpegProcess = spawn('ffmpeg', args);

    let stderr = '';
    ffmpegProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ffmpegProcess.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        console.error('FFmpeg error:', stderr);
        reject(new Error(`FFmpeg error (código ${code}): ${stderr.slice(-300)}`));
      }
    });

    ffmpegProcess.on('error', (err) => {
      reject(new Error(`Error ejecutando FFmpeg: ${err.message}`));
    });
  });
}

// Helper: Fetch Roblox Group Details
async function fetchRobloxGroupDetails(
  groupId: string
): Promise<{ name?: string; memberCount?: number; iconUrl?: string; description?: string }> {
  const cleanId = (groupId || '').toString().trim().replace(/[^\d]/g, '');
  if (!cleanId) return {};

  try {
    const res = await axios.get(`https://groups.roblox.com/v1/groups/${cleanId}`, {
      timeout: 8000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
      },
    });
    const name = res.data?.name;
    const memberCount = res.data?.memberCount;
    const description = res.data?.description;

    let iconUrl = '';
    try {
      const iconRes = await axios.get(
        `https://thumbnails.roblox.com/v1/groups/icons?groupIds=${cleanId}&size=150x150&format=Png`,
        { timeout: 8000 }
      );
      if (iconRes.data?.data?.[0]?.imageUrl) {
        iconUrl = iconRes.data.data[0].imageUrl;
      }
    } catch {
      // ignore thumbnail error
    }

    return { name, memberCount, iconUrl, description };
  } catch (err: any) {
    console.warn('Error fetching group details from Roblox:', err.message);
    return {};
  }
}

// Helper: Resolve Roblox User from Username or User ID
async function resolveRobloxUser(usernameOrId: string): Promise<RobloxAuthUser | null> {
  const cleanInput = (usernameOrId || '').trim().replace(/^@/, '');
  if (!cleanInput) return null;

  const isNumeric = /^\d+$/.test(cleanInput);
  let userId = '';
  let name = '';
  let displayName = '';
  let isVerified = false;

  if (isNumeric) {
    try {
      const userRes = await axios.get(`https://users.roblox.com/v1/users/${cleanInput}`, {
        timeout: 9000,
      });
      userId = userRes.data.id.toString();
      name = userRes.data.name;
      displayName = userRes.data.displayName || name;
      isVerified = !!userRes.data.hasVerifiedBadge;
    } catch (err: any) {
      if (err.response?.status === 404) return null;
      throw new Error(`Usuario con ID ${cleanInput} no encontrado en Roblox.`);
    }
  } else {
    try {
      const searchRes = await axios.post(
        'https://users.roblox.com/v1/usernames/users',
        { usernames: [cleanInput], excludeBannedUsers: false },
        {
          timeout: 9000,
          headers: { 'Content-Type': 'application/json' },
        }
      );
      const userObj = searchRes.data?.data?.[0];
      if (!userObj) {
        return null;
      }
      userId = userObj.id.toString();
      name = userObj.name;
      displayName = userObj.displayName || name;
      isVerified = !!userObj.hasVerifiedBadge;
    } catch (err: any) {
      throw new Error(`Error al buscar usuario "${cleanInput}" en Roblox: ${err.message}`);
    }
  }

  // Fetch avatar headshot
  let avatarUrl = `https://www.roblox.com/headshot-thumbnail/image?userId=${userId}&width=150&height=150&format=png`;
  try {
    const thumbRes = await axios.get(
      `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=false`,
      { timeout: 8000 }
    );
    if (thumbRes.data?.data?.[0]?.imageUrl) {
      avatarUrl = thumbRes.data.data[0].imageUrl;
    }
  } catch {
    // fallback headshot URL already set
  }

  return {
    id: userId,
    username: name,
    displayName: displayName || name,
    avatarUrl,
    isVerified,
  };
}

// Helper: Check if User belongs to configured Roblox Group
async function checkUserInGroup(
  userId: string,
  targetGroupId: string
): Promise<{ isMember: boolean; role?: RobloxGroupRole | null }> {
  const cleanUserId = (userId || '').toString().trim().replace(/[^\d]/g, '');
  const cleanGroupId = (targetGroupId || '').toString().trim().replace(/[^\d]/g, '');

  if (!cleanUserId || !cleanGroupId) {
    return { isMember: false, role: null };
  }

  // Attempt 1: groups.roblox.com/v2/users/{userId}/groups/roles
  try {
    const res = await axios.get(`https://groups.roblox.com/v2/users/${cleanUserId}/groups/roles`, {
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
      },
    });

    const groups = res.data?.data || [];
    const match = groups.find((g: any) => g.group?.id?.toString() === cleanGroupId);
    if (match) {
      return {
        isMember: true,
        role: {
          id: match.role?.id || 0,
          name: match.role?.name || 'Miembro',
          rank: match.role?.rank || 1,
        },
      };
    }
  } catch (v2Err: any) {
    // Attempt 2: fallback to v1 API
    try {
      const v1Res = await axios.get(`https://groups.roblox.com/v1/users/${cleanUserId}/groups/roles`, {
        timeout: 10000,
        headers: { 'Accept': 'application/json' },
      });
      const groups = v1Res.data?.data || [];
      const match = groups.find((g: any) => g.group?.id?.toString() === cleanGroupId);
      if (match) {
        return {
          isMember: true,
          role: {
            id: match.role?.id || 0,
            name: match.role?.name || 'Miembro',
            rank: match.role?.rank || 1,
          },
        };
      }
    } catch (v1Err: any) {
      console.warn('Group check warning on Roblox APIs:', v1Err.message);
    }
  }

  return { isMember: false, role: null };
}

// Session Token Types & Crypto Helpers
interface SessionPayload {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  isVerified?: boolean;
  isGroupMember: boolean;
  groupId: string;
  groupRole?: RobloxGroupRole | null;
  issuedAt: number;
  expiresAt: number;
}

function createSessionToken(payload: Omit<SessionPayload, 'issuedAt' | 'expiresAt'>): string {
  const issuedAt = Date.now();
  const expiresAt = issuedAt + 14 * 24 * 60 * 60 * 1000; // 14 days
  const fullPayload: SessionPayload = { ...payload, issuedAt, expiresAt };
  const jsonStr = JSON.stringify(fullPayload);
  const base64Data = Buffer.from(jsonStr).toString('base64url');
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(base64Data).digest('base64url');
  return `${base64Data}.${signature}`;
}

function parseAndVerifySessionToken(token: string): SessionPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [base64Data, signature] = parts;
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(base64Data).digest('base64url');
  if (signature !== expectedSig) return null;

  try {
    const rawJson = Buffer.from(base64Data, 'base64url').toString('utf-8');
    const payload = JSON.parse(rawJson) as SessionPayload;
    if (!payload.expiresAt || payload.expiresAt < Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

// Helper: Extract session from Request
function extractSession(req: express.Request): SessionPayload | null {
  const authHeader = req.headers['authorization'] || req.headers['x-roblox-session'];
  let token = '';
  if (typeof authHeader === 'string') {
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    } else {
      token = authHeader.trim();
    }
  }
  if (!token && req.query.sessionToken && typeof req.query.sessionToken === 'string') {
    token = req.query.sessionToken;
  }
  return parseAndVerifySessionToken(token);
}

// Security Middleware: Require active Roblox Group Membership
function requireGroupMember(req: express.Request, res: express.Response, next: express.NextFunction) {
  const session = extractSession(req);
  if (!session) {
    return res.status(401).json({
      error: 'AUTH_REQUIRED',
      message: 'Debes iniciar sesión con tu cuenta de Roblox para acceder a esta función.',
    });
  }

  const groupConfig = loadGroupConfig();
  if (!session.isGroupMember || session.groupId !== groupConfig.groupId) {
    return res.status(403).json({
      error: 'GROUP_MEMBERSHIP_REQUIRED',
      message: `Acceso restringido: Para utilizar MAYKEL Audio Uploader debes pertenecer a nuestro grupo de Roblox "${groupConfig.groupName}".`,
      groupConfig,
    });
  }

  (req as any).userSession = session;
  next();
}

// Clean up temporary files
function cleanupFiles(filePaths: string[]) {
  filePaths.forEach((f) => {
    try {
      if (f && fs.existsSync(f)) {
        fs.unlinkSync(f);
      }
    } catch (e) {
      console.error(`Failed to delete temp file ${f}:`, e);
    }
  });
}

// ================= API ROUTES =================

// Group Configuration Endpoints
app.get('/api/roblox/group-config', async (_req, res) => {
  const config = loadGroupConfig();
  // If icon or member count is missing, try to fetch in background
  if (!config.groupIconUrl || !config.memberCount) {
    try {
      const details = await fetchRobloxGroupDetails(config.groupId);
      if (details.name || details.iconUrl) {
        const updated = saveGroupConfig({
          groupName: details.name || config.groupName,
          groupIconUrl: details.iconUrl || config.groupIconUrl,
          memberCount: details.memberCount || config.memberCount,
          description: details.description || config.description,
        });
        return res.json({ success: true, config: updated });
      }
    } catch {}
  }
  res.json({ success: true, config });
});

app.post('/api/roblox/group-config', async (req, res) => {
  try {
    const { groupId, groupName, groupUrl, description } = req.body;
    if (!groupId || !groupId.toString().trim()) {
      return res.status(400).json({ success: false, error: 'El Group ID es obligatorio.' });
    }

    const cleanId = groupId.toString().trim().replace(/[^\d]/g, '');
    let details: any = {};
    try {
      details = await fetchRobloxGroupDetails(cleanId);
    } catch {}

    const updated = saveGroupConfig({
      groupId: cleanId,
      groupName: groupName?.trim() || details.name || `Grupo Roblox (${cleanId})`,
      groupUrl: groupUrl?.trim() || `https://www.roblox.com/groups/${cleanId}`,
      groupIconUrl: details.iconUrl || '',
      memberCount: details.memberCount || 0,
      description: description?.trim() || details.description || '',
    });

    res.json({ success: true, config: updated, message: 'Configuración de grupo guardada correctamente.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Error guardando configuración de grupo.' });
  }
});

// Roblox Authentication: Login Endpoint (Username / User ID)
app.post('/api/roblox/auth/login', async (req, res) => {
  try {
    const { usernameOrId } = req.body;
    if (!usernameOrId || !usernameOrId.toString().trim()) {
      return res.status(400).json({
        success: false,
        error: 'Ingresa tu nombre de usuario o User ID de Roblox.',
      });
    }

    const user = await resolveRobloxUser(usernameOrId.toString().trim());
    if (!user) {
      return res.status(404).json({
        success: false,
        error: `No se encontró la cuenta de Roblox "${usernameOrId}". Verifica que el nombre de usuario o ID sea correcto.`,
      });
    }

    const groupConfig = loadGroupConfig();
    // Verify group membership against Roblox official API
    const { isMember, role } = await checkUserInGroup(user.id, groupConfig.groupId);

    const token = createSessionToken({
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      isVerified: user.isVerified,
      isGroupMember: isMember,
      groupId: groupConfig.groupId,
      groupRole: role,
    });

    res.json({
      success: true,
      user,
      isGroupMember: isMember,
      groupRole: role,
      groupConfig,
      token,
      message: isMember
        ? `¡Bienvenido, ${user.displayName}! Eres miembro verificado del grupo.`
        : `Acceso restringido: La cuenta ${user.username} no pertenece al grupo oficial de Roblox.`,
    });
  } catch (err: any) {
    console.error('Roblox login error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Error al autenticar con Roblox.',
    });
  }
});

// Roblox Authentication: Re-Verify Group Membership Endpoint
app.post('/api/roblox/auth/verify-membership', async (req, res) => {
  try {
    const session = extractSession(req);
    const { userId: bodyUserId } = req.body;
    const targetUserId = session?.userId || bodyUserId;

    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        error: 'No se encontró la sesión ni el User ID de Roblox.',
      });
    }

    const groupConfig = loadGroupConfig();
    const { isMember, role } = await checkUserInGroup(targetUserId, groupConfig.groupId);

    // If user info is available, generate fresh token
    let user: RobloxAuthUser | null = session
      ? {
          id: session.userId,
          username: session.username,
          displayName: session.displayName,
          avatarUrl: session.avatarUrl,
          isVerified: session.isVerified,
        }
      : null;

    if (!user) {
      user = await resolveRobloxUser(targetUserId);
    }

    if (!user) {
      return res.status(404).json({ success: false, error: 'Usuario de Roblox no encontrado.' });
    }

    const token = createSessionToken({
      userId: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      isVerified: user.isVerified,
      isGroupMember: isMember,
      groupId: groupConfig.groupId,
      groupRole: role,
    });

    res.json({
      success: true,
      user,
      isGroupMember: isMember,
      groupRole: role,
      groupConfig,
      token,
      message: isMember
        ? '¡Excelente! Ahora eres miembro del grupo. Acceso desbloqueado.'
        : 'Todavía no apareces como miembro del grupo. Únete y vuelve a intentarlo.',
    });
  } catch (err: any) {
    console.error('Verify membership error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Error al verificar membresía en Roblox.',
    });
  }
});

// Roblox Authentication: Get Current Session Status Endpoint
app.get('/api/roblox/auth/session', async (req, res) => {
  const session = extractSession(req);
  const groupConfig = loadGroupConfig();

  if (!session) {
    return res.json({
      success: true,
      authenticated: false,
      groupConfig,
    });
  }

  // If group ID in server changed, recheck membership
  let isMember = session.isGroupMember;
  let role = session.groupRole;
  if (session.groupId !== groupConfig.groupId) {
    const check = await checkUserInGroup(session.userId, groupConfig.groupId);
    isMember = check.isMember;
    role = check.role;
  }

  res.json({
    success: true,
    authenticated: true,
    user: {
      id: session.userId,
      username: session.username,
      displayName: session.displayName,
      avatarUrl: session.avatarUrl,
      isVerified: session.isVerified,
    },
    isGroupMember: isMember,
    groupRole: role,
    groupConfig,
  });
});

// Roblox Authentication: Logout Endpoint
app.post('/api/roblox/auth/logout', (_req, res) => {
  res.json({ success: true, message: 'Sesión cerrada correctamente.' });
});

// Roblox Account Verification Endpoint
app.post('/api/roblox/verify', async (req, res) => {
  try {
    const { creatorType = 'User', creatorId, apiKey } = req.body;

    if (!creatorId || !creatorId.toString().trim()) {
      return res.status(400).json({
        success: false,
        error: `Debes ingresar el ${creatorType === 'User' ? 'User ID' : 'Group ID'} de Roblox.`,
      });
    }

    if (!apiKey || !apiKey.toString().trim()) {
      return res.status(400).json({
        success: false,
        error: 'Debes ingresar tu clave API de Roblox Open Cloud.',
      });
    }

    const cleanId = creatorId.toString().trim().replace(/[^\d]/g, '');
    if (!cleanId) {
      return res.status(400).json({
        success: false,
        error: 'El ID de creador debe ser numérico.',
      });
    }

    if (creatorType === 'User') {
      try {
        const userRes = await axios.get(`https://users.roblox.com/v1/users/${cleanId}`, {
          timeout: 10000,
        });
        const userData = userRes.data;

        let avatarUrl = '';
        try {
          const thumbRes = await axios.get(
            `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${cleanId}&size=150x150&format=Png&isCircular=false`,
            { timeout: 8000 }
          );
          if (thumbRes.data?.data?.[0]?.imageUrl) {
            avatarUrl = thumbRes.data.data[0].imageUrl;
          }
        } catch {
          avatarUrl = `https://www.roblox.com/headshot-thumbnail/image?userId=${cleanId}&width=150&height=150&format=png`;
        }

        return res.json({
          success: true,
          profile: {
            id: cleanId,
            name: userData.name,
            displayName: userData.displayName || userData.name,
            avatarUrl: avatarUrl,
            creatorType: 'User',
            description: userData.description || '',
            isVerified: !!userData.hasVerifiedBadge,
          },
        });
      } catch (userErr: any) {
        if (userErr.response?.status === 404) {
          return res.status(404).json({
            success: false,
            error: `No se encontró ningún usuario de Roblox con el User ID ${cleanId}. Comprueba tu ID en roblox.com.`,
          });
        }
        return res.status(400).json({
          success: false,
          error: `Error al consultar usuario en Roblox: ${userErr.message || 'Error de conexión'}`,
        });
      }
    } else {
      // Group verification
      try {
        const groupRes = await axios.get(`https://groups.roblox.com/v1/groups/${cleanId}`, {
          timeout: 10000,
        });
        const groupData = groupRes.data;

        let avatarUrl = '';
        try {
          const thumbRes = await axios.get(
            `https://thumbnails.roblox.com/v1/groups/icons?groupIds=${cleanId}&size=150x150&format=Png`,
            { timeout: 8000 }
          );
          if (thumbRes.data?.data?.[0]?.imageUrl) {
            avatarUrl = thumbRes.data.data[0].imageUrl;
          }
        } catch {
          // ignore
        }

        return res.json({
          success: true,
          profile: {
            id: cleanId,
            name: groupData.name,
            displayName: groupData.name,
            avatarUrl: avatarUrl,
            creatorType: 'Group',
            description: groupData.description || '',
            isVerified: !!groupData.hasVerifiedBadge,
            memberCount: groupData.memberCount || 0,
          },
        });
      } catch (groupErr: any) {
        if (groupErr.response?.status === 404) {
          return res.status(404).json({
            success: false,
            error: `No se encontró ningún grupo de Roblox con el Group ID ${cleanId}. Comprueba tu Group ID en roblox.com.`,
          });
        }
        return res.status(400).json({
          success: false,
          error: `Error al consultar grupo en Roblox: ${groupErr.message || 'Error de conexión'}`,
        });
      }
    }
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || 'Error interno al verificar cuenta de Roblox',
    });
  }
});

// System status
app.get('/api/system-status', async (_req, res) => {
  const ffmpegOk = await checkFFmpeg();
  res.json({
    ffmpegAvailable: ffmpegOk,
    serverTime: new Date().toISOString(),
    version: '1.0.0 (MAYKEL)',
  });
});

// Upload History List
app.get('/api/history', requireGroupMember, (_req, res) => {
  const history = loadHistory();
  res.json(history);
});

// Clear Upload History
app.delete('/api/history', requireGroupMember, (_req, res) => {
  try {
    fs.writeFileSync(HISTORY_FILE, '[]', 'utf-8');
    res.json({ success: true, message: 'Historial borrado' });
  } catch (err: any) {
    res.status(500).json({ error: 'No se pudo borrar el historial' });
  }
});

// Check Moderation of a Roblox Asset
app.post('/api/roblox/check-moderation', requireGroupMember, async (req, res) => {
  try {
    const { assetId, operationId, apiKey, historyId } = req.body;
    const cleanAssetId = (assetId || '').toString().replace(/[^\d]/g, '').trim();

    if (!cleanAssetId && !operationId) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere un Asset ID o Operation ID para verificar.',
      });
    }

    let moderationState = 'MODERATION_STATE_APPROVED';
    let status: 'Approved' | 'Reviewing' | 'Rejected' | 'Unknown' = 'Unknown';
    let message = 'Estado desconocido';
    let assetDetails: any = null;

    // Strategy 1: Check Open Cloud Asset API v1 with API Key (if provided)
    if (apiKey && typeof apiKey === 'string' && apiKey.trim() && cleanAssetId) {
      try {
        const robloxRes = await axios.get(`https://apis.roblox.com/assets/v1/assets/${cleanAssetId}`, {
          headers: {
            'x-api-key': apiKey.trim(),
          },
          timeout: 12000,
        });

        if (robloxRes.data) {
          assetDetails = robloxRes.data;
          const rawMod = assetDetails.moderationResult?.moderationState || '';
          moderationState = rawMod || 'MODERATION_STATE_APPROVED';

          if (rawMod === 'MODERATION_STATE_APPROVED' || rawMod === 'Approved') {
            status = 'Approved';
            message = 'Aprobado por moderación de Roblox';
          } else if (rawMod === 'MODERATION_STATE_REVIEWING' || rawMod === 'Reviewing' || rawMod === 'MODERATION_PENDING') {
            status = 'Reviewing';
            message = 'En revisión por moderación de Roblox';
          } else if (rawMod === 'MODERATION_STATE_REJECTED' || rawMod === 'Rejected' || rawMod === 'BLOCKED') {
            status = 'Rejected';
            message = 'Rechazado por moderación de Roblox';
          } else {
            status = 'Approved';
            message = 'Aprobado por moderación de Roblox';
          }
        }
      } catch (assetErr: any) {
        console.warn('Assets API check warning:', assetErr.response?.status, assetErr.message);
      }
    }

    // Strategy 2: If operationId is provided and status is still Unknown, check Operation API
    if (status === 'Unknown' && operationId && apiKey && typeof apiKey === 'string' && apiKey.trim()) {
      try {
        const opUrl = operationId.startsWith('http')
          ? operationId
          : `https://apis.roblox.com/assets/v1/${operationId.replace(/^\//, '')}`;

        const opRes = await axios.get(opUrl, {
          headers: { 'x-api-key': apiKey.trim() },
          timeout: 12000,
        });

        if (opRes.data) {
          const opData = opRes.data;
          if (opData.done) {
            if (opData.error) {
              status = 'Rejected';
              message = `Rechazado: ${opData.error.message || 'Error de moderación'}`;
              moderationState = 'MODERATION_STATE_REJECTED';
            } else if (opData.response) {
              const rawMod = opData.response.moderationResult?.moderationState || '';
              moderationState = rawMod || 'MODERATION_STATE_APPROVED';
              if (rawMod === 'MODERATION_STATE_REJECTED' || rawMod === 'Rejected') {
                status = 'Rejected';
                message = 'Rechazado por moderación de Roblox';
              } else if (rawMod === 'MODERATION_STATE_REVIEWING' || rawMod === 'Reviewing') {
                status = 'Reviewing';
                message = 'En revisión por moderación de Roblox';
              } else {
                status = 'Approved';
                message = 'Aprobado por moderación de Roblox';
              }
            }
          } else {
            status = 'Reviewing';
            message = 'Roblox aún está procesando la moderación de este audio';
            moderationState = 'MODERATION_STATE_REVIEWING';
          }
        }
      } catch (opErr: any) {
        console.warn('Operation API check warning:', opErr.response?.status, opErr.message);
      }
    }

    // Strategy 3: Check Roblox Economy / Catalog Public API for the Asset
    if (status === 'Unknown' && cleanAssetId) {
      try {
        const econRes = await axios.get(`https://economy.roblox.com/v2/assets/${cleanAssetId}/details`, {
          timeout: 10000,
        });
        if (econRes.data) {
          const item = econRes.data;
          if (item.IsReviewed === false || item.Status === 'Pending') {
            status = 'Reviewing';
            message = 'En revisión por moderación de Roblox';
            moderationState = 'MODERATION_STATE_REVIEWING';
          } else if (item.IsModerated === true || item.Status === 'Moderated') {
            status = 'Rejected';
            message = 'Rechazado por moderación de Roblox';
            moderationState = 'MODERATION_STATE_REJECTED';
          } else {
            status = 'Approved';
            message = 'Aprobado por moderación de Roblox';
            moderationState = 'MODERATION_STATE_APPROVED';
          }
        }
      } catch (econErr: any) {
        if (econErr.response?.status === 400 || econErr.response?.status === 404) {
          status = 'Reviewing';
          message = 'Moderación en progreso o pendiente';
          moderationState = 'MODERATION_STATE_REVIEWING';
        }
      }
    }

    // Fallback if still unknown
    if (status === 'Unknown') {
      status = 'Approved';
      message = 'Audio registrado en Roblox (Aprobado)';
      moderationState = 'MODERATION_STATE_APPROVED';
    }

    // Update history entry if historyId is provided
    if (historyId) {
      const historyStatus = status === 'Approved' ? 'Completed' : status === 'Rejected' ? 'Rejected' : 'Reviewing';
      updateHistoryItem(historyId, {
        status: historyStatus,
        moderationState,
        checkedAt: Date.now(),
        ...(status === 'Rejected' ? { errorMessage: message } : {}),
      });
    }

    return res.json({
      success: true,
      assetId: cleanAssetId,
      moderationState,
      status,
      message,
      isApproved: status === 'Approved',
      isReviewing: status === 'Reviewing',
      isRejected: status === 'Rejected',
      displayName: assetDetails?.displayName || undefined,
      checkedAt: Date.now(),
    });
  } catch (err: any) {
    console.error('Check moderation error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Error al verificar moderación con Roblox',
    });
  }
});

// Fetch Audio Info from link (YouTube, SoundCloud, direct audio URLs)
app.post('/api/audio-info', requireGroupMember, async (req, res) => {
  try {
    const { url } = req.body;
    if (!url || typeof url !== 'string' || !url.trim()) {
      return res.status(400).json({ error: 'URL requerida' });
    }

    const trimmedUrl = url.trim();
    const ytdlpPath = path.join(process.cwd(), 'bin', 'yt-dlp');

    // Case 1: Direct Audio URL (.mp3, .wav, .ogg, .flac, etc.)
    if (/\.(mp3|wav|ogg|flac|m4a|aac)(\?.*)?$/i.test(trimmedUrl)) {
      try {
        const parsed = new URL(trimmedUrl.startsWith('http') ? trimmedUrl : `https://${trimmedUrl}`);
        const filename = path.basename(parsed.pathname) || 'Audio Directo';
        const cleanTitle = decodeURIComponent(filename).replace(/\.[^/.]+$/, '');
        return res.json({
          success: true,
          title: cleanTitle || 'Audio Directo',
          artist: parsed.hostname || 'Enlace Directo',
          source: 'direct',
          originalUrl: trimmedUrl,
        });
      } catch {
        return res.json({
          success: true,
          title: 'Audio Directo',
          artist: 'Enlace Directo',
          source: 'direct',
          originalUrl: trimmedUrl,
        });
      }
    }

    // Case 2: yt-dlp dump-json
    if (fs.existsSync(ytdlpPath)) {
      try {
        const isYouTube = /(youtube\.com|youtu\.be)/i.test(trimmedUrl);
        const args = [
          '--dump-json',
          '--no-playlist',
          ...(isYouTube ? ['--extractor-args', 'youtube:player_client=android,web,tv'] : []),
          trimmedUrl,
        ];
        const { stdout } = await execFileAsync(ytdlpPath, args, { timeout: 20000 });
        const data = JSON.parse(stdout);
        const durationSec = Math.round(data.duration || 0);
        const minutes = Math.floor(durationSec / 60);
        const seconds = durationSec % 60;
        const formattedDuration = durationSec > 0 ? `${minutes}:${seconds.toString().padStart(2, '0')}` : undefined;

        let detectedSource: 'youtube' | 'soundcloud' | 'direct' = 'direct';
        if (/(youtube\.com|youtu\.be)/i.test(trimmedUrl)) detectedSource = 'youtube';
        else if (/soundcloud\.com/i.test(trimmedUrl)) detectedSource = 'soundcloud';

        return res.json({
          success: true,
          title: data.title || 'Audio',
          artist: data.uploader || data.channel || data.artist || undefined,
          duration: durationSec,
          formattedDuration,
          thumbnail: data.thumbnail || undefined,
          source: detectedSource,
          originalUrl: trimmedUrl,
        });
      } catch (ytdlpErr: any) {
        console.warn('yt-dlp info warning:', ytdlpErr.message);
      }
    }

    // Case 3: YouTube fallback with ytdl-core
    if (/(youtube\.com|youtu\.be)/i.test(trimmedUrl)) {
      try {
        const info = await ytdl.getBasicInfo(trimmedUrl);
        const title = info.videoDetails?.title || 'YouTube Audio';
        const artist = info.videoDetails?.author?.name || undefined;
        const durationSec = parseInt(info.videoDetails?.lengthSeconds || '0', 10);
        const minutes = Math.floor(durationSec / 60);
        const seconds = durationSec % 60;
        const formattedDuration = durationSec > 0 ? `${minutes}:${seconds.toString().padStart(2, '0')}` : undefined;
        const thumbnail = info.videoDetails?.thumbnails?.[0]?.url || undefined;

        return res.json({
          success: true,
          title,
          artist,
          duration: durationSec,
          formattedDuration,
          thumbnail,
          source: 'youtube',
          originalUrl: trimmedUrl,
        });
      } catch (ytdlErr: any) {
        console.warn('ytdl-core fallback warning:', ytdlErr.message);
      }
    }

    // Fallback simple title extraction
    try {
      const parsed = new URL(trimmedUrl.startsWith('http') ? trimmedUrl : `https://${trimmedUrl}`);
      const filename = path.basename(parsed.pathname) || 'Audio';
      return res.json({
        success: true,
        title: filename.replace(/\.[^/.]+$/, '') || 'Audio Link',
        artist: parsed.hostname,
        source: 'direct',
        originalUrl: trimmedUrl,
      });
    } catch {
      return res.json({
        success: true,
        title: 'Audio Link',
        source: 'direct',
        originalUrl: trimmedUrl,
      });
    }
  } catch (err: any) {
    console.error('Audio info error:', err);
    res.status(500).json({ error: err.message || 'Error al obtener información del audio' });
  }
});

// Audio Preview endpoint (processes and streams MP3 directly to browser)
app.post('/api/preview-audio', requireGroupMember, upload.single('audioFile'), async (req, res) => {
  const tempFiles: string[] = [];
  try {
    const ffmpegOk = await checkFFmpeg();
    if (!ffmpegOk) {
      return res.status(500).json({ error: 'FFmpeg no está configurado en el servidor.' });
    }

    const { youtubeUrl, speed = '2.33', amplification = '-4', maxDuration = '400', mode = 'processed' } = req.body;
    const isOriginalMode = mode === 'original';

    const speedNum = isOriginalMode ? 1.0 : Math.max(0.5, Math.min(4.0, parseFloat(speed) || 2.33));
    const ampNum = isOriginalMode ? 0 : Math.max(-30, Math.min(30, parseFloat(amplification) || -4));
    const maxDurNum = Math.max(5, Math.min(600, parseFloat(maxDuration) || 400));

    let inputPath = '';
    if (req.file) {
      inputPath = req.file.path;
      tempFiles.push(inputPath);
    } else if (youtubeUrl && typeof youtubeUrl === 'string' && youtubeUrl.trim()) {
      const ytTempPath = path.join(TEMP_DIR, `yt_preview_${Date.now()}_${Math.random().toString(36).substring(7)}.raw`);
      tempFiles.push(ytTempPath);
      await downloadYouTubeAudio(youtubeUrl.trim(), ytTempPath);
      inputPath = ytTempPath;
    } else {
      return res.status(400).json({ error: 'Data incomplete: No se proporcionó audio ni enlace de YouTube.' });
    }

    const outputPreviewPath = path.join(TEMP_DIR, `preview_${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`);
    tempFiles.push(outputPreviewPath);

    await processAudioWithFFmpeg({
      inputPath,
      outputPath: outputPreviewPath,
      speed: speedNum,
      amplification: ampNum,
      maxDuration: Math.min(maxDurNum, 120), // preview allows up to 120s of playback
    });

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', 'inline; filename="preview.mp3"');
    const readStream = fs.createReadStream(outputPreviewPath);
    readStream.pipe(res);

    readStream.on('close', () => {
      cleanupFiles(tempFiles);
    });
    readStream.on('error', () => {
      cleanupFiles(tempFiles);
    });
  } catch (err: any) {
    cleanupFiles(tempFiles);
    res.status(500).json({ error: err.message || 'Error generando vista previa' });
  }
});

// SSE endpoint for job status stream
app.get('/api/jobs/:jobId/events', requireGroupMember, (req, res) => {
  const { jobId } = req.params;
  const job = activeJobs.get(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Send current state
  const sendEvent = (event: JobProgressEvent) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  sendEvent({
    jobId: job.id,
    status: job.status,
    progress: job.progress,
    message: job.message,
    assetId: job.assetId,
    operationId: job.operationId,
    moderationState: job.moderationState,
    error: job.error,
    details: job.details,
  });

  job.listeners.push(sendEvent);

  req.on('close', () => {
    const idx = job.listeners.indexOf(sendEvent);
    if (idx !== -1) {
      job.listeners.splice(idx, 1);
    }
  });
});

// Polling fallback endpoint for job status
app.get('/api/jobs/:jobId', requireGroupMember, (req, res) => {
  const { jobId } = req.params;
  const job = activeJobs.get(jobId);
  if (!job) {
    return res.status(404).json({ error: 'Trabajo no encontrado' });
  }
  res.json({
    jobId: job.id,
    status: job.status,
    progress: job.progress,
    message: job.message,
    assetId: job.assetId,
    operationId: job.operationId,
    moderationState: job.moderationState,
    error: job.error,
    details: job.details,
  });
});

// Main Convert & Upload to Roblox endpoint
app.post('/api/upload', requireGroupMember, upload.single('audioFile'), async (req, res) => {
  const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  try {
    const {
      creatorType = 'User',
      creatorId,
      apiKey,
      youtubeUrl,
      speed = '2.33',
      amplification = '-4',
      maxDuration = '400',
      customTitle,
      thumbnail,
      sourceType: clientSourceType,
    } = req.body;

    // 1. Validation
    if (!creatorId || !creatorId.trim()) {
      return res.status(400).json({ error: 'Data incomplete: Debes ingresar el User ID o Group ID.' });
    }
    if (!apiKey || !apiKey.trim()) {
      return res.status(400).json({ error: 'Data incomplete: Debes ingresar tu Roblox Open Cloud API Key.' });
    }

    const hasFile = !!req.file;
    const hasYoutube = typeof youtubeUrl === 'string' && youtubeUrl.trim().length > 0;

    if (!hasFile && !hasYoutube) {
      return res.status(400).json({ error: 'Data incomplete: Selecciona un archivo de audio o ingresa un enlace de YouTube.' });
    }

    const speedNum = parseFloat(speed) || 2.33;
    const ampNum = parseFloat(amplification) || -4;
    const maxDurNum = parseFloat(maxDuration) || 400;

    // Create and register active job
    const job: ActiveJob = {
      id: jobId,
      status: 'preparing',
      progress: 5,
      message: 'Preparando...',
      listeners: [],
      tempFiles: req.file ? [req.file.path] : [],
    };
    activeJobs.set(jobId, job);

    // Respond immediately with jobId so frontend can start listening/polling
    res.status(202).json({ jobId, message: 'Procesamiento iniciado' });

    // Execute background workflow
    (async () => {
      let displayName = customTitle && customTitle.trim() ? customTitle.trim() : 'MAYKEL Audio';
      let inputAudioPath = '';
      const processedMp3Path = path.join(TEMP_DIR, `processed_${jobId}.mp3`);
      job.tempFiles.push(processedMp3Path);

      try {
        // Step 1: Check FFmpeg
        const ffmpegOk = await checkFFmpeg();
        if (!ffmpegOk) {
          throw new Error('FFmpeg no está configurado en el servidor.');
        }

        // Step 2: Acquire raw audio
        if (hasFile && req.file) {
          inputAudioPath = req.file.path;
          displayName = customTitle?.trim() || path.parse(req.file.originalname).name;
          job.status = 'preparing';
          job.progress = 20;
          job.message = 'Archivo recibido. Preparando conversión...';
          emitJobProgress(job);
        } else if (hasYoutube) {
          job.status = 'downloading';
          job.progress = 15;
          job.message = 'Descargando audio de YouTube...';
          emitJobProgress(job);

          const ytTempPath = path.join(TEMP_DIR, `yt_${jobId}.raw`);
          job.tempFiles.push(ytTempPath);

          const ytTitle = await downloadYouTubeAudio(youtubeUrl.trim(), ytTempPath);
          inputAudioPath = ytTempPath;
          if (!customTitle || !customTitle.trim()) {
            displayName = ytTitle.substring(0, 50);
          }
          job.progress = 40;
          job.message = 'Audio de YouTube descargado con éxito.';
          emitJobProgress(job);
        }

        // Step 3: FFmpeg Conversion
        job.status = 'converting';
        job.progress = 50;
        job.message = `Convirtiendo audio (${speedNum}x, ${ampNum >= 0 ? '+' : ''}${ampNum} dB, max ${maxDurNum}s)...`;
        emitJobProgress(job);

        await processAudioWithFFmpeg({
          inputPath: inputAudioPath,
          outputPath: processedMp3Path,
          speed: speedNum,
          amplification: ampNum,
          maxDuration: maxDurNum,
        });

        job.progress = 70;
        job.message = 'Audio convertido a MP3 44.1kHz 192k. Enviando a Roblox...';
        emitJobProgress(job);

        // Step 4: Upload to Roblox Open Cloud Assets API
        job.status = 'uploading';
        job.progress = 75;
        job.message = 'Enviando a Roblox Open Cloud Assets API...';
        emitJobProgress(job);

        // Sanitize display name strictly according to Roblox Open Cloud Asset schema
        // Must be alphanumeric with spaces, underscores or hyphens only (max 50 chars)
        const sanitizedTitle = (displayName || 'MAYKEL Audio')
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // remove accents (á -> a, etc.)
          .replace(/[^a-zA-Z0-9 _-]/g, ' ') // replace punctuation/symbols with spaces
          .replace(/\s+/g, ' ')
          .trim()
          .substring(0, 48);

        const cleanDisplayName = sanitizedTitle.length > 0 ? sanitizedTitle : 'MAYKEL Audio';
        const cleanCreatorId = creatorId.toString().replace(/[^\d]/g, '').trim();

        if (!cleanCreatorId) {
          throw new Error('El ID de creador de Roblox debe ser numérico.');
        }

        const creationCreator: any = {};
        if (creatorType === 'Group') {
          creationCreator.groupId = cleanCreatorId;
        } else {
          creationCreator.userId = cleanCreatorId;
        }

        const requestJson = {
          assetType: 'Audio',
          displayName: cleanDisplayName,
          description: 'Uploaded via MAYKEL',
          creationContext: {
            creator: creationCreator,
          },
        };

        const formData = new FormData();
        formData.append('request', JSON.stringify(requestJson));
        formData.append('fileContent', fs.createReadStream(processedMp3Path), {
          filename: `${cleanDisplayName.replace(/\s+/g, '_')}.mp3`,
          contentType: 'audio/mpeg',
        });

        let operationPath = '';
        try {
          const robloxResponse = await axios.post('https://apis.roblox.com/assets/v1/assets', formData, {
            headers: {
              ...formData.getHeaders(),
              'x-api-key': apiKey.trim(),
            },
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            timeout: 60000,
          });

          const data = robloxResponse.data;
          operationPath = data.path || data.operationId || '';
          job.operationId = operationPath;
        } catch (apiErr: any) {
          if (apiErr.response) {
            const status = apiErr.response.status;
            const resData = apiErr.response.data;
            const rawMessage =
              resData?.message ||
              (resData?.errors && Array.isArray(resData.errors) ? resData.errors[0]?.message : null) ||
              resData?.error ||
              JSON.stringify(resData);

            if (status === 401 || rawMessage.includes('Invalid API Key')) {
              throw new Error(
                '🔑 API Key de Roblox inválida o expirada.\n\n' +
                'Comprueba tu clave en roblox.com/dashboard/credentials y asegúrate de haberla copiado completa.'
              );
            }

            if (status === 403 || rawMessage.includes('Asset creation is not permitted') || rawMessage.includes('PermissionDenied')) {
              throw new Error(
                '🔒 Permiso denegado por Roblox (403 Forbidden).\n\n' +
                'Asegúrate de que tu API Key tenga activado el permiso "Assets" con operaciones de Lectura y Escritura (Read & Write), y acceso al Creator ID especificado.'
              );
            }

            if (rawMessage.includes('The string did not match the expected pattern') || rawMessage.includes('INVALID_ARGUMENT')) {
              throw new Error(
                '⚠️ Roblox rechazó los parámetros del audio.\n\n' +
                `Motivo: Roblox requiere que el título contenga solo letras y números, y que el ${creatorType === 'User' ? 'User ID' : 'Group ID'} (${cleanCreatorId}) sea válido.`
              );
            }

            throw new Error(`Roblox API Error (${status}): ${rawMessage}`);
          } else {
            throw new Error(`Fallo de conexión con Roblox: ${apiErr.message}`);
          }
        }

        if (!operationPath) {
          throw new Error('Roblox no devolvió un Operation ID.');
        }

        // Step 5: Poll Roblox Operation until finished
        job.status = 'moderating';
        job.progress = 85;
        job.message = 'Esperando moderación de Roblox...';
        emitJobProgress(job);

        // Normalize operation URL
        const opUrl = operationPath.startsWith('http')
          ? operationPath
          : `https://apis.roblox.com/assets/v1/${operationPath.replace(/^\//, '')}`;

        let isDone = false;
        let attempts = 0;
        const maxAttempts = 60; // Up to ~2 minutes
        let assetData: any = null;

        while (!isDone && attempts < maxAttempts) {
          await new Promise((r) => setTimeout(r, 2000));
          attempts++;

          try {
            const pollRes = await axios.get(opUrl, {
              headers: {
                'x-api-key': apiKey.trim(),
              },
              timeout: 15000,
            });

            const pollData = pollRes.data;
            if (pollData.done) {
              isDone = true;
              if (pollData.error) {
                throw new Error(`Roblox Operation Error (${pollData.error.code || ''}): ${pollData.error.message || 'Error desconocido'}`);
              }
              assetData = pollData.response;
            } else {
              job.progress = Math.min(95, 85 + Math.floor((attempts / maxAttempts) * 10));
              job.message = `Esperando moderación de Roblox (${attempts * 2}s)...`;
              emitJobProgress(job);
            }
          } catch (pollErr: any) {
            if (pollErr.response?.status === 404) {
              // Operation might still be initializing
              continue;
            }
            throw pollErr;
          }
        }

        if (!isDone || !assetData) {
          throw new Error('Tiempo de espera agotado esperando la respuesta de Roblox.');
        }

        // Step 6: Evaluate Moderation & Asset ID
        const assetId = assetData.assetId || assetData.id || '';
        const moderationResult = assetData.moderationResult?.moderationState || 'MODERATION_STATE_APPROVED';
        job.assetId = assetId;
        job.moderationState = moderationResult;

        const isRejected = moderationResult === 'MODERATION_STATE_REJECTED' || moderationResult === 'REJECTED';

        job.details = {
          displayName: cleanDisplayName,
          speed: speedNum,
          amplification: ampNum,
          duration: maxDurNum,
          timestamp: Date.now(),
        };

        // Detect accurate source type (SoundCloud vs YouTube vs Direct vs File)
        let detectedSourceType: 'file' | 'youtube' | 'soundcloud' | 'direct' = 'file';
        const trimmedSourceUrl = hasYoutube ? (youtubeUrl || '').trim() : (req.file ? req.file.originalname : undefined);
        if (hasYoutube && youtubeUrl) {
          const lowerUrl = youtubeUrl.toLowerCase();
          if (lowerUrl.includes('soundcloud.com')) {
            detectedSourceType = 'soundcloud';
          } else if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) {
            detectedSourceType = 'youtube';
          } else {
            detectedSourceType = 'direct';
          }
        } else if (clientSourceType) {
          detectedSourceType = clientSourceType;
        }

        const cleanThumbnail = typeof thumbnail === 'string' && thumbnail.startsWith('http') ? thumbnail : undefined;

        if (isRejected) {
          job.status = 'rejected';
          job.progress = 100;
          job.message = 'Audio rechazado por moderación de Roblox';
          emitJobProgress(job);

          saveHistoryItem({
            id: jobId,
            timestamp: Date.now(),
            displayName: cleanDisplayName,
            sourceType: detectedSourceType,
            sourceUrl: trimmedSourceUrl,
            thumbnail: cleanThumbnail,
            creatorType,
            creatorId,
            speed: speedNum,
            amplification: ampNum,
            maxDuration: maxDurNum,
            status: 'Rejected',
            assetId,
            operationId: operationPath,
            moderationState: moderationResult,
            errorMessage: 'Audio rechazado por moderación de Roblox',
          });
        } else {
          job.status = 'completed';
          job.progress = 100;
          job.message = 'Completado';
          emitJobProgress(job);

          saveHistoryItem({
            id: jobId,
            timestamp: Date.now(),
            displayName: cleanDisplayName,
            sourceType: detectedSourceType,
            sourceUrl: trimmedSourceUrl,
            thumbnail: cleanThumbnail,
            creatorType,
            creatorId,
            speed: speedNum,
            amplification: ampNum,
            maxDuration: maxDurNum,
            status: 'Completed',
            assetId,
            operationId: operationPath,
            moderationState: moderationResult,
          });
        }
      } catch (err: any) {
        console.error('Job failed:', err);
        job.status = 'failed';
        job.error = err.message || 'Error desconocido procesando el audio.';
        job.message = job.error;
        emitJobProgress(job);

        let errSourceType: 'file' | 'youtube' | 'soundcloud' | 'direct' = 'file';
        if (hasYoutube && youtubeUrl) {
          const lowerUrl = youtubeUrl.toLowerCase();
          if (lowerUrl.includes('soundcloud.com')) errSourceType = 'soundcloud';
          else if (lowerUrl.includes('youtube.com') || lowerUrl.includes('youtu.be')) errSourceType = 'youtube';
          else errSourceType = 'direct';
        }

        saveHistoryItem({
          id: jobId,
          timestamp: Date.now(),
          displayName: displayName || 'Audio',
          sourceType: errSourceType,
          sourceUrl: hasYoutube ? (youtubeUrl || '').trim() : (req.file ? req.file.originalname : undefined),
          thumbnail: typeof thumbnail === 'string' && thumbnail.startsWith('http') ? thumbnail : undefined,
          creatorType,
          creatorId,
          speed: speedNum,
          amplification: ampNum,
          maxDuration: maxDurNum,
          status: 'Failed',
          errorMessage: job.error,
        });
      } finally {
        cleanupFiles(job.tempFiles);
        // Clean up job from memory after 10 minutes
        setTimeout(() => {
          activeJobs.delete(jobId);
        }, 10 * 60 * 1000);
      }
    })();
  } catch (err: any) {
    console.error('Error starting upload job:', err);
    res.status(500).json({ error: err.message || 'Error iniciando trabajo de upload' });
  }
});

// Vite & Static Asset Handling
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MAYKEL Audio Uploader server running on http://0.0.0.0:${PORT}`);
  });
}

start();
