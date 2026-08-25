export type CreatorType = 'User' | 'Group';

export type JobStatus =
  | 'idle'
  | 'preparing'
  | 'downloading'
  | 'converting'
  | 'uploading'
  | 'moderating'
  | 'completed'
  | 'rejected'
  | 'failed';

export interface UploadSettings {
  speed: number;
  amplification: number;
  maxDuration: number;
}

export interface RobloxAccountConfig {
  creatorType: CreatorType;
  creatorId: string;
  apiKey: string;
}

export interface RobloxProfile {
  id: string;
  name: string;
  displayName: string;
  avatarUrl: string;
  creatorType: CreatorType;
  description?: string;
  isVerified?: boolean;
  memberCount?: number;
}

export interface AudioInfo {
  title: string;
  artist?: string;
  duration?: number;
  formattedDuration?: string;
  thumbnail?: string;
  source?: 'youtube' | 'soundcloud' | 'direct' | 'file';
  originalUrl?: string;
}

export interface VerifyAccountResponse {
  success: boolean;
  profile?: RobloxProfile;
  error?: string;
}

export interface ModerationCheckResponse {
  success: boolean;
  assetId: string;
  moderationState: string;
  status: 'Approved' | 'Reviewing' | 'Rejected' | 'Unknown';
  message: string;
  isApproved: boolean;
  isReviewing: boolean;
  isRejected: boolean;
  displayName?: string;
  checkedAt: number;
  error?: string;
}

export interface UploadHistoryItem {
  id: string;
  timestamp: number;
  displayName: string;
  sourceType: 'file' | 'youtube' | 'soundcloud' | 'direct' | string;
  sourceUrl?: string;
  thumbnail?: string;
  creatorType: CreatorType;
  creatorId: string;
  speed: number;
  amplification: number;
  maxDuration: number;
  status: 'Completed' | 'Rejected' | 'Failed' | 'Reviewing';
  assetId?: string;
  operationId?: string;
  moderationState?: string;
  errorMessage?: string;
  checkedAt?: number;
}

export interface JobProgressEvent {
  jobId: string;
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
}

export interface SystemStatus {
  ffmpegAvailable: boolean;
  serverTime: string;
  version: string;
}
