/**
 * Phase 6 — Unit tests for Zustand stores
 * Tests useGameStore and usePlayerStore
 */

// ============================================================
// useGameStore
// ============================================================
describe('useGameStore', () => {
  // Dynamic import to get fresh store each time
  let useGameStore: typeof import('../stores/useGameStore').useGameStore;

  beforeEach(async () => {
    jest.resetModules();
    const mod = await import('../stores/useGameStore');
    useGameStore = mod.useGameStore;
    // Reset to initial state
    useGameStore.getState().resetMatch();
    useGameStore.setState({ currentScreen: 'login', selectedCharacter: null, selectedStage: null, gameMode: 'practice' });
  });

  // --- selectCharacter ---
  test('selectCharacter sets selectedCharacter', () => {
    useGameStore.getState().selectCharacter('tiger');
    expect(useGameStore.getState().selectedCharacter).toBe('tiger');
  });

  test('selectCharacter can change selection', () => {
    useGameStore.getState().selectCharacter('tiger');
    useGameStore.getState().selectCharacter('lion');
    expect(useGameStore.getState().selectedCharacter).toBe('lion');
  });

  // --- startMatch ---
  test('startMatch sets match state', () => {
    const p1 = {
      characterId: 'tiger',
      playerId: 'p1',
      hp: 1000,
      maxHp: 1000,
      ultGauge: 0,
      position: { x: 200, y: 0 },
      facing: 'right' as const,
      state: 'idle',
      comboCount: 0,
    };
    const p2 = {
      characterId: 'lion',
      playerId: 'p2',
      hp: 1000,
      maxHp: 1000,
      ultGauge: 0,
      position: { x: 800, y: 0 },
      facing: 'left' as const,
      state: 'idle',
      comboCount: 0,
    };

    useGameStore.getState().startMatch('match-1', p1, p2);

    const state = useGameStore.getState();
    expect(state.matchId).toBe('match-1');
    expect(state.player1).toEqual(p1);
    expect(state.player2).toEqual(p2);
    expect(state.timer).toBe(99);
    expect(state.round).toBe(1);
    expect(state.roundResults).toEqual([]);
    expect(state.currentScreen).toBe('fight');
  });

  // --- updateFighters ---
  test('updateFighters updates partial fighter state', () => {
    const p1 = {
      characterId: 'tiger', playerId: 'p1', hp: 1000, maxHp: 1000,
      ultGauge: 0, position: { x: 200, y: 0 }, facing: 'right' as const,
      state: 'idle', comboCount: 0,
    };
    const p2 = {
      characterId: 'lion', playerId: 'p2', hp: 1000, maxHp: 1000,
      ultGauge: 0, position: { x: 800, y: 0 }, facing: 'left' as const,
      state: 'idle', comboCount: 0,
    };

    useGameStore.getState().startMatch('match-2', p1, p2);
    useGameStore.getState().updateFighters({ hp: 800 }, { hp: 900 });

    expect(useGameStore.getState().player1!.hp).toBe(800);
    expect(useGameStore.getState().player2!.hp).toBe(900);
    // Other fields should stay the same
    expect(useGameStore.getState().player1!.characterId).toBe('tiger');
    expect(useGameStore.getState().player2!.characterId).toBe('lion');
  });

  test('updateFighters with no match does nothing', () => {
    // player1 and player2 are null initially
    useGameStore.getState().updateFighters({ hp: 500 }, { hp: 500 });
    expect(useGameStore.getState().player1).toBeNull();
    expect(useGameStore.getState().player2).toBeNull();
  });

  // --- endRound ---
  test('endRound appends result and increments round', () => {
    const p1 = {
      characterId: 'tiger', playerId: 'p1', hp: 1000, maxHp: 1000,
      ultGauge: 0, position: { x: 200, y: 0 }, facing: 'right' as const,
      state: 'idle', comboCount: 0,
    };
    const p2 = { ...p1, characterId: 'lion', playerId: 'p2' };

    useGameStore.getState().startMatch('match-3', p1, p2);
    useGameStore.getState().endRound('p1', 'ko');

    const state = useGameStore.getState();
    expect(state.roundResults).toHaveLength(1);
    expect(state.roundResults[0]).toEqual({ round: 1, winnerId: 'p1', method: 'ko' });
    expect(state.round).toBe(2);
  });

  test('endRound tracks multiple rounds', () => {
    const p1 = {
      characterId: 'tiger', playerId: 'p1', hp: 1000, maxHp: 1000,
      ultGauge: 0, position: { x: 200, y: 0 }, facing: 'right' as const,
      state: 'idle', comboCount: 0,
    };
    const p2 = { ...p1, characterId: 'lion', playerId: 'p2' };

    useGameStore.getState().startMatch('match-4', p1, p2);
    useGameStore.getState().endRound('p1', 'ko');
    useGameStore.getState().endRound('p2', 'timeout');

    const state = useGameStore.getState();
    expect(state.roundResults).toHaveLength(2);
    expect(state.round).toBe(3);
  });

  // --- resetMatch ---
  test('resetMatch clears all match state', () => {
    const p1 = {
      characterId: 'tiger', playerId: 'p1', hp: 1000, maxHp: 1000,
      ultGauge: 0, position: { x: 200, y: 0 }, facing: 'right' as const,
      state: 'idle', comboCount: 0,
    };
    const p2 = { ...p1, characterId: 'lion', playerId: 'p2' };

    useGameStore.getState().startMatch('match-5', p1, p2);
    useGameStore.getState().endRound('p1', 'ko');
    useGameStore.getState().resetMatch();

    const state = useGameStore.getState();
    expect(state.matchId).toBeNull();
    expect(state.player1).toBeNull();
    expect(state.player2).toBeNull();
    expect(state.timer).toBe(99);
    expect(state.round).toBe(1);
    expect(state.roundResults).toEqual([]);
  });

  // --- setScreen ---
  test('setScreen changes current screen', () => {
    useGameStore.getState().setScreen('lobby');
    expect(useGameStore.getState().currentScreen).toBe('lobby');

    useGameStore.getState().setScreen('character_select');
    expect(useGameStore.getState().currentScreen).toBe('character_select');
  });

  // --- setGameMode ---
  test('setGameMode changes game mode', () => {
    useGameStore.getState().setGameMode('pvp');
    expect(useGameStore.getState().gameMode).toBe('pvp');

    useGameStore.getState().setGameMode('practice');
    expect(useGameStore.getState().gameMode).toBe('practice');
  });

  // --- selectStage ---
  test('selectStage sets stage', () => {
    useGameStore.getState().selectStage('ancient_temple');
    expect(useGameStore.getState().selectedStage).toBe('ancient_temple');
  });

  // --- setTimer ---
  test('setTimer updates timer', () => {
    useGameStore.getState().setTimer(45);
    expect(useGameStore.getState().timer).toBe(45);
  });
});

// ============================================================
// usePlayerStore
// ============================================================
describe('usePlayerStore', () => {
  let usePlayerStore: typeof import('../stores/usePlayerStore').usePlayerStore;

  beforeEach(async () => {
    jest.resetModules();
    const mod = await import('../stores/usePlayerStore');
    usePlayerStore = mod.usePlayerStore;
    // Reset to defaults
    usePlayerStore.getState().logout();
  });

  // --- setFullProfile ---
  test('setFullProfile sets all profile fields', () => {
    usePlayerStore.getState().setFullProfile({
      playerId: 'player-1',
      displayName: 'TestPlayer',
      token: 'jwt-token-123',
      guestToken: 'guest-abc',
      wins: 10,
      losses: 5,
      rankPoints: 1200,
      selectedCharacter: 'lion',
      freePracticeLeft: 3,
    });

    const state = usePlayerStore.getState();
    expect(state.playerId).toBe('player-1');
    expect(state.displayName).toBe('TestPlayer');
    expect(state.token).toBe('jwt-token-123');
    expect(state.guestToken).toBe('guest-abc');
    expect(state.wins).toBe(10);
    expect(state.losses).toBe(5);
    expect(state.rankPoints).toBe(1200);
    expect(state.selectedCharacter).toBe('lion');
    expect(state.freePracticeLeft).toBe(3);
  });

  // --- setFreePractice ---
  test('setFreePractice updates practice count', () => {
    usePlayerStore.getState().setFreePractice(2);
    expect(usePlayerStore.getState().freePracticeLeft).toBe(2);
  });

  test('setFreePractice to zero', () => {
    usePlayerStore.getState().setFreePractice(0);
    expect(usePlayerStore.getState().freePracticeLeft).toBe(0);
  });

  // --- logout (reset) ---
  test('logout resets player state', () => {
    usePlayerStore.getState().setFullProfile({
      playerId: 'player-1',
      displayName: 'TestPlayer',
      token: 'jwt-token-123',
      guestToken: 'guest-abc',
      wins: 50,
      losses: 20,
      rankPoints: 2000,
      selectedCharacter: 'eagle',
      freePracticeLeft: 0,
    });

    usePlayerStore.getState().logout();

    const state = usePlayerStore.getState();
    expect(state.playerId).toBeNull();
    expect(state.displayName).toBe('Guest');
    expect(state.token).toBeNull();
    expect(state.wins).toBe(0);
    expect(state.losses).toBe(0);
    expect(state.rankPoints).toBe(1000);
    expect(state.freePracticeLeft).toBe(5);
  });

  // --- setPlayer ---
  test('setPlayer sets id, name, token', () => {
    usePlayerStore.getState().setPlayer('p1', 'Player One', 'token-xyz');

    const state = usePlayerStore.getState();
    expect(state.playerId).toBe('p1');
    expect(state.displayName).toBe('Player One');
    expect(state.token).toBe('token-xyz');
  });

  // --- setGuestToken ---
  test('setGuestToken sets guest token', () => {
    usePlayerStore.getState().setGuestToken('guest-123');
    expect(usePlayerStore.getState().guestToken).toBe('guest-123');
  });

  // --- updateStats ---
  test('updateStats updates wins, losses, rankPoints', () => {
    usePlayerStore.getState().updateStats(15, 8, 1350);

    const state = usePlayerStore.getState();
    expect(state.wins).toBe(15);
    expect(state.losses).toBe(8);
    expect(state.rankPoints).toBe(1350);
  });

  // --- setSelectedCharacter ---
  test('setSelectedCharacter changes character', () => {
    usePlayerStore.getState().setSelectedCharacter('crocodile');
    expect(usePlayerStore.getState().selectedCharacter).toBe('crocodile');
  });

  // --- initial state ---
  test('initial state has correct defaults', () => {
    const state = usePlayerStore.getState();
    expect(state.playerId).toBeNull();
    expect(state.displayName).toBe('Guest');
    expect(state.token).toBeNull();
    expect(state.guestToken).toBeNull();
    expect(state.wins).toBe(0);
    expect(state.losses).toBe(0);
    expect(state.rankPoints).toBe(1000);
    expect(state.freePracticeLeft).toBe(5);
    expect(state.selectedCharacter).toBe('tiger');
  });
});
