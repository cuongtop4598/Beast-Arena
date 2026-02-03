// API service — communicates with Golang backend
import { usePlayerStore } from '../stores/usePlayerStore';

const API_BASE = __DEV__
  ? 'http://localhost:8080'
  : 'https://api.beastarena.game'; // TODO: production URL

interface ApiResponse<T> {
  data?: T;
  error?: string;
  status?: number;
}

async function request<T>(path: string, options?: RequestInit): Promise<ApiResponse<T>> {
  try {
    // Auto-attach JWT token
    const token = usePlayerStore.getState().token;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options?.headers as Record<string, string>),
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });

    const data = await res.json();
    if (!res.ok) return { error: data.error || data.message || `HTTP ${res.status}`, status: res.status };
    return { data, status: res.status };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

// === Auth ===

export interface GuestLoginResponse {
  player_id: string;
  display_name: string;
  token: string;
  guest_token: string;
  wins: number;
  losses: number;
  rank_points: number;
  selected_character: string;
  free_practice_left: number;
  is_new?: boolean;
}

export const guestLogin = (guestToken?: string) =>
  request<GuestLoginResponse>('/api/auth/guest', {
    method: 'POST',
    body: JSON.stringify(guestToken ? { guest_token: guestToken } : {}),
  });

// === Characters ===

export interface CharacterInfo {
  id: string;
  name: string;
  title: string;
  martial_art: string;
  stats: { hp: number; atk: number; spd: number; def: number; special: number };
}

export const listCharacters = () =>
  request<{ characters: CharacterInfo[] }>('/api/characters');

// === Player ===

export interface PlayerProfile {
  id: string;
  display_name: string;
  wins: number;
  losses: number;
  rank_points: number;
  win_rate: number;
  selected_character: string;
  free_practice_left: number;
}

export const getProfile = (id: string) =>
  request<PlayerProfile>(`/api/player/profile/${id}`);

export const updateProfile = (data: { display_name?: string; selected_character?: string }) =>
  request<{ status: string }>('/api/player/profile', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

// === Match ===

export interface StartPracticeResponse {
  status: string;
  match_id: string;
  stage_id: string;
  player_character: string;
  opponent_character: string;
  free_practice_left: number;
}

export const startPractice = (characterId: string, stageId?: string) =>
  request<StartPracticeResponse>('/api/match/practice', {
    method: 'POST',
    body: JSON.stringify({ character_id: characterId, stage_id: stageId }),
  });

export const findMatch = (characterId: string, stageId?: string) =>
  request<{ status: string; message: string }>('/api/match/find', {
    method: 'POST',
    body: JSON.stringify({ character_id: characterId, stage_id: stageId }),
  });

export const getMatch = (id: string) =>
  request<any>(`/api/match/${id}`);

export const getMatchHistory = (limit?: number) =>
  request<{ matches: any[] }>(`/api/match/history?limit=${limit || 20}`);

// === Leaderboard ===

export interface LeaderboardEntry {
  rank: number;
  id: string;
  name: string;
  wins: number;
  losses: number;
  rank_points: number;
  win_rate: number;
}

export const getLeaderboard = (limit?: number) =>
  request<{ leaderboard: LeaderboardEntry[] }>(`/api/leaderboard?limit=${limit || 50}`);

// === Health ===

export const healthCheck = () =>
  request<{ status: string; game: string; characters: number; db: boolean; redis: boolean }>('/health');
