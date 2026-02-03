/**
 * Phase 6 — Unit tests for API service
 * Tests URL construction, auth token attachment, request format
 */

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock __DEV__ for the api module
(global as any).__DEV__ = true;

// Mock usePlayerStore to control token
jest.mock('../stores/usePlayerStore', () => {
  let token: string | null = null;
  return {
    usePlayerStore: {
      getState: () => ({ token }),
      setState: (state: any) => { token = state.token ?? token; },
      // helper for tests
      __setToken: (t: string | null) => { token = t; },
    },
  };
});

import { usePlayerStore } from '../stores/usePlayerStore';

describe('API Service', () => {
  let api: typeof import('../services/api');

  beforeEach(async () => {
    jest.resetModules();
    mockFetch.mockReset();
    // Re-mock after reset
    jest.mock('../stores/usePlayerStore', () => {
      let token: string | null = null;
      return {
        usePlayerStore: {
          getState: () => ({ token }),
          setState: (state: any) => { token = state.token ?? token; },
          __setToken: (t: string | null) => { token = t; },
        },
      };
    });
    (global as any).__DEV__ = true;
    api = await import('../services/api');
  });

  // ============================================================
  // URL Construction
  // ============================================================
  describe('URL construction', () => {
    test('guestLogin calls /api/auth/guest', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ player_id: 'p1', token: 'tok' }),
      });

      await api.guestLogin();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('/api/auth/guest');
    });

    test('listCharacters calls /api/characters', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ characters: [] }),
      });

      await api.listCharacters();

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('/api/characters');
    });

    test('getProfile includes player ID in URL', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'player-123' }),
      });

      await api.getProfile('player-123');

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('/api/player/profile/player-123');
    });

    test('startPractice calls /api/match/practice', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'started', match_id: 'm1' }),
      });

      await api.startPractice('tiger', 'ancient_temple');

      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toContain('/api/match/practice');
      expect(opts.method).toBe('POST');
    });

    test('findMatch calls /api/match/find', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'queued' }),
      });

      await api.findMatch('lion');

      const [url, opts] = mockFetch.mock.calls[0];
      expect(url).toContain('/api/match/find');
      expect(opts.method).toBe('POST');
    });

    test('getLeaderboard calls /api/leaderboard with limit', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ leaderboard: [] }),
      });

      await api.getLeaderboard(25);

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('/api/leaderboard?limit=25');
    });

    test('healthCheck calls /health', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'ok' }),
      });

      await api.healthCheck();

      const [url] = mockFetch.mock.calls[0];
      expect(url).toContain('/health');
    });

    test('dev mode uses localhost:8080', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await api.healthCheck();

      const [url] = mockFetch.mock.calls[0];
      expect(url).toMatch(/^http:\/\/localhost:8080/);
    });
  });

  // ============================================================
  // Auth Token Attachment
  // ============================================================
  describe('auth token attachment', () => {
    test('includes Authorization header when token exists', async () => {
      // Set token via the mock
      const { usePlayerStore: store } = require('../stores/usePlayerStore');
      store.__setToken('jwt-secret-token');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ characters: [] }),
      });

      await api.listCharacters();

      const [, opts] = mockFetch.mock.calls[0];
      expect(opts.headers['Authorization']).toBe('Bearer jwt-secret-token');
    });

    test('does not include Authorization when no token', async () => {
      const { usePlayerStore: store } = require('../stores/usePlayerStore');
      store.__setToken(null);

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ characters: [] }),
      });

      await api.listCharacters();

      const [, opts] = mockFetch.mock.calls[0];
      expect(opts.headers['Authorization']).toBeUndefined();
    });

    test('always includes Content-Type: application/json', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await api.healthCheck();

      const [, opts] = mockFetch.mock.calls[0];
      expect(opts.headers['Content-Type']).toBe('application/json');
    });
  });

  // ============================================================
  // Request Format
  // ============================================================
  describe('request format', () => {
    test('POST request includes JSON body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'started' }),
      });

      await api.startPractice('eagle', 'bamboo_forest');

      const [, opts] = mockFetch.mock.calls[0];
      const body = JSON.parse(opts.body);
      expect(body.character_id).toBe('eagle');
      expect(body.stage_id).toBe('bamboo_forest');
    });

    test('guestLogin with token sends guest_token', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ player_id: 'p1' }),
      });

      await api.guestLogin('existing-guest-token');

      const [, opts] = mockFetch.mock.calls[0];
      const body = JSON.parse(opts.body);
      expect(body.guest_token).toBe('existing-guest-token');
    });

    test('guestLogin without token sends empty body', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ player_id: 'p1' }),
      });

      await api.guestLogin();

      const [, opts] = mockFetch.mock.calls[0];
      const body = JSON.parse(opts.body);
      expect(body).toEqual({});
    });

    test('error response returns error field', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({ error: 'player not found' }),
      });

      const result = await api.getProfile('nonexistent');
      expect(result.error).toBe('player not found');
      expect(result.status).toBe(404);
    });

    test('network error returns error field', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await api.healthCheck();
      expect(result.error).toBe('Network error');
    });

    test('updateProfile sends PATCH method', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'updated' }),
      });

      await api.updateProfile({ display_name: 'NewName' });

      const [, opts] = mockFetch.mock.calls[0];
      expect(opts.method).toBe('PATCH');
      const body = JSON.parse(opts.body);
      expect(body.display_name).toBe('NewName');
    });
  });
});
