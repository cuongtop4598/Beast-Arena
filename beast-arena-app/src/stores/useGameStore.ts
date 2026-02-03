import { create } from 'zustand';
import { CharacterId } from '../characters/types';

type GameScreen = 'login' | 'lobby' | 'character_select' | 'stage_select' | 'wager' | 'fight' | 'result';
type GameMode = 'pvp' | 'practice';

interface FighterState {
  characterId: CharacterId;
  playerId: string;
  hp: number;
  maxHp: number;
  ultGauge: number;
  position: { x: number; y: number };
  facing: 'left' | 'right';
  state: string;
  comboCount: number;
}

interface GameState {
  // Navigation
  currentScreen: GameScreen;
  setScreen: (screen: GameScreen) => void;

  // Match setup
  gameMode: GameMode;
  setGameMode: (mode: GameMode) => void;
  selectedCharacter: CharacterId | null;
  selectCharacter: (id: CharacterId) => void;
  selectedStage: string | null;
  selectStage: (id: string) => void;

  // In-match state
  matchId: string | null;
  player1: FighterState | null;
  player2: FighterState | null;
  timer: number;
  round: number;
  roundResults: Array<{ round: number; winnerId: string; method: string }>;

  // Match actions
  startMatch: (matchId: string, p1: FighterState, p2: FighterState) => void;
  updateFighters: (p1: Partial<FighterState>, p2: Partial<FighterState>) => void;
  setTimer: (t: number) => void;
  endRound: (winnerId: string, method: string) => void;
  resetMatch: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  currentScreen: 'login',
  setScreen: (screen) => set({ currentScreen: screen }),

  gameMode: 'practice',
  setGameMode: (mode) => set({ gameMode: mode }),

  selectedCharacter: null,
  selectCharacter: (id) => set({ selectedCharacter: id }),

  selectedStage: null,
  selectStage: (id) => set({ selectedStage: id }),

  matchId: null,
  player1: null,
  player2: null,
  timer: 99,
  round: 1,
  roundResults: [],

  startMatch: (matchId, p1, p2) =>
    set({ matchId, player1: p1, player2: p2, timer: 99, round: 1, roundResults: [], currentScreen: 'fight' }),

  updateFighters: (p1Update, p2Update) =>
    set((state) => ({
      player1: state.player1 ? { ...state.player1, ...p1Update } : null,
      player2: state.player2 ? { ...state.player2, ...p2Update } : null,
    })),

  setTimer: (t) => set({ timer: t }),

  endRound: (winnerId, method) =>
    set((state) => ({
      roundResults: [...state.roundResults, { round: state.round, winnerId, method }],
      round: state.round + 1,
    })),

  resetMatch: () =>
    set({ matchId: null, player1: null, player2: null, timer: 99, round: 1, roundResults: [] }),
}));
